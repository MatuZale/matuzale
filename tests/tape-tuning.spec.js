import { test, expect } from '@playwright/test';

// Fix the two samples used by tuning without changing unrelated visual effects.
async function select(page, selector, samples) {
  return page.evaluate(({ selector, samples }) => {
    const original = Math.random;
    let index = 0;
    Math.random = () => samples[index++] ?? .5;
    try {
      document.querySelector(selector).click();
      return {
        project: document.querySelector('#tape-player-screen').dataset.project,
        snow: document.querySelectorAll('.tape-static--tuning').length,
      };
    } finally {
      Math.random = original;
    }
  }, { selector, samples });
}

test('tuning can lock instantly or briefly, and a long interruption is interrupted by the next cassette', async ({ page }) => {
  await page.goto('/?lang=en');
  const screen = page.locator('#tape-player-screen');
  await page.evaluate(() => {
    window.tuningChannels = [];
    document.addEventListener('tape-channel-change', event => window.tuningChannels.push(event.detail));
  });

  expect(await select(page, '.project-tape--kodlab', [.01])).toEqual({ project: 'kodlab', snow: 0 });
  expect(await select(page, '.project-tape--art', [.5, 0])).toEqual({ project: 'art', snow: 1 });
  await expect(screen.locator('.tape-static--tuning')).toHaveCount(0, { timeout: 1000 });

  expect(await select(page, '.project-tape--agent', [.5, .999])).toEqual({ project: 'agent', snow: 1 });
  await page.waitForTimeout(150);
  await expect(screen.locator('.tape-static--tuning')).toHaveCount(1);
  expect(await select(page, '.project-tape--quantum', [.01])).toEqual({ project: 'quantum', snow: 0 });
  await page.waitForTimeout(1100);
  await expect(screen.locator('.tape-static--tuning, .tape-test-pattern--tuning')).toHaveCount(0);
  await expect(screen).toHaveAttribute('data-project', 'quantum');
  expect(await page.evaluate(() => window.tuningChannels)).toEqual([
    { channel: '02', title: 'KODLAB' },
    { channel: '05', title: 'ATTRACTORS' },
    { channel: '03', title: 'AGENT CONTROL' },
    { channel: '12', title: 'QUANTUM' },
  ]);
});

test('eject, power, ident and reduced motion cancel pending tuning', async ({ page }) => {
  await page.goto('/?lang=en');
  const screen = page.locator('#tape-player-screen');
  const noise = screen.locator('.tape-static--tuning, .tape-test-pattern--tuning');
  for (const control of ['.tape-player__close', '.tape-player__power', '.tape-player__secret']) {
    await select(page, '.project-tape--kodlab', [.5, .999]);
    await expect(noise).toHaveCount(1);
    await page.locator(control).evaluate(el => el.click());
    await expect(noise).toHaveCount(0);
  }
  await select(page, '.project-tape--agent', [.5, .999]);
  await expect(noise).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(noise).toHaveCount(0);
  expect(await select(page, '.project-tape--kodlab', [.5, .999])).toEqual({ project: 'kodlab', snow: 0 });
});

test('Spacewar shares tuning and has its own channel', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.evaluate(() => {
    window.tuningChannels = [];
    document.addEventListener('tape-channel-change', event => window.tuningChannels.push(event.detail));
    document.documentElement.classList.add('is-crt');
    document.dispatchEvent(new Event('crtchange'));
  });
  expect(await select(page, '.project-tape--spacewar', [.5, .999])).toEqual({ project: 'spacewar', snow: 1 });
  expect(await page.evaluate(() => window.tuningChannels.at(-1))).toEqual({ channel: '04', title: 'SPACEWAR!' });
  await expect(page.locator('#tape-player-screen .tape-static--tuning')).toHaveCount(0, { timeout: 2000 });
  await expect(page.locator('#tape-player-screen')).toHaveAttribute('data-project', 'spacewar');
});
