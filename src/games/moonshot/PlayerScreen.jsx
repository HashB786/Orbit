import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Trophy, LogOut, WifiOff, UserX, ArrowRight, Check, X, Zap, Rocket, BookOpen, ChevronUp, Shield, Wind, Flame
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
import { ClimbView } from './view';
import { Climber } from './climber';
import { makeWorld, stormAt, BOOST, ZONES, zoneAt } from './world';

const answerOf = (round) => (round.kind === 'order'
    ? [...round.options].sort((a, b) => a.order - b.order).map(o => o.text).join(' → ')
    : round.options.filter(o => o.correct).map(o => o.text).join(', '));

// A big round control for touch screens
const Pad = ({ onHold, children, label, className = '', disabled = false }) => (
    <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture?.(e.pointerId);
            audio.unlock();
            onHold(true);
        }}
        onPointerUp={() => onHold(false)}
        onPointerCancel={() => onHold(false)}
        onPointerLeave={(e) => { if (e.buttons) onHold(false); }}
        onContextMenu={e => e.preventDefault()}
        className={`touch-none select-none flex items-center justify-center rounded-full border-2 font-black shadow-xl disabled:opacity-40 ${className}`}
    >
        {children}
    </button>
);

// ---------- the climb on one device ----------

const Climb = ({ rt, code, playerId, me, players, settings, questions, seed, startedAt, endsAt, now }) => {
    const t = useT();
    const { performance: perf } = useTheme();
    const sound = settings.studentSound !== false;
    const canvasRef = useRef(null);
    const viewRef = useRef(null);
    const climberRef = useRef(null);
    const pool = useMemo(() => decoyPool(questions), [questions]);
    const deck = useRef({ order: [], retry: [], served: 0, last: -1 });
    const timers = useRef([]);
    const [, bump] = useReducer(x => x + 1, 0);
    const [hud, setHud] = useState({ alt: 0, best: 0, fuel: 0, range: 0, ground: true, storm: -5, zone: 0 });
    const [card, setCard] = useState(null);
    const [phase, setPhase] = useState('climb'); // climb | question | feedback
    const [feedback, setFeedback] = useState(null);
    const [toast, setToast] = useState(null);
    const [flash, setFlash] = useState(0);
    const touch = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

    const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
    useEffect(() => () => timers.current.forEach(clearTimeout), []);
    const sfx = (name) => {
        if (sound) audio.sfx(name);
    };
    const say = (text, tone = 'info') => {
        const id = `${Date.now()}`;
        setToast({ id, text, tone });
        later(() => setToast(x => (x?.id === id ? null : x)), 2400);
    };

    const ranking = rankPlayers(players);
    const myRank = ranking.findIndex(p => p.id === playerId) + 1;
    const zoneName = t(`games.climb.zones.${ZONES[hud.zone]?.key || 'pad'}`);
    const danger = hud.storm > hud.alt - 12;

    // ----- the climber and its view -----
    useEffect(() => {
        const world = makeWorld(seed, settings);
        const climber = new Climber({
            rt,
            pid: playerId,
            world,
            me,
            startedAt,
            write: (text) => rt.set(roomPath(code, 'climbers', playerId), text).catch(() => {}),
            report: (msg) => rt.set(roomPath(code, 'inbox', playerId, rt.newKey()), { k: 's', ...msg, at: rt.now() }).catch(() => {}),
            on: {
                sound: (name) => { if (sound) audio.sfx(name); },
                zone: (z) => {
                    sfx('zoneUp');
                    say(t('climb.reached', { zone: t(`games.climb.zones.${ZONES[z].key}`) }), 'good');
                },
                caught: () => {
                    setFlash(x => x + 1);
                    say(t('climb.caught'), 'bad');
                }
            }
        });
        climberRef.current = climber;
        const view = new ClimbView(canvasRef.current, { lowFx: !perf.particles || perf.reducedMotion });
        viewRef.current = view;
        climber.attach(view);
        view.setDriver((dt) => climber.step(dt));
        const off = rt.onValue(roomPath(code, 'climbers'), v => climber.setRaw(v || {}));
        view.mount();
        const observer = new ResizeObserver(() => view.resize());
        observer.observe(canvasRef.current);
        // The HUD follows at a calm pace, not every frame
        const hudTimer = setInterval(() => {
            const c = climberRef.current;
            if (!c) return;
            setHud({
                alt: c.alt(),
                best: c.best,
                fuel: c.fuel,
                range: c.range(),
                ground: c.p.ground,
                storm: stormAt(c.world, c.tau()) - c.carried,
                zone: zoneAt(c.alt())
            });
        }, 120);
        return () => {
            clearInterval(hudTimer);
            off();
            observer.disconnect();
            view.destroy();
            viewRef.current = null;
            climberRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (climberRef.current) climberRef.current.startedAt = startedAt;
    }, [startedAt]);
    useEffect(() => {
        climberRef.current?.setData({ me, players, settings });
    });

    // ----- questions -----
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
        if (!built) return null;
        d.last = built.index;
        const seconds = settings.timer
            ? secondsFor(questions[built.index], Number(settings.timerSeconds) || 30, settings.useQuestionTime !== false)
            : 0;
        return { ...built, seconds, id: d.served };
    };

    const openQuestion = () => {
        if (phase !== 'climb' || !climberRef.current?.p.ground) return;
        const next = nextCard();
        if (!next) return;
        audio.unlock();
        setCard(next);
        setFeedback(null);
        setPhase('question');
        climberRef.current.setAnswering(true);
    };

    const closeQuestion = () => {
        setPhase('climb');
        setCard(null);
        climberRef.current?.setAnswering(false);
    };

    const answer = (ok, picked, timeUp = false) => {
        if (phase !== 'question' || !card) return;
        rt.set(roomPath(code, 'inbox', playerId, rt.newKey()), { k: 'a', q: card.index, ok, at: rt.now() }).catch(() => {});
        if (!ok) deck.current.retry.push({ index: card.index, due: deck.current.served + 3 });
        const gained = ok ? climberRef.current?.refuel() || 0 : 0;
        sfx(ok ? 'correct' : 'wrong');
        setFeedback({ ok, gained, answer: answerOf(card.round), timeUp });
        setPhase('feedback');
        later(closeQuestion, ok ? 900 : 1900);
    };

    // ----- controls -----
    const hold = (key, on) => {
        const c = climberRef.current;
        if (!c) return;
        if (key === 'jump' && on && !c.held.jump) c.jumpAt = c.tau();
        c.held[key] = on;
        if (key === 'jump') bump();
    };
    useEffect(() => {
        const map = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'jump', w: 'jump', ' ': 'jump' };
        const onDown = (e) => {
            if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
            const k = e.key.toLowerCase();
            if (phase !== 'climb') {
                if (k === 'escape' && phase === 'question') closeQuestion();
                return;
            }
            if (map[k]) {
                e.preventDefault();
                hold(map[k], true);
            } else if (k === 'r' || k === 'enter') {
                e.preventDefault();
                openQuestion();
            }
        };
        const onUp = (e) => {
            const k = map[e.key.toLowerCase()];
            if (k) hold(k, false);
        };
        const clear = () => {
            const c = climberRef.current;
            if (c) c.held = { left: false, right: false, jump: false };
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

    const fuelPct = Math.round((hud.fuel / BOOST.tank) * 100);
    // Out of fuel means no more climbing, so the button asks for attention
    const dry = hud.range < 1.2;
    const toneClass = { good: 'bg-emerald-500 text-gray-950', bad: 'bg-rose-500 text-white', info: 'bg-white/90 text-gray-950' };

    return (
        <div className="app-height w-full flex flex-col bg-[#03050f] text-white select-none overflow-hidden">
            {/* HUD */}
            <div className="shrink-0 bg-[#070b1d] border-b border-white/10 pt-safe z-20">
                <div className="flex items-center justify-between gap-2 px-3 sm:px-5 h-11">
                    <span className="font-black text-xl tabular-nums flex items-baseline gap-1">
                        {Math.round(hud.alt)}<span className="text-xs text-gray-400">m</span>
                        <span className="text-xs text-emerald-300 ml-1">{t('climb.bestShort', { n: Math.round(hud.best) })}</span>
                    </span>
                    <span className="text-sm font-bold text-gray-300 tabular-nums">{formatClock(endsAt - now)}</span>
                    <div className="flex items-center gap-2">
                        {myRank > 0 && <span className="text-sm font-black text-gray-300">#{myRank}</span>}
                        <MuteButton inline />
                    </div>
                </div>
                <div className="flex items-center gap-3 px-3 sm:px-5 pb-2">
                    <span className="flex items-center gap-1.5 flex-1 min-w-0" title={t('climb.fuel')}>
                        <Zap size={15} className="text-yellow-300 fill-current shrink-0" />
                        <span className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden max-w-[13rem]">
                            <span className={`block h-full rounded-full transition-[width] duration-150 ${dry ? 'bg-rose-400' : 'bg-yellow-300'}`} style={{ width: `${fuelPct}%` }} />
                        </span>
                        <span className={`text-xs font-black tabular-nums shrink-0 ${dry ? 'text-rose-300' : 'text-yellow-200'}`}>{t('climb.fuelRange', { n: Math.floor(hud.range) })}</span>
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider" style={{ color: ZONES[hud.zone]?.tint }}>{zoneName}</span>
                </div>
            </div>

            {danger && (
                <p className="shrink-0 px-3 py-1 bg-fuchsia-500/20 border-b border-fuchsia-400/40 text-xs sm:text-sm font-black text-fuchsia-200 text-center flex items-center justify-center gap-1.5 z-20">
                    <Wind size={14} /> {t('climb.stormNear')}
                </p>
            )}

            {/* The climb */}
            <div className="relative flex-1 min-h-0">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block touch-none" aria-label={t('climb.tower')} />

                {phase === 'climb' && (
                    <>
                        <button
                            type="button"
                            onClick={openQuestion}
                            disabled={!hud.ground}
                            className={`absolute left-1/2 -translate-x-1/2 top-3 z-10 h-11 px-4 rounded-2xl font-black text-sm flex items-center gap-1.5 shadow-xl transition-colors ${hud.ground ? 'bg-emerald-500 hover:bg-emerald-400 text-gray-950' : 'bg-white/10 text-gray-400'} ${dry && hud.ground ? 'animate-pulse' : ''}`}
                        >
                            <BookOpen size={17} /> {t('climb.refuel')}
                        </button>

                        {touch ? (
                            <>
                                <div className="absolute left-3 bottom-3 pb-safe flex gap-3 z-10">
                                    <Pad onHold={(on) => hold('left', on)} label={t('climb.left')} className="w-20 h-20 bg-white/10 border-white/25 active:bg-white/20">
                                        <ArrowRight size={30} className="rotate-180" />
                                    </Pad>
                                    <Pad onHold={(on) => hold('right', on)} label={t('climb.right')} className="w-20 h-20 bg-white/10 border-white/25 active:bg-white/20">
                                        <ArrowRight size={30} />
                                    </Pad>
                                </div>
                                <div className="absolute right-3 bottom-3 pb-safe z-10">
                                    <Pad onHold={(on) => hold('jump', on)} label={t('climb.jump')} className="w-24 h-24 bg-sky-500/90 border-sky-200 text-white active:bg-sky-400 flex-col gap-0">
                                        <ChevronUp size={34} />
                                        <span className="text-[11px] -mt-1">{t('climb.jumpHint')}</span>
                                    </Pad>
                                </div>
                            </>
                        ) : (
                            <p className="absolute bottom-2 inset-x-0 text-center text-[11px] text-gray-400 pointer-events-none">{t('climb.keys')}</p>
                        )}
                    </>
                )}

                {/* The question card: a safe bubble while it is open */}
                {phase !== 'climb' && card && (
                    <div className="absolute inset-0 z-20 bg-[#03050f]/95 overflow-y-auto">
                        <div className="min-h-full w-full max-w-3xl mx-auto px-3 sm:px-6 py-4 flex flex-col gap-4">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-black text-emerald-300 flex items-center gap-1.5"><Shield size={16} /> {t('climb.safePad')}</p>
                                <button type="button" onClick={closeQuestion} className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 font-bold text-sm flex items-center gap-1.5">
                                    <X size={15} /> {t('climb.backToClimb')}
                                </button>
                            </div>
                            <div className="flex-1 flex flex-col gap-4 justify-center">
                                {card.seconds > 0 && (
                                    <div className="flex justify-center">
                                        <QuestionTimer key={card.id} seconds={card.seconds} running={phase === 'question'} onExpire={() => answer(false, null, true)} size={56} sound={sound} />
                                    </div>
                                )}
                                <p className="text-center text-xl sm:text-3xl font-black leading-snug break-words">{card.round.prompt}</p>
                                <AnswerPad round={card.round} onAnswer={answer} disabled={phase !== 'question'} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Answer feedback */}
                {phase === 'feedback' && feedback && (
                    <div className="absolute inset-x-0 bottom-0 z-30 p-3 pb-safe flex justify-center pointer-events-none">
                        <div className={`w-full max-w-md rounded-3xl border p-4 text-center shadow-2xl ${feedback.ok ? 'bg-emerald-950/95 border-emerald-400/40' : 'bg-[#1a0b16]/95 border-rose-400/40'}`}>
                            {feedback.ok ? (
                                <>
                                    <p className="text-2xl font-black text-emerald-300 flex items-center justify-center gap-2"><Check size={26} /> {t('climb.correct')}</p>
                                    <p className="mt-1 text-3xl font-black text-yellow-300 flex items-center justify-center gap-1"><Zap size={26} className="fill-current" />+{feedback.gained}</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-2xl font-black text-rose-300 flex items-center justify-center gap-2"><X size={26} /> {feedback.timeUp ? t('cc.timeUp') : t('climb.wrong')}</p>
                                    <p className="mt-2 text-sm text-gray-300 break-words"><Slots text={t('cc.answer')} slots={{ answer: <b className="text-white">{feedback.answer}</b> }} /></p>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* News */}
                {toast && (
                    <div className="absolute inset-x-0 top-14 z-30 flex justify-center px-3 pointer-events-none" aria-live="polite">
                        <p className={`max-w-md px-4 py-2 rounded-2xl text-sm font-black shadow-xl text-center ${toneClass[toast.tone]}`}>{toast.text}</p>
                    </div>
                )}
            </div>

            {flash > 0 && (
                <motion.div key={flash} initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }} className="fixed inset-0 z-20 pointer-events-none" style={{ boxShadow: 'inset 0 0 120px 30px rgba(192, 132, 252, 0.85)' }} />
            )}
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
    const track = settings.studentMusic === false || !meta || ended ? null : playing ? 'moonshot' : 'corsairLobby';
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
        <div className="fixed inset-x-0 z-40 flex justify-center px-4 pointer-events-none" style={{ bottom: 'calc(8rem + env(safe-area-inset-bottom))' }}>
            <span className="px-3 py-1.5 rounded-full bg-amber-400 text-gray-950 text-xs font-black flex items-center gap-1.5 shadow-lg">
                <WifiOff size={13} /> {t('cc.paused')}
            </span>
        </div>
    );

    // Final screen
    if (ended) {
        const ranking = rankPlayers(players);
        const myRank = ranking.findIndex(p => p.id === playerId) + 1;
        const pct = me.answered ? Math.round(((me.correct || 0) / me.answered) * 100) : 0;
        const zone = zoneAt(me.alt || 0);
        return (
            <Screen>
                <MuteButton />
                <Trophy size={48} className="text-amber-300" />
                <p className="mt-3 text-sm font-bold uppercase tracking-widest text-gray-400">{t('cc.gameOver')}</p>
                {(hostGone || meta.endReason === 'host-offline') && <p className="mt-1 text-sm text-amber-300 font-semibold max-w-xs">{t('cc.hostOffline')}</p>}
                <p className="mt-3 text-5xl font-black tabular-nums">{Math.round(me.alt || 0)}<span className="text-xl text-gray-400"> m</span></p>
                <p className="text-lg font-bold" style={{ color: ZONES[zone]?.tint }}>{t(`games.climb.zones.${ZONES[zone]?.key || 'pad'}`)}</p>
                {myRank > 0 && <p className="mt-1 text-xl font-black text-emerald-300">{t('climb.finished', { rank: myRank, count: ranking.length })}</p>}
                <p className="text-sm text-gray-400 mt-2">{t('cc.correctPct', { pct })} · {t('climb.fallsStat', { count: me.falls || 0 })}</p>
                <ol className="mt-6 w-full max-w-xs space-y-1.5 text-left">
                    {ranking.slice(0, 5).map((p, i) => (
                        <li key={p.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${p.id === playerId ? 'bg-white/15' : 'bg-white/5'}`}>
                            <span className="w-6 font-black text-amber-300">{i + 1}</span>
                            <Rocket size={16} style={{ color: p.color }} />
                            <span className="flex-1 min-w-0 truncate font-bold">{p.name}</span>
                            <span className="font-black tabular-nums">{Math.round(p.alt || 0)} m</span>
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

    if (playing && meta.seed && questions.length > 0) {
        return (
            <>
                {hostBanner}
                <Climb
                    rt={rt} code={code} playerId={playerId} me={me} players={players} settings={settings}
                    questions={questions} seed={meta.seed} startedAt={meta.startedAt} endsAt={meta.endsAt} now={now}
                />
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
            <div className="mt-6 w-full max-w-xs rounded-2xl bg-white/5 border border-white/10 p-4 text-left space-y-2 text-sm text-gray-300">
                <p className="font-black text-white flex items-center gap-2"><Rocket size={16} className="text-cyan-300" /> {t('climb.readyTitle')}</p>
                <p className="flex items-start gap-2"><ChevronUp size={15} className="mt-0.5 shrink-0 text-sky-300" />{t('climb.readyJump')}</p>
                <p className="flex items-start gap-2"><Zap size={15} className="mt-0.5 shrink-0 text-yellow-300" />{t('climb.readyFuel')}</p>
                <p className="flex items-start gap-2"><Rocket size={15} className="mt-0.5 shrink-0 text-cyan-300" />{t('climb.readyNoFuel')}</p>
                <p className="flex items-start gap-2"><Flame size={15} className="mt-0.5 shrink-0 text-fuchsia-300" />{t('climb.readyStorm')}</p>
            </div>
            <p className="mt-6 text-gray-300 max-w-xs">{t('cc.watch')}</p>
            <button onClick={leave} className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white">
                <LogOut size={16} /> {t('cc.leave')}
            </button>
        </Screen>
    );
};

export default PlayerScreen;
