// Русский. Plural objects use one / few / many (other is a fallback for fractions).

export const common = {
    cancel: 'Отмена',
    close: 'Закрыть',
    back: 'Назад',
    save: 'Сохранить',
    delete: 'Удалить',
    edit: 'Изменить',
    copy: 'Копировать',
    host: 'Провести',
    practice: 'Тренировка',
    share: 'Поделиться',
    continue: 'Продолжить',
    loading: 'Загрузка…',
    refresh: 'Обновить',
    search: 'Поиск',
    exit: 'Выйти',
    mute: 'Выключить звук',
    unmute: 'Включить звук',
    questions: { one: '{count} вопрос', few: '{count} вопроса', many: '{count} вопросов', other: '{count} вопроса' },
    plays: { one: '{count} игра', few: '{count} игры', many: '{count} игр', other: '{count} игры' },
    players: { one: '{count} игрок', few: '{count} игрока', many: '{count} игроков', other: '{count} игрока' },
    by: 'автор: {name}',
    untitled: 'Набор без названия',
    copyOf: 'Копия:',
    true: 'Верно',
    false: 'Неверно',
    orAlso: '{main} (или {rest})',
    all: 'Все',
    items: { one: '{count} элемент', few: '{count} элемента', many: '{count} элементов', other: '{count} элемента' }
};

export const units = {
    minutes: '{n} мин',
    s: 'с',
    pts: 'очк.'
};

export const nav = {
    home: 'Главная',
    discover: 'Обзор',
    create: 'Создать',
    games: 'Игры',
    settings: 'Настройки',
    joinGame: 'Войти в игру',
    spaceMode: 'Космос',
    daylightMode: 'Дневной режим',
    toDaylight: 'Включить дневной режим',
    toSpace: 'Включить космос',
    expand: 'Развернуть меню',
    collapse: 'Свернуть меню',
    setName: 'Укажите имя'
};

export const qtypes = {
    mc: { label: 'Один ответ', short: 'Выбор', hint: 'Один верный вариант' },
    tf: { label: 'Верно / Неверно', short: 'В/Н', hint: 'Утверждение верно?' },
    typed: { label: 'Письменный ответ', short: 'Письменный', hint: 'Ученики вводят ответ' },
    multi: { label: 'Несколько ответов', short: 'Несколько', hint: 'Несколько верных вариантов' },
    order: { label: 'Порядок', short: 'Порядок', hint: 'Расставить элементы по порядку' }
};

export const validation = {
    prompt: 'Напишите вопрос.',
    minOptions: 'Добавьте хотя бы 2 варианта.',
    markCorrect: 'Отметьте верный вариант.',
    oneCorrect: 'Верным может быть только один вариант.',
    markSomeCorrect: 'Отметьте хотя бы один верный вариант.',
    oneWrong: 'Хотя бы один вариант должен быть неверным.',
    distinctOptions: 'Варианты не должны повторяться.',
    answer: 'Укажите верный ответ.',
    minItems: 'Добавьте хотя бы 2 элемента.',
    distinctItems: 'Элементы не должны повторяться.',
    unknownType: 'Неизвестный тип вопроса.',
    tfAnswer: 'Ответ должен быть true или false.',
    notQuestion: 'Это не вопрос.'
};

export const subjects = {
    Math: 'Математика',
    Science: 'Естествознание',
    Physics: 'Физика',
    Chemistry: 'Химия',
    Biology: 'Биология',
    Geography: 'География',
    History: 'История',
    English: 'Английский язык',
    Languages: 'Языки',
    'Computer Science': 'Информатика',
    Art: 'Изобразительное искусство',
    Music: 'Музыка',
    Other: 'Другое'
};

export const art = {
    venus: 'Венера',
    earth: 'Земля',
    moon: 'Луна',
    mars: 'Марс'
};

export const demos = {
    mc: [
        { q: 'Какую планету называют Красной планетой?', right: ['Марс'], wrong: ['Венера', 'Юпитер', 'Меркурий'] },
        { q: 'Какой город — столица Узбекистана?', right: ['Ташкент'], wrong: ['Самарканд', 'Бухара', 'Карши'] },
        { q: 'Сколько будет 7 × 8?', right: ['56'], wrong: ['54', '63', '48'] }
    ],
    tf: [
        { q: 'Солнце — это звезда.', answer: true },
        { q: 'На уровне моря вода кипит при 50 °C.', answer: false },
        { q: 'У треугольника три стороны.', answer: true }
    ],
    typed: [
        { q: 'Какой город — столица Франции?', accept: ['Париж'] },
        { q: 'Сколько на Земле материков?', accept: ['6', 'шесть'] },
        { q: 'Какой газ растения поглощают из воздуха?', accept: ['Углекислый газ', 'CO2'] }
    ],
    multi: [
        { q: 'Какие из этих планет — газовые гиганты?', right: ['Юпитер', 'Сатурн'], wrong: ['Марс', 'Земля'] },
        { q: 'Какие числа простые?', right: ['2', '7', '13'], wrong: ['9', '15'] },
        { q: 'Кто из них млекопитающие?', right: ['Дельфин', 'Летучая мышь'], wrong: ['Акула', 'Орёл'] }
    ],
    order: [
        { q: 'Расставьте планеты по удалённости от Солнца', items: ['Меркурий', 'Венера', 'Земля', 'Марс'] },
        { q: 'Расставьте от самого маленького к самому большому', items: ['Атом', 'Клетка', 'Муравей', 'Слон'] },
        { q: 'Расставьте стадии развития растения по порядку', items: ['Семя', 'Росток', 'Молодое растение', 'Цветок'] }
    ]
};
