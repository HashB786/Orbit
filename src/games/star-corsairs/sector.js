// Star Corsairs on a canvas. Two cameras: on a student's device it follows their ship, zoomed in, with a
// minimap in the corner; on the teacher's big screen it shows the whole sector. The owner hands over a
// `driver(dt)` that returns what to draw each frame (see Cockpit and the host screen).

import { WORLD, MID, BOSS_R, SHIP_R, ROCKS, ORBS, BOLT } from './rules';

const TAU = Math.PI * 2;
const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
export const LASER_COLORS = ['#f8fafc', '#22d3ee', '#e879f9']; // by laser upgrade level
const GOLD = '#fde047';
const VIEW = 760; // world units across the shorter side of a student's screen

const removeAt = (arr, i) => {
    arr[i] = arr[arr.length - 1];
    arr.pop();
};

export const safeColor = (c) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : '#60a5fa');

// Ship hulls, drawn pointing right (+x) around (0, 0) with radius ~1
const HULLS = [
    (c) => { // Dart
        c.beginPath();
        c.moveTo(1.15, 0);
        c.lineTo(-0.8, -0.72);
        c.lineTo(-0.45, 0);
        c.lineTo(-0.8, 0.72);
        c.closePath();
    },
    (c) => { // Falcon
        c.beginPath();
        c.moveTo(1.05, 0);
        c.lineTo(0.15, -0.3);
        c.lineTo(-0.35, -1);
        c.lineTo(-0.7, -0.95);
        c.lineTo(-0.5, -0.25);
        c.lineTo(-0.85, 0);
        c.lineTo(-0.5, 0.25);
        c.lineTo(-0.7, 0.95);
        c.lineTo(-0.35, 1);
        c.lineTo(0.15, 0.3);
        c.closePath();
    },
    (c) => { // Saucer
        c.beginPath();
        c.ellipse(0, 0, 1, 0.82, 0, 0, TAU);
    },
    (c) => { // Hammer
        c.beginPath();
        c.moveTo(1, -0.28);
        c.lineTo(1, 0.28);
        c.lineTo(0.2, 0.42);
        c.lineTo(0.05, 0.95);
        c.lineTo(-0.9, 0.95);
        c.lineTo(-0.9, -0.95);
        c.lineTo(0.05, -0.95);
        c.lineTo(0.2, -0.42);
        c.closePath();
    }
];

export class SectorView {
    // follow: a student's zoomed view that follows `scene.camera`; otherwise the whole sector
    constructor(canvas, { lowFx = false, follow = false } = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.lowFx = lowFx;
        this.follow = follow;
        this.driver = null;
        this.cam = { x: MID, y: MID };
        this.particles = [];
        this.rings = [];
        this.floaters = [];
        this.shakeLeft = 0;
        this.shipSprites = new Map();
        this.labels = new Map();
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
        this.scale = this.follow
            ? Math.min(1, Math.max(0.42, Math.min(this.w, this.h) / VIEW))
            : (Math.min(this.w, this.h) / WORLD) * 0.97;
        this.shipSprites.clear();
        this.labels.clear();
        this.buildBackground();
        this.buildRocks();
    }

    // World <-> screen pixels (through the camera)
    sx(x) { return (x - this.cam.x) * this.scale + this.w / 2; }
    sy(y) { return (y - this.cam.y) * this.scale + this.h / 2; }
    toWorld(px, py) { return { x: (px - this.w / 2) / this.scale + this.cam.x, y: (py - this.h / 2) / this.scale + this.cam.y }; }
    visible(x, y, r = 0) {
        const m = r * this.scale + 40;
        const px = this.sx(x);
        const py = this.sy(y);
        return px > -m && px < this.w + m && py > -m && py < this.h + m;
    }

    // ---------- effects ----------

    burst(x, y, color, count, speed = 1) {
        const cap = this.lowFx ? 80 : 300;
        const n = Math.round(count * (this.lowFx ? 0.4 : 1));
        for (let i = 0; i < n && this.particles.length < cap; i++) {
            const a = Math.random() * TAU;
            const s = (60 + Math.random() * 260) * speed;
            const life = 0.35 + Math.random() * 0.55;
            this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, size: 2 + Math.random() * 3 });
        }
    }

    ring(x, y, color, size = 1) { this.rings.push({ x, y, color, size, life: 0.6, max: 0.6 }); }

    floater(x, y, text, color = '#ffffff', size = 1) {
        this.floaters.push({ x, y, text, color, size, life: 1.4, max: 1.4 });
    }

    explode(x, y, color) {
        this.burst(x, y, color, 44, 1.3);
        this.burst(x, y, '#fde68a', 24, 0.8);
        this.burst(x, y, '#ffffff', 10, 0.5);
        this.ring(x, y, color, 1.6);
    }

    shake(amount = 1) { if (!this.lowFx) this.shakeLeft = Math.max(this.shakeLeft, 0.35 * amount); }

    // ---------- loop ----------

    frame(now) {
        if (!this.running) return;
        this.raf = requestAnimationFrame(this.frame);
        // Low-end devices draw every other frame
        if (this.lowFx) {
            this.skip = !this.skip;
            if (this.skip) return;
        }
        const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
        this.last = now;
        this.time += dt;
        const scene = this.driver?.(dt);
        if (!scene) return;
        this.update(dt);
        this.render(scene);
    }

    update(dt) {
        const tick = (list, fn) => {
            for (let i = list.length - 1; i >= 0; i--) {
                const item = list[i];
                item.life -= dt;
                if (item.life <= 0) removeAt(list, i);
                else fn?.(item);
            }
        };
        tick(this.particles, (p) => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.95;
            p.vy *= 0.95;
        });
        tick(this.rings);
        tick(this.floaters, (f) => { f.y -= 50 * dt; });
        this.shakeLeft = Math.max(0, this.shakeLeft - dt);
    }

    // ---------- cached layers ----------

    buildBackground() {
        // A tile of stars, repeated (and drifting slower than the ships in the student view)
        const size = 512;
        const tile = document.createElement('canvas');
        tile.width = size;
        tile.height = size;
        const c = tile.getContext('2d');
        c.fillStyle = '#060a1f';
        c.fillRect(0, 0, size, size);
        for (let i = 0; i < 70; i++) {
            const s = Math.random() < 0.85 ? 1 : 2;
            c.globalAlpha = 0.25 + Math.random() * 0.6;
            c.fillStyle = Math.random() < 0.15 ? '#a5f3fc' : '#ffffff';
            c.fillRect(Math.random() * size, Math.random() * size, s, s);
        }
        this.starPattern = this.ctx.createPattern(tile, 'repeat');
    }

    buildRocks() {
        this.rockSprites = {};
        for (const [kind, def] of Object.entries(ROCKS)) {
            const r = def.r * this.scale;
            const size = Math.ceil(r * 2 + 6);
            const off = document.createElement('canvas');
            off.width = Math.ceil(size * this.dpr);
            off.height = Math.ceil(size * this.dpr);
            const c = off.getContext('2d');
            c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            const m = size / 2;
            const gold = kind === 'gold';
            c.beginPath();
            const sides = 11;
            for (let i = 0; i < sides; i++) {
                const a = (i / sides) * TAU;
                const k = gold ? 1 : 0.78 + ((i * 37) % 10) / 45;
                if (i === 0) c.moveTo(m + Math.cos(a) * r * k, m + Math.sin(a) * r * k);
                else c.lineTo(m + Math.cos(a) * r * k, m + Math.sin(a) * r * k);
            }
            c.closePath();
            const g = c.createRadialGradient(m - r * 0.35, m - r * 0.35, r * 0.1, m, m, r);
            g.addColorStop(0, gold ? '#fef9c3' : '#a8a29e');
            g.addColorStop(0.6, gold ? '#facc15' : '#78716c');
            g.addColorStop(1, gold ? '#ca8a04' : '#44403c');
            c.fillStyle = g;
            c.fill();
            c.lineWidth = Math.max(1, 1.5 * this.scale);
            c.strokeStyle = gold ? '#fef08a' : 'rgba(28, 25, 23, 0.6)';
            c.stroke();
            if (!gold) {
                c.fillStyle = 'rgba(41, 37, 36, 0.5)';
                for (const [dx, dy, k] of [[-0.3, -0.15, 0.2], [0.28, 0.25, 0.16], [0.05, -0.42, 0.11]]) {
                    c.beginPath();
                    c.arc(m + dx * r, m + dy * r, k * r, 0, TAU);
                    c.fill();
                }
            }
            this.rockSprites[kind] = { canvas: off, size };
        }
    }

    shipSprite(design, color) {
        const key = `${design}|${color}`;
        let sprite = this.shipSprites.get(key);
        if (sprite) return sprite;
        const r = SHIP_R * this.scale;
        const size = Math.ceil(r * 2.6 + 4);
        const off = document.createElement('canvas');
        off.width = Math.ceil(size * this.dpr);
        off.height = Math.ceil(size * this.dpr);
        const c = off.getContext('2d');
        c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        c.translate(size / 2, size / 2);
        c.scale(r, r);
        HULLS[design % HULLS.length](c);
        const g = c.createLinearGradient(-1, -1, 1, 1);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.35, color);
        g.addColorStop(1, '#0f172a');
        c.fillStyle = g;
        c.fill();
        c.lineWidth = 0.09;
        c.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        c.stroke();
        c.fillStyle = 'rgba(186, 230, 253, 0.95)';
        c.beginPath();
        c.ellipse(design === 2 ? 0 : 0.2, 0, 0.24, 0.17, 0, 0, TAU);
        c.fill();
        sprite = { canvas: off, size };
        this.shipSprites.set(key, sprite);
        return sprite;
    }

    // Player names, drawn once each
    label(text, color, bold) {
        const key = `${text}|${color}|${bold ? 1 : 0}`;
        let sprite = this.labels.get(key);
        if (sprite) return sprite;
        const px = Math.max(10, Math.round((bold ? 15 : 13) * Math.min(1.2, this.follow ? 1 : this.scale * 2.4)));
        this.ctx.font = `800 ${px}px ${FONT}`;
        const w = Math.ceil(this.ctx.measureText(text).width) + 8;
        const h = px + 8;
        const off = document.createElement('canvas');
        off.width = Math.ceil(w * this.dpr);
        off.height = Math.ceil(h * this.dpr);
        const c = off.getContext('2d');
        c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        c.font = `800 ${px}px ${FONT}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.lineWidth = 3;
        c.strokeStyle = 'rgba(3, 5, 15, 0.9)';
        c.strokeText(text, w / 2, h / 2);
        c.fillStyle = color;
        c.fillText(text, w / 2, h / 2);
        sprite = { canvas: off, w, h };
        if (this.labels.size > 300) this.labels.clear();
        this.labels.set(key, sprite);
        return sprite;
    }

    // ---------- drawing ----------

    render(scene) {
        const ctx = this.ctx;
        if (this.follow && scene.camera) this.cam = { x: scene.camera.x, y: scene.camera.y };
        else this.cam = { x: MID, y: MID };
        let jx = 0;
        let jy = 0;
        if (this.shakeLeft > 0) {
            jx = (Math.random() - 0.5) * 16 * this.shakeLeft;
            jy = (Math.random() - 0.5) * 16 * this.shakeLeft;
        }
        ctx.save();
        ctx.translate(jx, jy);
        this.drawBackground();
        this.drawBoss(scene);
        this.drawOrbs(scene);
        this.drawLoot(scene);
        this.drawRocks(scene);
        this.drawBolts(scene);
        this.drawShips(scene);
        this.drawEffects();
        ctx.restore();
        if (this.follow) this.drawMinimap(scene);
    }

    drawBackground() {
        const ctx = this.ctx;
        const s = this.scale;
        // Stars (a slower layer in the student view, so flying feels fast)
        const par = this.follow ? 0.5 : 0;
        const ox = ((this.cam.x * s * par) % 512 + 512) % 512;
        const oy = ((this.cam.y * s * par) % 512 + 512) % 512;
        ctx.save();
        ctx.translate(-ox, -oy);
        ctx.fillStyle = this.starPattern;
        ctx.fillRect(0, 0, this.w + 512, this.h + 512);
        ctx.restore();
        // A glow in the middle of the sector
        const cx = this.sx(MID);
        const cy = this.sy(MID);
        if (!this.lowFx) {
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, WORLD * 0.6 * s);
            g.addColorStop(0, 'rgba(76, 29, 149, 0.3)');
            g.addColorStop(0.5, 'rgba(14, 116, 144, 0.1)');
            g.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, this.w, this.h);
        }
        // Outside the sector is darker; the edge glows
        const x0 = this.sx(0);
        const y0 = this.sy(0);
        const x1 = this.sx(WORLD);
        const y1 = this.sy(WORLD);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        if (x0 > 0) ctx.fillRect(0, 0, x0, this.h);
        if (x1 < this.w) ctx.fillRect(x1, 0, this.w - x1, this.h);
        const left = Math.max(0, x0);
        const width = Math.min(this.w, x1) - left;
        if (y0 > 0 && width > 0) ctx.fillRect(left, 0, width, y0);
        if (y1 < this.h && width > 0) ctx.fillRect(left, y1, width, this.h - y1);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = Math.max(2, 4 * s);
        ctx.setLineDash([12 * s + 4, 10 * s + 4]);
        ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
        ctx.setLineDash([]);
    }

    drawBoss(scene) {
        const boss = scene.boss;
        if (!boss || !this.visible(MID, MID, BOSS_R * 1.8)) return;
        const ctx = this.ctx;
        const s = this.scale;
        const now = scene.now;
        const x = this.sx(MID);
        const y = this.sy(MID);
        const enter = Math.min(1, Math.max(0, (now - boss.at) / 1500));
        let scale = 0.4 + 0.6 * enter;
        let alpha = enter;
        if (boss.over) {
            const t = Math.min(1, (now - (boss.endedAt || now)) / 1500);
            if (boss.over === 'gone') {
                scale *= 1 - 0.7 * t;
                alpha *= 1 - t;
            } else {
                alpha *= 1 - t;
                scale *= 1 + 0.4 * t;
            }
            if (alpha <= 0.01) return;
        }
        const r = BOSS_R * s * scale;
        ctx.save();
        ctx.globalAlpha = alpha;
        if (!this.lowFx) {
            const g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.6);
            g.addColorStop(0, 'rgba(74, 222, 128, 0.35)');
            g.addColorStop(1, 'rgba(74, 222, 128, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, r * 1.6, 0, TAU);
            ctx.fill();
        }
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.ellipse(x, y + r * 0.08, r, r * 0.42, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.96, r * 0.36, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(134, 239, 172, 0.85)';
        ctx.beginPath();
        ctx.ellipse(x, y - r * 0.18, r * 0.42, r * 0.34, 0, Math.PI, TAU);
        ctx.fill();
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * TAU + this.time * 1.4;
            ctx.fillStyle = i % 2 ? '#4ade80' : '#facc15';
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.26, Math.max(1.5, 4 * s), 0, TAU);
            ctx.fill();
        }
        if (scene.bossFlash && this.time - scene.bossFlash < 0.15) {
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(x, y, r, r * 0.42, 0, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = alpha;
        }
        if (!boss.over) {
            const share = Math.max(0, boss.hp / Math.max(1, boss.max));
            ctx.lineWidth = Math.max(4, 9 * s);
            ctx.lineCap = 'round';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.beginPath();
            ctx.arc(x, y, r * 1.2, 0, TAU);
            ctx.stroke();
            ctx.strokeStyle = share > 0.5 ? '#4ade80' : share > 0.25 ? '#facc15' : '#f87171';
            ctx.beginPath();
            ctx.arc(x, y, r * 1.2, -Math.PI / 2, -Math.PI / 2 + TAU * share);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawOrbs(scene) {
        if (!scene.orbs?.length) return;
        const ctx = this.ctx;
        const r = ORBS.r * this.scale;
        for (const o of scene.orbs) {
            if (!this.visible(o.x, o.y, ORBS.r)) continue;
            const x = this.sx(o.x);
            const y = this.sy(o.y);
            if (!this.lowFx) {
                ctx.fillStyle = 'rgba(74, 222, 128, 0.25)';
                ctx.beginPath();
                ctx.arc(x, y, r * 1.9, 0, TAU);
                ctx.fill();
            }
            ctx.fillStyle = '#86efac';
            ctx.beginPath();
            ctx.arc(x, y, r, 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#f0fdf4';
            ctx.beginPath();
            ctx.arc(x, y, r * 0.45, 0, TAU);
            ctx.fill();
        }
    }

    drawLoot(scene) {
        const ctx = this.ctx;
        const s = this.scale;
        for (const l of scene.loot || []) {
            if (!this.visible(l.x, l.y, 30)) continue;
            const x = this.sx(l.x);
            const y = this.sy(l.y) + Math.sin(this.time * 3 + l.x) * 4 * s;
            const size = Math.max(4, (8 + Math.min(10, l.n / 4)) * s);
            if (!this.lowFx) {
                ctx.fillStyle = 'rgba(103, 232, 249, 0.22)';
                ctx.beginPath();
                ctx.arc(x, y, size * 2, 0, TAU);
                ctx.fill();
            }
            ctx.fillStyle = l.n >= 20 ? GOLD : '#67e8f9';
            ctx.beginPath();
            ctx.moveTo(x, y - size);
            ctx.lineTo(x + size * 0.65, y);
            ctx.lineTo(x, y + size);
            ctx.lineTo(x - size * 0.65, y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    drawRocks(scene) {
        const ctx = this.ctx;
        const s = this.scale;
        for (const rock of scene.rocks || []) {
            const def = ROCKS[rock.kind] || ROCKS.m;
            if (!this.visible(rock.x, rock.y, def.r * 3)) continue;
            const x = this.sx(rock.x);
            const y = this.sy(rock.y);
            const gold = rock.kind === 'gold';
            if (gold && !this.lowFx) {
                const len = Math.hypot(rock.vx, rock.vy) || 1;
                const tx = -rock.vx / len;
                const ty = -rock.vy / len;
                const tail = 160 * s;
                const g = ctx.createLinearGradient(x, y, x + tx * tail, y + ty * tail);
                g.addColorStop(0, 'rgba(253, 224, 71, 0.75)');
                g.addColorStop(1, 'rgba(253, 224, 71, 0)');
                ctx.strokeStyle = g;
                ctx.lineWidth = def.r * 1.4 * s;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + tx * tail, y + ty * tail);
                ctx.stroke();
            }
            const sprite = this.rockSprites?.[rock.kind];
            if (sprite) {
                ctx.save();
                ctx.globalAlpha = rock.fade ?? 1;
                ctx.translate(x, y);
                ctx.rotate(rock.rot || 0);
                ctx.drawImage(sprite.canvas, -sprite.size / 2, -sprite.size / 2, sprite.size, sprite.size);
                const lost = rock.max - rock.hp;
                if (lost > 0) {
                    ctx.strokeStyle = gold ? 'rgba(120, 53, 15, 0.8)' : 'rgba(253, 186, 116, 0.85)';
                    ctx.lineWidth = Math.max(1, 2 * s);
                    for (let i = 0; i < Math.min(6, lost * 2); i++) {
                        const a = i * 2.4;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(Math.cos(a) * def.r * 0.5 * s, Math.sin(a) * def.r * 0.5 * s);
                        ctx.lineTo(Math.cos(a + 0.4) * def.r * 0.85 * s, Math.sin(a + 0.4) * def.r * 0.85 * s);
                        ctx.stroke();
                    }
                }
                if (rock.flash && this.time - rock.flash < 0.12) {
                    ctx.globalAlpha = 0.6;
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(0, 0, def.r * s * 0.85, 0, TAU);
                    ctx.fill();
                }
                ctx.restore();
            }
            // Hit points as pips under the rock
            const pip = Math.max(2, 5 * s);
            const gap = pip * 1.6;
            const left = x - ((rock.max - 1) * gap) / 2;
            for (let i = 0; i < rock.max; i++) {
                ctx.fillStyle = i < rock.hp ? (gold ? GOLD : '#e2e8f0') : 'rgba(255, 255, 255, 0.18)';
                ctx.fillRect(left + i * gap - pip / 2, y + def.r * s + 5 * s, pip, pip);
            }
        }
    }

    drawBolts(scene) {
        const ctx = this.ctx;
        const s = this.scale;
        const len = 34 * s + 4;
        ctx.lineCap = 'round';
        for (const b of scene.bolts || []) {
            if (!this.visible(b.x, b.y, 40)) continue;
            const x = this.sx(b.x);
            const y = this.sy(b.y);
            const tx = x - Math.cos(b.a) * len;
            const ty = y - Math.sin(b.a) * len;
            if (!this.lowFx) {
                ctx.strokeStyle = b.color;
                ctx.globalAlpha = 0.45;
                ctx.lineWidth = BOLT.r * 2.4 * s + 3;
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.strokeStyle = b.mine ? '#ffffff' : b.color;
            ctx.lineWidth = BOLT.r * 0.9 * s + 1.5;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    drawShips(scene) {
        const ctx = this.ctx;
        const s = this.scale;
        const r = SHIP_R * s;
        for (const p of scene.ships || []) {
            if (p.hidden || !this.visible(p.x, p.y, SHIP_R * 3)) continue;
            const x = this.sx(p.x);
            const y = this.sy(p.y);
            const color = safeColor(p.color);
            ctx.save();
            ctx.globalAlpha = p.cloaked ? (p.me ? 0.45 : 0.1 + 0.08 * Math.sin(this.time * 6 + x)) : 1;
            ctx.translate(x, y);
            // Engine flame while thrusting
            if (p.thrust && !this.lowFx) {
                const flick = 0.75 + 0.25 * Math.sin(this.time * 40 + x);
                const c = Math.cos(p.a);
                const sn = Math.sin(p.a);
                ctx.fillStyle = 'rgba(251, 146, 60, 0.85)';
                ctx.beginPath();
                ctx.moveTo(-c * r * 0.7 - sn * r * 0.35, -sn * r * 0.7 + c * r * 0.35);
                ctx.lineTo(-c * r * (1.4 + 0.5 * flick), -sn * r * (1.4 + 0.5 * flick));
                ctx.lineTo(-c * r * 0.7 + sn * r * 0.35, -sn * r * 0.7 - c * r * 0.35);
                ctx.closePath();
                ctx.fill();
            }
            const sprite = this.shipSprite(p.design || 0, color);
            ctx.rotate(p.a);
            ctx.drawImage(sprite.canvas, -sprite.size / 2, -sprite.size / 2, sprite.size, sprite.size);
            ctx.rotate(-p.a);
            if (p.flash && this.time - p.flash < 0.3) {
                ctx.globalAlpha = (1 - (this.time - p.flash) / 0.3) * 0.8;
                ctx.fillStyle = '#fca5a5';
                ctx.beginPath();
                ctx.arc(0, 0, r * 1.1, 0, TAU);
                ctx.fill();
                ctx.globalAlpha = p.cloaked ? 0.2 : 1;
            }
            // Shield: one segment per point
            const sr = r * 1.5;
            const max = p.armor || 3;
            ctx.lineWidth = Math.max(1.5, (2.5 + (p.armorLevel || 0)) * s);
            ctx.lineCap = 'round';
            const seg = TAU / max;
            for (let i = 0; i < max; i++) {
                ctx.strokeStyle = i < p.shield ? 'rgba(125, 211, 252, 0.9)' : 'rgba(248, 113, 113, 0.3)';
                ctx.beginPath();
                ctx.arc(0, 0, sr, -Math.PI / 2 + i * seg + 0.14, -Math.PI / 2 + (i + 1) * seg - 0.14);
                ctx.stroke();
            }
            // Docked (answering questions) or protected: a bubble
            if (p.docked || p.safe) {
                ctx.globalAlpha = p.docked ? 0.3 : 0.18 + 0.08 * Math.sin(this.time * 5);
                ctx.fillStyle = p.docked ? '#a7f3d0' : '#e0f2fe';
                ctx.beginPath();
                ctx.arc(0, 0, sr + 6 * s, 0, TAU);
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.strokeStyle = p.docked ? '#6ee7b7' : '#bae6fd';
                ctx.lineWidth = Math.max(1, 1.5 * s);
                ctx.beginPath();
                ctx.arc(0, 0, sr + 6 * s, 0, TAU);
                ctx.stroke();
            }
            if (p.magnet && !this.lowFx) {
                ctx.fillStyle = '#67e8f9';
                for (let i = 0; i < 3; i++) {
                    const a = this.time * 2.5 + (i * TAU) / 3;
                    ctx.fillRect(Math.cos(a) * sr * 1.2 - 1.5, Math.sin(a) * sr * 1.2 - 1.5, 3, 3);
                }
            }
            if (p.leader) {
                ctx.globalAlpha = p.cloaked ? 0.3 : 1;
                ctx.fillStyle = GOLD;
                const cw = 20 * s + 6;
                const ch = 12 * s + 4;
                const top = -sr - 10 * s - ch;
                ctx.beginPath();
                ctx.moveTo(-cw / 2, top + ch);
                ctx.lineTo(-cw / 2, top + ch * 0.3);
                ctx.lineTo(-cw / 4, top + ch * 0.6);
                ctx.lineTo(0, top);
                ctx.lineTo(cw / 4, top + ch * 0.6);
                ctx.lineTo(cw / 2, top + ch * 0.3);
                ctx.lineTo(cw / 2, top + ch);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
            if (!p.cloaked || p.me) {
                const label = this.label(p.name, p.me ? '#ffffff' : color, p.me);
                ctx.drawImage(label.canvas, x - label.w / 2, y + sr + 2, label.w, label.h);
            }
        }
    }

    drawEffects() {
        const ctx = this.ctx;
        const s = this.scale;
        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life / p.max);
            ctx.fillStyle = p.color;
            ctx.fillRect(this.sx(p.x) - p.size / 2, this.sy(p.y) - p.size / 2, p.size, p.size);
        }
        for (const r of this.rings) {
            const k = 1 - r.life / r.max;
            ctx.globalAlpha = (1 - k) * 0.9;
            ctx.strokeStyle = r.color;
            ctx.lineWidth = Math.max(1.5, 3 * s);
            ctx.beginPath();
            ctx.arc(this.sx(r.x), this.sy(r.y), (16 + k * 90) * s * r.size, 0, TAU);
            ctx.stroke();
        }
        for (const f of this.floaters) {
            const k = f.life / f.max;
            ctx.globalAlpha = Math.min(1, k * 2);
            ctx.font = `900 ${Math.round(Math.max(13, 30 * s) * f.size)}px ${FONT}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(3, 5, 15, 0.85)';
            ctx.strokeText(f.text, this.sx(f.x), this.sy(f.y));
            ctx.fillStyle = f.color;
            ctx.fillText(f.text, this.sx(f.x), this.sy(f.y));
        }
        ctx.globalAlpha = 1;
    }

    // The whole sector in the corner of a student's screen
    drawMinimap(scene) {
        const ctx = this.ctx;
        const size = Math.round(Math.min(150, Math.max(92, Math.min(this.w, this.h) * 0.24)));
        const x0 = 10;
        const y0 = 10;
        const k = size / WORLD;
        ctx.fillStyle = 'rgba(3, 7, 18, 0.78)';
        ctx.fillRect(x0, y0, size, size);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x0 + 0.5, y0 + 0.5, size - 1, size - 1);
        const dot = (x, y, r, color) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x0 + Math.max(0, Math.min(WORLD, x)) * k, y0 + Math.max(0, Math.min(WORLD, y)) * k, r, 0, TAU);
            ctx.fill();
        };
        if (scene.boss && !scene.boss.over) dot(MID, MID, 6, '#4ade80');
        for (const rock of scene.rocks || []) dot(rock.x, rock.y, rock.kind === 'gold' ? 3 : 1.5, rock.kind === 'gold' ? GOLD : '#78716c');
        for (const l of scene.loot || []) dot(l.x, l.y, 1.5, '#67e8f9');
        for (const p of scene.ships || []) {
            if (p.hidden || p.me || p.cloaked) continue;
            dot(p.x, p.y, 2.5, safeColor(p.color));
        }
        const me = (scene.ships || []).find(p => p.me);
        if (me && !me.hidden) {
            dot(me.x, me.y, 3.5, '#ffffff');
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.strokeRect(x0 + (this.cam.x - this.w / 2 / this.scale) * k, y0 + (this.cam.y - this.h / 2 / this.scale) * k, (this.w / this.scale) * k, (this.h / this.scale) * k);
        }
    }
}
