import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid as GridIcon, Trophy, Bomb, Wind, Gift, Crosshair, HelpCircle, Check, X, Ban, FastForward } from 'lucide-react';
import { answerLabel } from '../../platform/questions/types';
import { shuffle } from '../../platform/questions/rounds';

// --- ICONS & ASSETS ---
const ITEM_ICONS = {
    question: HelpCircle,
    bomb: Bomb,
    wind: Wind,
    bonus: Gift,
    grenade: Crosshair,
    blank: Ban,
    skip: FastForward,
};

const ITEM_COLORS = {
    question: 'bg-blue-500',
    bomb: 'bg-red-500',
    wind: 'bg-gray-400',
    bonus: 'bg-green-500',
    grenade: 'bg-orange-500',
    blank: 'bg-gray-600',
    skip: 'bg-purple-500',
};

const LETTERS = 'ABCDEF';

// Special tiles + questions (repeated if the set is small), shuffled into a grid
const buildGrid = (config, questions) => {
    const total = config.rows * config.cols;
    const deck = [];
    const add = (type, n) => {
        for (let i = 0; i < n; i++) deck.push({ type });
    };
    add('bomb', config.bombs);
    add('wind', config.winds);
    add('bonus', config.bonuses);
    add('grenade', config.grenades);
    add('skip', config.skips);
    deck.splice(Math.max(0, total - 1)); // always leave room for at least one question

    const pool = shuffle(questions);
    for (let i = 0; deck.length < total; i++) {
        if (!pool.length) {
            deck.push({ type: 'blank' });
            continue;
        }
        const q = pool[i % pool.length];
        deck.push({
            type: 'question',
            data: q,
            // Shuffle once per tile so the correct option isn't always first
            options: q.options ? shuffle(q.options) : null,
            order: q.type === 'order' ? shuffle(q.items) : null
        });
    }

    const cells = shuffle(deck);
    const grid = [];
    let k = 0;
    for (let r = 0; r < config.rows; r++) {
        const row = [];
        for (let c = 0; c < config.cols; c++) {
            row.push({ ...cells[k], id: k, revealed: false });
            k++;
        }
        grid.push(row);
    }
    return grid;
};

// Shows any question type on the big screen; the teacher reveals and judges the answer
const QuestionReveal = ({ card, revealed, onReveal }) => {
    const q = card.data;
    return (
        <div className="space-y-5">
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-relaxed max-w-xl mx-auto break-words">{q.prompt}</p>

            {(q.type === 'mc' || q.type === 'multi') && (
                <div className="space-y-2">
                    {q.type === 'multi' && <p className="text-xs font-bold uppercase tracking-wider text-sky-300">More than one answer is correct</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                        {(card.options || q.options).map((o, i) => (
                            <div key={o.id || i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${revealed && o.correct ? 'border-green-500 bg-green-500/15 text-white' : revealed ? 'border-white/10 text-gray-500' : 'border-white/15 text-white'}`}>
                                <span className="w-7 h-7 shrink-0 rounded-lg bg-white/10 flex items-center justify-center font-black text-sm">{LETTERS[i]}</span>
                                <span className="font-semibold break-words min-w-0">{o.text}</span>
                                {revealed && o.correct && <Check size={18} className="ml-auto text-green-400 shrink-0" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {q.type === 'tf' && (
                <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                    {[true, false].map(v => {
                        const right = (q.answer !== false) === v;
                        return (
                            <div key={String(v)} className={`py-3 rounded-xl border font-black text-lg ${revealed && right ? 'border-green-500 bg-green-500/15 text-white' : revealed ? 'border-white/10 text-gray-500' : 'border-white/15 text-white'}`}>
                                {v ? 'True' : 'False'}
                            </div>
                        );
                    })}
                </div>
            )}

            {q.type === 'order' && (revealed ? (
                <ol className="space-y-1.5 text-left max-w-md mx-auto">
                    {q.items.map((item, i) => (
                        <li key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-green-500/60 bg-green-500/10">
                            <span className="w-7 h-7 shrink-0 rounded-full bg-green-500 text-black font-black text-sm flex items-center justify-center">{i + 1}</span>
                            <span className="font-semibold break-words min-w-0">{item}</span>
                        </li>
                    ))}
                </ol>
            ) : (
                <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-300">Put these in the right order</p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {(card.order || q.items).map((item, i) => (
                            <span key={i} className="px-3 py-2 rounded-xl border border-white/15 font-semibold text-white">{item}</span>
                        ))}
                    </div>
                </div>
            ))}

            {q.type === 'typed' && revealed && (
                <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                    <div className="text-xs text-primary-400 font-bold uppercase mb-2 tracking-wider">Correct answer</div>
                    <div className="text-2xl font-bold text-white break-words">{answerLabel(q)}</div>
                </div>
            )}

            {!revealed && (
                <button
                    onClick={onReveal}
                    className="px-6 py-3 rounded-full bg-gray-800 text-gray-300 font-bold text-sm hover:bg-gray-700 transition-colors border border-gray-700"
                >
                    Reveal answer
                </button>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---
const GridBattle = ({ questions = [], settings = {}, onExit }) => {
    const config = {
        rows: settings.rows ?? 5,
        cols: settings.cols ?? 6,
        teams: settings.teams ?? 3,
        bombs: settings.bombs ?? 4,
        winds: settings.winds ?? 2,
        bonuses: settings.bonuses ?? 4,
        grenades: settings.grenades ?? 2,
        skips: settings.skips ?? 2
    };

    // Modes: 'game', 'victory'
    const [mode, setMode] = useState('game');

    // Game State
    const [grid, setGrid] = useState(() => buildGrid(config, questions));
    const [teamScores, setTeamScores] = useState(() => new Array(config.teams).fill(0));
    const [currentTeam, setCurrentTeam] = useState(0);
    const [activeCard, setActiveCard] = useState(null); // { r, c, type, data, mode, ... }
    const [grenadeTargetMode, setGrenadeTargetMode] = useState(false);
    const [showAnswer, setShowAnswer] = useState(false);
    const [gameLog, setGameLog] = useState([]); // [{ round, team, type, points, result }]
    const [scoreHistory, setScoreHistory] = useState(() => [new Array(config.teams).fill(0)]); // [[0,0,0], [1,0,0], ...]

    // --- LOGIC: NEW GAME (same set, same settings, new board) ---
    const startGame = () => {
        setGrid(buildGrid(config, questions));
        setTeamScores(new Array(config.teams).fill(0));
        setScoreHistory([new Array(config.teams).fill(0)]);
        setGameLog([]);
        setCurrentTeam(0);
        setActiveCard(null);
        setGrenadeTargetMode(false);
        setShowAnswer(false);
        setMode('game');
    };

    // --- LOGIC: GAMEPLAY ---
    const handleCellClick = (r, c) => {
        if (grenadeTargetMode) return;

        // Inspection Mode (Post-Reveal)
        if (grid[r][c].revealed) {
            setActiveCard({ ...grid[r][c], r, c, mode: 'inspect' });
            return;
        }

        if (activeCard) return;

        const newGrid = [...grid];
        newGrid[r][c].revealed = true;
        setGrid(newGrid);

        const card = newGrid[r][c];

        // Handle BLANK immediately
        if (card.type === 'blank') {
            const currentRound = gameLog.length + 1;
            newGrid[r][c].history = {
                team: currentTeam,
                round: currentRound,
                result: 'Blank (Retry)',
                timestamp: new Date().toLocaleTimeString()
            };
            setGrid(newGrid);

            // Log & Next Turn
            const scores = [...teamScores];
            setScoreHistory([...scoreHistory, [...scores]]);
            setGameLog([...gameLog, {
                round: currentRound,
                team: currentTeam,
                type: 'blank',
                points: 0,
                result: 'retry'
            }]);

            // RETRY: Do NOT advance team
            // setCurrentTeam((currentTeam + 1) % config.teams);

            // Check Victory
            if (newGrid.every(row => row.every(cell => cell.revealed))) {
                setMode('victory');
            }
            return;
        }

        setActiveCard({ r, c, ...newGrid[r][c], mode: 'play' });
        setShowAnswer(false);
    };

    const handleEventResolution = (result) => {
        const scores = [...teamScores];
        const card = activeCard;
        const currentRound = gameLog.length + 1;

        let logEntry = {
            round: currentRound,
            team: currentTeam,
            type: card.type,
            details: card.data || {},
            result: result
        };

        if (card.type === 'question') {
            if (result === 'correct') {
                scores[currentTeam] += 1;
                logEntry.points = 1;
            } else {
                logEntry.points = 0;
            }
        } else if (card.type === 'bomb') {
            scores[currentTeam] -= 1;
            logEntry.points = -1;
        } else if (card.type === 'wind') {
            scores[currentTeam] = 0;
            logEntry.points = 'Reset';
        } else if (card.type === 'bonus') {
            scores[currentTeam] += 1;
            logEntry.points = 1;
        } else if (card.type === 'skip') {
            logEntry.points = 'Skipped';
        } else if (card.type === 'grenade') {
            setActiveCard(null);
            setGrenadeTargetMode({ card: { ...card, r: card.r, c: card.c } }); // Store card intent
            return;
        }

        // Update Grid History
        const newGrid = [...grid];
        newGrid[card.r][card.c].history = {
            team: currentTeam,
            round: currentRound,
            result: result,
            timestamp: new Date().toLocaleTimeString()
        };
        setGrid(newGrid);

        // Update Logs
        setTeamScores(scores);
        setScoreHistory([...scoreHistory, [...scores]]);
        setGameLog([...gameLog, logEntry]);

        setActiveCard(null);
        setCurrentTeam((currentTeam + 1) % config.teams);

        // Check Victory
        if (grid.every(row => row.every(cell => cell.revealed))) {
            setMode('victory');
        }
    };

    const handleGrenadeAttack = (targetTeamIndex) => {
        const scores = [...teamScores];
        scores[targetTeamIndex] -= 1;

        // Log Grenade
        const currentRound = gameLog.length + 1;
        const cardCtx = grenadeTargetMode.card; // Retrieved from state

        // Update Grid History for Grenade Info
        const newGrid = [...grid];
        newGrid[cardCtx.r][cardCtx.c].history = {
            team: currentTeam,
            round: currentRound,
            result: `Attacked Team ${targetTeamIndex + 1}`,
            target: targetTeamIndex,
            timestamp: new Date().toLocaleTimeString()
        };
        setGrid(newGrid);

        // Update Global Logs
        setTeamScores(scores);
        setScoreHistory([...scoreHistory, [...scores]]);
        setGameLog([...gameLog, {
            round: currentRound,
            team: currentTeam,
            type: 'grenade',
            target: targetTeamIndex,
            points: 'Attack',
            result: 'hit'
        }]);

        setGrenadeTargetMode(false);
        setCurrentTeam((currentTeam + 1) % config.teams);

        // Check Victory (in case last move was grenade)
        if (grid.every(row => row.every(cell => cell.revealed))) {
            setMode('victory');
        }
    };


    // --- RENDERERS ---

    // --- RENDER ---
    // 4. GAME BOARD
    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-gray-950 text-white">
            {/* Header / Scores */}
            <div className="min-h-[5rem] sm:h-24 bg-gray-900 border-b border-gray-800 flex items-center gap-2 sm:gap-4 pl-2 pr-14 sm:pl-8 sm:pr-28 justify-between relative z-50">

                <div className="flex gap-2 sm:gap-4 flex-1 min-w-0 justify-start sm:justify-center z-10 overflow-x-auto py-3 px-1">
                    {teamScores.map((score, idx) => {
                        const isTargetable = grenadeTargetMode && idx !== currentTeam;
                        const isCurrent = idx === currentTeam;

                        return (
                            <div
                                key={idx}
                                onClick={() => isTargetable && handleGrenadeAttack(idx)}
                                className={`
                                    relative shrink-0 px-3 sm:px-8 py-1.5 sm:py-2 rounded-xl border-2 transition-all duration-300 text-center
                                    ${isTargetable ? 'cursor-pointer hover:scale-105 border-red-500 bg-red-500/10 hover:bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : ''}
                                    ${isCurrent && !grenadeTargetMode ? 'border-yellow-400 bg-yellow-400/10 sm:scale-110 z-10 shadow-[0_0_20px_rgba(250,204,21,0.3)]' : ''}
                                    ${!isTargetable && !isCurrent ? 'border-gray-700 bg-gray-800/50 opacity-40' : ''}
                                `}
                            >
                                <div className={`text-xs uppercase font-bold tracking-widest ${isTargetable ? 'text-red-400' : 'text-gray-400'}`}>
                                    Team {idx + 1}
                                </div>
                                <div className="text-2xl sm:text-4xl font-black font-mono">{score}</div>

                                {/* Indicators */}
                                {isCurrent && !grenadeTargetMode && (
                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-400 text-black text-[10px] font-bold rounded-full shadow-lg">
                                        TURN
                                    </div>
                                )}

                                {isTargetable && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-full shadow-lg animate-pulse whitespace-nowrap">
                                        CLICK TO ATTACK
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Grenade Overlay Instruction */}
                {grenadeTargetMode && (
                    <div className="absolute top-24 left-0 right-0 flex justify-center pointer-events-none z-50">
                        <div className="bg-red-600 text-white px-5 sm:px-8 py-2 sm:py-3 rounded-full font-black text-base sm:text-xl text-center shadow-[0_0_30px_rgba(220,38,38,0.6)] animate-bounce border-2 border-white/20">
                            SELECT A TEAM TO ATTACK!
                        </div>
                    </div>
                )}
            </div>

            {/* Grid */}
            <div className="flex-1 min-h-0 p-2 sm:p-8 overflow-auto flex items-center justify-center">
                <div
                    className="grid gap-1.5 sm:gap-4 w-full h-full max-w-7xl max-h-[80vh] mx-auto"
                    style={{
                        gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${config.rows}, minmax(0, 1fr))`
                    }}
                >
                    {grid.map((row, r) => row.map((cell, c) => (
                        <motion.button
                            key={`${r}-${c}`}
                            layoutId={`${r}-${c}`}
                            whileHover={{ scale: cell.revealed ? 1 : 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCellClick(r, c)}
                            className={`
                                relative rounded-lg sm:rounded-xl font-bold flex items-center justify-center text-2xl shadow-lg border border-white/10 overflow-hidden min-h-[2.5rem]
                                ${cell.revealed ? 'bg-gray-800' : 'bg-gradient-to-br from-primary-600 to-primary-800 cursor-pointer'}
                                ${cell.history?.result === 'void' ? 'opacity-50 grayscale' : ''}
                            `}
                        >
                            {cell.revealed ? (
                                <motion.div
                                    initial={{ scale: 0, rotate: 180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    className={`w-full h-full flex flex-col items-center justify-center ${ITEM_COLORS[cell.type]} bg-opacity-20`}
                                >
                                    {React.createElement(ITEM_ICONS[cell.type], {
                                        size: 40,
                                        style: { width: 'clamp(18px, 45%, 40px)', height: 'clamp(18px, 45%, 40px)' },
                                        className: cell.type === 'bomb' ? 'text-red-500' :
                                            cell.type === 'wind' ? 'text-gray-400' :
                                                cell.type === 'bonus' ? 'text-green-500' :
                                                    cell.type === 'grenade' ? 'text-orange-500' :
                                                        cell.type === 'blank' ? 'text-gray-600' : 'text-blue-400'
                                    })}

                                    {/* Info Badge - Safe Check for Team */}
                                    {cell.history?.team !== undefined && cell.history?.team !== null && (
                                        <div className="hidden sm:block mt-2 text-[10px] font-mono text-white/50 bg-black/40 px-2 rounded-full">
                                            T{cell.history.team + 1}
                                        </div>
                                    )}
                                    {cell.history?.result === 'void' && (
                                        <div className="hidden sm:block mt-2 text-[10px] font-mono text-gray-500 bg-black/40 px-2 rounded-full">
                                            VOID
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <span className="opacity-20 text-base sm:text-4xl">{r * config.cols + c + 1}</span>
                            )}
                        </motion.button>
                    )))}
                </div>
            </div>

            {/* Modal - Play & Inspect Modes */}
            <AnimatePresence>
                {activeCard && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm"
                            onClick={() => { /* clicking backdrop does nothing by default to prevent accidental closes */ }}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl max-h-[92vh] bg-gray-900 border border-white/10 rounded-3xl shadow-2xl overflow-y-auto overflow-x-hidden flex flex-col"
                            style={{
                                boxShadow: `0 0 50px -12px ${activeCard.type === 'bomb' ? 'rgba(239,68,68,0.5)' :
                                    activeCard.type === 'bonus' ? 'rgba(34,197,94,0.5)' :
                                        activeCard.type === 'skip' ? 'rgba(168,85,247,0.5)' :
                                            activeCard.type === 'wind' ? 'rgba(156,163,175,0.5)' :
                                                activeCard.type === 'grenade' ? 'rgba(249,115,22,0.5)' :
                                                    'rgba(0,0,0,0.5)'}`
                            }}
                        >
                            {/* Header Bar */}
                            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/5 bg-white/5 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${ITEM_COLORS[activeCard.type]} animate-pulse`} />
                                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                        {activeCard.mode === 'inspect' ? 'HISTORY REVIEW' : 'EVENT REVEAL'}
                                    </span>
                                </div>
                                <button
                                    onClick={activeCard.mode === 'play' ? () => setActiveCard(prev => ({ ...prev, closeConfirm: !prev.closeConfirm })) : () => setActiveCard(null)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Close Confirmation Overlay */}
                            {activeCard.closeConfirm && (
                                <div className="absolute inset-0 z-50 bg-gray-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in duration-200">
                                    <div className="w-full max-w-sm space-y-6">
                                        <div className="text-center space-y-2">
                                            <h3 className="text-2xl font-black text-white tracking-tight">Unresolved Card</h3>
                                            <p className="text-gray-400 text-sm">Action required before continuing.</p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            <button
                                                onClick={() => setActiveCard(prev => ({ ...prev, closeConfirm: false }))}
                                                className="w-full py-4 bg-white text-black rounded-xl font-bold hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                                            >
                                                Resume
                                            </button>

                                            <button
                                                onClick={() => {
                                                    const newGrid = [...grid];
                                                    newGrid[activeCard.r][activeCard.c].revealed = false;
                                                    setGrid(newGrid);
                                                    setActiveCard(null);
                                                }}
                                                className="w-full py-4 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-xl font-bold hover:bg-yellow-500/20 transition-colors flex items-center justify-center gap-2"
                                            >
                                                Undo Reveal
                                            </button>

                                            <button
                                                onClick={() => {
                                                    const newGrid = [...grid];
                                                    newGrid[activeCard.r][activeCard.c].history = { result: 'void', timestamp: new Date().toLocaleTimeString() };
                                                    setGrid(newGrid);
                                                    setActiveCard(null);
                                                }}
                                                className="w-full py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                                            >
                                                Discard as Void
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Main Content */}
                            <div className="p-6 sm:p-12 flex flex-col items-center text-center space-y-6 sm:space-y-8 relative overflow-hidden">
                                {/* Ambient Glow Background */}
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 ${ITEM_COLORS[activeCard.type]} rounded-full blur-[100px] opacity-20 pointer-events-none`} />

                                {/* Icon */}
                                <div className={`relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-3xl flex items-center justify-center ${ITEM_COLORS[activeCard.type]} text-white shadow-2xl transform rotate-3`}>
                                    {React.createElement(ITEM_ICONS[activeCard.type], { size: 48 })}
                                    <div className="absolute inset-0 border-2 border-white/20 rounded-3xl" />
                                </div>

                                <div className="space-y-4 relative z-10 w-full">
                                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-gray-500">
                                        {activeCard.type}
                                    </h2>

                                    {activeCard.type === 'question' ? (
                                        <div className="space-y-8">
                                            <QuestionReveal card={activeCard} revealed={activeCard.mode === 'inspect' || showAnswer} onReveal={() => setShowAnswer(true)} />

                                            {/* Question Actions */}
                                            {activeCard.mode === 'play' && (
                                                <div className="flex gap-2 sm:gap-4 justify-center pt-2 sm:pt-4">
                                                    <button
                                                        onClick={() => handleEventResolution('incorrect')}
                                                        className="flex-1 px-3 sm:px-6 py-4 text-sm sm:text-base bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                                                    >
                                                        <X size={20} /> INCORRECT
                                                    </button>
                                                    <button
                                                        onClick={() => handleEventResolution('correct')}
                                                        className="flex-1 px-3 sm:px-6 py-4 text-sm sm:text-base bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                                                    >
                                                        <Check size={20} /> CORRECT
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase drop-shadow-xl leading-none">
                                                {activeCard.type === 'bomb' && "Minus 1 Point!"}
                                                {activeCard.type === 'wind' && "Score Reset!"}
                                                {activeCard.type === 'bonus' && "Bonus Point!"}
                                                {activeCard.type === 'grenade' && "Grenade Attack!"}
                                                {activeCard.type === 'skip' && "Turn Skipped!"}
                                                {activeCard.type === 'blank' && "Empty Slot!"}
                                            </h3>

                                            <p className="text-lg text-gray-400 max-w-md mx-auto">
                                                {activeCard.type === 'bomb' && "Unlucky! Your team loses one point."}
                                                {activeCard.type === 'wind' && "A sudden gust of wind resets your score to zero."}
                                                {activeCard.type === 'bonus' && "Lucky find! Add one point to your score."}
                                                {activeCard.type === 'grenade' && (activeCard.mode === 'inspect' ? `Targeted Team ${(activeCard.history?.target ?? 0) + 1}` : "Choose an enemy team to reduce their score.")}
                                                {activeCard.type === 'skip' && "Your turn ends immediately. No points awarded."}
                                                {activeCard.type === 'blank' && "Nothing here. But you get to try again!"}
                                            </p>

                                            {activeCard.mode === 'play' && (
                                                <button
                                                    onClick={() => handleEventResolution('ok')}
                                                    className="w-full md:w-auto px-12 py-4 bg-white text-black font-black text-lg rounded-2xl hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                                                >
                                                    CONTINUE
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Inspect Result */}
                                    {activeCard.mode === 'inspect' && activeCard.type === 'question' && (
                                        <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border ${activeCard.history?.result === 'correct'
                                            ? 'bg-green-500/10 border-green-500/50 text-green-400'
                                            : 'bg-red-500/10 border-red-500/50 text-red-400'
                                            }`}>
                                            <div className={`w-2 h-2 rounded-full ${activeCard.history?.result === 'correct' ? 'bg-green-500' : 'bg-red-500'}`} />
                                            <span className="text-xs font-bold uppercase">Result: {activeCard.history?.result}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Victory Screen */}
            {mode === 'victory' && (
                <div className="absolute inset-0 z-[60] bg-black/95 flex items-start sm:items-center justify-center px-4 pt-16 pb-8 sm:p-8 overflow-y-auto">
                    <div className="w-full max-w-6xl space-y-8 sm:space-y-12 text-center">
                        <div className="space-y-4">
                            <Trophy size={80} className="text-yellow-400 mx-auto animate-bounce" />
                            <h1 className="text-4xl sm:text-6xl font-black text-white">GAME OVER</h1>
                        </div>

                        {/* Final Scores */}
                        <div className="flex flex-wrap gap-6 sm:gap-8 justify-center items-end">
                            {teamScores.map((score, i) => (
                                <div key={i} className="text-center group">
                                    <div className="text-2xl font-bold mb-2 text-gray-400">Team {i + 1}</div>
                                    <div className="text-4xl sm:text-5xl font-mono text-yellow-500 font-black">{score}</div>
                                </div>
                            ))}
                        </div>

                        {/* Analytics Graph */}
                        <div className="bg-gray-900/50 p-4 sm:p-8 rounded-2xl border border-gray-800">
                            <h3 className="text-xl font-bold text-gray-400 mb-6 text-left flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full" /> Performance History</h3>
                            <StatsGraph history={scoreHistory} teams={config.teams} />
                        </div>

                        <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
                            <button onClick={() => setMode('game')} className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl border border-gray-600 flex items-center gap-2">
                                <GridIcon size={20} /> REVIEW BOARD
                            </button>
                            <button onClick={startGame} className="px-8 py-4 bg-white text-black hover:bg-gray-200 font-bold rounded-xl">
                                NEW BOARD
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENTS ---
const StatsGraph = ({ history, teams }) => {
    // Determine bounds
    const maxRound = history.length - 1;
    const allScores = history.flat();
    const minScore = Math.min(0, ...allScores);
    const maxScore = Math.max(5, ...allScores); // Min range of 5
    const range = maxScore - minScore;

    // SVG Config
    const height = 200;
    const width = 800;
    const padding = 40;

    const getX = (round) => padding + (round / maxRound) * (width - padding * 2);
    const getY = (score) => height - padding - ((score - minScore) / range) * (height - padding * 2);

    // Colors
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f97316', '#06b6d4'];

    if (maxRound < 1) return <div className="text-gray-500 italic">Not enough data for graph</div>;

    return (
        <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full min-w-[600px] text-gray-500 text-[10px] font-mono">
                {/* Grid Lines */}
                {[...Array(5)].map((_, i) => {
                    const y = padding + (i / 4) * (height - padding * 2);
                    return <line key={i} x1={padding} y1={y} x2={width - padding} y2={y} stroke="currentColor" strokeOpacity="0.1" />;
                })}

                {/* Zero Line */}
                <line x1={padding} y1={getY(0)} x2={width - padding} y2={getY(0)} stroke="white" strokeOpacity="0.2" strokeDasharray="4" />

                {/* Team Lines */}
                {Array.from({ length: teams }).map((_, teamIdx) => {
                    const points = history.map((roundScores, roundIdx) =>
                        `${getX(roundIdx)},${getY(roundScores[teamIdx])}`
                    ).join(' ');

                    return (
                        <g key={teamIdx}>
                            <polyline
                                points={points}
                                fill="none"
                                stroke={colors[teamIdx % colors.length]}
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="drop-shadow-lg"
                            />
                            {/* End Dot */}
                            <circle
                                cx={getX(maxRound)}
                                cy={getY(history[maxRound][teamIdx])}
                                r="4"
                                fill={colors[teamIdx % colors.length]}
                                stroke="#111827"
                                strokeWidth="2"
                            />
                        </g>
                    );
                })}
            </svg>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4">
                {Array.from({ length: teams }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-bold text-gray-400">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                        Team {i + 1}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GridBattle;
