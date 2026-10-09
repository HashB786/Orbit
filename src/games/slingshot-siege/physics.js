// Slingshot Siege physics: one sun in the middle pulls every comet, the team planets orbit it (all
// together on one ring, or in Wild mode each roaming in its own loops) and a moon circles closer in the
// other way, blocking comets.
// Shared by the teacher's screen (which decides every hit and score) and the students' devices (aim
// preview and the flight of their own comet). Aim travels as a rounded direction plus the launch time,
// and the simulation uses only + − × ÷, √ and its own sine (below), so every device and browser gets
// exactly the same flight.

const PI = 3.141592653589793;
const TWO_PI = 6.283185307179586;
const HALF_PI = 1.5707963267948966;

export const ARENA = 1000; // square world; the sun sits in the middle
export const CENTER = ARENA / 2;
export const SUN_R = 56;
export const PLANET_R = 42;
export const RING_R = 335; // planets' distance from the sun (Wild: see WILD.ring)
export const COMET_R = 8;
export const MEGA_R = 20; // a mega comet is much easier to land
export const STAR_R = 22; // power stars
export const SLING_R = SUN_R + 94; // passing this close to the sun before a hit doubles the points
// The moon pulls a little too (6% of the sun): the same shot lands differently depending on where it is
export const MOON = { orbit: 205, r: 26, spin: -0.42, phase: Math.PI / 4, gm: 1.5e6 };
// How fast the planets drift around the sun (radians per second, before the speed setting). Circle
// turns all planets together on one ring. Wild adds the dance below on top of a gentle drift.
export const SPINS = { still: 0, ring: 0.08, wild: 0.03 };
// The host's planet speed setting. The whole system turns this much faster; each planet's own loops
// only by the square root, so a faster game stays readable instead of turning into sudden jerks.
export const PACES = { slow: 0.8, normal: 1.5, fast: 2.1, turbo: 2.8 };
// Rooms started before Circle and Wild existed
const LEGACY = { slow: ['ring', 1], fast: ['ring', 2] };
// Wild orbits: every planet roams in two dimensions. It loops in towards the moon and out towards the
// edge, swings forward and back, speeds up and slows down, and now and then the whole system turns back.
// Every planet does the same dance, just at a different moment, so over a game no team is easier to
// hit, and the dance is sized so two planets never touch.
// k: how many steps around the ring the dance moves from one planet to the next ('half': opposite to
// its neighbours). A loop moves a planet in and out by r (world units) and sideways as much, so it
// traces a circle (turn: which way round); a sway only moves it sideways, using share of the room left.
const WILD = {
    ring: 352, // home distance from the sun: loops reach from just outside the moon's path to near the edge
    swing: 0.45, // the whole system rocks back and forth by up to this angle...
    swingSpeed: TWO_PI / 47, // ...once every 47 s
    loops: [
        { k: 'half', r: 42, speed: TWO_PI / 9, turn: 1 },
        { k: 1, r: 24, speed: TWO_PI / 21, turn: -1 }
    ],
    sways: [
        { k: 'half', speed: TWO_PI / 19, share: 0.6, max: 0.3 },
        { k: 1, speed: TWO_PI / 31, share: 0.4, max: 0.25 }
    ],
    grace: 4 // roaming planets are harder to lead, so comets count as hits a few units sooner
};
const MIN_GAP = 0.4; // radians (23°) between neighbouring planets at their closest: clear even at the inner edge
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
export const worldOf = (teams, settings = {}) => {
    const legacy = LEGACY[settings.orbit];
    const orbit = legacy ? legacy[0] : SPINS[settings.orbit] === undefined ? 'wild' : settings.orbit;
    const pace = legacy ? legacy[1] : PACES[settings.planetSpeed] ?? PACES.normal;
    const world = {
        teams, orbit, pace, dance: Math.sqrt(pace), spin: SPINS[orbit], moon: settings.moon !== false,
        ring: RING_R, rMin: RING_R, rMax: RING_R, swing: 0, swingSpeed: 0, loops: [], sways: [], grace: 0
    };
    if (orbit !== 'wild') return world;
    world.ring = WILD.ring;
    world.grace = Math.round(WILD.grace * world.dance);
    world.swing = WILD.swing;
    world.swingSpeed = WILD.swingSpeed;
    // A sideways swing of `amp` radians can bring two neighbours closer by 2 × amp × sin(step / 2):
    // all of them together may use the room between neighbours minus MIN_GAP
    const stepOf = (k) => (TWO_PI * (k === 'half' ? Math.floor(teams / 2) : k)) / teams;
    const cost = (amp, step) => 2 * Math.abs(amp * dsin(step / 2));
    const room = TWO_PI / teams - MIN_GAP;
    const loops = WILD.loops.map(l => ({ r: l.r, side: (l.turn * l.r) / WILD.ring, speed: l.speed, step: stepOf(l.k) }));
    const used = loops.reduce((sum, l) => sum + cost(l.side, l.step), 0);
    // With many teams the loops get narrower (never shallower) so the sways keep some room
    const fit = Math.min(1, (room * 0.6) / used);
    for (const l of loops) l.side *= fit;
    const left = room - used * fit;
    world.loops = loops;
    world.sways = WILD.sways.map(w => {
        const step = stepOf(w.k);
        return { amp: Math.min(w.max, (w.share * left) / cost(1, step)), speed: w.speed, step };
    });
    const reach = loops.reduce((sum, l) => sum + l.r, 0);
    world.rMin = WILD.ring - reach;
    world.rMax = WILD.ring + reach;
    return world;
};

// A planet's angle around the sun at game time `tau` (seconds since the start)
export const planetAngle = (world, team, tau) => {
    const t = tau * world.pace;
    const d = tau * world.dance;
    let a = -HALF_PI + (TWO_PI * team) / world.teams + world.spin * t;
    if (world.swing) a += world.swing * dsin(world.swingSpeed * t);
    for (const l of world.loops) a += l.side * dsin(l.speed * d + l.step * team);
    for (const w of world.sways) a += w.amp * dsin(w.speed * d + w.step * team);
    return a;
};

// ... and its distance from the sun
export const planetRadius = (world, team, tau) => {
    const d = tau * world.dance;
    let r = world.ring;
    for (const l of world.loops) r += l.r * dcos(l.speed * d + l.step * team);
    return r;
};

// Where a team's planet is at game time `tau` (seconds since the start)
export const planetPos = (world, team, tau = 0) => {
    const a = planetAngle(world, team, tau);
    const r = planetRadius(world, team, tau);
    return { x: CENTER + dcos(a) * r, y: CENTER + dsin(a) * r };
};

// Where a new power star may appear: inside the moon's path, or between the moon and the planets.
// Wild planets roam that second space, so their stars go out towards the corners instead.
export const starSpot = (world, rnd) => {
    let r;
    let a;
    if (rnd() < (world.orbit === 'wild' ? 0.65 : 0.5)) {
        r = 100 + rnd() * 60;
        a = rnd() * TWO_PI;
    } else if (world.orbit !== 'wild') {
        r = 245 + rnd() * 15;
        a = rnd() * TWO_PI;
    } else {
        r = world.rMax + PLANET_R + STAR_R + 18 + rnd() * 30;
        a = PI / 4 + HALF_PI * Math.floor(rnd() * 4) + (rnd() - 0.5) * 0.3;
    }
    return { x: Math.round(CENTER + Math.cos(a) * r), y: Math.round(CENTER + Math.sin(a) * r) };
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
    const hitR = PLANET_R + cometR + world.grace;
    const hitR2 = hitR * hitR;
    const sunR2 = (SUN_R + cometR) * (SUN_R + cometR);
    const moonR2 = (MOON.r + cometR) * (MOON.r + cometR);
    // Planets can only be touched while the comet is in the band they move in
    const inner = Math.max(0, world.rMin - hitR);
    const outer = world.rMax + hitR;
    const ringIn = inner * inner;
    const ringOut = outer * outer;
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
            if (!end && d2 > ringIn && d2 < ringOut) {
                for (let j = 0; j < world.teams; j++) {
                    if (j === team) continue; // comets pass through their own planet
                    const a = planetAngle(world, j, tau);
                    const pr = planetRadius(world, j, tau);
                    const ex = x - (CENTER + dcos(a) * pr);
                    const ey = y - (CENTER + dsin(a) * pr);
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
