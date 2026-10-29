// Repeatable local comparison of the live hero attractor on the same machine.
// Serve the repository first, e.g. `python3 -m http.server 4183`, then run:
//   node tests/attractor-benchmark.mjs --baseline 4315a36 --url http://127.0.0.1:4183 --samples 3
// Add `--motion reduce` to measure the 40-pass still picture's startup.
// Results are observational, not CI thresholds: browser, hardware, load and GPU matter.
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { webkit } from '@playwright/test';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, index, all) => {
  if (arg.startsWith('--')) pairs.push([arg.slice(2), all[index + 1]]);
  return pairs;
}, []));
const url = args.url || 'http://127.0.0.1:4183';
const ref = args.baseline || '4315a36';
const samples = Number(args.samples || 3);
const motion = args.motion || 'no-preference';
if (!Number.isInteger(samples) || samples < 1 || samples > 20) throw new Error('samples must be an integer from 1 to 20');
if (!['reduce', 'no-preference'].includes(motion)) throw new Error('motion must be reduce or no-preference');
const baseline = execFileSync('git', ['show', `${ref}:js/script.js`], { encoding: 'utf8' });
const browser = await webkit.launch({ headless: true });
console.log(JSON.stringify({ browser: `Playwright WebKit ${browser.version()}`, os: `${os.platform()} ${os.release()} ${os.arch()}`, cpu: os.cpus()[0]?.model, viewport: '1440x900', dpr: 2, motion, sampleSeconds: 11, baseline: ref, samples }));

function stats(values) {
  const a = values.toSorted((x, y) => x - y);
  if (!a.length) return null;
  const round = n => Math.round(n * 100) / 100;
  return { n: a.length, mean: round(a.reduce((x, y) => x + y, 0) / a.length), p50: round(a[Math.floor((a.length - 1) * .5)]), p95: round(a[Math.floor((a.length - 1) * .95)]), max: round(a.at(-1)) };
}
async function measure(variant, run) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark', reducedMotion: motion });
  if (variant === 'baseline') await page.route('**/js/script.js', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: baseline }));
  await page.addInitScript(() => {
    let random = 123456789;
    Math.random = () => { random = (1664525 * random + 1013904223) >>> 0; return random / 4294967296; };
    window.__attractorBench = { frames: [], callbacks: [], paints: [] };
    const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = function (callback) {
      // Only time the hero loop, without instrumenting unrelated site effects.
      const isAttractor = String(callback).includes('steady = !dirty');
      return raf.call(window, isAttractor ? function (time) {
        const start = performance.now(); callback(time);
        window.__attractorBench.callbacks.push({ time, ms: performance.now() - start });
      } : callback);
    };
    const put = CanvasRenderingContext2D.prototype.putImageData;
    CanvasRenderingContext2D.prototype.putImageData = function (...args) {
      const time = performance.now(); const result = put.apply(this, args);
      if (this.canvas.id === 'attractor') window.__attractorBench.paints.push({ time, ms: performance.now() - time });
      return result;
    };
    let previous = 0;
    function sample(time) {
      if (previous) window.__attractorBench.frames.push({ time, ms: time - previous });
      previous = time; raf.call(window, sample);
    }
    raf.call(window, sample);
  });
  await page.goto(`${url}/?lang=en`);
  await page.waitForTimeout(11000);
  const { samples: result, canvas } = await page.evaluate(() => ({ samples: window.__attractorBench, canvas: [document.querySelector('#attractor').width, document.querySelector('#attractor').height] }));
  for (const [name, from, to] of [['startup', 0, 3000], ['steady', 6000, 11000]]) {
    const inRange = list => list.filter(item => item.time >= from && item.time < to).map(item => item.ms);
    const frames = inRange(result.frames), callbacks = inRange(result.callbacks), paints = inRange(result.paints);
    const firstPictureAfterBackgroundMs = result.paints.length >= 2 ? result.paints[1].time - result.paints[0].time : null;
    console.log(JSON.stringify({ variant, run, phase: name, canvas, firstPictureAfterBackgroundMs: firstPictureAfterBackgroundMs === null ? null : Math.round(firstPictureAfterBackgroundMs), framesMs: stats(frames), attractorCallbackMs: stats(callbacks), putImageDataMs: stats(paints), frameGapsOver34ms: frames.filter(ms => ms > 34).length }));
  }
  await page.close();
}
try {
  // Alternate variants so trends in device temperature/load affect both.
  for (let i = 1; i <= samples; i++) {
    for (const variant of (i % 2 ? ['baseline', 'current'] : ['current', 'baseline'])) await measure(variant, i);
  }
} finally { await browser.close(); }
