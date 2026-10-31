import { test, expect } from '@playwright/test';

test('TV tracking rests while its picture is covered by the card gallery', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.locator('.project-tape--art').evaluate(button => button.click());
  const screen = page.locator('#tape-player-screen');
  await screen.evaluate(el => {
    document.documentElement.style.scrollBehavior = 'auto';
    el.scrollIntoView({ block: 'center' });
  });
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

test('TV tracking rests off screen and while the television is off', async ({ page }) => {
  await page.goto('/?lang=en');
  const screen = page.locator('#tape-player-screen');
  const player = page.locator('#project-player');
  const state = () => screen.evaluate(el => getComputedStyle(el, '::after').animationPlayState.split(',').map(value => value.trim()).at(-1));
  await expect(player).toHaveClass(/is-off/);
  await expect.poll(state).toBe('paused');
  await page.locator('.project-tape--kodlab').evaluate(button => button.click());
  await screen.evaluate(el => {
    document.documentElement.style.scrollBehavior = 'auto';
    el.scrollIntoView({ block: 'center' });
  });
  await expect(player).not.toHaveClass(/is-tv-offscreen/);
  await expect.poll(state).toBe('running');
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(player).toHaveClass(/is-tv-offscreen/);
  await expect.poll(state).toBe('paused');
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
