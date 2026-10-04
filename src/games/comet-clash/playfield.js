// Comet Clash playfield: one ship in the middle, answer asteroids drifting around it.
// Pure canvas + requestAnimationFrame; React only receives discrete events.
//
// Round kinds:
//   single -> blast the one correct asteroid
//   multi  -> blast every correct asteroid
//   order  -> blast the asteroids in their correct order (wrong order stuns you; the asteroid stays)

import { createRng } from './rng';
import { audio } from '../../platform/audio/audio';
import { t } from '../../i18n';

const TAU = Math.PI * 2;
const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
const SPEEDS = { calm: 0.65, normal: 1, fast: 1.4 };
const ordinal = (i) => (i < 6 ? t(`cc.ordinal.${i + 1}`) : t('cc.ordinalN', { n: i + 1 }));

const KEYS = {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    fire: ['Space', 'ArrowUp', 'KeyW', 'Enter']
};
const GAME_KEYS = new Set(['Space', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const removeAt = (arr, i) => {
    arr[i] = arr[arr.length - 1];
    arr.pop();
};

const makeRockPath = (r, rand) => {
    const path = new Path2D();
    const points = 11;
    for (let i = 0; i < points; i++) {
        const a = (i / points) * TAU;
        const rr = r * (0.84 + rand() * 0.2);
        if (i === 0) path.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else path.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    path.closePath();
    return path;
};

export class Playfield {
    constructor(canvas, { lowFx = false, sound = true, pauseOnBlur = false, onEvent = () => {} } = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.lowFx = lowFx;
        this.sound = sound;
        this.pauseOnBlur = pauseOnBlur;
        this.onEvent = onEvent;

        this.w = 0;
        this.h = 0;
        this.dpr = 1;
        this.scale = 1;
        this.stars = null;

        this.ship = { angle: -Math.PI / 2, cooldown: 0, stun: 0 };
        this.rocks = [];
        this.debris = [];
        this.bullets = [];
        this.particles = [];
        this.floaters = [];
        this.keys = new Set();

        this.round = null; // { kind, timeLimit, start, state: 'active'|'done', found, total, nextOrder, wrong, penalty }
        this.paused = false;
        this.raf = 0;
        this.running = false;
        this.last = 0;
        this.time = 0;
        this.perf = { acc: 0, frames: 0, warm: 0 };

        this.frame = this.frame.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
    }

    // ---------- lifecycle ----------

    mount() {
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('blur', this.handleBlur);
        this.canvas.addEventListener('pointerdown', this.handlePointerDown);
        this.canvas.addEventListener('pointermove', this.handlePointerMove);
        this.resize();
        this.wake();
        // Automated browser tests set this flag to find asteroid positions; the app never sets it
        if (window.__ORBIT_E2E__) window.__orbitField = this;
    }

    destroy() {
        this.running = false;
        cancelAnimationFrame(this.raf);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('blur', this.handleBlur);
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
        this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        const w = Math.max(1, Math.round(rect.width));
        const h = Math.max(1, Math.round(rect.height));
        const dpr = Math.min(window.devicePixelRatio || 1, this.lowFx ? 1 : 1.5);
        const sx = this.w ? w / this.w : 1;
        const sy = this.h ? h / this.h : 1;

        this.w = w;
        this.h = h;
        this.dpr = dpr;
        this.canvas.width = Math.round(w * dpr);
        this.canvas.height = Math.round(h * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.scale = clamp(Math.min(w, h) / 700, 0.55, 1.35);

        for (const list of [this.rocks, this.debris, this.bullets, this.particles, this.floaters]) {
            for (const o of list) {
                o.x *= sx;
                o.y *= sy;
            }
        }
        for (const rock of this.rocks) this.layoutRock(rock);
        this.buildStars();
        this.render();
    }

    // Keep the loop running only while something moves; an idle field costs nothing
    wake() {
        if (this.running || this.paused) return;
        this.running = true;
        this.last = performance.now();
        this.raf = requestAnimationFrame(this.frame);
    }

    setPaused(paused) {
        if (this.paused === paused) return;
        this.paused = paused;
        this.keys.clear();
        if (paused) {
            if (this.round?.state === 'active') this.round.pausedAt = performance.now();
            cancelAnimationFrame(this.raf);
            this.running = false;
            this.render();
        } else {
            if (this.round?.pausedAt) {
                this.round.start += performance.now() - this.round.pausedAt;
                this.round.pausedAt = 0;
            }
            this.wake();
        }
    }

    // ---------- rounds ----------

    startRound({ kind = 'single', options, timeLimitMs, seed, speed = 'normal', penalty = { stun: 1.5, timeCost: 0 } }) {
        const rand = createRng(seed);
        // A pending "fade the answers" from the previous round must never hit the new asteroids
        this.revealUntil = 0;
        this.rocks.length = 0;
        this.debris.length = 0;
        this.bullets.length = 0;
        this.ship.stun = 0;
        this.ship.cooldown = 0;

        const n = options.length;
        const base = rand() * TAU;
        const speedMul = SPEEDS[speed] || 1;
        const unit = Math.min(this.w, this.h);

        options.forEach((opt, i) => {
            const a = base + (i / n) * TAU + (rand() - 0.5) * 0.5;
            const dir = a + (Math.PI / 2) * (rand() < 0.5 ? 1 : -1) + (rand() - 0.5);
            const spd = (0.045 + rand() * 0.03) * unit * speedMul;
            const rock = {
                x: this.w / 2 + Math.cos(a) * this.w * 0.36,
                y: this.h / 2 + Math.sin(a) * this.h * 0.34,
                vx: Math.cos(dir) * spd,
                vy: Math.sin(dir) * spd,
                rot: rand() * TAU,
                spin: (rand() - 0.5),
                text: opt.text,
                correct: !!opt.correct,
                order: opt.order ?? null,
                appear: 0,
                dying: 0,
                reveal: false,
                flash: 0,
                shapeSeed: rand
            };
            this.layoutRock(rock);
            this.bounce(rock);
            this.rocks.push(rock);
        });

        const total = kind === 'single' ? 1 : options.filter(o => o.correct).length;
        this.round = {
            kind,
            timeLimit: timeLimitMs,
            start: performance.now(),
            pausedAt: 0,
            state: 'active',
            found: 0,
            total,
            nextOrder: 0,
            wrong: 0,
            penalty: { stun: 1.5, timeCost: 0, ...penalty },
            timePenaltyMs: 0
        };
        // Started while paused (e.g. a queued next round): the clock waits for resume
        if (this.paused) this.round.pausedAt = this.round.start;
        this.render();
        this.wake();
    }

    elapsed() {
        const r = this.round;
        if (!r) return 0;
        if (r.state !== 'active') return r.endElapsed ?? 0;
        const now = r.pausedAt || performance.now();
        return now - r.start + r.timePenaltyMs;
    }

    get active() {
        return this.round?.state === 'active';
    }

    // End the round from outside: 'reveal' shows the answers, 'rival' just clears the field
    stopRound(mode = 'reveal') {
        const r = this.round;
        if (!r) return;
        if (r.state === 'active') {
            r.endElapsed = this.elapsed();
            r.state = 'done';
        }
        if (mode === 'reveal') {
            for (const rock of this.rocks) if (!rock.dying && rock.correct) rock.reveal = true;
            this.revealUntil = this.time + 1.6;
        } else {
            this.dissolveRocks();
        }
        this.wake();
    }

    clear() {
        this.revealUntil = 0;
        this.dissolveRocks();
        this.bullets.length = 0;
        this.round = null;
        this.wake();
    }

    finishRound(type) {
        const r = this.round;
        if (!r || r.state !== 'active') return;
        r.endElapsed = this.elapsed();
        r.state = 'done';
        this.keys.clear();
        if (type === 'complete') {
            this.dissolveRocks();
            this.onEvent({ type: 'complete', t: Math.round(r.endElapsed), wrong: r.wrong });
        } else {
            for (const rock of this.rocks) if (!rock.dying && rock.correct) rock.reveal = true;
            this.revealUntil = this.time + 1.6;
            this.onEvent({ type: 'timeout', wrong: r.wrong });
        }
    }

    layoutRock(rock) {
        const ctx = this.ctx;
        const fontPx = Math.round(clamp(13 + 5 * this.scale, 13, 20));
        const maxWidth = 110 + 70 * this.scale;
        ctx.font = `700 ${fontPx}px ${FONT}`;

        const fit = (str) => {
            if (ctx.measureText(str).width <= maxWidth) return str;
            let s = str;
            while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
            return `${s.trimEnd()}…`;
        };

        let lines = [rock.text];
        if (ctx.measureText(rock.text).width > maxWidth) {
            const words = rock.text.split(/\s+/);
            let first = '';
            let i = 0;
            while (i < words.length) {
                const next = first ? `${first} ${words[i]}` : words[i];
                if (ctx.measureText(next).width > maxWidth && first) break;
                first = next;
                i++;
            }
            const rest = words.slice(i).join(' ');
            lines = rest ? [fit(first), fit(rest)] : [fit(first)];
        }

        const widest = Math.max(...lines.map(l => ctx.measureText(l).width));
        const minR = 30 + 16 * this.scale;
        const r = clamp(Math.max(minR, widest / 2 + 14, lines.length * fontPx * 0.75 + 16), minR, 70 + 45 * this.scale);
        rock.lines = lines;
        rock.fontPx = fontPx;
        if (rock.r !== r) {
            rock.r = r;
            rock.path = makeRockPath(r, rock.shapeSeed || Math.random);
        }
    }

    // ---------- loop ----------

    frame(now) {
        if (!this.running) return;
        let dt = (now - this.last) / 1000;
        this.last = now;
        if (dt < 0) dt = 0;

        this.watchPerformance(dt);
        dt = Math.min(dt, 1 / 20);
        this.time += dt;
        this.update(dt);
        this.render();

        // Idle: nothing moving and no round -> stop the loop until the next round
        const idle = !this.round?.state || (this.round.state === 'done' && this.rocks.length === 0);
        if (idle && this.particles.length === 0 && this.floaters.length === 0 && this.bullets.length === 0 && this.debris.length === 0) {
            this.running = false;
            return;
        }
        this.raf = requestAnimationFrame(this.frame);
    }

    watchPerformance(dt) {
        // Ignore giant frames (tab was hidden, device slept): they say nothing about speed
        if (this.lowFx || dt > 0.25) return;
        this.perf.warm += dt;
        if (this.perf.warm < 1) return;
        this.perf.acc += dt;
        this.perf.frames++;
        if (this.perf.acc >= 2) {
            const avg = this.perf.acc / this.perf.frames;
            this.perf.acc = 0;
            this.perf.frames = 0;
            if (avg > 1 / 40) {
                this.lowFx = true;
                this.resize();
            }
        }
    }

    update(dt) {
        const r = this.round;
        if (r?.state === 'active' && this.elapsed() >= r.timeLimit) this.finishRound('timeout');

        if (this.revealUntil && this.time >= this.revealUntil) {
            this.revealUntil = 0;
            this.dissolveRocks();
        }

        // Ship
        const ship = this.ship;
        ship.cooldown = Math.max(0, ship.cooldown - dt);
        ship.stun = Math.max(0, ship.stun - dt);
        if (ship.stun <= 0) {
            let turn = 0;
            if (KEYS.left.some(k => this.keys.has(k))) turn -= 1;
            if (KEYS.right.some(k => this.keys.has(k))) turn += 1;
            ship.angle += turn * 4.2 * dt;
        }

        this.updateRocks(dt);
        this.updateBullets(dt);
        this.updateEffects(dt);
    }

    updateRocks(dt) {
        const rocks = this.rocks;
        for (let i = rocks.length - 1; i >= 0; i--) {
            const rock = rocks[i];
            if (rock.dying) {
                rock.dying -= dt;
                if (rock.dying <= 0) removeAt(rocks, i);
                continue;
            }
            rock.appear = Math.min(1, rock.appear + dt * 3);
            rock.flash = Math.max(0, rock.flash - dt);
            rock.x += rock.vx * dt;
            rock.y += rock.vy * dt;
            rock.rot += rock.spin * dt;
        }

        // Answer rocks bounce off each other so labels never overlap
        for (let i = 0; i < rocks.length; i++) {
            const a = rocks[i];
            if (a.dying) continue;
            for (let j = i + 1; j < rocks.length; j++) {
                const b = rocks[j];
                if (b.dying) continue;
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const minDist = a.r + b.r;
                const distSq = dx * dx + dy * dy;
                if (distSq >= minDist * minDist || distSq === 0) continue;
                const dist = Math.sqrt(distSq);
                const nx = dx / dist;
                const ny = dy / dist;
                const overlap = (minDist - dist) / 2;
                a.x -= nx * overlap;
                a.y -= ny * overlap;
                b.x += nx * overlap;
                b.y += ny * overlap;
                const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
                if (rel < 0) {
                    a.vx += rel * nx;
                    a.vy += rel * ny;
                    b.vx -= rel * nx;
                    b.vy -= rel * ny;
                }
            }
        }

        // After the rock-to-rock pushes, so a push can never shove a rock off screen
        for (const rock of rocks) if (!rock.dying) this.bounce(rock);

        for (let i = this.debris.length - 1; i >= 0; i--) {
            const d = this.debris[i];
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.rot += d.spin * dt;
            d.life -= dt;
            if (d.life <= 0) {
                this.explode(d.x, d.y, '#64748b', 4);
                removeAt(this.debris, i);
                continue;
            }
            this.bounce(d);
        }
    }

    // Answers stay fully on screen: they bounce off the edges instead of leaving and coming back
    bounce(o) {
        const minX = Math.min(o.r, this.w / 2);
        const maxX = Math.max(this.w - o.r, this.w / 2);
        const minY = Math.min(o.r, this.h / 2);
        const maxY = Math.max(this.h - o.r, this.h / 2);
        if (o.x < minX) {
            o.x = minX;
            o.vx = Math.abs(o.vx);
        } else if (o.x > maxX) {
            o.x = maxX;
            o.vx = -Math.abs(o.vx);
        }
        if (o.y < minY) {
            o.y = minY;
            o.vy = Math.abs(o.vy);
        } else if (o.y > maxY) {
            o.y = maxY;
            o.vy = -Math.abs(o.vy);
        }
    }

    updateBullets(dt) {
        const bullets = this.bullets;
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
            if (b.life <= 0 || b.x < -10 || b.x > this.w + 10 || b.y < -10 || b.y > this.h + 10) {
                removeAt(bullets, i);
                continue;
            }
            if (this.round?.state !== 'active') continue;
            for (const rock of this.rocks) {
                if (rock.dying || rock.appear < 0.6) continue;
                const dx = rock.x - b.x;
                const dy = rock.y - b.y;
                if (dx * dx + dy * dy < rock.r * rock.r) {
                    removeAt(bullets, i);
                    this.hitRock(rock);
                    break;
                }
            }
        }
    }

    updateEffects(dt) {
        const ps = this.particles;
        for (let i = ps.length - 1; i >= 0; i--) {
            const p = ps[i];
            p.life -= dt;
            if (p.life <= 0) {
                removeAt(ps, i);
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.98;
            p.vy *= 0.98;
        }
        const fs = this.floaters;
        for (let i = fs.length - 1; i >= 0; i--) {
            const f = fs[i];
            f.life -= dt;
            f.y -= 24 * dt;
            if (f.life <= 0) removeAt(fs, i);
        }
    }

    // ---------- actions ----------

    fire() {
        const ship = this.ship;
        if (ship.cooldown > 0 || ship.stun > 0 || this.paused) return;
        if (this.bullets.length >= 6) return;
        ship.cooldown = 0.16;
        const speed = 560 * this.scale + 80;
        const nose = 18 * this.scale + 4;
        const cx = this.w / 2;
        const cy = this.h / 2;
        this.bullets.push({
            x: cx + Math.cos(ship.angle) * nose,
            y: cy + Math.sin(ship.angle) * nose,
            vx: Math.cos(ship.angle) * speed,
            vy: Math.sin(ship.angle) * speed,
            life: 1.4
        });
        this.play('shoot');
        this.wake();
    }

    hitRock(rock) {
        const r = this.round;
        const isRight = r.kind === 'order' ? rock.order === r.nextOrder : rock.correct;

        if (isRight) {
            this.explode(rock.x, rock.y, '#34d399', 22);
            rock.dying = 0.001;
            r.found++;
            if (r.kind === 'order') {
                this.addFloater(rock.x, rock.y, `${ordinal(r.nextOrder)} ✓`, '#34d399', 1.1);
                r.nextOrder++;
            } else if (r.kind === 'multi') {
                this.addFloater(rock.x, rock.y, `✓ ${r.found}/${r.total}`, '#34d399', 1.1);
            }
            if (r.found >= r.total) {
                this.play('correct');
                this.addFloater(rock.x, rock.y - rock.r - 12, `✓ ${rock.text}`, '#ffffff', 1.1);
                this.finishRound('complete');
            } else {
                this.play('hit');
                this.onEvent({ type: 'progress', found: r.found, total: r.total });
            }
            return;
        }

        // Wrong
        r.wrong++;
        this.play('wrong');
        if (r.kind === 'order' && rock.correct) {
            // Right item, wrong moment: it stays, but you pay for the mistake
            rock.flash = 0.6;
            this.addFloater(rock.x, rock.y, t('cc.notYet'), '#fbbf24', 0.9);
        } else {
            this.splitRock(rock);
            this.addFloater(rock.x, rock.y, '✗', '#f87171', 0.9, 1.4);
        }

        const penalty = r.penalty;
        if (penalty.stun > 0) {
            this.ship.stun = penalty.stun;
            this.play('stun');
        }
        if (penalty.timeCost > 0) r.timePenaltyMs += penalty.timeCost * 1000;
        this.onEvent({ type: 'wrong', text: rock.text, wrong: r.wrong, stun: penalty.stun });
    }

    splitRock(rock) {
        this.explode(rock.x, rock.y, '#f87171', 16);
        rock.dying = 0.001;
        if (this.debris.length > 10) return;
        const speed = Math.hypot(rock.vx, rock.vy) * 1.6 + 30 * this.scale;
        for (let i = 0; i < 2; i++) {
            const a = Math.random() * TAU;
            const r = rock.r * 0.36;
            this.debris.push({
                x: rock.x + Math.cos(a) * r,
                y: rock.y + Math.sin(a) * r,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed,
                r,
                rot: Math.random() * TAU,
                spin: (Math.random() - 0.5) * 4,
                path: makeRockPath(r, Math.random),
                life: 2 + Math.random()
            });
        }
    }

    dissolveRocks() {
        for (const rock of this.rocks) if (!rock.dying) rock.dying = 0.35;
    }

    explode(x, y, color, count) {
        const cap = this.lowFx ? 60 : 200;
        const n = Math.round(count * (this.lowFx ? 0.4 : 1));
        for (let i = 0; i < n && this.particles.length < cap; i++) {
            const a = Math.random() * TAU;
            const s = (40 + Math.random() * 150) * this.scale;
            const life = 0.35 + Math.random() * 0.45;
            this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, size: 1.5 + Math.random() * 1.7 });
        }
    }

    addFloater(x, y, text, color, life = 1, size = 1) {
        this.floaters.push({ x, y, text, color, life, max: life, size });
    }

    play(name) {
        if (this.sound) audio.sfx(name);
    }

    // ---------- input ----------

    handleKeyDown(e) {
        if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]')) return;
        if (this.paused) return;
        if (GAME_KEYS.has(e.code)) e.preventDefault();
        if (!e.repeat && KEYS.fire.includes(e.code)) this.fire();
        this.keys.add(e.code);
        this.wake();
    }

    handleKeyUp(e) {
        this.keys.delete(e.code);
        if (!this.paused && GAME_KEYS.has(e.code)) e.preventDefault();
    }

    pointerAngle(e) {
        const rect = this.canvas.getBoundingClientRect();
        return Math.atan2(e.clientY - rect.top - this.h / 2, e.clientX - rect.left - this.w / 2);
    }

    handlePointerDown(e) {
        if (this.paused) return;
        e.preventDefault();
        audio.unlock();
        this.ship.angle = this.pointerAngle(e);
        this.fire();
    }

    handlePointerMove(e) {
        if (this.paused || e.pointerType !== 'mouse' || this.ship.stun > 0) return;
        this.ship.angle = this.pointerAngle(e);
        if (!this.running) this.render();
    }

    handleBlur() {
        this.keys.clear();
        if (this.pauseOnBlur) {
            this.setPaused(true);
            this.onEvent({ type: 'autopause' });
        }
    }

    // ---------- render ----------

    buildStars() {
        const off = document.createElement('canvas');
        off.width = this.canvas.width;
        off.height = this.canvas.height;
        const c = off.getContext('2d');
        c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        const g = c.createRadialGradient(this.w / 2, this.h / 2, 0, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
        g.addColorStop(0, '#0d1633');
        g.addColorStop(1, '#040714');
        c.fillStyle = g;
        c.fillRect(0, 0, this.w, this.h);
        const count = Math.min(220, Math.round((this.w * this.h) / 4500));
        for (let i = 0; i < count; i++) {
            const size = Math.random() < 0.9 ? 0.5 + Math.random() * 0.7 : 1.3 + Math.random() * 0.7;
            c.globalAlpha = 0.25 + Math.random() * 0.65;
            c.fillStyle = Math.random() < 0.15 ? '#a5b4fc' : '#ffffff';
            c.fillRect(Math.random() * this.w, Math.random() * this.h, size, size);
        }
        c.globalAlpha = 1;
        this.stars = off;
    }

    render() {
        const ctx = this.ctx;
        const s = this.scale;
        if (this.stars) ctx.drawImage(this.stars, 0, 0, this.w, this.h);
        else {
            ctx.fillStyle = '#040714';
            ctx.fillRect(0, 0, this.w, this.h);
        }

        // Timer bar
        const r = this.round;
        if (r && r.state === 'active') {
            const frac = clamp(1 - this.elapsed() / r.timeLimit, 0, 1);
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(0, 0, this.w, 4);
            ctx.fillStyle = frac > 0.5 ? '#34d399' : frac > 0.25 ? '#fbbf24' : '#f87171';
            ctx.fillRect(0, 0, this.w * frac, 4);
        }

        // Debris
        ctx.lineWidth = 1.5;
        for (const d of this.debris) {
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.rot);
            ctx.globalAlpha = Math.min(1, d.life);
            ctx.fillStyle = '#334155';
            ctx.strokeStyle = '#f87171';
            ctx.fill(d.path);
            ctx.stroke(d.path);
            ctx.restore();
        }
        ctx.globalAlpha = 1;

        // Answer rocks
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 8);
        for (const rock of this.rocks) {
            const fade = rock.dying ? clamp(rock.dying / 0.35, 0, 1) : 1;
            const grow = 0.6 + 0.4 * rock.appear;
            ctx.globalAlpha = fade * rock.appear;
            ctx.save();
            ctx.translate(rock.x, rock.y);
            ctx.scale(grow, grow);
            ctx.rotate(rock.rot);
            ctx.fillStyle = rock.reveal ? '#064e3b' : rock.flash > 0 ? '#451a03' : '#1e293b';
            ctx.fill(rock.path);
            if (rock.reveal) {
                ctx.lineWidth = 8;
                ctx.strokeStyle = `rgba(52,211,153,${0.25 + 0.3 * pulse})`;
                ctx.stroke(rock.path);
            }
            ctx.lineWidth = 2;
            ctx.strokeStyle = rock.reveal ? '#34d399' : rock.flash > 0 ? '#fbbf24' : '#64748b';
            ctx.stroke(rock.path);
            ctx.restore();

            ctx.fillStyle = '#f8fafc';
            ctx.font = `700 ${Math.round(rock.fontPx * grow)}px ${FONT}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const lh = rock.fontPx * 1.15 * grow;
            const top = rock.y - ((rock.lines.length - 1) * lh) / 2;
            rock.lines.forEach((line, i) => ctx.fillText(line, rock.x, top + i * lh));
        }
        ctx.globalAlpha = 1;

        // Bullets
        ctx.fillStyle = '#6ee7b7';
        for (const b of this.bullets) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 3 * s + 1, 0, TAU);
            ctx.fill();
        }

        this.drawShip();

        // Particles
        for (const p of this.particles) {
            ctx.globalAlpha = p.life / p.max;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;

        // Floating texts
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const f of this.floaters) {
            ctx.globalAlpha = clamp((f.life / f.max) * 1.5, 0, 1);
            ctx.font = `800 ${Math.round((15 + 5 * s) * f.size)}px ${FONT}`;
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(4,7,20,0.85)';
            ctx.strokeText(f.text, f.x, f.y);
            ctx.fillStyle = f.color;
            ctx.fillText(f.text, f.x, f.y);
        }
        ctx.globalAlpha = 1;
    }

    drawShip() {
        const ctx = this.ctx;
        const ship = this.ship;
        const size = 16 * this.scale + 5;
        const cx = this.w / 2;
        const cy = this.h / 2;
        const stunned = ship.stun > 0;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = stunned ? 'rgba(251,191,36,0.6)' : 'rgba(148,163,184,0.18)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.7, 0, TAU);
        ctx.stroke();

        ctx.rotate(ship.angle);
        ctx.beginPath();
        ctx.moveTo(size * 1.1, 0);
        ctx.lineTo(-size * 0.75, size * 0.7);
        ctx.lineTo(-size * 0.4, 0);
        ctx.lineTo(-size * 0.75, -size * 0.7);
        ctx.closePath();
        ctx.fillStyle = stunned ? '#475569' : '#34d399';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#f8fafc';
        ctx.stroke();
        ctx.restore();

        if (stunned) {
            ctx.fillStyle = '#fbbf24';
            ctx.font = `800 ${Math.round(12 + 3 * this.scale)}px ${FONT}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(t('cc.stunned', { s: ship.stun.toFixed(1) }), cx, cy + size * 2.6);
        }
    }
}
