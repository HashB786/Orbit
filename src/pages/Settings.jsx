import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    User, Palette, Globe, Zap, Trash2, Volume2, VolumeX, Music, Play, Check, Settings as SettingsIcon, Battery, Gauge, Sparkles,
    LogIn, LogOut, UserPlus, Mail, ShieldCheck
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage, useT } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Toggle, ConfirmDialog, IconOrb, Modal, Spinner, btn, inputClass, cx } from '../components/ui';
import { toast } from '../components/ui/toast';
import { GoogleIcon, PasswordInput, ErrorNote } from '../components/auth/AuthPanel';
import { authErrorKey, isSilentAuthError } from '../platform/auth';
import { localeOf } from '../i18n';
import { deleteAllSets } from '../platform/sets/store';
import { deletePublicSetsOf } from '../platform/sets/publicSets';
import Flag from '../components/art/Flag';
import { Stars } from '../components/art/shapes';
import { audio } from '../platform/audio/audio';

const TABS = [
    { id: 'account', icon: User },
    { id: 'appearance', icon: Palette },
    { id: 'sound', icon: Volume2 },
    { id: 'performance', icon: Zap },
    { id: 'language', icon: Globe },
    { id: 'data', icon: Trash2 }
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

// ---------- Account ----------

const DeleteAccountDialog = ({ open, onClose }) => {
    const t = useT();
    const auth = useAuth();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const google = auth.user?.provider === 'google';

    const remove = async () => {
        setBusy(true);
        setError('');
        try {
            await auth.deleteAccount({
                password,
                // Published sets first: they need the account's permission to be removed
                deleteData: async (uid) => {
                    await deletePublicSetsOf(uid);
                    await deleteAllSets();
                }
            });
            onClose();
            toast(t('account.deleted'));
            navigate('/');
        } catch (err) {
            if (!isSilentAuthError(err)) setError(t(authErrorKey(err)));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={busy ? () => {} : onClose}
            title={t('account.deleteTitle')}
            size="sm"
            footer={(
                <>
                    <button className={btn.secondary} onClick={onClose} disabled={busy}>{t('common.cancel')}</button>
                    <button className={btn.danger} onClick={remove} disabled={busy || (!google && !password)}>
                        {busy ? <Spinner size={16} /> : <Trash2 size={16} />} {t('account.deleteConfirm')}
                    </button>
                </>
            )}
        >
            <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('account.deleteText')}</p>
                {google ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('account.deleteGoogle')}</p>
                ) : (
                    <div>
                        <label htmlFor="delete-password" className="block text-sm font-semibold mb-1.5">{t('account.deletePassword')}</label>
                        <PasswordInput id="delete-password" value={password} onChange={setPassword} autoComplete="current-password" />
                    </div>
                )}
                {error && <ErrorNote>{error}</ErrorNote>}
            </div>
        </Modal>
    );
};

const NameField = ({ initial, onSave, saving }) => {
    const t = useT();
    const [name, setName] = useState(initial);
    useEffect(() => setName(initial), [initial]);
    const changed = name.trim() && name.trim() !== initial;
    return (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (changed) onSave(name.trim()); }}>
            <input
                id="display-name"
                aria-label={t('account.name')}
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 40))}
                className={inputClass}
                placeholder={t('auth.namePlaceholder')}
                autoComplete="name"
            />
            <button type="submit" disabled={!changed || saving} className={cx(btn.primary, 'shrink-0')}>{t('common.save')}</button>
        </form>
    );
};

const Avatar = ({ user, name }) => (user?.photoURL
    ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-14 h-14 shrink-0 rounded-full object-cover ring-2 ring-primary-400/40" />
    : (
        <span className="w-14 h-14 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-violet-600 text-white text-2xl font-display font-bold flex items-center justify-center shadow-[0_0_24px_-6px_rgb(var(--color-primary-400))]">
            {(name || '?').charAt(0).toUpperCase()}
        </span>
    ));

const AccountSettings = () => {
    const { t, lang } = useLanguage();
    const auth = useAuth();
    const { userData, updateUserData } = useUser();
    const [deleting, setDeleting] = useState(false);
    const [saving, setSaving] = useState(false);

    if (auth.status === 'loading') return <Panel><div className="flex justify-center py-8"><Spinner /></div></Panel>;

    // Guests and students: a nickname kept in this browser, plus the way in for teachers
    if (!auth.user) {
        return (
            <div className="space-y-4">
                <Panel title={t('account.nickname')} subtitle={t('account.nicknameText')}>
                    <div className="flex items-center gap-4">
                        <Avatar name={userData.name} />
                        <input
                            id="display-name"
                            aria-label={t('account.nickname')}
                            value={userData.name}
                            onChange={(e) => updateUserData({ name: e.target.value.slice(0, 40) })}
                            className={inputClass}
                            placeholder={t('play.nicknamePlaceholder')}
                        />
                    </div>
                </Panel>
                <Panel title={t('account.teacherTitle')} subtitle={t('account.teacherText')}>
                    <div className="flex flex-wrap gap-2">
                        <Link to="/signin?next=/settings" className={btn.primary}><LogIn size={18} /> {t('auth.signInButton')}</Link>
                        <Link to="/signin?mode=signup&next=/settings" className={btn.secondary}><UserPlus size={18} /> {t('auth.signup.title')}</Link>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">{t('auth.studentNote')}</p>
                </Panel>
            </div>
        );
    }

    const saveName = async (name) => {
        setSaving(true);
        updateUserData({ name });
        setSaving(false);
        toast(t('account.nameSaved'));
    };

    const unfinished = auth.needs === 'terms';

    return (
        <div className="space-y-4">
            <Panel>
                <div className="flex items-center gap-4 min-w-0">
                    <Avatar user={auth.user} name={auth.displayName} />
                    <div className="min-w-0">
                        <p className="font-display text-xl font-bold text-gray-900 dark:text-white truncate">{auth.displayName || auth.user.email}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{auth.user.email}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-white/[0.07] text-gray-600 dark:text-gray-300">
                                {auth.user.provider === 'google' ? <GoogleIcon size={11} /> : <Mail size={11} />}
                                {t(`account.provider.${auth.user.provider === 'google' ? 'google' : 'password'}`)}
                            </span>
                            {auth.user.emailVerified && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"><ShieldCheck size={11} /> {t('account.verified')}</span>}
                        </div>
                    </div>
                </div>
                {unfinished && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/60 dark:border-amber-400/20 bg-amber-50 dark:bg-amber-400/[0.06] p-3.5">
                        <p className="text-sm text-amber-800 dark:text-amber-200">{t('account.finishTerms')}</p>
                        <Link to="/signin?next=/settings" className={cx(btn.primary, 'py-2')}>{t('common.continue')}</Link>
                    </div>
                )}
            </Panel>

            <Panel title={t('account.name')} subtitle={t('account.nameText')}>
                <NameField initial={auth.displayName} onSave={saveName} saving={saving} />
            </Panel>

            <Panel title={t('account.legalTitle')}>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    {auth.profile?.termsAcceptedAt
                        ? t('account.termsAccepted', { date: new Date(auth.profile.termsAcceptedAt).toLocaleDateString(localeOf(lang), { dateStyle: 'medium' }) })
                        : t('account.termsNotAccepted')}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm font-semibold">
                    <Link to="/terms" className="text-primary-600 dark:text-primary-300 hover:underline">{t('legal.terms.title')}</Link>
                    <Link to="/privacy" className="text-primary-600 dark:text-primary-300 hover:underline">{t('legal.privacy.title')}</Link>
                </div>
            </Panel>

            <Panel>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{t('auth.signOut')}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('account.signOutText')}</p>
                    </div>
                    <button
                        onClick={() => auth.signOut().then(() => toast(t('auth.signedOut'))).catch(err => toast(t(authErrorKey(err)), 'error'))}
                        className={cx(btn.secondary, 'shrink-0')}
                    >
                        <LogOut size={18} /> {t('auth.signOut')}
                    </button>
                </div>
            </Panel>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-rose-300/60 dark:border-rose-400/20 bg-rose-50 dark:bg-rose-500/[0.06] p-4">
                <div className="flex items-start gap-3">
                    <IconOrb icon={Trash2} tone="rose" size={40} moon={false} />
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{t('account.deleteTitle')}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('account.deleteShort')}</p>
                    </div>
                </div>
                <button onClick={() => setDeleting(true)} className={cx(btn.danger, 'shrink-0')}>{t('account.deleteButton')}</button>
            </div>
            {deleting && <DeleteAccountDialog open onClose={() => setDeleting(false)} />}
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
    { id: 'green', from: '#6ee7b7', to: '#047857' },
    { id: 'blue', from: '#93c5fd', to: '#1d4ed8' },
    { id: 'violet', from: '#c4b5fd', to: '#6d28d9' }
];

const AppearanceSettings = () => {
    const t = useT();
    const { theme, setTheme, colorTheme, setColorTheme } = useTheme();
    return (
        <div className="space-y-4">
            <Panel title={t('settings.theme')} subtitle={t('settings.themeText')}>
                <div className="grid grid-cols-2 gap-3">
                    {[{ id: 'dark', label: t('settings.space') }, { id: 'light', label: t('settings.daylight') }].map(opt => (
                        <Choice key={opt.id} selected={theme === opt.id} onClick={() => setTheme(opt.id, true)}>
                            <ThemePreview dark={opt.id === 'dark'} />
                            <span className="block font-bold mt-2 text-gray-900 dark:text-white">{opt.label}</span>
                        </Choice>
                    ))}
                </div>
            </Panel>
            <Panel title={t('settings.accent')} subtitle={t('settings.accentText')}>
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
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{t(`settings.accents.${a.id}`)}</span>
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
    const t = useT();
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
            <Panel title={t('settings.tabs.sound')} subtitle={t('settings.soundText')}>
                <div className="space-y-6">
                    <button
                        onClick={() => { audio.unlock(); audio.updateSettings({ muted: !settings.muted }); }}
                        className={cx(btn.secondary, settings.muted && '!text-rose-600 dark:!text-rose-300')}
                    >
                        {settings.muted ? <VolumeX size={18} /> : <Volume2 size={18} />} {settings.muted ? t('settings.soundOff') : t('settings.soundOn')}
                    </button>
                    <Slider label={t('settings.music')} icon={Music} value={settings.music} onChange={v => audio.updateSettings({ music: v })} />
                    <Slider label={t('settings.effects')} icon={Zap} value={settings.sfx} onChange={v => { audio.updateSettings({ sfx: v }); audio.unlock(); audio.sfx('hit'); }} />
                    <button onClick={preview} className={btn.primary}>
                        <Play size={16} className="fill-current" /> {playing ? t('settings.stopPreview') : t('settings.preview')}
                    </button>
                </div>
            </Panel>
            <p className="text-sm text-gray-500 dark:text-gray-400 px-1">{t('settings.soundNote')}</p>
        </div>
    );
};

// ---------- Performance ----------

const PRESETS = [
    { id: 'saver', icon: Battery, particles: false, reducedMotion: true },
    { id: 'balanced', icon: Gauge, particles: false, reducedMotion: false },
    { id: 'full', icon: Sparkles, particles: true, reducedMotion: false }
];

const PerformanceSettings = () => {
    const t = useT();
    const { performance, updatePerformance } = useTheme();
    const current = PRESETS.find(p => p.particles === !!performance.particles && p.reducedMotion === !!performance.reducedMotion)?.id;
    const apply = (p) => {
        updatePerformance('particles', p.particles);
        updatePerformance('reducedMotion', p.reducedMotion);
    };
    return (
        <div className="space-y-4">
            <Panel title={t('settings.tabs.performance')} subtitle={t('settings.performanceText')}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {PRESETS.map(p => (
                        <Choice key={p.id} selected={current === p.id} onClick={() => apply(p)} className="p-4">
                            <p.icon size={22} className="text-primary-500" />
                            <span className="block font-bold mt-2 text-gray-900 dark:text-white">{t(`settings.presets.${p.id}.label`)}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t(`settings.presets.${p.id}.text`)}</span>
                        </Choice>
                    ))}
                </div>
            </Panel>
            <Panel>
                <div className="space-y-5">
                    <Toggle
                        label={t('settings.particles')}
                        help={t('settings.particlesHelp')}
                        checked={!!performance.particles}
                        onChange={v => updatePerformance('particles', v)}
                    />
                    <div className="h-px bg-gray-200/70 dark:bg-white/[0.07]" />
                    <Toggle
                        label={t('settings.reducedMotion')}
                        help={t('settings.reducedMotionHelp')}
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
    { code: 'en', native: 'English' },
    { code: 'uz', native: 'Oʻzbekcha' },
    { code: 'ru', native: 'Русский' }
];

const LanguageSettings = () => {
    const { lang, setLang, t } = useLanguage();
    return (
        <Panel title={t('settings.languageTitle')} subtitle={t('settings.languageText')}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {LANGUAGES.map(l => (
                    <Choice key={l.code} selected={lang === l.code} onClick={() => setLang(l.code)} className="flex items-center gap-3 p-4">
                        <Flag code={l.code} className="w-12 h-8 rounded-md shadow-sm" />
                        <span className="min-w-0">
                            <span className="block font-bold text-gray-900 dark:text-white">{l.native}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400">{t(`settings.languages.${l.code}`)}</span>
                        </span>
                    </Choice>
                ))}
            </div>
        </Panel>
    );
};

// ---------- Data ----------

const DataSettings = () => {
    const t = useT();
    const [confirm, setConfirm] = useState(false);
    return (
        <Panel title={t('settings.tabs.data')} subtitle={t('settings.dataText')}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-rose-300/60 dark:border-rose-400/20 bg-rose-50 dark:bg-rose-500/[0.06] p-4">
                <div className="flex items-start gap-3">
                    <IconOrb icon={Trash2} tone="rose" size={40} moon={false} />
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{t('settings.resetTitle')}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.resetText')}</p>
                    </div>
                </div>
                <button onClick={() => setConfirm(true)} className={cx(btn.danger, 'shrink-0')}>{t('settings.resetButton')}</button>
            </div>
            <ConfirmDialog
                open={confirm}
                title={t('settings.resetConfirmTitle')}
                message={t('settings.resetConfirmText')}
                confirmLabel={t('settings.resetButton')}
                danger
                onCancel={() => setConfirm(false)}
                onConfirm={() => {
                    // Keep the language and "a teacher signs in here", so the account comes back after the reload
                    const keep = ['language', 'orbit.accountHint'].map(k => [k, localStorage.getItem(k)]);
                    localStorage.clear();
                    keep.forEach(([k, v]) => v !== null && localStorage.setItem(k, v));
                    window.location.reload();
                }}
            />
        </Panel>
    );
};

const PANELS = {
    account: AccountSettings,
    appearance: AppearanceSettings,
    sound: SoundSettings,
    performance: PerformanceSettings,
    language: LanguageSettings,
    data: DataSettings
};

const Settings = () => {
    // ?tab=account opens a tab directly (the sidebar's account link)
    const [params, setParams] = useSearchParams();
    const active = PANELS[params.get('tab')] ? params.get('tab') : 'account';
    const setActive = (id) => setParams(id === 'account' ? {} : { tab: id }, { replace: true });
    const { t } = useLanguage();
    const Current = PANELS[active];

    return (
        <div className="space-y-6 md:pb-16">
            <PageHeader icon={SettingsIcon} tone="slate" title={t('nav.settings')} subtitle={t('settings.subtitle')} />
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                <nav className="md:w-56 shrink-0 flex md:flex-col gap-1 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1 md:pb-0" aria-label={t('settings.sections')}>
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
                            {t(`settings.tabs.${tab.id}`)}
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
