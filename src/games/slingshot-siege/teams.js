import { isOnline } from '../../platform/rooms/shared';

export const MAX_SHIELD = 100;

// Scoring, shared by the host (which applies it) and the screens (which explain it)
export const RULES = {
    answerPoints: 5,
    answerShield: 4,
    hitShielded: 10,
    hitOpen: 25,
    shieldDamage: 20,
    maxShield: MAX_SHIELD,
    fireBonus: 5,
    bounty: 5,
    starShield: 30,
    streak: 3
};

// The team strictly ahead of everyone (and above zero) carries the bounty
export const leaderOf = (siege) => {
    const count = siege?.count || 0;
    let best = null;
    let top = 0;
    let tie = false;
    for (let i = 0; i < count; i++) {
        const s = siege.teams?.[i]?.score || 0;
        if (s > top) {
            top = s;
            best = i;
            tie = false;
        } else if (s === top && s > 0) tie = true;
    }
    return tie ? null : best;
};

// The same space teams as Grid Battle, so classes recognise them across games
export const TEAMS = [
    { name: 'Nova', color: '#34d399' },
    { name: 'Comet', color: '#60a5fa' },
    { name: 'Pulsar', color: '#f472b6' },
    { name: 'Quasar', color: '#fbbf24' },
    { name: 'Nebula', color: '#a78bfa' },
    { name: 'Aurora', color: '#2dd4bf' }
];

export const MAX_TEAMS = TEAMS.length;

export const teamOf = (i) => TEAMS[((Number(i) || 0) % TEAMS.length + TEAMS.length) % TEAMS.length];

export const clampTeams = (n) => Math.min(MAX_TEAMS, Math.max(2, Math.round(Number(n)) || 4));

// Team ranking: score, then shield, then team order
export const rankTeams = (siege) => {
    const count = siege?.count || 0;
    return Array.from({ length: count }, (_, i) => ({
        i,
        score: siege.teams?.[i]?.score || 0,
        shield: siege.teams?.[i]?.shield ?? MAX_SHIELD
    })).sort((a, b) => b.score - a.score || b.shield - a.shield || a.i - b.i);
};

// Not-kicked players per team, best first (lobby columns and scoreboards)
export const teamMembers = (players, count, now) => {
    const lists = Array.from({ length: count }, () => []);
    for (const [id, p] of Object.entries(players || {})) {
        if (!p?.name || p.kicked || !Number.isInteger(p.team) || p.team < 0 || p.team >= count) continue;
        lists[p.team].push({ id, ...p, online: isOnline(p, now) });
    }
    lists.forEach(list => list.sort((a, b) => (b.score || 0) - (a.score || 0) || a.name.localeCompare(b.name)));
    return lists;
};
