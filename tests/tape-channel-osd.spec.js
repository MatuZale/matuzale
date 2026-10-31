import { test, expect } from '@playwright/test';

const screen = page => page.locator('#tape-player-screen');
const readout = page => screen(page).locator('.tape-channel-osd');
// Capture the transient readout in the same browser task as the selection.
// Separate round trips can outlast its 1.8 s lifetime on a busy renderer.
const choose = (page, tape) => page.locator(`.project-tape--${tape}`).evaluate(async el => {
  el.click();
  // A selection while the ident is visible defers the readout to a microtask.
  await Promise.resolve();
  const osd = document.querySelector('#tape-player-screen .tape-channel-osd');
  return osd && { text: osd.textContent, pointerEvents: getComputedStyle(osd).pointerEvents };
});

for (const colorScheme of ['light', 'dark']) {
  test(`TV channel readout follows tape changes in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto('/?lang=pl');
    expect(await choose(page, 'kodlab')).toEqual({ text: 'CH 02KODLAB', pointerEvents: 'none' });
    expect(await choose(page, 'art')).toEqual({ text: 'CH 05ATTRACTORS', pointerEvents: 'none' });
    await expect(readout(page)).toHaveCount(0);
  });
}

test('eject, power and the ident clear a transient readout', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  expect((await choose(page, 'kodlab'))?.text).toBe('CH 02KODLAB');
  await page.locator('.tape-player__close').evaluate(el => el.click());
  await expect(readout(page)).toHaveCount(0);
  expect((await choose(page, 'agent'))?.text).toContain('CH 03');
  await page.locator('.tape-player__secret').evaluate(el => el.click());
  await expect(readout(page)).toHaveCount(0);
  expect((await choose(page, 'kodlab'))?.text).toBe('CH 02KODLAB');
  await page.locator('.tape-player__power').evaluate(el => el.click());
  await expect(readout(page)).toHaveCount(0);
});

test('the Spacewar tape uses the arcade channel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  await page.locator('[data-av]').evaluate(el => el.click());
  await expect(page.locator('html')).toHaveClass(/is-crt/);
  expect((await choose(page, 'spacewar'))?.text).toBe('CH 04SPACEWAR!');
  await expect(screen(page).locator('.sw-embed')).toBeVisible();
});
