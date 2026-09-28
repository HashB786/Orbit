// Small building blocks for Orbit's hand-drawn SVG illustrations.

import React from 'react';

// Deterministic pseudo-random numbers, so a scene looks the same on every render
export const seeded = (seed) => {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
};

export const Stars = ({ seed = 1, count = 40, width, height, color = '#ffffff', twinkle = 0 }) => {
    const r = seeded(seed);
    return (
        <g aria-hidden="true">
            {Array.from({ length: count }, (_, i) => {
                const x = r() * width;
                const y = r() * height;
                const size = r() < 0.85 ? 0.5 + r() * 0.7 : 1.2 + r() * 0.8;
                const opacity = 0.3 + r() * 0.7;
                const animated = i < twinkle;
                return (
                    <circle
                        key={i}
                        cx={x.toFixed(1)}
                        cy={y.toFixed(1)}
                        r={size.toFixed(2)}
                        fill={color}
                        opacity={opacity.toFixed(2)}
                        className={animated ? 'animate-twinkle' : undefined}
                        style={animated ? { animationDelay: `${(r() * 3).toFixed(2)}s`, transformBox: 'fill-box', transformOrigin: 'center' } : undefined}
                    />
                );
            })}
        </g>
    );
};

// Lumpy asteroid outline around (cx, cy)
export const rockPoints = (cx, cy, radius, seed, corners = 10) => {
    const r = seeded(seed);
    return Array.from({ length: corners }, (_, i) => {
        const a = (i / corners) * Math.PI * 2;
        const rr = radius * (0.82 + r() * 0.22);
        return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
    }).join(' ');
};

export const starPath = (cx, cy, outer, inner = outer * 0.45, points = 5) => {
    const d = [];
    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outer : inner;
        const a = (Math.PI / points) * i - Math.PI / 2;
        d.push(`${i === 0 ? 'M' : 'L'}${(cx + Math.cos(a) * radius).toFixed(2)},${(cy + Math.sin(a) * radius).toFixed(2)}`);
    }
    return `${d.join(' ')}Z`;
};

// Four-point sparkle
export const Sparkle = ({ x, y, size = 6, color = '#ffffff', className, delay = 0 }) => (
    <path
        d={`M${x},${y - size} Q${x},${y} ${x + size},${y} Q${x},${y} ${x},${y + size} Q${x},${y} ${x - size},${y} Q${x},${y} ${x},${y - size}Z`}
        fill={color}
        className={className}
        style={className ? { animationDelay: `${delay}s`, transformBox: 'fill-box', transformOrigin: 'center' } : undefined}
    />
);

// Little rocket pointing up, centred on (0, 0); rotate/translate it with a parent <g>
export const Rocket = ({ flame = true }) => (
    <g>
        {flame && (
            <>
                <path d="M-6,11 Q0,34 6,11 Z" fill="#fb923c" />
                <path d="M-3.5,11 Q0,24 3.5,11 Z" fill="#fde68a" />
            </>
        )}
        <path d="M-9,3 L-17,16 L-9,13 Z" fill="#f43f5e" />
        <path d="M9,3 L17,16 L9,13 Z" fill="#f43f5e" />
        <path d="M0,-27 C9,-19 11,-4 9,12 L-9,12 C-11,-4 -9,-19 0,-27 Z" fill="#eef2ff" />
        <path d="M0,-27 C9,-19 11,-4 9,12 L4,12 C6,-4 5,-18 0,-27 Z" fill="#c7d2fe" />
        <circle cx="0" cy="-8" r="4.2" fill="#38bdf8" stroke="#1e3a8a" strokeWidth="1.6" />
    </g>
);
