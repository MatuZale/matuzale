// Generates the foil-engraving motifs for the holographic project cards.
// Usage: node assets/holo/generate.js assets/holo
const fs = require('fs');
const out = process.argv[2];
const S = 10; // integer coordinates in a 10x viewBox keep files small
const TAU = Math.PI * 2;

function d(pts, closed) {
  let s = '', px = 0, py = 0, first = true, last = '';
  for (const [x, y] of pts) {
    const X = Math.round(x * S), Y = Math.round(y * S);
    if (first) { s += `M${X} ${Y}`; first = false; last = 'n'; }
    else {
      const dx = X - px, dy = Y - py;
      if (!dx && !dy) continue;
      if (last === 'n') s += 'l' + dx; else s += (dx < 0 ? `${dx}` : ` ${dx}`);
      s += dy < 0 ? `${dy}` : ` ${dy}`;
      last = 'num';
    }
    px = X; py = Y;
  }
  return s + (closed ? 'z' : '');
}
const path = (pts, w, o = 1, closed = false) =>
  `<path d="${d(pts, closed)}" stroke-width="${(w * S).toFixed(0)}"${o < 1 ? ` opacity="${o}"` : ''}/>`;
// `pad` widens the viewBox on every side, for motifs whose lines run past the 400x400 design square;
// a mask image is clipped to its viewBox, so anything outside it would end on a hard edge.
const svg = (body, note, pad = 0) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad * S} ${-pad * S} ${(400 + 2 * pad) * S} ${(400 + 2 * pad) * S}" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">\n<!-- ${note} -->\n${body}\n</svg>\n`;
const write = (name, body, note, pad) => fs.writeFileSync(`${out}/${name}.svg`, svg(body, note, pad));

// coldchain-mcp: isotherms around a cold spot. Every fifth line is an index contour.
{
  let b = '';
  for (let k = 0; k < 22; k++) {
    const r0 = 10 + k * 12.5, pts = [];
    for (let i = 0; i <= 260; i++) {
      const t = (i / 260) * TAU;
      const r = r0 * (1 + (.05 + k * .006) * Math.sin(2 * t + .4 + k * .12) + .045 * Math.sin(3 * t + 1.7 - k * .09) + .018 * Math.sin(5 * t + k * .3));
      pts.push([215 + r * Math.cos(t), 215 + r * .86 * Math.sin(t)]);
    }
    b += path(pts, k % 5 === 2 ? 1.7 : .8, +(1 - k * .022).toFixed(2), true);
  }
  write('isotherms', b, 'Isotherms around a cold spot', 100); // outer rings reach x -94..498
}

// Personal finance: a banknote-style guilloche rosette.
{
  let b = '';
  const band = (R, A, B, N, M, count, w, o) => {
    for (let c = 0; c < count; c++) {
      const ph = (c / count) * TAU, pts = [], steps = N * 24;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * TAU;
        const r = R + A * Math.sin(N * t + ph) + B * Math.sin(M * t + ph / N);
        pts.push([200 + r * Math.cos(t), 200 + r * Math.sin(t)]);
      }
      b += path(pts, w, o, true);
    }
  };
  band(158, 24, 5, 20, 4, 6, .7, 1);
  band(104, 17, 4, 15, 3, 5, .65, .85);
  band(55, 10, 2, 9, 2, 4, .6, .7);
  write('guilloche', b, 'Guilloche rosette');
}

// Student-performance pipeline: a bundle of streams squeezed through one stage, then clusters.
{
  let b = '';
  const n = 24;
  for (let i = 0; i < n; i++) {
    const u = i - (n - 1) / 2, pts = [];
    for (let x = -10; x <= 410; x += 3.5) {
      const q = (x - 190) / 200;
      const spread = 1.6 + 9 * q * q + (q > 0 ? 5 * q * q * q : 0);
      pts.push([x, 205 + u * spread + 22 * Math.sin(x / 68 + .6) + 5 * Math.sin(x / 23 + i * .45) * q * q]);
    }
    b += path(pts, Math.abs(u) < 3 ? 1.1 : .75, +(1 - Math.abs(u) * .035).toFixed(2));
  }
  // deterministic clusters (t-SNE like) of small dots
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const g = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  let dots = '';
  for (const [cx, cy, s, count] of [[330, 92, 26, 26], [358, 318, 20, 18], [64, 330, 22, 16]]) {
    for (let k = 0; k < count; k++) dots += `<circle cx="${Math.round((cx + g() * s) * S)}" cy="${Math.round((cy + g() * s) * S)}" r="${Math.round((1 + rnd() * 1.6) * S)}"/>`;
  }
  b += `<g fill="#fff" stroke="none" opacity=".8">${dots}</g>`;
  write('streams', b, 'Data streams through a pipeline, then clusters');
}

// Pendulum Wave Chimes: a decaying harmonograph.
{
  let b = '';
  const P = t => {
    const e1 = Math.exp(-.011 * t), e2 = Math.exp(-.008 * t);
    return [200 + 150 * Math.sin(2.01 * t + .5) * e1 + 30 * Math.sin(6.02 * t + 1.1) * e2,
            200 + 150 * Math.sin(3 * t) * e2 + 24 * Math.sin(2 * t + 2.2) * e1];
  };
  const parts = [[0, 50, .8, 1], [50, 110, .7, .75], [110, 180, .6, .5]];
  for (const [a, z, w, o] of parts) {
    const pts = [];
    for (let t = a; t <= z; t += .04) pts.push(P(t));
    b += path(pts, w, o);
  }
  write('harmonograph', b, 'Decaying harmonograph');
}

// N-body simulator: precessing orbits around a heavy body.
{
  let b = '';
  const orbit = (p, e, prec, turns, rot, cx, cy, w, o) => {
    const pts = [];
    for (let i = 0; i <= turns * 220; i++) {
      const th = (i / 220) * TAU;
      const r = p / (1 + e * Math.cos(th * (1 - prec)));
      pts.push([cx + r * Math.cos(th + rot), cy + r * Math.sin(th + rot) * .9]);
    }
    b += path(pts, w, o);
  };
  orbit(78, .62, .085, 12, .3, 205, 200, .8, 1);
  orbit(34, .35, -.06, 6, 2.1, 205, 200, .7, .7);
  orbit(150, .2, .03, 3, 1.2, 205, 200, .6, .45);
  b += `<g fill="#fff" stroke="none"><circle cx="${205 * S}" cy="${200 * S}" r="${5 * S}"/><circle cx="${312 * S}" cy="${148 * S}" r="${2.6 * S}"/><circle cx="${180 * S}" cy="${236 * S}" r="${1.8 * S}"/><circle cx="${70 * S}" cy="${120 * S}" r="${2 * S}" opacity=".6"/></g>`;
  write('orbits', b, 'Precessing orbits');
}

// Interactive physics: two coherent sources and their interference fringes.
{
  let b = '<g stroke-width="' + (.75 * S).toFixed(0) + '">';
  for (const cx of [176, 224]) {
    for (let r = 9; r < 330; r += 11) b += `<circle cx="${cx * S}" cy="${300 * S}" r="${r * S}" opacity="${(1 - r / 400).toFixed(2)}"/>`;
  }
  b += '</g>';
  b += `<path d="M${100 * S} ${300 * S}h${64 * S}m${24 * S} 0h${24 * S}m${24 * S} 0h${64 * S}" stroke-width="${2.2 * S}"/>`;
  write('interference', b, 'Double-slit interference');
}
