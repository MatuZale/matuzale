document.documentElement.classList.add("js");

const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ───────── Theme toggle ───────── */
const themeBtn = document.getElementById("theme-toggle");
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

function currentTheme() {
  return root.getAttribute("data-theme") || (systemDark.matches ? "dark" : "light");
}

themeBtn.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try { localStorage.setItem("theme", next); } catch (e) { /* storage unavailable */ }
  updateThemeLabel();
});

function updateThemeLabel() {
  themeBtn.setAttribute("aria-label", `Switch to ${currentTheme() === "dark" ? "light" : "dark"} theme`);
}
updateThemeLabel();
systemDark.addEventListener("change", updateThemeLabel);

/* ───────── Nav: section tracking and an accessible mobile disclosure ───────── */
const nav = document.getElementById("nav");
const links = document.getElementById("nav-links");
const burger = document.getElementById("burger");
const backTop = document.getElementById("back-top");
const mobileNav = window.matchMedia("(max-width: 1000px)");
const navAnchors = [...links.querySelectorAll("a")];
const watched = [...document.querySelectorAll("main > section[id]")];
let scrollPending = false;

function setMenu(open, restoreFocus = false) {
  open = mobileNav.matches && open;
  links.classList.toggle("is-open", open);
  nav.classList.toggle("is-menu-open", open);
  links.inert = mobileNav.matches && !open;
  burger.setAttribute("aria-expanded", String(open));
  burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  if (restoreFocus) burger.focus();
}

burger.addEventListener("click", () => {
  const open = burger.getAttribute("aria-expanded") !== "true";
  setMenu(open);
  if (open) navAnchors[0].focus();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && links.classList.contains("is-open")) {
    setMenu(false, true);
  }
});
document.addEventListener("click", (e) => {
  if (!nav.contains(e.target)) setMenu(false);
  const anchor = e.target.closest('a[href^="#"]');
  if (!anchor || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const target = document.getElementById(anchor.hash.slice(1));
  if (!target) return;
  setMenu(false);
  // Keep native fragment navigation/history, and move keyboard focus with the visitor.
  target.setAttribute("tabindex", "-1");
  requestAnimationFrame(() => target.focus({ preventScroll: true }));
});
nav.addEventListener("focusout", () => {
  requestAnimationFrame(() => {
    if (!nav.contains(document.activeElement)) setMenu(false);
  });
});
mobileNav.addEventListener("change", () => {
  // A resize can hide the currently focused mobile link.
  const focusWasInLinks = links.contains(document.activeElement);
  setMenu(false, mobileNav.matches && focusWasInLinks);
  updateNavSize();
});
setMenu(false);

function updateNavigation() {
  scrollPending = false;
  const y = window.scrollY;
  const pageTravel = root.scrollHeight - window.innerHeight;
  nav.classList.toggle("is-scrolled", y > 24);
  nav.style.setProperty("--scroll-progress", pageTravel > 0 ? Math.min(1, Math.max(0, y / pageTravel)) : 0);
  const showBackTop = y > window.innerHeight * 0.8;
  backTop.classList.toggle("is-visible", showBackTop);
  backTop.inert = !showBackTop;

  // Track section starts, including Toolbox, rather than a narrow intersection band.
  const readingLine = nav.offsetHeight + Math.min(140, window.innerHeight * 0.18);
  let active = watched[0];
  for (const section of watched) {
    if (section.getBoundingClientRect().top > readingLine) break;
    active = section;
  }
  if (pageTravel > 0 && y >= pageTravel - 2) active = watched[watched.length - 1];
  navAnchors.forEach((a) => {
    const isActive = a.hash === "#" + active.id;
    a.classList.toggle("is-active", isActive);
    if (isActive) a.setAttribute("aria-current", "location");
    else a.removeAttribute("aria-current");
  });
}
function scheduleNavigation() {
  if (scrollPending) return;
  scrollPending = true;
  requestAnimationFrame(updateNavigation);
}
function updateNavSize() {
  root.style.setProperty("--nav-height", nav.offsetHeight + "px");
  scheduleNavigation();
}
updateNavSize();
window.addEventListener("scroll", scheduleNavigation, { passive: true });
window.addEventListener("resize", updateNavSize, { passive: true });
window.addEventListener("pageshow", scheduleNavigation);
window.addEventListener("load", scheduleNavigation);
if ("ResizeObserver" in window) new ResizeObserver(scheduleNavigation).observe(document.body);

/* ───────── Reveal on scroll ───────── */
const revealEls = [...document.querySelectorAll(".reveal")];
revealEls.forEach((el) => {
  const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
  el.style.setProperty("--d", Math.min(siblings.indexOf(el), 6) * 70 + "ms");
});

if ("IntersectionObserver" in window && !reducedMotion) {
  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-in"));
}

/* ───────── Pointer light for the toolbox and employer / BENTOS cards ───────── */
document.querySelectorAll("[data-spot]").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" || reducedMotion) return;
    const r = card.getBoundingClientRect();
    const x = Math.max(0, Math.min(r.width, e.clientX - r.left));
    const y = Math.max(0, Math.min(r.height, e.clientY - r.top));
    card.style.setProperty("--mx", x + "px");
    card.style.setProperty("--my", y + "px");
  });
  card.addEventListener("pointerleave", () => {
    ["--mx", "--my"].forEach(name => card.style.removeProperty(name));
  });
});

/* ───────── Holographic project cards ───────── */
(function holographicProjects() {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const precisePointer = window.matchMedia("(any-hover: hover) and (any-pointer: fine)");
  const resets = [], repaints = [];
  const properties = ["--tilt-x", "--tilt-y", "--light-x", "--light-y", "--foil-x", "--foil-y", "--stars-x", "--stars-y", "--foil-angle", "--foil-exposure", "--shadow-x", "--shadow-y", "--holo-x", "--holo-y"];
  document.querySelectorAll("[data-holo]").forEach(slot => {
    const card = slot.querySelector(".card--holo:not(.card--bentos)");
    if (!card) return;
    let raf = 0, active = false, clientX = 0, clientY = 0;
    function reset() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (!active) return;
      active = false;
      slot.classList.remove("is-holo-active");
      properties.forEach(name => card.style.removeProperty(name));
    }
    function paintLight() {
      raf = 0;
      // Measure the unrotated slot to avoid feedback / jitter at tilted edges.
      const rect = slot.getBoundingClientRect();
      if (!rect.width || !rect.height || document.hidden || motion.matches || !precisePointer.matches) { reset(); return; }
      // After a scroll the pointer may no longer be over this card.
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) { reset(); return; }
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      // Limit physical edge travel on the wide research card and tall art card.
      const tiltX = (.5 - y) * 2 * Math.min(8, 2600 / rect.height);
      const tiltY = (x - .5) * 2 * Math.min(8, 2600 / rect.width);
      card.style.setProperty("--tilt-x", tiltX.toFixed(2) + "deg");
      card.style.setProperty("--tilt-y", tiltY.toFixed(2) + "deg");
      card.style.setProperty("--light-x", (x * 100).toFixed(2) + "%");
      card.style.setProperty("--light-y", (y * 100).toFixed(2) + "%");
      card.style.setProperty("--foil-x", (100 - x * 100).toFixed(2) + "%");
      card.style.setProperty("--foil-y", (100 - y * 100).toFixed(2) + "%");
      card.style.setProperty("--stars-x", ((x - .5) * -3).toFixed(2) + "px");
      card.style.setProperty("--stars-y", ((y - .5) * -3).toFixed(2) + "px");
      card.style.setProperty("--foil-angle", (122 + (x - .5) * 36 - (y - .5) * 18).toFixed(2) + "deg");
      card.style.setProperty("--foil-exposure", (.7 + Math.hypot(x - .5, y - .5) * .55).toFixed(3));
      card.style.setProperty("--shadow-x", ((x - .5) * -16).toFixed(2) + "px");
      card.style.setProperty("--shadow-y", (22 - (y - .5) * 12).toFixed(2) + "px");
      // Unitless pointer offset (-.5 … .5) drives the parallax of the engraved foil layer.
      card.style.setProperty("--holo-x", (x - .5).toFixed(3));
      card.style.setProperty("--holo-y", (y - .5).toFixed(3));
    }
    function track(event) {
      if (event.pointerType === "touch") { reset(); return; }
      if (motion.matches || !precisePointer.matches || document.hidden) return;
      clientX = event.clientX; clientY = event.clientY;
      if (!active) { active = true; slot.classList.add("is-holo-active"); }
      // Pointer events can arrive faster than screen refresh. One update per frame.
      if (!raf) raf = requestAnimationFrame(paintLight);
    }
    slot.addEventListener("pointerenter", track);
    slot.addEventListener("pointermove", track);
    slot.addEventListener("pointerleave", reset);
    slot.addEventListener("pointercancel", reset);
    resets.push(reset);
    // Scrolling moves the card under a still pointer: re-measure the light rather than switching it off.
    repaints.push(() => { if (active && !raf) raf = requestAnimationFrame(paintLight); });
  });
  const resetAll = () => resets.forEach(reset => reset());
  motion.addEventListener("change", resetAll);
  precisePointer.addEventListener("change", resetAll);
  window.addEventListener("blur", resetAll);
  window.addEventListener("scroll", () => repaints.forEach(repaint => repaint()), { passive: true });
  window.addEventListener("resize", resetAll, { passive: true });
  document.addEventListener("visibilitychange", () => { if (document.hidden) resetAll(); });
})();

/* ───────── Attractor card collection, loaded on first use ───────── */
(function attractorDeck() {
  const opener = document.querySelector("[data-deck-open]");
  if (!opener) return;
  let deck;
  opener.addEventListener("click", async () => {
    opener.setAttribute("aria-busy", "true");
    try {
      deck ??= import("./deck.js").then(module => module.createDeck());
      (await deck).open(opener);
    } catch (error) {
      deck = undefined;
      console.error(error);
    } finally {
      opener.removeAttribute("aria-busy");
    }
  });
})();

document.getElementById("year").textContent = new Date().getFullYear();

/* ───────── A background process, underneath the footer ───────── */
(function footerSnake() {
  const board = document.getElementById("footer-snake");
  const pixels = document.getElementById("snake-pixels");
  const toggle = document.getElementById("snake-toggle");
  if (!board || !pixels || !toggle) return;
  const figure = board.closest("figure");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const columns = 40, rows = 8, cell = 8;
  const cycle = [{ x: 0, y: 0 }];
  // A closed route through every cell provides a safe fallback. Shortcuts may
  // approach the food, but never pass the tail or reverse the body's route order.
  for (let y = 0; y < rows; y++) {
    for (let step = 1; step < columns; step++) {
      cycle.push({ x: y % 2 ? columns - step : step, y });
    }
  }
  for (let y = rows - 1; y > 0; y--) cycle.push({ x: 0, y });
  const total = cycle.length;
  const routeIndex = Array.from({ length: rows }, () => Array(columns));
  cycle.forEach((point, i) => { routeIndex[point.y][point.x] = i; });
  const distance = (from, to) => (to - from + total) % total;
  let body = Array.from({ length: 10 }, (_, i) => 166 - i);
  let food = 0, timer = 0, visible = false, paused = motion.matches;

  function placeFood() {
    const vacant = cycle.map((_, i) => i).filter(i => !body.includes(i));
    food = vacant[Math.floor(Math.random() * vacant.length)];
  }
  function advance() {
    const head = cycle[body[0]], target = cycle[food];
    const gap = distance(body[0], body[body.length - 1]);
    const foodAhead = distance(body[0], food);
    const candidates = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dx, dy]) => {
      const x = head.x + dx, y = head.y + dy;
      if (x < 0 || x >= columns || y < 0 || y >= rows) return null;
      const index = routeIndex[y][x], skip = distance(body[0], index);
      const grows = index === food && body.length < 44;
      if (!skip || skip > foodAhead || skip > gap || (skip === gap && grows)) return null;
      return { index, skip, score: Math.abs(x - target.x) + Math.abs(y - target.y) };
    }).filter(Boolean).sort((a, b) => a.score - b.score || b.skip - a.skip);
    // The next cycle cell is always safe while the board has free space.
    const next = candidates[0]?.index ?? (body[0] + 1) % total;
    const ate = next === food;
    body.unshift(next);
    if (!ate || body.length > 44) body.pop();
    if (ate) placeFood();
  }
  function svgElement(tag, attributes) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    return element;
  }
  function draw() {
    const fragment = document.createDocumentFragment();
    body.forEach((index, i) => {
      const { x, y } = cycle[index];
      fragment.append(svgElement("rect", {
        x: 33 + x * cell, y: 33 + y * cell, width: 6, height: 6, rx: 1,
        fill: i === 0 ? "#6ce7e4" : `hsl(${263 + 38 * i / body.length} 78% ${73 - 23 * i / body.length}%)`,
        opacity: i === 0 ? 1 : 1 - .45 * i / body.length,
        class: i === 0 ? "circuit-window__head" : "circuit-window__segment"
      }));
    });
    const head = cycle[body[0]], neck = cycle[body[1]];
    const dx = head.x - neck.x, dy = head.y - neck.y;
    [-1, 1].forEach(side => fragment.append(svgElement("circle", {
      cx: 36 + head.x * cell + dx * 1.5 + (dy ? side * 1.3 : 0),
      cy: 36 + head.y * cell + dy * 1.5 + (dx ? side * 1.3 : 0),
      r: .65, fill: "#08151d"
    })));
    const target = cycle[food];
    fragment.append(svgElement("rect", { x: 33 + target.x * cell, y: 33 + target.y * cell, width: 6, height: 6, rx: 1.5, fill: "#ff80c8", class: "circuit-window__food" }));
    pixels.replaceChildren(fragment);
  }
  function schedule() {
    clearTimeout(timer);
    timer = 0;
    const running = visible && !document.hidden && !paused;
    figure.classList.toggle("is-paused", !running);
    if (running) timer = setTimeout(() => { advance(); draw(); schedule(); }, 110);
  }
  function updateToggle() {
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Play Snake animation" : "Pause Snake animation");
    toggle.textContent = paused ? "play ▷" : "pause Ⅱ";
    schedule();
  }
  toggle.hidden = false;
  toggle.addEventListener("click", () => { paused = !paused; updateToggle(); });
  motion.addEventListener("change", (event) => {
    if (event.matches) { paused = true; updateToggle(); }
  });
  document.addEventListener("visibilitychange", schedule);
  window.addEventListener("pagehide", () => { clearTimeout(timer); timer = 0; });
  window.addEventListener("pageshow", schedule);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    }, { threshold: .1 }).observe(board);
  } else {
    const checkVisible = () => {
      const rect = board.getBoundingClientRect();
      visible = rect.bottom > 0 && rect.top < window.innerHeight;
      schedule();
    };
    window.addEventListener("scroll", checkVisible, { passive: true });
    window.addEventListener("resize", checkVisible, { passive: true });
    checkVisible();
  }
  placeFood();
  draw();
  updateToggle();
})();

/* ───────── A small interruption in the signal ───────── */
(function logoGlitch() {
  const brand = document.querySelector(".nav__brand");
  let nextGlitch = 0, clearGlitch = 0;
  function glitch() {
    const duration = 160 + Math.random() * 140;
    clearTimeout(clearGlitch);
    brand.style.setProperty("--glitch-duration", duration + "ms");
    brand.classList.remove("is-glitching");
    void brand.offsetWidth;
    brand.classList.add("is-glitching");
    clearGlitch = setTimeout(() => brand.classList.remove("is-glitching"), duration);
  }
  function schedule(first = false) {
    clearTimeout(nextGlitch);
    if (reducedMotion || document.hidden) return;
    const delay = first ? 3000 + Math.random() * 5000 : 8000 + Math.random() * 27000;
    nextGlitch = setTimeout(() => {
      if (!document.querySelector("dialog[open]")) glitch();
      schedule();
    }, delay);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearTimeout(nextGlitch);
      clearTimeout(clearGlitch);
      brand.classList.remove("is-glitching");
    } else schedule(true);
  });
  brand.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "g" && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) glitch();
  });
  schedule(true);
})();

/* ───────── Observer readout: local fields, opt-in public IP lookup ───────── */
(function observerReadout() {
  const panel = document.getElementById("observer-trace");
  const unlock = document.getElementById("observer-unlock");
  if (typeof panel.showModal !== "function") return;
  const ipField = document.getElementById("observer-ip");
  const revealBtn = document.getElementById("observer-reveal-ip");
  let returnFocus = null, activeRequest = null;
  const text = (name, value) => { document.getElementById("observer-" + name).textContent = value; };
  unlock.hidden = false;
  unlock.addEventListener("click", () => {
    if (document.querySelector("dialog[open]")) return;
    returnFocus = document.activeElement;
    setMenu(false);
    text("zone", Intl.DateTimeFormat().resolvedOptions().timeZone || "Unavailable");
    text("languages", (navigator.languages?.length ? navigator.languages : [navigator.language || "Unavailable"]).join(" / "));
    text("display", screen.width && screen.height ? `${screen.width} × ${screen.height} · ${window.devicePixelRatio || 1}× pixel ratio` : "Unavailable");
    text("viewport", `${window.innerWidth} × ${window.innerHeight}`);
    text("input", navigator.maxTouchPoints > 0 ? "Touch available" : "Pointer / keyboard");
    text("time", new Date().toLocaleString());
    panel.showModal();
    document.body.classList.add("observer-open");
  });
  document.getElementById("observer-close").addEventListener("click", () => panel.close());
  panel.addEventListener("close", () => {
    activeRequest?.abort();
    activeRequest = null;
    document.body.classList.remove("observer-open");
    ipField.textContent = "Awaiting your signal";
    revealBtn.disabled = false;
    revealBtn.textContent = "Reveal public IP ↗";
    (returnFocus?.isConnected ? returnFocus : unlock).focus({ preventScroll: true });
  });
  panel.addEventListener("click", (e) => {
    if (e.target !== panel) return;
    const rect = panel.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) panel.close();
  });
  function isAddress(value) {
    if (typeof value !== "string" || value.length > 45) return false;
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) return value.split(".").every(part => Number(part) <= 255);
    try { return value.includes(":") && new URL(`http://[${value}]/`).hostname.startsWith("["); }
    catch { return false; }
  }
  revealBtn.addEventListener("click", async () => {
    if (activeRequest || !panel.open) return;
    const request = new AbortController();
    activeRequest = request;
    revealBtn.disabled = true;
    revealBtn.textContent = "Reading signal…";
    ipField.textContent = "Looking up public address…";
    const timeout = setTimeout(() => request.abort(), 6000);
    try {
      const response = await fetch("https://api64.ipify.org?format=json", {
        signal: request.signal, credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer",
      });
      if (!response.ok) throw new Error("IP lookup unavailable");
      const { ip } = await response.json();
      if (!isAddress(ip)) throw new Error("Invalid address");
      if (activeRequest === request && panel.open) ipField.textContent = ip;
    } catch {
      if (activeRequest === request && panel.open) ipField.textContent = "Unavailable · blocked or offline";
    } finally {
      clearTimeout(timeout);
      if (activeRequest === request) {
        activeRequest = null;
        revealBtn.disabled = false;
        revealBtn.textContent = "Read public IP again ↗";
      }
    }
  });
})();

/* ───────── The hero's live Clifford attractor ─────────
   x' = sin(a·y) + c·cos(a·x), y' = sin(b·x) + d·cos(b·y). */
(function attractor() {
  const canvas = document.getElementById("attractor");
  const hero = document.getElementById("top");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const PARTICLES = 26000, STEPS = 3, DECAY = .86;
  const px = new Float64Array(PARTICLES), py = new Float64Array(PARTICLES);
  const lut = new Uint32Array(256);
  const colours = {
    dark: [[0,11,10,26],[.18,38,12,98],[.4,132,24,160],[.62,245,70,150],[.82,255,160,70],[1,255,240,214]],
    light: [[0,251,250,255],[.15,222,208,252],[.4,165,115,238],[.65,214,36,159],[.85,112,20,124],[1,34,10,66]],
  };
  let W, H, density, img, pixels, scale, cx, cy;
  let dirty = true, visible = true, raf = 0, resizeTimer = 0;
  let mx = .5, my = .5, tx = .5, ty = .5;
  function seed() {
    for (let i = 0; i < PARTICLES; i++) {
      px[i] = (Math.random() - .5) * 2;
      py[i] = (Math.random() - .5) * 2;
    }
  }
  function resize() {
    const rect = hero.getBoundingClientRect();
    const k = Math.min(1, 900 / Math.max(1, rect.width, rect.height));
    W = Math.max(2, Math.round(rect.width * k));
    H = Math.max(2, Math.round(rect.height * k));
    canvas.width = W; canvas.height = H;
    density = new Float32Array(W * H);
    img = ctx.createImageData(W, H);
    pixels = new Uint32Array(img.data.buffer);
    const wide = W > H * 1.1;
    scale = wide ? H / 5.4 : W / 4.8;
    cx = wide ? W * .68 : W * .5;
    cy = wide ? H * .5 : H * .62;
    dirty = true;
    schedule();
  }
  function paint() {
    const gain = 255 / Math.log(111);
    for (let i = 0; i < density.length; i++) {
      const value = Math.log(1 + density[i]) * gain;
      pixels[i] = lut[value > 255 ? 255 : value | 0];
    }
    ctx.putImageData(img, 0, 0);
  }
  function frame(time) {
    mx += (tx - mx) * .04; my += (ty - my) * .04;
    const a = -1.55 + .12 * Math.sin(time * .00018) + (mx - .5) * .3;
    const b = 1.7 + .12 * Math.cos(time * .00013) + (my - .5) * .3;
    const c = 1 + .06 * Math.sin(time * .00021);
    const d = .7 + .06 * Math.cos(time * .00017);
    for (let i = 0; i < density.length; i++) density[i] *= DECAY;
    for (let i = 0; i < PARTICLES; i++) {
      let x = px[i], y = py[i];
      for (let s = 0; s < STEPS; s++) {
        const nx = Math.sin(a * y) + c * Math.cos(a * x);
        y = Math.sin(b * x) + d * Math.cos(b * y); x = nx;
        const ix = (cx + x * scale) | 0, iy = (cy + y * scale) | 0;
        if (ix >= 0 && ix < W && iy >= 0 && iy < H) density[iy * W + ix]++;
      }
      px[i] = x; py[i] = y;
    }
  }
  function schedule() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
  }
  function loop(time) {
    raf = 0;
    if (!visible || document.hidden) return;
    if (dirty) {
      seed(); density.fill(0);
      for (let i = 0; i < (reducedMotion ? 40 : 8); i++) frame(20000);
      dirty = false;
    } else if (!reducedMotion) frame(time);
    paint();
    if (!reducedMotion) schedule();
  }
  function themeChange() {
    const stops = colours[currentTheme()];
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let k = 0;
      while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
      const [t0,r0,g0,b0] = stops[k], [t1,r1,g1,b1] = stops[k + 1];
      const u = (t - t0) / (t1 - t0);
      const r = r0 + (r1 - r0) * u, g = g0 + (g1 - g0) * u, b = b0 + (b1 - b0) * u;
      lut[i] = (255 << 24) | (b << 16) | (g << 8) | r;
    }
    paint();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", currentTheme() === "dark" ? "#0b0a1a" : "#fbfaff");
  }
  window.addEventListener("pointermove", event => {
    tx = event.clientX / window.innerWidth; ty = event.clientY / window.innerHeight;
  }, { passive: true });
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150);
  });
  if ("IntersectionObserver" in window) new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) schedule();
    else { cancelAnimationFrame(raf); raf = 0; }
  }, { threshold: 0 }).observe(hero);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else schedule();
  });
  new MutationObserver(themeChange).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  systemDark.addEventListener("change", themeChange);
  resize();
  themeChange();
})();
