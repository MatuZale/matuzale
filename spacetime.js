// Journey background: light passing a Schwarzschild black hole, seen in isometric view.
// Units are the Schwarzschild radius, rₛ = 1. The sheet is the familiar rubber-sheet picture, a well of
// depth ∝ −1/r that is flat far away and plunges at the horizon; it is an illustration, not an embedding.
// The rays drawn on it are exact, though. Each one is a null geodesic: the orbit equation
// u″ + u = 3/2 rₛ u² (u = 1/r) integrated in its Cartesian form, so rays with impact parameter below
// b_c = 3√3/2 rₛ fall in and rays just above it wind round the photon sphere at 1.5 rₛ. A plane wavefront
// leaves the far edge every few seconds; photons move at the coordinate speed of light, so they slow down
// and fade (redshift) towards the horizon. Loaded by script.js when Journey comes near.

const R = 8;                          // half-width of the sheet, in rₛ
const DEPTH = 7;                      // depth of the well at the horizon
const LIFT = .8;                      // vertical scale of the sheet on screen
const COS30 = Math.cos(Math.PI / 6);
const B_CRIT = 3 * Math.sqrt(3) / 2;
// Impact parameters of the rays, a few of them just outside b_c so they loop round the photon sphere.
const IMPACTS = [...Array.from({ length: 21 }, (_, i) => -7.5 + i * .75), -2.62, 2.5985, 2.66].sort((a, b) => a - b);
const SPEED = 2.6;                    // world units of coordinate time per second
const EVERY = 7;                      // a new wavefront every EVERY units
const TRAIL = 2.4;                    // trail length, in units of coordinate time
const FRAME = 1000 / 30;

const height = r => -DEPTH / Math.max(r, 1);
const project = (x, y, z) => [(x - y) * COS30, (x + y) * .5 - z * LIFT];

// A null geodesic from the far edge (x = −R), heading along +x with offset b. In this form the photon
// feels a = −3/2 h² r⃗ / r⁵ with h = |b|, which gives exactly u″ + u = 3/2 u². Points are kept every
// ~0.07 rₛ with the coordinate time t to reach them.
function trace(b) {
  const h2 = b * b;
  const acc = (x, y) => { const r2 = x * x + y * y, k = -1.5 * h2 / (r2 * r2 * Math.sqrt(r2)); return [k * x, k * y]; };
  let x = -R, y = b, vx = 1, vy = 0, t = 0, kept = [x, y];
  const pts = [{ x, y, r: Math.hypot(x, y), t }];
  for (let step = 0; step < 60000; step++) {
    const r = Math.hypot(x, y), v = Math.hypot(vx, vy);
    const dl = Math.min(.04, .006 + .03 * (r - 1)) / v;
    const [ax1, ay1] = acc(x, y);
    const [ax2, ay2] = acc(x + vx * dl / 2, y + vy * dl / 2);
    const [ax3, ay3] = acc(x + (vx + ax1 * dl / 2) * dl / 2, y + (vy + ay1 * dl / 2) * dl / 2);
    const [ax4, ay4] = acc(x + (vx + ax2 * dl / 2) * dl, y + (vy + ay2 * dl / 2) * dl);
    const nx = x + dl * (vx + dl / 6 * (ax1 + ax2 + ax3)), ny = y + dl * (vy + dl / 6 * (ay1 + ay2 + ay3));
    vx += dl / 6 * (ax1 + 2 * ax2 + 2 * ax3 + ax4); vy += dl / 6 * (ay1 + 2 * ay2 + 2 * ay3 + ay4);
    const ds = Math.hypot(nx - x, ny - y);
    x = nx; y = ny;
    const nr = Math.hypot(x, y);
    t += ds / Math.max(.03, 1 - 1 / Math.max(nr, 1.0001));
    const captured = nr < 1.01, gone = Math.abs(x) > R || Math.abs(y) > R;
    if (captured || gone || Math.hypot(x - kept[0], y - kept[1]) > .07) {
      pts.push({ x, y, r: nr, t }); kept = [x, y];
    }
    if (captured || gone) break;
  }
  return pts;
}

// Grid lines of the sheet at every rₛ, broken where they cross the horizon.
function gridLines() {
  const lines = [];
  for (let c = -R; c <= R; c++) for (const along of [false, true]) {
    let line = [];
    for (let s = -R; s <= R + 1e-9; s += .1) {
      const x = along ? s : c, y = along ? c : s, r = Math.hypot(x, y);
      if (r < 1) { if (line.length > 1) lines.push(line); line = []; continue; }
      line.push([x, y, height(r)]);
    }
    if (line.length > 1) lines.push(line);
  }
  return lines;
}
const ring = r => Array.from({ length: 121 }, (_, i) => { const a = i / 120 * 2 * Math.PI; return [r * Math.cos(a), r * Math.sin(a), height(r)]; });

export function startSpacetime(canvas) {
  const rays = IMPACTS.map(trace);
  const grid = gridLines();
  const photonSphere = ring(1.5), horizon = ring(1);
  const tick = v => String(v).replace("-", "−");

  // Everything that is drawn, in world coordinates, decides the frame.
  const xLabels = [-8, -4, 0, 4, 8].map(v => ({ at: [v, R + 1, height(Math.hypot(v, R))], text: tick(v) }));
  const yLabels = [-8, -4, 0, 4, 8].map(v => ({ at: [R + 1, v, height(Math.hypot(v, R))], text: tick(v) }));
  const titles = [
    { at: [0, R + 2.8, height(R)], text: "x / rₛ" },
    { at: [R + 2.8, 0, height(R)], text: "y / rₛ" },
  ];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of [...grid.flat(), ...xLabels.map(l => l.at), ...yLabels.map(l => l.at), ...titles.map(l => l.at)]) {
    const [sx, sy] = project(...p);
    minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
  }
  minX -= .8; maxX += .8; minY -= .8; maxY += .6;
  canvas.style.aspectRatio = `${maxX - minX} / ${maxY - minY}`;

  const ctx = canvas.getContext("2d");
  const still = document.createElement("canvas"), sctx = still.getContext("2d");
  let scale = 1, dpr = 1, colours = {};
  const px = (x, y, z) => { const [sx, sy] = project(x, y, z); return [(sx - minX) * scale, (sy - minY) * scale]; };
  const lift = p => { const r = Math.hypot(p.x, p.y); return px(p.x, p.y, height(r)); };

  function readColours() {
    const css = getComputedStyle(document.documentElement), v = name => css.getPropertyValue(name).trim();
    const bg = v("--bg"), dark = parseInt(bg.slice(1, 3), 16) < 128;
    colours = { dark, text: v("--text"), muted: v("--muted"), a1: v("--accent"), a2: v("--accent-2"), a3: v("--accent-3"), font: v("--font-mono") };
  }

  const path = (c, points) => { c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); };

  // The still layer: sheet, rings, faint geodesics, labels.
  function drawStill() {
    const w = canvas.clientWidth;
    if (!w) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    scale = w / (maxX - minX) * dpr;
    canvas.width = still.width = Math.round(w * dpr);
    canvas.height = still.height = Math.round(w * (maxY - minY) / (maxX - minX) * dpr);
    const c = sctx, { dark } = colours;
    c.clearRect(0, 0, still.width, still.height);
    c.lineJoin = c.lineCap = "round";

    c.strokeStyle = colours.muted; c.lineWidth = dpr * .9; c.globalAlpha = dark ? .38 : .3;
    for (const line of grid) { path(c, line.map(p => px(...p))); c.stroke(); }

    c.strokeStyle = colours.a3; c.lineWidth = dpr; c.globalAlpha = dark ? .16 : .2;
    for (const ray of rays) { path(c, ray.map(lift)); c.stroke(); }

    // The horizon: the throat of the sheet, filled black.
    path(c, horizon.map(p => px(...p))); c.closePath();
    c.globalAlpha = dark ? .95 : .75; c.fillStyle = dark ? "#000" : colours.text; c.fill();
    c.globalAlpha = .8; c.strokeStyle = colours.a1; c.lineWidth = dpr * 1.4; c.stroke();
    c.setLineDash([4 * dpr, 4 * dpr]);
    path(c, photonSphere.map(p => px(...p))); c.globalAlpha = .7; c.strokeStyle = colours.a2; c.lineWidth = dpr * 1.2; c.stroke();
    c.setLineDash([]);

    // Labels and the near axes; a narrow canvas (phones) keeps only the picture.
    if (w < 520) { c.globalAlpha = 1; return; }
    const size = Math.max(10.5, Math.min(13, scale / dpr * .5)) * dpr;
    c.font = `500 ${size}px ${colours.font}`; c.fillStyle = colours.text; c.textAlign = "center"; c.textBaseline = "middle";
    c.globalAlpha = .55;
    for (const { at, text } of [...xLabels, ...yLabels, ...titles]) c.fillText(text, ...px(...at));
    c.strokeStyle = colours.text; c.lineWidth = dpr * 1.2; c.globalAlpha = .5;
    for (const edge of [grid.find(l => l[0][1] === R && l[0][0] === -R), grid.find(l => l[0][0] === R && l[0][1] === -R)]) {
      if (edge) { path(c, edge.map(p => px(...p))); c.stroke(); }
    }

    const leader = (from, dx, dy, text, align) => {
      const [x, y] = px(...from), tx = x + dx * size, ty = y + dy * size;
      c.globalAlpha = .45; c.lineWidth = dpr * .8; c.strokeStyle = colours.text;
      path(c, [[x, y], [tx, ty]]); c.stroke();
      c.globalAlpha = .7; c.textAlign = align; c.fillText(text, tx + (align === "left" ? .4 : -.4) * size, ty);
    };
    leader([-1.06, -1.06, height(1.5)], 2.6, -5.2, "photon sphere · 1.5 rₛ", "left");
    leader([.97, -.26, height(1)], 3, .3, "horizon · rₛ", "left");

    // The orbit equation, top right where the sheet leaves room.
    const right = still.width - size * .6;
    c.textAlign = "right"; c.globalAlpha = .7;
    c.fillText("u″ + u = 3/2 rₛ u²   (u = 1/r)", right, size * 1.2);
    c.globalAlpha = .5;
    c.fillText(`captured if b < 3√3/2 rₛ ≈ ${B_CRIT.toFixed(2)} rₛ`, right, size * 2.7);
    c.globalAlpha = 1;
  }

  // Photons: each wavefront is one pulse per ray, drawn as a fading trail behind a bright head.
  const edgeFade = p => Math.min(1, Math.max(0, (R - Math.max(Math.abs(p.x), Math.abs(p.y))) / 1.2));
  const redshift = r => Math.sqrt(Math.max(0, 1 - 1 / r));
  const indexAt = (pts, t) => { let lo = 0, hi = pts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (pts[mid].t <= t) lo = mid; else hi = mid - 1; } return lo; };
  function drawPhotons(clock) {
    const c = ctx, { dark } = colours;
    c.globalCompositeOperation = dark ? "lighter" : "source-over";
    c.lineCap = "round";
    for (const pts of rays) {
      const end = pts[pts.length - 1].t;
      for (let k = Math.max(0, Math.floor((clock - end - TRAIL) / EVERY)); k * EVERY <= clock; k++) {
        const head = clock - k * EVERY;
        if (head - TRAIL > end) continue;
        const i0 = indexAt(pts, Math.max(0, head - TRAIL)), i1 = indexAt(pts, Math.min(head, end));
        for (let i = i0; i < i1; i++) {
          const a = pts[i], b = pts[i + 1];
          const f = Math.max(0, (b.t - (head - TRAIL)) / TRAIL) ** 1.6 * edgeFade(b) * redshift(b.r);
          if (f < .02) continue;
          c.globalAlpha = f * (dark ? .75 : .6); c.strokeStyle = colours.a3; c.lineWidth = dpr * (1 + f * 1.4);
          path(c, [lift(a), lift(b)]); c.stroke();
        }
        if (head <= end) {
          const a = pts[i1], b = pts[Math.min(i1 + 1, pts.length - 1)], u = b.t > a.t ? (head - a.t) / (b.t - a.t) : 0;
          const p = { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
          const [x, y] = lift(p), glow = edgeFade(p) * redshift(Math.hypot(p.x, p.y));
          c.globalAlpha = glow * .25; c.fillStyle = colours.a1;
          c.beginPath(); c.arc(x, y, 5 * dpr, 0, 2 * Math.PI); c.fill();
          c.globalAlpha = glow * .95; c.fillStyle = dark ? "#fff" : colours.a2;
          c.beginPath(); c.arc(x, y, 1.7 * dpr, 0, 2 * Math.PI); c.fill();
        }
      }
    }
    c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
  }

  let clock = EVERY * .55, raf = 0, last = 0, visible = false;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(still, 0, 0);
    drawPhotons(clock);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < FRAME) return;
    clock += Math.min(now - last, 100) / 1000 * SPEED;
    last = now;
    render();
  }
  function update() {
    const run = visible && !motion.matches;
    if (run && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function rebuild() { readColours(); drawStill(); render(); }

  rebuild();
  document.fonts?.ready.then(rebuild);
  new ResizeObserver(() => { if (canvas.width !== Math.round(canvas.clientWidth * dpr)) rebuild(); }).observe(canvas);
  new MutationObserver(rebuild).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", rebuild);
  motion.addEventListener("change", update);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }).observe(canvas);
}
