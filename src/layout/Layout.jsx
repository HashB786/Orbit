import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { useTheme } from '../context/ThemeContext';

const Layout = () => {
    const location = useLocation();
    const scrollContainerRef = React.useRef(null);
    const { performance } = useTheme();

    React.useEffect(() => {
        scrollContainerRef.current?.scrollTo(0, 0);
    }, [location.pathname]);

    return (
        <div className="flex app-height w-full overflow-hidden bg-gray-50 dark:bg-dark-bg transition-colors duration-500 text-gray-900 dark:text-gray-100 font-sans">
            <Sidebar />

            <main className="flex-1 min-w-0 relative overflow-hidden flex flex-col">
                {/* Soft background glow (large blurs are costly, so desktop only) */}
                {performance.particles && (
                    <div className="hidden md:block absolute inset-0 pointer-events-none z-0">
                        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary-400/20 dark:bg-primary-500/10 rounded-full blur-[120px] animate-pulse-slow" />
                        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 dark:bg-indigo-500/10 rounded-full blur-[100px] animate-float" />
                    </div>
                )}

                <div
                    ref={scrollContainerRef}
                    className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-28 md:p-8"
                >
                    <div className="max-w-6xl mx-auto w-full min-h-full">
                        <Outlet />
                    </div>
                </div>
            </main>
            <MobileNav />
        </div>
    );
};

export default Layout;
