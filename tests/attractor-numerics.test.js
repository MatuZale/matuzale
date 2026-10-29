// Verify the actual lookup used by the hero against the original map's Math.sin/cos.
// Chaotic trajectories separate exponentially, so compare each mathematical step,
// not the positions of two clouds after many iterations.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../js/script.js', import.meta.url), 'utf8');
const start = source.indexOf('  const TRIG_SCALE =');
const end = source.indexOf('\n  const occupied =', start);
assert.ok(start >= 0 && end > start, 'attractor lookup is present');
const { lookup, sinTable, cosTable } = Function(`${source.slice(start, end)}\nreturn { lookup, sinTable, cosTable };`)();
let error = 0;
for (let i = 0; i <= 131072; i++) {
  const x = -8 + 16 * i / 131072;
  for (const [table, exact] of [[sinTable, Math.sin], [cosTable, Math.cos]]) {
    const value = lookup(table, x);
    assert.ok(Number.isFinite(value), `lookup(${x}) is finite`);
    error = Math.max(error, Math.abs(value - exact(x)));
  }
}
for (const x of [-1e-12, 0, 1e-12, -Math.PI, Math.PI, -Math.PI / 2, Math.PI / 2]) {
  assert.ok(Math.abs(lookup(sinTable, x) - Math.sin(x)) < 1.6e-7);
  assert.ok(Math.abs(lookup(cosTable, x) - Math.cos(x)) < 1.6e-7);
}
assert.ok(error < 1.6e-7, `maximum trigonometric error ${error}`);

// Cover both ends of the pointer/drift ranges, including paths across zero and
// near the bounds. Every next map value stays inside the lookup's ±8 domain.
for (const a of [-1.82, -1.28]) for (const b of [1.43, 1.97])
for (const c of [.94, 1.06]) for (const d of [.64, .76]) {
  let x = .999, y = -.999;
  for (let step = 0; step < 2000; step++) {
    const args = [a * y, a * x, b * x, b * y];
    assert.ok(args.every(v => Number.isFinite(v) && Math.abs(v) < 8), 'map argument stays in lookup range');
    const nextX = lookup(sinTable, args[0]) + c * lookup(cosTable, args[1]);
    const nextY = lookup(sinTable, args[2]) + d * lookup(cosTable, args[3]);
    const referenceX = Math.sin(args[0]) + c * Math.cos(args[1]);
    const referenceY = Math.sin(args[2]) + d * Math.cos(args[3]);
    assert.ok(Math.abs(nextX - referenceX) < 4e-7 && Math.abs(nextY - referenceY) < 4e-7, 'per-step map error');
    assert.ok(Math.abs(nextX) < 2.061 && Math.abs(nextY) < 1.761, 'map remains bounded');
    x = nextX; y = nextY;
  }
}
console.log(`attractor-numerics: finite across lookup range; max trig error ${error.toExponential(3)}; map bounds and per-step accuracy passed`);
