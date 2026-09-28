import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, PenSquare, Gamepad2, Settings } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Bottom tab bar for phones; the Sidebar takes over from the md breakpoint
const MobileNav = () => {
    const { t } = useLanguage();

    const navItems = [
        { path: '/', icon: Home, label: t('home') },
        { path: '/discover', icon: Compass, label: t('discover') },
        { path: '/create', icon: PenSquare, label: t('create') },
        { path: '/games', icon: Gamepad2, label: t('games') },
        { path: '/settings', icon: Settings, label: t('settings') },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 dark:bg-[#070b1f]/95 border-t border-gray-200/80 dark:border-white/[0.07] pb-safe">
            <div className="grid grid-cols-5 h-16">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center gap-1 min-w-0 px-1 transition-colors ${isActive
                                ? 'text-primary-600 dark:text-primary-300'
                                : 'text-gray-400 dark:text-gray-500 active:text-gray-700'}`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${isActive ? 'bg-primary-500/15 shadow-[0_0_14px_-2px_rgb(var(--color-primary-400)/0.6)]' : ''}`}>
                                    <item.icon size={20} />
                                </span>
                                <span className="text-[10px] font-semibold leading-none truncate max-w-full">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default MobileNav;
