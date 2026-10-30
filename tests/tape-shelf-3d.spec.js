import { test, expect } from '@playwright/test';

for (const mode of ['light', 'dark']) {
  test(`moving spines retain their printed accents in ${mode} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: mode });
    await page.goto('/?lang=en');
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), mode);
    for (const key of ['kodlab', 'agent']) {
      await page.locator(`.project-tape--${key}`).evaluate(el => el.click());
      const matching = await page.evaluate(key => {
        const source = document.querySelector(`.project-tape--${key}`);
        const replica = [...document.querySelectorAll('.tape-showcase')].find(item => item.source === source);
        const properties = ['background-image', 'background-color', 'border-top-width', 'border-top-style', 'border-top-color', 'color', 'font-size', 'letter-spacing', 'order'];
        const copies = replica.querySelectorAll('.tape-showcase__replica *');
        return [...source.querySelectorAll('*')].map((child, index) => {
          const original = getComputedStyle(child), copy = getComputedStyle(copies[index]);
          return properties.map(property => [original.getPropertyValue(property), copy.getPropertyValue(property)]);
        }).flat();
      }, key);
      for (const [original, copy] of matching) expect(copy).toBe(original);
      // Begin putting this sleeve back while the other one comes forward. The
      // closing copy must carry the same top stripe throughout the handover.
      await page.locator(`.project-tape--${key === 'kodlab' ? 'agent' : 'kodlab'}`).evaluate(el => el.click());
      await expect(page.locator(`.project-tape--${key}`)).toHaveClass(/is-presented/);
      const stripe = await page.evaluate(key => {
        const source = document.querySelector(`.project-tape--${key}`);
        const replica = [...document.querySelectorAll('.tape-showcase')].find(item => item.source === source);
        const label = getComputedStyle(source.querySelector('.project-tape__label'));
        const moving = getComputedStyle(replica.querySelector('.project-tape__label'));
        return [label.borderTopWidth, label.borderTopColor, moving.borderTopWidth, moving.borderTopColor];
      }, key);
      expect(stripe.slice(2)).toEqual(stripe.slice(0, 2));
      expect(stripe[0]).toBe('5px');
    }
  });
}

test('replicas stay attached to moving spines during rapid changes', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.locator('#project-shelf').scrollIntoViewIfNeeded();
  const result = await page.evaluate(async () => {
    const samples = [], angles = [];
    const rotation = element => {
      const value = getComputedStyle(element).transform;
      if (value === 'none') return 0;
      const matrix = new DOMMatrixReadOnly(value);
      return Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
    };
    const keys = ['kodlab', 'agent', 'bentos', 'physics', 'art', 'cold'];
    for (const key of keys) {
      document.querySelector(`.project-tape--${key}`).click();
      await new Promise(resolve => {
        const start = performance.now();
        const frame = now => {
          for (const replica of document.querySelectorAll('.tape-showcase')) {
            const box = replica.getBoundingClientRect();
            const spine = replica.source.getBoundingClientRect();
            samples.push(Math.max(Math.abs(box.left + box.width / 2 - spine.left - spine.width / 2),
              Math.abs(box.top + box.height / 2 - spine.top - spine.height / 2)));
            angles.push(Math.abs(rotation(replica.source) - rotation(replica.querySelector('.tape-showcase__replica'))));
          }
          if (now - start < 110) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
    }
    await new Promise(resolve => setTimeout(resolve, 850));
    return { samples, angles, replicas: document.querySelectorAll('.tape-showcase').length,
      hidden: document.querySelectorAll('.project-tape.is-presented').length };
  });
  expect(result.samples.length).toBeGreaterThan(10);
  // Allow one rendered frame of motion and small rounding differences in WebKit.
  expect(Math.max(...result.samples)).toBeLessThan(8);
  expect(Math.max(...result.angles)).toBeLessThan(1);
  expect(result.replicas).toBe(1);
  expect(result.hidden).toBe(1);
  await expect(page.locator('#tape-player-screen')).toHaveAttribute('data-project', 'cold');
});

for (const mode of ['reduced motion', 'tape pause']) {
  test(`rapid changes settle in place with ${mode}`, async ({ page }) => {
    if (mode === 'reduced motion') await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?lang=en');
    if (mode === 'tape pause') await page.locator('[data-tape-action="pause"]').evaluate(el => el.click());
    const result = await page.evaluate(() => {
      const deviations = [], angles = [];
      for (const key of ['kodlab', 'agent', 'bentos', 'physics', 'art', 'cold']) {
        document.querySelector(`.project-tape--${key}`).click();
        const replica = document.querySelector('.tape-showcase.is-open');
        const box = replica.getBoundingClientRect(), spine = replica.source.getBoundingClientRect();
        deviations.push(Math.max(Math.abs(box.left + box.width / 2 - spine.left - spine.width / 2),
          Math.abs(box.top + box.height / 2 - spine.top - spine.height / 2)));
        const angle = element => {
          const value = getComputedStyle(element).transform;
          if (value === 'none') return 0;
          const matrix = new DOMMatrixReadOnly(value);
          return Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
        };
        angles.push(Math.abs(angle(replica.source) - angle(replica.querySelector('.tape-showcase__replica'))));
      }
      return { deviations, angles, replicas: document.querySelectorAll('.tape-showcase').length,
        hidden: document.querySelectorAll('.project-tape.is-presented').length };
    });
    expect(Math.max(...result.deviations)).toBeLessThan(4);
    expect(Math.max(...result.angles)).toBeLessThan(.1);
    expect(result.replicas).toBe(1);
    expect(result.hidden).toBe(1);
    await expect(page.locator('#tape-player-screen')).toHaveAttribute('data-project', 'cold');
  });
}

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
  await expect(player).toHaveClass(/is-off/);
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
  const sourceLabel = shelf.locator('.project-tape--kodlab .project-tape__label');
  const replicaLabel = scene.locator('.tape-showcase__replica .project-tape__label');
  await expect(cover).toBeVisible();
  const light = await cover.evaluate(el => getComputedStyle(el).backgroundColor);
  const lightLabel = await replicaLabel.evaluate(el => getComputedStyle(el).backgroundColor);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect.poll(() => cover.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(light);
  await expect.poll(() => replicaLabel.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(lightLabel);
  expect(await replicaLabel.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(await sourceLabel.evaluate(el => getComputedStyle(el).backgroundColor));
  await expect(page.locator('#tape-player-screen')).toHaveAttribute('data-project', 'kodlab');
  await page.locator('[data-tape-action="pause"]').evaluate(el => el.click());
  await shelf.locator('.project-tape--bentos').click();
  await expect(scene.locator('.tape-cover--bentos')).toBeVisible();
  await expect(page.locator('#tape-player-screen')).toHaveAttribute('data-project', 'bentos');
  await page.locator('.tape-player__power').evaluate(el => el.click());
  await expect(page.locator('#project-player')).toHaveClass(/is-off/);
  await expect(shelf.locator('.tape-showcase.is-open')).toHaveCount(0);
});
