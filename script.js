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

/* ───────── Clifford attractor + the unlisted Chaos Lab ─────────
   The hero and the lab share one canvas, density buffer and animation loop.
   x' = sin(a·y) + c·cos(a·x)
   y' = sin(b·x) + d·cos(b·y) */
(function attractor() {
  const canvas = document.getElementById("attractor");
  const hero = document.getElementById("top");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const lab = document.getElementById("chaos-lab");
  const viewport = document.getElementById("chaos-viewport");
  const unlock = document.getElementById("chaos-unlock");
  const presetSelect = document.getElementById("chaos-preset");
  const paletteSelect = document.getElementById("chaos-palette");
  const playBtn = document.getElementById("chaos-play");
  const status = document.getElementById("chaos-status");
  const parameters = ["a", "b", "c", "d"];
  const presets = {
    stable: { a: -1.55, b: 1.7, c: 1, d: .7 },
    questionable: { a: -1.7, b: 1.5, c: .9, d: .7 },
    review: { a: -1.4, b: 1.8, c: 1, d: .8 },
  };
  let coords = { ...presets.stable };
  let palette = "neon", playing = !reducedMotion, heroVisible = true;
  let dirty = true, raf = 0, resizeTimer = 0, returnFocus = null;

  const PARTICLES = 26000, STEPS = 3, DECAY = .86;
  let W = 0, H = 0, density, img, pix32, scale, cx, cy;
  const px = new Float64Array(PARTICLES), py = new Float64Array(PARTICLES);
  function seedParticles() {
    for (let i = 0; i < PARTICLES; i++) {
      px[i] = (Math.random() - .5) * 2;
      py[i] = (Math.random() - .5) * 2;
    }
  }
  // Palettes are ink on paper in light mode, and light on ink in dark mode.
  const PALETTES = {
    neon: {
      dark: [[0,11,10,26],[.18,38,12,98],[.4,132,24,160],[.62,245,70,150],[.82,255,160,70],[1,255,240,214]],
      light: [[0,251,250,255],[.15,222,208,252],[.4,165,115,238],[.65,214,36,159],[.85,112,20,124],[1,34,10,66]],
    },
    ocean: {
      dark: [[0,11,10,26],[.18,6,35,84],[.4,0,115,170],[.62,40,214,214],[.82,170,255,120],[1,230,255,220]],
      light: [[0,251,250,255],[.18,205,235,243],[.4,60,170,188],[.62,0,115,150],[.82,8,70,110],[1,10,25,65]],
    },
    ember: {
      dark: [[0,11,10,26],[.18,65,10,70],[.4,190,35,110],[.62,255,85,95],[.82,255,170,60],[1,255,240,190]],
      light: [[0,251,250,255],[.18,255,222,219],[.4,230,125,70],[.62,190,60,85],[.82,110,25,90],[1,40,10,55]],
    },
  };
  const lut = new Uint32Array(256);
  function buildLut() {
    const stops = PALETTES[lab.open ? palette : "neon"][currentTheme()];
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let k = 0;
      while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
      const [t0,r0,g0,b0] = stops[k], [t1,r1,g1,b1] = stops[k + 1];
      const u = (t - t0) / (t1 - t0);
      const r = r0 + (r1 - r0) * u, g = g0 + (g1 - g0) * u, b = b0 + (b1 - b0) * u;
      lut[i] = (255 << 24) | (b << 16) | (g << 8) | r;
    }
  }
  function resize() {
    const rect = (lab.open ? viewport : hero).getBoundingClientRect();
    const k = (lab.open ? 720 : 900) / Math.max(1, rect.width, rect.height);
    W = Math.max(2, Math.round(rect.width * Math.min(k, 1)));
    H = Math.max(2, Math.round(rect.height * Math.min(k, 1)));
    canvas.width = W;
    canvas.height = H;
    density = new Float32Array(W * H);
    img = ctx.createImageData(W, H);
    pix32 = new Uint32Array(img.data.buffer);
    const wide = W > H * 1.1;
    scale = lab.open ? Math.min(W, H) / 5.6 : wide ? H / 5.4 : W / 4.8;
    cx = lab.open ? W * .5 : wide ? W * .68 : W * .5;
    cy = lab.open ? H * .5 : wide ? H * .5 : H * .62;
    dirty = true;
    scheduleFrame();
  }

  let mx = .5, my = .5, tx = .5, ty = .5;
  window.addEventListener("pointermove", (e) => {
    if (lab.open) return;
    tx = e.clientX / window.innerWidth;
    ty = e.clientY / window.innerHeight;
  }, { passive: true });

  function frame(t, draw = true) {
    mx += (tx - mx) * .04;
    my += (ty - my) * .04;
    // Pointer modulation stays in the hero's established chaotic range.
    const { a, b, c, d } = lab.open ? coords : {
      a: -1.55 + .12 * Math.sin(t * .00018) + (mx - .5) * .3,
      b: 1.7 + .12 * Math.cos(t * .00013) + (my - .5) * .3,
      c: 1 + .06 * Math.sin(t * .00021),
      d: .7 + .06 * Math.cos(t * .00017),
    };
    for (let i = 0; i < density.length; i++) density[i] *= DECAY;
    for (let i = 0; i < PARTICLES; i++) {
      let x = px[i], y = py[i];
      for (let s = 0; s < STEPS; s++) {
        const nx = Math.sin(a * y) + c * Math.cos(a * x);
        const ny = Math.sin(b * x) + d * Math.cos(b * y);
        x = nx; y = ny;
        const ix = (cx + x * scale) | 0, iy = (cy + y * scale) | 0;
        if (ix >= 0 && ix < W && iy >= 0 && iy < H) density[iy * W + ix] += 1;
      }
      px[i] = x; py[i] = y;
    }
    if (draw) paint();
  }
  function paint() {
    const gain = 255 / Math.log(111);
    for (let i = 0; i < density.length; i++) {
      const v = Math.log(1 + density[i]) * gain;
      pix32[i] = lut[v > 255 ? 255 : v | 0];
    }
    ctx.putImageData(img, 0, 0);
  }
  function settle(count) {
    for (let i = 0; i < count; i++) frame(2e4, false);
    paint();
  }
  function scheduleFrame() {
    if (!raf && !document.hidden) raf = requestAnimationFrame(loop);
  }
  function loop(t) {
    raf = 0;
    if (document.hidden) return;
    const visible = lab.open || heroVisible;
    const animate = lab.open ? playing : !reducedMotion;
    if (visible) {
      if (dirty) {
        // A fixed point can make every particle identical. A deterministic map
        // cannot separate them again: every geometry change needs fresh seeds.
        seedParticles();
        density.fill(0);
        settle(animate ? 8 : lab.open ? 14 : 40);
      } else if (animate) frame(t);
      dirty = false;
    }
    if (visible && animate) scheduleFrame();
  }
  function onThemeChange() {
    buildLut();
    paint();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", currentTheme() === "dark" ? "#0b0a1a" : "#fbfaff");
  }
  new MutationObserver(onThemeChange).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  systemDark.addEventListener("change", onThemeChange);
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      if (heroVisible) scheduleFrame();
    }, { threshold: 0 }).observe(hero);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else scheduleFrame();
  });
  resize();
  onThemeChange();

  // The page still works when a browser cannot provide a modal dialog.
  if (typeof lab.showModal !== "function") return;
  function updateStatus() {
    playBtn.textContent = playing ? "Pause" : "Play";
    status.textContent = playing ? "Running · 26,000 particles" : "Static frame · change a parameter or press Play";
  }
  function syncControls() {
    parameters.forEach(name => {
      document.getElementById("chaos-" + name).value = coords[name];
      document.getElementById("chaos-" + name + "-value").value = coords[name].toFixed(2);
    });
    updateStatus();
  }
  function redraw() {
    // Coalesce rapid slider events; reseed once at the next rendered frame.
    dirty = true;
    scheduleFrame();
  }
  function openLab() {
    if (document.querySelector("dialog[open]")) return;
    returnFocus = document.activeElement;
    setMenu(false);
    lab.showModal();
    document.body.classList.add("chaos-open");
    viewport.append(canvas);
    clearTimeout(resizeTimer);
    buildLut();
    resize();
    syncControls();
  }
  unlock.hidden = false;
  unlock.addEventListener("click", openLab);
  document.getElementById("chaos-close").addEventListener("click", () => lab.close());
  lab.addEventListener("close", () => {
    document.body.classList.remove("chaos-open");
    hero.prepend(canvas);
    clearTimeout(resizeTimer);
    buildLut();
    resize();
    updateNavSize();
    const target = returnFocus?.isConnected && returnFocus !== document.body && !returnFocus.closest("[inert]") ? returnFocus : document.querySelector(".nav__brand");
    target.focus({ preventScroll: true });
  });
  lab.addEventListener("click", (e) => {
    if (e.target !== lab) return;
    const rect = lab.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) lab.close();
  });
  parameters.forEach(name => {
    document.getElementById("chaos-" + name).addEventListener("input", (e) => {
      coords[name] = Number(e.target.value);
      document.getElementById("chaos-" + name + "-value").value = coords[name].toFixed(2);
      presetSelect.value = "custom";
      redraw();
    });
  });
  presetSelect.addEventListener("change", () => {
    if (!presets[presetSelect.value]) return;
    coords = { ...presets[presetSelect.value] };
    syncControls();
    redraw();
  });
  paletteSelect.addEventListener("change", () => {
    palette = paletteSelect.value;
    buildLut();
    paint();
  });
  playBtn.addEventListener("click", () => {
    playing = !playing;
    updateStatus();
    scheduleFrame();
  });
  document.getElementById("chaos-reset").addEventListener("click", () => {
    coords = { ...presets.stable };
    palette = "neon";
    playing = !reducedMotion;
    presetSelect.value = "stable";
    paletteSelect.value = "neon";
    buildLut();
    syncControls();
    redraw();
  });
  document.getElementById("chaos-save").addEventListener("click", () => {
    canvas.toBlob(blob => {
      if (!blob) { status.textContent = "Could not save this frame. Try again."; return; }
      const url = URL.createObjectURL(blob);
      const download = document.createElement("a");
      download.href = url;
      download.download = "chaos-lab.png";
      download.hidden = true;
      lab.append(download);
      download.click();
      download.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  });

  const sequence = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let buffer = [], lastKeyAt = 0;
  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey || document.querySelector("dialog[open]")) return;
    if (e.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    if (Date.now() - lastKeyAt > 2500) buffer = [];
    lastKeyAt = Date.now();
    buffer.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    buffer = buffer.slice(-sequence.length);
    if (buffer.join("|") === sequence.join("|")) { buffer = []; openLab(); }
  });
})();
