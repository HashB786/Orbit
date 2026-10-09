// Game descriptions (games.*) and host settings (gs.*)
export const games = {
    live: 'Live · students join with a code',
    liveShort: 'Live · join with code',
    board: 'Smart board · one screen',
    boardShort: 'Smart board',
    cc: {
        name: 'Comet Clash',
        tagline: 'Blast the asteroid with the right answer: 1v1 Duels, or everyone at once in a Meteor Shower.',
        how: [
            'Students join with the code on their own phones, tablets or laptops.',
            'Duels: two students race on the same question. First to blast the answer +1, both miss −1, and the duel winner gets a bonus.',
            'Meteor Shower: everyone answers every question. Up to 100 points for speed, −100 for not finding it.',
            'Missed questions come back later, and you get a class report at the end.'
        ],
        notes: {
            typed: 'Shown as asteroids: the answer plus decoys from the rest of the set.',
            multi: 'Blast every correct asteroid.',
            order: 'Blast the asteroids in the right order.'
        }
    },
    siege: {
        name: 'Slingshot Siege',
        tagline: 'Space teams defend their planets around a sun. Every right answer earns a comet, and gravity bends every shot.',
        how: [
            'Students join with the code on their phones, tablets or laptops and are split into space teams.',
            'Every correct answer earns a comet, gives the team +5 and recharges its shield.',
            'Aim by dragging with a finger or the mouse, or with the arrow keys. The sun\'s gravity bends the comet.',
            'A hit is worth +10, or +25 once the planet\'s shield is down. Skim past the sun first for a slingshot: double points.',
            'Planets orbit (in Wild mode they roam in loops in every direction) and the moon gets in the way. Fly through power stars for Triple comets, Mega comets and shields; 3 right answers in a row make a fire comet.'
        ],
        notes: {
            typed: 'Shown as options: the answer plus decoys from the rest of the set.',
            multi: 'Students pick every correct answer, then check.',
            order: 'Students tap the answers in the right order.'
        }
    },
    corsair: {
        name: 'Star Corsairs',
        tagline: 'Space pirates! Fly your own ship, blast meteors and your friends, and charge your lasers by answering questions.',
        how: [
            'Students join with the code on their phones, tablets or laptops and pick a ship.',
            'Docked in a safe bubble, they answer questions: every right answer charges laser energy ⚡.',
            'Then they launch and fly: a joystick and fire button on touch screens, the mouse or WASD and Space on laptops.',
            'Shoot meteors for crystals. Break a rival\'s shield and their ship explodes, spilling crystals that anyone can grab.',
            'Golden comets, upgrades and a mothership that fires back keep it wild. Most crystals at the end wins.'
        ],
        notes: {
            typed: 'Shown as options: the answer plus decoys from the rest of the set.',
            multi: 'Students pick every correct answer, then check.',
            order: 'Students tap the answers in the right order.'
        }
    },
    grid: {
        name: 'Grid Battle',
        tagline: 'Space teams explore a board of tiles: questions, black holes, shooting stars and meteor strikes.',
        how: [
            'Split the class into up to 6 space teams and put the board on the big screen.',
            'Teams take turns picking a tile. Questions are answered out loud and you judge them.',
            'Hidden tiles: black holes (−1), solar winds (reset), shooting stars (+1), meteor strikes (hit a team) and wormholes (lose a turn).'
        ],
        notes: {
            typed: 'The answer is revealed on screen for you to judge.'
        }
    },
    millionaire: {
        name: 'Who Wants to Be a Millionaire?',
        tagline: 'Climb the money tree on the big screen with lifelines and dramatic reveals.',
        how: [
            'Play as a whole class or pick a contestant.',
            'Each correct answer climbs the money tree. One wrong answer ends the run.',
            'Use 50:50 and Ask the Audience when you get stuck.'
        ],
        notes: {
            typed: 'Shown as four options: the answer plus decoys from the rest of the set.',
            multi: 'Millionaire always has exactly one right answer.',
            order: 'Millionaire always has exactly one right answer.'
        }
    }
};

export const gs = {
    cc: {
        mode: {
            label: 'Mode',
            options: { duel: 'Duels', shower: 'Meteor Shower' },
            helpShower: 'Everyone plays every question. The fastest correct player gets 100; the others get 100 × fastest time ÷ their time.',
            helpDuel: 'Two random students face off; everyone is re-paired until time runs out.'
        },
        duration: { label: 'Game length' },
        showerQuestions: { label: 'Questions' },
        rounds: { label: 'Rounds per duel' },
        roundTime: { label: 'Seconds per question', helpOwn: 'Questions with their own time limit use it instead.' },
        useQuestionTime: { label: 'Use each question\'s own time limit' },
        winBonus: { label: 'Duel win bonus' },
        missPenalty: { label: 'When both miss', options: { 0: 'No penalty', '-1': '−1 each', '-2': '−2 each' } },
        missPoints: { label: 'Didn\'t find the answer' },
        negativeScores: { label: 'Total scores can go below zero' },
        suddenDeath: { label: 'Sudden-death round on a tie' },
        bots: { label: 'Bot rival when nobody is free', help: 'Bots never appear on the leaderboard. Beating one gives half the win bonus.' },
        botWait: { label: 'Seconds before a bot joins' },
        speed: { label: 'Asteroid speed', options: { calm: 'Calm', normal: 'Normal', fast: 'Fast' } },
        hostTimeout: {
            label: 'If your screen goes offline',
            options: { 0: 'Wait for me (never end)', 60: 'End the game after 1 min', 180: 'End the game after 3 min', 300: 'End the game after 5 min' },
            help: 'While your screen is offline the game pauses. Come back in time and it continues where it stopped.'
        },
        lateJoin: { label: 'Allow joining after the start' },
        randomNames: { label: 'Fun random nicknames', help: 'Students get a generated name like "Cosmic Otter" instead of typing one.' },
        studentLeaderboard: { label: 'Show rank on student screens' },
        studentMusic: { label: 'Music on student devices', help: 'Soft background music on every student\'s device. Each student can mute it.' },
        studentSound: { label: 'Sound effects on student devices' }
    },
    siege: {
        teams: { label: 'Teams', help: 'Students are split evenly as they join. You can shuffle the teams in the lobby.' },
        duration: { label: 'Game length' },
        timer: { label: 'Question timer', help: 'A countdown for every question. Running out of time counts as a wrong answer.' },
        timerSeconds: { label: 'Seconds per question', helpOwn: 'Questions with their own time limit use it instead.' },
        useQuestionTime: { label: 'Use each question\'s own time limit' },
        orbit: {
            label: 'Planets move',
            options: { still: 'Still', ring: 'Circle', wild: 'Wild' },
            help: 'Wild: planets loop in and out, speed up, slow down and turn back. Every planet does the same dance, so it stays fair.'
        },
        planetSpeed: { label: 'Planet speed', options: { slow: 'Slow', normal: 'Normal', fast: 'Fast', turbo: 'Turbo' } },
        moon: { label: 'The Moon', help: 'A moon circles closer to the sun the other way. It blocks comets and pulls them a little, so timing matters.' },
        powerUps: { label: 'Power stars', help: 'Stars appear now and then. Fly a comet through one for a Triple comet, a Mega comet or +30 shield.' },
        bounty: { label: 'Bounty on the leader', help: 'Hitting the team in first place gives +5, which keeps the game close.' },
        slingshotBonus: { label: 'Slingshot bonus', help: 'Comets that skim past the sun (inside the golden ring) before a hit score double.' },
        hostTimeout: {
            label: 'If your screen goes offline',
            options: { 0: 'Wait for me (never end)', 60: 'End the game after 1 min', 180: 'End the game after 3 min', 300: 'End the game after 5 min' },
            help: 'While your screen is offline the game pauses. Come back in time and it continues where it stopped.'
        },
        lateJoin: { label: 'Allow joining after the start' },
        randomNames: { label: 'Fun random nicknames', help: 'Students get a generated name like "Cosmic Otter" instead of typing one.' },
        studentMusic: { label: 'Music on student devices', help: 'Soft background music on every student\'s device. Each student can mute it.' },
        studentSound: { label: 'Sound effects on student devices' }
    },
    corsair: {
        duration: { label: 'Game length' },
        raids: { label: 'Players can raid each other', help: 'Off is peace mode: everyone mines meteors and fights the mothership together.' },
        timer: { label: 'Question timer', help: 'A countdown for every question. Running out of time counts as a wrong answer.' },
        timerSeconds: { label: 'Seconds per question', helpOwn: 'Questions with their own time limit use it instead.' },
        useQuestionTime: { label: 'Use each question\'s own time limit' },
        invasions: { label: 'Mothership invasions', help: 'Every few minutes an alien mothership attacks. Right answers fire at it; if it escapes, it robs the top 3 players.' },
        goldComets: { label: 'Golden comets', help: 'Now and then a golden comet races across. The ship that smashes it wins a jackpot.' },
        upgrades: { label: 'Upgrade bay', help: 'Students can spend crystals on a stronger laser, armor or a crystal magnet.' },
        bounty: { label: 'Bounty on the leader', help: 'Plundering the player in first place pays +25 crystals, which keeps the game close.' },
        hostTimeout: {
            label: 'If your screen goes offline',
            options: { 0: 'Wait for me (never end)', 60: 'End the game after 1 min', 180: 'End the game after 3 min', 300: 'End the game after 5 min' },
            help: 'While your screen is offline the game pauses. Come back in time and it continues where it stopped.'
        },
        lateJoin: { label: 'Allow joining after the start' },
        randomNames: { label: 'Fun random nicknames', help: 'Students get a generated name like "Cosmic Otter" instead of typing one.' },
        studentMusic: { label: 'Music on student devices', help: 'Soft background music on every student\'s device. Each student can mute it.' },
        studentSound: { label: 'Sound effects on student devices' }
    },
    grid: {
        teams: { label: 'Teams' },
        rows: { label: 'Rows' },
        cols: { label: 'Columns' },
        bombs: { label: 'Black holes (−1 point)' },
        winds: { label: 'Solar winds (score reset)' },
        bonuses: { label: 'Shooting stars (+1 point)' },
        grenades: { label: 'Meteor strikes (hit a team)' },
        skips: { label: 'Wormholes (lose a turn)' },
        timer: { label: 'Question timer', help: 'A countdown for every question. When it runs out, the answer is shown.' },
        timerSeconds: { label: 'Seconds per question', helpOwn: 'Questions with their own time limit use it instead.' },
        useQuestionTime: { label: 'Use each question\'s own time limit' }
    },
    millionaire: {
        questionCount: { label: 'Questions to the top' },
        fiftyFifty: { label: '50:50 lifeline' },
        askAudience: { label: 'Ask the Audience lifeline' },
        suspense: { label: 'Answer reveal', options: { quick: 'Quick', dramatic: 'Dramatic' } },
        timer: { label: 'Question timer', help: 'A countdown for every question. Running out of time counts as a wrong answer.' },
        timerSeconds: { label: 'Seconds per question', helpOwn: 'Questions with their own time limit use it instead.' },
        useQuestionTime: { label: 'Use each question\'s own time limit' }
    }
};
