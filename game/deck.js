// deck.js — the deck, the four elements and the element wheel.
// One job: know what a card is and how elements beat each other.

export const ELEMENTS = {
  ember: { name: 'Ember', color: '#ff6a2a', glyph: '▲', beats: 'gale', weakTo: 'tide' },
  tide:  { name: 'Tide',  color: '#2fa8e0', glyph: '●', beats: 'ember', weakTo: 'stone' },
  gale:  { name: 'Gale',  color: '#46c98a', glyph: '◆', beats: 'stone', weakTo: 'ember' },
  stone: { name: 'Stone', color: '#b08954', glyph: '■', beats: 'tide', weakTo: 'gale' },
};
export const ELEMENT_KEYS = ['ember', 'tide', 'gale', 'stone'];

// The wheel: Ember > Gale > Stone > Tide > Ember. A card whose element beats
// the rival's gains +2 power on the trick.
export function wheelBonus(attackerEl, defenderEl) {
  if (ELEMENTS[attackerEl].beats === defenderEl) return 2;
  return 0;
}
export function elementThatBeats(el) {
  return ELEMENT_KEYS.find((k) => ELEMENTS[k].beats === el);
}

// Ember cost of a card: 1 ember for values 1–3, 2 for 4–6, 3 for 7–9.
export function emberCost(value) {
  return value <= 3 ? 1 : value <= 6 ? 2 : 3;
}

// A card is { id, element, value, cost }. The deck holds 36 cards:
// four elements × values 1–9.
export const MAX_LIFE = 20;
export const START_EMBERS = 3;
export const HAND_SIZE = 5;
export function buildDeck() {
  const deck = [];
  for (const element of ELEMENT_KEYS) {
    for (let value = 1; value <= 9; value++) {
      deck.push({ id: `${element}-${value}`, element, value, cost: emberCost(value) });
    }
  }
  return deck;
}

// Fisher–Yates shuffle. A seeded rng keeps demo/screenshot games identical.
export function shuffle(deck, rng) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// mulberry32 — tiny deterministic rng from an integer seed.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Inline SVG icons, one per element: flame, droplet, swirl, mountain.
// Colour AND shape tell the elements apart — never text alone.
export const ELEMENT_ICONS = {
  ember: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6 C38 18 50 22 50 38 a18 18 0 1 1 -36 0 C14 26 22 22 24 14 C28 20 30 20 32 6 Z" fill="#ffd76a"/><path d="M32 30 C36 36 42 38 42 46 a10 10 0 1 1 -20 0 C22 38 28 36 32 30 Z" fill="#ff6a2a"/></svg>',
  tide: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6 C40 22 52 30 52 42 a20 20 0 1 1 -40 0 C12 30 24 22 32 6 Z" fill="#bfe9ff"/><path d="M22 44 a10 10 0 0 0 14 9 C30 52 24 50 22 44 Z" fill="#2fa8e0"/></svg>',
  gale: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 10 a22 22 0 1 1 -14 39" fill="none" stroke="#d8ffe9" stroke-width="7" stroke-linecap="round"/><path d="M32 22 a12 12 0 1 1 -8 20" fill="none" stroke="#46c98a" stroke-width="6" stroke-linecap="round"/><circle cx="32" cy="32" r="5" fill="#eafff2"/></svg>',
  stone: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M6 54 L24 16 L36 34 L46 22 L58 54 Z" fill="#e8cfa0"/><path d="M24 16 L36 34 L28 54 L14 54 Z" fill="#b08954"/><path d="M36 34 L46 22 L58 54 L44 54 Z" fill="#8a6a3a"/></svg>',
};

export function cardLabel(card) {
  return `${ELEMENTS[card.element].name} ${card.value}`;
}
