import React from 'react';

// Planet with an orbit ring and a small moon: the Orbit mark
const OrbitLogo = ({ size = 40, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" className={`shrink-0 ${className}`} aria-hidden="true">
        <defs>
            <linearGradient id="orbit-logo-bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="rgb(var(--color-primary-400))" />
                <stop offset="1" stopColor="rgb(var(--color-primary-700))" />
            </linearGradient>
        </defs>
        <rect width="40" height="40" rx="12" fill="url(#orbit-logo-bg)" />
        <circle cx="20" cy="20" r="6.5" fill="#ffffff" />
        <ellipse cx="20" cy="20" rx="14" ry="5.5" fill="none" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.85" transform="rotate(-24 20 20)" />
        <circle cx="31.5" cy="14.8" r="2.4" fill="#fde68a" />
    </svg>
);

export default OrbitLogo;
