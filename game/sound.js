// sound.js — all sounds are synthesized with WebAudio. No audio files.
// One job: turn game events into short tones.

let ctx = null;
let muted = false;

export function setMuted(value) { muted = value; }
export function isMuted() { return muted; }

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  select() { tone(520, 0.07, 'triangle', 0.12); },
  deal() { tone(340, 0.09, 'sine', 0.10, 0, 520); },
  flip() { tone(700, 0.08, 'square', 0.05); tone(940, 0.1, 'sine', 0.08, 0.05); },
  winTrick() { tone(523, 0.12, 'triangle', 0.14); tone(659, 0.12, 'triangle', 0.14, 0.09); tone(784, 0.2, 'triangle', 0.14, 0.18); },
  loseTrick() { tone(392, 0.14, 'sawtooth', 0.06); tone(311, 0.2, 'sawtooth', 0.06, 0.1); },
  tie() { tone(440, 0.12, 'sine', 0.1); tone(440, 0.12, 'sine', 0.1, 0.14); },
  bank() { tone(880, 0.1, 'sine', 0.1); tone(1174, 0.16, 'sine', 0.1, 0.08); },
  winGame() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.28, 'triangle', 0.15, i * 0.13));
    tone(1568, 0.5, 'sine', 0.12, 0.7);
  },
  loseGame() {
    [392, 370, 349, 311].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.06, i * 0.17));
  },
};
