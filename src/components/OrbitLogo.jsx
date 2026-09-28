import React, { useId } from 'react';

// Planet with an orbit ring and a small moon: the Orbit mark. With `animated`, the moon travels the ring.
const OrbitLogo = ({ size = 40, className = '', animated = false }) => {
    const id = `logo${useId().replace(/:/g, '')}`;
    return (
        <svg width={size} height={size} viewBox="0 0 40 40" className={`shrink-0 ${className}`} aria-hidden="true">
            <defs>
                <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" style={{ stopColor: 'rgb(var(--color-primary-400))' }} />
                    <stop offset="1" stopColor="#4c1d95" />
                </linearGradient>
                <radialGradient id={`${id}-planet`} cx="0.35" cy="0.3" r="0.8">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="1" stopColor="#dbeafe" />
                </radialGradient>
            </defs>
            <rect width="40" height="40" rx="12" fill={`url(#${id}-bg)`} />
            <circle cx="11" cy="9" r="0.9" fill="#ffffff" opacity="0.8" />
            <circle cx="31" cy="31" r="0.7" fill="#ffffff" opacity="0.6" />
            <circle cx="20" cy="20" r="6.5" fill={`url(#${id}-planet)`} />
            <g transform="rotate(-24 20 20)">
                <ellipse cx="20" cy="20" rx="14" ry="5.5" fill="none" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.85" />
                <circle r="2.4" fill="#fde68a" cx={animated ? 0 : 34} cy={animated ? 0 : 20}>
                    {animated && <animateMotion dur="9s" repeatCount="indefinite" path="M34,20 A14,5.5 0 1,1 6,20 A14,5.5 0 1,1 34,20" />}
                </circle>
            </g>
        </svg>
    );
};

export default OrbitLogo;
