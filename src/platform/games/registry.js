// Every game Orbit can host. Adding a game = adding an entry here + its components.
//
// kind: 'live'  -> students join with a room code on their own devices (host screen + player screen)
//       'board' -> played on one big screen / smart board, no join code
// compat: per question type: 'native' | 'adapted' | 'unsupported'
// settings: rendered automatically by the host setup screen (see components/host/SettingsForm)

import { lazy } from 'react';

const minutes = (list) => list.map(m => ({ value: m * 60, label: `${m} min` }));

export const GAMES = [
    {
        id: 'comet-clash',
        name: 'Comet Clash',
        kind: 'live',
        tagline: 'Blast the asteroid with the right answer: 1v1 Duels, or everyone at once in a Meteor Shower.',
        howItWorks: [
            'Students join with the code on their own phones or laptops.',
            'Duels: two students race on the same question. First to blast the answer +1, both miss −1, and the duel winner gets a bonus.',
            'Meteor Shower: everyone answers every question. Up to 100 points for speed, −100 for not finding it.',
            'Missed questions come back later, and you get a class report at the end.'
        ],
        players: '2+ players, own devices',
        accent: 'from-emerald-400 to-sky-500',
        compat: { mc: 'native', tf: 'native', multi: 'native', order: 'native', typed: 'adapted' },
        typeNotes: {
            typed: 'Shown as asteroids: the answer plus decoys from the rest of the set.',
            multi: 'Blast every correct asteroid.',
            order: 'Blast the asteroids in the right order.'
        },
        minQuestions: 3,
        settings: [
            {
                key: 'mode', label: 'Mode', type: 'segmented', default: 'duel',
                options: [{ value: 'duel', label: 'Duels' }, { value: 'shower', label: 'Meteor Shower' }],
                help: s => (s.mode === 'shower'
                    ? 'Everyone plays every question. The fastest correct player gets 100; the others get 100 × fastest time ÷ their time.'
                    : 'Two random students face off; everyone is re-paired until time runs out.')
            },
            { key: 'duration', label: 'Game length', type: 'select', options: minutes([3, 5, 8, 10, 15, 20]), default: 480, showIf: s => s.mode !== 'shower' },
            { key: 'showerQuestions', label: 'Questions', type: 'number', min: 3, max: 40, default: 10, showIf: s => s.mode === 'shower' },
            { key: 'rounds', label: 'Rounds per duel', type: 'number', min: 3, max: 9, default: 5, showIf: s => s.mode !== 'shower' },
            { key: 'roundTime', label: 'Seconds per question', type: 'number', min: 8, max: 40, default: 15, suffix: 's' },
            { key: 'winBonus', label: 'Duel win bonus', type: 'number', min: 0, max: 10, default: 3, suffix: 'pts', showIf: s => s.mode !== 'shower' },
            {
                key: 'missPenalty', label: 'When both miss', type: 'segmented', default: -1, showIf: s => s.mode !== 'shower',
                options: [{ value: 0, label: 'No penalty' }, { value: -1, label: '−1 each' }, { value: -2, label: '−2 each' }]
            },
            {
                key: 'missPoints', label: "Didn't find the answer", type: 'segmented', default: -100, showIf: s => s.mode === 'shower',
                options: [{ value: 0, label: '0' }, { value: -50, label: '−50' }, { value: -100, label: '−100' }]
            },
            { key: 'negativeScores', label: 'Total scores can go below zero', type: 'toggle', default: true },
            { key: 'suddenDeath', label: 'Sudden-death round on a tie', type: 'toggle', default: true, showIf: s => s.mode !== 'shower' },
            { key: 'bots', label: 'Bot rival when nobody is free', type: 'toggle', default: true, showIf: s => s.mode !== 'shower', help: 'Bots never appear on the leaderboard. Beating one gives half the win bonus.' },
            { key: 'botWait', label: 'Seconds before a bot joins', type: 'number', min: 3, max: 30, default: 8, suffix: 's', showIf: s => s.mode !== 'shower' && s.bots },
            {
                key: 'speed', label: 'Asteroid speed', type: 'segmented', default: 'normal',
                options: [{ value: 'calm', label: 'Calm' }, { value: 'normal', label: 'Normal' }, { value: 'fast', label: 'Fast' }]
            },
            {
                key: 'hostTimeout', label: 'If your screen goes offline', type: 'select', default: 180,
                options: [
                    { value: 0, label: 'Wait for me (never end)' },
                    { value: 60, label: 'End the game after 1 min' },
                    { value: 180, label: 'End the game after 3 min' },
                    { value: 300, label: 'End the game after 5 min' }
                ],
                help: 'While your screen is offline the game pauses. Come back in time and it continues where it stopped.'
            },
            { key: 'lateJoin', label: 'Allow joining after the start', type: 'toggle', default: true },
            { key: 'randomNames', label: 'Fun random nicknames', type: 'toggle', default: false, help: 'Students get a generated name like "Cosmic Otter" instead of typing one.' },
            { key: 'studentLeaderboard', label: 'Show rank on student screens', type: 'toggle', default: true },
            { key: 'studentMusic', label: 'Music on student devices', type: 'toggle', default: true, help: 'Soft background music on phones. Each student can mute it.' },
            { key: 'studentSound', label: 'Sound effects on student devices', type: 'toggle', default: true }
        ],
        Host: lazy(() => import('../../games/comet-clash/HostScreen')),
        Player: lazy(() => import('../../games/comet-clash/PlayerScreen'))
    },
    {
        id: 'grid-battle',
        name: 'Grid Battle',
        kind: 'board',
        tagline: 'Space teams explore a board of tiles: questions, black holes, shooting stars and meteor strikes.',
        howItWorks: [
            'Split the class into up to 6 space teams and put the board on the big screen.',
            'Teams take turns picking a tile. Questions are answered out loud and you judge them.',
            'Hidden tiles: black holes (−1), solar winds (reset), shooting stars (+1), meteor strikes (hit a team) and wormholes (lose a turn).'
        ],
        players: 'Teams, one big screen',
        accent: 'from-sky-500 to-indigo-600',
        compat: { mc: 'native', tf: 'native', multi: 'native', order: 'native', typed: 'native' },
        typeNotes: { typed: 'The answer is revealed on screen for you to judge.' },
        minQuestions: 1,
        settings: [
            { key: 'teams', label: 'Teams', type: 'number', min: 2, max: 6, default: 3 },
            { key: 'rows', label: 'Rows', type: 'number', min: 3, max: 8, default: 5 },
            { key: 'cols', label: 'Columns', type: 'number', min: 3, max: 8, default: 6 },
            { key: 'bombs', label: 'Black holes (−1 point)', type: 'number', min: 0, max: 10, default: 4 },
            { key: 'winds', label: 'Solar winds (score reset)', type: 'number', min: 0, max: 5, default: 2 },
            { key: 'bonuses', label: 'Shooting stars (+1 point)', type: 'number', min: 0, max: 10, default: 4 },
            { key: 'grenades', label: 'Meteor strikes (hit a team)', type: 'number', min: 0, max: 5, default: 2 },
            { key: 'skips', label: 'Wormholes (lose a turn)', type: 'number', min: 0, max: 5, default: 2 }
        ],
        validate: (s) => {
            const specials = s.bombs + s.winds + s.bonuses + s.grenades + s.skips;
            const cells = s.rows * s.cols;
            return specials >= cells ? `Too many special tiles: ${specials} specials for ${cells} tiles. Leave room for questions.` : null;
        },
        Board: lazy(() => import('../../games/grid-battle/GridBattle'))
    },
    {
        id: 'millionaire',
        name: 'Who Wants to Be a Millionaire?',
        kind: 'board',
        tagline: 'Climb the money tree on the big screen with lifelines and dramatic reveals.',
        howItWorks: [
            'Play as a whole class or pick a contestant.',
            'Each correct answer climbs the money tree. One wrong answer ends the run.',
            'Use 50:50 and Ask the Audience when you get stuck.'
        ],
        players: 'Whole class, one big screen',
        accent: 'from-indigo-900 to-blue-800',
        compat: { mc: 'native', tf: 'native', typed: 'adapted', multi: 'unsupported', order: 'unsupported' },
        typeNotes: {
            typed: 'Shown as four options: the answer plus decoys from the rest of the set.',
            multi: 'Millionaire always has exactly one right answer.',
            order: 'Millionaire always has exactly one right answer.'
        },
        minQuestions: 3,
        settings: [
            {
                key: 'questionCount', label: 'Questions to the top', type: 'segmented', default: 15,
                options: [{ value: 5, label: '5' }, { value: 10, label: '10' }, { value: 15, label: '15' }]
            },
            { key: 'fiftyFifty', label: '50:50 lifeline', type: 'toggle', default: true },
            { key: 'askAudience', label: 'Ask the Audience lifeline', type: 'toggle', default: true },
            {
                key: 'suspense', label: 'Answer reveal', type: 'segmented', default: 'dramatic',
                options: [{ value: 'quick', label: 'Quick' }, { value: 'dramatic', label: 'Dramatic' }]
            }
        ],
        Board: lazy(() => import('../../games/millionaire/Millionaire'))
    }
];

export const getGame = (id) => GAMES.find(g => g.id === id) || null;

export const defaultSettings = (game) =>
    Object.fromEntries(game.settings.map(s => [s.key, s.default]));

// Fill in missing keys and clamp numbers, so stale or tampered settings can't break a game
export const sanitizeSettings = (game, raw = {}) => {
    const out = {};
    for (const s of game.settings) {
        let v = raw[s.key];
        if (s.type === 'number') {
            v = Number(v);
            if (!Number.isFinite(v)) v = s.default;
            v = Math.min(s.max, Math.max(s.min, Math.round(v)));
        } else if (s.type === 'toggle') {
            v = typeof v === 'boolean' ? v : s.default;
        } else if (s.type === 'select' || s.type === 'segmented') {
            if (!s.options.some(o => o.value === v)) v = s.default;
        }
        out[s.key] = v;
    }
    return out;
};
