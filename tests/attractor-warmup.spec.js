import { test, expect } from '@playwright/test';

// Force one initial map pass per frame so interactions can interrupt the real
// warmup deterministically, without relying on the speed of the test machine.
async function instrument(page, action) {
  await page.addInitScript(action => {
    window.__heroWarmup = { calls: 0, paints: 0 };
    const raf = window.requestAnimationFrame;
    const now = performance.now.bind(performance);
    const put = CanvasRenderingContext2D.prototype.putImageData;
    CanvasRenderingContext2D.prototype.putImageData = function (...args) {
      const result = put.apply(this, args);
      if (this.canvas.id === 'attractor') window.__heroWarmup.paints++;
      return result;
    };
    window.requestAnimationFrame = function (callback) {
      if (!String(callback).includes('steady = !dirty')) return raf.call(window, callback);
      return raf.call(window, time => {
        let clockCalls = 0;
        performance.now = () => now() + (clockCalls++ ? 100 : 0);
        try { callback(time); } finally { performance.now = now; }
        window.__heroWarmup.calls++;
        if (window.__heroWarmup.calls === 1) {
          if (action === 'pause') { document.documentElement.classList.add('is-tape-paused'); document.dispatchEvent(new CustomEvent('tape-pause-change', { detail: { paused: true } })); }
          if (action === 'scroll') window.scrollTo(0, document.documentElement.scrollHeight);
        }
      });
    };
  }, action);
}

async function counts(page) { return page.evaluate(() => ({ ...window.__heroWarmup })); }

for (const action of ['pause', 'scroll']) {
  test(`interrupted attractor warmup resumes after ${action}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await instrument(page, action);
    await page.goto('/?lang=en');
    await expect.poll(async () => (await counts(page)).calls).toBeGreaterThan(0);
    if (action === 'pause') await expect(page.locator('html')).toHaveClass(/is-tape-paused/);
    else await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(900);
    // Give IntersectionObserver time to settle before comparing work.
    await page.waitForTimeout(150);
    const stopped = await counts(page);
    await page.waitForTimeout(200);
    expect(await counts(page)).toEqual(stopped);
    if (action === 'pause') await page.evaluate(() => { document.documentElement.classList.remove('is-tape-paused'); document.dispatchEvent(new CustomEvent('tape-pause-change', { detail: { paused: false } })); });
    else await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(async () => (await counts(page)).paints, { timeout: 6000 }).toBeGreaterThan(stopped.paints);
    const canvas = page.locator('#attractor');
    const picture = await canvas.evaluate(el => el.toDataURL());
    await page.waitForTimeout(250);
    expect(await canvas.evaluate(el => el.toDataURL())).toBe(picture);
  });
}

test('theme and resize during paused warmup produce the new static picture', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await instrument(page, 'pause');
  await page.goto('/?lang=en');
  await expect(page.locator('html')).toHaveClass(/is-tape-paused/);
  await page.evaluate(() => document.documentElement.dataset.theme = 'light');
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.waitForTimeout(250);
  const before = await counts(page);
  await page.evaluate(() => { document.documentElement.classList.remove('is-tape-paused'); document.dispatchEvent(new CustomEvent('tape-pause-change', { detail: { paused: false } })); });
  await expect.poll(async () => (await counts(page)).paints, { timeout: 6000 }).toBeGreaterThan(before.paints);
  const canvas = page.locator('#attractor');
  const data = await canvas.evaluate(el => ({ width: el.width, height: el.height, pixel: [...el.getContext('2d').getImageData(0, 0, 1, 1).data] }));
  expect(data.width).toBe(900);
  expect(data.height).toBeGreaterThan(500);
  expect(data.pixel).toEqual([251, 250, 255, 255]);
  const picture = await canvas.evaluate(el => el.toDataURL());
  await page.waitForTimeout(250);
  expect(await canvas.evaluate(el => el.toDataURL())).toBe(picture);
});

test('extreme pointer coordinates cannot poison the running map', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'dark' });
  await page.goto('/?lang=en');
  const canvas = page.locator('#attractor');
  await expect.poll(() => canvas.evaluate(el => el.width)).toBeGreaterThan(1);
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointermove', { clientX: 1000000, clientY: -1000000 })));
  await expect.poll(() => canvas.evaluate(el => {
    const pixels = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
    const colours = new Set();
    for (let i = 0; i < pixels.length; i += 256) colours.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
    return colours.size;
  }), { timeout: 6000 }).toBeGreaterThan(8);
});
