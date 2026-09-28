import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Trophy } from 'lucide-react';
import { roomPath } from '../../platform/rooms/rooms';
import { audio } from '../../platform/audio/audio';
import { useTheme } from '../../context/ThemeContext';
import { Playfield } from './playfield';
import { Avatar, MuteButton } from './playerUi';

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

// A student's screen during a Meteor Shower: every question, same time as the whole class
const ShowerPlay = ({ rt, code, shower, me, meId, myRank, total, settings }) => {
    const { performance } = useTheme();
    const canvasRef = useRef(null);
    const fieldRef = useRef(null);
    const roundRef = useRef({ key: null, field: null, submitted: false, begun: false, offset: 0 });
    const [progress, setProgress] = useState(null);
    const [note, setNote] = useState(null); // 'done' | 'timeout'
    const [countdown, setCountdown] = useState(null);
    const sound = settings.studentSound !== false;

    const status = shower.status;
    const round = shower.round || 0;
    const roundKey = `shower:${round}`;
    const q = shower.q;

    const submit = (result) => {
        const r = roundRef.current;
        if (r.submitted || !r.key) return;
        const rnd = r.key.split(':')[1];
        r.submitted = true;
        rt.set(roomPath(code, 'shower', 'results', rnd, meId), result).catch(() => {
            r.submitted = false;
        });
    };

    useEffect(() => {
        const field = new Playfield(canvasRef.current, {
            lowFx: !performance.particles || performance.reducedMotion,
            sound,
            onEvent: (e) => {
                const r = roundRef.current;
                if (e.type === 'progress') setProgress({ found: e.found, total: e.total });
                if (e.type === 'complete') {
                    setNote('done');
                    submit({ ok: true, t: Math.round(e.t + r.offset), wrong: e.wrong });
                }
                if (e.type === 'timeout') {
                    setNote('timeout');
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
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // New question: countdown, then start at the shared start time
    useEffect(() => {
        const field = fieldRef.current;
        if (!field || status !== 'round' || !q) return undefined;
        const r = roundRef.current;
        if (r.key === roundKey && r.field === field) return undefined;
        const already = shower.results?.[round]?.[meId];
        roundRef.current = { key: roundKey, field, submitted: !!already, begun: false, offset: 0 };
        setProgress(null);
        setNote(already ? (already.ok ? 'done' : 'timeout') : null);
        setCountdown(null);
        field.clear();
        if (already) return undefined;

        const roundTime = (Number(settings.roundTime) || 15) * 1000;
        const timers = [];
        const begin = () => {
            const current = roundRef.current;
            if (current.key !== roundKey || current.begun) return;
            current.begun = true;
            const offset = Math.max(0, rt.now() - shower.roundStartAt);
            current.offset = offset;
            setCountdown(null);
            if (sound) audio.sfx('go');
            field.startRound({
                kind: q.kind,
                options: q.options,
                seed: q.seed,
                speed: settings.speed,
                timeLimitMs: Math.max(2000, roundTime - offset),
                penalty: { stun: 1.5, timeCost: 0 }
            });
        };
        const delay = shower.roundStartAt - rt.now();
        if (delay <= 0) begin();
        else {
            [3, 2, 1].filter(n => delay - n * 450 > 0).forEach(n => timers.push(setTimeout(() => {
                setCountdown(n);
                if (sound) audio.sfx('countdown');
            }, delay - n * 450)));
            timers.push(setTimeout(begin, delay));
        }
        return () => {
            timers.forEach(clearTimeout);
            if (!roundRef.current.begun && roundRef.current.key === roundKey) roundRef.current.key = null;
        };
    }, [status, roundKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // Question resolved: show the answer on the field, play my result sound
    const myDelta = shower.last?.round === round ? shower.last?.deltas?.[meId] : undefined;
    useEffect(() => {
        if (status !== 'result') return;
        const field = fieldRef.current;
        if (field?.active) field.stopRound('reveal');
        if (!sound || myDelta === undefined) return;
        audio.sfx(myDelta > 0 ? 'roundWin' : 'bothMiss');
    }, [status, round]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (status === 'intro' && sound) audio.sfx('whoosh');
    }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="app-height w-full flex flex-col bg-[#040714] text-white select-none overflow-hidden">
            <div className="shrink-0 bg-[#070b1d] border-b border-white/10 pt-safe">
                <div className="flex items-center justify-between gap-2 px-3 sm:px-5 h-14">
                    <div className="flex items-center gap-2 min-w-0">
                        <Avatar color={me.color} name={me.name} size={30} />
                        <span className="font-black text-2xl tabular-nums">{me.score || 0}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-gray-400 whitespace-nowrap">Question {Math.max(1, round)} / {total}</span>
                    <span className="flex items-center justify-end gap-2 min-w-[2.5rem]">
                        <span className="text-sm font-black text-amber-300 tabular-nums">{settings.studentLeaderboard !== false && myRank > 0 ? `#${myRank}` : ''}</span>
                        <MuteButton inline />
                    </span>
                </div>
                <div className="px-3 sm:px-6 pb-3 text-center min-h-[2.75rem]">
                    {status === 'round' && q && (
                        <>
                            <p className="max-w-3xl mx-auto text-base sm:text-xl md:text-2xl font-bold leading-snug line-clamp-3 break-words">{q.prompt}</p>
                            {q.kind !== 'single' && !note && (
                                <p className="mt-1.5 text-xs sm:text-sm font-bold text-emerald-300">
                                    {q.kind === 'multi'
                                        ? `Blast every correct answer${progress ? ` · ${progress.found}/${progress.total}` : ''}`
                                        : `Blast them in order${progress ? ` · next: ${ORDINALS[progress.found] || progress.found + 1}` : ' · 1st first'}`}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="relative flex-1 min-h-0">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block touch-none cursor-crosshair" />

                {status === 'round' && countdown && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span key={countdown} className="text-8xl font-black text-white/90 drop-shadow-lg animate-ping-once">{countdown}</span>
                    </div>
                )}

                {status === 'round' && note && (
                    <div className="pointer-events-none absolute top-3 inset-x-0 flex justify-center px-4">
                        <span className={`px-3 py-1.5 rounded-full text-sm font-black ${note === 'done' ? 'bg-emerald-400 text-gray-950' : 'bg-white/15 text-white'}`}>
                            {note === 'done' ? 'Locked in! Waiting for the class…' : "Time's up! Waiting for the class…"}
                        </span>
                    </div>
                )}

                {(!status || status === 'intro') && (
                    <div className="absolute inset-0 bg-[#040714]/95 flex flex-col items-center justify-center gap-3 px-6 text-center">
                        <Sparkles size={44} className="text-emerald-300" />
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">Meteor Shower</p>
                        <p className="text-3xl font-black">Get ready!</p>
                        <p className="text-gray-400 max-w-xs">Everyone answers every question. Be the fastest to find it for 100 points.</p>
                    </div>
                )}

                {status === 'result' && shower.last && (
                    <div className="absolute inset-x-0 bottom-0 p-4 flex justify-center pointer-events-none pb-safe">
                        <div className="w-full max-w-md rounded-3xl bg-[#0b1128]/95 border border-white/10 p-5 text-center shadow-2xl">
                            {myDelta === undefined ? (
                                <p className="text-xl font-black text-gray-300">Next question coming up</p>
                            ) : myDelta > 0 ? (
                                <p className="text-4xl font-black text-emerald-300 tabular-nums">+{myDelta}</p>
                            ) : (
                                <p className="text-4xl font-black text-rose-300 tabular-nums">{myDelta}</p>
                            )}
                            {myDelta === 100 && shower.last.fastest?.pid === meId && <p className="text-amber-300 font-bold mt-1">Fastest in the class!</p>}
                            <p className="mt-2 text-sm text-gray-300 break-words">Answer: <b className="text-white">{shower.last.answer}</b></p>
                            {settings.studentLeaderboard !== false && myRank > 0 && (
                                <p className="mt-2 text-sm font-bold text-gray-400 flex items-center justify-center gap-1.5"><Trophy size={14} className="text-amber-300" /> You're #{myRank}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShowerPlay;
