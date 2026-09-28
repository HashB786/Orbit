import React, { useSyncExternalStore } from 'react';
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
