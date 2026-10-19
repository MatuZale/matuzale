// The first picture of a black hole: Jean-Pierre Luminet's of 1979, a Schwarzschild black hole with a thin
// accretion disk, seen from 10° above the disk's plane and drawn in dots whose density follows the light
// that reaches the observer. It is computed his way. Every point of the plate is traced back along its ray,
//   u″ + u = 3M u²   (u = 1/r, against the angle swept round the hole),
// to where it first crosses the plane of the disk (the direct image) or, having gone round behind the hole,
// crosses it again (the secondary image: a thin ring hugging the shadow, and the disk's far underside below
// it). Rays that fall in leave the shadow, 3√3 M across in radius. The disk runs from the last stable orbit,
// 6M, out to 22M and shines with the Page–Thorne flux of a thin disk; its light is shifted by the orbital
// motion and by gravity, 1 + z = (1 + Ω b sin i cos α) / √(1 − 3M/r), and dimmed by (1 + z)⁴, so the side
// turning towards us is far the brightest. The dots follow the light on a print's tone curve (a square
// root), with a faint sprinkling over the plate as on the printed original, and the plate is cropped about
// as his was, its edges fading out.
// J.-P. Luminet, "Image of a spherical black hole with thin accretion disk", A&A 75, 228–235 (1979).
// Units: M = 1, so rₛ = 2. The plate is traced a slice at a time so that it never holds up a frame.

const INCLINATION = 80 * Math.PI / 180;      // between the line of sight and the disk's axis
const SIN_I = Math.sin(INCLINATION), COT_I = 1 / Math.tan(INCLINATION);
const R_IN = 6, R_OUT = 22;
const STEP = .02;                            // RK4 step in the swept angle
const RAYS = 40000;
const SQ3 = Math.sqrt(3), SQ6 = Math.sqrt(6);
// The plate's edges, in M, with the hole at the origin (x to the right, y up).
export const PLATE = { left: -17, right: 17, bottom: -10, top: 12 };

const rand = (a, b) => a + Math.random() * (b - a);
// The plate's edges fade out over the last 4M at the sides and 2.5M at the top and bottom.
function edge(x, y) {
  const s = t => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
  return s(Math.min(x - PLATE.left, PLATE.right - x) / 4) * s(Math.min(y - PLATE.bottom, PLATE.top - y) / 2.5);
}

// Page–Thorne flux of a thin disk round a Schwarzschild hole, up to a constant.
function flux(r) {
  const x = Math.sqrt(r);
  return (x - SQ6 + SQ3 / 2 * Math.log((x + SQ3) * (SQ6 - SQ3) / ((x - SQ3) * (SQ6 + SQ3)))) / ((r - 3) * r ** 2.5);
}

// Where the ray seen at impact parameter b and angle α on the plate meets the disk, or 0. Seen from the
// observer, the ray's plane holds the line of sight and the direction α; it crosses the disk's plane where
// tan ψ = −cot i / sin α, and again half a turn later.
function crossing(b, alpha) {
  if (b > R_OUT + 3) return 0;
  const first = Math.atan2(COT_I, -Math.sin(alpha));
  let u = 0, v = 1 / b, psi = 0;
  for (const target of [first, first + Math.PI]) {
    while (psi < target) {
      const h = Math.min(STEP, target - psi);
      const k1u = v, k1v = 3 * u * u - u;
      const u2 = u + h / 2 * k1u, k2u = v + h / 2 * k1v, k2v = 3 * u2 * u2 - u2;
      const u3 = u + h / 2 * k2u, k3u = v + h / 2 * k2v, k3v = 3 * u3 * u3 - u3;
      const u4 = u + h * k3u, k4u = v + h * k3v, k4v = 3 * u4 * u4 - u4;
      u += h / 6 * (k1u + 2 * k2u + 2 * k3u + k4u);
      v += h / 6 * (k1v + 2 * k2v + 2 * k3v + k4v);
      psi += h;
      if (u <= 0 || u >= .5) return 0;     // out to infinity, or into the horizon
    }
    const r = 1 / u;
    if (r >= R_IN && r <= R_OUT) return r;
  }
  return 0;
}

// The light from radius r that reaches the plate at (b, α).
function light(r, b, alpha) {
  const shift = (1 + r ** -1.5 * b * SIN_I * Math.cos(alpha)) / Math.sqrt(1 - 3 / r);
  return flux(r) / shift ** 4;
}

// Traces the plate in slices: work(ms) traces for about that long and returns true once the dots are ready,
// as [x, y, x, y, …] in M, in a random order, so that plotting them in turn fills the picture evenly.
export function makePlate() {
  const hits = [];
  let traced = 0, peak = 0, dots = null;
  return {
    get dots() { return dots; },
    work(ms) {
      if (dots) return true;
      const end = performance.now() + ms;
      while (traced < RAYS && performance.now() < end) {
        for (let k = 0; k < 250 && traced < RAYS; k++, traced++) {
          const x = rand(PLATE.left, PLATE.right), y = rand(PLATE.bottom, PLATE.top);
          const b = Math.hypot(x, y), alpha = Math.atan2(y, x), r = crossing(b, alpha);
          if (!r) continue;
          const seen = light(r, b, alpha);
          hits.push(x, y, seen);
          if (seen > peak) peak = seen;
        }
      }
      if (traced < RAYS) return false;
      dots = develop(hits, peak);
      return true;
    },
  };
}

function develop(hits, peak) {
  const out = [];
  for (let i = 0; i < hits.length; i += 3) {
    const x = hits[i], y = hits[i + 1];
    if (Math.random() < Math.sqrt(hits[i + 2] / peak) * edge(x, y)) out.push(x, y);
  }
  // The print's sprinkling, leaving the shadow clear.
  for (let i = 0; i < 900; i++) {
    const x = rand(PLATE.left, PLATE.right), y = rand(PLATE.bottom, PLATE.top);
    if (Math.hypot(x, y) > 3 * SQ3 + .6 && Math.random() < edge(x, y)) out.push(x, y);
  }
  for (let i = out.length / 2 - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[2 * i], out[2 * j]] = [out[2 * j], out[2 * i]];
    [out[2 * i + 1], out[2 * j + 1]] = [out[2 * j + 1], out[2 * i + 1]];
  }
  return Float32Array.from(out);
}
