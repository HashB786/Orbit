import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const translations = {
    en: {
        home: 'Home',
        discover: 'Discover',
        create: 'Create',
        games: 'Games',
        settings: 'Settings',
        joinGame: 'Join a game',
        profile: 'Profile',
        appearance: 'Appearance',
        theme: 'Appearance',
        language: 'Language',
        sound: 'Sound',
        save: 'Save',
        welcome: 'Welcome back'
    },
    uz: {
        home: 'Bosh sahifa',
        discover: 'Kashf etish',
        create: 'Yaratish',
        games: "O'yinlar",
        settings: 'Sozlamalar',
        joinGame: "O'yinga qo'shilish",
        profile: 'Profil',
        appearance: "Ko'rinish",
        theme: "Ko'rinish",
        language: 'Til',
        sound: 'Ovoz',
        save: 'Saqlash',
        welcome: 'Xush kelibsiz'
    },
    ru: {
        home: 'Главная',
        discover: 'Обзор',
        create: 'Создать',
        games: 'Игры',
        settings: 'Настройки',
        joinGame: 'Войти в игру',
        profile: 'Профиль',
        appearance: 'Внешний вид',
        theme: 'Тема',
        language: 'Язык',
        sound: 'Звук',
        save: 'Сохранить',
        welcome: 'С возвращением'
    }
};

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState(() => {
        try {
            const saved = localStorage.getItem('language');
            return saved && translations[saved] ? saved : 'en';
        } catch {
            return 'en';
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('language', lang);
        } catch {
            /* ignore */
        }
        document.documentElement.lang = lang;
    }, [lang]);

    const t = (key) => translations[lang][key] || translations.en[key] || key;

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
