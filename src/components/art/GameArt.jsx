// Cover illustrations for each game (Games page, Home, host setup). Pure SVG: a few KB, sharp on any screen.

import React, { useId } from 'react';
import { Stars, rockPoints, starPath, Sparkle } from './shapes';
import { useT } from '../../context/LanguageContext';

const W = 320;
const H = 180;

const Asteroid = ({ x, y, r, seed, label, glow }) => (
    <g>
        {glow && <circle cx={x} cy={y} r={r + 7} fill="none" stroke="#34d399" strokeOpacity="0.45" strokeWidth="4" />}
        <polygon points={rockPoints(x, y, r, seed)} fill={glow ? '#064e3b' : '#1e2a52'} stroke={glow ? '#34d399' : '#6b7bb0'} strokeWidth="1.6" />
        <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, sans-serif" fontWeight="800" fontSize={r > 18 ? 10 : 8.5} fill="#f8fafc">
            {label}
        </text>
    </g>
);

const CometClashArt = ({ id }) => {
    const t = useT();
    // Ship at the centre, aiming at the correct asteroid (top right)
    const ship = { x: 150, y: 104 };
    const target = { x: 244, y: 70 };
    const angle = (Math.atan2(target.y - ship.y, target.x - ship.x) * 180) / Math.PI;
    return (
        <>
            <defs>
                <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#0c1a4a" />
                    <stop offset="1" stopColor="#050816" />
                </linearGradient>
                <radialGradient id={`${id}-glow`} cx="0.8" cy="0.15" r="0.6">
                    <stop offset="0" stopColor="#2dd4bf" stopOpacity="0.35" />
                    <stop offset="1" stopColor="#2dd4bf" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={`${id}-planet`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#34d399" />
                    <stop offset="1" stopColor="#0ea5e9" />
                </linearGradient>
                <linearGradient id={`${id}-tail`} x1="1" y1="1" x2="0" y2="0">
                    <stop offset="0" stopColor="#e0f2fe" stopOpacity="0.9" />
                    <stop offset="1" stopColor="#e0f2fe" stopOpacity="0" />
                </linearGradient>
                <linearGradient id={`${id}-laser`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#6ee7b7" stopOpacity="0.2" />
                    <stop offset="1" stopColor="#6ee7b7" />
                </linearGradient>
            </defs>
            <rect width={W} height={H} fill={`url(#${id}-bg)`} />
            <rect width={W} height={H} fill={`url(#${id}-glow)`} />
            <Stars seed={7} count={55} width={W} height={H} />

            {/* Planet peeking in */}
            <circle cx="300" cy="196" r="62" fill={`url(#${id}-planet)`} opacity="0.9" />
            <ellipse cx="300" cy="196" rx="92" ry="16" fill="none" stroke="#a7f3d0" strokeOpacity="0.5" strokeWidth="2" transform="rotate(-18 300 196)" />

            {/* Comet */}
            <path d="M18,14 L66,44 L60,48 Z" fill={`url(#${id}-tail)`} />
            <circle cx="64" cy="46" r="4" fill="#ffffff" />

            <Asteroid x={70} y={128} r={19} seed={3} label={t('art.venus')} />
            <Asteroid x={112} y={42} r={16} seed={11} label={t('art.earth')} />
            <Asteroid x={212} y={146} r={17} seed={5} label={t('art.moon')} />

            {/* Laser + correct asteroid breaking apart */}
            <line x1={ship.x + 12} y1={ship.y - 5} x2={target.x - 18} y2={target.y + 6} stroke={`url(#${id}-laser)`} strokeWidth="3" strokeLinecap="round" />
            <Asteroid x={target.x} y={target.y} r={22} seed={9} label={t('art.mars')} glow />
            {[[-30, -8], [-26, 14], [28, -20], [30, 10], [8, -32], [-6, 30]].map(([dx, dy], i) => (
                <rect key={i} x={target.x + dx} y={target.y + dy} width="3" height="3" fill="#6ee7b7" opacity={0.9 - i * 0.1} />
            ))}
            <Sparkle x={target.x + 26} y={target.y - 30} size={5} color="#a7f3d0" />

            {/* Ship */}
            <circle cx={ship.x} cy={ship.y} r="20" fill="none" stroke="#94a3b8" strokeOpacity="0.3" strokeWidth="1.5" />
            <g transform={`translate(${ship.x} ${ship.y}) rotate(${angle.toFixed(1)})`}>
                <path d="M16,0 L-11,10 L-6,0 L-11,-10 Z" fill="#34d399" stroke="#f8fafc" strokeWidth="1.8" strokeLinejoin="round" />
            </g>
        </>
    );
};

const TILE = { w: 38, h: 28, gap: 6 };

const GridBattleArt = ({ id }) => {
    const cols = 5;
    const rows = 3;
    const special = {
        '0-1': 'star', '1-3': 'hole', '2-0': 'meteor', '0-4': 'question', '2-3': 'wormhole', '1-0': 'question'
    };
    const boardW = cols * TILE.w + (cols - 1) * TILE.gap;
    const boardH = rows * TILE.h + (rows - 1) * TILE.gap;
    return (
        <>
            <defs>
                <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#1a1f5e" />
                    <stop offset="1" stopColor="#070b24" />
                </linearGradient>
                <radialGradient id={`${id}-glow`} cx="0.15" cy="0.1" r="0.7">
                    <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.4" />
                    <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`${id}-hole`} cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0.35" stopColor="#020617" />
                    <stop offset="0.7" stopColor="#7c3aed" />
                    <stop offset="1" stopColor="#7c3aed" stopOpacity="0" />
                </radialGradient>
            </defs>
            <rect width={W} height={H} fill={`url(#${id}-bg)`} />
            <rect width={W} height={H} fill={`url(#${id}-glow)`} />
            <Stars seed={21} count={45} width={W} height={H} />

            {/* Team pods */}
            {[['#34d399', 3], ['#60a5fa', 5], ['#f472b6', 2]].map(([color, score], i) => (
                <g key={i} transform={`translate(${64 + i * 66} 20)`}>
                    <rect x="0" y="-9" width="56" height="18" rx="9" fill="#0b1230" stroke={i === 1 ? color : '#2c3663'} strokeWidth="1.5" />
                    <circle cx="9" cy="0" r="6" fill={color} />
                    <text x="36" y="0.5" textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="10" fill="#f8fafc">{score}</text>
                </g>
            ))}

            {/* Tilted board */}
            <g transform={`translate(${W / 2} ${H / 2 + 18}) rotate(-6) skewX(-10) translate(${-boardW / 2} ${-boardH / 2})`}>
                {Array.from({ length: rows }).map((_, r) => Array.from({ length: cols }).map((__, c) => {
                    const x = c * (TILE.w + TILE.gap);
                    const y = r * (TILE.h + TILE.gap);
                    const kind = special[`${r}-${c}`];
                    const cx = x + TILE.w / 2;
                    const cy = y + TILE.h / 2;
                    return (
                        <g key={`${r}-${c}`}>
                            <rect x={x} y={y} width={TILE.w} height={TILE.h} rx="6" fill={kind ? '#131b45' : '#1d2760'} stroke={kind ? '#3b4a8f' : '#34418a'} strokeWidth="1.2" />
                            {!kind && (
                                <text x={cx} y={cy + 0.5} textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="10" fill="#8b98d6" opacity="0.7">
                                    {r * cols + c + 1}
                                </text>
                            )}
                            {kind === 'star' && <path d={starPath(cx, cy, 9)} fill="#fbbf24" />}
                            {kind === 'hole' && <circle cx={cx} cy={cy} r="11" fill={`url(#${id}-hole)`} />}
                            {kind === 'question' && (
                                <>
                                    <circle cx={cx} cy={cy} r="9" fill="#60a5fa" />
                                    <text x={cx} y={cy + 0.5} textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="11" fill="#0b1230">?</text>
                                </>
                            )}
                            {kind === 'meteor' && (
                                <>
                                    <path d={`M${cx - 13},${cy - 9} L${cx - 1},${cy - 1}`} stroke="#fdba74" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
                                    <circle cx={cx + 2} cy={cy + 2} r="6" fill="#fb923c" />
                                </>
                            )}
                            {kind === 'wormhole' && (
                                <g fill="none" stroke="#a78bfa" strokeWidth="1.6">
                                    <circle cx={cx} cy={cy} r="10" opacity="0.4" />
                                    <circle cx={cx} cy={cy} r="6.5" opacity="0.7" />
                                    <circle cx={cx} cy={cy} r="3" />
                                </g>
                            )}
                        </g>
                    );
                }))}
            </g>
            <Sparkle x={272} y={146} size={6} color="#fde68a" />
            <Sparkle x={36} y={62} size={4} color="#c4b5fd" />
        </>
    );
};

const PRIZES = ['$1,000,000', '$250,000', '$64,000', '$16,000', '$4,000', '$1,000'];

const MillionaireArt = ({ id }) => (
    <>
        <defs>
            <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#1e1760" />
                <stop offset="1" stopColor="#060a22" />
            </linearGradient>
            <radialGradient id={`${id}-glow`} cx="0.32" cy="0.55" r="0.55">
                <stop offset="0" stopColor="#f59e0b" stopOpacity="0.35" />
                <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`${id}-planet`} cx="0.35" cy="0.3" r="0.8">
                <stop offset="0" stopColor="#fef3c7" />
                <stop offset="0.45" stopColor="#fbbf24" />
                <stop offset="1" stopColor="#b45309" />
            </radialGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#${id}-bg)`} />
        <rect width={W} height={H} fill={`url(#${id}-glow)`} />
        <Stars seed={33} count={50} width={W} height={H} color="#fef3c7" />

        {/* Golden planet with a ring of coins */}
        <path d="M34,100 A70,20 0 0 1 186,88" fill="none" stroke="#fcd34d" strokeOpacity="0.55" strokeWidth="3" transform="rotate(-12 110 96)" />
        <circle cx="110" cy="96" r="46" fill={`url(#${id}-planet)`} />
        <text x="110" y="99" textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="44" fill="#78350f" opacity="0.45">$</text>
        <path d="M186,88 A70,20 0 0 1 34,100" fill="none" stroke="#fcd34d" strokeWidth="3" transform="rotate(-12 110 96)" />
        {[[42, 116], [178, 84], [150, 119]].map(([x, y], i) => (
            <g key={i}>
                <ellipse cx={x} cy={y} rx="7" ry="5" fill="#fbbf24" stroke="#b45309" strokeWidth="1.2" />
                <ellipse cx={x} cy={y - 1} rx="3.5" ry="2" fill="#fde68a" />
            </g>
        ))}

        {/* Prize ladder */}
        {PRIZES.map((prize, i) => {
            const y = 24 + i * 23;
            const active = i === 2;
            return (
                <g key={prize}>
                    <rect x="210" y={y - 9} width="94" height="18" rx="9" fill={active ? '#fbbf24' : '#0b1230'} stroke={active ? '#fde68a' : i === 0 ? '#fbbf24' : '#3a4580'} strokeWidth="1.2" />
                    <text x="296" y={y + 0.5} textAnchor="end" dominantBaseline="middle" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="9.5" fill={active ? '#1c1917' : i === 0 ? '#fde68a' : '#a5b4fc'}>{prize}</text>
                    <text x="219" y={y + 0.5} dominantBaseline="middle" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="8" fill={active ? '#1c1917' : '#6b7bb0'}>{PRIZES.length * 2 + 3 - i * 2}</text>
                </g>
            );
        })}
        <Sparkle x={70} y={40} size={7} color="#fde68a" />
        <Sparkle x={168} y={146} size={5} color="#fde68a" />
    </>
);

const SCENES = {
    'comet-clash': CometClashArt,
    'grid-battle': GridBattleArt,
    millionaire: MillionaireArt
};

const GameArt = ({ gameId, className = '', title }) => {
    const id = `ga${useId().replace(/:/g, '')}`;
    const Scene = SCENES[gameId];
    if (!Scene) return <div className={`bg-gradient-to-br from-indigo-900 to-slate-950 ${className}`} />;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={`block ${className}`} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
            <Scene id={id} />
        </svg>
    );
};

export default GameArt;
