import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [userData, setUserData] = useState(() => {
        try {
            const stored = localStorage.getItem('userSettings');
            return stored ? JSON.parse(stored) : {
                name: '',
                grade: '', // e.g., "8"
                classColor: 'green', // "green" or "blue"
                isOnboarded: false
            };
        } catch (e) {
            return {
                name: '',
                grade: '',
                classColor: 'green',
                isOnboarded: false
            };
        }
    });

    useEffect(() => {
        localStorage.setItem('userSettings', JSON.stringify(userData));

        // Sync with legacy "lastClass" for Timetable compatibility
        if (userData.grade && userData.classColor) {
            localStorage.setItem('lastClass', `${userData.grade}_${userData.classColor}`);
        }
    }, [userData]);

    const updateUserData = (updates) => {
        setUserData(prev => ({ ...prev, ...updates }));
    };

    return (
        <UserContext.Provider value={{ userData, updateUserData }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
