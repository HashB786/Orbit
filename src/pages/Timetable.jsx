import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, CheckCircle2, ChevronDown, Plus, BookOpen, AlertCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useTask } from '../context/TaskContext';
import timetableData from '../data/timetable.json';

const parseTime = (timeStr) => {
    if (!timeStr) return { start: 0, end: 0 };
    const [start, end] = timeStr.split(' - ');
    const toMinutes = (t) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };
    return { start: toMinutes(start), end: toMinutes(end) };
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const Timetable = () => {
    const { t } = useLanguage();
    const { userData } = useUser();
    const { todos, addTask } = useTask();

    // View State
    const [viewGrade, setViewGrade] = useState(() => sessionStorage.getItem('viewGrade') || userData?.grade || '8');
    const [viewColor, setViewColor] = useState(() => sessionStorage.getItem('viewColor') || userData?.classColor || 'green');

    const [now, setNow] = useState(new Date());
    const [isGradeOpen, setIsGradeOpen] = useState(false);

    // Quick Add Task State
    const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
    const [selectedLesson, setSelectedLesson] = useState(null); // { subject: 'Math', ... }
    const [quickTaskText, setQuickTaskText] = useState('');

    // Update session storage
    useEffect(() => {
        sessionStorage.setItem('viewGrade', viewGrade);
    }, [viewGrade]);

    useEffect(() => {
        sessionStorage.setItem('viewColor', viewColor);
    }, [viewColor]);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isGradeOpen && !event.target.closest('.grade-dropdown-container')) {
                setIsGradeOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isGradeOpen]);

    const handleQuickAdd = (e) => {
        e.preventDefault();
        if (!quickTaskText.trim()) return;

        addTask({
            text: quickTaskText,
            subject: selectedLesson.subject,
            category: 'school',
            priority: 'medium',
            dueDate: '', // Could default to next lesson date if we wanted to be fancy
            notes: `Added from Timetable (${selectedLesson.day})`
        });

        setQuickTaskText('');
        setIsAddTaskOpen(false);
    };

    const openQuickAdd = (lesson, day) => {
        setSelectedLesson({ ...lesson, day });
        setIsAddTaskOpen(true);
    };

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentDayIndex = now.getDay();
    const currentDayName = DAYS[currentDayIndex];

    const gradeData = timetableData.grades[viewGrade];
    const classInfo = (gradeData && gradeData[viewColor]) ? gradeData[viewColor] : timetableData.grades['8']['green'];

    // Schedule Logic
    let displayDayName = currentDayName;
    let schedule = classInfo.schedule[displayDayName] || [];
    let currentLesson = null;
    let nextLesson = null;

    const findLesson = (daySchedule) => {
        let current = null;
        let next = null;
        daySchedule.forEach(lesson => {
            const timeSlot = timetableData.time_slots[String(lesson.period)];
            if (!timeSlot) return;
            const { start, end } = parseTime(timeSlot);
            if (currentMinutes >= start && currentMinutes <= end) {
                current = { ...lesson, timeSlot };
            } else if (currentMinutes < start && !next) {
                next = { ...lesson, timeSlot };
            }
        });
        return { current, next };
    };

    let { current, next } = findLesson(schedule);
    currentLesson = current;
    nextLesson = next;

    let isNextDay = false;
    if (!currentLesson && !nextLesson) {
        for (let i = 1; i <= 7; i++) {
            const nextDayIndex = (currentDayIndex + i) % 7;
            const nextDayName = DAYS[nextDayIndex];
            const nextDaySchedule = classInfo.schedule[nextDayName];
            if (nextDaySchedule && nextDaySchedule.length > 0) {
                const firstLesson = nextDaySchedule[0];
                const timeSlot = timetableData.time_slots[String(firstLesson.period)];
                nextLesson = { ...firstLesson, timeSlot, isNextDay: true, day: nextDayName };
                isNextDay = true;
                break;
            }
        }
    }

    const gradesList = Object.keys(timetableData.grades).sort((a, b) => Number(a) - Number(b));
    const isDifferentView = (viewGrade !== userData.grade) || (viewColor !== userData.classColor);

    // Helpers for task counting
    const getTaskCount = (subject) => todos.filter(t => t.subject === subject && !t.completed).length;

    return (
        <div className="space-y-6 pb-20 relative">
            {/* Quick Add Modal */}
            <AnimatePresence>
                {isAddTaskOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-xl w-full max-w-sm"
                        >
                            <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                                <BookOpen size={20} className="text-primary-500" />
                                {selectedLesson?.subject} Homework
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">Add a task for {selectedLesson?.day}</p>

                            <form onSubmit={handleQuickAdd}>
                                <input
                                    autoFocus
                                    value={quickTaskText}
                                    onChange={e => setQuickTaskText(e.target.value)}
                                    placeholder="What needs to be done?"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddTaskOpen(false)}
                                        className="px-4 py-2 text-gray-500 font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-primary-500 text-white rounded-xl font-bold hover:scale-105 transition-transform"
                                    >
                                        Add Task
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Warning Banner */}
            <AnimatePresence>
                {isDifferentView && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 flex items-center gap-3 text-amber-800 dark:text-amber-200 text-sm font-medium"
                    >
                        <AlertCircle size={16} />
                        Viewing {viewGrade}-{viewColor}, but your default is {userData.grade}-{userData.classColor}.
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-teal-500">
                        {t('timetable')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                        {classInfo.class_teacher}
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                        Room {classInfo.room}
                    </p>
                </div>

                {/* 2-Step Selector */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Grade Dropdown */}
                    <div className="relative z-20 grade-dropdown-container">
                        <button
                            onClick={() => setIsGradeOpen(!isGradeOpen)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all text-gray-700 dark:text-gray-200 font-medium min-w-[120px] justify-between"
                        >
                            <span>Grade {viewGrade}</span>
                            <ChevronDown size={16} className={`transition-transform ${isGradeOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isGradeOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto p-1.5"
                                >
                                    {gradesList.map(g => (
                                        <button
                                            key={g}
                                            onClick={() => { setViewGrade(g); setIsGradeOpen(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${viewGrade === g ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                                        >
                                            Grade {g}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Color Switcher */}
                    <div className="flex bg-gray-100 dark:bg-dark-surface p-1 rounded-xl">
                        {['green', 'blue'].map(c => (
                            <button
                                key={c}
                                onClick={() => setViewColor(c)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all duration-300 ${viewColor === c
                                    ? (c === 'green' ? 'bg-emerald-500 text-white shadow-md' : 'bg-blue-500 text-white shadow-md')
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Live Status Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative overflow-hidden rounded-2xl p-6 shadow-lg border ${currentLesson ? 'bg-gradient-to-br from-primary-600 to-primary-800 text-white border-transparent' : 'glass-card'}`}
            >
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${currentLesson ? 'bg-white/20 text-white animate-pulse' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                            {currentLesson ? t('now') : nextLesson ? (nextLesson.isNextDay ? `Next: ${nextLesson.day}` : t('upcoming')) : 'Status'}
                        </span>
                        <span className="text-sm opacity-70 font-medium">{currentLesson ? currentDayName : (nextLesson?.isNextDay ? nextLesson.day : currentDayName)}</span>
                    </div>

                    {currentLesson ? (
                        <div>
                            <div className="flex justify-between items-start">
                                <h2 className="text-3xl font-bold mb-2">{currentLesson.subject}</h2>
                                {getTaskCount(currentLesson.subject) > 0 && (
                                    <span className="bg-white/20 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                        <AlertCircle size={12} /> {getTaskCount(currentLesson.subject)} Tasks
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-4 opacity-90 text-sm md:text-base">
                                <div className="flex items-center gap-1.5"><Clock size={16} /> {currentLesson.timeSlot}</div>
                                <div className="flex items-center gap-1.5"><MapPin size={16} /> {currentLesson.room}</div>
                            </div>
                        </div>
                    ) : nextLesson ? (
                        <div>
                            <h2 className="text-2xl font-bold mb-1 text-gray-800 dark:text-white">{nextLesson.subject}</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                                {nextLesson.isNextDay ? `First lesson on ${nextLesson.day}` : `Starting soon at ${nextLesson.timeSlot?.split(' - ')[0]}`}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-900/50 w-fit px-2 py-1 rounded-md">
                                <MapPin size={12} /> {nextLesson.room}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-gray-400">
                            <CheckCircle2 size={40} className="mx-auto mb-2 opacity-50" />
                            <p>{t('noClasses')}</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Weekly Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, idx) => {
                    const isToday = day === currentDayName;
                    const schedule = classInfo.schedule[day] || [];

                    if (schedule.length === 0) return null;

                    return (
                        <motion.div
                            key={day}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`rounded-2xl p-5 border transition-all hover:shadow-md ${isToday ? 'bg-primary-50/50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-800' : 'glass-card'}`}
                        >
                            <h3 className={`font-bold mb-4 flex items-center justify-between ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                {day}
                                {isToday && <span className="text-[10px] bg-primary-100 dark:bg-primary-900 text-primary-600 px-2 py-0.5 rounded-full uppercase tracking-wider">Today</span>}
                            </h3>

                            <div className="space-y-3">
                                {schedule.map((lesson, i) => {
                                    const timeSlot = timetableData.time_slots[String(lesson.period)];
                                    const taskCount = getTaskCount(lesson.subject);

                                    return (
                                        <div key={i} className="flex gap-3 items-start group relative">
                                            <div className="w-12 text-xs text-gray-400 font-mono pt-1 text-right shrink-0">
                                                {timeSlot?.split(' - ')[0]}
                                            </div>
                                            <div className="flex-1 pb-3 border-b border-dashed border-gray-100 dark:border-gray-800 last:border-0 pr-8">
                                                <div className="font-bold text-gray-800 dark:text-gray-200 text-sm group-hover:text-primary-500 transition-colors flex items-center gap-2">
                                                    {lesson.subject}
                                                    {taskCount > 0 && (
                                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded-full flex items-center gap-0.5">
                                                            <AlertCircle size={8} /> {taskCount}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                                                    <span>{lesson.teacher}</span>
                                                    <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">{lesson.room}</span>
                                                </div>
                                            </div>

                                            {/* Quick Add Button on Hover */}
                                            <button
                                                onClick={() => openQuickAdd(lesson, day)}
                                                className="absolute right-0 top-1 p-1.5 text-gray-300 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                title="Add Homework"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default Timetable;
