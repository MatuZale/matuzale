import { test, expect, openDeck, dealt, lift, idle, values, angleDistance, backInSlot, controlsReachable } from './deck-support.js';

test.beforeEach(async ({}, info) => {
  test.skip(Boolean(info.project.use.hasTouch), 'Separate desktop Chromium and WebKit projects.');
});

async function faceOn(page, card) {
  await page.locator('[data-deck-flip]').hover();
  await idle(page);
  return values(card);
}

test('distant artwork waits for inspection and all 36 source images decode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const requested = new Set();
  page.on('request', request => requested.add(request.url()));
  await openDeck(page, 'cards');
  const images = await page.locator('.tcard__art img').evaluateAll(items =>
    items.map(img => ({ src: img.src, loading: img.loading,
      width: Number(img.getAttribute('width')), height: Number(img.getAttribute('height')) })),
  );
  expect(images).toHaveLength(36);
  expect(images.every(img => img.width > 0 && img.height > 0), 'Every image reserves its intrinsic aspect ratio').toBe(true);
  expect(images.slice(0, 8).every(img => img.loading === 'eager')).toBe(true);
  expect(images.slice(8).every(img => img.loading === 'lazy')).toBe(true);
  expect(requested.has(images.at(-1).src), 'The last card is far below the initial viewport').toBe(false);

  // Native Enter, after focus without scrolling, exercises promotion even
  // when an image has not crossed the browser's lazy-loading threshold.
  const last = page.locator('.tcard').last();
  await last.evaluate(el => el.focus({ preventScroll: true }));
  await page.keyboard.press('Enter');
  await expect(last).toHaveClass(/is-active/);
  await expect(last.locator('img')).toHaveAttribute('loading', 'eager');
  await expect.poll(() => last.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);

  // Keep full asset coverage without forcing every DOM image to load each
  // time a gesture test opens the collection.
  const failures = await page.evaluate(async sources => Promise.all(sources.map(async src => {
    const image = new Image();
    image.src = src;
    try { await image.decode(); return image.naturalWidth && image.naturalHeight ? null : src; }
    catch { return src; }
  })), images.map(img => img.src));
  expect(failures.filter(Boolean), 'Every one of the 36 artworks must decode').toEqual([]);
});

for (const entry of ['cards', 'home']) test(`${entry}: a failed collection stylesheet can be retried without an unstyled dialog`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let attempts = 0;
  await page.route('**/css/deck-bourke.css', route => ++attempts === 1 ? route.abort('failed') : route.continue());
  const opener = page.locator('[data-deck-open]');
  await page.goto(entry === 'cards' ? '/cards.html' : '/index.html?lang=en');
  if (entry === 'home') {
    await page.locator('#project-shelf #art').click();
    await opener.click();
  }
  await expect.poll(() => attempts).toBe(1);
  await expect(opener).not.toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.deck')).toHaveCount(0);
  await expect(page.locator('link[href$="/css/deck-bourke.css"]')).toHaveCount(0);
  await opener.click();
  await expect(page.locator('.deck')).toBeVisible();
  expect(attempts).toBe(2);
  expect(await page.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')]
    .filter(link => /\/css\/deck(?:-room|-symmetry|-bourke)?\.css$/.test(link.href))
    .map(link => Boolean(link.sheet)),
  )).toEqual([true, true, true, true]);
  await page.locator('.deck__close').click();
  await opener.click();
  await expect(page.locator('.deck')).toBeVisible();
  expect(attempts).toBe(2);
});

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

// Read the painted gradients separately: a moving radial glare alone must not
// pass for a moving spectrum. The hidden probe resolves CSS lengths without
// changing the card, its transforms, or any illumination variable.
async function symmetryPaint(card) {
  return card.evaluate(el => {
    const split = value => {
      const parts = []; let depth = 0, start = 0;
      for (let i = 0; i < value.length; i++) {
        if (value[i] === '(') depth++;
        if (value[i] === ')') depth--;
        if (value[i] === ',' && depth === 0) { parts.push(value.slice(start, i).trim()); start = i + 1; }
      }
      parts.push(value.slice(start).trim());
      return parts;
    };
    const probe = document.createElement('i');
    probe.style.cssText = 'all:initial;position:absolute;visibility:hidden;pointer-events:none;contain:strict';
    el.append(probe);
    const read = (element, pseudo) => {
      const style = getComputedStyle(element, pseudo);
      const number = key => parseFloat(style.getPropertyValue(key));
      probe.style.width = style.getPropertyValue('--paint-width');
      probe.style.height = style.getPropertyValue('--paint-height');
      probe.style.left = style.getPropertyValue('--spectrum-phase');
      probe.style.top = style.getPropertyValue('--beam-phase');
      const resolved = getComputedStyle(probe);
      return {
        images: split(style.backgroundImage), positions: split(style.backgroundPosition),
        repeats: split(style.backgroundRepeat), sizes: split(style.backgroundSize),
        mask: style.maskImage && style.maskImage !== 'none' ? style.maskImage : style.webkitMaskImage,
        display: style.display, opacity: Number(style.opacity),
        width: parseFloat(style.width), height: parseFloat(style.height),
        paintWidth: parseFloat(resolved.width), paintHeight: parseFloat(resolved.height),
        spectrumPhase: parseFloat(resolved.left), beamPhase: parseFloat(resolved.top),
        spectrumAngle: number('--spectral-angle'), beamAngle: number('--beam-angle'),
        spectrumScale: [number('--spectrum-scale-x'), number('--spectrum-scale-y')],
        beamScale: [number('--beam-scale-x'), number('--beam-scale-y')],
      };
    };
    try {
      const result = Object.fromEntries(['foil', 'shine'].map(layer => [layer, read(el.querySelector(`.tcard__${layer}`))]));
      if (el.dataset.foil === 'golden-flintstone') result.subject = read(el.querySelector('.tcard__art'), '::after');
      const value = key => parseFloat(el.style.getPropertyValue(key));
      return { surfaces: result, fx: value('--px') * .65 + value('--foil-tilt-x') * .8,
        fy: value('--py') * .65 - value('--foil-tilt-y') * .8 };
    } finally { probe.remove(); }
  });
}

function unbrokenGradientCanvas(surface, label, fx, fy) {
  // These dimensions also guard against layout changes silently invalidating
  // the phase calculation's cqw geometry (window, full-art and Golden cut-out).
  expect(Math.abs(surface.paintWidth - surface.width), `${label} phase width`).toBeLessThan(.35);
  expect(Math.abs(surface.paintHeight - surface.height), `${label} phase height`).toBeLessThan(.35);
  const item = (list, i) => list[i % list.length];
  const length = (token, span) => token.endsWith('%') ? parseFloat(token) * span / 100 : parseFloat(token);
  for (const [i, image] of surface.images.entries()) {
    if (!image.includes('gradient(')) continue;
    expect(item(surface.repeats, i), `${label} gradient ${i} cannot tile`).toBe('no-repeat');
    const size = item(surface.sizes, i).split(/\s+/);
    const position = item(surface.positions, i).split(/\s+/);
    for (const [axis, span] of [surface.width, surface.height].entries()) {
      const extent = length(size[axis] || size[0], span);
      const offset = length(position[axis] || position[0], span - extent);
      expect(offset, `${label} gradient ${i} starts before surface`).toBeLessThanOrEqual(.1);
      expect(offset + extent, `${label} gradient ${i} covers surface`).toBeGreaterThanOrEqual(span - .1);
    }
    if (image.startsWith('repeating-') || image.startsWith('conic-gradient')) {
      const colours = image.match(/(?:rgba?|color)\([^)]*\)/g) || [];
      expect(colours.length, `${label} cyclic colours`).toBeGreaterThan(1);
      expect(colours.at(-1), `${label} cycle has no colour jump`).toBe(colours[0]);
    }
  }
  // Compare with the former translation projected onto the gradient's axis,
  // using the measured box, not the shader's declared dimensions. This preserves
  // the small-angle field while allowing it to continue beyond the old tile.
  const projection = (angle, scale, x, y) => {
    const radians = angle * Math.PI / 180;
    return Math.sin(radians) * (1 - scale[0]) * surface.width * x
      - Math.cos(radians) * (1 - scale[1]) * surface.height * y;
  };
  const spectralIndex = surface.images[0].startsWith('url(') ? 1 : 0;
  if (surface.images[spectralIndex].startsWith('repeating-linear-gradient')) {
    const expected = projection(surface.spectrumAngle, surface.spectrumScale, fx * .65, fy * .8);
    expect(Math.abs(surface.spectrumPhase - expected), `${label} continuous spectral phase`).toBeLessThan(.5);
  }
  if (surface.images[2]?.startsWith('repeating-linear-gradient')) {
    const expected = projection(surface.beamAngle, surface.beamScale, -fx * .48 - fy * .14, -fy * .5);
    expect(Math.abs(surface.beamPhase - expected), `${label} continuous beam phase`).toBeLessThan(.5);
  }
}

// A lifted card has a stable hit box. Native mouse moves just beyond each corner
// reach the controller's full 0/100% light range, including the old bottom-right
// seam. Repeat with reduced motion: the light still moves while tilt stays zero.
for (const reducedMotion of ['no-preference', 'reduce']) {
  for (const [group, finishes] of [
    ['21–25', symmetryCards.slice(0, 5)], ['26–30', symmetryCards.slice(5)],
  ]) test(`cards ${group}: unbroken material foil at all corners (${reducedMotion})`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ reducedMotion });
    await openDeck(page, 'cards');
    await expect(page.locator('link[href$="/css/deck-symmetry.css"]')).toHaveCount(1);
    for (const [id, finish] of finishes) {
      const card = page.locator(`.tcard[data-foil="${id}"]`);
      await expect(card).toHaveClass(/tcard--symmetry/);
      await expect(card).toHaveAttribute('data-holo', finish);
      await page.mouse.move(1, 1);
      await card.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await idle(page);
      const resting = await symmetryPaint(card);
      await lift(page, card, false);
      await faceOn(page, card);
      const box = await card.boundingBox();
      let previous = await symmetryPaint(card);
      const spectra = Object.fromEntries(Object.keys(previous.surfaces).map(layer => [layer, new Set()]));
      const fronts = Object.fromEntries(Object.keys(previous.surfaces).map(layer => [layer, new Set()]));
      for (const [x, y] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
        await page.mouse.move(box.x + (x ? box.width + 2 : -2), box.y + (y ? box.height + 2 : -2));
        await idle(page);
        const current = await symmetryPaint(card);
        for (const [layer, surface] of Object.entries(current.surfaces)) {
          const label = `${id} ${layer} corner ${x},${y}`;
          expect(surface.display, label).not.toBe('none');
          unbrokenGradientCanvas(surface, label, current.fx, current.fy);
          const spectralIndex = layer === 'subject' ? 0 : 1;
          spectra[layer].add(surface.images[spectralIndex]);
          if (layer !== 'subject') {
            expect(surface.images[0], label).toContain(`material-${id}.webp`);
            expect(surface.images[0], `${label} fixed material`).toBe(previous.surfaces[layer].images[0]);
            expect(surface.positions, `${label} fixed canvas`).toEqual(previous.surfaces[layer].positions);
            expect(surface.opacity, label).toBeGreaterThan(resting.surfaces[layer].opacity + .05);
            if (surface.images[2]?.startsWith('repeating-')) fronts[layer].add(surface.images[2]);
          }
        }
        expect(current.surfaces.foil.mask, id).toContain(groundName(id));
        expect(current.surfaces.shine.mask, id).toContain(portraitCards.includes(id) ? 'frame-full.webp' : 'frame-window.webp');
        const state = await values(card);
        expect(state.mx, id).toBeCloseTo(x * 100, 1);
        expect(state.my, id).toBeCloseTo(y * 100, 1);
        if (reducedMotion === 'reduce') {
          expect(state.rx).toBe(0);
          expect(angleDistance(state.ry, 0)).toBeLessThan(.1);
        } else {
          expect(Math.abs(state.rx)).toBeCloseTo(17, 1);
          expect(angleDistance(state.ry, x ? 17 : -17)).toBeLessThan(.1);
        }
        previous = current;
      }
      for (const [layer, samples] of Object.entries(spectra)) {
        // Mayan's conic spectrum depends on horizontal light while its radial
        // front also responds vertically; four corners need not yield four hues.
        expect(samples.size, `${id} ${layer} moving spectrum`).toBeGreaterThan(1);
        if (fronts[layer].size) expect(fronts[layer].size, `${id} ${layer} moving specular front`).toBeGreaterThan(1);
      }
      await card.press('Escape');
      await backInSlot(page, card);
    }
  });
}

for (const reducedMotion of ['no-preference', 'reduce']) for (const id of ['pentacle', 'thorn-rose', 'reuleaux-nebula']) {
  test(`${id} foil follows a wheel turn at a fixed pointer (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await openDeck(page, 'cards');
    const card = page.locator(`.tcard[data-foil="${id}"]`);
    await lift(page, card, false);
    await faceOn(page, card);
    const before = await card.evaluate(el => {
      const read = () => ({
        ry: parseFloat(el.style.getPropertyValue('--ry')),
        tilt: parseFloat(el.style.getPropertyValue('--foil-tilt-x')),
        mx: el.style.getPropertyValue('--mx'), my: el.style.getPropertyValue('--my'),
        image: getComputedStyle(el.querySelector('.tcard__foil')).backgroundImage,
        artTransform: getComputedStyle(el.querySelector('.tcard__art img')).transform,
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
    expect(samples.some(sample => sample.image !== before.image)).toBe(true);
    expect(samples.every(sample => sample.mx === before.mx && sample.my === before.my),
      'The reflection must change without a moving pointer/light coordinate').toBe(true);
    if (id !== 'pentacle') {
      expect(before.artTransform, `${id} print starts registered to the mask`).toBe('none');
      expect(samples.every(sample => sample.artTransform === 'none'),
        `${id} printed artwork stays registered throughout the wheel turn`).toBe(true);
    }
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

const bourkeCards = [
  ['thorn-rose', '★'], ['thorn-crown', '★★★'], ['thorn-tide', '★★'],
  ['reuleaux', '★'], ['reuleaux-lace', '★★'], ['reuleaux-nebula', '★★★'],
];
const bourkePortraits = new Set(['thorn-crown', 'reuleaux-nebula']);

for (const colorScheme of ['dark', 'light']) {
  test(`six Bourke editions load their own materials and respond to light in ${colorScheme}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await openDeck(page, 'cards');
    await expect(page.locator('.tcard--bourke')).toHaveCount(6);
    await expect(page.locator('link[href$="/css/deck-bourke.css"]')).toHaveCount(1);
    const files = bourkeCards.flatMap(([id]) => [
      `bourke-material-${id}.webp`, `bourke-etch-${id}.webp`, `ground-${bourkePortraits.has(id) ? "full-" : ""}${id}.webp`,
    ]);
    const failures = await page.evaluate(async files => {
      const result = await Promise.all(files.map(async file => {
        const image = new Image(); image.src = `assets/deck/foil/${file}`;
        try { await image.decode(); return image.naturalWidth > 0 ? null : file; }
        catch { return file; }
      }));
      return result.filter(Boolean);
    }, files);
    expect(failures, 'Every distinct foil material, engraving and subject-protection mask must decode').toEqual([]);
    for (const [id, rarity] of bourkeCards) {
      const card = page.locator(`.tcard[data-foil="${id}"]`);
      await expect(card).toHaveAttribute('data-holo', 'bourke');
      await expect(card.locator('.tcard__rarity')).toHaveText(rarity);
      const prefix = bourkePortraits.has(id) ? 'full-' : '';
      await expect(card.locator('.tcard__art img')).toHaveAttribute('src', `assets/deck/${prefix}${id}.webp`);
      if (bourkePortraits.has(id)) {
        expect(await card.evaluate(el => el.querySelector('.tcard__art').getBoundingClientRect().height /
          el.querySelector('.tcard__panel').getBoundingClientRect().height)).toBeGreaterThan(.9);
      }
      await lift(page, card, false);
      const box = await card.boundingBox();
      const paint = () => card.evaluate(el => {
        const foil = el.querySelector('.tcard__foil'), image = el.querySelector('.tcard__art img');
        const foilStyle = getComputedStyle(foil), imageStyle = getComputedStyle(image);
        const surfaces = Object.fromEntries([
          ['foil', foil], ['shine', el.querySelector('.tcard__shine')],
          ['before', foil, '::before'], ['after', foil, '::after'],
        ].map(([name, element, pseudo]) => {
          const style = getComputedStyle(element, pseudo);
          return [name, { image: style.backgroundImage, opacity: Number(style.opacity), display: style.display, content: style.content }];
        }));
        return { surfaces, registration: {
          artTransform: imageStyle.transform, foilTransform: foilStyle.transform,
          artFit: imageStyle.objectFit, artPosition: imageStyle.objectPosition,
          maskSize: foilStyle.maskSize || foilStyle.webkitMaskSize,
          maskPosition: foilStyle.maskPosition || foilStyle.webkitMaskPosition,
          imageWidth: image.clientWidth, imageHeight: image.clientHeight,
          foilWidth: foil.clientWidth, foilHeight: foil.clientHeight,
        } };
      });
      let previous = null;
      for (const [x, y] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
        await page.mouse.move(box.x + (x ? box.width + 2 : -2), box.y + (y ? box.height + 2 : -2));
        const current = await paint();
        for (const layer of ['foil', 'shine', 'before', 'after']) {
          const surface = current.surfaces[layer], label = `${id} ${layer} at ${x},${y}`;
          expect(surface.display, label).not.toBe('none');
          expect(surface.opacity, label).toBeGreaterThan(0);
          expect(surface.image, label).toContain('gradient(');
          if (layer === 'before' || layer === 'after') {
            expect(surface.content, `${label} must generate a painted pseudo-element`).not.toBe('none');
            expect(surface.content, `${label} must generate a painted pseudo-element`).not.toBe('normal');
          }
          if (previous) expect(surface.image, `${label} reflects moving light`).not.toBe(previous.surfaces[layer].image);
        }
        const registration = current.registration;
        expect(registration.artTransform, `${id} stationary print`).toBe('none');
        expect(registration.foilTransform, `${id} stationary protection mask`).toBe('none');
        expect(registration.artFit).toBe('cover');
        expect(registration.maskSize).toBe('cover');
        expect(registration.artPosition).toBe('50% 50%');
        expect(registration.maskPosition).toBe('50% 50%');
        expect(Math.abs(registration.imageWidth - registration.foilWidth), `${id} mask/print width`).toBeLessThanOrEqual(1);
        expect(Math.abs(registration.imageHeight - registration.foilHeight), `${id} mask/print height`).toBeLessThanOrEqual(1);
        previous = current;
      }
      await page.locator('[data-deck-back]').click();
      await backInSlot(page, card);
    }
  });
}

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
