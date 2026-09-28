// "Offline test mode": a realtime database shared by all tabs of this browser via localStorage.
// Every leaf value is its own localStorage key, so two tabs writing different fields never
// overwrite each other (like Firebase). Other tabs learn about changes through `storage` events.

import { MemoryRealtime } from './memory';
import { splitPath, toStored, setAt } from './tree';

const PREFIX = 'orbit.ldb:';

const flatten = (parts, stored, out) => {
    if (stored !== null && typeof stored === 'object') {
        for (const [k, v] of Object.entries(stored)) flatten([...parts, k], v, out);
    } else if (stored !== null) {
        out.push([parts.join('/'), stored]);
    }
    return out;
};

export class LocalRealtime extends MemoryRealtime {
    constructor(opts) {
        super(opts);
        this.mode = 'local';
        this.loadAll();

        this.onStorage = (e) => {
            if (e.storageArea !== localStorage) return;
            if (e.key === null) {
                this.loadAll();
                this.hub.changedAll();
                return;
            }
            if (!e.key.startsWith(PREFIX)) return;
            const parts = splitPath(e.key.slice(PREFIX.length));
            let value = null;
            if (e.newValue !== null) {
                try {
                    value = JSON.parse(e.newValue);
                } catch {
                    value = null;
                }
            }
            this.store.tree = setAt(this.store.tree, parts, value);
            this.hub.changed([parts]);
        };
        window.addEventListener('storage', this.onStorage);

        // Best effort "onDisconnect": run the registered writes when the tab goes away
        this.onPageHide = () => this.simulateDisconnect();
        window.addEventListener('pagehide', this.onPageHide);
    }

    loadAll() {
        let tree = null;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(PREFIX)) continue;
            try {
                tree = setAt(tree, splitPath(key.slice(PREFIX.length)), JSON.parse(localStorage.getItem(key)));
            } catch {
                /* ignore corrupt entries */
            }
        }
        this.store.tree = tree;
    }

    applyWrites(writes) {
        for (const [parts, value] of writes) {
            const path = parts.join('/');
            const stored = toStored(value);

            // Remove the old value at this path (the node itself, its children and any leaf ancestor)
            const doomed = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key || !key.startsWith(PREFIX)) continue;
                const p = key.slice(PREFIX.length);
                if (p === path || p.startsWith(path ? `${path}/` : '') || (path.startsWith(`${p}/`))) doomed.push(key);
            }
            doomed.forEach(k => localStorage.removeItem(k));

            for (const [leafPath, leaf] of flatten(parts, stored, [])) {
                try {
                    localStorage.setItem(PREFIX + leafPath, JSON.stringify(leaf));
                } catch (err) {
                    console.error('Offline test mode: storage is full', err);
                }
            }
            this.store.tree = setAt(this.store.tree, parts, stored);
        }
        this.hub.changed(writes.map(([parts]) => parts));
    }
}

// Remove every room older than `maxAgeMs` so localStorage doesn't fill up during testing
export const pruneLocalRooms = (maxAgeMs = 6 * 60 * 60 * 1000) => {
    const now = Date.now();
    const created = new Map();
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const m = key && key.match(/^orbit\.ldb:rooms\/([^/]+)\/meta\/createdAt$/);
        if (m) created.set(m[1], Number(localStorage.getItem(key)));
    }
    const stale = [...created].filter(([, t]) => now - t > maxAgeMs).map(([code]) => code);
    if (!stale.length) return;
    const doomed = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && stale.some(code => key.startsWith(`${PREFIX}rooms/${code}/`) || key.startsWith(`${PREFIX}codes/${code}`))) doomed.push(key);
    }
    doomed.forEach(k => localStorage.removeItem(k));
};
