// One student's climber, flown entirely on their own device: running, jumping, the jetpack, landing
// on platforms, pickups, rocks and the rising storm. Everything reacts the instant a key is pressed —
// the teacher's screen only receives how high the climber got, and keeps the score.

import {
    WIDTH, BAND, CATCH_BELOW, PLAYER, PHYS, BOOST, SPRING, SHIELD_MS, ROCK, CAUGHT_FUEL, FLAG,
    rowAt, pieceX, stormAt, zoneAt, refugeRow, stationSpot, encodeClimber, decodeClimber
} from './world';

const STEP = 1 / 120; // physics runs at a steady 120 steps a second
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class Climber {
    // write(text): share where this climber is; report(msg): tell the teacher's screen; on: hooks for the UI
    constructor({ rt, pid, world, me, startedAt, write, report, on = {} }) {
        this.rt = rt;
        this.pid = pid;
        this.world = world;
        this.startedAt = startedAt;
        this.write = write;
        this.report = report;
        this.on = on;
        this.view = null;
        this.data = { me: me || {}, players: {}, settings: {} };
        const spot = stationSpot(world, 0);
        this.p = { x: spot.x, y: 0.05, vx: 0, vy: 0, ground: true, face: 1 };
        this.cam = { x: WIDTH / 2, y: 4 };
        this.fuel = BOOST.tank * 0.45;
        this.best = 0;
        // Metres the storm has carried this climber above their own record: they never count as climbed
        this.carried = 0;
        this.zone = 0;
        this.held = { left: false, right: false, jump: false };
        this.axis = 0; // touch: -1..1 from the left/right pads
        this.jumpAt = -9; // when jump was last pressed (for the buffer)
        this.leftGround = -9;
        this.answering = false;
        this.stun = 0;
        this.bootsUntil = 0;
        this.shieldUntil = 0;
        this.caughtUntil = 0;
        this.station = 0; // the highest station reached: a long fall ends here instead of at the bottom
        this.taken = new Set(); // pickups collected: "row:i"
        this.broken = new Map(); // crumbling platforms: "row:i" -> when it fell
        this.ghosts = new Map();
        this.raw = {};
        this.acc = 0;
        this.lastWrite = 0;
        this.sent = '';
        this.pieces = [];
        this.falls = 0;
    }

    attach(view) { this.view = view; }
    setData(data) { Object.assign(this.data, data); }
    setRaw(raw) { this.raw = raw || {}; }

    setAnswering(on) {
        this.answering = on;
        if (on) {
            this.p.vx = 0;
            this.held = { left: false, right: false, jump: false };
            this.axis = 0;
        }
    }

    // A right answer fills the tank
    refuel(amount = BOOST.answer) {
        const before = this.fuel;
        this.fuel = Math.min(BOOST.tank, this.fuel + amount);
        return Math.round(this.fuel - before);
    }

    tau(now = this.rt.now()) { return (now - this.startedAt) / 1000; }

    // The altitude that counts towards the score
    alt() { return this.p.y - this.carried; }

    // ---------- the world around the climber ----------

    solids(tau) {
        const out = [];
        const row = Math.floor(this.p.y / BAND);
        for (let r = Math.max(0, row - 2); r <= row + 3; r++) {
            for (const piece of rowAt(this.world, r)) {
                if (piece.pickup || piece.rock) continue;
                const key = `${piece.row}:${piece.i}`;
                const broke = this.broken.get(key);
                if (broke && tau - broke < 5) continue;
                if (broke) this.broken.delete(key);
                out.push(piece);
            }
        }
        return out;
    }

    // ---------- one frame ----------

    step(dt) {
        const now = this.rt.now();
        const tau = this.tau(now);
        let left = Math.min(0.1, dt);
        this.acc += left;
        while (this.acc >= STEP) {
            this.acc -= STEP;
            this.tick(STEP, tau);
        }
        this.after(tau, now);
        return this.scene(tau, now);
    }

    tick(dt, tau) {
        const p = this.p;
        const frozen = this.answering || this.rt.now() < this.caughtUntil;
        this.stun = Math.max(0, this.stun - dt);
        if (frozen) {
            p.vx = 0;
            p.vy = 0;
            return;
        }

        // Left and right
        const want = this.stun > 0 ? 0 : clamp((this.held.right ? 1 : 0) - (this.held.left ? 1 : 0) + this.axis, -1, 1);
        if (want) p.face = want > 0 ? 1 : -1;
        const target = want * PHYS.speed;
        const onIce = p.ground && this.standing?.kind === 'ice';
        const rate = p.ground ? (want ? PHYS.accel : (onIce ? PHYS.iceFriction : PHYS.friction)) : (want ? PHYS.airAccel : 2.5);
        if (p.vx < target) p.vx = Math.min(target, p.vx + rate * dt);
        else if (p.vx > target) p.vx = Math.max(target, p.vx - rate * dt);

        // Jumping, and the jetpack while you hold it in the air
        const jumpPower = this.rt.now() < this.bootsUntil ? SPRING.boots : PHYS.jump;
        const canJump = p.ground || tau - this.leftGround < PHYS.coyote;
        if (this.held.jump && tau - this.jumpAt < PHYS.buffer && canJump && this.stun <= 0) {
            p.vy = jumpPower;
            p.ground = false;
            this.jumpAt = -9;
            this.leftGround = -9;
            this.on.sound?.('jump');
            this.view?.puff(p.x, p.y, 8);
        } else if (this.held.jump && !p.ground && this.fuel > 0 && this.stun <= 0) {
            this.fuel = Math.max(0, this.fuel - BOOST.cost * dt);
            p.vy = Math.min(BOOST.maxUp, p.vy + BOOST.accel * dt);
            this.boosting = true;
        }

        p.vy = Math.max(-PHYS.maxFall, p.vy - PHYS.gravity * dt);
        const wasGround = p.ground;
        p.ground = false;

        // Move and land (platforms only catch you from above, so you can jump up through them)
        p.x = clamp(p.x + p.vx * dt, PLAYER.w / 2, WIDTH - PLAYER.w / 2);
        if (p.x <= PLAYER.w / 2 || p.x >= WIDTH - PLAYER.w / 2) p.vx = 0;
        const beforeY = p.y;
        p.y += p.vy * dt;
        if (p.vy <= 0) {
            for (const piece of this.solids(tau)) {
                const px = pieceX(piece, tau);
                if (p.x + PLAYER.w / 2 < px || p.x - PLAYER.w / 2 > px + piece.w) continue;
                if (beforeY + 0.001 < piece.y || p.y > piece.y) continue;
                p.y = piece.y;
                p.ground = true;
                this.standing = piece;
                if (piece.kind === 'spring') {
                    p.vy = SPRING.jump;
                    p.ground = false;
                    this.on.sound?.('spring');
                    this.view?.puff(p.x, p.y, 14, '#fde047');
                } else {
                    if (p.vy < -9) this.view?.puff(p.x, p.y, 6);
                    p.vy = 0;
                    if (piece.kind === 'crumble') {
                        const key = `${piece.row}:${piece.i}`;
                        if (!this.crumbling?.has(key)) {
                            (this.crumbling = this.crumbling || new Map()).set(key, tau + 0.45);
                            this.on.sound?.('crack');
                        }
                    }
                    // A moving platform carries you along
                    if (piece.kind === 'move') p.x = clamp(p.x + (px - (piece.lastX ?? px)), PLAYER.w / 2, WIDTH - PLAYER.w / 2);
                }
                if (piece.kind === 'station' && piece.row > this.station) this.station = piece.row;
                if (!wasGround) this.on.land?.(piece);
                break;
            }
        }
        for (const piece of this.solids(tau)) if (piece.kind === 'move') piece.lastX = pieceX(piece, tau);
        if (wasGround && !p.ground) this.leftGround = tau;
        if (p.y < 0) {
            p.y = 0;
            p.vy = 0;
            p.ground = true;
        }
    }

    // Everything that happens once a frame rather than every physics step
    after(tau, now) {
        const p = this.p;
        const view = this.view;

        // Platforms you stood on crumble away
        if (this.crumbling) {
            for (const [key, at] of this.crumbling) {
                if (tau < at) continue;
                this.crumbling.delete(key);
                this.broken.set(key, tau);
                const [row, i] = key.split(':').map(Number);
                const piece = rowAt(this.world, row)[i];
                if (piece) {
                    view?.puff(pieceX(piece, tau) + piece.w / 2, piece.y, 12, '#a8a29e');
                    this.on.sound?.('crumble');
                }
            }
        }

        // Pickups and drifting rocks
        const row = Math.floor(p.y / BAND);
        for (let r = Math.max(0, row - 2); r <= row + 2; r++) {
            for (const piece of rowAt(this.world, r)) {
                const key = `${piece.row}:${piece.i}`;
                if (piece.pickup) {
                    if (this.taken.has(key) || Math.hypot(piece.x - p.x, piece.y + 0.2 - (p.y + PLAYER.h / 2)) > 0.85) continue;
                    this.taken.add(key);
                    if (piece.pickup === 'fuel') {
                        this.refuel(BOOST.cell);
                        view?.floater(piece.x, piece.y + 0.6, '+FUEL', '#fde047');
                    } else if (piece.pickup === 'boots') {
                        this.bootsUntil = now + SPRING.bootsMs;
                        view?.floater(piece.x, piece.y + 0.6, 'BOOTS', '#86efac');
                    } else {
                        this.shieldUntil = now + SHIELD_MS;
                        view?.floater(piece.x, piece.y + 0.6, 'SHIELD', '#7dd3fc');
                    }
                    view?.puff(piece.x, piece.y + 0.3, 10, '#fde047');
                    this.on.sound?.('bonus');
                } else if (piece.rock && this.stun <= 0 && now >= this.caughtUntil) {
                    const rx = pieceX(piece, tau);
                    if (Math.hypot(rx - p.x, piece.y - (p.y + PLAYER.h / 2)) > ROCK.r + PLAYER.w / 2) continue;
                    if (now < this.shieldUntil) {
                        this.shieldUntil = 0;
                        view?.puff(rx, piece.y, 16, '#7dd3fc');
                        this.on.sound?.('shieldBreak');
                    } else {
                        this.stun = ROCK.stun;
                        p.vx = (p.x < rx ? -1 : 1) * ROCK.knock;
                        p.vy = Math.min(p.vy, -2);
                        view?.puff(rx, piece.y, 14, '#fca5a5');
                        view?.shake(1);
                        this.on.sound?.('bump');
                    }
                }
            }
        }

        // A long fall ends at the last station reached, not at the bottom
        const floor = this.station * BAND;
        if (this.station > 0 && p.y < floor - CATCH_BELOW && now >= this.caughtUntil) {
            const spot = stationSpot(this.world, this.station);
            view?.puff(p.x, p.y, 14, '#6ee7b7');
            p.x = spot.x;
            p.y = spot.y;
            p.vx = 0;
            p.vy = 0;
            this.on.sound?.('checkpoint');
            this.on.checkpoint?.(this.station);
        }

        // The storm
        const storm = stormAt(this.world, tau);
        if (storm > p.y && now >= this.caughtUntil && !this.answering) {
            if (now < this.shieldUntil) {
                this.shieldUntil = 0;
                this.on.sound?.('shieldBreak');
            } else {
                this.caught(tau, now, storm);
            }
        }

        // Best altitude and the zone you are in
        if (this.alt() > this.best) this.best = this.alt();
        const zone = zoneAt(this.best);
        if (zone > this.zone) {
            this.zone = zone;
            this.on.zone?.(zone);
        }

        // Share where this climber is, a few times a second
        const flags = (this.boosting ? FLAG.boost : 0) | (p.ground ? FLAG.ground : 0)
            | (p.face < 0 ? FLAG.left : 0) | (this.answering ? FLAG.answering : 0) | (now < this.caughtUntil ? FLAG.caught : 0);
        const text = encodeClimber({ t: now, x: p.x, y: p.y, vy: p.vy, f: flags, best: this.best });
        if (now - this.lastWrite > 300 || (flags & FLAG.ground) !== (this.sentFlags & FLAG.ground)) {
            this.lastWrite = now;
            this.sentFlags = flags;
            if (text !== this.sent) {
                this.sent = text;
                this.write(text);
            }
        }
        this.boosting = false;

        // Camera: follow, but look ahead when falling fast
        const want = clamp(p.y + (p.vy < -8 ? -2.4 : 1.2), 2.5, Math.max(2.5, this.best + 40));
        this.cam.y += (want - this.cam.y) * Math.min(1, dtSmooth(p.vy));
        this.cam.x = WIDTH / 2;
    }

    // The storm caught up: back to the nearest station above it
    caught(tau, now, storm) {
        const row = refugeRow(this.world, tau);
        const spot = stationSpot(this.world, row);
        this.view?.puff(this.p.x, this.p.y + 0.4, 26, '#c084fc');
        this.view?.shake(2);
        this.p.x = spot.x;
        this.p.y = Math.max(spot.y, storm + 6);
        const over = this.alt() - this.best;
        if (over > 0) this.carried += over;
        this.station = Math.max(this.station, row);
        this.p.vx = 0;
        this.p.vy = 0;
        this.fuel = Math.max(0, this.fuel - CAUGHT_FUEL);
        this.caughtUntil = now + 900;
        this.shieldUntil = now + 2500;
        this.falls++;
        this.report?.({ act: 'caught' });
        this.on.caught?.();
        this.on.sound?.('caught');
    }

    // ---------- what to draw ----------

    scene(tau, now) {
        const p = this.p;
        const lo = this.cam.y - VIEW_HALF - 3;
        const hi = this.cam.y + VIEW_HALF + 3;
        const pieces = [];
        const first = Math.max(0, Math.floor(lo / BAND));
        const last = Math.max(0, Math.ceil(hi / BAND));
        for (let r = first; r <= last; r++) {
            for (const piece of rowAt(this.world, r)) {
                const key = `${piece.row}:${piece.i}`;
                if (piece.pickup) {
                    if (!this.taken.has(key)) pieces.push({ ...piece, px: piece.x });
                    continue;
                }
                const broke = this.broken.get(key);
                if (broke && tau - broke < 5) continue;
                pieces.push({
                    ...piece,
                    px: pieceX(piece, tau),
                    shaking: this.crumbling?.has(key) || false
                });
            }
        }

        // Classmates climbing near you
        const ghosts = [];
        if (this.data.settings?.ghosts !== false) {
            for (const [pid, text] of Object.entries(this.raw)) {
                if (pid === this.pid) continue;
                const who = this.data.players?.[pid];
                if (!who || who.kicked || !who.name) continue;
                const snap = decodeClimber(text);
                if (!snap) continue;
                let g = this.ghosts.get(pid);
                if (!g) {
                    g = { x: snap.x, y: snap.y };
                    this.ghosts.set(pid, g);
                }
                const drift = Math.min(0.6, Math.max(0, (now - snap.t) / 1000));
                const ty = snap.y + snap.vy * drift;
                g.x += (snap.x - g.x) * 0.25;
                g.y += (ty - g.y) * 0.25;
                if (g.y < lo - 2 || g.y > hi + 2) continue;
                ghosts.push({ id: pid, name: who.name, color: who.color, x: g.x, y: g.y, left: !!(snap.f & FLAG.left), boost: !!(snap.f & FLAG.boost) });
            }
            for (const pid of [...this.ghosts.keys()]) if (!(pid in this.raw)) this.ghosts.delete(pid);
        }

        return {
            tau,
            camera: this.cam,
            pieces,
            ghosts,
            me: {
                x: p.x, y: p.y, vy: p.vy, face: p.face, ground: p.ground,
                boost: this.held.jump && !p.ground && this.fuel > 0,
                answering: this.answering,
                caught: now < this.caughtUntil,
                shield: now < this.shieldUntil,
                boots: now < this.bootsUntil
            },
            storm: stormAt(this.world, tau),
            zone: zoneAt(this.cam.y),
            fuel: this.fuel,
            alt: this.alt(),
            best: this.best
        };
    }
}

const VIEW_HALF = 8.5;
// The camera catches up faster the faster you are moving
const dtSmooth = (vy) => (Math.abs(vy) > 9 ? 0.22 : 0.12);
