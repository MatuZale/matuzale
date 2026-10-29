import { test, expect } from '@playwright/test';

// Record the flow of the page itself, so an opacity animation over a sudden layout
// jump cannot pass. DOM clicks avoid Playwright scrolling a control into view.
async function recordChange(page, selector) {
  return page.evaluate(async selector => {
    const samples = [];
    const sample = () => samples.push({ height: document.documentElement.scrollHeight, scroll: window.scrollY });
    sample();
    document.querySelector(selector).click();
    const start = performance.now();
    await new Promise(resolve => {
      const frame = now => {
        sample();
        if (now - start >= 1200) resolve();
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    return samples;
  }, selector);
}

function expectSmoothFlow(samples, direction) {
  const first = samples[0].height;
  const last = samples.at(-1).height;
  const delta = last - first;
  expect(Math.sign(delta)).toBe(direction);
  expect(Math.abs(delta)).toBeGreaterThan(100);
  const progress = samples.map(sample => (sample.height - first) / delta);
  expect(progress.filter(value => value > .05 && value < .95).length).toBeGreaterThan(2);
  // A single large layout shift would remain visible even if some frames animate.
  const steps = samples.slice(1).map((sample, index) => Math.abs(sample.height - samples[index].height));
  expect(Math.max(...steps)).toBeLessThan(Math.abs(delta) * .6);
  expect(Math.max(...samples.map(sample => Math.abs(sample.scroll - samples[0].scroll)))).toBeLessThanOrEqual(1);
}

for (const width of [1280, 375]) {
  test(`TV space opens and closes smoothly without scrolling at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?lang=en');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#project-shelf').scrollIntoViewIfNeeded();
    const player = page.locator('#project-player');
    const opening = await recordChange(page, '.project-tape--kodlab');
    expectSmoothFlow(opening, 1);
    await expect(player).toBeVisible();
    const beforeSwitch = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, scroll: window.scrollY }));
    await page.locator('.project-tape--agent').evaluate(el => el.click());
    await expect(player.locator('.tape-cover--agent')).toBeVisible();
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(beforeSwitch.height);
    expect(Math.abs(await page.evaluate(() => window.scrollY) - beforeSwitch.scroll)).toBeLessThanOrEqual(1);
    const closing = await recordChange(page, '.tape-player__power');
    expectSmoothFlow(closing, -1);
    await expect(player).toBeHidden();
    await expect(page.locator('.project-tape--agent')).toBeFocused();
  });
}

test('eject leaves the TV on with static and selecting a new cassette keeps its size', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.locator('.project-tape--kodlab').evaluate(el => el.click());
  await expect(page.locator('#project-player')).toBeVisible();
  await page.waitForTimeout(900);
  const before = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, scroll: window.scrollY }));
  await page.locator('.tape-player__close').evaluate(el => el.click());
  await expect(page.locator('.tape-static')).toBeVisible();
  await expect(page.locator('#project-player')).toBeVisible();
  await expect(page.locator('.project-tape--kodlab')).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(before.height);
  expect(Math.abs(await page.evaluate(() => window.scrollY) - before.scroll)).toBeLessThanOrEqual(1);
  await page.locator('.project-tape--art').evaluate(el => el.click());
  await expect(page.locator('.tape-cover--art')).toBeVisible();
  await expect(page.locator('.tape-static')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(before.height);
});

test('tuning is brief and rapid cassette changes settle on the latest project', async ({ page }) => {
  await page.goto('/?lang=en');
  const screen = page.locator('#tape-player-screen');
  const tuning = screen.locator('.tape-test-pattern--tuning');
  const snapshot = await page.evaluate(() => {
    document.querySelector('.project-tape--kodlab').click();
    const initial = document.querySelectorAll('.tape-test-pattern--tuning').length;
    document.querySelector('.project-tape--art').click();
    document.querySelector('.project-tape--quantum').click();
    return { initial, final: document.querySelectorAll('.tape-test-pattern--tuning').length };
  });
  expect(snapshot).toEqual({ initial: 1, final: 1 });
  await expect(tuning).toHaveCount(0, { timeout: 2000 });
  await expect(screen).toHaveAttribute('data-project', 'quantum');
  await expect(screen.locator('.card__body h3')).toBeVisible();
  await expect(screen.locator('.tape-static')).toHaveCount(0);
  await page.waitForTimeout(850);
  await expect(screen).toHaveAttribute('data-project', 'quantum');
  await expect(tuning).toHaveCount(0);
});

test('reduced motion and pause skip tuning and hold static still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  const screen = page.locator('#tape-player-screen');
  const tuning = screen.locator('.tape-test-pattern--tuning');
  const eject = page.locator('.tape-player__close');
  const pause = page.locator('[data-tape-action="pause"]');
  const kodlab = page.locator('.project-tape--kodlab');
  await kodlab.evaluate(el => el.click());
  await expect(tuning).toHaveCount(0);
  await eject.evaluate(el => el.click());
  await expect(screen.locator('.tape-static')).toBeVisible();
  await expect(screen.locator('.tape-static__grain')).toHaveCSS('animation-name', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await pause.evaluate(el => el.click());
  await expect(screen.locator('.tape-static__grain')).toHaveCSS('animation-play-state', 'paused');
  await kodlab.evaluate(el => el.click());
  await expect(tuning).toHaveCount(0);
  await eject.evaluate(el => el.click());
  await expect(screen.locator('.tape-static')).toBeVisible();
  await expect(screen.locator('.tape-static__grain')).toHaveCSS('animation-play-state', 'paused');
});

test('selecting another cassette interrupts power-off without a stale close', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.locator('.project-tape--kodlab').evaluate(el => el.click());
  await expect(page.locator('#project-player')).toBeVisible();
  await page.waitForTimeout(900);
  await page.locator('.tape-player__power').evaluate(el => el.click());
  await page.waitForTimeout(100);
  await page.locator('.project-tape--art').evaluate(el => el.click());
  await expect(page.locator('.tape-cover--art')).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page.locator('#project-player')).toBeVisible();
  await expect(page.locator('#tape-player-screen')).toHaveAttribute('data-project', 'art');
  await expect(page.locator('#art')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#project-player')).not.toHaveAttribute('inert', '');
});

test('reduced motion and a tape pause settle the player immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  const player = page.locator('#project-player');
  const tape = page.locator('.project-tape--kodlab');
  await tape.evaluate(el => el.click());
  await expect(player).toBeVisible();
  const openedHeight = await player.evaluate(el => el.getBoundingClientRect().height);
  await page.waitForTimeout(100);
  expect(await player.evaluate(el => el.getBoundingClientRect().height)).toBe(openedHeight);
  await page.locator('.tape-player__power').evaluate(el => el.click());
  await expect(player).toBeHidden();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const pause = page.locator('[data-tape-action="pause"]');
  await pause.evaluate(el => el.click());
  await tape.evaluate(el => el.click());
  await expect(player).toBeVisible();
  await page.locator('.tape-player__power').evaluate(el => el.click());
  await expect(player).toBeHidden();
  // Pausing during the exit must not leave a half-closed, inaccessible player.
  await pause.evaluate(el => el.click());
  await tape.evaluate(el => el.click());
  await page.waitForTimeout(900);
  await page.locator('.tape-player__power').evaluate(el => el.click());
  await page.waitForTimeout(80);
  await pause.evaluate(el => el.click());
  await expect(player).toBeHidden({ timeout: 2000 });
  await expect(tape).toBeFocused();
});
