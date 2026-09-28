// "My sets": the teacher's own question sets, kept in this browser.
// (Once Google sign-in exists they can sync to the account; the shape already has ownerId.)

import { useSyncExternalStore } from 'react';
import { normalizeSet } from '../questions/normalize';
import { tidyQuestion, uid } from '../questions/types';
import { FEATURED_SETS } from './featured';

const KEY = 'orbit.sets.v2';
const LEGACY_KEY = 'gridBattleQuestions';

let cache = null;
const listeners = new Set();

const readStorage = () => {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.map(s => normalizeSet(s)) : [];
        }
        // First run on the new platform: bring over sets made in the old Grid Battle editor
        const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '{}');
        const migrated = Object.entries(legacy && typeof legacy === 'object' ? legacy : {})
            .map(([name, questions]) => normalizeSet({ id: `l_${uid()}`, title: name, questions }))
            .filter(s => s.questions.length > 0);
        localStorage.setItem(KEY, JSON.stringify(migrated));
        return migrated;
    } catch {
        return [];
    }
};

const emit = () => listeners.forEach(cb => cb());

export const getMySets = () => {
    if (!cache) cache = readStorage();
    return cache;
};

const persist = (sets) => {
    cache = sets;
    try {
        localStorage.setItem(KEY, JSON.stringify(sets));
    } catch (err) {
        console.error('Could not save sets:', err);
        throw new Error('Your browser storage is full, so the set could not be saved.');
    }
    emit();
};

export const subscribeMySets = (cb) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
};

// Other tabs editing sets
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key === KEY) {
            cache = null;
            emit();
        }
    });
}

export const useMySets = () => useSyncExternalStore(subscribeMySets, getMySets);

export const saveSet = (set) => {
    const sets = getMySets();
    const clean = {
        ...set,
        id: set.id || `l_${uid()}`,
        title: String(set.title || '').trim() || 'Untitled set',
        questions: set.questions.map(tidyQuestion),
        updatedAt: Date.now(),
        createdAt: set.createdAt || Date.now()
    };
    const exists = sets.some(s => s.id === clean.id);
    persist(exists ? sets.map(s => (s.id === clean.id ? clean : s)) : [clean, ...sets]);
    return clean;
};

export const deleteSet = (id) => persist(getMySets().filter(s => s.id !== id));

// Copy any set (featured / public / mine) into my sets as a private draft
export const duplicateSet = (set, author) => saveSet(normalizeSet({
    ...set,
    id: `l_${uid()}`,
    title: set.title.startsWith('Copy of ') ? set.title : `Copy of ${set.title}`,
    author: author || set.author,
    visibility: 'private',
    remoteId: null,
    ownerId: null,
    createdAt: Date.now(),
    plays: 0
}));

export const findLocalSet = (id) =>
    getMySets().find(s => s.id === id) || FEATURED_SETS.find(s => s.id === id) || null;
