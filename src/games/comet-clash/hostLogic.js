// Comet Clash host controller. Runs on the teacher's screen and is the single source of truth:
// matchmaking, rounds, scoring, bots, forfeits and the game timer. Students only write their own
// round results; everything else is written here.
//
// Scoring (defaults, all teacher-editable):
//   round: first to blast the right answer +1, rival 0; both miss -> both `missPenalty` (-1)
//   duel:  after `rounds` rounds the winner gets `winBonus`; tie -> one sudden-death round,
//          still tied -> both get half the bonus. Beating a bot gives half the bonus.

import { toChoiceRound, decoyPool, shuffle } from '../../platform/questions/rounds';
import { normalizeQuestion } from '../../platform/questions/normalize';
import { secondsFor } from '../../platform/questions/types';
import { roomPath, isOnline, assignPath, collapsePatch, completeResults } from '../../platform/rooms/shared';
import { READ_TIMES, readingMs } from './timing';

export const BOT_NAMES = ['Nova-7', 'Byte', 'Quasar', 'Pixel', 'Zed-9', 'Orbitron', 'Comet-X', 'Astra', 'Vortex', 'Lumen'];

export const DEFAULT_TIMINGS = {
    intro: 3500, // VS screen
    ...READ_TIMES, // the question on its own before each round (see timing.js)
    grace: 2500, // extra time for slow networks after the round clock ends
    leadGrace: 3000, // after someone answers, how long to wait for the rival's report
    result: 2400, // round result on screen
    done: 4500, // duel summary on screen
    forfeitAfter: 15000, // offline this long during a duel -> rival wins by forfeit
    rematchAfter: 5000, // allow facing the same rival again if both waited this long
    noNewDuelsWithin: 10000, // don't start duels in the last seconds of the game
    gapThreshold: 15000 // shorter host outages are ignored
};

// Background tabs may tick only once a minute, so only a longer silence means the laptop was asleep
const LONG_FREEZE_MS = 90000;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Correct answer text shown after a round
export const roundAnswer = (q) => {
    if (!q?.options) return '';
    if (q.kind === 'order') return [...q.options].sort((a, b) => a.order - b.order).map(o => o.text).join(' → ');
    return q.options.filter(o => o.correct).map(o => o.text).join(', ');
};

export class CometClashHost {
    constructor(rt, code, { random = Math.random, timings = {}, tickMs = 250, onError = console.error } = {}) {
        this.rt = rt;
        this.code = code;
        this.random = random;
        this.t = { ...DEFAULT_TIMINGS, ...timings };
        this.tickMs = tickMs;
        this.onError = onError;

        this.state = { meta: null, players: {}, matches: {} };
        this.questions = [];
        this.pool = [];
        this.deck = [];
        this.botPlans = new Map(); // `${matchId}:${round}` -> { ok, t }
        this.offlineSince = new Map();
        this.missed = new Map(); // playerId -> Set(questionIndex)
        this.unsubs = [];
        this.busy = false;
        this.dirty = false;
        this.stopped = false;
    }

    get settings() {
        return this.state.meta?.settings || {};
    }

    defaultRoundMs() {
        return (Number(this.settings.roundTime) || 15) * 1000;
    }

    // The question's own time limit when the teacher allows it, otherwise the game's
    roundMsFor(index) {
        const s = this.settings;
        return secondsFor(this.questions[index], Number(s.roundTime) || 15, s.useQuestionTime !== false) * 1000;
    }

    now() {
        return this.rt.now();
    }

    path(...rest) {
        return roomPath(this.code, ...rest);
    }

    // offlineFor: how long the host screen was gone before this controller started (ms)
    async start({ offlineFor = 0 } = {}) {
        this.pendingGap = offlineFor;
        // Connection drops while this tab stays open count as offline time too
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
        this.pool = decoyPool(this.questions);

        this.unsubs.push(
            this.rt.onValue(this.path('meta'), v => { this.state.meta = v; this.poke(); }),
            this.rt.onValue(this.path('players'), v => { this.state.players = v || {}; this.poke(); }),
            this.rt.onValue(this.path('matches'), v => { this.state.matches = v || {}; this.poke(); }),
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
            'meta/endsAt': now + (Number(this.settings.duration) || 480) * 1000
        };
        for (const [id, p] of Object.entries(this.state.players)) {
            if (p.kicked) continue;
            Object.assign(patch, this.freshPlayer(id, p, now));
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

    freshPlayer(id, p, now) {
        const online = isOnline(p, now);
        return {
            [`players/${id}/status`]: online ? 'queued' : 'away',
            [`players/${id}/queuedAt`]: now,
            [`players/${id}/score`]: p.score ?? 0,
            [`players/${id}/answered`]: p.answered ?? 0,
            [`players/${id}/correct`]: p.correct ?? 0,
            [`players/${id}/wins`]: p.wins ?? 0,
            [`players/${id}/duels`]: p.duels ?? 0
        };
    }

    // ---------- main loop ----------

    applyLocal(patch) {
        for (const [key, value] of Object.entries(patch)) assignPath(this.state, key.split('/'), value);
    }

    async process() {
        const meta = this.state.meta;
        if (!meta || meta.status !== 'live') return;

        const now = this.now();
        const patch = {};
        const set = (key, value) => {
            patch[key] = value;
            assignPath(this.state, key.split('/'), value);
        };

        if (this.checkGap(set, now)) {
            // ended because the host screen was offline too long
        } else if (now >= meta.endsAt) {
            this.endGame(set, now);
        } else {
            this.updatePresence(set, now);
            this.advanceMatches(set, now);
            this.matchmake(set, now);
        }

        if (Object.keys(patch).length) {
            await this.rt.update(this.path(), collapsePatch(patch, this.state));
        }
    }

    updatePresence(set, now) {
        const { players, matches } = this.state;
        for (const [id, p] of Object.entries(players)) {
            if (p.kicked) continue;
            const online = isOnline(p, now);
            if (online) this.offlineSince.delete(id);
            else if (!this.offlineSince.has(id)) this.offlineSince.set(id, now);

            if (!p.status || p.status === 'lobby') {
                // Late joiner (or reconnect after the start)
                Object.entries(this.freshPlayer(id, p, now)).forEach(([k, v]) => set(k, v));
            } else if (p.status === 'queued' && !online) {
                set(`players/${id}/status`, 'away');
            } else if (p.status === 'away' && online) {
                set(`players/${id}/status`, 'queued');
                set(`players/${id}/queuedAt`, now);
            } else if (p.status === 'matched') {
                const match = p.matchId && matches[p.matchId];
                if (!match) {
                    // Stale pointer (e.g. the host reloaded mid-duel): back to the queue
                    set(`players/${id}/status`, online ? 'queued' : 'away');
                    set(`players/${id}/matchId`, null);
                    set(`players/${id}/queuedAt`, now);
                } else if (!online && match.status !== 'done' && now - this.offlineSince.get(id) >= this.t.forfeitAfter) {
                    this.finishMatch(set, match, now, 'forfeit', id);
                }
            }
        }
    }

    matchmake(set, now) {
        const meta = this.state.meta;
        if (now > meta.endsAt - this.t.noNewDuelsWithin) return;
        const settings = this.settings;

        const queue = Object.entries(this.state.players)
            .filter(([, p]) => p.status === 'queued' && !p.kicked && isOnline(p, now))
            .map(([id, p]) => ({ id, ...p }))
            .sort((a, b) => (a.queuedAt || 0) - (b.queuedAt || 0));

        const paired = new Set();
        for (const a of queue) {
            if (paired.has(a.id)) continue;
            const free = queue.filter(b => b.id !== a.id && !paired.has(b.id));
            let partner = free.find(b => b.id !== a.lastOpponent && b.lastOpponent !== a.id);
            if (!partner) {
                // Only the last rival is free: allow a rematch once both have waited a bit
                partner = free.find(b => now - (a.queuedAt || 0) >= this.t.rematchAfter && now - (b.queuedAt || 0) >= this.t.rematchAfter);
            }
            if (partner) {
                paired.add(a.id);
                paired.add(partner.id);
                this.createMatch(set, now, a.id, partner.id);
            } else if (settings.bots !== false && now - (a.queuedAt || 0) >= (Number(settings.botWait) || 8) * 1000) {
                paired.add(a.id);
                this.createMatch(set, now, a.id, null);
            }
        }
    }

    createMatch(set, now, aId, bId) {
        const id = this.rt.newKey();
        const bKey = bId || 'bot';
        set(`matches/${id}`, {
            id,
            a: aId,
            b: bKey,
            bot: bId ? null : { name: BOT_NAMES[Math.floor(this.random() * BOT_NAMES.length)] },
            createdAt: now,
            status: 'intro',
            introUntil: now + this.t.intro,
            rounds: clamp(Number(this.settings.rounds) || 5, 1, 15),
            round: 0,
            scores: { [aId]: 0, [bKey]: 0 },
            asked: { none: true }
        });
        for (const pid of [aId, bId].filter(Boolean)) {
            set(`players/${pid}/status`, 'matched');
            set(`players/${pid}/matchId`, id);
        }
    }

    advanceMatches(set, now) {
        const { players, matches } = this.state;
        for (const m of Object.values(matches)) {
            if (!m?.id) continue;
            const a = players[m.a];
            const b = m.b === 'bot' ? null : players[m.b];

            if (m.status !== 'done') {
                // Kicked or deleted players forfeit immediately
                if (!a || a.kicked) {
                    this.finishMatch(set, m, now, 'forfeit', m.a);
                    continue;
                }
                if (m.b !== 'bot' && (!b || b.kicked)) {
                    this.finishMatch(set, m, now, 'forfeit', m.b);
                    continue;
                }
            }

            if (m.status === 'intro' && now >= m.introUntil) this.startRound(set, m, 1, now);
            else if (m.status === 'round') this.checkRound(set, m, now);
            else if (m.status === 'result' && now >= m.resultUntil) this.nextRoundOrFinish(set, m, now);
            else if (m.status === 'done' && now >= m.doneUntil) this.releaseMatch(set, m, now);
        }
    }

    // ---------- rounds ----------

    pickQuestion(m) {
        const asked = new Set(Object.keys(m.asked || {}).filter(k => k !== 'none').map(Number));
        const missed = new Set([...(this.missed.get(m.a) || []), ...(this.missed.get(m.b) || [])]);
        const retry = [...missed].filter(i => !asked.has(i));

        const tryBuild = (index) => {
            const q = this.questions[index];
            const round = q && toChoiceRound(q, this.pool, { maxOptions: 4, rand: this.random });
            return round ? { index, round } : null;
        };

        // Missed questions come back later (spaced repetition)
        if (retry.length && this.random() < 0.35) {
            const built = tryBuild(retry[Math.floor(this.random() * retry.length)]);
            if (built) return built;
        }
        for (let refills = 0; refills < 3; refills++) {
            while (this.deck.length) {
                const index = this.deck.pop();
                if (asked.has(index)) continue;
                const built = tryBuild(index);
                if (built) return built;
            }
            this.deck = shuffle(this.questions.map((_, i) => i), this.random);
        }
        // Small set: repeats are allowed
        for (let attempt = 0; attempt < this.questions.length * 2; attempt++) {
            const built = tryBuild(Math.floor(this.random() * this.questions.length));
            if (built) return built;
        }
        return null;
    }

    startRound(set, m, round, now) {
        const picked = this.pickQuestion(m);
        if (!picked) {
            this.finishMatch(set, m, now, 'time');
            return;
        }
        const roundTime = this.roundMsFor(picked.index);
        const startAt = now + readingMs(picked.round.prompt, this.t);
        const base = `matches/${m.id}`;
        set(`${base}/status`, 'round');
        set(`${base}/round`, round);
        set(`${base}/sudden`, round > m.rounds);
        set(`${base}/q`, { index: picked.index, ...picked.round, seed: Math.floor(this.random() * 2 ** 31) });
        set(`${base}/readAt`, now);
        set(`${base}/roundStartAt`, startAt);
        set(`${base}/roundMs`, roundTime);
        set(`${base}/deadlineAt`, startAt + roundTime + this.t.grace);
        set(`${base}/lead`, null);
        set(`${base}/asked/${picked.index}`, true);

        if (m.b === 'bot') this.botPlans.set(`${m.id}:${round}`, this.makeBotPlan(m, picked.round, roundTime));
    }

    makeBotPlan(m, round, roundTime) {
        const human = this.state.players[m.a] || {};
        const accuracy = ((human.correct || 0) + 1) / ((human.answered || 0) + 2);
        const chance = clamp(0.25 + 0.6 * accuracy, 0.3, 0.8);
        const slower = round.kind === 'single' ? 1 : 1.4;
        const t = clamp(roundTime * (0.3 + this.random() * 0.45) * slower, 1200, roundTime - 300);
        return { ok: this.random() < chance, t: Math.round(t) };
    }

    checkRound(set, m, now) {
        const round = m.round;
        const results = completeResults(m.results?.[round]);
        const base = `matches/${m.id}`;
        const elapsed = now - m.roundStartAt;

        if (m.b === 'bot') {
            const key = `${m.id}:${round}`;
            const roundMs = m.roundMs || this.defaultRoundMs();
            if (!this.botPlans.has(key)) {
                this.botPlans.set(key, this.makeBotPlan(m, m.q || { kind: 'single' }, roundMs));
            }
            const plan = this.botPlans.get(key);
            const human = results[m.a];
            if (plan.ok && elapsed >= plan.t) results.bot = { ok: true, t: plan.t };
            // Once the human has finished, the bot's (secret) result is final
            if (human) results.bot = { ok: plan.ok, t: plan.ok ? plan.t : null };
            if (!plan.ok && elapsed >= roundMs) results.bot = { ok: false, t: null };
        }

        // Tell the slower player someone already found it (their device decides if they can still win)
        const oks = Object.entries(results)
            .filter(([, r]) => r?.ok && Number.isFinite(r.t))
            .sort((x, y) => x[1].t - y[1].t);
        const leader = oks[0];
        if (leader && (!m.lead || m.lead.t > leader[1].t)) {
            set(`${base}/lead`, { pid: leader[0], t: leader[1].t });
        }

        const participants = [m.a, m.b];
        const allIn = participants.every(p => results[p]);
        const leadTimedOut = leader && elapsed >= leader[1].t + this.t.leadGrace;
        if (allIn || now >= m.deadlineAt || leadTimedOut) this.resolveRound(set, m, results, now);
    }

    resolveRound(set, m, results, now) {
        const settings = this.settings;
        const base = `matches/${m.id}`;
        const participants = [m.a, m.b];
        const entries = participants.map(id => ({ id, res: results[id] || { ok: false, missing: true } }));
        const oks = entries.filter(e => e.res.ok && Number.isFinite(e.res.t)).sort((x, y) => x.res.t - y.res.t);

        const deltas = {};
        let outcome;
        if (oks.length === 0) {
            outcome = 'both-miss';
            const penalty = Number(settings.missPenalty ?? -1);
            participants.forEach(id => { deltas[id] = penalty; });
        } else if (oks.length > 1 && oks[1].res.t - oks[0].res.t < 1) {
            outcome = 'tie';
            oks.forEach(e => { deltas[e.id] = 1; });
        } else {
            outcome = oks[0].id;
            deltas[oks[0].id] = 1;
        }

        for (const id of participants) {
            set(`${base}/scores/${id}`, (m.scores?.[id] || 0) + (deltas[id] || 0));
            if (id === 'bot') continue;
            const p = this.state.players[id];
            if (!p) continue;
            const res = results[id];
            set(`players/${id}/score`, this.addScore(p.score, deltas[id] || 0));
            set(`players/${id}/answered`, (p.answered || 0) + 1);
            if (res?.ok) set(`players/${id}/correct`, (p.correct || 0) + 1);
            else {
                if (!this.missed.has(id)) this.missed.set(id, new Set());
                this.missed.get(id).add(m.q?.index);
            }
        }

        // Class report: how often each question was answered correctly
        const qIndex = m.q?.index;
        if (Number.isInteger(qIndex)) {
            const stats = this.state.stats?.[qIndex] || { asked: 0, correct: 0 };
            const humans = participants.filter(id => id !== 'bot');
            const next = {
                asked: stats.asked + humans.length,
                correct: stats.correct + humans.filter(id => results[id]?.ok).length
            };
            set(`stats/${qIndex}`, next);
        }

        set(`${base}/status`, 'result');
        set(`${base}/resultUntil`, now + this.t.result);
        set(`${base}/last`, {
            round: m.round,
            outcome,
            deltas,
            answer: roundAnswer(m.q),
            times: Object.fromEntries(entries.map(e => [e.id, e.res.ok ? e.res.t : null]))
        });
        this.botPlans.delete(`${m.id}:${m.round}`);
    }

    nextRoundOrFinish(set, m, now) {
        const scoreA = m.scores?.[m.a] || 0;
        const scoreB = m.scores?.[m.b] || 0;
        if (m.round < m.rounds) {
            this.startRound(set, m, m.round + 1, now);
        } else if (m.round === m.rounds && scoreA === scoreB && this.settings.suddenDeath !== false) {
            this.startRound(set, m, m.rounds + 1, now);
        } else {
            this.finishMatch(set, m, now, 'rounds');
        }
    }

    // reason: 'rounds' | 'forfeit' (loserId left/kicked) | 'time' (game ended, no bonus)
    finishMatch(set, m, now, reason, loserId = null) {
        if (m.status === 'done') return;
        const base = `matches/${m.id}`;
        const settings = this.settings;
        const vsBot = m.b === 'bot';
        const fullBonus = Math.max(0, Number(settings.winBonus ?? 3));
        const bonus = vsBot ? Math.floor(fullBonus / 2) : fullBonus;
        const scoreA = m.scores?.[m.a] || 0;
        const scoreB = m.scores?.[m.b] || 0;

        let winner = null;
        if (reason === 'rounds') winner = scoreA === scoreB ? null : scoreA > scoreB ? m.a : m.b;
        if (reason === 'forfeit') {
            const other = loserId === m.a ? m.b : m.a;
            const otherPlayer = other === 'bot' ? null : this.state.players[other];
            winner = other === 'bot' || (otherPlayer && !otherPlayer.kicked && isOnline(otherPlayer, now)) ? other : null;
        }

        const bonuses = {};
        if (reason === 'rounds' || reason === 'forfeit') {
            if (winner && winner !== 'bot') bonuses[winner] = bonus;
            if (!winner && reason === 'rounds') {
                for (const id of [m.a, m.b]) if (id !== 'bot') bonuses[id] = Math.floor(bonus / 2);
            }
        }

        for (const id of [m.a, m.b]) {
            if (id === 'bot') continue;
            const p = this.state.players[id];
            if (!p || p.kicked) continue;
            if (bonuses[id]) set(`players/${id}/score`, this.addScore(p.score, bonuses[id]));
            if (reason !== 'time') set(`players/${id}/duels`, (p.duels || 0) + 1);
            if (winner === id) set(`players/${id}/wins`, (p.wins || 0) + 1);
            if (id === loserId) {
                // The player who left goes "away" now; they rejoin the queue when back online
                set(`players/${id}/status`, 'away');
                set(`players/${id}/matchId`, null);
            }
        }

        set(`${base}/status`, 'done');
        set(`${base}/doneUntil`, now + this.t.done);
        set(`${base}/outcome`, { winner, bonuses, reason });
        this.botPlans.delete(`${m.id}:${m.round}`);
    }

    releaseMatch(set, m, now) {
        for (const id of [m.a, m.b]) {
            if (id === 'bot') continue;
            const p = this.state.players[id];
            if (!p || p.kicked || p.matchId !== m.id) continue;
            set(`players/${id}/status`, isOnline(p, now) ? 'queued' : 'away');
            set(`players/${id}/matchId`, null);
            set(`players/${id}/queuedAt`, now);
            set(`players/${id}/lastOpponent`, id === m.a ? m.b : m.a);
        }
        set(`matches/${m.id}`, null);
    }

    // The host screen was offline (tab closed, laptop asleep, network lost). Past the teacher's limit the
    // game ends; otherwise it continues and the clock is moved forward so no playing time is lost.
    // Returns true when the game was ended.
    checkGap(set, now) {
        let gap = this.pendingGap || 0;
        this.pendingGap = 0;
        // Timers frozen for a long time (laptop asleep) also count
        if (this.lastTick && now - this.lastTick > LONG_FREEZE_MS) gap = Math.max(gap, now - this.lastTick);
        this.lastTick = now;
        if (gap < this.t.gapThreshold) return false;

        const limit = (Number(this.settings.hostTimeout) || 0) * 1000;
        if (limit > 0 && gap >= limit) {
            set('meta/endReason', 'host-offline');
            this.endGame(set, now);
            return true;
        }
        this.shiftClock(set, gap);
        return false;
    }

    shiftClock(set, gap) {
        const meta = this.state.meta;
        if (meta.endsAt) set('meta/endsAt', meta.endsAt + gap);
    }

    endGame(set, now) {
        for (const m of Object.values(this.state.matches)) {
            if (m?.id && m.status !== 'done') this.finishMatch(set, m, now, 'time');
        }
        set('meta/status', 'ended');
        set('meta/endedAt', now);
    }

    addScore(current, delta) {
        const next = (Number(current) || 0) + delta;
        return this.settings.negativeScores ? next : Math.max(0, next);
    }
}
