// Simplified flags for the language picker (drawn in SVG, no image files)

import React, { useId } from 'react';
import { starPath } from './shapes';

const UK = () => (
    <>
        <rect width="60" height="40" fill="#012169" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#ffffff" strokeWidth="8" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#c8102e" strokeWidth="3" />
        <path d="M30,0 V40 M0,20 H60" stroke="#ffffff" strokeWidth="12" />
        <path d="M30,0 V40 M0,20 H60" stroke="#c8102e" strokeWidth="7" />
    </>
);

// Blue / white / green with thin red lines, crescent and 12 stars
const UZ = () => {
    const stars = [
        ...[0, 1, 2].map(i => [30 + i * 6, 5]),
        ...[0, 1, 2, 3].map(i => [24 + i * 6, 10]),
        ...[0, 1, 2, 3, 4].map(i => [18 + i * 6, 15])
    ];
    return (
        <>
            <rect width="60" height="40" fill="#ffffff" />
            <rect width="60" height="13" fill="#0099b5" />
            <rect y="27" width="60" height="13" fill="#1eb53a" />
            <rect y="13" width="60" height="0.9" fill="#ce1126" />
            <rect y="26.1" width="60" height="0.9" fill="#ce1126" />
            <circle cx="9" cy="6.5" r="4.6" fill="#ffffff" />
            <circle cx="10.6" cy="6.5" r="4" fill="#0099b5" />
            {stars.map(([x, y], i) => <path key={i} d={starPath(x, y, 1.5)} fill="#ffffff" />)}
        </>
    );
};

const RU = () => (
    <>
        <rect width="60" height="40" fill="#ffffff" />
        <rect y="13.33" width="60" height="13.34" fill="#0039a6" />
        <rect y="26.67" width="60" height="13.33" fill="#d52b1e" />
    </>
);

const FLAGS = { en: UK, uz: UZ, ru: RU };

const Flag = ({ code, className = '' }) => {
    const id = `flag${useId().replace(/:/g, '')}`;
    const Draw = FLAGS[code];
    if (!Draw) return null;
    return (
        <svg viewBox="0 0 60 40" className={`shrink-0 ${className}`} aria-hidden="true">
            <defs>
                <clipPath id={id}><rect width="60" height="40" rx="6" /></clipPath>
            </defs>
            <g clipPath={`url(#${id})`}><Draw /></g>
            <rect x="0.5" y="0.5" width="59" height="39" rx="5.5" fill="none" stroke="#000000" strokeOpacity="0.15" />
        </svg>
    );
};

export default Flag;
