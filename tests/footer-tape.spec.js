import { test, expect } from '@playwright/test';
test.use({ hasTouch: true });

test('footer games follow explicit and system themes while preserving readable game pixels', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.goto('/');
  const board = page.locator('#footer-game');
  await board.scrollIntoViewIfNeeded();
  await expect.poll(() => board.evaluate(el => typeof el.play)).toBe('function');

  // Read the actual computed SVG colours, including color-mix(), in the browser.
  const sample = () => board.evaluate(el => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    const rgba = value => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data];
    };
    const background = rgba(getComputedStyle(el.querySelector('.circuit-window__bg')).fill);
    const selectors = ['.circuit-window__head', '.circuit-window__food', '.g-block', '.g-wall', '.g-pellet', '.g-pac', '.g-ghost--0'];
    const colors = selectors.map(selector => {
      const item = el.querySelector(selector);
      if (!item) return null;
      const style = getComputedStyle(item);
      return rgba(selector === '.g-wall' ? style.stroke : style.fill);
    }).filter(Boolean);
    return { background, colors };
  });
  const luminance = rgb => {
    const [r, g, b] = rgb.slice(0, 3).map(x => {
      x /= 255;
      return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
    });
    return .2126 * r + .7152 * g + .0722 * b;
  };
  const states = [
    { system: 'dark', explicit: 'light', light: true },
    { system: 'light', explicit: 'dark', light: false },
    { system: 'dark', explicit: null, light: false },
    { system: 'light', explicit: null, light: true },
  ];
  for (const game of ['snake', 'tetris', 'pacman']) {
    await board.evaluate((el, name) => el.play(name), game);
    await expect(page.locator('#game-name')).toHaveText(game === 'pacman' ? 'pac-man' : game);
    for (const state of states) {
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: state.system });
      await page.evaluate(value => {
        if (value) document.documentElement.dataset.theme = value;
        else delete document.documentElement.dataset.theme;
      }, state.explicit);
      const result = await sample();
      const bg = luminance(result.background);
      expect(state.light ? bg : 1 - bg).toBeGreaterThan(.65);
      expect(result.colors.length).toBeGreaterThanOrEqual(game === 'snake' ? 2 : game === 'tetris' ? 1 : 4);
      for (const color of result.colors) {
        const ink = luminance(color);
        expect((Math.max(bg, ink) + .05) / (Math.min(bg, ink) + .05)).toBeGreaterThan(1.5);
      }
    }
  }
});

for (const width of [1280, 390]) {
  test(`cassette pauses the picture and resumes away from the footer at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
    await page.goto('/');
    const tape = page.locator('.footer-tape');
    const pause = page.locator('[data-tape-action="pause"]');
    await expect(tape).toHaveClass(/is-playing/);
    await pause.click();
    await expect(tape).toHaveClass(/is-paused/);
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.tape-still')).toHaveClass(/is-on/);
    await expect(page.locator('.tape-still')).toHaveCSS('pointer-events', 'none');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(pause).toBeVisible();
    await expect(pause).toHaveAttribute('aria-label', 'Resume tape playback');
    if (width < 600) await pause.tap(); else await pause.click();
    await expect(tape).toHaveClass(/is-playing/);
    await expect(pause).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.tape-still')).not.toHaveClass(/is-on/);
    await expect(page.locator('.tape-resume')).toHaveCount(0);
  });
}

test('cassette rewinds the page and respects reduced motion and language', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=pl');
  const rewind = page.locator('[data-tape-action="rewind"]');
  const pause = page.locator('[data-tape-action="pause"]');
  await page.evaluate(() => window.scrollTo(0, 2000));
  await expect(rewind).toHaveAttribute('aria-label', 'Przewiń taśmę do tyłu');
  await expect(pause).toHaveAttribute('aria-label', 'Zatrzymaj odtwarzanie taśmy');
  const before = await page.evaluate(() => scrollY);
  await rewind.click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(before - 100);
  await pause.click();
  await expect(pause).toHaveAttribute('aria-label', 'Wznów odtwarzanie taśmy');
  await expect(page.locator('.footer-tape__reel').first()).toHaveCSS('animation-name', 'none');
});

test('holding rewind winds continuously and stops on release', async ({ page }) => {
  await page.goto('/');
  const rewind = page.locator('[data-tape-action="rewind"]');
  await page.evaluate(() => window.scrollTo(0, 2000));
  const box = await rewind.boundingBox();
  const before = await page.evaluate(() => scrollY);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1000);
  await page.mouse.up();
  const after = await page.evaluate(() => scrollY);
  expect(after).toBeLessThan(before - 300);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => scrollY)).toBe(after);
  await expect(page.locator('.footer-tape')).toHaveClass(/is-playing/);
});

test('fixed transport supports keyboard navigation and does not replace REW to top', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, 2000));
  const forward = page.locator('[data-tape-action="forward"]');
  const pause = page.locator('[data-tape-action="pause"]');
  const before = await page.evaluate(() => scrollY);
  await forward.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 100);
  await pause.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('html')).toHaveClass(/is-tape-paused/);
  await page.keyboard.press('Space');
  await expect(page.locator('html')).not.toHaveClass(/is-tape-paused/);
  await page.locator('#back-top').click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(4);
});
