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
const groundName = id => `ground-${id}.webp`;

// Optical roles are explicit: fixed engraving/print may stay still, while each
// declared illumination field must respond. These shapes distinguish a comb,
// facets, lattice, reverse stock, rings and a selective brushburst without
// snapshotting their exact colours or requiring one shared shader stack.
const symmetryOptics = {
  'swirling-streamers': ['url', 'repeating-linear', 'repeating-linear', 'radial'],
  'sand-dollar': ['radial'],
  pentagon: ['url', 'conic', 'url', 'radial'],
  halloween: ['url', 'repeating-linear', 'radial'],
  'golden-flintstone': ['url', 'conic', 'radial'],
  'chaotic-flower': ['url', 'repeating-linear', 'repeating-linear', 'repeating-linear', 'radial'],
  'french-glass': ['url', 'conic', 'radial'],
  pentacle: ['url', 'conic', 'radial'],
  'mayan-bracelet': ['url', 'conic', 'repeating-radial', 'radial'],
  'clam-triple': ['radial', 'repeating-conic'],
};
const reverseSymmetry = new Set(['pentacle']);
const paintEditions = {
  'sand-dollar': { print: 'print-sand-ink.svg', mask: 'mask-sand-ink.svg', relief: 'relief-sand-ink.svg', inverse: true },
  'golden-flintstone': { print: 'print-golden-brush.svg', mask: 'mask-golden-brush.svg', relief: 'relief-golden-brush.svg', inverse: true },
  'clam-triple': { print: 'print-clam-burst.svg', mask: 'mask-clam-burst.svg', inverse: true },
};
const gradientKinds = images => images.map(image => image.startsWith('url(') ? 'url' : image.match(/^([a-z-]+)-gradient\(/)?.[1] || image);
const paintState = surface => JSON.stringify([surface.images, surface.positions, surface.opacity, surface.filter]);
const maskState = (surface, includeTransform = true) => JSON.stringify([surface.mask, surface.maskSize, surface.maskPosition, surface.maskRepeat, surface.maskComposite, includeTransform ? surface.transform : null]);
const intersection = value => /intersect|source-in/.test(value);

async function symmetryPaint(card) {
  return card.evaluate(el => {
    const split = value => {
      const parts = []; let depth = 0, start = 0;
      for (let i = 0; i < value.length; i++) {
        if (value[i] === '(') depth++;
        if (value[i] === ')') depth--;
        if (value[i] === ',' && depth === 0) { parts.push(value.slice(start, i).trim()); start = i + 1; }
      }
      parts.push(value.slice(start).trim()); return parts;
    };
    const probe = document.createElement('i');
    probe.style.cssText = 'all:initial;position:absolute;visibility:hidden;pointer-events:none;contain:strict';
    el.append(probe);
    const read = (element, pseudo) => {
      const style = getComputedStyle(element, pseudo), number = key => parseFloat(style.getPropertyValue(key));
      probe.style.width = style.getPropertyValue('--paint-width');
      probe.style.height = style.getPropertyValue('--paint-height');
      probe.style.left = style.getPropertyValue('--spectrum-phase');
      probe.style.top = style.getPropertyValue('--beam-phase');
      const resolved = getComputedStyle(probe);
      return {
        images: split(style.backgroundImage), positions: split(style.backgroundPosition),
        repeats: split(style.backgroundRepeat), sizes: split(style.backgroundSize),
        mask: style.maskImage && style.maskImage !== 'none' ? style.maskImage : style.webkitMaskImage,
        maskSize: style.maskSize || style.webkitMaskSize, maskPosition: style.maskPosition || style.webkitMaskPosition,
        maskRepeat: style.maskRepeat || style.webkitMaskRepeat, maskComposite: style.maskComposite || style.webkitMaskComposite,
        display: style.display, content: style.content, opacity: Number(style.opacity),
        transform: style.transform, filter: style.filter,
        width: parseFloat(style.width), height: parseFloat(style.height),
        paintWidth: parseFloat(resolved.width), paintHeight: parseFloat(resolved.height),
        spectrumPhase: parseFloat(resolved.left), beamPhase: parseFloat(resolved.top),
        spectrumAngle: number('--spectral-angle'), beamAngle: number('--beam-angle'),
        spectrumScale: [number('--spectrum-scale-x'), number('--spectrum-scale-y')],
        beamScale: [number('--beam-scale-x'), number('--beam-scale-y')],
      };
    };
    try {
      const foil = el.querySelector('.tcard__foil'), art = el.querySelector('.tcard__art'), image = art.querySelector('img');
      const result = { foil: read(foil), shine: read(el.querySelector('.tcard__shine')) };
      for (const [name, pseudo] of [['foilBefore', '::before'], ['foilAfter', '::after']]) {
        const surface = read(foil, pseudo);
        if (surface.display !== 'none' && !['none', 'normal'].includes(surface.content)) result[name] = surface;
      }
      if (el.dataset.foil === 'golden-flintstone') result.subject = read(art, '::after');
      if (['sand-dollar', 'golden-flintstone', 'clam-triple'].includes(el.dataset.foil)) result.print = read(art, '::before');
      if (el.dataset.foil === 'pentacle') result.stock = read(el.querySelector('.tcard__panel'), '::before');
      const value = key => parseFloat(el.style.getPropertyValue(key)), imageStyle = getComputedStyle(image);
      return { surfaces: result, fx: value('--px') * .65 + value('--foil-tilt-x') * .8,
        fy: value('--py') * .65 - value('--foil-tilt-y') * .8,
        registration: { image: read(image), artFit: imageStyle.objectFit, artPosition: imageStyle.objectPosition,
          imageWidth: image.clientWidth, imageHeight: image.clientHeight, foilWidth: foil.clientWidth, foilHeight: foil.clientHeight,
          artZ: Number(getComputedStyle(art).zIndex),
          textZ: [...el.querySelector('.tcard__panel').children].filter(child => child !== art).map(child => Number(getComputedStyle(child).zIndex)),
          stockDisplay: getComputedStyle(el.querySelector('.tcard__panel'), '::before').display },
      };
    } finally { probe.remove(); }
  });
}

function unbrokenGradientCanvas(surface, label) {
  const item = (list, i) => list[i % list.length];
  // CSS gradients have no intrinsic aspect ratio: an auto dimension fills the positioning area.
  const length = (token, span) => token === 'auto' ? span : token.endsWith('%') ? parseFloat(token) * span / 100 : parseFloat(token);
  expect(surface.width, `${label} resolved width`).toBeGreaterThan(0);
  expect(surface.height, `${label} resolved height`).toBeGreaterThan(0);
  for (const [i, image] of surface.images.entries()) {
    if (!image.includes('gradient(')) continue;
    expect(item(surface.repeats, i), `${label} gradient ${i} cannot tile`).toBe('no-repeat');
    const size = item(surface.sizes, i).split(/\s+/), position = item(surface.positions, i).split(/\s+/);
    for (const [axis, span] of [surface.width, surface.height].entries()) {
      const extent = length(size[axis] || size[0], span), offset = length(position[axis] || position[0], span - extent);
      expect(offset, `${label} gradient ${i} starts before surface`).toBeLessThanOrEqual(.1);
      expect(offset + extent, `${label} gradient ${i} covers surface`).toBeGreaterThanOrEqual(span - .1);
    }
    if (image.startsWith('repeating-') || image.startsWith('conic-gradient')) {
      const colours = image.match(/(?:rgba?|color)\([^)]*\)/g) || [];
      expect(colours.length, `${label} cyclic colours`).toBeGreaterThan(1);
      expect(colours.at(-1), `${label} cycle has no colour jump`).toBe(colours[0]);
    }
  }
}

function projectedPhases(id, layer, surface, fx, fy) {
  // Only these fields still use the original translated-plane projection.
  // Conic/radial fields and the fixed crosshatch have independent geometry.
  const legacyShine = ['swirling-streamers', 'sand-dollar', 'pentacle', 'mayan-bracelet', 'clam-triple'].includes(id) && layer === 'shine';
  const spectrum = legacyShine || ['halloween', 'chaotic-flower'].includes(id) && ['foil', 'shine'].includes(layer)
    || id === 'swirling-streamers' && layer === 'foil' || layer === 'subject';
  const beam = legacyShine || id === 'swirling-streamers' && layer === 'foil';
  if (!spectrum && !beam) return;
  expect(Math.abs(surface.paintWidth - surface.width), `${id} ${layer} phase width`).toBeLessThan(.35);
  expect(Math.abs(surface.paintHeight - surface.height), `${id} ${layer} phase height`).toBeLessThan(.35);
  const projection = (angle, scale, x, y) => {
    const radians = angle * Math.PI / 180;
    return Math.sin(radians) * (1 - scale[0]) * surface.width * x
      - Math.cos(radians) * (1 - scale[1]) * surface.height * y;
  };
  if (spectrum) expect(Math.abs(surface.spectrumPhase - projection(surface.spectrumAngle, surface.spectrumScale, fx * .65, fy * .8)),
    `${id} ${layer} continuous spectral phase`).toBeLessThan(.5);
  if (beam) expect(Math.abs(surface.beamPhase - projection(surface.beamAngle, surface.beamScale, -fx * .48 - fy * .14, -fy * .5)),
    `${id} ${layer} continuous beam phase`).toBeLessThan(.5);
}

function fixedImage(id, layer, image, index) {
  return layer === 'print' || image.startsWith('url(')
    || id === 'chaotic-flower' && ['foil', 'shine'].includes(layer) && [2, 3].includes(index);
}

function symmetryConstruction(id, paint) {
  const { surfaces, registration } = paint;
  expect(gradientKinds(surfaces.foil.images), `${id} optical construction`).toEqual(symmetryOptics[id]);
  expect(surfaces.shine.mask, `${id} protects printed stock`).toContain(portraitCards.includes(id) ? 'frame-full.webp' : 'frame-window.webp');
  expect(surfaces.foil.transform, `${id} protection plate does not move`).toBe('none');
  if (!paintEditions[id]) expect(surfaces.foil.mask, `${id} protects orbit lines`).toContain(groundName(id));
  if (!paintEditions[id]) {
    expect(registration.image.transform, `${id} registered artwork`).toBe('none');
    expect(registration.artFit).toBe('cover'); expect(registration.artPosition).toBe('50% 50%');
    expect(surfaces.foil.maskSize.split(',')[0].trim()).toBe('cover');
    expect(surfaces.foil.maskPosition.split(',')[0].trim()).toBe('50% 50%');
    expect(Math.abs(registration.imageWidth - registration.foilWidth), `${id} mask/print width`).toBeLessThanOrEqual(1);
    expect(Math.abs(registration.imageHeight - registration.foilHeight), `${id} mask/print height`).toBeLessThanOrEqual(1);
  }
  if (id === 'swirling-streamers') {
    expect(surfaces.foilAfter, 'independent counter-comb').toBeTruthy();
    expect(surfaces.foilAfter.mask).toContain('radial-gradient(');
    expect(surfaces.foilAfter.maskRepeat).toBe('no-repeat');
  }
  if (id === 'sand-dollar') {
    expect(surfaces.foilBefore.mask).toContain('glitter.webp');
    expect(surfaces.foilBefore.maskRepeat).toBe('repeat');
    expect(surfaces.foilAfter.mask).toContain('relief-sand-ink.svg');
  }
  if (id === 'golden-flintstone') expect(surfaces.foilBefore.mask).toContain('relief-golden-brush.svg');
  if (reverseSymmetry.has(id)) {
    expect(surfaces.stock.mask).toContain('frame-window.webp');
    expect(intersection(surfaces.stock.maskComposite)).toBe(true);
  }
  if (id === 'pentagon') expect(surfaces.foil.images.join(',')).toContain('crystal-shards.svg');
  if (id === 'chaotic-flower') {
    expect(surfaces.foil.images[2]).toMatch(/^repeating-linear-gradient\(45deg,/);
    expect(surfaces.foil.images[3]).toMatch(/^repeating-linear-gradient\(135deg,/);
  }
  if (id === 'french-glass') {
    expect(surfaces.foilBefore.mask).toContain('glass-panes-a.svg');
    expect(surfaces.foilAfter.mask).toContain('glass-panes-b.svg');
  }
  const print = paintEditions[id];
  if (print) {
    expect(surfaces.print.images).toHaveLength(1);
    expect(surfaces.print.images[0]).toContain(print.print);
    expect(surfaces.print.transform).toBe('none');
    expect(surfaces.foil.mask).toContain(print.mask);
    expect(registration.stockDisplay, `${id} keeps the stock quiet`).toBe('none');
    expect(registration.textZ.every(z => z > registration.artZ), `${id} printed rules stay above paint`).toBe(true);
    if (id === 'clam-triple') {
      expect(surfaces.foil.mask).toContain('glitter.webp');
      expect(intersection(surfaces.foil.maskComposite)).toBe(true);
    }
    if (print.inverse) {
      expect(registration.image.mask).toContain(`ground-${id}.webp`);
      expect(registration.image.mask).toContain('linear-gradient(');
      expect(registration.image.maskComposite).toMatch(/exclude|xor/);
      expect(registration.artFit).toBe(id === 'golden-flintstone' ? 'fill' : 'cover');
      expect(registration.image.maskSize.split(',').at(-1).trim()).toBe(id === 'golden-flintstone' ? '100% 100%' : 'cover');
      expect(registration.image.maskPosition.split(',').at(-1).trim()).toBe('50% 50%');
    }
    expect(surfaces.print.width).toBeCloseTo(surfaces.foil.width, 1);
    expect(surfaces.print.height).toBeCloseTo(surfaces.foil.height, 1);
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
      const baseline = await symmetryPaint(card), corners = [];
      symmetryConstruction(id, baseline);
      for (const [x, y] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
        await page.mouse.move(box.x + (x ? box.width + 2 : -2), box.y + (y ? box.height + 2 : -2));
        await idle(page);
        const current = await symmetryPaint(card); corners.push(current);
        symmetryConstruction(id, current);
        for (const [layer, surface] of Object.entries(current.surfaces)) {
          const label = `${id} ${layer} corner ${x},${y}`, initial = baseline.surfaces[layer];
          expect(surface.display, label).not.toBe('none'); expect(surface.opacity, label).toBeGreaterThan(0);
          unbrokenGradientCanvas(surface, label); projectedPhases(id, layer, surface, current.fx, current.fy);
          expect(surface.positions, `${label} stationary canvas`).toEqual(initial.positions);
          expect(surface.sizes, `${label} fixed grain scale`).toEqual(initial.sizes);
          for (const [index, image] of surface.images.entries()) if (fixedImage(id, layer, image, index))
            expect(image, `${label} stationary engraving/print ${index}`).toBe(initial.images[index]);
          if (['foil', 'shine'].includes(layer)) {
            if (!['sand-dollar', 'clam-triple'].includes(id) || layer === 'shine') expect(surface.images[0], label).toContain(`material-${id}.webp`);
            expect(surface.opacity, label).toBeGreaterThan(resting.surfaces[layer].opacity + .05);
          }
          // Streamers' counter-comb has a travelling light mask, not a print mask.
          // The protective parent plate and all material masks stay registered.
          if (!(id === 'swirling-streamers' && layer === 'foilAfter'))
            expect(maskState(surface, layer !== 'subject'), `${label} stationary protective mask`).toBe(maskState(initial, layer !== 'subject'));
          if (layer === 'subject') expect(surface.transform, 'Golden sheen follows its cut-out').toBe(current.registration.image.transform);
          if (layer === 'print') expect(paintState(surface), `${label} fixed ink`).toBe(paintState(initial));
        }
        const state = await values(card);
        expect(state.mx, id).toBeCloseTo(x * 100, 1); expect(state.my, id).toBeCloseTo(y * 100, 1);
        if (reducedMotion === 'reduce') {
          expect(state.rx).toBe(0); expect(angleDistance(state.ry, 0)).toBeLessThan(.1);
        } else {
          expect(Math.abs(state.rx)).toBeCloseTo(17, 1);
          expect(angleDistance(state.ry, x ? 17 : -17)).toBeLessThan(.1);
        }
      }
      for (const [layer, surface] of Object.entries(baseline.surfaces)) {
        for (const [index, image] of surface.images.entries()) {
          if (fixedImage(id, layer, image, index)) continue;
          expect(new Set(corners.map(paint => paint.surfaces[layer].images[index])).size,
            `${id} ${layer} illumination ${index} must move`).toBeGreaterThan(1);
        }
      }
      const reflected = paint => JSON.stringify(Object.entries(paint.surfaces).filter(([name]) => name !== 'print').map(([name, surface]) => [name, paintState(surface)]));
      expect(reflected(corners[0]), `${id} horizontal light response`).not.toBe(reflected(corners[1]));
      expect(reflected(corners[1]), `${id} vertical light response`).not.toBe(reflected(corners[2]));
      if (paintEditions[id]) {
        const subjectTransforms = corners.map(paint => paint.registration.image.transform);
        if (reducedMotion === 'reduce') expect(new Set(subjectTransforms).size, 'reduced-motion cut-out stays still').toBe(1);
        else expect(new Set(subjectTransforms).size, 'only the cut-out has subtle parallax').toBeGreaterThan(1);
        for (const corner of corners) {
          expect(corner.registration.image.mask).toBe(baseline.registration.image.mask);
          expect(corner.registration.image.maskSize).toBe(baseline.registration.image.maskSize);
          expect(corner.registration.image.maskComposite).toBe(baseline.registration.image.maskComposite);
        }
      }
      await card.press('Escape');
      await backInSlot(page, card);
    }
  });
}

for (const reducedMotion of ['no-preference', 'reduce']) for (const id of ['sand-dollar', 'pentacle', 'clam-triple', 'thorn-rose', 'reuleaux-nebula']) {
  test(`${id} foil follows a wheel turn at a fixed pointer (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await openDeck(page, 'cards');
    const card = page.locator(`.tcard[data-foil="${id}"]`);
    await lift(page, card, false);
    await faceOn(page, card);
    const before = await card.evaluate(el => {
      const read = () => {
        const foil = el.querySelector('.tcard__foil'), art = el.querySelector('.tcard__art');
        const painted = (node, pseudo) => {
          const style = getComputedStyle(node, pseudo);
          return [style.backgroundImage, style.backgroundPosition, style.opacity, style.filter];
        };
        const fixedMask = node => { const style = getComputedStyle(node); return [style.maskImage || style.webkitMaskImage,
          style.maskSize || style.webkitMaskSize, style.maskPosition || style.webkitMaskPosition, style.maskComposite || style.webkitMaskComposite, style.transform]; };
        return {
          ry: parseFloat(el.style.getPropertyValue('--ry')), tilt: parseFloat(el.style.getPropertyValue('--foil-tilt-x')),
          mx: el.style.getPropertyValue('--mx'), my: el.style.getPropertyValue('--my'),
          reflection: JSON.stringify([painted(foil), painted(foil, '::before'), painted(foil, '::after'),
            painted(el.querySelector('.tcard__shine')), painted(el.querySelector('.tcard__panel'), '::before')]),
          print: JSON.stringify(painted(art, '::before')),
          plate: JSON.stringify(fixedMask(foil)), subjectMask: JSON.stringify(fixedMask(art.querySelector('img'))),
          artTransform: getComputedStyle(art.querySelector('img')).transform,
        };
      };
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
    expect(samples.some(sample => sample.reflection !== before.reflection), `${id} light responds to surface normal`).toBe(true);
    expect(samples.every(sample => sample.plate === before.plate), `${id} protection mask stays fixed during wheel`).toBe(true);
    expect(samples.every(sample => sample.mx === before.mx && sample.my === before.my),
      'The reflection must change without a moving pointer/light coordinate').toBe(true);
    if (!['sand-dollar', 'golden-flintstone', 'clam-triple'].includes(id)) {
      expect(before.artTransform, `${id} print starts registered to the mask`).toBe('none');
      expect(samples.every(sample => sample.artTransform === 'none'),
        `${id} printed artwork stays registered throughout the wheel turn`).toBe(true);
    }
    if (['sand-dollar', 'golden-flintstone', 'clam-triple'].includes(id)) {
      expect(samples.every(sample => sample.print === before.print), `${id} printed splash stays fixed`).toBe(true);
      expect(samples.every(sample => sample.subjectMask === before.subjectMask), `${id} cut-out and its mask remain registered`).toBe(true);
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
    .concat(['frame-window.webp', 'frame-full.webp', 'glitter.webp', 'crystal-shards.svg', 'glass-panes-a.svg', 'glass-panes-b.svg', ...Object.values(paintEditions).flatMap(({ print, mask, relief }) => [print, mask, ...(relief ? [relief] : [])])]);
  const assets = await page.evaluate(async files => Promise.all(files.map(async name => {
    const image = new Image();
    image.src = `assets/deck/foil/${name}`;
    try {
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || 1200; canvas.height = image.naturalHeight || 900;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
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
  for (const name of ['glass-panes-a.svg', 'glass-panes-b.svg', ...Object.values(paintEditions).map(print => print.mask)]) {
    const asset = assets.find(asset => asset.name === name);
    expect(asset.minAlpha, `${name} contains uncoated gaps`).toBe(0);
    expect(asset.maxAlpha, `${name} contains reflective marks`).toBeGreaterThan(200);
  }
  expect(assets.find(asset => asset.name === 'glass-panes-a.svg').signature,
    'The two glass groups must have different pane geometry').not.toBe(assets.find(asset => asset.name === 'glass-panes-b.svg').signature);
  const paintMasks = await page.evaluate(async editions => Promise.all(editions.map(async ({ print, mask }) => {
    const load = async name => { const image = new Image(); image.src = `assets/deck/foil/${name}`; await image.decode(); return image; };
    const [ink, plate] = await Promise.all([load(print), load(mask)]);
    const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 450;
    const context = canvas.getContext('2d');
    const pixels = image => { context.clearRect(0, 0, 600, 450); context.drawImage(image, 0, 0, 600, 450); return context.getImageData(0, 0, 600, 450).data; };
    const inkPixels = pixels(ink), platePixels = pixels(plate);
    let covered = 0, outsideInk = 0;
    for (let i = 3; i < platePixels.length; i += 4) {
      if (platePixels[i] > 16) { covered++; if (inkPixels[i] < 4) outsideInk++; }
    }
    return { print, covered: covered / (600 * 450), outsideInk: outsideInk / (600 * 450) };
  })), Object.values(paintEditions));
  for (const result of paintMasks) {
    expect(result.covered, `${result.print} has selective foil marks`).toBeGreaterThan(.01);
    expect(result.covered, `${result.print} leaves unpainted gaps`).toBeLessThan(.95);
    expect(result.outsideInk, `${result.print} foil is registered to ink`).toBeLessThan(.005);
  }
  expect(new Set(Object.values(paintEditions).map(({ print }) => assets.find(asset => asset.name === print).signature)).size,
    'Ink wash, palette knife and brushburst must be distinct printed structures').toBe(3);
  await expect(page.locator('.tcard[data-foil="golden-flintstone"] .tcard__art img'))
    .toHaveAttribute('src', 'assets/deck/golden-flintstone.webp');
});

const bourkeCards = [
  ['thorn-rose', '★'], ['thorn-crown', '★★★'], ['thorn-tide', '★★'],
  ['reuleaux', '★'], ['reuleaux-lace', '★★'], ['reuleaux-nebula', '★★★'],
];
const bourkePortraits = new Set(['thorn-crown', 'reuleaux-nebula']);
const bourkeOptics = {
  'thorn-rose': ['url', 'linear', 'linear'], 'thorn-crown': ['url', 'linear', 'linear'],
  'thorn-tide': ['url', 'radial', 'radial', 'radial', 'radial', 'radial', 'linear'],
  reuleaux: ['url', 'repeating-linear', 'linear'], 'reuleaux-lace': ['url', 'linear', 'linear'],
  'reuleaux-nebula': ['radial', 'radial'],
};
const bourkeStock = new Set(['thorn-tide']);
const bourkeNewMaterials = {
  'thorn-crown': 'bourke-satin-thorn-crown.svg',
  'reuleaux-lace': 'bourke-lattice-reuleaux-lace.svg',
  'reuleaux-nebula': 'bourke-grooves-reuleaux-nebula.svg',
};
const bourkeMaterial = id => bourkeNewMaterials[id] || `bourke-material-${id}.webp`;
const bourkeEngraving = id => id === 'thorn-crown' ? null : bourkeNewMaterials[id] || `bourke-etch-${id}.webp`;
const bourkeLayers = id => ['foil', 'shine', 'before', ...(id === 'thorn-crown' ? [] : ['after']), ...(bourkeStock.has(id) ? ['stock'] : [])];

for (const colorScheme of ['dark', 'light']) {
  test(`six Bourke editions load their own materials and respond to light in ${colorScheme}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await openDeck(page, 'cards');
    await expect(page.locator('.tcard--bourke')).toHaveCount(6);
    await expect(page.locator('link[href$="/css/deck-bourke.css"]')).toHaveCount(1);
    const files = [...new Set(bourkeCards.flatMap(([id]) => [
      bourkeMaterial(id), ...(bourkeEngraving(id) ? [bourkeEngraving(id)] : []), `ground-${bourkePortraits.has(id) ? "full-" : ""}${id}.webp`,
    ]))];
    const assets = await page.evaluate(async files => Promise.all(files.map(async file => {
      const image = new Image(); image.src = `assets/deck/foil/${file}`;
      try {
        await image.decode();
        if (!image.naturalWidth) return { file, failed: true };
        if (!file.startsWith('ground-')) return { file };
        const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let minAlpha = 255, maxAlpha = 0, lowerAlpha = 0;
        for (let i = 3; i < pixels.length; i += 4) {
          minAlpha = Math.min(minAlpha, pixels[i]); maxAlpha = Math.max(maxAlpha, pixels[i]);
          if (Math.floor(i / 4 / canvas.width) >= canvas.height * .57) lowerAlpha = Math.max(lowerAlpha, pixels[i]);
        }
        return { file, minAlpha, maxAlpha, lowerAlpha };
      } catch { return { file, failed: true }; }
    })), files);
    expect(assets.filter(asset => asset.failed), 'Every distinct material, engraving and protection mask decodes').toEqual([]);
    for (const asset of assets.filter(asset => asset.file.startsWith('ground-'))) {
      expect(asset.minAlpha, `${asset.file} protects orbit filaments`).toBe(0);
      expect(asset.maxAlpha, `${asset.file} retains reflective stock`).toBeGreaterThan(150);
      if (asset.file.startsWith('ground-full-')) expect(asset.lowerAlpha, `${asset.file} protects lower text`).toBeLessThanOrEqual(35);
    }
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
        const split = value => { const parts = []; let depth = 0, start = 0; for (let i = 0; i < value.length; i++) { if (value[i] === '(') depth++; if (value[i] === ')') depth--; if (value[i] === ',' && depth === 0) { parts.push(value.slice(start, i).trim()); start = i + 1; } } parts.push(value.slice(start).trim()); return parts; };
        const foil = el.querySelector('.tcard__foil'), image = el.querySelector('.tcard__art img');
        const foilStyle = getComputedStyle(foil), imageStyle = getComputedStyle(image);
        const surfaces = Object.fromEntries([
          ['foil', foil], ['shine', el.querySelector('.tcard__shine')],
          ['before', foil, '::before'], ['after', foil, '::after'], ['stock', el.querySelector('.tcard__panel'), '::before'],
        ].map(([name, element, pseudo]) => {
          const style = getComputedStyle(element, pseudo);
          return [name, { image: style.backgroundImage, images: split(style.backgroundImage),
            positions: split(style.backgroundPosition), repeats: split(style.backgroundRepeat), sizes: split(style.backgroundSize),
            width: parseFloat(style.width), height: parseFloat(style.height), transform: style.transform,
            mask: style.maskImage || style.webkitMaskImage, maskSize: style.maskSize || style.webkitMaskSize,
            maskPosition: style.maskPosition || style.webkitMaskPosition, maskRepeat: style.maskRepeat || style.webkitMaskRepeat,
            maskComposite: style.maskComposite || style.webkitMaskComposite,
            opacity: Number(style.opacity), display: style.display, content: style.content }];
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
        expect(gradientKinds(current.surfaces.foil.images), `${id} optical structure`).toEqual(bourkeOptics[id]);
        const stock = current.surfaces.stock;
        if (bourkeStock.has(id)) {
          expect(stock.content).not.toMatch(/^(none|normal)$/);
          expect(stock.mask).toContain(id === 'thorn-tide' ? 'frame-window.webp' : bourkeEngraving(id));
          expect(intersection(stock.maskComposite)).toBe(true);
        } else expect(stock.content, `${id} has uncoated stock`).toMatch(/^(none|normal)$/);
        if (bourkeNewMaterials[id]) for (const surface of Object.values(current.surfaces)) {
          expect(surface.image + surface.mask, `${id} must not reintroduce the removed stamped texture`)
            .not.toMatch(new RegExp(`bourke-(?:material|etch)-${id}\\.webp`));
        }
        if (id === 'reuleaux-lace') {
          expect(gradientKinds(current.surfaces.before.images), 'Lace has an angular front').toEqual(['linear']);
          expect(gradientKinds(current.surfaces.after.images), 'Lace has an opposing angular front').toEqual(['linear']);
        }
        if (id === 'reuleaux-nebula') {
          for (const layer of ['foil', 'before', 'after']) for (const image of current.surfaces[layer].images)
            expect(image, 'Nebula diffraction shares the portrait object centre').toContain('at 50% 30.7%');
        }
        if (id === 'thorn-crown') {
          expect(current.surfaces.after.display, 'Satin Crown has no hammered-cup pass').toBe('none');
          expect(current.surfaces.after.content).toMatch(/^(none|normal)$/);
        }
        for (const layer of bourkeLayers(id)) {
          const surface = current.surfaces[layer], label = `${id} ${layer} at ${x},${y}`;
          expect(surface.display, label).not.toBe('none');
          expect(surface.opacity, label).toBeGreaterThan(0);
          expect(surface.image, label).toContain('gradient(');
          unbrokenGradientCanvas(surface, label);
          if (layer === 'foil' && id !== 'reuleaux-nebula') expect(surface.image).toContain(bourkeMaterial(id));
          if (layer === 'foil') expect(surface.mask).toContain(`ground-${prefix}${id}.webp`);
          if (layer === 'shine') expect(surface.mask).toContain(bourkePortraits.has(id) ? 'frame-full.webp' : 'frame-window.webp');
          if (layer === 'before' || layer === 'after') {
            if (bourkeEngraving(id)) expect(surface.mask).toContain(bourkeEngraving(id));
            else expect(surface.mask, 'Crown satin uses the parent ground mask').toBe('none');
          }
          if (layer === 'before' || layer === 'after') {
            expect(surface.content, `${label} must generate a painted pseudo-element`).not.toBe('none');
            expect(surface.content, `${label} must generate a painted pseudo-element`).not.toBe('normal');
          }
          if (previous) {
            expect(surface.image, `${label} reflects moving light`).not.toBe(previous.surfaces[layer].image);
            expect(maskState(surface), `${label} registered protection/engraving`).toBe(maskState(previous.surfaces[layer]));
            expect(surface.positions, `${label} fixed material canvas`).toEqual(previous.surfaces[layer].positions);
            for (const [index, image] of surface.images.entries()) if (image.startsWith('url('))
              expect(image, `${label} fixed material image`).toBe(previous.surfaces[layer].images[index]);
          }
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
