// Shared helpers for the local / in-memory realtime databases.
// They mimic Firebase Realtime Database semantics: null deletes, empty objects vanish,
// arrays are stored as index-keyed objects and come back as arrays.

export const splitPath = (path) => String(path || '').split('/').filter(Boolean);

export const joinPath = (...parts) => parts.flatMap(p => splitPath(p)).join('/');

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Deep-copies a value into "database form": no undefined/null, arrays -> objects, no empty objects
export const toStored = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'object') return value;
    const source = Array.isArray(value) ? Object.fromEntries(value.map((v, i) => [String(i), v])) : value;
    const out = {};
    for (const [k, v] of Object.entries(source)) {
        const stored = toStored(v);
        if (stored !== null) out[k] = stored;
    }
    return Object.keys(out).length ? out : null;
};

// Converts index-keyed objects back into arrays (like Firebase does) and deep-copies
export const toReadable = (value) => {
    if (!isPlainObject(value)) return value;
    const keys = Object.keys(value);
    const numeric = keys.length > 0 && keys.every(k => /^(0|[1-9]\d*)$/.test(k));
    if (numeric) {
        const max = Math.max(...keys.map(Number));
        if (keys.length > max / 2) {
            const arr = new Array(max + 1).fill(null);
            for (const k of keys) arr[Number(k)] = toReadable(value[k]);
            return arr;
        }
    }
    const out = {};
    for (const k of keys) out[k] = toReadable(value[k]);
    return out;
};

export const getAt = (tree, parts) => {
    let node = tree;
    for (const p of parts) {
        if (!isPlainObject(node) || !(p in node)) return null;
        node = node[p];
    }
    return node === undefined ? null : node;
};

// Writes (or deletes, when stored === null) at parts, pruning empty parents. Returns the new root.
export const setAt = (tree, parts, stored) => {
    if (parts.length === 0) return stored;
    const root = isPlainObject(tree) ? tree : {};
    const stack = [root];
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!isPlainObject(node[p])) {
            if (stored === null) return root; // nothing to delete
            node[p] = {};
        }
        node = node[p];
        stack.push(node);
    }
    const last = parts[parts.length - 1];
    if (stored === null) delete node[last];
    else node[last] = stored;

    // prune empty objects bottom-up
    for (let i = parts.length - 1; i > 0; i--) {
        const parent = stack[i - 1];
        const key = parts[i - 1];
        if (isPlainObject(parent[key]) && Object.keys(parent[key]).length === 0) delete parent[key];
        else break;
    }
    return Object.keys(root).length ? root : null;
};

// Turns update(path, { 'a/b': 1, c: 2 }) into absolute [parts, value] writes
export const expandUpdate = (basePath, patch) =>
    Object.entries(patch || {}).map(([k, v]) => [splitPath(joinPath(basePath, k)), v]);

const overlaps = (a, b) => {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) if (a[i] !== b[i]) return false;
    return true;
};

// Batches change notifications and only calls listeners whose value really changed
export class ListenerHub {
    constructor(read) {
        this.read = read; // (parts) => readable value
        this.listeners = new Set();
        this.pending = new Set();
        this.scheduled = false;
    }

    add(path, cb) {
        const listener = { parts: splitPath(path), cb, last: undefined };
        this.listeners.add(listener);
        this.pending.add(listener);
        this.schedule();
        return () => {
            this.listeners.delete(listener);
            this.pending.delete(listener);
        };
    }

    changed(changedParts) {
        for (const l of this.listeners) {
            if (changedParts.some(parts => overlaps(parts, l.parts))) this.pending.add(l);
        }
        this.schedule();
    }

    changedAll() {
        for (const l of this.listeners) this.pending.add(l);
        this.schedule();
    }

    schedule() {
        if (this.scheduled) return;
        this.scheduled = true;
        queueMicrotask(() => {
            this.scheduled = false;
            const batch = [...this.pending];
            this.pending.clear();
            for (const l of batch) {
                if (!this.listeners.has(l)) continue;
                const value = this.read(l.parts);
                const json = JSON.stringify(value);
                if (json === l.last) continue;
                l.last = json;
                try {
                    l.cb(value);
                } catch (err) {
                    console.error('Realtime listener failed:', err);
                }
            }
        });
    }
}

export const randomKey = () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let key = Date.now().toString(36);
    for (let i = 0; i < 8; i++) key += chars[Math.floor(Math.random() * chars.length)];
    return key;
};
