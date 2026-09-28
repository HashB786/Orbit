import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, AlertTriangle, ArrowLeft, Info, MailCheck } from 'lucide-react';
import OrbitLogo from '../OrbitLogo';
import { btn, inputClass, cx } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../context/LanguageContext';
import { authErrorKey, isSilentAuthError } from '../../platform/auth';
import Slots from '../../i18n/Slots';

// Google's "G" mark (brand colours, as Google asks sign-in buttons to use)
export const GoogleIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
);

export const GoogleButton = ({ onClick, disabled }) => {
    const t = useT();
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-gray-50 text-[#1f1f1f] font-semibold border border-gray-300 shadow-sm transition-colors disabled:opacity-60"
        >
            <GoogleIcon /> {t('auth.google')}
        </button>
    );
};

export const ErrorNote = ({ children }) => (
    <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-300/70 dark:border-rose-400/25 bg-rose-50 dark:bg-rose-500/[0.08] px-3 py-2.5 text-sm text-rose-700 dark:text-rose-200">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" /> <span>{children}</span>
    </p>
);

const Field = ({ id, label, children, hint }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">{label}</label>
        {children}
        {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{hint}</p>}
    </div>
);

export const PasswordInput = ({ id, value, onChange, autoComplete }) => {
    const t = useT();
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                id={id}
                type={show ? 'text' : 'password'}
                value={value}
                onChange={e => onChange(e.target.value)}
                autoComplete={autoComplete}
                className={cx(inputClass, 'pr-11')}
                maxLength={128}
            />
            <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    );
};

const strengthOf = (pw) => {
    if (pw.length < 8) return 'weak';
    const kinds = [/[a-z]/i, /\d/, /[^a-z0-9]/i].filter(r => r.test(pw)).length;
    return pw.length >= 12 && kinds >= 2 ? 'strong' : 'ok';
};

export const ConsentChecks = ({ terms, setTerms, age, setAge }) => {
    const t = useT();
    const link = (to, label) => (
        <Link to={to} target="_blank" rel="noopener" className="font-semibold text-primary-600 dark:text-primary-300 underline underline-offset-2">{label}</Link>
    );
    return (
        <div className="space-y-2.5">
            <label className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} className="mt-0.5 w-4 h-4 shrink-0 accent-[rgb(var(--color-primary-600))]" />
                <span><Slots text={t('auth.consent.terms')} slots={{ terms: link('/terms', t('auth.consent.termsLink')), privacy: link('/privacy', t('auth.consent.privacyLink')) }} /></span>
            </label>
            <label className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                <input type="checkbox" checked={age} onChange={e => setAge(e.target.checked)} className="mt-0.5 w-4 h-4 shrink-0 accent-[rgb(var(--color-primary-600))]" />
                <span>{t('auth.consent.age')}</span>
            </label>
        </div>
    );
};

const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

// Sign in / create account / reset password, in one card
const AuthPanel = ({ reason = 'default', initialMode = 'signin' }) => {
    const t = useT();
    const auth = useAuth();
    const [mode, setMode] = useState(initialMode);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [terms, setTerms] = useState(false);
    const [age, setAge] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [resetSent, setResetSent] = useState('');

    const switchMode = (next) => {
        setMode(next);
        setError('');
        setResetSent('');
    };

    const attempt = async (fn) => {
        setBusy(true);
        setError('');
        try {
            await fn();
        } catch (err) {
            if (!isSilentAuthError(err)) setError(t(authErrorKey(err)));
        } finally {
            setBusy(false);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        if (mode === 'reset') {
            if (!validEmail(email)) return setError(t('auth.validation.email'));
            return attempt(async () => {
                await auth.resetPassword(email.trim());
                setResetSent(email.trim());
            });
        }
        if (mode === 'signup') {
            if (!name.trim()) return setError(t('auth.validation.name'));
            if (!validEmail(email)) return setError(t('auth.validation.email'));
            if (password.length < 8) return setError(t('auth.validation.password'));
            return attempt(() => auth.signUp(email.trim(), password, name.trim().slice(0, 40)));
        }
        if (!validEmail(email)) return setError(t('auth.validation.email'));
        if (!password) return setError(t('auth.errors.missing-password'));
        return attempt(() => auth.signIn(email.trim(), password));
    };

    const strength = strengthOf(password);
    const title = mode === 'signup' ? t('auth.signup.title') : mode === 'reset' ? t('auth.reset.title') : t('auth.signin.title');

    return (
        <div className="orbit-card w-full max-w-md p-6 sm:p-8">
            <div className="flex flex-col items-center text-center">
                <OrbitLogo size={52} animated />
                <h1 className="font-display text-2xl font-bold mt-4 text-gray-900 dark:text-white">{title}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                    {mode === 'reset' ? t('auth.reset.text') : t(`auth.reasons.${reason}`)}
                </p>
            </div>

            {auth.mode === 'local' && (
                <p className="mt-4 flex gap-2 items-start rounded-xl border border-amber-300/60 dark:border-amber-400/20 bg-amber-50 dark:bg-amber-400/[0.07] px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                    <Info size={14} className="shrink-0 mt-0.5" /> {t('auth.offline')}
                </p>
            )}

            {mode !== 'reset' && (
                <div className="mt-6">
                    <GoogleButton disabled={busy} onClick={() => attempt(() => auth.google())} />
                    <div className="flex items-center gap-3 my-5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        <span className="flex-1 h-px bg-gray-200 dark:bg-white/10" /> {t('auth.orEmail')} <span className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                    </div>
                </div>
            )}

            {resetSent ? (
                <div className="mt-6 space-y-4">
                    <p className="flex items-start gap-2.5 rounded-xl border border-emerald-300/70 dark:border-emerald-400/25 bg-emerald-50 dark:bg-emerald-400/[0.07] px-3 py-3 text-sm text-emerald-800 dark:text-emerald-200">
                        <MailCheck size={18} className="shrink-0" /> {t('auth.reset.sent', { email: resetSent })}
                    </p>
                    <button type="button" onClick={() => switchMode('signin')} className={cx(btn.secondary, 'w-full')}><ArrowLeft size={16} /> {t('auth.reset.back')}</button>
                </div>
            ) : (
                <form onSubmit={submit} className={cx('space-y-4', mode === 'reset' && 'mt-6')} noValidate>
                    {mode === 'signup' && (
                        <Field id="auth-name" label={t('auth.name')}>
                            <input id="auth-name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" maxLength={40} placeholder={t('auth.namePlaceholder')} className={inputClass} />
                        </Field>
                    )}
                    <Field id="auth-email" label={t('auth.email')}>
                        <input id="auth-email" type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder={t('auth.emailPlaceholder')} className={inputClass} />
                    </Field>
                    {mode !== 'reset' && (
                        <Field
                            id="auth-password"
                            label={mode === 'signup' ? t('auth.passwordNew') : t('auth.password')}
                            hint={mode === 'signup' ? t('auth.passwordHint') : null}
                        >
                            <PasswordInput id="auth-password" value={password} onChange={setPassword} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                            {mode === 'signup' && password && (
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                                        <div className={cx('h-full rounded-full transition-all', strength === 'weak' ? 'w-1/4 bg-rose-400' : strength === 'ok' ? 'w-2/3 bg-amber-400' : 'w-full bg-emerald-400')} />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t(`auth.strength.${strength}`)}</span>
                                </div>
                            )}
                        </Field>
                    )}
                    {mode === 'signin' && (
                        <div className="-mt-1 text-right">
                            <button type="button" onClick={() => switchMode('reset')} className="text-sm font-semibold text-primary-600 dark:text-primary-300 hover:underline">{t('auth.forgot')}</button>
                        </div>
                    )}
                    {mode === 'signup' && <ConsentChecks terms={terms} setTerms={setTerms} age={age} setAge={setAge} />}

                    {error && <ErrorNote>{error}</ErrorNote>}

                    <button type="submit" disabled={busy || (mode === 'signup' && (!terms || !age))} className={cx(btn.primary, 'w-full py-3')}>
                        {mode === 'signup' ? t('auth.signup.submit') : mode === 'reset' ? t('auth.reset.submit') : t('auth.signin.submit')}
                    </button>
                </form>
            )}

            <div className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
                {mode === 'signin' && <>{t('auth.signin.switch')} <button type="button" onClick={() => switchMode('signup')} className="font-bold text-primary-600 dark:text-primary-300 hover:underline">{t('auth.signin.switchLink')}</button></>}
                {mode === 'signup' && <>{t('auth.signup.switch')} <button type="button" onClick={() => switchMode('signin')} className="font-bold text-primary-600 dark:text-primary-300 hover:underline">{t('auth.signup.switchLink')}</button></>}
                {mode === 'reset' && !resetSent && <button type="button" onClick={() => switchMode('signin')} className="font-bold text-primary-600 dark:text-primary-300 hover:underline">{t('auth.reset.back')}</button>}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-200/80 dark:border-white/10 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('auth.studentNote')} <Link to="/join" className="font-bold text-primary-600 dark:text-primary-300 hover:underline">{t('auth.studentLink')}</Link>
            </div>
        </div>
    );
};

export default AuthPanel;
