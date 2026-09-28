// Meteor Shower: every student plays every question at the same time (no duels).
//
// Scoring per question (teacher-editable miss points):
//   found it    -> round(100 × fastest correct time ÷ your time), so the fastest player gets 100
//   didn't find -> missPoints (default −100)
// Students who are offline for the whole question (and send nothing) are skipped, not penalized.
//
// rooms/{code}/shower = { status: 'intro'|'round'|'result', round, total, q, introUntil,
//                         roundStartAt, deadlineAt, resultUntil, asked, last }
// rooms/{code}/shower/results/{round}/{playerId} = { ok, t, wrong }   (written by each player)

import { toChoiceRound, shuffle } from '../../platform/questions/rounds';
import { isOnline, collapsePatch, completeResults } from '../../platform/rooms/shared';
import { CometClashHost, roundAnswer } from './hostLogic';

export const SHOWER_TIMINGS = {
    intro: 4000, // "Get ready" before the first question
    countdown: 1600, // 3-2-1 before each question
    grace: 2500, // extra time for slow networks after the question clock ends
    result: 6000 // answer + leaderboard between questions
};

// Points for one found answer; exported for tests and the host's "how scoring works" text
export const showerPoints = (fastestMs, myMs) =>
    Math.max(1, Math.min(100, Math.round((100 * Math.max(1, fastestMs)) / Math.max(1, myMs))));

export class MeteorShowerHost extends CometClashHost {
    constructor(rt, code, opts = {}) {
        super(rt, code, opts);
        this.st = { ...SHOWER_TIMINGS, ...(opts.showerTimings || {}) };
        this.state.shower = null;
    }

    async start(opts) {
        await super.start(opts);
        this.unsubs.push(this.rt.onValue(this.path('shower'), v => { this.state.shower = v; this.poke(); }));
    }

    get total() {
        return Math.max(1, Number(this.settings.showerQuestions) || 10);
    }

    async startGame() {
        const meta = this.state.meta;
        if (!meta || meta.status !== 'lobby') return;
        const now = this.now();
        const patch = {
            'meta/status': 'live',
            'meta/startedAt': now,
            'meta/endsAt': null,
            shower: { status: 'intro', round: 0, total: this.total, introUntil: now + this.st.intro, asked: { none: true } }
        };
        for (const [id, p] of Object.entries(this.state.players)) {
            if (p.kicked) continue;
            Object.assign(patch, this.freshStats(id, p));
        }
        this.applyLocal(patch);
        await this.rt.update(this.path(), patch);
        this.poke();
    }

    freshStats(id, p) {
        return {
            [`players/${id}/status`]: 'playing',
            [`players/${id}/score`]: p.score ?? 0,
            [`players/${id}/answered`]: p.answered ?? 0,
            [`players/${id}/correct`]: p.correct ?? 0
        };
    }

    // "End now" from the host screen
    async endNow() {
        await this.rt.update(this.path('meta'), { endsAt: this.now() });
        this.poke();
    }

    async addTime() {
        /* no game clock in this mode */
    }

    async process() {
        const meta = this.state.meta;
        const sh = this.state.shower;
        if (!meta || meta.status !== 'live' || !sh) return;

        const now = this.now();
        const patch = {};
        const set = (key, value) => {
            patch[key] = value;
            this.applyLocal({ [key]: value });
        };

        if (this.checkGap(set, now)) {
            // ended: host offline too long
        } else if (meta.endsAt && now >= meta.endsAt) {
            this.endGame(set, now);
        } else {
            // Late joiners get their counters
            for (const [id, p] of Object.entries(this.state.players)) {
                if (!p.kicked && p.status !== 'playing') Object.entries(this.freshStats(id, p)).forEach(([k, v]) => set(k, v));
            }
            if (sh.status === 'intro' && now >= sh.introUntil) this.startRound(set, 1, now);
            else if (sh.status === 'round') this.checkRound(set, now);
            else if (sh.status === 'result' && now >= sh.resultUntil) {
                if (sh.round >= (sh.total || this.total)) this.endGame(set, now);
                else this.startRound(set, sh.round + 1, now);
            }
        }

        if (Object.keys(patch).length) await this.rt.update(this.path(), collapsePatch(patch, this.state));
    }

    pickShowerQuestion() {
        const asked = new Set(Object.keys(this.state.shower?.asked || {}).filter(k => k !== 'none').map(Number));
        const fresh = shuffle(this.questions.map((_, i) => i).filter(i => !asked.has(i)), this.random);
        const tryBuild = (index) => {
            const round = toChoiceRound(this.questions[index], this.pool, { maxOptions: 4, rand: this.random });
            return round ? { index, round } : null;
        };
        for (const index of fresh) {
            const built = tryBuild(index);
            if (built) return built;
        }
        // Every question was used: repeats are allowed
        for (let attempt = 0; attempt < this.questions.length * 2; attempt++) {
            const built = tryBuild(Math.floor(this.random() * this.questions.length));
            if (built) return built;
        }
        return null;
    }

    startRound(set, round, now) {
        const picked = this.pickShowerQuestion();
        if (!picked) {
            this.endGame(set, now);
            return;
        }
        const roundTime = (Number(this.settings.roundTime) || 15) * 1000;
        const startAt = now + this.st.countdown;
        set('shower/status', 'round');
        set('shower/round', round);
        set('shower/q', { index: picked.index, ...picked.round, seed: Math.floor(this.random() * 2 ** 31) });
        set('shower/roundStartAt', startAt);
        set('shower/deadlineAt', startAt + roundTime + this.st.grace);
        set(`shower/asked/${picked.index}`, true);
    }

    checkRound(set, now) {
        const sh = this.state.shower;
        const results = completeResults(sh.results?.[sh.round]);
        const active = Object.entries(this.state.players).filter(([, p]) => !p.kicked && isOnline(p, now));
        const allIn = active.length > 0 && active.every(([id]) => results[id]);
        if (allIn || now >= sh.deadlineAt) this.resolveRound(set, results, now);
    }

    resolveRound(set, results, now) {
        const sh = this.state.shower;
        const missPoints = Number(this.settings.missPoints ?? -100);
        const found = Object.entries(results)
            .filter(([, r]) => r?.ok && Number.isFinite(r.t))
            .sort((x, y) => x[1].t - y[1].t);
        const fastest = found[0];
        const deltas = {};
        let answered = 0;

        for (const [id, p] of Object.entries(this.state.players)) {
            if (p.kicked) continue;
            const res = results[id];
            // Absent for the whole question: no penalty
            if (!res && !isOnline(p, now)) continue;
            answered++;
            const delta = res?.ok && fastest ? showerPoints(fastest[1].t, res.t) : missPoints;
            deltas[id] = delta;
            set(`players/${id}/score`, this.addScore(p.score, delta));
            set(`players/${id}/answered`, (p.answered || 0) + 1);
            if (res?.ok) set(`players/${id}/correct`, (p.correct || 0) + 1);
        }

        const qIndex = sh.q?.index;
        if (Number.isInteger(qIndex) && answered > 0) {
            const stats = this.state.stats?.[qIndex] || { asked: 0, correct: 0 };
            set(`stats/${qIndex}`, { asked: stats.asked + answered, correct: stats.correct + found.length });
        }

        set('shower/status', 'result');
        set('shower/resultUntil', now + this.st.result);
        set('shower/last', {
            round: sh.round,
            answer: roundAnswer(sh.q),
            deltas,
            found: found.length,
            answered,
            fastest: fastest ? { pid: fastest[0], t: fastest[1].t } : null
        });
    }

    endGame(set, now) {
        set('meta/status', 'ended');
        set('meta/endedAt', now);
    }
}
