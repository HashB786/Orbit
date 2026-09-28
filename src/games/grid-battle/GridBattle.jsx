import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid as GridIcon, Trophy, Disc, Wind, Star, Flame, HelpCircle, Check, X, CircleOff, Tornado, Crown, Rocket } from 'lucide-react';
import { answerLabel } from '../../platform/questions/types';
import { shuffle } from '../../platform/questions/rounds';
import { SPACE_BG } from '../../components/SpaceScreen';
import { audio } from '../../platform/audio/audio';
import { useTheme } from '../../context/ThemeContext';
import { useT } from '../../context/LanguageContext';
import Slots from '../../i18n/Slots';

// --- TEAMS & TILES ---

const TEAMS = [
    { name: 'Nova', color: '#34d399' },
    { name: 'Comet', color: '#60a5fa' },
    { name: 'Pulsar', color: '#f472b6' },
    { name: 'Quasar', color: '#fbbf24' },
    { name: 'Nebula', color: '#a78bfa' },
    { name: 'Aurora', color: '#2dd4bf' }
];
const team = (i) => TEAMS[i % TEAMS.length];

// Internal ids stay the same (bomb, wind...) so settings and history keep working.
// Texts: grid.tiles.<type>.label / title / text
const TILES = {
    question: { icon: HelpCircle, color: '#60a5fa', sound: 'question' },
    bomb: { icon: Disc, color: '#f87171', sound: 'bomb' },
    wind: { icon: Wind, color: '#94a3b8', sound: 'wind' },
    bonus: { icon: Star, color: '#fbbf24', sound: 'bonus' },
    grenade: { icon: Flame, color: '#fb923c', sound: 'whoosh' },
    skip: { icon: Tornado, color: '#a78bfa', sound: 'skip' },
    blank: { icon: CircleOff, color: '#64748b', sound: 'blank' }
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

const optionClass = (revealed, correct) => (revealed && correct
    ? 'border-emerald-400 bg-emerald-400/15 text-white'
    : revealed ? 'border-white/10 text-gray-500' : 'border-white/15 bg-white/[0.03] text-white');

// Shows any question type on the big screen; the teacher reveals and judges the answer
const QuestionReveal = ({ card, revealed, onReveal }) => {
    const t = useT();
    const q = card.data;
    return (
        <div className="space-y-5">
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-relaxed max-w-xl mx-auto break-words">{q.prompt}</p>

            {(q.type === 'mc' || q.type === 'multi') && (
                <div className="space-y-2">
                    {q.type === 'multi' && <p className="text-xs font-bold uppercase tracking-wider text-sky-300">{t('grid.multi')}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                        {(card.options || q.options).map((o, i) => (
                            <div key={o.id || i} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${optionClass(revealed, o.correct)}`}>
                                <span className="w-7 h-7 shrink-0 rounded-full bg-white/10 flex items-center justify-center font-black text-sm">{LETTERS[i]}</span>
                                <span className="font-semibold break-words min-w-0">{o.text}</span>
                                {revealed && o.correct && <Check size={18} className="ml-auto text-emerald-300 shrink-0" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {q.type === 'tf' && (
                <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                    {[true, false].map(v => (
                        <div key={String(v)} className={`py-3 rounded-2xl border font-black text-lg ${optionClass(revealed, (q.answer !== false) === v)}`}>
                            {v ? t('common.true') : t('common.false')}
                        </div>
                    ))}
                </div>
            )}

            {q.type === 'order' && (revealed ? (
                <ol className="space-y-1.5 text-left max-w-md mx-auto">
                    {q.items.map((item, i) => (
                        <li key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-emerald-400/60 bg-emerald-400/10">
                            <span className="w-7 h-7 shrink-0 rounded-full bg-emerald-400 text-gray-950 font-black text-sm flex items-center justify-center">{i + 1}</span>
                            <span className="font-semibold break-words min-w-0">{item}</span>
                        </li>
                    ))}
                </ol>
            ) : (
                <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-300">{t('grid.order')}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {(card.order || q.items).map((item, i) => (
                            <span key={i} className="px-3 py-2 rounded-2xl border border-white/15 bg-white/[0.03] font-semibold text-white">{item}</span>
                        ))}
                    </div>
                </div>
            ))}

            {q.type === 'typed' && revealed && (
                <div className="bg-emerald-400/10 p-5 rounded-2xl border border-emerald-400/40">
                    <div className="text-xs text-emerald-300 font-bold uppercase mb-2 tracking-wider">{t('editor.correctAnswer')}</div>
                    <div className="text-2xl font-bold text-white break-words">{answerLabel(q)}</div>
                </div>
            )}

            {!revealed && (
                <button
                    onClick={onReveal}
                    className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 text-gray-200 font-bold text-sm transition-colors border border-white/10"
                >
                    {t('grid.reveal')}
                </button>
            )}
        </div>
    );
};

// Glowing icon with an orbit ring, used in the tile pop-up
const TileBadge = ({ type, size = 96 }) => {
    const tile = TILES[type];
    const Icon = tile.icon;
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${tile.color}55, transparent 70%)` }} />
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden>
                <ellipse cx="50" cy="50" rx="46" ry="18" fill="none" stroke={tile.color} strokeOpacity="0.5" strokeWidth="2" transform="rotate(-25 50 50)" />
            </svg>
            <div className="absolute inset-[22%] rounded-full flex items-center justify-center text-gray-950" style={{ background: tile.color, boxShadow: `0 0 30px ${tile.color}88` }}>
                <Icon size={size * 0.28} />
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const GridBattle = ({ questions = [], settings = {} }) => {
    const t = useT();
    const { performance } = useTheme();
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

    const [mode, setMode] = useState('game'); // 'game' | 'victory'
    const [grid, setGrid] = useState(() => buildGrid(config, questions));
    const [teamScores, setTeamScores] = useState(() => new Array(config.teams).fill(0));
    const [currentTeam, setCurrentTeam] = useState(0);
    const [activeCard, setActiveCard] = useState(null); // { r, c, type, data, mode, ... }
    const [grenadeTargetMode, setGrenadeTargetMode] = useState(false);
    const [showAnswer, setShowAnswer] = useState(false);
    const [gameLog, setGameLog] = useState([]);
    const [scoreHistory, setScoreHistory] = useState(() => [new Array(config.teams).fill(0)]);
    const [flash, setFlash] = useState(null); // short banner, e.g. "Empty space"
    const timers = useRef([]);

    const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
    useEffect(() => {
        audio.playMusic('board');
        return () => {
            timers.current.forEach(clearTimeout);
            audio.stopMusic();
        };
    }, []);

    const allRevealed = (g) => g.every(row => row.every(cell => cell.revealed));

    const finish = () => {
        setMode('victory');
        audio.sfx('podium');
        if (performance.particles) {
            import('canvas-confetti').then(({ default: confetti }) => {
                confetti({ particleCount: 150, spread: 100, origin: { y: 0.3 }, disableForReducedMotion: true });
            }).catch(() => {});
        }
    };

    // --- NEW GAME (same set, same settings, new board) ---
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
        audio.sfx('whoosh');
    };

    // --- GAMEPLAY ---
    const handleCellClick = (r, c) => {
        audio.unlock();
        if (grenadeTargetMode) return;

        // Revealed tiles open their history
        if (grid[r][c].revealed) {
            audio.sfx('click');
            setActiveCard({ ...grid[r][c], r, c, mode: 'inspect' });
            return;
        }
        if (activeCard) return;

        const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
        newGrid[r][c].revealed = true;
        const card = newGrid[r][c];
        audio.sfx('reveal');
        later(() => audio.sfx(TILES[card.type].sound), 220);

        // Empty space: same team picks again
        if (card.type === 'blank') {
            newGrid[r][c].history = { team: currentTeam, round: gameLog.length + 1, result: 'Empty (pick again)' };
            setGrid(newGrid);
            setScoreHistory([...scoreHistory, [...teamScores]]);
            setGameLog([...gameLog, { round: gameLog.length + 1, team: currentTeam, type: 'blank', points: 0, result: 'retry' }]);
            setFlash(t('grid.emptyFlash', { team: team(currentTeam).name }));
            later(() => setFlash(null), 1800);
            if (allRevealed(newGrid)) later(finish, 900);
            return;
        }

        setGrid(newGrid);
        setActiveCard({ r, c, ...card, mode: 'play' });
        setShowAnswer(false);
    };

    const handleEventResolution = (result) => {
        const scores = [...teamScores];
        const card = activeCard;
        const round = gameLog.length + 1;
        const logEntry = { round, team: currentTeam, type: card.type, details: card.data || {}, result };

        if (card.type === 'question') {
            logEntry.points = result === 'correct' ? 1 : 0;
            if (result === 'correct') scores[currentTeam] += 1;
            audio.sfx(result === 'correct' ? 'correct' : 'wrong');
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
            setGrenadeTargetMode({ card: { ...card } });
            return;
        }

        const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
        newGrid[card.r][card.c].history = { team: currentTeam, round, result };
        setGrid(newGrid);
        setTeamScores(scores);
        setScoreHistory([...scoreHistory, [...scores]]);
        setGameLog([...gameLog, logEntry]);
        setActiveCard(null);
        setCurrentTeam((currentTeam + 1) % config.teams);
        if (allRevealed(newGrid)) later(finish, 400);
    };

    const handleGrenadeAttack = (target) => {
        const scores = [...teamScores];
        scores[target] -= 1;
        const round = gameLog.length + 1;
        const cardCtx = grenadeTargetMode.card;
        audio.sfx('grenade');

        const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
        newGrid[cardCtx.r][cardCtx.c].history = { team: currentTeam, round, result: `Hit ${team(target).name}`, target };
        setGrid(newGrid);
        setTeamScores(scores);
        setScoreHistory([...scoreHistory, [...scores]]);
        setGameLog([...gameLog, { round, team: currentTeam, type: 'grenade', target, points: 'Attack', result: 'hit' }]);
        setGrenadeTargetMode(false);
        setCurrentTeam((currentTeam + 1) % config.teams);
        if (allRevealed(newGrid)) later(finish, 900);
    };

    const leaderboard = teamScores.map((score, i) => ({ i, score })).sort((a, b) => b.score - a.score);
    const tile = activeCard ? TILES[activeCard.type] : null;

    return (
        <div className="flex flex-col min-h-full md:h-full w-full text-white" style={SPACE_BG} onPointerDown={() => audio.unlock()}>
            {/* Team pods */}
            <div className="shrink-0 flex items-center gap-2 sm:gap-3 px-2 sm:pl-6 sm:pr-40 pt-16 sm:pt-3 pb-4 overflow-x-auto">
                {teamScores.map((score, idx) => {
                    const tm = team(idx);
                    const isTargetable = grenadeTargetMode && idx !== currentTeam;
                    const isCurrent = idx === currentTeam && !grenadeTargetMode;
                    return (
                        <button
                            key={idx}
                            type="button"
                            disabled={!isTargetable}
                            onClick={() => isTargetable && handleGrenadeAttack(idx)}
                            className={`relative shrink-0 flex items-center gap-2.5 sm:gap-3 pl-2 pr-4 sm:pr-5 py-2 rounded-full border-2 transition-all duration-300 disabled:cursor-default
                                ${isTargetable ? 'border-orange-400 bg-orange-500/15 animate-pulse cursor-pointer' : ''}
                                ${isCurrent ? 'bg-white/10' : ''}
                                ${!isTargetable && !isCurrent ? 'border-white/10 bg-white/[0.03] opacity-60' : ''}`}
                            style={isCurrent ? { borderColor: tm.color, boxShadow: `0 0 24px ${tm.color}55` } : undefined}
                        >
                            <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-gray-950 font-black" style={{ background: tm.color }}>
                                {isTargetable ? <Flame size={18} /> : <Rocket size={16} />}
                            </span>
                            <span className="text-left leading-tight">
                                <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-300">{tm.name}</span>
                                <span className="block text-xl sm:text-3xl font-black tabular-nums">{score}</span>
                            </span>
                            {isCurrent && <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-black text-gray-950 whitespace-nowrap" style={{ background: tm.color }}>{t('grid.turn')}</span>}
                        </button>
                    );
                })}
            </div>

            {grenadeTargetMode && (
                <div className="shrink-0 flex justify-center px-4 -mt-1 mb-2">
                    <div className="bg-orange-500 text-gray-950 px-5 py-2 rounded-full font-black text-sm sm:text-lg text-center shadow-[0_0_30px_rgba(249,115,22,0.5)]">
                        ☄️ {t('grid.strike', { team: team(currentTeam).name })}
                    </div>
                </div>
            )}

            {/* Board */}
            <div className="flex-1 min-h-0 px-2 pb-3 sm:px-6 sm:pb-6 flex items-center justify-center">
                <div
                    className="grid gap-1.5 sm:gap-3 w-full h-full max-w-7xl mx-auto"
                    style={{
                        gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${config.rows}, minmax(2.75rem, 1fr))`,
                        minHeight: `${config.rows * 3}rem`
                    }}
                >
                    {grid.map((row, r) => row.map((cell, c) => {
                        const tile = TILES[cell.type];
                        const Icon = tile.icon;
                        const picker = cell.history?.team;
                        return (
                            <motion.button
                                key={`${r}-${c}`}
                                whileHover={{ scale: cell.revealed ? 1 : 1.04 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleCellClick(r, c)}
                                aria-label={cell.revealed ? t('grid.revealedTile', { label: t(`grid.tiles.${cell.type}.label`) }) : t('grid.tile', { n: r * config.cols + c + 1 })}
                                className={`relative rounded-xl sm:rounded-2xl font-bold flex items-center justify-center overflow-hidden border transition-colors
                                    ${cell.revealed ? 'border-white/5' : 'border-white/10 hover:border-sky-300/50 cursor-pointer'}
                                    ${cell.history?.result === 'void' ? 'opacity-40 grayscale' : ''}`}
                                style={{
                                    background: cell.revealed
                                        ? `radial-gradient(circle at 50% 40%, ${tile.color}33, rgba(11,17,40,0.9) 70%)`
                                        : 'radial-gradient(circle at 30% 25%, rgba(125,211,252,0.18), rgba(15,23,51,0.95) 60%)'
                                }}
                            >
                                {cell.revealed ? (
                                    <motion.div initial={{ scale: 0, rotate: 120 }} animate={{ scale: 1, rotate: 0 }} className="flex flex-col items-center justify-center gap-1">
                                        <Icon style={{ width: 'clamp(18px, 3.2vw, 40px)', height: 'clamp(18px, 3.2vw, 40px)', color: tile.color }} />
                                        {picker !== undefined && picker !== null && (
                                            <span className="hidden sm:block w-2 h-2 rounded-full" style={{ background: team(picker).color }} />
                                        )}
                                    </motion.div>
                                ) : (
                                    <span className="text-white/40 font-black" style={{ fontSize: 'clamp(0.9rem, 2.4vw, 2.2rem)' }}>{r * config.cols + c + 1}</span>
                                )}
                            </motion.button>
                        );
                    }))}
                </div>
            </div>

            {/* Short banner (empty space) */}
            <AnimatePresence>
                {flash && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
                        <span className="px-5 py-2.5 rounded-full bg-slate-700 text-white font-black shadow-xl">{flash}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tile pop-up */}
            <AnimatePresence>
                {activeCard && tile && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#040714]/85" />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl max-h-[94vh] bg-[#0b1128] border border-white/10 rounded-3xl overflow-y-auto overflow-x-hidden"
                            style={{ boxShadow: `0 0 60px -10px ${tile.color}88` }}
                        >
                            <div className="flex items-center justify-between px-5 pt-4">
                                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: tile.color }}>
                                    {activeCard.mode === 'inspect' ? t('grid.history') : t('grid.pick', { team: team(currentTeam).name })}
                                </span>
                                <button
                                    onClick={activeCard.mode === 'play' ? () => setActiveCard(prev => ({ ...prev, closeConfirm: !prev.closeConfirm })) : () => setActiveCard(null)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                    aria-label={t('common.close')}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {activeCard.closeConfirm && (
                                <div className="absolute inset-0 z-50 bg-[#0b1128]/95 flex flex-col items-center justify-center p-8">
                                    <div className="w-full max-w-sm space-y-6 text-center">
                                        <div className="space-y-2">
                                            <h3 className="text-2xl font-black">{t('grid.unfinished')}</h3>
                                            <p className="text-gray-400 text-sm">{t('grid.unfinishedText')}</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            <button onClick={() => setActiveCard(prev => ({ ...prev, closeConfirm: false }))} className="w-full py-4 bg-white text-gray-950 rounded-2xl font-bold">
                                                {t('grid.keep')}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
                                                    newGrid[activeCard.r][activeCard.c].revealed = false;
                                                    setGrid(newGrid);
                                                    setActiveCard(null);
                                                }}
                                                className="w-full py-4 bg-amber-400/10 text-amber-300 border border-amber-400/30 rounded-2xl font-bold"
                                            >
                                                {t('grid.hide')}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
                                                    newGrid[activeCard.r][activeCard.c].history = { result: 'void' };
                                                    setGrid(newGrid);
                                                    setActiveCard(null);
                                                    if (allRevealed(newGrid)) later(finish, 400);
                                                }}
                                                className="w-full py-4 bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-2xl font-bold"
                                            >
                                                {t('grid.skip')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="px-5 pb-6 sm:px-10 sm:pb-10 pt-2 flex flex-col items-center text-center gap-5">
                                <TileBadge type={activeCard.type} size={activeCard.type === 'question' ? 84 : 120} />
                                <div className="w-full space-y-4">
                                    {activeCard.type === 'question' ? (
                                        <div className="space-y-6">
                                            <QuestionReveal card={activeCard} revealed={activeCard.mode === 'inspect' || showAnswer} onReveal={() => { audio.sfx('click'); setShowAnswer(true); }} />
                                            {activeCard.mode === 'play' && (
                                                <div className="flex gap-2 sm:gap-4 justify-center">
                                                    <button onClick={() => handleEventResolution('incorrect')} className="flex-1 px-3 sm:px-6 py-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-2xl font-black flex items-center justify-center gap-2 transition-colors">
                                                        <X size={20} /> {t('grid.wrong')}
                                                    </button>
                                                    <button onClick={() => handleEventResolution('correct')} className="flex-1 px-3 sm:px-6 py-4 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 rounded-2xl font-black flex items-center justify-center gap-2 transition-colors">
                                                        <Check size={20} /> {t('grid.correct')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            <h3 className="text-3xl sm:text-5xl font-black" style={{ color: tile.color }}>{t(`grid.tiles.${activeCard.type}.title`)}</h3>
                                            <p className="text-lg text-gray-300 max-w-md mx-auto">
                                                {activeCard.type === 'grenade' && activeCard.mode === 'inspect'
                                                    ? t('grid.hit', { team: team(activeCard.history?.target ?? 0).name })
                                                    : t(`grid.tiles.${activeCard.type}.text`)}
                                            </p>
                                            {activeCard.mode === 'play' && (
                                                <button onClick={() => handleEventResolution('ok')} className="w-full sm:w-auto px-12 py-4 rounded-2xl font-black text-lg text-gray-950 transition-transform hover:scale-105" style={{ background: tile.color }}>
                                                    {activeCard.type === 'grenade' ? t('grid.chooseTarget') : t('common.continue')}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {activeCard.mode === 'inspect' && activeCard.history?.team !== undefined && (
                                        <p className="text-sm text-gray-400">
                                            <Slots text={t('grid.pickedBy')} slots={{ team: <b style={{ color: team(activeCard.history.team).color }}>{team(activeCard.history.team).name}</b> }} />
                                            {activeCard.type === 'question' && ` · ${activeCard.history.result === 'correct' ? t('grid.answeredRight') : t('grid.answeredWrong')}`}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Victory */}
            {mode === 'victory' && (
                <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center px-4 pt-16 pb-8 sm:p-8 overflow-y-auto" style={SPACE_BG}>
                    <div className="w-full max-w-4xl space-y-8 text-center">
                        <div>
                            <Trophy size={64} className="text-amber-300 mx-auto" />
                            <h1 className="text-4xl sm:text-6xl font-black mt-2">
                                {leaderboard[0] && leaderboard[1] && leaderboard[0].score === leaderboard[1].score ? t('grid.tie') : t('hostGame.duel.wins', { name: team(leaderboard[0].i).name })}
                            </h1>
                        </div>

                        <div className="flex flex-wrap gap-3 justify-center">
                            {leaderboard.map(({ i, score }, rank) => (
                                <motion.div
                                    key={i}
                                    initial={{ y: 30, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 + rank * 0.15 }}
                                    className="w-32 sm:w-40 rounded-3xl bg-white/5 border p-4"
                                    style={{ borderColor: rank === 0 ? team(i).color : 'rgba(255,255,255,0.1)', boxShadow: rank === 0 ? `0 0 40px ${team(i).color}44` : undefined }}
                                >
                                    {rank === 0 && <Crown size={24} className="mx-auto text-amber-300" />}
                                    <div className="text-sm font-bold uppercase tracking-widest" style={{ color: team(i).color }}>{team(i).name}</div>
                                    <div className="text-4xl sm:text-5xl font-black tabular-nums mt-1">{score}</div>
                                    <div className="text-xs text-gray-500 font-bold mt-1">#{rank + 1}</div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="bg-white/5 p-4 sm:p-6 rounded-3xl border border-white/10">
                            <h3 className="text-lg font-bold text-gray-300 mb-4 text-left">{t('grid.graph')}</h3>
                            <StatsGraph history={scoreHistory} teams={config.teams} />
                        </div>

                        <div className="flex flex-wrap gap-3 justify-center">
                            <button onClick={() => setMode('game')} className="px-8 py-4 bg-white/10 hover:bg-white/15 font-bold rounded-2xl flex items-center gap-2">
                                <GridIcon size={20} /> {t('grid.reviewBoard')}
                            </button>
                            <button onClick={startGame} className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black rounded-2xl">
                                {t('grid.newBoard')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SCORE GRAPH ---
const StatsGraph = ({ history, teams }) => {
    const t = useT();
    const maxRound = history.length - 1;
    const allScores = history.flat();
    const minScore = Math.min(0, ...allScores);
    const maxScore = Math.max(5, ...allScores);
    const range = maxScore - minScore || 1;
    const height = 200;
    const width = 800;
    const padding = 30;
    const getX = (round) => padding + (round / maxRound) * (width - padding * 2);
    const getY = (score) => height - padding - ((score - minScore) / range) * (height - padding * 2);

    if (maxRound < 1) return <div className="text-gray-500">{t('grid.noGraph')}</div>;

    return (
        <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[520px]">
                {[...Array(5)].map((_, i) => {
                    const y = padding + (i / 4) * (height - padding * 2);
                    return <line key={i} x1={padding} y1={y} x2={width - padding} y2={y} stroke="white" strokeOpacity="0.06" />;
                })}
                <line x1={padding} y1={getY(0)} x2={width - padding} y2={getY(0)} stroke="white" strokeOpacity="0.2" strokeDasharray="4" />
                {Array.from({ length: teams }).map((_, ti) => (
                    <g key={ti}>
                        <polyline
                            points={history.map((scores, round) => `${getX(round)},${getY(scores[ti])}`).join(' ')}
                            fill="none"
                            stroke={team(ti).color}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <circle cx={getX(maxRound)} cy={getY(history[maxRound][ti])} r="5" fill={team(ti).color} stroke="#0b1128" strokeWidth="2" />
                    </g>
                ))}
            </svg>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-3">
                {Array.from({ length: teams }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-bold text-gray-300">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team(i).color }} />
                        {team(i).name}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GridBattle;
