export const games = {
    live: 'Jonli · oʻquvchilar kod bilan qoʻshiladi',
    liveShort: 'Jonli · kod bilan',
    board: 'Aqlli doska · bitta ekran',
    boardShort: 'Aqlli doska',
    cc: {
        name: 'Kometalar jangi',
        tagline: 'Toʻgʻri javobli asteroidni urib tushiring: 1ga 1 duellar yoki hamma birga — Meteor yomgʻirida.',
        how: [
            'Oʻquvchilar oʻz telefonlari yoki noutbuklaridan kod orqali qoʻshiladi.',
            'Duellar: ikki oʻquvchi bitta savolda bellashadi. Javobni birinchi urgan +1 oladi, ikkalasi topolmasa −1, duel gʻolibi esa bonus oladi.',
            'Meteor yomgʻiri: hamma har bir savolga javob beradi. Tezlik uchun 100 ballgacha, topolmaganga −100.',
            'Xato qilingan savollar keyinroq qaytadi, oxirida esa sinf hisobotini olasiz.'
        ],
        notes: {
            typed: 'Asteroidlar koʻrinishida: javob va toʻplamdagi boshqa savollardan chalgʻituvchi variantlar.',
            multi: 'Barcha toʻgʻri asteroidlarni urib tushiring.',
            order: 'Asteroidlarni toʻgʻri tartibda urib tushiring.'
        }
    },
    grid: {
        name: 'Kataklar jangi',
        tagline: 'Koinot jamoalari kataklar taxtasini oʻrganadi: savollar, qora tuynuklar, uchar yulduzlar va meteor zarbalari.',
        how: [
            'Sinfni 6 tagacha koinot jamoasiga boʻling va taxtani katta ekranga chiqaring.',
            'Jamoalar navbat bilan katak tanlaydi. Savollarga ovoz chiqarib javob beriladi, siz esa baholaysiz.',
            'Yashirin kataklar: qora tuynuklar (−1), quyosh shamollari (hisob nolga), uchar yulduzlar (+1), meteor zarbalari (jamoaga zarba) va chuvalchang tuynuklari (navbat yoʻqoladi).'
        ],
        notes: {
            typed: 'Javob baholashingiz uchun ekranda ochiladi.'
        }
    },
    millionaire: {
        name: 'Kim millioner boʻlishni xohlaydi?',
        tagline: 'Katta ekranda yordam imkoniyatlari va hayajonli ochilishlar bilan pul zinapoyasidan koʻtariling.',
        how: [
            'Butun sinf bilan oʻynang yoki bitta ishtirokchini tanlang.',
            'Har bir toʻgʻri javob sizni zinapoyada yuqoriga koʻtaradi. Bitta xato javob oʻyinni tugatadi.',
            'Qiyin boʻlsa 50:50 va «Zal yordami» dan foydalaning.'
        ],
        notes: {
            typed: 'Toʻrtta variant koʻrinishida: javob va toʻplamdagi boshqa savollardan chalgʻituvchi variantlar.',
            multi: 'Millionerda har doim aynan bitta toʻgʻri javob boʻladi.',
            order: 'Millionerda har doim aynan bitta toʻgʻri javob boʻladi.'
        }
    }
};

export const gs = {
    cc: {
        mode: {
            label: 'Rejim',
            options: { duel: 'Duellar', shower: 'Meteor yomgʻiri' },
            helpShower: 'Hamma har bir savolni oʻynaydi. Eng tez toʻgʻri javob bergan 100 ball oladi; qolganlar 100 × eng tez vaqt ÷ oʻz vaqti ball oladi.',
            helpDuel: 'Ikki tasodifiy oʻquvchi bellashadi; vaqt tugaguncha hamma qayta juftlanadi.'
        },
        duration: { label: 'Oʻyin davomiyligi' },
        showerQuestions: { label: 'Savollar' },
        rounds: { label: 'Bir dueldagi raundlar' },
        roundTime: { label: 'Har bir savolga soniya' },
        winBonus: { label: 'Duel gʻolibiga bonus' },
        missPenalty: { label: 'Ikkalasi topolmasa', options: { 0: 'Jarimasiz', '-1': 'Har biriga −1', '-2': 'Har biriga −2' } },
        missPoints: { label: 'Javobni topolmasa' },
        negativeScores: { label: 'Umumiy ball noldan pastga tushishi mumkin' },
        suddenDeath: { label: 'Durangda hal qiluvchi raund' },
        bots: { label: 'Boʻsh raqib boʻlmasa bot', help: 'Botlar reytingda koʻrinmaydi. Botni yengsangiz, gʻalaba bonusining yarmini olasiz.' },
        botWait: { label: 'Bot qoʻshilishidan oldingi soniyalar' },
        speed: { label: 'Asteroidlar tezligi', options: { calm: 'Sokin', normal: 'Oʻrtacha', fast: 'Tez' } },
        hostTimeout: {
            label: 'Ekraningiz oflayn boʻlib qolsa',
            options: { 0: 'Meni kuting (tugatmang)', 60: '1 daqiqadan keyin tugatish', 180: '3 daqiqadan keyin tugatish', 300: '5 daqiqadan keyin tugatish' },
            help: 'Ekraningiz oflayn boʻlganda oʻyin pauza qilinadi. Oʻz vaqtida qaytsangiz, toʻxtagan joyidan davom etadi.'
        },
        lateJoin: { label: 'Boshlangandan keyin qoʻshilishga ruxsat' },
        randomNames: { label: 'Qiziqarli tasodifiy taxalluslar', help: 'Oʻquvchilar taxallus yozish oʻrniga «Cosmic Otter» kabi avtomatik ism oladi.' },
        studentLeaderboard: { label: 'Oʻquvchi ekranida oʻrnini koʻrsatish' },
        studentMusic: { label: 'Oʻquvchilar qurilmasida musiqa', help: 'Telefonlarda sokin fon musiqasi. Har bir oʻquvchi uni oʻchira oladi.' },
        studentSound: { label: 'Oʻquvchilar qurilmasida ovoz effektlari' }
    },
    grid: {
        teams: { label: 'Jamoalar' },
        rows: { label: 'Qatorlar' },
        cols: { label: 'Ustunlar' },
        bombs: { label: 'Qora tuynuklar (−1 ball)' },
        winds: { label: 'Quyosh shamollari (hisob nolga)' },
        bonuses: { label: 'Uchar yulduzlar (+1 ball)' },
        grenades: { label: 'Meteor zarbalari (jamoaga zarba)' },
        skips: { label: 'Chuvalchang tuynuklari (navbat yoʻqoladi)' }
    },
    millionaire: {
        questionCount: { label: 'Choʻqqigacha savollar' },
        fiftyFifty: { label: '50:50 yordami' },
        askAudience: { label: '«Zal yordami»' },
        suspense: { label: 'Javobni ochish', options: { quick: 'Tez', dramatic: 'Hayajonli' } }
    }
};
