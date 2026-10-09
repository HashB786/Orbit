// Every game Orbit can host. Adding a game = adding an entry here + its components.
//
// kind: 'live'  -> students join with a room code on their own devices (host screen + player screen)
//       'board' -> played on one big screen / smart board, no join code
// compat: per question type: 'native' | 'adapted' | 'unsupported'
// settings: rendered automatically by the host setup screen (see components/host/SettingsForm).
//           `advanced: true` settings stay hidden behind the "Advanced options" button.
//
// Texts are translated. `i18n` names the game's section:
//   games.<i18n>.name / tagline / how[] / players / notes.<type>
//   gs.<i18n>.<settingKey>.label / help / <helpVariant> / options.<value>
// An option `text` is shown as-is (numbers); `label` is a key or [key, vars].

import { lazy } from 'react';

const minutes = (list) => list.map(m => ({ value: m * 60, label: ['units.minutes', { n: m }] }));
const literal = (list) => list.map(([value, text]) => ({ value, text }));

// Optional countdown per question (smart-board games, Slingshot Siege and Star Corsairs)
const questionTimer = [
    { key: 'timer', type: 'toggle', default: false, help: true },
    {
        key: 'timerSeconds', type: 'number', min: 5, max: 120, step: 5, default: 30, suffix: 'units.s',
        showIf: s => s.timer, help: s => (s.useQuestionTime !== false ? 'helpOwn' : null)
    },
    { key: 'useQuestionTime', type: 'toggle', default: true, advanced: true, showIf: s => s.timer }
];

export const GAMES = [
    {
        id: 'comet-clash',
        i18n: 'cc',
        kind: 'live',
        accent: 'from-emerald-400 to-sky-500',
        compat: { mc: 'native', tf: 'native', multi: 'native', order: 'native', typed: 'adapted' },
        notes: ['typed', 'multi', 'order'],
        minQuestions: 3,
        settings: [
            {
                key: 'mode', type: 'segmented', default: 'duel',
                options: [{ value: 'duel' }, { value: 'shower' }],
                help: s => (s.mode === 'shower' ? 'helpShower' : 'helpDuel')
            },
            { key: 'duration', type: 'select', options: minutes([3, 5, 8, 10, 15, 20]), default: 480, showIf: s => s.mode !== 'shower' },
            { key: 'showerQuestions', type: 'number', min: 3, max: 40, default: 10, showIf: s => s.mode === 'shower' },
            { key: 'rounds', type: 'number', min: 3, max: 9, default: 5, showIf: s => s.mode !== 'shower' },
            {
                key: 'roundTime', type: 'number', min: 8, max: 40, default: 15, suffix: 'units.s',
                help: s => (s.useQuestionTime !== false ? 'helpOwn' : null)
            },
            {
                key: 'speed', type: 'segmented', default: 'normal',
                options: [{ value: 'calm' }, { value: 'normal' }, { value: 'fast' }]
            },
            { key: 'useQuestionTime', type: 'toggle', default: true, advanced: true },
            { key: 'winBonus', type: 'number', min: 0, max: 10, default: 3, suffix: 'units.pts', advanced: true, showIf: s => s.mode !== 'shower' },
            {
                key: 'missPenalty', type: 'segmented', default: -1, advanced: true, showIf: s => s.mode !== 'shower',
                options: [{ value: 0 }, { value: -1 }, { value: -2 }]
            },
            {
                key: 'missPoints', type: 'segmented', default: -100, advanced: true, showIf: s => s.mode === 'shower',
                options: literal([[0, '0'], [-50, '−50'], [-100, '−100']])
            },
            { key: 'negativeScores', type: 'toggle', default: true, advanced: true },
            { key: 'suddenDeath', type: 'toggle', default: true, advanced: true, showIf: s => s.mode !== 'shower' },
            { key: 'bots', type: 'toggle', default: true, advanced: true, showIf: s => s.mode !== 'shower', help: true },
            { key: 'botWait', type: 'number', min: 3, max: 30, default: 8, suffix: 'units.s', advanced: true, showIf: s => s.mode !== 'shower' && s.bots },
            {
                key: 'hostTimeout', type: 'select', default: 180, advanced: true,
                options: [{ value: 0 }, { value: 60 }, { value: 180 }, { value: 300 }],
                help: true
            },
            { key: 'lateJoin', type: 'toggle', default: true, advanced: true },
            { key: 'randomNames', type: 'toggle', default: false, advanced: true, help: true },
            { key: 'studentLeaderboard', type: 'toggle', default: true, advanced: true },
            { key: 'studentMusic', type: 'toggle', default: true, advanced: true, help: true },
            { key: 'studentSound', type: 'toggle', default: true, advanced: true }
        ],
        Host: lazy(() => import('../../games/comet-clash/HostScreen')),
        Player: lazy(() => import('../../games/comet-clash/PlayerScreen'))
    },
    {
        id: 'slingshot-siege',
        i18n: 'siege',
        kind: 'live',
        accent: 'from-orange-400 to-rose-500',
        compat: { mc: 'native', tf: 'native', multi: 'native', order: 'native', typed: 'adapted' },
        notes: ['typed', 'multi', 'order'],
        minQuestions: 3,
        settings: [
            { key: 'teams', type: 'number', min: 2, max: 6, default: 4, help: true },
            { key: 'duration', type: 'select', options: minutes([3, 5, 8, 10, 15]), default: 300 },
            {
                key: 'orbit', type: 'segmented', default: 'wild', help: true,
                options: [{ value: 'still' }, { value: 'ring' }, { value: 'wild' }]
            },
            {
                key: 'planetSpeed', type: 'segmented', default: 'normal', showIf: s => s.orbit !== 'still',
                options: [{ value: 'slow' }, { value: 'normal' }, { value: 'fast' }, { value: 'turbo' }]
            },
            ...questionTimer,
            { key: 'moon', type: 'toggle', default: true, advanced: true, help: true },
            { key: 'powerUps', type: 'toggle', default: true, advanced: true, help: true },
            { key: 'bounty', type: 'toggle', default: true, advanced: true, help: true },
            { key: 'slingshotBonus', type: 'toggle', default: true, advanced: true, help: true },
            {
                key: 'hostTimeout', type: 'select', default: 180, advanced: true,
                options: [{ value: 0 }, { value: 60 }, { value: 180 }, { value: 300 }],
                help: true
            },
            { key: 'lateJoin', type: 'toggle', default: true, advanced: true },
            { key: 'randomNames', type: 'toggle', default: false, advanced: true, help: true },
            { key: 'studentMusic', type: 'toggle', default: true, advanced: true, help: true },
            { key: 'studentSound', type: 'toggle', default: true, advanced: true }
        ],
        Host: lazy(() => import('../../games/slingshot-siege/HostScreen')),
        Player: lazy(() => import('../../games/slingshot-siege/PlayerScreen'))
    },
    {
        id: 'star-corsairs',
        i18n: 'corsair',
        kind: 'live',
        accent: 'from-cyan-400 to-violet-600',
        compat: { mc: 'native', tf: 'native', multi: 'native', order: 'native', typed: 'adapted' },
        notes: ['typed', 'multi', 'order'],
        minQuestions: 3,
        settings: [
            { key: 'duration', type: 'select', options: minutes([5, 8, 10, 15, 20]), default: 480 },
            { key: 'raids', type: 'toggle', default: true, help: true },
            ...questionTimer,
            { key: 'invasions', type: 'toggle', default: true, advanced: true, help: true },
            { key: 'goldComets', type: 'toggle', default: true, advanced: true, help: true },
            { key: 'upgrades', type: 'toggle', default: true, advanced: true, help: true },
            { key: 'bounty', type: 'toggle', default: true, advanced: true, help: true, showIf: s => s.raids !== false },
            {
                key: 'hostTimeout', type: 'select', default: 180, advanced: true,
                options: [{ value: 0 }, { value: 60 }, { value: 180 }, { value: 300 }],
                help: true
            },
            { key: 'lateJoin', type: 'toggle', default: true, advanced: true },
            { key: 'randomNames', type: 'toggle', default: false, advanced: true, help: true },
            { key: 'studentMusic', type: 'toggle', default: true, advanced: true, help: true },
            { key: 'studentSound', type: 'toggle', default: true, advanced: true }
        ],
        Host: lazy(() => import('../../games/star-corsairs/HostScreen')),
        Player: lazy(() => import('../../games/star-corsairs/PlayerScreen'))
    },
    {
        id: 'grid-battle',
        i18n: 'grid',
        kind: 'board',
        accent: 'from-sky-500 to-indigo-600',
        compat: { mc: 'native', tf: 'native', multi: 'native', order: 'native', typed: 'native' },
        notes: ['typed'],
        minQuestions: 1,
        settings: [
            { key: 'teams', type: 'number', min: 2, max: 6, default: 3 },
            { key: 'rows', type: 'number', min: 3, max: 8, default: 5 },
            { key: 'cols', type: 'number', min: 3, max: 8, default: 6 },
            ...questionTimer,
            { key: 'bombs', type: 'number', min: 0, max: 10, default: 4, advanced: true },
            { key: 'winds', type: 'number', min: 0, max: 5, default: 2, advanced: true },
            { key: 'bonuses', type: 'number', min: 0, max: 10, default: 4, advanced: true },
            { key: 'grenades', type: 'number', min: 0, max: 5, default: 2, advanced: true },
            { key: 'skips', type: 'number', min: 0, max: 5, default: 2, advanced: true }
        ],
        // Returns a translation spec [key, vars] when the settings can't work
        validate: (s) => {
            const specials = s.bombs + s.winds + s.bonuses + s.grenades + s.skips;
            const cells = s.rows * s.cols;
            return specials >= cells ? ['host.tooManySpecials', { specials, cells }] : null;
        },
        Board: lazy(() => import('../../games/grid-battle/GridBattle'))
    },
    {
        id: 'millionaire',
        i18n: 'millionaire',
        kind: 'board',
        accent: 'from-indigo-900 to-blue-800',
        compat: { mc: 'native', tf: 'native', typed: 'adapted', multi: 'unsupported', order: 'unsupported' },
        notes: ['typed', 'multi', 'order'],
        minQuestions: 3,
        settings: [
            {
                key: 'questionCount', type: 'segmented', default: 15,
                options: literal([[5, '5'], [10, '10'], [15, '15']])
            },
            ...questionTimer,
            { key: 'fiftyFifty', type: 'toggle', default: true, advanced: true },
            { key: 'askAudience', type: 'toggle', default: true, advanced: true },
            {
                key: 'suspense', type: 'segmented', default: 'dramatic', advanced: true,
                options: [{ value: 'quick' }, { value: 'dramatic' }]
            }
        ],
        Board: lazy(() => import('../../games/millionaire/Millionaire'))
    }
];

export const getGame = (id) => GAMES.find(g => g.id === id) || null;

// Translated game texts
export const gameName = (t, game) => (game ? t(`games.${game.i18n}.name`) : '');
export const gameNote = (t, game, type) => (game?.notes?.includes(type) ? t(`games.${game.i18n}.notes.${type}`) : null);
export const settingLabel = (t, game, setting) => t(`gs.${game.i18n}.${setting.key}.label`);
export const settingHelp = (t, game, setting, values) => {
    if (!setting.help) return null;
    const variant = typeof setting.help === 'function' ? setting.help(values) : 'help';
    return variant ? t(`gs.${game.i18n}.${setting.key}.${variant}`) : null;
};
export const optionLabel = (t, game, setting, option) => {
    if (option.text !== undefined) return option.text;
    if (option.label) return Array.isArray(option.label) ? t(option.label[0], option.label[1]) : t(option.label);
    return t(`gs.${game.i18n}.${setting.key}.options.${option.value}`);
};

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
