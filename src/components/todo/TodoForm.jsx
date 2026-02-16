import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import { Calendar, BookOpen, StickyNote, Plus, X } from 'lucide-react';
import timetableData from '../../data/timetable.json';
import { format } from 'date-fns';
import CustomDatePicker from '../ui/CustomDatePicker';

const TodoForm = ({
    initialData,
    onSubmit,
    onCancel,
    submitLabel = 'Add Task',
    categories = {},
    onAddCategory,
    onRemoveCategory
}) => {
    const { t } = useLanguage();
    const { userData } = useUser();

    // Form State
    const [text, setText] = useState('');
    const [priority, setPriority] = useState('medium');
    const [dueDate, setDueDate] = useState('');
    const [category, setCategory] = useState('personal');
    const [subject, setSubject] = useState('');
    const [notes, setNotes] = useState('');

    // UI State
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showAddCat, setShowAddCat] = useState(false);

    // Initialize form with data if provided
    useEffect(() => {
        if (initialData) {
            setText(initialData.text || '');
            setPriority(initialData.priority || 'medium');
            setDueDate(initialData.dueDate || '');
            setCategory(initialData.category || 'personal');
            setSubject(initialData.subject || '');
            setNotes(initialData.notes || initialData.details || '');
        }
    }, [initialData]);

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

        onSubmit({
            text,
            priority,
            dueDate,
            category,
            subject,
            notes
        });

        // Only clear if not editing (or let parent handle close)
        if (!initialData) {
            setText('');
            setPriority('medium');
            setDueDate('');
            setCategory('personal');
            setSubject('');
            setNotes('');
        }
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
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Task Title Input */}
            <div>
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('addTask') || "Add a new task..."}
                    className="w-full bg-transparent outline-none text-xl font-bold text-gray-800 dark:text-white placeholder-gray-400 py-2 border-b border-transparent focus:border-primary-500 transition-colors"
                    autoFocus={!initialData}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-5">

                    {/* Priority Selector */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</label>
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                            {Object.entries(priorities).map(([key, val]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setPriority(key)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wide flex items-center justify-center gap-1
                                        ${priority === key ? 'bg-white dark:bg-dark-card shadow text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}
                                    `}
                                >
                                    <span className={`w-2 h-2 rounded-full ${key === 'high' ? 'bg-red-500' : key === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                                    {val.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Picker */}
                    <div className="relative z-20">
                        <CustomDatePicker
                            value={dueDate}
                            onChange={setDueDate}
                            label="Deadline"
                        />
                    </div>

                    {/* Subject Selector (Optional) */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <BookOpen size={12} /> Subject (Optional)
                        </label>
                        <div className="relative">
                            <select
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500 outline-none appearance-none transition-all"
                            >
                                <option value="">None</option>
                                {subjects.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <BookOpen size={14} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-5 h-full flex flex-col">

                    {/* Category Selector */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</label>
                            <button type="button" onClick={() => setShowAddCat(!showAddCat)} className="text-[10px] text-primary-500 font-bold hover:underline bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-full transition-colors">
                                + New
                            </button>
                        </div>

                        {showAddCat ? (
                            <div className="flex gap-2">
                                <input
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    placeholder="Category Name..."
                                    className="flex-1 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary-500"
                                    autoFocus
                                />
                                <button onClick={handleAddCategory} type="button" className="px-3 bg-primary-500 text-white rounded-lg text-sm font-bold shadow-md hover:bg-primary-600 transition-colors">Add</button>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar content-start min-h-[40px]">
                                {Object.values(categories).map((cat) => (
                                    <div key={cat.id} className="relative group/cat">
                                        <button
                                            type="button"
                                            onClick={() => setCategory(cat.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5
                                                ${category === cat.id
                                                    ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900 border-transparent shadow-md transform scale-105'
                                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'}
                                            `}
                                        >
                                            <span>{cat.icon}</span> <span className="capitalize">{cat.label}</span>
                                        </button>
                                        {['personal', 'school', 'study'].indexOf(cat.id) === -1 && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); if (onRemoveCategory) onRemoveCategory(cat.id); }}
                                                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/cat:opacity-100 transition-all shadow-sm scale-0 group-hover/cat:scale-100"
                                                title="Remove Category"
                                            >
                                                <X size={10} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Notes Area */}
                    <div className="space-y-1.5 flex-1 flex flex-col">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <StickyNote size={12} /> Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add details, links, or sub-points..."
                            className="flex-1 w-full bg-gray-50 dark:bg-gray-800 border border-blue-200/50 dark:border-blue-900/30 rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500 outline-none resize-none min-h-[120px]"
                        />
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={!text.trim()}
                    className="px-8 py-2.5 bg-gradient-to-r from-primary-600 to-teal-500 text-white rounded-xl font-bold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {initialData ? 'Save Changes' : <><Plus size={18} strokeWidth={3} /> {submitLabel}</>}
                </button>
            </div>
        </form>
    );
};

export default TodoForm;
