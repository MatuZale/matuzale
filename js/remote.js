// "Currently learning" is not screwed down very well. Knock on it and it comes loose: the first knock jolts
// it crooked and a screw pops out, the second shakes it looser still, and at the third it swings down from
// its last screw, hangs there a moment and drops off the page. Under it is the site's service remote, a
// cheat sheet for its rare moments: a key winds the page there like a VCR searching a tape (FF or REW on
// screen with the tape counter running, bands of snow rolling over the picture) and, a second after the
// tape plays again, sets the moment off: night over About, the Journey's heavy visitor or its culmination,
// a footer game of your choice or its crash, and on a computer CH 04, Spacewar! (on AV). The card stays off
// until the page is loaded again. Loaded by script.js at the first knock; never with reduced motion, as
// none of these moments moves then. The remote's keys stay readable on the binary channel, like the
// channel keys.

import { osd, osdSub, staticBurst, counter } from "./retro.js";

const G = 3000, DRAG = 2;          // gravity in px/s², and the drag of the last screw on the swing in 1/s
const HANG = 1900, LOOK = 1000;    // ms on the last screw; ms between PLAY and the moment
const INSET = 16;                  // px from the card's corners to its screws
// The screws in the order they give: bottom right, top right, bottom left, and last the top left one.
const SCREWS = [[1, 1], [1, 0], [0, 1], [0, 0]];
const TILT = [.9, 2.4];            // degrees, after the first and the second knock

const root = document.documentElement;
const say = (en, pl) => root.lang === "pl" ? pl : en;
const wait = ms => new Promise(done => setTimeout(done, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const el = (tag, className, text = "") => Object.assign(document.createElement(tag), { className, textContent: text });

function loadStyles() {
  const href = new URL("../css/remote.css", import.meta.url).href;
  if (document.querySelector(`link[href="${href}"]`)) return Promise.resolve();
  return new Promise(resolve => {
    const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href });
    link.onload = link.onerror = () => resolve();
    document.head.append(link);
  });
}

/* ───────── Loose things ───────── */

// Screws and the card fly in a layer over the page. They move in page coordinates, so they scroll with it,
// and the layer clips them, so the page never grows.
let air = null, flying = [], last = 0, raf = 0;
function launch(node, move) {
  if (!air) {
    air = document.body.appendChild(el("div", "loose-air"));
    air.setAttribute("aria-hidden", "true");
  }
  move(0);
  air.append(node);
  flying.push({ node, move });
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(fly); }
}
// One frame for everything in the air; something launched meanwhile (the card's last screw) joins in.
function fly(now) {
  const dt = Math.min(.05, (now - last) / 1000), moving = flying;
  last = now;
  flying = [];
  for (const bit of moving) if (bit.move(dt)) flying.push(bit); else bit.node.remove();
  raf = flying.length ? requestAnimationFrame(fly) : 0;
}

// A screw pops out of its corner towards the viewer, spinning, and drops.
function screw(x, y) {
  const node = el("i", "loose-screw");
  let vx = rand(-160, 160), vy = rand(-460, -280), turn = 0, spin = rand(-900, 900), age = 0;
  launch(node, dt => {
    age += dt; vy += G * dt; x += vx * dt; y += vy * dt; turn += spin * dt;
    node.style.transform = `translate(${x - scrollX}px, ${y - scrollY}px) rotate(${turn}deg) scale(${1 + Math.min(1, age * 1.5) * .7})`;
    return y - scrollY < innerHeight + 40;
  });
}

/* ───────── The card ───────── */

export function startRemote(card) {
  const styled = loadStyles();
  const tone = getComputedStyle(card).getPropertyValue("--tool-tone");
  const place = [...card.parentElement.children].filter(other => other.matches(".skill")).indexOf(card);
  let knocks = 0, jolt = null;
  card.style.transformOrigin = "0 0";
  card.style.transition = "box-shadow .3s";

  // Where the card is on the page as if it were straight, and how it is tilted now, about its top left.
  function pose() {
    if (jolt) { jolt.commitStyles(); jolt.cancel(); jolt = null; }
    const tilt = new DOMMatrix(getComputedStyle(card).transform), held = card.style.transform;
    card.style.transform = "none";
    const box = card.getBoundingClientRect();
    card.style.transform = held;
    return { x: box.left + scrollX, y: box.top + scrollY, w: box.width, h: box.height, tilt };
  }
  function popScrew(i, { x, y, w, h, tilt }) {
    const [right, bottom] = SCREWS[i];
    const at = tilt.transformPoint(new DOMPoint(right ? w - INSET : INSET, bottom ? h - INSET : INSET));
    screw(x + at.x, y + at.y);
  }

  // A knock: the card jumps, wobbles and settles a little more crooked; at the second, the stylesheet
  // under the tear flickers, as if something behind it had come loose too.
  function shake({ tilt }, to) {
    const from = tilt.toString();
    jolt = card.animate([
      { transform: from },
      { transform: `translate(1px, -3px) rotate(${to - 1.2}deg)`, offset: .12 },
      { transform: `translate(-1px, 1px) rotate(${to + 1.5}deg)`, offset: .3 },
      { transform: `rotate(${to - .6}deg)`, offset: .52 },
      { transform: `rotate(${to + .3}deg)`, offset: .74 },
      { transform: `rotate(${to}deg)` },
    ], { duration: 640, easing: "ease-out", fill: "forwards" });
    if (to > TILT[0]) card.querySelector(".code-tear")?.animate([
      { transform: "none", filter: "none" },
      { transform: "translateX(4px)", filter: "hue-rotate(90deg) saturate(2.5)" },
      { transform: "translateX(-3px)", filter: "invert(.2) hue-rotate(-60deg)" },
      { transform: "translateX(2px)", filter: "none" },
      { transform: "none", filter: "none" },
    ], { duration: 420, easing: "steps(5, end)" });
  }

  // A copy of the card falls; the card itself stays behind as the remote's bay, so nothing on the page
  // moves. Away from the toolbox the copy keeps its colour, its number and, renamed, its SVG's clip,
  // grid and rim.
  function copy(w, h) {
    const loose = card.cloneNode(true);
    loose.removeAttribute("data-spot");
    loose.querySelectorAll("[id]").forEach(node => { node.id += "-loose"; });
    loose.querySelectorAll("*").forEach(node => {
      for (const attr of node.attributes) if (attr.value.includes("url(#")) attr.value = attr.value.replace(/url\(#([\w-]+)\)/g, "url(#$1-loose)");
    });
    Object.assign(loose.style, { width: `${w}px`, height: `${h}px`, counterReset: `toolbox ${place}` });
    loose.style.setProperty("--tool-tone", tone);
    return loose;
  }

  // The last screw holds the top left corner: the card swings on it like a pendulum (a rigid plate about
  // a corner, I = (w² + h²)/3), then lets go, keeping its spin, and falls past the bottom of the screen,
  // a little towards the viewer.
  function swing(loose, { x, y, w, h, tilt }) {
    const inertia = (w * w + h * h) / 3, px = x + tilt.e, py = y + tilt.f, reach = Math.hypot(w, h) / 2;
    let angle = Math.atan2(tilt.b, tilt.a), spin = 1.2, age = 0, free = false, cx, cy, vx, vy, grow = 1;
    const centre = () => [w / 2 * Math.cos(angle) - h / 2 * Math.sin(angle), w / 2 * Math.sin(angle) + h / 2 * Math.cos(angle)];
    launch(loose, dt => {
      age += dt;
      if (!free) {
        for (let i = 0; i < 4; i++) {
          spin += (G * centre()[0] / inertia - DRAG * spin) * dt / 4;
          angle += spin * dt / 4;
        }
        [cx, cy] = centre();
        cx += px; cy += py;
        if (age * 1000 > HANG) {
          free = true;
          screw(px + INSET * (Math.cos(angle) - Math.sin(angle)), py + INSET * (Math.sin(angle) + Math.cos(angle)));
          vx = -spin * (cy - py); vy = spin * (cx - px);
        }
      } else {
        vy += G * dt; cx += vx * dt; cy += vy * dt; angle += spin * dt;
        grow = Math.min(1.14, grow + dt * .12);
      }
      loose.style.transform = `translate(${cx - scrollX}px, ${cy - scrollY}px) rotate(${angle}rad) scale(${grow}) translate(${-w / 2}px, ${-h / 2}px)`;
      return cy - scrollY - reach * grow < innerHeight;
    });
  }

  async function fall() {
    await styled;
    const now = pose(), loose = copy(now.w, now.h);
    card.style.minHeight = `${now.h}px`;
    card.style.transform = "";
    card.classList.add("is-open");
    card.append(buildRemote());
    popScrew(2, now);
    swing(loose, now);
  }

  function knock() {
    if (knocks >= 3) return;
    const now = pose();
    if (knocks < 2) popScrew(knocks, now);
    if (++knocks < 3) shake(now, TILT[knocks - 1]);
    else fall().catch(error => console.error(error));
  }
  return { knock };
}

/* ───────── The tape ───────── */

// The picture search: winding, a VCR still shows the picture, racing, with bands of snow where the heads
// cross between tracks. Here they roll over the screen, torn a little sideways every frame.
function search(forward) {
  const screen = el("div", "tape-search");
  screen.setAttribute("aria-hidden", "true");
  const W = 320, H = 16;
  const bands = [0, 1, 2].map(i => {
    const band = el("i", "tape-search__band"), canvas = Object.assign(document.createElement("canvas"), { width: W, height: H });
    band.append(canvas);
    const ctx = canvas.getContext("2d");
    return { band, ctx, image: ctx.createImageData(W, H), phase: i / 3 + rand(-.08, .08) };
  });
  screen.append(...bands.map(({ band }) => band));
  document.body.append(screen);
  const start = performance.now();
  let raf = requestAnimationFrame(function frame(now) {
    const t = (now - start) / 1000;
    for (const { band, ctx, image, phase } of bands) {
      const y = (((forward ? -t : t) * .45 + phase) % 1 + 1) % 1;
      band.style.transform = `translate(${rand(-8, 8).toFixed(1)}px, ${((y * 1.25 - .12) * innerHeight).toFixed(1)}px)`;
      // Snow smeared along the lines, each line at a level of its own, with now and then a white dropout.
      const px = image.data;
      for (let row = 0; row < H; row++) {
        const level = Math.random() * 110;
        let v = level;
        for (let col = 0; col < W; col++) {
          v = Math.random() < .015 ? 255 : v * .6 + (level + Math.random() * 145) * .4;
          const i = (row * W + col) * 4;
          px[i] = px[i + 1] = px[i + 2] = v;
          px[i + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
    }
    raf = requestAnimationFrame(frame);
  });
  return () => { cancelAnimationFrame(raf); screen.remove(); };
}

// Winding: the motor takes up, races and brakes; a long way takes longer, up to 2.6 s. A wheel, touch or
// key of the visitor's stops the tape where it is. Resolves true when the tape got there.
let tape = null;
function wind(to) {
  tape?.(false);
  to = Math.max(0, Math.min(to, root.scrollHeight - innerHeight));
  const from = scrollY, way = to - from;
  if (Math.abs(way) < 80) return Promise.resolve(true);
  return new Promise(done => {
    const start = performance.now(), length = Math.min(2600, 700 + Math.abs(way) * .28), unsearch = search(way > 0);
    const STOPPERS = ["wheel", "touchstart", "keydown"];
    let raf = 0;
    const stop = arrived => {
      cancelAnimationFrame(raf);
      STOPPERS.forEach(type => removeEventListener(type, interrupt));
      unsearch();
      tape = null;
      if (!arrived) osd("■ STOP", counter(), 900);
      done(arrived);
    };
    const interrupt = () => stop(false);
    STOPPERS.forEach(type => addEventListener(type, interrupt, { passive: true }));
    tape = stop;
    staticBurst(260);
    osd(way > 0 ? "▶▶ FF" : "◀◀ REW", counter(), Infinity);
    raf = requestAnimationFrame(function frame(now) {
      const p = Math.min(1, (now - start) / length), eased = p < .5 ? 4 * p ** 3 : 1 - (2 - 2 * p) ** 3 / 2;
      scrollTo({ top: from + way * eased, behavior: "instant" });
      osdSub(counter());
      if (p < 1) raf = requestAnimationFrame(frame);
      else stop(true);
    });
  });
}

/* ───────── What the keys play ───────── */

const horizon = document.querySelector(".horizon");
const spacetime = document.querySelector(".spacetime");
const board = document.getElementById("footer-game");

// Where the tape stops: the horizon a little below the middle of the screen, the hole where it sits, the
// footer at the very end.
const about = () => horizon.querySelector(".horizon__sky").getBoundingClientRect().bottom + scrollY - innerHeight * .64;
function journey() {
  const box = spacetime.getBoundingClientRect(), wide = box.width >= 800;
  return box.top + scrollY + (wide ? box.height * .5 : box.height - 80) - innerHeight * (wide ? .5 : .62);
}
const footer = () => root.scrollHeight;

// The moments load when their section comes near, so one may need a moment after the tape stops.
function ready(get, patience = 5000) {
  const start = performance.now();
  return new Promise(done => (function check() {
    const found = get();
    if (found || performance.now() - start > patience) done(found);
    else setTimeout(check, 100);
  })());
}
async function call(get, ...args) {
  const action = await ready(get);
  if (!action) return false;
  action(...args);
  return true;
}
async function footerGame(act) {
  if (!(await ready(() => board?.play))) return false;
  return !board.closest("figure").classList.contains("is-crashed") && act() !== false;
}

const CUES = {
  night: { at: about, osd: ["ABOUT · NIGHT", "O MNIE · NOC"], play: () => call(() => horizon?.nightfall) },
  heavy: { at: journey, osd: ["JOURNEY · VISITOR", "ŚCIEŻKA · GOŚĆ"], play: () => call(() => spacetime?.summon, "heavy") },
  luminet: { at: journey, osd: ["JOURNEY · LUMINET 1979", "ŚCIEŻKA · LUMINET 1979"], play: () => call(() => spacetime?.summon, "luminet") },
  snake: { at: footer, osd: ["FOOTER · SNAKE", "STOPKA · SNAKE"], play: () => footerGame(() => board.play("snake")) },
  tetris: { at: footer, osd: ["FOOTER · TETRIS", "STOPKA · TETRIS"], play: () => footerGame(() => board.play("tetris")) },
  pacman: { at: footer, osd: ["FOOTER · PAC-MAN", "STOPKA · PAC-MAN"], play: () => footerGame(() => board.play("pacman")) },
  crash: { at: footer, osd: ["FOOTER · CRASH", "STOPKA · AWARIA"], play: () => footerGame(() => board.crash()) },
};

// CH 04 is on the AV input: AV goes on first if need be, and the tube warms up before the channel changes.
async function spacewar() {
  const av = document.querySelector("[data-av]"), game = document.querySelector("[data-game]");
  if (!av || !game) return false;
  if (!root.classList.contains("is-crt")) { av.click(); await wait(1100); }
  game.click();
  return true;
}

/* ───────── The remote ───────── */

// Keys in groups printed on the case, each group with a teletext colour. Culmination only shows on wide
// screens and CH 04 only on a computer (remote.css), as their moments only come there.
const PAD = [
  { group: "about", name: ["about", "o mnie"], keys: [
    { cue: "night", label: ["night", "noc"], title: ["Wind to About and let night fall", "Przewiń do „O mnie” i sprowadź noc"] },
  ] },
  { group: "journey", name: ["journey", "ścieżka"], keys: [
    { cue: "heavy", label: ["visitor", "gość"], title: ["Wind to Journey and send in the heavy visitor", "Przewiń do „Ścieżki” i wpuść ciężkiego gościa"] },
    { cue: "luminet", label: ["culmination", "kulminacja"], title: ["Wind to Journey for the culmination: Luminet's 1979 black hole, from the particles", "Przewiń do „Ścieżki” na kulminację: czarna dziura Luminet'a z 1979, z cząstek"] },
  ] },
  { group: "spacewar", name: ["ch 04", "ch 04"], keys: [
    { cue: "spacewar", label: ["spacewar!", "spacewar!"], title: ["Play Spacewar! on CH 04 (switches AV on)", "Zagraj w Spacewar! na CH 04 (włącza AV)"] },
  ] },
  { group: "footer", name: ["footer", "stopka"], keys: [
    { cue: "snake", label: ["snake", "snake"], title: ["Wind to the footer and play Snake", "Przewiń do stopki i włącz Snake'a"] },
    { cue: "tetris", label: ["tetris", "tetris"], title: ["Wind to the footer and play Tetris", "Przewiń do stopki i włącz Tetrisa"] },
    { cue: "pacman", label: ["pac-man", "pac-man"], title: ["Wind to the footer and play Pac-Man", "Przewiń do stopki i włącz Pac-Mana"] },
    { cue: "crash", label: ["crash", "awaria"], title: ["Wind to the footer and crash its game, for good", "Przewiń do stopki i zawieś grę, na dobre"] },
  ] },
];

function buildRemote() {
  const remote = el("div", "remote"), head = el("div", "remote__head"), pad = el("div", "remote__pad");
  const brand = el("span", "remote__brand"), hint = el("span", "remote__hint"), ir = el("span", "remote__ir", "IR");
  remote.setAttribute("role", "group");
  ir.setAttribute("aria-hidden", "true");
  head.append(brand, hint, ir);
  const printed = [], keys = [];
  for (const { group, name, keys: row } of PAD) {
    const box = el("div", `remote__group remote__group--${group}`), label = el("span", "remote__label"), line = el("div", "remote__keys");
    printed.push([label, name]);
    for (const { cue, label: words, title } of row) {
      const key = el("button", "remote__key");
      Object.assign(key, { type: "button" });
      key.dataset.cue = cue;
      printed.push([key, words]);
      keys.push([key, title]);
      line.append(key);
    }
    box.append(label, line);
    pad.append(box);
  }
  remote.append(head, pad);

  function relabel() {
    remote.setAttribute("aria-label", say("Service remote", "Pilot serwisowy"));
    brand.textContent = say("TM · service", "TM · serwis");
    hint.textContent = say("press a key: the tape winds there", "wciśnij klawisz: taśma przewinie się tam");
    for (const [node, words] of printed) node.textContent = say(...words);
    for (const [key, title] of keys) key.title = say(...title);
  }
  relabel();
  document.addEventListener("channelchange", relabel);

  // The little IR LED flickers with every press; the key stays lit until its moment has come.
  let playing = null;
  const send = () => { ir.classList.remove("is-sending"); void ir.offsetWidth; ir.classList.add("is-sending"); };
  const light = key => keys.forEach(([other]) => other.classList.toggle("is-lit", other === key));
  async function press(key) {
    send();
    light(key);
    const run = playing = {}, cue = CUES[key.dataset.cue];
    let played = true;
    if (!cue) played = await spacewar();
    else if (await wind(cue.at())) {
      if (playing !== run) return;
      staticBurst(200);
      osd("▶ PLAY", say(...cue.osd), 2400);
      await wait(LOOK);
      if (playing !== run) return;
      played = await cue.play();
      if (!played) osd("NO SIGNAL", cue.at === footer ? "core dumped" : "", 2200);
    }
    if (playing === run) { playing = null; light(null); }
  }
  pad.addEventListener("click", event => {
    const key = event.target.closest("[data-cue]");
    if (key) press(key);
  });
  return remote;
}
