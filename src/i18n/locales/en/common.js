export const common = {
    cancel: 'Cancel',
    close: 'Close',
    back: 'Back',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    copy: 'Copy',
    host: 'Host',
    practice: 'Practice',
    share: 'Share',
    continue: 'Continue',
    loading: 'Loading…',
    refresh: 'Refresh',
    search: 'Search',
    exit: 'Exit',
    mute: 'Mute',
    unmute: 'Unmute',
    questions: { one: '{count} question', other: '{count} questions' },
    plays: { one: '{count} play', other: '{count} plays' },
    players: { one: '{count} player', other: '{count} players' },
    by: 'by {name}',
    untitled: 'Untitled set',
    copyOf: 'Copy of',
    true: 'True',
    false: 'False',
    orAlso: '{main} (or {rest})',
    all: 'All',
    items: { one: '{count} item', other: '{count} items' }
};

export const units = {
    minutes: '{n} min',
    s: 's',
    pts: 'pts'
};

export const nav = {
    home: 'Home',
    discover: 'Discover',
    create: 'Create',
    games: 'Games',
    settings: 'Settings',
    joinGame: 'Join a game',
    spaceMode: 'Space mode',
    daylightMode: 'Daylight mode',
    toDaylight: 'Switch to daylight',
    toSpace: 'Switch to space',
    expand: 'Expand sidebar',
    collapse: 'Collapse sidebar',
    setName: 'Set your name'
};

export const qtypes = {
    mc: { label: 'Multiple choice', short: 'Choice', hint: 'One correct option' },
    tf: { label: 'True / False', short: 'True/False', hint: 'Is the statement true?' },
    typed: { label: 'Written answer', short: 'Written', hint: 'Students type the answer' },
    multi: { label: 'Multi-select', short: 'Multi', hint: 'Several correct options' },
    order: { label: 'Put in order', short: 'Order', hint: 'Arrange items in sequence' }
};

export const validation = {
    prompt: 'Write the question.',
    minOptions: 'Add at least 2 options.',
    markCorrect: 'Mark the correct option.',
    oneCorrect: 'Only one option can be correct.',
    markSomeCorrect: 'Mark at least one correct option.',
    oneWrong: 'At least one option must be wrong.',
    distinctOptions: 'Options must be different.',
    answer: 'Add the correct answer.',
    minItems: 'Add at least 2 items.',
    distinctItems: 'Items must be different.',
    unknownType: 'Unknown question type.',
    tfAnswer: 'The answer must be true or false.',
    notQuestion: 'Not a question.'
};

// Stored values stay English (they're saved in sets); only the display is translated
export const subjects = {
    Math: 'Math',
    Science: 'Science',
    Physics: 'Physics',
    Chemistry: 'Chemistry',
    Biology: 'Biology',
    Geography: 'Geography',
    History: 'History',
    English: 'English',
    Languages: 'Languages',
    'Computer Science': 'Computer Science',
    Art: 'Art',
    Music: 'Music',
    Other: 'Other'
};

// Planet names on the Comet Clash cover picture
export const art = {
    venus: 'Venus',
    earth: 'Earth',
    moon: 'Moon',
    mars: 'Mars'
};

// Example questions for the editor's "Example" buttons (content, in the teacher's language)
export const demos = {
    mc: [
        { q: 'Which planet is known as the Red Planet?', right: ['Mars'], wrong: ['Venus', 'Jupiter', 'Mercury'] },
        { q: 'What is the capital of Uzbekistan?', right: ['Tashkent'], wrong: ['Samarkand', 'Bukhara', 'Karshi'] },
        { q: 'What is 7 × 8?', right: ['56'], wrong: ['54', '63', '48'] }
    ],
    tf: [
        { q: 'The Sun is a star.', answer: true },
        { q: 'Water boils at 50 °C at sea level.', answer: false },
        { q: 'A triangle has three sides.', answer: true }
    ],
    typed: [
        { q: 'What is the capital of France?', accept: ['Paris'] },
        { q: 'How many continents are there?', accept: ['7', 'seven'] },
        { q: 'What gas do plants take in from the air?', accept: ['Carbon dioxide', 'CO2'] }
    ],
    multi: [
        { q: 'Which of these are gas giants?', right: ['Jupiter', 'Saturn'], wrong: ['Mars', 'Earth'] },
        { q: 'Which numbers are prime?', right: ['2', '7', '13'], wrong: ['9', '15'] },
        { q: 'Which of these are mammals?', right: ['Dolphin', 'Bat'], wrong: ['Shark', 'Eagle'] }
    ],
    order: [
        { q: 'Put these planets in order from the Sun', items: ['Mercury', 'Venus', 'Earth', 'Mars'] },
        { q: 'Order from smallest to largest', items: ['Atom', 'Cell', 'Ant', 'Elephant'] },
        { q: 'Put the stages of a plant in order', items: ['Seed', 'Sprout', 'Young plant', 'Flower'] }
    ]
};
