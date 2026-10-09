import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Users, Lock, Unlock, Play, Timer, Plus, Square, Crown, BookOpen, RotateCcw, Home, AlertTriangle, Monitor,
    Hourglass, Gem, Shield, Crosshair, Wrench, Magnet, Swords, HeartHandshake, Sparkles, Rocket, Hammer
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
import { CorsairHost } from './hostLogic';
import { SectorView, LASER_COLORS, safeColor } from './sector';
import { Fleet } from './fleet';
import ShipIcon from './ShipIcon';
import { RULES, MID, FLAG, leaderOf, rockPos, rockAlive, orbsAt, shieldOf, armorOf } from './rules';

const MEDALS = ['#fbbf24', '#cbd5e1', '#f59e0b'];
const UPGRADE_ICONS = { laser: Crosshair, armor: Shield, magnet: Magnet };

const Upgrades = ({ upg }) => (
    <span className="flex items-center gap-0.5 text-cyan-300">
        {Object.entries(upg || {}).filter(([, lv]) => lv > 0).map(([item, lv]) => {
            const Icon = UPGRADE_ICONS[item];
            return Icon ? <span key={item} className="flex items-center text-[10px] font-black"><Icon size={12} />{item === 'magnet' ? '' : lv + 1}</span> : null;
        })}
    </span>
);

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
                    <Pill>{s.raids === false ? <><HeartHandshake size={14} /> {t('corsair.peaceMode')}</> : <><Swords size={14} /> {t('corsair.freeForAll')}</>}</Pill>
                    {s.invasions !== false && <Pill><span aria-hidden="true">👾</span> {t('corsair.invasionsOn')}</Pill>}
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
                                    <ShipIcon design={p.ship || 0} color={p.color} size={30} />
                                    <span className="truncate">{p.name}</span>
                                </button>
                            </motion.li>
                        ))}
                    </ul>
                )}

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-sm text-gray-400">{t('corsair.lobbyHint')}</p>
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
    if (f.kind === 'down') {
        return (
            <>
                <b className={f.boss ? 'text-emerald-300' : 'text-yellow-300'}>{f.boss ? t('corsair.feedZapped', { victim: f.victim, n: f.spilled }) : t('corsair.feedBlasted', { name: f.name, victim: f.victim, n: f.spilled })}</b>
                {f.revenge && <b className="block text-orange-300">{t('corsair.feedRevenge')}</b>}
                {f.bounty && <b className="block text-amber-300">{t('corsair.bountyHit', { n: RULES.bounty })}</b>}
            </>
        );
    }
    if (f.kind === 'jackpot') return <b className="text-yellow-300">{t('corsair.feedJackpot', { name: f.name, n: f.n })}</b>;
    if (f.kind === 'rock') return <span>{t('corsair.feedRock', { name: f.name, n: f.n })}</span>;
    if (f.kind === 'buy') return <span className="text-cyan-200">{t('corsair.feedBuy', { name: f.name, item: t(`corsair.item_${f.item}`) })}</span>;
    if (f.kind === 'bossIn') return <b className="text-emerald-300">{t('corsair.bannerBossIn')}</b>;
    if (f.kind === 'bossDown') return <b className="text-emerald-300">{t('corsair.feedBossDown', { name: f.mvp || '—' })}</b>;
    if (f.kind === 'bossGone') return <b className="text-rose-300">{t('corsair.feedBossGone')}</b>;
    if (f.kind === 'gold') return <b className="text-yellow-300">{t('corsair.bannerGold')}</b>;
    return null;
};

const boltColor = (p) => (p?.upg?.laser ? LASER_COLORS[Math.min(2, p.upg.laser)] : safeColor(p?.color));

const Live = ({ rt, code, meta, players, corsair, now, subscribe, onEnd, onAddTime, onLock }) => {
    const t = useT();
    const { performance } = useTheme();
    // Performance mode also makes the music lighter
    useEffect(() => audio.setLite(!performance.particles || performance.reducedMotion), [performance.particles, performance.reducedMotion]);
    const canvasRef = useRef(null);
    const viewRef = useRef(null);
    const lastSound = useRef({});
    const flashes = useRef(new Map());
    const [feed, setFeed] = useState([]);
    const [banner, setBanner] = useState(null);
    const settings = meta.settings || {};
    const leader = settings.bounty === false ? null : leaderOf(players);
    const ranking = rankPlayers(players);
    const remaining = meta.endsAt - now;
    const boss = corsair?.boss && !corsair.boss.over ? corsair.boss : null;
    const nextBoss = corsair?.next?.boss || 0;
    // The latest room data for the drawing loop (which runs outside React)
    const data = useRef({});
    data.current = { players, corsair, leader };

    useEffect(() => {
        const fleet = new Fleet();
        const view = new SectorView(canvasRef.current, { lowFx: !performance.particles || performance.reducedMotion });
        viewRef.current = view;
        const orbBuf = [];
        // Every ship as its owner last reported it, moved on smoothly
        view.setDriver((dt) => {
            const at = rt.now();
            fleet.update(at, dt);
            const { players: ps, corsair: cs, leader: lead } = data.current;
            const ships = [];
            for (const [pid, f] of fleet.ships) {
                const p = ps?.[pid];
                if (!p || p.kicked || !p.name || p.connected === false) continue;
                ships.push({
                    id: pid,
                    name: p.name,
                    color: p.color,
                    design: p.ship || 0,
                    x: f.x,
                    y: f.y,
                    a: f.a,
                    hidden: !!(f.snap.f & FLAG.down),
                    docked: !!(f.snap.f & FLAG.docked),
                    thrust: !!(f.snap.f & FLAG.thrust),
                    safe: (p.safeUntil || 0) > at,
                    cloaked: (p.cloakUntil || 0) > at,
                    shield: shieldOf(p),
                    armor: armorOf(p),
                    armorLevel: p.upg?.armor || 0,
                    magnet: !!p.upg?.magnet,
                    leader: pid === lead,
                    flash: flashes.current.get(`p:${pid}`)
                });
            }
            const rocks = [];
            for (const [id, r] of Object.entries(cs?.rocks || {})) {
                if (!rockAlive(r, at)) continue;
                const pos = rockPos(r, at);
                rocks.push({
                    id, kind: r.kind, x: pos.x, y: pos.y, vx: r.vx, vy: r.vy, hp: r.hp, max: r.max,
                    rot: ((at - r.at) / 1000) * (r.spin || 0.5), fade: Math.min(1, (at - r.at) / 700),
                    flash: flashes.current.get(`r:${id}`)
                });
            }
            const liveBoss = cs?.boss && !cs.boss.over && at < cs.boss.until ? cs.boss : null;
            return {
                now: at,
                ships,
                bolts: fleet.bolts.map(b => ({ ...fleet.boltPos(b, at), a: b.a, color: boltColor(ps?.[b.pid]) })),
                rocks,
                loot: Object.entries(cs?.loot || {}).map(([id, l]) => ({ id, ...l })),
                boss: cs?.boss || null,
                bossFlash: flashes.current.get('boss'),
                orbs: liveBoss ? orbsAt(liveBoss, at, orbBuf) : []
            };
        });
        const off = rt.onValue(roomPath(code, 'ships'), v => fleet.setRaw(v || {}));
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

    // Many students fire at once: keep each sound to a few per second
    const play = (name, gap = 200) => {
        const at = Date.now();
        if (at - (lastSound.current[name] || 0) < gap) return;
        lastSound.current[name] = at;
        audio.sfx(name);
    };
    const log = (entry) => setFeed(list => [{ id: `${Date.now()}${Math.random()}`, ...entry }, ...list].slice(0, 8));
    const announce = (text, tone) => {
        const id = Date.now();
        setBanner({ id, text, tone });
        setTimeout(() => setBanner(b => (b?.id === id ? null : b)), 3200);
    };

    useEffect(() => subscribe((e) => {
        const view = viewRef.current;
        const vt = view?.time || 0;
        if (e.type === 'hit') {
            flashes.current.set(e.target, vt);
            if (e.target.startsWith('r:')) {
                view?.burst(e.x, e.y, e.gold ? '#fde047' : '#d6d3d1', e.down ? 36 : 10);
                view?.floater(e.x, e.y - 40, `+${e.n}`, e.gold ? '#fde047' : '#67e8f9', e.down ? 1.2 : 0.9);
                if (e.down) view?.ring(e.x, e.y, e.gold ? '#fde047' : '#e2e8f0', 1.4);
                play(e.down ? (e.gold ? 'jackpot' : 'explode') : 'mine', e.down ? 0 : 120);
                if (e.down && e.gold) log({ kind: 'jackpot', name: e.name, n: e.spilled });
                else if (e.down && e.spilled >= 50) log({ kind: 'rock', name: e.name, n: e.spilled });
            } else if (e.target === 'boss') {
                view?.burst(e.x, e.y, '#86efac', 10);
                view?.floater(e.x, e.y - 30, `−${e.dmg}`, '#86efac', 1);
                play('impact', 120);
            } else {
                view?.burst(e.x, e.y, '#fca5a5', 12);
                view?.floater(e.x, e.y - 40, `−${e.dmg}`, '#fca5a5', 1);
                play('impact', 120);
            }
        } else if (e.type === 'down') {
            const victim = Object.values(data.current.players || {}).find(p => p.name === e.victim);
            view?.explode(e.x, e.y, safeColor(victim?.color));
            if (e.spilled) view?.floater(e.x, e.y - 50, `💎 ${e.spilled}`, '#fde047', 1.3);
            play(e.boss ? 'explode' : 'plunder', 0);
            log({ kind: 'down', name: e.name, victim: e.victim, spilled: e.spilled, bounty: e.bounty, revenge: e.revenge, boss: e.boss });
        } else if (e.type === 'grab') {
            view?.burst(e.x, e.y, '#67e8f9', 8, 0.6);
            play('bonus', 150);
        } else if (e.type === 'shield') {
            play('shieldUp', 250);
        } else if (e.type === 'cloak') {
            play('cloak', 250);
        } else if (e.type === 'buy') {
            play('upgrade', 200);
            log({ kind: 'buy', name: e.name, item: e.item });
        } else if (e.type === 'cannon') {
            flashes.current.set('boss', vt);
            play('impact', 200);
        } else if (e.type === 'bossIn') {
            play('bossIntro', 0);
            announce(t('corsair.bannerBossIn'), 'boss');
            log({ kind: 'bossIn' });
        } else if (e.type === 'bossDown') {
            play('victory', 0);
            view?.explode(MID, MID, '#4ade80');
            view?.burst(MID, MID, '#fde047', 60, 1.6);
            announce(t('corsair.bannerBossDown', { name: e.mvp || '—' }), 'win');
            log({ kind: 'bossDown', mvp: e.mvp });
        } else if (e.type === 'bossGone') {
            play('raided', 0);
            announce(t('corsair.bannerBossGone'), 'bad');
            log({ kind: 'bossGone' });
        } else if (e.type === 'gold') {
            play('goldRush', 0);
            announce(t('corsair.bannerGold'), 'gold');
        }
    }), [subscribe]); // eslint-disable-line react-hooks/exhaustive-deps

    const bannerTone = { boss: 'bg-emerald-500 text-gray-950', win: 'bg-yellow-300 text-gray-950', bad: 'bg-rose-500 text-white', gold: 'bg-yellow-300 text-gray-950' };

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
                    {boss && (
                        <div className="absolute bottom-3 inset-x-0 flex justify-center px-4 pointer-events-none">
                            <p className="px-4 py-1.5 rounded-full bg-black/60 text-sm font-black text-emerald-300 tabular-nums">
                                {t('corsair.bossLeft', { hp: boss.hp, max: boss.max, s: Math.max(0, Math.ceil((boss.until - now) / 1000)) })}
                            </p>
                        </div>
                    )}
                </div>

                <aside className="flex flex-col gap-3 min-h-0 lg:overflow-y-auto">
                    <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
                        <h2 className="text-lg font-black flex items-center gap-2 mb-2"><Gem size={18} className="text-cyan-300" /> {t('corsair.leaderboard')}</h2>
                        <ol className="space-y-1">
                            {ranking.slice(0, 8).map((p, i) => (
                                <motion.li layout key={p.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-2.5 py-1.5">
                                    <span className="w-5 text-center font-black tabular-nums" style={{ color: MEDALS[i] || '#94a3b8' }}>{i + 1}</span>
                                    <ShipIcon design={p.ship || 0} color={p.color} size={22} />
                                    <span className="flex-1 min-w-0 font-bold truncate">{p.name}</span>
                                    {p.id === leader && <Crown size={14} className="text-yellow-300 shrink-0" />}
                                    <Upgrades upg={p.upg} />
                                    <span className="font-black tabular-nums text-cyan-300 min-w-[2.5rem] text-right">{p.score}</span>
                                </motion.li>
                            ))}
                        </ol>
                        {ranking.length > 8 && <p className="text-xs text-gray-500 mt-1.5 text-center">{t('corsair.morePlayers', { count: ranking.length - 8 })}</p>}
                    </section>

                    {settings.invasions !== false && !boss && nextBoss > now && meta.endsAt - nextBoss > RULES.boss.lastCall && (
                        <section className="rounded-3xl bg-emerald-500/10 border border-emerald-400/30 p-4 flex items-center gap-3">
                            <span className="text-2xl" aria-hidden="true">👾</span>
                            <p className="text-sm font-bold text-emerald-200">{t('corsair.nextInvasion', { time: formatClock(nextBoss - now) })}</p>
                        </section>
                    )}

                    <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
                        <h2 className="text-lg font-black flex items-center gap-2 mb-2"><Rocket size={18} className="text-emerald-300" /> {t('corsair.feed')}</h2>
                        {feed.length ? (
                            <ul className="space-y-1.5 text-sm">
                                {feed.map(f => (
                                    <motion.li key={f.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="min-w-0 break-words">
                                        <FeedLine f={f} />
                                    </motion.li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-gray-400">{t('corsair.feedEmpty')}</p>}
                    </section>

                    {/* How to play, for the class watching the big screen */}
                    <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
                        <h2 className="text-lg font-black flex items-center gap-2 mb-2"><Sparkles size={18} className="text-yellow-300" /> {t('corsair.legend')}</h2>
                        <ul className="space-y-1.5 text-sm text-gray-300">
                            <li className="flex items-start gap-2"><BookOpen size={16} className="shrink-0 mt-0.5 text-emerald-300" />{t('corsair.legendDock')}</li>
                            <li className="flex items-start gap-2"><Crosshair size={16} className="shrink-0 mt-0.5 text-rose-300" />{t('corsair.legendFly')}</li>
                            <li className="flex items-start gap-2"><Hammer size={16} className="shrink-0 mt-0.5 text-stone-300" />{t('corsair.legendMine')}</li>
                            {settings.raids !== false && <li className="flex items-start gap-2"><Swords size={16} className="shrink-0 mt-0.5 text-rose-300" />{t('corsair.legendRaid')}</li>}
                            {settings.invasions !== false && <li className="flex items-start gap-2"><span className="shrink-0 w-4 text-center" aria-hidden="true">👾</span>{t('corsair.legendBoss')}</li>}
                            {settings.goldComets !== false && <li className="flex items-start gap-2"><Sparkles size={16} className="shrink-0 mt-0.5 text-yellow-300" />{t('corsair.legendGold')}</li>}
                            {settings.upgrades !== false && <li className="flex items-start gap-2"><Wrench size={16} className="shrink-0 mt-0.5 text-cyan-300" />{t('corsair.legendUpgrades')}</li>}
                            {settings.bounty !== false && settings.raids !== false && <li className="flex items-start gap-2"><Crown size={16} className="shrink-0 mt-0.5 text-yellow-300" />{t('corsair.legendBounty', { n: RULES.bounty })}</li>}
                        </ul>
                    </section>
                </aside>
            </div>
        </div>
    );
};

// ---------- RESULTS ----------

const Award = ({ icon: Icon, color, title, player, value }) => (player ? (
    <li className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
        <span className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center" style={{ background: `${color}22`, color }}><Icon size={20} /></span>
        <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{title}</p>
            <p className="font-black truncate flex items-center gap-1.5"><ShipIcon design={player.ship || 0} color={player.color} size={20} /> {player.name}</p>
        </div>
        <span className="font-black tabular-nums" style={{ color }}>{value}</span>
    </li>
) : null);

const Results = ({ meta, players, stats, questions, onExit, onPlayAgain }) => {
    const t = useT();
    const [starting, setStarting] = useState(false);
    const { performance } = useTheme();
    const ranking = rankPlayers(players);
    const podium = ranking.slice(0, 3);
    const best = (field) => ranking.reduce((top, p) => ((p[field] || 0) > (top?.[field] || 0) ? p : top), null);
    const miner = best('mined');
    const raider = best('kills');
    const hunter = best('bossDmg');

    useEffect(() => {
        audio.sfx('podium');
        if (!performance.particles || !podium.length) return;
        import('canvas-confetti').then(({ default: confetti }) => {
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.35 }, colors: [podium[0].color || '#67e8f9', '#ffffff', '#fde047', '#67e8f9'], disableForReducedMotion: true });
        }).catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const report = Object.entries(stats || {})
        .map(([index, st]) => ({ q: questions[Number(index)], ...st }))
        .filter(r => r.q && r.asked > 0)
        .map(r => ({ ...r, accuracy: Math.round((r.correct / r.asked) * 100) }))
        .sort((x, y) => x.accuracy - y.accuracy || y.asked - x.asked)
        .slice(0, 6);
    // Podium order: 2nd, 1st, 3rd
    const order = [podium[1], podium[0], podium[2]];
    const heights = ['h-24', 'h-32', 'h-16'];

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
            <h1 className="text-center text-3xl sm:text-5xl font-black">{podium[0] ? t('corsair.winner', { name: podium[0].name }) : t('hostGame.nobody')}</h1>
            <p className="text-center text-gray-400 mt-2">{meta.setTitle}</p>
            {meta.endReason === 'host-offline' && <p className="text-center text-amber-300 text-sm font-semibold mt-2">{t('hostGame.endedOffline')}</p>}

            {podium.length > 0 && (
                <div className="mt-8 flex items-end justify-center gap-3 sm:gap-5">
                    {order.map((p, i) => (p ? (
                        <motion.div key={p.id} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 + (i === 1 ? 0.5 : i * 0.2) }} className="flex flex-col items-center w-24 sm:w-32">
                            <ShipIcon design={p.ship || 0} color={p.color} size={i === 1 ? 72 : 56} />
                            <p className="mt-1 font-black truncate max-w-full">{p.name}</p>
                            <p className="text-cyan-300 font-black flex items-center gap-1"><Gem size={14} /> {p.score}</p>
                            <div className={`mt-2 w-full ${heights[i]} rounded-t-2xl flex items-start justify-center pt-2 text-2xl font-black`} style={{ background: `${MEDALS[i === 1 ? 0 : i === 0 ? 1 : 2]}33`, color: MEDALS[i === 1 ? 0 : i === 0 ? 1 : 2] }}>
                                {i === 1 ? 1 : i === 0 ? 2 : 3}
                            </div>
                        </motion.div>
                    ) : <div key={i} className="w-24 sm:w-32" />))}
                </div>
            )}

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="rounded-3xl bg-white/5 border border-white/10 p-5">
                    <h2 className="text-lg font-black mb-3 flex items-center gap-2"><Crown size={18} className="text-amber-300" /> {t('corsair.awards')}</h2>
                    <ul className="space-y-2">
                        <Award icon={Hammer} color="#a8a29e" title={t('corsair.awardMiner')} player={miner?.mined ? miner : null} value={miner?.mined} />
                        {meta.settings?.raids !== false && <Award icon={Swords} color="#fb7185" title={t('corsair.awardRaider')} player={raider?.kills ? raider : null} value={raider?.kills} />}
                        {meta.settings?.invasions !== false && <Award icon={Rocket} color="#4ade80" title={t('corsair.awardHunter')} player={hunter?.bossDmg ? hunter : null} value={hunter?.bossDmg} />}
                    </ul>
                    <ol className="mt-4 space-y-1">
                        {ranking.slice(3, 10).map((p, i) => (
                            <li key={p.id} className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/5 text-sm">
                                <span className="w-6 text-center font-black tabular-nums text-gray-400">{i + 4}</span>
                                <ShipIcon design={p.ship || 0} color={p.color} size={18} />
                                <span className="flex-1 min-w-0 font-bold truncate">{p.name}</span>
                                <span className="font-black tabular-nums text-cyan-300">{p.score}</span>
                            </li>
                        ))}
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
                    <Link to={`/host/${meta.setId}?game=star-corsairs`} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 font-bold transition-colors">
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
    const corsair = useRoomValue(rt, roomPath(code, 'corsair'));
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

    // The sector subscribes to shots and events
    const subscribe = useRef((fn) => {
        listeners.current.add(fn);
        return () => listeners.current.delete(fn);
    }).current;

    useEffect(() => {
        if (!rt || claim !== 'mine') return undefined;
        const controller = new CorsairHost(rt, code, { onEvent: (e) => listeners.current.forEach(fn => fn(e)) });
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

    // Music follows the game: the lobby groove, the battle track, and the mothership's own track while it
    // attacks (switching on the next bar line)
    const status = meta?.status;
    const invasion = !!corsair?.boss && !corsair.boss.over;
    useEffect(() => {
        if (status === 'lobby' || status === 'ended') audio.playMusic('corsairLobby');
        else if (status === 'live') audio.playMusic(invasion ? 'corsairBoss' : 'corsairs', { quantize: true });
    }, [status, invasion]);
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
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">{gameName(t, getGame('star-corsairs'))}</span>
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
            {meta.status === 'live' && (
                <Live
                    rt={rt}
                    code={code}
                    meta={meta}
                    players={players}
                    corsair={corsair}
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
                message={meta.status === 'lobby' ? t('hostGame.closeText') : t('corsair.endText')}
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
