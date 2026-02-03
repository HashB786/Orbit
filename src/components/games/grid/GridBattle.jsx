import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash, Play, Settings, Save, Upload, Grid as GridIcon, Trophy, Bomb, Wind, Gift, Crosshair, HelpCircle, Check, X, FileJson, List, Edit2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

// --- ICONS & ASSETS ---
const ITEM_ICONS = {
    question: HelpCircle,
    bomb: Bomb,
    wind: Wind,
    bonus: Gift,
    grenade: Crosshair,
};

const ITEM_COLORS = {
    question: 'bg-blue-500',
    bomb: 'bg-red-500',
    wind: 'bg-gray-400',
    bonus: 'bg-green-500',
    grenade: 'bg-orange-500',
};

// --- MAIN COMPONENT ---
const GridBattle = () => {
    const { t } = useLanguage();

    // Modes: 'menu', 'create', 'setup', 'game', 'victory'
    const [mode, setMode] = useState('menu');
    const [questionSets, setQuestionSets] = useState(() => {
        const saved = localStorage.getItem('gridBattleQuestions');
        const initial = saved ? JSON.parse(saved) : {};

        // Ensure Demo Set exists
        if (!initial['Demo: General Knowledge']) {
            initial['Demo: General Knowledge'] = [
                { q: "What is the capital of France?", a: "Paris" },
                { q: "Which planet is known as the Red Planet?", a: "Mars" },
                { q: "What is 7 x 8?", a: "56" },
                { q: "Who painted the Mona Lisa?", a: "Leonardo da Vinci" },
                { q: "What is the largest mammal in the world?", a: "Blue Whale" },
                { q: "How many continents are there?", a: "Seven" },
                { q: "What is the chemical symbol for Gold?", a: "Au" },
                { q: "Which country invented Sushi?", a: "Japan" },
                { q: "What is the fastest land animal?", a: "Cheetah" },
                { q: "In which year did World War II end?", a: "1945" }
            ];
        }
        return initial;
    });

    const [activeSetId, setActiveSetId] = useState(null);
    const [config, setConfig] = useState({
        rows: 5,
        cols: 6,
        teams: 3,
        bombs: 5,
        winds: 3,
        bonuses: 5,
        grenades: 3
    });

    // Game State
    const [grid, setGrid] = useState([]);
    const [teamScores, setTeamScores] = useState([]);
    const [currentTeam, setCurrentTeam] = useState(0);
    const [activeCard, setActiveCard] = useState(null); // { r, c, type, content, ... }
    const [grenadeTargetMode, setGrenadeTargetMode] = useState(false);
    const [showAnswer, setShowAnswer] = useState(false);

    // --- SAVE / LOAD ---
    useEffect(() => {
        localStorage.setItem('gridBattleQuestions', JSON.stringify(questionSets));
    }, [questionSets]);

    // --- LOGIC: START GAME ---
    const startGame = () => {
        // Generate Grid
        const totalCells = config.rows * config.cols;
        const deck = [];

        // Add Special Items
        for (let i = 0; i < config.bombs; i++) deck.push({ type: 'bomb' });
        for (let i = 0; i < config.winds; i++) deck.push({ type: 'wind' });
        for (let i = 0; i < config.bonuses; i++) deck.push({ type: 'bonus' });
        for (let i = 0; i < config.grenades; i++) deck.push({ type: 'grenade' });

        // Fill rest with questions
        const questions = questionSets[activeSetId] || [];
        let qIndex = 0;
        while (deck.length < totalCells) {
            if (questions.length > 0) {
                deck.push({ type: 'question', data: questions[qIndex % questions.length] });
                qIndex++;
            } else {
                deck.push({ type: 'question', data: { q: 'Default Question', a: 'Default Answer' } });
            }
        }

        // Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        // Create Grid State
        const newGrid = [];
        let k = 0;
        for (let r = 0; r < config.rows; r++) {
            const row = [];
            for (let c = 0; c < config.cols; c++) {
                row.push({ ...deck[k], id: k, revealed: false });
                k++;
            }
            newGrid.push(row);
        }

        setGrid(newGrid);
        setTeamScores(new Array(config.teams).fill(0));
        setCurrentTeam(0);
        setMode('game');
    };

    // --- LOGIC: GAMEPLAY ---
    const handleCellClick = (r, c) => {
        if (grid[r][c].revealed || activeCard || grenadeTargetMode) return;

        const newGrid = [...grid];
        newGrid[r][c].revealed = true;
        setGrid(newGrid);
        setActiveCard({ r, c, ...newGrid[r][c] });
        setShowAnswer(false);
    };

    const handleEventResolution = (result) => {
        const scores = [...teamScores];
        const card = activeCard;
        let nextTeam = (currentTeam + 1) % config.teams;
        let eventHandled = true;

        if (card.type === 'question') {
            if (result === 'correct') {
                scores[currentTeam] += 1;
            }
            // If incorrect, just next team.
        } else if (card.type === 'bomb') {
            scores[currentTeam] -= 1;
        } else if (card.type === 'wind') {
            scores[currentTeam] = 0;
        } else if (card.type === 'bonus') {
            scores[currentTeam] += 1;
        } else if (card.type === 'grenade') {
            setActiveCard(null);
            setGrenadeTargetMode(true);
            return;
        }

        setTeamScores(scores);
        setActiveCard(null);
        setCurrentTeam(nextTeam);

        // Check Victory
        if (grid.every(row => row.every(cell => cell.revealed))) {
            setMode('victory');
        }
    };

    const handleGrenadeAttack = (targetTeamIndex) => {
        if (targetTeamIndex === currentTeam) return; // Can't attack self? Or maybe yes? Let's disable self-harm.
        const scores = [...teamScores];
        scores[targetTeamIndex] -= 1;
        // Scores can go negative as per request.

        setTeamScores(scores);
        setGrenadeTargetMode(false);
        setCurrentTeam((currentTeam + 1) % config.teams);
    };


    // --- RENDERERS ---

    // 1. MENU
    if (mode === 'menu') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-8 text-white space-y-8">
                <h1 className="text-6xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    GRID BATTLE
                </h1>
                <div className="flex gap-8">
                    <button
                        onClick={() => setMode('create')}
                        className="flex flex-col items-center justify-center w-64 h-64 bg-gray-800 rounded-2xl hover:bg-gray-700 hover:scale-105 transition-all text-xl font-bold border-2 border-dashed border-gray-600"
                    >
                        <Plus size={48} className="mb-4 text-gray-400" />
                        Create Question Set
                    </button>
                    {Object.keys(questionSets).length > 0 && (
                        <button
                            onClick={() => setMode('setup')}
                            className="flex flex-col items-center justify-center w-64 h-64 bg-blue-600 rounded-2xl hover:bg-blue-500 hover:scale-105 transition-all text-xl font-bold border-4 border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.5)]"
                        >
                            <Play size={48} className="mb-4 text-white" />
                            Start Battle
                        </button>
                    )}
                </div>
                <div className="mt-8">
                    <h3 className="text-xl font-bold mb-4 text-gray-400">Available Sets</h3>
                    <div className="flex flex-wrap gap-4 justify-center">
                        {Object.keys(questionSets).map(id => (
                            <div key={id} className="relative group">
                                <button
                                    className="px-6 py-3 bg-gray-800 rounded-lg font-mono hover:bg-gray-700 flex items-center gap-3"
                                    onClick={() => { setActiveSetId(id); setMode('setup'); }}
                                >
                                    {id} <span className="text-gray-500 text-xs">({questionSets[id].length} Qs)</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const next = { ...questionSets };
                                        delete next[id];
                                        setQuestionSets(next);
                                    }}
                                    className="absolute -top-2 -right-2 bg-red-500 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // 2. CREATE SET
    if (mode === 'create') {
        return <QuestionCreator onBack={() => setMode('menu')} onSave={(name, questions) => {
            setQuestionSets(prev => ({ ...prev, [name]: questions }));
            setMode('menu');
        }} />;
    }

    // 3. SETUP
    if (mode === 'setup') {
        return <GameSetup
            config={config}
            setConfig={setConfig}
            onBack={() => setMode('menu')}
            onStart={startGame}
            sets={questionSets}
            activeSet={activeSetId}
            setActiveSet={setActiveSetId}
        />;
    }

    // 4. GAME BOARD
    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-950 text-white pl-[80px] lg:pl-[280px]">
            {/* Header / Scores */}
            <div className="h-24 bg-gray-900 border-b border-gray-800 flex items-center px-8 justify-between">
                <button onClick={() => setMode('menu')} className="p-2 hover:bg-gray-800 rounded-full"><ArrowLeft /></button>

                <div className="flex gap-4 flex-1 justify-center z-10">
                    {teamScores.map((score, idx) => {
                        const isTargetable = grenadeTargetMode && idx !== currentTeam;
                        const isCurrent = idx === currentTeam;

                        return (
                            <div
                                key={idx}
                                onClick={() => isTargetable && handleGrenadeAttack(idx)}
                                className={`
                                    relative px-8 py-2 rounded-xl border-2 transition-all duration-300
                                    ${isTargetable ? 'cursor-pointer hover:scale-105 border-red-500 bg-red-500/10 hover:bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : ''}
                                    ${isCurrent && !grenadeTargetMode ? 'border-yellow-400 bg-yellow-400/10 scale-110 z-10 shadow-[0_0_20px_rgba(250,204,21,0.3)]' : ''}
                                    ${!isTargetable && !isCurrent ? 'border-gray-700 bg-gray-800/50 opacity-40' : ''}
                                `}
                            >
                                <div className={`text-xs uppercase font-bold tracking-widest ${isTargetable ? 'text-red-400' : 'text-gray-400'}`}>
                                    Team {idx + 1}
                                </div>
                                <div className="text-4xl font-black font-mono">{score}</div>

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
                        <div className="bg-red-600 text-white px-8 py-3 rounded-full font-black text-xl shadow-[0_0_30px_rgba(220,38,38,0.6)] animate-bounce border-2 border-white/20">
                            SELECT A TEAM TO ATTACK!
                        </div>
                    </div>
                )}
            </div>

            {/* Grid */}
            <div className="flex-1 p-8 overflow-auto flex items-center justify-center">
                <div
                    className="grid gap-4 w-full h-full max-w-7xl max-h-[80vh] mx-auto"
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
                                relative rounded-xl font-bold flex items-center justify-center text-2xl shadow-lg border border-white/10 overflow-hidden
                                ${cell.revealed ? 'bg-gray-800' : 'bg-gradient-to-br from-blue-600 to-indigo-700 cursor-pointer'}
                            `}
                        >
                            {cell.revealed ? (
                                <motion.div
                                    initial={{ scale: 0, rotate: 180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    className={`w-full h-full flex items-center justify-center ${ITEM_COLORS[cell.type]} bg-opacity-20`}
                                >
                                    {React.createElement(ITEM_ICONS[cell.type], {
                                        size: 40,
                                        className: cell.type === 'bomb' ? 'text-red-500' :
                                            cell.type === 'wind' ? 'text-gray-400' :
                                                cell.type === 'bonus' ? 'text-green-500' :
                                                    cell.type === 'grenade' ? 'text-orange-500' : 'text-blue-400'
                                    })}
                                </motion.div>
                            ) : (
                                <span className="opacity-20 text-4xl">{r * config.cols + c + 1}</span>
                            )}
                        </motion.button>
                    )))}
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {activeCard && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="bg-gray-900 border border-gray-700 w-full max-w-4xl p-12 rounded-3xl shadow-2xl relative"
                        >
                            {/* Icon Header */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 border-gray-900 ${ITEM_COLORS[activeCard.type]} text-white shadow-xl`}>
                                    {React.createElement(ITEM_ICONS[activeCard.type], { size: 48 })}
                                </div>
                            </div>

                            <div className="mt-8 text-center space-y-8">
                                <h2 className="text-3xl font-bold uppercase tracking-widest text-gray-500">{activeCard.type}</h2>

                                {activeCard.type === 'question' ? (
                                    <div className="space-y-8">
                                        <div className="text-5xl font-bold text-white leading-tight">
                                            {activeCard.data.q}
                                        </div>
                                        <div className="p-6 bg-black/50 rounded-xl border border-gray-800 min-h-[120px] flex flex-col items-center justify-center">
                                            {showAnswer ? (
                                                <>
                                                    <div className="text-sm text-gray-500 font-mono mb-2 uppercase">Answer</div>
                                                    <div className="text-2xl text-cyan-400 font-mono">{activeCard.data.a}</div>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setShowAnswer(true)}
                                                    className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-bold border border-gray-600 transition-colors"
                                                >
                                                    SHOW ANSWER
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex gap-4 justify-center">
                                            <button
                                                onClick={() => handleEventResolution('incorrect')}
                                                className="px-8 py-4 bg-red-500/20 hover:bg-red-500/40 text-red-500 border border-red-500 rounded-xl font-bold flex items-center gap-2"
                                            >
                                                <X /> INCORRECT
                                            </button>
                                            <button
                                                onClick={() => handleEventResolution('correct')}
                                                className="px-8 py-4 bg-green-500/20 hover:bg-green-500/40 text-green-500 border border-green-500 rounded-xl font-bold flex items-center gap-2"
                                            >
                                                <Check /> CORRECT
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <p className="text-5xl font-black text-white">
                                            {activeCard.type === 'bomb' && "MINUS ONE POINT!"}
                                            {activeCard.type === 'wind' && "SCORE RESET TO ZERO!"}
                                            {activeCard.type === 'bonus' && "FREE POINT!"}
                                            {activeCard.type === 'grenade' && "CHOOSE A VICTIM!"}
                                        </p>
                                        <button
                                            onClick={() => handleEventResolution('ok')}
                                            className="px-12 py-4 bg-white text-black font-black rounded-xl hover:scale-105 transition-transform"
                                        >
                                            CONTINUE
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Victory Screen */}
            {mode === 'victory' && (
                <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
                    <div className="text-center space-y-8">
                        <Trophy size={100} className="text-yellow-400 mx-auto animate-bounce" />
                        <h1 className="text-8xl font-black text-white">GAME OVER</h1>
                        <div className="flex gap-8 justify-center items-end">
                            {teamScores.map((score, i) => (
                                <div key={i} className="text-center">
                                    <div className="h-64 flex items-end justify-center">
                                        <div
                                            className="w-24 bg-blue-500 rounded-t-xl transition-all duration-1000"
                                            style={{ height: `${Math.max(10, (score / Math.max(...teamScores)) * 100)}%` }}
                                        />
                                    </div>
                                    <div className="text-2xl font-bold mt-4">Team {i + 1}</div>
                                    <div className="text-4xl font-mono text-yellow-500">{score}</div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setMode('menu')} className="px-8 py-4 bg-white text-black font-bold rounded-xl mt-8">BACK TO MENU</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENT: CREATOR ---
const QuestionCreator = ({ onBack, onSave }) => {
    const [name, setName] = useState('');
    const [inputMode, setInputMode] = useState('manual'); // 'manual' | 'json'

    // Manual State
    const [questions, setQuestions] = useState([]);
    const [currentQ, setCurrentQ] = useState('');
    const [currentA, setCurrentA] = useState('');

    // JSON State
    const [jsonInput, setJsonInput] = useState('');
    const [error, setError] = useState(null);

    const addManualQuestion = () => {
        if (!currentQ.trim() || !currentA.trim()) return;
        setQuestions([...questions, { q: currentQ, a: currentA }]);
        setCurrentQ('');
        setCurrentA('');
    };

    const loadDemoQuestions = () => {
        setQuestions([
            { q: "What is the capital of France?", a: "Paris" },
            { q: "Which planet is known as the Red Planet?", a: "Mars" },
            { q: "What is 7 x 8?", a: "56" },
            { q: "Who painted the Mona Lisa?", a: "Leonardo da Vinci" },
            { q: "What is the largest mammal in the world?", a: "Blue Whale" }
        ]);
        setName("Demo Set");
    };

    const handleSave = () => {
        let finalQuestions = [];

        if (inputMode === 'manual') {
            finalQuestions = [...questions];
            if (currentQ.trim() && currentA.trim()) {
                finalQuestions.push({ q: currentQ, a: currentA });
            }
        } else {
            try {
                let parsed = JSON.parse(jsonInput);
                if (Array.isArray(parsed)) {
                    finalQuestions = parsed.map(p => ({ q: p.q || p.question || p.ques, a: p.a || p.answer || p.ans }));
                } else {
                    finalQuestions = Object.values(parsed).map(p => ({
                        q: p.q || p.question || p.ques,
                        a: p.a || p.answer || p.ans
                    }));
                }
            } catch (e) {
                setError("Invalid JSON format.");
                return;
            }
        }

        if (finalQuestions.length === 0 || !name.trim()) {
            setError("Please add questions and a name.");
            return;
        }

        onSave(name, finalQuestions.filter(n => n.q && n.a));
    };

    return (
        <div className="h-full overflow-y-auto p-8 text-white flex flex-col items-center custom-scrollbar">
            <div className="w-full max-w-4xl space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 bg-gray-800 rounded-lg"><ArrowLeft /></button>
                        <h1 className="text-3xl font-bold">New Question Set</h1>
                    </div>

                    <div className="flex bg-gray-800 rounded-lg p-1">
                        <button
                            onClick={() => {
                                // Sync JSON -> Manual
                                try {
                                    if (jsonInput.trim()) {
                                        let parsed = JSON.parse(jsonInput);
                                        let normalized = [];
                                        if (Array.isArray(parsed)) {
                                            normalized = parsed.map(p => ({ q: p.q || p.question || p.ques, a: p.a || p.answer || p.ans }));
                                        } else {
                                            normalized = Object.values(parsed).map(p => ({
                                                q: p.q || p.question || p.ques,
                                                a: p.a || p.answer || p.ans
                                            }));
                                        }
                                        setQuestions(normalized.filter(n => n.q && n.a));
                                    }
                                } catch (e) { }
                                setInputMode('manual');
                            }}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${inputMode === 'manual' ? 'bg-blue-600 font-bold' : 'hover:bg-gray-700'}`}
                        >
                            <List size={18} /> Manual
                        </button>
                        <button
                            onClick={() => {
                                // Sync Manual -> JSON
                                if (questions.length > 0) {
                                    setJsonInput(JSON.stringify(questions, null, 2));
                                }
                                setInputMode('json');
                            }}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${inputMode === 'json' ? 'bg-blue-600 font-bold' : 'hover:bg-gray-700'}`}
                        >
                            <FileJson size={18} /> JSON Import
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Name Input */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Set Name</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 p-4 rounded-xl text-xl font-bold focus:border-blue-500 outline-none"
                            placeholder="e.g. Physics Chapter 1"
                        />
                    </div>

                    {/* MANUAL EDITOR */}
                    {inputMode === 'manual' && (
                        <div className="space-y-6">

                            {/* Input Area */}
                            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold flex items-center gap-2"><Plus size={20} className="text-green-500" /> Add New Question</h3>

                                </div>
                                <div>
                                    <input
                                        value={currentQ}
                                        onChange={e => setCurrentQ(e.target.value)}
                                        className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700 mb-2"
                                        placeholder="Type Question..."
                                    />
                                    <input
                                        value={currentA}
                                        onChange={e => setCurrentA(e.target.value)}
                                        className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700"
                                        placeholder="Type Answer..."
                                    />
                                </div>
                                <button
                                    onClick={addManualQuestion}
                                    className="w-full py-2 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg hover:border-green-500 hover:text-green-400 transition-colors uppercase font-bold text-sm"
                                >
                                    + Add to List
                                </button>
                            </div>

                            {/* List */}
                            <div className="space-y-2">
                                <h3 className="text-gray-400 text-sm font-bold uppercase">Questions ({questions.length})</h3>
                                {questions.length === 0 && (
                                    <div className="bg-gray-800/30 border border-dashed border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                                        <p className="text-gray-500 italic">No questions added yet.</p>
                                        <button
                                            onClick={loadDemoQuestions}
                                            className="px-6 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 border border-blue-500/50 rounded-lg font-bold text-sm transition-all flex items-center gap-2"
                                        >
                                            <FileJson size={16} /> Load Demo Questions
                                        </button>
                                    </div>
                                )}
                                {questions.map((q, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-gray-800/50 p-4 rounded-xl border border-gray-800 hover:border-gray-600">
                                        <div>
                                            <div className="font-bold text-white">{q.q}</div>
                                            <div className="text-cyan-400 text-sm">{q.a}</div>
                                        </div>
                                        <button
                                            onClick={() => setQuestions(questions.filter((_, i) => i !== idx))}
                                            className="p-2 hover:bg-red-500/20 text-gray-500 hover:text-red-500 rounded-lg transition-colors"
                                        >
                                            <Trash size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* JSON EDITOR */}
                    {inputMode === 'json' && (
                        <div>
                            <label className="block text-sm text-gray-400 mb-2 flex justify-between">
                                <span>Paste Data</span>
                                <span className="text-xs text-blue-400 italic">Format: {`{ "1": { "ques": "..", "ans": ".." } }`}</span>
                            </label>
                            <textarea
                                value={jsonInput}
                                onChange={e => setJsonInput(e.target.value)}
                                className="w-full h-96 bg-gray-900 border border-gray-700 p-4 rounded-xl font-mono text-sm focus:border-blue-500 outline-none"
                                placeholder={`{\n  "1": {\n    "ques": "Q...",\n    "ans": "A..."\n  }\n}`}
                            />
                        </div>
                    )}

                    {error && <p className="text-red-500 font-bold">{error}</p>}

                    <button
                        onClick={handleSave}
                        className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold flex items-center justify-center gap-2 text-xl shadow-lg mt-8"
                    >
                        <Save /> Save Question Set
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: SETUP ---
const GameSetup = ({ config, setConfig, onBack, onStart, sets, activeSet, setActiveSet }) => {
    const questions = sets[activeSet] || [];
    const maxCapacity = config.rows * config.cols;

    return (
        <div className="min-h-screen p-8 text-white flex justify-center items-center">
            <div className="w-full max-w-5xl bg-gray-900 p-12 rounded-3xl border border-gray-800 shadow-2xl grid grid-cols-2 gap-12">
                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 bg-gray-800 rounded-lg"><ArrowLeft /></button>
                        <h1 className="text-3xl font-bold">Game Setup</h1>
                    </div>

                    <div>
                        <label className="block font-bold mb-4">Select Question Set</label>
                        <select
                            value={activeSet || ''}
                            onChange={e => setActiveSet(e.target.value)}
                            className="w-full bg-gray-800 p-4 rounded-xl border border-gray-700 text-lg"
                        >
                            <option value="">-- Choose Set --</option>
                            {Object.keys(sets).map(s => <option key={s} value={s}>{s} ({sets[s].length} Qs)</option>)}
                        </select>
                    </div>

                    <div className="space-y-6 bg-gray-800/50 p-6 rounded-xl">
                        <h3 className="text-sm font-bold uppercase text-gray-500 mb-4">Grid Settings</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <NumberInput label="Rows" value={config.rows} min={3} max={10} onChange={v => setConfig({ ...config, rows: v })} />
                            <NumberInput label="Cols" value={config.cols} min={3} max={10} onChange={v => setConfig({ ...config, cols: v })} />
                            <NumberInput label="Teams" value={config.teams} min={2} max={6} onChange={v => setConfig({ ...config, teams: v })} />
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="space-y-6 bg-gray-800/50 p-6 rounded-xl">
                        <h3 className="text-sm font-bold uppercase text-gray-500 mb-4">Special Items</h3>
                        <NumberInput label="Bombs (-1 Pt)" value={config.bombs} min={0} max={10} onChange={v => setConfig({ ...config, bombs: v })} />
                        <NumberInput label="Classic Winds (Reset)" value={config.winds} min={0} max={10} onChange={v => setConfig({ ...config, winds: v })} />
                        <NumberInput label="Bonus (+1 Pt)" value={config.bonuses} min={0} max={10} onChange={v => setConfig({ ...config, bonuses: v })} />
                        <NumberInput label="Grenades (Attack)" value={config.grenades} min={0} max={10} onChange={v => setConfig({ ...config, grenades: v })} />
                    </div>

                    <div className="bg-black/30 p-4 rounded-xl text-center space-y-2">
                        <div className="text-gray-400 text-sm">Total Cells</div>
                        <div className="text-3xl font-mono">{maxCapacity}</div>
                        <div className="text-gray-500 text-xs">
                            Questions: {Math.max(0, maxCapacity - (config.bombs + config.winds + config.bonuses + config.grenades))}
                        </div>
                        {questions.length < Math.max(0, maxCapacity - (config.bombs + config.winds + config.bonuses + config.grenades)) && (
                            <div className="text-orange-400 text-xs mt-2 flex items-center justify-center gap-2">
                                <AlertTriangle size={12} /> Not enough Qs, duplicates/defaults will be used
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onStart}
                        disabled={!activeSet}
                        className="w-full py-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black text-2xl shadow-xl hover:scale-105 transition-transform"
                    >
                        START BATTLE
                    </button>
                </div>
            </div>
        </div>
    );
};

const NumberInput = ({ label, value, min, max, onChange }) => (
    <div className="flex items-center justify-between">
        <span className="font-bold text-gray-300">{label}</span>
        <div className="flex items-center gap-3 bg-gray-900 rounded-lg p-1">
            <button onClick={() => onChange(Math.max(min, value - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded">-</button>
            <span className="w-8 text-center font-mono">{value}</span>
            <button onClick={() => onChange(Math.min(max, value + 1))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded">+</button>
        </div>
    </div>
);

export default GridBattle;
