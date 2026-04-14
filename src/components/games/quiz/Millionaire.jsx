import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuestionSets } from '../../../hooks/useQuestionSets';
import { CircleDollarSign, Users, Split, CheckCircle2, XCircle } from 'lucide-react';

const MONEY_TREE = [
    { level: 1, amount: "$100" },
    { level: 2, amount: "$200" },
    { level: 3, amount: "$300" },
    { level: 4, amount: "$500" },
    { level: 5, amount: "$1,000", milestone: true },
    { level: 6, amount: "$2,000" },
    { level: 7, amount: "$4,000" },
    { level: 8, amount: "$8,000" },
    { level: 9, amount: "$16,000" },
    { level: 10, amount: "$32,000", milestone: true },
    { level: 11, amount: "$64,000" },
    { level: 12, amount: "$125,000" },
    { level: 13, amount: "$250,000" },
    { level: 14, amount: "$500,000" },
    { level: 15, amount: "$1,000,000", milestone: true },
].reverse(); // Reverse for rendering top-down

const Millionaire = () => {
    const { localSets, publicSets } = useQuestionSets();

    // Setup States
    const [gameState, setGameState] = useState('menu'); // menu, playing, gameover, won
    const [selectedSet, setSelectedSet] = useState(null);
    const [questions, setQuestions] = useState([]);

    // Play States
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null); // The index of chosen answer
    const [answerState, setAnswerState] = useState('idle'); // idle, locked, correct, incorrect

    // Lifelines
    const [lifelines, setLifelines] = useState({
        fiftyFifty: { used: false, removedIndices: [] },
        askAudience: { used: false, votes: [] }
    });

    const allSets = useMemo(() => {
        const sets = [];
        Object.entries(localSets).forEach(([name, qs]) => {
            sets.push({ id: `local_${name}`, name, questions: qs, isLocal: true });
        });
        publicSets.forEach(set => {
            sets.push({ ...set, isLocal: false });
        });
        return sets;
    }, [localSets, publicSets]);

    // Helpers
    const startGame = (set) => {
        // Need to ensure we have exactly 15 questions or handle less
        let qs = [...set.questions];

        // Shuffle all
        qs = qs.sort(() => Math.random() - 0.5);

        // Take 15, or duplicate if not enough (simple fallback)
        while (qs.length < 15 && qs.length > 0) {
            qs = [...qs, ...qs].sort(() => Math.random() - 0.5);
        }
        qs = qs.slice(0, 15);

        // Format questions: { q: '...', options: [{text, isCorrect}], originalA: '...' }
        const formatted = qs.map(q => {
            // Generate wrong answers by taking other questions' right answers or dummy data
            const wrongPool = set.questions.filter(wq => wq.a !== q.a).map(wq => wq.a);
            // Default dummies if set is too small
            const fallbacks = ["A", "B", "C", "D", "None", "All"];

            const options = [{ text: q.a, isCorrect: true }];
            while (options.length < 4) {
                const w = wrongPool.length > 0 ? wrongPool.splice(Math.floor(Math.random() * wrongPool.length), 1)[0] : fallbacks.shift();
                if (!options.some(o => o.text === w)) {
                    options.push({ text: w, isCorrect: false });
                }
            }
            // Shuffle options
            return {
                text: q.q,
                options: options.sort(() => Math.random() - 0.5)
            };
        });

        setQuestions(formatted);
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setAnswerState('idle');
        setLifelines({
            fiftyFifty: { used: false, removedIndices: [] },
            askAudience: { used: false, votes: [] }
        });
        setGameState('playing');
    };

    const handleAnswerClick = (index) => {
        if (answerState !== 'idle' || lifelines.fiftyFifty.removedIndices.includes(index)) return;

        setSelectedAnswer(index);
        setAnswerState('locked');

        // Suspense timing
        setTimeout(() => {
            const isCorrect = questions[currentQuestionIndex].options[index].isCorrect;
            if (isCorrect) {
                setAnswerState('correct');
                setTimeout(() => {
                    if (currentQuestionIndex === 14) {
                        setGameState('won');
                    } else {
                        setCurrentQuestionIndex(prev => prev + 1);
                        setSelectedAnswer(null);
                        setAnswerState('idle');
                        // Reset audience if used on previous
                        if (lifelines.askAudience.used) {
                            setLifelines(prev => ({ ...prev, askAudience: { ...prev.askAudience, votes: [] } }));
                        }
                    }
                }, 2000); // Wait 2s to show green before next question
            } else {
                setAnswerState('incorrect');
                setTimeout(() => setGameState('gameover'), 3000); // Wait 3s before game over
            }
        }, 3000); // 3 seconds suspense "Lock it in"
    };

    const useFiftyFifty = () => {
        if (lifelines.fiftyFifty.used || answerState !== 'idle') return;

        const currentQ = questions[currentQuestionIndex];
        const wrongIndices = [];
        currentQ.options.forEach((opt, idx) => {
            if (!opt.isCorrect) wrongIndices.push(idx);
        });

        // shuffle wrong indices and take first two
        const randomlyRemoved = wrongIndices.sort(() => Math.random() - 0.5).slice(0, 2);

        setLifelines(prev => ({
            ...prev,
            fiftyFifty: { used: true, removedIndices: randomlyRemoved }
        }));
    };

    const useAskAudience = () => {
        if (lifelines.askAudience.used || answerState !== 'idle') return;

        const currentQ = questions[currentQuestionIndex];
        const correctIndex = currentQ.options.findIndex(o => o.isCorrect);

        let votes = [0, 0, 0, 0];
        let remaining = 100;

        // Correct answer gets 40-75%
        const correctVote = Math.floor(Math.random() * 35) + 40;
        votes[correctIndex] = correctVote;
        remaining -= correctVote;

        // Distribute rest
        const otherIndices = [0, 1, 2, 3].filter(i => i !== correctIndex && !lifelines.fiftyFifty.removedIndices.includes(i));

        otherIndices.forEach((idx, i) => {
            if (i === otherIndices.length - 1) {
                votes[idx] = remaining; // give the rest
            } else {
                const v = Math.floor(Math.random() * remaining);
                votes[idx] = v;
                remaining -= v;
            }
        });

        setLifelines(prev => ({
            ...prev,
            askAudience: { used: true, votes }
        }));
    };

    // Calculate guaranteed winnings
    const getWinnings = () => {
        if (gameState === 'won') return "$1,000,000";
        if (currentQuestionIndex >= 10) return "$32,000";
        if (currentQuestionIndex >= 5) return "$1,000";
        return "$0";
    };

    // Render Menu
    if (gameState === 'menu') {
        return (
            <div className="w-full h-full bg-[#0a0f25] flex flex-col items-center justify-center p-6 space-y-8 overflow-y-auto custom-scrollbar">
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-center"
                >
                    <div className="w-32 h-32 mx-auto bg-gradient-to-b from-blue-600 to-indigo-900 rounded-full border-4 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.5)] flex items-center justify-center mb-6">
                        <CircleDollarSign size={64} className="text-yellow-400" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 tracking-tight">
                        WHO WANTS TO BE A <br className="hidden md:block" /> MILLIONAIRE?
                    </h1>
                    <p className="text-blue-200 mt-4 text-lg">Select a question set to begin your climb!</p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl">
                    {allSets.map(set => (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={set.id}
                            onClick={() => startGame(set)}
                            className="bg-[#1a2345] border border-blue-500/30 p-5 rounded-xl text-left hover:border-yellow-500/50 hover:bg-[#25305c] transition-all group relative overflow-hidden"
                            disabled={set.questions.length < 4}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            <h3 className="font-bold text-white text-lg mb-1">{set.name}</h3>
                            <div className="flex justify-between text-sm text-blue-300">
                                <span>{set.questions.length} Questions</span>
                                <span>{set.isLocal ? 'Local Set' : 'Public Set'}</span>
                            </div>
                            {set.questions.length < 4 && (
                                <p className="text-red-400 text-xs mt-2">Needs at least 4 questions.</p>
                            )}
                        </motion.button>
                    ))}
                    {allSets.length === 0 && (
                        <div className="col-span-full text-center text-blue-400 py-10">
                            No question sets found. Create some in Grid Battle first!
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Render Game Over / Won
    if (gameState === 'gameover' || gameState === 'won') {
        const isWin = gameState === 'won';
        return (
            <div className="w-full h-full bg-[#0a0f25] flex flex-col items-center justify-center p-6 text-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-lg w-full bg-[#111830] border-2 border-yellow-600/50 rounded-2xl p-8 md:p-12 shadow-[0_0_50px_rgba(202,138,4,0.15)]"
                >
                    {isWin ? (
                        <CheckCircle2 size={80} className="text-yellow-400 mx-auto mb-6" />
                    ) : (
                        <XCircle size={80} className="text-red-500 mx-auto mb-6" />
                    )}

                    <h2 className={`text-4xl md:text-5xl font-black mb-2 ${isWin ? 'text-yellow-400' : 'text-white'}`}>
                        {isWin ? 'YOU WON!' : 'GAME OVER'}
                    </h2>

                    <p className="text-blue-200 text-lg mb-8">
                        {isWin ? 'You are a virtual millionaire!' : 'Thanks for playing.'}
                    </p>

                    <div className="bg-[#0a0f25] border border-blue-900 rounded-xl p-6 mb-8">
                        <p className="text-sm text-blue-400 uppercase tracking-widest font-bold mb-2">Total Winnings</p>
                        <p className="text-5xl font-mono text-yellow-500">{isWin ? '$1,000,000' : getWinnings()}</p>
                    </div>

                    <button
                        onClick={() => setGameState('menu')}
                        className="w-full py-4 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-xl transition-all shadow-lg"
                    >
                        PLAY AGAIN
                    </button>
                </motion.div>
            </div>
        );
    }

    // Render Playing
    const currentQ = questions[currentQuestionIndex];
    const isLocked = answerState !== 'idle';

    // Reverse money tree for display (top is 1M, bottom is 100)
    // Actually MONEY_TREE is already reversed, index 0 is $1M
    // Target index in tree based on currentQuestionIndex:
    // currentQuestionIndex 0 is Level 1.
    // MONEY_TREE[14] is Level 1 ($100).
    const activeTreeLevel = 15 - currentQuestionIndex;

    return (
        <div className="w-full h-full bg-[#0a0f25] text-white flex flex-col md:flex-row overflow-hidden relative font-sans">

            {/* Main Game Area */}
            <div className="flex-1 flex flex-col p-6 lg:p-12">

                {/* Header / Lifelines */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex gap-4">
                        <button
                            disabled={lifelines.fiftyFifty.used || isLocked}
                            onClick={useFiftyFifty}
                            className={`relative overflow-hidden w-16 h-12 md:w-20 md:h-14 rounded-full border-2 flex items-center justify-center font-bold text-lg md:text-xl transition-all
                                ${lifelines.fiftyFifty.used
                                    ? 'border-gray-600 text-gray-600 opacity-50 bg-[#0a0f25]'
                                    : 'border-blue-400 text-blue-100 bg-gradient-to-b from-[#1a2345] to-[#0a0f25] hover:border-yellow-400 hover:text-yellow-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'}`}
                        >
                            50:50
                            {lifelines.fiftyFifty.used && <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center"><XCircle size={32} className="text-red-500" strokeWidth={3} /></div>}
                        </button>

                        <button
                            disabled={lifelines.askAudience.used || isLocked}
                            onClick={useAskAudience}
                            className={`relative overflow-hidden w-16 h-12 md:w-20 md:h-14 rounded-full border-2 flex items-center justify-center transition-all
                                ${lifelines.askAudience.used
                                    ? 'border-gray-600 text-gray-600 opacity-50 bg-[#0a0f25]'
                                    : 'border-blue-400 text-blue-100 bg-gradient-to-b from-[#1a2345] to-[#0a0f25] hover:border-yellow-400 hover:text-yellow-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'}`}
                        >
                            <Users size={24} />
                            {lifelines.askAudience.used && <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center"><XCircle size={32} className="text-red-500" strokeWidth={3} /></div>}
                        </button>
                    </div>

                    <div className="md:hidden text-center text-yellow-400 font-bold font-mono text-xl">
                        {MONEY_TREE[activeTreeLevel - 1]?.amount || "$0"}
                    </div>
                </div>

                {/* Audience Poll Overlay */}
                <AnimatePresence>
                    {lifelines.askAudience.used && lifelines.askAudience.votes.length > 0 && answerState === 'idle' && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="bg-[#111830] border border-blue-500/30 p-4 rounded-xl mb-8 flex justify-between items-end h-32 gap-2"
                        >
                            {['A', 'B', 'C', 'D'].map((letter, i) => (
                                <div key={letter} className="flex-1 flex flex-col items-center justify-end h-full">
                                    <span className="text-yellow-400 text-xs font-bold mb-1">{lifelines.askAudience.votes[i]}%</span>
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${lifelines.askAudience.votes[i]}%` }}
                                        className="w-full max-w-[40px] bg-gradient-to-t from-blue-700 to-blue-400 rounded-t-sm"
                                    />
                                    <span className="mt-2 font-bold text-blue-200">{letter}</span>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Question Area */}
                <div className="flex-1 flex flex-col justify-end pb-8">

                    {/* The Question */}
                    <div className="relative mb-8 w-full">
                        {/* Hexagonal-ish background container */}
                        <div className="absolute inset-0 bg-[#000000] border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] rounded-2xl transform skew-x-[-5deg]" />
                        <div className="relative z-10 p-6 md:p-10 text-center text-xl md:text-3xl font-medium leading-relaxed">
                            {currentQ.text}
                        </div>
                    </div>

                    {/* Answers Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 gap-y-6">
                        {currentQ.options.map((option, idx) => {
                            const isRemoved = lifelines.fiftyFifty.removedIndices.includes(idx);
                            const letters = ['A', 'B', 'C', 'D'];

                            // Styling logic based on state
                            let boxStyle = "bg-[#000000] border-blue-500 hover:border-yellow-400";
                            let letterStyle = "text-yellow-500";
                            let textStyle = "text-white";

                            if (isRemoved) {
                                boxStyle = "bg-transparent border-transparent opacity-0 pointer-events-none";
                            } else if (selectedAnswer === idx) {
                                if (answerState === 'locked') {
                                    boxStyle = "bg-orange-500/20 border-orange-500 animate-pulse";
                                    letterStyle = "text-white";
                                } else if (answerState === 'correct') {
                                    boxStyle = "bg-green-500/30 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.5)]";
                                    letterStyle = "text-white";
                                } else if (answerState === 'incorrect') {
                                    boxStyle = "bg-red-500/30 border-red-500";
                                    letterStyle = "text-white";
                                }
                            } else if (answerState === 'incorrect' && option.isCorrect) {
                                // Highlight correct answer if user got it wrong
                                boxStyle = "bg-green-500/30 border-green-500 animate-pulse";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswerClick(idx)}
                                    disabled={isLocked || isRemoved}
                                    className={`relative group h-16 md:h-20 w-full transition-all duration-300 transform outline-none`}
                                >
                                    {/* Hexagonal shape with CSS skew */}
                                    <div className={`absolute inset-0 border-2 rounded-xl transform skew-x-[-15deg] transition-all duration-300 ${boxStyle}`} />

                                    <div className="relative z-10 h-full flex items-center px-8 text-left">
                                        <span className={`font-bold text-xl mr-4 ${letterStyle}`}>{letters[idx]}:</span>
                                        <span className={`text-lg md:text-xl truncate ${textStyle}`}>{option.text}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Money Tree Sidebar (Desktop) */}
            <div className="hidden md:flex w-80 bg-[#050814] border-l border-blue-900/50 p-6 flex-col justify-center gap-2">
                {MONEY_TREE.map((node, i) => {
                    const isActive = i === (activeTreeLevel - 1);
                    const isPassed = i > (activeTreeLevel - 1);

                    let textColor = "text-yellow-600";
                    if (isActive) textColor = "text-black";
                    else if (node.milestone) textColor = "text-white";

                    let bgColor = "bg-transparent";
                    if (isActive) bgColor = "bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]";
                    else if (isPassed) bgColor = "bg-blue-900/20";

                    return (
                        <div
                            key={node.level}
                            className={`flex justify-between items-center px-6 py-2 rounded-full font-mono text-xl transition-all ${bgColor} ${textColor}`}
                        >
                            <span className="opacity-70 text-base">{node.level}</span>
                            <span className="font-bold tracking-wider">{node.amount}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Millionaire;
