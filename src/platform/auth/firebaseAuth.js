// Teacher accounts on Firebase Authentication: Google, or email + password with a verification email.
// Students never come here: they keep the invisible anonymous session.

import { getAuthApi, getFirestoreApi } from '../../config/firebase';

const toUser = (u) => {
    if (!u) return null;
    const google = u.providerData.some(p => p.providerId === 'google.com');
    return {
        uid: u.uid,
        email: u.email || '',
        name: u.displayName || '',
        photoURL: u.photoURL || '',
        emailVerified: !!u.emailVerified,
        isAnonymous: !!u.isAnonymous,
        provider: u.isAnonymous ? 'anonymous' : google ? 'google' : 'password',
        providers: u.providerData.map(p => p.providerId)
    };
};

const error = (code) => Object.assign(new Error(code), { code });

export const createFirebaseAuth = async () => {
    const { auth, mod } = await getAuthApi();
    const listeners = new Set();
    const emit = () => {
        const user = toUser(auth.currentUser);
        listeners.forEach(cb => cb(user));
    };
    mod.onAuthStateChanged(auth, emit);

    const googleProvider = () => {
        const provider = new mod.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        return provider;
    };

    // Verification link comes back to Orbit; if this domain isn't allowed yet, send a plain link
    const sendVerification = async (user = auth.currentUser) => {
        if (!user) throw error('auth/no-current-user');
        try {
            await mod.sendEmailVerification(user, { url: `${window.location.origin}/signin?verified=1` });
        } catch (err) {
            if (err.code === 'auth/unauthorized-continue-uri' || err.code === 'auth/invalid-continue-uri') {
                await mod.sendEmailVerification(user);
            } else throw err;
        }
    };

    return {
        mode: 'firebase',

        watch(cb) {
            listeners.add(cb);
            cb(toUser(auth.currentUser));
            return () => listeners.delete(cb);
        },

        current: () => toUser(auth.currentUser),

        setLanguage(lang) {
            auth.languageCode = lang;
        },

        async google() {
            const current = auth.currentUser;
            // A guest upgrading keeps the same id (and anything they already own)
            if (current?.isAnonymous) {
                try {
                    const res = await mod.linkWithPopup(current, googleProvider());
                    // Fresh token so the database rules see the new email claims right away
                    await res.user.getIdToken(true);
                    emit();
                    return toUser(res.user);
                } catch (err) {
                    if (err.code !== 'auth/credential-already-in-use') throw err;
                    const credential = mod.GoogleAuthProvider.credentialFromError(err);
                    if (!credential) throw err;
                    const res = await mod.signInWithCredential(auth, credential);
                    return toUser(res.user);
                }
            }
            const res = await mod.signInWithPopup(auth, googleProvider());
            return toUser(res.user);
        },

        async signUp(email, password, name) {
            const current = auth.currentUser;
            let user;
            if (current?.isAnonymous) {
                const credential = mod.EmailAuthProvider.credential(email, password);
                user = (await mod.linkWithCredential(current, credential)).user;
                await user.getIdToken(true);
            } else {
                user = (await mod.createUserWithEmailAndPassword(auth, email, password)).user;
            }
            if (name) await mod.updateProfile(user, { displayName: name });
            await sendVerification(user);
            emit();
            return toUser(user);
        },

        async signIn(email, password) {
            const res = await mod.signInWithEmailAndPassword(auth, email, password);
            return toUser(res.user);
        },

        sendVerification: () => sendVerification(),

        // After the teacher clicks the email link: reload the account and refresh the token,
        // so the database rules see email_verified = true
        async refresh() {
            const user = auth.currentUser;
            if (!user) return null;
            await user.reload();
            if (user.emailVerified) await user.getIdToken(true);
            emit();
            return toUser(auth.currentUser);
        },

        resetPassword: (email) => mod.sendPasswordResetEmail(auth, email),

        // Link email+password to an existing Google-only account as a backup sign-in method
        async linkPassword(password) {
            const user = auth.currentUser;
            if (!user || !user.email) throw error('auth/no-current-user');
            const credential = mod.EmailAuthProvider.credential(user.email, password);
            try {
                await mod.linkWithCredential(user, credential);
            } catch (err) {
                if (err.code === 'auth/requires-recent-login') {
                    await mod.reauthenticateWithPopup(user, googleProvider());
                    await mod.linkWithCredential(user, credential);
                } else if (err.code !== 'auth/provider-already-linked') {
                    throw err;
                }
            }
            await user.reload();
            await user.getIdToken(true);
            emit();
            return toUser(auth.currentUser);
        },

        async updateName(name) {
            if (!auth.currentUser) return;
            await mod.updateProfile(auth.currentUser, { displayName: name });
            emit();
        },

        async signOut() {
            await mod.signOut(auth);
            // Stay a guest so joining games keeps working on this device
            await mod.signInAnonymously(auth);
        },

        // Firebase only deletes accounts that signed in recently, so confirm who it is first
        async reauthenticate(password) {
            const user = auth.currentUser;
            if (!user || user.isAnonymous) throw error('auth/no-current-user');
            if (toUser(user).provider === 'google') {
                await mod.reauthenticateWithPopup(user, googleProvider());
            } else {
                if (!password) throw error('auth/missing-password');
                await mod.reauthenticateWithCredential(user, mod.EmailAuthProvider.credential(user.email, password));
            }
        },

        async deleteAccount() {
            const user = auth.currentUser;
            if (!user || user.isAnonymous) return;
            await user.delete();
            await mod.signInAnonymously(auth);
        },

        // ---------- profile (users/{uid}) ----------

        async loadProfile(uid) {
            const { db, doc, getDoc } = await getFirestoreApi();
            const snap = await getDoc(doc(db, 'users', uid));
            return snap.exists() ? snap.data() : null;
        },

        async saveProfile(uid, patch) {
            const { db, doc, setDoc } = await getFirestoreApi();
            await setDoc(doc(db, 'users', uid), patch, { merge: true });
        },

        async deleteProfile(uid) {
            const { db, doc, deleteDoc } = await getFirestoreApi();
            await deleteDoc(doc(db, 'users', uid));
        }
    };
};
