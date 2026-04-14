import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Onboarding from '../components/onboarding/Onboarding';
import { useTheme } from '../context/ThemeContext';

const Layout = () => {
    const location = useLocation();
    const scrollContainerRef = React.useRef(null);
    const { performance } = useTheme();

    React.useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo(0, 0);
        }
    }, [location.pathname]);

    return (
        <div className="flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-dark-bg transition-colors duration-500 text-gray-900 dark:text-gray-100 font-sans">
            <Sidebar />

            <main className="flex-1 relative overflow-hidden flex flex-col">
                {/* Dynamic Background Blobs */}
                {performance.particles && (
                    <div className="absolute inset-0 pointer-events-none z-0">
                        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary-400/20 dark:bg-primary-500/10 rounded-full blur-[120px] animate-pulse-slow" />
                        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 dark:bg-indigo-500/10 rounded-full blur-[100px] animate-float" />
                    </div>
                )}

                {/* Content Area */}
                {/* Content Area - Fixed Grid Overlay for Transitions */}
                {/* Content Area */}
                <div
                    ref={scrollContainerRef}
                    className="relative z-10 flex-1 overflow-y-auto p-4 md:p-8"
                >
                    <div className="max-w-6xl mx-auto w-full h-full">
                        <Outlet />
                    </div>
                </div>
            </main>
            <Onboarding />
        </div>
    );
};

export default Layout;
