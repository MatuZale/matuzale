import { test, expect } from '@playwright/test';

test('selecting and changing tapes plays projects on the TV', async ({ page }) => {
  await page.goto('/?lang=pl');
  const shelf = page.locator('#project-shelf');
  const player = page.locator('#project-player');
  await expect(shelf.locator('button')).toHaveCount(11);
  await expect(shelf.locator('button').last()).toHaveId('art');
  const kodlab = shelf.getByRole('button', { name: /^Kodlab:/ });
  await kodlab.click();
  await expect(player).toBeVisible();
  await expect(player.locator('.tape-cover--kodlab')).toBeVisible();
  await expect(player).toContainText('Prywatne repozytorium', { ignoreCase: true });
  await expect(kodlab).toHaveAttribute('aria-expanded', 'true');
  await shelf.locator('#art').click();
  await expect(kodlab).toHaveAttribute('aria-expanded', 'false');
  await expect(player.locator('.tape-cover--art')).toBeVisible();
  await expect(player.locator('.tape-art-preview--art img')).toBeVisible();
  const galleryLink = player.locator('[data-deck-open]');
  await galleryLink.click();
  const gallery = page.locator('dialog.deck');
  await expect(gallery).toBeVisible();
  await gallery.locator('.deck__close').click();
  await expect(player).toBeVisible();
  await expect(galleryLink).toBeFocused();
  await player.locator('.tape-player__close').click();
  await expect(player).toBeVisible();
  await expect(player.locator('.tape-static')).toBeVisible();
  await expect(shelf.locator('#art')).toBeFocused();
  await kodlab.click();
  await expect(player.locator('.tape-cover--kodlab')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(player.locator('.tape-static')).toBeVisible();
  await expect(kodlab).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(player).toBeHidden();
  await expect(kodlab).toBeFocused();
});

test('projects remain readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#project-cards')).toBeVisible();
  await expect(page.locator('#project-cards').getByRole('heading', { name: 'Kodlab' })).toBeVisible();
  await expect(page.locator('#art')).toBeVisible();
  await context.close();
});

test('an open project follows the selected language', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.getByRole('button', { name: /^Kodlab:/ }).click();
  const player = page.locator('#project-player');
  await expect(player.locator('.tape-summary')).toContainText('A personal web and CS learning lab');
  await page.keyboard.press('2');
  await expect(player.locator('.tape-summary')).toContainText('Własne laboratorium');
  await page.keyboard.press('1');
  await expect(player.locator('.tape-summary')).toContainText('A personal web and CS learning lab');
});

test('eject can be interrupted by selecting another tape', async ({ page }) => {
  await page.goto('/?lang=en');
  const shelf = page.locator('#project-shelf');
  const player = page.locator('#project-player');
  const kodlab = shelf.getByRole('button', { name: /^Kodlab:/ });
  await kodlab.click();
  await expect(player.locator('.tape-cover--kodlab')).toBeVisible();
  await page.evaluate(() => {
    document.querySelector('.tape-player__close').click();
    document.querySelector('#art').click();
  });
  await expect(player.locator('.tape-cover--art')).toBeVisible();
  await page.waitForTimeout(400);
  await expect(player).toBeVisible();
  await expect(shelf.locator('#art')).toHaveAttribute('aria-expanded', 'true');
  await expect(kodlab).toHaveAttribute('aria-expanded', 'false');
});

test('eject remains usable with reduced motion and tape paused', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  const player = page.locator('#project-player');
  const kodlab = page.getByRole('button', { name: /^Kodlab:/ });
  await kodlab.click();
  await player.locator('.tape-player__close').click();
  await expect(player.locator('.tape-static')).toBeVisible();
  await expect(player).toBeVisible();
  await player.locator('.tape-player__power').click();
  await expect(player).toBeHidden();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => document.documentElement.classList.add('is-tape-paused'));
  await kodlab.click();
  await expect(player).toBeVisible();
  await player.locator('.tape-player__close').click();
  await expect(player.locator('.tape-static')).toBeVisible();
  await expect(player).toBeVisible();
  await player.locator('.tape-player__power').click();
  await expect(player).toBeHidden();
});

test('TV keeps its dimensions and contains each project without scrolling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  const shelf = page.locator('#project-shelf');
  const player = page.locator('#project-player');
  const screen = page.locator('#tape-player-screen');
  const tapes = shelf.locator('button');
  let size;
  for (let i = 0; i < 11; i++) {
    await tapes.nth(i).click();
    await expect(player).toHaveClass(i === 0 ? /is-playing/ : /is-changing/);
    const dimensions = await screen.evaluate(el => ({ width: el.clientWidth, height: el.clientHeight, scrollWidth: el.scrollWidth, scrollHeight: el.scrollHeight }));
    if (!size) size = { width: dimensions.width, height: dimensions.height };
    expect({ width: dimensions.width, height: dimensions.height }).toEqual(size);
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
    expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.height);
  }
  await expect(player.locator('.tape-art-preview--art img')).toBeVisible();
  await expect(screen.locator('[data-deck-open]')).toBeVisible();
});

test('attractor artwork tilts and returns when the pointer leaves', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.locator('#project-shelf #art').click();
  const picture = page.locator('.tape-art-preview--art');
  await picture.scrollIntoViewIfNeeded();
  await picture.hover({ position: { x: 30, y: 30 } });
  await expect(picture).toHaveClass(/is-print-holo-active/);
  await expect.poll(() => picture.evaluate(el => el.style.getPropertyValue('--print-tilt-y'))).not.toBe('');
  await page.mouse.move(1, 1);
  await expect(picture).not.toHaveClass(/is-print-holo-active/);
});

test('hidden station ident returns control and cancels on tape change', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  const shelf = page.locator('#project-shelf');
  const player = page.locator('#project-player');
  const screen = page.locator('#tape-player-screen');
  const ident = player.locator('.tape-ident');
  await shelf.getByRole('button', { name: /^Kodlab:/ }).click();
  await player.getByRole('button', { name: 'Play hidden VHS ident' }).click();
  await expect(ident).toBeVisible();
  await expect(screen).toHaveAttribute('inert', '');
  await expect(ident).toBeHidden({ timeout: 4000 });
  await expect(screen).not.toHaveAttribute('inert', '');
  await player.getByRole('button', { name: 'Play hidden VHS ident' }).click();
  await shelf.locator('#art').click();
  await expect(ident).toBeHidden();
  await expect(screen).not.toHaveAttribute('inert', '');
  await player.getByRole('button', { name: 'Play hidden VHS ident' }).click();
  await player.locator('.tape-player__close').click();
  await expect(player.locator('.tape-static')).toBeVisible();
  await expect(player).toBeVisible();
  await expect(screen).not.toHaveAttribute('inert', '');
  await expect(ident).toBeHidden();
  await player.locator('.tape-player__power').click();
  await expect(player).toBeHidden();
});

test('selecting a tape does not move the page', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  const kodlab = page.getByRole('button', { name: /^Kodlab:/ });
  await kodlab.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await kodlab.click();
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  await expect(page.locator('#project-player')).toBeVisible();
});

test('all projects fit the TV at phone sizes in both languages', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 900 });
    for (const lang of ['en', 'pl']) {
      await page.goto(`/?lang=${lang}`);
      await page.evaluate(() => document.fonts.ready);
      const results = await page.evaluate(() => {
        const screen = document.querySelector('#tape-player-screen');
        return [...document.querySelectorAll('#project-shelf button')].map(button => {
          button.click();
          const bounds = screen.getBoundingClientRect();
          const clipped = [...screen.querySelectorAll('.badge, h3, .tape-summary, .card__links a, figure')].some(el => {
            if (getComputedStyle(el).display === 'none' || el.hidden) return false;
            const box = el.getBoundingClientRect();
            return box.left < bounds.left - 1 || box.right > bounds.right + 1 || box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1;
          });
          return { clipped, overflow: screen.scrollHeight > screen.clientHeight || screen.scrollWidth > screen.clientWidth };
        });
      });
      expect(results).toHaveLength(11);
      expect(results.filter(result => result.clipped || result.overflow)).toEqual([]);
    }
  }
});

test('five-colour glow follows hover, not selection, and respects reduced motion', async ({ page }) => {
  await page.goto('/?lang=en');
  const tape = page.getByRole('button', { name: /^Kodlab:/ });
  await tape.hover();
  await expect.poll(() => tape.evaluate(el => getComputedStyle(el).animationName)).toBe('tape-halo-turn');
  const first = await tape.evaluate(el => getComputedStyle(el).getPropertyValue('--tape-halo-angle'));
  await page.waitForTimeout(300);
  const second = await tape.evaluate(el => getComputedStyle(el).getPropertyValue('--tape-halo-angle'));
  expect(second).not.toBe(first);
  await tape.click();
  await page.mouse.move(1, 1);
  await expect(tape).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => tape.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await tape.hover();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => tape.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});

test('Kodlab preview follows the language and theme, including the system theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  await page.getByRole('button', { name: /^Kodlab:/ }).click();
  const image = page.locator('[data-kodlab-preview]');
  await expect(image).toHaveAttribute('src', 'assets/kodlab-en-light.png');
  await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
  await page.keyboard.press('2');
  await expect(image).toHaveAttribute('src', 'assets/kodlab-pl-light.png');
  await page.locator('#theme-toggle').click();
  await expect(image).toHaveAttribute('src', 'assets/kodlab-pl-dark.png');
  await page.keyboard.press('1');
  await expect(image).toHaveAttribute('src', 'assets/kodlab-en-dark.png');
  await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(image).toHaveAttribute('src', 'assets/kodlab-en-dark.png');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(image).toHaveAttribute('src', 'assets/kodlab-en-light.png');
});

test('BENTOS keeps its own identity across themes', async ({ page }) => {
  await page.goto('/?lang=en');
  const tape = page.locator('.project-tape--bentos');
  await tape.click();
  const screen = page.locator('#tape-player-screen');
  await expect(screen).toHaveAttribute('data-project', 'bentos');
  const before = await screen.evaluate(el => getComputedStyle(el).backgroundImage);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const after = await screen.evaluate(el => getComputedStyle(el).backgroundImage);
  expect(after).toBe(before);
  await tape.hover();
  await expect.poll(() => tape.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});

test('VHS ident moves its T-120 title and BENTOS controls remain clickable', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.locator('.project-tape--bentos').click();
  const screen = page.locator('#tape-player-screen');
  const ident = page.locator('.tape-ident');
  await page.locator('.tape-player__secret').click();
  await expect(ident).toBeVisible();
  const title = ident.locator('.tape-ident__title');
  await expect(title).toContainText('120');
  const first = await title.evaluate(el => getComputedStyle(el).transform);
  await page.waitForTimeout(1600);
  const second = await title.evaluate(el => getComputedStyle(el).transform);
  expect(second).not.toBe(first);
  await page.locator('.tape-player__close').click();
  await expect(ident).toBeHidden();
  await expect(screen).not.toHaveAttribute('inert', '');
});

for (const width of [1280, 375]) {
  test(`TM ident enters from opposite sides and leaves the frame at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?lang=en');
    await page.locator('.project-tape--kodlab').evaluate(el => el.click());
    await page.locator('.tape-player__secret').evaluate(el => el.click());
    const ident = page.locator('.tape-ident');
    await expect(ident).toBeVisible();
    const frames = await ident.evaluate(el => {
      const composition = el.querySelector('.tape-ident__composition');
      const title = el.querySelector('.tape-ident__title');
      const stripes = [...el.querySelectorAll('.tape-ident__bars i')];
      const animations = el.getAnimations({ subtree: true });
      animations.forEach(animation => animation.pause());
      return [0, 3800, 7000].map(time => {
        animations.forEach(animation => { animation.currentTime = time; });
        const frame = composition.getBoundingClientRect();
        const logo = title.getBoundingClientRect();
        const bars = stripes.map(stripe => stripe.getBoundingClientRect());
        return {
          frame: { left: frame.left, right: frame.right },
          logo: { left: logo.left, right: logo.right },
          bars: bars.map(bar => ({ left: bar.left, right: bar.right })),
        };
      });
    });
    for (const frame of [frames[0], frames[2]]) {
      // The multicolour title shadow extends 10 px beyond the text's box.
      expect(frame.logo.right + 10).toBeLessThan(frame.frame.left);
      for (const stripe of frame.bars) expect(stripe.left).toBeGreaterThan(frame.frame.right);
    }
    const middle = frames[1];
    expect(middle.logo.left).toBeGreaterThanOrEqual(middle.frame.left);
    expect(middle.logo.right).toBeLessThanOrEqual(middle.frame.right);
    for (const stripe of middle.bars) {
      expect(stripe.left).toBeLessThan(middle.frame.right);
      expect(stripe.right).toBeGreaterThan(middle.frame.left);
    }
  });
}

test('rare VHS tracking stays inside the screen and pauses safely', async ({ page }) => {
  await page.addInitScript(() => {
    const native = window.setTimeout;
    window.setTimeout = function (fn, delay, ...args) {
      return native(fn, fn?.name === 'showInterference' ? 250 : delay, ...args);
    };
  });
  await page.goto('/?lang=en');
  await page.getByRole('button', { name: /^Kodlab:/ }).click();
  const screen = page.locator('#tape-player-screen');
  await screen.scrollIntoViewIfNeeded();
  const overlay = screen.locator('.tape-interference');
  await expect(overlay).toHaveClass(/is-tracking/, { timeout: 10000 });
  expect(await overlay.evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');
  await page.evaluate(() => document.documentElement.classList.add('is-tape-paused'));
  await expect(overlay).not.toHaveClass(/is-tracking/);
  await page.waitForTimeout(500);
  await expect(overlay).not.toHaveClass(/is-tracking/);
  await page.evaluate(() => document.documentElement.classList.remove('is-tape-paused'));
  await expect(overlay).toHaveClass(/is-tracking/, { timeout: 10000 });
  await page.locator('.tape-player__secret').click();
  await expect(overlay).not.toHaveClass(/is-tracking/);
  await expect(screen).toHaveAttribute('inert', '');
  await page.locator('.tape-player__close').click();
  await expect(overlay).not.toHaveClass(/is-tracking/);
  await expect(screen).not.toHaveAttribute('inert', '');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: /^Kodlab:/ }).click();
  await screen.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await expect(overlay).not.toHaveClass(/is-tracking/);
});

test('TM ident follows both page themes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.goto('/?lang=en');
  await page.getByRole('button', { name: /^Kodlab:/ }).click();
  await page.locator('.tape-player__secret').click();
  const ident = page.locator('.tape-ident__art');
  await expect(ident).toBeVisible();
  const light = await ident.evaluate(el => getComputedStyle(el).backgroundColor);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const dark = await ident.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(dark).not.toBe(light);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  expect(await ident.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(light);
});

test('still ident keeps its title readable on desktop and phone in both themes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.goto('/?lang=en');
  await page.getByRole('button', { name: /^Kodlab:/ }).click();
  const trigger = page.locator('.tape-player__secret');
  const ident = page.locator('.tape-ident');
  const title = ident.locator('.tape-ident__title');
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
      await trigger.evaluate(el => el.click());
      await expect(ident).toHaveClass(/is-still/);
      await expect(title).toBeVisible();
      await expect(title).toContainText('120');
      await expect(title).toHaveCSS('animation-name', 'none');
      const bounds = await ident.evaluate(el => {
        const outer = el.getBoundingClientRect();
        const text = el.querySelector('.tape-ident__title').getBoundingClientRect();
        return { left: text.left - outer.left, right: outer.right - text.right,
          top: text.top - outer.top, bottom: outer.bottom - text.bottom };
      });
      // Allow subpixel rounding, but never crop the title at the CRT's edge.
      for (const distance of Object.values(bounds)) expect(distance).toBeGreaterThanOrEqual(-1);
    }
  }
});

test('replaying a paused ident resets its timer and restores the screen', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.getByRole('button', { name: /^Kodlab:/ }).click();
  const pause = page.locator('[data-tape-action="pause"]');
  const trigger = page.locator('.tape-player__secret');
  const screen = page.locator('#tape-player-screen');
  const ident = page.locator('.tape-ident');
  await pause.evaluate(el => el.click());
  await trigger.evaluate(el => el.click());
  await expect(ident).toHaveClass(/is-still/);
  await expect(ident.locator('.tape-ident__title')).toBeVisible();
  await expect(screen).toHaveAttribute('inert', '');
  await page.waitForTimeout(1400);
  await trigger.evaluate(el => el.click());
  await page.waitForTimeout(1300);
  await expect(ident).toBeVisible();
  await expect(ident).toBeHidden({ timeout: 2500 });
  await expect(screen).not.toHaveAttribute('inert', '');
  await pause.evaluate(el => el.click());
  await trigger.evaluate(el => el.click());
  await expect(ident).toHaveClass(/is-running/);
  await pause.evaluate(el => el.click());
  await expect(ident).toBeHidden();
  await expect(screen).not.toHaveAttribute('inert', '');
});

test('all tape sleeves share one size and T-120 format', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  const shelf = page.locator('#project-shelf');
  await expect(shelf.locator('button')).toHaveCount(11);
  for (const width of [375, 800, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const result = await shelf.locator('button').evaluateAll(buttons => {
      const sizes = buttons.map(button => `${button.offsetWidth}x${button.offsetHeight}`);
      const formats = buttons.map(button => button.querySelector('.project-tape__format').textContent.trim());
      const last = buttons.at(-1);
      const previous = buttons.at(-2).getBoundingClientRect();
      const gap = last.getBoundingClientRect().left - previous.right;
      const tilted = getComputedStyle(last).transform !== 'none';
      const covers = buttons.map(button => {
        button.click();
        return document.querySelector('#project-player .tape-cover__format').textContent.trim();
      });
      return { sizes: [...new Set(sizes)], formats, covers, gap, tilted, lastId: last.id };
    });
    expect(result.sizes).toHaveLength(1);
    expect(result.formats.every(format => format.startsWith('T-120'))).toBe(true);
    expect(result.covers.every(format => format.startsWith('T-120'))).toBe(true);
    expect(result.lastId).toBe('art');
    expect(result.tilted).toBe(true);
    expect(result.gap).toBeGreaterThanOrEqual(0);
  }
});
