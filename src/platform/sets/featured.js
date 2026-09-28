// Sets that ship with Orbit, so every game can be tried immediately.
// They deliberately mix all question types.

import { normalizeSet } from '../questions/normalize';

let n = 0;
const id = () => `fq${++n}`;
const mc = (prompt, correct, ...wrong) => ({
    id: id(), type: 'mc', prompt,
    options: [{ id: id(), text: correct, correct: true }, ...wrong.map(text => ({ id: id(), text, correct: false }))]
});
const multi = (prompt, correct, wrong) => ({
    id: id(), type: 'multi', prompt,
    options: [...correct.map(text => ({ id: id(), text, correct: true })), ...wrong.map(text => ({ id: id(), text, correct: false }))]
});
const tf = (prompt, answer) => ({ id: id(), type: 'tf', prompt, answer });
const typed = (prompt, ...accepted) => ({ id: id(), type: 'typed', prompt, accepted });
const order = (prompt, ...items) => ({ id: id(), type: 'order', prompt, items });

const times = () => {
    const facts = [];
    for (const [a, b] of [[3, 4], [6, 7], [8, 9], [7, 7], [4, 8], [9, 6], [12, 5], [11, 11], [6, 8], [7, 9], [5, 5], [8, 8], [3, 12], [9, 9], [12, 12], [4, 7], [6, 6], [7, 8], [11, 6], [9, 4]]) {
        facts.push(typed(`${a} × ${b} = ?`, String(a * b)));
    }
    facts.push(tf('7 × 8 = 54', false));
    facts.push(tf('9 × 9 = 81', true));
    facts.push(mc('Which of these equals 48?', '6 × 8', '5 × 9', '7 × 7', '4 × 11'));
    facts.push(multi('Which products are even?', ['4 × 7', '6 × 9'], ['3 × 5', '7 × 9']));
    facts.push(order('Order from smallest to largest', '3 × 3', '2 × 6', '4 × 4', '5 × 5'));
    return facts;
};

export const FEATURED_SETS = [
    normalizeSet({
        id: 'f_solar',
        title: 'Solar System',
        description: 'Planets, stars and everything in orbit. Uses every question type.',
        subject: 'Science',
        author: 'Orbit',
        visibility: 'public',
        questions: [
            mc('Which planet is closest to the Sun?', 'Mercury', 'Venus', 'Earth', 'Mars'),
            mc('What is the largest planet in our Solar System?', 'Jupiter', 'Saturn', 'Neptune', 'Earth'),
            tf('The Sun is a star.', true),
            tf('Mars has rings like Saturn.', false),
            typed('Which planet is known as the Red Planet?', 'Mars'),
            typed('What pulls planets into orbit around the Sun?', 'Gravity'),
            typed('How many planets are in our Solar System?', '8', 'eight'),
            multi('Which of these are gas giants?', ['Jupiter', 'Saturn'], ['Mars', 'Mercury']),
            multi('Which planets have moons?', ['Earth', 'Mars', 'Jupiter'], ['Mercury', 'Venus']),
            order('Put these planets in order from the Sun', 'Mercury', 'Venus', 'Earth', 'Mars'),
            order('Order by size, smallest first', 'Moon', 'Earth', 'Jupiter', 'Sun'),
            mc('Who was the first human in space?', 'Yuri Gagarin', 'Neil Armstrong', 'Buzz Aldrin', 'Valentina Tereshkova'),
            typed('What is the name of our galaxy?', 'Milky Way', 'The Milky Way'),
            tf('A day on Venus is longer than its year.', true),
            mc('Which planet rotates on its side?', 'Uranus', 'Neptune', 'Saturn', 'Venus')
        ]
    }),
    normalizeSet({
        id: 'f_capitals',
        title: 'World Capitals',
        description: 'Capital cities from Central Asia and around the globe.',
        subject: 'Geography',
        author: 'Orbit',
        visibility: 'public',
        questions: [
            typed('What is the capital of Uzbekistan?', 'Tashkent', 'Toshkent'),
            mc('What is the capital of Kazakhstan?', 'Astana', 'Almaty', 'Shymkent', 'Karaganda'),
            mc('What is the capital of Kyrgyzstan?', 'Bishkek', 'Osh', 'Naryn', 'Karakol'),
            typed('What is the capital of Tajikistan?', 'Dushanbe'),
            mc('What is the capital of Turkmenistan?', 'Ashgabat', 'Mary', 'Turkmenabat', 'Dashoguz'),
            typed('What is the capital of France?', 'Paris'),
            typed('What is the capital of Japan?', 'Tokyo'),
            mc('What is the capital of Australia?', 'Canberra', 'Sydney', 'Melbourne', 'Perth'),
            mc('What is the capital of Canada?', 'Ottawa', 'Toronto', 'Vancouver', 'Montreal'),
            tf('The capital of Turkey is Istanbul.', false),
            tf('Cairo is the capital of Egypt.', true),
            multi('Which of these are capital cities?', ['Rome', 'Seoul', 'Madrid'], ['Milan', 'Busan']),
            order('Order these cities from west to east', 'London', 'Berlin', 'Moscow', 'Tashkent'),
            typed('What is the capital of Germany?', 'Berlin'),
            typed('What is the capital of South Korea?', 'Seoul')
        ]
    }),
    normalizeSet({
        id: 'f_times',
        title: 'Times Tables',
        description: 'Quick multiplication practice from 3× to 12×.',
        subject: 'Math',
        author: 'Orbit',
        visibility: 'public',
        questions: times()
    })
];

export const FEATURED_IDS = new Set(FEATURED_SETS.map(s => s.id));
