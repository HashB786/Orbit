// A student's ship, flown on their own device: steering, laser bolts (with a little aim assist),
// picking up crystals and dodging the mothership's plasma. It sends a tiny snapshot of the ship a few
// times a second, reports what its bolts hit and what it grabbed (the teacher's screen decides the
// points), and builds what the sector view draws each frame.

import {
    WORLD, MID, SHIP_R, BOSS_R, FLIGHT, BOLT, ORBS, ROCKS, RESPAWN_MS, FLAG, RULES,
    encodeShip, rockPos, rockAlive, orbsAt, reachOf, shieldOf, armorOf, laserOf, spawnPoint, leaderOf
} from './rules';
import { Fleet } from './fleet';
import { LASER_COLORS, safeColor } from './sector';

const wrapAngle = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// Bolts glow in the pilot's colour, or the colour of an upgraded laser
const boltColor = (p) => (p?.upg?.laser ? LASER_COLORS[Math.min(2, p.upg.laser)] : safeColor(p?.color));

// Where along the segment a→b a circle (c, r) is first touched: 0..1, or -1
const touchAt = (ax, ay, bx, by, cx, cy, r) => {
    const dx = bx - ax;
    const dy = by - ay;
    const fx = ax - cx;
    const fy = ay - cy;
    const c = fx * fx + fy * fy - r * r;
    if (c <= 0) return 0;
    const a = dx * dx + dy * dy;
    if (a === 0) return -1;
    const b = 2 * (fx * dx + fy * dy);
    const disc = b * b - 4 * a * c;
    if (disc < 0) return -1;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    return t >= 0 && t <= 1 ? t : -1;
};

export class Cockpit {
    // write(text): store this ship's snapshot; report(msg): send to the teacher's screen; on: UI hooks
    constructor({ rt, pid, me, write, report, on = {} }) {
        this.rt = rt;
        this.pid = pid;
        this.write = write;
        this.report = report;
        this.on = on;
        this.view = null;
        this.data = { me, players: {}, corsair: null, settings: {}, energy: 0 };
        const spot = spawnPoint();
        this.ship = { x: spot.x, y: spot.y, vx: 0, vy: 0, a: -Math.PI / 2 };
        this.cam = { x: spot.x, y: spot.y };
        this.n = me?.shots || 0; // bolts fired so far (the teacher's screen charges them)
        this.shot = { st: 0, sx: 0, sy: 0, sa: 0 };
        this.keys = { x: 0, y: 0 };
        this.stick = { x: 0, y: 0 };
        this.pointer = null;
        this.firing = { key: false, button: false, mouse: false };
        this.docked = true;
        this.lastShot = 0;
        this.bolts = []; // my bolts: { n, x, y, a, t0, px, py, done }
        this.fleet = new Fleet({ me: pid });
        this.grabbed = new Set();
        this.zapped = new Set();
        this.flashes = new Map(); // target id -> view time of its last hit
        // Hits show at once on this screen; the teacher's screen confirms them a moment later
        this.predicted = []; // damage my bolts did that hasn't been counted yet: { tgt, dmg, at }
        this.seen = new Map(); // target -> the hit points / shield the teacher's screen last reported
        this.gone = new Map(); // target -> when it broke on this screen (hidden until that is confirmed)
        this.downSeen = new Map(); // playerId -> the explosion already shown here
        this.orbBuf = [];
        this.downAt = me?.down?.at || 0;
        this.hiddenUntil = 0;
        this.wasHidden = false;
        this.lastWrite = 0;
        this.sent = { a: 0, thrust: false, f: -1 };
        this.force = true;
    }

    attach(view) { this.view = view; }

    setData(data) { Object.assign(this.data, data); }

    setRaw(raw) { this.fleet.setRaw(raw); }

    setDocked(docked) {
        this.docked = docked;
        this.force = true;
    }

    // Bolts fired that the teacher's screen hasn't charged yet
    unpaid() { return Math.max(0, this.n - (this.data.me?.shots || 0)); }

    energy() { return this.data.energy - this.unpaid(); }

    isHidden(now = this.rt.now()) { return now < this.hiddenUntil; }

    input() {
        if (this.keys.x || this.keys.y) return this.keys;
        if (this.stick.x || this.stick.y) return this.stick;
        return this.pointer || { x: 0, y: 0 };
    }

    // My damage to a target that is still on its way to the teacher's screen
    pending(tgt) {
        let sum = 0;
        for (const p of this.predicted) if (p.tgt === tgt) sum += p.dmg;
        return sum;
    }

    // The teacher's screen counted some damage: that much of what I predicted is settled
    settle(tgt, value) {
        const last = this.seen.get(tgt);
        if (last !== undefined && value < last) {
            let confirmed = last - value;
            for (const p of this.predicted) {
                if (p.tgt !== tgt || confirmed <= 0) continue;
                const take = Math.min(p.dmg, confirmed);
                p.dmg -= take;
                confirmed -= take;
            }
        }
        this.seen.set(tgt, value);
    }

    // Show what a hit did right away: crystals, cracks, a lost shield, an explosion
    predictHit(t, dmg, x, y, now) {
        const view = this.view;
        const me = this.data.me || {};
        if (t.tgt.startsWith('r:')) {
            const rock = this.data.corsair?.rocks?.[t.tgt.slice(2)];
            if (!rock) return;
            const before = rock.hp - (this.pending(t.tgt) - dmg);
            const gold = rock.kind === 'gold';
            let n = Math.min(dmg, Math.max(0, before)) * (gold ? RULES.goldPerDamage : RULES.perDamage);
            if (me.upg?.magnet) n = Math.round(n * RULES.magnet);
            if (n > 0) view?.floater(x, y - 30, `+${n}`, gold ? '#fde047' : '#67e8f9', 1);
            if (before - dmg <= 0) {
                this.gone.set(t.tgt, now);
                view?.explode(t.x, t.y, gold ? '#fde047' : '#a8a29e');
                view?.shake(0.6);
                this.on.sound?.(gold ? 'jackpot' : 'explode');
            } else {
                this.on.sound?.('mine');
            }
        } else if (t.tgt.startsWith('p:')) {
            const p = this.data.players?.[t.tgt.slice(2)];
            view?.floater(x, y - 30, `−${dmg}`, dmg > laserOf(me) ? '#fb923c' : '#fca5a5', 1);
            if (shieldOf(p) - this.pending(t.tgt) <= 0) {
                this.gone.set(t.tgt, now);
                view?.explode(t.x, t.y, safeColor(p?.color));
                view?.shake(1);
                this.on.sound?.('plunder');
            } else {
                this.on.sound?.('impact');
            }
        } else {
            view?.floater(x, y - 30, `−${dmg}`, '#86efac', 1.1);
            this.on.sound?.('impact');
        }
    }

    // ---------- one frame ----------

    step(dt) {
        const now = this.rt.now();
        const d = this.data;
        const me = d.me || {};
        const s = this.ship;
        const view = this.view;
        const vt = view?.time || 0;

        // Destroyed: explode, vanish for a moment, come back somewhere else
        if (me.down?.at && me.down.at !== this.downAt) {
            this.downAt = me.down.at;
            this.hiddenUntil = now + RESPAWN_MS;
            view?.explode(s.x, s.y, safeColor(me.color));
            view?.shake(2);
            this.on.sound?.('explode');
            this.bolts.forEach(b => { b.done = true; });
        }
        const hidden = now < this.hiddenUntil;
        if (this.wasHidden && !hidden) {
            const spot = spawnPoint();
            Object.assign(s, { x: spot.x, y: spot.y, vx: 0, vy: 0 });
            this.cam = { x: spot.x, y: spot.y };
            this.force = true;
        }
        this.wasHidden = hidden;

        // Flying
        const inp = this.input();
        const mag = Math.min(1, Math.hypot(inp.x, inp.y));
        const thrust = !this.docked && !hidden && mag > 0.08;
        if (this.docked || hidden) {
            s.vx = 0;
            s.vy = 0;
        } else if (thrust) {
            const ux = inp.x / (Math.hypot(inp.x, inp.y) || 1);
            const uy = inp.y / (Math.hypot(inp.x, inp.y) || 1);
            s.vx += ux * FLIGHT.accel * dt;
            s.vy += uy * FLIGHT.accel * dt;
            const top = FLIGHT.maxSpeed * (0.45 + 0.55 * mag);
            const sp = Math.hypot(s.vx, s.vy);
            if (sp > top) {
                s.vx *= top / sp;
                s.vy *= top / sp;
            }
            s.a += wrapAngle(Math.atan2(uy, ux) - s.a) * Math.min(1, dt * 16);
        } else {
            const k = Math.exp(-FLIGHT.drag * dt);
            s.vx *= k;
            s.vy *= k;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.x < SHIP_R) { s.x = SHIP_R; s.vx = Math.max(0, s.vx); }
        if (s.x > WORLD - SHIP_R) { s.x = WORLD - SHIP_R; s.vx = Math.min(0, s.vx); }
        if (s.y < SHIP_R) { s.y = SHIP_R; s.vy = Math.max(0, s.vy); }
        if (s.y > WORLD - SHIP_R) { s.y = WORLD - SHIP_R; s.vy = Math.min(0, s.vy); }

        // What can be hit right now
        this.fleet.update(now, dt);
        const raids = d.settings?.raids !== false;
        const corsair = d.corsair || {};
        const boss = corsair.boss && !corsair.boss.over && now < corsair.boss.until ? corsair.boss : null;
        const rocks = [];
        for (const [id, r] of Object.entries(corsair.rocks || {})) {
            if (!rockAlive(r, now)) continue;
            const p = rockPos(r, now);
            rocks.push({ id, r, x: p.x, y: p.y });
        }
        const others = [];
        for (const [pid, f] of this.fleet.ships) {
            const p = d.players?.[pid];
            if (!p || p.kicked || !p.name || p.connected === false || f.snap.f & FLAG.down) continue;
            others.push({
                pid, p, f,
                docked: !!(f.snap.f & FLAG.docked),
                safe: (p.safeUntil || 0) > now,
                cloaked: (p.cloakUntil || 0) > now
            });
        }
        // What the teacher's screen has counted settles my predictions; anything unconfirmed expires
        for (const k of rocks) this.settle(`r:${k.id}`, k.r.hp);
        for (const o of others) this.settle(`p:${o.pid}`, shieldOf(o.p));
        if (boss) this.settle('boss', boss.hp);
        this.predicted = this.predicted.filter(p => p.dmg > 0 && now - p.at < 2500);
        for (const [tgt, at] of this.gone) if (now - at > 2500) this.gone.delete(tgt);

        // Ships destroyed by anyone explode on this screen too
        for (const [pid, p] of Object.entries(d.players || {})) {
            if (pid === this.pid || !p) continue;
            const at = p.down?.at || 0;
            if (!this.downSeen.has(pid)) {
                this.downSeen.set(pid, at);
                continue;
            }
            if (at === this.downSeen.get(pid)) continue;
            this.downSeen.set(pid, at);
            const tgt = `p:${pid}`;
            this.predicted = this.predicted.filter(x => x.tgt !== tgt);
            const f = this.fleet.ships.get(pid);
            if (!this.gone.has(tgt) && f) {
                view?.explode(f.x, f.y, safeColor(p.color));
                if (view?.visible(f.x, f.y)) this.on.sound?.('explode');
            }
            // Stay hidden until its own device reports it gone (and then back somewhere else)
            this.gone.set(tgt, now - 1000);
        }

        const targets = [];
        for (const k of rocks) {
            if (!this.gone.has(`r:${k.id}`)) targets.push({ tgt: `r:${k.id}`, x: k.x, y: k.y, r: ROCKS[k.r.kind].r, vx: k.r.vx, vy: k.r.vy });
        }
        if (raids) {
            for (const o of others) {
                if (!o.docked && !o.safe && !o.cloaked && !this.gone.has(`p:${o.pid}`)) targets.push({ tgt: `p:${o.pid}`, x: o.f.x, y: o.f.y, r: SHIP_R + 4, vx: o.f.snap.vx, vy: o.f.snap.vy });
            }
        }
        if (boss) targets.push({ tgt: 'boss', x: MID, y: MID, r: BOSS_R * 0.62, vx: 0, vy: 0 });

        // Firing
        const wantsFire = this.firing.key || this.firing.button || this.firing.mouse;
        if (wantsFire && !this.docked && !hidden && now - this.lastShot >= BOLT.gap) {
            if (this.energy() >= RULES.shot) this.fire(now, targets);
            else if (now - (this.emptyAt || 0) > 1500) {
                this.emptyAt = now;
                this.on.empty?.();
            }
        }

        // My bolts: fly, and stop at the first thing they touch
        const life = (BOLT.range / BOLT.speed) * 1000;
        for (const b of this.bolts) {
            if (b.done) continue;
            const age = now - b.t0;
            if (age > life) {
                b.done = true;
                continue;
            }
            const dist = (age / 1000) * BOLT.speed;
            const x = b.x + Math.cos(b.a) * dist;
            const y = b.y + Math.sin(b.a) * dist;
            let best = null;
            for (const t of targets) {
                const at = touchAt(b.px, b.py, x, y, t.x, t.y, t.r + BOLT.r);
                if (at >= 0 && (!best || at < best.at)) best = { ...t, at };
            }
            if (best) {
                b.done = true;
                const hx = b.px + (x - b.px) * best.at;
                const hy = b.py + (y - b.py) * best.at;
                this.report({ act: 'hit', tgt: best.tgt, n: b.n, x: Math.round(hx), y: Math.round(hy), at: now });
                this.flashes.set(best.tgt, vt);
                view?.burst(hx, hy, best.tgt === 'boss' ? '#86efac' : best.tgt.startsWith('p:') ? '#fca5a5' : '#e7e5e4', 12);
                const revenge = best.tgt === `p:${me.revenge?.pid}` && me.revenge.until > now;
                const dmg = laserOf(me) * (revenge ? 2 : 1);
                this.predicted.push({ tgt: best.tgt, dmg, at: now });
                this.predictHit(best, dmg, hx, hy, now);
            } else {
                b.px = x;
                b.py = y;
            }
        }
        this.bolts = this.bolts.filter(b => !b.done);

        // Other people's bolts stop (just for the picture) where they meet something
        const meTarget = !this.docked && !hidden ? { x: s.x, y: s.y, r: SHIP_R + 4 } : null;
        for (const b of this.fleet.bolts) {
            const p = this.fleet.boltPos(b, now);
            const prev = b.prev || { x: b.x, y: b.y };
            b.prev = p;
            for (const t of meTarget ? [...targets, meTarget] : targets) {
                if (t.tgt === `p:${b.pid}`) continue;
                if (touchAt(prev.x, prev.y, p.x, p.y, t.x, t.y, t.r + BOLT.r) >= 0) {
                    b.done = true;
                    view?.burst(p.x, p.y, '#fca5a5', 6);
                    break;
                }
            }
        }

        // Crystals within reach
        if (!this.docked && !hidden) {
            const reach = reachOf(me) + SHIP_R;
            for (const [id, l] of Object.entries(corsair.loot || {})) {
                if (this.grabbed.has(id) || Math.hypot(l.x - s.x, l.y - s.y) > reach) continue;
                this.grabbed.add(id);
                this.report({ act: 'grab', id });
                view?.floater(l.x, l.y - 20, `+${l.n}`, '#67e8f9', 0.9);
                view?.burst(l.x, l.y, '#67e8f9', 10, 0.6);
                this.on.sound?.('bonus');
            }
        }

        // The mothership's plasma
        const orbs = orbsAt(corsair.boss, now, this.orbBuf);
        if (!this.docked && !hidden && (me.safeUntil || 0) <= now) {
            for (const o of orbs) {
                const key = `${o.k}:${o.j}`;
                if (this.zapped.has(key) || Math.hypot(o.x - s.x, o.y - s.y) > SHIP_R + ORBS.r) continue;
                this.zapped.add(key);
                this.report({ act: 'zap', wave: o.k, orb: o.j });
                this.flashes.set('me', vt);
                view?.burst(s.x, s.y, '#86efac', 14);
                view?.shake(1);
                this.on.sound?.('raided');
            }
        }

        // Tell everyone where the ship is
        const flags = (this.docked ? FLAG.docked : 0) | (thrust ? FLAG.thrust : 0) | (hidden ? FLAG.down : 0);
        const speed = Math.hypot(s.vx, s.vy);
        const since = now - this.lastWrite;
        const turned = Math.abs(wrapAngle(s.a - this.sent.a)) > 0.35;
        if (this.force || flags !== this.sent.f
            || (since > 90 && (turned || thrust !== this.sent.thrust))
            || (speed > 8 && since > 240) || since > 2000) {
            this.force = false;
            this.lastWrite = now;
            this.sent = { a: s.a, thrust, f: flags };
            this.write(encodeShip({ t: now, x: s.x, y: s.y, vx: s.vx, vy: s.vy, a: s.a, f: flags, n: this.n, ...this.shot }));
        }

        // Camera: follow the ship, looking a little ahead
        const lookX = clamp(s.x + s.vx * 0.3, 0, WORLD);
        const lookY = clamp(s.y + s.vy * 0.3, 0, WORLD);
        const k = Math.min(1, dt * 6);
        this.cam.x += (lookX - this.cam.x) * k;
        this.cam.y += (lookY - this.cam.y) * k;

        return this.scene(now, { rocks, others, boss, orbs, thrust, hidden });
    }

    fire(now, targets) {
        const s = this.ship;
        const a = this.aim(s.a, targets);
        const x = s.x + Math.cos(a) * (SHIP_R + 6);
        const y = s.y + Math.sin(a) * (SHIP_R + 6);
        this.n += 1;
        this.lastShot = now;
        this.shot = { st: now, sx: x, sy: y, sa: a };
        this.bolts.push({ n: this.n, x, y, a, t0: now, px: x, py: y, done: false });
        this.force = true;
        this.on.sound?.('laser');
        this.on.fired?.();
    }

    // A little help: a bolt fired close enough to a target's direction goes straight for it
    aim(heading, targets) {
        const s = this.ship;
        let best = null;
        let bestDiff = Infinity;
        for (const t of targets) {
            const dist = Math.hypot(t.x - s.x, t.y - s.y);
            if (dist < 1 || dist > BOLT.range + t.r) continue;
            const lead = dist / BOLT.speed;
            const a = Math.atan2(t.y + t.vy * lead - s.y, t.x + t.vx * lead - s.x);
            const diff = Math.abs(wrapAngle(a - heading));
            if (diff < 0.22 + Math.atan2(t.r, dist) && diff < bestDiff) {
                bestDiff = diff;
                best = a;
            }
        }
        return best ?? heading;
    }

    // ---------- what to draw ----------

    scene(now, { rocks, others, boss, orbs, thrust, hidden }) {
        const d = this.data;
        const me = d.me || {};
        const leader = d.settings?.bounty === false ? null : leaderOf(d.players);
        // Everything shows my hits that are still on their way to the teacher's screen
        const ships = others.filter(o => !this.gone.has(`p:${o.pid}`)).map(o => ({
            id: o.pid,
            name: o.p.name,
            color: o.p.color,
            design: o.p.ship || 0,
            x: o.f.x,
            y: o.f.y,
            a: o.f.a,
            docked: o.docked,
            safe: o.safe,
            cloaked: o.cloaked,
            thrust: !!(o.f.snap.f & FLAG.thrust),
            shield: Math.max(0, shieldOf(o.p) - this.pending(`p:${o.pid}`)),
            armor: armorOf(o.p),
            armorLevel: o.p.upg?.armor || 0,
            magnet: !!o.p.upg?.magnet,
            leader: o.pid === leader,
            flash: this.flashes.get(`p:${o.pid}`)
        }));
        const s = this.ship;
        ships.push({
            id: this.pid,
            me: true,
            name: me.name || '',
            color: me.color,
            design: me.ship || 0,
            x: s.x,
            y: s.y,
            a: s.a,
            hidden,
            docked: this.docked,
            safe: (me.safeUntil || 0) > now,
            cloaked: (me.cloakUntil || 0) > now,
            thrust,
            shield: shieldOf(me),
            armor: armorOf(me),
            armorLevel: me.upg?.armor || 0,
            magnet: !!me.upg?.magnet,
            leader: this.pid === leader,
            flash: this.flashes.get('me')
        });
        const myColor = boltColor(me);
        const bolts = [];
        const life = (BOLT.range / BOLT.speed) * 1000;
        for (const b of this.bolts) {
            const dist = (Math.min(life, now - b.t0) / 1000) * BOLT.speed;
            bolts.push({ x: b.x + Math.cos(b.a) * dist, y: b.y + Math.sin(b.a) * dist, a: b.a, color: myColor, mine: true });
        }
        for (const b of this.fleet.bolts) {
            const p = this.fleet.boltPos(b, now);
            bolts.push({ x: p.x, y: p.y, a: b.a, color: boltColor(d.players?.[b.pid]) });
        }
        return {
            now,
            camera: this.cam,
            ships,
            bolts,
            rocks: rocks.filter(k => !this.gone.has(`r:${k.id}`)).map(k => ({
                id: k.id, kind: k.r.kind, x: k.x, y: k.y, vx: k.r.vx, vy: k.r.vy, hp: Math.max(0, k.r.hp - this.pending(`r:${k.id}`)), max: k.r.max,
                rot: ((now - k.r.at) / 1000) * (k.r.spin || 0.5),
                fade: Math.min(1, (now - k.r.at) / 700),
                flash: this.flashes.get(`r:${k.id}`)
            })),
            loot: Object.entries(d.corsair?.loot || {}).filter(([id]) => !this.grabbed.has(id)).map(([id, l]) => ({ id, ...l })),
            boss: d.corsair?.boss ? { ...d.corsair.boss, hp: Math.max(0, d.corsair.boss.hp - this.pending('boss')) } : null,
            bossFlash: this.flashes.get('boss'),
            orbs: boss ? orbs : []
        };
    }
}

