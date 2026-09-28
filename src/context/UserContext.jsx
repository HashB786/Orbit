import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// The display name used as author name and default nickname.
// Signed-in teachers use their account name; everyone else a name kept in this browser.
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
    const auth = useAuth();
    const [local, setLocal] = useState(read);

    useEffect(() => {
        try {
            localStorage.setItem('userSettings', JSON.stringify(local));
        } catch {
            /* ignore */
        }
    }, [local]);

    const signedIn = !!auth?.user;
    const userData = { name: signedIn ? auth.displayName : local.name };

    const updateUserData = (updates) => {
        if (typeof updates.name !== 'string') return;
        setLocal(prev => ({ ...prev, name: updates.name }));
        if (signedIn) auth.updateName(updates.name).catch(() => {});
    };

    return (
        <UserContext.Provider value={{ userData, updateUserData }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
