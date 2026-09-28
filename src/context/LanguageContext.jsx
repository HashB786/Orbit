import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANGUAGE_KEY, detectLanguage, isLoaded, loadLanguage, setCurrentLanguage, translate, translateRaw } from '../i18n';

const LanguageContext = createContext();

export const LanguageProvider = ({ children, initial }) => {
    // main.jsx loads the starting language before the first render, so there's no flash of English
    const [lang, setLangState] = useState(() => (initial && isLoaded(initial) ? initial : 'en'));

    useEffect(() => {
        setCurrentLanguage(lang);
        document.documentElement.lang = lang;
    }, [lang]);

    const setLang = useCallback(async (next) => {
        try {
            await loadLanguage(next);
        } catch {
            return; // offline and not loaded yet: keep the current language
        }
        try {
            localStorage.setItem(LANGUAGE_KEY, next);
        } catch {
            /* ignore */
        }
        setCurrentLanguage(next);
        setLangState(next);
    }, []);

    const value = useMemo(() => ({
        lang,
        setLang,
        t: (key, vars) => translate(lang, key, vars),
        raw: (key) => translateRaw(lang, key)
    }), [lang, setLang]);

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);

// Shorthand when only `t` is needed
export const useT = () => useContext(LanguageContext).t;

export const initialLanguage = detectLanguage;
