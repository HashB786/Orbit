import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import {
    LayoutDashboard,
    CalendarClock,
    CheckSquare,
    Settings,
    ChevronRight,
    Moon,
    Sun,
    Globe,
    GraduationCap,
    Palette,
    Gamepad2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(false);
    const { t, lang, setLang } = useLanguage();
    const { theme, toggleTheme, colorTheme, toggleColorTheme } = useTheme();

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: t('home') },
        { path: '/timetable', icon: CalendarClock, label: t('timetable') },
        { path: '/todo', icon: CheckSquare, label: t('todo') },
        { path: '/games', icon: Gamepad2, label: t('games') || 'Games' },
    ];

    const { userData } = useUser();

    return (
        <motion.aside
            initial={false}
            animate={{ width: collapsed ? 80 : 280 }}
            className="h-full bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 flex flex-col z-50 transition-all duration-300 relative shrink-0"
        >
            {/* Toggle Button */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-9 w-6 h-6 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-md text-gray-500 hover:text-primary-600 hover:border-primary-300 transition-all z-50 hover:scale-110"
            >
                <motion.div animate={{ rotate: collapsed ? 0 : 180 }}>
                    <ChevronRight size={14} />
                </motion.div>
            </button>

            {/* Brand */}
            <div className="p-6 flex items-center gap-4 overflow-hidden h-24">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/30">
                    <GraduationCap className="text-white" size={24} />
                </div>
                <AnimatePresence>
                    {!collapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="whitespace-nowrap"
                        >
                            <h1 className="font-bold text-2xl text-gray-800 dark:text-white tracking-tight">Orbit</h1>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative
                        ${isActive
                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
                            }
                    `}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon size={22} className="shrink-0 transition-transform group-hover:scale-110" />

                                <AnimatePresence>
                                    {!collapsed && (
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="font-medium whitespace-nowrap"
                                        >
                                            {item.label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>

                                {/* Active Glow */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNav"
                                        className="absolute left-0 w-1 h-8 bg-primary-500 rounded-r-full"
                                    />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-1 overflow-hidden">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-500 dark:text-gray-400 transition-colors relative overflow-hidden ${collapsed ? 'justify-center' : ''}`}
                >
                    {theme === 'dark' ? <Moon size={22} className="text-purple-400 shrink-0" /> : <Sun size={22} className="text-amber-500 shrink-0" />}

                    <AnimatePresence>
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="text-sm font-medium whitespace-nowrap"
                            >
                                {t('theme')}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>

                {/* Profile Link (Settings) */}
                <NavLink
                    to="/settings"
                    className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-500 dark:text-gray-400 transition-colors relative overflow-hidden ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-primary-50 dark:bg-primary-900/10 text-primary-600' : ''}`}
                >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center shrink-0">
                        <span className="font-bold text-xs">{userData?.name?.[0]?.toUpperCase() || 'U'}</span>
                    </div>

                    <AnimatePresence>
                        {!collapsed && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col items-start overflow-hidden whitespace-nowrap"
                            >
                                <span className="text-sm font-bold truncate w-full text-left">{userData?.name || 'User'}</span>
                                <span className="text-[10px] text-gray-400 truncate w-full text-left">View Profile</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </NavLink>
            </div>
        </motion.aside>
    );
};

export default Sidebar;
