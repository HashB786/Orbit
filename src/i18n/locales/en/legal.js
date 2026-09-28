export default {
    updated: 'Last updated: {date}',
    contactWith: 'Questions? Write to {email}.',
    contactSchool: 'Questions? Ask your school, which runs this Orbit website.',
    back: 'Back',
    terms: {
        title: 'Terms of Use',
        intro: 'Orbit is a free platform for classroom quiz games. By creating an account or using Orbit you agree to these terms. Please read them; they are short.',
        sections: [
            {
                h: '1. Who can use Orbit',
                p: [
                    'Students join games with a code and a nickname. They don\'t need an account.',
                    'Teachers need an account to create question sets and host games. To create one you must be 13 or older, and a teacher or have permission from your school or parent.'
                ]
            },
            {
                h: '2. Your account',
                p: [
                    'Give your real name and an email address you own, and confirm it with the verification email.',
                    'Keep your password private. You are responsible for what happens in your account. If you think someone else is using it, change your password.'
                ]
            },
            {
                h: '3. Your question sets',
                p: [
                    'You keep the rights to the sets you create. Private sets are only visible to you.',
                    'When you publish a set, everyone can find it, play it and copy it into their own sets, together with the author name you choose.',
                    'Only publish content you are allowed to share. Don\'t put personal information about students (full names, photos, grades) into sets.',
                    'If you use ChatGPT or another AI to write questions, check them before playing: AI can make mistakes.'
                ]
            },
            {
                h: '4. Playing fair and being kind',
                p: [
                    'Don\'t use Orbit to bully, insult or scare anyone. Nicknames and sets must be appropriate for a school.',
                    'Don\'t try to break, overload or cheat the website, or to get into other people\'s accounts or games.',
                    'Teachers can remove players from their games. We may remove content or accounts that break these rules.'
                ]
            },
            {
                h: '5. The service',
                p: [
                    'Orbit is free and provided "as is". We work to keep it running, but we can\'t promise it will always be available or free of errors, and features may change.',
                    'Keep your own copy of anything important. Orbit is not responsible for lost content or for decisions made based on game results.'
                ]
            },
            {
                h: '6. Changes',
                p: [
                    'If these terms change, you will be asked to accept the new version the next time you sign in.'
                ]
            }
        ]
    },
    privacy: {
        title: 'Privacy Policy',
        intro: 'Orbit collects as little as possible. There are no ads, no tracking and nothing is sold.',
        sections: [
            {
                h: '1. Students',
                p: [
                    'Students don\'t create accounts and don\'t give an email. When joining a game they type a nickname; a first name or a fun name is best, not a full name.',
                    'During a game Orbit stores the nickname, answers and scores so the game can run and show results. The teacher and the other players in that game can see nicknames and scores.',
                    'Each device gets an anonymous id so the website knows which player is which. It isn\'t linked to a name or email.'
                ]
            },
            {
                h: '2. Teachers',
                p: [
                    'For an account Orbit stores your name, email address, and your Google profile picture if you sign in with Google.',
                    'Orbit also stores your question sets, the date you accepted these terms, and, if you publish sets, the author name shown with them.',
                    'Passwords are handled by Google Firebase Authentication. Orbit never sees or stores your password.'
                ]
            },
            {
                h: '3. On your device',
                p: [
                    'Your settings (theme, language, sound, performance) and a copy of your sets for fast loading are kept in your browser\'s storage. Clearing your browser data removes them from that device.'
                ]
            },
            {
                h: '4. Where data is stored',
                p: [
                    'Orbit uses Google Firebase (Authentication, Firestore and Realtime Database) to store accounts, sets and live games. Google processes this data for Orbit under its own security and privacy terms.'
                ]
            },
            {
                h: '5. How long',
                p: [
                    'Account data is kept until you delete your account.',
                    'Game rooms are temporary: when a teacher hosts a new game, Orbit deletes the rooms that teacher created on the same device more than 7 days ago.'
                ]
            },
            {
                h: '6. Your choices',
                p: [
                    'You can change your name, unpublish sets, and delete your account in Settings. Deleting your account removes your profile, all your sets and the sets you published.'
                ]
            }
        ]
    }
};
