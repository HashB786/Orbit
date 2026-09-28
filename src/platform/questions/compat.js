// Which questions of a set a given game can play.
// Each game declares per type: 'native' (plays as-is), 'adapted' (converted, e.g. written -> multiple choice)
// or 'unsupported'.

import { TYPE_IDS, isValidQuestion } from './types';
import { canAdaptTyped, decoyPool } from './rounds';

export const SUPPORT_LABELS = {
    native: 'Supported',
    adapted: 'Converted',
    unsupported: 'Not supported'
};

export const questionSupport = (game, q, pool) => {
    const mode = game.compat?.[q.type] || 'unsupported';
    if (mode === 'adapted' && q.type === 'typed' && !canAdaptTyped(q, pool)) return 'unsupported';
    return mode;
};

// Per-type summary for the host setup screen
export const analyzeSet = (game, questions) => {
    const valid = questions.filter(isValidQuestion);
    const pool = decoyPool(valid);
    const byType = {};

    for (const type of TYPE_IDS) {
        const ofType = questions.filter(q => q.type === type);
        if (ofType.length === 0) continue;
        const validOfType = ofType.filter(isValidQuestion);
        const playable = validOfType.filter(q => questionSupport(game, q, pool) !== 'unsupported');
        byType[type] = {
            type,
            total: ofType.length,
            invalid: ofType.length - validOfType.length,
            playable: playable.length,
            support: game.compat?.[type] || 'unsupported'
        };
    }
    return { byType, pool, validCount: valid.length };
};

// The questions a game will actually use, given the host's type selection
export const selectQuestions = (game, questions, enabledTypes) => {
    const valid = questions.filter(isValidQuestion);
    const pool = decoyPool(valid);
    const enabled = enabledTypes ? new Set(enabledTypes) : null;
    return valid.filter(q => (!enabled || enabled.has(q.type)) && questionSupport(game, q, pool) !== 'unsupported');
};
