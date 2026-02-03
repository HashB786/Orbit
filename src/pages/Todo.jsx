import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
// import TodoInput from '../components/todo/TodoInput'; // REMOVED
import TodoItem from '../components/todo/TodoItem';
import TodoCalendar from '../components/todo/TodoCalendar';
import TodoFilters from '../components/todo/TodoFilters';
import { ListTodo, Trash2, PieChart, Calendar as CalendarIcon, LayoutGrid } from 'lucide-react';

import { useTask } from '../context/TaskContext';

const Todo = () => {
    const { t } = useLanguage();
    const {
        todos,
        trash,
        setTodos,
        addTask,
        toggleTask,
        deleteTask,
        updateTask,
        categories,
        addCategory,
        removeCategory,
        restoreTask,
        permanentlyDeleteTask
    } = useTask();

    // Mapping context functions to local names used by components
    const addTodo = addTask;
    const toggleTodo = toggleTask;
    const deleteTodo = deleteTask;
    const updateTodo = updateTask;

    const [filter, setFilter] = useState('all'); // all, active, completed, trash
    const [viewMode, setViewMode] = useState('list'); // list, calendar

    const [sortMode, setSortMode] = useState('custom'); // 'custom' | 'auto'
    const [activeFilters, setActiveFilters] = useState({
        priorities: [], // ['high', 'medium', 'low']
        categories: [], // ['personal', 'school']
        deadlineState: 'off' // 'off' | 'has_deadline' | 'no_deadline'
    });

    // Confetti logic moved to Context or kept here if UI only? 
    // Context handles the toggle confetti, so we don't need it here.


    // Advanced Filtering & Sorting Logic
    const getProcessedTodos = () => {
        let result = filter === 'trash' ? [...trash] : [...todos];

        // Skip filtering for trash view usually, or keep it?
        // Let's keep filters but ensure 'active/completed' view logic is bypassed if trash.

        // 1. Filtering
        // Priority Filter
        if (activeFilters.priorities.length > 0) {
            result = result.filter(t => activeFilters.priorities.includes(t.priority));
        }
        // Category Filter
        if (activeFilters.categories.length > 0) {
            result = result.filter(t => activeFilters.categories.includes(t.category));
        }
        // Deadline Tri-State Filter
        const deadlineState = activeFilters.deadlineState || 'off';
        if (deadlineState !== 'off') {
            result = result.filter(t => {
                if (deadlineState === 'has_deadline') return !!t.dueDate;
                if (deadlineState === 'no_deadline') return !t.dueDate;
                return true;
            });
        }

        // View Filter (List specific)
        if (filter === 'active') result = result.filter(t => !t.completed);
        if (filter === 'completed') result = result.filter(t => t.completed);
        // trash is already handled by source selection

        // 2. Sorting
        if (sortMode === 'auto') {
            result.sort((a, b) => {
                // First by deadline (if exists)
                if (a.dueDate && !b.dueDate) return -1;
                if (!a.dueDate && b.dueDate) return 1;
                if (a.dueDate && b.dueDate) {
                    return new Date(a.dueDate) - new Date(b.dueDate);
                }
                // Then by priority
                const pMap = { high: 3, medium: 2, low: 1 };
                return pMap[b.priority] - pMap[a.priority];
            });
        }

        return result;
    };

    const filteredTodos = getProcessedTodos();

    const progress = todos.length > 0 ? Math.round((todos.filter(t => t.completed).length / todos.length) * 100) : 0;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            {/* Header with Stats */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-teal-500 flex items-center gap-3">
                        <ListTodo className="text-primary-500" size={32} /> {t('todo')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Master your day, one task at a time.</p>
                </div>

                {/* Progress Card */}
                <div className="glass-card px-6 py-4 flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Progress</span>
                        <span className="text-2xl font-bold font-mono text-gray-800 dark:text-gray-100">{progress}%</span>
                    </div>

                    {/* Visual Bar */}
                    <div className="w-32 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-gradient-to-r from-primary-500 to-teal-400"
                        />
                    </div>

                    {progress === 100 && todos.length > 0 && <span className="text-2xl">🎉</span>}
                </div>
            </div>

            {/* Input Area REMOVED - Tasks must be added via Timetable */}
            {/* <TodoInput ... /> */}

            {/* Filters & Sorting */}
            <TodoFilters
                activeFilters={activeFilters}
                setActiveFilters={setActiveFilters}
                sortMode={sortMode}
                setSortMode={setSortMode}
                categories={categories}
            />

            {/* View Toggle & List Controller */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                {/* Filters (only for List view) */}
                {viewMode === 'list' ? (
                    <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        {['all', 'active', 'completed', 'trash'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-white dark:bg-dark-surface text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-gray-500 text-sm font-medium italic">Calendar View</div>
                )}

                {/* View Switcher */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-dark-surface text-primary-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        title="List View"
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-dark-surface text-primary-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Calendar View"
                    >
                        <CalendarIcon size={20} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                {viewMode === 'list' ? (
                    <motion.div
                        key="list"
                        initial="hidden"
                        animate="show"
                        exit="hidden"
                        variants={{
                            hidden: { opacity: 0 },
                            show: { opacity: 1 }
                        }}
                    >
                        {/* Draggable List */}
                        <Reorder.Group axis="y" values={todos} onReorder={setTodos} className="space-y-4">
                            <AnimatePresence mode="popLayout">
                                {filteredTodos.map(todo => (
                                    <TodoItem
                                        key={todo.id}
                                        todo={todo}
                                        onToggle={toggleTodo}
                                        onDelete={deleteTodo}
                                        onRestore={restoreTask}
                                        onPermanentDelete={permanentlyDeleteTask}
                                        onUpdate={updateTodo}
                                        isTrash={filter === 'trash'}
                                    />
                                ))}
                            </AnimatePresence>
                        </Reorder.Group>

                        {filteredTodos.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-20 opacity-40"
                            >
                                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <PieChart size={32} />
                                </div>
                                <p className="text-lg font-medium">No tasks found</p>
                            </motion.div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="calendar"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                    >
                        <TodoCalendar todos={todos} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Todo;
