import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
    // 1. Task State
    const [todos, setTodos] = useState(() => {
        const saved = localStorage.getItem('premium_todos');
        if (saved) return JSON.parse(saved);
        return [];
    });

    // 1.5 Trash State
    const [trash, setTrash] = useState(() => {
        const saved = localStorage.getItem('premium_trash');
        return saved ? JSON.parse(saved) : [];
    });

    // 2. Categories State
    const [categories, setCategories] = useState(() => {
        const saved = localStorage.getItem('todo_categories');
        return saved ? JSON.parse(saved) : {
            personal: { id: 'personal', label: 'Personal', color: 'text-purple-500 bg-purple-50', icon: '👤' },
            school: { id: 'school', label: 'School', color: 'text-blue-500 bg-blue-50', icon: '🎓' },
            study: { id: 'study', label: 'Study', color: 'text-green-500 bg-green-50', icon: '📚' }
        };
    });

    // Persistence
    useEffect(() => {
        localStorage.setItem('premium_todos', JSON.stringify(todos));
    }, [todos]);

    useEffect(() => {
        localStorage.setItem('premium_trash', JSON.stringify(trash));
    }, [trash]);

    useEffect(() => {
        localStorage.setItem('todo_categories', JSON.stringify(categories));
    }, [categories]);

    // Actions
    const addTask = (newTodo) => {
        setTodos(prev => [{
            id: Date.now(),
            completed: false,
            priority: 'medium',
            category: 'personal',
            subtasks: [],
            dueDate: null,
            notes: '',
            subject: '',
            assignmentType: 'solo', // 'solo', 'team', 'both', 'unknown'
            isOptional: 'unknown',  // 'must', 'optional', 'unknown'
            createdAt: new Date().toISOString(),
            ...newTodo
        }, ...prev]);
    };

    const toggleTask = (id) => {
        setTodos(prev => prev.map(t => {
            if (t.id === id) {
                const isNowCompleted = !t.completed;
                if (isNowCompleted) {
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#10b981', '#34d399', '#059669', '#fcd34d']
                    });
                }
                return { ...t, completed: isNowCompleted };
            }
            return t;
        }));
    };

    const deleteTask = (id) => {
        // Soft delete: Move to trash
        const taskToDelete = todos.find(t => t.id === id);
        if (taskToDelete) {
            setTrash(prev => [{ ...taskToDelete, deletedAt: new Date().toISOString() }, ...prev]);
            setTodos(prev => prev.filter(t => t.id !== id));
        }
    };

    const restoreTask = (id) => {
        const taskToRestore = trash.find(t => t.id === id);
        if (taskToRestore) {
            const { deletedAt, ...rest } = taskToRestore;
            setTodos(prev => [rest, ...prev]);
            setTrash(prev => prev.filter(t => t.id !== id));
        }
    };

    const permanentlyDeleteTask = (id) => {
        setTrash(prev => prev.filter(t => t.id !== id));
    };

    const emptyTrash = () => {
        setTrash([]);
    };

    const updateTask = (id, updates) => {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const addCategory = (name) => {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        if (categories[id]) return;

        const colors = [
            'text-pink-500 bg-pink-50',
            'text-indigo-500 bg-indigo-50',
            'text-orange-500 bg-orange-50',
            'text-teal-500 bg-teal-50'
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        setCategories(prev => ({
            ...prev,
            [id]: { id, label: name, color: randomColor, icon: '🏷️' }
        }));
    };

    const removeCategory = (id) => {
        setCategories(prev => {
            const newCats = { ...prev };
            delete newCats[id];
            return newCats;
        });
    };

    return (
        <TaskContext.Provider value={{
            todos,
            trash,
            setTodos,
            addTask,
            toggleTask,
            deleteTask,
            restoreTask,
            permanentlyDeleteTask,
            emptyTrash,
            updateTask,
            categories,
            addCategory,
            removeCategory
        }}>
            {children}
        </TaskContext.Provider>
    );
};

export const useTask = () => useContext(TaskContext);
