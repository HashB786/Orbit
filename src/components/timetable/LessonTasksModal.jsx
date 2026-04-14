import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, ChevronLeft, ChevronRight, Plus, Users, User, HelpCircle, AlertCircle, Trash, Edit2, CheckCircle2, Circle } from 'lucide-react';
import { format, addWeeks, subWeeks, isSameDay, isBefore, startOfDay, addDays, getDay } from 'date-fns';
import { useTask } from '../../context/TaskContext';

const LessonTasksModal = ({ isOpen, onClose, lesson, initialDate }) => {
    const { todos, addTask, updateTask, deleteTask, toggleTask } = useTask();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [view, setView] = useState('list'); // 'list' | 'form'
    const [editingTask, setEditingTask] = useState(null);

    // Form State
    // Form State
    const [title, setTitle] = useState('');
    const [details, setDetails] = useState('');
    const [taskType, setTaskType] = useState('solo');
    const [isOptional, setIsOptional] = useState('must');
    const [expandedTaskId, setExpandedTaskId] = useState(null);

    // Initialize specific date based on passed initialDate
    useEffect(() => {
        if (isOpen && initialDate) {
            setSelectedDate(initialDate);
            setView('list');
            resetForm();
        }
    }, [isOpen, initialDate]);

    const resetForm = () => {
        setTitle('');
        setDetails('');
        setTaskType('solo');
        setIsOptional('must');
        setEditingTask(null);
    };

    const handleEdit = (task) => {
        setEditingTask(task);
        setTitle(task.text || 'Untitled');
        setDetails(task.details || task.notes || '');
        setTaskType(task.type || 'solo');
        setIsOptional(task.isOptional || 'must');
        setView('form');
    };

    const handleSave = () => {
        const taskData = {
            subject: lesson.subject,
            dueDate: selectedDate,
            type: taskType,
            isOptional,
            text: title,
            details: details,
            notes: details, // Legacy support
            category: 'school'
        };

        if (editingTask) {
            updateTask(editingTask.id, taskData);
        } else {
            addTask(taskData);
        }
        setView('list');
        resetForm();
    };

    // Filter tasks for this subject AND date
    const lessonTasks = todos.filter(t =>
        t.subject === lesson?.subject &&
        t.dueDate &&
        isSameDay(new Date(t.dueDate), selectedDate)
    ).sort((a, b) => Number(a.completed) - Number(b.completed));

    if (!isOpen || !lesson) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 pb-4 bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-md z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                {lesson.subject}
                            </h2>
                            <p className="opacity-90 text-sm font-medium flex items-center gap-2">
                                {lesson.timeSlot && <span>{lesson.timeSlot.split(' - ')[0]}</span>}
                                <span>•</span>
                                <span>{lesson.room}</span>
                            </p>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Date Navigation */}
                    <div className="mt-6 flex items-center justify-between bg-white/10 rounded-xl p-2 backdrop-blur-sm">
                        <button onClick={() => setSelectedDate(subWeeks(selectedDate, 1))} className="p-1 hover:bg-white/20 rounded text-white transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <div className="text-center">
                            <div className="font-bold text-lg leading-none">{format(selectedDate, 'EEEE')}</div>
                            <div className="text-xs opacity-80 uppercase tracking-wide font-bold">{format(selectedDate, 'MMMM d, yyyy')}</div>
                        </div>
                        <button onClick={() => setSelectedDate(addWeeks(selectedDate, 1))} className="p-1 hover:bg-white/20 rounded text-white transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-gray-50 dark:bg-gray-950/50">
                    <AnimatePresence mode="wait">
                        {view === 'list' ? (
                            <motion.div
                                key="list"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-4 space-y-3"
                            >
                                {lessonTasks.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="bg-gray-100 dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Calendar size={32} className="text-gray-400" />
                                        </div>
                                        <h3 className="text-gray-900 dark:text-white font-bold mb-1">No tasks for this day</h3>
                                        <p className="text-gray-500 text-sm mb-6">Enjoy your free time or add a new assignment.</p>
                                        <button
                                            onClick={() => { resetForm(); setView('form'); }}
                                            className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20 transition-all active:scale-95 inline-flex items-center gap-2"
                                        >
                                            <Plus size={18} /> Add Assignment
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-1">
                                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Assignments ({lessonTasks.length})</h3>
                                            <button
                                                onClick={() => { resetForm(); setView('form'); }}
                                                className="text-primary-600 dark:text-primary-400 text-xs font-bold hover:underline flex items-center gap-1"
                                            >
                                                <Plus size={14} /> Add New
                                            </button>
                                        </div>

                                        {lessonTasks.map(task => (
                                            <div
                                                key={task.id}
                                                onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                                className={`p-4 rounded-xl border transition-all cursor-pointer 
                                                    ${task.completed
                                                        ? 'bg-gray-100 dark:bg-gray-900/40 border-transparent opacity-70 grayscale-[0.3]'
                                                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md'}
                                                    ${expandedTaskId === task.id && !task.completed ? 'border-primary-200 dark:border-primary-800 ring-1 ring-primary-500/20' : ''}
                                                `}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                                                        className={`mt-0.5 shrink-0 transition-colors ${task.completed ? 'text-green-500' : 'text-gray-300 hover:text-primary-500'}`}
                                                    >
                                                        {task.completed ? <CheckCircle2 size={24} className="fill-current" /> : <Circle size={24} />}
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`font-bold text-lg text-gray-900 dark:text-white break-words ${task.completed ? 'line-through opacity-50' : ''}`}>
                                                            {task.text || 'Untitled Assignment'}
                                                        </p>

                                                        {/* Details Preview (only if not expanded and exists) */}
                                                        {!expandedTaskId && (task.details || task.notes) && (
                                                            <p className="text-gray-400 text-xs truncate mt-1">{task.details || task.notes}</p>
                                                        )}

                                                        <div className="flex items-center gap-3 mt-2">
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${task.isOptional === 'must' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                                                                {task.isOptional}
                                                            </span>
                                                            {task.type && (
                                                                <span className="text-xs text-gray-400 flex items-center gap-1 capitalize">
                                                                    {task.type === 'solo' && <User size={12} />}
                                                                    {task.type === 'team' && <Users size={12} />}
                                                                    {task.type}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Expanded Content */}
                                                        <AnimatePresence>
                                                            {expandedTaskId === task.id && (task.details || task.notes) && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap"
                                                                >
                                                                    {task.details || task.notes}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>

                                                    {/* Actions (Only visible when expanded or hovered) */}
                                                    <div className={`flex flex-col gap-2 transition-opacity ${expandedTaskId === task.id ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
                                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(task); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-blue-500">
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-red-500">
                                                            <Trash size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="p-6 space-y-6"
                            >
                                {/* Form Controls */}
                                <div className="space-y-4">
                                    {/* Type */}
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Type</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'solo', label: 'Solo', icon: User },
                                                { id: 'team', label: 'Team', icon: Users },
                                                { id: 'both', label: 'Both', icon: HelpCircle }
                                            ].map((type) => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setTaskType(type.id)}
                                                    className={`
                                                        flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-bold transition-all border
                                                        ${taskType === type.id
                                                            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-600'
                                                            : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}
                                                    `}
                                                >
                                                    <type.icon size={16} />
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Priority */}
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Priority</label>
                                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                                            {['must', 'optional'].map((opt) => (
                                                <button
                                                    key={opt}
                                                    onClick={() => setIsOptional(opt)}
                                                    className={`flex-1 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${isOptional === opt ? 'bg-white dark:bg-dark-card shadow text-gray-900 dark:text-white' : 'text-gray-500'}`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Assignment Title</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="e.g. Read Chapter 5, Math Worksheet..."
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-lg font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                                            autoFocus
                                        />
                                    </div>

                                    {/* Details */}
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Details (Optional)</label>
                                        <textarea
                                            value={details}
                                            onChange={(e) => setDetails(e.target.value)}
                                            placeholder="Page numbers, instructions, links..."
                                            className="w-full h-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 resize-none outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setView('list')}
                                        className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={!title.trim()}
                                        className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-600/20"
                                    >
                                        {editingTask ? 'Save Changes' : 'Add Assignment'}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default LessonTasksModal;
