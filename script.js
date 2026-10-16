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

/* ───────── Card spotlight ───────── */
document.querySelectorAll("[data-spot]").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", e.clientX - r.left + "px");
    card.style.setProperty("--my", e.clientY - r.top + "px");
  });
});

document.getElementById("year").textContent = new Date().getFullYear();

/* ───────── Hero: live Clifford attractor ─────────
   x' = sin(a·y) + c·cos(a·x)
   y' = sin(b·x) + d·cos(b·y)
   Thousands of particles iterate the map; hits are accumulated in a density
   buffer that fades each frame, then log-scaled through a neon palette. */
(function attractor() {
  const canvas = document.getElementById("attractor");
  const hero = document.getElementById("top");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const PARTICLES = 26000;
  const STEPS = 3;
  const DECAY = 0.86;

  let W = 0, H = 0, density, img, pix32, scale, cx, cy;
  const px = new Float32Array(PARTICLES);
  const py = new Float32Array(PARTICLES);
  for (let i = 0; i < PARTICLES; i++) {
    px[i] = (Math.random() - 0.5) * 2;
    py[i] = (Math.random() - 0.5) * 2;
  }

  // 256-step palettes (little-endian ABGR). Dark: glowing neon on the dark page background.
  // Light: ink-like violet/magenta strokes on the light page background.
  const PALETTES = {
    dark: [
      [0.0, 11, 10, 26], [0.18, 38, 12, 98], [0.4, 132, 24, 160],
      [0.62, 245, 70, 150], [0.82, 255, 160, 70], [1.0, 255, 240, 214],
    ],
    light: [
      [0.0, 251, 250, 255], [0.15, 222, 208, 252], [0.4, 165, 115, 238],
      [0.65, 214, 36, 159], [0.85, 112, 20, 124], [1.0, 34, 10, 66],
    ],
  };
  const lut = new Uint32Array(256);
  function buildLut() {
    const stops = PALETTES[currentTheme()];
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let k = 0;
      while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
      const [t0, r0, g0, b0] = stops[k], [t1, r1, g1, b1] = stops[k + 1];
      const u = (t - t0) / (t1 - t0);
      const r = r0 + (r1 - r0) * u, g = g0 + (g1 - g0) * u, b = b0 + (b1 - b0) * u;
      lut[i] = (255 << 24) | (b << 16) | (g << 8) | r;
    }
  }
  buildLut();

  function resize() {
    const rect = hero.getBoundingClientRect();
    const longSide = 900;
    const k = longSide / Math.max(rect.width, rect.height);
    W = Math.max(2, Math.round(rect.width * Math.min(k, 1)));
    H = Math.max(2, Math.round(rect.height * Math.min(k, 1)));
    canvas.width = W;
    canvas.height = H;
    density = new Float32Array(W * H);
    img = ctx.createImageData(W, H);
    pix32 = new Uint32Array(img.data.buffer);
    const wide = W > H * 1.1;
    scale = wide ? H / 5.4 : W / 4.8;
    // Wide screens: attractor on the right; portrait screens: below the text.
    cx = wide ? W * 0.68 : W * 0.5;
    cy = wide ? H * 0.5 : H * 0.62;
  }

  let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5;
  window.addEventListener("pointermove", (e) => {
    tx = e.clientX / window.innerWidth;
    ty = e.clientY / window.innerHeight;
  }, { passive: true });

  function frame(t) {
    mx += (tx - mx) * 0.04;
    my += (ty - my) * 0.04;

    // The pointer shifts a and b by ±0.15 across the window. The ranges are centred
    // inside the region where the map stays chaotic and fills the canvas
    // (a ≲ -1.2, b ≳ 1.4); outside it the attractor collapses into a few points.
    const a = -1.55 + 0.12 * Math.sin(t * 0.00018) + (mx - 0.5) * 0.3;
    const b = 1.7 + 0.12 * Math.cos(t * 0.00013) + (my - 0.5) * 0.3;
    const c = 1.0 + 0.06 * Math.sin(t * 0.00021);
    const d = 0.7 + 0.06 * Math.cos(t * 0.00017);

    for (let i = 0; i < density.length; i++) density[i] *= DECAY;

    for (let i = 0; i < PARTICLES; i++) {
      let x = px[i], y = py[i];
      for (let s = 0; s < STEPS; s++) {
        const nx = Math.sin(a * y) + c * Math.cos(a * x);
        const ny = Math.sin(b * x) + d * Math.cos(b * y);
        x = nx; y = ny;
        const ix = (cx + x * scale) | 0;
        const iy = (cy + y * scale) | 0;
        if (ix >= 0 && ix < W && iy >= 0 && iy < H) density[iy * W + ix] += 1;
      }
      px[i] = x; py[i] = y;
    }

    paint();
  }

  function paint() {
    const gain = 255 / Math.log(1 + 110);
    for (let i = 0; i < density.length; i++) {
      const v = Math.log(1 + density[i]) * gain;
      pix32[i] = lut[v > 255 ? 255 : v | 0];
    }
    ctx.putImageData(img, 0, 0);
  }

  // Re-colour when the theme changes (toggle button or system setting).
  function onThemeChange() {
    buildLut();
    paint();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", currentTheme() === "dark" ? "#0b0a1a" : "#fbfaff");
  }
  new MutationObserver(onThemeChange).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  systemDark.addEventListener("change", onThemeChange);

  resize();
  onThemeChange();
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  if (reducedMotion) {
    // One settled, static frame.
    for (let i = 0; i < 40; i++) frame(2e4);
    return;
  }

  let running = true, visible = true, raf = 0;
  function loop(t) {
    if (running && visible) frame(t);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(hero);
  }
  document.addEventListener("visibilitychange", () => { running = !document.hidden; });
})();
