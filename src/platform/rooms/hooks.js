// React hooks for live rooms, shared by every live game.

import { useEffect, useState } from 'react';
import { getRealtime } from '../realtime';

export const useRealtime = () => {
    const [state, setState] = useState({ rt: null, error: null });
    useEffect(() => {
        let cancelled = false;
        getRealtime()
            .then(rt => !cancelled && setState({ rt, error: null }))
            .catch(error => !cancelled && setState({ rt: null, error }));
        return () => {
            cancelled = true;
        };
    }, []);
    return state;
};

// Live value at a path; `undefined` while loading, `null` when empty
export const useRoomValue = (rt, path) => {
    const [value, setValue] = useState(undefined);
    useEffect(() => {
        if (!rt || !path) return undefined;
        setValue(undefined);
        return rt.onValue(path, setValue);
    }, [rt, path]);
    return value;
};

// Server-synced clock that re-renders every `ms`
export const useServerNow = (rt, ms = 500) => {
    const [now, setNow] = useState(() => (rt ? rt.now() : Date.now()));
    useEffect(() => {
        const tick = () => setNow(rt ? rt.now() : Date.now());
        tick();
        const timer = setInterval(tick, ms);
        return () => clearInterval(timer);
    }, [rt, ms]);
    return now;
};

export const formatClock = (ms) => {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
};

// Leaderboard order: score, then duel wins, then name
export const rankPlayers = (players) =>
    Object.entries(players || {})
        .filter(([, p]) => p && !p.kicked && p.name)
        .map(([id, p]) => ({ id, ...p, score: p.score || 0 }))
        .sort((a, b) => b.score - a.score || (b.wins || 0) - (a.wins || 0) || a.name.localeCompare(b.name));
