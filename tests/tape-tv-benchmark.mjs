// Compare the current TV CSS with a Git revision, keeping the rest of the
// worktree identical. Start a server first, e.g. node tests/server.js; then:
// node tests/tape-tv-benchmark.mjs --baseline HEAD --url http://127.0.0.1:4173 --samples 2
// Add --mobile for a 390x844, DPR 3 viewport. Results are observational: frame
// intervals do not measure total GPU/energy use or installed Safari itself.
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { webkit } from '@playwright/test';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, index, all) => {
  if (arg.startsWith('--')) pairs.push([arg.slice(2), all[index + 1]?.startsWith('--') ? true : all[index + 1] ?? true]);
  return pairs;
}, []));
const url = args.url || 'http://127.0.0.1:4173';
const ref = args.baseline || 'HEAD';
const samples = Number(args.samples || 2);
if (!Number.isInteger(samples) || samples < 1 || samples > 10) throw new Error('samples must be 1–10');
const mobile = Boolean(args.mobile);
const viewport = mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 };
const deviceScaleFactor = mobile ? 3 : 2;
const files = ['css/tape-test-pattern.css', 'css/tape-tv.css'];
const baseline = new Map(files.map(file => [file, execFileSync('git', ['show', `${ref}:${file}`], { encoding: 'utf8' })]));
const browser = await webkit.launch({ headless: true });
console.log(JSON.stringify({ browser: `Playwright WebKit ${browser.version()}`, platform: `${os.platform()} ${os.arch()}`, cpu: os.cpus()[0]?.model, viewport, deviceScaleFactor, baseline: ref, samples }));

async function scenario(page, name) {
  await page.goto(`${url}/?lang=en`);
  await page.locator(name === 'gallery' ? '.project-tape--art' : '.project-tape--kodlab').evaluate(el => el.click());
  await page.locator('#tape-player-screen').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  if (name === 'snow') {
    await page.locator('.tape-player__close').evaluate(el => el.click());
    await page.locator('.tape-static__grain').waitFor({ state: 'visible' });
    await page.waitForTimeout(500);
  } else if (name === 'enlarged') {
    await page.locator('#tape-player-screen .tape-image-open').evaluate(el => el.click());
    await page.locator('#tape-player-screen .tape-image-full').waitFor({ state: 'visible' });
    await page.waitForTimeout(700);
  } else if (name === 'ident') {
    await page.locator('.tape-player__secret').evaluate(el => el.click());
    await page.locator('.tape-ident').waitFor({ state: 'visible' });
  } else if (name === 'gallery') {
    await page.locator('#tape-player-screen [data-deck-open]').evaluate(el => el.click());
    await page.locator('dialog.deck').waitFor({ state: 'visible' });
    await page.waitForTimeout(700);
  }
  return page.evaluate(async ({ duration, switching }) => {
    const frames = [];
    let last = 0;
    let selected = false;
    const timer = switching ? setInterval(() => {
      selected = !selected;
      document.querySelector(selected ? '.project-tape--agent' : '.project-tape--kodlab').click();
    }, 600) : 0;
    const started = performance.now();
    await new Promise(resolve => {
      function record(time) {
        if (last) frames.push(time - last);
        last = time;
        if (performance.now() - started >= duration) resolve();
        else requestAnimationFrame(record);
      }
      requestAnimationFrame(record);
    });
    clearInterval(timer);
    frames.sort((a, b) => a - b);
    const round = n => Math.round(n * 100) / 100;
    return { count: frames.length, meanMs: round(frames.reduce((a, b) => a + b, 0) / frames.length), p95Ms: round(frames[Math.floor(frames.length * .95)]), p99Ms: round(frames[Math.floor(frames.length * .99)]), over34ms: frames.filter(n => n > 34).length };
  }, { duration: name === 'ident' ? 5000 : 3000, switching: name === 'switching' });
}

try {
  for (let run = 1; run <= samples; run++) {
    // Alternate the variants to reduce load and thermal ordering effects.
    for (const variant of run % 2 ? ['baseline', 'current'] : ['current', 'baseline']) {
      const page = await browser.newPage({ viewport, deviceScaleFactor, colorScheme: 'dark' });
      if (variant === 'baseline') {
        for (const [file, body] of baseline) await page.route(`**/${file}`, route => route.fulfill({ status: 200, contentType: 'text/css', body }));
      }
      for (const name of ['idle', 'snow', 'switching', 'enlarged', 'ident', 'gallery']) {
        console.log(JSON.stringify({ run, variant, scenario: name, ...await scenario(page, name) }));
      }
      await page.close();
    }
  }
} finally { await browser.close(); }
