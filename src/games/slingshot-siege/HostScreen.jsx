import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Users, Lock, Unlock, Play, Timer, Plus, Square, Trophy, Crown, BookOpen, RotateCcw, Home,
    AlertTriangle, Monitor, Hourglass, Shuffle, Shield, Rocket, Sun, Orbit as OrbitIcon
} from 'lucide-react';
import QRCode from '../../components/ui/QRCode';
import { ConfirmDialog, Spinner } from '../../components/ui';
import { SPACE_BG } from '../../components/SpaceScreen';
import { useRealtime, useRoomValue, useServerNow, formatClock, rankPlayers } from '../../platform/rooms/hooks';
import { roomPath, attachPresence, setRoomLocked, kickPlayer, playAgain } from '../../platform/rooms/rooms';
import { normalizeQuestion } from '../../platform/questions/normalize';
import { answerLabel } from '../../platform/questions/types';
import { audio } from '../../platform/audio/audio';
import { useTheme } from '../../context/ThemeContext';
import { useT } from '../../context/LanguageContext';
import Slots from '../../i18n/Slots';
import { gameName, getGame } from '../../platform/games/registry';
import { Pill, HostButton, SoundToggle, useHostClaim } from '../shared/liveUi';
import { SiegeHost } from './hostLogic';
import { ArenaView } from './arena';
import { planetPos } from './physics';
import { teamOf, clampTeams, rankTeams, teamMembers, MAX_SHIELD } from './teams';

const MEDALS = ['#fbbf24', '#cbd5e1', '#f59e0b'];

const TeamDot = ({ team, size = 12 }) => (
    <span className="inline-block rounded-full shrink-0" style={{ width: size, height: size, background: teamOf(team).color, boxShadow: `0 0 10px ${teamOf(team).color}88` }} />
);

// ---------- LOBBY ----------

const Lobby = ({ code, meta, players, now, onStart, onKick, onLock, onShuffle }) => {
    const t = useT();
    const joinUrl = `${window.location.origin}/play/${code}`;
    const shortUrl = `${window.location.host}/join`;
    const s = meta.settings || {};
    const count = clampTeams(s.teams);
    const teams = teamMembers(players, count, now);
    const total = rankPlayers(players).length;

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6">
            <section className="rounded-3xl bg-white/5 border border-white/10 p-6 text-center flex flex-col items-center">
                <p className="text-gray-400 font-semibold"><Slots text={t('hostGame.joinAt')} slots={{ url: <b className="text-white">{shortUrl}</b> }} /></p>
                <p className="mt-2 text-6xl sm:text-7xl font-black tracking-[0.12em] tabular-nums">{code.slice(0, 3)} {code.slice(3)}</p>
                <div className="mt-5 p-3 bg-white rounded-2xl">
                    <QRCode value={joinUrl} size={168} />
                </div>
                <p className="mt-3 text-xs text-gray-500">{t('hostGame.scan')}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <Pill><Users size={14} /> {t('siege.teamsCount', { count })}</Pill>
                    <Pill><Timer size={14} /> {t('units.minutes', { n: Math.round((s.duration || 0) / 60) })}</Pill>
                </div>
            </section>

            <section className="rounded-3xl bg-white/5 border border-white/10 p-5 sm:p-6 flex flex-col min-h-[20rem]">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h2 className="text-2xl font-black flex items-center gap-2"><Users size={24} /> {t('common.players', { count: total })}</h2>
                    <div className="flex gap-2">
                        <HostButton onClick={onShuffle} disabled={total < 2} title={t('siege.shuffle')}><Shuffle size={18} /> <span className="hidden sm:inline">{t('siege.shuffle')}</span></HostButton>
                        <HostButton onClick={() => onLock(!meta.locked)} title={meta.locked ? t('hostGame.unlock') : t('hostGame.lock')}>
                            {meta.locked ? <Lock size={18} /> : <Unlock size={18} />}
                        </HostButton>
                        <SoundToggle />
                    </div>
                </div>

                {total === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                        <Hourglass size={36} className="mb-3 opacity-60" />
                        <p className="font-semibold">{t('hostGame.waiting')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
                        {teams.map((list, i) => (
                            <div key={i} className="rounded-2xl bg-white/[0.04] border p-3" style={{ borderColor: `${teamOf(i).color}55` }}>
                                <p className="font-black flex items-center gap-2 mb-2"><TeamDot team={i} /> {teamOf(i).name} <span className="text-gray-500 text-sm">({list.length})</span></p>
                                {list.length ? (
                                    <ul className="flex flex-wrap gap-1.5">
                                        {list.map(p => (
                                            <motion.li key={p.id} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                                                <button
                                                    onClick={() => onKick(p)}
                                                    title={t('hostGame.removeName', { name: p.name })}
                                                    className={`px-2.5 py-1 rounded-full bg-white/10 hover:bg-red-500/25 text-sm font-bold transition-colors ${p.online ? '' : 'opacity-50'}`}
                                                >
                                                    {p.name}
                                                </button>
                                            </motion.li>
                                        ))}
                                    </ul>
                                ) : <p className="text-sm text-gray-500">{t('siege.empty')}</p>}
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-sm text-gray-400">{t('siege.autoTeams')}</p>
                    <HostButton variant="primary" onClick={onStart} disabled={total < 1}>
                        <Play size={20} className="fill-current" /> {t('hostGame.start')}
                    </HostButton>
                </div>
            </section>
        </div>
    );
};

// ---------- LIVE ----------

const Live = ({ code, meta, players, siege, now, subscribe, onEnd, onAddTime, onLock }) => {
    const t = useT();
    const { performance } = useTheme();
    const canvasRef = useRef(null);
    const viewRef = useRef(null);
    const lastSound = useRef({});
    const [feed, setFeed] = useState([]);
    const count = siege?.count || 2;
    const ranking = rankTeams(siege);
    const pilots = rankPlayers(players).slice(0, 5);
    const members = teamMembers(players, count, now);
    const remaining = meta.endsAt - now;

    useEffect(() => {
        const view = new ArenaView(canvasRef.current, { lowFx: !performance.particles || performance.reducedMotion });
        viewRef.current = view;
        view.mount();
        const observer = new ResizeObserver(() => view.resize());
        observer.observe(canvasRef.current);
        return () => {
            observer.disconnect();
            view.destroy();
            viewRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        viewRef.current?.setState(count, siege?.teams);
    }, [count, siege]);

    // Many students launch at once: keep each sound to a few per second
    const play = (name, gap = 200) => {
        const at = Date.now();
        if (at - (lastSound.current[name] || 0) < gap) return;
        lastSound.current[name] = at;
        audio.sfx(name);
    };

    useEffect(() => subscribe((e) => {
        const view = viewRef.current;
        if (e.type === 'launch') {
            view?.addComet({ team: e.team, flight: e.flight });
            play('launch', 250);
        } else if (e.type === 'land') {
            const { flight } = e;
            if (e.hit) {
                const p = planetPos(flight.target, count);
                view?.floater(p.x, p.y - 70, e.sling ? `★ +${e.pts}` : `+${e.pts}`, e.sling ? '#fde047' : teamOf(e.team).color, e.sling ? 1.3 : 1);
                play(e.sling ? 'slingshot' : 'impact', e.sling ? 0 : 150);
                if (e.opened) play('shieldDown', 0);
            } else if (flight.end === 'sun') {
                play('burn', 300);
            }
            const entry = { id: e.id, name: e.name, team: e.team, target: e.hit ? flight.target : null, end: flight.end, pts: e.pts, sling: e.sling, opened: e.opened };
            setFeed(list => [entry, ...list].slice(0, 7));
        }
    }), [subscribe, count]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-3 flex flex-col gap-3 lg:h-[calc(100dvh-3rem)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className={`text-4xl sm:text-5xl font-black tabular-nums ${remaining < 30000 ? 'text-amber-300' : ''}`}>{formatClock(remaining)}</span>
                    <span className="text-gray-400 text-sm font-semibold leading-tight">{t('hostGame.left')}<br /><Slots text={t('hostGame.joinCode')} slots={{ code: <b className="text-white tabular-nums">{code}</b> }} /></span>
                </div>
                <div className="flex flex-wrap gap-2">
                    <HostButton onClick={onAddTime} title={t('hostGame.addMinute')}><Plus size={16} /> {t('units.minutes', { n: 1 })}</HostButton>
                    <HostButton onClick={() => onLock(!meta.locked)} title={meta.locked ? t('hostGame.unlock') : t('hostGame.lock')}>
                        {meta.locked ? <Lock size={16} /> : <Unlock size={16} />}
                    </HostButton>
                    <SoundToggle />
                    <HostButton variant="danger" onClick={onEnd}><Square size={16} /> {t('hostGame.end')}</HostButton>
                </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_21rem] gap-3">
                <div className="relative rounded-3xl overflow-hidden border border-white/10 aspect-square lg:aspect-auto lg:min-h-0">
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
                </div>

                <aside className="flex flex-col gap-3 min-h-0 lg:overflow-y-auto">
                    <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
                        <h2 className="text-lg font-black flex items-center gap-2 mb-2"><Trophy size={18} className="text-amber-300" /> {t('siege.teams')}</h2>
                        <ol className="space-y-2">
                            {ranking.map((r, i) => (
                                <motion.li layout key={r.i} className="rounded-2xl bg-white/5 px-3 py-2">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-5 text-center font-black tabular-nums" style={{ color: MEDALS[i] || '#94a3b8' }}>{i + 1}</span>
                                        <TeamDot team={r.i} size={14} />
                                        <span className="flex-1 min-w-0 font-black truncate">{teamOf(r.i).name}</span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1"><Users size={12} />{members[r.i]?.length || 0}</span>
                                        <span className="font-black text-xl tabular-nums min-w-[3rem] text-right">{r.score}</span>
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-2">
                                        <Shield size={12} className={r.shield > 0 ? 'text-sky-300' : 'text-rose-400'} />
                                        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(r.shield / MAX_SHIELD) * 100}%`, background: teamOf(r.i).color }} />
                                        </div>
                                        <span className={`text-[11px] font-bold tabular-nums w-9 text-right ${r.shield > 0 ? 'text-gray-400' : 'text-rose-300'}`}>{r.shield}%</span>
                                    </div>
                                </motion.li>
                            ))}
                        </ol>
                    </section>

                    <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
                        <h2 className="text-lg font-black flex items-center gap-2 mb-2"><Rocket size={18} className="text-emerald-300" /> {t('siege.feed')}</h2>
                        {feed.length ? (
                            <ul className="space-y-1.5 text-sm">
                                {feed.map(f => (
                                    <motion.li key={f.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2">
                                        {f.target !== null ? <OrbitIcon size={14} className="mt-0.5 shrink-0" style={{ color: teamOf(f.team).color }} /> : <Sun size={14} className="mt-0.5 shrink-0 text-orange-300" />}
                                        <span className="min-w-0 break-words">
                                            {f.target !== null
                                                ? t(f.sling ? 'siege.feedSling' : 'siege.feedHit', { name: f.name, team: teamOf(f.target).name, n: f.pts })
                                                : f.end === 'sun' ? t('siege.feedSun', { name: f.name }) : t('siege.feedLost', { name: f.name })}
                                            {f.opened && <b className="block text-rose-300">{t('siege.shieldDown', { team: teamOf(f.target).name })}</b>}
                                        </span>
                                    </motion.li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-gray-400">{t('siege.feedEmpty')}</p>}
                    </section>

                    <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
                        <h2 className="text-lg font-black flex items-center gap-2 mb-2"><Crown size={18} className="text-amber-300" /> {t('siege.topPilots')}</h2>
                        <ol className="space-y-1">
                            {pilots.map((p, i) => (
                                <li key={p.id} className="flex items-center gap-2 text-sm">
                                    <span className="w-5 text-center font-black text-gray-400">{i + 1}</span>
                                    <TeamDot team={p.team} size={10} />
                                    <span className="flex-1 min-w-0 font-bold truncate">{p.name}</span>
                                    <span className="text-xs text-gray-400">{t('siege.hits', { count: p.hits || 0 })}</span>
                                    <span className="font-black tabular-nums w-10 text-right">{p.score}</span>
                                </li>
                            ))}
                        </ol>
                    </section>
                </aside>
            </div>
        </div>
    );
};

// ---------- RESULTS ----------

const Results = ({ meta, players, siege, stats, questions, onExit, onPlayAgain }) => {
    const t = useT();
    const [starting, setStarting] = useState(false);
    const { performance } = useTheme();
    const ranking = rankTeams(siege);
    const pilots = rankPlayers(players).slice(0, 5);
    const tie = ranking.length > 1 && ranking[0].score === ranking[1].score;
    const top = Math.max(1, ...ranking.map(r => r.score));

    useEffect(() => {
        audio.sfx('podium');
        if (!performance.particles || !ranking.length) return;
        import('canvas-confetti').then(({ default: confetti }) => {
            confetti({ particleCount: 140, spread: 90, origin: { y: 0.35 }, colors: [teamOf(ranking[0].i).color, '#ffffff', '#fde047'], disableForReducedMotion: true });
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
            <h1 className="text-center text-3xl sm:text-5xl font-black flex items-center justify-center gap-3">
                {!tie && ranking[0] && <TeamDot team={ranking[0].i} size={28} />}
                {tie || !ranking[0] ? t('siege.tie') : t('siege.winner', { team: teamOf(ranking[0].i).name })}
            </h1>
            <p className="text-center text-gray-400 mt-2">{meta.setTitle}</p>
            {meta.endReason === 'host-offline' && <p className="text-center text-amber-300 text-sm font-semibold mt-2">{t('hostGame.endedOffline')}</p>}

            <ol className="mt-8 space-y-2.5 max-w-2xl mx-auto">
                {ranking.map((r, i) => (
                    <motion.li key={r.i} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 + i * 0.15 }} className="flex items-center gap-3">
                        <span className="w-7 text-center text-xl font-black" style={{ color: MEDALS[i] || '#94a3b8' }}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-black flex items-center gap-2 truncate"><TeamDot team={r.i} /> {teamOf(r.i).name}</span>
                                <span className="font-black tabular-nums text-lg">{r.score}</span>
                            </div>
                            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${(r.score / top) * 100}%` }} transition={{ delay: 0.3 + i * 0.15, duration: 0.8 }} className="h-full rounded-full" style={{ background: teamOf(r.i).color }} />
                            </div>
                        </div>
                    </motion.li>
                ))}
            </ol>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="rounded-3xl bg-white/5 border border-white/10 p-5">
                    <h2 className="text-lg font-black mb-3 flex items-center gap-2"><Crown size={18} className="text-amber-300" /> {t('siege.topPilots')}</h2>
                    <ol className="space-y-1.5">
                        {pilots.map((p, i) => (
                            <li key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5">
                                <span className="w-6 text-center font-black tabular-nums" style={{ color: MEDALS[i] || '#94a3b8' }}>{i + 1}</span>
                                <TeamDot team={p.team} size={10} />
                                <span className="flex-1 min-w-0 font-bold truncate">{p.name}</span>
                                <span className="text-xs text-gray-400 tabular-nums">{t('siege.hits', { count: p.hits || 0 })}{p.slings ? ` · ★${p.slings}` : ''}</span>
                                <span className="font-black tabular-nums w-12 text-right">{p.score}</span>
                            </li>
                        ))}
                        {!pilots.length && <li className="text-gray-400 text-sm">{t('hostGame.nobody')}</li>}
                    </ol>
                </section>

                <section className="rounded-3xl bg-white/5 border border-white/10 p-5">
                    <h2 className="text-lg font-black mb-1 flex items-center gap-2"><BookOpen size={18} className="text-sky-300" /> {t('hostGame.report')}</h2>
                    <p className="text-xs text-gray-400 mb-3">{t('hostGame.reportText')}</p>
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
                    ) : <p className="text-sm text-gray-400">{t('hostGame.noAnswers')}</p>}
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
                    <RotateCcw size={18} /> {starting ? t('hostGame.opening') : t('hostGame.playAgain')}
                </button>
                {meta.setId && (
                    <Link to={`/host/${meta.setId}?game=slingshot-siege`} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 font-bold transition-colors">
                        {t('hostGame.changeSettings')}
                    </Link>
                )}
                <button onClick={onExit} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 font-bold transition-colors">
                    <Home size={18} /> {t('hostGame.backToOrbit')}
                </button>
            </div>
        </div>
    );
};

// ---------- ROOT ----------

const HostScreen = ({ code, onExit }) => {
    const navigate = useNavigate();
    const t = useT();
    const { rt, error } = useRealtime();
    const meta = useRoomValue(rt, roomPath(code, 'meta'));
    const players = useRoomValue(rt, roomPath(code, 'players')) || {};
    const siege = useRoomValue(rt, roomPath(code, 'siege'));
    const stats = useRoomValue(rt, roomPath(code, 'stats')) || {};
    const hostNode = useRoomValue(rt, roomPath(code, 'host'));
    const now = useServerNow(rt, 500);
    const { claim, takeOver, takeOfflineFor } = useHostClaim(rt, code, hostNode);

    const [questions, setQuestions] = useState([]);
    const [kickTarget, setKickTarget] = useState(null);
    const [confirmEnd, setConfirmEnd] = useState(false);
    const controllerRef = useRef(null);
    const listeners = useRef(new Set());
    const [controllerReady, setControllerReady] = useState(false);
    const playerCount = rankPlayers(players).length;
    const lastCount = useRef(playerCount);

    // The arena subscribes to launches and landings
    const subscribe = useRef((fn) => {
        listeners.current.add(fn);
        return () => listeners.current.delete(fn);
    }).current;

    useEffect(() => {
        if (!rt || claim !== 'mine') return undefined;
        const controller = new SiegeHost(rt, code, { onEvent: (e) => listeners.current.forEach(fn => fn(e)) });
        controllerRef.current = controller;
        controller.start({ offlineFor: takeOfflineFor() });
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
    }, [rt, claim, code]); // eslint-disable-line react-hooks/exhaustive-deps

    // Music follows the game phase
    const status = meta?.status;
    useEffect(() => {
        if (status === 'lobby' || status === 'ended') audio.playMusic('lobby');
        else if (status === 'live') audio.playMusic('siege');
    }, [status]);
    useEffect(() => () => audio.stopMusic(), []);

    // A little "pop" when someone joins the lobby
    useEffect(() => {
        if (status === 'lobby' && playerCount > lastCount.current) audio.sfx('join');
        lastCount.current = playerCount;
    }, [playerCount, status]);

    if (error) {
        return <div className="app-height flex items-center justify-center text-white" style={SPACE_BG}><p>{t('roomErrors.connection')}</p></div>;
    }
    if (!rt || meta === undefined || claim === 'checking') {
        return <div className="app-height flex items-center justify-center" style={SPACE_BG}><Spinner size={36} className="text-emerald-400" /></div>;
    }
    if (!meta) {
        return <div className="app-height flex items-center justify-center text-white" style={SPACE_BG}><p>{t('cc.noGame')}</p></div>;
    }

    if (claim === 'other') {
        return (
            <div className="app-height flex items-center justify-center px-4 text-white" style={SPACE_BG}>
                <div className="max-w-sm text-center">
                    <Monitor size={40} className="mx-auto mb-4 text-sky-300" />
                    <h1 className="text-2xl font-black">{t('hostGame.otherTab')}</h1>
                    <p className="text-gray-400 mt-2">{t('hostGame.otherTabText')}</p>
                    <button onClick={takeOver} className="mt-6 w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black transition-colors">
                        {t('hostGame.runHere')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="app-height w-full overflow-y-auto overflow-x-hidden text-white" style={SPACE_BG} onPointerDown={() => audio.unlock()}>
            <header className="flex items-center justify-between gap-3 px-4 sm:px-6 h-12">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">{gameName(t, getGame('slingshot-siege'))}</span>
                    <span className="text-gray-500 hidden sm:inline">·</span>
                    <span className="text-sm text-gray-400 truncate hidden sm:inline">{meta.setTitle}</span>
                </div>
                {meta.status !== 'ended' && (
                    <button onClick={() => setConfirmEnd(true)} className="text-sm font-semibold text-gray-400 hover:text-white">{t('hostGame.closeRoom')}</button>
                )}
            </header>

            {meta.status === 'lobby' && (
                <Lobby
                    code={code}
                    meta={meta}
                    players={players}
                    now={now}
                    onStart={() => { audio.unlock(); controllerRef.current?.startGame(); }}
                    onKick={setKickTarget}
                    onLock={(locked) => setRoomLocked(code, locked)}
                    onShuffle={() => controllerRef.current?.shuffleTeams()}
                />
            )}
            {meta.status === 'live' && (
                <Live
                    code={code}
                    meta={meta}
                    players={players}
                    siege={siege}
                    now={now}
                    subscribe={subscribe}
                    onEnd={() => setConfirmEnd(true)}
                    onAddTime={() => controllerRef.current?.addTime(60)}
                    onLock={(locked) => setRoomLocked(code, locked)}
                />
            )}
            {meta.status === 'ended' && (
                <Results
                    meta={meta}
                    players={players}
                    siege={siege}
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
                    <p className="px-4 py-2 rounded-full bg-amber-400 text-gray-950 text-sm font-bold flex items-center gap-2"><AlertTriangle size={16} /> {t('hostGame.reconnecting')}</p>
                </div>
            )}

            <ConfirmDialog
                open={!!kickTarget}
                title={t('hostGame.removeTitle', { name: kickTarget?.name })}
                message={t('hostGame.removeText')}
                confirmLabel={t('hostGame.remove')}
                danger
                onConfirm={() => { kickPlayer(code, kickTarget.id); setKickTarget(null); }}
                onCancel={() => setKickTarget(null)}
            />
            <ConfirmDialog
                open={confirmEnd}
                title={meta.status === 'lobby' ? t('hostGame.closeTitle') : t('hostGame.endTitle')}
                message={meta.status === 'lobby' ? t('hostGame.closeText') : t('siege.endText')}
                confirmLabel={meta.status === 'lobby' ? t('hostGame.closeRoom') : t('hostGame.endGame')}
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
