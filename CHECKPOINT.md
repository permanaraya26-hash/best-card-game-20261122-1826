# EMBERFALL — build checkpoint (23 Nov 2026, ~02:50 WIB)

## What was built
Original card battler "EMBERFALL" for best-card-game-20261122-1826 ($50, deadline 23 Nov 13:26 WIB).
4 elements (Ember/Tide/Gale/Stone, colour + shape icon + inline SVG), values 1–9, ember costs 1–3.
Each round both sides play a card; element wheel +2; Surge chains (+1/link), Echo (+3 repeat value),
Run (+4 three in a row); life 20 each; trick winner deals the difference. AI (Ashra) telegraphs her
element each round with the counter named, so the player can counter-play. Bank gains +2 embers and
braces (−2 incoming damage). Mouse + keyboard (1–7, Enter, B, M, Esc). WebAudio synth sounds, no files.
Deal/flip/snap animations, win flourish (confetti), loss screen (ashfall).

## Files changed (all written in this session, in own words/structure)
- game/index.html — title / table / win / loss scenes
- game/styles.css — table, cards, fan, end screens (revised 3×: fan overlap, card spacing, loss brightness)
- game/deck.js — elements, wheel, 36-card deck, seeded RNG, SVG icons (revised: constants moved here)
- game/ai.js — intent telegraph + card choice
- game/game.js — state machine, combos, round flow, demo states, wiring (revised: bank-brace balance
  change, demo math fix 11–8 → 9–8, constants import)
- game/render.js — DOM rendering (revised: intent kept visible in reveal phase, MAX_LIFE import fix)
- game/sound.js — WebAudio synth SFX
- main.ts — entry program (own wording, starter structure)
- LICENSE (MIT), package.json ({"type":"module"})
- vendor/makefun-game.ts — kit copy, sha256-identical to kit
- screenshots/ — 4 real Chromium renders, 1280×800 JPEG q82

## Play-test result (real Chromium via playwright-core, cached chromium-1255)
- 5 rounds played live: mouse clicks (3 rounds) + keyboard "1" + Enter (round 4, won 8–6) + "B" bank
  (round 5, "Ashra wins the trick 1–0. You take 1 damage (braced −2)") — all worked, 0 console/page errors.
- Final play-test state: round 5, you 6 ♥, Ashra 18 ♥, 5 log lines, 5-card hand.
- No favicon 404 after adding data: URI favicon.

## Screenshots (1280×800, all ≤256 KiB)
- 01-title.jpg — 68,294 B, title screen with 4 element cards + rules
- 02-table.jpg — 109,801 B, round 4 table: both hands, life 14 vs 11, intent box, played cards, log
- 03-win.jpg — 43,928 B, VICTORY! with stats (9 rounds, 6 ♥, 6 tricks, surge 4)
- 04-loss.jpg — 39,458 B, DEFEAT with stats

## Determinism check
`mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` run twice → `diff -r` identical, twice
(second run after adding package.json: identical, no warnings). Dossier 400,642 B, output total 712K.

## Remaining / notes for parent
- NOT done (parent's job): no GitHub repo, no push, no bundle, no submit.
- Screenshots are .jpg (gate allows PNG or JPEG); names keep 01–04 order so 01-title is the cover.
- One cosmetic note: fanned hand cards' centred element names are partly covered by the next card;
  values, icons and colours (the judging info) are all fully visible.
- No failures. Game is complete and playable offline; no network references in game/
  (only "http" string is the SVG xmlns inside the data: URI favicon, which the gate passes as data:).
