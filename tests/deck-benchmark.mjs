// Observational benchmark, not a CI threshold. Start a local HTTP server and run:
//   node tests/deck-benchmark.mjs --url http://127.0.0.1:4182 --samples 2
//   node tests/deck-benchmark.mjs --url http://127.0.0.1:4182 --baseline HEAD --samples 2
// Add --profile desktop or --profile mobile to run one viewport only.
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { webkit } from '@playwright/test';

const pairs = process.argv.slice(2);
const args = Object.fromEntries(pairs.flatMap((arg, index) => arg.startsWith('--') ? [[arg.slice(2), pairs[index + 1]]] : []));
const url = args.url || 'http://127.0.0.1:4182';
const samples = Number(args.samples || 2);
const profile = args.profile || 'both';
if (!Number.isInteger(samples) || samples < 1 || samples > 20) throw new Error('samples must be from 1 to 20');
if (!['desktop', 'mobile', 'both'].includes(profile)) throw new Error('profile must be desktop, mobile or both');

// Compare only the deck assets: the portfolio may have unrelated working changes.
const baseline = args.baseline && Object.fromEntries(['js/deck.js', 'css/deck.css'].map(path => [path,
  execFileSync('git', ['show', `${args.baseline}:${path}`], { encoding: 'utf8' })]));
const profiles = {
  desktop: { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true },
};
const browser = await webkit.launch({ headless: true });
console.log(JSON.stringify({ browser: `Playwright WebKit ${browser.version()}`, os: `${os.platform()} ${os.release()} ${os.arch()}`,
  cpu: os.cpus()[0]?.model, profiles: profile, samples, baseline: args.baseline || null }));

function summary(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  const round = n => Math.round(n * 100) / 100;
  const percentile = p => round(sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))]);
  return { n: sorted.length, mean: round(sorted.reduce((sum, n) => sum + n, 0) / sorted.length),
    p95: percentile(.95), p99: percentile(.99), max: round(sorted.at(-1)), over34: sorted.filter(n => n > 34).length };
}

async function run(variant, name, iteration) {
  const context = await browser.newContext({ ...profiles[name], colorScheme: 'dark', reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const requests = [];
  page.on('request', request => { if (request.url().includes('/assets/deck/')) requests.push(request.url()); });
  // Avoid external font or telemetry requests changing results between runs.
  await page.route('**/*', route => {
    const request = new URL(route.request().url());
    if (request.origin !== new URL(url).origin) return route.abort('blockedbyclient');
    const key = request.pathname.slice(1);
    if (variant === 'baseline' && baseline[key] !== undefined) return route.fulfill({
      status: 200, contentType: key.endsWith('.css') ? 'text/css' : 'application/javascript', body: baseline[key]
    });
    return route.continue();
  });
  await page.addInitScript(() => {
    const stats = window.__deckBenchmark = { frames: [], callbacks: [], rotation: [] };
    const native = window.requestAnimationFrame.bind(window);
    let previous = 0;
    function sample(time) {
      if (previous) stats.frames.push({ time, ms: time - previous });
      previous = time;
      const active = document.querySelector('.tcard.is-active');
      if (active) stats.rotation.push({ time, rx: parseFloat(active.style.getPropertyValue('--rx')) || 0,
        ry: parseFloat(active.style.getPropertyValue('--ry')) || 0 });
      native(sample);
    }
    native(sample);
    window.requestAnimationFrame = callback => {
      // Only the deck's animation loop; unrelated page animations are excluded.
      const deck = String(callback).includes('const elapsed = lastFrame');
      return native(deck ? time => {
        const start = performance.now(); callback(time);
        stats.callbacks.push({ time, ms: performance.now() - start });
      } : callback);
    };
  });
  function record(label, from, to, data) {
    const during = list => list.filter(entry => entry.time >= from && entry.time < to);
    const rotation = during(data.rotation);
    const range = key => rotation.length ? Math.max(...rotation.map(x => x[key])) - Math.min(...rotation.map(x => x[key])) : null;
    console.log(JSON.stringify({ variant, profile: name, iteration, phase: label, requests: requests.length,
      frameIntervalsMs: summary(during(data.frames).map(entry => entry.ms)),
      deckCallbackMs: summary(during(data.callbacks).map(entry => entry.ms)), rotationRange: { rx: range('rx'), ry: range('ry') } }));
  }
  async function phase(label, action, duration) {
    const from = await page.evaluate(() => performance.now());
    await action();
    await page.waitForTimeout(duration);
    const result = await page.evaluate(() => ({ to: performance.now(), data: window.__deckBenchmark }));
    record(label, from, result.to, result.data);
  }
  try {
    await page.goto(`${url}/cards.html`);
    await page.waitForSelector('.deck.is-dealt');
    await page.waitForTimeout(3000);
    let result = await page.evaluate(() => ({ to: performance.now(), data: window.__deckBenchmark }));
    record('opening', 0, result.to, result.data);
    await phase('idle', async () => {}, 1700);
    for (const foil of ['clifford', 'lorenz', 'chirikov']) {
      const card = page.locator(`.tcard[data-foil="${foil}"]`);
      // Playwright may regard a partly visible card as in view even when its
      // centre is hidden beneath the sticky bar. Centre it for a real tap.
      await card.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      // Use the actual touch path on the mobile profile: it deliberately omits
      // the desktop rotation flourish, so a programmatic click changes the cost.
      await phase(`${foil}-lift`, async () => {
        if (name === 'mobile') await card.tap({ force: true });
        else await card.evaluate(el => el.click());
        await page.waitForFunction(foil => document.querySelector(`.tcard[data-foil="${foil}"]`)?.classList.contains('is-active'), foil);
      }, 1700);
      if (name === 'desktop') {
        await phase(`${foil}-pointer`, async () => {
          const box = await card.boundingBox();
          for (let i = 0; i < 20; i++) {
            await page.mouse.move(box.x + box.width * (i % 2 ? .72 : .28), box.y + box.height * (i % 2 ? .65 : .35));
            await page.waitForTimeout(60);
          }
        }, 350);
      }
      await phase(`${foil}-flip`, async () => {
        const flip = page.locator('[data-deck-flip]');
        if (name === 'mobile') await flip.tap({ force: true });
        else await flip.evaluate(el => el.click());
      }, 1600);
      await phase(`${foil}-return`, async () => {
        const back = page.locator('[data-deck-back]');
        if (name === 'mobile') await back.tap({ force: true });
        else await back.evaluate(el => el.click());
      }, 1600);
    }
  } finally { await context.close(); }
}

try {
  for (const name of profile === 'both' ? ['desktop', 'mobile'] : [profile]) {
    for (let i = 1; i <= samples; i++) {
      const variants = baseline ? (i % 2 ? ['baseline', 'current'] : ['current', 'baseline']) : ['current'];
      for (const variant of variants) await run(variant, name, i);
    }
  }
} finally { await browser.close(); }
