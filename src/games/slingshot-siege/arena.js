// Slingshot Siege arena on a canvas: the sun, the team planets with their shields and the flying comets.
// Full size on the teacher's screen; the aiming view on student devices (with an aim arrow and preview).
// Draws only while something moves, so an idle arena costs nothing on old school computers.

import { ARENA, CENTER, SUN_R, PLANET_R, COMET_R, SLING_R, SAMPLE_MS, PREVIEW_STEPS, planetPos, simulate } from './physics';
import { teamOf } from './teams';

const TAU = Math.PI * 2;
const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
const TRAIL = 14; // samples of trail behind each comet

const removeAt = (arr, i) => {
    arr[i] = arr[arr.length - 1];
    arr.pop();
};

export class ArenaView {
    // myTeam: highlight this team's planet and allow aiming from it (student devices)
    constructor(canvas, { lowFx = false, myTeam = null } = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.lowFx = lowFx;
        this.myTeam = myTeam;
        this.count = 2;
        this.teams = {};
        this.comets = [];
        this.particles = [];
        this.rings = [];
        this.floaters = [];
        this.flashes = {}; // team -> time of the last hit
        this.aim = null;
        this.preview = null;
        this.w = 0;
        this.h = 0;
        this.scale = 1;
        this.time = 0;
        this.running = false;
        this.raf = 0;
        this.last = 0;
        this.frame = this.frame.bind(this);
    }

    mount() {
        this.resize();
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
        this.buildPlanets();
        this.render();
    }

    // World (0..1000) <-> screen pixels
    sx(x) { return this.ox + x * this.scale; }
    sy(y) { return this.oy + y * this.scale; }
    toWorld(px, py) { return { x: (px - this.ox) / this.scale, y: (py - this.oy) / this.scale }; }

    setState(count, teams) {
        const changed = count !== this.count;
        this.count = count;
        this.teams = teams || {};
        if (changed) {
            this.buildPlanets();
            if (this.aim) this.setAim(this.aim);
        }
        this.requestRender();
    }

    // { dx, dy, p } from this view's own planet, or null
    setAim(aim) {
        this.aim = aim;
        this.preview = aim && this.myTeam !== null
            ? simulate(this.myTeam, this.count, aim.dx, aim.dy, aim.p, { maxSteps: PREVIEW_STEPS }).path
            : null;
        this.requestRender();
    }

    addComet({ team, flight, onLand }) {
        this.comets.push({ team, path: flight.path, end: flight.end, target: flight.target, start: performance.now(), onLand });
        this.wake();
    }

    floater(x, y, text, color = '#ffffff', size = 1) {
        this.floaters.push({ x, y, text, color, size, life: 1.6, max: 1.6 });
        this.wake();
    }

    // ---------- loop ----------

    requestRender() {
        if (this.running || this.pending) return;
        this.pending = true;
        requestAnimationFrame(() => {
            this.pending = false;
            if (!this.running) this.render();
        });
    }

    wake() {
        if (this.running) return;
        this.running = true;
        this.last = performance.now();
        this.raf = requestAnimationFrame(this.frame);
    }

    frame(now) {
        if (!this.running) return;
        const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
        this.last = now;
        this.time += dt;
        this.update(now, dt);
        this.render(now);
        if (this.comets.length || this.particles.length || this.rings.length || this.floaters.length) {
            this.raf = requestAnimationFrame(this.frame);
        } else {
            this.running = false;
        }
    }

    update(now, dt) {
        for (let i = this.comets.length - 1; i >= 0; i--) {
            const c = this.comets[i];
            const points = c.path.length / 2;
            if ((now - c.start) / SAMPLE_MS >= points - 1) {
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
            const r = this.rings[i];
            r.life -= dt;
            if (r.life <= 0) removeAt(this.rings, i);
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
        if (c.end === 'hit') {
            this.burst(x, y, teamOf(c.team).color, 26);
            this.burst(x, y, '#ffffff', 8);
            this.rings.push({ x, y, life: 0.6, max: 0.6, color: teamOf(c.team).color });
            if (Number.isInteger(c.target)) this.flashes[c.target] = this.time;
        } else if (c.end === 'sun') {
            this.burst(x, y, '#fb923c', 16);
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

        // Faint rings: how strongly the sun pulls, and the golden slingshot zone
        c.lineWidth = 1;
        for (const r of [200, 290, 400]) {
            c.strokeStyle = 'rgba(148, 163, 255, 0.07)';
            c.beginPath();
            c.arc(cx, cy, r * s, 0, TAU);
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

    // One small canvas per team planet, redrawn only on resize or a new team count
    buildPlanets() {
        const r = PLANET_R * this.scale;
        const size = Math.ceil(r * 2 + 4);
        this.planetSprites = Array.from({ length: this.count }, (_, i) => {
            const team = teamOf(i);
            const off = document.createElement('canvas');
            off.width = Math.ceil(size * this.dpr);
            off.height = Math.ceil(size * this.dpr);
            const c = off.getContext('2d');
            c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            const m = size / 2;
            c.fillStyle = team.color;
            c.beginPath();
            c.arc(m, m, r, 0, TAU);
            c.fill();
            // Bands, then a light/shadow gradient for a round look
            c.save();
            c.beginPath();
            c.arc(m, m, r, 0, TAU);
            c.clip();
            c.fillStyle = 'rgba(255, 255, 255, 0.16)';
            c.fillRect(m - r, m - r * 0.35, r * 2, r * 0.22);
            c.fillStyle = 'rgba(0, 0, 0, 0.12)';
            c.fillRect(m - r, m + r * 0.18, r * 2, r * 0.18);
            c.restore();
            const shade = c.createRadialGradient(m - r * 0.4, m - r * 0.45, r * 0.1, m, m, r);
            shade.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
            shade.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
            shade.addColorStop(1, 'rgba(2, 6, 23, 0.55)');
            c.fillStyle = shade;
            c.beginPath();
            c.arc(m, m, r, 0, TAU);
            c.fill();
            return { canvas: off, size };
        });
    }

    // ---------- drawing ----------

    render(now = performance.now()) {
        const ctx = this.ctx;
        const s = this.scale;
        if (this.bg) ctx.drawImage(this.bg, 0, 0, this.w, this.h);

        // Pulsing corona (only visible while the arena animates)
        if (this.running && !this.lowFx) {
            ctx.globalAlpha = 0.18 + 0.1 * Math.sin(this.time * 3);
            ctx.fillStyle = '#fdba74';
            ctx.beginPath();
            ctx.arc(this.sx(CENTER), this.sy(CENTER), SUN_R * s * (1.15 + 0.05 * Math.sin(this.time * 2)), 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        for (let i = 0; i < this.count; i++) this.drawPlanet(i);
        if (this.aim && this.myTeam !== null) this.drawAim();

        // Comets: a fading trail, then a glowing head
        for (const c of this.comets) {
            const points = c.path.length / 2;
            const f = Math.min(points - 1, Math.max(0, (now - c.start) / SAMPLE_MS));
            const idx = Math.floor(f);
            const frac = f - idx;
            const nx = idx + 1 < points ? idx + 1 : idx;
            const hx = c.path[idx * 2] + (c.path[nx * 2] - c.path[idx * 2]) * frac;
            const hy = c.path[idx * 2 + 1] + (c.path[nx * 2 + 1] - c.path[idx * 2 + 1]) * frac;
            const color = teamOf(c.team).color;
            ctx.lineCap = 'round';
            let px = hx;
            let py = hy;
            for (let k = 0; k < TRAIL && idx - k >= 0; k++) {
                const tx = c.path[(idx - k) * 2];
                const ty = c.path[(idx - k) * 2 + 1];
                ctx.globalAlpha = 0.65 * (1 - k / TRAIL);
                ctx.strokeStyle = color;
                ctx.lineWidth = Math.max(1, (COMET_R * 1.4 - k * 0.6) * s);
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
            ctx.arc(this.sx(hx), this.sy(hy), COMET_R * s * 2.2, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.sx(hx), this.sy(hy), Math.max(2, COMET_R * s), 0, TAU);
            ctx.fill();
        }

        for (const r of this.rings) {
            const k = 1 - r.life / r.max;
            ctx.globalAlpha = 1 - k;
            ctx.strokeStyle = r.color;
            ctx.lineWidth = Math.max(1, 4 * s);
            ctx.beginPath();
            ctx.arc(this.sx(r.x), this.sy(r.y), (PLANET_R + 70 * k) * s, 0, TAU);
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

    drawPlanet(i) {
        const ctx = this.ctx;
        const s = this.scale;
        const pos = planetPos(i, this.count);
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

        // Hit flash
        const since = this.time - (this.flashes[i] ?? -10);
        if (since < 0.35) {
            ctx.globalAlpha = 1 - since / 0.35;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, r, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Your planet (student view)
        if (i === this.myTeam) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.lineWidth = Math.max(1.5, 2 * s);
            ctx.setLineDash([5 * s + 2, 5 * s + 2]);
            ctx.beginPath();
            ctx.arc(x, y, sr + 9 * s, 0, TAU);
            ctx.stroke();
            ctx.setLineDash([]);
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

    drawAim() {
        const ctx = this.ctx;
        const s = this.scale;
        const from = planetPos(this.myTeam, this.count);
        const { dx, dy, p } = this.aim;
        const color = teamOf(this.myTeam).color;
        const start = PLANET_R + COMET_R + 2;
        const len = 30 + 70 * p;
        const x1 = this.sx(from.x + dx * start);
        const y1 = this.sy(from.y + dy * start);
        const x2 = this.sx(from.x + dx * (start + len));
        const y2 = this.sy(from.y + dy * (start + len));

        // Preview of the first second: dots that fade out, so the start of the curve is visible
        if (this.preview) {
            ctx.fillStyle = '#ffffff';
            const pts = this.preview.length / 2;
            for (let k = 2; k < pts; k += 2) {
                ctx.globalAlpha = 0.95 * (1 - k / pts) + 0.05;
                ctx.beginPath();
                ctx.arc(this.sx(this.preview[k * 2]), this.sy(this.preview[k * 2 + 1]), Math.max(2, 4 * s), 0, TAU);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(3, 7 * s);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        const head = Math.max(8, 18 * s);
        const a = Math.atan2(dy, dx);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x2 + Math.cos(a) * head, y2 + Math.sin(a) * head);
        ctx.lineTo(x2 + Math.cos(a + 2.4) * head, y2 + Math.sin(a + 2.4) * head);
        ctx.lineTo(x2 + Math.cos(a - 2.4) * head, y2 + Math.sin(a - 2.4) * head);
        ctx.closePath();
        ctx.fill();
    }
}
