import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, RotateCcw, Crown, Orbit, Flag } from 'lucide-react';
import { toChoiceRound, decoyPool, shuffle } from '../../platform/questions/rounds';
import { secondsFor } from '../../platform/questions/types';
import { SPACE_BG } from '../../components/SpaceScreen';
import { audio } from '../../platform/audio/audio';
import { useTheme } from '../../context/ThemeContext';
import { useT } from '../../context/LanguageContext';
import QuestionTimer from '../shared/QuestionTimer';

// Prize ladders (index 0 = first question). Milestones are guaranteed once reached.
const LADDERS = {
    5: [['$1,000'], ['$10,000'], ['$50,000', true], ['$250,000'], ['$1,000,000', true]],
    10: [['$500'], ['$1,000'], ['$2,000'], ['$5,000'], ['$10,000', true], ['$25,000'], ['$50,000'], ['$100,000'], ['$250,000'], ['$1,000,000', true]],
    15: [['$100'], ['$200'], ['$300'], ['$500'], ['$1,000', true], ['$2,000'], ['$4,000'], ['$8,000'], ['$16,000'], ['$32,000', true],
        ['$64,000'], ['$125,000'], ['$250,000'], ['$500,000'], ['$1,000,000', true]]
};

const TIMINGS = {
    dramatic: { lock: 3000, correct: 2200, wrong: 3000 },
    quick: { lock: 900, correct: 1300, wrong: 1800 }
};

const LETTERS = ['A', 'B', 'C', 'D'];

// Picks `count` questions (repeating a small set if needed) as single-answer rounds
const buildRun = (questions, count) => {
    const pool = decoyPool(questions);
    const run = [];
    let bag = [];
    for (let attempts = 0; run.length < count && attempts < count * 4 + questions.length; attempts++) {
        if (!bag.length) bag = shuffle(questions);
        const q = bag.pop();
        const round = toChoiceRound(q, pool, { maxOptions: 4 });
        if (round && round.kind === 'single') {
            run.push({ text: round.prompt, options: round.options.map(o => ({ text: o.text, isCorrect: o.correct })), time: q.time });
        }
    }
    return run;
};

const Millionaire = ({ questions = [], settings = {} }) => {
    const t = useT();
    const { performance } = useTheme();
    const count = [5, 10, 15].includes(settings.questionCount) ? settings.questionCount : 15;
    const ladder = LADDERS[count];
    const timing = TIMINGS[settings.suspense] || TIMINGS.dramatic;
    const allowFifty = settings.fiftyFifty !== false;
    const allowAudience = settings.askAudience !== false;

    const [runId, setRunId] = useState(0);
    const run = useMemo(() => buildRun(questions, count), [questions, count, runId]);

    const [gameState, setGameState] = useState('playing'); // playing | gameover | won | walked
    const [index, setIndex] = useState(0);
    const [selected, setSelected] = useState(null);
    const [answerState, setAnswerState] = useState('idle'); // idle | locked | correct | incorrect
    const [timeUp, setTimeUp] = useState(false);
    const [lifelines, setLifelines] = useState({ fifty: { used: false, removed: [] }, audience: { used: false, votes: [] } });
    const timers = useRef([]);

    const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
    useEffect(() => {
        audio.playMusic('tension');
        return () => {
            timers.current.forEach(clearTimeout);
            audio.stopMusic();
        };
    }, []);

    const total = run.length;
    const currentQ = run[Math.min(index, Math.max(0, total - 1))];
    const isLocked = answerState !== 'idle';
    // Optional countdown (0 = no timer)
    const limit = settings.timer && currentQ
        ? secondsFor(currentQ, Number(settings.timerSeconds) || 30, settings.useQuestionTime !== false)
        : 0;

    // Last milestone reached before question `i`
    const safePrize = (i) => {
        let prize = '$0';
        for (let k = 0; k < i; k++) if (ladder[k]?.[1]) prize = ladder[k][0];
        return prize;
    };

    const finishWin = () => {
        setGameState('won');
        audio.stopMusic();
        audio.sfx('podium');
        if (performance.particles) {
            import('canvas-confetti').then(({ default: confetti }) => {
                confetti({ particleCount: 180, spread: 110, origin: { y: 0.35 }, disableForReducedMotion: true });
            }).catch(() => {});
        }
    };

    const restart = () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
        setRunId(r => r + 1);
        setGameState('playing');
        setIndex(0);
        setSelected(null);
        setAnswerState('idle');
        setTimeUp(false);
        setLifelines({ fifty: { used: false, removed: [] }, audience: { used: false, votes: [] } });
        audio.playMusic('tension');
        audio.sfx('whoosh');
    };

    // Out of time counts as a wrong answer: the right one is shown, then the game ends
    const handleTimeUp = () => {
        if (gameState !== 'playing' || isLocked) return;
        setTimeUp(true);
        setSelected(null);
        setAnswerState('incorrect');
        later(() => {
            setGameState('gameover');
            audio.stopMusic();
            audio.sfx('matchLose');
        }, timing.wrong);
    };

    const handleAnswerClick = (i) => {
        if (gameState !== 'playing' || isLocked || !currentQ || lifelines.fifty.removed.includes(i)) return;
        audio.unlock();
        audio.sfx('lockIn');
        setSelected(i);
        setAnswerState('locked');

        later(() => {
            if (currentQ.options[i].isCorrect) {
                setAnswerState('correct');
                audio.sfx(ladder[index]?.[1] ? 'milestone' : 'correct');
                later(() => {
                    if (index >= total - 1) {
                        finishWin();
                    } else {
                        setIndex(index + 1);
                        setSelected(null);
                        setAnswerState('idle');
                        setLifelines(prev => ({ ...prev, fifty: { ...prev.fifty, removed: [] }, audience: { ...prev.audience, votes: [] } }));
                    }
                }, timing.correct);
            } else {
                setAnswerState('incorrect');
                audio.sfx('wrong');
                later(() => {
                    setGameState('gameover');
                    audio.stopMusic();
                    audio.sfx('matchLose');
                }, timing.wrong);
            }
        }, timing.lock);
    };

    const applyFiftyFifty = () => {
        if (lifelines.fifty.used || isLocked || currentQ.options.length < 3) return;
        audio.sfx('lifeline');
        const wrong = currentQ.options.map((o, i) => (o.isCorrect ? -1 : i)).filter(i => i >= 0);
        const removed = shuffle(wrong).slice(0, Math.min(2, currentQ.options.length - 2));
        setLifelines(prev => ({ ...prev, fifty: { used: true, removed } }));
    };

    const applyAskAudience = () => {
        if (lifelines.audience.used || isLocked) return;
        audio.sfx('lifeline');
        const n = currentQ.options.length;
        const votes = new Array(n).fill(0);
        const correct = currentQ.options.findIndex(o => o.isCorrect);
        const correctVote = Math.floor(Math.random() * 35) + 40;
        votes[correct] = correctVote;
        let remaining = 100 - correctVote;
        const others = currentQ.options.map((_, i) => i).filter(i => i !== correct && !lifelines.fifty.removed.includes(i));
        others.forEach((idx, k) => {
            const v = k === others.length - 1 ? remaining : Math.floor(Math.random() * remaining);
            votes[idx] = v;
            remaining -= v;
        });
        if (!others.length) votes[correct] = 100;
        setLifelines(prev => ({ ...prev, audience: { used: true, votes } }));
    };

    // Smart-board keyboard: A–D or 1–4 to answer
    useEffect(() => {
        const onKey = (e) => {
            if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
            const k = e.key.toUpperCase();
            const i = LETTERS.indexOf(k) >= 0 ? LETTERS.indexOf(k) : ['1', '2', '3', '4'].indexOf(k);
            if (i >= 0 && currentQ && i < currentQ.options.length) handleAnswerClick(i);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    if (!run.length) {
        return (
            <div className="w-full min-h-full text-white flex items-center justify-center p-6 text-center" style={SPACE_BG}>
                <p className="text-lg font-bold">{t('mil.noQuestions')}</p>
            </div>
        );
    }

    // ---------- end screens ----------
    if (gameState !== 'playing') {
        const isWin = gameState === 'won';
        const walked = gameState === 'walked';
        const prize = isWin ? ladder[total - 1]?.[0] : walked ? (index > 0 ? ladder[index - 1][0] : '$0') : safePrize(index);
        return (
            <div className="w-full min-h-full flex flex-col items-center justify-center p-4 sm:p-6 text-center text-white" style={SPACE_BG}>
                <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-lg w-full rounded-3xl bg-[#0b1128]/90 border border-white/10 p-6 sm:p-10"
                    style={{ boxShadow: isWin ? '0 0 80px -10px rgba(251,191,36,0.5)' : '0 0 60px -20px rgba(96,165,250,0.4)' }}
                >
                    {isWin ? <Crown size={72} className="text-amber-300 mx-auto mb-4" /> : walked ? <Flag size={64} className="text-sky-300 mx-auto mb-4" /> : <Orbit size={64} className="text-rose-300 mx-auto mb-4" />}
                    <h2 className={`text-4xl md:text-5xl font-black mb-2 ${isWin ? 'text-amber-300' : ''}`}>
                        {isWin ? t('mil.won') : walked ? t('mil.walked') : t('mil.lost')}
                    </h2>
                    <p className="text-gray-300 text-lg mb-8">
                        {isWin ? t('mil.wonText') : walked ? t('mil.walkedText') : t('mil.lostText', { count: index })}
                    </p>
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-8">
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">{t('mil.winnings')}</p>
                        <p className="text-4xl sm:text-5xl font-black text-amber-300 tabular-nums break-all">{prize}</p>
                    </div>
                    <button onClick={restart} className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black transition-colors flex items-center justify-center gap-2">
                        <RotateCcw size={20} /> {t('hostGame.playAgain')}
                    </button>
                </motion.div>
            </div>
        );
    }

    // ---------- playing ----------
    const treeTopDown = ladder.slice(0, total).map((step, i) => ({ level: i + 1, amount: step[0], milestone: !!step[1] })).reverse();
    const lifelineClass = (used) => `relative w-16 h-12 md:w-20 md:h-14 rounded-full border-2 flex items-center justify-center font-black text-lg transition-colors disabled:cursor-not-allowed
        ${used ? 'border-white/10 text-white/25' : 'border-sky-300/60 text-sky-100 bg-sky-400/10 hover:border-amber-300 hover:text-amber-200 shadow-[0_0_20px_rgba(56,189,248,0.25)]'}`;

    return (
        <div className="w-full min-h-full md:h-full text-white flex flex-col md:flex-row md:overflow-hidden" style={SPACE_BG}>
            <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-10 min-w-0">
                {/* Lifelines + current prize */}
                <div className="flex justify-between items-center mb-4 sm:mb-6 pr-28 sm:pr-40 md:pr-0">
                    <div className="flex gap-3">
                        {allowFifty && (
                            <button disabled={lifelines.fifty.used || isLocked || currentQ.options.length < 3} onClick={applyFiftyFifty} className={lifelineClass(lifelines.fifty.used)} aria-label={t('mil.fifty')}>
                                50:50
                                {lifelines.fifty.used && <span className="absolute inset-x-2 top-1/2 h-0.5 bg-rose-400 rotate-[-20deg]" />}
                            </button>
                        )}
                        {allowAudience && (
                            <button disabled={lifelines.audience.used || isLocked} onClick={applyAskAudience} className={lifelineClass(lifelines.audience.used)} aria-label={t('mil.audience')}>
                                <Users size={22} />
                                {lifelines.audience.used && <span className="absolute inset-x-2 top-1/2 h-0.5 bg-rose-400 rotate-[-20deg]" />}
                            </button>
                        )}
                        {index > 0 && (
                            <button disabled={isLocked} onClick={() => { audio.sfx('click'); audio.stopMusic(); setGameState('walked'); }} className="hidden sm:flex items-center px-4 rounded-full border-2 border-white/15 text-sm font-bold text-gray-300 hover:text-white hover:border-white/40 disabled:opacity-40 transition-colors">
                                {t('mil.takeMoney')}
                            </button>
                        )}
                    </div>
                    <div className="md:hidden text-right">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('mil.playingFor')}</div>
                        <div className="text-amber-300 font-black text-xl tabular-nums">{ladder[index]?.[0]}</div>
                    </div>
                </div>

                {/* Audience poll */}
                <AnimatePresence>
                    {lifelines.audience.votes.length > 0 && answerState === 'idle' && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="rounded-3xl bg-white/5 border border-white/10 p-4 mb-5 flex justify-between items-end h-32 gap-3 max-w-md"
                        >
                            {currentQ.options.map((_, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                                    <span className="text-amber-300 text-xs font-black mb-1">{lifelines.audience.votes[i] || 0}%</span>
                                    <motion.div initial={{ height: 0 }} animate={{ height: `${lifelines.audience.votes[i] || 0}%` }} className="w-full max-w-[36px] rounded-t-lg bg-gradient-to-t from-sky-600 to-emerald-300" />
                                    <span className="mt-2 font-black text-sky-200">{LETTERS[i]}</span>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Question */}
                <div className="flex-1 flex flex-col justify-end pb-2 sm:pb-6">
                    {limit > 0 && (
                        <div className="flex justify-center mb-3">
                            <QuestionTimer
                                key={`${runId}:${index}`}
                                seconds={limit}
                                running={gameState === 'playing' && answerState === 'idle'}
                                onExpire={handleTimeUp}
                                size={72}
                            />
                        </div>
                    )}
                    <p className={`text-center font-black uppercase tracking-[0.25em] mb-3 ${timeUp ? 'text-base text-rose-300' : 'text-xs text-sky-300'}`}>
                        {timeUp ? t('cc.timeUp') : t('mil.questionFor', { n: index + 1, total, prize: ladder[index]?.[0] })}
                    </p>
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative mb-5 sm:mb-8 w-full rounded-[2rem] border border-sky-300/30 bg-[#0b1128]/85 shadow-[0_0_40px_-10px_rgba(56,189,248,0.45)] p-5 md:p-10 text-center text-lg sm:text-xl md:text-3xl font-bold leading-relaxed break-words"
                    >
                        {currentQ.text}
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        {currentQ.options.map((option, i) => {
                            const isRemoved = lifelines.fifty.removed.includes(i);
                            let box = 'border-white/15 bg-[#0b1128]/80 hover:border-sky-300/70';
                            let orb = 'bg-white/10 text-sky-200';
                            if (selected === i) {
                                if (answerState === 'locked') { box = 'border-amber-300 bg-amber-400/15 animate-pulse'; orb = 'bg-amber-300 text-gray-950'; }
                                else if (answerState === 'correct') { box = 'border-emerald-300 bg-emerald-400/20 shadow-[0_0_30px_rgba(52,211,153,0.5)]'; orb = 'bg-emerald-300 text-gray-950'; }
                                else if (answerState === 'incorrect') { box = 'border-rose-400 bg-rose-500/20'; orb = 'bg-rose-400 text-gray-950'; }
                            } else if (answerState === 'incorrect' && option.isCorrect) {
                                box = 'border-emerald-300 bg-emerald-400/15 animate-pulse';
                                orb = 'bg-emerald-300 text-gray-950';
                            }
                            return (
                                <button
                                    key={i}
                                    onClick={() => handleAnswerClick(i)}
                                    disabled={isLocked || isRemoved}
                                    className={`min-h-[3.75rem] md:min-h-[5rem] w-full rounded-full border-2 flex items-center gap-3 sm:gap-4 pl-2 pr-5 py-2 text-left transition-colors duration-300 ${box} ${isRemoved ? 'invisible' : ''}`}
                                >
                                    <span className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full flex items-center justify-center font-black text-lg transition-colors ${orb}`}>{LETTERS[i]}</span>
                                    <span className="text-base sm:text-lg md:text-xl font-semibold line-clamp-2 break-words">{option.text}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Prize ladder (desktop) */}
            <div className="hidden md:flex md:w-64 lg:w-72 shrink-0 bg-[#050816]/80 border-l border-white/10 p-4 lg:p-5 pt-16 flex-col justify-center gap-1 overflow-y-auto">
                {treeTopDown.map(node => {
                    const isActive = node.level === index + 1;
                    const isPassed = node.level <= index;
                    return (
                        <div
                            key={node.level}
                            className={`flex justify-between items-center px-4 py-1.5 rounded-full text-base lg:text-lg font-bold tabular-nums transition-colors
                                ${isActive ? 'bg-amber-300 text-gray-950 shadow-[0_0_24px_rgba(251,191,36,0.5)]' : isPassed ? 'text-emerald-300/80' : node.milestone ? 'text-white' : 'text-sky-200/50'}`}
                        >
                            <span className="text-sm opacity-70 flex items-center gap-1.5">
                                {node.milestone && !isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />}
                                {node.level}
                            </span>
                            <span>{node.amount}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Millionaire;
