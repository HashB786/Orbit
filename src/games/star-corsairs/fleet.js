// Other people's ships, as this screen sees them: each one glides towards where its latest snapshot
// says it is now, and every new bolt in a snapshot becomes a visible bolt flying across the sector.
// Used by the teacher's big screen (all ships) and by every student device (everyone but themselves).

import { BOLT, decodeShip, shipAt } from './rules';

const wrapAngle = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));

export class Fleet {
    constructor({ me = null } = {}) {
        this.me = me;
        this.raw = {};
        this.ships = new Map(); // playerId -> { snap, text, x, y, a, seen }
        this.bolts = []; // { pid, x, y, a, t0, done }
    }

    setRaw(raw) {
        this.raw = raw || {};
    }

    update(now, dt) {
        for (const [pid, text] of Object.entries(this.raw)) {
            if (pid === this.me) continue;
            let s = this.ships.get(pid);
            if (!s || s.text !== text) {
                const snap = decodeShip(text);
                if (!snap) continue;
                if (!s) {
                    const at = shipAt(snap, now);
                    s = { snap, text, x: at.x, y: at.y, a: snap.a, seen: snap.n };
                    this.ships.set(pid, s);
                } else {
                    // A new bolt in this snapshot (recent enough to still be flying)
                    if (snap.n > s.seen && now - snap.st < (BOLT.range / BOLT.speed) * 1000) {
                        this.bolts.push({ pid, x: snap.sx, y: snap.sy, a: snap.sa, t0: snap.st, done: false });
                    }
                    s.snap = snap;
                    s.text = text;
                    s.seen = Math.max(s.seen, snap.n);
                }
            }
            const at = shipAt(s.snap, now);
            // Glide there; jump if it is far (a ship that just came back somewhere else)
            if (Math.hypot(at.x - s.x, at.y - s.y) > 260) {
                s.x = at.x;
                s.y = at.y;
            } else {
                const k = Math.min(1, dt * 12);
                s.x += (at.x - s.x) * k;
                s.y += (at.y - s.y) * k;
            }
            s.a += wrapAngle(s.snap.a - s.a) * Math.min(1, dt * 14);
        }
        for (const pid of [...this.ships.keys()]) if (!(pid in this.raw)) this.ships.delete(pid);
        const life = (BOLT.range / BOLT.speed) * 1000;
        this.bolts = this.bolts.filter(b => !b.done && now - b.t0 < life);
    }

    boltPos(b, now) {
        const d = (Math.max(0, now - b.t0) / 1000) * BOLT.speed;
        return { x: b.x + Math.cos(b.a) * d, y: b.y + Math.sin(b.a) * d };
    }
}
