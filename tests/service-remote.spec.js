import { test, expect } from '@playwright/test';

test.use({ hasTouch: true });

test.describe('service remote hover', () => {
  test.use({ hasTouch: false });

  test('glitches its keys on hover and respects motion controls', async ({ page }) => {
    await page.goto('/');
    const learning = page.locator('.skill--learning');
    await learning.scrollIntoViewIfNeeded();
    for (let i = 0; i < 3; i++) {
      await learning.click();
      await page.waitForTimeout(750);
    }
    const key = page.locator('.remote__key[data-cue="tapesun"]');
    await expect(key).toBeVisible();
    await key.hover();
    await expect(key).toHaveCSS('animation-name', 'remote-key-glitch');
    await expect(page.locator('[data-tape-action="pause"]')).not.toHaveCSS('animation-name', 'remote-key-glitch');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(key).toHaveCSS('animation-name', 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(key).toHaveCSS('animation-name', 'remote-key-glitch');
    await page.locator('[data-tape-action="pause"]').evaluate(el => el.click());
    await expect(key).toHaveCSS('animation-name', 'none');
  });
});

test.describe('service remote game', () => {
  test.use({ hasTouch: false });

  test('Spacewar key switches on AV and winds to the game cassette in the TV', async ({ page }) => {
    await page.addInitScript(() => { Math.random = () => 0.5; });
    await page.goto('/?lang=en');
    await expect(page.locator('html')).not.toHaveClass(/is-crt/);
    const learning = page.locator('.skill--learning');
    await learning.scrollIntoViewIfNeeded();
    for (let i = 0; i < 3; i++) {
      await learning.click();
      await page.waitForTimeout(750);
    }
    const key = page.locator('.remote__key[data-cue="spacewar"]');
    await expect(key).toBeVisible();
    await key.click();
    await expect(page.locator('html')).toHaveClass(/is-crt/, { timeout: 15_000 });
    await expect(page.locator('#project-shelf [data-tape-spacewar]')).toHaveAttribute('aria-expanded', 'true', { timeout: 15_000 });
    await expect(page.locator('#tape-player-screen')).toHaveAttribute('data-project', 'spacewar', { timeout: 15_000 });
    await expect(page.locator('#tape-player-screen .sw-embed')).toBeVisible({ timeout: 15_000 });
    await expect(key).not.toHaveClass(/is-lit/, { timeout: 15_000 });
    await expect(page.locator('#tape-player-screen')).toBeInViewport();
    await expect(page.locator('[data-game], dialog.sw')).toHaveCount(0);
  });
});

for (const width of [1280, 390]) test(`service remote winds to and plays the VHS sun and photons at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
  await page.addInitScript(viewportWidth => {
    // This exercises the remote's deliberate cues, not the unrelated random
    // nightfall or black-hole events that can occupy the same effects.
    Math.random = () => 0.5;
    window.tapePhotonColours = [];
    window.batchedSpacetimeVisibility = false;
    const Observer = window.IntersectionObserver;
    window.IntersectionObserver = class extends Observer {
      constructor(callback, options) {
        super((entries, observer) => {
          // A quick scroll can queue an old exit and the current entry together.
          // Deliver that sequence deterministically to the simulation observer.
          const entry = entries.find(item => item.target.classList.contains('spacetime') && item.isIntersecting);
          if (viewportWidth < 600 && !window.batchedSpacetimeVisibility && !options?.rootMargin && entry) {
            window.batchedSpacetimeVisibility = true;
            callback([{ isIntersecting: false }, ...entries], observer);
          } else callback(entries, observer);
        }, options);
      }
    };
    const fill = CanvasRenderingContext2D.prototype.fill;
    CanvasRenderingContext2D.prototype.fill = function (...args) {
      if (this.canvas.parentElement?.classList.contains('spacetime') && ['#ffbf35', '#ff763d', '#ed466d', '#bb51ce', '#8264e6'].includes(this.fillStyle)) {
        window.tapePhotonColours.push(this.fillStyle);
      }
      return fill.apply(this, args);
    };
  }, width);
  await page.goto('/');
  const learning = page.locator('.skill--learning');
  await learning.scrollIntoViewIfNeeded();
  for (let i = 0; i < 3; i++) {
    if (width < 600) await learning.tap();
    else await learning.click();
    await page.waitForTimeout(750);
  }
  const looseCard = page.locator('.loose-air > .skill--learning');
  await expect(looseCard).toHaveCount(1);
  await expect(looseCard).toHaveCSS('opacity', '1');
  const cardBackground = await looseCard.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(cardBackground).not.toMatch(/^rgba\([^)]*,\s*(?:0|0\.\d+)\)$/);
  expect(cardBackground).not.toBe('transparent');
  const sun = page.locator('[data-cue="tapesun"]');
  const photons = page.locator('[data-cue="photons"]');
  await expect(sun).toBeVisible();
  await expect(photons).toBeVisible();

  if (width < 600) await sun.tap(); else await sun.click();
  await expect(page.locator('.horizon')).toHaveClass(/is-tape-sun/, { timeout: 12_000 });
  if (width < 600) await photons.tap(); else await photons.click();
  await expect.poll(() => page.evaluate(() => new Set(window.tapePhotonColours).size), { timeout: 15_000 }).toBe(5);
  if (width < 600) expect(await page.evaluate(() => window.batchedSpacetimeVisibility)).toBe(true);

  await page.locator('[data-channel="pl"]').click();
  await expect(sun).toHaveText('słońce vhs');
  await expect(photons).toHaveText('fotony vhs');
});
