// Ready-made example questions for each type ("Add example" buttons in the editor).
// The texts live in the locales (demos.*), so examples come in the teacher's language.
// Several per type, handed out in turn so repeated clicks don't add duplicates.

import { uid } from './types';
import { translateRaw, getCurrentLanguage } from '../../i18n';

const opt = (text, correct = false) => ({ id: uid(), text, correct });

const choices = (d) => ({ prompt: d.q, options: [...d.right.map(text => opt(text, true)), ...d.wrong.map(text => opt(text))] });
const BUILD = {
    mc: choices,
    multi: choices,
    tf: (d) => ({ prompt: d.q, answer: d.answer }),
    typed: (d) => ({ prompt: d.q, accepted: [...d.accept] }),
    order: (d) => ({ prompt: d.q, items: [...d.items] })
};

const next = { mc: 0, tf: 0, typed: 0, multi: 0, order: 0 };

export const demoQuestion = (type) => {
    const list = translateRaw(getCurrentLanguage(), `demos.${type}`);
    const demo = list[next[type] % list.length];
    next[type] += 1;
    return { id: uid(), type, ...BUILD[type](demo) };
};
