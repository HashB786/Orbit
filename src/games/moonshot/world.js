// Moonshot: the climb. Everything about the tower is worked out from the room's seed, so every
// device builds exactly the same platforms, hazards and pickups without sending any of it over the
// network. Students fly their own climber (see climber.js) and only report how high they are.
//
// Distances are in metres: the score is the altitude a student reaches.

export const WIDTH = 9; // the climb is this many metres wide, with walls on both sides
export const VIEW_H = 15.5; // metres a student sees at once
export const BAND = 2.35; // metres between rows of platforms
export const STATION_EVERY = 8; // every eighth row is a wide station: a refuel pad and a checkpoint
export const CATCH_BELOW = 2.6; // falling this far under your last station puts you back on it
export const PLAYER = { w: 0.72, h: 1.1 };

export const PHYS = {
    gravity: 30,
    jump: 8.9, // straight up: 1.32 m, which is less than the 2.35 m between rows
    speed: 6.2,
    accel: 60,
    airAccel: 34,
    friction: 16,
    iceFriction: 1.6,
    maxFall: 26,
    coyote: 0.1, // you can still jump this long after walking off an edge
    buffer: 0.14 // a jump pressed this long before landing still counts
};
// The jetpack: the only real way up. Questions fill the tank, holding jump in the air burns it.
// At 62 fuel a second and 5.4 m a second, a metre of climbing costs about 11.5 fuel.
export const BOOST = { accel: 56, maxUp: 5.4, cost: 62, tank: 360, answer: 120, cell: 80 };
export const FUEL_PER_M = 62 / 5.4; // what a metre of flying costs, for the fuel gauge
export const SPRING = { jump: 14.6, boots: 12.2, bootsMs: 20000 }; // bouncy platforms (3.6 m) and spring boots (2.5 m)
export const SHIELD_MS = 12000;
export const ROCK = { r: 0.62, knock: 7.5, stun: 0.45 };
export const CAUGHT_FUEL = 70; // fuel lost when the storm catches you

// The storm rises from the bottom and slowly speeds up
export const STORMS = {
    off: null,
    slow: { rate: 0.18, accel: 0.0003 },
    normal: { rate: 0.3, accel: 0.0005 },
    fast: { rate: 0.45, accel: 0.0009 }
};
export const STORM_GRACE = 25; // seconds before it starts

// Zone names (games.climb.zones.*) with the sky colours for each
export const ZONES = [
    { at: 0, key: 'pad', sky: ['#1e3a8a', '#0b1020'], tint: '#60a5fa' },
    { at: 110, key: 'clouds', sky: ['#3b82f6', '#131c3a'], tint: '#93c5fd' },
    { at: 230, key: 'jet', sky: ['#1d4ed8', '#0a1030'], tint: '#a5b4fc' },
    { at: 360, key: 'edge', sky: ['#4c1d95', '#090a24'], tint: '#c4b5fd' },
    { at: 500, key: 'orbit', sky: ['#312e81', '#05060f'], tint: '#818cf8' },
    { at: 660, key: 'belt', sky: ['#7c2d12', '#0b0710'], tint: '#fdba74' },
    { at: 840, key: 'deep', sky: ['#111827', '#020308'], tint: '#67e8f9' },
    { at: 1040, key: 'moon', sky: ['#334155', '#04060f'], tint: '#e2e8f0' }
];

export const zoneAt = (alt) => {
    let i = 0;
    while (i + 1 < ZONES.length && alt >= ZONES[i + 1].at) i++;
    return i;
};

export const stormAt = (world, tau) => {
    const s = world.storm;
    if (!s) return -Infinity;
    const t = tau - STORM_GRACE;
    if (t <= 0) return -4;
    return -4 + s.rate * t + s.accel * t * t;
};

// ---------- the tower ----------

const mix = (n) => {
    let x = n >>> 0;
    x ^= x >>> 16;
    x = Math.imul(x, 0x7feb352d);
    x ^= x >>> 15;
    x = Math.imul(x, 0x846ca68b);
    x ^= x >>> 16;
    return x >>> 0;
};

// A little random generator that always gives the same numbers for the same row
const rngFor = (seed, row, salt = 0) => {
    let s = mix((seed ^ mix(row * 0x9e3779b1)) + salt * 0x85ebca6b);
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

export const makeWorld = (seed, settings = {}) => ({
    seed: Number(seed) || 1,
    storm: STORMS[settings.storm] === undefined ? STORMS.normal : STORMS[settings.storm],
    hazards: settings.hazards !== false,
    powerUps: settings.powerUps !== false,
    rows: new Map()
});

// How far a platform at x can swing without touching a wall
const swing = (want, x, w) => Math.max(0, Math.min(want, x, WIDTH - (x + w)));

const place = (rng, width, taken) => {
    for (let tries = 0; tries < 12; tries++) {
        const x = rng() * (WIDTH - width);
        if (!taken.some(p => x < p.x + p.w + 0.7 && p.x < x + width + 0.7)) return x;
    }
    return null;
};

// All the platforms (and what sits on them) in one row, worked out once and remembered
export const rowAt = (world, row) => {
    if (row < 0) return [];
    const cached = world.rows.get(row);
    if (cached) return cached;
    const rng = rngFor(world.seed, row);
    const y = row * BAND;
    const out = [];

    if (row === 0) {
        out.push({ row, i: 0, x: 0, y, w: WIDTH, kind: 'station' });
    } else if (row % STATION_EVERY === 0) {
        // A wide station: refuel here, and this is where a fall or the storm puts you back
        const w = 3.4 + rng() * 1.6;
        out.push({ row, i: 0, x: Math.min(WIDTH - w, rng() * (WIDTH - w)), y, w, kind: 'station' });
    } else {
        // The first platform stays within jumping distance of the row below, so there is always a way up
        const below = rowAt(world, row - 1).filter(b => !b.pickup && !b.rock);
        const anchor = below[Math.floor(rng() * below.length)] || { x: WIDTH / 2 - 0.5, w: 1 };
        const w = 1.3 + rng() * 1.9;
        const from = anchor.x + anchor.w / 2;
        const x = Math.max(0, Math.min(WIDTH - w, from - w / 2 + (rng() * 2 - 1) * 2.5));
        const zone = zoneAt(y);
        let kind = 'solid';
        const roll = rng();
        if (world.hazards && zone >= 1 && roll < 0.14) kind = 'crumble';
        else if (roll < 0.26) kind = 'move';
        else if (zone >= 2 && roll < 0.34) kind = 'ice';
        else if (roll < 0.42) kind = 'spring';
        out.push({ row, i: 0, x, y, w, kind, phase: rng() * Math.PI * 2, amp: swing(0.8 + rng() * 1.6, x, w), rate: 0.5 + rng() * 0.6 });

        // One or two extra platforms make other routes possible
        const extras = rng() < 0.5 ? 1 : rng() < 0.75 ? 2 : 0;
        for (let k = 0; k < extras; k++) {
            const ew = 1.2 + rng() * 1.6;
            const ex = place(rng, ew, out);
            if (ex === null) continue;
            const er = rng();
            out.push({
                row, i: out.length, x: ex, y, w: ew,
                kind: world.hazards && er < 0.16 ? 'crumble' : er < 0.3 ? 'move' : er < 0.4 ? 'spring' : 'solid',
                phase: rng() * Math.PI * 2, amp: swing(0.7 + rng() * 1.4, ex, ew), rate: 0.5 + rng() * 0.7
            });
        }
    }

    // Fuel cells, power-ups and drifting rocks
    const extra = rngFor(world.seed, row, 7);
    const host = out[Math.floor(extra() * out.length)];
    if (row > 0 && host) {
        const r = extra();
        if (r < 0.46) out.push({ row, i: out.length, pickup: 'fuel', x: host.x + host.w / 2, y: y + 1.15 });
        else if (world.powerUps && r < 0.54) out.push({ row, i: out.length, pickup: extra() < 0.5 ? 'boots' : 'shield', x: host.x + host.w / 2, y: y + 1.2 });
    }
    if (world.hazards && row > 6 && extra() < 0.17) {
        out.push({ row, i: out.length, rock: true, x: WIDTH / 2, y: y + 1.3, phase: extra() * Math.PI * 2, amp: WIDTH / 2 - 1.2, rate: 0.35 + extra() * 0.5 });
    }

    world.rows.set(row, out);
    if (world.rows.size > 900) for (const key of world.rows.keys()) {
        if (Math.abs(key - row) > 400) world.rows.delete(key);
    }
    return out;
};

// Moving platforms and drifting rocks swing from side to side with the game clock
export const pieceX = (p, tau) => (p.amp && (p.kind === 'move' || p.rock) ? p.x + Math.sin(tau * p.rate + p.phase) * p.amp : p.x);

// The station a fall or the storm drops you on: the lowest one still safely above the storm
export const refugeRow = (world, tau, below) => {
    const storm = stormAt(world, tau);
    let row = Math.max(0, Math.ceil((storm + 7) / (BAND * STATION_EVERY))) * STATION_EVERY;
    if (Number.isFinite(below)) row = Math.min(row, Math.max(0, Math.floor(below / (BAND * STATION_EVERY))) * STATION_EVERY);
    return Math.max(0, row);
};

export const stationSpot = (world, row) => {
    const pad = rowAt(world, row).find(p => p.kind === 'station') || { x: WIDTH / 2 - 1, y: row * BAND, w: 2 };
    return { x: pad.x + pad.w / 2, y: pad.y + 0.05 };
};

// ---------- climber snapshots ----------
// "t,x,y,vy,f,best": server time, where they are (centimetres), flags and their best altitude.

export const FLAG = { boost: 1, ground: 2, left: 4, answering: 8, caught: 16 };

export const encodeClimber = (c) => [
    c.t, Math.round(c.x * 100), Math.round(c.y * 100), Math.round(c.vy * 100), c.f, Math.round(c.best * 100)
].join(',');

export const decodeClimber = (str) => {
    if (typeof str !== 'string' || str.length > 70) return null;
    const v = str.split(',').map(Number);
    if (v.length !== 6 || v.some(n => !Number.isFinite(n))) return null;
    return { t: v[0], x: v[1] / 100, y: v[2] / 100, vy: v[3] / 100, f: v[4], best: v[5] / 100 };
};

// Nobody can climb faster than this, however the numbers arrive (the host clamps to it)
export const MAX_CLIMB = 9; // metres per second
