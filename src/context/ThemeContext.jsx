import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // 1. Saved Preferences (Persistent)
    // Space (dark) is Orbit's default look
    const [savedTheme, setSavedTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    const [savedColorTheme, setSavedColorTheme] = useState(() => localStorage.getItem('colorTheme') || 'green');

    // 2. Active Session State (Temporary)
    // Initialize from SessionOptions OR SavedOptions
    const [theme, setTheme] = useState(() => {
        const session = sessionStorage.getItem('session_theme');
        return session || localStorage.getItem('theme') || 'dark';
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
        // Phone browser bar matches the sky
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#050816' : '#eef1ff');
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
        const order = ['green', 'blue', 'violet'];
        setAccent(order[(order.indexOf(colorTheme) + 1) % order.length], permanent);
    };

    // Performance Settings
    const [performance, setPerformance] = useState(() => {
        const defaults = { blur: true, reducedMotion: false, particles: true };
        try {
            return { ...defaults, ...JSON.parse(localStorage.getItem('perfSettings') || '{}') };
        } catch {
            return defaults;
        }
    });

    useEffect(() => {
        localStorage.setItem('perfSettings', JSON.stringify(performance));

        // Apply global classes for performance tweaking
        const root = document.documentElement;
        root.classList.toggle('no-blur', !performance.blur);
        // Stops Orbit's CSS animations (twinkling stars, orbiting moons...)
        root.classList.toggle('reduce-motion', !!performance.reducedMotion);
        root.classList.toggle('no-fx', !performance.particles);
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
