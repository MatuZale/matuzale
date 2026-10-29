import { test, expect } from '@playwright/test';

test('TV tracking rests while its picture is covered by the card gallery', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.locator('.project-tape--art').evaluate(button => button.click());
  const screen = page.locator('#tape-player-screen');
  const tracking = () => screen.evaluate(el => {
    const style = getComputedStyle(el, '::after');
    const names = style.animationName.split(',').map(value => value.trim());
    const states = style.animationPlayState.split(',').map(value => value.trim());
    const index = names.indexOf('tape-tv-tracking');
    return index < 0 ? null : states[index % states.length];
  });
  await expect.poll(tracking).toBe('running');
  await screen.locator('[data-deck-open]').evaluate(button => button.click());
  await expect(page.locator('html')).toHaveClass(/deck-open/);
  await expect.poll(tracking).toBe('paused');
  await page.locator('dialog.deck .deck__close').evaluate(button => button.click());
  await expect(page.locator('html')).not.toHaveClass(/deck-open/);
  await expect.poll(tracking).toBe('running');
});

test('both snow layers rest off screen and under the gallery, and resume', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.locator('.project-tape--kodlab').evaluate(button => button.click());
  await page.locator('.tape-player__close').evaluate(button => button.click());
  const grain = page.locator('.tape-static__grain');
  await grain.scrollIntoViewIfNeeded();
  const states = () => grain.evaluate(el => [
    getComputedStyle(el, '::before').animationPlayState,
    getComputedStyle(el, '::after').animationPlayState,
  ]);
  await expect.poll(states).toEqual(['running', 'running']);
  await page.evaluate(() => document.documentElement.classList.add('deck-open'));
  await expect.poll(states).toEqual(['paused', 'paused']);
  await page.evaluate(() => document.documentElement.classList.remove('deck-open'));
  await expect.poll(states).toEqual(['running', 'running']);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(states).toEqual(['paused', 'paused']);
  await grain.scrollIntoViewIfNeeded();
  await expect.poll(states).toEqual(['running', 'running']);
});
