import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { TERMS_VERSION, authMode, getAuthService, hasAccountHint, setAccountHint } from '../platform/auth';
import { CHANGELOG_VERSION } from '../config/site';
import { setSetsOwner, onSyncError } from '../platform/sets/store';
import { useLanguage } from './LanguageContext';
import { toast } from '../components/ui/toast';

// Teacher accounts. Students never need one: joining a game uses an invisible guest session.
//
// status: 'idle'    account code not loaded (student pages load nothing)
//         'loading' restoring the session
//         'ready'   `user` is the signed-in teacher, or null
const AuthContext = createContext(null);

const PROFILE_CACHE = (uid) => `orbit.profile.${uid}`;
const readCachedProfile = (uid) => {
    try {
        return JSON.parse(localStorage.getItem(PROFILE_CACHE(uid)) || 'null');
    } catch {
        return null;
    }
};
const cacheProfile = (uid, profile) => {
    try {
        localStorage.setItem(PROFILE_CACHE(uid), JSON.stringify(profile));
    } catch {
        /* ignore */
    }
};

export const AuthProvider = ({ children }) => {
    const { lang, t } = useLanguage();
    const [state, setState] = useState(() => ({ status: hasAccountHint() ? 'loading' : 'idle', user: null, profile: null }));
    const serviceRef = useRef(null);
    const startedRef = useRef(null);
    const langRef = useRef(lang);
    langRef.current = lang;

    const handleUser = useCallback(async (user, service) => {
        // Anonymous guests are "not signed in" as far as the UI is concerned
        if (!user || user.isAnonymous) {
            setAccountHint(false);
            await setSetsOwner(null);
            setState({ status: 'ready', user: null, profile: null });
            return;
        }
        setAccountHint(true);
        const cached = readCachedProfile(user.uid);
        setState(prev => ({ status: 'ready', user, profile: prev.user?.uid === user.uid ? prev.profile : cached }));
        let profile = cached;
        try {
            profile = (await service.loadProfile(user.uid)) || cached || {};
            cacheProfile(user.uid, profile);
        } catch {
            profile = cached || {};
        }
        setState(prev => (prev.user?.uid === user.uid ? { ...prev, profile } : prev));
        // Sets sync for any signed-in account (Firestore rules require email token only, not verified)
        const moved = await setSetsOwner(user.uid);
        if (moved > 0) toast(t('auth.movedSets', { count: moved }));
    }, [t]);

    // Loads the account service once; safe to call from anywhere
    const start = useCallback(() => {
        if (!startedRef.current) {
            setState(prev => (prev.status === 'idle' ? { ...prev, status: 'loading' } : prev));
            startedRef.current = getAuthService().then((service) => {
                serviceRef.current = service;
                service.setLanguage(langRef.current);
                service.watch(user => handleUser(user, service));
                return service;
            }).catch((err) => {
                startedRef.current = null;
                console.error('Could not load accounts:', err);
                setState({ status: 'ready', user: null, profile: null });
                throw err;
            });
        }
        return startedRef.current;
    }, [handleUser]);

    // Returning teachers: restore the session right away
    useEffect(() => {
        if (hasAccountHint()) start().catch(() => {});
    }, [start]);

    // Verification and password emails in the chosen language
    useEffect(() => {
        serviceRef.current?.setLanguage(lang);
    }, [lang]);

    useEffect(() => onSyncError(() => toast(t('auth.syncError'), 'error')), [t]);

    const run = useCallback(async (fn) => fn(await start()), [start]);

    const actions = useMemo(() => ({
        start,
        google: () => run(s => s.google()),
        signIn: (email, password) => run(s => s.signIn(email, password)),
        // Terms are accepted on the sign-up form, so they're saved with the new account
        signUp: (email, password, name) => run(async (s) => {
            const user = await s.signUp(email, password, name);
            const profile = { name, email: user.email, termsVersion: TERMS_VERSION, termsAcceptedAt: Date.now(), createdAt: Date.now(), seenChangelog: CHANGELOG_VERSION };
            await s.saveProfile(user.uid, profile).catch(() => {});
            cacheProfile(user.uid, profile);
            setState(prev => (prev.user?.uid === user.uid ? { ...prev, profile } : prev));
            return user;
        }),
        sendVerification: () => run(s => s.sendVerification()),
        refresh: () => run(async (s) => {
            const user = await s.refresh();
            if (user) await handleUser(user, s);
            return user;
        }),
        simulateVerify: () => run(async (s) => {
            s.simulateVerify?.();
        }),
        resetPassword: (email) => run(s => s.resetPassword(email)),
        linkPassword: (password) => run(s => s.linkPassword(password)),
        skipPasswordSetup: () => run(async (s) => {
            const user = s.current();
            if (!user) return;
            const profile = { ...(state.profile || {}), skipPasswordSetup: true };
            setState(prev => ({ ...prev, profile }));
            cacheProfile(user.uid, profile);
            await s.saveProfile(user.uid, { skipPasswordSetup: true }).catch(() => {});
        }),
        markChangelogSeen: () => run(async (s) => {
            const user = s.current();
            if (!user) return;
            const profile = { ...(state.profile || {}), seenChangelog: CHANGELOG_VERSION };
            setState(prev => ({ ...prev, profile }));
            cacheProfile(user.uid, profile);
            await s.saveProfile(user.uid, { seenChangelog: CHANGELOG_VERSION }).catch(() => {});
        }),
        acceptTerms: (name) => run(async (s) => {
            const user = s.current();
            if (!user) return;
            const isNew = !state.profile?.createdAt;
            const profile = {
                ...(state.profile || {}),
                name: name || state.profile?.name || user.name || '',
                email: user.email,
                termsVersion: TERMS_VERSION,
                termsAcceptedAt: Date.now(),
                createdAt: state.profile?.createdAt || Date.now(),
                // Brand-new accounts don't need a "what's new" for features that are all new to them
                ...(isNew ? { seenChangelog: CHANGELOG_VERSION } : {})
            };
            await s.saveProfile(user.uid, profile);
            cacheProfile(user.uid, profile);
            setState(prev => ({ ...prev, profile }));
        }),
        updateName: (name) => run(async (s) => {
            const user = s.current();
            if (!user) return;
            const profile = { ...(state.profile || {}), name };
            setState(prev => ({ ...prev, profile }));
            cacheProfile(user.uid, profile);
            await Promise.all([s.saveProfile(user.uid, { name }), s.updateName(name)]);
        }),
        signOut: () => run(async (s) => {
            await setSetsOwner(null);
            await s.signOut();
        }),
        // Confirms the password (or Google) before anything is removed, so a failed check deletes nothing
        deleteAccount: ({ password, deleteData }) => run(async (s) => {
            const user = s.current();
            if (!user) return;
            await s.reauthenticate(password);
            await deleteData(user.uid);
            await setSetsOwner(null);
            await s.deleteProfile(user.uid).catch(() => {});
            await s.deleteAccount();
            try {
                localStorage.removeItem(PROFILE_CACHE(user.uid));
            } catch {
                /* ignore */
            }
        })
    }), [run, start, handleUser, state.profile]);

    const user = state.user;
    const verified = !!user?.emailVerified;
    const termsOk = state.profile?.termsVersion === TERMS_VERSION;
    // Any signed-in user with accepted terms can create sets (no email verification needed)
    const isCreator = !!user && termsOk;
    // Hosting games also requires email verification
    const isTeacher = !!user && verified && termsOk;
    // Google-only accounts that haven't set a backup password and haven't skipped the prompt
    const needsPassword = !!user && user.provider === 'google'
        && !(user.providers || []).includes('password')
        && !state.profile?.skipPasswordSetup
        && termsOk;

    const value = useMemo(() => ({
        ...actions,
        mode: authMode,
        status: state.status,
        user,
        profile: state.profile,
        isCreator,
        isTeacher,
        // needs for creating sets: no email verification required
        needsForCreate: !user ? 'signin' : state.profile === null ? 'loading' : !termsOk ? 'terms' : needsPassword ? 'setPassword' : null,
        // needs for hosting: email verification required
        needs: !user ? 'signin' : !verified ? 'verify' : state.profile === null ? 'loading' : !termsOk ? 'terms' : needsPassword ? 'setPassword' : null,
        displayName: state.profile?.name || user?.name || ''
    }), [actions, state.status, state.profile, user, verified, termsOk, isCreator, isTeacher, needsPassword]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
