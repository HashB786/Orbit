// Star Corsairs: rules, the sector's geometry and the ship messages. Shared by the teacher's screen
// (which decides every result) and the students' devices (which fly the ships).
//
// Every student flies their own ship and sends a tiny snapshot of it a few times a second
// (rooms/{code}/ships/{playerId}, see encodeShip). Everyone else draws it from that snapshot,
// moving it on smoothly between updates. Hits, pickups and points are reported to the teacher's
// screen, which checks them against what it knows and keeps the score.

export const WORLD = 2400; // the sector is a square this big; devices see a zoomed-in part of it
export const MID = WORLD / 2;
export const SHIP_R = 22;
export const BOSS_R = 150; // the alien mothership appears in the middle
export const SHIP_DESIGNS = 4; // Dart, Falcon, Saucer, Hammer

export const FLIGHT = { accel: 1300, maxSpeed: 330, drag: 2.2 }; // units/s², units/s, slow-down per second when coasting
export const BOLT = { speed: 950, range: 680, r: 7, gap: 300 }; // laser bolts; gap = ms between shots
export const ORBS = { first: 2500, every: 3200, count: 14, speed: 210, life: 5200, r: 14 }; // the mothership's plasma waves
export const LOOT = { life: 25000, reach: 70, magnetReach: 170, chunk: 25 };
export const RESPAWN_MS = 1600; // a destroyed ship comes back after this...
export const SAFE_MS = 5000; // ...protected for this long

// Meteors: hit points, size, and how long they take to drift across (ms)
export const ROCKS = {
    s: { hp: 2, r: 34, life: [60000, 80000] },
    m: { hp: 4, r: 50, life: [65000, 85000] },
    l: { hp: 7, r: 70, life: [70000, 95000] },
    gold: { hp: 3, r: 30, life: [16000, 19000] }
};

export const RULES = {
    answerEnergy: 5, // ⚡ per right answer...
    overchargeEvery: 3, // ...+3 on every 3rd right answer in a row
    overcharge: 3,
    underdog: 2, // ...+2 for players in the bottom 40%
    maxEnergy: 30,
    answerGapMs: 700, // answers closer together than this are not counted (no button mashing)
    shot: 1, // ⚡ per laser bolt
    cloak: 6,
    cloakMs: 15000,
    laser: [1, 2, 3], // damage per bolt at each upgrade level
    armor: [3, 4, 5], // full shield at each level
    prices: { laser: [120, 300], armor: [80, 200], magnet: [150] },
    magnet: 1.5, // crystals from meteors (and a much longer pickup reach)
    perDamage: 5, // crystals per point of meteor damage
    goldPerDamage: 10,
    destroyBonus: 8, // × the meteor's hit points, spilled as crystals to grab
    jackpot: 120, // golden comet
    plunder: 0.15, // share of a destroyed ship's crystals that spill out
    plunderMin: 10,
    plunderMax: 200,
    bounty: 25, // extra for destroying the leader
    revengeMs: 30000, // double damage against whoever destroyed you
    boss: { first: 120000, every: 180000, lastCall: 50000, life: 50000, baseHp: 20, hpPerPlayer: 15, reward: 40, perDamage: 2, mvp: 50, steal: 0.15, stealFrom: 3 },
    goldFirst: 50000,
    goldEvery: [70000, 100000]
};

export const UPGRADES = ['laser', 'armor', 'magnet'];

export const energyOf = (p) => (p?.earned || 0) - (p?.spent || 0);
export const laserOf = (p) => RULES.laser[Math.min(RULES.laser.length - 1, p?.upg?.laser || 0)];
export const armorOf = (p) => RULES.armor[Math.min(RULES.armor.length - 1, p?.upg?.armor || 0)];
export const shieldOf = (p) => Math.max(0, Math.min(armorOf(p), p?.shield ?? armorOf(p)));
export const priceOf = (p, item) => RULES.prices[item]?.[p?.upg?.[item] || 0] ?? null;
export const reachOf = (p) => (p?.upg?.magnet ? LOOT.magnetReach : LOOT.reach);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const TAU = Math.PI * 2;

// The player in first place (alone, with crystals) carries the bounty
export const leaderOf = (players) => {
    let best = null;
    let tie = false;
    for (const [id, p] of Object.entries(players || {})) {
        if (!p || p.kicked || !p.name || !Number.isInteger(p.slot)) continue;
        const s = p.score || 0;
        if (!best || s > best.s) {
            best = { id, s };
            tie = false;
        } else if (s === best.s) {
            tie = true;
        }
    }
    return best && !tie && best.s > 0 ? best.id : null;
};

// ---------- ship snapshots ----------
// "t,x,y,vx,vy,a,f,n,st,sx,sy,sa": server time, position, velocity, heading (mrad), flags,
// shots fired so far, and the last shot (time offset from t, origin, angle in mrad).

export const FLAG = { docked: 1, thrust: 2, down: 4 };

export const encodeShip = (s) => [
    s.t, s.x, s.y, s.vx, s.vy, s.a * 1000, s.f, s.n, s.st - s.t, s.sx, s.sy, s.sa * 1000
].map(v => Math.round(v || 0)).join(',');

export const decodeShip = (str) => {
    if (typeof str !== 'string' || str.length > 120) return null;
    const v = str.split(',').map(Number);
    if (v.length !== 12 || v.some(n => !Number.isFinite(n))) return null;
    return { t: v[0], x: v[1], y: v[2], vx: v[3], vy: v[4], a: v[5] / 1000, f: v[6], n: v[7], st: v[0] + v[8], sx: v[9], sy: v[10], sa: v[11] / 1000 };
};

// Where a ship from a snapshot is at time `now` (it keeps drifting for a moment between updates)
export const shipAt = (snap, now) => {
    const dt = clamp((now - snap.t) / 1000, -0.5, 0.6);
    return {
        x: clamp(snap.x + snap.vx * dt, SHIP_R, WORLD - SHIP_R),
        y: clamp(snap.y + snap.vy * dt, SHIP_R, WORLD - SHIP_R)
    };
};

// A fresh spot to (re)appear: anywhere, but not right on top of the mothership
export const spawnPoint = (rnd = Math.random) => {
    for (let i = 0; i < 20; i++) {
        const x = 120 + rnd() * (WORLD - 240);
        const y = 120 + rnd() * (WORLD - 240);
        if (Math.hypot(x - MID, y - MID) > BOSS_R + 260) return { x: Math.round(x), y: Math.round(y) };
    }
    return { x: 200, y: 200 };
};

// ---------- meteors ----------

export const rockPos = (rock, now) => {
    const dt = (now - rock.at) / 1000;
    return { x: rock.x + rock.vx * dt, y: rock.y + rock.vy * dt };
};

export const rockAlive = (rock, now) => !!rock && rock.hp > 0 && now >= rock.at && now < rock.until;

// More players, more meteors
export const rocksWanted = (crew) => Math.min(16, 6 + Math.floor(crew / 2));

// A new meteor: appears just outside an edge and drifts across the sector
export const newRock = (kind, now, rnd) => {
    const def = ROCKS[kind];
    const life = def.life[0] + rnd() * (def.life[1] - def.life[0]);
    const enter = rnd() * TAU;
    const far = WORLD * 0.62;
    const from = { x: MID + Math.cos(enter) * far, y: MID + Math.sin(enter) * far };
    const side = (rnd() - 0.5) * WORLD * 0.8;
    const exit = enter + Math.PI;
    const to = {
        x: MID + Math.cos(exit) * far + Math.cos(enter + Math.PI / 2) * side,
        y: MID + Math.sin(exit) * far + Math.sin(enter + Math.PI / 2) * side
    };
    const sec = life / 1000;
    return {
        kind,
        hp: def.hp,
        max: def.hp,
        x: Math.round(from.x),
        y: Math.round(from.y),
        vx: Math.round(((to.x - from.x) / sec) * 100) / 100,
        vy: Math.round(((to.y - from.y) / sec) * 100) / 100,
        at: now,
        until: Math.round(now + life),
        spin: Math.round((rnd() - 0.5) * 200) / 100
    };
};

// ---------- the mothership's plasma waves ----------
// Wave k leaves the mothership at boss.at + first + k × every; orb j flies out at a fixed angle.
// Every device works out the same orbs from the boss record alone.

export const waveTime = (boss, k) => boss.at + ORBS.first + k * ORBS.every;

export const orbsAt = (boss, now, out = []) => {
    out.length = 0;
    if (!boss || boss.over) return out;
    const since = now - boss.at - ORBS.first;
    if (since < 0) return out;
    const lastWave = Math.floor((Math.min(now, boss.until) - boss.at - ORBS.first) / ORBS.every);
    for (let k = Math.max(0, Math.ceil((since - ORBS.life) / ORBS.every)); k <= lastWave; k++) {
        const age = (now - waveTime(boss, k)) / 1000;
        if (age < 0 || age * 1000 > ORBS.life) continue;
        const d = BOSS_R * 0.7 + ORBS.speed * age;
        for (let j = 0; j < ORBS.count; j++) {
            const a = (j / ORBS.count) * TAU + k * 0.37;
            out.push({ k, j, x: MID + Math.cos(a) * d, y: MID + Math.sin(a) * d });
        }
    }
    return out;
};

// Crystals spilled at (x, y): a few pickups around the spot
export const spill = (total, x, y, rnd) => {
    const out = [];
    let left = Math.max(0, Math.round(total));
    const count = Math.min(8, Math.ceil(left / LOOT.chunk));
    for (let i = 0; i < count; i++) {
        const n = i === count - 1 ? left : Math.min(LOOT.chunk, Math.ceil(left / (count - i)));
        left -= n;
        const a = rnd() * TAU;
        const d = 20 + rnd() * 70;
        out.push({ n, x: Math.round(clamp(x + Math.cos(a) * d, 30, WORLD - 30)), y: Math.round(clamp(y + Math.sin(a) * d, 30, WORLD - 30)) });
    }
    return out.filter(l => l.n > 0);
};
