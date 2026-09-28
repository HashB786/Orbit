// Firebase Realtime Database behind the same small interface as the local/memory versions.

import { getDatabaseApi, getAuthApi, getAuthUser } from '../../config/firebase';

export const createFirebaseRealtime = async () => {
    const [api, { auth }] = await Promise.all([getDatabaseApi(), getAuthApi(), getAuthUser()]);
    const { db, ref, get, set, update, remove, onValue, runTransaction, onDisconnect, push } = api;

    let offset = 0;
    onValue(ref(db, '.info/serverTimeOffset'), snap => {
        offset = Number(snap.val()) || 0;
    });

    const connection = { connected: true, listeners: new Set() };
    onValue(ref(db, '.info/connected'), snap => {
        connection.connected = snap.val() === true;
        connection.listeners.forEach(cb => cb(connection.connected));
    });

    return {
        mode: 'firebase',
        // Read live: a guest who signs in as a teacher (or signs out) keeps using the right id
        get clientId() {
            return auth.currentUser?.uid || '';
        },
        now: () => Date.now() + offset,
        newKey: () => push(ref(db, 'keys')).key,
        get: async (path) => (await get(ref(db, path))).val(),
        set: (path, value) => set(ref(db, path), value ?? null),
        update: (path, patch) => update(ref(db, path || '/'), patch),
        remove: (path) => remove(ref(db, path)),
        onValue: (path, cb) => onValue(ref(db, path), snap => cb(snap.val()), err => {
            console.error(`Realtime listener on ${path} failed:`, err);
        }),
        transaction: async (path, fn) => {
            const result = await runTransaction(ref(db, path), current => fn(current));
            return { committed: result.committed, value: result.snapshot.val() };
        },
        onDisconnect: (path) => onDisconnect(ref(db, path)),
        // (cb) => unsubscribe; fires with true/false when the connection to Firebase changes
        onConnectionChange: (cb) => {
            connection.listeners.add(cb);
            cb(connection.connected);
            return () => connection.listeners.delete(cb);
        }
    };
};
