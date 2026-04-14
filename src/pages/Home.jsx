import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'framer-motion';
import { Clock, CalendarCheck, GraduationCap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrentLesson } from '../hooks/useCurrentLesson';
import { useUser } from '../context/UserContext';

const Home = () => {
    const { t } = useLanguage();
    const { userData } = useUser();
    const [currentTime, setCurrentTime] = useState(new Date());
    const { current, next } = useCurrentLesson();

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const containerVariant = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariant = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={containerVariant}
            initial="hidden"
            animate="visible"
            className="space-y-8"
        >
            {/* Hero Section */}
            <motion.div variants={itemVariant} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 to-teal-500 p-8 shadow-xl text-white">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-2">{t('welcome')}, {userData?.name || 'Scholar'}!</h1>
                        <p className="text-primary-100 text-lg opacity-90">Ready to conquer the day?</p>

                        <div className="mt-8 flex gap-3">
                            <Link to="/timetable" className="bg-white text-primary-600 px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                                {t('timetable')} <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl flex flex-col items-center justify-center min-w-[200px] shadow-inner">
                        <Clock size={40} className="mb-2 opacity-80" />
                        <div className="text-4xl font-mono font-bold tracking-wider">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-sm opacity-75 uppercase tracking-widest mt-1">
                            {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                    </div>
                </div>

                {/* Decorative Circles */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-black/10 rounded-full blur-3xl" />
            </motion.div>

            {/* Quick Actions / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <motion.div variants={itemVariant} className="glass-card p-6 border-l-4 border-l-blue-500 hover:shadow-md cursor-default transition-all duration-300 group">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl shrink-0 group-hover:scale-110 transition-transform duration-300">
                            <CalendarCheck size={28} />
                        </div>
                        <div className="flex-1 min-w-0">
                            {current ? (
                                <>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse">Now</span>
                                        <span className="text-xs text-gray-400 font-medium truncate">{current.timeSlot}</span>
                                    </div>
                                    <h3 className="font-bold text-xl text-gray-800 dark:text-white truncate mb-1">{current.subject}</h3>
                                    <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-gray-300" /> {current.teacher}</span>
                                        <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-gray-300" /> Room {current.room}</span>
                                    </div>
                                </>
                            ) : next ? (
                                <>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">Next</span>
                                        <span className="text-xs text-gray-400 font-medium truncate">{next.timeSlot}</span>
                                    </div>
                                    <h3 className="font-bold text-xl text-gray-800 dark:text-white truncate mb-1">{next.subject}</h3>
                                    <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-gray-300" /> {next.teacher}</span>
                                        <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-gray-300" /> Room {next.room}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="py-2">
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">Free Time</h3>
                                    <p className="text-gray-500 text-sm">No upcoming classes</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariant} className="glass-card p-6 border-l-4 border-l-purple-500 hover:shadow-md cursor-default">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                            <GraduationCap size={28} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white">Active Tasks</h3>
                            <p className="text-gray-500 text-sm">Stay organized</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Home;
