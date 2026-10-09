// Star Corsairs host controller. Runs on the teacher's screen and is the only one that scores.
// Students fly their own ships (rooms/{code}/ships, see rules.js) and drop answers and reports into
// their inbox; this controller checks every report against the ships it sees, moves the crystals and
// energy, and runs the meteors, golden comets, spilled crystals and mothership invasions.
//
// rooms/{code}/
//   ships/{playerId}       "t,x,y,…" ship snapshot                                                   (player)
//   corsair                { rocks, loot, boss, next: { boss, gold } }                                (host)
//   inbox/{playerId}/{key} { k: 'a', q, ok, at } answer
//                          { k: 's', act: 'hit'|'grab'|'zap'|'cloak'|'buy'|'paint', ... }            (player, write-once)
//   players/{id}           slot, ship, score (crystals), earned/spent (energy), shots, shield, upg, streak,
//                          cloakUntil, safeUntil, down, revenge, res, alert, ack, stats...            (host)
//   stats/{questionIndex}  { asked, correct }  for the class report                                  (host)
// All times are server milliseconds (rt.now()).
//
// Energy: a right answer charges 5 ⚡ (+3 on every 3rd in a row, +2 for players in the bottom 40%);
// every laser bolt costs 1 ⚡. A ship whose shield breaks explodes and spills 15% of its crystals for
// anyone to grab; it comes back protected, with double damage against whoever destroyed it.

import { normalizeQuestion } from '../../platform/questions/normalize';
import { roomPath, assignPath, collapsePatch } from '../../platform/rooms/shared';
import {
    RULES, ROCKS, BOLT, BOSS_R, SHIP_R, MID, ORBS, LOOT, RESPAWN_MS, SAFE_MS, SHIP_DESIGNS, UPGRADES, FLAG,
    energyOf, laserOf, armorOf, shieldOf, reachOf, leaderOf, decodeShip, shipAt, newRock, rocksWanted, rockAlive,
    rockPos, waveTime, spill
} from './rules';

// Shorter host outages are ignored; past the teacher's limit the game ends (see checkGap)
const GAP_THRESHOLD = 15000;
// Background tabs may tick only once a minute, so only a longer silence means the laptop was asleep
const LONG_FREEZE_MS = 90000;
const RESULTS_KEPT = 8; // recent results kept per player for their device
const BOSS_SHOWN_MS = 6000; // a beaten or escaped mothership stays on screen this long
const SLACK = 140; // how far (units) a reported hit may be from where this screen sees the target
const REPORT_AGE = 3000; // reports about moments older than this are not believed

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

export class CorsairHost {
    // onEvent({ type, ... }) lets the big screen animate and log
    constructor(rt, code, { random = Math.random, tickMs = 250, onEvent = () => {}, onError = console.error } = {}) {
        this.rt = rt;
        this.code = code;
        this.random = random;
        this.tickMs = tickMs;
        this.onEvent = onEvent;
        this.onError = onError;
        this.state = { meta: null, players: {}, corsair: null, inbox: {}, stats: {}, ships: {} };
        this.questions = [];
        this.lastRockAt = 0;
        this.used = new Map(); // playerId -> Set of bolt numbers that already hit something
        this.zapped = new Map(); // playerId -> Set of 'wave:orb' that already hit them
        this.unsubs = [];
        this.busy = false;
        this.dirty = false;
        this.stopped = false;
    }

    get settings() {
        return this.state.meta?.settings || {};
    }

    now() {
        return this.rt.now();
    }

    path(...rest) {
        return roomPath(this.code, ...rest);
    }

    snap(pid) {
        return decodeShip(this.state.ships?.[pid]);
    }

    // offlineFor: how long no host screen was running before this controller started (ms)
    async start({ offlineFor = 0 } = {}) {
        this.pendingGap = offlineFor;
        let lostAt = 0;
        const offConnection = this.rt.onConnectionChange?.((connected) => {
            if (!connected) lostAt = lostAt || this.now();
            else if (lostAt) {
                this.pendingGap = Math.max(this.pendingGap, this.now() - lostAt);
                lostAt = 0;
                this.poke();
            }
        });
        if (offConnection) this.unsubs.push(offConnection);

        const set = await this.rt.get(this.path('set'));
        const raw = Array.isArray(set?.questions) ? set.questions : Object.values(set?.questions || {});
        this.questions = raw.map(normalizeQuestion).filter(Boolean);

        this.unsubs.push(
            this.rt.onValue(this.path('meta'), v => { this.state.meta = v; this.poke(); }),
            this.rt.onValue(this.path('players'), v => { this.state.players = v || {}; this.poke(); }),
            this.rt.onValue(this.path('corsair'), v => { this.state.corsair = v; this.poke(); }),
            this.rt.onValue(this.path('inbox'), v => { this.state.inbox = v || {}; this.poke(); }),
            // Ships move many times a second: they are read on the next pass, not one pass each
            this.rt.onValue(this.path('ships'), v => { this.state.ships = v || {}; }),
            this.rt.onValue(this.path('stats'), v => { this.state.stats = v || {}; })
        );
        if (this.tickMs > 0) this.timer = setInterval(() => this.poke(), this.tickMs);
    }

    stop() {
        this.stopped = true;
        clearInterval(this.timer);
        this.unsubs.forEach(u => u());
        this.unsubs = [];
    }

    // Serialize processing: never run two passes at once, but never miss a change either
    poke() {
        if (this.stopped) return Promise.resolve();
        if (this.busy) {
            this.dirty = true;
            return this.current;
        }
        this.busy = true;
        this.current = (async () => {
            try {
                do {
                    this.dirty = false;
                    await this.process();
                } while (this.dirty && !this.stopped);
            } catch (err) {
                this.onError(err);
            } finally {
                this.busy = false;
            }
        })();
        return this.current;
    }

    // ---------- host commands ----------

    async startGame() {
        const meta = this.state.meta;
        if (!meta || meta.status !== 'lobby') return;
        const now = this.now();
        const patch = {
            'meta/status': 'live',
            'meta/startedAt': now,
            'meta/endsAt': now + (Number(this.settings.duration) || 480) * 1000,
            corsair: { next: { boss: now + RULES.boss.first, gold: now + RULES.goldFirst } }
        };
        for (const [id, p] of this.activePlayers()) Object.assign(patch, this.freshPlayer(id, p.slot));
        this.applyLocal(patch);
        this.assignSlots((k, v) => { patch[k] = v; assignPath(this.state, k.split('/'), v); });
        await this.rt.update(this.path(), collapsePatch(patch, this.state));
        this.poke();
    }

    async endNow() {
        await this.rt.update(this.path('meta'), { endsAt: this.now() });
        this.poke();
    }

    async addTime(seconds) {
        const meta = this.state.meta;
        if (!meta || meta.status !== 'live') return;
        await this.rt.update(this.path('meta'), { endsAt: Math.max(meta.endsAt, this.now()) + seconds * 1000 });
    }

    // ---------- main loop ----------

    activePlayers() {
        return Object.entries(this.state.players || {}).filter(([, p]) => p && p.name && !p.kicked);
    }

    freshPlayer(id, slot) {
        const p = this.state.players[id] || {};
        const out = {};
        for (const key of ['score', 'earned', 'spent', 'shots', 'streak', 'answered', 'correct', 'mined', 'kills', 'grabbed', 'bossDmg']) {
            out[`players/${id}/${key}`] = p[key] ?? 0;
        }
        out[`players/${id}/shield`] = p.shield ?? RULES.armor[0];
        if (Number.isInteger(slot)) out[`players/${id}/slot`] = slot;
        return out;
    }

    applyLocal(patch) {
        for (const [key, value] of Object.entries(patch)) assignPath(this.state, key.split('/'), value);
    }

    async process() {
        const meta = this.state.meta;
        if (!meta || meta.status === 'ended') return;
        const now = this.now();
        const patch = {};
        const set = (key, value) => {
            patch[key] = value;
            assignPath(this.state, key.split('/'), value);
        };

        if (meta.status === 'lobby') {
            this.assignSlots(set);
            this.readInbox(set, now, true);
        } else if (meta.status === 'live' && this.state.corsair) {
            if (this.checkGap(set, now)) {
                // ended: the host screen was offline too long
            } else if (now >= meta.endsAt) {
                this.endGame(set, now);
            } else {
                this.assignSlots(set);
                this.readInbox(set, now, false);
                this.tendRocks(set, now);
                this.tendLoot(set, now);
                this.tendBoss(set, now);
            }
        }

        if (Object.keys(patch).length) await this.rt.update(this.path(), collapsePatch(patch, this.state));
    }

    // Every ship gets a number (for its default design and the order on screen); late joiners start fresh
    assignSlots(set) {
        const live = this.state.meta?.status === 'live';
        const players = this.activePlayers();
        const taken = new Set(players.map(([, p]) => p.slot).filter(Number.isInteger));
        let next = 0;
        for (const [id, p] of players) {
            if (Number.isInteger(p.slot)) continue;
            while (taken.has(next)) next++;
            taken.add(next);
            if (live) Object.entries(this.freshPlayer(id, next)).forEach(([k, v]) => set(k, v));
            else set(`players/${id}/slot`, next);
            if (!Number.isInteger(p.ship)) set(`players/${id}/ship`, next % SHIP_DESIGNS);
        }
    }

    // Bolts are paid for as soon as the ship's snapshot shows them
    chargeShots(set, pid) {
        const p = this.state.players[pid];
        const snap = this.snap(pid);
        if (!p || !snap) return;
        const charged = p.shots || 0;
        if (snap.n > charged) {
            set(`players/${pid}/spent`, (p.spent || 0) + (snap.n - charged) * RULES.shot);
            set(`players/${pid}/shots`, snap.n);
        } else if (snap.n < charged) {
            // The device was reloaded and counts from scratch
            set(`players/${pid}/shots`, snap.n);
        }
    }

    readInbox(set, now, lobby) {
        const underdogs = lobby ? null : this.underdogs();
        const pids = new Set([...Object.keys(this.state.inbox || {}), ...(lobby ? [] : this.activePlayers().map(([id]) => id))]);
        for (const pid of pids) {
            const entries = this.state.inbox?.[pid] || {};
            const keys = Object.keys(entries).sort();
            const p = this.state.players[pid];
            if (!p || p.kicked || !Number.isInteger(p.slot)) {
                // Not (or no longer) playing: drop what they sent; a newcomer without a number is retried next pass
                if (!p || p.kicked) keys.forEach(k => set(`inbox/${pid}/${k}`, null));
                continue;
            }
            const results = { ...(p.res || {}) };
            let acked = p.ack || '';
            // Answers first (they pay for bolts), then the bolts, then what the bolts did
            for (const k of keys) {
                const e = entries[k];
                if (e?.k === 'a') {
                    set(`inbox/${pid}/${k}`, null);
                    if (!lobby) results[k] = this.applyAnswer(set, pid, e, now, underdogs);
                    if (k > acked) acked = k;
                }
            }
            if (!lobby) this.chargeShots(set, pid);
            for (const k of keys) {
                const e = entries[k];
                if (e?.k === 'a') continue;
                set(`inbox/${pid}/${k}`, null);
                if (k > acked) acked = k;
                if (e?.k !== 's') continue;
                if (e.act === 'paint') {
                    const design = Number(e.design);
                    if (Number.isInteger(design) && design >= 0 && design < SHIP_DESIGNS) set(`players/${pid}/ship`, design);
                    continue;
                }
                if (lobby) continue;
                const res = this.applyCommand(set, pid, k, e, now);
                if (res) results[k] = res;
            }
            if (acked !== (p.ack || '')) {
                set(`players/${pid}/ack`, acked);
                const recent = Object.keys(results).sort().slice(-RESULTS_KEPT);
                set(`players/${pid}/res`, Object.fromEntries(recent.map(k => [k, results[k]])));
            }
        }
    }

    // Players in the bottom 40% by crystals (with enough players for that to mean something)
    underdogs() {
        const list = this.activePlayers().filter(([, p]) => Number.isInteger(p.slot)).sort((a, b) => (a[1].score || 0) - (b[1].score || 0));
        if (list.length < 4) return new Set();
        const top = list[list.length - 1][1].score || 0;
        const cut = Math.floor(list.length * 0.4);
        return new Set(list.slice(0, cut).filter(([, p]) => (p.score || 0) < top).map(([id]) => id));
    }

    applyAnswer(set, pid, entry, now, underdogs) {
        const p = this.state.players[pid];
        const ok = entry.ok === true;
        // Class report: how often each question was answered correctly
        const q = Number(entry.q);
        if (Number.isInteger(q) && q >= 0 && q < this.questions.length) {
            const stats = this.state.stats?.[q] || { asked: 0, correct: 0 };
            set(`stats/${q}`, { asked: stats.asked + 1, correct: stats.correct + (ok ? 1 : 0) });
        }
        // Answers sent faster than anyone can read are ignored
        const at = Number(entry.at) || now;
        if (p.lastAnswerAt && at - p.lastAnswerAt < RULES.answerGapMs) return { kind: 'answer', ok: false, spam: true };
        set(`players/${pid}/lastAnswerAt`, at);
        set(`players/${pid}/answered`, (p.answered || 0) + 1);
        const streak = ok ? (p.streak || 0) + 1 : 0;
        set(`players/${pid}/streak`, streak);
        if (!ok) return { kind: 'answer', ok: false };

        set(`players/${pid}/correct`, (p.correct || 0) + 1);
        const over = streak % RULES.overchargeEvery === 0;
        const under = underdogs?.has(pid) || false;
        const room = RULES.maxEnergy - Math.max(0, energyOf(p));
        const gain = Math.max(0, Math.min(room, RULES.answerEnergy + (over ? RULES.overcharge : 0) + (under ? RULES.underdog : 0)));
        set(`players/${pid}/earned`, (p.earned || 0) + gain);
        // Every right answer also patches the shield a little
        set(`players/${pid}/shield`, Math.min(armorOf(p), shieldOf(p) + 1));
        // During an invasion every right answer fires the station's cannon at the mothership
        const cannon = this.hitBoss(set, pid, 1, now);
        if (cannon) this.onEvent({ type: 'cannon', pid, name: p.name });
        return { kind: 'answer', ok: true, gain, over, under, full: gain < RULES.answerEnergy, cannon: cannon > 0 };
    }

    applyCommand(set, pid, key, e, now) {
        const p = this.state.players[pid];
        if (e.act === 'hit') return this.hit(set, pid, key, e, now);
        if (e.act === 'grab') return this.grab(set, pid, e, now);
        if (e.act === 'zap') return this.zap(set, pid, key, e, now);
        if (e.act === 'cloak') {
            if ((p.cloakUntil || 0) > now) return { kind: 'cloak', already: true };
            if (energyOf(p) < RULES.cloak) return { kind: 'energy' };
            set(`players/${pid}/spent`, (p.spent || 0) + RULES.cloak);
            set(`players/${pid}/cloakUntil`, now + RULES.cloakMs);
            this.onEvent({ type: 'cloak', pid, name: p.name });
            return { kind: 'cloak', until: now + RULES.cloakMs };
        }
        if (e.act === 'buy') {
            if (this.settings.upgrades === false || !UPGRADES.includes(e.item)) return null;
            const level = p.upg?.[e.item] || 0;
            const price = RULES.prices[e.item][level];
            if (price === undefined) return { kind: 'buy', item: e.item, maxed: true };
            if ((p.score || 0) < price) return { kind: 'buy', item: e.item, poor: true };
            set(`players/${pid}/score`, (p.score || 0) - price);
            set(`players/${pid}/upg/${e.item}`, level + 1);
            // New armor comes fully charged
            if (e.item === 'armor') set(`players/${pid}/shield`, armorOf(p));
            this.onEvent({ type: 'buy', pid, name: p.name, item: e.item, level: level + 1 });
            return { kind: 'buy', item: e.item, level: level + 1 };
        }
        return null;
    }

    // ---------- what the bolts hit ----------

    // A student's device saw one of its bolts hit something. Believe it if the bolt was really fired
    // (and paid for), hasn't hit anything before, and the target was near that spot at that moment.
    hit(set, pid, key, e, now) {
        const p = this.state.players[pid];
        const snap = this.snap(pid);
        const n = Number(e.n);
        const x = Number(e.x);
        const y = Number(e.y);
        if (!snap || !Number.isInteger(n) || n <= 0 || n > snap.n || !Number.isFinite(x) || !Number.isFinite(y)) return null;
        if (energyOf(p) < 0) return null; // bolts that were never paid for
        const used = this.used.get(pid) || new Set();
        this.used.set(pid, used);
        if (used.has(n)) return null;
        used.add(n);
        if (used.size > 80) [...used].filter(v => v < snap.n - 60).forEach(v => used.delete(v));
        const at = Math.min(now, Math.max(now - REPORT_AGE, Number(e.at) || now));
        if (n === snap.n && dist(snap.sx, snap.sy, x, y) > BOLT.range + SLACK) return null;

        const target = typeof e.tgt === 'string' ? e.tgt : '';
        const dmgBase = laserOf(p);
        if (target === 'boss') {
            const boss = this.state.corsair?.boss;
            if (!boss || boss.over || at >= boss.until || dist(MID, MID, x, y) > BOSS_R + SLACK) return { kind: 'gone' };
            const dmg = this.hitBoss(set, pid, dmgBase, now);
            this.onEvent({ type: 'hit', pid, name: p.name, target: 'boss', x, y, dmg });
            return { kind: 'boss', dmg };
        }
        if (target.startsWith('r:')) return this.mine(set, pid, target.slice(2), dmgBase, x, y, at);
        if (target.startsWith('p:')) return this.raid(set, pid, key, target.slice(2), dmgBase, x, y, at, now);
        return null;
    }

    mine(set, pid, rockId, dmgBase, x, y, at) {
        const p = this.state.players[pid];
        const rock = this.state.corsair?.rocks?.[rockId];
        const def = ROCKS[rock?.kind];
        if (!def || !rockAlive(rock, at)) return { kind: 'gone' };
        const where = rockPos(rock, at);
        if (dist(where.x, where.y, x, y) > def.r + SLACK) return { kind: 'gone' };
        const gold = rock.kind === 'gold';
        const dmg = Math.min(rock.hp, dmgBase);
        const hp = rock.hp - dmg;
        let n = dmg * (gold ? RULES.goldPerDamage : RULES.perDamage);
        if (p.upg?.magnet) n = Math.round(n * RULES.magnet);
        set(`corsair/rocks/${rockId}`, hp > 0 ? { ...rock, hp } : null);
        set(`players/${pid}/score`, (p.score || 0) + n);
        set(`players/${pid}/mined`, (p.mined || 0) + n);
        let spilled = 0;
        if (hp <= 0) {
            // A broken meteor spills its crystals for whoever gets there first
            spilled = gold ? RULES.jackpot : RULES.destroyBonus * rock.max;
            this.drop(set, spilled, where.x, where.y);
        }
        this.onEvent({ type: 'hit', pid, name: p.name, target: `r:${rockId}`, x: where.x, y: where.y, dmg, n, down: hp <= 0, gold, spilled });
        return { kind: 'mine', dmg, n, down: hp <= 0, gold };
    }

    raid(set, pid, key, targetId, dmgBase, x, y, at, now) {
        const p = this.state.players[pid];
        const v = this.state.players[targetId];
        if (this.settings.raids === false) return { kind: 'raid', blocked: 'peace' };
        if (!v || v.kicked || !v.name || targetId === pid) return { kind: 'gone' };
        const vs = this.snap(targetId);
        if (!vs || vs.f & (FLAG.docked | FLAG.down)) return { kind: 'raid', blocked: 'docked', name: v.name };
        if ((v.cloakUntil || 0) > now) return { kind: 'raid', blocked: 'cloak', name: v.name };
        if ((v.safeUntil || 0) > now) return { kind: 'raid', blocked: 'safe', name: v.name };
        const where = shipAt(vs, at);
        if (dist(where.x, where.y, x, y) > SHIP_R + SLACK) return { kind: 'gone' };

        const revenge = p.revenge?.pid === targetId && p.revenge.until > now;
        const dmg = dmgBase * (revenge ? 2 : 1);
        const shield = shieldOf(v) - dmg;
        if (shield > 0) {
            set(`players/${targetId}/shield`, shield);
            set(`players/${targetId}/alert`, { id: key, by: p.name, kind: 'hit', n: dmg });
            this.onEvent({ type: 'hit', pid, name: p.name, target: `p:${targetId}`, x: where.x, y: where.y, dmg, victim: v.name });
            return { kind: 'raid', dmg, name: v.name, revenge };
        }
        // Shield broken: the ship explodes and spills its crystals
        const bounty = this.settings.bounty !== false && leaderOf(this.state.players) === targetId;
        const spilled = this.destroy(set, targetId, key, where, now, { by: pid, byName: p.name });
        if (bounty) set(`players/${pid}/score`, (p.score || 0) + RULES.bounty);
        set(`players/${pid}/kills`, (p.kills || 0) + 1);
        if (revenge) set(`players/${pid}/revenge`, null);
        this.onEvent({ type: 'down', pid, name: p.name, victim: v.name, target: `p:${targetId}`, x: where.x, y: where.y, spilled, bounty, revenge });
        return { kind: 'raid', dmg, broke: true, spilled, bounty, revenge, name: v.name };
    }

    // A ship explodes: it loses a share of its crystals as pickups, and comes back protected
    destroy(set, pid, key, where, now, { by = null, byName = null } = {}) {
        const v = this.state.players[pid];
        const have = v.score || 0;
        const spilled = Math.min(have, Math.max(RULES.plunderMin, Math.min(RULES.plunderMax, Math.round(have * RULES.plunder))));
        set(`players/${pid}/score`, have - spilled);
        this.drop(set, spilled, where.x, where.y);
        set(`players/${pid}/shield`, armorOf(v));
        set(`players/${pid}/down`, { at: now, by: byName });
        set(`players/${pid}/safeUntil`, now + RESPAWN_MS + SAFE_MS);
        if (by) set(`players/${pid}/revenge`, { pid: by, name: byName, until: now + RULES.revengeMs });
        set(`players/${pid}/alert`, { id: key, by: byName, kind: by ? 'down' : 'zapDown', n: spilled });
        return spilled;
    }

    drop(set, total, x, y) {
        const until = this.now() + LOOT.life;
        for (const l of spill(total, x, y, () => this.random())) {
            set(`corsair/loot/${this.rt.newKey()}`, { ...l, until });
        }
    }

    // First ship close enough gets the crystals
    grab(set, pid, e, now) {
        const p = this.state.players[pid];
        const id = typeof e.id === 'string' ? e.id : '';
        const loot = id && this.state.corsair?.loot?.[id];
        const snap = this.snap(pid);
        if (!loot || now >= loot.until || !snap || snap.f & (FLAG.docked | FLAG.down)) return { kind: 'grab', missed: true };
        const where = shipAt(snap, now);
        if (dist(where.x, where.y, loot.x, loot.y) > reachOf(p) + SHIP_R + SLACK) return { kind: 'grab', missed: true };
        set(`corsair/loot/${id}`, null);
        set(`players/${pid}/score`, (p.score || 0) + loot.n);
        set(`players/${pid}/grabbed`, (p.grabbed || 0) + loot.n);
        this.onEvent({ type: 'grab', pid, name: p.name, x: loot.x, y: loot.y, n: loot.n });
        return { kind: 'grab', n: loot.n };
    }

    // A mothership orb hit this ship (each orb hurts each ship once)
    zap(set, pid, key, e, now) {
        const p = this.state.players[pid];
        const boss = this.state.corsair?.boss;
        const k = Number(e.wave);
        const j = Number(e.orb);
        if (!boss || boss.over || !Number.isInteger(k) || !Number.isInteger(j) || k < 0 || j < 0 || j >= ORBS.count) return null;
        const fired = waveTime(boss, k);
        if (fired > now + 500 || fired >= boss.until || now - fired > ORBS.life + REPORT_AGE) return null;
        const snap = this.snap(pid);
        if (!snap || snap.f & (FLAG.docked | FLAG.down) || (p.safeUntil || 0) > now) return null;
        const seen = this.zapped.get(pid) || new Set();
        this.zapped.set(pid, seen);
        if (seen.has(`${k}:${j}`)) return null;
        seen.add(`${k}:${j}`);
        const shield = shieldOf(p) - 1;
        if (shield > 0) {
            set(`players/${pid}/shield`, shield);
            return { kind: 'zap' };
        }
        const where = shipAt(snap, now);
        const spilled = this.destroy(set, pid, key, where, now);
        this.onEvent({ type: 'down', pid: null, name: null, victim: p.name, target: `p:${pid}`, x: where.x, y: where.y, spilled, boss: true });
        return { kind: 'zap', broke: true, spilled };
    }

    // Damage to a live mothership; returns how much landed
    hitBoss(set, pid, amount, now) {
        const boss = this.state.corsair?.boss;
        if (!boss || boss.over || now >= boss.until || boss.hp <= 0) return 0;
        const p = this.state.players[pid];
        const dmg = Math.min(boss.hp, amount);
        set('corsair/boss/hp', boss.hp - dmg);
        set(`corsair/boss/dmg/${pid}`, (boss.dmg?.[pid] || 0) + dmg);
        set(`players/${pid}/bossDmg`, (p.bossDmg || 0) + dmg);
        if (boss.hp <= 0) this.bossDown(set, now);
        return dmg;
    }

    // The class beat the mothership: everyone who hit it shares the loot, the top gunner gets a bonus
    bossDown(set, now) {
        const boss = this.state.corsair.boss;
        const dealt = Object.entries(boss.dmg || {}).filter(([id]) => this.state.players[id] && !this.state.players[id].kicked);
        const best = dealt.reduce((top, cur) => (!top || cur[1] > top[1] ? cur : top), null);
        for (const [id, dmg] of dealt) {
            const p = this.state.players[id];
            const n = RULES.boss.reward + RULES.boss.perDamage * dmg + (best && best[0] === id ? RULES.boss.mvp : 0);
            set(`players/${id}/score`, (p.score || 0) + n);
            set(`players/${id}/alert`, { id: `boss${boss.at}`, kind: 'bossWin', n, mvp: best?.[0] === id });
        }
        set('corsair/boss/over', 'down');
        set('corsair/boss/endedAt', now);
        set('corsair/next/boss', now + RULES.boss.every);
        this.onEvent({ type: 'bossDown', mvp: best ? this.state.players[best[0]]?.name : null, crew: dealt.length });
    }

    tendBoss(set, now) {
        if (this.settings.invasions === false) return;
        const corsair = this.state.corsair;
        const boss = corsair.boss;
        if (boss?.over) {
            if (now > (boss.endedAt || 0) + BOSS_SHOWN_MS) set('corsair/boss', null);
            return;
        }
        if (boss) {
            if (now < boss.until) return;
            // It got away: its tractor beam steals from the top pirates
            const top = this.activePlayers()
                .filter(([, p]) => (p.score || 0) > 0)
                .sort((a, b) => (b[1].score || 0) - (a[1].score || 0))
                .slice(0, RULES.boss.stealFrom);
            const victims = [];
            for (const [id, p] of top) {
                const n = Math.round((p.score || 0) * RULES.boss.steal);
                if (n <= 0) continue;
                set(`players/${id}/score`, (p.score || 0) - n);
                set(`players/${id}/alert`, { id: `boss${boss.at}`, kind: 'beam', n });
                victims.push(p.name);
            }
            set('corsair/boss/over', 'gone');
            set('corsair/boss/endedAt', now);
            set('corsair/next/boss', now + RULES.boss.every);
            this.onEvent({ type: 'bossGone', victims });
            return;
        }
        const due = corsair.next?.boss || 0;
        if (!due || now < due || this.state.meta.endsAt - now < RULES.boss.lastCall) return;
        const crew = this.activePlayers().filter(([, p]) => Number.isInteger(p.slot)).length;
        const hp = RULES.boss.baseHp + RULES.boss.hpPerPlayer * Math.max(1, crew);
        set('corsair/boss', { hp, max: hp, at: now, until: now + RULES.boss.life });
        this.zapped.clear();
        this.onEvent({ type: 'bossIn', hp });
    }

    // Meteors drift through; more players, more meteors. Now and then a golden comet races across.
    tendRocks(set, now) {
        const rocks = this.state.corsair.rocks || {};
        let normal = 0;
        for (const [id, r] of Object.entries(rocks)) {
            if (now >= r.until) set(`corsair/rocks/${id}`, null);
            else if (r.kind !== 'gold') normal++;
        }
        const crew = this.activePlayers().filter(([, p]) => Number.isInteger(p.slot)).length;
        if (normal < rocksWanted(crew) && now - this.lastRockAt > 700) {
            this.lastRockAt = now;
            const roll = this.random();
            const kind = roll < 0.4 ? 's' : roll < 0.8 ? 'm' : 'l';
            set(`corsair/rocks/${this.rt.newKey()}`, newRock(kind, now, () => this.random()));
        }
        if (this.settings.goldComets === false) return;
        const due = this.state.corsair.next?.gold || 0;
        if (due && now >= due) {
            const id = this.rt.newKey();
            set(`corsair/rocks/${id}`, newRock('gold', now, () => this.random()));
            set('corsair/next/gold', now + RULES.goldEvery[0] + this.random() * (RULES.goldEvery[1] - RULES.goldEvery[0]));
            this.onEvent({ type: 'gold', id });
        }
    }

    tendLoot(set, now) {
        for (const [id, l] of Object.entries(this.state.corsair.loot || {})) {
            if (now >= l.until) set(`corsair/loot/${id}`, null);
        }
    }

    // The host screen was offline (tab closed, laptop asleep, network lost). Past the teacher's limit the
    // game ends; otherwise it continues and the clock moves forward so no playing time is lost.
    checkGap(set, now) {
        let gap = this.pendingGap || 0;
        this.pendingGap = 0;
        if (this.lastTick && now - this.lastTick > LONG_FREEZE_MS) gap = Math.max(gap, now - this.lastTick);
        this.lastTick = now;
        if (gap < GAP_THRESHOLD) return false;
        const limit = (Number(this.settings.hostTimeout) || 0) * 1000;
        if (limit > 0 && gap >= limit) {
            set('meta/endReason', 'host-offline');
            this.endGame(set, now);
            return true;
        }
        if (this.state.meta.endsAt) set('meta/endsAt', this.state.meta.endsAt + gap);
        // A mothership's clock pauses too, so the class still gets its full time against it
        const boss = this.state.corsair?.boss;
        if (boss && !boss.over) set('corsair/boss/until', Math.max(boss.until, now) + Math.min(gap, RULES.boss.life));
        return false;
    }

    endGame(set, now) {
        set('meta/status', 'ended');
        set('meta/endedAt', now);
    }
}
