// Slingshot Siege physics: one sun in the middle pulls every comet.
// Shared by the teacher's screen (which decides every hit and score) and the students' devices
// (aim preview and the flight of their own comet). Aim travels as a rounded direction (dx, dy) and
// the simulation uses only + − × ÷ and √, so every device gets exactly the same flight.

export const ARENA = 1000; // square world; the sun sits in the middle
export const CENTER = ARENA / 2;
export const SUN_R = 56;
export const PLANET_R = 42;
export const RING_R = 335; // planets' distance from the sun
export const COMET_R = 8;
export const SLING_R = SUN_R + 94; // passing this close to the sun before a hit doubles the points

// Tuned so a thoughtful aim usually hits and a random one rarely does: below the slowest speed
// everything falls into the sun, above the fastest everything escapes
const GM = 2.4e7; // the sun's pull
const MIN_SPEED = 240; // world units per second at power 0
const MAX_SPEED = 360; // ... and at power 1
const DT = 1 / 240;
const MAX_STEPS = 240 * 7; // a comet fizzles after 7 s
const BOUND = CENTER + 40; // leaving the square (plus a margin) means lost in space
export const SAMPLE_EVERY = 4; // flight paths keep every 4th step: 60 points per second
export const SAMPLE_MS = DT * SAMPLE_EVERY * 1000;
export const PREVIEW_STEPS = 240; // the aim preview shows the first second: enough to see the curve start

const round3 = (v) => Math.round(v * 1000) / 1000;

// Planets sit evenly on a ring around the sun, the first one at the top
export const planetPos = (team, teams) => {
    const a = -Math.PI / 2 + (team / teams) * Math.PI * 2;
    return { x: round3(CENTER + Math.cos(a) * RING_R), y: round3(CENTER + Math.sin(a) * RING_R) };
};

// Unit direction rounded so it can be sent and replayed exactly
export const aimVector = (angle) => ({
    dx: Math.round(Math.cos(angle) * 1e4) / 1e4,
    dy: Math.round(Math.sin(angle) * 1e4) / 1e4
});

export const clampPower = (p) => {
    const n = Math.round(Number(p) * 1000) / 1000;
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5;
};

// Valid aim data from a student (anything else is ignored by the host)
export const isValidShot = (s) => !!s
    && Number.isFinite(s.dx) && Number.isFinite(s.dy) && Number.isFinite(s.p)
    && Math.abs(s.dx * s.dx + s.dy * s.dy - 1) < 0.01;

// A sensible first aim: along the planet's orbit at about orbital speed
export const defaultAim = (team, teams) => {
    const a = -Math.PI / 2 + (team / teams) * Math.PI * 2;
    return { angle: a + Math.PI / 2, power: 0.5 };
};

/**
 * Flies one comet from `team`'s planet.
 * @returns {{ end: 'hit'|'sun'|'lost', target: number|null, ms: number, sling: boolean, path: number[]|null }}
 *   path = [x0, y0, x1, y1, ...] every SAMPLE_MS (null when `sample` is false)
 */
export const simulate = (team, teams, dx, dy, power, { maxSteps = MAX_STEPS, sample = true } = {}) => {
    const from = planetPos(team, teams);
    const planets = Array.from({ length: teams }, (_, i) => planetPos(i, teams));
    const speed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * clampPower(power);
    const off = PLANET_R + COMET_R + 2;
    let x = from.x + dx * off;
    let y = from.y + dy * off;
    let vx = dx * speed;
    let vy = dy * speed;
    let ax = 0;
    let ay = 0;
    let closest = Infinity;
    const hitR2 = (PLANET_R + COMET_R) * (PLANET_R + COMET_R);
    const sunR2 = (SUN_R + COMET_R) * (SUN_R + COMET_R);
    const path = sample ? [x, y] : null;

    const accel = () => {
        const rx = CENTER - x;
        const ry = CENTER - y;
        const d2 = rx * rx + ry * ry;
        const d = Math.sqrt(d2);
        const a = GM / Math.max(d2, SUN_R * SUN_R);
        ax = (a * rx) / d;
        ay = (a * ry) / d;
        return d2;
    };
    accel();

    for (let i = 1; i <= maxSteps; i++) {
        // Velocity Verlet: stable even when a comet whips around the sun
        vx += ax * DT * 0.5;
        vy += ay * DT * 0.5;
        x += vx * DT;
        y += vy * DT;
        const d2 = accel();
        vx += ax * DT * 0.5;
        vy += ay * DT * 0.5;
        if (d2 < closest) closest = d2;
        if (sample && i % SAMPLE_EVERY === 0) path.push(x, y);

        let end = null;
        let target = null;
        if (d2 < sunR2) end = 'sun';
        else if (Math.abs(x - CENTER) > BOUND || Math.abs(y - CENTER) > BOUND) end = 'lost';
        else {
            for (let j = 0; j < teams; j++) {
                if (j === team) continue; // comets pass through their own planet
                const ex = x - planets[j].x;
                const ey = y - planets[j].y;
                if (ex * ex + ey * ey < hitR2) {
                    end = 'hit';
                    target = j;
                    break;
                }
            }
        }
        if (end) {
            if (sample && i % SAMPLE_EVERY !== 0) path.push(x, y);
            return { end, target, ms: i * DT * 1000, sling: end === 'hit' && closest < SLING_R * SLING_R, path };
        }
    }
    return { end: maxSteps < MAX_STEPS ? 'preview' : 'lost', target: null, ms: maxSteps * DT * 1000, sling: false, path };
};
