// Firebase is large, so every part of it is loaded on first use only.
// Without a config the app runs in "offline test mode" (see platform/realtime/local.js).

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

// Add ?local=1 to the URL to force offline test mode even when Firebase is configured
const forceLocal = (() => {
    try {
        if (new URLSearchParams(window.location.search).get('local') === '1') sessionStorage.setItem('orbit.forceLocal', '1');
        return sessionStorage.getItem('orbit.forceLocal') === '1';
    } catch {
        return false;
    }
})();

export const isFirebaseConfigured = !forceLocal && Boolean(
    firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey !== 'YOUR_API_KEY'
);

// Live rooms additionally need the Realtime Database URL
export const isRealtimeConfigured = isFirebaseConfigured && Boolean(firebaseConfig.databaseURL);

let appPromise = null;
const getApp = () => {
    if (!isFirebaseConfigured) return Promise.reject(new Error('Firebase is not configured'));
    if (!appPromise) {
        appPromise = import('firebase/app')
            .then(({ initializeApp }) => initializeApp(firebaseConfig))
            .catch(err => {
                appPromise = null;
                throw err;
            });
    }
    return appPromise;
};

let authPromise = null;
// Invisible anonymous session: gives every device an id for ownership rules, no sign-up needed.
// Later it can be linked to a Google account without losing anything.
export const getAuthUser = () => {
    if (!authPromise) {
        authPromise = Promise.all([getApp(), import('firebase/auth')])
            .then(async ([app, authModule]) => {
                const auth = authModule.getAuth(app);
                await auth.authStateReady();
                if (!auth.currentUser) await authModule.signInAnonymously(auth);
                return auth.currentUser;
            })
            .catch(err => {
                authPromise = null;
                throw err;
            });
    }
    return authPromise;
};

let firestorePromise = null;
export const getFirestoreApi = () => {
    if (!firestorePromise) {
        firestorePromise = Promise.all([getApp(), import('firebase/firestore')])
            .then(([app, firestore]) => ({ ...firestore, db: firestore.getFirestore(app) }))
            .catch(err => {
                firestorePromise = null;
                throw err;
            });
    }
    return firestorePromise;
};

let databasePromise = null;
export const getDatabaseApi = () => {
    if (!isRealtimeConfigured) return Promise.reject(new Error('Realtime Database is not configured'));
    if (!databasePromise) {
        databasePromise = Promise.all([getApp(), import('firebase/database')])
            .then(([app, database]) => ({ ...database, db: database.getDatabase(app) }))
            .catch(err => {
                databasePromise = null;
                throw err;
            });
    }
    return databasePromise;
};
