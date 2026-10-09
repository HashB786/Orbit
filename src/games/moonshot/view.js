// Moonshot on a canvas. ClimbView is what a student sees: their climber, the platforms around them,
// classmates climbing nearby and the storm below. TowerView is the teacher's big screen: the whole
// class racing up one tall ladder of zones.

import { WIDTH, VIEW_H, BAND, PLAYER, ZONES, zoneAt, STATION_EVERY } from './world';

const TAU = Math.PI * 2;
const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
export const safeColor = (c) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : '#60a5fa');

const PLATFORM = {
    solid: { top: '#94a3b8', body: '#475569' },
    station: { top: '#6ee7b7', body: '#047857' },
    move: { top: '#93c5fd', body: '#1d4ed8' },
    ice: { top: '#bae6fd', body: '#0e7490' },
    spring: { top: '#fde047', body: '#a16207' },
    crumble: { top: '#d6d3d1', body: '#78716c' }
};

const removeAt = (arr, i) => {
    arr[i] = arr[arr.length - 1];
    arr.pop();
};

// A little rocket, drawn pointing up, one metre tall
const rocket = (ctx, s, color, { boost = false, flip = false, time = 0 } = {}) => {
    ctx.save();
    if (flip) ctx.scale(-1, 1);
    if (boost) {
        const flick = 0.7 + 0.3 * Math.sin(time * 40);
        const g = ctx.createLinearGradient(0, 0, 0, s * 1.5 * flick);
        g.addColorStop(0, 'rgba(253, 224, 71, 0.95)');
        g.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-s * 0.26, 0);
        ctx.lineTo(0, s * 1.5 * flick);
        ctx.lineTo(s * 0.26, 0);
        ctx.closePath();
        ctx.fill();
    }
    // Body
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.05);
    ctx.quadraticCurveTo(s * 0.42, -s * 0.35, s * 0.36, s * 0.05);
    ctx.lineTo(-s * 0.36, s * 0.05);
    ctx.quadraticCurveTo(-s * 0.42, -s * 0.35, 0, -s * 1.05);
    ctx.closePath();
    const body = ctx.createLinearGradient(-s * 0.4, 0, s * 0.4, 0);
    body.addColorStop(0, '#ffffff');
    body.addColorStop(0.45, color);
    body.addColorStop(1, '#0f172a');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.lineWidth = s * 0.07;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.stroke();
    // Fins and window
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.moveTo(-s * 0.34, -s * 0.1);
    ctx.lineTo(-s * 0.62, s * 0.12);
    ctx.lineTo(-s * 0.34, s * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.34, -s * 0.1);
    ctx.lineTo(s * 0.62, s * 0.12);
    ctx.lineTo(s * 0.34, s * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.arc(0, -s * 0.5, s * 0.17, 0, TAU);
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
            p.vy -= 6 * dt;
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

    puff(x, y, count = 10, color = '#e2e8f0') {
        const cap = this.lowFx ? 60 : 220;
        const n = Math.round(count * (this.lowFx ? 0.45 : 1));
        for (let i = 0; i < n && this.puffs.length < cap; i++) {
            const a = Math.random() * TAU;
            const sp = 1 + Math.random() * 4;
            const life = 0.3 + Math.random() * 0.5;
            this.puffs.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, max: life, color, size: 0.06 + Math.random() * 0.09 });
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

    // The sky changes colour as you climb through the zones
    sky(ctx, alt) {
        const i = zoneAt(alt);
        const here = ZONES[i];
        const next = ZONES[i + 1];
        const k = next ? Math.min(1, Math.max(0, (alt - here.at) / (next.at - here.at))) : 0;
        const blend = (a, b) => {
            const pa = [1, 3, 5].map(o => parseInt(a.slice(o, o + 2), 16));
            const pb = [1, 3, 5].map(o => parseInt(b.slice(o, o + 2), 16));
            return `rgb(${pa.map((v, j) => Math.round(v + (pb[j] - v) * k)).join(',')})`;
        };
        const top = next ? blend(here.sky[0], next.sky[0]) : here.sky[0];
        const bottom = next ? blend(here.sky[1], next.sky[1]) : here.sky[1];
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
        this.stars = Array.from({ length: this.lowFx ? 40 : 90 }, () => ({
            x: Math.random() * this.w,
            y: Math.random() * 2000,
            r: Math.random() < 0.85 ? 1 : 2,
            k: 0.25 + Math.random() * 0.5
        }));
    }

    sx(x) { return this.ox + x * this.scale; }
    sy(y) { return this.h / 2 + (this.cam.y - y) * this.scale; }

    render(scene) {
        const ctx = this.ctx;
        this.cam = scene.camera;
        const s = this.scale;
        this.sky(ctx, this.cam.y);

        let jx = 0;
        let jy = 0;
        if (this.shakeLeft > 0) {
            jx = (Math.random() - 0.5) * 14 * this.shakeLeft;
            jy = (Math.random() - 0.5) * 14 * this.shakeLeft;
        }
        ctx.save();
        ctx.translate(jx, jy);

        // Stars drift past slower than the climber: it makes the height feel real
        for (const star of this.stars) {
            const y = ((star.y - this.cam.y * s * star.k) % (this.h + 40) + this.h + 40) % (this.h + 40) - 20;
            ctx.globalAlpha = 0.25 + star.k;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(star.x, y, star.r, star.r);
        }
        ctx.globalAlpha = 1;

        // The walls on both sides
        ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
        ctx.fillRect(0, 0, this.ox, this.h);
        ctx.fillRect(this.ox + WIDTH * s, 0, this.w - this.ox - WIDTH * s, this.h);

        // Every tenth row is a station: draw its altitude on the wall
        const first = Math.floor((this.cam.y - VIEW_H) / (BAND * STATION_EVERY));
        for (let k = Math.max(0, first); k <= first + 3; k++) {
            const y = this.sy(k * BAND * STATION_EVERY);
            if (y < -20 || y > this.h + 20) continue;
            ctx.strokeStyle = 'rgba(110, 231, 183, 0.25)';
            ctx.lineWidth = 1;
            ctx.setLineDash([6, 8]);
            ctx.beginPath();
            ctx.moveTo(this.ox, y);
            ctx.lineTo(this.ox + WIDTH * s, y);
            ctx.stroke();
            ctx.setLineDash([]);
            const tag = this.label(`${Math.round(k * BAND * STATION_EVERY)} m`, 'rgba(167, 243, 208, 0.9)', 11);
            ctx.drawImage(tag.canvas, this.ox + 2, y - tag.h - 2, tag.w, tag.h);
        }

        this.drawPieces(scene);

        // Classmates
        for (const g of scene.ghosts) {
            const x = this.sx(g.x);
            const y = this.sy(g.y);
            ctx.globalAlpha = 0.45;
            ctx.save();
            ctx.translate(x, y - PLAYER.h * s * 0.5);
            rocket(ctx, PLAYER.h * s * 0.86, safeColor(g.color), { boost: g.boost, flip: g.left, time: this.time });
            ctx.restore();
            const tag = this.label(g.name, safeColor(g.color), 11);
            ctx.globalAlpha = 0.7;
            ctx.drawImage(tag.canvas, x - tag.w / 2, y - PLAYER.h * s - tag.h, tag.w, tag.h);
            ctx.globalAlpha = 1;
        }

        this.drawMe(scene);

        // Puffs and floating text
        for (const p of this.puffs) {
            ctx.globalAlpha = Math.max(0, p.life / p.max);
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

        this.drawStorm(scene);
        ctx.restore();
    }

    drawPieces(scene) {
        const ctx = this.ctx;
        const s = this.scale;
        for (const piece of scene.pieces) {
            const x = this.sx(piece.px);
            const y = this.sy(piece.y);
            if (y < -60 || y > this.h + 60) continue;
            if (piece.pickup) {
                const bob = Math.sin(this.time * 3 + piece.x) * 3;
                const r = 0.3 * s;
                const color = piece.pickup === 'fuel' ? '#fde047' : piece.pickup === 'boots' ? '#86efac' : '#7dd3fc';
                if (!this.lowFx) {
                    ctx.fillStyle = `${color}33`;
                    ctx.beginPath();
                    ctx.arc(x, y + bob, r * 2, 0, TAU);
                    ctx.fill();
                }
                ctx.fillStyle = color;
                ctx.beginPath();
                if (piece.pickup === 'fuel') {
                    ctx.roundRect?.(x - r * 0.6, y + bob - r, r * 1.2, r * 2, r * 0.3);
                    if (!ctx.roundRect) ctx.rect(x - r * 0.6, y + bob - r, r * 1.2, r * 2);
                } else {
                    ctx.arc(x, y + bob, r, 0, TAU);
                }
                ctx.fill();
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
                continue;
            }
            if (piece.rock) {
                const r = 0.62 * s;
                ctx.fillStyle = '#78716c';
                ctx.beginPath();
                ctx.arc(x, y, r, 0, TAU);
                ctx.fill();
                ctx.fillStyle = '#44403c';
                ctx.beginPath();
                ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.28, 0, TAU);
                ctx.arc(x + r * 0.25, y + r * 0.3, r * 0.2, 0, TAU);
                ctx.fill();
                continue;
            }
            const style = PLATFORM[piece.kind] || PLATFORM.solid;
            const w = piece.w * s;
            const thick = Math.max(5, 0.32 * s);
            const wobble = piece.shaking ? Math.sin(this.time * 50) * 2 : 0;
            ctx.fillStyle = style.body;
            ctx.fillRect(x + wobble, y, w, thick);
            ctx.fillStyle = style.top;
            ctx.fillRect(x + wobble, y - thick * 0.3, w, thick * 0.4);
            if (piece.kind === 'station') {
                // The altitude is already on the wall beside it
                ctx.fillStyle = 'rgba(110, 231, 183, 0.22)';
                ctx.fillRect(x, y - thick * 0.3 - 2, w, 2);
            } else if (piece.kind === 'spring') {
                ctx.strokeStyle = '#fef08a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (let i = 0; i < 3; i++) {
                    ctx.moveTo(x + w * (0.25 + i * 0.25) - 4, y - 4);
                    ctx.lineTo(x + w * (0.25 + i * 0.25), y - 9);
                    ctx.lineTo(x + w * (0.25 + i * 0.25) + 4, y - 4);
                }
                ctx.stroke();
            }
        }
    }

    drawMe(scene) {
        const ctx = this.ctx;
        const s = this.scale;
        const me = scene.me;
        const x = this.sx(me.x);
        const y = this.sy(me.y);
        const size = PLAYER.h * s;
        ctx.save();
        ctx.translate(x, y - size * 0.5);
        if (me.shield) {
            ctx.globalAlpha = 0.3 + 0.1 * Math.sin(this.time * 6);
            ctx.fillStyle = '#7dd3fc';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.85, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        if (me.answering || me.caught) {
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = me.caught ? '#c084fc' : '#6ee7b7';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.9, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        rocket(ctx, size, me.boots ? '#86efac' : '#f8fafc', { boost: me.boost, flip: me.face < 0, time: this.time });
        ctx.restore();
    }

    drawStorm(scene) {
        const ctx = this.ctx;
        const top = this.sy(scene.storm);
        if (top > this.h + 40) return;
        const y = Math.max(-40, top);
        const g = ctx.createLinearGradient(0, y, 0, Math.min(this.h, y + 120));
        g.addColorStop(0, 'rgba(192, 132, 252, 0.75)');
        g.addColorStop(0.35, 'rgba(109, 40, 217, 0.85)');
        g.addColorStop(1, 'rgba(30, 10, 60, 0.98)');
        ctx.fillStyle = g;
        ctx.fillRect(0, y, this.w, this.h - y + 40);
        // A churning edge
        ctx.strokeStyle = 'rgba(233, 213, 255, 0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let px = 0; px <= this.w; px += 14) {
            const wy = y + Math.sin(px * 0.05 + this.time * 4) * 5 + Math.sin(px * 0.013 - this.time * 2.4) * 4;
            if (px === 0) ctx.moveTo(px, wy);
            else ctx.lineTo(px, wy);
        }
        ctx.stroke();
    }
}

// ---------- the teacher's big screen ----------

export class TowerView extends Base {
    onResize() {
        this.stars = Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() < 0.85 ? 1 : 2, a: 0.2 + Math.random() * 0.6 }));
    }

    render(scene) {
        const ctx = this.ctx;
        const top = Math.max(60, scene.top * 1.15 + 25);
        const bottom = Math.max(0, Math.min(scene.storm, scene.top - 10));
        const span = Math.max(40, top - bottom);
        const pad = 46;
        const yOf = (alt) => this.h - pad - ((alt - bottom) / span) * (this.h - pad * 1.4);
        this.sky(ctx, scene.top * 0.6);
        for (const star of this.stars) {
            ctx.globalAlpha = star.a;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(star.x * this.w, star.y * this.h, star.r, star.r);
        }
        ctx.globalAlpha = 1;

        // Zone bands with their names
        for (let i = 0; i < ZONES.length; i++) {
            const zone = ZONES[i];
            if (zone.at > top) break;
            const y = yOf(zone.at);
            if (y > this.h || y < -20) continue;
            ctx.strokeStyle = `${zone.tint}55`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.w, y);
            ctx.stroke();
            ctx.setLineDash([]);
            const tag = this.label(`${scene.zoneNames[i] || ''} · ${zone.at} m`, zone.tint, 13);
            ctx.drawImage(tag.canvas, 8, y - tag.h - 1, tag.w, tag.h);
        }

        // The storm, rising from the bottom
        const sy = yOf(scene.storm);
        if (sy < this.h + 10) {
            const g = ctx.createLinearGradient(0, sy, 0, this.h);
            g.addColorStop(0, 'rgba(192, 132, 252, 0.7)');
            g.addColorStop(1, 'rgba(46, 16, 101, 0.95)');
            ctx.fillStyle = g;
            ctx.fillRect(0, sy, this.w, this.h - sy);
            ctx.strokeStyle = 'rgba(233, 213, 255, 0.9)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let px = 0; px <= this.w; px += 16) {
                const wy = sy + Math.sin(px * 0.03 + this.time * 3) * 5;
                if (px === 0) ctx.moveTo(px, wy);
                else ctx.lineTo(px, wy);
            }
            ctx.stroke();
        }

        // Everyone racing: spread across the width so names do not sit on top of each other
        const lanes = Math.max(1, Math.min(scene.climbers.length, Math.floor(this.w / 130)));
        scene.climbers.forEach((c, i) => {
            const lane = i % lanes;
            const x = (this.w / (lanes + 1)) * (lane + 1) + (Math.floor(i / lanes) % 2 ? 26 : -26);
            const y = yOf(c.alt);
            ctx.save();
            ctx.translate(x, y - 14);
            rocket(ctx, 26, safeColor(c.color), { boost: c.boost, time: this.time + i });
            ctx.restore();
            const tag = this.label(`${c.name} · ${Math.round(c.alt)} m`, c.leader ? '#fde047' : '#ffffff', 13);
            ctx.drawImage(tag.canvas, x - tag.w / 2, y + 2, tag.w, tag.h);
        });

        for (const f of this.floaters) {
            const tag = this.label(f.text, f.color, 18);
            ctx.globalAlpha = Math.min(1, (f.life / f.max) * 2);
            ctx.drawImage(tag.canvas, f.x * this.w - tag.w / 2, yOf(f.y) - tag.h - 18, tag.w, tag.h);
        }
        ctx.globalAlpha = 1;
    }
}
