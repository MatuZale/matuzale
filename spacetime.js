// Journey background: a black hole sitting in a sheet of spacetime, and now and then a particle passing it.
// Units are the Schwarzschild radius, rₛ = 1 (G = c = 1, so M = 1/2). The sheet is the familiar rubber-sheet
// picture, a wide well (depth ∝ −1/r^0.6) that fades away into the page; it is an illustration. The particles
// are exact: each follows a Schwarzschild geodesic in its own orbital plane, tilted against the sheet, in
// Cartesian form
//   matter:  r̈ = −M r⃗/r³ − 3M h² r⃗/r⁵   (the orbit equation u″ + u = M/h² + 3M u²)
//   light:   r̈ = −3M h² r⃗/r⁵            (u″ + u = 3M u²)
// with h the angular momentum, so bound orbits precess into rosettes, close flybys are flung round and slow
// or near-head-on ones fall in. Loaded by script.js when Journey comes near; it animates only on screen.

const M = .5;
const SHEET = 40;                     // the sheet runs to ±SHEET rₛ, fading long before
const DEPTH = 6;                      // depth of the well at the horizon
const HOLE = 1.25;                    // drawn radius of the black hole
const CENTRE = -DEPTH + HOLE;         // the hole sits in the bottom of the well
const LIFT = .85;                     // vertical scale on screen
const COS30 = Math.cos(Math.PI / 6);
const PACE = 20;                      // simulation time per second
const SPAWN = 7;                      // seconds between particles
const MOST = 3;                       // particles at once
const TRAIL = 18;                     // seconds of path kept behind a particle
const FRAME = 1000 / 30;

const height = r => -DEPTH / Math.max(r, 1) ** .6;
const fade = r => { const t = Math.min(1, Math.max(0, (r - 7) / 23)); return 1 - t * t * (3 - 2 * t); };
const depthOf = (x, y, z) => LIFT * (x + y) + z;             // larger is nearer the viewer
const rand = (a, b) => a + Math.random() * (b - a);

// A new particle on a geodesic, in its own plane through the hole. The plane is tilted up to ~30° from the
// sheet and turned at random; (x, y) are coordinates in that plane.
function spawn() {
  const roll = Math.random();
  let x, y, vx, vy, light = false, life = Infinity;
  if (roll < .5) {
    // Bound: from apoapsis ra with the angular momentum that turns it round at periapsis rp.
    const rp = rand(4.6, 6), ra = rand(9, 13);
    const h2 = (1 / ra - 1 / rp) / ((1 - 1 / ra) / ra ** 2 - (1 - 1 / rp) / rp ** 2);
    [x, y, vx, vy] = [ra, 0, 0, Math.sqrt(h2) / ra];
    life = rand(26, 36);
  } else {
    // Unbound, from far away: a flyby (h above the capture limit 2rₛ), a plunge, or now and then light.
    const kind = roll < .75 ? "flyby" : roll < .87 ? "plunge" : "light";
    const v = kind === "light" ? 1 : rand(.28, .36);
    const b = kind === "flyby" ? rand(8, 12) : kind === "plunge" ? rand(2.5, 5.5) : rand(2.9, 6);
    light = kind === "light";
    [x, y, vx, vy] = [-Math.sqrt(30 ** 2 - b * b), b, v, 0];
  }
  if (Math.random() < .5) { y = -y; vy = -vy; }
  const tilt = rand(-.5, .5), turn = rand(0, 2 * Math.PI), spin = rand(0, 2 * Math.PI);
  // In-plane axes e1, e2: the sheet's axes turned by `turn`, tilted by `tilt`, then the orbit turned by `spin`.
  const n1 = [Math.cos(turn), Math.sin(turn), 0], n2 = [-Math.sin(turn) * Math.cos(tilt), Math.cos(turn) * Math.cos(tilt), Math.sin(tilt)];
  const e1 = n1.map((v, i) => v * Math.cos(spin) + n2[i] * Math.sin(spin));
  const e2 = n1.map((v, i) => -v * Math.sin(spin) + n2[i] * Math.cos(spin));
  return { x, y, vx, vy, h2: (x * vy - y * vx) ** 2, light, e1, e2, age: 0, life, alive: true, trail: [] };
}

function advance(p, time) {
  const acc = (x, y) => {
    const r2 = x * x + y * y, r = Math.sqrt(r2), r5 = r2 * r2 * r;
    const k = -3 * M * p.h2 / r5 - (p.light ? 0 : M / (r2 * r));
    return [k * x, k * y];
  };
  for (let left = time, n = 0; left > 1e-9 && n < 400; n++) {
    const r = Math.hypot(p.x, p.y), v = Math.hypot(p.vx, p.vy);
    const dt = Math.min(left, .03 * r / v);
    const { x, y, vx, vy } = p;
    const [ax1, ay1] = acc(x, y);
    const [ax2, ay2] = acc(x + vx * dt / 2, y + vy * dt / 2);
    const [ax3, ay3] = acc(x + (vx + ax1 * dt / 2) * dt / 2, y + (vy + ay1 * dt / 2) * dt / 2);
    const [ax4, ay4] = acc(x + (vx + ax2 * dt / 2) * dt, y + (vy + ay2 * dt / 2) * dt);
    p.x += dt * (vx + dt / 6 * (ax1 + ax2 + ax3)); p.y += dt * (vy + dt / 6 * (ay1 + ay2 + ay3));
    p.vx += dt / 6 * (ax1 + 2 * ax2 + 2 * ax3 + ax4); p.vy += dt / 6 * (ay1 + 2 * ay2 + 2 * ay3 + ay4);
    left -= dt;
    const nr = Math.hypot(p.x, p.y);
    if (nr < HOLE || nr > 34) { p.alive = false; return; }
  }
}
const world = p => [0, 1, 2].map(i => p.x * p.e1[i] + p.y * p.e2[i] + (i === 2 ? CENTRE : 0));

export function startSpacetime(holder) {
  const still = document.createElement("canvas"), live = document.createElement("canvas");
  holder.append(still, live);
  const sctx = still.getContext("2d"), ctx = live.getContext("2d");
  let W = 0, H = 0, dpr = 1, S = 20, ox = 0, oy = 0, colours = {};
  const px = (x, y, z) => [ox + (x - y) * COS30 * S, oy + ((x + y) * .5 - z * LIFT) * S];

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
    const [cx, cy] = wide ? [W * .76, H * .5] : [W * .6, H - 80];
    ox = cx * dpr; oy = cy * dpr + CENTRE * LIFT * S;
  }

  // The still layer: a shadow in the well, the sheet (far half, hole, near half), the axes.
  function drawStill() {
    const c = sctx, { dark } = colours, [hx, hy] = px(0, 0, CENTRE), hr = HOLE * S;
    c.clearRect(0, 0, still.width, still.height);
    c.lineCap = c.lineJoin = "round";

    c.save(); c.translate(hx, hy); c.scale(1, .58);
    const shade = c.createRadialGradient(0, 0, 0, 0, 0, 9 * S);
    shade.addColorStop(0, dark ? "rgba(0,0,0,.55)" : "rgba(40,30,80,.14)"); shade.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = shade; c.beginPath(); c.arc(0, 0, 9 * S, 0, 2 * Math.PI); c.fill();
    c.restore();

    // Grid lines every rₛ, finer near the hole, cut into short pieces so each fades with its distance.
    const levels = 14, far = Array.from({ length: levels }, () => []), near = Array.from({ length: levels }, () => []);
    const centreDepth = depthOf(0, 0, CENTRE);
    for (let k = -SHEET; k <= SHEET; k++) for (const along of [false, true]) {
      let prev = null;
      for (let s = -SHEET; s <= SHEET + 1e-9; s += Math.abs(s) < 6 && Math.abs(k) < 6 ? .1 : .5) {
        const x = along ? s : k, y = along ? k : s, r = Math.hypot(x, y);
        const point = r < 1 ? null : [x, y, height(r), r];
        if (prev && point) {
          const level = Math.round(fade((prev[3] + r) / 2) * (levels - 1));
          if (level > 0) {
            const mid = depthOf((prev[0] + x) / 2, (prev[1] + y) / 2, (prev[2] + point[2]) / 2);
            (mid < centreDepth ? far : near)[level].push(px(...prev), px(x, y, point[2]));
          }
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
    glow.addColorStop(0, `color-mix(in srgb, ${colours.a1} 35%, transparent)`); glow.addColorStop(1, "rgba(0,0,0,0)");
    c.globalAlpha = dark ? .5 : .3; c.fillStyle = glow; c.beginPath(); c.arc(hx, hy, hr * 2.2, 0, 2 * Math.PI); c.fill();
    c.globalAlpha = 1; c.fillStyle = dark ? "#000" : "#0b0a1a"; c.beginPath(); c.arc(hx, hy, hr, 0, 2 * Math.PI); c.fill();
    c.globalAlpha = dark ? .55 : .45; c.strokeStyle = colours.a1; c.lineWidth = dpr * 1.1;
    c.beginPath(); c.arc(hx, hy, hr * 1.04, 0, 2 * Math.PI); c.stroke();

    c.strokeStyle = colours.muted; c.lineWidth = dpr * .8;
    strokeLevels(near);

    // Axes: x and y along the sheet, falling into the well; z standing up out of the hole. Phones keep only
    // the picture.
    if (W < 800) return;
    c.strokeStyle = colours.text; c.fillStyle = colours.text; c.lineWidth = dpr;
    c.font = `500 ${11 * dpr}px ${colours.font}`; c.textAlign = "center"; c.textBaseline = "middle";
    for (const along of [false, true]) {
      for (let s = -16; s < 16; s += .1) {
        const a = along ? [s, 0] : [0, s], b = along ? [s + .1, 0] : [0, s + .1], r = Math.hypot(...a);
        if (r < 1) continue;
        c.globalAlpha = .3 * Math.max(0, 1 - r / 15) ** 1.5;
        c.beginPath(); c.moveTo(...px(...a, height(r))); c.lineTo(...px(...b, height(Math.hypot(...b)))); c.stroke();
      }
      for (const t of [-5, 5]) {
        const [x, y] = along ? [t, 0] : [0, t];
        c.globalAlpha = .4 * fade(Math.abs(t));
        const [sx, sy] = px(x, y, height(Math.abs(t)));
        c.fillText(String(t).replace("-", "−"), sx, sy + 11 * dpr);
      }
      const [lx, ly] = px(...(along ? [12, 0] : [0, 12]), height(12));
      c.globalAlpha = .45; c.fillText(along ? "x / rₛ" : "y / rₛ", lx, ly);
    }
    const [zx, zy] = px(0, 0, CENTRE + HOLE * 1.1), [tx, ty] = px(0, 0, 7);
    const zLine = c.createLinearGradient(zx, zy, tx, ty);
    zLine.addColorStop(0, colours.text); zLine.addColorStop(1, "rgba(0,0,0,0)");
    c.globalAlpha = .32; c.strokeStyle = zLine; c.beginPath(); c.moveTo(zx, zy); c.lineTo(tx, ty); c.stroke();
    c.globalAlpha = .45; c.fillText("z", tx, ty - 10 * dpr);
    c.globalAlpha = 1;
  }

  // Particles: a plain dot and a long thin path that fades with age; dimmer below the sheet and hidden
  // behind the hole.
  const particles = [];
  let clock = 0, nextSpawn = 0;
  function step(dt) {
    clock += dt;
    if (clock >= nextSpawn && particles.filter(p => p.alive).length < MOST) { particles.push(spawn()); nextSpawn = clock + SPAWN * rand(.7, 1.3); }
    for (const p of particles) {
      if (p.alive) {
        advance(p, dt * PACE);
        p.age += dt;
        if (p.age > p.life) p.alive = false;
        if (p.alive) p.trail.push({ at: world(p), t: clock });
      }
      while (p.trail.length && clock - p.trail[0].t > TRAIL) p.trail.shift();
    }
    for (let i = particles.length - 1; i >= 0; i--) if (!particles[i].alive && !particles[i].trail.length) particles.splice(i, 1);
  }

  function visibility([x, y, z]) {
    const [sx, sy] = px(x, y, z), [hx, hy] = px(0, 0, CENTRE);
    if (Math.hypot(sx - hx, sy - hy) < HOLE * S && depthOf(x, y, z) < depthOf(0, 0, CENTRE)) return 0;
    return z < height(Math.hypot(x, y)) ? .6 : 1;
  }

  function drawLive() {
    const c = ctx, { dark } = colours;
    c.clearRect(0, 0, live.width, live.height);
    c.lineCap = "round";
    for (const p of particles) {
      const colour = p.light ? colours.a3 : colours.a2, n = p.trail.length;
      const birth = Math.min(1, p.age / 1.5), death = p.alive ? Math.min(1, (p.life - p.age) / 3) : 0;
      // The path, in a few alpha steps.
      const steps = 8, paths = Array.from({ length: steps }, () => []);
      for (let i = 1; i < n; i++) {
        const a = p.trail[i - 1], b = p.trail[i];
        const age = 1 - (clock - b.t) / TRAIL, f = age ** 1.4 * visibility(b.at);
        const level = Math.round(f * (steps - 1));
        if (level > 0) paths[level].push(px(...a.at), px(...b.at));
      }
      c.strokeStyle = colour; c.lineWidth = dpr * 1.1;
      paths.forEach((pairs, level) => {
        if (!pairs.length) return;
        c.beginPath();
        for (let i = 0; i < pairs.length; i += 2) { c.moveTo(...pairs[i]); c.lineTo(...pairs[i + 1]); }
        c.globalAlpha = level / (steps - 1) * (dark ? .7 : .6); c.stroke();
      });
      if (p.alive && n) {
        const at = p.trail[n - 1].at, [x, y] = px(...at);
        c.globalAlpha = (dark ? .85 : .75) * birth * death * visibility(at);
        c.fillStyle = dark ? colours.text : colour;
        c.beginPath(); c.arc(x, y, 1.8 * dpr, 0, 2 * Math.PI); c.fill();
      }
    }
    c.globalAlpha = 1;
  }

  // Start with a particle already some way round, so the first view has a path in it.
  for (let i = 0; i < 300; i++) step(1 / 30);

  let raf = 0, last = 0, visible = false;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < FRAME) return;
    step(Math.min(now - last, 100) / 1000);
    last = now;
    drawLive();
  }
  function update() {
    const run = visible && !motion.matches;
    if (run && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function rebuild() { readColours(); layout(); drawStill(); drawLive(); }

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
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }).observe(holder);
}
