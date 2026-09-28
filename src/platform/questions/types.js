// Question types shared by every game.
//
// Normalized question shape:
// {
//   id, type: 'mc' | 'multi' | 'tf' | 'typed' | 'order', prompt,
//   options?:  [{ id, text, correct }]   // mc (exactly one correct), multi (one or more)
//   answer?:   boolean                   // tf
//   accepted?: string[]                  // typed (first one is the "main" answer)
//   items?:    string[]                  // order (stored in the correct order)
// }

import { t } from '../../i18n';

export const TYPE_IDS = ['mc', 'tf', 'typed', 'multi', 'order'];

// Labels are translated: t(`qtypes.${type}.label`), .short and .hint
export const QUESTION_TYPES = {
    mc: { id: 'mc' },
    tf: { id: 'tf' },
    typed: { id: 'typed' },
    multi: { id: 'multi' },
    order: { id: 'order' }
};

export const LIMITS = { prompt: 280, option: 80, minOptions: 2, maxOptions: 6, minItems: 2, maxItems: 6, maxAccepted: 6 };

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// Loose comparison used for typed answers and duplicate detection
export const normalizeAnswer = (s) =>
    clean(s).toLowerCase().normalize('NFKC').replace(/[.!?,;:]+$/g, '').replace(/[‘’`]/g, "'");

export const createQuestion = (type = 'mc') => {
    const base = { id: uid(), type, prompt: '' };
    switch (type) {
        case 'mc':
        case 'multi':
            return { ...base, options: Array.from({ length: 4 }, () => ({ id: uid(), text: '', correct: false })) };
        case 'tf':
            return { ...base, answer: true };
        case 'typed':
            return { ...base, accepted: [''] };
        case 'order':
            return { ...base, items: ['', '', ''] };
        default:
            throw new Error(`Unknown question type: ${type}`);
    }
};

// Switch a question to another type, keeping as much of the teacher's work as possible
export const convertQuestion = (q, type) => {
    if (q.type === type) return q;
    const next = { ...createQuestion(type), id: q.id, prompt: q.prompt };
    const correctTexts = answerTexts(q);

    if (type === 'mc' || type === 'multi') {
        let options = [];
        if (q.options) options = q.options.map(o => ({ ...o }));
        else if (q.items) options = q.items.map((text, i) => ({ id: uid(), text, correct: i === 0 }));
        else if (q.accepted) options = [{ id: uid(), text: q.accepted[0] || '', correct: true }];
        else if (q.type === 'tf') options = [{ id: uid(), text: t('common.true'), correct: q.answer }, { id: uid(), text: t('common.false'), correct: !q.answer }];
        while (options.length < 4) options.push({ id: uid(), text: '', correct: false });
        if (type === 'mc') {
            // Exactly one correct: keep the first one
            let found = false;
            options = options.map(o => {
                const correct = o.correct && !found;
                if (correct) found = true;
                return { ...o, correct };
            });
        }
        next.options = options.slice(0, LIMITS.maxOptions);
    } else if (type === 'typed') {
        next.accepted = correctTexts.length ? correctTexts.slice(0, LIMITS.maxAccepted) : [''];
    } else if (type === 'order') {
        const source = q.items || q.options?.map(o => o.text) || [];
        next.items = source.length >= 2 ? source.slice(0, LIMITS.maxItems) : ['', '', ''];
    } else if (type === 'tf') {
        next.answer = true;
    }
    return next;
};

// Trim everything and drop empty rows; used before saving/hosting
export const tidyQuestion = (q) => {
    const out = { id: q.id || uid(), type: q.type, prompt: clean(q.prompt).slice(0, LIMITS.prompt) };
    if (q.type === 'mc' || q.type === 'multi') {
        out.options = (q.options || [])
            .map(o => ({ id: o.id || uid(), text: clean(o.text).slice(0, LIMITS.option), correct: !!o.correct }))
            .filter(o => o.text)
            .slice(0, LIMITS.maxOptions);
    } else if (q.type === 'tf') {
        out.answer = q.answer !== false;
    } else if (q.type === 'typed') {
        out.accepted = (q.accepted || []).map(a => clean(a).slice(0, LIMITS.option)).filter(Boolean).slice(0, LIMITS.maxAccepted);
    } else if (q.type === 'order') {
        out.items = (q.items || []).map(a => clean(a).slice(0, LIMITS.option)).filter(Boolean).slice(0, LIMITS.maxItems);
    }
    return out;
};

// Returns a list of problem codes (translated as t(`validation.${code}`)); empty = playable
export const validateQuestion = (raw) => {
    const q = tidyQuestion(raw);
    const errors = [];
    if (!q.prompt) errors.push('prompt');

    const hasDuplicates = (list) => new Set(list.map(normalizeAnswer)).size !== list.length;

    switch (q.type) {
        case 'mc': {
            if (q.options.length < 2) errors.push('minOptions');
            const correct = q.options.filter(o => o.correct).length;
            if (correct === 0) errors.push('markCorrect');
            if (correct > 1) errors.push('oneCorrect');
            if (hasDuplicates(q.options.map(o => o.text))) errors.push('distinctOptions');
            break;
        }
        case 'multi': {
            if (q.options.length < 2) errors.push('minOptions');
            const correct = q.options.filter(o => o.correct).length;
            if (correct === 0) errors.push('markSomeCorrect');
            if (correct === q.options.length && q.options.length > 0) errors.push('oneWrong');
            if (hasDuplicates(q.options.map(o => o.text))) errors.push('distinctOptions');
            break;
        }
        case 'typed':
            if (q.accepted.length === 0) errors.push('answer');
            break;
        case 'order':
            if (q.items.length < 2) errors.push('minItems');
            if (hasDuplicates(q.items)) errors.push('distinctItems');
            break;
        case 'tf':
            break;
        default:
            errors.push('unknownType');
    }
    return errors;
};

export const isValidQuestion = (q) => validateQuestion(q).length === 0;

// Every text that counts as correct (for review screens and decoy pools)
export const answerTexts = (q) => {
    switch (q.type) {
        case 'mc':
        case 'multi':
            return (q.options || []).filter(o => o.correct && clean(o.text)).map(o => clean(o.text));
        case 'tf':
            return [q.answer === false ? t('common.false') : t('common.true')];
        case 'typed':
            return (q.accepted || []).map(clean).filter(Boolean);
        case 'order':
            return (q.items || []).map(clean).filter(Boolean);
        default:
            return [];
    }
};

// One-line human answer: "Paris", "Mars, Venus", "1 → 2 → 3"
export const answerLabel = (q) => {
    const texts = answerTexts(q);
    if (q.type === 'order') return texts.join(' → ');
    if (q.type === 'typed') return texts.length > 1 ? t('common.orAlso', { main: texts[0], rest: texts.slice(1).join(', ') }) : texts[0] || '';
    return texts.join(', ');
};

export const checkTypedAnswer = (q, input) => {
    const given = normalizeAnswer(input);
    return !!given && (q.accepted || []).some(a => normalizeAnswer(a) === given);
};
