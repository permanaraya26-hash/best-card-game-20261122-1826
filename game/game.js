// game.js — EMBERFALL's rules and state machine.
// One job: run the duel — deal, play a round, score combos, end the game.
// Combos: Surge (same element in a row, +1 per link), Echo (repeat a value,
// +3), Run (three values in a row, +4). Life 20 each; the trick's winner deals
// the power difference as damage.

import { buildDeck, shuffle, makeRng, wheelBonus, ELEMENTS, MAX_LIFE, START_EMBERS, HAND_SIZE } from './deck.js';
import { chooseIntent, chooseCard, intentText, trickPower } from './ai.js';
import { renderAll, renderHands, renderPlayed, renderResult, renderLog, showScene } from './render.js';
import { sfx, setMuted, isMuted } from './sound.js';

export function newGame(seed = (Math.random() * 1e9) | 0) {
  const rng = makeRng(seed);
  const deck = shuffle(buildDeck(), rng);
  const state = {
    seed, rng,
    deck,
    youHand: [], oppHand: [],
    youLife: MAX_LIFE, oppLife: MAX_LIFE,
    youEmbers: START_EMBERS, oppEmbers: START_EMBERS,
    round: 1,
    phase: 'choose', // choose | reveal | over
    youHistory: [], oppHistory: [],
    youSurge: 0, oppSurge: 0,
    youSurgeEl: null, oppSurgeEl: null,
    bestSurge: 0,
    tricksWon: 0, tricksLost: 0,
    intent: null,
    selected: null,
    log: [],
    youPlayed: null, oppPlayed: null,
    lastResult: null,
  };
  for (let i = 0; i < HAND_SIZE; i++) {
    state.youHand.push(state.deck.pop());
    state.oppHand.push(state.deck.pop());
  }
  state.intent = chooseIntent(state, rng);
  return state;
}

// --- combos ---------------------------------------------------------------

// Surge: playing the same element as your previous round builds a chain.
// Each link adds +1 power. Breaking the chain resets it.
export function surgeBonus(state, who, card) {
  const surgeEl = who === 'you' ? state.youSurgeEl : state.oppSurgeEl;
  const surge = who === 'you' ? state.youSurge : state.oppSurge;
  if (surgeEl === card.element) return surge + 1;
  return 0;
}

// Echo: playing the same value as your previous round is worth +3.
export function echoBonus(history, card) {
  const last = history[history.length - 1];
  return last && last.value === card.value ? 3 : 0;
}

// Run: your last three played values (including this one) in a row, +4.
export function runBonus(history, card) {
  const values = history.slice(-2).map((c) => c.value).concat(card.value);
  if (values.length < 3) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  if (sorted[1] === sorted[0] + 1 && sorted[2] === sorted[1] + 1) return 4;
  return 0;
}

export function comboBreakdown(state, who, card) {
  const history = who === 'you' ? state.youHistory : state.oppHistory;
  return {
    surge: surgeBonus(state, who, card),
    echo: echoBonus(history, card),
    run: runBonus(history, card),
  };
}

export function totalPower(state, who, card, rivalCard) {
  const combos = comboBreakdown(state, who, card);
  const base = trickPower(card, rivalCard);
  return { total: base + combos.surge + combos.echo + combos.run, base, combos };
}

// --- round flow -----------------------------------------------------------

export function drawUp(state, who) {
  const hand = who === 'you' ? state.youHand : state.oppHand;
  while (hand.length < HAND_SIZE && state.deck.length) hand.push(state.deck.pop());
}

export function playRound(state, youCard) {
  const oppCard = chooseCard(state, state.intent);
  state.youPlayed = youCard || null;
  state.oppPlayed = oppCard || null;
  state.phase = 'reveal';

  // Pay ember costs; banking (no card) refunds nothing and costs nothing.
  if (youCard) {
    state.youHand = state.youHand.filter((c) => c.id !== youCard.id);
    state.youEmbers -= youCard.cost;
  }
  if (oppCard) {
    state.oppHand = state.oppHand.filter((c) => c.id !== oppCard.id);
    state.oppEmbers -= oppCard.cost;
  }

  const you = youCard ? totalPower(state, 'you', youCard, oppCard) : { total: 0, base: 0, combos: { surge: 0, echo: 0, run: 0 } };
  const opp = oppCard ? totalPower(state, 'opp', oppCard, youCard) : { total: 0, base: 0, combos: { surge: 0, echo: 0, run: 0 } };
  // Banking braces you: you skipped your attack to guard, so the Warden's
  // trick hits 2 softer. A bank is a tempo loss, not a free beating.
  const banked = !youCard;
  const oppTotal = banked ? Math.max(0, opp.total - 2) : opp.total;

  // Update surge chains.
  if (youCard) {
    state.youSurge = state.youSurgeEl === youCard.element ? state.youSurge + 1 : 0;
    state.youSurgeEl = youCard.element;
    state.bestSurge = Math.max(state.bestSurge, state.youSurge + 1);
    state.youHistory.push(youCard);
  }
  if (oppCard) {
    state.oppSurge = state.oppSurgeEl === oppCard.element ? state.oppSurge + 1 : 0;
    state.oppSurgeEl = oppCard.element;
    state.oppHistory.push(oppCard);
  }

  let text;
  if (you.total === oppTotal) {
    text = `<b>Tie ${you.total}–${oppTotal}.</b> No damage — both sides gain 1 ember.`;
    state.youEmbers = Math.min(9, state.youEmbers + 1);
    state.oppEmbers = Math.min(9, state.oppEmbers + 1);
    sfx.tie();
  } else if (you.total > oppTotal) {
    const dmg = you.total - oppTotal;
    state.oppLife = Math.max(0, state.oppLife - dmg);
    state.tricksWon++;
    state.youEmbers = Math.min(9, state.youEmbers + 1);
    text = `<b>You win the trick ${you.total}–${oppTotal}!</b> Ashra takes ${dmg} damage.`;
    sfx.winTrick();
  } else {
    const dmg = oppTotal - you.total;
    state.youLife = Math.max(0, state.youLife - dmg);
    state.tricksLost++;
    state.oppEmbers = Math.min(9, state.oppEmbers + 1);
    text = `<b>Ashra wins the trick ${oppTotal}–${you.total}.</b> You take ${dmg} damage${banked ? ' (braced −2)' : ''}.`;
    sfx.loseTrick();
  }
  state.lastResult = { text, you, opp, youCard, oppCard };
  state.log.unshift(`Round ${state.round}: ${text.replace(/<[^>]+>/g, '')}`);
  state.log = state.log.slice(0, 30);

  if (state.youLife <= 0 || state.oppLife <= 0) {
    state.phase = 'over';
    if (state.oppLife <= 0) sfx.winGame(); else sfx.loseGame();
  }
  return state.lastResult;
}

export function nextRound(state) {
  state.round++;
  state.youPlayed = null;
  state.oppPlayed = null;
  state.selected = null;
  state.phase = 'choose';
  drawUp(state, 'you');
  drawUp(state, 'opp');
  state.youEmbers = Math.min(9, state.youEmbers + 1);
  state.oppEmbers = Math.min(9, state.oppEmbers + 1);
  state.intent = chooseIntent(state, state.rng);
}

// --- demo states for deterministic screenshots ----------------------------

// A fixed mid-game table: round 4, life 14 vs 11, a live surge, intent shown.
export function demoTableState() {
  const state = newGame(20261123);
  state.round = 4;
  state.youLife = 14; state.oppLife = 11;
  state.youEmbers = 5; state.oppEmbers = 4;
  state.youSurge = 2; state.youSurgeEl = 'ember'; state.bestSurge = 3;
  state.tricksWon = 2; state.tricksLost = 1;
  state.youHistory = [
    { id: 'ember-4', element: 'ember', value: 4, cost: 2 },
    { id: 'ember-7', element: 'ember', value: 7, cost: 3 },
    { id: 'ember-5', element: 'ember', value: 5, cost: 2 },
  ];
  state.oppHistory = [
    { id: 'tide-3', element: 'tide', value: 3, cost: 1 },
    { id: 'gale-6', element: 'gale', value: 6, cost: 2 },
    { id: 'stone-8', element: 'stone', value: 8, cost: 3 },
  ];
  state.youHand = [
    { id: 'ember-9', element: 'ember', value: 9, cost: 3 },
    { id: 'tide-8', element: 'tide', value: 8, cost: 3 },
    { id: 'gale-4', element: 'gale', value: 4, cost: 2 },
    { id: 'stone-6', element: 'stone', value: 6, cost: 2 },
    { id: 'tide-2', element: 'tide', value: 2, cost: 1 },
    { id: 'gale-7', element: 'gale', value: 7, cost: 3 },
    { id: 'stone-3', element: 'stone', value: 3, cost: 1 },
  ];
  state.oppHand = [
    { id: 'ember-2', element: 'ember', value: 2, cost: 1 },
    { id: 'tide-5', element: 'tide', value: 5, cost: 2 },
    { id: 'gale-9', element: 'gale', value: 9, cost: 3 },
    { id: 'stone-4', element: 'stone', value: 4, cost: 2 },
    { id: 'ember-6', element: 'ember', value: 6, cost: 2 },
  ];
  state.intent = 'gale';
  state.youPlayed = { id: 'ember-7', element: 'ember', value: 7, cost: 3 };
  state.oppPlayed = { id: 'stone-8', element: 'stone', value: 8, cost: 3 };
  state.phase = 'reveal';
  state.lastResult = {
    text: '<b>You win the trick 9–8!</b> Your Surge chain adds +2 to Ember 7. Ashra takes 1 damage.',
    you: { total: 9, base: 7, combos: { surge: 2, echo: 0, run: 0 } },
    opp: { total: 8, base: 8, combos: { surge: 0, echo: 0, run: 0 } },
  };
  state.log = [
    'Round 3: You win the trick 9–8! Ashra takes 1 damage.',
    'Round 2: Ashra wins the trick 9–6. You take 3 damage.',
    'Round 1: You win the trick 8–5! Ashra takes 3 damage.',
  ];
  state.selected = state.youHand[0];
  return state;
}

// --- app wiring -----------------------------------------------------------

let state = null;
let revealTimer = null;

export function startApp() {
  const params = new URLSearchParams(location.search);
  const scene = params.get('scene');

  document.getElementById('btn-start').addEventListener('click', () => beginDuel());
  document.querySelectorAll('[data-again]').forEach((b) => b.addEventListener('click', () => beginDuel()));
  document.getElementById('btn-quit').addEventListener('click', () => { showScene('title'); state = null; });
  document.getElementById('btn-sound').addEventListener('click', (e) => {
    setMuted(!isMuted());
    e.currentTarget.textContent = isMuted() ? '♪ MUTED' : '♪ SOUND';
  });
  document.getElementById('btn-bank').addEventListener('click', () => bankRound());
  document.getElementById('btn-play').addEventListener('click', () => confirmPlay());
  document.addEventListener('keydown', onKey);

  if (scene === 'win') { showEnd('win', demoEndStats(true)); return; }
  if (scene === 'loss') { showEnd('loss', demoEndStats(false)); return; }
  if (scene === 'table') {
    state = demoTableState();
    showScene('table');
    renderAll(state);
    return;
  }
  showScene('title');
}

function demoEndStats(won) {
  return { rounds: 9, life: won ? 6 : 0, oppLife: won ? 0 : 9, tricksWon: won ? 6 : 3, bestSurge: 4 };
}

function beginDuel() {
  state = newGame();
  showScene('table');
  renderAll(state);
  renderLog(state);
  sfx.deal();
}

function bankRound() {
  if (!state || state.phase !== 'choose') return;
  state.youEmbers = Math.min(9, state.youEmbers + 2);
  sfx.bank();
  playRound(state, null);
  afterReveal();
}

function confirmPlay() {
  if (!state || state.phase !== 'choose' || !state.selected) return;
  if (state.selected.cost > state.youEmbers) return;
  sfx.flip();
  playRound(state, state.selected);
  afterReveal();
}

function afterReveal() {
  renderAll(state);
  if (state.phase === 'over') {
    clearTimeout(revealTimer);
    revealTimer = setTimeout(() => showEnd(state.oppLife <= 0 ? 'win' : 'loss', {
      rounds: state.round, life: state.youLife, oppLife: state.oppLife,
      tricksWon: state.tricksWon, bestSurge: state.bestSurge,
    }), 1400);
    return;
  }
  clearTimeout(revealTimer);
  revealTimer = setTimeout(() => { nextRound(state); renderAll(state); }, 2600);
}

function showEnd(which, stats) {
  showScene(which);
  const p = which === 'win' ? 'win' : 'loss';
  document.getElementById(`${p}-rounds`).textContent = stats.rounds;
  document.getElementById(`${p}-life`).textContent = which === 'win' ? `${stats.life} ♥` : `${stats.oppLife} ♥`;
  document.getElementById(`${p}-tricks`).textContent = stats.tricksWon;
  document.getElementById(`${p}-surge`).textContent = stats.bestSurge;
}

function onKey(e) {
  const titleVisible = !document.getElementById('scene-title').classList.contains('hidden');
  if (e.key === 'Enter' || e.key === ' ') {
    if (titleVisible) { beginDuel(); return; }
    if (!document.getElementById('scene-win').classList.contains('hidden') ||
        !document.getElementById('scene-loss').classList.contains('hidden')) { beginDuel(); return; }
    if (state && state.phase === 'choose') confirmPlay();
    return;
  }
  if (!state) return;
  if (e.key === 'Escape') { showScene('title'); state = null; return; }
  if (e.key.toLowerCase() === 'm') {
    setMuted(!isMuted());
    document.getElementById('btn-sound').textContent = isMuted() ? '♪ MUTED' : '♪ SOUND';
    return;
  }
  if (state.phase !== 'choose') return;
  if (e.key.toLowerCase() === 'b') { bankRound(); return; }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= state.youHand.length) {
    const card = state.youHand[n - 1];
    state.selected = card;
    sfx.select();
    renderHands(state);
    document.getElementById('btn-play').disabled = card.cost > state.youEmbers;
    document.getElementById('play-hint').textContent =
      card.cost > state.youEmbers
        ? `Not enough embers for ${ELEMENTS[card.element].name} ${card.value} (needs ${card.cost})`
        : `Selected ${ELEMENTS[card.element].name} ${card.value} — press Enter to play`;
  }
}

startApp();
