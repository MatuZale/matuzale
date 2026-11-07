// A rare moment on the About horizon, in its synthwave: the sun sets, peeks back up once as if to check
// who is watching, and ducks under; night falls on the grid, pixel stars twinkle, a striped crescent moon
// rises and a shooting star crosses; then the moon goes down and the sun comes back up, a little too
// eagerly. The terminal beside it types `sleep 8` for the night. It comes at random, like the site's other
// rare events: at every moment About is on screen the same small chance, on average once in 200 s, and
// not again within a minute. document.querySelector(".horizon").nightfall() brings it on from the console.
// Decoration only (the horizon is aria-hidden); never with reduced motion. Loaded by script.js when About
// is first in sight.

const MEAN = 200, REST = 60, TAPE_MEAN = 180, TAPE_DURATION = 12000, STARS = 46;
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
  let visible = false, busy = false, restUntil = 0, tapeRestUntil = 0, tapeTimer = null, moon, stars, meteor, landscape;

  // A short sideways journey, like looking out of a train at dusk. The SVGs are
  // built only on first use; two copies of each tile let the compositor loop
  // the scenery without painting a new landscape on every frame.
  function buildTapeLandscape() {
    if (landscape) return;
    landscape = Object.assign(document.createElement("div"), { className: "horizon__landscape" });
    const mountains = `<path class="horizon__terrain-fill" d="M0 200V148L70 116 127 142 217 44 285 101 339 68 418 143 489 116 557 149 639 74 702 111 776 26 859 117 924 85 1007 146 1092 92 1162 131 1200 148V200Z"/>
      <path class="horizon__ridge" d="M0 148L70 116 127 142 217 44 285 101 339 68 418 143 489 116 557 149 639 74 702 111 776 26 859 117 924 85 1007 146 1092 92 1162 131 1200 148"/>
      <path class="horizon__mesh" d="M70 116L101 200M127 142L217 44 242 200M217 44L166 171 285 101 315 200M339 68L320 155 418 143 449 200M489 116L465 176 557 149 588 200M639 74L607 167 702 111 720 200M776 26L738 167 859 117 883 200M776 26L822 156 924 85 948 200M1007 146L1092 92 1110 200M1092 92L1057 172 1162 131 1186 200M0 179L101 171 166 171 242 158 320 155 391 176 465 176 535 182 607 167 677 171 738 167 822 156 883 170 948 170 1057 172 1110 174 1200 181"/>`;
    const skyline = `<path class="horizon__city-fill" d="M0 200V173H49V153H75V164H101V128H116V117H122V128H139V171H171V146H199V178H231V162H248V111H273V102H282V111H304V165H335V147H359V173H398V153H427V181H468V163H495V133H529V173H560V152H589V177H624V143H650V98H657V86H663V98H684V161H710V139H736V172H770V157H793V124H820V114H829V124H847V171H880V148H908V179H943V158H969V137H997V170H1030V153H1058V178H1084V143H1108V123H1132V143H1152V173H1200V200Z"/>
      <path class="horizon__city-rim" d="M0 173H49V153H75V164H101V128H116V117H122V128H139V171H171V146H199V178H231V162H248V111H273V102H282V111H304V165H335V147H359V173H398V153H427V181H468V163H495V133H529V173H560V152H589V177H624V143H650V98H657V86H663V98H684V161H710V139H736V172H770V157H793V124H820V114H829V124H847V171H880V148H908V179H943V158H969V137H997V170H1030V153H1058V178H1084V143H1108V123H1132V143H1152V173H1200"/>
      <path class="horizon__windows" d="M109 141H114M126 151H131M109 159H114M256 122H261M287 122H292M256 139H261M272 148H277M287 156H292M503 145H508M516 153H521M658 111H663M672 126H677M658 143H663M801 137H806M832 137H837M816 151H821M801 160H806M977 149H982M985 161H990M1116 138H1121M1116 155H1121"/>`;
    for (const [depth, drawing] of [["far", mountains], ["near", skyline]]) {
      const layer = Object.assign(document.createElement("div"), { className: `horizon__landscape-layer horizon__landscape-layer--${depth}` });
      const tile = `<svg viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">${drawing}</svg>`;
      layer.innerHTML = tile + tile;
      landscape.append(layer);
    }
    horizon.append(landscape);
  }

  function endTapeSun() {
    if (!tapeTimer) return;
    tapeTimer();
    tapeTimer = null;
    horizon.classList.remove("is-tape-sun");
    tapeRestUntil = performance.now() + REST * 1000;
  }
  function tapeSun() {
    if (!visible || busy || tapeTimer || document.hidden || motion.matches || tapePaused()) return false;
    buildTapeLandscape();
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

  // CSS keyframes are held by the shared tape rule. Hold Web Animations and
  // the sunset's CSS transitions here too, including a partly risen sun.
  // Only resume animations we suspended, not ones held for other reasons.
  let heldAnimations = [];
  document.addEventListener("tape-pause-change", () => {
    if (tapePaused()) {
      heldAnimations = horizon.getAnimations({ subtree: true }).filter(a => !(typeof CSSAnimation !== "undefined" && a instanceof CSSAnimation) && a.playState === "running");
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
