// Picks the account service: Firebase when configured, otherwise the offline simulation.

import { isFirebaseConfigured } from '../../config/firebase';

// Bump when the Terms of Use or Privacy Policy change: teachers are asked to accept again
export const TERMS_VERSION = '2026-09-29';

export const authMode = isFirebaseConfigured ? 'firebase' : 'local';

let service = null;
export const getAuthService = () => {
    if (!service) {
        service = (isFirebaseConfigured
            ? import('./firebaseAuth').then(m => m.createFirebaseAuth())
            : import('./localAuth').then(m => m.createLocalAuth())
        ).catch(err => {
            service = null;
            throw err;
        });
    }
    return service;
};

// Set after a teacher signs in on this device, so the account is restored on the next visit
// (student pages skip loading the account code entirely)
export const ACCOUNT_HINT = 'orbit.accountHint';

export const hasAccountHint = () => {
    try {
        return localStorage.getItem(ACCOUNT_HINT) === '1';
    } catch {
        return false;
    }
};

export const setAccountHint = (on) => {
    try {
        if (on) localStorage.setItem(ACCOUNT_HINT, '1');
        else localStorage.removeItem(ACCOUNT_HINT);
    } catch {
        /* ignore */
    }
};

// Firebase error code -> translation key (auth.errors.*)
const KNOWN = [
    'invalid-email', 'user-disabled', 'user-not-found', 'wrong-password', 'invalid-credential', 'email-already-in-use',
    'weak-password', 'too-many-requests', 'network-request-failed', 'popup-blocked', 'operation-not-allowed',
    'unauthorized-domain', 'requires-recent-login', 'account-exists-with-different-credential', 'credential-already-in-use',
    'missing-password', 'internal-error'
];

export const authErrorKey = (err) => {
    const code = String(err?.code || '').replace('auth/', '');
    if (code === 'user-not-found' || code === 'wrong-password') return 'auth.errors.invalid-credential';
    return KNOWN.includes(code) ? `auth.errors.${code}` : 'auth.errors.generic';
};

// Closing the Google window isn't an error worth showing
export const isSilentAuthError = (err) => ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'].includes(err?.code);
