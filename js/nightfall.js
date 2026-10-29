// A rare moment on the About horizon, in its synthwave: the sun sets, peeks back up once as if to check
// who is watching, and ducks under; night falls on the grid, pixel stars twinkle, a striped crescent moon
// rises and a shooting star crosses; then the moon goes down and the sun comes back up, a little too
// eagerly. The terminal beside it types `sleep 8` for the night. It comes at random, like the site's other
// rare events: at every moment About is on screen the same small chance, on average once in 200 s, and
// not again within a minute. document.querySelector(".horizon").nightfall() brings it on from the console.
// Decoration only (the horizon is aria-hidden); never with reduced motion. Loaded by script.js when About
// is first in sight.

const MEAN = 200, REST = 60, TAPE_MEAN = 180, TAPE_DURATION = 8000, STARS = 46;
const rand = (a, b) => a + Math.random() * (b - a);
const tapePaused = () => document.documentElement.classList.contains("is-tape-paused");
// The sunset sequence must wait for tape time, not wall time, or it would run
// through its later scenes while the picture is held.
function tapeTimeout(callback, duration) {
  let remaining = duration, started = 0, id = 0, done = false;
  const cancel = () => { done = true; clearTimeout(id); document.removeEventListener("tape-pause-change", sync); };
  const finish = () => { cancel(); callback(); };
  function sync() {
    if (id) { clearTimeout(id); id = 0; remaining -= performance.now() - started; }
    if (!done && !tapePaused()) { started = performance.now(); id = setTimeout(finish, Math.max(0, remaining)); }
  }
  document.addEventListener("tape-pause-change", sync);
  sync();
  return cancel;
}
const wait = ms => new Promise(done => tapeTimeout(done, ms));

export function startNightfall(horizon) {
  const sky = horizon.querySelector(".horizon__sky"), sun = horizon.querySelector(".horizon__sun");
  const prompt = document.querySelector(".about-terminal__prompt");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let visible = false, busy = false, restUntil = 0, tapeRestUntil = 0, tapeTimer = null, moon, stars, meteor;

  function endTapeSun() {
    if (!tapeTimer) return;
    tapeTimer();
    tapeTimer = null;
    horizon.classList.remove("is-tape-sun");
    tapeRestUntil = performance.now() + REST * 1000;
  }
  function tapeSun() {
    if (!visible || busy || tapeTimer || document.hidden || motion.matches || tapePaused()) return false;
    horizon.classList.add("is-tape-sun");
    tapeTimer = tapeTimeout(endTapeSun, TAPE_DURATION);
    return true;
  }
  horizon.tapeSun = tapeSun;

  function build() {
    if (moon) return;
    moon = Object.assign(document.createElement("span"), { className: "horizon__moon" });
    meteor = Object.assign(document.createElement("span"), { className: "horizon__meteor" });
    stars = Object.assign(document.createElement("span"), { className: "horizon__stars" });
    for (let i = 0; i < STARS; i++) {
      const star = document.createElement("i");
      if (Math.random() < .25) star.className = "is-big";
      star.style.cssText = `left:${rand(3, 97).toFixed(1)}%;top:${(rand(0, 1) ** 1.4 * 78 + 3).toFixed(1)}%;--d:${rand(1.2, 3.2).toFixed(2)}s;--w:${rand(0, 2).toFixed(2)}s`;
      stars.append(star);
    }
    sky.append(stars, moon, meteor);
  }

  // The terminal's prompt types a command, and later takes it back.
  let typed;
  async function type(text, pause = 85) {
    if (!prompt || document.documentElement.classList.contains("is-binary")) return;
    typed ??= prompt.insertBefore(Object.assign(document.createElement("span"), { className: "about-terminal__typed" }), prompt.querySelector(".about-terminal__cursor"));
    for (const ch of text) { typed.textContent += ch; await wait(pause * rand(.6, 1.4)); }
  }
  async function erase() {
    while (typed?.textContent) { typed.textContent = typed.textContent.slice(0, -1); await wait(40); }
  }

  async function nightfall() {
    if (busy || tapeTimer || motion.matches || tapePaused()) return;
    busy = true;
    build();
    const h = sun.offsetHeight, rise = Math.min(sky.clientHeight * .42, h * 1.1);
    const down = y => `translateY(${(y * h).toFixed(1)}px)`, dusk = "hue-rotate(-14deg) saturate(1.35)";

    // Down it goes; up again for a peek; and under.
    const set = sun.animate([
      { transform: down(0), filter: "none", easing: "cubic-bezier(.45, 0, .8, .6)" },
      { transform: down(.52), filter: dusk, offset: .62, easing: "cubic-bezier(.2, .8, .4, 1)" },
      { transform: down(.38), filter: dusk, offset: .74 },
      { transform: down(.38), filter: dusk, offset: .84, easing: "cubic-bezier(.6, 0, 1, .6)" },
      { transform: down(.6), filter: dusk, opacity: 1, offset: .9 },
      { transform: down(.6), filter: dusk, opacity: .3 },
    ], { duration: 4200, fill: "forwards" });
    await wait(3400);
    horizon.classList.add("is-night");
    type("sleep 8");
    await wait(400);

    // The moon rises to the right of where the sun went down, drifting a little towards it.
    const up = moon.animate([
      { transform: "translate(0, 110%)" },
      { transform: `translate(-6%, ${-rise}px)` },
    ], { duration: 3000, easing: "cubic-bezier(.2, .7, .3, 1)", fill: "forwards" });
    await wait(3400);
    meteor.animate([
      { transform: "translate(0, 0) rotate(-19deg)", opacity: 0 },
      { transform: `translate(${-rise * .35}px, ${rise * .12}px) rotate(-19deg)`, opacity: 1, offset: .25 },
      { transform: `translate(${-rise * 1.4}px, ${rise * .48}px) rotate(-19deg)`, opacity: 0 },
    ], { duration: 900, easing: "cubic-bezier(.3, 0, .7, 1)" });
    await wait(3300);

    // Morning: the moon sets, the stars go, and the sun is back, overshooting a little and settling.
    const below = moon.animate([
      { transform: `translate(-6%, ${-rise}px)` },
      { transform: "translate(-12%, 110%)" },
    ], { duration: 2200, easing: "cubic-bezier(.5, 0, .8, .5)", fill: "forwards" });
    await wait(1300);
    horizon.classList.remove("is-night");
    await wait(400);
    erase();
    await wait(400);
    const back = sun.animate([
      { transform: down(.6), filter: dusk, opacity: .3, easing: "cubic-bezier(.2, .9, .3, 1)" },
      { transform: down(-.07), filter: "none", opacity: 1, offset: .55, easing: "ease-in-out" },
      { transform: down(.025), offset: .72, easing: "ease-in-out" },
      { transform: down(-.01), offset: .86, easing: "ease-in-out" },
      { transform: down(0), filter: "none", opacity: 1 },
    ], { duration: 2600, fill: "forwards" });
    await back.finished;
    [set, back, up, below].forEach(a => a.cancel());
    restUntil = performance.now() + REST * 1000;
    busy = false;
  }
  horizon.nightfall = nightfall;

  // The sunset and moon use Web Animations rather than CSS. Keep only the
  // ones we actually suspended, so animations paused for other reasons stay put.
  let heldAnimations = [];
  document.addEventListener("tape-pause-change", () => {
    if (tapePaused()) {
      heldAnimations = horizon.getAnimations({ subtree: true }).filter(a => !(typeof CSSAnimation !== "undefined" && a instanceof CSSAnimation) && !(typeof CSSTransition !== "undefined" && a instanceof CSSTransition) && a.playState === "running");
      heldAnimations.forEach(a => a.pause());
    } else {
      heldAnimations.forEach(a => { if (a.playState === "paused") a.play(); });
      heldAnimations = [];
    }
  });

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible) endTapeSun(); }).observe(horizon);
  motion.addEventListener("change", () => { if (motion.matches) endTapeSun(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) endTapeSun(); });
  setInterval(() => {
    if (!visible || busy || tapeTimer || document.hidden || motion.matches || tapePaused()) return;
    if (performance.now() >= restUntil && Math.random() < 1 - Math.exp(-1 / MEAN)) nightfall();
    else if (performance.now() >= tapeRestUntil && Math.random() < 1 - Math.exp(-1 / TAPE_MEAN)) tapeSun();
  }, 1000);
}
