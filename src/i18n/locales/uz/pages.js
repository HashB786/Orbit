export const home = {
    hi: 'Salom, {name}!',
    welcome: 'Orbitga xush kelibsiz',
    title: '{accent}ga qoʻshiling',
    titleAccent: 'Oʻyin',
    subtitle: 'Oʻqituvchingiz ekranidagi kodni kiriting va parvozga chiqing. Akkaunt kerak emas.',
    offline: '**Oflayn sinov rejimi.** Firebase sozlanmaguncha jonli oʻyinlar faqat shu brauzerdagi varaqlarni bogʻlaydi (README ga qarang). Oʻquvchi sifatida qoʻshilish uchun ikkinchi varaqni oching.',
    actions: {
        host: { title: 'Oʻyin oʻtkazish', text: 'Oʻyinni tanlang, sozlang va kodni ulashing.' },
        create: { title: 'Toʻplam yaratish', text: 'Savollarni yozing yoki ChatGPT dan joylang.' },
        discover: { title: 'Toʻplamlarni kashf etish', text: 'Boshqa oʻqituvchilar ulashgan toʻplamlarni qidiring.' }
    },
    seeAll: 'Hammasi',
    yourSets: 'Toʻplamlaringiz',
    allSets: 'Barcha toʻplamlar',
    featured: 'Tanlangan toʻplamlar'
};

export const join = {
    text: 'Oʻqituvchingiz ekranidagi 6 xonali kodni kiriting.',
    noAccount: 'Akkaunt kerak emas. Faqat kod va taxallus.',
    home: 'Bosh sahifa',
    sixDigits: 'Oʻyin kodi 6 ta raqamdan iborat.',
    codeLabel: 'Oʻyin kodi',
    launch: 'Boshlash'
};

export const roomErrors = {
    'not-found': 'Bu kod bilan oʻyin topilmadi. Raqamlarni tekshirib, qayta urinib koʻring.',
    ended: 'Bu oʻyin allaqachon tugagan.',
    locked: 'Oʻqituvchi bu oʻyinni yopib qoʻygan.',
    started: 'Bu oʻyin allaqachon boshlangan va yangi oʻyinchilarni qabul qilmaydi.',
    full: 'Bu oʻyinda joy qolmagan.',
    kicked: 'Siz bu oʻyindan chiqarildingiz.',
    'bad-name': 'Iltimos, taxallus kiriting.',
    'name-taken': 'Bu taxallus band. Boshqasini tanlang.',
    'bad-code': 'Bu oʻyin kodiga oʻxshamaydi. Kod 6 ta raqamdan iborat.',
    connection: 'Ulanib boʻlmadi. Internetni tekshirib, qayta urinib koʻring.',
    oldVersion: 'Bu oʻyinni Orbitning ushbu versiyasida oʻynab boʻlmaydi. Sahifani yangilang.',
    noCode: 'Xona kodini band qilib boʻlmadi. Qayta urinib koʻring.',
    oldGame: 'Oldingi oʻyin topilmadi.',
    generic: 'Nimadir xato ketdi.'
};

export const play = {
    tryAnother: 'Boshqa kod kiritish',
    finding: 'Oʻyiningiz qidirilmoqda…',
    joining: 'Qoʻshilmoqda…',
    teacher: 'Oʻqituvchi',
    game: 'Oʻyin {code}',
    gameBy: 'Oʻyin {code} · oʻtkazuvchi: {name}',
    welcomeBack: 'Xush kelibsiz! {name} sifatida davom etasizmi?',
    continueAs: '{name} sifatida davom etish',
    someoneElse: 'Men boshqa odamman',
    randomNames: 'Oʻqituvchingiz hammaga qiziqarli tasodifiy ism beradi.',
    join: 'Oʻyinga qoʻshilish',
    pickNickname: 'Taxallus tanlang',
    nicknamePlaceholder: 'Taxallusingiz'
};

export const discover = {
    subtitle: 'Toʻplamni toping, koʻrib chiqing va bir necha soniyada oʻyin boshlang.',
    searchPlaceholder: 'Mavzu, nom yoki muallif boʻyicha qidiring…',
    searchLabel: 'Toʻplamlarni qidirish',
    clearSearch: 'Qidiruvni tozalash',
    filters: 'Filtrlar',
    subject: 'Fan',
    hasType: 'Savol turi',
    grade: 'Sinf darajasi',
    any: 'Istalgan',
    featured: 'Orbit tanlovi',
    community: 'Hamjamiyat toʻplamlari',
    sort: 'Saralash',
    newest: 'Eng yangi',
    popular: 'Eng koʻp oʻynalgan',
    noMatch: 'Qidiruvga mos toʻplam yoʻq',
    noMatchText: 'Boshqa soʻzlarni sinab koʻring yoki filtrlarni tozalang.',
    noneYet: 'Hozircha hamjamiyat toʻplamlari yoʻq',
    noneYetText: 'Yaratish boʻlimidan toʻplamingizni eʼlon qiling va u shu yerda paydo boʻladi.',
    errors: {
        network: 'Hamjamiyat toʻplamlarini yuklab boʻlmadi. Internetni tekshirib, yangilash tugmasini bosing.'
    }
};

export const create = {
    subtitle: 'Savollar toʻplamlaringiz. Eʼlon qilmaguningizcha ular shaxsiy.',
    import: 'ChatGPT dan import',
    newSet: 'Yangi toʻplam',
    searchPlaceholder: 'Toʻplamlaringizni qidiring…',
    searchLabel: 'Toʻplamlaringizni qidirish',
    emptyTitle: 'Hozircha toʻplamlar yoʻq',
    first: 'Birinchi toʻplamni yarating',
    emptyText: 'Savollarni oʻzingiz yozing yoki ChatGPT dan test soʻrab, shu yerga joylang. Bir javobli, toʻgʻri/notoʻgʻri, yozma, koʻp javobli va tartiblash savollarini aralashtiring.',
    copied: 'Nusxa yaratildi',
    deleted: '«{title}» oʻchirildi',
    deleteLabel: '«{title}»ni oʻchirish',
    unpublishFailed: 'Ommaviy nusxani olib tashlab boʻlmadi. Internetni tekshirib, qayta urinib koʻring.',
    noMatch: '«{query}» boʻyicha toʻplam topilmadi.',
    deleteTitle: 'Toʻplam oʻchirilsinmi?',
    deletePublic: '«{title}» oʻchiriladi va ommaviy kutubxonadan olib tashlanadi.',
    deletePrivate: '«{title}» akkauntingizdan oʻchiriladi.'
};

export const sets = {
    featured: 'Tanlangan',
    public: 'Ommaviy',
    private: 'Shaxsiy',
    incomplete: 'Tugallanmagan, oʻyinlarda tashlab ketiladi',
    noText: 'Savol matni yoʻq',
    itemsToOrder: { other: 'Tartiblash uchun {count} ta element' }
};

export const pick = {
    title: 'Savollar toʻplamini tanlang',
    mine: 'Mening toʻplamlarim',
    search: 'Toʻplamlarni qidiring…',
    noneYet: 'Siz hali toʻplam yaratmagansiz.',
    createOne: 'Yaratish',
    noneFound: 'Toʻplam topilmadi.'
};

export const setView = {
    browse: 'Toʻplamlarni koʻrish',
    notFound: { title: 'Toʻplam topilmadi', text: 'U oʻchirilgan yoki eʼlondan olingan boʻlishi mumkin.' },
    network: { title: 'Toʻplamni yuklab boʻlmadi', text: 'Internet aloqasini tekshirib, qayta urinib koʻring.' },
    private: { title: 'Bu toʻplam shaxsiy', text: 'Uni ochish uchun toʻplamni yaratgan oʻqituvchi akkaunti bilan kiring.' },
    copied: 'Toʻplamlaringizga nusxalandi',
    linkCopied: 'Havola nusxalandi',
    deleted: 'Toʻplam oʻchirildi',
    host: 'Oʻyin oʻtkazish',
    copyEdit: 'Nusxa olib tahrirlash',
    questions: 'Savollar',
    showAnswers: 'Javoblarni koʻrsatish',
    hideAnswers: 'Javoblarni yashirish',
    deletePublic: 'U ommaviy kutubxonadan ham olib tashlanadi.',
    deletePrivate: 'Buni qaytarib boʻlmaydi.'
};

export const editor = {
    title: 'Nomi',
    titlePlaceholder: 'masalan, Fotosintez asoslari',
    description: 'Tavsif',
    optional: '(ixtiyoriy)',
    descriptionPlaceholder: 'Bu toʻplam nima haqida?',
    choose: 'Tanlang…',
    grade: 'Sinf darajasi',
    timeLimit: 'Vaqt chegarasi',
    timeDefault: 'Oʻyin boʻyicha',
    timeHelp: 'Comet Clash oʻyinida, taymer yoqilganda esa Grid Battle va Millionaire oʻyinlarida ishlatiladi.',
    unsaved: 'Saqlanmagan',
    publicInDiscover: 'Kashf etish boʻlimida ommaviy',
    import: 'Import',
    publish: 'Eʼlon qilish',
    unpublish: 'Eʼlondan olish',
    incomplete: { other: '{count} ta tugallanmagan' },
    noQuestions: 'Hozircha savollar yoʻq. Quyida qoʻshing.',
    addQuestion: 'Savol qoʻshish',
    examplesEach: 'Har turdan bitta namuna',
    fromChatGPT: 'ChatGPT dan',
    addEmpty: 'Boʻsh savol qoʻshish: {type}',
    example: 'Namuna',
    exampleAdded: 'Namuna qoʻshildi ({type}). Uni oʻzingizga moslab tahrirlang.',
    examplesAdded: 'Har bir turdan bittadan namuna qoʻshildi. Ularni oʻzingizga moslab tahrirlang.',
    needTitle: 'Avval toʻplamga nom bering.',
    saved: 'Saqlandi!',
    savedIncomplete: { other: 'Saqlandi. {count} ta tugallanmagan savol oʻyinlarda tashlab ketiladi.' },
    publicCopyFailed: 'Saqlandi, lekin ommaviy nusxani yangilab boʻlmadi.',
    network: 'Serverga ulanib boʻlmadi. Internetni tekshirib, qayta urinib koʻring.',
    noValid: 'Eʼlon qilishdan oldin kamida bitta savolni tugating.',
    published: 'Eʼlon qilindi! Endi u Kashf etish boʻlimida.',
    unpublished: 'Ommaviy kutubxonadan olib tashlandi.',
    imported: { other: '{count} ta savol import qilindi. Tekshirib chiqing, soʻng Saqlang.' },
    notEditable: 'Bu toʻplamni bu yerda tahrirlab boʻlmaydi',
    notEditableText: 'Faqat oʻz toʻplamlaringizni tahrirlash mumkin. Uni oching va oʻz versiyangizni yaratish uchun «Nusxa olib tahrirlash» ni tanlang.',
    openSet: 'Toʻplamni ochish',
    publishTitle: 'Kashf etish boʻlimida eʼlon qilish',
    publishText: 'Ommaviy toʻplamlarni har kim topishi, oʻynashi va nusxalashi mumkin.',
    leftOut: { other: '{count} ta tugallanmagan savol kiritilmaydi.' },
    author: 'Muallif sifatida koʻrsatiladi',
    leaveTitle: 'Saqlamasdan chiqasizmi?',
    leaveText: 'Bu toʻplamdagi oʻzgarishlaringiz yoʻqoladi.',
    leave: 'Chiqish',
    tapCorrect: 'Toʻgʻri javob yonidagi doirachani bosing.',
    tickCorrect: 'Barcha toʻgʻri javoblarni belgilang.',
    optionIsCorrect: '{n}-variant toʻgʻri',
    markOption: '{n}-variantni toʻgʻri deb belgilash',
    option: '{n}-variant',
    removeOption: '{n}-variantni olib tashlash',
    addOption: 'Variant qoʻshish',
    typedHint: 'Katta-kichik harflar va ortiqcha boʻshliqlar ahamiyatsiz. Oʻquvchilar yozishi mumkin boʻlgan boshqa yozilishlarni ham qoʻshing.',
    answer: 'Javob',
    alsoAccept: 'Bu ham qabul',
    correctAnswer: 'Toʻgʻri javob',
    anotherSpelling: 'Boshqa yozilishi',
    removeAccepted: 'Qabul qilinadigan javobni olib tashlash',
    acceptAnother: 'Yana bir javobni qabul qilish',
    orderHint: 'Elementlarni **toʻgʻri** tartibda yozing. Oʻquvchilar ularni aralashgan holda koʻradi.',
    item: '{n}-element',
    moveUp: 'Yuqoriga',
    moveDown: 'Pastga',
    removeItem: '{n}-elementni olib tashlash',
    addItem: 'Element qoʻshish',
    moveQuestionUp: 'Savolni yuqoriga koʻchirish',
    moveQuestionDown: 'Savolni pastga koʻchirish',
    duplicateQuestion: 'Savoldan nusxa olish',
    deleteQuestion: 'Savolni oʻchirish',
    statementPlaceholder: 'Fikr yozing, masalan: «Quyosh — yulduz.»',
    questionPlaceholder: 'Savolingizni yozing…',
    questionN: '{n}-savol'
};

export const importer = {
    title: 'Savollarni import qilish',
    importN: { other: '{count} ta savolni import qilish' },
    simpleList: 'Oddiy roʻyxat',
    step1: 'ChatGPT dan soʻrang',
    step1Hint: 'yoki Gemini, Copilot, istalgan AI chat',
    topic: 'Mavzu',
    topicPlaceholder: 'masalan, Fotosintez, Past Simple, Kasrlar',
    level: 'Kim uchun (ixtiyoriy)',
    levelPlaceholder: 'masalan, 7-sinf oʻquvchilari',
    language: 'Savollar tili',
    languages: { English: 'Inglizcha', Uzbek: 'Oʻzbekcha', Russian: 'Ruscha' },
    count: 'Savollar soni',
    types: 'Savol turlari',
    copyPrompt: 'Soʻrovni nusxalash',
    seePrompt: 'Soʻrovni koʻrish',
    hidePrompt: 'Soʻrovni yashirish',
    promptCopied: 'Soʻrov nusxalandi. Uni ChatGPT ga joylang, soʻng javobini shu yerga nusxalab qoʻying.',
    copyByHand: 'Quyidagi soʻrovni qoʻlda nusxalang.',
    step2: 'Javobni shu yerga joylang',
    paste: 'Buferdan joylash',
    clipboardEmpty: 'Bufer boʻsh.',
    pasteByHand: 'Quyidagi maydonni bosing va Ctrl+V ni bosing (telefonda uzoq bosib → Joylash).',
    seeFormat: 'Formatni koʻrish',
    hideExample: 'Namunani yashirish',
    tryExample: 'Shu namunani sinash',
    pasteJson: 'JSON ni joylang',
    ready: { other: '{count} ta savol tayyor' },
    skipped: { other: '{count} ta savol tashlab ketiladi' },
    more: { other: 'yana {count} ta' },
    useTitle: '«{title}»ni toʻplam nomi qilish',
    linesHint: 'Har bir qatorda bitta savol: {format}. Ular keyinchalik oʻzgartirish mumkin boʻlgan yozma javobli savollarga aylanadi.',
    linesFormat: 'savol | javob',
    linesPlaceholder: 'Fransiya poytaxti | Parij\n7 × 8 | 56\nEng katta sayyora | Yupiter',
    linesLabel: 'Savollar, har qatorda bittadan',
    errors: {
        syntax: 'Bu ChatGPT bergan JSON ga oʻxshamaydi. Uning butun javobini (kod oynasidagi qismni) nusxalab, qayta joylang.',
        syntaxAt: 'JSON da {pos}-belgi atrofida xato bor. ChatGPT dan «JSON ni qayta yubor» deb soʻrang va yangi javobni joylang.',
        noQuestions: 'Savollar topilmadi. JSON da «questions» roʻyxati boʻlishi kerak.'
    }
};

export const gamesPage = {
    subtitle: 'Har bir oʻyin istalgan savollar toʻplami bilan ishlaydi. Oʻyinni tanlang, soʻng toʻplamni.',
    live: 'Jonli oʻyinlar',
    liveText: 'Oʻquvchilar oʻz telefoni, plansheti yoki noutbukidan kod orqali qoʻshiladi. Akkaunt kerak emas.',
    board: 'Aqlli doska oʻyinlari',
    boardText: 'Bitta katta ekranda birgalikda oʻynaladi. Qoʻshilish shart emas.',
    illustration: '{name} rasmi',
    host: '{name} oʻyinini oʻtkazish',
    pickFor: '{name} uchun toʻplam tanlang'
};

export const compat = {
    native: 'Qoʻllab-quvvatlanadi',
    adapted: 'Moslashtiriladi',
    unsupported: 'Qoʻllab-quvvatlanmaydi',
    count: { other: '{playable}/{count} ta savol' },
    skipped: { other: '{count} ta tugallanmagan savol tashlab ketiladi.' }
};

export const host = {
    backToGames: 'Oʻyinlarga qaytish',
    pickAnother: 'Oʻtkazish uchun boshqa toʻplam tanlang.',
    with: '{title} bilan',
    game: 'Oʻyin',
    playable: '{count} tadan {usable} tasi yaroqli',
    questions: 'Bu raunddagi savollar',
    noQuestions: 'Bu toʻplamda hali savollar yoʻq.',
    tooFew: { other: '{name} uchun kamida {count} ta yaroqli savol kerak ({selected} ta tanlangan).' },
    willUse: { other: '{count} ta savol ishlatiladi.' },
    defaults: 'Standart',
    advanced: 'Qoʻshimcha sozlamalar',
    advancedChanged: { other: '{count} ta oʻzgargan' },
    starting: 'Boshlanmoqda…',
    createRoom: 'Oʻyin xonasini yaratish',
    startHere: 'Shu ekranda boshlash',
    storageFull: 'Boshlab boʻlmadi: brauzer xotirasi toʻla.',
    roomFailed: 'Oʻyin xonasini yaratib boʻlmadi. Internetni tekshirib, qaytadan urinib koʻring.',
    tooManySpecials: '{cells} ta katakli taxta uchun maxsus kataklar juda koʻp ({specials} ta). Ularning bir qismini kamaytiring.'
};

export const hostRoom = {
    notYours: 'Bu ekran oʻyinni yaratgan oʻqituvchiga tegishli.',
    joinInstead: 'Oʻyinchi sifatida qoʻshilish',
    home: 'Orbit bosh sahifasi'
};

export const board = {
    notSetUp: 'Bu doska oʻyini hali sozlanmagan.',
    choose: 'Oʻyin tanlash',
    exit: 'Oʻyindan chiqish',
    secondsLeft: { other: '{count} soniya qoldi' }
};

export const practice = {
    nothing: 'Bu toʻplamda hali mashq qilsa boʻladigan savollar yoʻq.'
};

export const notFound = {
    title: 'Bu sahifa orbitadan chiqib ketdi',
    text: 'Havola eskirgan yoki notoʻgʻri yozilgan boʻlishi mumkin.',
    home: 'Bosh sahifaga'
};

export const account = {
    nickname: 'Taxallusingiz',
    nicknameText: 'Shu qurilmada oʻyinga qoʻshilganingizda avtomatik toʻldiriladi.',
    teacherTitle: 'Oʻqituvchi akkaunti',
    teacherText: 'Savollar toʻplamlarini yaratish va oʻyin oʻtkazish uchun kiring. Toʻplamlaringiz akkauntingizda saqlanadi va istalgan qurilmada ochiladi.',
    provider: { google: 'Google akkaunti', password: 'Email va parol' },
    verified: 'Tasdiqlangan',
    notVerified: 'Tasdiqlanmagan',
    finishVerify: 'Yaratish va oʻyin oʻtkazishni boshlash uchun emailingizni tasdiqlang.',
    finishTerms: 'Yaratish va oʻyin oʻtkazishni boshlash uchun Foydalanish shartlarini qabul qiling.',
    name: 'Ismingiz',
    nameText: 'Oʻyin oʻtkazganingizda oʻquvchilarga va eʼlon qilgan toʻplamlaringiz muallifi sifatida koʻrsatiladi.',
    nameSaved: 'Ism saqlandi',
    legalTitle: 'Shartlar va maxfiylik',
    termsAccepted: 'Siz Foydalanish shartlari va Maxfiylik siyosatini {date} kuni qabul qilgansiz.',
    termsNotAccepted: 'Siz hali Foydalanish shartlarini qabul qilmagansiz.',
    signOutText: 'Bu qurilmadagi oʻquvchilar baribir akkauntsiz oʻyinlarga qoʻshila oladi.',
    deleteTitle: 'Akkauntni oʻchirish',
    deleteShort: 'Akkauntingiz, barcha toʻplamlaringiz va eʼlon qilgan hamma narsangiz oʻchiriladi.',
    deleteButton: 'Akkauntni oʻchirish',
    deleteText: 'Akkauntingiz, barcha savollar toʻplamlaringiz va eʼlon qilgan toʻplamlaringiz butunlay oʻchiriladi. Davom etayotgan oʻyinlar tugaguncha ishlashda davom etadi.',
    deleteGoogle: 'Tasdiqlash uchun Google akkauntingizni yana bir marta tanlaysiz.',
    deletePassword: 'Tasdiqlash uchun parolingizni kiriting',
    deleteConfirm: 'Butunlay oʻchirish',
    deleted: 'Akkauntingiz oʻchirildi.'
};

export const grades = {
    'Grade 1': '1-sinf', 'Grade 2': '2-sinf', 'Grade 3': '3-sinf', 'Grade 4': '4-sinf',
    'Grade 5': '5-sinf', 'Grade 6': '6-sinf', 'Grade 7': '7-sinf', 'Grade 8': '8-sinf',
    'Grade 9': '9-sinf', 'Grade 10': '10-sinf', 'Grade 11': '11-sinf', 'Grade 12': '12-sinf',
    University: 'Oliy taʼlim', Teachers: 'Oʻqituvchilar'
};

export const whatsNew = {
    title: 'Orbitdagi yangiliklar',
    ok: 'Tushunarli',
    sets_for_all: 'Endi har kim savollar toʻplamini yaratishi va ulashishi mumkin — nafaqat oʻqituvchilar.',
    grades: 'Toʻplamlarga sinf darajasi belgilash imkoniyati qoʻshildi (1–12-sinf, Oliy taʼlim, Oʻqituvchilar).',
    backup_password: 'Google akkaunti egalari endi zaxira email+parol qoʻshishi mumkin.',
    i18n: 'Interfeys to\'liq tarjima qilindi: ingliz, oʻzbek va rus tillarida.',
    terms_accept: 'Foydalanish shartlari endi ro\'yxatdan o\'tishda bir marta, shartlar o\'zgarganda yana ko\'rsatiladi.'
};

export const settings = {
    subtitle: 'Orbitni oʻzingizga moslang.',
    sections: 'Sozlamalar boʻlimlari',
    tabs: {
        account: 'Akkaunt',
        appearance: 'Koʻrinish',
        sound: 'Ovoz',
        performance: 'Unumdorlik',
        language: 'Til',
        data: 'Bu qurilma'
    },
    theme: 'Mavzu',
    themeText: 'Koinot — Orbitning uyi. Kunduzgi rejimni yorugʻ xonada oʻqish osonroq.',
    space: 'Koinot',
    daylight: 'Kunduz',
    accent: 'Asosiy rang',
    accentText: 'Tugmalar, ajratishlar va sayyorangiz uchun ishlatiladi.',
    accents: { green: 'Zumrad', blue: 'Okean', violet: 'Tumanlik' },
    soundText: 'Barcha musiqa va effektlar Orbit tomonidan jonli yaratiladi, hech narsa yuklab olinmaydi.',
    soundOn: 'Ovoz yoqilgan',
    soundOff: 'Ovoz oʻchirilgan',
    music: 'Musiqa',
    effects: 'Ovoz effektlari',
    preview: 'Jang musiqasini tinglash',
    stopPreview: 'Toʻxtatish',
    soundNote: 'Jonli oʻyinlarda musiqa oʻqituvchi ekranida chalinadi. Oʻquvchilar qurilmalarida sokinroq musiqa chalinadi (bu oʻtkazuvchi sozlamasi) va har bir oʻquvchi oʻz qurilmasida ovozni oʻchira oladi.',
    performanceText: 'Eski maktab kompyuterlarida kamroq effektlar oʻyinlarni silliq qiladi. Qurilma sekin boʻlsa, oʻyinlar sifatni avtomatik pasaytiradi.',
    presets: {
        saver: { label: 'Quvvatni tejash', text: 'Harakatlanuvchi yulduzlarsiz, sokin animatsiyalar' },
        balanced: { label: 'Muvozanatli', text: 'Silliq, fon effektlarisiz' },
        full: { label: 'Toʻliq effektlar', text: 'Miltillovchi yulduzlar va konfetti' }
    },
    particles: 'Fondagi yulduzlar va bayramona effektlar',
    particlesHelp: 'Miltillovchi yulduzlar, uchar yulduzlar va konfetti.',
    reducedMotion: 'Kamaytirilgan harakat',
    reducedMotionHelp: 'Aylanuvchi oylarni toʻxtatadi va sahifa oʻtishlarini yumshatadi. Oʻyin jarayoniga taʼsir qilmaydi.',
    languageTitle: 'Ilova tili',
    languageText: 'Hamma narsa, jumladan oʻyin ekranlari ham, darhol oʻzgaradi. Oʻquvchilar ham qoʻshilish ekranida tilni tanlashi mumkin.',
    languages: { en: 'Inglizcha', uz: 'Oʻzbekcha', ru: 'Ruscha' },
    dataText: 'Orbit tez ishlashi uchun sozlamalar va toʻplamlaringiz nusxasi shu brauzerda saqlanadi.',
    resetTitle: 'Bu qurilmada Orbitni tiklash',
    resetText: 'Sozlamalar, saqlangan natijalar va keshdagi maʼlumotlar shu brauzerdan tozalanadi. Oʻqituvchi akkauntingizdagi toʻplamlar oʻchirilmaydi.',
    resetButton: 'Qurilmani tiklash',
    resetConfirmTitle: 'Bu qurilmada Orbit tiklansinmi?',
    resetConfirmText: 'Sozlamalar va keshdagi maʼlumotlar shu brauzerdan oʻchiriladi. Oʻqituvchi akkauntingiz va undagi toʻplamlar xavfsiz qoladi.'
};
