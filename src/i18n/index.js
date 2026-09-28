// Tiny translation engine.
// - English ships with the app; Uzbek and Russian are separate chunks loaded only when chosen.
// - Keys are dotted paths into the locale objects: t('home.title').
// - `{name}` placeholders are filled from vars. A value that is an object with plural forms
//   ({ one, few, many, other }) is picked with Intl.PluralRules when vars.count is given.
// - `t` also works outside React (canvas game, toasts) through the current language.

import en from './locales/en';

export const LANGUAGES = ['en', 'uz', 'ru'];

// BCP 47 locale for dates and numbers (Uzbek in Latin script)
export const localeOf = (lang) => (lang === 'uz' ? 'uz-Latn-UZ' : lang);
export const LANGUAGE_KEY = 'language';

const loaders = {
    uz: () => import('./locales/uz'),
    ru: () => import('./locales/ru')
};

const dicts = { en };

export const isLoaded = (lang) => !!dicts[lang];

export const loadLanguage = async (lang) => {
    if (dicts[lang]) return dicts[lang];
    if (!loaders[lang]) return en;
    const mod = await loaders[lang]();
    dicts[lang] = mod.default;
    return mod.default;
};

// First visit: follow the browser (uz / ru), otherwise English
export const detectLanguage = () => {
    try {
        const saved = localStorage.getItem(LANGUAGE_KEY);
        if (LANGUAGES.includes(saved)) return saved;
    } catch {
        /* ignore */
    }
    const prefs = typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [];
    for (const p of prefs) {
        const base = String(p || '').toLowerCase().split('-')[0];
        if (LANGUAGES.includes(base)) return base;
    }
    return 'en';
};

const lookup = (dict, key) => key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), dict);

const rules = {};
const pluralOf = (lang, count) => {
    try {
        rules[lang] = rules[lang] || new Intl.PluralRules(lang);
        return rules[lang].select(count);
    } catch {
        return count === 1 ? 'one' : 'other';
    }
};

export const translate = (lang, key, vars) => {
    let value = lookup(dicts[lang], key);
    if (value === undefined && lang !== 'en') value = lookup(en, key);
    if (value === undefined) {
        if (import.meta.env?.DEV) console.warn(`[i18n] missing key: ${key}`);
        return key;
    }
    if (value && typeof value === 'object') {
        if (!vars || vars.count === undefined) return key;
        value = value[pluralOf(lang, vars.count)] ?? value.other ?? value.one;
    }
    if (typeof value !== 'string') return key;
    return vars ? value.replace(/\{(\w+)\}/g, (match, name) => (vars[name] ?? match)) : value;
};

// Whole objects/arrays (e.g. the sections of the Terms page), with English as fallback
export const translateRaw = (lang, key) => {
    const value = lookup(dicts[lang], key);
    return value === undefined ? lookup(en, key) : value;
};

// ---------- current language for code outside React ----------

let current = 'en';
export const setCurrentLanguage = (lang) => {
    current = lang;
};
export const getCurrentLanguage = () => current;

export const t = (key, vars) => translate(current, key, vars);

// Registry-style labels can be a key, or [key, vars]
export const tl = (label, tFn = t) => (Array.isArray(label) ? tFn(label[0], label[1]) : tFn(label));
