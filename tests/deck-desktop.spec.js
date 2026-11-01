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

const symmetryCards = [
  ['swirling-streamers', 'common'], ['sand-dollar', 'radiant'], ['pentagon', 'v'],
  ['halloween', 'v-alt'], ['golden-flintstone', 'amazing'], ['chaotic-flower', 'radiant'],
  ['french-glass', 'v'], ['pentacle', 'v-alt'], ['mayan-bracelet', 'vstar'], ['clam-triple', 'common'],
];
const portraitCards = ['halloween', 'french-glass', 'mayan-bracelet'];
const groundName = id => id === 'golden-flintstone' ? 'art-golden-flintstone.webp' : `ground-${id}.webp`;

// Sample both painted surfaces. The engraving stays fixed while spectral and
// specular layers move; a moving glare or card rotation alone cannot pass.
for (const [group, finishes] of [
  ['21–25', symmetryCards.slice(0, 5)], ['26–30', symmetryCards.slice(5)],
]) test(`cards ${group}: material foil responds to the pointer`, async ({ page }) => {
  test.setTimeout(180_000);
  await openDeck(page, 'cards');
  await expect(page.locator('link[href$="/css/deck-symmetry.css"]')).toHaveCount(1);
  for (const [id, finish] of finishes) {
    const card = page.locator(`.tcard[data-foil="${id}"]`);
    await expect(card).toHaveClass(/tcard--symmetry/);
    await expect(card).toHaveAttribute('data-holo', finish);
    await page.mouse.move(1, 1);
    await card.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await idle(page);
    const box = await card.boundingBox();
    const paint = () => card.evaluate(el => Object.fromEntries(['foil', 'shine'].map(layer => {
      const style = getComputedStyle(el.querySelector(`.tcard__${layer}`));
      return [layer, { image: style.backgroundImage, position: style.backgroundPosition,
        mask: style.maskImage && style.maskImage !== 'none' ? style.maskImage : style.webkitMaskImage,
        display: style.display, opacity: Number(style.opacity) }];
    })));
    const resting = await paint();
    await page.mouse.move(box.x + box.width * .25, box.y + box.height * .3);
    await idle(page);
    const first = await paint();
    await page.mouse.move(box.x + box.width * .75, box.y + box.height * .7);
    await idle(page);
    const second = await paint();
    for (const layer of ['foil', 'shine']) {
      expect(first[layer].display, `${id} ${layer}`).not.toBe('none');
      expect(first[layer].image, `${id} ${layer}`).toContain(`material-${id}.webp`);
      expect(first[layer].opacity, `${id} ${layer}`).toBeGreaterThan(resting[layer].opacity + .05);
      expect(second[layer].position, `${id} ${layer}`).not.toBe(first[layer].position);
      // The first background is the relief texture, which must not slide.
      expect(second[layer].position.split(',')[0], `${id} fixed material`).toBe(first[layer].position.split(',')[0]);
    }
    // Mayan's full-size gradients cannot translate within their box. Its light
    // changes through the conic angle and radial phase inside the painted image.
    if (id === 'mayan-bracelet') expect(second.foil.image).not.toBe(first.foil.image);
    expect(first.foil.mask, id).toContain(groundName(id));
    expect(first.shine.mask, id).toContain(portraitCards.includes(id) ? 'frame-full.webp' : 'frame-window.webp');
    const state = await values(card);
    expect(state.mx).toBeGreaterThan(55);
    expect(Math.abs(state.rx)).toBeGreaterThan(1);
    expect(Math.abs(state.ry)).toBeGreaterThan(1);
  }
});

for (const reducedMotion of ['no-preference', 'reduce']) {
  test(`symmetry foil follows a wheel turn at a fixed pointer (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await openDeck(page, 'cards');
    const card = page.locator('.tcard[data-foil="pentacle"]');
    await lift(page, card, false);
    await faceOn(page, card);
    const before = await card.evaluate(el => {
      const read = () => ({
        ry: parseFloat(el.style.getPropertyValue('--ry')),
        tilt: parseFloat(el.style.getPropertyValue('--foil-tilt-x')),
        mx: el.style.getPropertyValue('--mx'), my: el.style.getPropertyValue('--my'),
        position: getComputedStyle(el.querySelector('.tcard__foil')).backgroundPosition,
      });
      const audit = window.symmetryWheelAudit = { samples: [] };
      audit.observer = new MutationObserver(() => audit.samples.push(read()));
      audit.observer.observe(el, { attributes: true, attributeFilter: ['style'] });
      return read();
    });
    const wheelCount = await page.evaluate(() => window.deckAudit.events.filter(e => e.type === 'wheel').length);
    // The pointer remains over the toolbar: only the card's surface normal changes.
    await page.mouse.wheel(0, 60);
    await expect.poll(() => page.evaluate(() => window.deckAudit.events.filter(e => e.type === 'wheel').length)).toBeGreaterThan(wheelCount);
    await idle(page);
    // Reduced motion jumps immediately, but the deliberate wheel gesture still
    // waits for its normal snap timer. Observe that completion rather than sleeping.
    await expect.poll(async () => angleDistance((await values(card)).ry, before.ry)).toBeLessThan(.1);
    const samples = await page.evaluate(() => {
      window.symmetryWheelAudit.observer.disconnect();
      return window.symmetryWheelAudit.samples;
    });
    expect(samples.some(sample => Math.abs(sample.tilt - before.tilt) > .05)).toBe(true);
    expect(samples.some(sample => sample.position !== before.position)).toBe(true);
    expect(samples.every(sample => sample.mx === before.mx && sample.my === before.my),
      'The reflection must change without a moving pointer/light coordinate').toBe(true);
    if (reducedMotion === 'reduce') {
      expect((await values(card)).rx).toBe(0);
      expect(await page.evaluate(() => window.deckAudit.pending.size)).toBe(0);
    }
  });
}

test('all symmetry materials and protection masks decode and preserve the printed layout', async ({ page }) => {
  test.setTimeout(180_000);
  await openDeck(page, 'cards');
  await expect(page.locator('.tcard--symmetry')).toHaveCount(10);
  for (const id of portraitCards) {
    const card = page.locator(`.tcard[data-foil="${id}"]`);
    await expect(card.locator('.tcard__art img')).toHaveAttribute('src', new RegExp(`full-${id}\\.webp$`));
    const geometry = await card.evaluate(el => ({
      panel: el.querySelector('.tcard__panel').getBoundingClientRect().height,
      art: el.querySelector('.tcard__art').getBoundingClientRect().height,
    }));
    expect(geometry.art / geometry.panel).toBeGreaterThan(.9);
  }
  const files = symmetryCards.flatMap(([id]) => [`material-${id}.webp`, groundName(id)])
    .concat(['frame-window.webp', 'frame-full.webp']);
  const assets = await page.evaluate(async files => Promise.all(files.map(async name => {
    const image = new Image();
    image.src = `assets/deck/foil/${name}`;
    try {
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      const { width: w, height: h } = canvas;
      const pixels = ctx.getImageData(0, 0, w, h).data;
      let minAlpha = 255, maxAlpha = 0, minTone = 255, maxTone = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        minAlpha = Math.min(minAlpha, pixels[i + 3]); maxAlpha = Math.max(maxAlpha, pixels[i + 3]);
        minTone = Math.min(minTone, pixels[i]); maxTone = Math.max(maxTone, pixels[i]);
      }
      const maxIn = (left, top, right, bottom) => {
        let max = 0;
        for (let y = Math.floor(top * h); y < Math.floor(bottom * h); y++) {
          for (let x = Math.floor(left * w); x < Math.floor(right * w); x++) max = Math.max(max, pixels[(y * w + x) * 4 + 3]);
        }
        return max;
      };
      // A small signature detects accidental duplicate material files; it is
      // not a metric of artistic quality or how the composited foil looks.
      const signature = [];
      for (let row = 0; row < 20; row++) for (let col = 0; col < 20; col++) {
        signature.push(pixels[(Math.floor((row + .5) * h / 20) * w + Math.floor((col + .5) * w / 20)) * 4]);
      }
      return { name, w, h, minAlpha, maxAlpha, minTone, maxTone, signature: signature.join(','),
        textAlpha: maxIn(.19, .58, .81, .90), windowAlpha: maxIn(.1, .15, .9, .45), lowerAlpha: maxIn(0, .57, 1, 1) };
    } catch { return { name, failed: true }; }
  })), files);
  expect(assets.filter(asset => asset.failed)).toEqual([]);
  const materials = assets.filter(asset => asset.name.startsWith('material-'));
  for (const material of materials) {
    expect(material.w, material.name).toBeGreaterThan(0);
    expect(material.h, material.name).toBeGreaterThan(0);
    expect(material.maxTone - material.minTone, material.name).toBeGreaterThan(40);
  }
  expect(new Set(materials.map(material => material.signature)).size).toBe(10);
  for (const [id] of symmetryCards) {
    const ground = assets.find(asset => asset.name === groundName(id));
    expect(ground.minAlpha, id).toBe(0);
    expect(ground.maxAlpha, id).toBeGreaterThan(150);
    if (portraitCards.includes(id)) expect(ground.lowerAlpha, `${id} text protection`).toBeLessThanOrEqual(35);
  }
  for (const name of ['frame-window.webp', 'frame-full.webp']) {
    const mask = assets.find(asset => asset.name === name);
    expect(mask.maxAlpha, name).toBeGreaterThan(200);
    expect(mask.textAlpha, `${name} text protection`).toBeLessThanOrEqual(25);
    if (name === 'frame-window.webp') expect(mask.windowAlpha).toBe(0);
  }
  await expect(page.locator('.tcard[data-foil="golden-flintstone"] .tcard__art img'))
    .toHaveAttribute('src', /cut-golden-flintstone\.webp$/);
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
