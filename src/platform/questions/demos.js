// Ready-made example questions for each type ("Add example" buttons in the editor).
// Several per type, handed out in turn so repeated clicks don't add duplicates.

import { uid } from './types';

const opt = (text, correct = false) => ({ id: uid(), text, correct });

const DEMOS = {
    mc: [
        () => ({ prompt: 'Which planet is known as the Red Planet?', options: [opt('Mars', true), opt('Venus'), opt('Jupiter'), opt('Mercury')] }),
        () => ({ prompt: 'What is the capital of Uzbekistan?', options: [opt('Tashkent', true), opt('Samarkand'), opt('Bukhara'), opt('Karshi')] }),
        () => ({ prompt: 'What is 7 × 8?', options: [opt('56', true), opt('54'), opt('63'), opt('48')] })
    ],
    tf: [
        () => ({ prompt: 'The Sun is a star.', answer: true }),
        () => ({ prompt: 'Water boils at 50 °C at sea level.', answer: false }),
        () => ({ prompt: 'A triangle has three sides.', answer: true })
    ],
    typed: [
        () => ({ prompt: 'What is the capital of France?', accepted: ['Paris'] }),
        () => ({ prompt: 'How many continents are there?', accepted: ['7', 'seven'] }),
        () => ({ prompt: 'What gas do plants take in from the air?', accepted: ['Carbon dioxide', 'CO2'] })
    ],
    multi: [
        () => ({ prompt: 'Which of these are gas giants?', options: [opt('Jupiter', true), opt('Saturn', true), opt('Mars'), opt('Earth')] }),
        () => ({ prompt: 'Which numbers are prime?', options: [opt('2', true), opt('7', true), opt('13', true), opt('9'), opt('15')] }),
        () => ({ prompt: 'Which of these are mammals?', options: [opt('Dolphin', true), opt('Bat', true), opt('Shark'), opt('Eagle')] })
    ],
    order: [
        () => ({ prompt: 'Put these planets in order from the Sun', items: ['Mercury', 'Venus', 'Earth', 'Mars'] }),
        () => ({ prompt: 'Order from smallest to largest', items: ['Atom', 'Cell', 'Ant', 'Elephant'] }),
        () => ({ prompt: 'Put the stages of a plant in order', items: ['Seed', 'Sprout', 'Young plant', 'Flower'] })
    ]
};

const next = { mc: 0, tf: 0, typed: 0, multi: 0, order: 0 };

export const demoQuestion = (type) => {
    const list = DEMOS[type];
    const build = list[next[type] % list.length];
    next[type] += 1;
    return { id: uid(), type, ...build() };
};
