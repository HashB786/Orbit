import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MailCheck, RefreshCw, LogOut, Info, Wand2, KeyRound, Sparkles, ChevronRight, X } from 'lucide-react';
import { IconOrb, btn, inputClass, cx } from '../ui';
import { toast } from '../ui/toast';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../context/LanguageContext';
import { authErrorKey } from '../../platform/auth';
import { CHANGELOG, CHANGELOG_VERSION } from '../../config/site';
import Rich from '../../i18n/Rich';
import { ConsentChecks, ErrorNote, PasswordInput } from './AuthPanel';

const COOLDOWN = 60;

// Waiting for the teacher to click the link in the verification email
export const VerifyEmail = () => {
    const t = useT();
    const auth = useAuth();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(COOLDOWN);
    const checking = useRef(false);

    // Count down until "send again" is allowed
    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    // Notice the click automatically: check every 5 s while this tab is visible, and when it comes back
    useEffect(() => {
        const check = async () => {
            if (checking.current || document.hidden) return;
            checking.current = true;
            try {
                const user = await auth.refresh();
                if (user?.emailVerified) toast(t('auth.verify.verified'));
            } catch {
                /* offline: try again later */
            } finally {
                checking.current = false;
            }
        };
        const timer = setInterval(check, 5000);
        document.addEventListener('visibilitychange', check);
        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', check);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const done = async () => {
        setBusy(true);
        setError('');
        try {
            const user = await auth.refresh();
            if (user?.emailVerified) toast(t('auth.verify.verified'));
            else setError(t('auth.verify.notYet'));
        } catch (err) {
            setError(t(authErrorKey(err)));
        } finally {
            setBusy(false);
        }
    };

    const resend = async () => {
        setError('');
        try {
            await auth.sendVerification();
            setCooldown(COOLDOWN);
            toast(t('auth.verify.resent'));
        } catch (err) {
            setError(t(authErrorKey(err)));
        }
    };

    return (
        <div className="orbit-card w-full max-w-md p-6 sm:p-8 text-center">
            <div className="flex justify-center"><IconOrb icon={MailCheck} tone="sky" size={64} /></div>
            <h1 className="font-display text-2xl font-bold mt-4 text-gray-900 dark:text-white">{t('auth.verify.title')}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2"><Rich text={t('auth.verify.text', { email: auth.user?.email || '' })} /></p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('auth.verify.spam')}</p>

            {auth.mode === 'local' && (
                <div className="mt-4 rounded-xl border border-amber-300/60 dark:border-amber-400/20 bg-amber-50 dark:bg-amber-400/[0.07] p-3 text-left">
                    <p className="flex gap-2 text-xs text-amber-800 dark:text-amber-200"><Info size={14} className="shrink-0 mt-0.5" /> {t('auth.offline')}</p>
                    <button type="button" onClick={async () => { await auth.simulateVerify(); await auth.refresh(); }} className={cx(btn.secondary, 'w-full mt-2 text-sm')}>
                        <Wand2 size={15} /> {t('auth.verify.simulate')}
                    </button>
                </div>
            )}

            {error && <div className="mt-4 text-left"><ErrorNote>{error}</ErrorNote></div>}

            <div className="mt-6 space-y-2">
                <button type="button" onClick={done} disabled={busy} className={cx(btn.primary, 'w-full py-3')}>
                    <RefreshCw size={17} className={busy ? 'animate-spin' : ''} /> {t('auth.verify.done')}
                </button>
                <button type="button" onClick={resend} disabled={cooldown > 0} className={cx(btn.secondary, 'w-full')}>
                    {cooldown > 0 ? t('auth.verify.resendIn', { seconds: cooldown }) : t('auth.verify.resend')}
                </button>
                <button type="button" onClick={() => auth.signOut()} className={cx(btn.ghost, 'w-full')}>
                    <LogOut size={16} /> {t('auth.verify.other')}
                </button>
            </div>
        </div>
    );
};

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

// Optional backup-password setup for Google-only accounts
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

    const skip = async () => {
        await auth.skipPasswordSetup();
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
                    <PasswordInput id="set-pw" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
                    <p className="text-xs text-gray-400 mt-1">{t('auth.passwordHint')}</p>
                </div>
                {error && <ErrorNote>{error}</ErrorNote>}
                <button type="submit" disabled={busy || password.length < 8} className={cx(btn.primary, 'w-full py-3')}>
                    <KeyRound size={17} /> {t('auth.setPassword.submit')}
                </button>
                <button type="button" onClick={skip} className={cx(btn.ghost, 'w-full')}>{t('auth.setPassword.skip')}</button>
            </div>
        </form>
    );
};

// Full-screen game pages: never cover them with a popup
const GAME_ROUTES = /^\/(room|board|play|practice|join)(\/|$)/;

// "What's New" modal shown once per CHANGELOG_VERSION to signed-in users
export const WhatsNew = () => {
    const t = useT();
    const auth = useAuth();
    const { pathname } = useLocation();

    // Only after sign-up steps (terms, backup password) are done
    const open = !!auth.user && auth.needsForCreate === null
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
