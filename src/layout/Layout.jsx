import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

// Fixed positions so the sky looks the same on every visit
const TWINKLES = [
    [8, 14, 0], [22, 62, 1.1], [35, 28, 2.3], [48, 82, 0.6], [57, 12, 1.8], [66, 45, 2.9],
    [74, 74, 0.3], [83, 22, 1.4], [91, 58, 2.5], [14, 88, 3.1], [41, 52, 1.9], [96, 90, 0.9]
];

const Layout = () => {
    const location = useLocation();
    const scrollContainerRef = React.useRef(null);

    React.useEffect(() => {
        scrollContainerRef.current?.scrollTo(0, 0);
    }, [location.pathname]);

    return (
        <div className="orbit-sky flex app-height w-full overflow-hidden text-gray-900 dark:text-gray-100 font-sans">
            <Sidebar />

            <main className="flex-1 min-w-0 relative overflow-hidden flex flex-col">
                {/* The sky itself is static gradients; only these tiny dots animate (opacity only) */}
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
                    {TWINKLES.map(([x, y, delay], i) => (
                        <span key={i} className={`sky-star ${i > 5 ? 'hidden md:block' : ''}`} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s` }} />
                    ))}
                    <span className="shooting-star hidden md:block" />
                </div>

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
