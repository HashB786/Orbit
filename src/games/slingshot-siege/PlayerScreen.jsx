import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, LogOut, WifiOff, UserX, ArrowRight, Rocket, Check, X, Sun, Orbit as OrbitIcon, RotateCcw, RotateCw, Minus, Plus } from 'lucide-react';
import { Spinner } from '../../components/ui';
import { useRealtime, useRoomValue, useServerNow, formatClock } from '../../platform/rooms/hooks';
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
import AnswerPad from './AnswerPad';
import { ArenaView } from './arena';
import { aimVector, clampPower, defaultAim, planetPos, simulate, PLANET_R } from './physics';
import { teamOf, rankTeams } from './teams';

const answerOf = (round) => (round.kind === 'order'
    ? [...round.options].sort((a, b) => a.order - b.order).map(o => o.text).join(' → ')
    : round.options.filter(o => o.correct).map(o => o.text).join(', '));

const toAim = ({ angle, power }) => ({ ...aimVector(angle), p: clampPower(power) });

const nudge = 'w-10 h-10 shrink-0 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 flex items-center justify-center';

const TeamDot = ({ team, size = 14 }) => (
    <span className="inline-block rounded-full shrink-0" style={{ width: size, height: size, background: teamOf(team).color, boxShadow: `0 0 10px ${teamOf(team).color}88` }} />
);

// ---------- aiming and launching ----------

const LaunchBay = ({ team, count, teams, phase, shot, aimRef, onLaunch, onLanded }) => {
    const t = useT();
    const { performance } = useTheme();
    const canvasRef = useRef(null);
    const viewRef = useRef(null);
    const aim = useRef(aimRef.current || defaultAim(team, count));
    const drag = useRef(null); // pointerId while a finger/pen/mouse button is down
    const [power, setPower] = useState(aim.current.power);
    const touch = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

    useEffect(() => {
        const view = new ArenaView(canvasRef.current, { lowFx: !performance.particles || performance.reducedMotion, myTeam: team });
        viewRef.current = view;
        view.setState(count, teams);
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
        viewRef.current?.setState(count, teams);
    }, [count, teams]);

    useEffect(() => {
        viewRef.current?.setAim(phase === 'aim' ? toAim(aim.current) : null);
    }, [phase]);

    // Fly my own comet (the teacher's screen flies the same one)
    useEffect(() => {
        if (!shot) return;
        viewRef.current?.addComet({ team, flight: shot.flight, onLand: () => onLanded(shot) });
    }, [shot]); // eslint-disable-line react-hooks/exhaustive-deps

    const setAim = (next) => {
        aim.current = next;
        aimRef.current = next;
        setPower(next.power);
        viewRef.current?.setAim(toAim(next));
    };

    // Direction from my planet to the pointer; distance sets the power
    const aimAt = (e) => {
        const view = viewRef.current;
        if (!view) return null;
        const rect = canvasRef.current.getBoundingClientRect();
        const w = view.toWorld(e.clientX - rect.left, e.clientY - rect.top);
        const from = planetPos(team, count);
        const dx = w.x - from.x;
        const dy = w.y - from.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) return dist;
        setAim({ angle: Math.atan2(dy, dx), power: Math.min(1, Math.max(0, (dist - PLANET_R - 20) / 300)) });
        return dist;
    };

    const launch = () => {
        if (phase !== 'aim') return;
        onLaunch(aim.current);
    };

    // Fine-tuning for any device: the buttons below, or the arrow keys
    const turn = (deg) => setAim({ ...aim.current, angle: aim.current.angle + (deg * Math.PI) / 180 });
    const push = (dp) => setAim({ ...aim.current, power: Math.min(1, Math.max(0, Math.round((aim.current.power + dp) * 100) / 100)) });

    const onPointerDown = (e) => {
        if (phase !== 'aim') return;
        e.preventDefault();
        audio.unlock();
        drag.current = e.pointerId;
        canvasRef.current.setPointerCapture?.(e.pointerId);
        aimAt(e);
    };
    const onPointerMove = (e) => {
        if (phase !== 'aim') return;
        if (drag.current === e.pointerId || (e.pointerType === 'mouse' && drag.current === null)) aimAt(e);
    };
    const onPointerUp = (e) => {
        if (drag.current !== e.pointerId) return;
        drag.current = null;
        // Letting go on your own planet cancels instead of launching
        const dist = aimAt(e);
        if (dist !== null && dist > PLANET_R * 1.15) launch();
    };

    // Keyboard: ← → aim, ↑ ↓ power, Space / Enter launch
    useEffect(() => {
        const onKey = (e) => {
            if (phase !== 'aim') return;
            const step = e.shiftKey ? 5 : 1;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                turn(e.key === 'ArrowLeft' ? -step : step);
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                push(e.key === 'ArrowUp' ? 0.01 * step : -0.01 * step);
            } else if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                launch();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    return (
        <div className="flex-1 min-h-0 flex flex-col">
            <div className="relative flex-1 min-h-0">
                <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 w-full h-full block touch-none ${phase === 'aim' ? 'cursor-crosshair' : ''}`}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={() => { drag.current = null; }}
                />
            </div>
            {phase === 'aim' && (
                <div className="shrink-0 px-3 sm:px-5 pt-2 pb-3 pb-safe border-t border-white/10 bg-[#070b1d]">
                    <p className="text-center text-xs sm:text-sm font-bold text-gray-300">{touch ? t('siege.aimTouch') : t('siege.aimMouse')}</p>
                    {!touch && <p className="hidden sm:block text-center text-[11px] text-gray-500 mt-0.5">{t('siege.aimKeys')}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-2 max-w-2xl mx-auto">
                        <button type="button" onClick={() => turn(-1)} aria-label={t('siege.turnLeft')} className={nudge}><RotateCcw size={17} /></button>
                        <button type="button" onClick={() => turn(1)} aria-label={t('siege.turnRight')} className={nudge}><RotateCw size={17} /></button>
                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('siege.power')}</span>
                        <button type="button" onClick={() => push(-0.02)} aria-label={t('siege.lessPower')} className={nudge}><Minus size={17} /></button>
                        <div className="flex-1 min-w-[4rem] h-2.5 rounded-full bg-white/10 overflow-hidden" role="meter" aria-label={t('siege.power')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(power * 100)}>
                            <div className="h-full rounded-full" style={{ width: `${Math.round(power * 100)}%`, background: teamOf(team).color }} />
                        </div>
                        <button type="button" onClick={() => push(0.02)} aria-label={t('siege.morePower')} className={nudge}><Plus size={17} /></button>
                        <button type="button" onClick={launch} className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black flex items-center justify-center gap-2">
                            <Rocket size={18} /> {t('siege.launch')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ---------- the game loop on one device ----------

const Battle = ({ rt, code, playerId, me, siege, settings, questions, endsAt, now }) => {
    const t = useT();
    const sound = settings.studentSound !== false;
    const count = siege.count || 2;
    const team = me.team;
    const pool = useMemo(() => decoyPool(questions), [questions]);
    const deck = useRef({ order: [], retry: [], served: 0, last: -1 });
    const aimRef = useRef(null); // the last aim is kept for the next launch
    const timers = useRef([]);
    const [phase, setPhase] = useState('question'); // question | feedback | aim | flying | landed
    const [card, setCard] = useState(null); // { index, round, seconds, id }
    const [feedback, setFeedback] = useState(null); // { ok, answer, timeUp }
    const [shot, setShot] = useState(null); // { key, flight }

    const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    // Next question: missed ones come back a few questions later
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
        setShot(null);
        setPhase('question');
    };

    useEffect(() => {
        nextCard();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const answer = (ok, picked, timeUp = false) => {
        if (phase !== 'question' || !card) return;
        rt.set(roomPath(code, 'inbox', playerId, rt.newKey()), { k: 'a', q: card.index, ok }).catch(() => {});
        if (!ok) deck.current.retry.push({ index: card.index, due: deck.current.served + 3 });
        if (sound) audio.sfx(ok ? 'correct' : 'wrong');
        setFeedback({ ok, answer: answerOf(card.round), timeUp });
        setPhase('feedback');
        later(() => (ok ? setPhase('aim') : nextCard()), ok ? 900 : 2000);
    };

    const launch = (aim) => {
        if (phase !== 'aim') return;
        const { dx, dy, p } = toAim(aim);
        const key = rt.newKey();
        rt.set(roomPath(code, 'inbox', playerId, key), { k: 's', dx, dy, p }).catch(() => {});
        if (sound) audio.sfx('launch');
        setShot({ key, flight: simulate(team, count, dx, dy, p) });
        setPhase('flying');
    };

    const landed = (s) => {
        if (sound) audio.sfx(s.flight.end === 'hit' ? 'impact' : s.flight.end === 'sun' ? 'burn' : 'fizzle');
        setPhase('landed');
        later(nextCard, 2200);
    };

    // The teacher's screen confirms the points (and whether it was a slingshot)
    const result = shot && me.last?.k === shot.key ? me.last : null;
    useEffect(() => {
        if (result?.sling && sound) audio.sfx('slingshot');
    }, [result?.k]); // eslint-disable-line react-hooks/exhaustive-deps

    const teamInfo = siege.teams?.[team] || {};
    const flight = shot?.flight;
    const inBay = phase === 'aim' || phase === 'flying' || phase === 'landed';

    return (
        <div className="app-height w-full flex flex-col bg-[#040714] text-white select-none overflow-hidden">
            <div className="shrink-0 bg-[#070b1d] border-b border-white/10 pt-safe">
                <div className="flex items-center justify-between gap-2 px-3 sm:px-5 h-14">
                    <div className="flex items-center gap-2 min-w-0">
                        <TeamDot team={team} size={16} />
                        <span className="font-black truncate">{teamOf(team).name}</span>
                        <span className="font-black text-xl tabular-nums">{teamInfo.score || 0}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-300 tabular-nums">{formatClock(endsAt - now)}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 hidden min-[380px]:inline">{me.name}</span>
                        <span className="font-black text-xl tabular-nums">{me.score || 0}</span>
                        <MuteButton inline />
                    </div>
                </div>
            </div>

            {!inBay && card && (
                <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col">
                    <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 my-auto">
                        {card.seconds > 0 && (
                            <div className="flex justify-center">
                                <QuestionTimer key={card.id} seconds={card.seconds} running={phase === 'question'} onExpire={() => answer(false, null, true)} size={56} sound={sound} />
                            </div>
                        )}
                        <p className="text-center text-xl sm:text-3xl font-black leading-snug break-words">{card.round.prompt}</p>
                        <AnswerPad round={card.round} onAnswer={answer} disabled={phase !== 'question'} />
                    </div>
                </div>
            )}

            {inBay && (
                <LaunchBay
                    team={team}
                    count={count}
                    teams={siege.teams}
                    phase={phase}
                    shot={shot}
                    aimRef={aimRef}
                    onLaunch={launch}
                    onLanded={landed}
                />
            )}

            {/* Answer feedback */}
            {phase === 'feedback' && feedback && (
                <div className="fixed inset-x-0 bottom-0 z-20 p-3 sm:p-4 pb-safe flex justify-center pointer-events-none">
                    <div className={`w-full max-w-md rounded-3xl border p-5 text-center shadow-2xl ${feedback.ok ? 'bg-emerald-950/95 border-emerald-400/40' : 'bg-[#1a0b16]/95 border-rose-400/40'}`}>
                        {feedback.ok ? (
                            <p className="text-2xl font-black text-emerald-300 flex items-center justify-center gap-2"><Check size={26} /> {t('siege.earned')}</p>
                        ) : (
                            <>
                                <p className="text-2xl font-black text-rose-300 flex items-center justify-center gap-2"><X size={26} /> {feedback.timeUp ? t('cc.timeUp') : t('siege.wrongAnswer')}</p>
                                <p className="mt-2 text-sm text-gray-300 break-words"><Slots text={t('cc.answer')} slots={{ answer: <b className="text-white">{feedback.answer}</b> }} /></p>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Where my comet ended up */}
            {phase === 'landed' && flight && (
                <div className="fixed inset-x-0 bottom-0 z-20 p-3 sm:p-4 pb-safe flex justify-center pointer-events-none">
                    <div className="w-full max-w-md rounded-3xl bg-[#0b1128]/95 border border-white/10 p-5 text-center shadow-2xl">
                        {flight.end === 'hit' ? (
                            <>
                                <p className="text-2xl font-black flex items-center justify-center gap-2" style={{ color: teamOf(flight.target).color }}>
                                    <OrbitIcon size={24} /> {t('siege.hit', { team: teamOf(flight.target).name })}
                                </p>
                                {result && <p className="text-4xl font-black text-emerald-300 tabular-nums mt-1">+{result.pts}</p>}
                                {result?.sling && <p className="text-amber-300 font-black mt-1">{t('siege.slingshot')}</p>}
                            </>
                        ) : flight.end === 'sun' ? (
                            <p className="text-2xl font-black text-orange-300 flex items-center justify-center gap-2"><Sun size={24} /> {t('siege.sun')}</p>
                        ) : (
                            <p className="text-2xl font-black text-gray-300">{t('siege.lost')}</p>
                        )}
                    </div>
                </div>
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
    const me = useRoomValue(rt, roomPath(code, 'players', playerId));
    const siege = useRoomValue(rt, roomPath(code, 'siege'));
    const set = useRoomValue(rt, roomPath(code, 'set'));
    const host = useRoomValue(rt, roomPath(code, 'host'));
    const now = useServerNow(rt, 1000);
    const settings = meta?.settings || {};

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
    const track = settings.studentMusic === false || !meta || ended ? null : playing ? 'siege' : 'playerLobby';
    useEffect(() => {
        if (track) audio.playMusic(track);
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
    if (!rt || meta === undefined || me === undefined || set === undefined) return <Screen><Spinner size={36} className="text-emerald-400" /></Screen>;
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
        <div className="fixed inset-x-0 z-30 flex justify-center px-4 pointer-events-none" style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}>
            <span className="px-3 py-1.5 rounded-full bg-amber-400 text-gray-950 text-xs font-black flex items-center gap-1.5 shadow-lg">
                <WifiOff size={13} /> {t('cc.paused')}
            </span>
        </div>
    );
    const hasTeam = Number.isInteger(me.team);

    // Final screen
    if (ended) {
        const ranking = rankTeams(siege);
        const myRank = hasTeam ? ranking.findIndex(r => r.i === me.team) + 1 : 0;
        const pct = me.answered ? Math.round(((me.correct || 0) / me.answered) * 100) : 0;
        return (
            <Screen>
                <MuteButton />
                <Trophy size={48} className="text-amber-300" />
                <p className="mt-3 text-sm font-bold uppercase tracking-widest text-gray-400">{t('cc.gameOver')}</p>
                {(hostGone || meta.endReason === 'host-offline') && <p className="mt-1 text-sm text-amber-300 font-semibold max-w-xs">{t('cc.hostOffline')}</p>}
                {myRank > 0 && (
                    <p className="mt-2 text-2xl font-black flex items-center gap-2">
                        <TeamDot team={me.team} size={18} /> {t('siege.teamRank', { team: teamOf(me.team).name, rank: myRank })}
                    </p>
                )}
                <p className="text-xl font-bold mt-2">{me.name} · {t('cc.points', { count: me.score || 0 })}</p>
                <p className="text-sm text-gray-400 mt-1">{t('siege.hits', { count: me.hits || 0 })} · {t('cc.correctPct', { pct })}</p>
                <ol className="mt-6 w-full max-w-xs space-y-1.5 text-left">
                    {ranking.map((r, i) => (
                        <li key={r.i} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${r.i === me.team ? 'bg-white/15' : 'bg-white/5'}`}>
                            <span className="w-6 font-black text-amber-300">{i + 1}</span>
                            <TeamDot team={r.i} />
                            <span className="flex-1 min-w-0 truncate font-bold">{teamOf(r.i).name}</span>
                            <span className="font-black tabular-nums">{r.score}</span>
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

    if (playing && siege && hasTeam && questions.length > 0) {
        return (
            <>
                {hostBanner}
                <Battle rt={rt} code={code} playerId={playerId} me={me} siege={siege} settings={settings} questions={questions} endsAt={meta.endsAt} now={now} />
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
            {hasTeam ? (
                <p className="mt-5 px-5 py-2.5 rounded-2xl bg-white/10 text-lg font-black flex items-center gap-2.5">
                    <TeamDot team={me.team} size={18} /> {t('siege.yourTeam', { team: teamOf(me.team).name })}
                </p>
            ) : (
                <p className="mt-5 text-gray-300 font-bold flex items-center gap-2"><Spinner size={16} /> {t('siege.joiningTeam')}</p>
            )}
            <p className="mt-6 text-gray-300 max-w-xs">{t('cc.watch')}</p>
            <button onClick={leave} className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white">
                <LogOut size={16} /> {t('cc.leave')}
            </button>
        </Screen>
    );
};

export default PlayerScreen;
