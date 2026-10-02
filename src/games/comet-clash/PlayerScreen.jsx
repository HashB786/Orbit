import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Crown, Trophy, LogOut, Swords, Hourglass, WifiOff, UserX, Flag, Zap, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Spinner } from '../../components/ui';
import { useRealtime, useRoomValue, useServerNow, rankPlayers } from '../../platform/rooms/hooks';
import { roomPath, attachPresence, leaveRoom, isOnline, joinRoom } from '../../platform/rooms/rooms';
import { audio } from '../../platform/audio/audio';
import { useTheme } from '../../context/ThemeContext';
import { Playfield } from './playfield';
import { Screen, Avatar, MuteButton, roundHint, useTimeWarning } from './playerUi';
import ShowerPlay from './ShowerPlay';
import { useT } from '../../context/LanguageContext';
import Slots from '../../i18n/Slots';

// Keep phones awake while playing
const useWakeLock = (active) => {
    useEffect(() => {
        if (!active || !('wakeLock' in navigator)) return undefined;
        let lock = null;
        let released = false;
        const request = () => navigator.wakeLock.request('screen').then(l => { lock = l; }).catch(() => {});
        request();
        const onVisible = () => {
            if (!document.hidden && !released) request();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            released = true;
            document.removeEventListener('visibilitychange', onVisible);
            lock?.release().catch(() => {});
        };
    }, [active]);
};

// ---------- one duel (canvas lives here) ----------

const Duel = ({ rt, code, match, me, players, settings }) => {
    const t = useT();
    const { performance } = useTheme();
    const canvasRef = useRef(null);
    const fieldRef = useRef(null);
    const roundRef = useRef({ key: null, submitted: false, begun: false, offset: 0, leadTimer: 0, startTimer: 0 });
    const streakRef = useRef(0);
    const [progress, setProgress] = useState(null); // { found, total }
    const [phaseNote, setPhaseNote] = useState(null); // 'done' | 'timeout' | 'lost'
    const [countdown, setCountdown] = useState(null);
    const sound = settings.studentSound !== false;

    const rivalId = match.a === me ? match.b : match.a;
    const rival = rivalId === 'bot' ? { name: match.bot?.name || t('cc.bot'), color: '#94a3b8', bot: true } : players[rivalId] || { name: t('cc.rival') };
    const myPlayer = players[me] || {};
    const roundKey = `${match.id}:${match.round}`;

    // Reads only refs, so the playfield's event handler (created once) always writes to the current round
    const submit = (result) => {
        const r = roundRef.current;
        if (r.submitted || !r.key) return;
        const [matchId, round] = r.key.split(':');
        r.submitted = true;
        rt.set(roomPath(code, 'matches', matchId, 'results', round, me), result).catch(() => {
            r.submitted = false; // allow a retry if the write failed
        });
    };

    // Create the playfield once per duel
    useEffect(() => {
        const field = new Playfield(canvasRef.current, {
            lowFx: !performance.particles || performance.reducedMotion,
            sound,
            onEvent: (e) => {
                const r = roundRef.current;
                if (e.type === 'progress') setProgress({ found: e.found, total: e.total });
                if (e.type === 'complete') {
                    setPhaseNote('done');
                    submit({ ok: true, t: Math.round(e.t + r.offset), wrong: e.wrong });
                }
                if (e.type === 'timeout') {
                    setPhaseNote('timeout');
                    submit({ ok: false, t: null, wrong: e.wrong });
                }
            }
        });
        fieldRef.current = field;
        field.mount();
        const observer = new ResizeObserver(() => field.resize());
        observer.observe(canvasRef.current);
        return () => {
            observer.disconnect();
            field.destroy();
            fieldRef.current = null;
            clearTimeout(roundRef.current.leadTimer);
            clearTimeout(roundRef.current.startTimer);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // New round: countdown, then start at the shared start time
    useEffect(() => {
        const field = fieldRef.current;
        if (!field || match.status !== 'round' || !match.q) return undefined;
        const r = roundRef.current;
        // Same round on the same playfield: already set up
        if (r.key === roundKey && r.field === field) return undefined;
        clearTimeout(r.leadTimer);
        clearTimeout(r.startTimer);
        const already = match.results?.[match.round]?.[me];
        roundRef.current = { key: roundKey, field, submitted: !!already, begun: false, offset: 0, leadTimer: 0, startTimer: 0 };
        setProgress(null);
        setPhaseNote(already ? (already.ok ? 'done' : 'timeout') : null);
        setCountdown(null);
        field.clear();
        // Refreshed after answering: don't play the same round twice
        if (already) return undefined;

        const roundTime = (Number(settings.roundTime) || 15) * 1000;
        const timers = [];
        const begin = () => {
            const current = roundRef.current;
            if (current.key !== roundKey || current.begun) return;
            current.begun = true;
            const offset = Math.max(0, rt.now() - match.roundStartAt);
            current.offset = offset;
            setCountdown(null);
            if (sound) audio.sfx('go');
            field.startRound({
                kind: match.q.kind,
                options: match.q.options,
                seed: match.q.seed,
                speed: settings.speed,
                timeLimitMs: Math.max(2000, roundTime - offset),
                penalty: { stun: 1.5, timeCost: 0 }
            });
        };
        const delay = match.roundStartAt - rt.now();
        if (delay <= 0) begin();
        else {
            // 3-2-1 beeps
            [3, 2, 1].filter(n => delay - n * 450 > 0).forEach(n => timers.push(setTimeout(() => {
                setCountdown(n);
                if (sound) audio.sfx('countdown');
            }, delay - n * 450)));
            timers.push(setTimeout(begin, delay));
        }
        return () => {
            timers.forEach(clearTimeout);
            // Not started yet (e.g. React re-ran the effect): allow the next run to set it up again
            if (!roundRef.current.begun && roundRef.current.key === roundKey) roundRef.current.key = null;
        };
    }, [match.status, roundKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // Rival answered first: we can still win only if we beat their time on our own clock
    const lead = match.lead;
    useEffect(() => {
        const field = fieldRef.current;
        const r = roundRef.current;
        if (!field || !lead || lead.pid === me || r.key !== roundKey || r.submitted || !field.active) return undefined;
        const check = () => {
            if (r.submitted || !field.active) return;
            const elapsed = field.elapsed() + r.offset;
            if (elapsed >= lead.t) {
                field.stopRound('rival');
                setPhaseNote('lost');
                submit({ ok: false, lost: true, t: Math.round(elapsed), wrong: 0 });
            } else {
                r.leadTimer = setTimeout(check, lead.t - elapsed + 5);
            }
        };
        check();
        return () => clearTimeout(r.leadTimer);
    }, [lead?.pid, lead?.t, roundKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // Round resolved by the host — track streaks for exciting SFX
    const last = match.last;
    const lastKey = last ? `${match.id}:${last.round}` : null;
    useEffect(() => {
        if (match.status !== 'result' || !last) return;
        const field = fieldRef.current;
        if (field?.active) field.stopRound('reveal');
        if (!sound) return;
        const won = last.outcome === me || last.outcome === 'tie';
        if (won) {
            streakRef.current++;
            if (streakRef.current >= 3) audio.sfx('streak');
            else audio.sfx('roundWin');
        } else {
            if (streakRef.current >= 3) audio.sfx('streakBreak');
            else if (last.outcome === 'both-miss') audio.sfx('bothMiss');
            else audio.sfx('roundLose');
            streakRef.current = 0;
        }
    }, [match.status, lastKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // Duel over
    useEffect(() => {
        if (match.status !== 'done') return;
        fieldRef.current?.clear();
        if (!sound) return;
        if (match.outcome?.winner === me) audio.sfx('matchWin');
        else if (match.outcome?.winner) audio.sfx('matchLose');
    }, [match.status]); // eslint-disable-line react-hooks/exhaustive-deps

    // Intro: whoosh + fanfare for every new duel
    useEffect(() => {
        if (match.status === 'intro' && sound) {
            audio.sfx('whoosh');
            audio.sfx('gameStart');
        }
    }, [match.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const roundEndAt = match.roundStartAt ? match.roundStartAt + (Number(settings.roundTime) || 15) * 1000 : 0;
    useTimeWarning(sound && match.status === 'round' && !!match.q && !phaseNote, roundEndAt, () => rt.now());

    const myScore = match.scores?.[me] ?? 0;
    const rivalScore = match.scores?.[rivalId] ?? 0;
    const q = match.q;
    const rivalLead = lead && lead.pid !== me && match.status === 'round';

    return (
        <div className="app-height w-full flex flex-col bg-[#040714] text-white select-none overflow-hidden">
            {/* HUD */}
            <div className="shrink-0 bg-[#070b1d] border-b border-white/10 pt-safe">
                <div className="flex items-center justify-between gap-2 px-3 sm:px-5 h-14">
                    <div className="flex items-center gap-2 min-w-0">
                        <Avatar color={myPlayer.color} name={myPlayer.name} size={30} />
                        <span className="font-black text-2xl tabular-nums">{myScore}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 min-w-0">
                        {match.sudden
                            ? <span className="px-2 py-0.5 rounded-full bg-amber-400 text-gray-950 text-xs font-black uppercase">{t('cc.sudden')}</span>
                            : <span className="text-xs sm:text-sm font-bold text-gray-400 whitespace-nowrap">{t('cc.round', { n: Math.max(1, match.round), total: match.rounds })}</span>}
                        <MuteButton inline />
                    </div>
                    <div className="flex items-center gap-2 min-w-0 justify-end">
                        <span className="font-black text-2xl tabular-nums">{rivalScore}</span>
                        <span className="hidden sm:block text-sm font-bold truncate max-w-[8rem]">{rival.name}</span>
                        {rival.bot ? <span className="w-[30px] h-[30px] rounded-full bg-slate-400 text-gray-950 flex items-center justify-center shrink-0"><Bot size={17} /></span> : <Avatar color={rival.color} name={rival.name} size={30} />}
                    </div>
                </div>
                <div className="px-3 sm:px-6 pb-3 text-center min-h-[2.75rem]">
                    {match.status === 'round' && q && (
                        <>
                            <p className="max-w-3xl mx-auto text-base sm:text-xl md:text-2xl font-bold leading-snug line-clamp-3 break-words">{q.prompt}</p>
                            {q.kind !== 'single' && !phaseNote && (
                                <p className="mt-1.5 text-xs sm:text-sm font-bold text-emerald-300">
                                    {roundHint(t, q.kind, progress)}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Playfield */}
            <div className="relative flex-1 min-h-0">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block touch-none cursor-crosshair" />

                {rivalLead && !phaseNote && (
                    <div className="pointer-events-none absolute top-3 inset-x-0 flex justify-center px-4">
                        <span className="px-3 py-1.5 rounded-full bg-amber-400 text-gray-950 text-sm font-black flex items-center gap-1.5 animate-pulse">
                            <Zap size={14} /> {t('cc.foundIt', { name: rival.name })}
                        </span>
                    </div>
                )}
                {phaseNote === 'done' && match.status === 'round' && (
                    <div className="pointer-events-none absolute top-3 inset-x-0 flex justify-center px-4">
                        <span className="px-3 py-1.5 rounded-full bg-emerald-400 text-gray-950 text-sm font-black">{t('cc.lockedIn', { name: rival.name })}</span>
                    </div>
                )}

                {/* Round countdown */}
                {match.status === 'round' && countdown && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span key={countdown} className="text-8xl font-black text-white/90 drop-shadow-lg animate-ping-once">{countdown}</span>
                    </div>
                )}

                {/* VS intro */}
                {match.status === 'intro' && (
                    <div className="absolute inset-0 bg-[#040714]/90 flex flex-col items-center justify-center gap-6 px-4">
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">{t('cc.newDuel')}</p>
                        <div className="flex items-center gap-4 sm:gap-8">
                            <div className="flex flex-col items-center gap-2 w-28 sm:w-36">
                                <Avatar color={myPlayer.color} name={myPlayer.name} size={72} />
                                <span className="font-black truncate max-w-full">{myPlayer.name || t('cc.you')}</span>
                            </div>
                            <Swords size={40} className="text-amber-300 shrink-0" />
                            <div className="flex flex-col items-center gap-2 w-28 sm:w-36">
                                {rival.bot
                                    ? <span className="w-[72px] h-[72px] rounded-full bg-slate-400 text-gray-950 flex items-center justify-center"><Bot size={38} /></span>
                                    : <Avatar color={rival.color} name={rival.name} size={72} />}
                                <span className="font-black truncate max-w-full">{rival.name}</span>
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm text-center max-w-xs">
                            {t('cc.duelIntro', { count: match.rounds })}{rival.bot ? ` ${t('cc.botStepped')}` : ''}
                        </p>
                    </div>
                )}

                {/* Round result */}
                {match.status === 'result' && last && (
                    <div className="absolute inset-x-0 bottom-0 p-4 flex justify-center pointer-events-none pb-safe">
                        <div className="w-full max-w-md rounded-3xl bg-[#0b1128]/95 border border-white/10 p-5 text-center shadow-2xl">
                            {last.outcome === me && <p className="text-2xl font-black text-emerald-300">{t('cc.gotFirst')}</p>}
                            {last.outcome === 'tie' && <p className="text-2xl font-black text-emerald-300">{t('cc.sameSpeed')}</p>}
                            {last.outcome === rivalId && <p className="text-2xl font-black text-amber-300">{t('cc.wasFaster', { name: rival.name })}</p>}
                            {last.outcome === 'both-miss' && (
                                <p className="text-2xl font-black text-rose-300">{t('cc.bothMissed')}{last.deltas?.[me] ? ` · ${last.deltas[me]}` : ''}</p>
                            )}
                            {last.answer && <p className="mt-2 text-sm text-gray-300 break-words"><Slots text={t('cc.answer')} slots={{ answer: <b className="text-white">{last.answer}</b> }} /></p>}
                        </div>
                    </div>
                )}

                {/* Duel summary */}
                {match.status === 'done' && (
                    <div className="absolute inset-0 bg-[#040714]/95 flex items-center justify-center px-4">
                        <div className="w-full max-w-sm text-center">
                            {match.outcome?.winner === me ? (
                                <>
                                    <Crown size={48} className="mx-auto text-amber-300" />
                                    <p className="text-3xl font-black mt-2">{t('cc.youWon')}</p>
                                </>
                            ) : match.outcome?.winner ? (
                                <>
                                    <Flag size={44} className="mx-auto text-gray-400" />
                                    <p className="text-3xl font-black mt-2">{t('cc.won', { name: rival.name })}</p>
                                </>
                            ) : (
                                <>
                                    <Swords size={44} className="mx-auto text-sky-300" />
                                    <p className="text-3xl font-black mt-2">{match.outcome?.reason === 'time' ? t('cc.timeUp') : t('cc.draw')}</p>
                                </>
                            )}
                            <p className="text-5xl font-black tabular-nums mt-4">{myScore} <span className="text-gray-500">:</span> {rivalScore}</p>
                            {match.outcome?.bonuses?.[me] > 0 && (
                                <p className="mt-3 inline-block px-3 py-1 rounded-full bg-amber-400 text-gray-950 font-black">{t('cc.bonus', { n: match.outcome.bonuses[me] })}</p>
                            )}
                            {match.outcome?.reason === 'forfeit' && match.outcome?.winner === me && <p className="text-sm text-gray-400 mt-3">{t('cc.rivalLeft')}</p>}
                            <p className="text-sm text-gray-400 mt-5">{t('cc.nextRival')}</p>
                        </div>
                    </div>
                )}
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
    const me = useRoomValue(rt, roomPath(code, 'players', playerId));
    const settings = meta?.settings || {};
    const showerMode = settings.mode === 'shower';
    const players = useRoomValue(rt, roomPath(code, 'players')) || {};
    const match = useRoomValue(rt, !showerMode && me?.matchId ? roomPath(code, 'matches', me.matchId) : null);
    const shower = useRoomValue(rt, showerMode ? roomPath(code, 'shower') : null);
    const host = useRoomValue(rt, roomPath(code, 'host'));
    const now = useServerNow(rt, 1000);

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

    // Background music — player-specific tracks are more exciting than the host's calm versions
    const inRound = playing && (showerMode
        ? shower?.status === 'round' || shower?.status === 'result'
        : me?.status === 'matched' && !!match?.id);
    const track = settings.studentMusic === false || !meta || ended ? null : inRound ? 'playerBattle' : 'playerLobby';
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

    const ranked = useMemo(() => rankPlayers(players), [players]);
    const myRank = ranked.findIndex(p => p.id === playerId) + 1;

    if (error) return <Screen><WifiOff size={40} className="text-amber-300" /><p className="mt-3 font-bold">{t('roomErrors.connection')}</p></Screen>;
    if (!rt || meta === undefined || me === undefined) return <Screen><Spinner size={36} className="text-emerald-400" /></Screen>;
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
        <div className="fixed inset-x-0 z-30 flex justify-center px-4 pointer-events-none" style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
            <span className="px-3 py-1.5 rounded-full bg-amber-400 text-gray-950 text-xs font-black flex items-center gap-1.5 shadow-lg">
                <WifiOff size={13} /> {t('cc.paused')}
            </span>
        </div>
    );

    // Final screen
    if (ended) {
        const hostEnded = hostGone || meta.endReason === 'host-offline';
        return (
            <Screen>
                <MuteButton />
                <Trophy size={48} className="text-amber-300" />
                <p className="mt-3 text-sm font-bold uppercase tracking-widest text-gray-400">{t('cc.gameOver')}</p>
                {hostEnded && <p className="mt-1 text-sm text-amber-300 font-semibold max-w-xs">{t('cc.hostOffline')}</p>}
                {myRank > 0 && <p className="text-6xl font-black mt-1">#{myRank}</p>}
                <p className="text-xl font-bold mt-1">{me.name} · {t('cc.points', { count: me.score || 0 })}</p>
                <p className="text-sm text-gray-400 mt-1">
                    {!showerMode && `${t('cc.duelsWon', { count: me.wins || 0 })} · `}
                    {t('cc.correctPct', { pct: me.answered ? Math.round(((me.correct || 0) / me.answered) * 100) : 0 })}
                </p>
                <ol className="mt-6 w-full max-w-xs space-y-1.5 text-left">
                    {ranked.slice(0, 3).map((p, i) => (
                        <li key={p.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${p.id === playerId ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                            <span className="w-6 font-black text-amber-300">{i + 1}</span>
                            <span className="flex-1 min-w-0 truncate font-bold">{p.name}</span>
                            <span className="font-black tabular-nums">{p.score}</span>
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

    // Meteor Shower: everyone plays every question
    if (playing && showerMode && shower) {
        return (
            <>
                {hostBanner}
                <ShowerPlay
                    rt={rt}
                    code={code}
                    shower={shower}
                    me={me}
                    meId={playerId}
                    myRank={myRank}
                    total={shower.total || settings.showerQuestions}
                    settings={settings}
                />
            </>
        );
    }

    // In a duel
    if (playing && me.status === 'matched' && match && match.id) {
        return (
            <>
                {hostBanner}
                <Duel rt={rt} code={code} match={match} me={playerId} players={players[playerId] ? players : { ...players, [playerId]: me }} settings={settings} />
            </>
        );
    }

    const leave = async () => {
        await leaveRoom(code, playerId);
        onExit();
    };

    // Lobby / queue
    const botIn = settings.bots !== false && me.queuedAt ? Math.max(0, Math.ceil(((me.queuedAt + (Number(settings.botWait) || 8) * 1000) - now) / 1000)) : null;

    return (
        <Screen>
            {hostBanner}
            <MuteButton />
            <Avatar color={me.color} name={me.name} size={84} />
            <p className="mt-4 text-3xl font-black break-words max-w-full">{me.name}</p>

            {meta.status === 'lobby' || showerMode ? (
                <>
                    <p className="mt-2 text-emerald-300 font-bold">{t('cc.youreIn')}</p>
                    <p className="mt-6 text-gray-300 max-w-xs">{t('cc.watch')}</p>
                </>
            ) : (
                <>
                    <div className="mt-6 flex items-center gap-2 text-lg font-bold">
                        <Hourglass size={20} className="text-sky-300 animate-pulse" /> {t('cc.findingRival')}
                    </div>
                    {botIn !== null && botIn > 0 && <p className="mt-2 text-sm text-gray-400">{t('cc.botIn', { s: botIn })}</p>}
                    <div className="mt-6 flex gap-3">
                        <div className="px-4 py-2 rounded-2xl bg-white/10">
                            <p className="text-xs text-gray-400 font-bold uppercase">{t('cc.score')}</p>
                            <p className="text-2xl font-black tabular-nums">{me.score || 0}</p>
                        </div>
                        {settings.studentLeaderboard !== false && myRank > 0 && (
                            <div className="px-4 py-2 rounded-2xl bg-white/10">
                                <p className="text-xs text-gray-400 font-bold uppercase">{t('cc.rank')}</p>
                                <p className="text-2xl font-black tabular-nums">#{myRank}</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            <button onClick={leave} className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white">
                <LogOut size={16} /> {t('cc.leave')}
            </button>
        </Screen>
    );
};

export default PlayerScreen;
