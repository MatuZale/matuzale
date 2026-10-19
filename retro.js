// The retro layer: an on-screen display like an old TV set's, a burst of static between channels, a CRT
// switching off and on for the theme, and a VCR rewinding to the top of the page. All of it is decoration
// laid over the page (aria-hidden); with reduced motion the static and the power animation are skipped.
// channels.js also rewinds from the keyboard (Backspace). Very rarely the tape shows its wear.
// Loaded by channels.js; script.js's theme toggle calls window.crtPower when it is there.

const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

function layer(className) {
  const el = document.createElement("div");
  el.className = className;
  el.setAttribute("aria-hidden", "true");
  document.body.append(el);
  return el;
}

/* ───────── On-screen display ───────── */

// Top left, as a TV shows its channel or a VCR its mode. `hold` is in milliseconds; Infinity keeps it up.
let display, displayTimer;
export function osd(main, sub = "", hold = 1600) {
  if (!display) {
    display = layer("osd");
    display.append(Object.assign(document.createElement("span"), { className: "osd__main" }),
      Object.assign(document.createElement("span"), { className: "osd__sub" }));
  }
  display.firstChild.textContent = main;
  display.lastChild.textContent = sub;
  display.classList.add("is-on");
  clearTimeout(displayTimer);
  if (hold !== Infinity) displayTimer = setTimeout(() => display.classList.remove("is-on"), hold);
}
export const osdSub = text => { if (display) display.lastChild.textContent = text; };

/* ───────── Static between channels ───────── */

// Coarse snow and a tracking band rolling down, for a fraction of a second.
let snow;
export function staticBurst(duration = 420) {
  if (motion.matches) return;
  if (!snow) {
    snow = layer("vhs");
    const canvas = Object.assign(document.createElement("canvas"), { width: 160, height: 90 });
    snow.append(canvas, Object.assign(document.createElement("span"), { className: "vhs__band" }));
  }
  const ctx = snow.firstChild.getContext("2d"), image = ctx.createImageData(160, 90), px = image.data;
  const start = performance.now();
  snow.classList.add("is-on");
  (function frame(now) {
    for (let i = 0; i < px.length; i += 4) { px[i] = px[i + 1] = px[i + 2] = Math.random() * 255; px[i + 3] = 255; }
    ctx.putImageData(image, 0, 0);
    if (now - start < duration) requestAnimationFrame(frame);
    else snow.classList.remove("is-on");
  })(start);
}

/* ───────── Worn tape ───────── */

// Minutes apart, the picture shows its tape for about a second: a faint tracking band rolls down the screen
// and a few dropout streaks flick across it. Faint and rare on purpose, and never with reduced motion,
// in a hidden tab or while a dialog is open.
const between = (a, b) => a + Math.random() * (b - a);
let tape;
export function tapeWear() {
  if (motion.matches) return;
  tape ??= layer("tape");
  const from = between(-5, 45);
  const streaks = Array.from({ length: 3 + Math.floor(Math.random() * 4) }, () =>
    `<i class="tape__dropout" style="top: ${between(4, 96).toFixed(1)}%; left: ${between(0, 85).toFixed(1)}%; width: ${between(3, 16).toFixed(1)}%; animation-delay: ${between(.05, .8).toFixed(2)}s"></i>`);
  tape.innerHTML = `<i class="tape__band" style="--from: ${from.toFixed(1)}%; --to: ${(from + between(35, 65)).toFixed(1)}%"></i>${streaks.join("")}`;
  tape.classList.add("is-on");
  setTimeout(() => tape.classList.remove("is-on"), 1300);
}
(function nowAndThen() {
  let timer;
  const plan = first => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!document.hidden && !document.querySelector("dialog[open]")) tapeWear();
      plan(false);
    }, (first ? between(90, 180) : between(150, 330)) * 1000);
  };
  document.addEventListener("visibilitychange", () => document.hidden ? clearTimeout(timer) : plan(true));
  plan(true);
})();

/* ───────── The theme switch as a CRT ───────── */

// Switching off folds the picture into a bright line and the line into a dot; switching on draws the line
// out and opens the picture again. `swap` changes the theme while the screen is shut.
let crt;
export function power(on, swap) {
  if (motion.matches) { swap(); return; }
  crt ??= layer("crt");
  crt.innerHTML = '<i class="crt__shutter crt__shutter--top"></i><i class="crt__shutter crt__shutter--bottom"></i><i class="crt__line"></i>';
  const [top, bottom, line] = crt.children;
  const timing = (duration, delay = 0) => ({ duration, delay, easing: "cubic-bezier(.6, 0, .4, 1)", fill: "both" });
  crt.getAnimations().forEach(a => a.cancel());
  crt.classList.add("is-on");
  let total;
  if (!on) {
    const shut = [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }];
    top.animate(shut, timing(200)); bottom.animate(shut, timing(200));
    line.animate([
      { opacity: 0, transform: "scaleX(1)" }, { opacity: 1, transform: "scaleX(1)", offset: .25 },
      { opacity: 1, transform: "scaleX(.004)", offset: .8 }, { opacity: 0, transform: "scaleX(0)" },
    ], timing(420, 170));
    setTimeout(swap, 210);
    total = 600;
  } else {
    const open = [{ transform: "scaleY(1)" }, { transform: "scaleY(1)", offset: .45 }, { transform: "scaleY(0)" }];
    top.animate(open, timing(520)); bottom.animate(open, timing(520));
    line.animate([
      { opacity: 1, transform: "scaleX(0)" }, { opacity: 1, transform: "scaleX(1)", offset: .4 },
      { opacity: 1, transform: "scaleX(1) scaleY(6)", offset: .55 }, { opacity: 0, transform: "scaleX(1) scaleY(40)" },
    ], timing(520));
    setTimeout(swap, 120);
    total = 540;
  }
  setTimeout(() => crt.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160 }).finished.then(() => crt.classList.remove("is-on")), total);
}
window.crtPower = power;

/* ───────── Back to top as a VCR rewind ───────── */

// The tape counter follows the page: a few hundred pixels of scrolling make a second of tape.
const counter = () => {
  const s = Math.round(window.scrollY / 40);
  return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
// The back-to-top link scrolls by itself; the remote's Backspace asks for the scroll too.
export function rewind(scroll = false) {
  osd("◀◀ REW", counter(), Infinity);
  let quiet;
  const follow = () => {
    osdSub(counter());
    clearTimeout(quiet);
    if (window.scrollY < 4) return stop();
    quiet = setTimeout(stop, 600);          // scrolling stopped short of the top (or was taken over)
  };
  const stop = () => {
    window.removeEventListener("scroll", follow);
    clearTimeout(quiet);
    osd("■ STOP", counter(), 900);
    setTimeout(() => window.scrollY < 4 && osd("▶ PLAY", "", 1100), 900);
  };
  window.addEventListener("scroll", follow, { passive: true });
  quiet = setTimeout(stop, 1500);
  if (scroll) window.scrollTo({ top: 0, behavior: motion.matches ? "auto" : "smooth" });
}
document.getElementById("back-top")?.addEventListener("click", () => rewind());
