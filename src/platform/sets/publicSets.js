// The public library (Discover tab). Firestore when configured, otherwise a local stand-in so the
// whole flow can be tested offline. Public set ids are "p_<documentId>".

import { useSyncExternalStore } from 'react';
import { isFirebaseConfigured, getFirestoreApi, getAuthUser } from '../../config/firebase';
import { getDeviceId } from '../realtime';
import { normalizeSet } from '../questions/normalize';
import { tidyQuestion, isValidQuestion, uid } from '../questions/types';

const MOCK_KEY = 'orbit.publicSets.mock';
const COLLECTION = 'question_sets';

export const getOwnerId = async () => {
    if (!isFirebaseConfigured) return getDeviceId();
    const user = await getAuthUser();
    return user.uid;
};

const fromDoc = (docId, data) => normalizeSet({ ...data, id: `p_${docId}`, remoteId: docId, visibility: 'public' });

const readMock = () => {
    try {
        const list = JSON.parse(localStorage.getItem(MOCK_KEY) || '[]');
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
};

const writeMock = (list) => localStorage.setItem(MOCK_KEY, JSON.stringify(list));

const toPayload = (set, ownerId) => {
    const questions = set.questions.map(tidyQuestion).filter(isValidQuestion);
    return {
        title: set.title,
        description: set.description || '',
        subject: set.subject || '',
        author: set.author || 'Anonymous',
        ownerId,
        questions,
        questionCount: questions.length,
        types: [...new Set(questions.map(q => q.type))],
        version: 2
    };
};

// ---------- cached list for the Discover tab ----------

const state = { sets: [], loading: false, error: null, loaded: false, attempted: false };
const listeners = new Set();
let snapshot = { ...state };
const emit = () => {
    snapshot = { ...state };
    listeners.forEach(cb => cb());
};

export const refreshPublicSets = async () => {
    state.attempted = true;
    state.loading = true;
    state.error = null;
    emit();
    try {
        if (!isFirebaseConfigured) {
            state.sets = readMock().map(d => fromDoc(d.id, d));
        } else {
            const { db, collection, getDocs, query, orderBy, limit } = await getFirestoreApi();
            const snap = await getDocs(query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(300)));
            state.sets = snap.docs.map(d => fromDoc(d.id, d.data()));
        }
        state.loaded = true;
    } catch (err) {
        console.error('Could not load public sets:', err);
        state.error = 'Could not load the public library. Check your internet connection.';
    } finally {
        state.loading = false;
        emit();
    }
};

export const usePublicSets = () => {
    const snap = useSyncExternalStore(
        (cb) => {
            listeners.add(cb);
            return () => listeners.delete(cb);
        },
        () => snapshot
    );
    return snap;
};

export const fetchPublicSet = async (publicId) => {
    const docId = String(publicId).replace(/^p_/, '');
    const cached = state.sets.find(s => s.remoteId === docId);
    if (cached) return cached;
    if (!isFirebaseConfigured) {
        const found = readMock().find(d => d.id === docId);
        return found ? fromDoc(found.id, found) : null;
    }
    const { db, doc, getDoc } = await getFirestoreApi();
    const snap = await getDoc(doc(db, COLLECTION, docId));
    return snap.exists() ? fromDoc(snap.id, snap.data()) : null;
};

// Publishes (or updates) a set; returns the remote id
export const publishSet = async (set) => {
    const ownerId = await getOwnerId();
    const payload = toPayload(set, ownerId);
    if (payload.questionCount === 0) throw new Error('Add at least one complete question before publishing.');

    if (!isFirebaseConfigured) {
        const list = readMock();
        const now = Date.now();
        const existing = set.remoteId && list.find(d => d.id === set.remoteId);
        if (existing) {
            Object.assign(existing, payload, { updatedAt: now });
        } else {
            list.unshift({ ...payload, id: uid(), createdAt: now, updatedAt: now, plays: 0 });
        }
        writeMock(list);
        await refreshPublicSets();
        return existing ? existing.id : list[0].id;
    }

    const { db, collection, doc, addDoc, updateDoc, serverTimestamp } = await getFirestoreApi();
    let remoteId = set.remoteId;
    if (remoteId) {
        await updateDoc(doc(db, COLLECTION, remoteId), { ...payload, updatedAt: serverTimestamp() });
    } else {
        const ref = await addDoc(collection(db, COLLECTION), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), plays: 0 });
        remoteId = ref.id;
    }
    refreshPublicSets();
    return remoteId;
};

export const unpublishSet = async (remoteId) => {
    if (!remoteId) return;
    if (!isFirebaseConfigured) {
        writeMock(readMock().filter(d => d.id !== remoteId));
    } else {
        const { db, doc, deleteDoc } = await getFirestoreApi();
        await deleteDoc(doc(db, COLLECTION, remoteId));
    }
    state.sets = state.sets.filter(s => s.remoteId !== remoteId);
    emit();
};

// Counts a play for "most played" sorting (fire and forget)
export const countPlay = async (remoteId) => {
    if (!remoteId) return;
    try {
        if (!isFirebaseConfigured) {
            const list = readMock();
            const found = list.find(d => d.id === remoteId);
            if (found) {
                found.plays = (found.plays || 0) + 1;
                writeMock(list);
            }
            return;
        }
        const { db, doc, updateDoc, increment } = await getFirestoreApi();
        await updateDoc(doc(db, COLLECTION, remoteId), { plays: increment(1) });
    } catch {
        /* not important */
    }
};
