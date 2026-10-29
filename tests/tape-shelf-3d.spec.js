import { test, expect } from '@playwright/test';

test('a selected tape comes forward without blocking its neighbours or moving the page', async ({ page }) => {
  await page.goto('/?lang=en');
  const shelf = page.locator('#project-shelf');
  const agent = shelf.locator('.project-tape--agent');
  const kodlab = shelf.locator('.project-tape--kodlab');
  const cold = shelf.locator('.project-tape--cold');
  const showcase = shelf.locator('.tape-shelf__showcase');
  const scene = showcase.locator('.tape-showcase');
  const player = page.locator('#project-player');
  await shelf.scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => scrollY);
  const positionsBefore = await Promise.all([kodlab, cold].map(item => item.boundingBox()));
  await agent.click();
  await expect(agent).toHaveAttribute('aria-expanded', 'true');
  await expect(agent).toHaveClass(/is-presented/);
  await expect(scene).toHaveClass(/is-open/);
  await expect(showcase).toHaveAttribute('aria-hidden', 'true');
  await expect(scene.locator('.tape-showcase__front .tape-cover--agent')).toBeVisible();
  await expect(kodlab).toHaveClass(/is-parting-left/);
  await expect(cold).toHaveClass(/is-parting-right/);
  await expect(player).toBeVisible();
  await expect(page.locator('#tape-player-screen')).toHaveAttribute('data-project', 'agent');
  await page.waitForTimeout(900);
  expect(Math.abs(await page.evaluate(() => scrollY) - scrollBefore)).toBeLessThanOrEqual(1);
  const positionsAfter = await Promise.all([kodlab, cold].map(item => item.boundingBox()));
  expect(positionsAfter[0].x).toBeLessThan(positionsBefore[0].x);
  expect(positionsAfter[1].x).toBeGreaterThan(positionsBefore[1].x);
  expect(await showcase.evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');

  // A real click still reaches a neighbouring spine while the decoration is in front.
  await cold.click();
  await expect(cold).toHaveAttribute('aria-expanded', 'true');
  await expect(scene.locator('.tape-cover--cold')).toBeVisible();
  await expect(page.locator('#tape-player-screen')).toHaveAttribute('data-project', 'cold');
  await page.locator('.tape-player__close').evaluate(el => el.click());
  await expect(cold).toHaveAttribute('aria-expanded', 'false');
  await expect(shelf.locator('.tape-showcase.is-open')).toHaveCount(0);
  await expect(page.locator('.tape-static')).toBeVisible();
  await page.locator('.tape-player__power').evaluate(el => el.click());
  await expect(player).toBeHidden();
});

for (const width of [375, 760, 800, 1023]) {
  test(`narrow shelf stays flat when a project is selected at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?lang=en');
    const shelf = page.locator('#project-shelf');
    const tape = shelf.locator('.project-tape--agent');
    await shelf.scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => scrollY);
    await tape.click();
    await expect(tape).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#tape-player-screen')).toHaveAttribute('data-project', 'agent');
    await expect(shelf.locator('.tape-shelf__showcase')).toBeHidden();
    await expect(shelf.locator('.project-tape')).toHaveCount(11);
    expect(Math.abs(await page.evaluate(() => scrollY) - scrollBefore)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
}

test('the real spine remains keyboard operable when its 3D cover is shown', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  const tape = page.locator('#project-shelf .project-tape--agent');
  await tape.focus();
  await page.keyboard.press('Enter');
  await expect(tape).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#tape-player-screen')).toHaveAttribute('data-project', 'agent');
  await page.keyboard.press('Escape');
  await expect(tape).toHaveAttribute('aria-expanded', 'false');
  await expect(tape).toBeFocused();
  await expect(page.locator('.tape-static')).toBeVisible();
});

for (const mode of ['light', 'dark']) {
  test(`visible covers and their edge neighbours receive correct clicks at 1024px in ${mode} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: mode });
    await page.goto('/?lang=en');
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), mode);
    const shelf = page.locator('#project-shelf');
    const screen = page.locator('#tape-player-screen');
    await shelf.scrollIntoViewIfNeeded();
    for (const [selected, neighbour] of [['bentos', 'kodlab'], ['art', 'quantum']]) {
      // Select the edge item without scrolling the page; the actual interactions
      // under test below use native mouse clicks on visible pixels.
      await shelf.locator(`.project-tape--${selected}`).evaluate(el => el.click());
      await expect(screen).toHaveAttribute('data-project', selected);
      const front = shelf.locator('.tape-showcase.is-open .tape-showcase__front');
      await expect(front).toBeVisible();
      const bounds = await front.boundingBox();
      await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await expect(screen).toHaveAttribute('data-project', selected);

      // Probe a few points inside the visible neighbouring spine to find a
      // real hit target; the turned front intentionally catches covered pixels.
      const point = await shelf.locator(`.project-tape--${neighbour}`).evaluate(el => {
        const box = el.getBoundingClientRect();
        for (const y of [.25, .5, .75]) for (const x of [.05, .15, .25, .4, .5, .6, .75, .85, .95]) {
          const px = box.left + box.width * x, py = box.top + box.height * y;
          if (px < 0 || px >= innerWidth || py < 0 || py >= innerHeight) continue;
          const hit = document.elementFromPoint(px, py);
          if (hit && (hit === el || el.contains(hit))) return { x: px, y: py };
        }
        return null;
      });
      expect(point, `A visible part of ${neighbour} must remain clickable`).not.toBeNull();
      await page.mouse.click(point.x, point.y);
      await expect(screen).toHaveAttribute('data-project', neighbour);
    }
  });
}

test('the selected cover follows both themes and reduced motion or pause stays usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.goto('/?lang=en');
  const shelf = page.locator('#project-shelf');
  await shelf.locator('.project-tape--kodlab').click();
  const scene = shelf.locator('.tape-showcase');
  const cover = scene.locator('.tape-cover--kodlab');
  await expect(cover).toBeVisible();
  const light = await cover.evaluate(el => getComputedStyle(el).backgroundColor);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect.poll(() => cover.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(light);
  await expect(page.locator('#tape-player-screen')).toHaveAttribute('data-project', 'kodlab');
  await page.locator('[data-tape-action="pause"]').evaluate(el => el.click());
  await shelf.locator('.project-tape--bentos').click();
  await expect(scene.locator('.tape-cover--bentos')).toBeVisible();
  await expect(page.locator('#tape-player-screen')).toHaveAttribute('data-project', 'bentos');
  await page.locator('.tape-player__power').evaluate(el => el.click());
  await expect(page.locator('#project-player')).toBeHidden();
  await expect(shelf.locator('.tape-showcase.is-open')).toHaveCount(0);
});
