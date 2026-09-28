# Orbit

Orbit is an interactive quiz-game platform for classrooms, in the spirit of Kahoot and Blooket. Teachers build question sets, pick a game, tune the settings and share a room code. Students join on their own devices with just the code and a nickname. They never need an account.

## Features

- **Create:** a question editor with five types: multiple choice, true/false, written answer, multi-select and put-in-order. You can also bulk-import `question | answer` lines or JSON.
- **Discover:** search the public library by topic, subject or question type. Any set can be copied and edited.
- **Games:** every game declares which question types it supports. Host setup shows which questions of your set will be used, which will be converted, and which aren't supported.
  - **Comet Clash** (live): 1v1 space duels on students' phones or laptops. See [Comet Clash rules](#comet-clash-rules).
  - **Grid Battle** (smart board): teams pick tiles that hide questions, bombs, bonuses and grenades.
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

To try a live game, host it in one tab and open `/join` in other tabs to join as students. Each tab becomes its own player. Add `?local=1` to any URL to force this mode even when Firebase is configured.

## Firebase setup (real classrooms)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com). The free Spark plan is enough for a class.
2. **Authentication → Sign-in method → Anonymous → Enable.**
   - Every device gets an invisible anonymous id. Students still don't sign in.
   - Later, teachers' anonymous sessions can be linked to Google accounts without losing their sets.
3. **Firestore Database → Create database.** Paste the contents of [`firestore.rules`](firestore.rules) into the **Rules** tab.
4. **Realtime Database → Create database.** Paste [`database.rules.json`](database.rules.json) into its **Rules** tab.
5. **Project settings → Your apps → Web app.** Copy the config into a `.env` file, using [`.env.example`](.env.example) as the template. Include `VITE_FIREBASE_DATABASE_URL`.
6. When deploying to Netlify, add the same `VITE_FIREBASE_*` variables under **Site settings → Environment variables**. [`public/_redirects`](public/_redirects) already makes links like `/play/123456` work.

Limits to know about:

- On the free plan, the Realtime Database allows **100 simultaneous connections**, which is roughly three classes at once. The pay-as-you-go Blaze plan removes the limit and costs very little at school scale.
- Images are deliberately not supported, to keep the database small.

## Comet Clash rules

Everything below is a teacher setting, shown here with its default:

| Situation | What happens |
| --- | --- |
| One student blasts the right answer | They get **+1**, the rival 0 |
| Both students find it | The faster one gets **+1**. Each device times its own player, so slow Wi-Fi doesn't lose rounds |
| Both students miss | **−1 each** (scores can be set to never drop below 0) |
| End of the duel (**5 rounds**) | The winner gets **+3**. On a tie, one sudden-death round; still tied, both get half |
| No free opponent | After **8 s**, a bot rival steps in. Beating it gives half the bonus, and bots never appear on the leaderboard |
| Duel finished | Players are re-paired, avoiding an immediate rematch, until the **timer** runs out |
| A student disconnects mid-duel | They get 15 s to come back. After that the rival wins by forfeit. Refreshing or reopening restores the same player |
| The timer runs out mid-duel | Points from finished rounds count; nobody gets the win bonus |
| Written answers | Shown as asteroids: the answer plus decoys from the rest of the set |
| Multi-select / put-in-order | Blast every correct asteroid, or blast them in order. A wrong hit stuns you for 1.5 s |

Teachers can also:

- lock the room
- remove a player by tapping their name
- add a minute
- switch on "fun random nicknames"

At the end, the host screen shows a podium and a **class report** of the questions students missed most.

## Project structure

```
src/
  platform/                 shared by every page and game
    questions/              question types, validation, choice rounds, game compatibility
    sets/                   my sets (browser), featured sets, public library (Firestore), search
    realtime/               one small database interface: Firebase | localStorage (offline) | memory (tests)
    rooms/                  room codes, joining, presence, moderation, React hooks
    games/registry.js       the list of games: kind, supported types, settings schema, components
    audio/                  synthesized music + sound effects
  games/
    comet-clash/            playfield engine, host controller (game rules), host / player / practice screens
    grid-battle/            smart-board game
    millionaire/            smart-board game
  pages/                    Home, Discover, Create, SetEditor, SetView, Games, HostSetup, HostRoom, Play, Board...
  components/               UI kit, editor, set cards, host setup panels
```

## Adding a new game

1. Create `src/games/<your-game>/`.
2. Add an entry to `GAMES` in [`src/platform/games/registry.js`](src/platform/games/registry.js):
   - `kind`: `'live'` (students join with a code) or `'board'` (one big screen).
   - `compat`: for each question type, `'native'`, `'adapted'` or `'unsupported'`. Host setup uses this to show teachers which questions will be played.
   - `settings`: a list of `number` / `toggle` / `select` / `segmented` fields. The host setup form is generated from it, and `sanitizeSettings` validates it.
   - Components:
     - Board games: `Board({ questions, settings, onExit })`.
     - Live games: `Host({ code, onExit })` and `Player({ code, playerId, onExit })`.
3. For live games, reuse `platform/rooms` for joining, presence and kicking, and `platform/rooms/hooks` for subscriptions. [`games/comet-clash/hostLogic.js`](src/games/comet-clash/hostLogic.js) is a complete example of a host-authoritative controller: students write only their own answers, and the host computes everything else.
4. Use `toChoiceRound()` from `platform/questions/rounds.js` whenever your game needs answer options. It already turns written answers into multiple choice.

## Roadmap

- Google sign-in for teachers, so sets sync across devices. The data already has `ownerId` fields. Joining a game will stay account-free.
- More live game modes built on the same room layer.
