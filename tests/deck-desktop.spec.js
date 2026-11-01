import { test, expect, openDeck, dealt, lift, idle, values, angleDistance, backInSlot, controlsReachable } from './deck-support.js';

test.beforeEach(async ({}, info) => {
  test.skip(Boolean(info.project.use.hasTouch), 'Separate desktop Chromium and WebKit projects.');
});

async function faceOn(page, card) {
  await page.locator('[data-deck-flip]').hover();
  await idle(page);
  return values(card);
}

for (const entry of ['cards', 'home']) {
  // Both engines exercise all mouse/keyboard actions: wide standalone and narrow inline entry.
  for (const width of [entry === 'cards' ? 1280 : 390]) {
    test(`${entry}: mouse and keyboard at ${width}px`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width, height: 900 });
      await openDeck(page, entry);
      const card = page.locator('.tcard').first();
      let r = await card.boundingBox();
      await page.mouse.move(r.x + r.width * .75, r.y + r.height * .35);
      await idle(page);
      const hover = await values(card);
      expect(Math.abs(hover.rx)).toBeGreaterThan(1);
      expect(Math.abs(hover.ry)).toBeGreaterThan(1);
      expect(hover.mx).toBeGreaterThan(55);
      await page.mouse.move(1, 1);
      await idle(page);
      expect(Math.abs((await values(card)).rx)).toBeLessThan(.1);

      await lift(page, card, false);
      await controlsReachable(page);
      await faceOn(page, card);
      r = await card.boundingBox();
      const startX = r.x + r.width * .1, startY = r.y + r.height * .5;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 260, startY + 20, { steps: 12 });
      await page.mouse.up();
      await idle(page);
      await expect(card).toHaveClass(/is-active/);
      expect(angleDistance((await values(card)).ry, 180)).toBeLessThan(.1);

      const beforeWheel = await faceOn(page, card);
      await page.evaluate(() => { window.deckAudit.samples = []; });
      const wheelCount = await page.evaluate(() => window.deckAudit.events.filter(e => e.type === 'wheel').length);
      await page.mouse.wheel(0, 80);
      await expect.poll(() => page.evaluate(() => window.deckAudit.events.filter(e => e.type === 'wheel').length)).toBeGreaterThan(wheelCount);
      await idle(page);
      const wheelSamples = await page.evaluate(() => window.deckAudit.samples);
      expect(wheelSamples.some(angle => angleDistance(angle, beforeWheel.ry) > 3)).toBe(true);
      const afterWheel = (await values(card)).ry;
      expect(Math.min(angleDistance(afterWheel, 0), angleDistance(afterWheel, 180))).toBeLessThan(.1);

      const beforeFlip = (await faceOn(page, card)).ry;
      await card.press('f');
      await idle(page);
      expect(angleDistance((await values(card)).ry, beforeFlip + 180)).toBeLessThan(.1);
      await card.press('ArrowLeft');
      await idle(page);
      expect(angleDistance((await values(card)).ry, beforeFlip)).toBeLessThan(.1);
      await card.press('ArrowRight');
      await idle(page);
      expect(angleDistance((await values(card)).ry, beforeFlip + 180)).toBeLessThan(.1);

      await card.press('Enter');
      await backInSlot(page, card);
      await card.press('Space');
      await expect(card).toHaveClass(/is-active/);
      await idle(page);
      await card.press('Escape');
      await backInSlot(page, card);
      await expect(page.locator('.deck')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('.deck')).not.toBeVisible();
      await idle(page);
      await expect(page.locator('[data-deck-open]')).toBeFocused();
      await page.locator('[data-deck-open]').click();
      await dealt(page);
      await lift(page, card, false);
      await card.locator('.tcard__rotator').click();
      await backInSlot(page, card);
    });
  }

  if (entry === 'cards') test(`${entry}: desktop reduced motion preserves light and deliberate flip`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openDeck(page, entry);
    const card = page.locator('.tcard').first();
    const r = await card.boundingBox();
    await page.mouse.move(r.x + r.width * .7, r.y + r.height * .3);
    const state = await values(card);
    expect(state.rx).toBe(0);
    expect(state.ry).toBe(0);
    expect(state.mx).toBeGreaterThan(55);
    await lift(page, card, false);
    expect((await values(card)).ry).toBe(0);
    await page.locator('[data-deck-flip]').click();
    expect(angleDistance((await values(card)).ry, 180)).toBeLessThan(.1);
    expect(await page.evaluate(() => window.deckAudit.pending.size)).toBe(0);
    await card.press('Enter');
    await backInSlot(page, card);
  });
}

test('the abstract deck background follows the theme and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await openDeck(page, 'cards');
  const deck = page.locator('.deck');
  const background = () => deck.evaluate(el => {
    const style = getComputedStyle(el, '::before');
    return { content: style.content, image: style.backgroundImage, animation: style.animationName,
      pointerEvents: style.pointerEvents };
  });
  const dark = await background();
  expect(dark.content).toContain('@@');
  expect(dark.pointerEvents).toBe('none');
  expect(dark.animation).toBe('none');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  const light = await background();
  expect(light.image).not.toBe(dark.image);
});

// Check the actual printed foil, not the generic card glare or only its rotation.
// Sample each edition's artwork foil, separately from the full-card shine.
// Split the pointer sweep into two independent tests to stay within the VM budget.
for (const [group, finishes] of [
  ['21–25', [
    ['swirling-streamers', 'common', 'foil', 'streamers-prism.svg'],
    ['sand-dollar', 'radiant', 'foil', 'sand-dollar-prism.svg'],
    ['pentagon', 'v', 'foil', 'pentagon-prism.svg'],
    ['halloween', 'v-alt', 'foil', 'halloween-lantern.svg'],
    ['golden-flintstone', 'amazing', 'foil', 'paint-golden-flintstone.svg'],
  ]],
  ['26–30', [
    ['chaotic-flower', 'radiant', 'foil', 'chaotic-petals.svg'],
    ['french-glass', 'v', 'foil', 'french-arches.svg'],
    ['pentacle', 'v-alt', 'foil', 'pentacle-prism.svg'],
    ['mayan-bracelet', 'vstar', 'foil', 'mayan-orbit.svg'],
    ['clam-triple', 'common', 'foil', 'clam-tides.svg'],
  ]],
]) test(`cards ${group}: printed foil responds to the pointer`, async ({ page }) => {
  test.setTimeout(180_000);
  await openDeck(page, 'cards');
  for (const [id, finish, layer, mask] of finishes) {
    const card = page.locator(`.tcard[data-foil="${id}"]`);
    await expect(card).toHaveAttribute('data-holo', finish);
    await page.mouse.move(1, 1);
    await card.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await idle(page);
    const box = await card.boundingBox();
    const paint = () => card.evaluate((el, layer) => {
      const target = el.querySelector(`.tcard__${layer}`);
      const style = getComputedStyle(target);
      const standardMask = style.maskImage;
      const detail = el.dataset.foil === 'golden-flintstone' ? getComputedStyle(target, '::after') : null;
      return { image: style.backgroundImage, position: style.backgroundPosition,
        mask: standardMask && standardMask !== 'none' ? standardMask : style.webkitMaskImage,
        display: style.display, opacity: Number(style.opacity),
        detail: detail && { image: detail.backgroundImage, position: detail.backgroundPosition,
          mask: detail.maskImage && detail.maskImage !== 'none' ? detail.maskImage : detail.webkitMaskImage,
          display: detail.display, opacity: Number(detail.opacity) } };
    }, layer);
    const resting = await paint();
    await page.mouse.move(box.x + box.width * .25, box.y + box.height * .3);
    await idle(page);
    const first = await paint();
    await page.mouse.move(box.x + box.width * .75, box.y + box.height * .7);
    await idle(page);
    const second = await paint();
    expect(first.display, id).not.toBe('none');
    expect(first.image, id).not.toBe('none');
    expect(first.mask, id).toContain(mask);
    expect(first.opacity, id).toBeGreaterThan(resting.opacity + .2);
    // This samples the background actually painted through the selected foil mask.
    // It catches a static foil even if the generic glare and 3D tilt still move.
    expect([second.image, second.position], id).not.toEqual([first.image, first.position]);
    if (first.detail) {
      expect(first.detail.display, id).not.toBe('none');
      expect(first.detail.opacity, id).toBeGreaterThan(0);
      expect(first.detail.mask, id).toContain('golden-veins.svg');
      expect([second.detail.image, second.detail.position], id).not.toEqual([first.detail.image, first.detail.position]);
    }
    const state = await values(card);
    expect(state.mx).toBeGreaterThan(55);
    expect(Math.abs(state.rx)).toBeGreaterThan(1);
    expect(Math.abs(state.ry)).toBeGreaterThan(1);
  }
});

test('new finishes retain their distinct printed patterns', async ({ page }) => {
  test.setTimeout(180_000);
  await openDeck(page, 'cards');
  for (const id of ['halloween', 'french-glass', 'mayan-bracelet']) {
    const card = page.locator(`.tcard[data-foil="${id}"]`);
    const image = card.locator('.tcard__art img');
    await expect(image).toHaveAttribute('src', new RegExp(`full-${id}\\.webp$`));
    const geometry = await card.evaluate(el => {
      const panel = el.querySelector('.tcard__panel').getBoundingClientRect();
      const art = el.querySelector('.tcard__art').getBoundingClientRect();
      return { panel: panel.height, art: art.height };
    });
    expect(geometry.art / geometry.panel).toBeGreaterThan(.9);
  }
  const ridgeLoaded = await page.evaluate(async () => {
    const image = new Image();
    image.src = 'assets/deck/foil/symmetric-ridges.webp';
    try { await image.decode(); return image.naturalWidth > 0; } catch { return false; }
  });
  expect(ridgeLoaded).toBe(true);
  const prismMasks = await page.evaluate(async () => Promise.all([
    'streamers-prism.svg', 'sand-dollar-prism.svg', 'pentagon-prism.svg',
    'halloween-lantern.svg', 'golden-veins.svg', 'chaotic-petals.svg', 'french-arches.svg',
    'pentacle-prism.svg', 'mayan-orbit.svg', 'clam-tides.svg',
  ].map(async name => {
    const image = new Image();
    image.src = `assets/deck/foil/${name}`;
    try { await image.decode(); return { name, loaded: image.naturalWidth > 0 && image.naturalHeight > 0 }; }
    catch { return { name, loaded: false }; }
  })));
  expect(prismMasks.filter(mask => !mask.loaded)).toEqual([]);
  const iconMasks = await page.evaluate(async () => Promise.all([
    'swirling-streamers', 'sand-dollar', 'pentagon', 'chaotic-flower', 'pentacle', 'clam-triple',
    'french-glass', 'mayan-bracelet', 'halloween', 'golden-flintstone',
  ].map(async id => {
    const image = new Image();
    image.src = `assets/deck/foil/icon-${id}.webp`;
    try {
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      const maxAlpha = (x, y, width, height) => {
        const data = ctx.getImageData(x, y, width, height).data;
        let max = 0;
        for (let i = 3; i < data.length; i += 4) max = Math.max(max, data[i]);
        return max;
      };
      const w = canvas.width, h = canvas.height;
      // Compare broad patches of the frame, excluding the artwork and the quiet text area.
      // Averaging suppresses tiny pixel and compression differences between near-copies.
      const pixels = ctx.getImageData(0, 0, w, h).data;
      const frame = [];
      for (let row = 0; row < 28; row++) {
        for (let col = 0; col < 20; col++) {
          const x = (col + .5) / 20, y = (row + .5) / 28;
          if (y > .105 && y < .479 && x > .065 && x < .935) continue;
          if (y > .58 && y < .90 && x > .19 && x < .81) continue;
          let sum = 0, count = 0;
          for (let py = Math.floor(row * h / 28); py < Math.floor((row + 1) * h / 28); py++) {
            for (let px = Math.floor(col * w / 20); px < Math.floor((col + 1) * w / 20); px++) {
              sum += pixels[(py * w + px) * 4 + 3];
              count++;
            }
          }
          frame.push(sum / count);
        }
      }
      return { id, text: maxAlpha(Math.floor(w * .19), Math.floor(h * .58), Math.floor(w * .62), Math.floor(h * .32)),
        edge: maxAlpha(0, 0, Math.floor(w * .055), h),
        window: maxAlpha(Math.floor(w * .5), Math.floor(h * .3), 1, 1), frame };
    } catch { return { id, failed: true }; }
  })));
  for (const mask of iconMasks) {
    expect(mask.failed, mask.id).toBeUndefined();
    expect(mask.text, mask.id).toBeLessThanOrEqual(70);
    expect(mask.edge, mask.id).toBeGreaterThan(100);
    if (!['french-glass', 'mayan-bracelet', 'halloween', 'golden-flintstone'].includes(mask.id)) expect(mask.window, mask.id).toBe(0);
    expect(mask.frame.reduce((sum, value) => sum + value, 0) / mask.frame.length, mask.id).toBeGreaterThan(1);
    const applied = await page.locator(`.tcard[data-foil="${mask.id}"] .tcard__shine`).evaluate(el => {
      const style = getComputedStyle(el);
      return { image: style.maskImage || style.webkitMaskImage, display: style.display };
    });
    expect(applied.image, mask.id).toContain(`icon-${mask.id}.webp`);
    expect(applied.display, mask.id).not.toBe('none');
  }
  for (const [a, b] of [
    ['swirling-streamers', 'sand-dollar'], ['swirling-streamers', 'pentagon'], ['sand-dollar', 'pentagon'],
    ['chaotic-flower', 'french-glass'], ['pentacle', 'clam-triple'],
  ]) {
    const first = iconMasks.find(mask => mask.id === a).frame;
    const second = iconMasks.find(mask => mask.id === b).frame;
    const difference = first.reduce((sum, value, index) => sum + Math.abs(value - second[index]), 0) / first.length;
    // A small tolerance catches missing/duplicated motifs, not aesthetic similarity.
    expect(difference, `${a} / ${b}`).toBeGreaterThan(1.5);
  }
  const amazing = page.locator('.tcard[data-foil="golden-flintstone"]');
  await expect(amazing).toHaveAttribute('data-holo', 'amazing');
  await expect(amazing.locator('.tcard__art img')).toHaveAttribute('src', /cut-golden-flintstone\.webp$/);
  await expect(amazing.locator('.tcard__glitter')).toHaveCount(1);
  const masks = await amazing.evaluate(async el => {
    const style = getComputedStyle(el);
    const paths = ['cut', 'art', 'splash'].map(kind => `assets/deck/foil/${kind}-golden-flintstone.webp`);
    const loaded = await Promise.all(paths.map(async path => {
      const image = new Image();
      image.src = path;
      try { await image.decode(); return image.naturalWidth > 0 && image.naturalHeight > 0; }
      catch { return false; }
    }));
    return { loaded, css: ['--cut', '--art-mask', '--splash'].map(name => style.getPropertyValue(name)) };
  });
  expect(masks.loaded).toEqual([true, true, true]);
  for (const [index, kind] of ['cut', 'art', 'splash'].entries()) expect(masks.css[index]).toContain(`${kind}-golden-flintstone.webp`);
});

for (const entry of ['cards', 'home']) {
  test(`${entry}: flipping Clam Triple switches and remembers the site theme`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await openDeck(page, entry);
    const root = page.locator('html');
    const card = page.locator('.tcard[data-foil="clam-triple"]');
    const flip = page.locator('[data-deck-flip]');
    await expect(page.locator('.deck__theme-hint')).toContainText('Flip Clam Triple');
    await lift(page, card, false);
    await expect(root).toHaveAttribute('data-theme', 'dark');
    await expect(flip).toHaveAttribute('aria-label', /switch to light theme/i);
    await flip.click();
    await expect(root).toHaveAttribute('data-theme', 'light');
    await expect(flip).toHaveAttribute('aria-label', /switch to dark theme/i);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');
    await card.press('f');
    await expect(root).toHaveAttribute('data-theme', 'dark');
    await card.press('ArrowRight');
    await expect(root).toHaveAttribute('data-theme', 'light');
    await page.locator('[data-deck-back]').click();
    await backInSlot(page, card);
    await expect(root).toHaveAttribute('data-theme', 'light');
    await page.locator('.deck__close').click();
    await expect(root).toHaveAttribute('data-theme', 'light');
    if (entry === 'home') await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label', 'Switch to dark theme');
    await page.reload();
    await expect(root).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');
  });
}

test('theme card switches on a completed drag or interrupted wheel, not a cancelled drag', async ({ page }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('theme', 'dark'));
  await openDeck(page, 'cards');
  const root = page.locator('html');
  const card = page.locator('.tcard[data-foil="clam-triple"]');
  await lift(page, card, false);
  const bounds = await card.boundingBox();
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 250, y, { steps: 4 });
  await page.mouse.up();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 250, y, { steps: 4 });
  await page.evaluate(() => {
    const down = window.deckAudit.events.filter(e => e.type === 'pointerdown').at(-1);
    window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: down.id, pointerType: 'mouse', bubbles: true }));
  });
  await page.mouse.up();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect.poll(async () => angleDistance((await values(card)).ry, 180)).toBeLessThan(.1);
  // Two wheel inputs are delivered in one task; a subsequent explicit flip interrupts
  // the wheel. Each completed half-turn must switch the theme, including the snap.
  await card.evaluate(el => {
    window.themeBefore = [];
    new MutationObserver(records => window.themeBefore.push(...records.map(record => record.oldValue)))
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'], attributeOldValue: true });
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true }));
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true }));
  });
  await page.locator('[data-deck-flip]').click();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect.poll(() => page.evaluate(() => window.themeBefore)).toEqual(['light', 'dark']);
});
