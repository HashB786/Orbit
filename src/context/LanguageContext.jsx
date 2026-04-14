import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const translations = {
    en: {
        home: 'Dashboard',
        timetable: 'Timetable',
        todo: 'To-Do',
        settings: 'Settings',
        profile: 'Profile',
        appearance: 'Appearance',
        dangerZone: 'Danger Zone',
        deleteAccount: 'Delete Account',
        save: 'Save',
        custom: 'Custom',
        sorted: 'Sorted',
        filters: 'Filters',
        priority: 'Priority',
        deadline: 'Deadline',
        categories: 'Categories',
        welcome: 'Welcome back',
        selectClass: 'Select Class',
        upcoming: 'Coming Up',
        now: 'Happening Now',
        noClasses: 'No classes right now',
        addTask: 'Add a new task...',
        emptyTodo: 'All caught up! Time to relax.',
        theme: 'Appearance',
        language: 'Language',
    },
    uz: {
        home: 'Boshqaruv',
        timetable: 'Dars Jadvali',
        todo: 'Vazifalar',
        settings: 'Sozlamalar',
        profile: 'Profil',
        appearance: 'Ko\'rinish',
        dangerZone: 'Xavfli Hudud',
        deleteAccount: 'Hisobni O\'chirish',
        save: 'Saqlash',
        custom: 'Boshqacha',
        sorted: 'Saralangan',
        filters: 'Filterlar',
        priority: 'Muhimlik',
        deadline: 'Muddat',
        categories: 'Kategoriyalar',
        welcome: 'Xush kelibsiz',
        selectClass: 'Sinfni Tanlang',
        upcoming: 'Navbatdagi',
        now: 'Hozirgi Dars',
        noClasses: 'Hozir dars yo\'q',
        addTask: 'Yangi vazifa qo\'shish...',
        emptyTodo: 'Hammasi bajarildi! Dam olish vaqti.',
        theme: 'Ko\'rinish',
        language: 'Til',
    },
    ru: {
        home: 'Главная',
        timetable: 'Расписание',
        todo: 'Задачи',
        settings: 'Настройки',
        profile: 'Профиль',
        appearance: 'Внешний вид',
        dangerZone: 'Опасная зона',
        deleteAccount: 'Удалить аккаунт',
        save: 'Сохранить',
        custom: 'Свой порядок',
        sorted: 'Сортировка',
        filters: 'Фильтры',
        priority: 'Приоритет',
        deadline: 'Срок',
        categories: 'Категории',
        welcome: 'Добро пожаловать',
        selectClass: 'Выберите класс',
        upcoming: 'Далее',
        now: 'Сейчас',
        noClasses: 'Сейчас нет уроков',
        addTask: 'Добавить задачу...',
        emptyTodo: 'Всё сделано! Время отдыхать.',
        theme: 'Тема',
        language: 'Язык',
    },
};

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('language');
        return (saved && translations[saved]) ? saved : 'en';
    });

    useEffect(() => {
        localStorage.setItem('language', lang);
    }, [lang]);

    const t = (key) => {
        const translation = translations[lang][key];
        return translation || key;
    };

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
