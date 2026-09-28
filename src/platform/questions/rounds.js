// Turns any question into a "choice round" for games that show options (asteroids, answer tiles...).
// Written answers are adapted into multiple choice using decoys from the rest of the set.

import { answerTexts, normalizeAnswer } from './types';

export const shuffle = (arr, rand = Math.random) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

const isNumeric = (s) => /^-?\d+(\.\d+)?$/.test(String(s).trim());

const numericDecoys = (answer, rand) => {
    const n = Number(answer);
    const isInt = Number.isInteger(n);
    const r = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
    const candidates = isInt
        ? [n + 1, n - 1, n + 2, n - 2, n + 10, n - 10, n + r(3, 9), n - r(3, 9)]
        : [n + 0.1, n - 0.1, n + 1, n - 1, n * 2, n / 2];

    // Swapped digits are a classic "almost right" trap (56 -> 65)
    if (isInt && Math.abs(n) >= 10 && n % 10 !== 0) {
        const flipped = Number(String(Math.abs(n)).split('').reverse().join('')) * Math.sign(n);
        if (flipped !== n) candidates.unshift(flipped);
    }

    return shuffle(candidates, rand)
        .filter(c => !(n >= 0 && c < 0))
        .map(c => (isInt ? String(Math.round(c)) : String(Math.round(c * 100) / 100)))
        .filter(v => v !== String(answer).trim());
};

// All answer-like texts in a set: good decoys because they "belong" to the topic
export const decoyPool = (questions) => {
    const pool = [];
    for (const q of questions) {
        if (q.type === 'tf') continue;
        if (q.type === 'mc' || q.type === 'multi') pool.push(...(q.options || []).map(o => o.text));
        else pool.push(...answerTexts(q).slice(0, 1));
    }
    return [...new Set(pool.filter(Boolean))];
};

// Can a written-answer question become multiple choice inside this set?
export const canAdaptTyped = (q, pool) => {
    const main = answerTexts(q)[0];
    if (!main) return false;
    if (isNumeric(main)) return true;
    const accepted = new Set(answerTexts(q).map(normalizeAnswer));
    return pool.some(p => !accepted.has(normalizeAnswer(p)));
};

// Build { kind, prompt, options: [{ text, correct, order? }] }, or null if impossible
export const toChoiceRound = (q, pool, { maxOptions = 4, rand = Math.random } = {}) => {
    switch (q.type) {
        case 'mc': {
            const correct = q.options.filter(o => o.correct);
            const wrong = shuffle(q.options.filter(o => !o.correct), rand).slice(0, Math.max(1, maxOptions - 1));
            return {
                kind: 'single',
                prompt: q.prompt,
                options: shuffle([...correct.slice(0, 1), ...wrong], rand).map(o => ({ text: o.text, correct: o.correct }))
            };
        }
        case 'multi':
            return {
                kind: 'multi',
                prompt: q.prompt,
                options: shuffle(q.options, rand).slice(0, Math.max(maxOptions, q.options.length)).map(o => ({ text: o.text, correct: o.correct }))
            };
        case 'tf':
            return {
                kind: 'single',
                prompt: q.prompt,
                options: [{ text: 'True', correct: q.answer !== false }, { text: 'False', correct: q.answer === false }]
            };
        case 'order':
            return {
                kind: 'order',
                prompt: q.prompt,
                options: shuffle(q.items.map((text, i) => ({ text, correct: true, order: i })), rand)
            };
        case 'typed': {
            const accepted = answerTexts(q);
            const main = accepted[0];
            if (!main) return null;
            const seen = new Set(accepted.map(normalizeAnswer));
            const decoys = [];
            const add = (text) => {
                const key = normalizeAnswer(text);
                if (!key || seen.has(key) || decoys.length >= maxOptions - 1) return;
                seen.add(key);
                decoys.push(text);
            };
            if (isNumeric(main)) numericDecoys(main, rand).forEach(add);
            shuffle(pool, rand).forEach(add);
            if (decoys.length === 0) return null;
            return {
                kind: 'single',
                prompt: q.prompt,
                options: shuffle([{ text: main, correct: true }, ...decoys.map(text => ({ text, correct: false }))], rand)
            };
        }
        default:
            return null;
    }
};
