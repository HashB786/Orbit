import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Users, Lock, Unlock, Play, Timer, Plus, Square, Volume2, VolumeX, Bot, Trophy, Crown, Swords,
    BookOpen, RotateCcw, Home, AlertTriangle, Monitor, Hourglass, WifiOff, Sparkles
} from 'lucide-react';
import QRCode from '../../components/ui/QRCode';
import { ConfirmDialog, Spinner } from '../../components/ui';
import { SPACE_BG } from '../../components/SpaceScreen';
import { useRealtime, useRoomValue, useServerNow, formatClock, rankPlayers } from '../../platform/rooms/hooks';
import { roomPath, attachPresence, setRoomLocked, kickPlayer, isOnline, playAgain } from '../../platform/rooms/rooms';
import { getTabId } from '../../platform/realtime';
import { normalizeQuestion } from '../../platform/questions/normalize';
import { answerLabel } from '../../platform/questions/types';
import { audio } from '../../platform/audio/audio';
import { useTheme } from '../../context/ThemeContext';
import { CometClashHost } from './hostLogic';
import { MeteorShowerHost } from './showerLogic';
import ShowerLive from './ShowerLive';

const MEDALS = ['#fbbf24', '#cbd5e1', '#f59e0b'];

const Pill = ({ children, className = '' }) => (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-sm font-semibold ${className}`}>{children}</span>
);

const HostButton = ({ children, onClick, variant = 'ghost', disabled, title }) => (
    <button
        onClick={(e) => { e.currentTarget.blur(); onClick?.(e); }}
        disabled={disabled}
        title={title}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variant === 'primary'
            ? 'px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-950 text-lg'
            : variant === 'danger'
                ? 'px-3 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-300'
                : 'px-3 py-2 bg-white/10 hover:bg-white/15 text-white'}`}
    >
        {children}
    </button>
);

const SoundToggle = () => {
    const [muted, setMuted] = useState(audio.getSettings().muted);
    return (
        <HostButton
            title={muted ? 'Unmute' : 'Mute'}
            onClick={() => {
                audio.unlock();
                audio.updateSettings({ muted: !muted });
                setMuted(!muted);
            }}
        >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </HostButton>
    );
};

// ---------- LOBBY ----------

const Lobby = ({ code, meta, players, onStart, onKick, onLock }) => {
    const joinUrl = `${window.location.origin}/play/${code}`;
    const shortUrl = `${window.location.host}/join`;
    const list = rankPlayers(players);
    const s = meta.settings || {};
    const shower = s.mode === 'shower';
    const canStart = list.length >= (shower || s.bots !== false ? 1 : 2);

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6">
            <section className="rounded-3xl bg-white/5 border border-white/10 p-6 text-center flex flex-col items-center">
                <p className="text-gray-400 font-semibold">Join at <b className="text-white">{shortUrl}</b> with code</p>
                <p className="mt-2 text-6xl sm:text-7xl font-black tracking-[0.12em] tabular-nums">{code.slice(0, 3)} {code.slice(3)}</p>
                <div className="mt-5 p-3 bg-white rounded-2xl">
                    <QRCode value={joinUrl} size={168} />
                </div>
                <p className="mt-3 text-xs text-gray-500">Scan to join instantly</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {shower ? (
                        <>
                            <Pill><Sparkles size={14} /> Meteor Shower</Pill>
                            <Pill><Timer size={14} /> {s.showerQuestions} questions</Pill>
                        </>
                    ) : (
                        <>
                            <Pill><Swords size={14} /> {s.rounds} rounds per duel</Pill>
                            <Pill><Timer size={14} /> {Math.round((s.duration || 0) / 60)} min</Pill>
                            {s.bots !== false && <Pill><Bot size={14} /> Bots on</Pill>}
                        </>
                    )}
                </div>
            </section>

            <section className="rounded-3xl bg-white/5 border border-white/10 p-5 sm:p-6 flex flex-col min-h-[20rem]">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h2 className="text-2xl font-black flex items-center gap-2"><Users size={24} /> {list.length} player{list.length === 1 ? '' : 's'}</h2>
                    <div className="flex gap-2">
                        <HostButton onClick={() => onLock(!meta.locked)} title={meta.locked ? 'Unlock room' : 'Lock room'}>
                            {meta.locked ? <Lock size={18} /> : <Unlock size={18} />} {meta.locked ? 'Locked' : 'Open'}
                        </HostButton>
                        <SoundToggle />
                    </div>
                </div>

                {list.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                        <Hourglass size={36} className="mb-3 opacity-60" />
                        <p className="font-semibold">Waiting for students to join…</p>
                    </div>
                ) : (
                    <ul className="flex flex-wrap gap-2 content-start">
                        {list.map(p => (
                            <motion.li key={p.id} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                                <button
                                    onClick={() => onKick(p)}
                                    title={`Remove ${p.name}`}
                                    className="group flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white/10 hover:bg-red-500/25 transition-colors"
                                >
                                    <span className="w-6 h-6 rounded-full" style={{ background: p.color }} />
                                    <span className={`font-bold ${p.connected === false ? 'opacity-50' : ''}`}>{p.name}</span>
                                </button>
                            </motion.li>
                        ))}
                    </ul>
                )}

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-sm text-gray-400">
                        {list.length === 1 && !shower && s.bots !== false ? 'One player? They will duel a bot.' : 'Tap a name to remove a player.'}
                    </p>
                    <HostButton variant="primary" onClick={onStart} disabled={!canStart}>
                        <Play size={20} className="fill-current" /> Start game
                    </HostButton>
                </div>
            </section>
        </div>
    );
};

// ---------- LIVE ----------

const DuelCard = ({ m, players, now }) => {
    const a = players[m.a];
    const b = m.b === 'bot' ? { name: m.bot?.name || 'Bot', color: '#94a3b8', bot: true } : players[m.b];
    const status = m.status === 'intro' ? 'Get ready'
        : m.status === 'round' ? (m.sudden ? 'Sudden death!' : `Round ${m.round}/${m.rounds}`)
            : m.status === 'result' ? 'Round over'
                : m.outcome?.winner === m.a ? `${a?.name} wins!`
                    : m.outcome?.winner === m.b ? `${b?.name} wins!`
                        : m.outcome?.reason === 'time' ? 'Time up' : 'Draw';
    return (
        <li className="rounded-2xl bg-white/5 border border-white/10 p-3">
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-gray-400 mb-2">
                <span className={m.sudden && m.status === 'round' ? 'text-amber-300' : ''}>{status}</span>
                {m.status === 'round' && now < m.roundStartAt + 60000 && <span className="tabular-nums">{m.q?.kind === 'order' ? 'Order' : m.q?.kind === 'multi' ? 'Multi' : ''}</span>}
            </div>
            {[[m.a, a], [m.b, b]].map(([id, p]) => (
                <div key={id} className="flex items-center justify-between gap-2 py-0.5">
                    <span className="flex items-center gap-2 min-w-0">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: p?.color || '#64748b' }} />
                        <span className="font-bold truncate">{p?.name || 'Left'}</span>
                        {p?.bot && <Bot size={14} className="text-gray-400 shrink-0" />}
                    </span>
                    <span className="font-black tabular-nums text-lg">{m.scores?.[id] ?? 0}</span>
                </div>
            ))}
        </li>
    );
};

const Live = ({ meta, players, matches, now, onEnd, onAddTime, onLock, code }) => {
    const ranked = rankPlayers(players);
    const active = Object.values(matches || {}).filter(m => m?.id).sort((x, y) => x.createdAt - y.createdAt);
    const waiting = ranked.filter(p => p.status === 'queued' && isOnline(p, now));
    const away = ranked.filter(p => p.status === 'away' || !isOnline(p, now));
    const remaining = meta.endsAt - now;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                    <span className={`text-5xl sm:text-6xl font-black tabular-nums ${remaining < 30000 ? 'text-amber-300' : ''}`}>{formatClock(remaining)}</span>
                    <span className="text-gray-400 text-sm font-semibold leading-tight">left<br />Join: <b className="text-white tabular-nums">{code}</b></span>
                </div>
                <div className="flex flex-wrap gap-2">
                    <HostButton onClick={onAddTime} title="Add one minute"><Plus size={16} /> 1 min</HostButton>
                    <HostButton onClick={() => onLock(!meta.locked)} title={meta.locked ? 'Unlock room' : 'Lock room'}>
                        {meta.locked ? <Lock size={16} /> : <Unlock size={16} />}
                    </HostButton>
                    <SoundToggle />
                    <HostButton variant="danger" onClick={onEnd}><Square size={16} /> End</HostButton>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6">
                <section className="rounded-3xl bg-white/5 border border-white/10 p-4 sm:p-5">
                    <h2 className="text-xl font-black flex items-center gap-2 mb-3"><Trophy size={20} className="text-amber-300" /> Leaderboard</h2>
                    <ol className="space-y-1.5">
                        {ranked.slice(0, 12).map((p, i) => (
                            <motion.li layout key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5">
                                <span className="w-7 text-center font-black tabular-nums" style={{ color: MEDALS[i] || '#94a3b8' }}>{i + 1}</span>
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
                                <span className="flex-1 min-w-0 font-bold truncate">{p.name}</span>
                                {(p.wins || 0) > 0 && <span className="text-xs font-bold text-amber-300 flex items-center gap-1"><Crown size={12} />{p.wins}</span>}
                                <span className="font-black tabular-nums text-lg min-w-[2.5rem] text-right">{p.score}</span>
                            </motion.li>
                        ))}
                    </ol>
                    {ranked.length > 12 && <p className="text-xs text-gray-500 mt-2">+{ranked.length - 12} more</p>}
                </section>

                <section className="space-y-4">
                    <div className="rounded-3xl bg-white/5 border border-white/10 p-4 sm:p-5">
                        <h2 className="text-xl font-black flex items-center gap-2 mb-3"><Swords size={20} className="text-emerald-300" /> Duels <span className="text-gray-500 text-base">({active.length})</span></h2>
                        {active.length ? (
                            <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                                {active.map(m => <DuelCard key={m.id} m={m} players={players} now={now} />)}
                            </ul>
                        ) : (
                            <p className="text-gray-400 text-sm">Pairing players…</p>
                        )}
                    </div>
                    {(waiting.length > 0 || away.length > 0) && (
                        <div className="rounded-3xl bg-white/5 border border-white/10 p-4 text-sm text-gray-300 space-y-1">
                            {waiting.length > 0 && <p><Hourglass size={14} className="inline mr-1.5" />Finding rivals for: <b className="text-white">{waiting.map(p => p.name).join(', ')}</b></p>}
                            {away.length > 0 && <p className="text-gray-400"><WifiOff size={14} className="inline mr-1.5" />Offline: {away.map(p => p.name).join(', ')}</p>}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

// ---------- RESULTS ----------

const Results = ({ meta, players, stats, questions, onExit, onPlayAgain }) => {
    const [starting, setStarting] = useState(false);
    const { performance } = useTheme();
    const ranked = rankPlayers(players);
    const podium = [ranked[1], ranked[0], ranked[2]];
    const heights = ['h-28', 'h-40', 'h-20'];
    const order = [1, 0, 2];

    useEffect(() => {
        audio.sfx('podium');
        if (!performance.particles || !ranked.length) return;
        import('canvas-confetti').then(({ default: confetti }) => {
            confetti({ particleCount: 140, spread: 90, origin: { y: 0.35 }, disableForReducedMotion: true });
        }).catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const report = Object.entries(stats || {})
        .map(([index, st]) => ({ q: questions[Number(index)], ...st }))
        .filter(r => r.q && r.asked > 0)
        .map(r => ({ ...r, accuracy: Math.round((r.correct / r.asked) * 100) }))
        .sort((x, y) => x.accuracy - y.accuracy || y.asked - x.asked)
        .slice(0, 6);

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
            <h1 className="text-center text-3xl sm:text-5xl font-black">Game over!</h1>
            <p className="text-center text-gray-400 mt-2">{meta.setTitle}</p>
            {meta.endReason === 'host-offline' && (
                <p className="text-center text-amber-300 text-sm font-semibold mt-2">The game ended because this screen was offline for too long.</p>
            )}

            {ranked.length > 0 && (
                <div className="mt-8 flex items-end justify-center gap-2 sm:gap-4">
                    {podium.map((p, i) => p ? (
                        <motion.div
                            key={p.id}
                            initial={{ y: 40, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 + i * 0.25 }}
                            className="flex flex-col items-center w-28 sm:w-40"
                        >
                            {order[i] === 0 && <Crown size={32} className="text-amber-300 mb-1" />}
                            <span className="font-black text-center truncate max-w-full">{p.name}</span>
                            <span className="text-sm text-gray-400 mb-2 tabular-nums">{p.score} pts</span>
                            <div className={`w-full ${heights[i]} rounded-t-2xl flex items-start justify-center pt-2 text-3xl font-black text-gray-900`} style={{ background: MEDALS[order[i]] }}>
                                {order[i] + 1}
                            </div>
                        </motion.div>
                    ) : <div key={i} className="w-28 sm:w-40" />)}
                </div>
            )}

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="rounded-3xl bg-white/5 border border-white/10 p-5">
                    <h2 className="text-lg font-black mb-3 flex items-center gap-2"><Trophy size={18} className="text-amber-300" /> Final ranking</h2>
                    <ol className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                        {ranked.map((p, i) => (
                            <li key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5">
                                <span className="w-6 text-center font-black text-gray-400 tabular-nums">{i + 1}</span>
                                <span className="flex-1 min-w-0 font-bold truncate">{p.name}</span>
                                <span className="text-xs text-gray-400 tabular-nums">{p.answered ? `${Math.round(((p.correct || 0) / p.answered) * 100)}%` : ''}</span>
                                <span className="font-black tabular-nums w-12 text-right">{p.score}</span>
                            </li>
                        ))}
                        {!ranked.length && <li className="text-gray-400 text-sm">Nobody played.</li>}
                    </ol>
                </section>

                <section className="rounded-3xl bg-white/5 border border-white/10 p-5">
                    <h2 className="text-lg font-black mb-1 flex items-center gap-2"><BookOpen size={18} className="text-sky-300" /> Class report</h2>
                    <p className="text-xs text-gray-400 mb-3">Questions the class found hardest. Worth reviewing together.</p>
                    {report.length ? (
                        <ul className="space-y-3">
                            {report.map((r, i) => (
                                <li key={i}>
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm font-semibold min-w-0 break-words">{r.q.prompt}</p>
                                        <span className={`text-sm font-black tabular-nums shrink-0 ${r.accuracy < 50 ? 'text-red-300' : 'text-emerald-300'}`}>{r.accuracy}%</span>
                                    </div>
                                    <p className="text-xs text-emerald-300/80 mt-0.5 break-words">✓ {answerLabel(r.q)}</p>
                                    <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                        <div className="h-full bg-emerald-400" style={{ width: `${r.accuracy}%` }} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-gray-400">No answers recorded.</p>}
                </section>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-2">
                <button
                    onClick={async () => {
                        setStarting(true);
                        try {
                            await onPlayAgain();
                        } catch {
                            setStarting(false);
                        }
                    }}
                    disabled={starting}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-gray-950 font-black transition-colors"
                >
                    <RotateCcw size={18} /> {starting ? 'Opening a new room…' : 'Play again'}
                </button>
                {meta.setId && (
                    <Link to={`/host/${meta.setId}?game=comet-clash`} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 font-bold transition-colors">
                        Change settings
                    </Link>
                )}
                <button onClick={onExit} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 font-bold transition-colors">
                    <Home size={18} /> Back to Orbit
                </button>
            </div>
        </div>
    );
};

// ---------- ROOT ----------

const HostScreen = ({ code, onExit }) => {
    const navigate = useNavigate();
    const { rt, error } = useRealtime();
    const tabId = getTabId();
    const meta = useRoomValue(rt, roomPath(code, 'meta'));
    const players = useRoomValue(rt, roomPath(code, 'players')) || {};
    const matches = useRoomValue(rt, roomPath(code, 'matches')) || {};
    const stats = useRoomValue(rt, roomPath(code, 'stats')) || {};
    const hostNode = useRoomValue(rt, roomPath(code, 'host'));
    const mode = meta ? (meta.settings?.mode === 'shower' ? 'shower' : 'duel') : null;
    const shower = useRoomValue(rt, mode === 'shower' ? roomPath(code, 'shower') : null);
    const offlineForRef = useRef(0);
    const now = useServerNow(rt, 500);

    const [claim, setClaim] = useState('checking'); // checking | mine | other
    const [questions, setQuestions] = useState([]);
    const [kickTarget, setKickTarget] = useState(null);
    const [confirmEnd, setConfirmEnd] = useState(false);
    const controllerRef = useRef(null);
    const [controllerReady, setControllerReady] = useState(false);
    const playerCount = rankPlayers(players).length;
    const lastCount = useRef(playerCount);

    // One host tab drives the game; a second tab asks before taking over
    useEffect(() => {
        if (!rt) return undefined;
        let cancelled = false;
        (async () => {
            const host = await rt.get(roomPath(code, 'host'));
            if (cancelled) return;
            // How long no host screen was running (tab closed, crash): the controller decides what to do with it
            offlineForRef.current = host?.lastSeen && !isOnline(host, rt.now()) ? Math.max(0, rt.now() - host.lastSeen) : 0;
            const busyElsewhere = host?.tab && host.tab !== tabId && isOnline(host, rt.now());
            if (busyElsewhere) setClaim('other');
            else {
                await rt.update(roomPath(code, 'host'), { tab: tabId });
                setClaim('mine');
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [rt, code, tabId]);

    // Another tab took over
    useEffect(() => {
        if (claim === 'mine' && hostNode?.tab && hostNode.tab !== tabId) setClaim('other');
    }, [claim, hostNode, tabId]);

    useEffect(() => {
        if (!rt || claim !== 'mine' || !mode) return undefined;
        const Controller = mode === 'shower' ? MeteorShowerHost : CometClashHost;
        const controller = new Controller(rt, code);
        controllerRef.current = controller;
        controller.start({ offlineFor: offlineForRef.current });
        offlineForRef.current = 0;
        setControllerReady(true);
        const detach = attachPresence(rt, roomPath(code, 'host'), { beatWhenHidden: true });
        rt.get(roomPath(code, 'set')).then(set => {
            const raw = Array.isArray(set?.questions) ? set.questions : Object.values(set?.questions || {});
            setQuestions(raw.map(normalizeQuestion).filter(Boolean));
        });
        return () => {
            controller.stop();
            detach();
            controllerRef.current = null;
            setControllerReady(false);
        };
    }, [rt, claim, code, mode]);

    // Music follows the game phase
    const status = meta?.status;
    useEffect(() => {
        if (status === 'lobby') audio.playMusic('lobby');
        else if (status === 'live') audio.playMusic('battle');
        else if (status === 'ended') audio.playMusic('lobby');
        return undefined;
    }, [status]);
    useEffect(() => () => audio.stopMusic(), []);

    // A little "pop" when someone joins the lobby
    useEffect(() => {
        if (status === 'lobby' && playerCount > lastCount.current) audio.sfx('join');
        lastCount.current = playerCount;
    }, [playerCount, status]);

    if (error) {
        return <div className="app-height flex items-center justify-center text-white" style={SPACE_BG}><p>Could not connect: {String(error.message || error)}</p></div>;
    }
    if (!rt || meta === undefined || claim === 'checking') {
        return <div className="app-height flex items-center justify-center" style={SPACE_BG}><Spinner size={36} className="text-emerald-400" /></div>;
    }
    if (!meta) {
        return <div className="app-height flex items-center justify-center text-white" style={SPACE_BG}><p>This room no longer exists.</p></div>;
    }

    if (claim === 'other') {
        return (
            <div className="app-height flex items-center justify-center px-4 text-white" style={SPACE_BG}>
                <div className="max-w-sm text-center">
                    <Monitor size={40} className="mx-auto mb-4 text-sky-300" />
                    <h1 className="text-2xl font-black">This game is open in another tab</h1>
                    <p className="text-gray-400 mt-2">Only one screen can run the game at a time.</p>
                    <button
                        onClick={async () => {
                            await rt.update(roomPath(code, 'host'), { tab: tabId, connected: true, lastSeen: rt.now() });
                            setClaim('mine');
                        }}
                        className="mt-6 w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black transition-colors"
                    >
                        Run the game here
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="app-height w-full overflow-y-auto overflow-x-hidden text-white" style={SPACE_BG} onPointerDown={() => audio.unlock()}>
            <header className="flex items-center justify-between gap-3 px-4 sm:px-6 pt-4">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Comet Clash{mode === 'shower' ? ' · Meteor Shower' : ''}</span>
                    <span className="text-gray-500 hidden sm:inline">·</span>
                    <span className="text-sm text-gray-400 truncate hidden sm:inline">{meta.setTitle}</span>
                </div>
                {meta.status !== 'ended' && (
                    <button onClick={() => setConfirmEnd(true)} className="text-sm font-semibold text-gray-400 hover:text-white">Close room</button>
                )}
            </header>

            {meta.status === 'lobby' && (
                <Lobby
                    code={code}
                    meta={meta}
                    players={players}
                    onStart={() => { audio.unlock(); controllerRef.current?.startGame(); }}
                    onKick={setKickTarget}
                    onLock={(locked) => setRoomLocked(code, locked)}
                />
            )}
            {meta.status === 'live' && mode === 'shower' && (
                <ShowerLive
                    code={code}
                    meta={meta}
                    players={players}
                    shower={shower}
                    now={now}
                    onEnd={() => setConfirmEnd(true)}
                    onLock={(locked) => setRoomLocked(code, locked)}
                    soundToggle={<SoundToggle />}
                />
            )}
            {meta.status === 'live' && mode !== 'shower' && (
                <Live
                    code={code}
                    meta={meta}
                    players={players}
                    matches={matches}
                    now={now}
                    onEnd={() => setConfirmEnd(true)}
                    onAddTime={() => controllerRef.current?.addTime(60)}
                    onLock={(locked) => setRoomLocked(code, locked)}
                />
            )}
            {meta.status === 'ended' && (
                <Results
                    meta={meta}
                    players={players}
                    stats={stats}
                    questions={questions}
                    onExit={onExit}
                    onPlayAgain={async () => {
                        const next = await playAgain(code);
                        navigate(`/room/${next}`);
                    }}
                />
            )}

            {meta.status === 'live' && !controllerReady && (
                <div className="fixed bottom-4 inset-x-0 flex justify-center px-4">
                    <p className="px-4 py-2 rounded-full bg-amber-400 text-gray-950 text-sm font-bold flex items-center gap-2"><AlertTriangle size={16} /> Reconnecting…</p>
                </div>
            )}

            <ConfirmDialog
                open={!!kickTarget}
                title={`Remove ${kickTarget?.name}?`}
                message="They will be removed from this game and can't rejoin with the same device."
                confirmLabel="Remove"
                danger
                onConfirm={() => { kickPlayer(code, kickTarget.id); setKickTarget(null); }}
                onCancel={() => setKickTarget(null)}
            />
            <ConfirmDialog
                open={confirmEnd}
                title={meta.status === 'lobby' ? 'Close this room?' : 'End the game now?'}
                message={meta.status === 'lobby' ? 'Students will not be able to join anymore.' : mode === 'shower' ? 'The remaining questions are skipped and the podium is shown.' : 'Unfinished duels end without a bonus and the podium is shown.'}
                confirmLabel={meta.status === 'lobby' ? 'Close room' : 'End game'}
                danger
                onConfirm={async () => {
                    setConfirmEnd(false);
                    if (meta.status === 'lobby') {
                        await rt.update(roomPath(code, 'meta'), { status: 'ended', endedAt: rt.now() });
                        onExit();
                    } else {
                        controllerRef.current?.endNow();
                    }
                }}
                onCancel={() => setConfirmEnd(false)}
            />
        </div>
    );
};

export default HostScreen;
