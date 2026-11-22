// render.js — everything the player sees: cards, hands, life, intent, log.
// One job: turn game state into DOM. No rules live here.

import { ELEMENTS, ELEMENT_ICONS, cardLabel, MAX_LIFE } from './deck.js';
import { intentText } from './ai.js';

const $ = (id) => document.getElementById(id);

export function showScene(name) {
  for (const s of ['title', 'table', 'win', 'loss']) {
    $(`scene-${s}`).classList.toggle('hidden', s !== name);
  }
}

function emberDots(n) {
  return '●'.repeat(Math.max(0, n)) + '○'.repeat(Math.max(0, 9 - n));
}

export function cardElement(card, opts = {}) {
  const el = ELEMENTS[card.element];
  const div = document.createElement('div');
  div.className = `card el-${card.element}`;
  div.dataset.cardId = card.id;
  div.innerHTML =
    `<span class="c-value">${card.value}</span>` +
    `<span class="c-icon">${ELEMENT_ICONS[card.element]}</span>` +
    `<span class="c-center">${ELEMENT_ICONS[card.element]}</span>` +
    `<span class="c-name">${el.name} ${el.glyph}</span>` +
    `<span class="c-cost">${'⬢'.repeat(card.cost)} ${card.cost} ember${card.cost > 1 ? 's' : ''}</span>`;
  if (opts.onClick) div.addEventListener('click', () => opts.onClick(card));
  if (opts.selected) div.classList.add('selected');
  if (opts.unaffordable) div.classList.add('unaffordable');
  div.title = `${cardLabel(card)} — costs ${card.cost} ember${card.cost > 1 ? 's' : ''}`;
  return div;
}

export function cardBackElement(key) {
  const div = document.createElement('div');
  div.className = 'card card-back';
  div.innerHTML = '<span class="c-backmark">✦</span>';
  return div;
}

export function renderHands(state) {
  const youHand = $('you-hand');
  youHand.innerHTML = '';
  state.youHand.forEach((card, i) => {
    const el = cardElement(card, {
      selected: state.selected && state.selected.id === card.id,
      unaffordable: state.phase === 'choose' && card.cost > state.youEmbers,
      onClick: (c) => {
        if (state.phase !== 'choose') return;
        state.selected = c;
        renderHands(state);
        $('btn-play').disabled = c.cost > state.youEmbers;
        $('play-hint').textContent = c.cost > state.youEmbers
          ? `Not enough embers for ${cardLabel(c)} (needs ${c.cost})`
          : `Selected ${cardLabel(c)} — press Enter or PLAY CARD`;
      },
    });
    el.style.animationDelay = `${i * 0.06}s`;
    youHand.appendChild(el);
  });

  const oppHand = $('opp-hand');
  oppHand.innerHTML = '';
  state.oppHand.forEach((_, i) => {
    const back = cardBackElement(i);
    back.style.animationDelay = `${i * 0.06}s`;
    oppHand.appendChild(back);
  });

  $('btn-play').disabled = !(state.phase === 'choose' && state.selected && state.selected.cost <= state.youEmbers);
  if (state.phase === 'choose' && !state.selected) {
    $('play-hint').textContent = 'Select a card from your hand';
  }
}

export function renderPlayed(state) {
  const slotYou = $('slot-you');
  const slotOpp = $('slot-opp');
  slotYou.innerHTML = state.youPlayed ? '' : '<span class="slot-label">YOU</span>';
  slotOpp.innerHTML = state.oppPlayed ? '' : '<span class="slot-label">WARDEN</span>';
  if (state.youPlayed) slotYou.appendChild(cardElement(state.youPlayed));
  if (state.oppPlayed) slotOpp.appendChild(cardElement(state.oppPlayed));
}

export function renderResult(state) {
  const box = $('round-result');
  if (!state.lastResult) {
    box.textContent = 'Play a card to begin the round.';
    return;
  }
  const { text, you, opp } = state.lastResult;
  let detail = '';
  if (state.youPlayed && state.oppPlayed) {
    const parts = [];
    const wb = you.base - state.youPlayed.value;
    const ob = opp.base - state.oppPlayed.value;
    if (wb > 0) parts.push(`wheel +${wb}`);
    if (ob > 0) parts.push(`Warden wheel +${ob}`);
    if (you.combos.surge) parts.push(`your Surge +${you.combos.surge}`);
    if (you.combos.echo) parts.push(`Echo +${you.combos.echo}`);
    if (you.combos.run) parts.push(`Run +${you.combos.run}`);
    if (opp.combos.surge) parts.push(`Warden Surge +${opp.combos.surge}`);
    if (parts.length) detail = `<br><small>${parts.join(' · ')}</small>`;
  }
  box.innerHTML = text + detail;
}

export function renderLog(state) {
  const log = $('log');
  log.innerHTML = state.log.map((line) => `<div>${line}</div>`).join('') ||
    '<div>The duel begins. Ashra watches your first move.</div>';
}

export function renderAll(state) {
  $('round-num').textContent = state.round;
  $('phase-label').textContent =
    state.phase === 'choose' ? 'Choose a card' :
    state.phase === 'reveal' ? 'Trick revealed' : 'Duel over';
  $('you-life-fill').style.width = `${(state.youLife / MAX_LIFE) * 100}%`;
  $('opp-life-fill').style.width = `${(state.oppLife / MAX_LIFE) * 100}%`;
  $('you-life-text').textContent = `${state.youLife} ♥`;
  $('opp-life-text').textContent = `${state.oppLife} ♥`;
  $('you-embers').textContent = emberDots(state.youEmbers);
  $('opp-embers').textContent = emberDots(state.oppEmbers);
  $('opp-hand-count').textContent = `${state.oppHand.length} cards`;
  $('you-surge').textContent = state.youSurge > 0
    ? `✦ Surge ×${state.youSurge + 1} ${ELEMENTS[state.youSurgeEl].name}`
    : '';
  $('opp-intent').innerHTML = state.intent
    ? `🔮 <b>WARDEN'S INTENT</b><br>${intentText(state.intent)}`
    : '🔮 Ashra waits, embers low.';
  renderHands(state);
  renderPlayed(state);
  renderResult(state);
  renderLog(state);
}
