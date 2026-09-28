// Pure room helpers (no browser or Firebase imports), shared by the room service and host controllers.

export const HEARTBEAT_MS = 5000;
export const OFFLINE_AFTER_MS = 20000;

export const roomPath = (code, ...rest) => ['rooms', code, ...rest].join('/');

export const isOnline = (entity, now) =>
    !!entity && entity.connected !== false && (!entity.lastSeen || now - entity.lastSeen < OFFLINE_AFTER_MS);

// Sets/deletes a value at a slash path inside a plain object tree (used for optimistic local state)
export const assignPath = (root, parts, value) => {
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (node[p] === null || typeof node[p] !== 'object') {
            if (value === null || value === undefined) return;
            node[p] = {};
        }
        node = node[p];
    }
    const last = parts[parts.length - 1];
    if (value === null || value === undefined) delete node[last];
    else node[last] = value;
};

export const readPath = (root, parts) => {
    let node = root;
    for (const p of parts) {
        if (node === null || typeof node !== 'object' || !(p in node)) return null;
        node = node[p];
    }
    return node ?? null;
};

// Firebase rejects multi-path updates where one key is an ancestor of another:
// keep only the top-most keys and take their final value from the (already updated) state.
export const collapsePatch = (patch, state) => {
    const keys = Object.keys(patch).sort((a, b) => a.length - b.length);
    const kept = [];
    for (const key of keys) {
        if (kept.some(k => key.startsWith(`${k}/`))) continue;
        kept.push(key);
    }
    const out = {};
    for (const key of kept) {
        const hasDescendants = keys.some(k => k.startsWith(`${key}/`));
        const value = hasDescendants ? readPath(state, key.split('/')) : patch[key];
        out[key] = value === undefined ? null : clone(value);
    }
    return out;
};

const clone = (v) => (v === null || typeof v !== 'object' ? v : JSON.parse(JSON.stringify(v)));

// A student's answer counts only once it has fully arrived: `ok`, plus the time when it was found
export const isCompleteResult = (r) => !!r && typeof r.ok === 'boolean' && (!r.ok || Number.isFinite(r.t));

export const completeResults = (results) =>
    Object.fromEntries(Object.entries(results || {}).filter(([, r]) => isCompleteResult(r)));
