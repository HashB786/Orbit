import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

const TodoCalendar = ({ todos }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const onNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const onPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Get tasks for a specific day
    const getTasksForDay = (day) => {
        return todos.filter(todo => {
            if (!todo.dueDate) return false;
            return isSameDay(new Date(todo.dueDate), day);
        });
    };

    const selectedDayTasks = getTasksForDay(selectedDate);

    return (
        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                <span className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <CalendarIcon className="text-primary-500" size={20} />
                    {format(currentMonth, 'MMMM yyyy')}
                </span>
                <div className="flex gap-2">
                    <button onClick={onPrevMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={onNextMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row">
                {/* Calendar Grid */}
                <div className="p-4 flex-1">
                    {/* Days Header */}
                    <div className="grid grid-cols-7 mb-2">
                        {weekDays.map(day => (
                            <div key={day} className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day, i) => {
                            const dayTasks = getTasksForDay(day);
                            const isSelected = isSameDay(day, selectedDate);
                            const isCurrentMonth = isSameMonth(day, monthStart);

                            return (
                                <motion.div
                                    key={day.toString()}
                                    whileHover={{ scale: 0.98 }}
                                    onClick={() => setSelectedDate(day)}
                                    className={`
                                        aspect-square rounded-xl p-1 cursor-pointer transition-colors relative flex flex-col items-center justify-start pt-2
                                        ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-700 bg-gray-50/50 dark:bg-gray-800/30' : ''}
                                        ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500 ring-inset' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
                                        ${isToday(day) && !isSelected ? 'text-primary-600 font-bold bg-primary-50/50' : ''}
                                    `}
                                >
                                    <span className={`text-sm ${isSelected ? 'font-bold text-primary-600 dark:text-primary-400' : ''}`}>
                                        {format(day, dateFormat)}
                                    </span>

                                    {/* Task Indicators */}
                                    <div className="flex gap-1 mt-1 flex-wrap justify-center content-start px-1 w-full">
                                        {dayTasks.slice(0, 4).map((t, idx) => (
                                            <div
                                                key={idx}
                                                className={`w-1.5 h-1.5 rounded-full ${t.completed ? 'bg-gray-300' : (t.priority === 'high' ? 'bg-red-500' : 'bg-primary-500')}`}
                                            />
                                        ))}
                                        {dayTasks.length > 4 && (
                                            <span className="text-[8px] text-gray-400 leading-none">+</span>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Day Details (Sidebar on Desktop, Bottom on Mobile) */}
                <div className="w-full md:w-72 bg-gray-50/50 dark:bg-gray-900/50 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 p-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                        {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMM d')}
                    </h3>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {selectedDayTasks.length > 0 ? (
                            selectedDayTasks.map(task => (
                                <div key={task.id} className="p-3 bg-white dark:bg-dark-surface rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm text-sm">
                                    <div className="flex items-start gap-2">
                                        <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-500' : 'bg-primary-500'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                                {task.text}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {format(new Date(task.dueDate), 'HH:mm:ss')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-400 italic text-center py-4">No deadlines due</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TodoCalendar;
