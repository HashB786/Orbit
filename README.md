# Orbit

Orbit is an interactive quiz-game platform for classrooms, in the spirit of Kahoot and Blooket. Teachers sign in, build question sets, pick a game, tune the settings and share a room code. Students join on their own devices with just the code and a nickname. They never need an account.

## Features

- **Three languages:** English, Uzbek (Latin) and Russian, including every game screen. The first visit follows the browser's language. Students can switch on the join and nickname screens, teachers in Settings. English ships with the app; Uzbek and Russian load only when chosen.
- **Teacher accounts:** creating and hosting need a teacher account. Joining a game never does.
  - Sign in with **Google**, or with **email and password**. Email accounts must confirm their address through a verification email.
  - Every teacher accepts the Terms of Use and Privacy Policy (the `/terms` and `/privacy` pages) before creating anything.
  - Sets are saved to the account, so they follow the teacher to any device. Sets made in a browser before accounts existed move into the first account that signs in there.
  - Settings → Account: change your name, sign out, or delete the account and everything in it.
- **Create:** a question editor with five types: multiple choice, true/false, written answer, multi-select and put-in-order.
  - **Import from ChatGPT:** Orbit writes a ready prompt (topic, number of questions, grade, language, question types). Paste the AI's JSON answer back and a live preview shows what will be imported and why any question is skipped. The importer tolerates code fences, trailing commas, curly quotes and different key names.
  - **Examples:** every question type has a "+ Example" button, plus "One example of each".
  - Simple `question | answer` lines still work too.
- **Discover:** search the public library by topic, subject or question type. Any set can be copied and edited.
- **Games:** every game declares which question types it supports. Host setup shows which questions of your set will be used, which will be converted, and which aren't supported.
  - **Comet Clash** (live): blast the asteroid with the right answer on students' phones or laptops, in 1v1 **Duels** or an everyone-at-once **Meteor Shower**. See [Comet Clash rules](#comet-clash-rules).
  - **Grid Battle** (smart board): space teams pick tiles that hide questions, black holes, solar winds, shooting stars, meteor strikes and wormholes.
  - **Who Wants to Be a Millionaire?** (smart board): the money tree, with lifelines.
- **Practice:** solo Comet Clash with any set, for revising at home.
- **Sound:** all music and sound effects are synthesized in the browser, so there are no audio files.
- **Built for school devices:** it works on phones, laptops and smart boards. Pages load on demand, and games automatically lower their graphics quality on slow machines.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

### Offline test mode (no setup needed)

Without Firebase keys, Orbit runs in **offline test mode**:

- Question sets and the "public library" live in this browser.
- Live games connect the **tabs of one browser**.
- Teacher accounts are simulated. "Continue with Google" signs in a test teacher, and the verification email is replaced by a "Simulate clicking the link" button.

To try a live game, host it in one tab and open `/join` in other tabs to join as students. Each tab becomes its own player. Add `?local=1` to any URL to force this mode even when Firebase is configured.

## Firebase setup (real classrooms)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com). The free Spark plan is enough for a class.
2. **Authentication → Sign-in method.** Enable three providers:
   - **Anonymous:** every device gets an invisible id, so students can join games without signing in.
   - **Google:** pick a support email when asked.
   - **Email/Password:** leave "Email link (passwordless sign-in)" off.
3. **Authentication → Settings → Authorized domains.** Add your site's domain (for example `your-site.netlify.app` and any custom domain). Without it, Google sign-in and verification links fail on the live site. `localhost` is there by default.
4. **Authentication → Templates** (optional). The verification and password-reset emails are sent in the language the teacher is using Orbit in. You can change the sender name and the wording here.
5. **Firestore Database → Create database.** Paste the contents of [`firestore.rules`](firestore.rules) into the **Rules** tab and press **Publish**.
6. **Realtime Database → Create database.** Paste [`database.rules.json`](database.rules.json) into its **Rules** tab and press **Publish**.
   - Both rule files changed when teacher accounts were added: only signed-in teachers with a verified email can save sets, publish or open game rooms. Re-paste them whenever they change.
7. **Project settings → Your apps → Web app.** Copy the config into a `.env` file, using [`.env.example`](.env.example) as the template. Include `VITE_FIREBASE_DATABASE_URL`.
   - Optional: `VITE_CONTACT_EMAIL` is shown on the Terms and Privacy pages as the address for questions. Without it, those pages tell people to ask the school.
8. When deploying to Netlify, add the same `VITE_*` variables under **Site settings → Environment variables**. [`public/_redirects`](public/_redirects) already makes links like `/play/123456` work.

Limits to know about:

- On the free plan, the Realtime Database allows **100 simultaneous connections**, which is roughly three classes at once. The pay-as-you-go Blaze plan removes the limit and costs very little at school scale.
- Images are deliberately not supported, to keep the database small.
- Game rooms are temporary. When a teacher opens a new room, Orbit deletes the rooms that teacher opened on the same device more than 7 days ago.

## Comet Clash rules

### Duels

Everything below is a teacher setting, shown here with its default:

| Situation | What happens |
| --- | --- |
| One student blasts the right answer | They get **+1**, the rival 0 |
| Both students find it | The faster one gets **+1**. Each device times its own player, so slow Wi-Fi doesn't lose rounds |
| Both students miss | **−1 each**. Total scores can go below zero (a setting) |
| End of the duel (**5 rounds**) | The winner gets **+3**. On a tie, one sudden-death round; still tied, both get half |
| No free opponent | After **8 s**, a bot rival steps in. Beating it gives half the bonus, and bots never appear on the leaderboard |
| Duel finished | Players are re-paired, avoiding an immediate rematch, until the **timer** runs out |
| A student disconnects mid-duel | They get 15 s to come back. After that the rival wins by forfeit. Refreshing or reopening restores the same player |
| The timer runs out mid-duel | Points from finished rounds count; nobody gets the win bonus |
| Written answers | Shown as asteroids: the answer plus decoys from the rest of the set |
| Multi-select / put-in-order | Blast every correct asteroid, or blast them in order. A wrong hit stuns you for 1.5 s |

### Meteor Shower

Everyone answers every question at the same time; there are no duels.

| Situation | What happens |
| --- | --- |
| The fastest student to find the answer | **100** points |
| Any other student who finds it | **100 × fastest time ÷ their time** (twice as slow = 50), at least 1 |
| A student who doesn't find it in time | **−100** (or −50 / 0) |
| A student offline for the whole question | Skipped, no penalty |
| After each question | The answer, how many found it, the fastest student and the leaderboard with each student's points |
| Game length | A set number of questions (default **10**) |

### Both modes

| Situation | What happens |
| --- | --- |
| The teacher's screen goes offline | The game pauses. By default, if the screen is back within **3 min** it continues and no playing time is lost; after that the game ends. "Wait for me" never ends it |
| A nickname is already in the room | The student is asked to pick another one |
| The teacher presses **Play again** | A new room opens with the same set and settings, and students still on the results screen join it automatically with the same nickname |
| Music | The teacher's screen plays the music. Student devices play soft music too (a setting), and each student can mute their own device |

Teachers can also:

- lock the room
- remove a player by tapping their name
- add a minute
- switch on "fun random nicknames"

At the end, the host screen shows a podium and a **class report** of the questions students missed most.

## Project structure

```
src/
  i18n/                     translation engine + locales/en|uz|ru (en is bundled, uz/ru load on demand)
  platform/                 shared by every page and game
    auth/                   teacher accounts: Firebase Auth, or a simulated version for offline test mode
    questions/              question types, validation, choice rounds, game compatibility
    sets/                   my sets (account, cached in the browser), featured sets, public library (Firestore), search
    realtime/               one small database interface: Firebase | localStorage (offline) | memory (tests)
    rooms/                  room codes, joining, presence, moderation, React hooks
    games/registry.js       the list of games: kind, supported types, settings schema, components
    audio/                  synthesized music + sound effects
  games/
    comet-clash/            playfield engine, host controller (game rules), host / player / practice screens
    grid-battle/            smart-board game
    millionaire/            smart-board game
  pages/                    Home, Discover, Create, SetEditor, SetView, Games, HostSetup, HostRoom, Play, Board, SignIn, Legal...
  components/               UI kit, editor, set cards, host setup panels, auth (sign-in, verify email, accept terms)
```

## Translations

Every text on screen comes from `src/i18n/locales/<lang>/`. Components call `t('section.key', { vars })` from `useT()`. Code outside React (the canvas game, toasts) uses the `t` exported by `src/i18n`.

- Placeholders are written `{name}`. Counts use plural forms (`one` / `other` in English and Uzbek, `one` / `few` / `many` in Russian) and are picked automatically from `count`.
- `**bold**` in a text is shown bold (the `Rich` component). `Slots` puts links or styled words into `{placeholders}`, so every language keeps its own word order.
- A missing key falls back to English, and in development it logs a warning.
- When you add a text, add it to all three locales. Uzbek uses ʻ (U+02BB) in oʻ / gʻ and ʼ (U+02BC) for the tutuq belgisi.

## Adding a new game

1. Create `src/games/<your-game>/`.
2. Add an entry to `GAMES` in [`src/platform/games/registry.js`](src/platform/games/registry.js):
   - `kind`: `'live'` (students join with a code) or `'board'` (one big screen).
   - `compat`: for each question type, `'native'`, `'adapted'` or `'unsupported'`. Host setup uses this to show teachers which questions will be played.
   - `settings`: a list of `number` / `toggle` / `select` / `segmented` fields. The host setup form is generated from it, and `sanitizeSettings` validates it.
   - `i18n`: the name of the game's translation section. Its name, description and setting labels live under `games.<i18n>` and `gs.<i18n>` in every locale.
   - Components:
     - Board games: `Board({ questions, settings, onExit })`.
     - Live games: `Host({ code, onExit })` and `Player({ code, playerId, onExit })`.
3. For live games, reuse `platform/rooms` for joining, presence and kicking, and `platform/rooms/hooks` for subscriptions. [`games/comet-clash/hostLogic.js`](src/games/comet-clash/hostLogic.js) is a complete example of a host-authoritative controller: students write only their own answers, and the host computes everything else.
4. Use `toChoiceRound()` from `platform/questions/rounds.js` whenever your game needs answer options. It already turns written answers into multiple choice.

## Roadmap

- More live game modes built on the same room layer.
