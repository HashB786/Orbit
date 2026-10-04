import React, { useEffect, useSyncExternalStore } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { SPACE_BG } from '../../components/SpaceScreen';
import { audio } from '../../platform/audio/audio';
import { useT } from '../../context/LanguageContext';
import { t as translateNow } from '../../i18n';

// "1st", "2nd"... in the current language (also used by the canvas playfield)
export const ordinal = (n, t = translateNow) => (n >= 1 && n <= 6 ? t(`cc.ordinal.${n}`) : t('cc.ordinalN', { n }));

// The line under the question for multi-select and put-in-order rounds
export const roundHint = (t, kind, progress) => {
    if (kind === 'multi') return progress ? t('cc.hint.multiProgress', { found: progress.found, total: progress.total }) : t('cc.hint.multi');
    return t('cc.hint.orderNext', { ord: ordinal((progress?.found || 0) + 1, t) });
};

// Urgent beeps in the last 5 seconds of a round. `endAt` and `now()` are server time.
export const useTimeWarning = (active, endAt, now) => {
    useEffect(() => {
        if (!active || !endAt) return undefined;
        const remaining = endAt - now();
        const timers = [5, 4, 3, 2, 1]
            .map(s => remaining - s * 1000)
            .filter(delay => delay > 0)
            .map(delay => setTimeout(() => audio.sfx('timeWarning'), delay));
        return () => timers.forEach(clearTimeout);
    }, [active, endAt]); // eslint-disable-line react-hooks/exhaustive-deps
};

// The question on its own before the asteroids appear. `total`/`elapsed` (ms) drive the bar,
// `countdown` shows the final 3-2-1, `onReady` (solo practice) lets the player start early.
export const ReadingCard = ({ prompt, kind, total, elapsed = 0, countdown, onReady }) => {
    const t = useT();
    // Students play on phones, tablets and laptops: name the gesture their device actually has
    const touch = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
    return (
        <div className="absolute inset-0 z-[5] flex items-center justify-center p-3 sm:p-6 bg-[#040714]/75" onPointerDown={onReady}>
            <div className="w-full max-w-2xl max-h-full overflow-y-auto rounded-3xl bg-[#0b1128]/95 border border-emerald-400/20 px-5 py-6 sm:px-10 sm:py-9 text-center shadow-[0_0_60px_-20px_rgba(52,211,153,0.5)]">
                <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.3em] text-emerald-300">{t('cc.readQuestion')}</p>
                <p className="mt-3 text-xl sm:text-3xl md:text-4xl font-black leading-snug break-words">{prompt}</p>
                {kind && kind !== 'single' && (
                    <p className="mt-3 text-sm sm:text-base font-bold text-emerald-300">{kind === 'multi' ? t('cc.hint.multi') : t('cc.hint.order')}</p>
                )}
                <div className="mt-6 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    {/* Keyed so a new start point (e.g. after a pause) restarts the animation */}
                    {total > 0 && <div key={`${total}:${elapsed}`} className="h-full bg-emerald-400 animate-fill" style={{ animationDuration: `${total}ms`, animationDelay: `-${Math.max(0, elapsed)}ms` }} />}
                </div>
                <div className="h-14 sm:h-16 mt-3 flex items-center justify-center">
                    {countdown ? (
                        <span key={countdown} className="text-5xl sm:text-6xl font-black tabular-nums animate-ping-once">{countdown}</span>
                    ) : onReady ? (
                        <span className="text-sm font-bold text-gray-400">{touch ? t('solo.tapToStart') : t('solo.clickToStart')}</span>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export const Screen = ({ children }) => (
    <div className="app-height w-full overflow-y-auto overflow-x-hidden text-white" style={SPACE_BG}>
        <div className="min-h-full flex flex-col items-center justify-center px-5 py-10 text-center">{children}</div>
    </div>
);

export const Avatar = ({ color, name, size = 64 }) => (
    <div className="rounded-full flex items-center justify-center font-black text-gray-950 shrink-0" style={{ width: size, height: size, background: color || '#34d399', fontSize: size * 0.42 }}>
        {(name || '?').slice(0, 1).toUpperCase()}
    </div>
);

// Mute button for student devices (music + effects). Floating on calm screens;
// `inline` inside the game's top bar so it can never be hit while aiming at asteroids.
export const MuteButton = ({ inline = false }) => {
    const t = useT();
    const settings = useSyncExternalStore(audio.subscribe, audio.getSettings);
    return (
        <button
            onClick={(e) => {
                e.currentTarget.blur();
                audio.unlock();
                audio.updateSettings({ muted: !settings.muted });
            }}
            aria-label={settings.muted ? t('common.unmute') : t('common.mute')}
            className={inline
                ? 'w-8 h-8 shrink-0 rounded-full bg-white/10 text-gray-300 flex items-center justify-center'
                : 'fixed right-3 z-40 w-10 h-10 rounded-full bg-black/50 border border-white/10 text-white flex items-center justify-center'}
            style={inline ? undefined : { bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
            {settings.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
    );
};
