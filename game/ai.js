// ai.js — Ashra, the Ashen Warden: her readable intent and her card choice.
// One job: decide what the opponent telegraphs and what she plays.
// Her intent is honest: she names the element she will play when she has one,
// so the player can counter it with the element that beats it.

import { ELEMENTS, ELEMENT_KEYS, elementThatBeats, wheelBonus } from './deck.js';

// Pick the element Ashra telegraphs this round.
// She favours the element that beats what the player played last round,
// and otherwise the element of her strongest affordable card.
export function chooseIntent(state, rng) {
  const affordable = state.oppHand.filter((c) => c.cost <= state.oppEmbers);
  const pool = affordable.length ? affordable : state.oppHand;
  if (!pool.length) return null;

  const lastPlayer = state.youHistory[state.youHistory.length - 1];
  if (lastPlayer && rng() < 0.7) {
    const counter = elementThatBeats(lastPlayer.element);
    if (pool.some((c) => c.element === counter)) return counter;
  }
  // Otherwise telegraph her strongest element.
  let best = pool[0];
  for (const c of pool) if (c.value > best.value) best = c;
  return best.element;
}

// Choose the card Ashra actually plays, given her telegraphed intent.
// She plays her strongest card of the intended element when she has one;
// a bluff is never hidden: when she lacks it, she plays her weakest card.
export function chooseCard(state, intent) {
  const affordable = state.oppHand.filter((c) => c.cost <= state.oppEmbers);
  const pool = affordable.length ? affordable : state.oppHand;
  if (!pool.length) return null;
  if (intent) {
    const ofIntent = pool.filter((c) => c.element === intent);
    if (ofIntent.length) {
      let best = ofIntent[0];
      for (const c of ofIntent) if (c.value > best.value) best = c;
      return best;
    }
  }
  let weakest = pool[0];
  for (const c of pool) if (c.value < weakest.value) weakest = c;
  return weakest;
}

// Plain-language intent line for the table, naming the counter explicitly.
export function intentText(intent) {
  if (!intent) return 'Ashra is spent — she has no embers to play with.';
  const el = ELEMENTS[intent];
  const counter = elementThatBeats(intent);
  const counterName = ELEMENTS[counter].name;
  const lines = [
    `Ashra gathers <b>${el.name}</b> — a ${el.glyph} card is coming. Counter with <b>${counterName}</b> ${ELEMENTS[counter].glyph}.`,
    `Ashra's eyes burn <b>${el.name}</b>. Play <b>${counterName}</b> to turn her wheel against her.`,
    `The Warden channels <b>${el.name}</b> ${el.glyph}. <b>${counterName}</b> beats it — if you hold one.`,
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

// How much power a card is worth against a rival card, before combos.
export function trickPower(card, rivalCard) {
  if (!card) return 0;
  return card.value + (rivalCard ? wheelBonus(card.element, rivalCard.element) : 0);
}
