// Slingshot Siege host controller. Runs on the teacher's screen and is the only one that scores:
// students drop their answers and launches into their inbox; this controller checks them, flies every
// comet with the shared physics and writes the results.
//
// rooms/{code}/
//   siege                          { count, teams: { [i]: { score, shield } } }                   (host)
//   inbox/{playerId}/{key}         { k: 'a', q, ok } answer  |  { k: 's', dx, dy, p } launch   (player, write-once)
//   players/{id}                   team, score, answered, correct, hits, slings, earned, spent, last (host)
//   stats/{questionIndex}          { asked, correct }  for the class report                     (host)
//
// Scoring (RULES): a correct answer earns one comet, +5 for the team and +4 shield.
// A hit scores +10 while the target's shield is up (and knocks 20 off it), +25 once it is down.
// Skimming past the sun before the hit (a slingshot) doubles it.

import { normalizeQuestion } from '../../platform/questions/normalize';
import { roomPath, assignPath, collapsePatch } from '../../platform/rooms/shared';
import { simulate, isValidShot } from './physics';
import { clampTeams, MAX_SHIELD } from './teams';

export const RULES = { answerPoints: 5, answerShield: 4, hitShielded: 10, hitOpen: 25, shieldDamage: 20, maxShield: MAX_SHIELD };

// Shorter host outages are ignored; past the teacher's limit the game ends (see checkGap)
const GAP_THRESHOLD = 15000;
// Background tabs may tick only once a minute, so only a longer silence means the laptop was asleep
const LONG_FREEZE_MS = 90000;

const shuffle = (list, rand) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

export class SiegeHost {
    // onEvent({ type: 'launch' | 'land', ... }) lets the big screen animate comets and show the log
    constructor(rt, code, { random = Math.random, tickMs = 250, onEvent = () => {}, onError = console.error } = {}) {
        this.rt = rt;
        this.code = code;
        this.random = random;
        this.tickMs = tickMs;
        this.onEvent = onEvent;
        this.onError = onError;
        this.state = { meta: null, players: {}, siege: null, inbox: {}, stats: {} };
        this.questions = [];
        this.flying = new Map(); // `${playerId}/${key}` -> { pid, key, team, flight, landAt }
        this.timers = new Set();
        this.unsubs = [];
        this.busy = false;
        this.dirty = false;
        this.stopped = false;
    }

    get settings() {
        return this.state.meta?.settings || {};
    }

    get teamCount() {
        return this.state.siege?.count || clampTeams(this.settings.teams);
    }

    now() {
        return this.rt.now();
    }

    path(...rest) {
        return roomPath(this.code, ...rest);
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
            this.rt.onValue(this.path('siege'), v => { this.state.siege = v; this.poke(); }),
            this.rt.onValue(this.path('inbox'), v => { this.state.inbox = v || {}; this.poke(); }),
            this.rt.onValue(this.path('stats'), v => { this.state.stats = v || {}; })
        );
        if (this.tickMs > 0) this.timer = setInterval(() => this.poke(), this.tickMs);
    }

    stop() {
        this.stopped = true;
        clearInterval(this.timer);
        this.timers.forEach(clearTimeout);
        this.timers.clear();
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

    later(fn, ms) {
        const id = setTimeout(() => {
            this.timers.delete(id);
            fn();
        }, Math.max(0, ms));
        this.timers.add(id);
    }

    // ---------- host commands ----------

    async startGame() {
        const meta = this.state.meta;
        if (!meta || meta.status !== 'lobby') return;
        const now = this.now();
        const count = clampTeams(this.settings.teams);
        const patch = {
            'meta/status': 'live',
            'meta/startedAt': now,
            'meta/endsAt': now + (Number(this.settings.duration) || 300) * 1000,
            siege: {
                count,
                teams: Object.fromEntries(Array.from({ length: count }, (_, i) => [i, { score: 0, shield: RULES.maxShield }]))
            }
        };
        const counts = new Array(count).fill(0);
        for (const [id, p] of this.activePlayers()) {
            // Keep the teams students saw in the lobby
            const team = Number.isInteger(p.team) && p.team < count ? p.team : counts.indexOf(Math.min(...counts));
            counts[team]++;
            Object.assign(patch, this.freshPlayer(id, team));
        }
        this.applyLocal(patch);
        await this.rt.update(this.path(), collapsePatch(patch, this.state));
        this.poke();
    }

    async shuffleTeams() {
        const meta = this.state.meta;
        if (!meta || meta.status !== 'lobby') return;
        const count = clampTeams(this.settings.teams);
        const patch = {};
        shuffle(this.activePlayers().map(([id]) => id), this.random).forEach((id, i) => {
            patch[`players/${id}/team`] = i % count;
        });
        if (!Object.keys(patch).length) return;
        this.applyLocal(patch);
        await this.rt.update(this.path(), patch);
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

    freshPlayer(id, team) {
        const p = this.state.players[id] || {};
        return {
            [`players/${id}/team`]: team,
            [`players/${id}/score`]: p.score ?? 0,
            [`players/${id}/answered`]: p.answered ?? 0,
            [`players/${id}/correct`]: p.correct ?? 0,
            [`players/${id}/hits`]: p.hits ?? 0,
            [`players/${id}/slings`]: p.slings ?? 0,
            [`players/${id}/earned`]: p.earned ?? 0,
            [`players/${id}/spent`]: p.spent ?? 0
        };
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
            this.assignTeams(set);
        } else if (meta.status === 'live' && this.state.siege) {
            if (this.checkGap(set, now)) {
                // ended: the host screen was offline too long
            } else if (now >= meta.endsAt) {
                this.endGame(set, now);
            } else {
                this.assignTeams(set);
                this.readInbox(set, now);
                this.landComets(set, now);
            }
        }

        if (Object.keys(patch).length) await this.rt.update(this.path(), collapsePatch(patch, this.state));
    }

    // Newcomers (in the lobby or joining late) go to the smallest team
    assignTeams(set) {
        const count = this.teamCount;
        const live = this.state.meta?.status === 'live';
        const players = this.activePlayers();
        const counts = new Array(count).fill(0);
        for (const [, p] of players) if (Number.isInteger(p.team) && p.team < count) counts[p.team]++;
        for (const [id, p] of players) {
            if (Number.isInteger(p.team) && p.team < count) continue;
            const team = counts.indexOf(Math.min(...counts));
            counts[team]++;
            if (live) Object.entries(this.freshPlayer(id, team)).forEach(([k, v]) => set(k, v));
            else set(`players/${id}/team`, team);
        }
    }

    readInbox(set, now) {
        for (const [pid, entries] of Object.entries(this.state.inbox || {})) {
            const keys = Object.keys(entries || {}).sort();
            const p = this.state.players[pid];
            if (!p || p.kicked || !Number.isInteger(p.team)) {
                // Not (or no longer) playing: drop what they sent; a teamless newcomer is retried next pass
                if (!p || p.kicked) keys.forEach(k => set(`inbox/${pid}/${k}`, null));
                continue;
            }
            // Answers first: they earn the comets that launches spend
            for (const k of keys) {
                const e = entries[k];
                if (e?.k === 'a') this.applyAnswer(set, pid, k, e);
                else if (e?.k !== 's') set(`inbox/${pid}/${k}`, null);
            }
            for (const k of keys) {
                const e = entries[k];
                if (e?.k === 's' && !this.flying.has(`${pid}/${k}`)) this.launch(set, pid, k, e, now);
            }
        }
    }

    applyAnswer(set, pid, key, entry) {
        set(`inbox/${pid}/${key}`, null);
        const p = this.state.players[pid];
        const ok = entry.ok === true;
        set(`players/${pid}/answered`, (p.answered || 0) + 1);
        if (ok) {
            const team = this.state.siege.teams?.[p.team] || { score: 0, shield: RULES.maxShield };
            set(`players/${pid}/correct`, (p.correct || 0) + 1);
            set(`players/${pid}/earned`, (p.earned || 0) + 1);
            set(`players/${pid}/score`, (p.score || 0) + RULES.answerPoints);
            set(`siege/teams/${p.team}/score`, (team.score || 0) + RULES.answerPoints);
            set(`siege/teams/${p.team}/shield`, Math.min(RULES.maxShield, (team.shield || 0) + RULES.answerShield));
        }
        // Class report: how often each question was answered correctly
        const q = Number(entry.q);
        if (Number.isInteger(q) && q >= 0 && q < this.questions.length) {
            const stats = this.state.stats?.[q] || { asked: 0, correct: 0 };
            set(`stats/${q}`, { asked: stats.asked + 1, correct: stats.correct + (ok ? 1 : 0) });
        }
    }

    launch(set, pid, key, entry, now) {
        const p = this.state.players[pid];
        if (!isValidShot(entry)) {
            set(`inbox/${pid}/${key}`, null);
            return;
        }
        // `acc` marks a comet already paid for (the host screen reloaded while it was flying)
        if (entry.acc !== true) {
            if ((p.earned || 0) - (p.spent || 0) <= 0) {
                set(`inbox/${pid}/${key}`, null);
                return;
            }
            set(`players/${pid}/spent`, (p.spent || 0) + 1);
            set(`inbox/${pid}/${key}/acc`, true);
        }
        const flight = simulate(p.team, this.teamCount, entry.dx, entry.dy, entry.p);
        const comet = { id: `${pid}/${key}`, pid, key, team: p.team, flight, landAt: now + flight.ms };
        this.flying.set(comet.id, comet);
        this.later(() => this.poke(), flight.ms + 10);
        this.onEvent({ type: 'launch', ...comet, name: p.name });
    }

    landComets(set, now) {
        for (const comet of [...this.flying.values()]) {
            if (now >= comet.landAt) this.land(set, comet);
        }
    }

    land(set, comet) {
        this.flying.delete(comet.id);
        set(`inbox/${comet.pid}/${comet.key}`, null);
        const p = this.state.players[comet.pid];
        const { end, target, sling } = comet.flight;
        let pts = 0;
        let opened = false;
        const hit = end === 'hit' && Number.isInteger(target) && !!this.state.siege.teams?.[target];
        if (hit && p && !p.kicked) {
            const tgt = this.state.siege.teams[target];
            const open = (tgt.shield || 0) <= 0;
            pts = open ? RULES.hitOpen : RULES.hitShielded;
            const slingshot = sling && this.settings.slingshotBonus !== false;
            if (slingshot) pts *= 2;
            const shield = Math.max(0, (tgt.shield || 0) - RULES.shieldDamage);
            opened = !open && shield === 0;
            const own = this.state.siege.teams[p.team] || { score: 0 };
            set(`siege/teams/${target}/shield`, shield);
            set(`siege/teams/${p.team}/score`, (own.score || 0) + pts);
            set(`players/${comet.pid}/score`, (p.score || 0) + pts);
            set(`players/${comet.pid}/hits`, (p.hits || 0) + 1);
            if (slingshot) set(`players/${comet.pid}/slings`, (p.slings || 0) + 1);
        }
        const slingshot = hit && sling && this.settings.slingshotBonus !== false;
        if (p && !p.kicked) {
            set(`players/${comet.pid}/last`, { k: comet.key, end, target: hit ? target : null, pts, sling: slingshot });
        }
        this.onEvent({ type: 'land', ...comet, name: p?.name || '', pts, sling: slingshot, hit, opened });
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
        return false;
    }

    // Comets still in the air land at once, so nobody loses a point they already earned
    endGame(set, now) {
        for (const comet of [...this.flying.values()]) this.land(set, comet);
        set('meta/status', 'ended');
        set('meta/endedAt', now);
    }
}
