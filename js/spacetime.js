// Journey background: a black hole sitting in a sheet of spacetime, with things passing it now and then.
// Units are the Schwarzschild radius, rₛ = 1 (G = c = 1, so M = 1/2). The sheet is the familiar rubber-sheet
// picture, a wide well (depth ∝ −1/r^0.6) that fades away into the page; it is an illustration. The motion is
// not: every body follows the Schwarzschild equations of motion around the hole, written in Cartesian form
//   matter:  r̈ = −M r⃗/r³ − 3M h² r⃗/r⁵   (the orbit equation u″ + u = M/h² + 3M u²)
//   light:   r̈ = −3M h² r⃗/r⁵            (u″ + u = 3M u²)
// with h = |r⃗ × v⃗|, so bound orbits precess into rosettes, close flybys are flung round and slow or
// near-head-on ones fall in. On top of that, planets and a rare heavy visitor pull on the rest with softened
// Newtonian gravity, and swallow whatever runs into them.
//
// The cast: plain particles (most of the time), light (a short wake that winds up behind it), planets on
// wide slow orbits, comets on long ones with a tail streaming back along their path, and very rarely a heavy,
// compact visitor. It digs its own dip in the sheet, sways the hole off centre and sends out a quadrupole
// ripple, a cartoon of a gravitational wave slowed right down so it can be seen.
//
// And, very rarely, a culmination: more and more matter gathers into a disk round the hole, the view sinks
// to 10° above it and closes in, and the sheet falls away while every particle of the disk is shown where
// its light reaches us round the hole (luminet.js): the disk's far side rises over the hole, a thin ring
// hugs the shadow, the side turning towards us shines. Left to glow like an exposure as they orbit, the
// particles build up Jean-Pierre Luminet's 1979 picture of a black hole; then everything settles back.
// Loaded by script.js when Journey comes near; it animates only on screen.

import { makeLens } from "./luminet.js";

const M = .5;
const SHEET = 32;                     // the sheet runs to ±SHEET rₛ; it has faded out by r ≈ 30
const DEPTH = 6;                      // depth of the well at the horizon
const HOLE = 1.25;                    // drawn radius of the black hole
const CENTRE = -DEPTH + HOLE;         // the hole sits in the bottom of the well
const LIFT = .85;                     // vertical scale on screen
const COS30 = Math.cos(Math.PI / 6);
const ISO = Math.atan(Math.SQRT1_2);  // the usual view: isometric, 35.26° above the sheet
const PACE = 20;                      // simulation time per second
const FRAME = 1000 / 30;

// Who turns up and how often (seconds), and how long a path stays behind each.
const SPAWN = 7, MOST = 3;
const PLANETS = [24, 42], COMETS = [28, 50];
// The rare ones come at random, like decays: at every moment the same small chance, so anyone may be lucky
// early, and the longer Journey is watched the likelier they get. Mean waits in seconds of watching. The
// heavy visitor: 15 s for the first (three in four who stay 20 s see it), then 150 s. The culmination:
// 480 s (a 6% chance in the first 30 s), and none for 120 s after one.
const HEAVY_FIRST = 15, HEAVY_AGAIN = 150, SHOW_MEAN = 480, SHOW_REST = 120;
const TAPE_PHOTON_MEAN = 180, TAPE_PHOTON_REST = 80;
const TAPE_COLOURS = ["#ffbf35", "#ff763d", "#ed466d", "#bb51ce", "#8264e6"];
const chance = (mean, dt) => Math.random() < 1 - Math.exp(-dt / mean);
const KEEP = { matter: 18, light: 3.5, planet: 12, comet: 10, heavy: 14 };
// Masses that pull on the rest (the hole is M = 0.5), softened so a close pass flings rather than spikes.
// The hole answers the heavy visitor at about a third of the pull: it is heavier, so it only sways.
const PLANET_MASS = .08, HEAVY_MASS = .3, SOFT = .5, SWAY = .35;
// The heavy visitor's dip in the sheet, its drawn size, and its ripple: speed on screen (rₛ per second,
// far below light, so the ripple can be watched), period of its ringing (seconds) and height.
const HEAVY_DEPTH = 2.6, HEAVY_SIZE = .7, WAVE_SPEED = 6, WAVE_PERIOD = .9, WAVE_HEIGHT = .9;
// The culmination: the low view, 10° above the sheet, closer in and moved a little to the right, away from
// the timeline's text; how many grains of fine matter make the disk; and its timeline in seconds: matter
// gathers, the view sinks and closes in while the lens takes over, the picture holds, and the view rises.
const LOW = 10 * Math.PI / 180, CLOSE = 1.3, PAN = .07, DUST = 1300;
const T = { gather: 16, dive: [11, 17], lens: [12, 17], sheetOut: [13, 17], dim: [15, 18], caption: [18.5, 20],
  captionOut: [26.5, 28], unlens: [28, 33], rise: [28.5, 34], dustOut: [30.5, 33.5], sheetIn: [30, 34],
  undim: [30, 33], end: 34 };

const fade = r => { const t = Math.min(1, Math.max(0, (r - 7) / 23)); return 1 - t * t * (3 - 2 * t); };
const rand = (a, b) => a + Math.random() * (b - a);
const norm = v => Math.hypot(...v);
const along = (p, v, t) => [p[0] + v[0] * t, p[1] + v[1] * t, p[2] + v[2] * t];
const ease = (t, [a, b]) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };

// Colours from the theme's hex tokens, mixed in JS so canvas never has to parse color-mix().
const rgb = hex => { const h = hex.replace("#", ""); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const mix = (a, b, t) => { const [p, q] = [rgb(a), rgb(b)]; return `rgb(${p.map((v, i) => Math.round(v + (q[i] - v) * t)).join(",")})`; };
const rgba = (hex, a) => `rgba(${rgb(hex).join(",")},${a})`;

/* ───────── Bodies ───────── */

// Bound orbit from apoapsis ra, with the angular momentum that turns it round at periapsis rp: the two
// turning points of (dr/dτ)² = E² − (1 − rₛ/r)(1 + h²/r²).
function bound(rp, ra) {
  const h2 = (1 / ra - 1 / rp) / ((1 - 1 / ra) / ra ** 2 - (1 - 1 / rp) / rp ** 2);
  return [ra, 0, 0, Math.sqrt(h2) / ra];
}
// From 30 rₛ out, heading in with impact parameter b and speed v.
const fromAfar = (b, v) => [-Math.sqrt(30 ** 2 - b * b), b, v, 0];

// Start (x, y, vx, vy) given in a plane through the hole, tilted up to maxTilt from the sheet and turned at
// random, then carried into 3D (positions relative to the hole's centre).
function launch(kind, [x, y, vx, vy], maxTilt, extra = {}) {
  if (Math.random() < .5) { y = -y; vy = -vy; }
  const tilt = rand(-maxTilt, maxTilt), turn = rand(0, 2 * Math.PI), spin = rand(0, 2 * Math.PI);
  const n1 = [Math.cos(turn), Math.sin(turn), 0], n2 = [-Math.sin(turn) * Math.cos(tilt), Math.cos(turn) * Math.cos(tilt), Math.sin(tilt)];
  const e1 = n1.map((v, i) => v * Math.cos(spin) + n2[i] * Math.sin(spin));
  const e2 = n1.map((v, i) => -v * Math.sin(spin) + n2[i] * Math.cos(spin));
  return {
    kind, pos: e1.map((v, i) => x * v + y * e2[i]), vel: e1.map((v, i) => vx * v + vy * e2[i]),
    mass: 0, age: 0, life: Infinity, alive: true, trail: [], keep: KEEP[kind], ...extra,
  };
}

function spawnParticle() {
  const roll = Math.random();
  if (roll < .5) return launch("matter", bound(rand(4.6, 6), rand(9, 13)), .5, { life: rand(26, 36) });
  if (roll < .75) return launch("matter", fromAfar(rand(8, 12), rand(.28, .36)), .5);         // flyby
  if (roll < .87) return launch("matter", fromAfar(rand(2.5, 5.5), rand(.28, .36)), .5);      // falls in
  return launch("light", fromAfar(rand(2.9, 6), 1), .5);
}
// Five nearby rays with the same initial direction; each is then integrated independently.
function spawnTapePhotons() {
  const ray = launch("light", fromAfar(rand(8.5, 10.5), 1), .25);
  // A direction across the view, projected perpendicular to the rays' velocity.
  let across = [1, -1, 0];
  let dot = across.reduce((sum, v, i) => sum + v * ray.vel[i], 0);
  across = across.map((v, i) => v - dot * ray.vel[i]);
  if (norm(across) < .2) {
    across = [0, 0, 1];
    dot = across.reduce((sum, v, i) => sum + v * ray.vel[i], 0);
    across = across.map((v, i) => v - dot * ray.vel[i]);
  }
  const length = norm(across);
  across = across.map(v => v / length);
  return TAPE_COLOURS.map((colour, i) => ({
    ...ray, pos: along(ray.pos, across, (i - 2) * .6), vel: [...ray.vel], trail: [], colour,
  }));
}
const spawnPlanet = () => launch("planet", bound(rand(8, 10.5), rand(11.5, 14.5)), .3, {
  life: rand(45, 60), mass: PLANET_MASS, radius: rand(.32, .45),
  look: { tone: Math.floor(rand(0, 3)), ring: Math.random() < .4, tilt: rand(-.45, -.15) },
});
const spawnComet = () => launch("comet", bound(rand(4.5, 6), rand(24, 29)), .6, { life: rand(40, 55) });
const spawnHeavy = () => launch("heavy", fromAfar(rand(9, 12), rand(.3, .36)), .25, { mass: HEAVY_MASS, radius: HEAVY_SIZE });
// Matter gathering into a disk for the culmination: near-circular orbits close to the sheet, v² = M/(r − 3M),
// all turning the same way, so that from the low view the side coming towards us is on the left, as in
// Luminet's picture. Now and then something falls straight in, or light passes.
function spawnGathering(life) {
  const roll = Math.random();
  if (roll < .12) return launch("light", fromAfar(rand(2.9, 6), 1), .15);
  if (roll < .27) return launch("matter", fromAfar(rand(2.5, 5.5), rand(.28, .36)), .15, { life, keep: 6 });
  const r = rand(3.2, 11.5), v = Math.sqrt(M / (r - 3 * M)) * rand(.97, 1.03), a = rand(0, 2 * Math.PI), tilt = rand(-.05, .05);
  const c = Math.cos(tilt), t = Math.sin(tilt);
  return {
    kind: "matter", pos: [r * Math.cos(a), r * Math.sin(a) * c, r * Math.sin(a) * t],
    vel: [v * Math.sin(a), -v * Math.cos(a) * c, -v * Math.cos(a) * t],
    mass: 0, age: 0, life, alive: true, trail: [], keep: 6,
  };
}

// Acceleration of a body at p with velocity v (relative to the hole): the hole, then the other masses.
function accel(body, p, v, pullers) {
  const [x, y, z] = p, r2 = x * x + y * y + z * z, r = Math.sqrt(r2);
  const hx = y * v[2] - z * v[1], hy = z * v[0] - x * v[2], hz = x * v[1] - y * v[0];
  const k = -3 * M * (hx * hx + hy * hy + hz * hz) / (r2 * r2 * r) - (body.kind === "light" ? 0 : M / (r2 * r));
  const a = [k * x, k * y, k * z];
  if (body.kind === "light") return a;
  for (const q of pullers) {
    if (q === body) continue;
    const d = [q.pos[0] - x, q.pos[1] - y, q.pos[2] - z], d2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2 + SOFT * SOFT;
    const f = q.mass / (d2 * Math.sqrt(d2));
    a[0] += f * d[0]; a[1] += f * d[1]; a[2] += f * d[2];
  }
  return a;
}

// RK4 in steps short enough for the tightest pass, against the hole or any of the masses. A body that runs
// into a planet or the visitor is swallowed (the visitor only by the hole, a planet only by the visitor).
const swallows = (q, body) => q !== body && body.kind !== "heavy" && !(q.kind === "planet" && body.kind === "planet");
function advance(body, time, pullers) {
  for (let left = time, n = 0; left > 1e-9 && n < 400; n++) {
    let reach = norm(body.pos);
    for (const q of pullers) if (q !== body) reach = Math.min(reach, Math.hypot(q.pos[0] - body.pos[0], q.pos[1] - body.pos[1], q.pos[2] - body.pos[2]) + SOFT);
    const dt = Math.min(left, .03 * reach / norm(body.vel));
    const p = body.pos, v = body.vel;
    const a1 = accel(body, p, v, pullers);
    const v2 = along(v, a1, dt / 2), a2 = accel(body, along(p, v, dt / 2), v2, pullers);
    const v3 = along(v, a2, dt / 2), a3 = accel(body, along(p, v2, dt / 2), v3, pullers);
    const v4 = along(v, a3, dt), a4 = accel(body, along(p, v3, dt), v4, pullers);
    body.pos = p.map((x, i) => x + dt / 6 * (v[i] + 2 * v2[i] + 2 * v3[i] + v4[i]));
    body.vel = v.map((x, i) => x + dt / 6 * (a1[i] + 2 * a2[i] + 2 * a3[i] + a4[i]));
    left -= dt;
    const r = norm(body.pos);
    if (r < HOLE || r > 34) { body.alive = false; return; }
    for (const q of pullers) {
      if (!swallows(q, body)) continue;
      if (Math.hypot(q.pos[0] - body.pos[0], q.pos[1] - body.pos[1], q.pos[2] - body.pos[2]) < q.radius) {
        body.alive = false; body.swallowedBy = q; return;
      }
    }
  }
}

/* ───────── The scene ───────── */

export function startSpacetime(holder) {
  const still = document.createElement("canvas"), live = document.createElement("canvas");
  holder.append(still, live);
  const sctx = still.getContext("2d"), ctx = live.getContext("2d");
  let W = 0, H = 0, dpr = 1, S = 20, cx0 = 0, cx = 0, cy = 0, colours = {};
  // The camera: orthographic, from 45° round, `tilt` above the sheet, `zoom` times closer, aimed at the hole,
  // which sits `pan` of the width to the right of its usual place. At the isometric tilt it is the drawing's
  // usual view, heights squeezed to LIFT.
  const cam = { tilt: ISO, zoom: 1, pan: 0 };
  let unit = S, kx = 0, ky = 0, kz = 0, dxy = LIFT, dz = 1;
  function aim() {
    unit = S * cam.zoom;
    cx = cx0 + cam.pan * W * dpr;
    kx = COS30 * unit;
    ky = .5 * Math.sin(cam.tilt) / Math.sin(ISO) * unit;
    kz = LIFT * Math.cos(cam.tilt) / Math.cos(ISO) * unit;
    dxy = LIFT * Math.cos(cam.tilt) / Math.cos(ISO);
    dz = Math.sin(cam.tilt) / Math.sin(ISO);
  }
  const px = (x, y, z) => [cx + (x - y) * kx, cy + (x + y) * ky - (z - CENTRE) * kz];
  const depthOf = (x, y, z) => dxy * (x + y) + dz * z;      // larger is nearer the viewer

  const bodies = [];
  const hole = { pos: [0, 0], vel: [0, 0] };       // the hole's sway off the middle, in the sheet's plane
  let ripple = [];                                  // what the heavy visitor sends out: {t, amp, phi}
  let flashes = [];                                 // something swallowed by a planet or the visitor: {by, t, body}
  let clock = 0, nextSpawn = 0, nextPlanet = 4, nextComet = rand(12, 25), nextTapePhotons = 0, heavySeen = false;
  let show = null, showDue = false, restUntil = 0, dim = 1;    // the culmination: {t, lens, ready, spawnAt}
  let dust = [], exposure = null, peak = 0;                       // its fine matter, and the plate it glows on
  const heavy = () => bodies.find(b => b.alive && b.kind === "heavy");
  const absolute = b => [b.pos[0] + hole.pos[0], b.pos[1] + hole.pos[1], b.pos[2] + CENTRE];

  // The sheet: the hole's well where the hole is now, the heavy visitor's dip, and its ripple, read at the
  // time it left the hole (so it travels outwards at WAVE_SPEED).
  function rippleAt(dx, dy, r) {
    if (!ripple.length) return 0;
    const t = clock - r / WAVE_SPEED;
    if (t < ripple[0].t || t > ripple[ripple.length - 1].t) return 0;
    let lo = 0, hi = ripple.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ripple[mid].t <= t) lo = mid; else hi = mid - 1; }
    // Rings that carry a quadrupole pattern (two crests round, turning with the visitor) outwards.
    const { amp, phi } = ripple[lo], pattern = .45 + .55 * Math.cos(2 * (Math.atan2(dy, dx) - phi));
    return WAVE_HEIGHT * amp * pattern * Math.sin(2 * Math.PI * t / WAVE_PERIOD) * Math.min(1, (r - 1) / 2) / Math.sqrt(1 + r / 8);
  }
  function sheetZ(x, y) {
    const dx = x - hole.pos[0], dy = y - hole.pos[1], r = Math.hypot(dx, dy);
    let z = -DEPTH / Math.max(r, 1) ** .6 + rippleAt(dx, dy, r);
    const h = heavy();
    if (h) {
      const [hx, hy] = absolute(h), d = Math.hypot(x - hx, y - hy);
      z -= HEAVY_DEPTH * Math.min(1, h.age / 3) / Math.max(d, .6) ** .6;
    }
    return z;
  }
  const lively = () => heavy() || ripple.length || norm(hole.pos) > .01 || norm(hole.vel) > 1e-4;

  function readColours() {
    const css = getComputedStyle(document.documentElement), v = name => css.getPropertyValue(name).trim();
    colours = { dark: parseInt(v("--bg").slice(1, 3), 16) < 128, text: v("--text"), muted: v("--muted"),
      a1: v("--accent"), a2: v("--accent-2"), a3: v("--accent-3"), font: v("--font-mono") };
  }

  // Where the hole sits and how big a unit is: right of the timeline on wide screens, low down on phones.
  function layout() {
    W = holder.clientWidth; H = holder.clientHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [still, live]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const wide = W >= 800;
    S = (wide ? Math.max(15, Math.min(22, W / 68)) : 11) * dpr;
    [cx0, cy] = (wide ? [W * .76, H * .5] : [W * .6, H - 80]).map(v => v * dpr);
    aim();
  }

  // The still layer: a shadow in the well, the sheet (far half, hole, near half), the axes. It is redrawn
  // every frame only while the sheet or the view is moving; otherwise once.
  function drawStill() {
    const c = sctx, { dark } = colours, [bx, by] = hole.pos, [hx, hy] = px(bx, by, CENTRE), hr = HOLE * unit;
    c.clearRect(0, 0, still.width, still.height);
    c.lineCap = c.lineJoin = "round";

    c.save(); c.translate(hx, hy); c.scale(1, .58 * ky / (.5 * unit));
    const shade = c.createRadialGradient(0, 0, 0, 0, 0, 9 * unit);
    shade.addColorStop(0, dark ? "rgba(0,0,0,.55)" : "rgba(40,30,80,.14)"); shade.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = shade; c.beginPath(); c.arc(0, 0, 9 * unit, 0, 2 * Math.PI); c.fill();
    c.restore();

    // Grid lines every rₛ, cut into short pieces so each fades with its distance. The points lie on one
    // lattice, every .1 rₛ near the hole, where the sheet bends hard, and every rₛ further out, where it is
    // all but flat, whether the sheet is moving or still, so nothing shifts when it comes to rest.
    const levels = 14, far = Array.from({ length: levels }, () => []), near = Array.from({ length: levels }, () => []);
    const holeDepth = depthOf(bx, by, CENTRE);
    for (let k = -SHEET; k <= SHEET; k++) for (const alongX of [false, true]) {
      let prev = null;
      for (let i = 0; i <= 20 * SHEET; i++) {
        const s = -SHEET + i / 10, x = alongX ? s : k, y = alongX ? k : s, r = Math.hypot(x - bx, y - by);
        if (r >= 7 && i % 10) continue;
        const level = Math.round(fade(r) * (levels - 1));
        const point = r < 1 || level === 0 ? null : [x, y, sheetZ(x, y), level];
        if (prev && point) {
          const mid = depthOf((prev[0] + x) / 2, (prev[1] + y) / 2, (prev[2] + point[2]) / 2);
          (mid < holeDepth ? far : near)[Math.min(prev[3], level)].push(px(...prev), px(x, y, point[2]));
        }
        prev = point;
      }
    }
    const strokeLevels = buckets => buckets.forEach((pairs, level) => {
      if (!pairs.length) return;
      c.beginPath();
      for (let i = 0; i < pairs.length; i += 2) { c.moveTo(...pairs[i]); c.lineTo(...pairs[i + 1]); }
      c.globalAlpha = level / (levels - 1) * (dark ? .34 : .3); c.stroke();
    });
    c.strokeStyle = colours.muted; c.lineWidth = dpr * .8;
    strokeLevels(far);

    // The hole: a black sphere with a thin, faint photon ring.
    const glow = c.createRadialGradient(hx, hy, hr * .9, hx, hy, hr * 2.2);
    glow.addColorStop(0, rgba(colours.a1, .35)); glow.addColorStop(1, "rgba(0,0,0,0)");
    c.globalAlpha = dark ? .5 : .3; c.fillStyle = glow; c.beginPath(); c.arc(hx, hy, hr * 2.2, 0, 2 * Math.PI); c.fill();
    c.globalAlpha = 1; c.fillStyle = dark ? "#000" : "#0b0a1a"; c.beginPath(); c.arc(hx, hy, hr, 0, 2 * Math.PI); c.fill();
    c.globalAlpha = dark ? .55 : .45; c.strokeStyle = colours.a1; c.lineWidth = dpr * 1.1;
    c.beginPath(); c.arc(hx, hy, hr * 1.04, 0, 2 * Math.PI); c.stroke();

    c.strokeStyle = colours.muted; c.lineWidth = dpr * .8;
    strokeLevels(near);

    // Axes, fixed in space (so a sway of the hole shows against them): x and y along the sheet, falling into
    // the well; z standing up through the middle. Phones keep only the picture.
    if (W < 800) { c.globalAlpha = 1; return; }
    c.strokeStyle = colours.text; c.fillStyle = colours.text; c.lineWidth = dpr;
    c.font = `500 ${11 * dpr}px ${colours.font}`; c.textAlign = "center"; c.textBaseline = "middle";
    for (const alongX of [false, true]) {
      for (let s = -15; s < 15; s += .1) {
        const step = .1, a = alongX ? [s, 0] : [0, s], b = alongX ? [s + step, 0] : [0, s + step];
        const r = Math.hypot(a[0] - bx, a[1] - by);
        if (r < 1) continue;
        c.globalAlpha = .3 * Math.max(0, 1 - Math.hypot(...a) / 15) ** 1.5;
        c.beginPath(); c.moveTo(...px(...a, sheetZ(...a))); c.lineTo(...px(...b, sheetZ(...b))); c.stroke();
      }
      for (const t of [-5, 5]) {
        const [x, y] = alongX ? [t, 0] : [0, t], [sx, sy] = px(x, y, sheetZ(x, y));
        c.globalAlpha = .4 * fade(Math.abs(t));
        c.fillText(String(t).replace("-", "−"), sx, sy + 11 * dpr);
      }
      const end = alongX ? [12, 0] : [0, 12], [lx, ly] = px(...end, sheetZ(...end));
      c.globalAlpha = .45; c.fillText(alongX ? "x / rₛ" : "y / rₛ", lx, ly);
    }
    const [zx, zy] = px(0, 0, CENTRE + HOLE * 1.1), [tx, ty] = px(0, 0, 7);
    const zLine = c.createLinearGradient(zx, zy, tx, ty);
    zLine.addColorStop(0, colours.text); zLine.addColorStop(1, "rgba(0,0,0,0)");
    c.globalAlpha = .32; c.strokeStyle = zLine; c.beginPath(); c.moveTo(zx, zy); c.lineTo(tx, ty); c.stroke();
    c.globalAlpha = .45; c.fillText("z", tx, ty - 10 * dpr);
    c.globalAlpha = 1;
  }

  /* ───────── Time ───────── */

  // `roll` is false while the scene warms up unseen: the rare ones are only drawn for while someone watches.
  function step(dt, roll = true) {
    clock += dt;
    const alive = kind => bodies.some(b => b.alive && b.kind === kind);
    if (show) {
      gather();
      for (const d of dust) d.a += d.w * dt * PACE;
    } else {
      if (clock >= nextSpawn && bodies.filter(b => b.alive && (b.kind === "matter" || b.kind === "light")).length < MOST) {
        bodies.push(spawnParticle()); nextSpawn = clock + SPAWN * rand(.7, 1.3);
      }
      if (clock >= nextPlanet && !alive("planet")) { bodies.push(spawnPlanet()); nextPlanet = clock + rand(...PLANETS); }
      if (clock >= nextComet && !alive("comet")) { bodies.push(spawnComet()); nextComet = clock + rand(...COMETS); }
      // A culmination drawn while the sheet is busy waits for it to settle; no visitor comes meanwhile.
      if (roll && !showDue && clock >= restUntil && W >= 800 && chance(SHOW_MEAN, dt)) showDue = true;
      if (roll && !showDue && !alive("heavy") && !lively() && chance(heavySeen ? HEAVY_AGAIN : HEAVY_FIRST, dt)) {
        bodies.push(spawnHeavy()); heavySeen = true;
      }
      if (roll && !showDue && !lively() && clock >= nextTapePhotons && !bodies.some(b => b.alive && b.colour) && chance(TAPE_PHOTON_MEAN, dt)) {
        bodies.push(...spawnTapePhotons()); nextTapePhotons = clock + TAPE_PHOTON_REST;
      }
      if (showDue && !lively() && W >= 800) { showDue = false; beginShow(); }
    }

    const pullers = bodies.filter(b => b.alive && b.mass);
    for (const b of bodies) if (b.alive) {
      advance(b, dt * PACE, pullers);
      b.age += dt;
      if (b.age > b.life) b.alive = false;
      if (b.swallowedBy) { flashes.push({ by: b.swallowedBy, t: clock, body: b }); b.swallowedBy = null; }
    }
    flashes = flashes.filter(f => clock - f.t < .9);
    swayHole(dt * PACE);
    for (const b of bodies) {
      if (b.alive) b.trail.push({ at: absolute(b), t: clock });
      while (b.trail.length && clock - b.trail[0].t > b.keep) b.trail.shift();
    }
    for (let i = bodies.length - 1; i >= 0; i--) if (!bodies[i].alive && !bodies[i].trail.length) bodies.splice(i, 1);

    // The ripple: the visitor's angle round the hole and how hard it is swinging, recorded as it goes.
    const h = heavy();
    if (h) {
      const d = norm(h.pos);
      ripple.push({ t: clock, amp: Math.min(1, (7 / d) ** 2) * Math.min(1, h.age / 3), phi: Math.atan2(h.pos[1], h.pos[0]) });
    } else if (ripple.length && clock - ripple[ripple.length - 1].t > 40 / WAVE_SPEED) ripple = [];
  }

  // The visitor tugs the hole; a soft spring and damping ease it back to the middle afterwards.
  function swayHole(time) {
    const h = heavy(), n = 4, dt = time / n;
    for (let i = 0; i < n; i++) {
      let ax = -.0004 * hole.pos[0] - .03 * hole.vel[0], ay = -.0004 * hole.pos[1] - .03 * hole.vel[1];
      if (h) {
        const d2 = h.pos[0] ** 2 + h.pos[1] ** 2 + h.pos[2] ** 2 + SOFT * SOFT, f = SWAY * h.mass / (d2 * Math.sqrt(d2));
        ax += f * h.pos[0]; ay += f * h.pos[1];
      }
      hole.vel[0] += ax * dt; hole.vel[1] += ay * dt;
      hole.pos[0] += hole.vel[0] * dt; hole.pos[1] += hole.vel[1] * dt;
    }
    // Once it has all but stopped, it stays where it is: snapping the last hundredth of rₛ back to the middle
    // would show as a twitch of the sheet.
    if (!h && norm(hole.pos) < .01 && norm(hole.vel) < 1e-4) hole.vel = [0, 0];
  }

  /* ───────── The culmination ───────── */

  function beginShow() {
    if (show) return;
    show = { t: 0, lens: makeLens(), ready: false, spawnAt: 0 };
    dust = []; peak = 0;
  }
  // Matter arrives faster and faster, from every 1.2 s to every 0.08 s (some 65 bodies in all), and the fine
  // matter with it, up to DUST grains; the disk's bodies last until the lens has taken over.
  function gather() {
    const t = Math.min(show.t, T.gather), q = .07;
    const due = Math.round(DUST * (q ** (-t / T.gather) - 1) / (1 / q - 1));
    while (dust.length < due) dust.push(grain());
    if (show.t >= T.gather || show.t < show.spawnAt) return;
    bodies.push(spawnGathering(T.dim[1] + 1 - show.t + rand(0, 1)));
    show.spawnAt = show.t + 1.2 * q ** (show.t / T.gather);
  }
  // A grain of the disk on a circular orbit (an exact solution of the equations of motion above), even over
  // the disk's area, turning the same way as the gathering matter.
  function grain() {
    const r = Math.sqrt(rand(3.2 ** 2, 10.5 ** 2));
    return { r, a: rand(0, 2 * Math.PI), w: -Math.sqrt(M / (r - 3 * M)) / r, z: rand(-.03, .03) * r, born: show.t };
  }
  // The show's clock, in seconds; it waits for the lens's table if tracing it took longer than gathering.
  function runShow(dt) {
    if (!show.ready) show.ready = show.lens.work(4);
    if (show.t < T.lens[0] || show.ready) show.t = Math.min(show.t + dt, show.ready ? Infinity : T.lens[0]);
    const t = show.t, low = ease(t, T.dive) - ease(t, T.rise);
    cam.tilt = ISO + (LOW - ISO) * low;
    cam.zoom = 1 + (CLOSE - 1) * low;
    cam.pan = PAN * low;
    aim();
    still.style.opacity = String(1 - ease(t, T.sheetOut) + ease(t, T.sheetIn));
    dim = 1 - ease(t, T.dim) + ease(t, T.undim);
    if (t >= T.end) endShow();
  }
  function endShow() {
    show = null; dust = []; exposure = null; dim = 1;
    cam.tilt = ISO; cam.zoom = 1; cam.pan = 0; aim();
    still.style.opacity = "";
    restUntil = clock + SHOW_REST;
  }
  const viewMoving = () => !!show && (show.t > T.dive[0] && show.t < T.sheetOut[1] || show.t > T.rise[0]);

  // The disk's fine matter. From the usual view, dots where the grains are; as the view sinks, each moves to
  // where its light reaches us round the hole, with a second image beyond it, drawn as often as its light
  // and the lens's spreading of it allow (a squeezed image gets few dots, as its light is spread thin), and
  // left to glow a while like an exposure on a plate, so the picture builds up as the grains orbit.
  const sky = new Float64Array(6), skyR = new Float64Array(6), skyA = new Float64Array(6);
  function drawDust(dt) {
    const t = show.t, lensed = show.ready ? ease(t, T.lens) - ease(t, T.unlens) : 0, gone = 1 - ease(t, T.dustOut);
    if (!exposure || exposure.width !== live.width || exposure.height !== live.height) {
      exposure = Object.assign(document.createElement("canvas"), { width: live.width, height: live.height });
    }
    const g = exposure.getContext("2d");
    if (lensed < .02) g.clearRect(0, 0, exposure.width, exposure.height);
    else {
      g.globalCompositeOperation = "destination-out";
      g.fillStyle = `rgba(0,0,0,${1 - Math.exp(-dt / (.9 * lensed))})`;
      g.fillRect(0, 0, exposure.width, exposure.height);
      g.globalCompositeOperation = "source-over";
    }
    g.fillStyle = colours.text;
    const ct = Math.cos(cam.tilt), st = Math.sin(cam.tilt), R2 = Math.SQRT2, size = Math.max(1.2, 1.5 * dpr);
    const [hx, hy] = px(hole.pos[0], hole.pos[1], CENTRE), perM = COS30 * R2 * unit / 2;
    // The lens works in M (rₛ = 2M), on the sky as seen down the camera's line of sight; the disk spins
    // clockwise seen from above (ŵ = −z).
    const look = (rM, a, out) => {
      const c = Math.cos(a), s = Math.sin(a);
      return show.lens.images(rM, ct * (c + s) / R2, (c - s) / R2, -st * (c + s) / R2, -(ct / R2) * (c - s), out);
    };
    let brightest = 0;
    for (const d of dust) {
      const born = Math.min(1, (t - d.born) / 1.5) * gone;
      const at = [d.r * Math.cos(d.a) + hole.pos[0], d.r * Math.sin(d.a) + hole.pos[1], d.z + CENTRE], [sx, sy] = px(...at);
      const plain = (1 - lensed) * .55 * visibility(at);
      if (lensed < .02) { g.globalAlpha = born * plain; g.fillRect(sx - size / 2, sy - size / 2, size, size); continue; }
      const rM = 2 * d.r, seen = look(rM, d.a, sky), seenR = look(rM + .1, d.a, skyR), seenA = look(rM, d.a + .004, skyA);
      for (const [bit, i] of [[1, 0], [2, 3]]) {
        if (!(seen & bit)) { if (bit === 1) { g.globalAlpha = born * plain; g.fillRect(sx - size / 2, sy - size / 2, size, size); } continue; }
        brightest = Math.max(brightest, sky[i + 2]);
        let p = 0;
        if (seenR & seenA & bit && peak) {
          const ux = skyR[i] - sky[i], uy = skyR[i + 1] - sky[i + 1], vx = skyA[i] - sky[i], vy = skyA[i + 1] - sky[i + 1];
          const spread = Math.abs(ux * vy - uy * vx) / (rM * .1 * .004) / st;   // sky area per disk area, against plain projection
          p = Math.min(1, .45 * spread * Math.sqrt(sky[i + 2] / peak));
        }
        const lit = Math.random() < p ? .9 : 0, lx = hx + sky[i] * perM, ly = hy - sky[i + 1] * perM;
        const x = bit === 1 ? sx + (lx - sx) * lensed : lx, y = bit === 1 ? sy + (ly - sy) * lensed : ly;
        g.globalAlpha = born * (bit === 1 ? plain + lensed * lit : lensed * lit);
        if (g.globalAlpha > .01) g.fillRect(x - size / 2, y - size / 2, size, size);
      }
    }
    peak = Math.max(peak * .995, brightest);
    g.globalAlpha = 1;
    ctx.drawImage(exposure, 0, 0);

    const caption = document.documentElement.lang === "pl"
      ? ["pierwszy symulowany obraz czarnej dziury (J.-P. Luminet, 1979)", "odtworzony na żywo z cząstek tej symulacji"]
      : ["the first simulated image of a black hole (J.-P. Luminet, 1979)", "recreated live from the particles of this simulation"];
    ctx.globalAlpha = .55 * ease(t, T.caption) * (1 - ease(t, T.captionOut));
    if (ctx.globalAlpha > .01) {
      ctx.fillStyle = colours.text; ctx.font = `500 ${11 * dpr}px ${colours.font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const half = Math.max(...caption.map(line => ctx.measureText(line).width)) / 2 + 16 * dpr;
      caption.forEach((line, i) => ctx.fillText(line, Math.min(hx, live.width - half), hy + 11.5 * perM + (12 + 15 * i) * dpr));
    }
    ctx.globalAlpha = 1;
  }

  /* ───────── Drawing the bodies ───────── */

  // Dimmer below the sheet, hidden behind the hole.
  function visibility([x, y, z]) {
    const [sx, sy] = px(x, y, z), [hx, hy] = px(hole.pos[0], hole.pos[1], CENTRE);
    if (Math.hypot(sx - hx, sy - hy) < HOLE * unit && depthOf(x, y, z) < depthOf(hole.pos[0], hole.pos[1], CENTRE)) return 0;
    return z < sheetZ(x, y) ? .6 : 1;
  }

  const planetColour = look => [mix(colours.a1, "#ffa94d", .45), colours.a2, colours.a3][look.tone];
  const cometColour = () => colours.dark ? mix(colours.a3, "#ffffff", .5) : colours.a3;
  const pathColour = b => b.colour || ({ matter: colours.a2, light: colours.a3, planet: b.look && planetColour(b.look), comet: cometColour(), heavy: colours.muted })[b.kind];
  const pathStrength = { matter: 1, light: 1, planet: .45, comet: .5, heavy: .45 };

  // A path fading towards its tail, in fine alpha steps (coarse ones show as bands on long paths).
  function drawPath(b) {
    const c = ctx, steps = 24, paths = Array.from({ length: steps }, () => []);
    for (let i = 1; i < b.trail.length; i++) {
      const a = b.trail[i - 1], z = b.trail[i];
      const f = (1 - (clock - z.t) / b.keep) ** 1.4 * visibility(z.at) * pathStrength[b.kind];
      const level = Math.round(f * (steps - 1));
      if (level > 0) paths[level].push(px(...a.at), px(...z.at));
    }
    c.strokeStyle = pathColour(b); c.lineWidth = dpr * 1.1;
    paths.forEach((pairs, level) => {
      if (!pairs.length) return;
      c.beginPath();
      for (let i = 0; i < pairs.length; i += 2) { c.moveTo(...pairs[i]); c.lineTo(...pairs[i + 1]); }
      c.globalAlpha = level / (steps - 1) * (colours.dark ? .7 : .6) * dim; c.stroke();
    });
  }

  // A sphere lit from the upper left, a few times the size of a particle; some have a thin ring, its far
  // half behind the planet.
  function drawPlanet(b, x, y, seen) {
    const c = ctx, look = b.look, r = b.radius * unit, base = planetColour(look);
    const ring = (from, to) => {
      c.beginPath(); c.ellipse(x, y, r * 2.1, r * .6, look.tilt, from, to);
      c.strokeStyle = base; c.lineWidth = dpr * .9; c.globalAlpha = seen * .55; c.stroke();
    };
    if (look.ring) ring(Math.PI, 2 * Math.PI);
    const shade = c.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
    shade.addColorStop(0, "rgba(255,255,255,.9)"); shade.addColorStop(.35, base); shade.addColorStop(1, "rgba(0,0,0,.85)");
    c.globalAlpha = seen * .9; c.fillStyle = shade;
    c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill();
    if (look.ring) ring(0, Math.PI);
  }

  // A bright point with a tail streaming back along its path: the hole has no solar wind to blow it aside.
  // The tail grows as the comet speeds up past the hole.
  function drawComet(b, at, seen) {
    const c = ctx, length = Math.min(5, Math.max(1.2, norm(b.vel) * 9));
    c.strokeStyle = cometColour(); c.lineCap = "round";
    for (let i = b.trail.length - 1, gone = 0; i > 0 && gone < length; i--) {
      const a = b.trail[i].at, z = b.trail[i - 1].at, u = gone / length;
      gone += Math.hypot(a[0] - z[0], a[1] - z[1], a[2] - z[2]);
      c.globalAlpha = seen * .7 * (1 - u) ** 1.6; c.lineWidth = dpr * (2.4 - 1.9 * u);
      c.beginPath(); c.moveTo(...px(...a)); c.lineTo(...px(...z)); c.stroke();
    }
    const [x, y] = px(...at);
    c.globalAlpha = seen * .9; c.fillStyle = colours.dark ? "#fff" : colours.a3;
    c.beginPath(); c.arc(x, y, 2 * dpr, 0, 2 * Math.PI); c.fill();
  }

  // The heavy visitor: a smaller black sphere with a thin teal ring.
  function drawHeavy(x, y, seen) {
    const c = ctx, r = HEAVY_SIZE * unit;
    c.globalAlpha = seen; c.fillStyle = colours.dark ? "#000" : "#0b0a1a";
    c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill();
    c.globalAlpha = seen * .6; c.strokeStyle = colours.a3; c.lineWidth = dpr;
    c.beginPath(); c.arc(x, y, r * 1.08, 0, 2 * Math.PI); c.stroke();
  }

  function drawLive(dt = 0) {
    const c = ctx, { dark } = colours;
    c.clearRect(0, 0, live.width, live.height);
    c.lineCap = "round";
    for (const b of bodies) drawPath(b);
    // A brief ring where something was swallowed, following the planet or visitor that took it.
    for (const f of flashes) {
      const u = (clock - f.t) / .9, [x, y] = px(...absolute(f.by));
      c.globalAlpha = .55 * (1 - u) ** 2 * dim; c.strokeStyle = pathColour(f.body); c.lineWidth = dpr;
      c.beginPath(); c.arc(x, y, f.by.radius * unit + u * 9 * dpr, 0, 2 * Math.PI); c.stroke();
    }
    // Heads, far ones first.
    const heads = bodies.filter(b => b.alive && b.trail.length).map(b => ({ b, at: b.trail[b.trail.length - 1].at }));
    heads.sort((p, q) => depthOf(...p.at) - depthOf(...q.at));
    for (const { b, at } of heads) {
      const born = { planet: 4, comet: 3, heavy: 3 }[b.kind] || 1.5, dying = b.kind === "planet" ? 5 : 3;
      const seen = Math.min(1, b.age / born) * Math.min(1, (b.life - b.age) / dying) * visibility(at) * dim, [x, y] = px(...at);
      if (b.kind === "planet") drawPlanet(b, x, y, seen);
      else if (b.kind === "comet") drawComet(b, at, seen);
      else if (b.kind === "heavy") drawHeavy(x, y, Math.min(1, b.age / born) * dim);
      else {
        c.globalAlpha = (dark ? .85 : .75) * seen;
        c.fillStyle = b.colour || (dark ? colours.text : pathColour(b));
        c.beginPath(); c.arc(x, y, 1.8 * dpr, 0, 2 * Math.PI); c.fill();
      }
    }
    c.globalAlpha = 1;
    if (show && dust.length) drawDust(dt);
  }

  // Start with a particle and a planet already some way round, so the first view has paths in it.
  for (let i = 0; i < 300; i++) step(1 / 30, false);

  let raf = 0, last = 0, visible = false, settled = true;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < FRAME) return;
    const dt = Math.min(now - last, 100) / 1000;
    step(dt);
    if (show) runShow(dt);
    last = now;
    // While the visitor is about, or the view moves, the sheet is redrawn every frame; then once more.
    const moving = lively() || viewMoving();
    if (moving || !settled) { drawStill(); settled = !moving; }
    drawLive(dt);
  }
  function update() {
    const run = visible && !document.hidden && !motion.matches && !document.documentElement.classList.contains("is-tape-paused");
    if (run && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function rebuild() { readColours(); layout(); exposure = null; drawStill(); drawLive(); }

  // For trying things out from the console: document.querySelector(".spacetime").summon("heavy"), or
  // summon("luminet") for the culmination.
  holder.summon = kind => {
    if (kind === "luminet") { if (W >= 800) beginShow(); return; }
    if (kind === "tape-photons") {
      if (visible && !document.hidden && !motion.matches && !document.documentElement.classList.contains("is-tape-paused") && !show && !bodies.some(b => b.alive && b.colour)) {
        bodies.push(...spawnTapePhotons()); nextTapePhotons = clock + TAPE_PHOTON_REST;
        return true;
      }
      return false;
    }
    bodies.push({ particle: spawnParticle, planet: spawnPlanet, comet: spawnComet, heavy: spawnHeavy }[kind]());
  };

  rebuild();
  document.fonts?.ready.then(rebuild);
  let size = `${holder.clientWidth}x${holder.clientHeight}`;
  new ResizeObserver(() => {
    const now = `${holder.clientWidth}x${holder.clientHeight}`;
    if (now !== size) { size = now; rebuild(); }
  }).observe(holder);
  new MutationObserver(rebuild).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", rebuild);
  motion.addEventListener("change", update);
  document.addEventListener("visibilitychange", update);
  document.addEventListener("tape-pause-change", update);
  // A fast tape wind can queue an exit and an entry together: the last one is the current view.
  new IntersectionObserver(entries => { visible = entries[entries.length - 1].isIntersecting; update(); }).observe(holder);
}
