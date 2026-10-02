export const home = {
    hi: 'Hi {name}!',
    welcome: 'Welcome aboard Orbit',
    title: 'Join a {accent}',
    titleAccent: 'game',
    subtitle: 'Type the code on your teacher\'s screen and launch in. No account needed.',
    offline: '**Offline test mode.** Live games only connect tabs in this browser until Firebase is set up (see README). Open a second tab to join as a student.',
    actions: {
        host: { title: 'Host a game', text: 'Pick a game, tune the settings, share the code.' },
        create: { title: 'Create a set', text: 'Write questions, or paste them from ChatGPT.' },
        discover: { title: 'Discover sets', text: 'Search sets other teachers have shared.' }
    },
    seeAll: 'See all',
    yourSets: 'Your sets',
    allSets: 'All sets',
    featured: 'Featured sets'
};

export const join = {
    text: 'Type the 6-digit code from your teacher\'s screen.',
    noAccount: 'No account needed. Just the code and a nickname.',
    home: 'Home',
    sixDigits: 'Game codes have 6 digits.',
    codeLabel: 'Game code',
    launch: 'Launch'
};

export const roomErrors = {
    'not-found': 'We couldn\'t find a game with that code. Check the numbers and try again.',
    ended: 'That game has already finished.',
    locked: 'The teacher has locked this game.',
    started: 'This game has already started and is not accepting new players.',
    full: 'This game is full.',
    kicked: 'You were removed from this game.',
    'bad-name': 'Please enter a nickname.',
    'name-taken': 'This nickname is already taken. Try another one.',
    'bad-code': 'That doesn\'t look like a game code. Codes have 6 digits.',
    connection: 'Could not connect. Check your internet and try again.',
    oldVersion: 'This game can\'t be played on this version of Orbit. Try refreshing the page.',
    noCode: 'Could not reserve a room code. Please try again.',
    oldGame: 'The old game could not be found.',
    generic: 'Something went wrong.'
};

export const play = {
    tryAnother: 'Try another code',
    finding: 'Finding your game…',
    joining: 'Joining…',
    teacher: 'Teacher',
    game: 'Game {code}',
    gameBy: 'Game {code} · hosted by {name}',
    welcomeBack: 'Welcome back! Continue as {name}?',
    continueAs: 'Continue as {name}',
    someoneElse: 'I\'m someone else',
    randomNames: 'Your teacher gives everyone a fun random name.',
    join: 'Join game',
    pickNickname: 'Pick a nickname',
    nicknamePlaceholder: 'Your nickname'
};

export const discover = {
    subtitle: 'Find a set, preview it, and host it in seconds.',
    searchPlaceholder: 'Search by topic, title or author…',
    searchLabel: 'Search sets',
    clearSearch: 'Clear search',
    filters: 'Filters',
    subject: 'Subject',
    hasType: 'Has question type',
    grade: 'Grade level',
    any: 'Any',
    featured: 'Featured by Orbit',
    community: 'Community sets',
    sort: 'Sort',
    newest: 'Newest',
    popular: 'Most played',
    noMatch: 'No sets match your search',
    noMatchText: 'Try other words or clear the filters.',
    noneYet: 'No community sets yet',
    noneYetText: 'Publish one of your sets from the Create tab and it will show up here.',
    errors: {
        network: 'Could not load community sets. Check your connection and press refresh.'
    }
};

export const create = {
    subtitle: 'Your question sets. Private until you publish them.',
    import: 'Import from ChatGPT',
    newSet: 'New set',
    searchPlaceholder: 'Search your sets…',
    searchLabel: 'Search your sets',
    emptyTitle: 'No sets yet',
    first: 'Create your first set',
    emptyText: 'Write questions yourself, or ask ChatGPT for a quiz and paste it in. Mix multiple choice, true/false, written answers, multi-select and put-in-order.',
    copied: 'Copy created',
    deleted: 'Deleted "{title}"',
    deleteLabel: 'Delete {title}',
    unpublishFailed: 'Could not remove the public copy. Check your connection and try again.',
    noMatch: 'No sets match "{query}".',
    deleteTitle: 'Delete this set?',
    deletePublic: '"{title}" will be deleted and removed from the public library.',
    deletePrivate: '"{title}" will be deleted from your account.'
};

export const sets = {
    featured: 'Featured',
    public: 'Public',
    private: 'Private',
    incomplete: 'Incomplete, skipped in games',
    noText: 'No question text',
    itemsToOrder: { one: '{count} item to put in order', other: '{count} items to put in order' }
};

export const pick = {
    title: 'Choose a question set',
    mine: 'My sets',
    search: 'Search sets…',
    noneYet: 'You haven\'t made any sets yet.',
    createOne: 'Create one',
    noneFound: 'No sets found.'
};

export const setView = {
    browse: 'Browse sets',
    notFound: { title: 'Set not found', text: 'It may have been deleted or unpublished.' },
    network: { title: 'Couldn\'t load this set', text: 'Check your internet connection and try again.' },
    private: { title: 'This set is private', text: 'Sign in with the teacher account that made it to open it.' },
    copied: 'Copied to your sets',
    linkCopied: 'Link copied',
    deleted: 'Set deleted',
    host: 'Host a game',
    copyEdit: 'Copy & edit',
    questions: 'Questions',
    showAnswers: 'Show answers',
    hideAnswers: 'Hide answers',
    deletePublic: 'It will also be removed from the public library.',
    deletePrivate: 'This cannot be undone.'
};

export const editor = {
    title: 'Title',
    titlePlaceholder: 'e.g. Photosynthesis basics',
    description: 'Description',
    optional: '(optional)',
    descriptionPlaceholder: 'What is this set about?',
    choose: 'Choose…',
    grade: 'Grade level',
    unsaved: 'Unsaved',
    publicInDiscover: 'Public in Discover',
    import: 'Import',
    publish: 'Publish',
    unpublish: 'Unpublish',
    incomplete: { one: '{count} incomplete', other: '{count} incomplete' },
    noQuestions: 'No questions yet. Add one below.',
    addQuestion: 'Add a question',
    examplesEach: 'One example of each',
    fromChatGPT: 'From ChatGPT',
    addEmpty: 'Add an empty question: {type}',
    example: 'Example',
    exampleAdded: 'Example added ({type}). Edit it to make it yours.',
    examplesAdded: 'One example of each type added. Edit them to make them yours.',
    needTitle: 'Give your set a title first.',
    saved: 'Saved!',
    savedIncomplete: {
        one: 'Saved. {count} incomplete question will be skipped in games.',
        other: 'Saved. {count} incomplete questions will be skipped in games.'
    },
    publicCopyFailed: 'Saved, but the public copy could not be updated.',
    network: 'Could not reach the server. Check your connection and try again.',
    noValid: 'Finish at least one question before publishing.',
    published: 'Published! It now appears in Discover.',
    unpublished: 'Removed from the public library.',
    imported: {
        one: 'Imported {count} question. Check it, then Save.',
        other: 'Imported {count} questions. Check them, then Save.'
    },
    notEditable: 'This set can\'t be edited here',
    notEditableText: 'Only your own sets can be edited. Open it and choose "Copy & edit" to make your own version.',
    openSet: 'Open the set',
    publishTitle: 'Publish to Discover',
    publishText: 'Anyone can find, play and copy public sets.',
    leftOut: {
        one: '{count} incomplete question is left out.',
        other: '{count} incomplete questions are left out.'
    },
    author: 'Shown as author',
    leaveTitle: 'Leave without saving?',
    leaveText: 'Your changes to this set will be lost.',
    leave: 'Leave',
    // Question card
    tapCorrect: 'Tap the circle next to the correct answer.',
    tickCorrect: 'Tick every correct answer.',
    optionIsCorrect: 'Option {n} is correct',
    markOption: 'Mark option {n} correct',
    option: 'Option {n}',
    removeOption: 'Remove option {n}',
    addOption: 'Add option',
    typedHint: 'Capital letters and extra spaces don\'t matter. Add other spellings students may use.',
    answer: 'Answer',
    alsoAccept: 'Also accept',
    correctAnswer: 'Correct answer',
    anotherSpelling: 'Another spelling',
    removeAccepted: 'Remove accepted answer',
    acceptAnother: 'Accept another answer',
    orderHint: 'Write the items in the **correct** order. Students see them shuffled.',
    item: 'Item {n}',
    moveUp: 'Move up',
    moveDown: 'Move down',
    removeItem: 'Remove item {n}',
    addItem: 'Add item',
    moveQuestionUp: 'Move question up',
    moveQuestionDown: 'Move question down',
    duplicateQuestion: 'Duplicate question',
    deleteQuestion: 'Delete question',
    statementPlaceholder: 'Write a statement, e.g. "The Sun is a star."',
    questionPlaceholder: 'Write your question…',
    questionN: 'Question {n}'
};

export const importer = {
    title: 'Import questions',
    importN: { one: 'Import {count} question', other: 'Import {count} questions' },
    simpleList: 'Simple list',
    step1: 'Ask ChatGPT',
    step1Hint: 'or Gemini, Copilot, any AI chat',
    topic: 'Topic',
    topicPlaceholder: 'e.g. Photosynthesis, Past Simple, Fractions',
    level: 'For whom (optional)',
    levelPlaceholder: 'e.g. grade 7 students',
    language: 'Language of the questions',
    languages: { English: 'English', Uzbek: 'Uzbek', Russian: 'Russian' },
    count: 'Number of questions',
    types: 'Question types',
    copyPrompt: 'Copy prompt',
    seePrompt: 'See prompt',
    hidePrompt: 'Hide prompt',
    promptCopied: 'Prompt copied. Paste it into ChatGPT, then copy its answer back here.',
    copyByHand: 'Copy the prompt below by hand.',
    step2: 'Paste the answer here',
    paste: 'Paste from clipboard',
    clipboardEmpty: 'The clipboard is empty.',
    pasteByHand: 'Click the box below and press Ctrl+V (or long-press → Paste on a phone).',
    seeFormat: 'See the format',
    hideExample: 'Hide example',
    tryExample: 'Try this example',
    pasteJson: 'Paste JSON',
    ready: { one: '{count} question ready', other: '{count} questions ready' },
    skipped: { one: '{count} question will be skipped', other: '{count} questions will be skipped' },
    more: { one: '+{count} more', other: '+{count} more' },
    useTitle: 'Use "{title}" as the set title',
    linesHint: 'One question per line as {format}. They become written-answer questions you can change later.',
    linesFormat: 'question | answer',
    linesPlaceholder: 'Capital of France | Paris\n7 × 8 | 56\nLargest planet | Jupiter',
    linesLabel: 'Questions, one per line',
    errors: {
        syntax: 'This doesn\'t look like the JSON from ChatGPT. Copy its whole answer (the part in the code box) and paste it again.',
        syntaxAt: 'The JSON has a mistake near character {pos}. Ask ChatGPT to "send the JSON again", then paste the new answer.',
        noQuestions: 'No questions found. The JSON needs a "questions" list.'
    }
};

export const gamesPage = {
    subtitle: 'Every game works with any question set. Pick one, then choose your set.',
    live: 'Live games',
    liveText: 'Students join on their own phones or laptops with a code. No accounts.',
    board: 'Smart board games',
    boardText: 'Played together on one big screen. Nothing to join.',
    illustration: '{name} illustration',
    host: 'Host {name}',
    pickFor: 'Pick a set for {name}'
};

export const compat = {
    native: 'Supported',
    adapted: 'Converted',
    unsupported: 'Not supported',
    count: { one: '{playable}/{count} question', other: '{playable}/{count} questions' },
    skipped: {
        one: '{count} incomplete question is skipped.',
        other: '{count} incomplete questions are skipped.'
    }
};

export const host = {
    backToGames: 'Back to games',
    pickAnother: 'Pick another set to host.',
    with: 'with {title}',
    game: 'Game',
    playable: '{usable} of {count} playable',
    questions: 'Questions in this round',
    noQuestions: 'This set has no questions yet.',
    tooFew: {
        one: '{name} needs at least {count} playable question ({selected} selected).',
        other: '{name} needs at least {count} playable questions ({selected} selected).'
    },
    willUse: { one: '{count} question will be used.', other: '{count} questions will be used.' },
    defaults: 'Defaults',
    starting: 'Starting…',
    createRoom: 'Create game room',
    startHere: 'Start on this screen',
    storageFull: 'Could not start: browser storage is full.',
    roomFailed: 'Could not create the game room. Check your connection and that your email is verified.',
    tooManySpecials: 'Too many special tiles ({specials}) for a board of {cells} tiles. Lower some of them.'
};

export const hostRoom = {
    notYours: 'This screen belongs to the teacher who created the game.',
    joinInstead: 'Join as a player instead',
    home: 'Orbit home'
};

export const board = {
    notSetUp: 'This board game isn\'t set up yet.',
    choose: 'Choose a game',
    exit: 'Exit game'
};

export const practice = {
    nothing: 'This set has no questions that can be practiced yet.'
};

export const notFound = {
    title: 'This page drifted out of orbit',
    text: 'The link may be old or mistyped.',
    home: 'Go home'
};

export const account = {
    nickname: 'Your nickname',
    nicknameText: 'Filled in for you when you join a game on this device.',
    teacherTitle: 'Account',
    teacherText: 'Sign in to create question sets and host games. Your sets are saved to your account and follow you to any device.',
    provider: { google: 'Google account', password: 'Email and password' },
    verified: 'Verified',
    notVerified: 'Not verified',
    finishVerify: 'Verify your email to host live games.',
    finishTerms: 'Accept the Terms of Use to start creating and hosting.',
    name: 'Your name',
    nameText: 'Shown to students when you host, and as the author of sets you publish.',
    nameSaved: 'Name saved',
    legalTitle: 'Terms and privacy',
    termsAccepted: 'You accepted the Terms of Use and Privacy Policy on {date}.',
    termsNotAccepted: 'You haven\'t accepted the Terms of Use yet.',
    signOutText: 'Students on this device can still join games without an account.',
    deleteTitle: 'Delete your account',
    deleteShort: 'Deletes your account, all your sets and everything you published.',
    deleteButton: 'Delete account',
    deleteText: 'Your account, all your question sets and your published sets will be deleted for good. Games in progress keep running until they end.',
    deleteGoogle: 'To confirm, you\'ll choose your Google account once more.',
    deletePassword: 'Enter your password to confirm',
    deleteConfirm: 'Delete forever',
    deleted: 'Your account has been deleted.'
};

export const grades = {
    'Grade 1': 'Grade 1', 'Grade 2': 'Grade 2', 'Grade 3': 'Grade 3', 'Grade 4': 'Grade 4',
    'Grade 5': 'Grade 5', 'Grade 6': 'Grade 6', 'Grade 7': 'Grade 7', 'Grade 8': 'Grade 8',
    'Grade 9': 'Grade 9', 'Grade 10': 'Grade 10', 'Grade 11': 'Grade 11', 'Grade 12': 'Grade 12',
    University: 'University', Teachers: 'Teachers'
};

export const whatsNew = {
    title: "What's new in Orbit",
    ok: 'Got it',
    sets_for_all: 'Anyone can now create and share question sets — not just teachers.',
    grades: 'Sets can now have a grade level (Grade 1–12, University, Teachers) for easier discovery.',
    backup_password: 'Google accounts can now add a backup email+password for extra security.',
    i18n: 'Full interface translation in English, Uzbek and Russian.',
    terms_accept: 'Terms of Use now appear once at sign-up, and again if they change.'
};

export const settings = {
    subtitle: 'Make Orbit yours.',
    sections: 'Settings sections',
    tabs: {
        account: 'Account',
        appearance: 'Appearance',
        sound: 'Sound',
        performance: 'Performance',
        language: 'Language',
        data: 'This device'
    },
    theme: 'Theme',
    themeText: 'Space is Orbit\'s home. Daylight is easier to read in a bright room.',
    space: 'Space',
    daylight: 'Daylight',
    accent: 'Accent colour',
    accentText: 'Used for buttons, highlights and your planet.',
    accents: { green: 'Emerald', blue: 'Ocean', violet: 'Nebula' },
    soundText: 'All music and effects are generated live by Orbit, so there\'s nothing to download.',
    soundOn: 'Sound is on',
    soundOff: 'Sound is off',
    music: 'Music',
    effects: 'Sound effects',
    preview: 'Preview battle music',
    stopPreview: 'Stop preview',
    soundNote: 'In live games the teacher\'s screen plays the music. Student devices play softer music (a host setting) and each student can mute their own device.',
    performanceText: 'On older school computers, fewer effects keep games smooth. Games also lower their quality automatically when a device is slow.',
    presets: {
        saver: { label: 'Battery saver', text: 'No moving stars, calm animations' },
        balanced: { label: 'Balanced', text: 'Smooth, without background effects' },
        full: { label: 'Full effects', text: 'Twinkling stars and confetti' }
    },
    particles: 'Background stars and celebrations',
    particlesHelp: 'Twinkling stars, shooting stars and confetti.',
    reducedMotion: 'Reduced motion',
    reducedMotionHelp: 'Stops orbiting moons and softens page transitions. Game play itself is not affected.',
    languageTitle: 'Application language',
    languageText: 'Everything switches right away, game screens included. Students can also pick their language on the join screen.',
    languages: { en: 'English', uz: 'Uzbek', ru: 'Russian' },
    dataText: 'Settings and a copy of your sets are kept in this browser to make Orbit fast.',
    resetTitle: 'Reset Orbit on this device',
    resetText: 'Clears settings, saved scores and cached data from this browser. Sets in your teacher account are not deleted.',
    resetButton: 'Reset this device',
    resetConfirmTitle: 'Reset Orbit on this device?',
    resetConfirmText: 'Settings and cached data will be removed from this browser. Your teacher account and its sets stay safe.'
};
