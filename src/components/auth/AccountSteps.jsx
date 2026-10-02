import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LogOut, KeyRound, Sparkles, ChevronRight, X } from 'lucide-react';
import { IconOrb, btn, inputClass, cx } from '../ui';
import SpaceScreen from '../SpaceScreen';
import { toast } from '../ui/toast';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../context/LanguageContext';
import { authErrorKey } from '../../platform/auth';
import { CHANGELOG, CHANGELOG_VERSION } from '../../config/site';
import { ConsentChecks, ErrorNote, PasswordInput } from './AuthPanel';

// Name + terms, for accounts that haven't accepted the current terms (e.g. first Google sign-in)
export const AcceptTerms = () => {
    const t = useT();
    const auth = useAuth();
    const [name, setName] = useState(auth.displayName || auth.user?.name || '');
    const [terms, setTerms] = useState(false);
    const [age, setAge] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return setError(t('auth.validation.name'));
        setBusy(true);
        setError('');
        try {
            await auth.acceptTerms(name.trim().slice(0, 40));
            toast(t('auth.welcome', { name: name.trim() }));
        } catch (err) {
            setError(t(authErrorKey(err)));
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="orbit-card w-full max-w-md p-6 sm:p-8" noValidate>
            <div className="text-center">
                {auth.user?.photoURL
                    ? <img src={auth.user.photoURL} alt="" referrerPolicy="no-referrer" className="w-16 h-16 rounded-full mx-auto ring-4 ring-primary-400/30" />
                    : <span className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary-400 to-violet-600 text-white text-2xl font-display font-bold flex items-center justify-center">{(name || '?').charAt(0).toUpperCase()}</span>}
                <h1 className="font-display text-2xl font-bold mt-4 text-gray-900 dark:text-white">{t('auth.terms.title')}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{t('auth.terms.text')}</p>
                <p className="text-xs text-gray-400 mt-1">{auth.user?.email}</p>
            </div>
            <div className="mt-6 space-y-4">
                <div>
                    <label htmlFor="terms-name" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">{t('auth.name')}</label>
                    <input id="terms-name" value={name} onChange={e => setName(e.target.value)} maxLength={40} autoComplete="name" className={inputClass} />
                </div>
                <ConsentChecks terms={terms} setTerms={setTerms} age={age} setAge={setAge} />
                {error && <ErrorNote>{error}</ErrorNote>}
                <button type="submit" disabled={busy || !terms || !age} className={cx(btn.primary, 'w-full py-3')}>{t('auth.terms.submit')}</button>
                <button type="button" onClick={() => auth.signOut()} className={cx(btn.ghost, 'w-full')}>{t('auth.verify.other')}</button>
            </div>
        </form>
    );
};

// Required password for Google-only accounts
export const SetPassword = () => {
    const t = useT();
    const auth = useAuth();
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        if (password.length < 8) return setError(t('auth.validation.password'));
        setBusy(true);
        setError('');
        try {
            await auth.linkPassword(password);
            toast(t('auth.setPassword.saved'));
        } catch (err) {
            setError(t(authErrorKey(err)));
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="orbit-card w-full max-w-md p-6 sm:p-8" noValidate>
            <div className="text-center">
                <div className="flex justify-center"><IconOrb icon={KeyRound} tone="violet" size={64} /></div>
                <h1 className="font-display text-2xl font-bold mt-4 text-gray-900 dark:text-white">{t('auth.setPassword.title')}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{t('auth.setPassword.text')}</p>
                <p className="text-xs text-gray-400 mt-1">{auth.user?.email}</p>
            </div>
            <div className="mt-6 space-y-4">
                <div>
                    <label htmlFor="set-pw" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">{t('auth.passwordNew')}</label>
                    <PasswordInput id="set-pw" value={password} onChange={setPassword} autoComplete="new-password" />
                    <p className="text-xs text-gray-400 mt-1">{t('auth.passwordHint')}</p>
                </div>
                {error && <ErrorNote>{error}</ErrorNote>}
                <button type="submit" disabled={busy || password.length < 8} className={cx(btn.primary, 'w-full py-3')}>
                    <KeyRound size={17} /> {t('auth.setPassword.submit')}
                </button>
                <button type="button" onClick={() => auth.signOut()} className={cx(btn.ghost, 'w-full')}>
                    <LogOut size={16} /> {t('auth.verify.other')}
                </button>
            </div>
        </form>
    );
};

// Signed-in Google accounts without a password see only this until they create one.
// The legal pages stay readable.
export const PasswordGate = ({ children }) => {
    const auth = useAuth();
    const { pathname } = useLocation();
    if (!auth.needsPassword || /^\/(terms|privacy)\/?$/.test(pathname)) return children;
    return <SpaceScreen center><SetPassword /></SpaceScreen>;
};

// Full-screen game pages: never cover them with a popup
const GAME_ROUTES = /^\/(room|board|play|practice|join)(\/|$)/;

// "What's New" modal shown once per CHANGELOG_VERSION to signed-in users
export const WhatsNew = () => {
    const t = useT();
    const auth = useAuth();
    const { pathname } = useLocation();

    // Only after sign-up steps (terms, password) are done
    const open = !!auth.user && auth.needs === null && !auth.needsPassword
        && auth.profile?.seenChangelog !== CHANGELOG_VERSION
        && !GAME_ROUTES.test(pathname);

    const dismiss = () => {
        auth.markChangelogSeen().catch(() => {});
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={dismiss}>
            <div className="orbit-card w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>
                <button onClick={dismiss} className={cx(btn.icon, 'absolute top-3 right-3')} aria-label={t('common.close')}><X size={18} /></button>
                <div className="flex items-center gap-3 mb-4">
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-violet-600 flex items-center justify-center text-white shrink-0">
                        <Sparkles size={20} />
                    </span>
                    <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">{t('whatsNew.title')}</h2>
                </div>
                <ul className="space-y-2.5">
                    {CHANGELOG.map(key => (
                        <li key={key} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                            <ChevronRight size={16} className="text-primary-500 shrink-0 mt-0.5" />
                            <span>{t(key)}</span>
                        </li>
                    ))}
                </ul>
                <button onClick={dismiss} className={cx(btn.primary, 'w-full mt-5')}>{t('whatsNew.ok')}</button>
            </div>
        </div>
    );
};
