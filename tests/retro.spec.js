import { test, expect } from '@playwright/test';

test('navigation and rewind show tracking noise only while seeking', async ({ page }) => {
  await page.goto('/');
  await page.locator('#nav-links a[href="#contact"]').click();
  const tape = page.locator('.tape-transport');
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.locator('.osd__main')).toHaveText('FF ▶▶');
  await expect(tape).toHaveClass(/is-on/);
  await expect(tape).toHaveAttribute('data-direction', 'forward');
  await expect(tape).toHaveCSS('pointer-events', 'none');
  await expect(tape.locator('.tape-transport__band--major')).toHaveCount(1);
  await expect(tape.locator('.tape-transport__band--major')).toHaveCSS('animation-name', 'tape-tracking');
  await expect(tape).not.toHaveClass(/is-on/, { timeout: 10_000 });

  await page.locator('#nav-links a[href="#about"]').click();
  await expect(page).toHaveURL(/#about$/);
  await expect(page.locator('.osd__main')).toHaveText('◀◀ REW');
  await expect(tape).toHaveAttribute('data-direction', 'back');
  await expect(tape).toHaveClass(/is-on/);
  await expect(tape).not.toHaveClass(/is-on/, { timeout: 10_000 });

  await page.locator('#back-top').click();
  await expect(page.locator('.osd__main')).toHaveText('◀◀ REW');
  await expect(tape).toHaveClass(/is-on/);
  await expect(tape).not.toHaveClass(/is-on/, { timeout: 10_000 });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(4);
});

test('cassette reflects the selected theme and keeps the toggle accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const toggle = page.locator('#theme-toggle');
  const cassette = toggle.locator('.cassette');
  const footer = page.locator('.footer-tape');
  await expect(footer.locator('.footer-tape__side-b')).toBeVisible();
  const footerBefore = await footer.locator('.footer-tape__cassette').evaluate(el => getComputedStyle(el).backgroundColor);
  const before = await cassette.evaluate(el => getComputedStyle(el).backgroundColor);
  await expect(toggle).toHaveAttribute('aria-label', 'Switch to light theme');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAttribute('aria-label', 'Switch to dark theme');
  await expect(footer.locator('.footer-tape__side-a')).toBeVisible();
  expect(await footer.locator('.footer-tape__cassette').evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(footerBefore);
  const after = await cassette.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(after).not.toBe(before);
});

test('theme changes while the cassette is being inserted', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('#theme-toggle');
  await toggle.click();
  await expect(toggle).toHaveClass(/is-inserting/);
  await expect(toggle.locator('.cassette')).toHaveCSS('animation-name', 'cassette-flip');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(toggle).not.toHaveClass(/is-inserting/);
});

test('portfolio and BENTOS fonts load with Polish characters on every channel', async ({ page }) => {
  await page.goto('/?lang=pl');
  const loaded = await page.evaluate(async () => {
    const sample = 'Zażółć gęślą jaźń Młynik';
    const faces = ['400 16px "IBM Plex Mono"', '400 16px "Open Sauce Sans"', '400 16px "Bentos Space Mono"'];
    return Promise.all(faces.map(async face => {
      const loaded = await document.fonts.load(face, sample);
      return loaded.length > 0 && loaded.every(font => font.status === 'loaded');
    }));
  });
  expect(loaded).toEqual([true, true, true]);
  await expect(page.locator('.hero__title')).toHaveCSS('font-family', /IBM Plex Mono/);
  await expect(page.locator('.bentos h2')).toHaveCSS('font-family', /Open Sauce Sans/);
  await page.locator('[data-channel="bin"]').click();
  await expect(page.locator('.hero__title')).toHaveCSS('font-family', /IBM Plex Mono/);
});

test('reduced motion keeps navigation without tracking animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#nav-links a[href="#contact"]').click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.locator('.tape-transport.is-on')).toHaveCount(0);
  await expect(page.locator('#contact')).toBeInViewport();
  await page.keyboard.press('Backspace');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(4);
  await expect(page.locator('.tape-transport.is-on')).toHaveCount(0);
});

test('navigation and the About heading fit a narrow screen in both languages', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const channel of ['en', 'pl']) {
    await page.locator(`[data-channel="${channel}"]`).click();
    const fit = await page.evaluate(() => {
      const burger = document.querySelector('#burger').getBoundingClientRect();
      const title = document.querySelector('#about .about__text h2').getBoundingClientRect();
      return { burgerRight: burger.right, titleRight: title.right, width: innerWidth };
    });
    expect(fit.burgerRight).toBeLessThanOrEqual(fit.width);
    expect(fit.titleRight).toBeLessThanOrEqual(fit.width);
    await expect(page.locator('#about .about__text h2 em')).toHaveCSS('background-image', /linear-gradient/);
  }
});

test('Experience navigation follows the journey section in both languages', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  const link = page.locator('#nav-links a[href="#journey"]');
  await expect(link).toHaveText('Experience');
  await link.click();
  await expect(page).toHaveURL(/#journey$/);
  await expect(page.locator('#journey')).toBeInViewport();
  await expect(link).toHaveAttribute('aria-current', 'location');
  await expect(page.locator('#nav-links a[href="#about"]')).not.toHaveAttribute('aria-current', 'location');
  await page.locator('[data-channel="pl"]').click();
  await expect(link).toHaveText('Doświadczenie');
  await expect(link).toHaveAttribute('aria-current', 'location');
  await page.locator('[data-channel="en"]').click();
  await expect(link).toHaveText('Experience');
});

for (const width of [320, 390, 1000, 1001, 1280]) {
  test(`navigation including Experience fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?lang=en');
    for (const channel of ['en', 'pl']) {
      await page.locator(`[data-channel="${channel}"]`).click();
      const burger = page.locator('#burger');
      if (await burger.isVisible() && await burger.getAttribute('aria-expanded') !== 'true') await burger.click();
      const link = page.locator('#nav-links a[href="#journey"]');
      await expect(link).toBeVisible();
      await expect(link).toHaveText(channel === 'en' ? 'Experience' : 'Doświadczenie');
      const bounds = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
        return { menu: rect('#nav-links'), brand: rect('.nav__brand'), actions: rect('.nav__actions'),
          link: rect('#nav-links a[href="#journey"]'), viewport: innerWidth, page: document.documentElement.scrollWidth };
      });
      expect(bounds.page).toBeLessThanOrEqual(bounds.viewport);
      expect(bounds.menu.left).toBeGreaterThanOrEqual(0);
      expect(bounds.menu.right).toBeLessThanOrEqual(bounds.viewport);
      expect(bounds.link.left).toBeGreaterThanOrEqual(bounds.menu.left);
      expect(bounds.link.right).toBeLessThanOrEqual(bounds.menu.right);
      if (width > 1000) {
        expect(bounds.menu.left).toBeGreaterThanOrEqual(bounds.brand.right);
        expect(bounds.menu.right).toBeLessThanOrEqual(bounds.actions.left);
      }
    }
  });
}

test('page and TV controls use a warm hover while disabled eject stays quiet', async ({ page }) => {
  await page.goto('/?lang=en');
  const cta = page.locator('.hero .btn--ghost');
  const channel = page.locator('[data-channel="pl"]');
  const theme = page.locator('#theme-toggle');
  const colour = locator => locator.evaluate(el => getComputedStyle(el).borderTopColor);
  const warm = value => {
    const channels = value.match(/\d+/g)?.map(Number) || [];
    return channels.length >= 3 && channels[0] > channels[1] && channels[1] > channels[2];
  };
  for (const mode of ['light', 'dark']) {
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), mode);
    for (const target of [cta, channel, theme]) {
      await page.mouse.move(0, 0);
      const before = await colour(target);
      await target.hover();
      await expect.poll(() => colour(target)).not.toBe(before);
      await expect.poll(async () => warm(await colour(target))).toBe(true);
    }
  }
  await page.locator('.project-tape--kodlab').click();
  const eject = page.locator('.tape-player__close');
  const power = page.locator('.tape-player__power');
  for (const target of [eject, power]) {
    await page.mouse.move(0, 0);
    const before = await colour(target);
    await target.hover();
    await expect.poll(() => colour(target)).not.toBe(before);
    await expect.poll(async () => warm(await colour(target))).toBe(true);
  }
  await eject.click();
  await expect(eject).toBeDisabled();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  const idleStyle = await eject.evaluate(el => {
    const s = getComputedStyle(el);
    return { border: s.borderTopColor, background: s.backgroundColor, shadow: s.boxShadow };
  });
  await eject.hover();
  await page.waitForTimeout(250);
  expect(await eject.evaluate(el => {
    const s = getComputedStyle(el);
    return { border: s.borderTopColor, background: s.backgroundColor, shadow: s.boxShadow };
  })).toEqual(idleStyle);
  await page.locator('.project-tape--kodlab').click();
  await eject.focus();
  // Safari may omit buttons from the Tab sequence without full keyboard access.
  // Establish keyboard modality, then focus the control directly in both engines.
  await page.keyboard.press('Tab');
  await power.focus();
  await expect(power).toBeFocused();
  expect(await power.evaluate(el => el.matches(':focus-visible') && parseFloat(getComputedStyle(el).outlineWidth) >= 2)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await cta.hover();
  await expect.poll(async () => warm(await colour(cta))).toBe(true);
  await expect(cta).toHaveCSS('transform', 'none');
});
