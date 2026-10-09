import React from 'react';

// The four ship designs as SVG (same shapes as the sector canvas), pointing right
const HULLS = [
    'M23,0 L-16,-14.4 L-9,0 L-16,14.4 Z',
    'M21,0 L3,-6 L-7,-20 L-14,-19 L-10,-5 L-17,0 L-10,5 L-14,19 L-7,20 L3,6 Z',
    'M20,0 A20,16.4 0 1,1 -20,0 A20,16.4 0 1,1 20,0 Z',
    'M20,-5.6 L20,5.6 L4,8.4 L1,19 L-18,19 L-18,-19 L1,-19 L4,-8.4 Z'
];
export const SHIP_NAMES = ['dart', 'falcon', 'saucer', 'hammer'];

const ShipIcon = ({ design = 0, color = '#60a5fa', size = 40, angle = -90, className = '' }) => {
    const d = HULLS[design % HULLS.length];
    const id = `ship-${design}-${String(color).replace('#', '')}`;
    return (
        <svg width={size} height={size} viewBox="-26 -26 52 52" className={className} aria-hidden="true">
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="0.35" stopColor={color} />
                    <stop offset="1" stopColor="#0f172a" />
                </linearGradient>
            </defs>
            <g transform={`rotate(${angle})`}>
                <path d={d} fill={`url(#${id})`} stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinejoin="round" />
                <ellipse cx={design === 2 ? 0 : 4} cy="0" rx="4.8" ry="3.4" fill="rgba(186,230,253,0.95)" />
            </g>
        </svg>
    );
};

export default ShipIcon;
