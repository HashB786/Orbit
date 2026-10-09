// Moonshot host controller. Runs on the teacher's screen and keeps the score. Students climb on their
// own devices (see climber.js) and share how high they are; this controller checks that nobody climbs
// faster than is possible, records each student's best altitude and announces the big moments.
//
// rooms/{code}/
//   climbers/{playerId}    "t,x,y,vy,f,best" (player)
//   inbox/{playerId}/{key} { k: 'a', q, ok, at } answer | { k: 's', act: 'caught' }   (player, write-once)
//   players/{id}           alt (best metres), score, zone, answered, correct, streak, falls, res, ack (host)
//   stats/{questionIndex}  { asked, correct }  for the class report                   (host)
//   meta.seed              the number every device builds the same tower from         (host)

import { normalizeQuestion } from '../../platform/questions/normalize';
import { roomPath, assignPath, collapsePatch } from '../../platform/rooms/shared';
import { MAX_CLIMB, decodeClimber, zoneAt, ZONES } from './world';

// Shorter host outages are ignored; past the teacher's limit the game ends (see checkGap)
const GAP_THRESHOLD = 15000;
// Background tabs may tick only once a minute, so only a longer silence means the laptop was asleep
const LONG_FREEZE_MS = 90000;
const RESULTS_KEPT = 6;

export const RULES = {
    answerGapMs: 700, // answers closer together than this are not counted (no button mashing)
    streakEvery: 3 // every third right answer in a row is worth announcing
};

export class ClimbHost {
    // onEvent({ type, ... }) lets the big screen cheer and log
    constructor(rt, code, { random = Math.random, tickMs = 250, onEvent = () => {}, onError = console.error } = {}) {
        this.rt = rt;
        this.code = code;
        this.random = random;
        this.tickMs = tickMs;
        this.onEvent = onEvent;
        this.onError = onError;
        this.state = { meta: null, players: {}, inbox: {}, stats: {}, climbers: {} };
        this.questions = [];
        this.seen = new Map(); // playerId -> { t, best } the last altitude this screen believed
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
            this.rt.onValue(this.path('inbox'), v => { this.state.inbox = v || {}; this.poke(); }),
            // Climbers move many times a second: they are read on the next pass, not one pass each
            this.rt.onValue(this.path('climbers'), v => { this.state.climbers = v || {}; }),
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
            'meta/seed': 1 + Math.floor(this.random() * 2000000000)
        };
        this.seen.clear();
        for (const [id] of this.activePlayers()) {
            Object.assign(patch, this.freshPlayer(id));
            this.seen.set(id, { t: now, best: 0 });
        }
        this.applyLocal(patch);
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

    freshPlayer(id) {
        const out = {};
        for (const key of ['score', 'alt', 'zone', 'answered', 'correct', 'streak', 'falls']) out[`players/${id}/${key}`] = 0;
        out[`players/${id}/ready`] = true;
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
            this.readInbox(set, now, true);
        } else if (meta.status === 'live') {
            if (this.checkGap(set, now)) {
                // ended: the host screen was offline too long
            } else if (now >= meta.endsAt) {
                this.endGame(set, now);
            } else {
                this.joinLate(set);
                this.readInbox(set, now, false);
                this.readClimbers(set, now);
            }
        }

        if (Object.keys(patch).length) await this.rt.update(this.path(), collapsePatch(patch, this.state));
    }

    // Someone who arrives after the start begins at the bottom
    joinLate(set) {
        for (const [id, p] of this.activePlayers()) {
            if (p.ready) continue;
            Object.entries(this.freshPlayer(id)).forEach(([k, v]) => set(k, v));
            this.seen.set(id, { t: this.now(), best: 0 });
        }
    }

    readInbox(set, now, lobby) {
        for (const [pid, entries] of Object.entries(this.state.inbox || {})) {
            const keys = Object.keys(entries || {}).sort();
            const p = this.state.players[pid];
            if (!p || p.kicked) {
                keys.forEach(k => set(`inbox/${pid}/${k}`, null));
                continue;
            }
            const results = { ...(p.res || {}) };
            let acked = p.ack || '';
            for (const k of keys) {
                const e = entries[k];
                set(`inbox/${pid}/${k}`, null);
                if (k > acked) acked = k;
                if (lobby) continue;
                if (e?.k === 'a') results[k] = this.applyAnswer(set, pid, e, now);
                else if (e?.k === 's' && e.act === 'caught') {
                    set(`players/${pid}/falls`, (this.state.players[pid].falls || 0) + 1);
                    this.onEvent({ type: 'caught', pid, name: p.name });
                }
            }
            if (acked !== (p.ack || '')) {
                set(`players/${pid}/ack`, acked);
                const recent = Object.keys(results).sort().slice(-RESULTS_KEPT);
                set(`players/${pid}/res`, Object.fromEntries(recent.map(k => [k, results[k]])));
            }
        }
    }

    applyAnswer(set, pid, entry, now) {
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
        const hot = streak > 0 && streak % RULES.streakEvery === 0;
        if (hot) this.onEvent({ type: 'streak', pid, name: p.name, streak });
        return { kind: 'answer', ok: true, streak, hot };
    }

    // How high everyone is. Nobody can climb faster than MAX_CLIMB, however the numbers arrive.
    readClimbers(set, now) {
        for (const [pid, text] of Object.entries(this.state.climbers || {})) {
            const p = this.state.players[pid];
            if (!p || p.kicked || !p.name) continue;
            const snap = decodeClimber(text);
            if (!snap || !(snap.best >= 0) || snap.best > 100000) continue;
            // Only real time earns altitude, so repeated passes in the same moment cannot ratchet it up
            const last = this.seen.get(pid) || { t: now, best: p.alt || 0 };
            const window = Math.max(0, Math.min(60, (now - last.t) / 1000));
            const best = Math.min(snap.best, Math.max(last.best, last.best + MAX_CLIMB * window));
            this.seen.set(pid, { t: now, best });
            if (best <= (p.alt || 0) + 0.05) continue;
            set(`players/${pid}/alt`, Math.round(best * 10) / 10);
            set(`players/${pid}/score`, Math.round(best));
            const zone = zoneAt(best);
            if (zone > (p.zone || 0)) {
                set(`players/${pid}/zone`, zone);
                this.onEvent({ type: 'zone', pid, name: p.name, zone, at: ZONES[zone].at });
            }
        }
    }

    // The host screen was offline (tab closed, laptop asleep, network lost). Past the teacher's limit the
    // game ends; otherwise it continues and the clock moves forward so no climbing time is lost.
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
        // The storm follows the game clock, so the clock moves on with the players
        if (this.state.meta.endsAt) set('meta/endsAt', this.state.meta.endsAt + gap);
        if (this.state.meta.startedAt) set('meta/startedAt', this.state.meta.startedAt + gap);
        for (const [pid, s] of this.seen) this.seen.set(pid, { ...s, t: now });
        return false;
    }

    endGame(set, now) {
        set('meta/status', 'ended');
        set('meta/endedAt', now);
    }
}
