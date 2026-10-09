import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Users, Lock, Unlock, Play, Timer, Plus, Square, Crown, BookOpen, RotateCcw, Home, AlertTriangle, Monitor,
    Hourglass, Rocket, Wind, Sparkles, ChevronUp, Zap, Flame, Mountain
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
import { ClimbHost } from './hostLogic';
import { TowerView, safeColor } from './view';
import { makeWorld, stormAt, decodeClimber, zoneAt, ZONES, FLAG } from './world';

const MEDALS = ['#fbbf24', '#cbd5e1', '#f59e0b'];

// ---------- LOBBY ----------

const Lobby = ({ code, meta, players, onStart, onKick, onLock }) => {
    const t = useT();
    const joinUrl = `${window.location.origin}/play/${code}`;
    const shortUrl = `${window.location.host}/join`;
    const s = meta.settings || {};
    const list = rankPlayers(players);

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
                    <Pill><Timer size={14} /> {t('units.minutes', { n: Math.round((s.duration || 0) / 60) })}</Pill>
                    <Pill><Wind size={14} /> {t(`gs.climb.storm.options.${s.storm || 'normal'}`)}</Pill>
                    {s.hazards !== false && <Pill><Mountain size={14} /> {t('climb.hazardsOn')}</Pill>}
                </div>
            </section>

            <section className="rounded-3xl bg-white/5 border border-white/10 p-5 sm:p-6 flex flex-col min-h-[20rem]">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h2 className="text-2xl font-black flex items-center gap-2"><Users size={24} /> {t('common.players', { count: list.length })}</h2>
                    <div className="flex gap-2">
                        <HostButton onClick={() => onLock(!meta.locked)} title={meta.locked ? t('hostGame.unlock') : t('hostGame.lock')}>
                            {meta.locked ? <Lock size={18} /> : <Unlock size={18} />}
                        </HostButton>
                        <SoundToggle />
                    </div>
                </div>

                {list.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                        <Hourglass size={36} className="mb-3 opacity-60" />
                        <p className="font-semibold">{t('hostGame.waiting')}</p>
                    </div>
                ) : (
                    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 content-start">
                        {list.map(p => (
                            <motion.li key={p.id} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                                <button
                                    onClick={() => onKick(p)}
                                    title={t('hostGame.removeName', { name: p.name })}
                                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-2xl bg-white/[0.06] hover:bg-red-500/25 text-sm font-bold transition-colors text-left"
                                >
                                    <Rocket size={20} style={{ color: safeColor(p.color) }} />
                                    <span className="truncate">{p.name}</span>
                                </button>
                            </motion.li>
                        ))}
                    </ul>
                )}

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-sm text-gray-400">{t('climb.lobbyHint')}</p>
                    <HostButton variant="primary" onClick={onStart} disabled={list.length < 1}>
                        <Play size={20} className="fill-current" /> {t('hostGame.start')}
                    </HostButton>
                </div>
            </section>
        </div>
    );
};

// ---------- LIVE ----------

const FeedLine = ({ f }) => {
    const t = useT();
    if (f.kind === 'zone') return <b style={{ color: ZONES[f.zone]?.tint }}>{t('climb.feedZone', { name: f.name, zone: t(`games.climb.zones.${ZONES[f.zone].key}`) })}</b>;
    if (f.kind === 'caught') return <span className="text-fuchsia-300">{t('climb.feedCaught', { name: f.name })}</span>;
    if (f.kind === 'streak') return <span className="text-amber-200">{t('climb.feedStreak', { name: f.name, n: f.streak })}</span>;
    if (f.kind === 'lead') return <b className="text-yellow-300">{t('climb.feedLead', { name: f.name, n: Math.round(f.alt) })}</b>;
    return null;
};

const Live = ({ rt, code, meta, players, now, subscribe, onEnd, onAddTime, onLock }) => {
    const t = useT();
    const { performance } = useTheme();
    const canvasRef = useRef(null);
    const viewRef = useRef(null);
    const lastSound = useRef({});
    const [feed, setFeed] = useState([]);
    const [banner, setBanner] = useState(null);
    const settings = meta.settings || {};
    const ranking = rankPlayers(players).map(p => ({ ...p, alt: p.alt || 0 })).sort((a, b) => b.alt - a.alt);
    const leader = ranking[0]?.alt > 0 ? ranking[0] : null;
    const remaining = meta.endsAt - now;
    const data = useRef({});
    data.current = { players, leader: leader?.id || null };

    useEffect(() => {
        const world = makeWorld(meta.seed, settings);
        const view = new TowerView(canvasRef.current, { lowFx: !performance.particles || performance.reducedMotion });
        viewRef.current = view;
        const zoneNames = ZONES.map(z => t(`games.climb.zones.${z.key}`));
        let raw = {};
        view.setDriver(() => {
            const at = rt.now();
            const tau = (at - meta.startedAt) / 1000;
            const climbers = [];
            let top = 60;
            for (const [pid, p] of Object.entries(data.current.players || {})) {
                if (!p || p.kicked || !p.name) continue;
                const snap = decodeClimber(raw[pid]);
                const alt = snap ? Math.max(0, snap.y) : p.alt || 0;
                top = Math.max(top, Math.max(alt, p.alt || 0));
                climbers.push({
                    id: pid,
                    name: p.name,
                    color: p.color,
                    alt,
                    boost: !!(snap?.f & FLAG.boost),
                    leader: pid === data.current.leader
                });
            }
            climbers.sort((a, b) => a.alt - b.alt);
            return { top, storm: stormAt(world, tau), climbers, zoneNames };
        });
        const off = rt.onValue(roomPath(code, 'climbers'), v => { raw = v || {}; });
        view.mount();
        const observer = new ResizeObserver(() => view.resize());
        observer.observe(canvasRef.current);
        return () => {
            off();
            observer.disconnect();
            view.destroy();
            viewRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // A whole class makes a lot of noise: keep each sound to a few per second
    const play = (name, gap = 300) => {
        const at = Date.now();
        if (at - (lastSound.current[name] || 0) < gap) return;
        lastSound.current[name] = at;
        audio.sfx(name);
    };
    const log = (entry) => setFeed(list => [{ id: `${Date.now()}${Math.random()}`, ...entry }, ...list].slice(0, 8));
    const announce = (text, tone) => {
        const id = Date.now();
        setBanner({ id, text, tone });
        setTimeout(() => setBanner(b => (b?.id === id ? null : b)), 3000);
    };

    useEffect(() => subscribe((e) => {
        if (e.type === 'zone') {
            play('zoneUp', 200);
            log({ kind: 'zone', name: e.name, zone: e.zone });
            if (e.zone >= 4) announce(t('climb.bannerZone', { name: e.name, zone: t(`games.climb.zones.${ZONES[e.zone].key}`) }), 'good');
        } else if (e.type === 'caught') {
            play('caught', 400);
            log({ kind: 'caught', name: e.name });
        } else if (e.type === 'streak') {
            log({ kind: 'streak', name: e.name, streak: e.streak });
        }
    }), [subscribe]); // eslint-disable-line react-hooks/exhaustive-deps

    // Someone new taking the lead is worth a shout
    const ledBy = useRef(null);
    useEffect(() => {
        if (!leader || leader.id === ledBy.current) return;
        const first = ledBy.current === null;
        ledBy.current = leader.id;
        if (first || leader.alt < 15) return;
        play('zoneUp', 0);
        log({ kind: 'lead', name: leader.name, alt: leader.alt });
    }, [leader?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const bannerTone = { good: 'bg-emerald-500 text-gray-950', gold: 'bg-yellow-300 text-gray-950', bad: 'bg-fuchsia-500 text-white' };

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
                <div className="relative rounded-3xl overflow-hidden border border-white/10 aspect-[3/4] sm:aspect-video lg:aspect-auto lg:min-h-0">
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
                    <AnimatePresence>
                        {banner && (
                            <motion.div
                                key={banner.id}
                                initial={{ y: -30, opacity: 0, scale: 0.9 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                className="absolute top-4 inset-x-0 flex justify-center px-4 pointer-events-none"
                            >
                                <p className={`px-5 py-2.5 rounded-2xl text-lg sm:text-2xl font-black shadow-2xl text-center ${bannerTone[banner.tone]}`}>{banner.text}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <aside className="flex flex-col gap-3 min-h-0 lg:overflow-y-auto">
                    <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
                        <h2 className="text-lg font-black flex items-center gap-2 mb-2"><ChevronUp size={18} className="text-emerald-300" /> {t('climb.leaderboard')}</h2>
                        <ol className="space-y-1">
                            {ranking.slice(0, 8).map((p, i) => (
                                <motion.li layout key={p.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-2.5 py-1.5">
                                    <span className="w-5 text-center font-black tabular-nums" style={{ color: MEDALS[i] || '#94a3b8' }}>{i + 1}</span>
                                    <Rocket size={16} style={{ color: safeColor(p.color) }} />
                                    <span className="flex-1 min-w-0 font-bold truncate">{p.name}</span>
                                    {p.id === leader?.id && <Crown size={14} className="text-yellow-300 shrink-0" />}
                                    <span className="text-[11px] font-bold" style={{ color: ZONES[zoneAt(p.alt)]?.tint }}>{t(`games.climb.zones.${ZONES[zoneAt(p.alt)].key}`)}</span>
                                    <span className="font-black tabular-nums text-emerald-300 min-w-[3.2rem] text-right">{Math.round(p.alt)} m</span>
                                </motion.li>
                            ))}
                        </ol>
                        {ranking.length > 8 && <p className="text-xs text-gray-500 mt-1.5 text-center">{t('climb.moreClimbers', { count: ranking.length - 8 })}</p>}
                    </section>

                    <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
                        <h2 className="text-lg font-black flex items-center gap-2 mb-2"><Sparkles size={18} className="text-amber-300" /> {t('climb.feed')}</h2>
                        {feed.length ? (
                            <ul className="space-y-1.5 text-sm">
                                {feed.map(f => (
                                    <motion.li key={f.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="min-w-0 break-words">
                                        <FeedLine f={f} />
                                    </motion.li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-gray-400">{t('climb.feedEmpty')}</p>}
                    </section>

                    {/* How to play, for the class watching the big screen */}
                    <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
                        <h2 className="text-lg font-black flex items-center gap-2 mb-2"><BookOpen size={18} className="text-sky-300" /> {t('climb.legend')}</h2>
                        <ul className="space-y-1.5 text-sm text-gray-300">
                            <li className="flex items-start gap-2"><ChevronUp size={16} className="shrink-0 mt-0.5 text-sky-300" />{t('climb.legendClimb')}</li>
                            <li className="flex items-start gap-2"><Zap size={16} className="shrink-0 mt-0.5 text-yellow-300" />{t('climb.legendFuel')}</li>
                            {settings.storm !== 'off' && <li className="flex items-start gap-2"><Wind size={16} className="shrink-0 mt-0.5 text-fuchsia-300" />{t('climb.legendStorm')}</li>}
                            {settings.hazards !== false && <li className="flex items-start gap-2"><Mountain size={16} className="shrink-0 mt-0.5 text-stone-300" />{t('climb.legendHazards')}</li>}
                            {settings.powerUps !== false && <li className="flex items-start gap-2"><Sparkles size={16} className="shrink-0 mt-0.5 text-emerald-300" />{t('climb.legendPickups')}</li>}
                            <li className="flex items-start gap-2"><Flame size={16} className="shrink-0 mt-0.5 text-amber-300" />{t('climb.legendScore')}</li>
                        </ul>
                    </section>
                </aside>
            </div>
        </div>
    );
};

// ---------- RESULTS ----------

const Results = ({ meta, players, stats, questions, onExit, onPlayAgain }) => {
    const t = useT();
    const [starting, setStarting] = useState(false);
    const { performance } = useTheme();
    const ranking = rankPlayers(players).map(p => ({ ...p, alt: p.alt || 0 })).sort((a, b) => b.alt - a.alt);
    const podium = ranking.slice(0, 3);
    const top = Math.max(1, ranking[0]?.alt || 1);
    const steady = ranking.reduce((best, p) => ((p.falls || 0) < ((best?.falls ?? 99)) && p.alt > 20 ? p : best), null);
    const sharp = ranking.reduce((best, p) => ((p.correct || 0) > (best?.correct || 0) ? p : best), null);

    useEffect(() => {
        audio.sfx('podium');
        if (!performance.particles || !podium.length) return;
        import('canvas-confetti').then(({ default: confetti }) => {
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.35 }, colors: [safeColor(podium[0].color), '#ffffff', '#fde047'], disableForReducedMotion: true });
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
            <h1 className="text-center text-3xl sm:text-5xl font-black">
                {podium[0] ? t('climb.winner', { name: podium[0].name, n: Math.round(podium[0].alt) }) : t('hostGame.nobody')}
            </h1>
            <p className="text-center text-gray-400 mt-2">{meta.setTitle}</p>
            {meta.endReason === 'host-offline' && <p className="text-center text-amber-300 text-sm font-semibold mt-2">{t('hostGame.endedOffline')}</p>}

            <ol className="mt-8 space-y-2.5 max-w-2xl mx-auto">
                {ranking.slice(0, 10).map((p, i) => (
                    <motion.li key={p.id} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 + i * 0.08 }} className="flex items-center gap-3">
                        <span className="w-7 text-center text-xl font-black" style={{ color: MEDALS[i] || '#94a3b8' }}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-black flex items-center gap-2 truncate">
                                    <Rocket size={16} style={{ color: safeColor(p.color) }} /> {p.name}
                                    <span className="text-xs font-bold" style={{ color: ZONES[zoneAt(p.alt)]?.tint }}>{t(`games.climb.zones.${ZONES[zoneAt(p.alt)].key}`)}</span>
                                </span>
                                <span className="font-black tabular-nums text-lg">{Math.round(p.alt)} m</span>
                            </div>
                            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${(p.alt / top) * 100}%` }} transition={{ delay: 0.25 + i * 0.08, duration: 0.8 }} className="h-full rounded-full" style={{ background: safeColor(p.color) }} />
                            </div>
                        </div>
                    </motion.li>
                ))}
            </ol>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="rounded-3xl bg-white/5 border border-white/10 p-5">
                    <h2 className="text-lg font-black mb-3 flex items-center gap-2"><Crown size={18} className="text-amber-300" /> {t('climb.awards')}</h2>
                    <ul className="space-y-2">
                        {sharp?.correct > 0 && (
                            <li className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
                                <span className="w-10 h-10 shrink-0 rounded-xl bg-yellow-400/15 text-yellow-300 flex items-center justify-center"><Zap size={20} /></span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('climb.awardSharp')}</p>
                                    <p className="font-black truncate">{sharp.name}</p>
                                </div>
                                <span className="font-black tabular-nums text-yellow-300">{sharp.correct}</span>
                            </li>
                        )}
                        {steady && (
                            <li className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
                                <span className="w-10 h-10 shrink-0 rounded-xl bg-sky-400/15 text-sky-300 flex items-center justify-center"><Rocket size={20} /></span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('climb.awardSteady')}</p>
                                    <p className="font-black truncate">{steady.name}</p>
                                </div>
                                <span className="font-black tabular-nums text-sky-300">{t('climb.fallsStat', { count: steady.falls || 0 })}</span>
                            </li>
                        )}
                    </ul>
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
                    <Link to={`/host/${meta.setId}?game=moonshot`} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 font-bold transition-colors">
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

    const subscribe = useRef((fn) => {
        listeners.current.add(fn);
        return () => listeners.current.delete(fn);
    }).current;

    useEffect(() => {
        if (!rt || claim !== 'mine') return undefined;
        const controller = new ClimbHost(rt, code, { onEvent: (e) => listeners.current.forEach(fn => fn(e)) });
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
        if (status === 'lobby' || status === 'ended') audio.playMusic('corsairLobby');
        else if (status === 'live') audio.playMusic('moonshot', { quantize: true });
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
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">{gameName(t, getGame('moonshot'))}</span>
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
                    onStart={() => { audio.unlock(); controllerRef.current?.startGame(); }}
                    onKick={setKickTarget}
                    onLock={(locked) => setRoomLocked(code, locked)}
                />
            )}
            {meta.status === 'live' && meta.seed && (
                <Live
                    rt={rt}
                    code={code}
                    meta={meta}
                    players={players}
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
                message={meta.status === 'lobby' ? t('hostGame.closeText') : t('climb.endText')}
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
