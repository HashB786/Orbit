import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Compass, PenSquare, Gamepad2, ChevronRight, Moon, Sun, LogIn, UserRound } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import OrbitLogo from '../components/OrbitLogo';

const Sidebar = () => {
    // Tablets start collapsed so the content keeps enough room
    const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1024);
    const { t } = useLanguage();
    const { theme, toggleTheme, performance } = useTheme();
    const { userData } = useUser();
    const auth = useAuth();
    const account = auth.user;

    const navItems = [
        { path: '/', icon: Home, label: t('nav.home'), end: true },
        { path: '/discover', icon: Compass, label: t('nav.discover') },
        { path: '/create', icon: PenSquare, label: t('nav.create') },
        { path: '/games', icon: Gamepad2, label: t('nav.games') }
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
                aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
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
                    title={t('nav.joinGame')}
                >
                    <LogIn size={20} className="shrink-0" />
                    {!collapsed && <span className="whitespace-nowrap">{t('nav.joinGame')}</span>}
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
                    title={theme === 'dark' ? t('nav.toDaylight') : t('nav.toSpace')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/[0.04] text-gray-500 dark:text-gray-400 transition-colors ${collapsed ? 'justify-center' : ''}`}
                >
                    {theme === 'dark' ? <Moon size={22} className="text-violet-300 shrink-0" /> : <Sun size={22} className="text-amber-500 shrink-0" />}
                    {!collapsed && <span className="text-sm font-semibold whitespace-nowrap">{theme === 'dark' ? t('nav.spaceMode') : t('nav.daylightMode')}</span>}
                </button>

                {account ? (
                    <NavLink
                        to="/settings"
                        title={t('nav.settings')}
                        className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/[0.04] text-gray-500 dark:text-gray-400 transition-colors ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-primary-500/10 text-primary-600' : ''}`}
                    >
                        {account.photoURL
                            ? <img src={account.photoURL} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full shrink-0 ring-2 ring-primary-400/40" />
                            : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-violet-600 text-white flex items-center justify-center shrink-0">
                                    <span className="font-bold text-xs">{(userData?.name || account.email)?.[0]?.toUpperCase() || '?'}</span>
                                </div>
                            )}
                        {!collapsed && (
                            <div className="flex flex-col items-start overflow-hidden whitespace-nowrap min-w-0">
                                <span className="text-sm font-bold truncate w-full text-left text-gray-700 dark:text-gray-200">{userData?.name || account.email}</span>
                                <span className="text-[11px] text-gray-400 truncate w-full text-left">{account.email}</span>
                            </div>
                        )}
                    </NavLink>
                ) : (
                    <>
                        <Link
                            to="/signin"
                            title={t('auth.signInButton')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-primary-400/40 text-primary-700 dark:text-primary-200 hover:bg-primary-500/10 font-semibold transition-colors ${collapsed ? 'justify-center' : ''}`}
                        >
                            <UserRound size={20} className="shrink-0" />
                            {!collapsed && <span className="text-sm whitespace-nowrap">{t('auth.signInButton')}</span>}
                        </Link>
                        <NavLink
                            to="/settings"
                            title={t('nav.settings')}
                            className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/[0.04] text-gray-500 dark:text-gray-400 transition-colors ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-primary-500/10 text-primary-600' : ''}`}
                        >
                            <span className="w-8 h-8 shrink-0 flex items-center justify-center text-xs font-bold rounded-full bg-gray-200/70 dark:bg-white/10">{userData?.name?.[0]?.toUpperCase() || '?'}</span>
                            {!collapsed && <span className="text-sm font-semibold whitespace-nowrap">{t('nav.settings')}</span>}
                        </NavLink>
                    </>
                )}
            </div>
        </motion.aside>
    );
};

export default Sidebar;
