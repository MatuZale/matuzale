import { test, expect } from '@playwright/test';

test('tape pause holds and resumes the attractor, wave and animated buoy', async ({ page }) => {
  await page.goto('/');
  const pause = page.locator('[data-tape-action="pause"]');
  const canvas = page.locator('#attractor');
  await expect.poll(() => canvas.evaluate(el => el.width)).toBeGreaterThan(1);
  await pause.evaluate(el => el.click());
  await expect(page.locator('html')).toHaveClass(/is-tape-paused/);
  const picture = await canvas.evaluate(el => el.toDataURL());
  await page.waitForTimeout(600);
  expect(await canvas.evaluate(el => el.toDataURL())).toBe(picture);
  await expect(page.locator('.buoy')).toHaveCSS('animation-play-state', 'paused');
  await pause.click();
  await expect.poll(() => canvas.evaluate(el => el.toDataURL()), { timeout: 5000 }).not.toBe(picture);
  const seam = page.locator('.tape-seam canvas').first();
  await seam.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await pause.evaluate(el => el.click());
  const wave = await seam.evaluate(el => el.toDataURL());
  await page.waitForTimeout(600);
  expect(await seam.evaluate(el => el.toDataURL())).toBe(wave);
  await pause.click();
  await expect.poll(() => seam.evaluate(el => el.toDataURL()), { timeout: 5000 }).not.toBe(wave);
});

test('tape pause holds the footer game without overriding its own pause', async ({ page }) => {
  await page.goto('/');
  const gamePause = page.locator('#game-toggle');
  const pixels = page.locator('#game-pixels');
  const tapePause = page.locator('[data-tape-action="pause"]');
  await page.locator('#footer-game').scrollIntoViewIfNeeded();
  await expect(gamePause).toBeVisible();
  await expect(gamePause).toHaveAttribute('aria-pressed', 'false');
  await tapePause.click();
  const still = await pixels.innerHTML();
  await page.waitForTimeout(700);
  expect(await pixels.innerHTML()).toBe(still);
  await gamePause.click();
  await expect(gamePause).toHaveAttribute('aria-pressed', 'true');
  await tapePause.click();
  await page.waitForTimeout(700);
  expect(await pixels.innerHTML()).toBe(still);
  await gamePause.click();
  await expect.poll(() => pixels.innerHTML(), { timeout: 5000 }).not.toBe(still);
});

test('tape pause holds the spacetime simulation and BENTOS data', async ({ page }) => {
  await page.goto('/');
  const pause = page.locator('[data-tape-action="pause"]');
  const spacetime = page.locator('.spacetime');
  await spacetime.scrollIntoViewIfNeeded();
  await expect(spacetime.locator('canvas')).toHaveCount(2);
  await page.waitForTimeout(500);
  await pause.evaluate(el => el.click());
  const live = spacetime.locator('canvas').nth(1);
  const picture = await live.evaluate(el => el.toDataURL());
  await page.waitForTimeout(700);
  expect(await live.evaluate(el => el.toDataURL())).toBe(picture);
  await pause.click();
  await expect.poll(() => live.evaluate(el => el.toDataURL()), { timeout: 5000 }).not.toBe(picture);
  const feed = page.locator('[data-feed]');
  await feed.scrollIntoViewIfNeeded();
  await pause.evaluate(el => el.click());
  const sample = await page.locator('[data-feed-sample]').innerText();
  await page.waitForTimeout(1600);
  expect(await page.locator('[data-feed-sample]').innerText()).toBe(sample);
  await pause.click();
  await expect.poll(() => page.locator('[data-feed-sample]').innerText(), { timeout: 5000 }).not.toBe(sample);
});

test('sunset waits for tape time rather than skipping scenes during pause', async ({ page }) => {
  await page.goto('/');
  const horizon = page.locator('.horizon');
  await horizon.scrollIntoViewIfNeeded();
  await expect.poll(() => horizon.evaluate(el => typeof el.nightfall)).toBe('function');
  await horizon.evaluate(el => { el.nightfall(); });
  await page.waitForTimeout(300);
  await page.locator('[data-tape-action="pause"]').evaluate(el => el.click());
  const sun = horizon.locator('.horizon__sun');
  // pause() can report a paused playState while its pending task is still
  // resolving. Read the held time only after the browser has settled it.
  const held = await sun.evaluate(async el => {
    const animation = el.getAnimations().find(a => a.playState === 'paused');
    if (!animation) return null;
    await animation.ready;
    return { state: animation.playState, time: animation.currentTime };
  });
  expect(held?.state).toBe('paused');
  expect(typeof held?.time).toBe('number');
  await page.waitForTimeout(3700);
  expect(await sun.evaluate(el => el.getAnimations().find(a => a.playState === 'paused')?.currentTime)).toBe(held.time);
  await expect(horizon).not.toHaveClass(/is-night/);
  await page.locator('[data-tape-action="pause"]').click();
  await expect.poll(() => sun.evaluate(el => el.getAnimations().some(a => a.playState === 'running'))).toBe(true);
});

test('a paused tape still lets the card collection open and respond', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-tape-action="pause"]').evaluate(el => el.click());
  await page.locator('#project-shelf #art').click();
  await page.locator('[data-deck-open]').click();
  const deck = page.locator('.deck');
  const card = deck.locator('.tcard').first();
  await expect(deck).toBeVisible();
  await expect(card).toBeVisible();
  await card.click();
  await expect(card).toHaveClass(/is-active/);
  const before = await card.evaluate(el => parseFloat(el.style.getPropertyValue('--ry')));
  await deck.locator('[data-deck-flip]').click();
  await expect.poll(() => card.evaluate(el => Math.abs(parseFloat(el.style.getPropertyValue('--ry')))), { timeout: 5000 }).toBe(Math.abs(before + 180));
  await deck.locator('.deck__close').click();
  await expect(deck).not.toBeVisible();
});

test('crash animation holds its fragments and resumes their cleanup', async ({ page }) => {
  await page.goto('/');
  const board = page.locator('#footer-game');
  await board.scrollIntoViewIfNeeded();
  await expect.poll(() => board.evaluate(el => typeof el.crash)).toBe('function');
  await board.evaluate(el => { el.crash(); });
  const piece = page.locator('.circuit-burst svg').first();
  await expect(piece).toBeAttached();
  await page.locator('[data-tape-action="pause"]').evaluate(el => el.click());
  const held = await piece.evaluate(async el => {
    const animation = el.getAnimations()[0];
    if (!animation) return null;
    await animation.ready;
    return { state: animation.playState, time: animation.currentTime };
  });
  expect(held?.state).toBe('paused');
  expect(typeof held?.time).toBe('number');
  await page.waitForTimeout(1100);
  await expect(piece).toBeAttached();
  expect(await piece.evaluate(el => {
    const animation = el.getAnimations()[0];
    return { state: animation.playState, time: animation.currentTime };
  })).toEqual(held);
  await expect(page.locator('#game-pixels')).not.toContainText('Segmentation fault');
  // Capture the animation state in the resume event, before a short-lived
  // fragment can finish and be removed on a busy renderer.
  await piece.evaluate(el => {
    const animation = el.getAnimations()[0];
    window.__burstResumeState = null;
    document.addEventListener('tape-pause-change', () => {
      window.__burstResumeState = animation.playState;
    }, { once: true });
  });
  await page.locator('[data-tape-action="pause"]').click();
  await expect.poll(() => page.evaluate(() => window.__burstResumeState)).toBe('running');
  await expect(page.locator('#game-pixels')).toContainText('Segmentation fault', { timeout: 5000 });
  await expect(page.locator('.circuit-burst')).toHaveCount(0, { timeout: 6000 });
});
