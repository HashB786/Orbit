// Slingshot Siege physics: one sun in the middle pulls every comet, the team planets orbit it together
// and a moon circles closer in the other way, blocking comets.
// Shared by the teacher's screen (which decides every hit and score) and the students' devices (aim
// preview and the flight of their own comet). Aim travels as a rounded direction plus the launch time,
// and the simulation uses only + − × ÷, √ and its own sine (below), so every device and browser gets
// exactly the same flight.

export const ARENA = 1000; // square world; the sun sits in the middle
export const CENTER = ARENA / 2;
export const SUN_R = 56;
export const PLANET_R = 42;
export const RING_R = 335; // planets' distance from the sun
export const COMET_R = 8;
export const MEGA_R = 20; // a mega comet is much easier to land
export const STAR_R = 22; // power stars
export const SLING_R = SUN_R + 94; // passing this close to the sun before a hit doubles the points
// The moon pulls a little too (6% of the sun): the same shot lands differently depending on where it is
export const MOON = { orbit: 205, r: 26, spin: -0.42, phase: Math.PI / 4, gm: 1.5e6 };
// How fast the planets orbit (radians per second): all together, so no team is easier to hit
export const SPINS = { still: 0, slow: 0.08, fast: 0.16 };
export const TRIPLE_SPREAD = 7; // degrees between the three comets of a Triple comet

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

const PI = 3.141592653589793;
const TWO_PI = 6.283185307179586;
const HALF_PI = 1.5707963267948966;

// Math.sin/cos may differ in the last digit between browsers; this polynomial does not
export const dsin = (x) => {
    let r = x - TWO_PI * Math.round(x / TWO_PI);
    if (r > HALF_PI) r = PI - r;
    else if (r < -HALF_PI) r = -PI - r;
    const r2 = r * r;
    return r * (1 + r2 * (-1 / 6 + r2 * (1 / 120 + r2 * (-1 / 5040 + r2 * (1 / 362880 + r2 * (-1 / 39916800 + r2 * (1 / 6227020800)))))));
};
export const dcos = (x) => dsin(x + HALF_PI);

// Everything that is the same for the whole room
export const worldOf = (teams, settings = {}) => ({
    teams,
    spin: SPINS[settings.orbit] ?? SPINS.slow,
    moon: settings.moon !== false
});

export const planetAngle = (world, team, tau) => -HALF_PI + (TWO_PI * team) / world.teams + world.spin * tau;

// Where a team's planet is at game time `tau` (seconds since the start)
export const planetPos = (world, team, tau = 0) => {
    const a = planetAngle(world, team, tau);
    return { x: CENTER + dcos(a) * RING_R, y: CENTER + dsin(a) * RING_R };
};

export const moonPos = (tau) => {
    const a = MOON.phase + MOON.spin * tau;
    return { x: CENTER + dcos(a) * MOON.orbit, y: CENTER + dsin(a) * MOON.orbit };
};

// Unit direction rounded so it can be sent and replayed exactly
export const aimVector = (angle) => ({
    dx: Math.round(Math.cos(angle) * 1e4) / 1e4,
    dy: Math.round(Math.sin(angle) * 1e4) / 1e4
});

// The same direction turned by `deg` degrees (Triple comet), still exact on every device
export const turnVector = (dx, dy, deg) => {
    const a = (deg * PI) / 180;
    const c = dcos(a);
    const s = dsin(a);
    return { dx: dx * c - dy * s, dy: dx * s + dy * c };
};

export const clampPower = (p) => {
    const n = Math.round(Number(p) * 1000) / 1000;
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5;
};

// Valid aim data from a student (anything else is ignored by the host)
export const isValidShot = (s) => !!s
    && Number.isFinite(s.dx) && Number.isFinite(s.dy) && Number.isFinite(s.p) && Number.isFinite(s.t)
    && Math.abs(s.dx * s.dx + s.dy * s.dy - 1) < 0.01;

// A sensible first aim, relative to your planet's position: along its orbit, medium power
export const DEFAULT_AIM = { rel: HALF_PI, power: 0.5 };

/**
 * Flies one comet.
 * shot: { team, dx, dy, p, t (launch, ms of game time), mega }
 * @returns {{ end: 'hit'|'sun'|'moon'|'lost'|'preview', target: number|null, ms: number, sling: boolean, path: number[]|null }}
 *   path = [x0, y0, x1, y1, ...] every SAMPLE_MS (null when `sample` is false)
 */
export const simulate = (world, shot, { maxSteps = MAX_STEPS, sample = true } = {}) => {
    const { team, dx, dy } = shot;
    const t0 = (Number(shot.t) || 0) / 1000;
    const cometR = shot.mega ? MEGA_R : COMET_R;
    const from = planetPos(world, team, t0);
    const speed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * clampPower(shot.p);
    const off = PLANET_R + cometR + 2;
    let x = from.x + dx * off;
    let y = from.y + dy * off;
    let vx = dx * speed;
    let vy = dy * speed;
    let ax = 0;
    let ay = 0;
    let closest = Infinity;
    // Planets at game time 0, relative to the sun; at time tau they are turned by spin × tau
    const base = Array.from({ length: world.teams }, (_, j) => {
        const a = planetAngle(world, j, 0);
        return { x: dcos(a) * RING_R, y: dsin(a) * RING_R };
    });
    const hitR2 = (PLANET_R + cometR) * (PLANET_R + cometR);
    const sunR2 = (SUN_R + cometR) * (SUN_R + cometR);
    const moonR2 = (MOON.r + cometR) * (MOON.r + cometR);
    const path = sample ? [x, y] : null;
    let moonD2 = Infinity;

    // Sun (and moon) pull at game time `tau`; returns the squared distance to the sun
    const accel = (tau) => {
        const rx = CENTER - x;
        const ry = CENTER - y;
        const d2 = rx * rx + ry * ry;
        const d = Math.sqrt(d2);
        const a = GM / Math.max(d2, SUN_R * SUN_R);
        ax = (a * rx) / d;
        ay = (a * ry) / d;
        if (world.moon) {
            const m = moonPos(tau);
            const mx = m.x - x;
            const my = m.y - y;
            moonD2 = mx * mx + my * my;
            const md = Math.sqrt(moonD2);
            const ma = MOON.gm / Math.max(moonD2, MOON.r * MOON.r);
            ax += (ma * mx) / md;
            ay += (ma * my) / md;
        }
        return d2;
    };
    accel(t0);

    for (let i = 1; i <= maxSteps; i++) {
        const tau = t0 + i * DT;
        // Velocity Verlet: stable even when a comet whips around the sun
        vx += ax * DT * 0.5;
        vy += ay * DT * 0.5;
        x += vx * DT;
        y += vy * DT;
        const d2 = accel(tau);
        vx += ax * DT * 0.5;
        vy += ay * DT * 0.5;
        if (d2 < closest) closest = d2;
        if (sample && i % SAMPLE_EVERY === 0) path.push(x, y);

        let end = null;
        let target = null;
        if (d2 < sunR2) end = 'sun';
        else if (Math.abs(x - CENTER) > BOUND || Math.abs(y - CENTER) > BOUND) end = 'lost';
        else {
            if (world.moon && moonD2 < moonR2) end = 'moon';
            if (!end) {
                // Compare in the planets' turning frame: one rotation per step instead of one per planet
                const th = world.spin * tau;
                const c = dcos(th);
                const s = dsin(th);
                const rx = x - CENTER;
                const ry = y - CENTER;
                const qx = c * rx + s * ry;
                const qy = c * ry - s * rx;
                for (let j = 0; j < world.teams; j++) {
                    if (j === team) continue; // comets pass through their own planet
                    const ex = qx - base[j].x;
                    const ey = qy - base[j].y;
                    if (ex * ex + ey * ey < hitR2) {
                        end = 'hit';
                        target = j;
                        break;
                    }
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

// The first power star a flight passes through while that star is out (host only: stars are shared state).
// stars: [{ id, x, y, at, until }] with times in ms of game time. Returns { id, ms } or null.
export const firstStar = (flight, shot, stars) => {
    if (!flight.path || !stars.length) return null;
    const reach = STAR_R + (shot.mega ? MEGA_R : COMET_R);
    const points = flight.path.length / 2;
    for (let k = 0; k < points; k++) {
        const at = shot.t + k * SAMPLE_MS;
        const x = flight.path[k * 2];
        const y = flight.path[k * 2 + 1];
        for (const star of stars) {
            if (at < star.at || at > star.until) continue;
            const ex = x - star.x;
            const ey = y - star.y;
            if (ex * ex + ey * ey < reach * reach) return { id: star.id, ms: k * SAMPLE_MS };
        }
    }
    return null;
};
