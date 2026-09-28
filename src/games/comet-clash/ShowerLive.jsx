import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, Square, Users, Zap, Trophy, CheckCircle2 } from 'lucide-react';
import { rankPlayers } from '../../platform/rooms/hooks';
import { isOnline } from '../../platform/rooms/rooms';
import { audio } from '../../platform/audio/audio';
import { useT } from '../../context/LanguageContext';
import Slots from '../../i18n/Slots';

const MEDALS = ['#fbbf24', '#cbd5e1', '#f59e0b'];

const Btn = ({ children, onClick, danger, title }) => (
    <button
        onClick={(e) => { e.currentTarget.blur(); onClick(); }}
        title={title}
        className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-bold transition-colors ${danger ? 'bg-red-500/15 hover:bg-red-500/25 text-red-300' : 'bg-white/10 hover:bg-white/15'}`}
    >
        {children}
    </button>
);

const Delta = ({ value }) => {
    if (value === undefined) return <span className="w-14" />;
    const positive = value > 0;
    return (
        <span className={`w-14 text-right text-sm font-black tabular-nums ${positive ? 'text-emerald-300' : value < 0 ? 'text-rose-300' : 'text-gray-400'}`}>
            {positive ? '+' : ''}{value}
        </span>
    );
};

// Teacher's big screen during a Meteor Shower
const ShowerLive = ({ meta, players, shower, now, onEnd, onLock, soundToggle }) => {
    const t = useT();
    const ranked = rankPlayers(players);
    const online = ranked.filter(p => isOnline(p, now));
    const status = shower?.status;
    const round = shower?.round || 0;
    const total = shower?.total || meta.settings?.showerQuestions || 0;
    const results = shower?.results?.[round] || {};
    const submitted = Object.keys(results).length;
    const roundTime = (Number(meta.settings?.roundTime) || 15) * 1000;
    const lastTick = useRef(0);

    // Countdown beeps before each question and ticks in the last 5 seconds
    const beforeStart = status === 'round' ? shower.roundStartAt - now : 0;
    const left = status === 'round' ? shower.roundStartAt + roundTime - now : 0;
    const secondMark = status === 'round' ? Math.ceil((beforeStart > 0 ? beforeStart : left) / 1000) : 0;
    useEffect(() => {
        if (status !== 'round' || secondMark === lastTick.current) return;
        lastTick.current = secondMark;
        if (beforeStart > 0) audio.sfx('countdown');
        else if (secondMark > 0 && secondMark <= 5) audio.sfx('tick');
    }, [secondMark, status, beforeStart]);

    const started = status === 'round' && beforeStart <= 0;
    useEffect(() => {
        if (started) audio.sfx('go');
    }, [started, round]);
    useEffect(() => {
        if (status === 'result') audio.sfx('roundWin');
    }, [status, round]);

    const controls = (
        <div className="flex flex-wrap gap-2">
            <Btn onClick={() => onLock(!meta.locked)} title={meta.locked ? t('hostGame.unlock') : t('hostGame.lock')}>
                {meta.locked ? <Lock size={16} /> : <Unlock size={16} />}
            </Btn>
            {soundToggle}
            <Btn danger onClick={onEnd}><Square size={16} /> {t('hostGame.end')}</Btn>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl font-black"><Slots text={t('shower.questionOf')} slots={{ n: Math.max(1, round), total: <span className="text-gray-500">{total}</span> }} /></span>
                    <span className="text-sm text-gray-400 font-semibold flex items-center gap-1.5"><Users size={16} /> {online.length}</span>
                </div>
                {controls}
            </div>

            {(!status || status === 'intro') && (
                <div className="rounded-3xl bg-white/5 border border-white/10 p-10 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">{t('shower.name')}</p>
                    <h2 className="text-4xl sm:text-6xl font-black mt-3">{t('shower.getReady')}</h2>
                    <p className="text-gray-400 mt-3">{t('shower.hostIntro')}</p>
                </div>
            )}

            {status === 'round' && shower.q && (
                <div className="rounded-3xl bg-white/5 border border-white/10 p-6 sm:p-10 text-center">
                    {beforeStart > 0 ? (
                        <p className="text-8xl font-black tabular-nums py-10">{Math.ceil(beforeStart / 1000)}</p>
                    ) : (
                        <>
                            <p className="text-2xl sm:text-4xl font-black leading-snug break-words">{shower.q.prompt}</p>
                            {shower.q.kind !== 'single' && (
                                <p className="mt-2 text-emerald-300 font-bold">{shower.q.kind === 'multi' ? t('cc.hint.multi') : t('cc.hint.order')}</p>
                            )}
                            <div className="mt-6 flex flex-wrap justify-center gap-2">
                                {shower.q.options.map((o, i) => (
                                    <span key={i} className="px-4 py-2 rounded-2xl bg-white/10 font-bold text-lg">{o.text}</span>
                                ))}
                            </div>
                            <div className="mt-8 flex items-center justify-center gap-6">
                                <span className={`text-6xl font-black tabular-nums ${left < 5000 ? 'text-amber-300' : ''}`}>{Math.max(0, Math.ceil(left / 1000))}</span>
                                <span className="text-left">
                                    <span className="block text-3xl font-black tabular-nums">{submitted} <span className="text-gray-500 text-xl">/ {online.length}</span></span>
                                    <span className="block text-xs font-bold uppercase tracking-wider text-gray-400">{t('shower.answered')}</span>
                                </span>
                            </div>
                            <div className="mt-6 h-2 rounded-full bg-white/10 overflow-hidden max-w-xl mx-auto">
                                <div className="h-full bg-emerald-400 transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, (left / roundTime) * 100))}%` }} />
                            </div>
                        </>
                    )}
                </div>
            )}

            {status === 'result' && shower.last && (
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6">
                    <section className="rounded-3xl bg-white/5 border border-white/10 p-6 text-center flex flex-col justify-center">
                        <CheckCircle2 size={40} className="mx-auto text-emerald-300" />
                        <p className="mt-3 text-xs font-bold uppercase tracking-widest text-gray-400">{t('editor.answer')}</p>
                        <p className="text-3xl sm:text-4xl font-black mt-1 break-words">{shower.last.answer}</p>
                        <p className="mt-4 text-gray-300"><Slots text={t('shower.foundIt')} slots={{ found: <b className="text-white">{shower.last.found}</b>, count: shower.last.answered }} /></p>
                        {shower.last.fastest && players[shower.last.fastest.pid] && (
                            <p className="mt-2 text-amber-300 font-bold flex items-center justify-center gap-1.5">
                                <Zap size={16} /> {t('shower.fastestIs', { name: players[shower.last.fastest.pid].name, s: (shower.last.fastest.t / 1000).toFixed(1) })}
                            </p>
                        )}
                    </section>
                    <section className="rounded-3xl bg-white/5 border border-white/10 p-5">
                        <h2 className="text-xl font-black flex items-center gap-2 mb-3"><Trophy size={20} className="text-amber-300" /> {t('hostGame.leaderboard')}</h2>
                        <ol className="space-y-1.5">
                            {ranked.slice(0, 10).map((p, i) => (
                                <motion.li layout key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5">
                                    <span className="w-7 text-center font-black tabular-nums" style={{ color: MEDALS[i] || '#94a3b8' }}>{i + 1}</span>
                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
                                    <span className="flex-1 min-w-0 font-bold truncate">{p.name}</span>
                                    <Delta value={shower.last.deltas?.[p.id]} />
                                    <span className="font-black tabular-nums text-lg min-w-[3.5rem] text-right">{p.score}</span>
                                </motion.li>
                            ))}
                        </ol>
                        {ranked.length > 10 && <p className="text-xs text-gray-500 mt-2">{t('importer.more', { count: ranked.length - 10 })}</p>}
                    </section>
                </div>
            )}
        </div>
    );
};

export default ShowerLive;
