// Nickname helpers: cleaning, de-duplication and friendly random names.

const ADJECTIVES = [
    'Cosmic', 'Turbo', 'Lunar', 'Solar', 'Stellar', 'Rapid', 'Brave', 'Clever', 'Mighty', 'Swift',
    'Nova', 'Astro', 'Galactic', 'Orbital', 'Radiant', 'Blazing', 'Quantum', 'Electric', 'Jolly', 'Sneaky',
    'Fuzzy', 'Zippy', 'Gentle', 'Bold', 'Witty', 'Sunny', 'Frosty', 'Lucky', 'Epic', 'Hyper'
];

const NOUNS = [
    'Otter', 'Falcon', 'Panda', 'Comet', 'Rocket', 'Tiger', 'Fox', 'Koala', 'Dolphin', 'Owl',
    'Meteor', 'Nebula', 'Pulsar', 'Lynx', 'Penguin', 'Gecko', 'Moose', 'Badger', 'Raven', 'Yak',
    'Llama', 'Hawk', 'Wombat', 'Quasar', 'Orca', 'Bison', 'Squid', 'Hedgehog', 'Jaguar', 'Beetle'
];

export const PLAYER_COLORS = [
    '#34d399', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#f87171',
    '#2dd4bf', '#fb923c', '#a3e635', '#38bdf8', '#e879f9', '#facc15'
];

export const MAX_NAME = 16;

export const cleanName = (raw) =>
    String(raw ?? '')
        .replace(/[\u0000-\u001f<>]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_NAME);

export const uniqueName = (name, taken) => {
    const lower = new Set([...taken].map(n => String(n).toLowerCase()));
    if (!lower.has(name.toLowerCase())) return name;
    for (let i = 2; i < 1000; i++) {
        const suffix = ` ${i}`;
        const candidate = name.slice(0, MAX_NAME - suffix.length) + suffix;
        if (!lower.has(candidate.toLowerCase())) return candidate;
    }
    return `${name.slice(0, 10)} ${Date.now() % 10000}`;
};

export const randomName = (taken = [], rand = Math.random) => {
    const lower = new Set([...taken].map(n => String(n).toLowerCase()));
    for (let i = 0; i < 50; i++) {
        const name = `${ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)]} ${NOUNS[Math.floor(rand() * NOUNS.length)]}`;
        if (name.length <= MAX_NAME && !lower.has(name.toLowerCase())) return name;
    }
    return uniqueName('Space Cadet', taken);
};

export const colorFor = (index) => PLAYER_COLORS[index % PLAYER_COLORS.length];
