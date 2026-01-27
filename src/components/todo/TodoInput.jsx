import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, Flag, Tag, X, Trash2, BookOpen, StickyNote } from 'lucide-react';
import timetableData from '../../data/timetable.json';

const TodoInput = ({ onAdd, categories = {}, onAddCategory, onRemoveCategory }) => {
    const { t } = useLanguage();
    const { userData } = useUser();

    const [text, setText] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showAddCat, setShowAddCat] = useState(false);

    // Meta data states
    const [priority, setPriority] = useState('medium');
    const [dueDate, setDueDate] = useState('');
    const [category, setCategory] = useState('personal');
    const [subject, setSubject] = useState('');
    const [notes, setNotes] = useState('');

    // Extract Subjects based on user grade/class
    const subjects = useMemo(() => {
        const grade = userData?.grade || '8';
        const color = userData?.classColor || 'green';
        const gradeData = timetableData.grades[grade];
        const classInfo = (gradeData && gradeData[color]) ? gradeData[color] : null;

        if (!classInfo) return [];

        const uniqueSubjects = new Set();
        Object.values(classInfo.schedule).forEach(day => {
            day.forEach(lesson => uniqueSubjects.add(lesson.subject));
        });
        return Array.from(uniqueSubjects).sort();
    }, [userData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim()) return;

        onAdd({
            text,
            priority,
            dueDate,
            category,
            subject, // Added subject
            notes,   // Added notes
            subtasks: []
        });

        setText('');
        setIsExpanded(false);
        // Reset defaults
        setPriority('medium');
        setDueDate('');
        setCategory('personal');
        setSubject('');
        setNotes('');
    };

    const handleAddCategory = (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        if (onAddCategory) onAddCategory(newCategoryName);
        setNewCategoryName('');
        setShowAddCat(false);
    };

    const priorities = {
        low: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Low' },
        medium: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Medium' },
        high: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Urgent' }
    };

    return (
        <div className="relative z-20 mb-8">
            <div
                className={`relative z-20 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ${isExpanded ? 'p-4 ring-2 ring-primary-500/20' : 'p-2'}`}
            >
                <form onSubmit={handleSubmit}>
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onFocus={() => setIsExpanded(true)}
                            placeholder={t('addTask')}
                            className={`w-full bg-transparent outline-none text-lg text-gray-800 dark:text-white placeholder-gray-400 pl-4 py-3 ${isExpanded ? 'font-semibold' : ''}`}
                        />

                        {!isExpanded && (
                            <button
                                type="submit"
                                className="mr-2 p-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors shadow-md shadow-primary-500/30"
                            >
                                <Plus size={20} />
                            </button>
                        )}
                    </div>

                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 space-y-4"
                            >
                                {/* Controls Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                    {/* Left Column */}
                                    <div className="space-y-4">
                                        {/* Priority Selector */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</label>
                                            <div className="flex gap-2">
                                                {Object.entries(priorities).map(([key, val]) => (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => setPriority(key)}
                                                        className={`flex-1 h-8 px-2 rounded-lg border text-xs font-bold transition-all uppercase tracking-wide ${priority === key ? val.color + ' border-current scale-105 shadow-sm' : 'border-dashed border-gray-300 text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
                                                    >
                                                        {val.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Date Picker */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                <Calendar size={12} /> Deadline
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={dueDate}
                                                onChange={(e) => setDueDate(e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500 outline-none"
                                            />
                                        </div>

                                        {/* Subject Selector (Optional) */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                <BookOpen size={12} /> Subject (Optional)
                                            </label>
                                            <select
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500 outline-none appearance-none"
                                            >
                                                <option value="">None</option>
                                                {subjects.map(sub => (
                                                    <option key={sub} value={sub}>{sub}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div className="space-y-4">
                                        {/* Category Selector */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</label>
                                                <button type="button" onClick={() => setShowAddCat(!showAddCat)} className="text-[10px] text-primary-500 font-bold hover:underline">+ New</button>
                                            </div>

                                            {showAddCat ? (
                                                <div className="flex gap-1">
                                                    <input
                                                        value={newCategoryName}
                                                        onChange={e => setNewCategoryName(e.target.value)}
                                                        placeholder="Name..."
                                                        className="flex-1 bg-gray-50 border rounded px-2 py-1 text-xs outline-none"
                                                        autoFocus
                                                    />
                                                    <button onClick={handleAddCategory} type="button" className="px-2 bg-primary-500 text-white rounded text-xs">Add</button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar content-start">
                                                    {Object.values(categories).map((cat) => (
                                                        <div key={cat.id} className="relative group/cat">
                                                            <button
                                                                type="button"
                                                                onClick={() => setCategory(cat.id)}
                                                                className={`px-2 py-1 rounded-md text-xs font-bold border transition-all flex items-center gap-1 ${category === cat.id ? 'bg-gray-100 dark:bg-gray-700 border-gray-400 dark:border-gray-500 text-gray-800 dark:text-gray-200' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                                            >
                                                                <span>{cat.icon}</span> <span className="capitalize">{cat.label}</span>
                                                            </button>
                                                            {['personal', 'school', 'study'].indexOf(cat.id) === -1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); if (onRemoveCategory) onRemoveCategory(cat.id); }}
                                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/cat:opacity-100 transition-opacity"
                                                                >
                                                                    <X size={8} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Notes Area */}
                                        <div className="space-y-1 h-full flex flex-col">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                <StickyNote size={12} /> Notes
                                            </label>
                                            <textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder="Add details, links, or sub-points..."
                                                className="flex-1 min-h-[80px] w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => setIsExpanded(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-gradient-to-r from-primary-600 to-teal-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-primary-500/25 hover:scale-105 transition-all flex items-center gap-2"
                                    >
                                        <Plus size={18} /> Add Task
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </form>
            </div>
        </div>
    );
};

export default TodoInput;
