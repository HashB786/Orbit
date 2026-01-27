import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // 1. Saved Preferences (Persistent)
    const [savedTheme, setSavedTheme] = useState(() => localStorage.getItem('theme') || 'light');
    const [savedColorTheme, setSavedColorTheme] = useState(() => localStorage.getItem('colorTheme') || 'green');

    // 2. Active Session State (Temporary)
    // Initialize from SessionOptions OR SavedOptions
    const [theme, setTheme] = useState(() => {
        const session = sessionStorage.getItem('session_theme');
        return session || localStorage.getItem('theme') || 'light';
    });

    const [colorTheme, setColorTheme] = useState(() => {
        const session = sessionStorage.getItem('session_colorTheme');
        return session || localStorage.getItem('colorTheme') || 'green';
    });

    // Sync Saved State to LocalStorage
    useEffect(() => {
        localStorage.setItem('theme', savedTheme);
    }, [savedTheme]);

    useEffect(() => {
        localStorage.setItem('colorTheme', savedColorTheme);
    }, [savedColorTheme]);

    // Apply Active State to DOM & SessionStorage
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        sessionStorage.setItem('session_theme', theme);
    }, [theme]);

    useEffect(() => {
        const root = window.document.documentElement;
        root.setAttribute('data-theme', colorTheme);
        sessionStorage.setItem('session_colorTheme', colorTheme);
    }, [colorTheme]);

    // Setters
    const setMode = (mode, permanent = false) => {
        setTheme(mode);
        sessionStorage.setItem('session_theme', mode);
        if (permanent) setSavedTheme(mode);
    };

    const setAccent = (color, permanent = false) => {
        setColorTheme(color);
        sessionStorage.setItem('session_colorTheme', color);
        if (permanent) setSavedColorTheme(color);
    };

    // Toggle Functions
    const toggleTheme = (permanent = false) => {
        setMode(theme === 'light' ? 'dark' : 'light', permanent);
    };

    const toggleColorTheme = (permanent = false) => {
        setAccent(colorTheme === 'green' ? 'blue' : 'green', permanent);
    };

    // Performance Settings
    const [performance, setPerformance] = useState(() => {
        const saved = localStorage.getItem('perfSettings');
        return saved ? JSON.parse(saved) : {
            blur: true, // Glassmorphism enabled
            reducedMotion: false,
            particles: true // Confetti/Background blobs
        };
    });

    useEffect(() => {
        localStorage.setItem('perfSettings', JSON.stringify(performance));

        // Apply global classes for performance tweaking
        if (!performance.blur) {
            document.documentElement.classList.add('no-blur');
        } else {
            document.documentElement.classList.remove('no-blur');
        }
    }, [performance]);

    const updatePerformance = (key, value) => {
        setPerformance(prev => ({ ...prev, [key]: value }));
    };

    return (
        <ThemeContext.Provider value={{
            theme,
            toggleTheme,
            setTheme: setMode, // Export as setTheme for compatibility
            colorTheme,
            toggleColorTheme,
            setColorTheme: setAccent, // Export as setColorTheme
            performance,
            updatePerformance,
            savedTheme,
            savedColorTheme
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
