// Language channels, tuned like an old TV: 01 English, 02 Polish, 03 binary. English lives in the page;
// Polish comes from lang/pl.js by key: data-i18n names an element's content (as HTML), data-i18n-attr its
// attributes ("aria-label:key;title:key"). The binary channel takes everything that reads as text, names,
// titles, badges, papers and all, and writes each letter as one bit of its own character code, so every
// block keeps its shape; pointing at or focusing a block decodes it. Switching shows the channel on screen with a burst of static, and the visible text resolves out of
// noise. Nothing around it should jump meanwhile: the bits are spaced to the width of the text they stand
// for, and a block that changes keeps its box, easing to the new size while its text settles.
// The choice is remembered; ?lang=pl (or en, bin) opens a channel from a link. AV, beside them, puts the
// whole page on a worn CRT with any of the channels; on a computer, AV also brings CH 04, Spacewar!
// (spacewar.js, loaded when first played). Like a remote, keys 1, 2 and 3 tune the channels, 0 switches AV,
// 4 plays Spacewar! on AV and Backspace rewinds to the top.

import { PL } from "./lang/pl.js";
import { osd, staticBurst, rewind, crtOn, setCRT } from "./retro.js";

const CHANNELS = { en: ["CH 01", "EN"], pl: ["CH 02", "PL"], bin: ["CH 03", "01 · BIN"] };
const root = document.documentElement;
const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
const description = document.querySelector('meta[name="description"]');
const keys = [...document.querySelectorAll("[data-channel]")];
const av = document.querySelector("[data-av]");
const gameKey = document.querySelector("[data-game]");
const desktop = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 900px)");
const blocks = [...document.querySelectorAll("[data-i18n]")];
const labelled = [...document.querySelectorAll("[data-i18n-attr]")];
const pairs = el => el.dataset.i18nAttr.split(";").map(pair => pair.split(":"));

// The English original of everything that changes.
const english = new Map(blocks.map(el => [el, el.innerHTML]));
const englishAttrs = new Map(labelled.map(el => [el, pairs(el).map(([name]) => el.getAttribute(name))]));
const englishMeta = { title: document.title, description: description?.content };
let current = "en";

const write = (el, html) => { if (el instanceof SVGElement) el.textContent = html; else el.innerHTML = html; };
const textNodes = el => {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
};

// The rest of the page's text has no translation but still goes binary: each of those text nodes keeps its
// own words here, and the element holding it becomes a "plain" unit. Left alone: the channel keys (the way
// back), text that is never drawn, and text that scripts keep rewriting (the sample feed, the footer game,
// the year, the observer readout).
const UNTOUCHED = ".channel, [data-i18n], title, desc, script, style, #observer-trace, [data-feed-clock], .feed__value b, [data-feed-sample], #year, #game-name, #game-toggle";
const original = new Map();
for (const node of textNodes(document.body)) {
  if (node.data.trim() && !node.parentElement.closest(UNTOUCHED)) original.set(node, node.data);
}
const plain = [...new Set([...original.keys()].map(node => node.parentElement))];
const ownText = el => [...el.childNodes].filter(node => original.has(node));
const translated = el => el.dataset.i18n !== undefined;
// Every unit of text, and the text it answers for: all of a translated block, a plain unit's own nodes.
const units = [...blocks, ...plain];
const runOf = el => translated(el) ? textNodes(el) : ownText(el);
// Units inside a unit (read together with it) and units around it.
const inside = new Map(units.map(el => [el, units.filter(other => other !== el && el.contains(other))]));
const around = new Map(units.map(el => [el, units.filter(other => other !== el && other.contains(el))]));

function tune(channel, animate) {
  const was = current;
  current = channel;
  const pl = channel === "pl";
  const changing = channel === "bin" || was === "bin" ? units : blocks;
  const visible = animate ? changing.filter(onScreen) : [], before = measure(visible);
  for (const el of blocks) {
    el.style.letterSpacing = "";
    delete el.dataset.encoded;
    write(el, (pl && PL[el.dataset.i18n]) || english.get(el));
  }
  for (const el of plain) if ("encoded" in el.dataset) decode(el);
  for (const el of labelled) {
    const original = englishAttrs.get(el);
    pairs(el).forEach(([name, key], i) => el.setAttribute(name, (pl && PL[key]) || original[i]));
  }
  root.lang = pl ? "pl" : "en";
  document.title = pl ? PL["meta.title"] : englishMeta.title;
  if (description) description.content = pl ? PL["meta.description"] : englishMeta.description;
  root.classList.toggle("is-binary", channel === "bin");
  if (channel === "bin") units.forEach(encode);
  keys.forEach(key => key.setAttribute("aria-pressed", String(key.dataset.channel === channel)));
  if (animate) resolve(visible, channel === "bin", before);
  document.dispatchEvent(new CustomEvent("channelchange", { detail: { channel } }));
}

/* ───────── Binary ───────── */

// Each letter or digit becomes one bit of its character code, taking the bits in turn along the text.
function bits(text) {
  let n = 0;
  return text.replace(/[\p{L}\p{N}]/gu, ch => (ch.codePointAt(0) >> (n++ % 7)) & 1 ? "1" : "0");
}
// Digits are wider than most letters, so the bits get a little less letter-spacing: just enough for the
// block to run as long as its English and break into the same lines.
const ruler = document.createElement("canvas").getContext("2d");
function spaceLike(el, text) {
  el.style.letterSpacing = "";
  if (el instanceof SVGElement) return;
  const css = getComputedStyle(el);
  ruler.font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
  const plain = (css.textTransform === "uppercase" ? text.toUpperCase() : text).replace(/\s+/g, " ").trim();
  if (!plain) return;
  const extra = (ruler.measureText(plain).width - ruler.measureText(bits(plain)).width) / plain.length;
  const base = css.letterSpacing === "normal" ? 0 : parseFloat(css.letterSpacing) || 0;
  el.style.letterSpacing = `${(base + extra).toFixed(3)}px`;
}
function encode(el) {
  if ("encoded" in el.dataset) return;
  const run = runOf(el);
  spaceLike(el, run.map(node => node.data).join(" "));
  for (const node of run) node.data = bits(node.data);
  el.dataset.encoded = "";
}
function decode(el) {
  el.style.letterSpacing = "";
  if (translated(el)) write(el, english.get(el));
  else for (const node of ownText(el)) node.data = original.get(node);
  delete el.dataset.encoded;
}
// Point at (or focus) a block to read it, with everything inside it; it goes back to bits a moment after
// you leave, unless the block around it is still being read.
const reading = el => el.matches(":hover, :focus-within");
for (const el of units) {
  let timer;
  const group = [el, ...inside.get(el)];
  const open = () => {
    clearTimeout(timer);
    if (current !== "bin") return;
    const shut = group.filter(unit => "encoded" in unit.dataset);
    if (!shut.length) return;
    const before = measure(shut);
    shut.forEach(decode);
    resolve(shut, false, before);
  };
  const close = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (current !== "bin" || reading(el) || around.get(el).some(reading)) return;
      const read = group.filter(unit => !("encoded" in unit.dataset) && !reading(unit));
      if (!read.length) return;
      const before = measure(read);
      read.forEach(encode);
      resolve(read, true, before);
    }, 700);
  };
  el.addEventListener("pointerenter", open);
  el.addEventListener("pointerleave", close);
  el.addEventListener("focusin", open);
  el.addEventListener("focusout", close);
}

/* ───────── Text resolving out of noise ───────── */

// Every character starts as noise and settles, left to right, each run of text with its own small lag.
// The noise is half-width katakana, digits and marks, about as wide as the letters it stands in for.
const NOISE = "01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾅﾆﾇﾈﾊﾋﾌﾍﾎﾏﾐ#%&*+=<>/";
const running = new WeakMap();
function resolve(els, bitsOnly, before) {
  if (motion.matches) return;
  const run = {}, start = performance.now(), length = 650;
  if (before) for (const el of els) if (before.has(el)) hold(el, before.get(el), length + 80);
  const glyph = () => bitsOnly ? (Math.random() < .5 ? "0" : "1") : NOISE[Math.floor(Math.random() * NOISE.length)];
  const jobs = els.flatMap(runOf).filter(node => node.data.trim()).map(node => {
    running.set(node, run);
    return { node, final: node.data, lag: Math.random() * .3 };
  });
  (function frame(now) {
    const p = Math.min(1, (now - start) / length);
    for (const { node, final, lag } of jobs) {
      if (running.get(node) !== run) continue;
      const shown = Math.floor(Math.max(0, (p - lag) / (1 - lag)) * final.length);
      node.data = p >= 1 ? final : final.slice(0, shown) + final.slice(shown).replace(/\S/g, glyph);
    }
    if (p < 1) requestAnimationFrame(frame);
  })(start);
}

// Hold a block's box while its text changes, so the page around it does not jump: it starts at its old
// size, eases to the new one, clips the noise in between, and lets go once the text has settled. Inline
// runs are left alone; inline boxes (buttons, links in the nav) hold their width too.
const measure = els => new Map(els.map(el => [el, el.getBoundingClientRect()]));
const holding = new WeakMap();
function hold(el, before, duration) {
  if (el instanceof SVGElement) return;
  const display = getComputedStyle(el).display;
  if (display === "inline" || display === "contents" || display === "none") return;
  const s = el.style, sideways = display.startsWith("inline");
  clearTimeout(holding.get(el));
  s.transition = s.height = s.width = "";
  const after = el.getBoundingClientRect();
  s.boxSizing = "border-box"; s.overflow = "clip";
  s.height = `${before.height}px`;
  if (sideways) s.width = `${before.width}px`;
  el.getBoundingClientRect();
  s.transition = "height .3s ease, width .3s ease";
  s.height = `${after.height}px`;
  if (sideways) s.width = `${after.width}px`;
  holding.set(el, setTimeout(() => { s.transition = s.height = s.width = s.overflow = s.boxSizing = ""; }, duration));
}
const onScreen = el => {
  const box = el.getBoundingClientRect();
  return box.bottom > -100 && box.top < window.innerHeight + 100 && box.width > 0;
};

/* ───────── The keys ───────── */

for (const key of keys) {
  key.addEventListener("click", () => {
    const channel = key.dataset.channel;
    if (channel === current) return;
    try { localStorage.setItem("channel", channel); } catch (e) { /* storage unavailable */ }
    const url = new URL(location.href);
    if (url.searchParams.has("lang")) { url.searchParams.delete("lang"); history.replaceState(history.state, "", url); }
    staticBurst();
    osd(...CHANNELS[channel]);
    setTimeout(() => tune(channel, true), motion.matches ? 0 : 160);
  });
}

/* ───────── AV ───────── */

function switchAV() {
  const on = !crtOn();
  setCRT(on, !motion.matches);
  if (on) osd("AV", "CRT");
  else osd(...CHANNELS[current]);
}
const showAV = () => av?.setAttribute("aria-pressed", String(crtOn()));
av?.addEventListener("click", switchAV);
document.addEventListener("crtchange", showAV);
showAV();

/* ───────── CH 04: Spacewar! (AV, desktop only) ───────── */

function playSpacewar() {
  if (!crtOn() || !desktop.matches) return;
  osd("CH 04", "SPACEWAR!");
  import("./spacewar.js").then(module => module.openSpacewar()).catch(error => console.error(error));
}
gameKey?.addEventListener("click", playSpacewar);

/* ───────── The remote ───────── */

// 1, 2, 3 tune the channels, 0 switches AV; Backspace rewinds to the top when there is somewhere to go. Left
// alone while typing, with a modifier held (Ctrl/Cmd+1 switch browser tabs), while a dialog is open
// (the card collection and the observer have keys of their own) and on key repeat.
const typing = el => el instanceof Element && el.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])");
document.addEventListener("keydown", event => {
  if (event.defaultPrevented || event.repeat || event.isComposing) return;
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  if (typing(event.target) || document.querySelector("dialog[open]")) return;
  const key = keys[["1", "2", "3"].indexOf(event.key)];
  if (key) { event.preventDefault(); key.click(); }
  else if (event.key === "0" && av) { event.preventDefault(); switchAV(); }
  else if (event.key === "4" && crtOn() && desktop.matches) { event.preventDefault(); playSpacewar(); }
  else if (event.key === "Backspace" && window.scrollY > 4) { event.preventDefault(); rewind(true); }
});

// Open on the channel from the link, or the one chosen last time.
let saved = null;
try { saved = localStorage.getItem("channel"); } catch (e) { /* storage unavailable */ }
const first = [new URLSearchParams(location.search).get("lang"), saved].find(channel => channel in CHANNELS) || "en";
if (first !== "en") tune(first, false);
root.removeAttribute("data-channel-pending");
