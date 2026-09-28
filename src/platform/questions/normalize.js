import { TYPE_IDS, uid, tidyQuestion } from './types';

const toMillis = (v) => {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    if (typeof v.toMillis === 'function') return v.toMillis();
    const t = Date.parse(v);
    return Number.isNaN(t) ? 0 : t;
};

// Accepts both the new shape and legacy { q, a } / { question, answer } pairs
export const normalizeQuestion = (raw) => {
    if (!raw || typeof raw !== 'object') return null;

    if (TYPE_IDS.includes(raw.type)) {
        const q = tidyQuestion({ ...raw, id: raw.id || uid() });
        // Firebase drops empty arrays, so make sure the lists exist
        if ((q.type === 'mc' || q.type === 'multi') && !q.options) q.options = [];
        if (q.type === 'typed' && !q.accepted) q.accepted = [];
        if (q.type === 'order' && !q.items) q.items = [];
        return q;
    }

    const prompt = raw.q ?? raw.question ?? raw.ques;
    const answer = raw.a ?? raw.answer ?? raw.ans;
    if (prompt == null || answer == null || String(prompt).trim() === '' || String(answer).trim() === '') return null;
    return tidyQuestion({ id: uid(), type: 'typed', prompt: String(prompt), accepted: [String(answer)] });
};

const asArray = (v) => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : []);

export const normalizeSet = (raw, overrides = {}) => {
    const questions = asArray(raw?.questions).map(normalizeQuestion).filter(Boolean);
    return {
        id: raw?.id || uid(),
        title: String(raw?.title ?? raw?.name ?? 'Untitled set').trim() || 'Untitled set',
        description: String(raw?.description ?? '').trim(),
        subject: String(raw?.subject ?? '').trim(),
        author: String(raw?.author ?? '').trim(),
        ownerId: raw?.ownerId || null,
        visibility: raw?.visibility === 'public' ? 'public' : 'private',
        remoteId: raw?.remoteId || null,
        questions,
        createdAt: toMillis(raw?.createdAt) || Date.now(),
        updatedAt: toMillis(raw?.updatedAt) || toMillis(raw?.createdAt) || Date.now(),
        plays: Number(raw?.plays) || 0,
        ...overrides
    };
};

// Parse bulk-pasted text or JSON into questions (used by the editor's import box)
export const parseImport = (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed);
            const list = Array.isArray(parsed) ? parsed : parsed.questions ? asArray(parsed.questions) : asArray(parsed);
            return list.map(normalizeQuestion).filter(Boolean);
        } catch {
            return [];
        }
    }

    // One question per line: "Question | Answer" or "Question - Answer" or "Question = Answer"
    return trimmed.split(/\r?\n/).map(line => {
        const match = line.match(/^(.+?)\s*(?:\||\t|=|\s-\s)\s*(.+)$/);
        if (!match) return null;
        return normalizeQuestion({ q: match[1], a: match[2] });
    }).filter(Boolean);
};
