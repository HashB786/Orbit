// "My sets": a signed-in teacher's own question sets, saved to their account.
// Firebase: users/{uid}/sets/{setId} in Firestore, with a copy in this browser for instant loading.
// Offline test mode: the same, kept only in this browser.
// Sets made before accounts existed are moved into the first account that signs in here.

import { useSyncExternalStore } from 'react';
import { isFirebaseConfigured, getFirestoreApi } from '../../config/firebase';
import { normalizeSet } from '../questions/normalize';
import { tidyQuestion, uid as newId } from '../questions/types';
import { FEATURED_SETS } from './featured';

const LEGACY_KEY = 'orbit.sets.v2'; // browser-only sets from before accounts
const OLD_GRID_KEY = 'gridBattleQuestions'; // sets from the very first Grid Battle editor
const cacheKey = (owner) => `orbit.sets.v3.${owner}`;

let state = { owner: null, sets: [], ready: true };
let snapshot = state;
const listeners = new Set();
const emit = () => {
    snapshot = { ...state };
    listeners.forEach(cb => cb());
};

let unsubscribeRemote = null;
let syncErrorHandler = null;
// The app shows a toast when saving to the account fails
export const onSyncError = (fn) => {
    syncErrorHandler = fn;
};
const reportError = (err) => {
    console.error('Could not sync sets:', err);
    syncErrorHandler?.(err);
};

const byNewest = (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0);

const readCache = (owner) => {
    try {
        const raw = localStorage.getItem(cacheKey(owner));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(s => normalizeSet(s)) : null;
    } catch {
        return null;
    }
};

const writeCache = (owner, sets) => {
    try {
        localStorage.setItem(cacheKey(owner), JSON.stringify(sets));
    } catch {
        /* full: the account copy is what matters */
    }
};

// Firestore rejects `undefined`; this also drops functions and deep-copies
const plain = (value) => JSON.parse(JSON.stringify(value));

// ---------- owner (called by the auth layer) ----------

export const setSetsOwner = async (owner) => {
    if (state.owner === owner) return 0;
    unsubscribeRemote?.();
    unsubscribeRemote = null;

    if (!owner) {
        state = { owner: null, sets: [], ready: true };
        emit();
        return 0;
    }

    const cached = readCache(owner);
    state = { owner, sets: cached || [], ready: !isFirebaseConfigured || cached !== null };
    emit();

    if (isFirebaseConfigured) {
        try {
            const { db, collection, onSnapshot } = await getFirestoreApi();
            if (state.owner !== owner) return 0;
            unsubscribeRemote = onSnapshot(
                collection(db, 'users', owner, 'sets'),
                (snap) => {
                    if (state.owner !== owner) return;
                    const sets = snap.docs.map(d => normalizeSet({ ...d.data(), id: d.id })).sort(byNewest);
                    state = { ...state, sets, ready: true };
                    writeCache(owner, sets);
                    emit();
                },
                (err) => {
                    state = { ...state, ready: true };
                    emit();
                    reportError(err);
                }
            );
        } catch (err) {
            state = { ...state, ready: true };
            emit();
            reportError(err);
        }
    }
    return moveBrowserSets();
};

// ---------- reading ----------

const subscribe = (cb) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
};

export const getMySets = () => state.sets;

export const useMySets = () => useSyncExternalStore(subscribe, () => snapshot.sets);

// { owner, sets, ready } — `ready` is false until the account's sets have loaded once
export const useSetsState = () => useSyncExternalStore(subscribe, () => snapshot);

export const findLocalSet = (id) =>
    state.sets.find(s => s.id === id) || FEATURED_SETS.find(s => s.id === id) || null;

// ---------- writing ----------

const remoteWrite = async (fn) => {
    if (!isFirebaseConfigured) return;
    try {
        const api = await getFirestoreApi();
        await fn(api);
    } catch (err) {
        reportError(err);
    }
};

const commit = (sets) => {
    state = { ...state, sets: [...sets].sort(byNewest) };
    writeCache(state.owner, state.sets);
    emit();
};

export const saveSet = (set) => {
    const owner = state.owner;
    if (!owner) throw Object.assign(new Error('Sign in to save sets.'), { code: 'no-owner' });
    const clean = plain({
        ...set,
        id: set.id && String(set.id).startsWith('l_') ? set.id : `l_${newId()}`,
        title: String(set.title || '').trim() || 'Untitled set',
        questions: (set.questions || []).map(tidyQuestion),
        ownerId: owner,
        updatedAt: Date.now(),
        createdAt: set.createdAt || Date.now()
    });
    const exists = state.sets.some(s => s.id === clean.id);
    commit(exists ? state.sets.map(s => (s.id === clean.id ? clean : s)) : [clean, ...state.sets]);
    remoteWrite(({ db, doc, setDoc }) => setDoc(doc(db, 'users', owner, 'sets', clean.id), clean));
    return clean;
};

export const deleteSet = (id) => {
    const owner = state.owner;
    if (!owner) return;
    commit(state.sets.filter(s => s.id !== id));
    remoteWrite(({ db, doc, deleteDoc }) => deleteDoc(doc(db, 'users', owner, 'sets', id)));
};

// Removes every set of the account (used when deleting the account)
export const deleteAllSets = async () => {
    const owner = state.owner;
    if (!owner) return;
    const ids = state.sets.map(s => s.id);
    commit([]);
    if (isFirebaseConfigured) {
        const { db, doc, deleteDoc } = await getFirestoreApi();
        await Promise.all(ids.map(id => deleteDoc(doc(db, 'users', owner, 'sets', id))));
    }
    try {
        localStorage.removeItem(cacheKey(owner));
    } catch {
        /* ignore */
    }
};

// Copy any set (featured / public / mine) into my sets as a private draft
export const duplicateSet = (set, author, copyPrefix = 'Copy of') => saveSet(normalizeSet({
    ...set,
    id: `l_${newId()}`,
    title: set.title.startsWith(`${copyPrefix} `) ? set.title : `${copyPrefix} ${set.title}`,
    author: author || set.author,
    visibility: 'private',
    remoteId: null,
    ownerId: null,
    createdAt: Date.now(),
    plays: 0
}));

// ---------- sets made before accounts ----------

const readBrowserSets = () => {
    try {
        const raw = localStorage.getItem(LEGACY_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return { key: LEGACY_KEY, sets: Array.isArray(parsed) ? parsed.map(s => normalizeSet(s)) : [] };
        }
        const old = JSON.parse(localStorage.getItem(OLD_GRID_KEY) || 'null');
        if (old && typeof old === 'object') {
            const sets = Object.entries(old)
                .map(([name, questions]) => normalizeSet({ id: `l_${newId()}`, title: name, questions }))
                .filter(s => s.questions.length > 0);
            return { key: OLD_GRID_KEY, sets };
        }
    } catch {
        /* unreadable: nothing to move */
    }
    return { key: null, sets: [] };
};

// Returns how many sets were moved into the account
const moveBrowserSets = () => {
    const { key, sets } = readBrowserSets();
    if (!key) return 0;
    let moved = 0;
    for (const set of sets) {
        if (state.sets.some(s => s.id === set.id)) continue;
        saveSet(set);
        moved++;
    }
    try {
        // Keep a backup under another name instead of deleting the teacher's work
        localStorage.setItem(`${key}.moved`, localStorage.getItem(key) || '');
        localStorage.removeItem(key);
    } catch {
        /* ignore */
    }
    return moved;
};
