import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Heart, Flame, RotateCcw, LogOut, BookOpen, Check, X, Trophy } from 'lucide-react';
import { SPACE_BG } from '../../components/SpaceScreen';
import { toChoiceRound, decoyPool, shuffle } from '../../platform/questions/rounds';
import { answerLabel, secondsFor } from '../../platform/questions/types';
import { audio } from '../../platform/audio/audio';
import { useTheme } from '../../context/ThemeContext';
import { Playfield } from './playfield';
import { ReadingCard, roundHint } from './playerUi';
import { readingMs } from './timing';
import { useLanguage } from '../../context/LanguageContext';
import { localeOf } from '../../i18n';

const LIVES = 3;
const ROUND_SECONDS = 15;

const readBest = (key) => {
    try {
        return Number(localStorage.getItem(key)) || 0;
    } catch {
        return 0;
    }
};

// Solo practice: endless rounds, 3 lives, combos. Missed questions return a few rounds later.
const Practice = ({ set, questions, onExit }) => {
    const { t, lang } = useLanguage();
    const locale = localeOf(lang);
    const { performance } = useTheme();
    const canvasRef = useRef(null);
    const fieldRef = useRef(null);
    const game = useRef(null);
    const [hud, setHud] = useState({ score: 0, lives: LIVES, streak: 0, correct: 0, rounds: 0 });
    const [round, setRound] = useState(null);
    const [reading, setReading] = useState(null); // { total, elapsed } while the question is shown on its own
    const [progress, setProgress] = useState(null);
    const [phase, setPhase] = useState('play'); // play | paused | over
    const [runId, setRunId] = useState(0);
    const bestKey = `orbit.practiceBest.${set.id}`;
    const [best, setBest] = useState(() => readBest(bestKey));
    const [review, setReview] = useState([]);
    const pool = useMemo(() => decoyPool(questions), [questions]);

    const multiplier = (streak) => Math.min(5, 1 + Math.floor(streak / 3));

    // One playfield per run
    useEffect(() => {
        const field = new Playfield(canvasRef.current, {
            lowFx: !performance.particles || performance.reducedMotion,
            pauseOnBlur: true,
            onEvent: (e) => handleEvent(e)
        });
        fieldRef.current = field;
        field.mount();
        const observer = new ResizeObserver(() => field.resize());
        observer.observe(canvasRef.current);

        game.current = {
            deck: [],
            retry: [],
            roundNo: 0,
            current: null,
            hud: { score: 0, lives: LIVES, streak: 0, correct: 0, rounds: 0 },
            missed: new Map(),
            timer: 0,
            pending: false, // the question is being read; asteroids not out yet
            readTimer: 0,
            readLeft: 0,
            readStart: 0,
            over: false
        };
        setHud(game.current.hud);
        setReview([]);
        setReading(null);
        setPhase('play');
        nextRound(400);

        return () => {
            clearTimeout(game.current?.timer);
            clearTimeout(game.current?.readTimer);
            observer.disconnect();
            field.destroy();
            fieldRef.current = null;
        };
    }, [runId]); // eslint-disable-line react-hooks/exhaustive-deps

    const pickQuestion = () => {
        const g = game.current;
        g.roundNo++;
        const due = g.retry.findIndex(r => r.due <= g.roundNo);
        if (due !== -1) return g.retry.splice(due, 1)[0].index;
        if (!g.deck.length) {
            g.deck = shuffle(questions.map((_, i) => i));
            if (g.deck.length > 1 && g.deck[g.deck.length - 1] === g.lastIndex) g.deck.unshift(g.deck.pop());
        }
        return g.deck.pop();
    };

    const nextRound = (delay) => {
        const g = game.current;
        clearTimeout(g.timer);
        g.timer = setTimeout(() => {
            if (g.over) return;
            let built = null;
            for (let i = 0; i < questions.length + 1 && !built; i++) {
                const index = pickQuestion();
                const choice = toChoiceRound(questions[index], pool, { maxOptions: 4 });
                if (choice) built = { index, ...choice };
            }
            if (!built) return;
            g.lastIndex = built.index;
            g.current = { ...built, missed: false, ms: secondsFor(questions[built.index], ROUND_SECONDS) * 1000 };
            setRound(built);
            setProgress(null);
            // Read the question first; the asteroids come when the time is up (or on a tap)
            const total = readingMs(built.prompt);
            g.pending = true;
            g.readLeft = total;
            g.readStart = Date.now();
            setReading({ total, elapsed: 0 });
            audio.sfx('question');
            g.readTimer = setTimeout(beginRound, total);
        }, delay);
    };

    const beginRound = () => {
        const g = game.current;
        if (!g || g.over || !g.pending) return;
        clearTimeout(g.readTimer);
        g.pending = false;
        setReading(null);
        audio.sfx('go');
        fieldRef.current?.startRound({
            kind: g.current.kind,
            options: g.current.options,
            seed: Math.floor(Math.random() * 2 ** 31),
            timeLimitMs: g.current.ms,
            penalty: { stun: 0, timeCost: 2 }
        });
    };

    // Pausing while the question is being read freezes the reading time too
    useEffect(() => {
        const g = game.current;
        if (!g?.pending) return;
        if (phase === 'paused') {
            clearTimeout(g.readTimer);
            g.readLeft = Math.max(0, g.readLeft - (Date.now() - g.readStart));
        } else if (phase === 'play') {
            g.readStart = Date.now();
            g.readTimer = setTimeout(beginRound, g.readLeft);
            setReading(r => (r ? { total: r.total, elapsed: r.total - g.readLeft } : r));
        }
    }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

    const noteMiss = (picked) => {
        const g = game.current;
        const q = questions[g.current.index];
        const key = g.current.index;
        const entry = g.missed.get(key) || { q, picked: new Set(), times: 0 };
        if (picked) entry.picked.add(picked);
        if (!g.current.missed) {
            entry.times++;
            g.current.missed = true;
            g.retry.push({ index: key, due: g.roundNo + 3 });
        }
        g.missed.set(key, entry);
    };

    const update = (patch) => {
        const g = game.current;
        g.hud = { ...g.hud, ...patch };
        setHud(g.hud);
    };

    const endRun = () => {
        const g = game.current;
        g.over = true;
        setPhase('over');
        setReview([...g.missed.values()].map(e => ({ q: e.q, picked: [...e.picked], times: e.times })).sort((a, b) => b.times - a.times));
        if (g.hud.score > readBest(bestKey)) {
            try {
                localStorage.setItem(bestKey, String(g.hud.score));
            } catch {
                /* ignore */
            }
            setBest(g.hud.score);
        }
    };

    const handleEvent = (e) => {
        const g = game.current;
        if (!g || g.over) return;
        if (e.type === 'progress') setProgress({ found: e.found, total: e.total });
        if (e.type === 'wrong') {
            noteMiss(e.text);
            update({ streak: 0 });
        }
        if (e.type === 'complete') {
            const streak = g.hud.streak + 1;
            const gained = Math.round((100 + Math.max(0, (g.current?.ms || ROUND_SECONDS * 1000) - e.t) / 100) * multiplier(g.hud.streak));
            let lives = g.hud.lives;
            if (streak % 5 === 0 && lives < 5) lives++;
            update({ score: g.hud.score + gained, streak, correct: g.hud.correct + 1, rounds: g.hud.rounds + 1, lives });
            nextRound(900);
        }
        if (e.type === 'timeout') {
            noteMiss(null);
            const lives = g.hud.lives - 1;
            update({ lives, streak: 0, rounds: g.hud.rounds + 1 });
            if (lives <= 0) {
                g.timer = setTimeout(endRun, 1700);
            } else {
                nextRound(1900);
            }
        }
        if (e.type === 'autopause') setPhase('paused');
    };

    const togglePause = (evt) => {
        evt?.currentTarget?.blur();
        const field = fieldRef.current;
        if (!field || phase === 'over') return;
        const pausing = phase !== 'paused';
        field.setPaused(pausing);
        setPhase(pausing ? 'paused' : 'play');
    };

    useEffect(() => {
        const onKey = (e) => {
            if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
            else if ((e.code === 'Space' || e.code === 'Enter') && phase === 'play' && game.current?.pending) beginRound();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const mult = multiplier(hud.streak);

    return (
        <div className="app-height w-full flex flex-col bg-[#040714] text-white select-none overflow-hidden" onPointerDown={() => audio.unlock()}>
            <div className="shrink-0 bg-[#070b1d] border-b border-white/10 pt-safe">
                <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4 h-14">
                    <button onClick={togglePause} aria-label={t('solo.pause')} className="w-10 h-10 shrink-0 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center">
                        <Pause size={18} />
                    </button>
                    <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold leading-none">{t('cc.score')}</div>
                        <div className="font-black text-xl sm:text-2xl tabular-nums leading-tight">{hud.score.toLocaleString(locale)}</div>
                    </div>
                    {mult > 1 && <span className="px-2 py-1 rounded-lg bg-amber-400/15 text-amber-300 text-xs sm:text-sm font-black flex items-center gap-1"><Flame size={14} /> ×{mult}</span>}
                    <span className="hidden sm:inline text-xs font-bold text-gray-400 truncate">{set.title}</span>
                    <div className="ml-auto flex items-center gap-0.5 sm:gap-1" aria-label={t('solo.lives', { count: hud.lives })}>
                        {Array.from({ length: Math.max(LIVES, hud.lives) }).map((_, i) => (
                            <Heart key={i} size={18} className={i < hud.lives ? 'text-rose-400 fill-rose-400' : 'text-white/15'} />
                        ))}
                    </div>
                </div>
                <div className="px-3 sm:px-6 pb-3 text-center min-h-[2.75rem]">
                    {round && !reading && (
                        <>
                            <p className="max-w-3xl mx-auto text-base sm:text-xl md:text-2xl font-bold leading-snug line-clamp-3 break-words">{round.prompt}</p>
                            {round.kind !== 'single' && (
                                <p className="mt-1.5 text-xs sm:text-sm font-bold text-emerald-300">
                                    {roundHint(t, round.kind, progress)}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="relative flex-1 min-h-0">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block touch-none cursor-crosshair" />

                {round && reading && phase !== 'over' && (
                    <ReadingCard prompt={round.prompt} kind={round.kind} total={reading.total} elapsed={reading.elapsed} onReady={beginRound} />
                )}

                {phase === 'paused' && (
                    <div className="absolute inset-0 z-10 bg-[#040714]/85 flex items-center justify-center p-4">
                        <div className="w-full max-w-xs rounded-3xl bg-[#0b1128] border border-white/10 p-6 text-center shadow-2xl">
                            <h2 className="text-2xl font-black mb-5">{t('solo.paused')}</h2>
                            <div className="space-y-2">
                                <button autoFocus onClick={togglePause} className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black flex items-center justify-center gap-2"><Play size={18} className="fill-current" /> {t('solo.resume')}</button>
                                <button onClick={() => setRunId(r => r + 1)} className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 font-bold flex items-center justify-center gap-2"><RotateCcw size={18} /> {t('solo.restart')}</button>
                                <button onClick={onExit} className="w-full py-3 rounded-2xl text-gray-300 hover:text-white hover:bg-white/5 font-bold flex items-center justify-center gap-2"><LogOut size={18} /> {t('solo.quit')}</button>
                            </div>
                        </div>
                    </div>
                )}

                {phase === 'over' && (
                    <div className="absolute inset-0 z-10 overflow-y-auto" style={SPACE_BG}>
                        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
                            <Trophy size={40} className="mx-auto text-amber-300" />
                            <p className="mt-3 text-xs font-bold uppercase tracking-widest text-gray-400">{t('solo.finalScore')}</p>
                            <p className="text-5xl sm:text-6xl font-black tabular-nums">{hud.score.toLocaleString(locale)}</p>
                            {hud.score >= best && hud.score > 0
                                ? <span className="inline-flex mt-3 px-3 py-1 rounded-full bg-amber-400 text-gray-950 text-xs font-black uppercase">{t('solo.newBest')}</span>
                                : best > 0 && <p className="text-sm text-gray-400 mt-2">{t('solo.best', { score: best.toLocaleString(locale) })}</p>}
                            <p className="text-sm text-gray-400 mt-2">{t('solo.correctOf', { correct: hud.correct, count: hud.rounds })}</p>

                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <button onClick={() => setRunId(r => r + 1)} className="py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black flex items-center justify-center gap-2"><RotateCcw size={18} /> {t('hostGame.playAgain')}</button>
                                <button onClick={onExit} className="sm:col-span-2 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 font-bold flex items-center justify-center gap-2"><LogOut size={18} /> {t('solo.backToSet')}</button>
                            </div>

                            <section className="mt-8 text-left">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-3"><BookOpen size={16} /> {t('solo.review')}</h2>
                                {review.length === 0 ? (
                                    <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-5 text-center text-emerald-300 font-semibold">{t('solo.perfect')}</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {review.map((r, i) => (
                                            <li key={i} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                                                <p className="font-semibold break-words">{r.q.prompt}</p>
                                                <p className="mt-1.5 text-sm text-emerald-300 flex items-start gap-1.5 break-words"><Check size={14} className="shrink-0 mt-0.5" /> {answerLabel(r.q)}</p>
                                                {r.picked.length > 0 && <p className="mt-1 text-sm text-rose-300 flex items-start gap-1.5 break-words"><X size={14} className="shrink-0 mt-0.5" /> {r.picked.join(', ')}</p>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Practice;
