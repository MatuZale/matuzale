// Language channels, tuned like an old TV: 01 English, 02 Polish, 03 binary. English lives in the page;
// Polish comes from lang/pl.js by key: data-i18n names an element's content (as HTML), data-i18n-attr its
// attributes ("aria-label:key;title:key"). The binary channel writes each letter of the English text as one
// bit of its own character code, so every block keeps its shape; pointing at or focusing a block decodes
// it. Switching shows the channel on screen with a burst of static, and the visible text resolves out of
// noise. Nothing around it should jump meanwhile: the bits are spaced to the width of the text they stand
// for, and a block that changes keeps its box, easing to the new size while its text settles.
// The choice is remembered; ?lang=pl (or en, bin) opens a channel from a link.

import { PL } from "./lang/pl.js";
import { osd, staticBurst } from "./retro.js";

const CHANNELS = { en: ["CH 01", "EN"], pl: ["CH 02", "PL"], bin: ["CH 03", "01 · BIN"] };
const root = document.documentElement;
const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
const description = document.querySelector('meta[name="description"]');
const keys = [...document.querySelectorAll("[data-channel]")];
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

function tune(channel, animate) {
  current = channel;
  const pl = channel === "pl";
  const visible = animate ? blocks.filter(onScreen) : [], before = measure(visible);
  for (const el of blocks) {
    el.style.letterSpacing = "";
    write(el, (pl && PL[el.dataset.i18n]) || english.get(el));
  }
  for (const el of labelled) {
    const original = englishAttrs.get(el);
    pairs(el).forEach(([name, key], i) => el.setAttribute(name, (pl && PL[key]) || original[i]));
  }
  root.lang = pl ? "pl" : "en";
  document.title = pl ? PL["meta.title"] : englishMeta.title;
  if (description) description.content = pl ? PL["meta.description"] : englishMeta.description;
  root.classList.toggle("is-binary", channel === "bin");
  if (channel === "bin") blocks.forEach(encode);
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
  spaceLike(el, el.textContent);
  for (const node of textNodes(el)) node.data = bits(node.data);
  el.dataset.encoded = "";
}
function decode(el) {
  el.style.letterSpacing = "";
  write(el, english.get(el));
  delete el.dataset.encoded;
}
// Point at (or focus) a block to read it; it goes back to bits a moment after you leave.
for (const el of blocks) {
  let timer;
  const open = () => {
    clearTimeout(timer);
    if (current === "bin" && "encoded" in el.dataset) { const before = measure([el]); decode(el); resolve([el], false, before); }
  };
  const close = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (current === "bin" && !("encoded" in el.dataset) && !el.matches(":hover, :focus-within")) {
        const before = measure([el]); encode(el); resolve([el], true, before);
      }
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
  const jobs = els.flatMap(textNodes).filter(node => node.data.trim()).map(node => {
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

// Open on the channel from the link, or the one chosen last time.
let saved = null;
try { saved = localStorage.getItem("channel"); } catch (e) { /* storage unavailable */ }
const first = [new URLSearchParams(location.search).get("lang"), saved].find(channel => channel in CHANNELS) || "en";
if (first !== "en") tune(first, false);
root.removeAttribute("data-channel-pending");
