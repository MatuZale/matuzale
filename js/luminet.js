// The lens of a Schwarzschild black hole, for showing the Journey's particles as a far observer sees them:
// where each one appears and how bright, as Jean-Pierre Luminet worked it out for the first picture of a
// black hole with a thin accretion disk (1979). Light from a point at radius r reaches the observer along
// a ray whose orbit obeys
//   u″ + u = 3M u²   (u = 1/r, against the angle ψ swept round the hole),
// coming in from the observer's side. The direct image is the ray that has swept γ, the angle between the
// point and the line of sight; the secondary image goes round the other side of the hole, sweeping 2π − γ,
// and is hidden if on the way it crosses the disk where the disk is (as in Luminet's picture). Rays below
// the critical impact parameter, 3√3 M, fall in: that is the shadow. A table of rays, traced once, gives
// the impact parameter b for any (r, ψ); the image sits at b, in the direction of the point.
// The light: the Page–Thorne flux of a thin disk, F(r), shifted by the orbital motion and by gravity,
// 1 + z = (1 − Ω L_spin) / √(1 − 3M/r), and dimmed by (1 + z)⁴, so the side turning towards us is far the
// brightest (L_spin is the ray's angular momentum along the disk's spin, Ω = √(M/r³)).
// J.-P. Luminet, "Image of a spherical black hole with thin accretion disk", A&A 75, 228–235 (1979).
// Units: M = 1, so rₛ = 2. The table is traced a slice at a time so that it never holds up a frame.

const DPSI = Math.PI / 360, K = 721;         // ψ from 0 to 2π, every half degree
const B_CRIT = 3 * Math.sqrt(3);
const R_IN = 6, R_OUT = 23;                  // where the disk is, for hiding secondary images behind it
const SQ3 = Math.sqrt(3), SQ6 = Math.sqrt(6);

// Page–Thorne flux of a thin disk round a Schwarzschild hole, up to a constant; none inside the last stable
// orbit at 6M.
export function flux(r) {
  if (r <= 6) return 0;
  const x = Math.sqrt(r);
  return (x - SQ6 + SQ3 / 2 * Math.log((x + SQ3) * (SQ6 - SQ3) / ((x - SQ3) * (SQ6 + SQ3)))) / ((r - 3) * r ** 2.5);
}

// Impact parameters for the table: rays that fall in, a dense run just outside the critical one (they make
// the thin rings round the shadow), then out to 60M.
function impacts() {
  const b = [];
  for (let i = 0; i < 160; i++) b.push(.2 + (B_CRIT - .202) * i / 159);
  for (let i = 0; i < 300; i++) b.push(B_CRIT + 1e-5 * (3e5) ** (i / 299));
  for (let i = 1; i <= 400; i++) b.push((B_CRIT + 3) * (60 / (B_CRIT + 3)) ** (i / 400));
  return Float64Array.from(b);
}

export function makeLens() {
  const bs = impacts(), J = bs.length;
  // rs[j·K + k]: the radius the ray of impact parameter bs[j] has reached after sweeping k·Δψ; 0 once it has
  // fallen in, Infinity while it is still far off or once it has escaped. Down each column, r grows with b.
  const rs = new Float32Array(J * K);
  let traced = 0;

  function trace(j) {
    const row = j * K, h = DPSI / 2;
    let u = 0, v = 1 / bs[j], k = 1, fate = "";
    rs[row] = Infinity;
    for (; k < K && !fate; k++) {
      for (let n = 0; n < 2; n++) {
        const k1u = v, k1v = 3 * u * u - u;
        const u2 = u + h / 2 * k1u, k2u = v + h / 2 * k1v, k2v = 3 * u2 * u2 - u2;
        const u3 = u + h / 2 * k2u, k3u = v + h / 2 * k2v, k3v = 3 * u3 * u3 - u3;
        const u4 = u + h * k3u, k4u = v + h * k3v, k4v = 3 * u4 * u4 - u4;
        u += h / 6 * (k1u + 2 * k2u + 2 * k3u + k4u);
        v += h / 6 * (k1v + 2 * k2v + 2 * k3v + k4v);
      }
      if (u >= .5) fate = "in";                   // into the horizon
      else if (u <= 0) fate = "out";              // back out to infinity
      rs[row + k] = fate === "in" ? 0 : fate === "out" ? Infinity : 1 / u;
    }
    for (; k < K; k++) rs[row + k] = fate === "out" ? Infinity : 0;
  }

  // The impact parameter of the ray that is at radius r after sweeping ψ, or 0 if there is none.
  function impact(r, psi) {
    const at = psi / DPSI, k0 = Math.min(K - 2, Math.floor(at)), w = at - k0;
    const b0 = column(r, k0), b1 = column(r, k0 + 1);
    if (!b0 || !b1) return b0 || b1;
    return b0 + (b1 - b0) * w;
  }
  function column(r, k) {
    let lo = 0, hi = J;                          // first j with rs ≥ r
    while (lo < hi) { const mid = (lo + hi) >> 1; if (rs[mid * K + k] >= r) hi = mid; else lo = mid + 1; }
    if (lo === 0 || lo === J) return 0;
    const below = rs[(lo - 1) * K + k], above = rs[lo * K + k];
    if (above === Infinity) return bs[lo - 1];     // the ray next out has already escaped
    if (below === 0) return bs[lo];                // the ray next in has already fallen in
    return bs[lo - 1] + (bs[lo] - bs[lo - 1]) * (r - below) / (above - below);
  }
  // The radius the ray of impact parameter b has reached after sweeping ψ.
  function radius(b, psi) {
    let lo = 0, hi = J;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (bs[mid] >= b) hi = mid; else lo = mid + 1; }
    const j = Math.max(1, Math.min(J - 1, lo)), k = Math.round(psi / DPSI);
    const a = rs[(j - 1) * K + k], c = rs[j * K + k];
    if (!isFinite(a) || !isFinite(c)) return Infinity;
    return a + (c - a) * (b - bs[j - 1]) / (bs[j] - bs[j - 1]);
  }
  const shine = (r, spin) => flux(r) * (Math.sqrt(1 - 3 / r) / (1 - r ** -1.5 * spin)) ** 4;

  return {
    // Traces for about `ms` milliseconds; true once the table is complete.
    work(ms) {
      const end = performance.now() + ms;
      while (traced < J && performance.now() < end) trace(traced++);
      return traced === J;
    },
    // The images of a point at radius r (in M). `along` is cos γ, the cosine of its angle from the line of
    // sight; (ex, ey) its direction across the sky, of length sin γ; `spin` = (p̂ × ô)·ŵ for its direction p̂,
    // the line of sight ô and the disk's spin axis ŵ. Writes [x, y, light] for the direct image into out[0..2]
    // and for the secondary one into out[3..5] (x, y in M on the sky); returns which there are, 1 for the
    // direct, 2 for the secondary (the disk can hide it), 3 for both.
    images(r, along, ex, ey, spin, out) {
      const gamma = Math.acos(Math.max(-1, Math.min(1, along))), e = Math.hypot(ex, ey);
      if (e < 1e-9) return 0;
      let seen = 0;
      const b1 = impact(r, gamma);
      if (b1) { out[0] = b1 * ex / e; out[1] = b1 * ey / e; out[2] = shine(r, b1 * spin / e); seen |= 1; }
      const b2 = impact(r, 2 * Math.PI - gamma), crossed = b2 && radius(b2, Math.PI - gamma);
      if (b2 && !(crossed >= R_IN && crossed <= R_OUT)) {
        out[3] = -b2 * ex / e; out[4] = -b2 * ey / e; out[5] = shine(r, -b2 * spin / e); seen |= 2;
      }
      return seen;
    },
  };
}
