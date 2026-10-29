// Sounds for CH 04 (spacewar.js), made in the browser with Web Audio: nothing is downloaded. The 1962
// Spacewar! was silent; the PDP-1 only made music through Peter Samson's hack, square waves from the
// console's lights. These keep to that palette, square waves and noise, as the arcade machines after it
// did: a rumble while a ship thrusts, a blip for each torpedo, a crash, a swoop into hyperspace and back,
// a slide into the hole, short tunes between rounds, the clack of the piano keys, the detents of the
// volume knob and the tube switching on and off. Each ship sounds from its side of the screen. The volume
// (0 to 10, on the console's knob) is remembered.

const LOUDEST = .9, KEY = "spacewar-volume";
const clamp = n => Math.min(10, Math.max(0, Math.round(n)));
let audio, out, noise, setting = 6, resting = 0, visible = true;
const engines = [];
try {
  const saved = localStorage.getItem(KEY);
  if (saved && Number.isFinite(+saved)) setting = clamp(+saved);
} catch (e) { /* storage unavailable */ }

// The knob turns the volume as the ear hears it, not the signal: the gain goes with its square.
const gain = () => LOUDEST * (setting / 10) ** 2;
export const level = () => setting;
export function setLevel(n) {
  setting = clamp(n);
  try { localStorage.setItem(KEY, String(setting)); } catch (e) { /* storage unavailable */ }
  if (out) out.gain.setTargetAtTime(gain(), audio.currentTime, .03);
}

// Browsers let sound start only after a key press or a click: the console wakes it on each.
export function wake() {
  if (!visible) return;
  clearTimeout(resting);
  if (!audio) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    audio = new Context();
    // A small speaker in a metal cabinet: the top end rolled off.
    const speaker = new BiquadFilterNode(audio, { type: "lowpass", frequency: 5200, Q: .4 });
    out = new GainNode(audio, { gain: gain() });
    out.connect(speaker).connect(audio.destination);
    noise = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (audio.state === "suspended") audio.resume();
}
// The console is off: let the last sounds ring out, then stop.
export function rest() {
  hush();
  clearTimeout(resting);
  resting = setTimeout(() => audio?.suspend(), 1200);
}

// Sounds asked for while the context is still resuming wait for it, a moment at most.
export function setVisible(value) { visible = value; if (!visible) hush(); }
const ready = () => visible && setting > 0 && !!audio && audio.state !== "closed";
const side = x => Math.max(-1, Math.min(1, x * .7));

// One note, sliding from one pitch to another, struck and fading.
function tone({ type = "square", from, to = from, at = 0, length, volume = .1, pan = 0 }) {
  const t = audio.currentTime + at, osc = new OscillatorNode(audio, { type, frequency: from });
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + length);
  osc.connect(envelope(t, length, volume)).connect(new StereoPannerNode(audio, { pan })).connect(out);
  osc.start(t);
  osc.stop(t + length + .02);
}
// A burst of noise through a filter that can sweep.
function hiss({ at = 0, length, volume = .2, filter = "lowpass", from = 4000, to = from, pan = 0 }) {
  const t = audio.currentTime + at, src = new AudioBufferSourceNode(audio, { buffer: noise, loop: true });
  const colour = new BiquadFilterNode(audio, { type: filter, frequency: from });
  colour.frequency.setValueAtTime(from, t);
  if (to !== from) colour.frequency.exponentialRampToValueAtTime(to, t + length);
  src.connect(colour).connect(envelope(t, length, volume)).connect(new StereoPannerNode(audio, { pan })).connect(out);
  src.start(t, Math.random() * .5);
  src.stop(t + length + .02);
}
function envelope(t, length, volume) {
  const env = new GainNode(audio, { gain: 0 });
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(volume, t + .005);
  env.gain.exponentialRampToValueAtTime(.0001, t + length);
  return env;
}
const NOTE = n => 440 * 2 ** ((n - 69) / 12);
const tune = (notes, step, volume = .07, type = "square") =>
  notes.forEach((n, i) => tone({ type, from: NOTE(n), at: i * step, length: step * .95, volume }));

/* ───────── The game ───────── */

export function fire(kind, x) {
  if (ready()) tone({ from: kind === "needle" ? 1500 : 1100, to: 180, length: .13, volume: .09, pan: side(x) });
}
export function crash(x) {
  if (!ready()) return;
  hiss({ length: 1.2, volume: .5, from: 2400, to: 90, pan: side(x) });
  tone({ type: "triangle", from: 120, to: 35, length: .45, volume: .45, pan: side(x) });
}
// Into the hole: a long slide down, and a dull thud at the bottom.
export function swallowed(x) {
  if (!ready()) return;
  tone({ from: 520, to: 40, length: .9, volume: .1, pan: side(x) });
  tone({ type: "triangle", from: 70, to: 30, at: .55, length: .5, volume: .4, pan: side(x) });
}
// Into hyperspace (up and away) or back (down and in).
export function jump(x, away) {
  if (!ready()) return;
  const [from, to] = away ? [160, 2600] : [2600, 160];
  tone({ from, to, length: .32, volume: .07, pan: side(x) });
  tone({ type: "triangle", from: from * 1.5, to: to * 1.5, length: .32, volume: .06, pan: side(x) });
}
// A ship's engine: low noise, chugging a little, for as long as it burns.
export function engine(i, on, x) {
  if (!audio || !visible) return;
  let e = engines[i];
  if (!e && !on) return;
  if (!e) {
    const src = new AudioBufferSourceNode(audio, { buffer: noise, loop: true });
    const rumble = new BiquadFilterNode(audio, { type: "lowpass", frequency: 380, Q: 3 });
    const chug = new GainNode(audio, { gain: .75 }), lfo = new OscillatorNode(audio, { type: "square", frequency: 15 + 4 * i });
    const depth = new GainNode(audio, { gain: .25 });
    lfo.connect(depth).connect(chug.gain);
    e = engines[i] = { level: new GainNode(audio, { gain: 0 }), pan: new StereoPannerNode(audio), on: false };
    src.connect(rumble).connect(chug).connect(e.level).connect(e.pan).connect(out);
    src.start(); lfo.start();
  }
  if (e.on !== on) { e.on = on; e.level.gain.setTargetAtTime(on ? .45 : 0, audio.currentTime, on ? .02 : .05); }
  if (on) e.pan.pan.setTargetAtTime(side(x), audio.currentTime, .05);
}
export function hush() {
  if (!audio) return;
  for (const e of engines) { e.on = false; e.level.gain.setTargetAtTime(0, audio.currentTime, .03); }
}

export const roundStart = () => ready() && tune([72, 79], .09);
export const roundWon = () => ready() && tune([72, 76, 79, 84, 0, 84], .085);
export const roundDrawn = () => ready() && tune([67, 0, 67], .1);
export const gameOver = () => ready() && tune([67, 64, 60, 55, 48], .19, .09, "triangle");

/* ───────── The machine ───────── */

// The volume knob's detents: a soft mechanical tick each, and the click of the switch at 0. They come from
// the knob, not the speaker, so they do not follow the volume.
export function detent() {
  if (!visible || !audio || audio.state === "closed") return;
  const t = audio.currentTime, tick = new AudioBufferSourceNode(audio, { buffer: noise });
  const [frequency, loud, length] = setting === 0 ? [1600, .1, .03] : [4200, .05, .018];
  tick.connect(new BiquadFilterNode(audio, { type: "bandpass", frequency })).connect(envelope(t, length, loud)).connect(audio.destination);
  tick.start(t, Math.random() * .5);
  tick.stop(t + length + .02);
}
// A piano key latching.
export function clack() {
  if (!ready()) return;
  hiss({ length: .035, volume: .25, filter: "bandpass", from: 2600 });
  tone({ type: "triangle", from: 160, to: 90, length: .05, volume: .2 });
}
// The tube: a thump and a rising whine as it warms up; a falling zip and a crackle as it goes off.
export function power(on, at = 0) {
  if (!ready()) return;
  if (on) {
    tone({ type: "sine", from: 60, to: 42, at, length: .35, volume: .4 });
    tone({ type: "sine", from: 900, to: 6800, at, length: .7, volume: .012 });
    hiss({ at, length: .25, volume: .06, filter: "highpass", from: 3000 });
  } else {
    tone({ type: "sine", from: 1400, to: 50, length: .5, volume: .07 });
    hiss({ length: .12, volume: .08, filter: "highpass", from: 2500 });
  }
}
// Static between channels.
export function staticHiss(length = .42) {
  if (ready()) hiss({ length, volume: .1, filter: "highpass", from: 900 });
}
