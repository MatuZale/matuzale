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

test('Spacewar canvas and help panel follow explicit and system themes while paused', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('[data-tape-action="pause"]').evaluate(el => el.click());
  await page.evaluate(async () => (await import('/js/spacewar.js')).openSpacewar());
  const dialog = page.locator('dialog.sw');
  await expect(dialog).toBeVisible();
  const canvas = dialog.locator('.sw__canvas');
  await expect.poll(() => canvas.evaluate(el => el.width)).toBeGreaterThan(1);
  await dialog.locator('[data-sw="help"]').evaluate(el => el.click());
  const panel = dialog.locator('.sw__panel');
  await expect(panel).toBeVisible();

  const states = [
    { system: 'dark', explicit: 'light', light: true },
    { system: 'light', explicit: 'dark', light: false },
    { system: 'dark', explicit: null, light: false },
    { system: 'light', explicit: null, light: true },
  ];
  for (const state of states) {
    await page.emulateMedia({ colorScheme: state.system, reducedMotion: 'reduce' });
    await page.evaluate(value => {
      if (value) document.documentElement.dataset.theme = value;
      else delete document.documentElement.dataset.theme;
    }, state.explicit);
    // The game is globally paused; this verifies the canvas redraws on the theme
    // event instead of only changing its surrounding CSS or resuming the game.
    await expect.poll(() => canvas.evaluate((el, light) => {
      const data = el.getContext('2d').getImageData(0, 0, 1, 1).data;
      // GPU compositing can round the near-black channel by a unit; assert the
      // rendered brightness and opacity rather than a backend-specific byte.
      return data[3] === 255 && (light ? data[0] > 200 : data[0] < 20);
    }, state.light)).toBe(true);
    const inkPixels = await canvas.evaluate((el, light) => {
      const data = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
      let count = 0;
      for (let i = 0; i < data.length; i += 16) {
        const average = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (light ? average < 160 : average > 80) count++;
      }
      return count;
    }, state.light);
    expect(inkPixels).toBeGreaterThan(20);
    await expect(dialog.locator('.sw__screen')).toHaveCSS('background-color', state.light ? 'rgb(242, 238, 224)' : 'rgb(1, 4, 2)');
    const panelColors = await panel.evaluate(el => ({ foreground: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor }));
    expect(panelColors.foreground).not.toBe(panelColors.background);
  }
  await expect(page.locator('html')).toHaveClass(/is-tape-paused/);
});
