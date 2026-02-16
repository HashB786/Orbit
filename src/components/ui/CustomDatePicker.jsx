import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, setHours, setMinutes, getHours, getMinutes } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, X } from 'lucide-react';

const CustomDatePicker = ({ value, onChange, label = "Deadline" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
    const [view, setView] = useState('calendar'); // 'calendar' | 'time'
    const containerRef = useRef(null);

    // Update internal state when prop changes
    useEffect(() => {
        if (value) {
            setSelectedDate(new Date(value));
            setCurrentMonth(new Date(value));
        }
    }, [value]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDateSelect = (day) => {
        let newDate = new Date(day);
        // Preserve time if already selected
        if (selectedDate) {
            newDate = setHours(newDate, getHours(selectedDate));
            newDate = setMinutes(newDate, getMinutes(selectedDate));
        } else {
            // Default to 9:00 AM
            newDate = setHours(newDate, 9);
            newDate = setMinutes(newDate, 0);
        }
        setSelectedDate(newDate);
        onChange(newDate.toISOString()); // Or whatever format needed
        setView('time'); // Auto-switch to time
    };

    const handleTimeChange = (type, val) => {
        if (!selectedDate) return;
        let newDate = new Date(selectedDate);
        if (type === 'hour') newDate = setHours(newDate, parseInt(val));
        if (type === 'minute') newDate = setMinutes(newDate, parseInt(val));
        setSelectedDate(newDate);
        onChange(newDate.toISOString());
    };

    const formatTimeDisplay = (date) => {
        if (!date) return "--:-- --";
        return format(date, 'hh:mm aa');
    };

    // Calendar Grid Logic
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const hours = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10...
    const ampm = ['AM', 'PM'];

    return (
        <div className="relative space-y-1.5" ref={containerRef}>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <CalendarIcon size={12} /> {label}
            </label>

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-gray-50 dark:bg-gray-800 border transition-all duration-200 rounded-xl px-4 py-2.5 text-sm flex items-center justify-between cursor-pointer
                    ${isOpen ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}
                `}
            >
                <span className={`font-medium ${selectedDate ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                    {selectedDate ? format(selectedDate, 'MMM d, yyyy • h:mm aa') : 'mm/dd/yyyy --:-- --'}
                </span>
                <CalendarIcon size={16} className="text-gray-400" />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full left-0 mt-2 z-50 w-full sm:w-[320px] bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
                    >
                        {/* Header Tabs */}
                        <div className="flex border-b border-gray-100 dark:border-gray-800">
                            <button
                                onClick={() => setView('calendar')}
                                className={`flex-1 py-3 text-sm font-bold transition-colors ${view === 'calendar' ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                Calendar
                            </button>
                            <button
                                onClick={() => setView('time')}
                                className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${view === 'time' ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <Clock size={14} /> Time
                            </button>
                        </div>

                        {/* Calendar View */}
                        {view === 'calendar' && (
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><ChevronLeft size={20} /></button>
                                    <span className="font-bold text-gray-800 dark:text-white">{format(currentMonth, 'MMMM yyyy')}</span>
                                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><ChevronRight size={20} /></button>
                                </div>

                                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                        <div key={d} className="text-xs font-bold text-gray-400 uppercase">{d}</div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                    {calendarDays.map((day, i) => {
                                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                                        const isCurrentMonth = isSameMonth(day, currentMonth);
                                        const isTodayDate = isToday(day);

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handleDateSelect(day)}
                                                className={`
                                                    h-8 w-8 rounded-full text-sm font-medium transition-all flex items-center justify-center mx-auto
                                                    ${isSelected ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30' : ''}
                                                    ${!isSelected && isCurrentMonth ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800' : ''}
                                                    ${!isSelected && !isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : ''}
                                                    ${!isSelected && isTodayDate ? 'ring-1 ring-primary-500 text-primary-600 font-bold' : ''}
                                                `}
                                            >
                                                {format(day, 'd')}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 flex justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                                    <button onClick={() => { setSelectedDate(null); onChange(''); }} className="text-xs font-bold text-gray-500 hover:text-red-500 transition-colors">Clear</button>
                                    <button onClick={() => handleDateSelect(new Date())} className="text-xs font-bold text-primary-500 hover:text-primary-600 transition-colors">Today</button>
                                </div>
                            </div>
                        )}

                        {/* Time View */}
                        {view === 'time' && (
                            <div className="p-4 flex flex-col items-center justify-center h-full min-h-[250px]">
                                {selectedDate ? (
                                    <>
                                        <div className="text-3xl font-mono font-bold text-gray-800 dark:text-white mb-6 bg-gray-100 dark:bg-gray-800 px-6 py-3 rounded-2xl border border-gray-200 dark:border-gray-700">
                                            {formatTimeDisplay(selectedDate)}
                                        </div>

                                        <div className="flex gap-2 w-full">
                                            {/* Hours */}
                                            <div className="flex-1 space-y-2 h-40 overflow-y-auto custom-scrollbar pr-1">
                                                <div className="text-xs font-bold text-gray-400 text-center uppercase mb-1">Hour</div>
                                                {hours.map(h => {
                                                    const currentH = parseInt(format(selectedDate, 'h'));
                                                    const isSel = currentH === h;
                                                    return (
                                                        <button
                                                            key={h}
                                                            onClick={() => {
                                                                // preserve AM/PM
                                                                const isPM = parseInt(format(selectedDate, 'H')) >= 12;
                                                                let newH = h;
                                                                if (isPM && h !== 12) newH += 12;
                                                                if (!isPM && h === 12) newH = 0;
                                                                handleTimeChange('hour', newH);
                                                            }}
                                                            className={`w-full py-1.5 rounded-lg text-sm font-bold ${isSel ? 'bg-primary-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                                                        >
                                                            {h}
                                                        </button>
                                                    )
                                                })}
                                            </div>

                                            {/* Minutes */}
                                            <div className="flex-1 space-y-2 h-40 overflow-y-auto custom-scrollbar px-1">
                                                <div className="text-xs font-bold text-gray-400 text-center uppercase mb-1">Min</div>
                                                {minutes.map(m => {
                                                    const currentM = getMinutes(selectedDate);
                                                    const isSel = currentM === m;
                                                    return (
                                                        <button
                                                            key={m}
                                                            onClick={() => handleTimeChange('minute', m)}
                                                            className={`w-full py-1.5 rounded-lg text-sm font-bold ${isSel ? 'bg-primary-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                                                        >
                                                            {m.toString().padStart(2, '0')}
                                                        </button>
                                                    )
                                                })}
                                            </div>

                                            {/* AM/PM */}
                                            <div className="flex-1 space-y-2 h-40 flex flex-col">
                                                <div className="text-xs font-bold text-gray-400 text-center uppercase mb-1">Period</div>
                                                {ampm.map(p => {
                                                    const currentP = format(selectedDate, 'aa');
                                                    const isSel = currentP === p;
                                                    return (
                                                        <button
                                                            key={p}
                                                            onClick={() => {
                                                                let h = getHours(selectedDate);
                                                                if (p === 'AM' && h >= 12) h -= 12;
                                                                if (p === 'PM' && h < 12) h += 12;
                                                                handleTimeChange('hour', h);
                                                            }}
                                                            className={`w-full py-3 rounded-lg text-sm font-bold flex-1 ${isSel ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                                        >
                                                            {p}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center text-gray-400">
                                        <Clock size={40} className="mx-auto mb-3 opacity-50" />
                                        <p className="text-sm font-medium">Select a date first</p>
                                        <button onClick={() => setView('calendar')} className="mt-4 px-4 py-2 bg-primary-100 text-primary-600 rounded-lg text-xs font-bold hover:bg-primary-200 transition-colors">Go to Calendar</button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="p-3 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                            <button onClick={() => setIsOpen(false)} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-primary-600/20 hover:scale-105 transition-transform">Done</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CustomDatePicker;
