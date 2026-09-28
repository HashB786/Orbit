// Game rooms: create (host), join (student, no account), presence and moderation.
// Game-specific logic lives in each game's host controller; this file is shared by all live games.
//
// rooms/{code}/
//   meta      { code, gameId, hostId, hostName, status: 'lobby'|'live'|'ended', locked, createdAt, settings, setTitle, ... }
//   set       { title, questions }
//   host      { connected, lastSeen }
//   players/{playerId}
//             written by the player: name, color, joinedAt, connected, lastSeen
//             written by the host:   score, status, matchId, kicked, stats...

import { getRealtime, getTabId } from '../realtime';
import { cleanName, randomName, colorFor } from './names';
import { roomPath, HEARTBEAT_MS } from './shared';

export { roomPath, isOnline, OFFLINE_AFTER_MS, HEARTBEAT_MS } from './shared';

export const MAX_PLAYERS = 100;

export class RoomError extends Error {
    constructor(reason, message) {
        super(message);
        this.reason = reason;
    }
}

const ROOM_ERRORS = {
    'not-found': "We couldn't find a game with that code. Check the numbers and try again.",
    ended: 'That game has already finished.',
    locked: 'The teacher has locked this game.',
    started: 'This game has already started and is not accepting new players.',
    full: 'This game is full.',
    kicked: 'You were removed from this game.',
    'bad-name': 'Please enter a nickname.',
    'name-taken': 'This nickname is already taken. Try another one.'
};

const fail = (reason) => {
    throw new RoomError(reason, ROOM_ERRORS[reason] || 'Something went wrong.');
};

export const isValidCode = (code) => /^\d{6}$/.test(String(code));

// ---------- HOST ----------

export const createRoom = async ({ gameId, set, settings, hostName, setId = null }) => {
    const rt = await getRealtime();
    let code = null;

    for (let attempt = 0; attempt < 12 && !code; attempt++) {
        const candidate = String(100000 + Math.floor(Math.random() * 900000));
        const { committed } = await rt.transaction(`codes/${candidate}`, current => {
            if (current) return undefined; // taken
            return { hostId: rt.clientId, createdAt: rt.now() };
        });
        if (committed) code = candidate;
    }
    if (!code) throw new Error('Could not reserve a room code. Please try again.');

    await rt.set(roomPath(code), {
        meta: {
            code,
            gameId,
            hostId: rt.clientId,
            hostName: cleanName(hostName) || 'Teacher',
            status: 'lobby',
            locked: false,
            createdAt: rt.now(),
            settings,
            setTitle: set.title,
            setId,
            questionCount: set.questions.length
        },
        set: { title: set.title, questions: set.questions },
        host: { connected: true, lastSeen: rt.now() }
    });
    return code;
};

// New room with the same set and settings. Students still on the old room's final screen
// see `nextCode` and move over automatically, keeping their nickname.
export const playAgain = async (oldCode) => {
    const rt = await getRealtime();
    const [meta, set] = await Promise.all([rt.get(roomPath(oldCode, 'meta')), rt.get(roomPath(oldCode, 'set'))]);
    if (!meta || !set) throw new Error('The old game could not be found.');
    const questions = Array.isArray(set.questions) ? set.questions : Object.values(set.questions || {});
    const code = await createRoom({
        gameId: meta.gameId,
        set: { title: set.title, questions },
        settings: meta.settings,
        hostName: meta.hostName,
        setId: meta.setId || null
    });
    await rt.update(roomPath(oldCode, 'meta'), { nextCode: code });
    return code;
};

export const isRoomHost = async (code) => {
    const rt = await getRealtime();
    const meta = await rt.get(roomPath(code, 'meta'));
    return { meta, isHost: !!meta && meta.hostId === rt.clientId };
};

// ---------- PLAYER ----------

// Remembers which player this tab/device is in a room, so refreshing or reopening rejoins as the same player
const sessionKey = (code) => `orbit.session.${code}`;

const readSession = (storage, code) => {
    try {
        const raw = storage.getItem(sessionKey(code));
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

// This tab's player (survives refresh) and this device's last player (survives closing the tab)
export const getTabSession = (code) => readSession(sessionStorage, code);
export const getDeviceSession = (code) => readSession(localStorage, code);

export const getPlayer = async (code, playerId) => {
    const rt = await getRealtime();
    return { player: await rt.get(roomPath(code, 'players', playerId)), now: rt.now() };
};

const saveSession = (code, session) => {
    try {
        const raw = JSON.stringify(session);
        sessionStorage.setItem(sessionKey(code), raw);
        localStorage.setItem(sessionKey(code), raw);
    } catch {
        /* private mode: rejoin just won't be automatic */
    }
};

export const forgetSession = (code) => {
    try {
        sessionStorage.removeItem(sessionKey(code));
        localStorage.removeItem(sessionKey(code));
    } catch {
        /* ignore */
    }
};

// Peek at a room before asking for a nickname
export const inspectRoom = async (code) => {
    if (!isValidCode(code)) fail('not-found');
    const rt = await getRealtime();
    const meta = await rt.get(roomPath(code, 'meta'));
    if (!meta) fail('not-found');
    return meta;
};

export const joinRoom = async (code, rawName, { resume = null } = {}) => {
    const rt = await getRealtime();
    const meta = await inspectRoom(code);
    if (meta.status === 'ended') fail('ended');

    // Rejoin an existing player (same tab after refresh, or same device after closing the tab)
    if (resume?.playerId) {
        const existing = await rt.get(roomPath(code, 'players', resume.playerId));
        if (existing?.kicked) fail('kicked');
        if (existing) {
            await rt.update(roomPath(code, 'players', resume.playerId), { connected: true, lastSeen: rt.now() });
            saveSession(code, { playerId: resume.playerId, name: existing.name });
            return { playerId: resume.playerId, name: existing.name, meta };
        }
    }

    if (meta.locked) fail('locked');
    if (meta.status === 'live' && meta.settings?.lateJoin === false) fail('started');

    const players = (await rt.get(roomPath(code, 'players'))) || {};
    const list = Object.values(players);
    if (list.filter(p => !p.kicked).length >= MAX_PLAYERS) fail('full');

    const taken = list.filter(p => !p.kicked).map(p => p.name);
    const tabPlayerId = `${rt.clientId}_${getTabId()}`;
    let name;
    if (meta.settings?.randomNames) {
        name = randomName(taken);
    } else {
        name = cleanName(rawName);
        if (!name) fail('bad-name');
        const lower = name.toLowerCase();
        // Same tab coming back with the same name: continue as that player (keeps the score)
        const own = players[tabPlayerId];
        if (own && !own.kicked && String(own.name).toLowerCase() === lower) {
            return joinRoom(code, rawName, { resume: { playerId: tabPlayerId } });
        }
        if (taken.some(t => String(t).toLowerCase() === lower)) fail('name-taken');
    }

    // A player record can't be rewritten (security rules), so a tab that already
    // played in this room under another name gets a fresh id
    const playerId = players[tabPlayerId] ? `${tabPlayerId}${Math.random().toString(36).slice(2, 6)}` : tabPlayerId;
    // update() writes each field separately, which the security rules check one by one
    await rt.update(roomPath(code, 'players', playerId), {
        name,
        color: colorFor(list.length),
        joinedAt: rt.now(),
        connected: true,
        lastSeen: rt.now()
    });
    saveSession(code, { playerId, name });
    return { playerId, name, meta };
};

// Keeps `connected` / `lastSeen` fresh for a player or the host; returns a cleanup function
// beatWhenHidden: the host keeps running in a background tab, a student's hidden phone is not playing
export const attachPresence = (rt, basePath, { beatWhenHidden = false } = {}) => {
    let stopped = false;

    const register = async () => {
        if (stopped) return;
        try {
            await rt.onDisconnect(`${basePath}/connected`).set(false);
            await rt.update(basePath, { connected: true, lastSeen: rt.now() });
        } catch (err) {
            console.error('Presence failed:', err);
        }
    };

    register();
    const unsubscribeConnection = rt.onConnectionChange?.(connected => {
        if (connected) register();
    });

    const beat = () => {
        if (!stopped && (beatWhenHidden || !document.hidden)) rt.update(basePath, { lastSeen: rt.now(), connected: true }).catch(() => {});
    };
    const timer = setInterval(beat, HEARTBEAT_MS);
    const onVisible = () => {
        if (!document.hidden) beat();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
        stopped = true;
        clearInterval(timer);
        document.removeEventListener('visibilitychange', onVisible);
        unsubscribeConnection?.();
        rt.onDisconnect(`${basePath}/connected`).cancel().catch(() => {});
    };
};

export const leaveRoom = async (code, playerId) => {
    const rt = await getRealtime();
    await rt.update(roomPath(code, 'players', playerId), { connected: false, lastSeen: 0 });
    forgetSession(code);
};

// ---------- MODERATION (host) ----------

export const setRoomLocked = async (code, locked) => {
    const rt = await getRealtime();
    await rt.update(roomPath(code, 'meta'), { locked: !!locked });
};

export const kickPlayer = async (code, playerId) => {
    const rt = await getRealtime();
    await rt.update(roomPath(code, 'players', playerId), { kicked: true, status: 'kicked' });
};
