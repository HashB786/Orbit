// In-memory realtime database: used by automated tests and as the core of the local test mode.

import { splitPath, toStored, toReadable, getAt, setAt, expandUpdate, ListenerHub, randomKey } from './tree';

export class MemoryRealtime {
    constructor({ clientId = randomKey() } = {}) {
        this.mode = 'memory';
        this.clientId = clientId;
        this.store = { tree: null }; // shared by clients made with createSharedMemory
        this.hub = new ListenerHub(parts => toReadable(getAt(this.store.tree, parts)));
        this.disconnectOps = new Map(); // key -> () => void
        this.offset = 0;
    }

    now() {
        return Date.now() + this.offset;
    }

    newKey() {
        return randomKey();
    }

    // --- raw ops (overridden by the localStorage version to persist) ---
    applyWrites(writes) {
        for (const [parts, value] of writes) {
            this.store.tree = setAt(this.store.tree, parts, toStored(value));
        }
        this.hub.changed(writes.map(([parts]) => parts));
    }

    readParts(parts) {
        return toReadable(getAt(this.store.tree, parts));
    }

    // --- public API (all async to match Firebase) ---
    async get(path) {
        return this.readParts(splitPath(path));
    }

    async set(path, value) {
        this.applyWrites([[splitPath(path), value]]);
    }

    async update(path, patch) {
        this.applyWrites(expandUpdate(path, patch));
    }

    async remove(path) {
        this.applyWrites([[splitPath(path), null]]);
    }

    onValue(path, cb) {
        return this.hub.add(path, cb);
    }

    async transaction(path, updateFn) {
        const parts = splitPath(path);
        const current = this.readParts(parts);
        const next = updateFn(current);
        if (next === undefined) return { committed: false, value: current };
        this.applyWrites([[parts, next]]);
        return { committed: true, value: this.readParts(parts) };
    }

    onDisconnect(path) {
        const parts = splitPath(path);
        const key = parts.join('/');
        return {
            set: async (value) => { this.disconnectOps.set(key, () => this.applyWrites([[parts, value]])); },
            update: async (patch) => { this.disconnectOps.set(key, () => this.applyWrites(expandUpdate(key, patch))); },
            remove: async () => { this.disconnectOps.set(key, () => this.applyWrites([[parts, null]])); },
            cancel: async () => { this.disconnectOps.delete(key); }
        };
    }

    // Tests: pretend this client lost its connection
    simulateDisconnect() {
        const ops = [...this.disconnectOps.values()];
        this.disconnectOps.clear();
        ops.forEach(op => op());
    }
}

// Several "clients" sharing one tree (for multi-player tests in Node)
export const createSharedMemory = () => {
    const shared = new MemoryRealtime({ clientId: 'server' });
    const clients = [];
    const make = (clientId) => {
        const client = Object.create(shared);
        client.clientId = clientId;
        client.disconnectOps = new Map();
        clients.push(client);
        return client;
    };
    return { shared, client: make, clients };
};
