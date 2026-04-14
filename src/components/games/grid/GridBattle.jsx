import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash, Play, Settings, Save, Upload, Grid as GridIcon, Trophy, Bomb, Wind, Gift, Crosshair, HelpCircle, Check, X, FileJson, List, Edit2, AlertTriangle, Ban, FastForward, Globe, User } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useQuestionSets } from '../../../hooks/useQuestionSets';

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

// --- MAIN COMPONENT ---
const GridBattle = () => {
    const { t } = useLanguage();

    // Modes: 'menu', 'create', 'setup', 'game', 'victory'
    const [mode, setMode] = useState('menu');

    // Data Hook
    const {
        localSets,
        publicSets,
        loadingPublic,
        fetchPublicSets,
        saveLocalSet,
        deleteLocalSet,
        publishSet,
        deletePublicSet,
        error,
        isMockMode
    } = useQuestionSets();

    const [activeTab, setActiveTab] = useState('local'); // 'local' | 'public'

    const [activeSetId, setActiveSetId] = useState(null);
    const [config, setConfig] = useState({
        rows: 5,
        cols: 6,
        teams: 3,
        bombs: 5,
        winds: 3,
        bonuses: 5,
        grenades: 3,
        skips: 3,
        blanks: 0,
        questionCount: 14
    });

    const [editingSet, setEditingSet] = useState(null); // { name, questions, author? }

    // Game State
    const [grid, setGrid] = useState([]);
    const [teamScores, setTeamScores] = useState([]);
    const [currentTeam, setCurrentTeam] = useState(0);
    const [activeCard, setActiveCard] = useState(null); // { r, c, type, content, ... }
    const [grenadeTargetMode, setGrenadeTargetMode] = useState(false);
    const [showAnswer, setShowAnswer] = useState(false);
    const [gameLog, setGameLog] = useState([]); // [{ round: 1, team: 0, action: '...', result: '...', details: {} }]
    const [scoreHistory, setScoreHistory] = useState([]); // [[0,0,0], [1,0,0], ...]

    // --- SAVE / LOAD (Handled by Hook now) ---
    useEffect(() => {
        if (activeTab === 'public') {
            fetchPublicSets();
        }
    }, [activeTab]);

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
        for (let i = 0; i < config.skips; i++) deck.push({ type: 'skip' });
        for (let i = 0; i < config.blanks; i++) deck.push({ type: 'blank' });

        // Add Questions
        // const questions = questionSets[activeSetId] || []; // OLD
        const currentSet = activeTab === 'local' ? localSets[activeSetId] : publicSets.find(s => s.id === activeSetId)?.questions;
        const questions = currentSet || [];
        const qCount = config.questionCount;

        if (questions.length > 0) {
            for (let i = 0; i < qCount; i++) {
                deck.push({ type: 'question', data: questions[i % questions.length] });
            }
        }

        // Fill Remaining with Blanks (Implicit)
        while (deck.length < totalCells) {
            deck.push({ type: 'blank', implicit: true });
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
        setScoreHistory([new Array(config.teams).fill(0)]);
        setGameLog([]);
        setCurrentTeam(0);
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

    // 1. MENU
    if (mode === 'menu') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-8 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-950 space-y-8 transition-colors duration-300">
                <h1 className="text-6xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-purple-500">
                    GRID BATTLE
                </h1>

                {/* Main Actions */}
                <div className="flex gap-8">
                    <button
                        onClick={() => {
                            setEditingSet(null);
                            setMode('create');
                        }}
                        className="flex flex-col items-center justify-center w-64 h-64 bg-white dark:bg-gray-800 rounded-2xl hover:scale-105 transition-all text-xl font-bold border-2 border-dashed border-gray-300 dark:border-gray-600 shadow-xl dark:shadow-none"
                    >
                        <Plus size={48} className="mb-4 text-gray-400" />
                        Create Question Set
                    </button>
                    {(Object.keys(localSets).length > 0 || publicSets.length > 0) && (
                        <button
                            onClick={() => setMode('setup')}
                            className="flex flex-col items-center justify-center w-64 h-64 bg-primary-600 rounded-2xl hover:bg-primary-500 hover:scale-105 transition-all text-xl font-bold border-4 border-primary-400 shadow-[0_0_30px_rgba(var(--color-primary-500),0.5)] text-white"
                        >
                            <Play size={48} className="mb-4 text-white" />
                            Start Battle
                        </button>
                    )}
                </div>

                {/* Library Section */}
                <div className="mt-8 w-full max-w-4xl">
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <button
                            onClick={() => setActiveTab('local')}
                            className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'local' ? 'bg-white text-black' : 'bg-transparent text-gray-500 hover:text-white'}`}
                        >
                            My Sets
                        </button>
                        <button
                            onClick={() => setActiveTab('public')}
                            className={`px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2 ${activeTab === 'public' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : 'bg-transparent text-gray-500 hover:text-white'}`}
                        >
                            <Globe size={16} /> Public Library
                        </button>
                        {isMockMode && activeTab === 'public' && (
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-[10px] font-bold uppercase rounded border border-yellow-500/50 animate-pulse">
                                Demo Mode
                            </span>
                        )}
                    </div>

                    <div className="bg-gray-900/50 rounded-3xl p-8 border border-white/5 min-h-[300px]">
                        {activeTab === 'local' ? (
                            <div className="flex flex-wrap gap-4 justify-center">
                                {Object.keys(localSets).length === 0 && <p className="text-gray-500 italic">No local sets found. Create one!</p>}
                                {Object.keys(localSets).map(id => (
                                    <div key={id} className="relative group">
                                        <button
                                            className="px-6 py-4 bg-gray-800 border border-gray-700 rounded-xl font-mono hover:bg-gray-700 flex flex-col items-start gap-1 transition-all shadow-sm w-48"
                                            onClick={() => { setActiveSetId(id); setMode('setup'); }}
                                        >
                                            <span className="font-bold truncate w-full text-left">{id}</span>
                                            <span className="text-gray-500 text-xs">({localSets[id].length} Qs)</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteLocalSet(id);
                                            }}
                                            className="absolute -top-2 -right-2 bg-red-500 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                                        >
                                            <X size={12} className="text-white" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingSet({ name: id, questions: localSets[id] });
                                                setMode('create');
                                            }}
                                            className="absolute -top-2 right-6 bg-blue-500 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                                        >
                                            <Edit2 size={12} className="text-white" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {loadingPublic ? (
                                    <div className="text-center py-12 text-gray-500 animate-pulse">Loading community sets...</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {publicSets.map(set => (
                                            <button
                                                key={set.id}
                                                onClick={() => { setActiveSetId(set.id); setMode('setup'); }}
                                                className="p-4 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 transition-all text-left group relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                                    <Globe size={64} />
                                                </div>
                                                <h3 className="font-bold text-white truncate pr-8">{set.name}</h3>
                                                <div className="flex items-center gap-2 text-xs text-primary-400 mt-1 mb-3">
                                                    <User size={12} /> {set.author || 'Anonymous'}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-1 bg-gray-900 rounded text-xs text-gray-400 font-mono">
                                                        {set.questions?.length || 0} Qs
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm("Are you sure you want to delete this public set?")) {
                                                            deletePublicSet(set.id);
                                                        }
                                                    }}
                                                    className="absolute top-2 right-2 p-2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            </button>
                                        ))}
                                        {publicSets.length === 0 && !loadingPublic && (
                                            <div className="col-span-full text-center text-gray-500 italic">No public sets found yet. Be the first to publish!</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 2. CREATE SET
    if (mode === 'create') {
        return <QuestionCreator
            initialData={editingSet}
            onBack={() => {
                setEditingSet(null);
                setMode('menu');
            }}
            onSave={(name, questions) => {
                saveLocalSet(name, questions);
                setEditingSet(null);
                setMode('menu');
            }}
            onPublish={async (name, author, questions) => {
                const success = await publishSet(name, author, questions);
                if (success) {
                    setEditingSet(null);
                    setMode('menu');
                }
            }}
            externalError={error}
        />;
    }

    // 3. SETUP
    if (mode === 'setup') {
        return <GameSetup
            config={config}
            setConfig={setConfig}
            onBack={() => setMode('menu')}
            onStart={startGame}
            sets={activeTab === 'local' ? localSets : publicSets}
            activeTab={activeTab}
            activeSet={activeSetId}
            setActiveSet={setActiveSetId}
        />;
    }

    // 4. GAME BOARD
    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-gray-950 text-white">
            {/* Header / Scores */}
            <div className="h-24 bg-gray-900 border-b border-gray-800 flex items-center px-8 justify-between relative z-50">
                <button
                    onClick={() => setMode('menu')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-red-500/20 hover:text-red-500 text-gray-400 rounded-lg transition-colors font-bold uppercase text-xs tracking-widest"
                >
                    <ArrowLeft size={16} /> Exit Game
                </button>

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
                                        className: cell.type === 'bomb' ? 'text-red-500' :
                                            cell.type === 'wind' ? 'text-gray-400' :
                                                cell.type === 'bonus' ? 'text-green-500' :
                                                    cell.type === 'grenade' ? 'text-orange-500' :
                                                        cell.type === 'blank' ? 'text-gray-600' : 'text-blue-400'
                                    })}

                                    {/* Info Badge - Safe Check for Team */}
                                    {cell.history?.team !== undefined && cell.history?.team !== null && (
                                        <div className="mt-2 text-[10px] font-mono text-white/50 bg-black/40 px-2 rounded-full">
                                            T{cell.history.team + 1}
                                        </div>
                                    )}
                                    {cell.history?.result === 'void' && (
                                        <div className="mt-2 text-[10px] font-mono text-gray-500 bg-black/40 px-2 rounded-full">
                                            VOID
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <span className="opacity-20 text-4xl">{r * config.cols + c + 1}</span>
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
                            className="relative w-full max-w-2xl bg-gray-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
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
                            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 relative z-10">
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
                            <div className="p-12 flex flex-col items-center text-center space-y-8 relative overflow-hidden">
                                {/* Ambient Glow Background */}
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 ${ITEM_COLORS[activeCard.type]} rounded-full blur-[100px] opacity-20 pointer-events-none`} />

                                {/* Icon */}
                                <div className={`relative w-24 h-24 rounded-3xl flex items-center justify-center ${ITEM_COLORS[activeCard.type]} text-white shadow-2xl transform rotate-3`}>
                                    {React.createElement(ITEM_ICONS[activeCard.type], { size: 48 })}
                                    <div className="absolute inset-0 border-2 border-white/20 rounded-3xl" />
                                </div>

                                <div className="space-y-4 relative z-10 w-full">
                                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-gray-500">
                                        {activeCard.type}
                                    </h2>

                                    {activeCard.type === 'question' ? (
                                        <div className="space-y-8">
                                            <p className="text-2xl md:text-3xl font-bold text-white leading-relaxed max-w-xl mx-auto">
                                                {activeCard.data.q}
                                            </p>

                                            {/* Answer Box */}
                                            <div className="relative">
                                                {activeCard.mode === 'inspect' || showAnswer ? (
                                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 bg-white/5 p-6 rounded-2xl border border-white/10">
                                                        <div className="text-xs text-primary-400 font-bold uppercase mb-2 tracking-wider">Correct Answer</div>
                                                        <div className="text-xl font-mono text-white">
                                                            {activeCard.data.a}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setShowAnswer(true)}
                                                        className="px-6 py-3 rounded-full bg-gray-800 text-gray-300 font-bold text-sm hover:bg-gray-700 transition-colors border border-gray-700"
                                                    >
                                                        Tap to Reveal Answer
                                                    </button>
                                                )}
                                            </div>

                                            {/* Question Actions */}
                                            {activeCard.mode === 'play' && (
                                                <div className="flex gap-4 justify-center pt-4">
                                                    <button
                                                        onClick={() => handleEventResolution('incorrect')}
                                                        className="flex-1 px-6 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                                                    >
                                                        <X size={20} /> INCORRECT
                                                    </button>
                                                    <button
                                                        onClick={() => handleEventResolution('correct')}
                                                        className="flex-1 px-6 py-4 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                                                    >
                                                        <Check size={20} /> CORRECT
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            <h3 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase drop-shadow-xl leading-none">
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
                <div className="absolute inset-0 z-[60] bg-black/95 flex items-center justify-center p-8 overflow-y-auto">
                    <div className="w-full max-w-6xl space-y-12 text-center">
                        <div className="space-y-4">
                            <Trophy size={80} className="text-yellow-400 mx-auto animate-bounce" />
                            <h1 className="text-6xl font-black text-white">GAME OVER</h1>
                        </div>

                        {/* Final Scores */}
                        <div className="flex gap-8 justify-center items-end">
                            {teamScores.map((score, i) => (
                                <div key={i} className="text-center group">
                                    <div className="text-2xl font-bold mb-2 text-gray-400">Team {i + 1}</div>
                                    <div className="text-5xl font-mono text-yellow-500 font-black">{score}</div>
                                </div>
                            ))}
                        </div>

                        {/* Analytics Graph */}
                        <div className="bg-gray-900/50 p-8 rounded-2xl border border-gray-800">
                            <h3 className="text-xl font-bold text-gray-400 mb-6 text-left flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full" /> Performance History</h3>
                            <StatsGraph history={scoreHistory} teams={config.teams} />
                        </div>

                        <div className="flex gap-4 justify-center">
                            <button onClick={() => setMode('game')} className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl border border-gray-600 flex items-center gap-2">
                                <GridIcon size={20} /> REVIEW BOARD
                            </button>
                            <button onClick={() => setMode('menu')} className="px-8 py-4 bg-white text-black hover:bg-gray-200 font-bold rounded-xl">
                                NEW GAME
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENT: CREATOR ---
const QuestionCreator = ({ onBack, onSave, onPublish, initialData, externalError }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [author, setAuthor] = useState(initialData?.author || '');
    const [inputMode, setInputMode] = useState('manual'); // 'manual' | 'json'
    const [publishStatus, setPublishStatus] = useState('idle'); // 'idle' | 'validating' | 'connecting' | 'uploading' | 'success' | 'error'

    // Manual State
    const [questions, setQuestions] = useState(initialData?.questions || []);
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

    const handlePublish = async () => {
        if (!name.trim() || !author.trim() || questions.length === 0) {
            setError("Name, Author, and Questions are required.");
            return;
        }

        setError(null);
        setPublishStatus('validating');
        
        // Artificial short delay to make stages visible to human eye
        // while performing actual validation and object filtering
        const processedQs = questions.filter(n => n.q && n.a);
        await new Promise(r => setTimeout(r, 500)); 

        setPublishStatus('connecting');
        await new Promise(r => setTimeout(r, 400));

        setPublishStatus('uploading');
        try {
            const success = await onPublish(name, author, processedQs);
            if (success) {
                setPublishStatus('success');
                // Auto-close after a delay to show success
                setTimeout(() => {
                    setPublishStatus('idle');
                }, 2000);
            } else {
                setPublishStatus('error');
            }
        } catch (e) {
            setPublishStatus('error');
            console.error(e);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-8 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-950 flex flex-col items-center custom-scrollbar transition-colors duration-300">
            <div className="w-full max-w-4xl space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><ArrowLeft /></button>
                        <h1 className="text-3xl font-bold">New Question Set</h1>
                    </div>

                    <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
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
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${inputMode === 'manual' ? 'bg-primary-500 text-white font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
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
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${inputMode === 'json' ? 'bg-primary-500 text-white font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            <FileJson size={18} /> JSON Import
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Name Input */}
                    <div>
                        <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Set Name</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-xl text-xl font-bold focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all shadow-sm"
                            placeholder="e.g. Physics Chapter 1"
                        />
                    </div>

                    {/* Author Input */}
                    <div>
                        <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Author Name (for Public sets)</label>
                        <input
                            value={author}
                            onChange={e => setAuthor(e.target.value)}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-xl text-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all shadow-sm"
                            placeholder="Your Name / Nickname"
                        />
                    </div>

                    {/* MANUAL EDITOR */}
                    {inputMode === 'manual' && (
                        <div className="space-y-6">

                            {/* Input Area */}
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold flex items-center gap-2"><Plus size={20} className="text-green-500" /> Add New Question</h3>

                                </div>
                                <div>
                                    <input
                                        value={currentQ}
                                        onChange={e => setCurrentQ(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 mb-2 focus:border-primary-500 outline-none"
                                        placeholder="Type Question..."
                                    />
                                    <input
                                        value={currentA}
                                        onChange={e => setCurrentA(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-primary-500 outline-none"
                                        placeholder="Type Answer..."
                                    />
                                </div>
                                <button
                                    onClick={addManualQuestion}
                                    className="w-full py-2 bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 hover:text-green-500 transition-colors uppercase font-bold text-sm text-gray-400"
                                >
                                    + Add to List
                                </button>
                            </div>

                            {/* List */}
                            <div className="space-y-2">
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase">Questions ({questions.length})</h3>
                                {questions.length === 0 && (
                                    <div className="bg-white/50 dark:bg-gray-800/30 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                                        <p className="text-gray-500 italic">No questions added yet.</p>
                                        <button
                                            onClick={loadDemoQuestions}
                                            className="px-6 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 border border-primary-200 dark:border-primary-700/50 rounded-lg font-bold text-sm transition-all flex items-center gap-2"
                                        >
                                            <FileJson size={16} /> Load Demo Questions
                                        </button>
                                    </div>
                                )}
                                {questions.map((q, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm transition-colors">
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white">{q.q}</div>
                                            <div className="text-primary-500 text-sm">{q.a}</div>
                                        </div>
                                        <button
                                            onClick={() => setQuestions(questions.filter((_, i) => i !== idx))}
                                            className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
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
                            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2 flex justify-between">
                                <span>Paste Data</span>
                                <span className="text-xs text-primary-500 italic">Format: {`{ "1": { "ques": "..", "ans": ".." } }`}</span>
                            </label>
                            <textarea
                                value={jsonInput}
                                onChange={e => setJsonInput(e.target.value)}
                                className="w-full h-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-xl font-mono text-sm focus:border-primary-500 outline-none transition-colors shadow-inner"
                                placeholder={`{\n  "1": {\n    "ques": "Q...",\n    "ans": "A..."\n  }\n}`}
                            />
                        </div>
                    )}


                    {error && <p className="text-red-500 font-bold">{error}</p>}
                    {externalError && <p className="text-red-500 font-bold bg-red-500/10 p-4 rounded-xl border border-red-500/50">{externalError}</p>}

                    <div className="flex gap-4">
                        <button
                            onClick={handleSave}
                            className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-xl shadow-lg mt-8 transition-transform hover:scale-[1.02]"
                        >
                            <Save /> Save Locally
                        </button>
                        <button
                            onClick={handlePublish}
                            disabled={publishStatus !== 'idle' && publishStatus !== 'error'}
                            className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-3 text-xl shadow-lg mt-8 transition-all duration-300 relative overflow-hidden ${
                                publishStatus === 'idle' ? 'bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 hover:scale-[1.02]' :
                                publishStatus === 'success' ? 'bg-green-500' :
                                publishStatus === 'error' ? 'bg-red-500' :
                                'bg-gray-700 cursor-wait'
                            }`}
                        >
                            {/* Loading Bar Effect */}
                            {(publishStatus === 'connecting' || publishStatus === 'uploading') && (
                                <motion.div 
                                    className="absolute bottom-0 left-0 h-1 bg-white/30"
                                    initial={{ width: '0%' }}
                                    animate={{ width: publishStatus === 'connecting' ? '30%' : '90%' }}
                                    transition={{ duration: 1 }}
                                />
                            )}

                            <AnimatePresence mode="wait">
                                {publishStatus === 'idle' && (
                                    <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2">
                                        <Globe size={24} /> Publish to World
                                    </motion.div>
                                )}
                                {publishStatus === 'validating' && (
                                    <motion.div key="val" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Validating Data...
                                    </motion.div>
                                )}
                                {publishStatus === 'connecting' && (
                                    <motion.div key="conn" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 text-primary-200">
                                        <div className="w-5 h-5 border-2 border-primary-400 border-t-white rounded-full animate-spin" />
                                        Handshaking...
                                    </motion.div>
                                )}
                                {publishStatus === 'uploading' && (
                                    <motion.div key="up" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2">
                                        <Upload className="animate-bounce" size={24} />
                                        Sending to Database...
                                    </motion.div>
                                )}
                                {publishStatus === 'success' && (
                                    <motion.div key="suc" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
                                        <Check size={28} /> Published Successfully!
                                    </motion.div>
                                )}
                                {publishStatus === 'error' && (
                                    <motion.div key="err" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                                        <AlertTriangle size={24} /> Upload Failed
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: SETUP ---
const GameSetup = ({ config, setConfig, onBack, onStart, sets, activeSet, setActiveSet, activeTab }) => {
    // Helper to get questions based on structure
    const getQuestions = (id) => {
        if (!id || !sets) return [];
        if (activeTab === 'local') return sets[id] || [];
        return sets.find(s => s.id === id)?.questions || [];
    };

    const questions = getQuestions(activeSet);
    const maxCapacity = config.rows * config.cols;
    const totalSpecials = config.bombs + config.winds + config.bonuses + config.grenades + config.blanks;
    const totalUsed = totalSpecials + config.questionCount;
    const diff = maxCapacity - totalUsed;

    // Auto-update default question count on set change
    useEffect(() => {
        if (activeSet) {
            const qLen = getQuestions(activeSet).length;
            // Try to fill remaining space with questions, even if it exceeds set length (duplicates)
            const availableSlots = maxCapacity - (config.bombs + config.winds + config.bonuses + config.grenades + config.blanks);
            // Default to filling available slots, capped at a reasonable max if needed, but allowing duplicates
            const suggestedQs = Math.max(0, availableSlots);
            setConfig(c => ({ ...c, questionCount: suggestedQs }));
        }
    }, [activeSet]); // Removed maxCapacity from dependency to avoid loop when resizing grid

    return (
        <div className="min-h-screen p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-black text-white flex items-center justify-center">
            <div className="w-full max-w-6xl bg-black/40 backdrop-blur-xl border border-white/10 p-12 rounded-3xl shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-12 relative overflow-hidden">

                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10" />

                {/* LEFT COL: Grid & Set Config (5 cols) */}
                <div className="lg:col-span-5 space-y-8 flex flex-col h-full">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={onBack}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 hover:border-white/20 group"
                        >
                            <ArrowLeft className="text-gray-400 group-hover:text-white transition-colors" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                                GAME SETUP
                            </h1>
                            <p className="text-gray-500 text-xs font-mono tracking-widest uppercase">CONFIGURE BATTLEFIELD</p>
                        </div>
                    </div>

                    {/* Question Set Selection */}
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-3">
                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Question Set</label>
                        <div className="relative">
                            <select
                                value={activeSet || ''}
                                onChange={e => {
                                    setActiveSet(e.target.value);
                                    // Reset question count logic is handled by useEffect
                                }}
                                className="w-full appearance-none bg-black/50 hover:bg-black/70 p-4 rounded-xl border border-white/10 focus:border-primary-500 text-lg font-bold outline-none transition-all cursor-pointer text-white"
                            >
                                <option value="" className="bg-gray-900 text-gray-400">-- Choose Question Set --</option>
                                {activeTab === 'local' ? (
                                    Object.keys(sets).map(s => (
                                        <option key={s} value={s} className="bg-gray-900 text-white">
                                            {s} — {sets[s].length} Qs
                                        </option>
                                    ))
                                ) : (
                                    sets.map(s => (
                                        <option key={s.id} value={s.id} className="bg-gray-900 text-white">
                                            {s.name} — {s.questions?.length} Qs ({s.author || 'Anon'})
                                        </option>
                                    ))
                                )}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                <List size={16} />
                            </div>
                        </div>
                    </div>

                    {/* Grid Dimensions */}
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4 flex-1">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Grid Dimensions</label>
                            <div className="text-[10px] bg-white/10 px-2 py-1 rounded text-gray-300 font-mono">
                                {maxCapacity} CELLS
                            </div>
                        </div>

                        <div className="space-y-4">
                            <NumberInput label="Rows" value={config.rows} min={3} max={8} onChange={v => setConfig({ ...config, rows: v })} />
                            <NumberInput label="Cols" value={config.cols} min={3} max={8} onChange={v => setConfig({ ...config, cols: v })} />
                            <div className="h-px bg-white/10 my-4" />
                            <NumberInput label="Teams" value={config.teams} min={2} max={6} color="text-yellow-400" onChange={v => setConfig({ ...config, teams: v })} />
                        </div>
                    </div>
                </div>

                {/* RIGHT COL: Content & Status (7 cols) */}
                <div className="lg:col-span-7 space-y-8 flex flex-col h-full">
                    <div className="bg-white/5 p-8 rounded-2xl border border-white/10 flex-1 space-y-8">
                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <Settings size={18} className="text-primary-400" />
                                Content Config
                            </h3>
                            <div className="text-right">
                                <div className="text-3xl font-black font-mono leading-none">{totalUsed} <span className="text-lg text-gray-500">/ {maxCapacity}</span></div>
                                <div className={`text-[10px] font-bold uppercase tracking-widest ${diff < 0 ? 'text-red-500' : diff > 0 ? 'text-orange-400' : 'text-green-500'}`}>
                                    {diff < 0 ? 'OVER CAPACITY' : diff > 0 ? 'UNDER CAPACITY' : 'PERFECT MATCH'}
                                </div>
                            </div>
                        </div>

                        {/* Sliders / Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <div className="md:col-span-2">
                                <NumberInput
                                    label={`Questions (Set has: ${questions.length})`}
                                    value={config.questionCount}
                                    min={0}
                                    max={maxCapacity}
                                    color="text-blue-400"
                                    onChange={v => setConfig({ ...config, questionCount: v })}
                                />
                            </div>

                            <NumberInput label="Bombs" icon={<Bomb size={14} />} value={config.bombs} min={0} max={10} color="text-red-500" onChange={v => setConfig({ ...config, bombs: v })} />
                            <NumberInput label="Winds" icon={<Wind size={14} />} value={config.winds} min={0} max={5} color="text-gray-400" onChange={v => setConfig({ ...config, winds: v })} />
                            <NumberInput label="Bonuses" icon={<Gift size={14} />} value={config.bonuses} min={0} max={10} color="text-green-500" onChange={v => setConfig({ ...config, bonuses: v })} />
                            <NumberInput label="Grenades" icon={<Crosshair size={14} />} value={config.grenades} min={0} max={5} color="text-orange-500" onChange={v => setConfig({ ...config, grenades: v })} />
                            <NumberInput label="Skips" icon={<FastForward size={14} />} value={config.skips} min={0} max={5} color="text-purple-500" onChange={v => setConfig({ ...config, skips: v })} />


                            <div className="md:col-span-2 pt-4 border-t border-white/5">
                                <NumberInput label="Blanks (Empty Slots)" icon={<Ban size={14} />} value={config.blanks} min={0} max={20} color="text-gray-600" onChange={v => setConfig({ ...config, blanks: v })} />
                            </div>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="space-y-4">
                        {diff > 0 && (
                            <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/30 p-4 rounded-xl">
                                <div className="flex items-center gap-3 text-orange-400 text-sm font-bold">
                                    <AlertTriangle size={18} />
                                    <span>{diff} slots remaining. They will be Auto-Filled as Blanks.</span>
                                </div>
                                <button
                                    onClick={() => setConfig({ ...config, blanks: config.blanks + diff })}
                                    className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black text-xs font-black uppercase rounded-lg transition-colors"
                                >
                                    Fill as Blanks
                                </button>
                            </div>
                        )}

                        {diff < 0 && (
                            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-red-500 text-sm font-bold animate-pulse">
                                <X size={18} />
                                <span>Grid Overloaded! Remove {Math.abs(diff)} items to start.</span>
                            </div>
                        )}

                        <button
                            onClick={onStart}
                            disabled={!activeSet || diff < 0}
                            className="w-full py-6 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl font-black text-2xl uppercase tracking-widest shadow-lg shadow-primary-900/50 hover:scale-[1.01] hover:shadow-primary-500/30 transition-all border border-white/10 text-white"
                        >
                            Start Battle
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const NumberInput = ({ label, value, min, max, onChange, color = "text-white", icon }) => (
    <div className="flex items-center justify-between group">
        <span className={`font-bold flex items-center gap-2 transition-colors ${color ? 'text-gray-400 group-hover:text-gray-200' : ''}`}>
            {icon && <span className={color}>{icon}</span>}
            {label}
        </span>
        <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg p-1">
            <button
                onClick={() => onChange(Math.max(min, Number(value) - 1))}
                disabled={value <= min}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors text-white"
            >
                -
            </button>
            <span className={`w-10 text-center font-mono font-bold text-lg ${color}`}>{value}</span>
            <button
                onClick={() => onChange(Math.min(max, Number(value) + 1))}
                disabled={value >= max}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors text-white"
            >
                +
            </button>
        </div>
    </div>
);

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
            <div className="flex justify-center gap-6 mt-4">
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
