import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { toChoiceRound, decoyPool, shuffle } from '../../platform/questions/rounds';
import { audio } from '../../platform/audio/audio';

// Prize ladders (index 0 = first question). Milestones are guaranteed once reached.
const LADDERS = {
    5: [['$1,000'], ['$10,000'], ['$50,000', true], ['$250,000'], ['$1,000,000', true]],
    10: [['$500'], ['$1,000'], ['$2,000'], ['$5,000'], ['$10,000', true], ['$25,000'], ['$50,000'], ['$100,000'], ['$250,000'], ['$1,000,000', true]],
    15: [['$100'], ['$200'], ['$300'], ['$500'], ['$1,000', true], ['$2,000'], ['$4,000'], ['$8,000'], ['$16,000'], ['$32,000', true],
        ['$64,000'], ['$125,000'], ['$250,000'], ['$500,000'], ['$1,000,000', true]]
};

const TIMINGS = {
    dramatic: { lock: 3000, correct: 2000, wrong: 3000 },
    quick: { lock: 900, correct: 1200, wrong: 1800 }
};

const LETTERS = ['A', 'B', 'C', 'D'];

// Picks `count` questions (repeating a small set if needed) as single-answer rounds
const buildRun = (questions, count) => {
    const pool = decoyPool(questions);
    const run = [];
    let bag = [];
    for (let attempts = 0; run.length < count && attempts < count * 4 + questions.length; attempts++) {
        if (!bag.length) bag = shuffle(questions);
        const round = toChoiceRound(bag.pop(), pool, { maxOptions: 4 });
        if (round && round.kind === 'single') {
            run.push({ text: round.prompt, options: round.options.map(o => ({ text: o.text, isCorrect: o.correct })) });
        }
    }
    return run;
};

const Millionaire = ({ questions = [], settings = {} }) => {
    const count = [5, 10, 15].includes(settings.questionCount) ? settings.questionCount : 15;
    const ladder = LADDERS[count];
    const timing = TIMINGS[settings.suspense] || TIMINGS.dramatic;
    const allowFifty = settings.fiftyFifty !== false;
    const allowAudience = settings.askAudience !== false;

    const [runId, setRunId] = useState(0);
    const run = useMemo(() => buildRun(questions, count), [questions, count, runId]);

    const [gameState, setGameState] = useState('playing'); // playing | gameover | won
    const [index, setIndex] = useState(0);
    const [selected, setSelected] = useState(null);
    const [answerState, setAnswerState] = useState('idle'); // idle | locked | correct | incorrect
    const [lifelines, setLifelines] = useState({ fifty: { used: false, removed: [] }, audience: { used: false, votes: [] } });
    const timers = useRef([]);

    const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    const restart = () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
        setRunId(r => r + 1);
        setGameState('playing');
        setIndex(0);
        setSelected(null);
        setAnswerState('idle');
        setLifelines({ fifty: { used: false, removed: [] }, audience: { used: false, votes: [] } });
    };

    if (!run.length) {
        return (
            <div className="w-full min-h-full bg-[#0a0f25] text-white flex items-center justify-center p-6 text-center">
                <p className="text-lg font-bold">This set has no questions Millionaire can use.</p>
            </div>
        );
    }

    const total = run.length;
    const currentQ = run[Math.min(index, total - 1)];
    const isLocked = answerState !== 'idle';

    // Last milestone reached before this question
    const guaranteed = () => {
        if (gameState === 'won') return ladder[total - 1]?.[0] || ladder[ladder.length - 1][0];
        let prize = '$0';
        for (let i = 0; i < index; i++) if (ladder[i]?.[1]) prize = ladder[i][0];
        return prize;
    };

    const handleAnswerClick = (i) => {
        if (isLocked || lifelines.fifty.removed.includes(i)) return;
        audio.unlock();
        audio.sfx('countdown');
        setSelected(i);
        setAnswerState('locked');

        later(() => {
            if (currentQ.options[i].isCorrect) {
                setAnswerState('correct');
                audio.sfx('correct');
                later(() => {
                    if (index >= total - 1) {
                        setGameState('won');
                        audio.sfx('podium');
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
                later(() => setGameState('gameover'), timing.wrong);
            }
        }, timing.lock);
    };

    const applyFiftyFifty = () => {
        if (lifelines.fifty.used || isLocked || currentQ.options.length < 3) return;
        audio.sfx('click');
        const wrong = currentQ.options.map((o, i) => (o.isCorrect ? -1 : i)).filter(i => i >= 0);
        const removed = shuffle(wrong).slice(0, Math.min(2, currentQ.options.length - 2));
        setLifelines(prev => ({ ...prev, fifty: { used: true, removed } }));
    };

    const applyAskAudience = () => {
        if (lifelines.audience.used || isLocked) return;
        audio.sfx('click');
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

    // ---------- end screens ----------
    if (gameState !== 'playing') {
        const isWin = gameState === 'won';
        return (
            <div className="w-full min-h-full bg-[#0a0f25] flex flex-col items-center justify-center p-4 sm:p-6 text-center text-white">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-lg w-full bg-[#111830] border-2 border-yellow-600/50 rounded-2xl p-6 sm:p-8 md:p-12 shadow-[0_0_50px_rgba(202,138,4,0.15)]"
                >
                    {isWin ? <CheckCircle2 size={80} className="text-yellow-400 mx-auto mb-6" /> : <XCircle size={80} className="text-red-500 mx-auto mb-6" />}
                    <h2 className={`text-4xl md:text-5xl font-black mb-2 ${isWin ? 'text-yellow-400' : 'text-white'}`}>{isWin ? 'YOU WON!' : 'GAME OVER'}</h2>
                    <p className="text-blue-200 text-lg mb-8">{isWin ? 'You are a virtual millionaire!' : `You answered ${index} question${index === 1 ? '' : 's'} correctly.`}</p>
                    <div className="bg-[#0a0f25] border border-blue-900 rounded-xl p-6 mb-8">
                        <p className="text-sm text-blue-400 uppercase tracking-widest font-bold mb-2">Total winnings</p>
                        <p className="text-4xl sm:text-5xl font-mono text-yellow-500 break-all">{guaranteed()}</p>
                    </div>
                    <button onClick={restart} className="w-full py-4 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2">
                        <RotateCcw size={20} /> PLAY AGAIN
                    </button>
                </motion.div>
            </div>
        );
    }

    // ---------- playing ----------
    const treeTopDown = ladder.slice(0, total).map((step, i) => ({ level: i + 1, amount: step[0], milestone: !!step[1] })).reverse();
    const lifelineClass = (used) => `relative overflow-hidden w-16 h-12 md:w-20 md:h-14 rounded-full border-2 flex items-center justify-center font-bold text-lg md:text-xl transition-colors disabled:cursor-not-allowed
        ${used ? 'border-gray-600 text-gray-600 opacity-50 bg-[#0a0f25]' : 'border-blue-400 text-blue-100 bg-gradient-to-b from-[#1a2345] to-[#0a0f25] hover:border-yellow-400 hover:text-yellow-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'}`;

    return (
        <div className="w-full min-h-full md:h-full bg-[#0a0f25] text-white flex flex-col md:flex-row md:overflow-hidden relative font-sans">
            <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-12 min-w-0">
                {/* Lifelines */}
                <div className="flex justify-between items-center mb-4 sm:mb-8 pr-12 sm:pr-28 md:pr-0">
                    <div className="flex gap-4">
                        {allowFifty && (
                            <button disabled={lifelines.fifty.used || isLocked || currentQ.options.length < 3} onClick={applyFiftyFifty} className={lifelineClass(lifelines.fifty.used)} aria-label="50:50 lifeline">
                                50:50
                                {lifelines.fifty.used && <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center"><XCircle size={32} className="text-red-500" strokeWidth={3} /></div>}
                            </button>
                        )}
                        {allowAudience && (
                            <button disabled={lifelines.audience.used || isLocked} onClick={applyAskAudience} className={lifelineClass(lifelines.audience.used)} aria-label="Ask the audience">
                                <Users size={24} />
                                {lifelines.audience.used && <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center"><XCircle size={32} className="text-red-500" strokeWidth={3} /></div>}
                            </button>
                        )}
                    </div>
                    <div className="md:hidden text-center text-yellow-400 font-bold font-mono text-xl">{ladder[index]?.[0]}</div>
                </div>

                {/* Audience poll */}
                <AnimatePresence>
                    {lifelines.audience.votes.length > 0 && answerState === 'idle' && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="bg-[#111830] border border-blue-500/30 p-4 rounded-xl mb-6 flex justify-between items-end h-32 gap-2"
                        >
                            {currentQ.options.map((_, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                                    <span className="text-yellow-400 text-xs font-bold mb-1">{lifelines.audience.votes[i] || 0}%</span>
                                    <motion.div initial={{ height: 0 }} animate={{ height: `${lifelines.audience.votes[i] || 0}%` }} className="w-full max-w-[40px] bg-gradient-to-t from-blue-700 to-blue-400 rounded-t-sm" />
                                    <span className="mt-2 font-bold text-blue-200">{LETTERS[i]}</span>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Question */}
                <div className="flex-1 flex flex-col justify-end pb-2 sm:pb-8">
                    <p className="text-center text-xs font-bold uppercase tracking-widest text-blue-300 mb-3">Question {index + 1} of {total} · for {ladder[index]?.[0]}</p>
                    <div className="relative mb-5 sm:mb-8 w-full">
                        <div className="absolute inset-0 bg-[#000000] border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] rounded-2xl transform skew-x-[-5deg]" />
                        <div className="relative z-10 p-5 md:p-10 text-center text-lg sm:text-xl md:text-3xl font-medium leading-relaxed break-words">{currentQ.text}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 md:gap-y-6">
                        {currentQ.options.map((option, i) => {
                            const isRemoved = lifelines.fifty.removed.includes(i);
                            let boxStyle = 'bg-[#000000] border-blue-500 hover:border-yellow-400';
                            let letterStyle = 'text-yellow-500';
                            if (isRemoved) boxStyle = 'bg-transparent border-transparent opacity-0 pointer-events-none';
                            else if (selected === i) {
                                letterStyle = 'text-white';
                                if (answerState === 'locked') boxStyle = 'bg-orange-500/20 border-orange-500 animate-pulse';
                                else if (answerState === 'correct') boxStyle = 'bg-green-500/30 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.5)]';
                                else if (answerState === 'incorrect') boxStyle = 'bg-red-500/30 border-red-500';
                            } else if (answerState === 'incorrect' && option.isCorrect) {
                                boxStyle = 'bg-green-500/30 border-green-500 animate-pulse';
                            }
                            return (
                                <button
                                    key={i}
                                    onClick={() => handleAnswerClick(i)}
                                    disabled={isLocked || isRemoved}
                                    className="relative group min-h-[3.5rem] md:h-20 w-full outline-none"
                                >
                                    <div className={`absolute inset-0 border-2 rounded-xl transform skew-x-[-15deg] transition-colors duration-300 ${boxStyle}`} />
                                    <div className={`relative z-10 h-full min-h-[3.5rem] flex items-center px-6 sm:px-8 py-2 text-left ${isRemoved ? 'invisible' : ''}`}>
                                        <span className={`font-bold text-lg sm:text-xl mr-3 sm:mr-4 shrink-0 ${letterStyle}`}>{LETTERS[i]}:</span>
                                        <span className="text-base sm:text-lg md:text-xl line-clamp-2 break-words text-white">{option.text}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Money tree (desktop) */}
            <div className="hidden md:flex md:w-64 lg:w-80 shrink-0 bg-[#050814] border-l border-blue-900/50 p-4 lg:p-6 pt-16 lg:pt-16 flex-col overflow-y-auto">
                {/* my-auto centers the tree without cutting it off when the window is short */}
                <div className="my-auto flex flex-col gap-1 lg:gap-1.5">
                    {treeTopDown.map(node => {
                        const isActive = node.level === index + 1;
                        const isPassed = node.level <= index;
                        const textColor = isActive ? 'text-black' : node.milestone ? 'text-white' : 'text-yellow-600';
                        const bgColor = isActive ? 'bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : isPassed ? 'bg-blue-900/20' : 'bg-transparent';
                        return (
                            <div key={node.level} className={`flex justify-between items-center px-4 lg:px-6 py-1 lg:py-1.5 rounded-full font-mono text-base lg:text-lg transition-colors ${bgColor} ${textColor}`}>
                                <span className="opacity-70 text-sm">{node.level}</span>
                                <span className="font-bold tracking-wider">{node.amount}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Millionaire;
