import { test, expect } from '@playwright/test';

test('TM title arrives in one colour, cycles quickly, then settles before its exit', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'light' });
  await page.goto('/?lang=en');
  await page.locator('.project-tape--kodlab').evaluate(el => el.click());
  await page.locator('.tape-player__secret').evaluate(el => el.click());
  const title = page.locator('.tape-ident__title');
  await expect(title).toBeVisible();

  const samples = await title.evaluate(el => {
    const animations = el.getAnimations();
    const colours = animations.find(a => a.animationName === 'ident-title-colours');
    animations.forEach(animation => animation.pause());
    const sample = theme => {
      document.documentElement.dataset.theme = theme;
      return [0, 1800, 2350, 2700, 2875, 2986, 3097, 3208, 3319, 3431, 5000, 5200].map(time => {
        animations.forEach(animation => { animation.currentTime = time; });
        return getComputedStyle(el).color;
      });
    };
    return { timing: colours.effect.getTiming(), light: sample('light'), dark: sample('dark') };
  });
  expect(samples.timing.duration).toBeCloseTo(555.56, 1);
  expect(samples.timing.delay).toBe(2850);
  expect(samples.timing.iterations).toBe(3);
  for (const palette of [samples.light, samples.dark]) {
    // All the way through the entrance and the pause, one steady ink.
    expect(new Set(palette.slice(0, 5)).size).toBe(1);
    expect(new Set(palette.slice(4, 9)).size).toBe(5);
    expect(palette[9]).toBe(palette[4]);
    // After the palette, the neutral finish is steady during departure.
    expect(palette[10]).toBe(palette[11]);
    expect(palette[10]).not.toBe(palette[4]);
  }
  expect(samples.dark).not.toEqual(samples.light);
});

test('a narrow glint closes the ident and the picture is revealed before it ends', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.locator('.project-tape--kodlab').evaluate(el => el.click());
  await page.locator('.tape-player__secret').evaluate(el => el.click());
  const ident = page.locator('.tape-ident');
  await expect(ident).toBeVisible();
  const result = await ident.evaluate(el => {
    const animations = el.getAnimations({ subtree: true });
    const art = el.querySelector('.tape-ident__art');
    const composition = el.querySelector('.tape-ident__composition');
    animations.forEach(animation => animation.pause());
    const frame = time => {
      animations.forEach(animation => { animation.currentTime = time; });
      return {
        glint: Number(getComputedStyle(composition, '::after').opacity),
        art: Number(getComputedStyle(art).opacity),
        background: getComputedStyle(el).backgroundColor,
      };
    };
    return [frame(3000), frame(4800), frame(6000), frame(7580)];
  });
  expect(result[0].glint).toBe(0);
  expect(result[1].glint).toBeGreaterThan(.3);
  expect(result[2].glint).toBe(0);
  expect(result[3].art).toBeLessThan(.03);
  expect(result[3].background).toBe('rgba(0, 0, 0, 0)');
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
