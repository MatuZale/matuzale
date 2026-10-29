// The retro layer: an on-screen display like an old TV set's, a burst of static between channels, a CRT
// switching off and on for the theme, and a VCR rewinding to the top of the page. All of it is decoration
// laid over the page (aria-hidden); with reduced motion the static and the power animation are skipped.
// channels.js also rewinds from the keyboard (Backspace) and switches AV: the whole page on a worn CRT.
// Loaded by channels.js; script.js's theme toggle calls window.crtPower when it is there.

const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

function layer(className) {
  const el = document.createElement("div");
  el.className = className;
  el.setAttribute("aria-hidden", "true");
  document.body.append(el);
  return el;
}
// An open modal (the Spacewar! console) sits in the top layer, over everything else on the page, so the
// display and the static move into it while it is open, and back to the page when it closes.
const lift = el => {
  const host = document.querySelector("dialog:modal") ?? document.body;
  if (el.parentNode === host) return;
  host.append(el);
  if (host !== document.body) host.addEventListener("close", () => el.parentNode === host && document.body.append(el), { once: true });
};

/* ───────── On-screen display ───────── */

// Top left, as a TV shows its channel or a VCR its mode. `hold` is in milliseconds; Infinity keeps it up.
let display, displayTimer;
export function osd(main, sub = "", hold = 1600) {
  if (!display) {
    display = layer("osd");
    display.append(Object.assign(document.createElement("span"), { className: "osd__main" }),
      Object.assign(document.createElement("span"), { className: "osd__sub" }));
  }
  lift(display);
  display.firstChild.textContent = main;
  display.lastChild.textContent = sub;
  display.classList.add("is-on");
  clearTimeout(displayTimer);
  if (hold !== Infinity) displayTimer = setTimeout(() => display.classList.remove("is-on"), hold);
}
export const osdSub = text => { if (display) display.lastChild.textContent = text; };

/* ───────── Static between channels ───────── */

// Coarse snow and a tracking band rolling down, for a fraction of a second. A new burst takes over from
// one still running.
let snow, burst;
export function staticBurst(duration = 420) {
  if (motion.matches) return;
  if (!snow) {
    snow = layer("vhs");
    const canvas = Object.assign(document.createElement("canvas"), { width: 160, height: 90 });
    snow.append(canvas, Object.assign(document.createElement("span"), { className: "vhs__band" }));
  }
  lift(snow);
  const ctx = snow.firstChild.getContext("2d"), image = ctx.createImageData(160, 90), px = image.data;
  const start = performance.now(), run = burst = {};
  snow.classList.add("is-on");
  (function frame(now) {
    if (burst !== run) return;
    for (let i = 0; i < px.length; i += 4) { px[i] = px[i + 1] = px[i + 2] = Math.random() * 255; px[i + 3] = 255; }
    ctx.putImageData(image, 0, 0);
    if (now - start < duration) requestAnimationFrame(frame);
    else snow.classList.remove("is-on");
  })(start);
}

/* ───────── The theme switch as a CRT ───────── */

// Switching off folds the picture into a bright line and the line into a dot; switching on draws the line
// out and opens the picture again. `swap` changes the theme while the screen is shut.
let crt, powerRun = 0, swapTimer = 0, fadeTimer = 0, pendingSwap = null;
export function power(on, swap) {
  const run = ++powerRun;
  clearTimeout(swapTimer);
  clearTimeout(fadeTimer);
  if (crt) {
    // Include the shutter children and the overlay itself when replacing an in-flight switch.
    crt.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
    crt.classList.remove("is-on");
  }
  pendingSwap = null;
  if (motion.matches) { swap(); return; }
  pendingSwap = swap;
  crt ??= layer("crt");
  crt.innerHTML = '<i class="crt__shutter crt__shutter--top"></i><i class="crt__shutter crt__shutter--bottom"></i><i class="crt__line"></i>';
  const [top, bottom, line] = crt.children;
  const timing = (duration, delay = 0) => ({ duration, delay, easing: "cubic-bezier(.6, 0, .4, 1)", fill: "both" });
  crt.classList.add("is-on");
  let total;
  if (!on) {
    const shut = [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }];
    top.animate(shut, timing(250)); bottom.animate(shut, timing(250));
    line.animate([
      { opacity: 0, transform: "scaleX(1)" }, { opacity: 1, transform: "scaleX(1)", offset: .25 },
      { opacity: 1, transform: "scaleX(.004)", offset: .8 }, { opacity: 0, transform: "scaleX(0)" },
    ], timing(420, 170));
    total = 650;
  } else {
    const open = [{ transform: "scaleY(1)" }, { transform: "scaleY(1)", offset: .45 }, { transform: "scaleY(0)" }];
    top.animate(open, timing(720)); bottom.animate(open, timing(720));
    line.animate([
      { opacity: 1, transform: "scaleX(0)" }, { opacity: 1, transform: "scaleX(1)", offset: .4 },
      { opacity: 1, transform: "scaleX(1) scaleY(6)", offset: .55 }, { opacity: 0, transform: "scaleX(1) scaleY(40)" },
    ], timing(720));
    total = 740;
  }
  // Both directions swap just before the screen opens, as the cassette reaches its edge.
  swapTimer = setTimeout(() => { if (run === powerRun) { pendingSwap = null; swap(); } }, 300);
  fadeTimer = setTimeout(() => {
    if (run !== powerRun) return;
    const fade = crt.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160 });
    fade.onfinish = () => { if (run === powerRun) crt.classList.remove("is-on"); };
  }, total);
}
// If the OS requests reduced motion mid-transition, finish immediately instead of leaving a shutter.
motion.addEventListener("change", () => {
  if (!motion.matches || !crt?.classList.contains("is-on")) return;
  ++powerRun;
  clearTimeout(swapTimer);
  clearTimeout(fadeTimer);
  crt.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
  crt.classList.remove("is-on");
  const swap = pendingSwap;
  pendingSwap = null;
  if (swap) swap();
});
window.crtPower = power;

/* ───────── AV: the whole page on a worn CRT ───────── */

// A sheet of glass over the page: scanlines, an RGB phosphor mask, flicker, grain, a slow refresh band,
// a dark rim and rounded corners; the text gets a slight colour fringe in the site's accents (retro.css).
// It stays on until switched off, and is remembered.
let glass;
export const crtOn = () => document.documentElement.classList.contains("is-crt");
export function setCRT(on, animate = true) {
  const apply = () => {
    if (on && !glass) {
      glass = layer("crt-screen");
      glass.append(...["crt-screen__grain", "crt-screen__roll"].map(className => Object.assign(document.createElement("i"), { className })));
      // Grain from a small tile of noise, shifted a few times a second.
      const tile = Object.assign(document.createElement("canvas"), { width: 128, height: 128 }), ctx = tile.getContext("2d");
      const image = ctx.createImageData(128, 128);
      for (let i = 0; i < image.data.length; i += 4) {
        image.data[i] = image.data[i + 1] = image.data[i + 2] = Math.random() * 255;
        image.data[i + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
      glass.style.setProperty("--grain", `url(${tile.toDataURL()})`);
    }
    document.documentElement.classList.toggle("is-crt", on);
    try { localStorage.setItem("crt", on ? "1" : "0"); } catch (e) { /* storage unavailable */ }
    document.dispatchEvent(new CustomEvent("crtchange", { detail: { on } }));
  };
  if (animate) power(on, apply);
  else apply();
}
try { if (localStorage.getItem("crt") === "1") setCRT(true, false); } catch (e) { /* storage unavailable */ }

/* ───────── Back to top as a VCR rewind ───────── */

// The tape counter follows the page: a few hundred pixels of scrolling make a second of tape.
export const counter = () => {
  const s = Math.round(window.scrollY / 40);
  return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
// Native links keep their normal scrolling and history; the tape display follows it.
let cancelTape, playTimer, transport;
function tapePicture(on, direction = "forward") {
  if (!on || motion.matches) { transport?.classList.remove("is-on"); return; }
  if (!transport) {
    transport = layer("tape-transport");
    transport.append(...["tape-transport__band", "tape-transport__band tape-transport__band--second", "tape-transport__band tape-transport__band--major"].map(className =>
      Object.assign(document.createElement("i"), { className })));
  }
  lift(transport);
  transport.dataset.direction = direction;
  transport.classList.add("is-on");
}
motion.addEventListener("change", () => { if (motion.matches) tapePicture(false); });
function tape(direction, atEnd = () => false) {
  cancelTape?.();
  clearTimeout(playTimer);
  osd(direction === "back" ? "◀◀ REW" : "FF ▶▶", counter(), Infinity);
  tapePicture(true, direction);
  let quiet, stopped = false;
  const cleanup = () => { window.removeEventListener("scroll", follow); clearTimeout(quiet); tapePicture(false); };
  cancelTape = cleanup;
  const follow = () => {
    osdSub(counter());
    clearTimeout(quiet);
    if (atEnd()) return stop();
    quiet = setTimeout(stop, 600);
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cleanup();
    cancelTape = null;
    osd("■ STOP", counter(), 900);
    playTimer = setTimeout(() => osd("▶ PLAY", "", 1100), 900);
  };
  window.addEventListener("scroll", follow, { passive: true });
  quiet = setTimeout(stop, 1500);
}
// The back-to-top link scrolls by itself; the remote's Backspace asks for the scroll too.
export function rewind(scroll = false) {
  tape("back", () => window.scrollY < 4);
  if (scroll) window.scrollTo({ top: 0, behavior: motion.matches ? "auto" : "smooth" });
}
document.getElementById("back-top")?.addEventListener("click", () => rewind());

document.getElementById("nav-links")?.addEventListener("click", event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = event.target.closest('a[href^="#"]');
  const target = anchor && document.getElementById(anchor.hash.slice(1));
  if (!target) return;
  const distance = target.getBoundingClientRect().top - document.getElementById("nav").offsetHeight;
  if (Math.abs(distance) > 4) tape(distance < 0 ? "back" : "forward");
});
