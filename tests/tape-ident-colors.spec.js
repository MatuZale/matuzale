import { test, expect } from '@playwright/test';

test('TM title cycles the five theme colours without changing its movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'light' });
  await page.goto('/?lang=en');
  await page.locator('.project-tape--kodlab').evaluate(el => el.click());
  await page.locator('.tape-player__secret').evaluate(el => el.click());
  const title = page.locator('.tape-ident__title');
  await expect(title).toBeVisible();

  const samples = await title.evaluate(el => {
    const movement = el.getAnimations().find(a => a.animationName === 'ident-title');
    const colours = el.getAnimations().find(a => a.animationName === 'ident-title-colours');
    movement.pause();
    colours.pause();
    movement.currentTime = 3800;
    const sample = theme => {
      document.documentElement.dataset.theme = theme;
      return [50, 383, 716, 1049, 1382, 1717].map(time => {
        colours.currentTime = time;
        return getComputedStyle(el).color;
      });
    };
    return { duration: colours.effect.getTiming().duration, light: sample('light'), dark: sample('dark') };
  });
  expect(samples.duration).toBeCloseTo(1666.7, 0);
  for (const palette of [samples.light, samples.dark]) {
    expect(new Set(palette.slice(0, 5)).size).toBe(5);
    expect(palette[5]).toBe(palette[0]);
  }
  expect(samples.dark).not.toEqual(samples.light);
});

test('TM title stays still with reduced motion and with global tape pause', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  await page.locator('.project-tape--kodlab').evaluate(el => el.click());
  const trigger = page.locator('.tape-player__secret');
  const ident = page.locator('.tape-ident');
  const title = ident.locator('.tape-ident__title');

  await trigger.evaluate(el => el.click());
  await expect(ident).toHaveClass(/is-still/);
  await expect(title).toBeVisible();
  await expect(title).toHaveCSS('animation-name', 'none');
  expect(await title.evaluate(el => el.getAnimations().length)).toBe(0);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('[data-tape-action="pause"]').evaluate(el => el.click());
  await expect(page.locator('html')).toHaveClass(/is-tape-paused/);
  await trigger.evaluate(el => el.click());
  await expect(ident).toHaveClass(/is-still/);
  await expect(title).toBeVisible();
  await expect(title).toHaveCSS('animation-name', 'none');
  expect(await title.evaluate(el => el.getAnimations().length)).toBe(0);
});
