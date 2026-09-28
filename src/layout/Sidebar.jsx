import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Compass, PenSquare, Gamepad2, ChevronRight, Moon, Sun, LogIn } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import OrbitLogo from '../components/OrbitLogo';

const Sidebar = () => {
    // Tablets start collapsed so the content keeps enough room
    const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1024);
    const { t } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const { userData } = useUser();

    const navItems = [
        { path: '/', icon: Home, label: t('home'), end: true },
        { path: '/discover', icon: Compass, label: t('discover') },
        { path: '/create', icon: PenSquare, label: t('create') },
        { path: '/games', icon: Gamepad2, label: t('games') }
    ];

    const fade = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 }
    };

    return (
        <motion.aside
            initial={false}
            animate={{ width: collapsed ? 80 : 264 }}
            className="hidden md:flex h-full bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 flex-col z-50 relative shrink-0"
        >
            <button
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="absolute -right-3 top-9 w-6 h-6 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-md text-gray-500 hover:text-primary-600 transition-colors z-50"
            >
                <motion.div animate={{ rotate: collapsed ? 0 : 180 }}>
                    <ChevronRight size={14} />
                </motion.div>
            </button>

            {/* Brand */}
            <Link to="/" className="p-5 flex items-center gap-3 overflow-hidden h-24">
                <OrbitLogo size={40} />
                <AnimatePresence>
                    {!collapsed && (
                        <motion.span {...fade} className="font-extrabold text-2xl text-gray-800 dark:text-white tracking-tight whitespace-nowrap">
                            Orbit
                        </motion.span>
                    )}
                </AnimatePresence>
            </Link>

            {/* Join (for students) */}
            <div className="px-3">
                <Link
                    to="/join"
                    className={`flex items-center gap-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold transition-colors ${collapsed ? 'justify-center h-11' : 'px-3 h-11'}`}
                    title={t('joinGame')}
                >
                    <LogIn size={20} className="shrink-0" />
                    {!collapsed && <span className="whitespace-nowrap">{t('joinGame')}</span>}
                </Link>
            </div>

            <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto overflow-x-hidden">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-xl transition-colors group relative ${collapsed ? 'justify-center' : ''} ${isActive
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'}`}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon size={22} className="shrink-0" />
                                {!collapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                                {isActive && <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-8 bg-primary-500 rounded-r-full" />}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-1 overflow-hidden">
                <button
                    onClick={() => toggleTheme(true)}
                    title={t('theme')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-500 dark:text-gray-400 transition-colors ${collapsed ? 'justify-center' : ''}`}
                >
                    {theme === 'dark' ? <Moon size={22} className="text-purple-400 shrink-0" /> : <Sun size={22} className="text-amber-500 shrink-0" />}
                    {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>}
                </button>

                <NavLink
                    to="/settings"
                    title={t('settings')}
                    className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-500 dark:text-gray-400 transition-colors ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-primary-50 dark:bg-primary-900/10 text-primary-600' : ''}`}
                >
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 flex items-center justify-center shrink-0">
                        <span className="font-bold text-xs">{userData?.name?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col items-start overflow-hidden whitespace-nowrap min-w-0">
                            <span className="text-sm font-bold truncate w-full text-left text-gray-700 dark:text-gray-200">{userData?.name || 'Set your name'}</span>
                            <span className="text-[11px] text-gray-400 truncate w-full text-left">{t('settings')}</span>
                        </div>
                    )}
                </NavLink>
            </div>
        </motion.aside>
    );
};

export default Sidebar;
