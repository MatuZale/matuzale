import { test, expect } from '@playwright/test';

test('the VHS sun only appears while About is visible and motion is enabled', async ({ page }) => {
  await page.goto('/');
  await page.locator('#about').scrollIntoViewIfNeeded();
  const horizon = page.locator('.horizon');
  await expect.poll(() => horizon.evaluate(el => typeof el.tapeSun)).toBe('function');
  await expect.poll(async () => {
    await horizon.evaluate(el => el.tapeSun());
    return horizon.evaluate(el => el.classList.contains('is-tape-sun'));
  }).toBe(true);
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(horizon).not.toHaveClass(/is-tape-sun/);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#about').scrollIntoViewIfNeeded();
  await horizon.evaluate(el => el.tapeSun());
  await expect(horizon).not.toHaveClass(/is-tape-sun/);
});

test('the photon group draws all five colours and respects reduced motion', async ({ page }) => {
  await page.addInitScript(() => {
    window.tapePhotonColours = [];
    const fill = CanvasRenderingContext2D.prototype.fill;
    CanvasRenderingContext2D.prototype.fill = function (...args) {
      const colours = ['#ffbf35', '#ff763d', '#ed466d', '#bb51ce', '#8264e6'];
      if (this.canvas.parentElement?.classList.contains('spacetime') && colours.includes(this.fillStyle)) {
        window.tapePhotonColours.push(this.fillStyle);
      }
      return fill.apply(this, args);
    };
  });
  await page.goto('/');
  await page.locator('#journey').scrollIntoViewIfNeeded();
  const space = page.locator('.spacetime');
  await expect.poll(() => space.evaluate(el => typeof el.summon)).toBe('function');
  await expect.poll(async () => {
    await space.evaluate(el => el.summon('tape-photons'));
    return page.evaluate(() => new Set(window.tapePhotonColours).size);
  }, { timeout: 10_000 }).toBe(5);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(200);
  await page.evaluate(() => { window.tapePhotonColours = []; });
  await space.evaluate(el => el.summon('tape-photons'));
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.tapePhotonColours)).toEqual([]);
});
