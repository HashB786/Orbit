import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Trophy, LogOut, WifiOff, UserX, ArrowRight, Check, X, Zap, Gem, Shield, EyeOff, Crosshair, Wrench,
    Sparkles, Magnet, Rocket, BookOpen, Flame
} from 'lucide-react';
import { Spinner } from '../../components/ui';
import { useRealtime, useRoomValue, useServerNow, formatClock, rankPlayers } from '../../platform/rooms/hooks';
import { roomPath, attachPresence, leaveRoom, isOnline, joinRoom } from '../../platform/rooms/rooms';
import { normalizeQuestion } from '../../platform/questions/normalize';
import { toChoiceRound, decoyPool, shuffle } from '../../platform/questions/rounds';
import { secondsFor } from '../../platform/questions/types';
import { audio } from '../../platform/audio/audio';
import { useTheme } from '../../context/ThemeContext';
import { useT } from '../../context/LanguageContext';
import Slots from '../../i18n/Slots';
import { Screen, Avatar, MuteButton } from '../comet-clash/playerUi';
import { useWakeLock } from '../shared/liveUi';
import QuestionTimer from '../shared/QuestionTimer';
import AnswerPad from '../slingshot-siege/AnswerPad';
import { SectorView } from './sector';
import { Cockpit } from './cockpit';
import ShipIcon, { SHIP_NAMES } from './ShipIcon';
import { RULES, UPGRADES, SHIP_DESIGNS, RESPAWN_MS, energyOf, armorOf, shieldOf, priceOf, rockAlive } from './rules';

const answerOf = (round) => (round.kind === 'order'
    ? [...round.options].sort((a, b) => a.order - b.order).map(o => o.text).join(' → ')
    : round.options.filter(o => o.correct).map(o => o.text).join(', '));

const UPGRADE_ICONS = { laser: Crosshair, armor: Shield, magnet: Magnet };
const STICK_R = 56; // px: how far the joystick knob can go

const Pips = ({ value, max, color, size = 'w-2.5 h-3' }) => (
    <span className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
            <span key={i} className={`${size} rounded-sm`} style={{ background: i < value ? color : 'rgba(255,255,255,0.12)' }} />
        ))}
    </span>
);

// ---------- the upgrade bay ----------

const UpgradeSheet = ({ me, onBuy, onClose }) => {
    const t = useT();
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    const effect = (item, level) => (item === 'laser' ? t('corsair.laserText', { n: RULES.laser[Math.min(2, level)] })
        : item === 'armor' ? t('corsair.armorText', { n: RULES.armor[Math.min(2, level)] }) : t('corsair.magnetText'));
    return (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 p-3" onClick={onClose} role="dialog" aria-modal="true" aria-label={t('corsair.upgradesTitle')}>
            <div className="w-full max-w-md rounded-3xl bg-[#0b1128] border border-white/10 p-5 pb-safe" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xl font-black flex items-center gap-2"><Wrench size={20} className="text-cyan-300" /> {t('corsair.upgradesTitle')}</h2>
                    <button type="button" onClick={onClose} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center" aria-label={t('common.close')}><X size={18} /></button>
                </div>
                <p className="text-sm text-gray-400 mb-4">{t('corsair.upgradesNote')}</p>
                <ul className="space-y-2.5">
                    {UPGRADES.map(item => {
                        const Icon = UPGRADE_ICONS[item];
                        const level = me.upg?.[item] || 0;
                        const price = priceOf(me, item);
                        const can = price !== null && (me.score || 0) >= price;
                        return (
                            <li key={item} className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
                                <span className="w-11 h-11 shrink-0 rounded-xl bg-cyan-400/15 text-cyan-300 flex items-center justify-center"><Icon size={22} /></span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black">{t(`corsair.item_${item}`)} <span className="text-xs text-gray-400">{item === 'magnet' ? (level ? '✓' : '') : t('corsair.level', { n: level + 1 })}</span></p>
                                    <p className="text-xs text-gray-400">{price === null || item === 'magnet' ? effect(item, level) : `${effect(item, level)} → ${effect(item, level + 1)}`}</p>
                                </div>
                                {price === null ? (
                                    <span className="text-xs font-black text-emerald-300">{t('corsair.maxed')}</span>
                                ) : (
                                    <button type="button" disabled={!can} onClick={() => onBuy(item)} className="shrink-0 px-3 h-10 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:bg-white/10 disabled:text-gray-500 text-gray-950 font-black text-sm flex items-center gap-1">
                                        <Gem size={14} /> {price}
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};

// ---------- touch controls ----------

// A floating joystick: touch anywhere on the left part of the screen and drag
const Joystick = ({ onMove }) => {
    const [stick, setStick] = useState(null); // { id, bx, by, kx, ky }
    const zone = useRef(null);
    const move = (e, base) => {
        const dx = e.clientX - base.bx;
        const dy = e.clientY - base.by;
        const d = Math.hypot(dx, dy);
        const k = d > STICK_R ? STICK_R / d : 1;
        onMove(d < 6 ? { x: 0, y: 0 } : { x: (dx * k) / STICK_R, y: (dy * k) / STICK_R });
        return { ...base, kx: dx * k, ky: dy * k };
    };
    return (
        <div
            ref={zone}
            className="absolute left-0 bottom-0 top-[30%] w-[58%] touch-none"
            onPointerDown={(e) => {
                if (e.pointerType === 'mouse' || stick) return;
                zone.current.setPointerCapture?.(e.pointerId);
                const rect = zone.current.getBoundingClientRect();
                setStick({ id: e.pointerId, bx: e.clientX, by: e.clientY, ox: rect.left, oy: rect.top, kx: 0, ky: 0 });
                audio.unlock();
            }}
            onPointerMove={(e) => {
                if (stick?.id === e.pointerId) setStick(move(e, stick));
            }}
            onPointerUp={(e) => {
                if (stick?.id !== e.pointerId) return;
                setStick(null);
                onMove({ x: 0, y: 0 });
            }}
            onPointerCancel={() => {
                setStick(null);
                onMove({ x: 0, y: 0 });
            }}
        >
            {stick && (
                <>
                    <span className="absolute rounded-full border-2 border-white/30 bg-white/5 pointer-events-none" style={{ width: STICK_R * 2, height: STICK_R * 2, left: stick.bx - stick.ox - STICK_R, top: stick.by - stick.oy - STICK_R }} />
                    <span className="absolute rounded-full bg-white/70 pointer-events-none" style={{ width: 44, height: 44, left: stick.bx - stick.ox + stick.kx - 22, top: stick.by - stick.oy + stick.ky - 22 }} />
                </>
            )}
        </div>
    );
};

// Hold to keep firing
const FireButton = ({ onChange, disabled, label }) => (
    <button
        type="button"
        onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture?.(e.pointerId);
            audio.unlock();
            onChange(true);
        }}
        onPointerUp={() => onChange(false)}
        onPointerCancel={() => onChange(false)}
        onContextMenu={e => e.preventDefault()}
        className={`w-24 h-24 rounded-full border-4 font-black text-base flex flex-col items-center justify-center gap-0.5 touch-none select-none shadow-2xl ${disabled ? 'bg-white/10 border-white/10 text-gray-400' : 'bg-rose-500/90 border-rose-300 text-white active:bg-rose-400'}`}
        aria-label={label}
    >
        <Crosshair size={28} />
        <span className="text-xs">{label}</span>
    </button>
);

// ---------- the game on one device ----------

const Bridge = ({ rt, code, playerId, me, players, corsair, settings, questions, endsAt, now }) => {
    const t = useT();
    const { performance: perf } = useTheme();
    // Performance mode also makes the music lighter
    useEffect(() => audio.setLite(!perf.particles || perf.reducedMotion), [perf.particles, perf.reducedMotion]);
    const sound = settings.studentSound !== false;
    const raidsOn = settings.raids !== false;
    const canvasRef = useRef(null);
    const viewRef = useRef(null);
    const cockpitRef = useRef(null);
    const pool = useMemo(() => decoyPool(questions), [questions]);
    const deck = useRef({ order: [], retry: [], served: 0, last: -1 });
    const timers = useRef([]);
    const pending = useRef(new Map()); // inbox key -> { gain, cost } until the host has it
    const hits = useRef(new Map()); // inbox key -> where a bolt hit
    const handled = useRef(new Set());
    const [, bump] = useReducer(x => x + 1, 0);
    const [docked, setDocked] = useState(true);
    const [phase, setPhase] = useState('question'); // question | feedback (while docked)
    const [card, setCard] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [shop, setShop] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [flash, setFlash] = useState(0);
    const [hint, setHint] = useState(false);
    const touch = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

    const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
    useEffect(() => () => timers.current.forEach(clearTimeout), []);
    const sfx = (name) => {
        if (sound) audio.sfx(name);
    };
    const toast = (text, tone = 'info') => {
        const id = `${Date.now()}${Math.random()}`;
        setToasts(list => [...list.slice(-2), { id, text, tone }]);
        later(() => setToasts(list => list.filter(x => x.id !== id)), 2800);
    };

    // Energy: what the host has counted, plus answers on their way, minus bolts it hasn't charged yet
    const ack = me.ack || '';
    let energy = energyOf(me);
    for (const [key, p] of pending.current) if (key > ack) energy += p.gain - p.cost;
    const unpaid = cockpitRef.current?.unpaid() || 0;
    const shownEnergy = Math.max(0, Math.min(RULES.maxEnergy, energy - unpaid));
    const shield = shieldOf(me);
    const armor = armorOf(me);
    const ranking = rankPlayers(players);
    const myRank = ranking.findIndex(p => p.id === playerId) + 1;
    const boss = corsair?.boss && !corsair.boss.over && now < corsair.boss.until ? corsair.boss : null;
    const goldOut = Object.values(corsair?.rocks || {}).some(r => r.kind === 'gold' && rockAlive(r, now));
    const respawning = !!me.down?.at && now - me.down.at < RESPAWN_MS;
    const cloakLeft = Math.max(0, Math.ceil(((me.cloakUntil || 0) - now) / 1000));
    const safeLeft = Math.max(0, Math.ceil(((me.safeUntil || 0) - now) / 1000));
    const revenge = me.revenge?.until > now ? me.revenge : null;

    // ----- sending -----
    const send = (value, { gain = 0, cost = 0 } = {}) => {
        const key = rt.newKey();
        pending.current.set(key, { gain, cost });
        rt.set(roomPath(code, 'inbox', playerId, key), { ...value, at: rt.now() }).catch(() => {
            pending.current.delete(key);
            bump();
        });
        return key;
    };

    // ----- questions (while docked) -----
    const nextCard = () => {
        const d = deck.current;
        d.served++;
        let built = null;
        for (let tries = 0; !built && tries < questions.length * 2 + 4; tries++) {
            let index = -1;
            const due = d.retry.findIndex(r => r.due <= d.served);
            if (due !== -1 && tries === 0) index = d.retry.splice(due, 1)[0].index;
            else {
                if (!d.order.length) d.order = shuffle(questions.map((_, i) => i));
                index = d.order.pop();
                if (index === d.last && questions.length > 1) continue;
            }
            const round = toChoiceRound(questions[index], pool, { maxOptions: 4 });
            if (round) built = { index, round };
        }
        if (!built) return;
        d.last = built.index;
        const seconds = settings.timer
            ? secondsFor(questions[built.index], Number(settings.timerSeconds) || 30, settings.useQuestionTime !== false)
            : 0;
        setCard({ ...built, seconds, id: d.served });
        setFeedback(null);
        setPhase('question');
    };
    useEffect(() => {
        nextCard();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const answer = (ok, picked, timeUp = false) => {
        if (phase !== 'question' || !card || !docked) return;
        const gain = ok ? Math.min(RULES.answerEnergy, Math.max(0, RULES.maxEnergy - energy)) : 0;
        const key = send({ k: 'a', q: card.index, ok }, { gain });
        if (!ok) deck.current.retry.push({ index: card.index, due: deck.current.served + 3 });
        sfx(ok ? 'correct' : 'wrong');
        setFeedback({ ok, key, gain, answer: answerOf(card.round), timeUp });
        setPhase('feedback');
        later(nextCard, ok ? 1000 : 2000);
    };

    const launch = () => {
        if (!docked) return;
        audio.unlock();
        sfx('launch');
        setDocked(false);
        setShop(false);
        if (!hint) {
            setHint(true);
            later(() => setHint('done'), 5000);
        }
    };
    const dock = () => {
        if (docked) return;
        setDocked(true);
        if (cockpitRef.current) cockpitRef.current.firing = { key: false, button: false, mouse: false };
        if (!card) nextCard();
    };
    const cloak = () => {
        if (!raidsOn || docked || cloakLeft > 0) return;
        if (shownEnergy < RULES.cloak) {
            toast(t('corsair.noEnergy'), 'warn');
            return;
        }
        send({ k: 's', act: 'cloak' }, { cost: RULES.cloak });
    };
    const buy = (item) => send({ k: 's', act: 'buy', item });

    // ----- the cockpit: flight, bolts and the sector view -----
    useEffect(() => {
        const cockpit = new Cockpit({
            rt,
            pid: playerId,
            me,
            write: (text) => rt.set(roomPath(code, 'ships', playerId), text).catch(() => {}),
            report: (msg) => {
                const key = send({ k: 's', ...msg });
                if (msg.act === 'hit') hits.current.set(key, { x: msg.x, y: msg.y });
            },
            on: {
                sound: (name) => { if (sound) audio.sfx(name); },
                fired: () => bump(),
                empty: () => toast(t('corsair.noEnergyDock'), 'warn')
            }
        });
        cockpitRef.current = cockpit;
        const view = new SectorView(canvasRef.current, { lowFx: !perf.particles || perf.reducedMotion, follow: true });
        viewRef.current = view;
        cockpit.attach(view);
        view.setDriver((dt) => cockpit.step(dt));
        const off = rt.onValue(roomPath(code, 'ships'), v => cockpit.setRaw(v || {}));
        view.mount();
        const observer = new ResizeObserver(() => view.resize());
        observer.observe(canvasRef.current);
        return () => {
            off();
            observer.disconnect();
            view.destroy();
            viewRef.current = null;
            cockpitRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        cockpitRef.current?.setData({ me, players, corsair, settings, energy });
    });
    useEffect(() => {
        cockpitRef.current?.setDocked(docked);
    }, [docked]);

    // ----- results from the host -----
    useEffect(() => {
        const res = me.res || {};
        const view = viewRef.current;
        for (const key of Object.keys(res).sort()) {
            if (handled.current.has(key) || !pending.current.has(key)) continue;
            handled.current.add(key);
            const r = res[key];
            const at = hits.current.get(key);
            hits.current.delete(key);
            // The hit itself (crystals, cracks, explosions, sounds) already showed on the spot; this is the news
            if (r.kind === 'mine') {
                if (r.down) toast(r.gold ? t('corsair.jackpotSpill') : t('corsair.brokeSpill'), r.gold ? 'gold' : 'good');
            } else if (r.kind === 'raid') {
                if (r.blocked && r.blocked !== 'docked') toast(t(`corsair.blocked_${r.blocked}`, { name: r.name || '' }), 'warn');
                else if (r.broke) toast(t('corsair.blasted', { name: r.name }) + (r.bounty ? ` ${t('corsair.bountyHit', { n: RULES.bounty })}` : ''), 'gold');
            } else if (r.kind === 'gone' && at) {
                view?.floater(at.x, at.y - 30, '✕', '#94a3b8', 0.9);
            } else if (r.kind === 'energy') {
                toast(t('corsair.noEnergy'), 'warn');
            } else if (r.kind === 'cloak') {
                if (!r.already) {
                    sfx('cloak');
                    toast(t('corsair.cloakOn', { s: RULES.cloakMs / 1000 }), 'good');
                }
            } else if (r.kind === 'buy') {
                if (r.poor) toast(t('corsair.poor'), 'warn');
                else if (!r.maxed) {
                    sfx('upgrade');
                    toast(t('corsair.bought', { item: t(`corsair.item_${r.item}`) }), 'good');
                }
            }
        }
        // Everything up to the host's acknowledgement is settled
        for (const key of [...pending.current.keys()]) if (key <= ack) pending.current.delete(key);
    }, [me.res, ack]); // eslint-disable-line react-hooks/exhaustive-deps

    // ----- big moments: the mothership arrives, a golden comet appears -----
    const bossAt = corsair?.boss?.at || 0;
    const seenBoss = useRef(bossAt);
    useEffect(() => {
        if (!bossAt || bossAt === seenBoss.current) return;
        seenBoss.current = bossAt;
        sfx('bossIntro');
        viewRef.current?.shake(2);
    }, [bossAt]); // eslint-disable-line react-hooks/exhaustive-deps
    const goldId = Object.entries(corsair?.rocks || {}).find(([, r]) => r.kind === 'gold')?.[0] || null;
    const seenGold = useRef(goldId);
    useEffect(() => {
        if (!goldId || goldId === seenGold.current) return;
        seenGold.current = goldId;
        sfx('goldRush');
    }, [goldId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ----- being attacked, and mothership news -----
    const seenAlert = useRef(me.alert?.id ?? null);
    useEffect(() => {
        const a = me.alert;
        if (!a || a.id === seenAlert.current) return;
        seenAlert.current = a.id;
        if (a.kind === 'hit') {
            sfx('raided');
            setFlash(x => x + 1);
            viewRef.current?.shake(1);
            toast(t('corsair.alertHit', { by: a.by }), 'bad');
        } else if (a.kind === 'down') {
            setFlash(x => x + 1);
            toast(`${t('corsair.alertDown', { by: a.by, n: a.n })} ${t('corsair.revengeReady', { by: a.by })}`, 'bad');
        } else if (a.kind === 'zapDown') {
            setFlash(x => x + 1);
            toast(t('corsair.alertZapDown', { n: a.n }), 'bad');
        } else if (a.kind === 'beam') {
            sfx('raided');
            toast(t('corsair.alertBeam', { n: a.n }), 'bad');
        } else if (a.kind === 'bossWin') {
            sfx('victory');
            toast(t('corsair.alertBossWin', { n: a.n }) + (a.mvp ? ` ${t('corsair.mvp')}` : ''), 'gold');
        }
    }, [me.alert?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // ----- keyboard: WASD / arrows fly, Space fires, C cloak, Q dock; L launches from the dock -----
    useEffect(() => {
        const held = new Set();
        const update = () => {
            const c = cockpitRef.current;
            if (!c) return;
            const x = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
            const y = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
            const d = Math.hypot(x, y) || 1;
            c.keys = { x: x / d, y: y / d };
            c.firing.key = held.has('fire');
        };
        const map = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', ' ': 'fire', j: 'fire' };
        const onDown = (e) => {
            if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
            const k = e.key.toLowerCase();
            if (docked) {
                if (k === 'l' || (k === 'escape' && !shop)) {
                    e.preventDefault();
                    launch();
                }
                return;
            }
            if (map[k]) {
                e.preventDefault();
                held.add(map[k]);
                update();
            } else if (k === 'c') cloak();
            else if (k === 'q') dock();
        };
        const onUp = (e) => {
            const k = map[e.key.toLowerCase()];
            if (k) {
                held.delete(k);
                update();
            }
        };
        const clear = () => {
            held.clear();
            update();
        };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        window.addEventListener('blur', clear);
        return () => {
            window.removeEventListener('keydown', onDown);
            window.removeEventListener('keyup', onUp);
            window.removeEventListener('blur', clear);
        };
    });

    // ----- mouse: the ship flies towards the pointer, hold the button to fire -----
    const onMouseMove = (e) => {
        const c = cockpitRef.current;
        if (!c || e.pointerType !== 'mouse') return;
        const rect = canvasRef.current.getBoundingClientRect();
        const dx = e.clientX - rect.left - rect.width / 2;
        const dy = e.clientY - rect.top - rect.height / 2;
        const d = Math.hypot(dx, dy);
        const dead = 28;
        c.pointer = d < dead ? null : { x: (dx / d) * Math.min(1, (d - dead) / (Math.min(rect.width, rect.height) * 0.28)), y: (dy / d) * Math.min(1, (d - dead) / (Math.min(rect.width, rect.height) * 0.28)) };
    };
    useEffect(() => {
        const up = () => {
            if (cockpitRef.current) cockpitRef.current.firing.mouse = false;
        };
        window.addEventListener('pointerup', up);
        return () => window.removeEventListener('pointerup', up);
    }, []);

    const res = feedback?.key ? me.res?.[feedback.key] : null;
    const gainShown = res ? res.gain || 0 : feedback?.gain || 0;
    const toneClass = { good: 'bg-emerald-500 text-gray-950', gold: 'bg-yellow-300 text-gray-950', warn: 'bg-white text-gray-950', bad: 'bg-rose-500 text-white', info: 'bg-white/90 text-gray-950' };

    return (
        <div className="app-height w-full flex flex-col bg-[#03050f] text-white select-none overflow-hidden">
            {/* HUD */}
            <div className="shrink-0 bg-[#070b1d] border-b border-white/10 pt-safe z-20">
                <div className="flex items-center justify-between gap-2 px-3 sm:px-5 h-11">
                    <div className="flex items-center gap-2 min-w-0">
                        <ShipIcon design={me.ship || 0} color={me.color} size={24} />
                        <span className="font-black text-xl tabular-nums flex items-center gap-1 text-cyan-300"><Gem size={17} />{me.score || 0}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-300 tabular-nums">{formatClock(endsAt - now)}</span>
                    <div className="flex items-center gap-2">
                        {myRank > 0 && <span className="text-sm font-black text-gray-300">#{myRank}</span>}
                        <MuteButton inline />
                    </div>
                </div>
                <div className="flex items-center gap-3 px-3 sm:px-5 pb-2">
                    <span className="flex items-center gap-1.5 flex-1 min-w-0" title={t('corsair.energy')}>
                        <Zap size={15} className="text-yellow-300 fill-current shrink-0" />
                        <span className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden max-w-[14rem]">
                            <span className="block h-full rounded-full bg-yellow-300 transition-[width] duration-150" style={{ width: `${(shownEnergy / RULES.maxEnergy) * 100}%` }} />
                        </span>
                        <span className="text-xs font-black tabular-nums text-yellow-200 w-6">{shownEnergy}</span>
                    </span>
                    <span className="flex items-center gap-1.5" title={t('corsair.shield')}>
                        <Shield size={15} className="text-sky-300" />
                        <Pips value={shield} max={armor} color="#7dd3fc" size="w-3 h-3.5" />
                    </span>
                    {cloakLeft > 0 && <span className="text-xs font-black text-violet-300 flex items-center gap-0.5"><EyeOff size={13} />{cloakLeft}</span>}
                    {safeLeft > 0 && !respawning && <span className="text-xs font-black text-sky-200 flex items-center gap-0.5"><Shield size={13} />{safeLeft}</span>}
                    {revenge && <span className="hidden min-[420px]:flex text-xs font-black text-orange-300 items-center gap-0.5 truncate max-w-[8rem]"><Flame size={13} />{revenge.name}</span>}
                </div>
            </div>

            {/* Mothership and golden comet news */}
            {boss && (
                <div className="shrink-0 px-3 py-1.5 bg-emerald-500/15 border-b border-emerald-400/30 flex items-center gap-3 z-20">
                    <span className="text-lg" aria-hidden="true">👾</span>
                    <p className="flex-1 min-w-0 text-xs sm:text-sm font-bold text-emerald-200 leading-tight">
                        <b className="text-emerald-300">{t('corsair.bossBanner')} {Math.max(0, Math.ceil((boss.until - now) / 1000))}s</b><span className="hidden sm:inline"> · {t('corsair.bossHelp')}</span>
                    </p>
                    <div className="w-16 h-2 rounded-full bg-white/10 overflow-hidden shrink-0">
                        <div className="h-full bg-emerald-400 transition-[width]" style={{ width: `${(boss.hp / Math.max(1, boss.max)) * 100}%` }} />
                    </div>
                </div>
            )}
            {!boss && goldOut && !docked && (
                <p className="shrink-0 px-3 py-1 bg-yellow-300/15 border-b border-yellow-300/30 text-xs sm:text-sm font-black text-yellow-200 text-center flex items-center justify-center gap-1.5 z-20"><Sparkles size={14} /> {t('corsair.goldBanner')}</p>
            )}

            {/* The sector */}
            <div className="relative flex-1 min-h-0">
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full block touch-none"
                    aria-label={t('corsair.sector')}
                    onPointerMove={onMouseMove}
                    onPointerLeave={(e) => {
                        if (e.pointerType === 'mouse' && cockpitRef.current) cockpitRef.current.pointer = null;
                    }}
                    onPointerDown={(e) => {
                        audio.unlock();
                        if (e.pointerType === 'mouse' && e.button === 0 && cockpitRef.current && !docked) cockpitRef.current.firing.mouse = true;
                    }}
                    onContextMenu={e => e.preventDefault()}
                />

                {!docked && touch && <Joystick onMove={(v) => { if (cockpitRef.current) cockpitRef.current.stick = v; }} />}

                {!docked && (
                    <div className="absolute right-3 bottom-3 pb-safe flex flex-col items-end gap-2 z-10">
                        {raidsOn && (
                            <button type="button" onClick={cloak} disabled={cloakLeft > 0 || shownEnergy < RULES.cloak} className="h-11 px-3 rounded-2xl bg-violet-500/30 hover:bg-violet-500/40 disabled:opacity-40 text-violet-100 font-black text-sm flex items-center gap-1.5">
                                <EyeOff size={16} /> {t('corsair.cloak')} <span className="flex items-center opacity-80"><Zap size={12} className="fill-current" />{RULES.cloak}</span>
                            </button>
                        )}
                        {touch && <FireButton label={t('corsair.fire')} disabled={shownEnergy < RULES.shot} onChange={(on) => { if (cockpitRef.current) cockpitRef.current.firing.button = on; }} />}
                    </div>
                )}

                {!docked && (
                    <button type="button" onClick={dock} className="absolute right-3 top-3 z-10 h-11 px-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-sm flex items-center gap-1.5 shadow-xl">
                        <BookOpen size={17} /> {t('corsair.dock')}
                    </button>
                )}

                {!docked && !touch && (
                    <p className="absolute bottom-2 left-3 right-40 text-[11px] text-gray-400 pointer-events-none">{t('corsair.keysFlight')}</p>
                )}

                {!docked && hint === true && (
                    <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute inset-x-0 top-1/3 mx-auto w-max max-w-[90%] px-4 py-2.5 rounded-2xl bg-black/70 text-center text-sm font-bold pointer-events-none">
                        {touch ? t('corsair.hintTouch') : t('corsair.hintMouse')}
                    </motion.p>
                )}

                {respawning && (
                    <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-2xl font-black text-rose-300 pointer-events-none">{t('corsair.respawning')}</p>
                )}

                {/* News, below the minimap and the Dock button */}
                <div className="absolute inset-x-0 top-[7.5rem] sm:top-[11rem] z-30 flex flex-col items-center gap-1.5 px-3 pointer-events-none" aria-live="polite">
                    {toasts.map(x => (
                        <p key={x.id} className={`max-w-md px-4 py-2 rounded-2xl text-sm font-black shadow-xl text-center ${toneClass[x.tone]}`}>{x.text}</p>
                    ))}
                </div>

                {/* The dock: answer questions in a safe bubble to charge energy */}
                {docked && (
                    <div className="absolute inset-0 z-10 bg-[#03050f]/95 overflow-y-auto">
                        <div className="min-h-full w-full max-w-3xl mx-auto px-3 sm:px-6 py-4 flex flex-col gap-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-base font-black text-emerald-300 flex items-center gap-1.5"><BookOpen size={17} /> {t('corsair.dockedTitle')}</p>
                                    <p className="text-xs text-gray-400">{t('corsair.docked')}</p>
                                </div>
                                <div className="flex gap-2">
                                    {settings.upgrades !== false && (
                                        <button type="button" onClick={() => setShop(true)} className="h-10 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 font-black text-sm flex items-center gap-1.5">
                                            <Wrench size={15} /> {t('corsair.upgrades')}
                                        </button>
                                    )}
                                    <button type="button" onClick={launch} className={`h-10 px-4 rounded-xl font-black text-sm flex items-center gap-1.5 ${shownEnergy >= 10 ? 'bg-rose-500 hover:bg-rose-400 text-white animate-pulse' : 'bg-white/10 hover:bg-white/15 text-white'}`}>
                                        <Rocket size={15} /> {t('corsair.launch')}
                                    </button>
                                </div>
                            </div>
                            {card && (
                                <div className="flex-1 flex flex-col gap-4 justify-center">
                                    {card.seconds > 0 && (
                                        <div className="flex justify-center">
                                            <QuestionTimer key={card.id} seconds={card.seconds} running={phase === 'question'} onExpire={() => answer(false, null, true)} size={56} sound={sound} />
                                        </div>
                                    )}
                                    <p className="text-center text-xl sm:text-3xl font-black leading-snug break-words">{card.round.prompt}</p>
                                    <AnswerPad round={card.round} onAnswer={answer} disabled={phase !== 'question'} />
                                    <p className="text-center text-xs text-gray-500">{touch ? t('corsair.dockHint') : t('corsair.dockHintKeys')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Answer feedback */}
            {docked && phase === 'feedback' && feedback && (
                <div className="fixed inset-x-0 bottom-0 z-30 p-3 sm:p-4 pb-safe flex justify-center pointer-events-none">
                    <div className={`w-full max-w-md rounded-3xl border p-4 text-center shadow-2xl ${feedback.ok ? 'bg-emerald-950/95 border-emerald-400/40' : 'bg-[#1a0b16]/95 border-rose-400/40'}`}>
                        {feedback.ok ? (
                            <>
                                <p className="text-2xl font-black text-emerald-300 flex items-center justify-center gap-2"><Check size={26} /> {t('corsair.correct')}</p>
                                {gainShown > 0 ? (
                                    <p className="mt-1 text-3xl font-black text-yellow-300 flex items-center justify-center gap-1"><Zap size={26} className="fill-current" />+{gainShown}</p>
                                ) : <p className="mt-1 text-sm font-black text-gray-300">{t('corsair.energyFullShort')}</p>}
                                <div className="mt-1 flex flex-wrap justify-center gap-x-3 text-sm font-black">
                                    {res?.over && <span className="text-orange-300">{t('corsair.overcharge')}</span>}
                                    {res?.under && <span className="text-sky-300">{t('corsair.underdog')}</span>}
                                    {res?.cannon && <span className="text-emerald-300">{t('corsair.cannonHit')}</span>}
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-2xl font-black text-rose-300 flex items-center justify-center gap-2"><X size={26} /> {feedback.timeUp ? t('cc.timeUp') : t('corsair.wrong')}</p>
                                <p className="mt-2 text-sm text-gray-300 break-words"><Slots text={t('cc.answer')} slots={{ answer: <b className="text-white">{feedback.answer}</b> }} /></p>
                            </>
                        )}
                    </div>
                </div>
            )}

            {flash > 0 && (
                <motion.div key={flash} initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }} className="fixed inset-0 z-20 pointer-events-none" style={{ boxShadow: 'inset 0 0 120px 30px rgba(244, 63, 94, 0.8)' }} />
            )}

            {shop && <UpgradeSheet me={me} onBuy={buy} onClose={() => setShop(false)} />}
        </div>
    );
};

// ---------- lobby: pick a ship ----------

const ShipPicker = ({ rt, code, playerId, me }) => {
    const t = useT();
    const choose = (design) => {
        audio.unlock();
        audio.sfx('click');
        rt.set(roomPath(code, 'inbox', playerId, rt.newKey()), { k: 's', act: 'paint', design, at: rt.now() }).catch(() => {});
    };
    return (
        <div className="mt-6 w-full max-w-sm">
            <p className="text-sm font-black uppercase tracking-widest text-gray-400 mb-2">{t('corsair.pickShip')}</p>
            <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: SHIP_DESIGNS }, (_, d) => (
                    <button
                        key={d}
                        type="button"
                        onClick={() => choose(d)}
                        aria-pressed={me.ship === d}
                        className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-colors ${me.ship === d ? 'border-white bg-white/15' : 'border-white/10 bg-white/5 hover:border-white/40'}`}
                    >
                        <ShipIcon design={d} color={me.color} size={44} />
                        <span className="text-[11px] font-bold text-gray-300">{t(`corsair.ship_${SHIP_NAMES[d]}`)}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

// ---------- player root ----------

const PlayerScreen = ({ code, playerId, onExit }) => {
    const navigate = useNavigate();
    const t = useT();
    const { rt, error } = useRealtime();
    const meta = useRoomValue(rt, roomPath(code, 'meta'));
    const playersRaw = useRoomValue(rt, roomPath(code, 'players'));
    const players = playersRaw || {};
    const corsair = useRoomValue(rt, roomPath(code, 'corsair'));
    const set = useRoomValue(rt, roomPath(code, 'set'));
    const host = useRoomValue(rt, roomPath(code, 'host'));
    const now = useServerNow(rt, 500);
    const settings = meta?.settings || {};
    const me = players[playerId];

    // The teacher chose to end the game if their screen is gone too long
    const hostLimit = (Number(settings.hostTimeout) || 0) * 1000;
    const hostGone = meta?.status === 'live' && hostLimit > 0 && !!host && !isOnline(host, now) && now - (host.lastSeen || 0) > hostLimit;
    const ended = meta?.status === 'ended' || hostGone;
    const playing = meta?.status === 'live' && !hostGone;
    useWakeLock(playing);

    useEffect(() => {
        if (!rt) return undefined;
        return attachPresence(rt, roomPath(code, 'players', playerId));
    }, [rt, code, playerId]);

    // Music (the teacher can switch it off for student devices)
    const invasion = !!corsair?.boss && !corsair.boss.over;
    const track = settings.studentMusic === false || !meta || ended ? null : playing ? (invasion ? 'corsairBoss' : 'corsairs') : 'corsairLobby';
    useEffect(() => {
        if (track) audio.playMusic(track, { quantize: true });
        else audio.stopMusic();
    }, [track]);
    useEffect(() => () => audio.stopMusic(), []);

    // Teacher pressed "Play again": move to the new room with the same nickname
    const nextCode = meta?.nextCode;
    useEffect(() => {
        if (!nextCode || !me?.name || me.kicked) return undefined;
        let cancelled = false;
        joinRoom(nextCode, me.name)
            .catch(() => null)
            .then(() => {
                if (!cancelled) navigate(`/play/${nextCode}`);
            });
        return () => {
            cancelled = true;
        };
    }, [nextCode]); // eslint-disable-line react-hooks/exhaustive-deps

    const questions = useMemo(() => {
        const raw = Array.isArray(set?.questions) ? set.questions : Object.values(set?.questions || {});
        return raw.map(normalizeQuestion).filter(Boolean);
    }, [set]);

    if (error) return <Screen><WifiOff size={40} className="text-amber-300" /><p className="mt-3 font-bold">{t('roomErrors.connection')}</p></Screen>;
    if (!rt || meta === undefined || set === undefined || playersRaw === undefined) return <Screen><Spinner size={36} className="text-emerald-400" /></Screen>;
    if (!meta) return <Screen><p className="font-bold text-lg">{t('cc.noGame')}</p><Link to="/join" className="mt-6 px-6 py-3 rounded-2xl bg-emerald-500 text-gray-950 font-black">{t('cc.joinAnother')}</Link></Screen>;

    if (!me || me.kicked) {
        return (
            <Screen>
                <UserX size={44} className="text-rose-300" />
                <p className="mt-3 text-xl font-black">{t('roomErrors.kicked')}</p>
                <button onClick={onExit} className="mt-6 px-6 py-3 rounded-2xl bg-white/10 font-bold">{t('common.back')}</button>
            </Screen>
        );
    }

    const hostAway = !!host && !isOnline(host, now) && !ended;
    const hostBanner = hostAway && (
        <div className="fixed inset-x-0 z-40 flex justify-center px-4 pointer-events-none" style={{ bottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>
            <span className="px-3 py-1.5 rounded-full bg-amber-400 text-gray-950 text-xs font-black flex items-center gap-1.5 shadow-lg">
                <WifiOff size={13} /> {t('cc.paused')}
            </span>
        </div>
    );
    const ready = Number.isInteger(me.slot);

    // Final screen
    if (ended) {
        const ranking = rankPlayers(players);
        const myRank = ranking.findIndex(p => p.id === playerId) + 1;
        const pct = me.answered ? Math.round(((me.correct || 0) / me.answered) * 100) : 0;
        return (
            <Screen>
                <MuteButton />
                <Trophy size={48} className="text-amber-300" />
                <p className="mt-3 text-sm font-bold uppercase tracking-widest text-gray-400">{t('cc.gameOver')}</p>
                {(hostGone || meta.endReason === 'host-offline') && <p className="mt-1 text-sm text-amber-300 font-semibold max-w-xs">{t('cc.hostOffline')}</p>}
                <div className="mt-3 flex items-center gap-3">
                    <ShipIcon design={me.ship || 0} color={me.color} size={48} />
                    <div className="text-left">
                        <p className="text-2xl font-black">{myRank > 0 ? t('corsair.finished', { rank: myRank, count: ranking.length }) : me.name}</p>
                        <p className="text-lg font-bold text-cyan-300 flex items-center gap-1"><Gem size={18} /> {me.score || 0}</p>
                    </div>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                    {t('corsair.statsMined', { n: me.mined || 0 })} · {t('corsair.statsKills', { n: me.kills || 0 })} · {t('cc.correctPct', { pct })}
                </p>
                <ol className="mt-6 w-full max-w-xs space-y-1.5 text-left">
                    {ranking.slice(0, 5).map((p, i) => (
                        <li key={p.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${p.id === playerId ? 'bg-white/15' : 'bg-white/5'}`}>
                            <span className="w-6 font-black text-amber-300">{i + 1}</span>
                            <ShipIcon design={p.ship || 0} color={p.color} size={22} />
                            <span className="flex-1 min-w-0 truncate font-bold">{p.name}</span>
                            <span className="font-black tabular-nums text-cyan-300">{p.score}</span>
                        </li>
                    ))}
                </ol>
                {nextCode ? (
                    <p className="mt-8 text-emerald-300 font-bold flex items-center gap-2"><Spinner size={18} /> {t('cc.joiningNext')}</p>
                ) : (
                    <>
                        <p className="mt-8 text-sm text-gray-400 max-w-xs">{t('cc.stay')}</p>
                        <Link to="/join" onClick={() => leaveRoom(code, playerId)} className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 text-gray-950 font-black">
                            {t('cc.joinAnother')} <ArrowRight size={18} />
                        </Link>
                    </>
                )}
            </Screen>
        );
    }

    if (playing && corsair && ready && questions.length > 0) {
        return (
            <>
                {hostBanner}
                <Bridge rt={rt} code={code} playerId={playerId} me={me} players={players} corsair={corsair} settings={settings} questions={questions} endsAt={meta.endsAt} now={now} />
            </>
        );
    }

    const leave = async () => {
        await leaveRoom(code, playerId);
        onExit();
    };

    // Lobby
    return (
        <Screen>
            {hostBanner}
            <MuteButton />
            <Avatar color={me.color} name={me.name} size={84} />
            <p className="mt-4 text-3xl font-black break-words max-w-full">{me.name}</p>
            <p className="mt-2 text-emerald-300 font-bold">{t('cc.youreIn')}</p>
            {ready ? <ShipPicker rt={rt} code={code} playerId={playerId} me={me} /> : <p className="mt-5 text-gray-300 font-bold flex items-center gap-2"><Spinner size={16} /> {t('corsair.docking')}</p>}
            <p className="mt-6 text-gray-300 max-w-xs">{t('cc.watch')}</p>
            <button onClick={leave} className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white">
                <LogOut size={16} /> {t('cc.leave')}
            </button>
        </Screen>
    );
};

export default PlayerScreen;
