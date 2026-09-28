import React from 'react';

// Dark full-screen backdrop for playing screens. The starfield is pure CSS (drawn once, no JS).
export const SPACE_BG = {
    backgroundColor: '#050816',
    backgroundImage: [
        'radial-gradient(ellipse at top, rgba(56,189,248,0.10), transparent 55%)',
        'radial-gradient(ellipse at bottom right, rgba(129,140,248,0.12), transparent 50%)',
        'radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.7), transparent)',
        'radial-gradient(1px 1px at 90px 120px, rgba(255,255,255,0.5), transparent)',
        'radial-gradient(1.5px 1.5px at 160px 60px, rgba(255,255,255,0.6), transparent)',
        'radial-gradient(1px 1px at 230px 180px, rgba(165,180,252,0.7), transparent)'
    ].join(','),
    backgroundSize: '100% 100%, 100% 100%, 250px 250px, 250px 250px, 250px 250px, 250px 250px'
};

const SpaceScreen = ({ children, className = '', center = false }) => (
    <div className={`app-height w-full overflow-y-auto overflow-x-hidden text-white ${className}`} style={SPACE_BG}>
        {center ? (
            <div className="min-h-full flex flex-col items-center justify-center px-4 py-10">{children}</div>
        ) : children}
    </div>
);

export default SpaceScreen;
