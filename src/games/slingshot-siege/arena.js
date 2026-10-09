// Slingshot Siege arena on a canvas: the sun, the orbiting team planets with their shields, the moon,
// power stars and the flying comets. Full size on the teacher's screen; the aiming view on student
// devices (with an aim arrow and a preview of the first second of flight).
// Planets and the moon follow the shared game clock, so every screen shows them in the same place.

import { ARENA, CENTER, SUN_R, PLANET_R, COMET_R, MEGA_R, STAR_R, SLING_R, MOON, SAMPLE_MS, PREVIEW_STEPS, planetPos, moonPos, simulate, worldOf } from './physics';
import { teamOf } from './teams';

const TAU = Math.PI * 2;
const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
const TRAIL = 14; // samples of trail behind each comet
export const STAR_STYLE = {
    triple: { color: '#fde047', label: '×3' },
    mega: { color: '#fb923c', label: 'MEGA' },
    shield: { color: '#38bdf8', label: '+30' }
};

const removeAt = (arr, i) => {
    arr[i] = arr[arr.length - 1];
    arr.pop();
};

const starPath = (ctx, x, y, outer, inner, rot) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const r = i % 2 ? inner : outer;
        const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
};

// Planet wakes: [share of the wake's length, width (× planet radius), opacity]
const WAKE_LAYERS = [[1, 0.9, 0.14], [0.6, 0.6, 0.22], [0.3, 0.32, 0.42]];

export class ArenaView {
    // world: from worldOf() in physics; timeFn(): game time in seconds; myTeam: the student's own team (aiming view)
    constructor(canvas, { lowFx = false, myTeam = null, world, timeFn = () => 0 } = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.lowFx = lowFx;
        this.myTeam = myTeam;
        this.world = world || worldOf(2, { orbit: 'still', moon: false });
        this.timeFn = timeFn;
        this.teams = {};
        this.stars = [];
        this.leader = null;
        this.aimSource = null;
        this.comets = [];
        this.particles = [];
        this.rings = [];
        this.floaters = [];
        this.flashes = {}; // team -> animation time of the last hit
        this.w = 0;
        this.h = 0;
        this.scale = 1;
        this.time = 0;
        this.running = false;
        this.raf = 0;
        this.last = 0;
        this.skip = false;
        this.frame = this.frame.bind(this);
    }

    mount() {
        this.resize();
        this.running = true;
        this.last = performance.now();
        this.raf = requestAnimationFrame(this.frame);
    }

    destroy() {
        this.running = false;
        cancelAnimationFrame(this.raf);
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.w = Math.max(1, Math.round(rect.width));
        this.h = Math.max(1, Math.round(rect.height));
        this.dpr = Math.min(window.devicePixelRatio || 1, this.lowFx ? 1 : 1.5);
        this.canvas.width = Math.round(this.w * this.dpr);
        this.canvas.height = Math.round(this.h * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.scale = (Math.min(this.w, this.h) / ARENA) * 0.97;
        this.ox = (this.w - ARENA * this.scale) / 2;
        this.oy = (this.h - ARENA * this.scale) / 2;
        this.buildBackground();
        this.buildSprites();
        this.render();
    }

    // World (0..1000) <-> screen pixels
    sx(x) { return this.ox + x * this.scale; }
    sy(y) { return this.oy + y * this.scale; }
    toWorld(px, py) { return { x: (px - this.ox) / this.scale, y: (py - this.oy) / this.scale }; }

    setWorld(world) {
        const changed = world.teams !== this.world.teams || world.moon !== this.world.moon || world.orbit !== this.world.orbit;
        this.world = world;
        if (changed && this.w) {
            this.buildBackground();
            this.buildSprites();
        }
    }

    setTeams(teams) { this.teams = teams || {}; }
    setStars(stars) { this.stars = Object.entries(stars || {}).map(([id, s]) => ({ id, ...s })); }
    setLeader(team) { this.leader = Number.isInteger(team) ? team : null; }
    // fn() -> { dx, dy, p, t, mega } for the aim preview, or null to hide it
    setAimSource(fn) { this.aimSource = fn; }

    // elapsed: how much of the flight already happened before it reached this screen (ms)
    addComet({ team, flight, fire = false, mega = false, elapsed = 0, onLand }) {
        this.comets.push({ team, path: flight.path, end: flight.end, target: flight.target, fire, mega, start: performance.now() - Math.max(0, elapsed), onLand });
    }

    floater(x, y, text, color = '#ffffff', size = 1) {
        this.floaters.push({ x, y, text, color, size, life: 1.6, max: 1.6 });
    }

    // A burst where a power star was grabbed
    sparkle(x, y, color) {
        this.burst(x, y, color, 22);
        this.rings.push({ x, y, life: 0.5, max: 0.5, color, small: true });
    }

    // ---------- loop ----------

    frame(now) {
        if (!this.running) return;
        this.raf = requestAnimationFrame(this.frame);
        // Low-end devices draw every other frame (30 fps is plenty for orbiting planets)
        if (this.lowFx) {
            this.skip = !this.skip;
            if (this.skip) return;
        }
        const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
        this.last = now;
        this.time += dt;
        this.update(now, dt);
        this.render(now);
    }

    update(now, dt) {
        for (let i = this.comets.length - 1; i >= 0; i--) {
            const c = this.comets[i];
            if ((now - c.start) / SAMPLE_MS >= c.path.length / 2 - 1) {
                this.landEffects(c);
                removeAt(this.comets, i);
                c.onLand?.(c);
            }
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                removeAt(this.particles, i);
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.97;
            p.vy *= 0.97;
        }
        for (let i = this.rings.length - 1; i >= 0; i--) {
            this.rings[i].life -= dt;
            if (this.rings[i].life <= 0) removeAt(this.rings, i);
        }
        for (let i = this.floaters.length - 1; i >= 0; i--) {
            const f = this.floaters[i];
            f.life -= dt;
            f.y -= 30 * dt;
            if (f.life <= 0) removeAt(this.floaters, i);
        }
    }

    landEffects(c) {
        const n = c.path.length;
        const x = c.path[n - 2];
        const y = c.path[n - 1];
        const color = c.fire ? '#fb923c' : teamOf(c.team).color;
        if (c.end === 'hit') {
            this.burst(x, y, color, c.mega ? 40 : 26);
            this.burst(x, y, '#ffffff', 8);
            this.rings.push({ x, y, life: 0.6, max: 0.6, color });
            if (Number.isInteger(c.target)) this.flashes[c.target] = this.time;
        } else if (c.end === 'sun') {
            this.burst(x, y, '#fb923c', 16);
        } else if (c.end === 'moon') {
            this.burst(x, y, '#cbd5e1', 18);
        }
    }

    burst(x, y, color, count) {
        const cap = this.lowFx ? 70 : 240;
        const n = Math.round(count * (this.lowFx ? 0.4 : 1));
        for (let i = 0; i < n && this.particles.length < cap; i++) {
            const a = Math.random() * TAU;
            const s = 40 + Math.random() * 160;
            const life = 0.4 + Math.random() * 0.5;
            this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, size: 2 + Math.random() * 2.5 });
        }
    }

    // ---------- cached layers ----------

    buildBackground() {
        const off = document.createElement('canvas');
        off.width = this.canvas.width;
        off.height = this.canvas.height;
        const c = off.getContext('2d');
        c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        const cx = this.sx(CENTER);
        const cy = this.sy(CENTER);
        const s = this.scale;

        const bg = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(this.w, this.h) * 0.75);
        bg.addColorStop(0, '#16123a');
        bg.addColorStop(0.45, '#0a0f2c');
        bg.addColorStop(1, '#040714');
        c.fillStyle = bg;
        c.fillRect(0, 0, this.w, this.h);

        const count = Math.min(260, Math.round((this.w * this.h) / 4200));
        for (let i = 0; i < count; i++) {
            const size = Math.random() < 0.9 ? 0.5 + Math.random() * 0.7 : 1.3 + Math.random() * 0.7;
            c.globalAlpha = 0.2 + Math.random() * 0.6;
            c.fillStyle = Math.random() < 0.15 ? '#c4b5fd' : '#ffffff';
            c.fillRect(Math.random() * this.w, Math.random() * this.h, size, size);
        }
        c.globalAlpha = 1;

        // The planets' orbit (Wild planets roam, so they have none), the moon's orbit and the golden slingshot zone
        c.lineWidth = Math.max(1, 1.2 * s);
        c.setLineDash([2 * s + 1, 8 * s + 3]);
        if (this.world.rMin === this.world.rMax) {
            c.strokeStyle = 'rgba(148, 163, 255, 0.22)';
            c.beginPath();
            c.arc(cx, cy, this.world.ring * s, 0, TAU);
            c.stroke();
        }
        if (this.world.moon) {
            c.strokeStyle = 'rgba(203, 213, 225, 0.16)';
            c.beginPath();
            c.arc(cx, cy, MOON.orbit * s, 0, TAU);
            c.stroke();
        }
        c.setLineDash([4 * s + 2, 7 * s + 3]);
        c.strokeStyle = 'rgba(251, 191, 36, 0.28)';
        c.lineWidth = Math.max(1, 1.5 * s);
        c.beginPath();
        c.arc(cx, cy, SLING_R * s, 0, TAU);
        c.stroke();
        c.setLineDash([]);

        // The sun: glow, then a hot core
        const glow = c.createRadialGradient(cx, cy, SUN_R * s * 0.6, cx, cy, SUN_R * s * 2.6);
        glow.addColorStop(0, 'rgba(251, 146, 60, 0.55)');
        glow.addColorStop(0.5, 'rgba(234, 88, 12, 0.18)');
        glow.addColorStop(1, 'rgba(234, 88, 12, 0)');
        c.fillStyle = glow;
        c.beginPath();
        c.arc(cx, cy, SUN_R * s * 2.6, 0, TAU);
        c.fill();
        const core = c.createRadialGradient(cx - SUN_R * s * 0.25, cy - SUN_R * s * 0.25, SUN_R * s * 0.1, cx, cy, SUN_R * s);
        core.addColorStop(0, '#fffbeb');
        core.addColorStop(0.35, '#fde047');
        core.addColorStop(0.8, '#f97316');
        core.addColorStop(1, '#ea580c');
        c.fillStyle = core;
        c.beginPath();
        c.arc(cx, cy, SUN_R * s, 0, TAU);
        c.fill();
        this.bg = off;
    }

    // Small canvases for the team planets and the moon, redrawn only on resize or a new world
    buildSprites() {
        const ball = (r, paint) => {
            const size = Math.ceil(r * 2 + 4);
            const off = document.createElement('canvas');
            off.width = Math.ceil(size * this.dpr);
            off.height = Math.ceil(size * this.dpr);
            const c = off.getContext('2d');
            c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            const m = size / 2;
            paint(c, m, r);
            const shade = c.createRadialGradient(m - r * 0.4, m - r * 0.45, r * 0.1, m, m, r);
            shade.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
            shade.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
            shade.addColorStop(1, 'rgba(2, 6, 23, 0.55)');
            c.fillStyle = shade;
            c.beginPath();
            c.arc(m, m, r, 0, TAU);
            c.fill();
            return { canvas: off, size };
        };
        const pr = PLANET_R * this.scale;
        this.planetSprites = Array.from({ length: this.world.teams }, (_, i) => ball(pr, (c, m, r) => {
            c.fillStyle = teamOf(i).color;
            c.beginPath();
            c.arc(m, m, r, 0, TAU);
            c.fill();
            c.save();
            c.beginPath();
            c.arc(m, m, r, 0, TAU);
            c.clip();
            c.fillStyle = 'rgba(255, 255, 255, 0.16)';
            c.fillRect(m - r, m - r * 0.35, r * 2, r * 0.22);
            c.fillStyle = 'rgba(0, 0, 0, 0.12)';
            c.fillRect(m - r, m + r * 0.18, r * 2, r * 0.18);
            c.restore();
        }));
        this.moonSprite = ball(MOON.r * this.scale, (c, m, r) => {
            c.fillStyle = '#cbd5e1';
            c.beginPath();
            c.arc(m, m, r, 0, TAU);
            c.fill();
            c.fillStyle = 'rgba(100, 116, 139, 0.55)';
            for (const [dx, dy, k] of [[-0.35, -0.2, 0.22], [0.3, 0.25, 0.28], [0.1, -0.45, 0.14], [-0.2, 0.45, 0.12]]) {
                c.beginPath();
                c.arc(m + dx * r, m + dy * r, k * r, 0, TAU);
                c.fill();
            }
        });
    }

    // ---------- drawing ----------

    render(now = performance.now()) {
        const ctx = this.ctx;
        const s = this.scale;
        const tau = this.timeFn();
        if (this.bg) ctx.drawImage(this.bg, 0, 0, this.w, this.h);

        if (!this.lowFx) {
            ctx.globalAlpha = 0.16 + 0.1 * Math.sin(this.time * 3);
            ctx.fillStyle = '#fdba74';
            ctx.beginPath();
            ctx.arc(this.sx(CENTER), this.sy(CENTER), SUN_R * s * (1.15 + 0.05 * Math.sin(this.time * 2)), 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        this.drawStars(tau);
        if (this.world.moon && this.moonSprite) {
            const m = moonPos(tau);
            const sp = this.moonSprite;
            ctx.drawImage(sp.canvas, this.sx(m.x) - sp.size / 2, this.sy(m.y) - sp.size / 2, sp.size, sp.size);
        }
        this.drawWakes(tau);
        for (let i = 0; i < this.world.teams; i++) this.drawPlanet(i, tau);
        if (this.aimSource && this.myTeam !== null) this.drawAim(tau);

        // Comets: a fading trail, then a glowing head
        for (const c of this.comets) {
            const points = c.path.length / 2;
            const f = Math.min(points - 1, Math.max(0, (now - c.start) / SAMPLE_MS));
            const idx = Math.floor(f);
            const frac = f - idx;
            const nx = idx + 1 < points ? idx + 1 : idx;
            const hx = c.path[idx * 2] + (c.path[nx * 2] - c.path[idx * 2]) * frac;
            const hy = c.path[idx * 2 + 1] + (c.path[nx * 2 + 1] - c.path[idx * 2 + 1]) * frac;
            const color = c.fire ? '#fb923c' : teamOf(c.team).color;
            const r = c.mega ? MEGA_R : COMET_R;
            ctx.lineCap = 'round';
            let px = hx;
            let py = hy;
            for (let k = 0; k < TRAIL && idx - k >= 0; k++) {
                const tx = c.path[(idx - k) * 2];
                const ty = c.path[(idx - k) * 2 + 1];
                ctx.globalAlpha = 0.65 * (1 - k / TRAIL);
                ctx.strokeStyle = c.fire && k % 3 === 1 ? '#fde047' : color;
                ctx.lineWidth = Math.max(1, (r * 1.4 - k * (r / 13)) * s);
                ctx.beginPath();
                ctx.moveTo(this.sx(px), this.sy(py));
                ctx.lineTo(this.sx(tx), this.sy(ty));
                ctx.stroke();
                px = tx;
                py = ty;
            }
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(this.sx(hx), this.sy(hy), r * s * 2.2, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = c.fire ? '#fef3c7' : '#ffffff';
            ctx.beginPath();
            ctx.arc(this.sx(hx), this.sy(hy), Math.max(2, r * s), 0, TAU);
            ctx.fill();
        }

        for (const r of this.rings) {
            const k = 1 - r.life / r.max;
            ctx.globalAlpha = 1 - k;
            ctx.strokeStyle = r.color;
            ctx.lineWidth = Math.max(1, 4 * s);
            ctx.beginPath();
            ctx.arc(this.sx(r.x), this.sy(r.y), ((r.small ? STAR_R : PLANET_R) + (r.small ? 40 : 70) * k) * s, 0, TAU);
            ctx.stroke();
        }
        for (const p of this.particles) {
            ctx.globalAlpha = p.life / p.max;
            ctx.fillStyle = p.color;
            const size = Math.max(1.5, p.size * s * 1.6);
            ctx.fillRect(this.sx(p.x) - size / 2, this.sy(p.y) - size / 2, size, size);
        }
        ctx.globalAlpha = 1;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const f of this.floaters) {
            ctx.globalAlpha = Math.min(1, (f.life / f.max) * 1.6);
            ctx.font = `900 ${Math.round(Math.max(14, 34 * s) * f.size)}px ${FONT}`;
            ctx.lineWidth = Math.max(3, 6 * s);
            ctx.strokeStyle = 'rgba(4, 7, 20, 0.85)';
            ctx.strokeText(f.text, this.sx(f.x), this.sy(f.y));
            ctx.fillStyle = f.color;
            ctx.fillText(f.text, this.sx(f.x), this.sy(f.y));
        }
        ctx.globalAlpha = 1;
    }

    drawStars(tau) {
        if (!this.stars.length) return;
        const ctx = this.ctx;
        const s = this.scale;
        const ms = tau * 1000;
        for (const star of this.stars) {
            const style = STAR_STYLE[star.kind] || STAR_STYLE.triple;
            const left = star.until - ms;
            // Blink during the last 3 seconds
            if (left < 3000 && Math.floor(ms / 200) % 2 === 0) continue;
            const x = this.sx(star.x);
            const y = this.sy(star.y);
            const r = STAR_R * s * (1 + 0.08 * Math.sin(this.time * 5));
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = style.color;
            ctx.beginPath();
            ctx.arc(x, y, r * 1.8, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
            starPath(ctx, x, y, r, r * 0.45, this.time * 0.8);
            ctx.fillStyle = style.color;
            ctx.fill();
            ctx.lineWidth = Math.max(1, 1.5 * s);
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
            ctx.font = `900 ${Math.round(Math.max(10, 20 * s))}px ${FONT}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(4, 7, 20, 0.9)';
            ctx.strokeText(style.label, x, y + r + 3 * s);
            ctx.fillStyle = style.color;
            ctx.fillText(style.label, x, y + r + 3 * s);
        }
    }

    // A wake behind each planet shows which way and how fast it is moving
    drawWakes(tau) {
        if (!this.world.spin && !this.world.swing) return;
        const ctx = this.ctx;
        const s = this.scale;
        const steps = this.lowFx ? 8 : 16;
        const span = 4; // seconds of wake
        const pts = new Array((steps + 1) * 2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 0; i < this.world.teams; i++) {
            for (let k = 0; k <= steps; k++) {
                const p = planetPos(this.world, i, tau - (span * k) / steps);
                pts[k * 2] = this.sx(p.x);
                pts[k * 2 + 1] = this.sy(p.y);
            }
            ctx.strokeStyle = teamOf(i).color;
            // Each layer shorter, narrower and brighter: the wake tapers away from the planet
            for (const [part, width, alpha] of WAKE_LAYERS) {
                const n = Math.max(2, Math.round(steps * part));
                ctx.globalAlpha = alpha;
                ctx.lineWidth = Math.max(1.5, PLANET_R * width * s);
                ctx.beginPath();
                ctx.moveTo(pts[0], pts[1]);
                for (let k = 1; k <= n; k++) ctx.lineTo(pts[k * 2], pts[k * 2 + 1]);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    }

    drawPlanet(i, tau) {
        const ctx = this.ctx;
        const s = this.scale;
        const pos = planetPos(this.world, i, tau);
        const x = this.sx(pos.x);
        const y = this.sy(pos.y);
        const r = PLANET_R * s;
        const team = teamOf(i);
        const shield = Math.max(0, Math.min(100, this.teams?.[i]?.shield ?? 100));
        const sprite = this.planetSprites?.[i];
        if (sprite) ctx.drawImage(sprite.canvas, x - sprite.size / 2, y - sprite.size / 2, sprite.size, sprite.size);

        // Shield: a faint full ring, the charged part bright
        const sr = r + 9 * s;
        ctx.lineWidth = Math.max(2, 5 * s);
        ctx.lineCap = 'round';
        if (shield > 0) {
            ctx.strokeStyle = team.color;
            ctx.globalAlpha = 0.18;
            ctx.beginPath();
            ctx.arc(x, y, sr, 0, TAU);
            ctx.stroke();
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            ctx.arc(x, y, sr, -Math.PI / 2, -Math.PI / 2 + TAU * (shield / 100));
            ctx.stroke();
        } else {
            // Shield down: a broken red ring
            ctx.strokeStyle = '#f87171';
            ctx.globalAlpha = 0.8;
            ctx.setLineDash([3 * s + 1, 6 * s + 2]);
            ctx.beginPath();
            ctx.arc(x, y, sr, 0, TAU);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.globalAlpha = 1;

        const since = this.time - (this.flashes[i] ?? -10);
        if (since < 0.35) {
            ctx.globalAlpha = 1 - since / 0.35;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, r, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        if (i === this.myTeam) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.lineWidth = Math.max(1.5, 2 * s);
            ctx.setLineDash([5 * s + 2, 5 * s + 2]);
            ctx.beginPath();
            ctx.arc(x, y, sr + 9 * s, 0, TAU);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // The leader carries a bounty: a crown above the planet
        if (i === this.leader) {
            const cw = 30 * s + 6;
            const ch = 20 * s + 4;
            const cx = x;
            const top = y - sr - 10 * s - ch;
            ctx.fillStyle = '#fbbf24';
            ctx.strokeStyle = 'rgba(4, 7, 20, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - cw / 2, top + ch);
            ctx.lineTo(cx - cw / 2, top + ch * 0.25);
            ctx.lineTo(cx - cw / 4, top + ch * 0.6);
            ctx.lineTo(cx, top);
            ctx.lineTo(cx + cw / 4, top + ch * 0.6);
            ctx.lineTo(cx + cw / 2, top + ch * 0.25);
            ctx.lineTo(cx + cw / 2, top + ch);
            ctx.closePath();
            ctx.stroke();
            ctx.fill();
            ctx.font = `900 ${Math.round(Math.max(10, 18 * s))}px ${FONT}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 3;
            ctx.strokeText('+5', cx + cw / 2 + 4, top + ch / 2);
            ctx.fillText('+5', cx + cw / 2 + 4, top + ch / 2);
        }

        // Name and shield under the planet
        const fontPx = Math.round(Math.max(11, 24 * s));
        ctx.font = `800 ${fontPx}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const ly = y + sr + 8 * s;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(4, 7, 20, 0.85)';
        const label = `${team.name} · ${Math.round(shield)}%`;
        ctx.strokeText(label, x, ly);
        ctx.fillStyle = shield > 0 ? '#f8fafc' : '#fca5a5';
        ctx.fillText(label, x, ly);
    }

    drawAim(tau) {
        const aim = this.aimSource();
        if (!aim) return;
        const ctx = this.ctx;
        const s = this.scale;
        const from = planetPos(this.world, this.myTeam, tau);
        const color = teamOf(this.myTeam).color;
        const cometR = aim.mega ? MEGA_R : COMET_R;
        const start = PLANET_R + cometR + 2;
        const len = 30 + 70 * aim.p;

        // Preview of the first second, with the planets and moon where they will be
        const preview = simulate(this.world, { team: this.myTeam, dx: aim.dx, dy: aim.dy, p: aim.p, t: tau * 1000, mega: aim.mega }, { maxSteps: PREVIEW_STEPS }).path;
        ctx.fillStyle = aim.fire ? '#fdba74' : '#ffffff';
        const pts = preview.length / 2;
        for (let k = 2; k < pts; k += 2) {
            ctx.globalAlpha = 0.95 * (1 - k / pts) + 0.05;
            ctx.beginPath();
            ctx.arc(this.sx(preview[k * 2]), this.sy(preview[k * 2 + 1]), Math.max(2, (aim.mega ? 6 : 4) * s), 0, TAU);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        const x1 = this.sx(from.x + aim.dx * start);
        const y1 = this.sy(from.y + aim.dy * start);
        const x2 = this.sx(from.x + aim.dx * (start + len));
        const y2 = this.sy(from.y + aim.dy * (start + len));
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(3, 7 * s);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        const head = Math.max(8, 18 * s);
        const a = Math.atan2(aim.dy, aim.dx);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x2 + Math.cos(a) * head, y2 + Math.sin(a) * head);
        ctx.lineTo(x2 + Math.cos(a + 2.4) * head, y2 + Math.sin(a + 2.4) * head);
        ctx.lineTo(x2 + Math.cos(a - 2.4) * head, y2 + Math.sin(a - 2.4) * head);
        ctx.closePath();
        ctx.fill();
    }
}
