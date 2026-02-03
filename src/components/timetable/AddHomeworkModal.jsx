import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, ChevronLeft, ChevronRight, AlertTriangle, Users, User, HelpCircle, AlertCircle } from 'lucide-react';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isBefore, startOfDay, addDays, getDay } from 'date-fns';

const AddHomeworkModal = ({ isOpen, onClose, lesson, onAdd }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [taskType, setTaskType] = useState('solo'); // solo, team, both
    const [isOptional, setIsOptional] = useState('must'); // must, optional, unknown
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen && lesson) {
            // Auto-select the nearest upcoming date for this lesson's day
            const targetDayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(lesson.day);
            const today = new Date();
            let nextDate = new Date();

            // simple find next occurrence
            while (getDay(nextDate) !== targetDayIndex || isBefore(nextDate, startOfDay(today))) {
                nextDate = addDays(nextDate, 1);
            }
            setSelectedDate(nextDate);
            setCurrentMonth(nextDate);
            setNotes('');
            setError('');
        }
    }, [isOpen, lesson]);

    const handleDateSelect = (date) => {
        // Validate
        if (isBefore(date, startOfDay(new Date()))) {
            setError("You cannot select a past date.");
            return;
        }

        // Validate Day Match?
        // User asked: "selects a date... highlights whole week... if student selects 21th which highlights whole week".
        // User implied they can select ANY date, but it should probably match the lesson day?
        // "lets say today is wednesday, and selects some subject from tuesday and selects this current week, which is also passed... give that notice message".
        // So we strictly allow selecting the DATE, but we should warn if it doesn't match the lesson day? 
        // Actually, if I select "Physics" from Monday, I probably want to set the due date to a Monday? 
        // Or can I set it to any day? Usually homework is due on the lesson day.
        // Let's enforce that it must be the same day of the week, OR just warn.
        // For now, let's allow any date but show "Next Date" buttons.

        setSelectedDate(date);
        setError('');

        const targetDayName = format(date, 'EEEE');
        if (targetDayName !== lesson.day) {
            setError(`Warning: This subject usually happens on ${lesson.day}, but you selected ${targetDayName}.`);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd({
            subject: lesson.subject,
            dueDate: selectedDate,
            type: taskType,
            isOptional,
            notes,
            category: 'school'
        });
        onClose();
    };

    if (!isOpen) return null;

    // Calendar Generation
    const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(currentMonth, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 pb-2 bg-gradient-to-r from-primary-600 to-indigo-600">
                    <div className="flex justify-between items-start text-white">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                {lesson?.subject}
                            </h2>
                            <p className="text-white/80 text-sm font-medium">Add Homework</p>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                    {/* Date Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Calendar size={16} className="text-primary-500" /> Due Date
                            </label>
                            <div className="flex gap-1">
                                <button onClick={() => setCurrentMonth(subWeeks(currentMonth, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-sm font-medium w-32 text-center">
                                    {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                                </span>
                                <button onClick={() => setCurrentMonth(addWeeks(currentMonth, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Week Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                                <div key={i} className="text-center text-xs font-bold text-gray-400 py-1">{d}</div>
                            ))}
                            {weekDays.map((day) => {
                                const isSelected = isSameDay(day, selectedDate);
                                const isPast = isBefore(day, startOfDay(new Date()));
                                const isLessonDay = format(day, 'EEEE') === lesson?.day;

                                return (
                                    <button
                                        key={day.toString()}
                                        onClick={() => handleDateSelect(day)}
                                        disabled={isPast}
                                        className={`
                                            h-10 rounded-lg text-sm font-medium transition-all relative
                                            ${isSelected
                                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                                                : isPast
                                                    ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                                            }
                                            ${!isSelected && isLessonDay && !isPast ? 'ring-1 ring-primary-500 ring-inset bg-primary-50 dark:bg-primary-900/20' : ''}
                                        `}
                                    >
                                        {format(day, 'd')}
                                        {isLessonDay && !isPast && !isSelected && (
                                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-500" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Error/Warning Message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-amber-600 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg flex items-center gap-2"
                                >
                                    <AlertTriangle size={12} /> {error}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Task Metadata */}
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

                        {/* Optionality */}
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

                        {/* Notes */}
                        <div>
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Details about the homework..."
                                className="w-full h-24 bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20 transition-all active:scale-95">
                        Save Homework
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default AddHomeworkModal;
