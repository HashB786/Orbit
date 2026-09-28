// An icon sitting on a small ringed planet: Orbit's "icon style" for headers, cards and empty states.

import React, { useId } from 'react';

const TONES = {
    primary: { from: 'rgb(var(--color-primary-300))', to: 'rgb(var(--color-primary-700))', ring: 'rgb(var(--color-primary-400))' },
    violet: { from: '#c4b5fd', to: '#6d28d9', ring: '#a78bfa' },
    sky: { from: '#7dd3fc', to: '#1d4ed8', ring: '#60a5fa' },
    amber: { from: '#fde68a', to: '#d97706', ring: '#fbbf24' },
    rose: { from: '#fda4af', to: '#be123c', ring: '#fb7185' },
    slate: { from: '#c2c9e4', to: '#363e5e', ring: '#939cc0' }
};

const IconOrb = ({ icon: Icon, size = 48, tone = 'primary', className = '', moon = true }) => {
    const id = `orb${useId().replace(/:/g, '')}`;
    const t = TONES[tone] || TONES.primary;
    return (
        <span className={`relative inline-flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size }} aria-hidden="true">
            <svg viewBox="0 0 48 48" className="absolute inset-0 w-full h-full overflow-visible">
                <defs>
                    <radialGradient id={id} cx="0.32" cy="0.28" r="0.85">
                        <stop offset="0" style={{ stopColor: t.from }} />
                        <stop offset="1" style={{ stopColor: t.to }} />
                    </radialGradient>
                </defs>
                <circle cx="24" cy="24" r="20" fill={`url(#${id})`} />
                <ellipse cx="24" cy="24" rx="28" ry="8" fill="none" style={{ stroke: t.ring }} strokeOpacity="0.55" strokeWidth="1.6" transform="rotate(-24 24 24)" />
                {moon && <circle cx="47.5" cy="14.5" r="2.6" fill="#fde68a" />}
            </svg>
            {Icon && <Icon size={Math.round(size * 0.42)} className="relative text-white drop-shadow-sm" strokeWidth={2.2} />}
        </span>
    );
};

export default IconOrb;
