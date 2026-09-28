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
    const { theme, toggleTheme, performance } = useTheme();
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
            animate={{ width: collapsed ? 84 : 264 }}
            className="hidden md:flex h-full bg-white/75 dark:bg-[#070b1f]/80 border-r border-gray-200/80 dark:border-white/[0.06] flex-col z-50 relative shrink-0"
        >
            <button
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="absolute -right-3 top-9 w-6 h-6 bg-white dark:bg-[#111a3d] border border-gray-200 dark:border-white/15 rounded-full flex items-center justify-center shadow-md text-gray-500 hover:text-primary-500 transition-colors z-50"
            >
                <motion.div animate={{ rotate: collapsed ? 0 : 180 }}>
                    <ChevronRight size={14} />
                </motion.div>
            </button>

            {/* Brand */}
            <Link to="/" className={`flex items-center gap-3 overflow-hidden h-24 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
                <OrbitLogo size={42} animated={!performance.reducedMotion} />
                <AnimatePresence>
                    {!collapsed && (
                        <motion.span {...fade} className="font-display font-bold text-2xl text-gray-900 dark:text-white tracking-tight whitespace-nowrap">
                            Orbit
                        </motion.span>
                    )}
                </AnimatePresence>
            </Link>

            {/* Join (for students) */}
            <div className="px-3">
                <Link
                    to="/join"
                    className={`flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-bold shadow-[0_10px_24px_-12px_rgb(var(--color-primary-500))] transition-colors ${collapsed ? 'justify-center h-12' : 'px-4 h-12'}`}
                    title={t('joinGame')}
                >
                    <LogIn size={20} className="shrink-0" />
                    {!collapsed && <span className="whitespace-nowrap">{t('joinGame')}</span>}
                </Link>
            </div>

            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto overflow-x-hidden">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-xl transition-colors group relative ${collapsed ? 'justify-center' : ''} ${isActive
                            ? 'bg-gradient-to-r from-primary-500/15 to-transparent text-primary-700 dark:text-primary-200'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon size={22} className={`shrink-0 ${isActive ? 'drop-shadow-[0_0_8px_rgb(var(--color-primary-400)/0.8)]' : ''}`} />
                                {!collapsed && <span className="font-semibold whitespace-nowrap">{item.label}</span>}
                                {isActive && <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-7 bg-primary-400 rounded-r-full shadow-[0_0_12px_rgb(var(--color-primary-400))]" />}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200/80 dark:border-white/[0.06] space-y-1 overflow-hidden">
                <button
                    onClick={() => toggleTheme(true)}
                    title={theme === 'dark' ? 'Switch to daylight' : 'Switch to space'}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/[0.04] text-gray-500 dark:text-gray-400 transition-colors ${collapsed ? 'justify-center' : ''}`}
                >
                    {theme === 'dark' ? <Moon size={22} className="text-violet-300 shrink-0" /> : <Sun size={22} className="text-amber-500 shrink-0" />}
                    {!collapsed && <span className="text-sm font-semibold whitespace-nowrap">{theme === 'dark' ? 'Space mode' : 'Daylight mode'}</span>}
                </button>

                <NavLink
                    to="/settings"
                    title={t('settings')}
                    className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/[0.04] text-gray-500 dark:text-gray-400 transition-colors ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-primary-500/10 text-primary-600' : ''}`}
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-violet-600 text-white flex items-center justify-center shrink-0">
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
