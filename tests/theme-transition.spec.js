import { test, expect } from '@playwright/test';

test('theme switch restores the CRT transition and settles in both directions', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('html');
  const toggle = page.locator('#theme-toggle');
  await toggle.click();
  await expect(page.locator('.crt')).toHaveClass(/is-on/);
  await expect(toggle.locator('.cassette')).toHaveCSS('animation-name', 'cassette-flip');
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.crt')).not.toHaveClass(/is-on/);
  await toggle.click();
  await expect(page.locator('.crt')).toHaveClass(/is-on/);
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.crt')).not.toHaveClass(/is-on/);
});

test('rapid theme switches leave only the latest theme and no stuck CRT', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const toggle = document.querySelector('#theme-toggle');
    toggle.click(); toggle.click();
  });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.crt')).not.toHaveClass(/is-on/);
  await page.waitForTimeout(400);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('reduced motion changes the theme without the CRT animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.crt.is-on')).toHaveCount(0);
});

test('theme transition still completes while the tape is paused and the toggle is hovered', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.documentElement.classList.add('is-tape-paused'));
  const toggle = page.locator('#theme-toggle');
  await toggle.hover();
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.crt')).not.toHaveClass(/is-on/);
});

test('enabling reduced motion during a switch completes it immediately', async ({ page }) => {
  await page.goto('/');
  await page.locator('#theme-toggle').click();
  await expect(page.locator('.crt')).toHaveClass(/is-on/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.crt')).not.toHaveClass(/is-on/);
});
