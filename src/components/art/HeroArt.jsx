// Home page hero: a ringed planet (in the accent colour) with orbiting moons and a rocket.
// Motion is plain CSS (compositor-only), and stops with "Reduced motion".

import React, { useId } from 'react';
import { Stars, Sparkle, Rocket } from './shapes';

const primary = (shade) => ({ stopColor: `rgb(var(--color-primary-${shade}))` });

const HeroArt = ({ className = '' }) => {
    const id = `hero${useId().replace(/:/g, '')}`;
    const c = { x: 200, y: 170 };
    // Rotate the moon groups around the planet's centre
    const spin = { transformBox: 'view-box', transformOrigin: `${c.x}px ${c.y}px` };
    return (
        <svg viewBox="0 0 400 340" className={className} aria-hidden="true">
            <defs>
                <radialGradient id={`${id}-planet`} cx="0.32" cy="0.28" r="0.85">
                    <stop offset="0" style={primary(200)} />
                    <stop offset="0.45" style={primary(500)} />
                    <stop offset="1" style={primary(900)} />
                </radialGradient>
                <radialGradient id={`${id}-halo`} cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0.55" style={{ ...primary(400), stopOpacity: 0.35 }} />
                    <stop offset="1" style={{ ...primary(400), stopOpacity: 0 }} />
                </radialGradient>
                <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#c4b5fd" stopOpacity="0.2" />
                    <stop offset="0.5" stopColor="#e0e7ff" stopOpacity="0.95" />
                    <stop offset="1" stopColor="#c4b5fd" stopOpacity="0.2" />
                </linearGradient>
                <clipPath id={`${id}-clip`}>
                    <circle cx={c.x} cy={c.y} r="78" />
                </clipPath>
            </defs>

            <Stars seed={4} count={36} width={400} height={340} twinkle={8} color="#e0e7ff" />

            {/* Orbits */}
            <circle cx={c.x} cy={c.y} r="138" fill="none" stroke="#c7d2fe" strokeOpacity="0.22" strokeWidth="1.2" strokeDasharray="3 7" />
            <circle cx={c.x} cy={c.y} r="108" fill="none" stroke="#c7d2fe" strokeOpacity="0.14" strokeWidth="1" />

            {/* Halo + planet */}
            <circle cx={c.x} cy={c.y} r="112" fill={`url(#${id}-halo)`} />
            <path d="M88,186 A118,30 0 0 1 312,154" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="7" strokeLinecap="round" transform={`rotate(-14 ${c.x} ${c.y})`} opacity="0.55" />
            <circle cx={c.x} cy={c.y} r="78" fill={`url(#${id}-planet)`} />
            <g clipPath={`url(#${id}-clip)`} opacity="0.22" fill="#ffffff">
                <ellipse cx={c.x - 10} cy={c.y - 34} rx="90" ry="7" />
                <ellipse cx={c.x + 20} cy={c.y + 4} rx="90" ry="10" />
                <ellipse cx={c.x - 20} cy={c.y + 44} rx="90" ry="6" />
                <circle cx={c.x + 34} cy={c.y - 12} r="9" opacity="0.8" />
            </g>
            <path d="M312,154 A118,30 0 0 1 88,186" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="7" strokeLinecap="round" transform={`rotate(-14 ${c.x} ${c.y})`} />

            {/* Moons on their orbits */}
            <g className="animate-spin-slow" style={spin}>
                <circle cx={c.x + 138} cy={c.y} r="11" fill="#e0e7ff" />
                <circle cx={c.x + 135} cy={c.y - 3} r="3" fill="#a5b4fc" />
            </g>
            <g className="animate-spin-reverse" style={spin}>
                <circle cx={c.x} cy={c.y - 108} r="6.5" fill="#fbbf24" />
            </g>

            {/* Rocket */}
            <g transform="translate(76 78) rotate(38)">
                <g className="animate-float">
                    <Rocket />
                </g>
            </g>

            <Sparkle x={330} y={60} size={8} color="#fde68a" className="animate-twinkle" />
            <Sparkle x={48} y={250} size={6} color="#c4b5fd" className="animate-twinkle" delay={1.2} />
            <Sparkle x={352} y={280} size={5} color="#a7f3d0" className="animate-twinkle" delay={2.1} />
        </svg>
    );
};

export default HeroArt;
