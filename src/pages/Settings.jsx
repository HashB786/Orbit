import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Palette, Globe, Monitor, Zap, Trash2, Battery, Volume2, VolumeX, Music, Play } from 'lucide-react';
import { audio } from '../platform/audio/audio';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const { t } = useLanguage();

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User, color: 'text-blue-500' },
        { id: 'appearance', label: 'Appearance', icon: Palette, color: 'text-purple-500' },
        { id: 'sound', label: 'Sound', icon: Volume2, color: 'text-emerald-500' },
        { id: 'animations', label: 'Animations', icon: Zap, color: 'text-amber-500' },
        { id: 'language', label: 'Language', icon: Globe, color: 'text-orange-500' },
        { id: 'danger', label: 'Danger Zone', icon: Trash2, color: 'text-red-500' }
    ];

    return (
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:h-[calc(100vh-140px)] md:min-h-[600px]">
            {/* Sidebar Navigation (horizontal tab strip on phones) */}
            <div className="w-full md:w-64 flex-shrink-0 min-w-0">
                <div className="md:sticky top-0 space-y-2">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-teal-500 mb-4 md:mb-6 px-2">
                        {t('settings')}
                    </h1>

                    <nav className="flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0 -mx-1 px-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all font-medium whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-white dark:bg-dark-surface shadow-md text-primary-600 dark:text-primary-400 md:scale-[1.02]'
                                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-surface/50 dark:text-gray-400'
                                    }`}
                            >
                                <div className={`p-1.5 rounded-lg ${activeTab === tab.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                                    <tab.icon size={20} className={activeTab === tab.id ? tab.color : 'opacity-70'} />
                                </div>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0 md:overflow-y-auto custom-scrollbar md:pr-4">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                    >
                        {activeTab === 'profile' && <ProfileSettings />}
                        {activeTab === 'appearance' && <AppearanceSettings />}
                        {activeTab === 'sound' && <SoundSettings />}
                        {activeTab === 'animations' && <AnimationSettings />}
                        {activeTab === 'language' && <LanguageSettings />}
                        {activeTab === 'danger' && <DangerZone />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

// --- Sub-components ---

const ProfileSettings = () => {
    const { userData, updateUserData } = useUser();

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 shrink-0 bg-gradient-to-br from-primary-400 to-teal-400 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {userData.name.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your name</h2>
                        <p className="text-sm text-gray-500">Shown as the author of sets you publish, and filled in as your nickname when you join a game.</p>
                    </div>
                </div>
                <label htmlFor="display-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display name</label>
                <input
                    id="display-name"
                    value={userData.name}
                    onChange={(e) => updateUserData({ name: e.target.value.slice(0, 40) })}
                    className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                    placeholder="Enter your name"
                />
            </div>

            <div className="bg-primary-50/60 dark:bg-primary-900/10 p-5 rounded-2xl border border-primary-100 dark:border-primary-900/30 text-sm text-gray-600 dark:text-gray-300">
                <b className="text-gray-900 dark:text-white">No account needed.</b> Your sets are saved in this browser. Teacher sign-in with Google is coming, so sets can follow you to any device. Students never need an account to join a game.
            </div>
        </div>
    );
};

const Slider = ({ label, icon: Icon, value, onChange }) => (
    <div>
        <div className="flex items-center justify-between mb-2">
            <label className="font-semibold text-sm flex items-center gap-2"><Icon size={16} className="text-gray-400" /> {label}</label>
            <span className="text-sm font-bold tabular-nums text-gray-500">{Math.round(value * 100)}%</span>
        </div>
        <input
            type="range"
            min="0"
            max="100"
            value={Math.round(value * 100)}
            onChange={e => onChange(Number(e.target.value) / 100)}
            className="w-full accent-[rgb(var(--color-primary-600))]"
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
        <div className="space-y-6">
            <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-lg">Sound</h3>
                        <p className="text-sm text-gray-500">All music and effects are generated live by Orbit, nothing to download.</p>
                    </div>
                    <button
                        onClick={() => { audio.unlock(); audio.updateSettings({ muted: !settings.muted }); }}
                        className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors ${settings.muted ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}
                    >
                        {settings.muted ? <VolumeX size={18} /> : <Volume2 size={18} />} {settings.muted ? 'Muted' : 'On'}
                    </button>
                </div>
                <Slider label="Music" icon={Music} value={settings.music} onChange={v => audio.updateSettings({ music: v })} />
                <Slider label="Sound effects" icon={Zap} value={settings.sfx} onChange={v => { audio.updateSettings({ sfx: v }); audio.unlock(); audio.sfx('hit'); }} />
                <button onClick={preview} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold transition-colors">
                    <Play size={16} className="fill-current" /> {playing ? 'Stop preview' : 'Preview battle music'}
                </button>
            </div>
            <p className="text-sm text-gray-500 px-1">In live games, the teacher's screen plays the music. Students' devices only play short sound effects, so a class of phones stays calm.</p>
        </div>
    );
};

const AppearanceSettings = () => {
    const { theme, toggleTheme, colorTheme, toggleColorTheme } = useTheme();

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Monitor className="text-purple-500" size={20} /> Interface Theme
                </h3>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => theme === 'dark' && toggleTheme(true)}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme === 'light'
                            ? 'border-primary-500 bg-primary-50/50 text-primary-700'
                            : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        <div className="w-full h-20 bg-white rounded-lg shadow-sm mb-2 border border-gray-200" />
                        <span className="font-medium">Light Mode</span>
                    </button>
                    <button
                        onClick={() => theme === 'light' && toggleTheme(true)}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme === 'dark'
                            ? 'border-primary-500 bg-dark-bg text-primary-400'
                            : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        <div className="w-full h-20 bg-gray-900 rounded-lg shadow-sm mb-2 border border-gray-700" />
                        <span className="font-medium">Dark Mode</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Palette className="text-pink-500" size={20} /> Accent Color
                </h3>
                <div className="flex gap-3">
                    <button
                        onClick={() => colorTheme !== 'green' && toggleColorTheme(true)}
                        className={`flex-1 p-3 rounded-xl border transition-all flex items-center justify-center gap-2 font-medium ${colorTheme === 'green'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <div className="w-4 h-4 rounded-full bg-emerald-500" /> Green
                    </button>
                    <button
                        onClick={() => colorTheme !== 'blue' && toggleColorTheme(true)}
                        className={`flex-1 p-3 rounded-xl border transition-all flex items-center justify-center gap-2 font-medium ${colorTheme === 'blue'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <div className="w-4 h-4 rounded-full bg-blue-500" /> Blue
                    </button>
                </div>
            </div>
        </div>
    );
};

const AnimationPreview = ({ type, enabled }) => {
    return (
        <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden relative border border-gray-200 dark:border-gray-700 mb-4 flex items-center justify-center">

            {/* Disabled Overlay/State */}
            {!enabled && type !== 'reduced' && (
                <div className="absolute inset-0 z-30 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-[1px] flex items-center justify-center text-gray-400 font-mono text-xs uppercase tracking-widest">
                    <span>Disabled</span>
                </div>
            )}

            {/* Glassmorphism Preview */}
            {type === 'blur' && (
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    {/* Background Shapes */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="absolute w-32 h-32 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full blur-xl -top-10 -left-10 opacity-70"
                    />
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="absolute w-40 h-40 bg-gradient-to-tr from-blue-500 to-teal-500 rounded-full blur-xl -bottom-10 -right-10 opacity-70"
                    />

                    {/* The Card */}
                    <div className="relative z-10 w-2/3 h-2/3 flex items-center justify-center">
                        <div className={`absolute inset-0 border border-white/20 rounded-xl shadow-lg transition-all duration-300 ${enabled ? 'bg-white/10 dark:bg-black/10 backdrop-blur-md' : 'bg-white dark:bg-gray-900'}`}></div>
                        <span className="relative z-20 font-bold text-gray-800 dark:text-white drop-shadow-md">
                            {enabled ? 'Frosted Glass' : 'Solid Opaque'}
                        </span>
                    </div>
                </div>
            )}

            {/* Particles Preview */}
            {type === 'particles' && (
                <div className="relative w-full h-full overflow-hidden bg-gray-900">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`font-bold z-10 transition-colors ${enabled ? 'text-white' : 'text-gray-600'}`}>
                            {enabled ? 'Celebration Effects' : 'No Effects'}
                        </span>
                    </div>

                    {enabled && (
                        <>
                            {[...Array(8)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                                    initial={{ y: 140, x: Math.random() * 300, opacity: 0 }}
                                    animate={{ y: -20, opacity: [0, 1, 0] }}
                                    transition={{
                                        duration: 2 + Math.random() * 2,
                                        repeat: Infinity,
                                        delay: Math.random() * 2,
                                        ease: "easeOut"
                                    }}
                                />
                            ))}
                            {[...Array(5)].map((_, i) => (
                                <motion.div
                                    key={i + 10}
                                    className="absolute w-3 h-3 border-2 border-primary-400 rounded-sm"
                                    initial={{ y: 140, x: Math.random() * 300, rotate: 0, opacity: 0 }}
                                    animate={{ y: -20, rotate: 360, opacity: [0, 1, 0] }}
                                    transition={{
                                        duration: 3 + Math.random() * 2,
                                        repeat: Infinity,
                                        delay: Math.random() * 3,
                                        ease: "easeOut"
                                    }}
                                />
                            ))}
                        </>
                    )}
                </div>
            )}

            {/* Reduced Motion Preview */}
            {type === 'reduced' && (
                <div className="flex gap-8 items-center justify-center w-full h-full bg-white dark:bg-gray-900">
                    {/* Bouncy (Normal) */}
                    <div className={`text-center transition-opacity ${enabled ? 'opacity-30 grayscale' : 'opacity-100'}`}>
                        <motion.div
                            animate={!enabled ? { y: [0, -20, 0] } : {}}
                            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}
                            className="w-10 h-10 bg-green-500 rounded-full mb-2 mx-auto shadow-lg"
                        />
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Standard</p>
                    </div>

                    <div className="h-12 w-px bg-gray-200 dark:bg-gray-700 mx-2" />

                    {/* Fade (Reduced) */}
                    <div className={`text-center transition-opacity ${!enabled ? 'opacity-30 grayscale' : 'opacity-100'}`}>
                        <motion.div
                            animate={enabled ? { opacity: [1, 0.2, 1] } : {}}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-10 h-10 bg-gray-400 rounded-full mb-2 mx-auto"
                        />
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Reduced</p>
                    </div>
                </div>
            )}

        </div>
    );
};

const Meter = ({ value, label, color }) => (
    <div className="mt-2">
        <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500 font-medium">{label}</span>
            <span className={`font-bold ${color.replace('bg-', 'text-')}`}>{value}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
        </div>
    </div>
);

const AnimationSettings = () => {
    const { performance, updatePerformance } = useTheme();

    // Preset Handlers
    const setPreset = (mode) => {
        if (mode === 'save') {
            updatePerformance('blur', false);
            updatePerformance('particles', false);
            updatePerformance('reducedMotion', true);
        } else if (mode === 'balanced') {
            updatePerformance('blur', true);
            updatePerformance('particles', false);
            updatePerformance('reducedMotion', false);
        } else if (mode === 'max') {
            updatePerformance('blur', true);
            updatePerformance('particles', true);
            updatePerformance('reducedMotion', false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-6 rounded-2xl border border-amber-500/20">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl">
                        <Battery size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-amber-700 dark:text-amber-500">Performance Monitor</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Customize visual effects to balance aesthetics and battery life.
                        </p>
                    </div>
                </div>

                {/* Presets */}
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setPreset('save')} className="p-3 bg-white dark:bg-black/20 rounded-xl border border-amber-500/20 hover:border-amber-500/50 transition-colors text-center group">
                        <div className="font-bold text-amber-700 dark:text-amber-500 text-sm mb-1 group-hover:scale-105 transition-transform">Power Saver</div>
                        <div className="text-[10px] opacity-70">Minimal FX</div>
                    </button>
                    <button onClick={() => setPreset('balanced')} className="p-3 bg-white dark:bg-black/20 rounded-xl border border-amber-500/20 hover:border-amber-500/50 transition-colors text-center group">
                        <div className="font-bold text-amber-700 dark:text-amber-500 text-sm mb-1 group-hover:scale-105 transition-transform">Balanced</div>
                        <div className="text-[10px] opacity-70">Standard</div>
                    </button>
                    <button onClick={() => setPreset('max')} className="p-3 bg-white dark:bg-black/20 rounded-xl border border-amber-500/20 hover:border-amber-500/50 transition-colors text-center group">
                        <div className="font-bold text-amber-700 dark:text-amber-500 text-sm mb-1 group-hover:scale-105 transition-transform">High Fidelity</div>
                        <div className="text-[10px] opacity-70">All Effects</div>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
                {/* Glassmorphism Toggle */}
                <div className="flex items-start justify-between">
                    <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-gray-900 dark:text-white">Glassmorphism (Blur)</h4>
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase">High Cost</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">Enables frosted glass blur effects on cards and modals.</p>
                        <AnimationPreview type="blur" enabled={performance.blur} />
                        <Meter value={80} label="GPU Usage" color="bg-red-500" />
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={performance.blur}
                            onChange={(e) => updatePerformance('blur', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-800" />

                {/* Particles Toggle */}
                <div className="flex items-start justify-between">
                    <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-gray-900 dark:text-white">Particle Effects</h4>
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase">Medium Cost</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">Floating blobs and confetti celebrations.</p>
                        <AnimationPreview type="particles" enabled={performance.particles} />
                        <Meter value={45} label="CPU Usage" color="bg-orange-500" />
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={performance.particles}
                            onChange={(e) => updatePerformance('particles', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-800" />

                {/* Reduced Motion Toggle */}
                <div className="flex items-start justify-between">
                    <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-gray-900 dark:text-white">Reduced Motion</h4>
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">Saves Battery</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">Simplifies transitions and disables smooth scaling/movement.</p>
                        <AnimationPreview type="reduced" enabled={performance.reducedMotion} />
                        <Meter value={10} label="Impact" color="bg-green-500" />
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={performance.reducedMotion}
                            onChange={(e) => updatePerformance('reducedMotion', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                </div>
            </div>
        </div>
    );
};

const LanguageSettings = () => {
    const { lang, setLang } = useLanguage();

    return (
        <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Globe className="text-orange-500" size={20} /> Application Language
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                    { code: 'en', label: 'English', native: 'English' },
                    { code: 'uz', label: 'Uzbek', native: 'O\'zbekcha' },
                    { code: 'ru', label: 'Russian', native: 'Русский' }
                ].map((l) => (
                    <button
                        key={l.code}
                        onClick={() => setLang(l.code)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${lang === l.code
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                            : 'border-transparent bg-gray-50 hover:bg-gray-100'
                            }`}
                    >
                        <div className="font-bold text-gray-900 dark:text-white">{l.native}</div>
                        <div className="text-xs text-gray-500">{l.label}</div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const DangerZone = () => {
    return (
        <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl border border-red-100 dark:border-red-900/30">
            <h3 className="font-bold text-red-700 dark:text-red-400 text-lg mb-2">Danger Zone</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Destructive actions that cannot be undone. Please be certain.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-dark-surface p-4 rounded-xl border border-red-100 dark:border-red-900/20">
                <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-200">Delete all Orbit data in this browser</h4>
                    <p className="text-xs text-gray-500">Removes your sets, settings and saved scores from this browser. Published sets stay public.</p>
                </div>
                <button
                    onClick={() => {
                        if (window.confirm('Delete all your sets and settings from this browser? This cannot be undone.')) {
                            localStorage.clear();
                            window.location.reload();
                        }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                >
                    Delete Everything
                </button>
            </div>
        </div>
    );
};

export default Settings;
