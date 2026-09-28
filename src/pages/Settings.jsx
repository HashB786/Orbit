import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { User, Palette, Globe, Zap, Trash2, Volume2, VolumeX, Music, Play, Check, Settings as SettingsIcon, Battery, Gauge, Sparkles } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { PageHeader, Toggle, ConfirmDialog, IconOrb, btn, inputClass, cx } from '../components/ui';
import Flag from '../components/art/Flag';
import { Stars } from '../components/art/shapes';
import { audio } from '../platform/audio/audio';

const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'sound', label: 'Sound', icon: Volume2 },
    { id: 'performance', label: 'Performance', icon: Zap },
    { id: 'language', label: 'Language', icon: Globe },
    { id: 'data', label: 'Your data', icon: Trash2 }
];

const Panel = ({ title, subtitle, children, className = '' }) => (
    <section className={cx('orbit-card p-5 sm:p-6', className)}>
        {title && <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">{title}</h2>}
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        <div className={title || subtitle ? 'mt-5' : ''}>{children}</div>
    </section>
);

// Card-style choice with a check badge when selected
const Choice = ({ selected, onClick, children, className = '' }) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={cx(
            'relative text-left rounded-2xl border-2 p-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500',
            selected
                ? 'border-primary-400 bg-primary-500/10 dark:bg-primary-500/10'
                : 'border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-white/20',
            className
        )}
    >
        {selected && (
            <span className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center shadow">
                <Check size={14} strokeWidth={3} />
            </span>
        )}
        {children}
    </button>
);

// ---------- Profile ----------

const ProfileSettings = () => {
    const { userData, updateUserData } = useUser();
    return (
        <div className="space-y-4">
            <Panel title="Your name" subtitle="Shown as the author of sets you publish, and filled in as your nickname when you join a game.">
                <div className="flex items-center gap-4">
                    <span className="w-14 h-14 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-violet-600 text-white text-2xl font-display font-bold flex items-center justify-center shadow-[0_0_24px_-6px_rgb(var(--color-primary-400))]">
                        {userData.name.charAt(0).toUpperCase() || '?'}
                    </span>
                    <input
                        id="display-name"
                        aria-label="Display name"
                        value={userData.name}
                        onChange={(e) => updateUserData({ name: e.target.value.slice(0, 40) })}
                        className={inputClass}
                        placeholder="Enter your name"
                    />
                </div>
            </Panel>
            <div className="rounded-2xl border border-primary-300/50 dark:border-primary-400/20 bg-primary-500/[0.07] p-4 text-sm text-gray-600 dark:text-gray-300">
                <b className="text-gray-900 dark:text-white">No account needed.</b> Your sets are saved in this browser. Teacher sign-in with Google is coming, so sets can follow you to any device. Students never need an account to join a game.
            </div>
        </div>
    );
};

// ---------- Appearance ----------

const ThemePreview = ({ dark }) => (
    <svg viewBox="0 0 160 90" className="w-full rounded-xl" aria-hidden="true">
        <rect width="160" height="90" fill={dark ? '#050816' : '#eef1ff'} />
        <circle cx="130" cy="-6" r="50" fill={dark ? '#10b981' : '#a7f3d0'} opacity={dark ? 0.16 : 0.35} />
        <circle cx="-10" cy="95" r="50" fill={dark ? '#7c3aed' : '#c4b5fd'} opacity={dark ? 0.25 : 0.35} />
        <Stars seed={dark ? 5 : 9} count={dark ? 24 : 12} width={160} height={90} color={dark ? '#ffffff' : '#6366f1'} />
        <rect x="8" y="8" width="26" height="74" rx="6" fill={dark ? '#0b1230' : '#ffffff'} opacity="0.9" />
        <rect x="42" y="12" width="70" height="8" rx="4" fill={dark ? '#e0e7ff' : '#151b3d'} opacity="0.85" />
        <rect x="42" y="30" width="50" height="36" rx="7" fill={dark ? '#0f1735' : '#ffffff'} stroke={dark ? '#26305a' : '#dde2f4'} />
        <rect x="98" y="30" width="50" height="36" rx="7" fill={dark ? '#0f1735' : '#ffffff'} stroke={dark ? '#26305a' : '#dde2f4'} />
        <circle cx="67" cy="46" r="8" fill="#10b981" />
        <ellipse cx="67" cy="46" rx="13" ry="4" fill="none" stroke="#a7f3d0" transform="rotate(-20 67 46)" />
        <circle cx="123" cy="46" r="8" fill="#8b5cf6" />
    </svg>
);

const ACCENTS = [
    { id: 'green', label: 'Emerald', from: '#6ee7b7', to: '#047857' },
    { id: 'blue', label: 'Ocean', from: '#93c5fd', to: '#1d4ed8' },
    { id: 'violet', label: 'Nebula', from: '#c4b5fd', to: '#6d28d9' }
];

const AppearanceSettings = () => {
    const { theme, setTheme, colorTheme, setColorTheme } = useTheme();
    return (
        <div className="space-y-4">
            <Panel title="Theme" subtitle="Space is Orbit's home. Daylight is easier to read in a bright room.">
                <div className="grid grid-cols-2 gap-3">
                    {[{ id: 'dark', label: 'Space' }, { id: 'light', label: 'Daylight' }].map(opt => (
                        <Choice key={opt.id} selected={theme === opt.id} onClick={() => setTheme(opt.id, true)}>
                            <ThemePreview dark={opt.id === 'dark'} />
                            <span className="block font-bold mt-2 text-gray-900 dark:text-white">{opt.label}</span>
                        </Choice>
                    ))}
                </div>
            </Panel>
            <Panel title="Accent colour" subtitle="Used for buttons, highlights and your planet.">
                <div className="grid grid-cols-3 gap-3">
                    {ACCENTS.map(a => (
                        <Choice key={a.id} selected={colorTheme === a.id} onClick={() => setColorTheme(a.id, true)} className="flex flex-col items-center gap-2 py-4">
                            <svg viewBox="0 0 48 48" className="w-12 h-12 overflow-visible" aria-hidden="true">
                                <defs>
                                    <radialGradient id={`accent-${a.id}`} cx="0.32" cy="0.28" r="0.85">
                                        <stop offset="0" stopColor={a.from} />
                                        <stop offset="1" stopColor={a.to} />
                                    </radialGradient>
                                </defs>
                                <circle cx="24" cy="24" r="18" fill={`url(#accent-${a.id})`} />
                                <ellipse cx="24" cy="24" rx="27" ry="7" fill="none" stroke={a.from} strokeWidth="2" opacity="0.7" transform="rotate(-24 24 24)" />
                            </svg>
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{a.label}</span>
                        </Choice>
                    ))}
                </div>
            </Panel>
        </div>
    );
};

// ---------- Sound ----------

const Slider = ({ label, icon: Icon, value, onChange }) => (
    <div>
        <div className="flex items-center justify-between mb-2">
            <label className="font-semibold text-sm flex items-center gap-2 text-gray-800 dark:text-gray-100"><Icon size={16} className="text-gray-400" /> {label}</label>
            <span className="text-sm font-bold tabular-nums text-gray-500">{Math.round(value * 100)}%</span>
        </div>
        <input
            type="range"
            min="0"
            max="100"
            value={Math.round(value * 100)}
            onChange={e => onChange(Number(e.target.value) / 100)}
            className="w-full accent-[rgb(var(--color-primary-500))]"
            aria-label={label}
        />
    </div>
);

const SoundSettings = () => {
    const settings = useSyncExternalStore(audio.subscribe, audio.getSettings);
    const [playing, setPlaying] = useState(false);
    // Stop the preview when leaving this tab
    useEffect(() => () => audio.stopMusic(), []);

    const preview = () => {
        audio.unlock();
        if (playing) {
            audio.stopMusic();
            setPlaying(false);
        } else {
            audio.playMusic('battle');
            audio.sfx('correct');
            setPlaying(true);
        }
    };

    return (
        <div className="space-y-4">
            <Panel title="Sound" subtitle="All music and effects are generated live by Orbit, so there's nothing to download.">
                <div className="space-y-6">
                    <button
                        onClick={() => { audio.unlock(); audio.updateSettings({ muted: !settings.muted }); }}
                        className={cx(btn.secondary, settings.muted && '!text-rose-600 dark:!text-rose-300')}
                    >
                        {settings.muted ? <VolumeX size={18} /> : <Volume2 size={18} />} {settings.muted ? 'Sound is off' : 'Sound is on'}
                    </button>
                    <Slider label="Music" icon={Music} value={settings.music} onChange={v => audio.updateSettings({ music: v })} />
                    <Slider label="Sound effects" icon={Zap} value={settings.sfx} onChange={v => { audio.updateSettings({ sfx: v }); audio.unlock(); audio.sfx('hit'); }} />
                    <button onClick={preview} className={btn.primary}>
                        <Play size={16} className="fill-current" /> {playing ? 'Stop preview' : 'Preview battle music'}
                    </button>
                </div>
            </Panel>
            <p className="text-sm text-gray-500 dark:text-gray-400 px-1">In live games the teacher's screen plays the music. Student devices play softer music (a host setting) and each student can mute their own device.</p>
        </div>
    );
};

// ---------- Performance ----------

const PRESETS = [
    { id: 'saver', label: 'Battery saver', text: 'No moving stars, calm animations', icon: Battery, particles: false, reducedMotion: true },
    { id: 'balanced', label: 'Balanced', text: 'Smooth, without background effects', icon: Gauge, particles: false, reducedMotion: false },
    { id: 'full', label: 'Full effects', text: 'Twinkling stars and confetti', icon: Sparkles, particles: true, reducedMotion: false }
];

const PerformanceSettings = () => {
    const { performance, updatePerformance } = useTheme();
    const current = PRESETS.find(p => p.particles === !!performance.particles && p.reducedMotion === !!performance.reducedMotion)?.id;
    const apply = (p) => {
        updatePerformance('particles', p.particles);
        updatePerformance('reducedMotion', p.reducedMotion);
    };
    return (
        <div className="space-y-4">
            <Panel title="Performance" subtitle="On older school computers, fewer effects keep games smooth. Games also lower their quality automatically when a device is slow.">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {PRESETS.map(p => (
                        <Choice key={p.id} selected={current === p.id} onClick={() => apply(p)} className="p-4">
                            <p.icon size={22} className="text-primary-500" />
                            <span className="block font-bold mt-2 text-gray-900 dark:text-white">{p.label}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.text}</span>
                        </Choice>
                    ))}
                </div>
            </Panel>
            <Panel>
                <div className="space-y-5">
                    <Toggle
                        label="Background stars and celebrations"
                        help="Twinkling stars, shooting stars and confetti."
                        checked={!!performance.particles}
                        onChange={v => updatePerformance('particles', v)}
                    />
                    <div className="h-px bg-gray-200/70 dark:bg-white/[0.07]" />
                    <Toggle
                        label="Reduced motion"
                        help="Stops orbiting moons and softens page transitions. Game play itself is not affected."
                        checked={!!performance.reducedMotion}
                        onChange={v => updatePerformance('reducedMotion', v)}
                    />
                </div>
            </Panel>
        </div>
    );
};

// ---------- Language ----------

const LANGUAGES = [
    { code: 'en', native: 'English', label: 'English' },
    { code: 'uz', native: "O'zbekcha", label: 'Uzbek' },
    { code: 'ru', native: 'Русский', label: 'Russian' }
];

const LanguageSettings = () => {
    const { lang, setLang } = useLanguage();
    return (
        <Panel title="Application language" subtitle="Menus and navigation switch language right away. Game screens are in English for now.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {LANGUAGES.map(l => (
                    <Choice key={l.code} selected={lang === l.code} onClick={() => setLang(l.code)} className="flex items-center gap-3 p-4">
                        <Flag code={l.code} className="w-12 h-8 rounded-md shadow-sm" />
                        <span className="min-w-0">
                            <span className="block font-bold text-gray-900 dark:text-white">{l.native}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400">{l.label}</span>
                        </span>
                    </Choice>
                ))}
            </div>
        </Panel>
    );
};

// ---------- Data ----------

const DataSettings = () => {
    const [confirm, setConfirm] = useState(false);
    return (
        <Panel title="Your data" subtitle="Everything you make is saved in this browser.">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-rose-300/60 dark:border-rose-400/20 bg-rose-50 dark:bg-rose-500/[0.06] p-4">
                <div className="flex items-start gap-3">
                    <IconOrb icon={Trash2} tone="rose" size={40} moon={false} />
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Delete all Orbit data in this browser</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Removes your sets, settings and saved scores. Published sets stay public.</p>
                    </div>
                </div>
                <button onClick={() => setConfirm(true)} className={cx(btn.danger, 'shrink-0')}>Delete everything</button>
            </div>
            <ConfirmDialog
                open={confirm}
                title="Delete everything?"
                message="All your sets and settings will be removed from this browser. This cannot be undone."
                confirmLabel="Delete everything"
                danger
                onCancel={() => setConfirm(false)}
                onConfirm={() => {
                    localStorage.clear();
                    window.location.reload();
                }}
            />
        </Panel>
    );
};

const PANELS = {
    profile: ProfileSettings,
    appearance: AppearanceSettings,
    sound: SoundSettings,
    performance: PerformanceSettings,
    language: LanguageSettings,
    data: DataSettings
};

const Settings = () => {
    const [active, setActive] = useState('profile');
    const { t } = useLanguage();
    const Current = PANELS[active];

    return (
        <div className="space-y-6 md:pb-16">
            <PageHeader icon={SettingsIcon} tone="slate" title={t('settings')} subtitle="Make Orbit yours." />
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                <nav className="md:w-56 shrink-0 flex md:flex-col gap-1 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1 md:pb-0" aria-label="Settings sections">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActive(tab.id)}
                            aria-current={active === tab.id ? 'page' : undefined}
                            className={cx(
                                'shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-semibold whitespace-nowrap transition-colors',
                                active === tab.id
                                    ? 'bg-gradient-to-r from-primary-500/15 to-transparent text-primary-700 dark:text-primary-200 ring-1 ring-primary-400/30'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-white'
                            )}
                        >
                            <tab.icon size={18} className={tab.id === 'data' && active !== 'data' ? 'text-rose-400' : ''} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
                <div className="flex-1 min-w-0">
                    <Current />
                </div>
            </div>
        </div>
    );
};

export default Settings;
