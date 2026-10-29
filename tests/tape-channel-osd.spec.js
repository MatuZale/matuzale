import { test, expect } from '@playwright/test';

const screen = page => page.locator('#tape-player-screen');
const readout = page => screen(page).locator('.tape-channel-osd');
const choose = (page, tape) => page.locator(`.project-tape--${tape}`).evaluate(el => el.click());

for (const colorScheme of ['light', 'dark']) {
  test(`TV channel readout follows tape changes in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto('/?lang=pl');
    await choose(page, 'kodlab');
    await expect(readout(page)).toContainText('CH 02');
    await expect(readout(page)).toContainText('KODLAB');
    await expect(readout(page)).toHaveCSS('pointer-events', 'none');
    await choose(page, 'art');
    await expect(readout(page)).toHaveCount(1);
    await expect(readout(page)).toContainText('CH 05');
    await expect(readout(page)).toContainText('ATTRACTORS');
    await expect(readout(page)).toHaveCount(0, { timeout: 4000 });
  });
}

test('eject, power and the ident clear a transient readout', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  await choose(page, 'kodlab');
  await expect(readout(page)).toHaveCount(1);
  await page.locator('.tape-player__close').evaluate(el => el.click());
  await expect(readout(page)).toHaveCount(0);
  await choose(page, 'agent');
  await expect(readout(page)).toContainText('CH 03');
  await page.locator('.tape-player__secret').evaluate(el => el.click());
  await expect(readout(page)).toHaveCount(0);
  await choose(page, 'kodlab');
  await expect(readout(page)).toHaveCount(1);
  await page.locator('.tape-player__power').evaluate(el => el.click());
  await expect(readout(page)).toHaveCount(0);
});

test('the Spacewar tape uses the arcade channel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  await page.locator('[data-av]').evaluate(el => el.click());
  await expect(page.locator('html')).toHaveClass(/is-crt/);
  await choose(page, 'spacewar');
  await expect(readout(page)).toContainText('CH 04');
  await expect(readout(page)).toContainText('SPACEWAR!');
  await expect(screen(page).locator('.sw-embed')).toBeVisible();
});
