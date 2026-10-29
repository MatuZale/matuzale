import { test, expect } from '@playwright/test';

test('image fills the TV, Escape returns focus, and the screen keeps its size', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.getByRole('button', { name: /^Kodlab:/ }).click();
  const screen = page.locator('#tape-player-screen');
  const preview = screen.locator('.tape-image-open');
  await expect(preview).toBeVisible();
  const before = await screen.boundingBox();
  await preview.click();
  const full = screen.locator('.tape-image-full');
  await expect(full).toBeVisible();
  await expect(full).toBeFocused();
  await expect(screen.locator('.card__body')).toHaveAttribute('inert', '');
  const after = await screen.boundingBox();
  expect(after.width).toBeCloseTo(before.width, 0);
  expect(after.height).toBeCloseTo(before.height, 0);
  await expect(full.locator('img')).toHaveAttribute('src', /kodlab-en-/);
  await page.keyboard.press('Escape');
  await expect(full).toHaveCount(0);
  await expect(preview).toBeFocused();
  await expect(screen.locator('.card__body')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#project-player')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#project-player')).toBeHidden();
});

test('zoomed Kodlab image follows language and theme', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.goto('/?lang=en');
  await page.getByRole('button', { name: /^Kodlab:/ }).click();
  await page.locator('.tape-image-open').click();
  const full = page.locator('.tape-image-full');
  await expect(full.locator('img')).toHaveAttribute('src', /kodlab-en-light\.png$/);
  await page.keyboard.press('2');
  await expect(full.locator('img')).toHaveAttribute('src', /kodlab-pl-light\.png$/);
  await expect(full).toHaveAttribute('aria-label', /Wróć do opisu/);
  await page.locator('#theme-toggle').click();
  await expect(full.locator('img')).toHaveAttribute('src', /kodlab-pl-dark\.png$/);
  await full.click();
  await expect(full).toHaveCount(0);
  await expect(page.locator('.tape-image-interruption')).toHaveCount(0);
});

test('artwork zoom is cleared when selecting another tape or playing TM', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  await page.locator('#project-shelf #art').click();
  await page.locator('.tape-image-open').click();
  await expect(page.locator('.tape-image-full img')).toHaveAttribute('src', /attractor\.jpg$/);
  await page.locator('.tape-player__secret').click();
  await expect(page.locator('.tape-image-full')).toHaveCount(0);
  await expect(page.locator('.tape-ident')).toBeVisible();
  await page.getByRole('button', { name: /^Kodlab:/ }).click();
  await expect(page.locator('.tape-ident')).toBeHidden();
  await page.locator('.tape-image-open').click();
  await page.locator('.project-tape--quantum').click();
  await expect(page.locator('.tape-image-full')).toHaveCount(0);
  await expect(page.locator('#tape-player-screen .tape-image-open img')).toHaveAttribute('src', /young-yamanouchi\.png$/);
});

test('both picture cuts show a brief VHS interruption', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.getByRole('button', { name: /^Kodlab:/ }).click();
  const screen = page.locator('#tape-player-screen');
  await screen.locator('.tape-image-open').evaluate(el => el.click());
  await expect(screen.locator('.tape-image-interruption')).toBeVisible();
  await expect(screen.locator('.tape-image-interruption')).toHaveCount(0, { timeout: 3000 });
  await screen.locator('.tape-image-full').evaluate(el => el.click());
  await expect(screen.locator('.tape-image-interruption')).toBeVisible();
  await expect(screen.locator('.tape-image-interruption')).toHaveCount(0, { timeout: 3000 });
});

test('enlarged image fits the TV on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  await page.getByRole('button', { name: /^Kodlab:/ }).click();
  await page.locator('#tape-player-screen .tape-image-open').click();
  const screen = page.locator('#tape-player-screen');
  const full = screen.locator('.tape-image-full');
  await expect(full).toBeVisible();
  const boxes = await Promise.all([screen.boundingBox(), full.boundingBox()]);
  expect(boxes[1].width).toBeLessThanOrEqual(boxes[0].width);
  expect(boxes[1].height).toBeLessThanOrEqual(boxes[0].height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});
