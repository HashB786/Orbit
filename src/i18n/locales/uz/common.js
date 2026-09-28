// Oʻzbekcha (lotin). oʻ/gʻ use ʻ (U+02BB), the tutuq belgisi uses ʼ (U+02BC).

export const common = {
    cancel: 'Bekor qilish',
    close: 'Yopish',
    back: 'Orqaga',
    save: 'Saqlash',
    delete: 'Oʻchirish',
    edit: 'Tahrirlash',
    copy: 'Nusxa olish',
    host: 'Oʻtkazish',
    practice: 'Mashq',
    share: 'Ulashish',
    continue: 'Davom etish',
    loading: 'Yuklanmoqda…',
    refresh: 'Yangilash',
    search: 'Qidirish',
    exit: 'Chiqish',
    mute: 'Ovozni oʻchirish',
    unmute: 'Ovozni yoqish',
    questions: { other: '{count} ta savol' },
    plays: { other: '{count} marta oʻynalgan' },
    players: { other: '{count} ta oʻyinchi' },
    by: 'muallif: {name}',
    untitled: 'Nomsiz toʻplam',
    copyOf: 'Nusxa:',
    true: 'Toʻgʻri',
    false: 'Notoʻgʻri',
    orAlso: '{main} (yoki {rest})',
    all: 'Hammasi',
    items: { other: '{count} ta element' }
};

export const units = {
    minutes: '{n} daq',
    s: 's',
    pts: 'ball'
};

export const nav = {
    home: 'Bosh sahifa',
    discover: 'Kashf etish',
    create: 'Yaratish',
    games: 'Oʻyinlar',
    settings: 'Sozlamalar',
    joinGame: 'Oʻyinga qoʻshilish',
    spaceMode: 'Koinot rejimi',
    daylightMode: 'Kunduzgi rejim',
    toDaylight: 'Kunduzgi rejimga oʻtish',
    toSpace: 'Koinot rejimiga oʻtish',
    expand: 'Menyuni kengaytirish',
    collapse: 'Menyuni yigʻish',
    setName: 'Ismingizni kiriting'
};

export const qtypes = {
    mc: { label: 'Bir javobli test', short: 'Test', hint: 'Bitta toʻgʻri variant' },
    tf: { label: 'Toʻgʻri / Notoʻgʻri', short: 'T/N', hint: 'Fikr toʻgʻrimi?' },
    typed: { label: 'Yozma javob', short: 'Yozma', hint: 'Oʻquvchilar javobni yozadi' },
    multi: { label: 'Koʻp javobli test', short: 'Koʻp javob', hint: 'Bir nechta toʻgʻri variant' },
    order: { label: 'Tartiblash', short: 'Tartib', hint: 'Elementlarni ketma-ket joylash' }
};

export const validation = {
    prompt: 'Savolni yozing.',
    minOptions: 'Kamida 2 ta variant qoʻshing.',
    markCorrect: 'Toʻgʻri variantni belgilang.',
    oneCorrect: 'Faqat bitta variant toʻgʻri boʻlishi mumkin.',
    markSomeCorrect: 'Kamida bitta toʻgʻri variantni belgilang.',
    oneWrong: 'Kamida bitta variant notoʻgʻri boʻlishi kerak.',
    distinctOptions: 'Variantlar bir xil boʻlmasligi kerak.',
    answer: 'Toʻgʻri javobni kiriting.',
    minItems: 'Kamida 2 ta element qoʻshing.',
    distinctItems: 'Elementlar bir xil boʻlmasligi kerak.',
    unknownType: 'Nomaʼlum savol turi.',
    tfAnswer: 'Javob true yoki false boʻlishi kerak.',
    notQuestion: 'Bu savol emas.'
};

export const subjects = {
    Math: 'Matematika',
    Science: 'Tabiiy fanlar',
    Physics: 'Fizika',
    Chemistry: 'Kimyo',
    Biology: 'Biologiya',
    Geography: 'Geografiya',
    History: 'Tarix',
    English: 'Ingliz tili',
    Languages: 'Tillar',
    'Computer Science': 'Informatika',
    Art: 'Tasviriy sanʼat',
    Music: 'Musiqa',
    Other: 'Boshqa'
};

export const art = {
    venus: 'Venera',
    earth: 'Yer',
    moon: 'Oy',
    mars: 'Mars'
};

export const demos = {
    mc: [
        { q: 'Qaysi sayyora «Qizil sayyora» deb ataladi?', right: ['Mars'], wrong: ['Venera', 'Yupiter', 'Merkuriy'] },
        { q: 'Oʻzbekistonning poytaxti qaysi shahar?', right: ['Toshkent'], wrong: ['Samarqand', 'Buxoro', 'Qarshi'] },
        { q: '7 × 8 nechaga teng?', right: ['56'], wrong: ['54', '63', '48'] }
    ],
    tf: [
        { q: 'Quyosh — yulduz.', answer: true },
        { q: 'Dengiz sathida suv 50 °C da qaynaydi.', answer: false },
        { q: 'Uchburchakning uchta tomoni bor.', answer: true }
    ],
    typed: [
        { q: 'Fransiyaning poytaxti qaysi shahar?', accept: ['Parij'] },
        { q: 'Yer yuzida nechta materik bor?', accept: ['6', 'olti'] },
        { q: 'Oʻsimliklar havodan qaysi gazni yutadi?', accept: ['Karbonat angidrid', 'CO2'] }
    ],
    multi: [
        { q: 'Qaysilari gaz gigantlari?', right: ['Yupiter', 'Saturn'], wrong: ['Mars', 'Yer'] },
        { q: 'Qaysi sonlar tub sonlar?', right: ['2', '7', '13'], wrong: ['9', '15'] },
        { q: 'Qaysilari sutemizuvchilar?', right: ['Delfin', 'Koʻrshapalak'], wrong: ['Akula', 'Burgut'] }
    ],
    order: [
        { q: 'Sayyoralarni Quyoshdan boshlab tartiblang', items: ['Merkuriy', 'Venera', 'Yer', 'Mars'] },
        { q: 'Eng kichigidan eng kattasigacha tartiblang', items: ['Atom', 'Hujayra', 'Chumoli', 'Fil'] },
        { q: 'Oʻsimlikning rivojlanish bosqichlarini tartiblang', items: ['Urugʻ', 'Nihol', 'Yosh oʻsimlik', 'Gul'] }
    ]
};
