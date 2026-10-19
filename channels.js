// Language channels, tuned like an old TV: 01 English, 02 Polish, 03 binary. English lives in the page;
// Polish comes from lang/pl.js by key: data-i18n names an element's content (as HTML), data-i18n-attr its
// attributes ("aria-label:key;title:key"). The binary channel writes each letter of the English text as one
// bit of its own character code, so every block keeps its shape; pointing at or focusing a block decodes
// it. Switching shows the channel on screen with a burst of static, and the visible text resolves out of
// noise. The choice is remembered; ?lang=pl (or en, bin) opens a channel from a link.

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
  for (const el of blocks) write(el, (pl && PL[el.dataset.i18n]) || english.get(el));
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
  if (animate) resolve(blocks.filter(onScreen), channel === "bin");
  document.dispatchEvent(new CustomEvent("channelchange", { detail: { channel } }));
}

/* ───────── Binary ───────── */

// Each letter or digit becomes one bit of its character code, taking the bits in turn along the text.
function bits(text) {
  let n = 0;
  return text.replace(/[\p{L}\p{N}]/gu, ch => (ch.codePointAt(0) >> (n++ % 7)) & 1 ? "1" : "0");
}
function encode(el) {
  for (const node of textNodes(el)) node.data = bits(node.data);
  el.dataset.encoded = "";
}
function decode(el) {
  write(el, english.get(el));
  delete el.dataset.encoded;
}
// Point at (or focus) a block to read it; it goes back to bits a moment after you leave.
for (const el of blocks) {
  let timer;
  const open = () => {
    clearTimeout(timer);
    if (current === "bin" && "encoded" in el.dataset) { decode(el); resolve([el], false); }
  };
  const close = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (current === "bin" && !("encoded" in el.dataset) && !el.matches(":hover, :focus-within")) { encode(el); resolve([el], true); }
    }, 700);
  };
  el.addEventListener("pointerenter", open);
  el.addEventListener("pointerleave", close);
  el.addEventListener("focusin", open);
  el.addEventListener("focusout", close);
}

/* ───────── Text resolving out of noise ───────── */

// Every character starts as noise and settles, left to right, each run of text with its own small lag.
const NOISE = "01アイウエオカキクケコサシスセソ#%&*+=<>/";
const running = new WeakMap();
function resolve(els, bitsOnly) {
  if (motion.matches) return;
  const run = {}, start = performance.now(), length = 650;
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
