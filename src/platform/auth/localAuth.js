// Offline test mode: simulated teacher accounts kept in this browser, with the same interface and
// error codes as the Firebase version. "Google" gives a ready test account.
// Never used when Firebase is configured.

const ACCOUNTS = 'orbit.local.accounts';
const SESSION = 'orbit.local.session';
const PROFILES = 'orbit.local.profiles';

const read = (key, fallback) => {
    try {
        return JSON.parse(localStorage.getItem(key) || '') ?? fallback;
    } catch {
        return fallback;
    }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const error = (code) => Object.assign(new Error(code), { code });

// Only for the offline simulation; real passwords are handled by Firebase
const hash = async (text) => {
    try {
        const data = new TextEncoder().encode(`orbit-local:${text}`);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
        return `plain:${text}`;
    }
};

const toUser = (account) => account && {
    uid: account.uid,
    email: account.email,
    name: account.name || '',
    photoURL: '',
    emailVerified: !!account.verified,
    isAnonymous: false,
    provider: account.provider,
    providers: account.providers || [account.provider === 'google' ? 'google.com' : 'password']
};

export const createLocalAuth = () => {
    const listeners = new Set();
    const accounts = () => read(ACCOUNTS, {});
    const currentAccount = () => {
        const uid = read(SESSION, null);
        return Object.values(accounts()).find(a => a.uid === uid) || null;
    };
    const emit = () => {
        const user = toUser(currentAccount());
        listeners.forEach(cb => cb(user));
    };
    const saveAccount = (account) => write(ACCOUNTS, { ...accounts(), [account.email]: account });
    const startSession = (account) => {
        write(SESSION, account.uid);
        emit();
        return toUser(account);
    };

    // Other tabs signing in or out
    window.addEventListener('storage', (e) => {
        if (e.key === SESSION || e.key === ACCOUNTS) emit();
    });

    const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    return {
        mode: 'local',

        watch(cb) {
            listeners.add(cb);
            cb(toUser(currentAccount()));
            return () => listeners.delete(cb);
        },

        current: () => toUser(currentAccount()),

        setLanguage() {},

        async google() {
            const email = 'teacher@orbit.test';
            const account = accounts()[email] || { uid: 'local-google-teacher', email, name: 'Test Teacher', provider: 'google', verified: true };
            saveAccount(account);
            return startSession(account);
        },

        async signUp(email, password, name) {
            const clean = String(email).trim().toLowerCase();
            if (!validEmail(clean)) throw error('auth/invalid-email');
            if (String(password).length < 6) throw error('auth/weak-password');
            if (accounts()[clean]) throw error('auth/email-already-in-use');
            const account = {
                uid: `local-${Math.random().toString(36).slice(2, 10)}`,
                email: clean,
                name,
                provider: 'password',
                verified: false,
                pass: await hash(password)
            };
            saveAccount(account);
            return startSession(account);
        },

        async signIn(email, password) {
            const account = accounts()[String(email).trim().toLowerCase()];
            const hasPassword = account && (account.provider === 'password' || account.providers?.includes('password'));
            if (!hasPassword || account.pass !== await hash(password)) throw error('auth/invalid-credential');
            return startSession(account);
        },

        async linkPassword(password) {
            const account = currentAccount();
            if (!account) throw error('auth/no-current-user');
            const providers = account.providers || [account.provider === 'google' ? 'google.com' : 'password'];
            saveAccount({ ...account, pass: await hash(password), providers: [...new Set([...providers, 'password'])] });
            emit();
            return toUser(currentAccount());
        },

        async resetPassword(email) {
            if (!validEmail(String(email).trim())) throw error('auth/invalid-email');
        },

        async updateName(name) {
            const account = currentAccount();
            if (account) saveAccount({ ...account, name });
            emit();
        },

        async signOut() {
            localStorage.removeItem(SESSION);
            emit();
        },

        async reauthenticate(password) {
            const account = currentAccount();
            if (!account) throw error('auth/no-current-user');
            if (account.provider !== 'password') return;
            if (!password) throw error('auth/missing-password');
            if (account.pass !== await hash(password)) throw error('auth/invalid-credential');
        },

        async deleteAccount() {
            const account = currentAccount();
            if (!account) return;
            const all = accounts();
            delete all[account.email];
            write(ACCOUNTS, all);
            localStorage.removeItem(SESSION);
            emit();
        },

        async loadProfile(uid) {
            return read(PROFILES, {})[uid] || null;
        },

        async saveProfile(uid, patch) {
            const all = read(PROFILES, {});
            all[uid] = { ...(all[uid] || {}), ...patch };
            write(PROFILES, all);
        },

        async deleteProfile(uid) {
            const all = read(PROFILES, {});
            delete all[uid];
            write(PROFILES, all);
        }
    };
};
