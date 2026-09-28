// JSON import for the set editor, built for text pasted from ChatGPT & co.
// Tolerant on purpose: code fences, trailing commas, curly quotes, different key names,
// answers given as text, letters ("B") or indexes. Every skipped question gets a reason.

import { LIMITS, QUESTION_TYPES, TYPE_IDS, normalizeAnswer, tidyQuestion, uid, validateQuestion } from './types';

// ---------- the prompt teachers copy into ChatGPT ----------

export const AI_LANGUAGES = ['English', 'Uzbek', 'Russian'];

export const buildAiPrompt = ({ topic, count, level, language, types }) => {
    const chosen = TYPE_IDS.filter(t => types.includes(t));
    const lines = {
        mc: '    {"type": "mc", "question": "…", "options": ["…", "…", "…", "…"], "answer": "…"}',
        tf: '    {"type": "tf", "question": "…", "answer": true}',
        typed: '    {"type": "typed", "question": "…", "answer": "…", "alsoAccept": ["…"]}',
        multi: '    {"type": "multi", "question": "…", "options": ["…", "…", "…", "…"], "answers": ["…", "…"]}',
        order: '    {"type": "order", "question": "…", "items": ["first", "second", "third", "fourth"]}'
    };
    const rules = {
        mc: '- "mc" (multiple choice): 4 options, exactly one correct. "answer" must be copied exactly from "options".',
        tf: '- "tf" (true/false): "question" is a statement, "answer" is true or false.',
        typed: '- "typed" (written answer): a short answer of 1-3 words. Put other correct spellings in "alsoAccept".',
        multi: '- "multi" (multi-select): 4-6 options with 2 or more correct and at least 1 wrong. Every item in "answers" must be copied exactly from "options".',
        order: '- "order" (put in order): 3-6 items written in the CORRECT order.'
    };
    return [
        `Create ${count} quiz questions about "${topic.trim() || 'a topic of your choice'}"${level.trim() ? ` for ${level.trim()}` : ''}.`,
        `Write everything in ${language}.`,
        '',
        'Reply with ONLY valid JSON: no explanations and no markdown. Use exactly this format:',
        '{',
        '  "title": "…",',
        '  "questions": [',
        chosen.map(t => lines[t]).join(',\n'),
        '  ]',
        '}',
        '',
        'Rules:',
        `- Use only these question types: ${chosen.join(', ')}. Mix them.`,
        ...chosen.map(t => rules[t]),
        `- Questions at most ${LIMITS.prompt - 30} characters, options and answers at most ${LIMITS.option - 10} characters.`,
        '- Every question must have exactly one clearly correct answer (or set of answers). No trick questions.'
    ].join('\n');
};

// One small example of every type, shown in the import dialog
export const EXAMPLE_JSON = JSON.stringify({
    title: 'Space basics',
    questions: [
        { type: 'mc', question: 'Which planet is known as the Red Planet?', options: ['Mars', 'Venus', 'Jupiter', 'Mercury'], answer: 'Mars' },
        { type: 'tf', question: 'The Sun is a star.', answer: true },
        { type: 'typed', question: 'What is the name of our galaxy?', answer: 'Milky Way', alsoAccept: ['The Milky Way'] },
        { type: 'multi', question: 'Which of these are gas giants?', options: ['Jupiter', 'Saturn', 'Mars', 'Earth'], answers: ['Jupiter', 'Saturn'] },
        { type: 'order', question: 'Put these planets in order from the Sun', items: ['Mercury', 'Venus', 'Earth', 'Mars'] }
    ]
}, null, 2);

// ---------- reading the JSON ----------

const cleanText = (text) => String(text || '')
    .replace(/^﻿/, '')
    .replace(/```(?:json|javascript|js)?/gi, '')
    .trim();

// Try the text as-is, then with common AI mistakes repaired
const parseLoose = (text) => {
    const attempts = [];
    const base = cleanText(text);
    attempts.push(base);

    const start = base.search(/[[{]/);
    const end = Math.max(base.lastIndexOf(']'), base.lastIndexOf('}'));
    const sliced = start >= 0 && end > start ? base.slice(start, end + 1) : base;
    attempts.push(sliced);

    const noTrailing = sliced.replace(/,\s*([\]}])/g, '$1');
    attempts.push(noTrailing);
    attempts.push(noTrailing.replace(/[“”„‟]/g, '"'));

    let lastError = null;
    for (const candidate of attempts) {
        try {
            return { value: JSON.parse(candidate) };
        } catch (err) {
            lastError = err;
        }
    }
    return { error: lastError };
};

const TYPE_ALIASES = {
    mc: ['mc', 'mcq', 'multiplechoice', 'choice', 'single', 'singlechoice', 'singleanswer', 'quiz', 'radio'],
    tf: ['tf', 'truefalse', 'trueorfalse', 'boolean', 'bool', 'yesno'],
    typed: ['typed', 'written', 'writtenanswer', 'text', 'shortanswer', 'short', 'open', 'openended', 'fillintheblank', 'fillblank', 'fill', 'input', 'freetext', 'answer', 'typeanswer'],
    multi: ['multi', 'multiselect', 'multipleselect', 'multipleanswer', 'multipleanswers', 'multiplecorrect', 'checkbox', 'checkboxes', 'selectall', 'multiplechoicemultiple'],
    order: ['order', 'ordering', 'sequence', 'sort', 'sorting', 'putinorder', 'arrange', 'rank', 'ranking', 'reorder']
};

const typeFrom = (raw) => {
    const key = String(raw || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!key) return null;
    return TYPE_IDS.find(t => TYPE_ALIASES[t].includes(key)) || null;
};

const first = (obj, keys) => {
    for (const k of keys) if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
    return undefined;
};

const asText = (v) => (v === null || v === undefined ? '' : typeof v === 'object' ? String(first(v, ['text', 'label', 'value', 'option', 'answer', 'name']) ?? '') : String(v)).trim();

const toList = (v) => (Array.isArray(v) ? v : v === undefined || v === null || v === '' ? [] : [v]);

const toBool = (v) => {
    if (typeof v === 'boolean') return v;
    const s = String(v ?? '').trim().toLowerCase();
    if (['true', 't', 'yes', 'y', '1', 'correct', 'right', "to'g'ri", 'togri', 'верно', 'правда', 'да'].includes(s)) return true;
    if (['false', 'f', 'no', 'n', '0', 'incorrect', 'wrong', "noto'g'ri", 'notogri', 'неверно', 'ложь', 'нет'].includes(s)) return false;
    return null;
};

// Resolve "answer" specs (text, "B", 1, [..]) against the option texts
const matchOptions = (texts, spec) => {
    const found = new Set();
    for (const s of toList(spec)) {
        const byText = texts.findIndex(t => normalizeAnswer(t) === normalizeAnswer(asText(s)));
        if (byText >= 0) {
            found.add(byText);
            continue;
        }
        if (typeof s === 'number' && Number.isInteger(s)) {
            if (s >= 0 && s < texts.length) found.add(s);
            continue;
        }
        const letter = asText(s).match(/^([A-Fa-f])[).:]?$/);
        if (letter) {
            const i = letter[1].toUpperCase().charCodeAt(0) - 65;
            if (i < texts.length) found.add(i);
        }
    }
    return found;
};

// One loose object -> a normalized question (may still be invalid)
const fromLoose = (item) => {
    if (typeof item === 'string') return null;
    if (!item || typeof item !== 'object') return null;

    const prompt = asText(first(item, ['question', 'prompt', 'q', 'text', 'statement', 'title', 'ques']));
    const rawOptions = first(item, ['options', 'choices', 'alternatives', 'variants']);
    const answerSpec = first(item, ['answers', 'correctAnswers', 'correct_answers', 'answer', 'correctAnswer', 'correct_answer', 'correct', 'solution', 'correctIndex', 'correct_index', 'a']);
    const orderList = first(item, ['items', 'order', 'sequence', 'correctOrder', 'correct_order', 'steps']);
    let type = typeFrom(first(item, ['type', 'kind', 'questionType', 'question_type', 'format']));

    // Guess the type when it's missing
    if (!type) {
        if (Array.isArray(orderList) && !rawOptions) type = 'order';
        else if (!rawOptions && toBool(answerSpec) !== null && typeof answerSpec !== 'number') type = 'tf';
        else if (Array.isArray(rawOptions)) {
            const flagged = rawOptions.filter(o => o && typeof o === 'object' && toBool(first(o, ['correct', 'isCorrect', 'is_correct', 'right'])) === true).length;
            type = flagged > 1 || (Array.isArray(answerSpec) && answerSpec.length > 1) ? 'multi' : 'mc';
        } else type = 'typed';
    }

    const q = { id: uid(), type, prompt };

    if (type === 'mc' || type === 'multi') {
        const list = toList(rawOptions);
        const texts = list.map(asText);
        const correct = matchOptions(texts, answerSpec);
        list.forEach((o, i) => {
            if (o && typeof o === 'object' && toBool(first(o, ['correct', 'isCorrect', 'is_correct', 'right'])) === true) correct.add(i);
        });
        let options = texts.map((text, i) => ({ id: uid(), text, correct: correct.has(i) })).filter(o => o.text);
        // Too many options: keep every correct one, then the first wrong ones
        if (options.length > LIMITS.maxOptions) {
            const right = options.filter(o => o.correct);
            const keepWrong = options.filter(o => !o.correct).slice(0, Math.max(0, LIMITS.maxOptions - right.length));
            const keep = new Set([...right, ...keepWrong]);
            options = options.filter(o => keep.has(o));
        }
        q.options = options;
    } else if (type === 'tf') {
        const b = toBool(Array.isArray(answerSpec) ? answerSpec[0] : answerSpec);
        q.answer = b === null ? undefined : b;
    } else if (type === 'typed') {
        const extra = first(item, ['alsoAccept', 'also_accept', 'accepted', 'acceptedAnswers', 'accepted_answers', 'alternativeAnswers', 'alternatives', 'synonyms']);
        q.accepted = [...new Set([...toList(answerSpec), ...toList(extra)].map(asText).filter(Boolean))];
    } else if (type === 'order') {
        const list = Array.isArray(orderList) ? orderList : Array.isArray(answerSpec) ? answerSpec : toList(rawOptions);
        q.items = list.map(asText).filter(Boolean);
    }
    return q;
};

const findQuestionList = (root) => {
    if (Array.isArray(root)) return root;
    if (!root || typeof root !== 'object') return null;
    const direct = first(root, ['questions', 'quiz', 'items', 'data', 'set', 'questionSet']);
    if (Array.isArray(direct)) return direct;
    if (direct && typeof direct === 'object') return findQuestionList(direct);
    // A single question object
    if (first(root, ['question', 'prompt', 'q'])) return [root];
    // Any array of objects
    const arr = Object.values(root).find(v => Array.isArray(v) && v.some(x => x && typeof x === 'object'));
    return arr || null;
};

const syntaxHint = (err) => {
    const msg = String(err?.message || '');
    const pos = msg.match(/position (\d+)/);
    return `This isn't valid JSON${pos ? ` (problem near character ${pos[1]})` : ''}. Copy the whole answer from ChatGPT, starting with { or [.`;
};

/**
 * Parse pasted JSON.
 * @returns {{ questions: object[], problems: {n:number, prompt:string, message:string}[], meta: {title?:string, description?:string, subject?:string}, error: string|null, total: number }}
 */
export const parseQuestionsJson = (text) => {
    const empty = { questions: [], problems: [], meta: {}, error: null, total: 0 };
    if (!cleanText(text)) return empty;

    const { value, error } = parseLoose(text);
    if (error) return { ...empty, error: syntaxHint(error) };

    const list = findQuestionList(value);
    if (!list) return { ...empty, error: 'No questions found. The JSON should contain a "questions" list.' };

    const meta = {};
    if (value && !Array.isArray(value) && typeof value === 'object') {
        const title = asText(first(value, ['title', 'name', 'setTitle', 'topic']));
        if (title) meta.title = title.slice(0, 80);
        const description = asText(first(value, ['description', 'summary']));
        if (description) meta.description = description.slice(0, 200);
        const subject = asText(value.subject);
        if (subject) meta.subject = subject;
    }

    const questions = [];
    const problems = [];
    list.forEach((item, i) => {
        const q = fromLoose(item);
        if (!q) {
            problems.push({ n: i + 1, prompt: '', message: 'Not a question object.' });
            return;
        }
        const errors = validateQuestion(q);
        if (q.type === 'tf' && typeof q.answer !== 'boolean') errors.push('The answer must be true or false.');
        if (errors.length) {
            problems.push({ n: i + 1, prompt: q.prompt, message: errors.join(' ') });
            return;
        }
        questions.push(tidyQuestion(q));
    });

    return { questions, problems, meta, error: null, total: list.length };
};

export const typeCounts = (questions) =>
    TYPE_IDS.map(type => ({ type, label: QUESTION_TYPES[type].short, count: questions.filter(q => q.type === type).length }))
        .filter(t => t.count > 0);
