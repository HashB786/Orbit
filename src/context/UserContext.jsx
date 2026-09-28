import React, { createContext, useContext, useState, useEffect } from 'react';

// The only profile data for now: the display name used as author name and default nickname.
// (Google sign-in for teachers comes later; joining a game never needs an account.)
const UserContext = createContext();

const read = () => {
    try {
        const stored = JSON.parse(localStorage.getItem('userSettings') || '{}');
        return { name: typeof stored.name === 'string' ? stored.name : '' };
    } catch {
        return { name: '' };
    }
};

export const UserProvider = ({ children }) => {
    const [userData, setUserData] = useState(read);

    useEffect(() => {
        try {
            localStorage.setItem('userSettings', JSON.stringify(userData));
        } catch {
            /* ignore */
        }
    }, [userData]);

    const updateUserData = (updates) => setUserData(prev => ({ ...prev, ...updates }));

    return (
        <UserContext.Provider value={{ userData, updateUserData }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
