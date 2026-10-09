// Moonshot on a canvas. ClimbView is what a student sees: their rocket, the platforms around them,
// classmates climbing nearby and the storm below, over a sky of drifting parallax layers that change
// with every zone. TowerView is the teacher's big screen: the whole class racing up one tall ladder.

import { WIDTH, VIEW_H, BAND, PLAYER, ZONES, zoneAt, STATION_EVERY } from './world';

const TAU = Math.PI * 2;
const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
export const safeColor = (c) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : '#60a5fa');

const PLATFORM = {
    solid: { top: '#cbd5e1', body: '#475569', edge: '#334155' },
    station: { top: '#6ee7b7', body: '#047857', edge: '#065f46' },
    move: { top: '#bfdbfe', body: '#1d4ed8', edge: '#1e3a8a' },
    ice: { top: '#e0f2fe', body: '#0891b2', edge: '#155e75' },
    spring: { top: '#fef08a', body: '#a16207', edge: '#713f12' },
    crumble: { top: '#e7e5e4', body: '#78716c', edge: '#44403c' }
};

const removeAt = (arr, i) => {
    arr[i] = arr[arr.length - 1];
    arr.pop();
};

const roundRect = (ctx, x, y, w, h, r) => {
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        return;
    }
    const k = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + k, y);
    ctx.arcTo(x + w, y, x + w, y + h, k);
    ctx.arcTo(x + w, y + h, x, y + h, k);
    ctx.arcTo(x, y + h, x, y, k);
    ctx.arcTo(x, y, x + w, y, k);
    ctx.closePath();
};

// A rocket one unit tall, nose up, drawn around (0, 0)
const rocket = (ctx, s, color, { boost = 0, lean = 0, time = 0, dim = false } = {}) => {
    ctx.save();
    ctx.rotate(lean);
    if (boost > 0) {
        const flick = 0.75 + 0.25 * Math.sin(time * 42);
        const len = s * (0.7 + 1.1 * boost) * flick;
        const g = ctx.createLinearGradient(0, s * 0.1, 0, s * 0.1 + len);
        g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        g.addColorStop(0.3, 'rgba(253, 224, 71, 0.9)');
        g.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-s * 0.22, s * 0.05);
        ctx.quadraticCurveTo(0, s * 0.1 + len * 0.6, 0, s * 0.1 + len);
        ctx.quadraticCurveTo(0, s * 0.1 + len * 0.6, s * 0.22, s * 0.05);
        ctx.closePath();
        ctx.fill();
    }
    ctx.globalAlpha = dim ? 0.55 : 1;
    // Fins
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.12);
    ctx.quadraticCurveTo(-s * 0.62, s * 0.02, -s * 0.5, s * 0.16);
    ctx.lineTo(-s * 0.28, s * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.3, -s * 0.12);
    ctx.quadraticCurveTo(s * 0.62, s * 0.02, s * 0.5, s * 0.16);
    ctx.lineTo(s * 0.28, s * 0.1);
    ctx.closePath();
    ctx.fill();
    // Body
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.02);
    ctx.quadraticCurveTo(s * 0.44, -s * 0.38, s * 0.33, s * 0.1);
    ctx.lineTo(-s * 0.33, s * 0.1);
    ctx.quadraticCurveTo(-s * 0.44, -s * 0.38, 0, -s * 1.02);
    ctx.closePath();
    const body = ctx.createLinearGradient(-s * 0.4, 0, s * 0.4, 0);
    body.addColorStop(0, '#f8fafc');
    body.addColorStop(0.4, color);
    body.addColorStop(1, '#1e293b');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.055);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.stroke();
    // Window
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(0, -s * 0.46, s * 0.17, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(224, 242, 254, 0.9)';
    ctx.beginPath();
    ctx.arc(-s * 0.05, -s * 0.5, s * 0.08, 0, TAU);
    ctx.fill();
    ctx.restore();
};

class Base {
    constructor(canvas, { lowFx = false } = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.lowFx = lowFx;
        this.driver = null;
        this.puffs = [];
        this.floaters = [];
        this.shakeLeft = 0;
        this.labels = new Map();
        this.time = 0;
        this.w = 0;
        this.h = 0;
        this.running = false;
        this.raf = 0;
        this.last = 0;
        this.skip = false;
        this.frame = this.frame.bind(this);
    }

    setDriver(fn) { this.driver = fn; }

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
        this.labels.clear();
        this.onResize?.();
    }

    frame(now) {
        if (!this.running) return;
        this.raf = requestAnimationFrame(this.frame);
        if (this.lowFx) {
            this.skip = !this.skip;
            if (this.skip) return;
        }
        const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
        this.last = now;
        this.time += dt;
        const scene = this.driver?.(dt);
        if (!scene) return;
        for (let i = this.puffs.length - 1; i >= 0; i--) {
            const p = this.puffs[i];
            p.life -= dt;
            if (p.life <= 0) {
                removeAt(this.puffs, i);
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy -= (p.rise || 6) * dt;
        }
        for (let i = this.floaters.length - 1; i >= 0; i--) {
            const f = this.floaters[i];
            f.life -= dt;
            f.y += 1.2 * dt;
            if (f.life <= 0) removeAt(this.floaters, i);
        }
        this.shakeLeft = Math.max(0, this.shakeLeft - dt);
        this.render(scene);
    }

    puff(x, y, count = 10, color = '#e2e8f0', opts = {}) {
        const cap = this.lowFx ? 70 : 260;
        const n = Math.round(count * (this.lowFx ? 0.45 : 1));
        for (let i = 0; i < n && this.puffs.length < cap; i++) {
            const a = (opts.angle ?? Math.random() * TAU) + (Math.random() - 0.5) * (opts.spread ?? TAU);
            const sp = (opts.speed ?? 1) * (1 + Math.random() * 4);
            const life = (opts.life ?? 1) * (0.3 + Math.random() * 0.5);
            this.puffs.push({
                x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, max: life, color,
                size: (opts.size ?? 1) * (0.06 + Math.random() * 0.09), rise: opts.rise
            });
        }
    }

    floater(x, y, text, color = '#ffffff') {
        this.floaters.push({ x, y, text, color, life: 1.2, max: 1.2 });
    }

    shake(amount = 1) {
        if (!this.lowFx) this.shakeLeft = Math.max(this.shakeLeft, 0.3 * amount);
    }

    label(text, color, size = 13) {
        const key = `${text}|${color}|${size}`;
        let sprite = this.labels.get(key);
        if (sprite) return sprite;
        this.ctx.font = `800 ${size}px ${FONT}`;
        const w = Math.ceil(this.ctx.measureText(text).width) + 8;
        const h = size + 8;
        const off = document.createElement('canvas');
        off.width = Math.ceil(w * this.dpr);
        off.height = Math.ceil(h * this.dpr);
        const c = off.getContext('2d');
        c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        c.font = `800 ${size}px ${FONT}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.lineWidth = 3;
        c.strokeStyle = 'rgba(2, 6, 18, 0.9)';
        c.strokeText(text, w / 2, h / 2);
        c.fillStyle = color;
        c.fillText(text, w / 2, h / 2);
        sprite = { canvas: off, w, h };
        if (this.labels.size > 240) this.labels.clear();
        this.labels.set(key, sprite);
        return sprite;
    }

    // Two zone colours blended by how far through the zone the climber is
    skyColours(alt) {
        const i = zoneAt(alt);
        const here = ZONES[i];
        const next = ZONES[i + 1];
        const k = next ? Math.min(1, Math.max(0, (alt - here.at) / (next.at - here.at))) : 0;
        const mix = (a, b) => {
            const pa = [1, 3, 5].map(o => parseInt(a.slice(o, o + 2), 16));
            const pb = [1, 3, 5].map(o => parseInt(b.slice(o, o + 2), 16));
            return `rgb(${pa.map((v, j) => Math.round(v + (pb[j] - v) * k)).join(',')})`;
        };
        return {
            top: next ? mix(here.sky[0], next.sky[0]) : here.sky[0],
            bottom: next ? mix(here.sky[1], next.sky[1]) : here.sky[1],
            zone: i,
            tint: here.tint
        };
    }

    sky(ctx, alt) {
        const { top, bottom } = this.skyColours(alt);
        const g = ctx.createLinearGradient(0, 0, 0, this.h);
        g.addColorStop(0, bottom);
        g.addColorStop(1, top);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, this.w, this.h);
    }
}

// ---------- what a student sees ----------

export class ClimbView extends Base {
    onResize() {
        this.scale = Math.min(this.h / VIEW_H, this.w / WIDTH);
        this.ox = (this.w - WIDTH * this.scale) / 2;
        const rnd = () => Math.random();
        // Three layers of stars, each drifting past at its own speed
        this.starLayers = [0.18, 0.4, 0.7].map((k, i) => ({
            k,
            dots: Array.from({ length: this.lowFx ? 20 : 34 - i * 6 }, () => ({
                x: rnd() * this.w,
                y: rnd() * (this.h + 200),
                r: i === 2 ? 2 : 1,
                a: 0.2 + rnd() * (0.3 + i * 0.2)
            }))
        }));
        // Distant worlds, clouds and rocks that only show in the zones they belong to
        this.decor = Array.from({ length: 26 }, (_, i) => ({
            alt: 30 + i * 46 + rnd() * 30,
            x: 0.08 + rnd() * 0.84,
            size: 0.5 + rnd() * 1.1,
            spin: (rnd() - 0.5) * 0.4,
            hue: rnd()
        }));
        this.vignette = null;
    }

    sx(x) { return this.ox + x * this.scale; }
    sy(y) { return this.h / 2 + (this.cam.y - y) * this.scale; }

    render(scene) {
        const ctx = this.ctx;
        this.cam = scene.camera;
        this.sky(ctx, this.cam.y);
        this.drawDepth();

        let jx = 0;
        let jy = 0;
        if (this.shakeLeft > 0) {
            jx = (Math.random() - 0.5) * 15 * this.shakeLeft;
            jy = (Math.random() - 0.5) * 15 * this.shakeLeft;
        }
        ctx.save();
        ctx.translate(jx, jy);

        this.drawWalls();
        this.drawLaunchpad();
        this.drawPieces(scene);
        this.drawGhosts(scene);
        this.drawMe(scene);
        this.drawBits();
        this.drawStorm(scene);
        ctx.restore();
        this.drawEdges();
    }

    // Stars and distant worlds, each drifting at its own speed so the climb feels high
    drawDepth() {
        const ctx = this.ctx;
        const s = this.scale;
        for (const layer of this.starLayers) {
            const span = this.h + 200;
            const shift = ((this.cam.y * s * layer.k) % span + span) % span;
            for (const dot of layer.dots) {
                const y = ((dot.y + shift) % span) - 100;
                ctx.globalAlpha = dot.a;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(dot.x, y, dot.r, dot.r);
            }
        }
        ctx.globalAlpha = 1;
        // A planet, cloud or far-off rock, depending on the zone it sits in
        for (const d of this.decor) {
            const y = this.h / 2 + (this.cam.y - d.alt) * s * 0.35;
            if (y < -160 || y > this.h + 160) continue;
            const x = d.x * this.w;
            const zone = zoneAt(d.alt);
            const r = (34 + d.size * 46) * Math.min(1.4, s / 42);
            ctx.globalAlpha = 0.5;
            if (zone <= 1) {
                // Clouds
                ctx.fillStyle = zone === 0 ? 'rgba(148, 163, 184, 0.35)' : 'rgba(226, 232, 240, 0.4)';
                for (const [dx, dy, k] of [[-0.5, 0.1, 0.6], [0, 0, 1], [0.55, 0.12, 0.7], [0.2, -0.22, 0.6]]) {
                    ctx.beginPath();
                    ctx.ellipse(x + dx * r, y + dy * r, r * k, r * k * 0.52, 0, 0, TAU);
                    ctx.fill();
                }
            } else if (zone >= 5 && zone <= 6) {
                // Far asteroids
                ctx.fillStyle = 'rgba(120, 113, 108, 0.55)';
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(this.time * d.spin);
                ctx.beginPath();
                for (let i = 0; i < 9; i++) {
                    const a = (i / 9) * TAU;
                    const k = 0.7 + ((i * 29) % 10) / 28;
                    const px = Math.cos(a) * r * 0.45 * k;
                    const py = Math.sin(a) * r * 0.45 * k;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else {
                // A distant world
                const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r * 0.75);
                const hue = Math.round(200 + d.hue * 120);
                g.addColorStop(0, `hsla(${hue}, 70%, 72%, 0.75)`);
                g.addColorStop(1, `hsla(${hue}, 65%, 32%, 0.25)`);
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(x, y, r * 0.75, 0, TAU);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    }

    // The shaft the climb runs through: on a wide screen the sides are the tower, not empty space
    drawWalls() {
        const ctx = this.ctx;
        const s = this.scale;
        const left = this.ox;
        const right = this.ox + WIDTH * s;
        const panel = (x0, x1) => {
            if (x1 - x0 < 2) return;
            const g = ctx.createLinearGradient(x0, 0, x1, 0);
            const edge = 'rgba(15, 23, 42, 0.97)';
            const deep = 'rgba(2, 6, 23, 0.99)';
            g.addColorStop(0, x0 === 0 ? deep : edge);
            g.addColorStop(1, x0 === 0 ? edge : deep);
            ctx.fillStyle = g;
            ctx.fillRect(x0, 0, x1 - x0, this.h);
            // Girders sliding past: they make the height feel real even at the edges
            const step = Math.max(46, 2.2 * s);
            const shift = ((this.cam.y * s) % step + step) % step;
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
            ctx.lineWidth = Math.max(2, s * 0.09);
            ctx.beginPath();
            for (let y = shift - step; y < this.h + step; y += step) {
                ctx.moveTo(x0, y);
                ctx.lineTo(x1, y);
            }
            ctx.stroke();
            ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
            for (let y = shift - step; y < this.h + step; y += step) {
                for (let x = x0 + 14; x < x1 - 6; x += 54) ctx.fillRect(x, y - 2, 3, 3);
            }
            // The rail nearest the climb catches a little light
            const near = x0 === 0 ? x1 : x0;
            const lit = ctx.createLinearGradient(near - (x0 === 0 ? 10 : 0), 0, near + (x0 === 0 ? 0 : 10), 0);
            lit.addColorStop(0, 'rgba(56, 189, 248, 0)');
            lit.addColorStop(1, 'rgba(56, 189, 248, 0.22)');
            ctx.fillStyle = lit;
            ctx.fillRect(near - (x0 === 0 ? 10 : 0), 0, 10, this.h);
        };
        panel(0, left);
        panel(right, this.w);
        // Altitude marks up both walls
        const every = BAND * STATION_EVERY;
        const first = Math.floor((this.cam.y - VIEW_H) / every);
        for (let k = Math.max(0, first); k <= first + 3; k++) {
            const y = this.sy(k * every);
            if (y < -24 || y > this.h + 24) continue;
            ctx.strokeStyle = 'rgba(110, 231, 183, 0.22)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 9]);
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(right, y);
            ctx.stroke();
            ctx.setLineDash([]);
            const tag = this.label(`${Math.round(k * every)} m`, 'rgba(167, 243, 208, 0.95)', 11);
            ctx.drawImage(tag.canvas, Math.max(2, left - tag.w - 4), y - tag.h / 2, tag.w, tag.h);
        }
    }

    drawLaunchpad() {
        const y = this.sy(0);
        if (y < -40 || y > this.h + 200) return;
        const ctx = this.ctx;
        const s = this.scale;
        const g = ctx.createLinearGradient(0, y, 0, y + 3 * s);
        g.addColorStop(0, '#334155');
        g.addColorStop(1, '#0f172a');
        ctx.fillStyle = g;
        ctx.fillRect(this.ox, y, WIDTH * s, Math.max(40, this.h - y));
        ctx.fillStyle = '#facc15';
        for (let i = 0; i < 9; i++) ctx.fillRect(this.ox + (i + 0.3) * s, y + 0.25 * s, 0.4 * s, 0.14 * s);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(this.ox, y - 0.12 * s, WIDTH * s, 0.14 * s);
    }

    drawPieces(scene) {
        const ctx = this.ctx;
        const s = this.scale;
        for (const piece of scene.pieces) {
            const x = this.sx(piece.px);
            const y = this.sy(piece.y);
            if (y < -70 || y > this.h + 70) continue;

            if (piece.pickup) {
                const bob = Math.sin(this.time * 3 + piece.x * 2) * 0.1 * s;
                const color = piece.pickup === 'fuel' ? '#fde047' : piece.pickup === 'boots' ? '#86efac' : '#7dd3fc';
                const r = 0.3 * s;
                if (!this.lowFx) {
                    const glow = ctx.createRadialGradient(x, y + bob, 0, x, y + bob, r * 2.6);
                    glow.addColorStop(0, `${color}55`);
                    glow.addColorStop(1, `${color}00`);
                    ctx.fillStyle = glow;
                    ctx.fillRect(x - r * 2.6, y + bob - r * 2.6, r * 5.2, r * 5.2);
                }
                ctx.save();
                ctx.translate(x, y + bob);
                ctx.fillStyle = color;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = Math.max(1, s * 0.035);
                if (piece.pickup === 'fuel') {
                    roundRect(ctx, -r * 0.52, -r, r * 1.04, r * 2, r * 0.3);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(255,255,255,0.75)';
                    ctx.fillRect(-r * 0.25, -r * 0.55, r * 0.5, r * 0.18);
                } else if (piece.pickup === 'boots') {
                    roundRect(ctx, -r * 0.7, -r * 0.5, r * 1.4, r, r * 0.3);
                    ctx.fill();
                    ctx.stroke();
                    ctx.strokeStyle = '#065f46';
                    ctx.beginPath();
                    for (let i = 0; i < 3; i++) {
                        ctx.moveTo(-r * 0.5 + i * r * 0.5, r * 0.5);
                        ctx.lineTo(-r * 0.3 + i * r * 0.5, r * 0.85);
                    }
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.9, 0, TAU);
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.restore();
                continue;
            }

            if (piece.rock) {
                const r = 0.62 * s;
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(this.time * 0.7 + piece.x);
                const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
                g.addColorStop(0, '#a8a29e');
                g.addColorStop(1, '#44403c');
                ctx.fillStyle = g;
                ctx.beginPath();
                for (let i = 0; i < 9; i++) {
                    const a = (i / 9) * TAU;
                    const k = 0.78 + ((i * 31) % 10) / 40;
                    const px = Math.cos(a) * r * k;
                    const py = Math.sin(a) * r * k;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = 'rgba(41, 37, 36, 0.6)';
                ctx.beginPath();
                ctx.arc(-r * 0.25, -r * 0.1, r * 0.2, 0, TAU);
                ctx.arc(r * 0.2, r * 0.25, r * 0.15, 0, TAU);
                ctx.fill();
                ctx.restore();
                continue;
            }

            const style = PLATFORM[piece.kind] || PLATFORM.solid;
            const w = piece.w * s;
            const thick = Math.max(6, 0.34 * s);
            const wobble = piece.shaking ? Math.sin(this.time * 55) * 2.5 : 0;
            ctx.save();
            ctx.translate(wobble, 0);
            if (piece.kind === 'station' && !this.lowFx) {
                const glow = ctx.createLinearGradient(0, y - thick * 2.4, 0, y);
                glow.addColorStop(0, 'rgba(110, 231, 183, 0)');
                glow.addColorStop(1, 'rgba(110, 231, 183, 0.33)');
                ctx.fillStyle = glow;
                ctx.fillRect(x, y - thick * 2.4, w, thick * 2.4);
            }
            // Body with a lit top edge
            const g = ctx.createLinearGradient(0, y - thick * 0.35, 0, y + thick);
            g.addColorStop(0, style.top);
            g.addColorStop(0.32, style.body);
            g.addColorStop(1, style.edge);
            ctx.fillStyle = g;
            roundRect(ctx, x, y - thick * 0.35, w, thick * 1.2, Math.min(thick * 0.5, 7));
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(x + 2, y - thick * 0.3, w - 4, Math.max(1.5, thick * 0.16));

            if (piece.kind === 'spring') {
                ctx.strokeStyle = '#fef9c3';
                ctx.lineWidth = Math.max(1.5, s * 0.05);
                ctx.beginPath();
                for (let i = 0; i < 3; i++) {
                    const cx = x + w * (0.25 + i * 0.25);
                    ctx.moveTo(cx - 5, y - thick * 0.45);
                    ctx.lineTo(cx, y - thick * 0.45 - 7);
                    ctx.lineTo(cx + 5, y - thick * 0.45);
                }
                ctx.stroke();
            } else if (piece.kind === 'ice') {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                for (let i = 0; i < 3; i++) {
                    const cx = x + w * (0.2 + i * 0.3);
                    ctx.moveTo(cx, y + thick * 0.1);
                    ctx.lineTo(cx + 6, y + thick * 0.75);
                }
                ctx.stroke();
            } else if (piece.kind === 'crumble') {
                ctx.strokeStyle = 'rgba(41, 37, 36, 0.8)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                for (let i = 0; i < 3; i++) {
                    const cx = x + w * (0.25 + i * 0.25);
                    ctx.moveTo(cx, y - thick * 0.3);
                    ctx.lineTo(cx - 3, y + thick * 0.3);
                    ctx.lineTo(cx + 2, y + thick * 0.8);
                }
                ctx.stroke();
            } else if (piece.kind === 'move') {
                ctx.fillStyle = 'rgba(191, 219, 254, 0.9)';
                for (const dir of [-1, 1]) {
                    const cx = x + w / 2 + dir * (w / 2 - 7);
                    ctx.beginPath();
                    ctx.moveTo(cx + dir * 4, y + thick * 0.35);
                    ctx.lineTo(cx - dir * 2, y + thick * 0.05);
                    ctx.lineTo(cx - dir * 2, y + thick * 0.65);
                    ctx.closePath();
                    ctx.fill();
                }
            }
            ctx.restore();
        }
    }

    drawGhosts(scene) {
        const ctx = this.ctx;
        const s = this.scale;
        for (const g of scene.ghosts) {
            const x = this.sx(g.x);
            const y = this.sy(g.y);
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.translate(x, y - PLAYER.h * s * 0.5);
            rocket(ctx, PLAYER.h * s * 0.92, safeColor(g.color), { boost: g.boost ? 0.7 : 0, time: this.time, dim: true });
            ctx.restore();
            const tag = this.label(g.name, safeColor(g.color), 11);
            ctx.globalAlpha = 0.75;
            ctx.drawImage(tag.canvas, x - tag.w / 2, y - PLAYER.h * s - tag.h, tag.w, tag.h);
            ctx.globalAlpha = 1;
        }
    }

    drawMe(scene) {
        const ctx = this.ctx;
        const s = this.scale;
        const me = scene.me;
        const x = this.sx(me.x);
        const y = this.sy(me.y);
        const size = PLAYER.h * s;
        // Flying leaves a trail of exhaust
        if (me.boost && !this.lowFx && Math.random() < 0.8) {
            this.puff(me.x, me.y + 0.1, 1, Math.random() < 0.5 ? '#fde047' : '#fb923c', { angle: Math.PI / 2, spread: 0.9, speed: 0.5, life: 0.5, size: 0.8, rise: -2 });
        }
        ctx.save();
        ctx.translate(x, y - size * 0.5);
        if (me.shield) {
            ctx.globalAlpha = 0.28 + 0.1 * Math.sin(this.time * 6);
            ctx.fillStyle = '#7dd3fc';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.88, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        if (me.answering || me.caught) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = me.caught ? '#c084fc' : '#6ee7b7';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.95, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = me.caught ? '#e9d5ff' : '#a7f3d0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.95, 0, TAU);
            ctx.stroke();
        }
        // Lean into the turn, like a real rocket
        const lean = Math.max(-0.42, Math.min(0.42, (me.vx || 0) / 22));
        rocket(ctx, size, me.boots ? '#86efac' : '#f1f5f9', { boost: me.boost ? 1 : 0, lean, time: this.time });
        ctx.restore();
    }

    drawBits() {
        const ctx = this.ctx;
        const s = this.scale;
        for (const p of this.puffs) {
            ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.9;
            ctx.fillStyle = p.color;
            const size = Math.max(2, p.size * s);
            ctx.fillRect(this.sx(p.x) - size / 2, this.sy(p.y) - size / 2, size, size);
        }
        ctx.globalAlpha = 1;
        for (const f of this.floaters) {
            const tag = this.label(f.text, f.color, 15);
            ctx.globalAlpha = Math.min(1, (f.life / f.max) * 2);
            ctx.drawImage(tag.canvas, this.sx(f.x) - tag.w / 2, this.sy(f.y) - tag.h, tag.w, tag.h);
        }
        ctx.globalAlpha = 1;
    }

    drawStorm(scene) {
        const top = this.sy(scene.storm);
        if (top > this.h + 60) return;
        const ctx = this.ctx;
        const y = Math.max(-60, top);
        const g = ctx.createLinearGradient(0, y - 10, 0, Math.min(this.h, y + 150));
        g.addColorStop(0, 'rgba(216, 180, 254, 0.55)');
        g.addColorStop(0.18, 'rgba(147, 51, 234, 0.85)');
        g.addColorStop(1, 'rgba(35, 10, 70, 0.98)');
        ctx.fillStyle = g;
        ctx.fillRect(0, y, this.w, this.h - y + 60);
        // A churning edge with sparks lifting off it
        ctx.strokeStyle = 'rgba(243, 232, 255, 0.95)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let px = 0; px <= this.w; px += 12) {
            const wy = y + Math.sin(px * 0.05 + this.time * 4) * 5 + Math.sin(px * 0.013 - this.time * 2.4) * 4;
            if (px === 0) ctx.moveTo(px, wy);
            else ctx.lineTo(px, wy);
        }
        ctx.stroke();
        if (!this.lowFx && top > -40 && top < this.h + 40) {
            ctx.fillStyle = 'rgba(233, 213, 255, 0.8)';
            for (let i = 0; i < 14; i++) {
                const t = (this.time * 0.6 + i * 0.37) % 1;
                const px = ((i * 137) % 100) / 100 * this.w;
                ctx.globalAlpha = (1 - t) * 0.8;
                ctx.fillRect(px + Math.sin(this.time * 2 + i) * 8, y - t * 70, 2, 2 + t * 3);
            }
            ctx.globalAlpha = 1;
        }
    }

    // A soft darkening at the edges keeps the eye on the climber
    drawEdges() {
        if (this.lowFx) return;
        const ctx = this.ctx;
        if (!this.vignette) {
            const g = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.42, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.78);
            g.addColorStop(0, 'rgba(0, 0, 0, 0)');
            g.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
            this.vignette = g;
        }
        ctx.fillStyle = this.vignette;
        ctx.fillRect(0, 0, this.w, this.h);
    }
}

// ---------- the teacher's big screen ----------

export class TowerView extends Base {
    onResize() {
        this.stars = Array.from({ length: 150 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() < 0.85 ? 1 : 2, a: 0.2 + Math.random() * 0.6 }));
    }

    render(scene) {
        const ctx = this.ctx;
        const top = Math.max(70, scene.top * 1.18 + 25);
        const bottom = Math.max(0, Math.min(scene.storm, scene.top - 12));
        const span = Math.max(45, top - bottom);
        const pad = 50;
        const yOf = (alt) => this.h - pad - ((alt - bottom) / span) * (this.h - pad * 1.5);
        this.sky(ctx, scene.top * 0.55);
        for (const star of this.stars) {
            ctx.globalAlpha = star.a;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(star.x * this.w, star.y * this.h, star.r, star.r);
        }
        ctx.globalAlpha = 1;

        // Zone bands, each tinted with its own colour
        for (let i = 0; i < ZONES.length; i++) {
            const zone = ZONES[i];
            if (zone.at > top) break;
            const y = yOf(zone.at);
            const next = ZONES[i + 1];
            const yNext = next && next.at <= top ? yOf(next.at) : 0;
            if (y > -20 && y < this.h + 20) {
                ctx.fillStyle = `${zone.tint}0d`;
                ctx.fillRect(0, Math.max(0, yNext), this.w, Math.min(this.h, y) - Math.max(0, yNext));
                ctx.strokeStyle = `${zone.tint}66`;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([10, 10]);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(this.w, y);
                ctx.stroke();
                ctx.setLineDash([]);
                const tag = this.label(`${scene.zoneNames[i] || ''} · ${zone.at} m`, zone.tint, 13);
                ctx.drawImage(tag.canvas, 10, y - tag.h - 2, tag.w, tag.h);
            }
        }

        // The storm, rising from the bottom
        const sy = yOf(scene.storm);
        if (sy < this.h + 10) {
            const g = ctx.createLinearGradient(0, sy - 8, 0, this.h);
            g.addColorStop(0, 'rgba(216, 180, 254, 0.6)');
            g.addColorStop(0.2, 'rgba(147, 51, 234, 0.8)');
            g.addColorStop(1, 'rgba(35, 10, 70, 0.97)');
            ctx.fillStyle = g;
            ctx.fillRect(0, sy, this.w, this.h - sy);
            ctx.strokeStyle = 'rgba(243, 232, 255, 0.95)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let px = 0; px <= this.w; px += 14) {
                const wy = sy + Math.sin(px * 0.03 + this.time * 3) * 5;
                if (px === 0) ctx.moveTo(px, wy);
                else ctx.lineTo(px, wy);
            }
            ctx.stroke();
        }

        // Everyone racing, spread across the width so the names stay readable
        const lanes = Math.max(1, Math.min(scene.climbers.length, Math.floor(this.w / 140)));
        scene.climbers.forEach((c, i) => {
            const lane = i % lanes;
            const x = (this.w / (lanes + 1)) * (lane + 1) + (Math.floor(i / lanes) % 2 ? 30 : -30);
            const y = yOf(c.alt);
            if (c.leader && !this.lowFx) {
                const glow = ctx.createRadialGradient(x, y - 14, 0, x, y - 14, 46);
                glow.addColorStop(0, 'rgba(253, 224, 71, 0.4)');
                glow.addColorStop(1, 'rgba(253, 224, 71, 0)');
                ctx.fillStyle = glow;
                ctx.fillRect(x - 46, y - 60, 92, 92);
            }
            ctx.save();
            ctx.translate(x, y - 15);
            rocket(ctx, 27, safeColor(c.color), { boost: c.boost ? 1 : 0, time: this.time + i });
            ctx.restore();
            const tag = this.label(`${c.name} · ${Math.round(c.alt)} m`, c.leader ? '#fde047' : '#ffffff', 13);
            ctx.drawImage(tag.canvas, x - tag.w / 2, y + 4, tag.w, tag.h);
        });

        for (const f of this.floaters) {
            const tag = this.label(f.text, f.color, 18);
            ctx.globalAlpha = Math.min(1, (f.life / f.max) * 2);
            ctx.drawImage(tag.canvas, f.x * this.w - tag.w / 2, yOf(f.y) - tag.h - 18, tag.w, tag.h);
        }
        ctx.globalAlpha = 1;
    }
}
