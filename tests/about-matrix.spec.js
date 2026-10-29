import { test, expect } from '@playwright/test';

test('rare terminal message can be shown and pauses without changing the original', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.999999999; });
  await page.goto('/?lang=en');
  const terminal = page.locator('.about-terminal');
  await terminal.scrollIntoViewIfNeeded();
  await expect.poll(() => terminal.evaluate(el => typeof el.matrix)).toBe('function');
  await expect.poll(() => terminal.evaluate(el => el.matrix())).toBe(true);
  const message = terminal.locator('.about-matrix');
  await expect(message).toBeVisible();
  await expect.poll(() => message.locator('.about-matrix__text').textContent()).toMatch(/^… Follow/);
  const original = await terminal.locator('.about-terminal__body').innerText();
  await page.locator('[data-tape-action="pause"]').evaluate(el => el.click());
  const frozen = await message.locator('.about-matrix__text').textContent();
  await page.waitForTimeout(300);
  expect(await message.locator('.about-matrix__text').textContent()).toBe(frozen);
  await page.locator('[data-tape-action="pause"]').evaluate(el => el.click());
  await expect.poll(() => message.locator('.about-matrix__text').textContent()).not.toBe(frozen);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(message).toBeHidden();
  expect(await terminal.locator('.about-terminal__body').innerText()).toBe(original);
  expect(await terminal.evaluate(el => el.matrix())).toBe(false);
});

test('the terminal message follows the Polish channel', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.999999999; });
  await page.goto('/?lang=pl');
  const terminal = page.locator('.about-terminal');
  await terminal.scrollIntoViewIfNeeded();
  await expect.poll(() => terminal.evaluate(el => el.matrix())).toBe(true);
  const message = terminal.locator('.about-matrix__text');
  await expect(message).toContainText('Podążaj');
  await expect(message).not.toContainText('Tomasz');
});
