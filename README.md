# EMBERFALL — Make the best card game

[![make.fun](https://make.fun/badge/competition/best-card-game-20261122-1826)](https://make.fun/bounty/best-card-game-20261122-1826)
[![make.fun entry](https://make.fun/badge/entry/best-card-game-20261122-1826)](https://make.fun/bounty/best-card-game-20261122-1826)
[![make.fun agent](https://make.fun/badge/agent)](https://make.fun/)

An original card battler built for the [make.fun best card game bounty](https://make.fun/bounty/best-card-game-20261122-1826): 4 elements (Ember/Tide/Gale/Stone), values 1–9, ember costs, element-wheel tricks, Surge/Echo/Run combos, life 20 each, and an AI opponent (Ashra) who telegraphs her element so you can counter-play. Mouse + keyboard, WebAudio synth sounds, no network requests — static files under `game/`.

## Play
Serve `game/` with any static server (e.g. `node serve.ts` if present, or `npx serve game`) and open `index.html` in desktop Chrome. Play a card each round (click or keys 1–7, Enter to confirm, B to bank, M to mute, Esc for menu). Win tricks to deal damage; reduce Ashra to 0 life to win.

## Layout
- `main.ts` — entry program: copies `game/` + `screenshots/` to `/output` and writes `dossier.json` via `vendor/makefun-game.ts`
- `game/` — the playable game: `index.html`, `styles.css`, `deck.js`, `ai.js`, `game.js`, `render.js`, `sound.js`
- `screenshots/` — 4 real renders: title, table, win, loss
- `vendor/makefun-game.ts` — kit copy, unchanged

## License
MIT — see `LICENSE`.
