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

test('the ASCII infinity background follows the theme and stays still at both sizes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await openDeck(page, 'cards');
  const deck = page.locator('.deck');
  const background = () => deck.evaluate(el => {
    const style = getComputedStyle(el, '::before');
    return { content: style.content, image: style.backgroundImage, animation: style.animationName,
      repeat: style.backgroundRepeat, size: style.backgroundSize, filter: style.filter, opacity: style.opacity,
      pointerEvents: style.pointerEvents, userSelect: style.userSelect, transform: style.transform };
  });
  const dark = await background();
  expect(dark.content).toBe('""');
  expect(dark.image).toContain('room-infinity-ascii.svg');
  expect(dark.repeat).toBe('no-repeat');
  expect(dark.size).toBe('contain');
  expect(dark.pointerEvents).toBe('none');
  expect(dark.userSelect).toBe('none');
  expect(dark.animation).toBe('none');
  expect(dark.transform).toBe('none');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  const light = await background();
  expect(light.image).toBe(dark.image);
  expect(light.filter).not.toBe(dark.filter);
  expect(light.opacity).not.toBe(dark.opacity);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect((await background()).animation, 'Static artwork has no idle animation loop').toBe('none');
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await background()).image).toContain('room-infinity-ascii-mobile.svg');
  const decoded = await page.evaluate(async () => Promise.all(['room-infinity-ascii.svg', 'room-infinity-ascii-mobile.svg'].map(async name => {
    const image = new Image(); image.src = `assets/deck/${name}`;
    await image.decode(); return image.naturalWidth > 0 && image.naturalHeight > 0;
  })));
  expect(decoded).toEqual([true, true]);
});

const symmetryCards = [
  ['swirling-streamers', 'common'], ['sand-dollar', 'radiant'], ['pentagon', 'v'],
  ['halloween', 'v-alt'], ['golden-flintstone', 'amazing'], ['chaotic-flower', 'radiant'],
  ['french-glass', 'v'], ['pentacle', 'v-alt'], ['mayan-bracelet', 'vstar'], ['clam-triple', 'common'],
];
const portraitCards = ['halloween', 'french-glass', 'mayan-bracelet'];
const groundName = id => `ground-${id}.webp`;
const symmetryMaterial = id => id === 'pentacle' ? 'bourke-material-thorn-tide.webp' : `material-${id}.webp`;

// Optical roles are explicit: fixed engraving/print may stay still, while each
// declared illumination field must respond. These shapes distinguish a comb,
// facets, lattice, reverse stock, rings and a selective brushburst without
// snapshotting their exact colours or requiring one shared shader stack.
const symmetryOptics = {
  'swirling-streamers': ['url', 'repeating-linear', 'repeating-linear', 'radial'],
  'sand-dollar': ['url', 'repeating-linear', 'radial'],
  pentagon: ['url', 'conic', 'url', 'radial'],
  halloween: ['url', 'repeating-linear', 'radial'],
  'golden-flintstone': ['url', 'conic', 'radial'],
  'chaotic-flower': ['url', 'repeating-linear', 'repeating-linear', 'repeating-linear', 'radial'],
  'french-glass': ['url', 'conic', 'radial'],
  pentacle: ['url', 'radial', 'radial', 'radial', 'radial', 'radial', 'linear'],
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
const maskState = (surface, includeTransform = true) => JSON.stringify([surface.mask, surface.maskSize, surface.maskPosition, surface.maskRepeat, surface.maskComposite, surface.clipPath, includeTransform ? surface.transform : null]);
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
        display: style.display, content: style.content, opacity: Number(style.opacity), clipPath: style.clipPath,
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
      if (el.dataset.foil === 'halloween') result.intaglio = read(art, '::before');
      if (['sand-dollar', 'golden-flintstone', 'clam-triple'].includes(el.dataset.foil)) result.print = read(art, '::before');
      if (['sand-dollar', 'pentacle'].includes(el.dataset.foil)) result.stock = read(el.querySelector('.tcard__panel'), '::before');
      const imageStyle = getComputedStyle(image);
      // Resolve the card's actual optical coordinates independently of the
      // pointer/tilt controller. Streamers intentionally has a gentler gain.
      probe.style.left = 'calc(var(--fx) * 100px)';
      probe.style.top = 'calc(var(--fy) * 100px)';
      const coordinates = getComputedStyle(probe);
      return { surfaces: result, fx: parseFloat(coordinates.left) / 100,
        fy: parseFloat(coordinates.top) / 100,
        registration: { image: read(image), artFit: imageStyle.objectFit, artPosition: imageStyle.objectPosition,
          imageWidth: image.clientWidth, imageHeight: image.clientHeight, foilWidth: foil.clientWidth, foilHeight: foil.clientHeight,
          artZ: getComputedStyle(art).zIndex, artIsolation: getComputedStyle(art).isolation,
          imageZ: Number(imageStyle.zIndex), subjectZ: Number(getComputedStyle(art, '::after').zIndex),
          stripZ: Number(getComputedStyle(el.querySelector('.tcard__strip')).zIndex),
          rulesZ: [...el.querySelector('.tcard__panel').children].filter(child => child !== art && !child.classList.contains('tcard__strip')).map(child => Number(getComputedStyle(child).zIndex)),
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

test('Streamers attenuates small pointer and surface-normal changes without losing either axis', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDeck(page, 'cards');
  // Inspect the CSS response in isolated clones, so the existing controller
  // remains untouched. The gesture sweep separately checks full pointer/tilt.
  const samples = await page.evaluate(() => {
    const measure = id => {
      const source = document.querySelector(`.tcard[data-foil="${id}"]`);
      const card = source.cloneNode(true);
      card.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;width:360px';
      card.setAttribute('aria-hidden', 'true');
      source.parentNode.append(card);
      const probe = document.createElement('i');
      probe.style.cssText = 'position:absolute;left:calc(var(--fx)*100px);top:calc(var(--fy)*100px)';
      card.append(probe);
      try {
        const read = changes => {
          for (const key of ['--px', '--py', '--foil-tilt-x', '--foil-tilt-y']) card.style.setProperty(key, '0');
          for (const [key, value] of Object.entries(changes)) card.style.setProperty(key, value);
          const style = getComputedStyle(probe);
          return [parseFloat(style.left) / 100, parseFloat(style.top) / 100];
        };
        return [read({}), read({ '--px': '.1' }), read({ '--py': '.1' }),
          read({ '--foil-tilt-x': '.1' }), read({ '--foil-tilt-y': '-.1' })];
      } finally { card.remove(); }
    };
    return { calm: measure('swirling-streamers'), reference: measure('pentagon') };
  });
  for (const [sample, axis] of [[1, 0], [2, 1], [3, 0], [4, 1]]) {
    const travel = samples.calm[sample][axis] - samples.calm[0][axis];
    const reference = samples.reference[sample][axis] - samples.reference[0][axis];
    expect(travel, 'Small movements still move the optical field').toBeGreaterThan(0);
    expect(travel / reference, 'Streamers keeps between a quarter and half of the usual sensitivity').toBeGreaterThan(.25);
    expect(travel / reference).toBeLessThan(.5);
    expect(samples.calm[sample][1 - axis], 'Each pure-axis input leaves the other optical coordinate still').toBeCloseTo(samples.calm[0][1 - axis], 4);
  }
});

function projectedPhases(id, layer, surface, fx, fy) {
  // Only these fields still use the original translated-plane projection.
  // Conic/radial fields and the fixed crosshatch have independent geometry.
  const legacyShine = ['swirling-streamers', 'sand-dollar', 'mayan-bracelet', 'clam-triple'].includes(id) && layer === 'shine';
  const spectrum = legacyShine || ['halloween', 'chaotic-flower'].includes(id) && ['foil', 'shine'].includes(layer)
    || id === 'swirling-streamers' && layer === 'foil';
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
    expect(surfaces.foilBefore.mask).toContain('etch-sand-shell.svg');
    expect(surfaces.foilBefore.maskRepeat).toBe('no-repeat');
    expect(surfaces.foilAfter.mask).toContain('relief-sand-ink.svg');
    expect(gradientKinds(surfaces.stock.images), 'Shell engraving continues beneath the lower print').toEqual(['url', 'conic', 'radial']);
    expect(surfaces.stock.mask).toContain('frame-window.webp');
    expect(surfaces.stock.maskRepeat).toBe('no-repeat');
    for (const surface of Object.values(surfaces)) expect(surface.mask, 'Shell has a continuous engraved coating instead of isolated glitter').not.toContain('glitter.webp');
  }
  if (id === 'golden-flintstone') {
    expect(surfaces.foilBefore.mask).toContain('relief-golden-brush.svg');
    expect(surfaces.foilAfter.mask).toContain('etch-golden-brush.svg');
    expect(surfaces.foilAfter.maskRepeat).toBe('no-repeat');
    expect(gradientKinds(surfaces.foilAfter.images), 'Golden separates engraved diffraction from its paint relief').toEqual(['repeating-linear', 'radial']);
    expect(gradientKinds(surfaces.subject.images), 'Golden has a single travelling subject glint').toEqual(['linear']);
  }
  if (reverseSymmetry.has(id)) {
    expect(surfaces.stock.mask).toContain('frame-window.webp');
    expect(intersection(surfaces.stock.maskComposite)).toBe(true);
  }
  if (id === 'pentacle') {
    expect(gradientKinds(surfaces.shine.images), 'Opal stock has an achromatic frame glint').toEqual(['url', 'linear']);
    expect(gradientKinds(surfaces.foilBefore.images), 'Opal has a local moving glint').toEqual(['radial']);
    expect(gradientKinds(surfaces.foilAfter.images), 'Opal has separate nacre fields').toEqual(['radial', 'radial', 'radial', 'radial', 'linear']);
    for (const layer of ['foilBefore', 'foilAfter']) {
      expect(surfaces[layer].mask, 'Transferred opal keeps its registered engraving').toContain('bourke-etch-thorn-tide.webp');
      expect(surfaces[layer].maskRepeat).toBe('no-repeat');
    }
  }
  if (id === 'pentagon') {
    expect(surfaces.foil.images.join(',')).toContain('crystal-shards.svg');
    expect(gradientKinds(surfaces.foilBefore.images), 'Crystal facets catch a travelling light front').toEqual(['url', 'linear']);
    expect(surfaces.foilBefore.images[0]).toContain('crystal-shards.svg');
  }
  if (id === 'halloween') {
    const glint = surfaces.intaglio;
    expect(gradientKinds(glint.images), 'Intaglio catches a thin travelling reflection').toEqual(['linear']);
    expect(glint.mask, 'Intaglio stays on its original subject').toContain(groundName(id));
    expect(glint.maskComposite).toMatch(/subtract|source-out/);
    expect(glint.maskSize.split(',').at(-1).trim()).toBe('cover');
    expect(glint.maskPosition.split(',').at(-1).trim()).toBe('50% 50%');
    expect(glint.maskRepeat.split(',').at(-1).trim()).toBe('no-repeat');
    const fade = glint.mask.split('), url(')[0];
    const stops = [...fade.matchAll(/(rgba?\([^)]*\))\s+([\d.]+)%/g)];
    expect(stops.length, 'The portrait reflection has a soft protected boundary').toBeGreaterThanOrEqual(4);
    expect(stops.at(-1)[1], 'The glint fades completely before the lower rules').toMatch(/^rgba\(0,\s*0,\s*0,\s*0\)$/);
    expect(Number(stops.at(-1)[2]), 'The lower text remains outside the subject glint').toBeLessThanOrEqual(57);
    expect(glint.clipPath, 'The reflection has no hard clipping edge').toBe('none');
    expect(glint.width).toBeCloseTo(surfaces.foil.width, 1);
    expect(glint.height).toBeCloseTo(surfaces.foil.height, 1);
  }
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
    expect(registration.stockDisplay, `${id} stock coating follows its printed edition`).toBe(id === 'sand-dollar' ? 'block' : 'none');
    if (id === 'golden-flintstone') {
      expect(registration.artZ, 'Golden art does not trap its cut-out below the strip').toBe('auto');
      expect(registration.artIsolation).toBe('auto');
      expect(registration.imageZ, 'Golden orbit floats over the strip').toBeGreaterThan(registration.stripZ);
      expect(registration.subjectZ, 'Golden sheen stays above its orbit').toBeGreaterThan(registration.imageZ);
      expect(registration.rulesZ.every(z => z > registration.subjectZ), 'Golden rules remain above its cut-out and sheen').toBe(true);
    } else expect(registration.textZ.every(z => z > Number(registration.artZ)), `${id} printed rules stay above paint`).toBe(true);
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
            if (id !== 'clam-triple' || layer === 'shine') expect(surface.images[0], label).toContain(symmetryMaterial(id));
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
  const materialNames = symmetryCards.map(([id]) => symmetryMaterial(id));
  const files = symmetryCards.flatMap(([id]) => [symmetryMaterial(id), groundName(id)])
    .concat(['frame-window.webp', 'frame-full.webp', 'glitter.webp', 'etch-sand-shell.svg', 'etch-golden-brush.svg', 'crystal-shards.svg', 'glass-panes-a.svg', 'glass-panes-b.svg', 'bourke-etch-thorn-tide.webp', ...Object.values(paintEditions).flatMap(({ print, mask, relief }) => [print, mask, ...(relief ? [relief] : [])])]);
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
  const materials = assets.filter(asset => materialNames.includes(asset.name));
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
  'thorn-rose': ['url', 'linear', 'linear'], 'thorn-crown': ['linear', 'radial'],
  'thorn-tide': ['url', 'conic', 'radial'],
  reuleaux: ['url', 'repeating-linear', 'linear'], 'reuleaux-lace': ['url', 'conic', 'radial'],
  'reuleaux-nebula': ['radial', 'radial'],
};
const bourkeStock = new Set(['thorn-tide', 'reuleaux-lace']);
const bourkeNewMaterials = {
  'thorn-crown': null,
  'thorn-tide': 'material-pentacle.webp',
  'reuleaux-lace': 'bourke-lace-weave-relief.svg',
  'reuleaux-nebula': 'bourke-grooves-reuleaux-nebula.svg',
};
const bourkeMaterial = id => Object.hasOwn(bourkeNewMaterials, id) ? bourkeNewMaterials[id] : `bourke-material-${id}.webp`;
const bourkeCuts = { 'reuleaux-lace': 'bourke-lace-weave-cuts.svg' };
const bourkeEngraving = id => ['thorn-crown', 'thorn-tide'].includes(id) ? null : bourkeCuts[id] || bourkeNewMaterials[id] || `bourke-etch-${id}.webp`;
const bourkeLayers = id => ['foil', 'shine', ...(id === 'thorn-tide' ? [] : ['before', 'after']), ...(bourkeStock.has(id) ? ['stock'] : [])];

for (const colorScheme of ['dark', 'light']) {
  test(`six Bourke editions load their own materials and respond to light in ${colorScheme}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await openDeck(page, 'cards');
    await expect(page.locator('.tcard--bourke')).toHaveCount(6);
    await expect(page.locator('link[href$="/css/deck-bourke.css"]')).toHaveCount(1);
    const files = [...new Set(bourkeCards.flatMap(([id]) => [
      bourkeMaterial(id), ...(bourkeEngraving(id) ? [bourkeEngraving(id)] : []), `ground-${bourkePortraits.has(id) ? "full-" : ""}${id}.webp`,
    ].filter(Boolean)).concat('glitter.webp'))];
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
          ['subject', el.querySelector('.tcard__art'), '::before'],
        ].map(([name, element, pseudo]) => {
          const style = getComputedStyle(element, pseudo);
          return [name, { image: style.backgroundImage, images: split(style.backgroundImage),
            positions: split(style.backgroundPosition), repeats: split(style.backgroundRepeat), sizes: split(style.backgroundSize),
            width: parseFloat(style.width), height: parseFloat(style.height), transform: style.transform,
            mask: style.maskImage || style.webkitMaskImage, maskSize: style.maskSize || style.webkitMaskSize,
            maskPosition: style.maskPosition || style.webkitMaskPosition, maskRepeat: style.maskRepeat || style.webkitMaskRepeat,
            maskComposite: style.maskComposite || style.webkitMaskComposite,
            opacity: Number(style.opacity), blend: style.mixBlendMode, display: style.display, content: style.content }];
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
          expect(stock.mask).toContain('frame-window.webp');
          expect(intersection(stock.maskComposite)).toBe(true);
        } else expect(stock.content, `${id} has uncoated stock`).toMatch(/^(none|normal)$/);
        if (bourkeNewMaterials[id]) for (const surface of Object.values(current.surfaces)) {
          expect(surface.image + surface.mask, `${id} must not reintroduce the removed stamped texture`)
            .not.toMatch(new RegExp(`bourke-(?:material|etch)-${id}\\.webp`));
        }
        if (id === 'reuleaux-lace') {
          expect(gradientKinds(current.surfaces.before.images), `${id} has a local engraved glint`).toEqual(['radial']);
          expect(gradientKinds(current.surfaces.after.images), `${id} has separate diffraction on the cuts`).toEqual(['conic', 'radial']);
          for (const layer of ['before', 'after']) {
            expect(current.surfaces[layer].mask).toContain(bourkeCuts[id]);
            expect(current.surfaces[layer].maskRepeat).toBe('no-repeat');
          }
        }
        if (id === 'reuleaux-lace') {
          expect(gradientKinds(stock.images), 'Lace carries its woven engraving beneath the lower print').toEqual(['url', 'conic', 'radial']);
          expect(stock.image).toContain(bourkeMaterial(id));
        }
        if (id === 'reuleaux-nebula') {
          for (const layer of ['foil', 'before', 'after']) for (const image of current.surfaces[layer].images)
            expect(image, 'Nebula diffraction shares the portrait object centre').toContain('at 50% 30.7%');
        }
        if (id === 'thorn-crown') {
          const { foil, before, after, subject } = current.surfaces;
          expect(foil.blend, 'Secret Rare Gold uses metallic colour dodge').toBe('color-dodge');
          expect(gradientKinds(before.images), 'Gold has two grain plates and metallic illumination').toEqual(['url', 'url', 'conic', 'radial']);
          expect(before.images.slice(0, 2).every(image => image.includes('glitter.webp'))).toBe(true);
          expect(before.repeats).toEqual(['repeat', 'repeat', 'no-repeat', 'no-repeat']);
          expect(gradientKinds(after.images), 'The local smooth foil complements the glitter').toEqual(['linear', 'radial']);
          expect(subject.content, 'Gold uses the original illustration without an added engraved subject pass').toMatch(/^(none|normal)$/);
          const offsets = before.positions.slice(0, 2).map(position => [...position.matchAll(/([+-]?)\s*([\d.]+)px/g)].map(match => Number(match[2]) * (match[1] === '-' ? -1 : 1)));
          expect(offsets.every(pair => pair.length === 2), 'Each micrograin plate has two resolved travel offsets').toBe(true);
          for (const axis of [0, 1]) expect(offsets[0][axis] + offsets[1][axis], 'The two grain plates travel in opposite directions').toBeCloseTo(0, 3);
          for (const layer of [before, after]) expect(layer.mask).toContain('radial-gradient(');
          expect(before.mask.split(', rgb')[0], 'Complementary masks share one light centre').toBe(after.mask.split(', rgb')[0]);
          for (const [surface, clearFirst] of [[before, true], [after, false]]) {
            const stops = [...surface.mask.matchAll(/(rgba?\([^)]*\))\s+([\d.]+)%/g)];
            expect(stops.map(stop => Number(stop[2]))).toEqual([16, 58]);
            const transparent = colour => colour.replaceAll(' ', '') === 'rgba(0,0,0,0)';
            expect(transparent(stops[0][1])).toBe(clearFirst);
            expect(transparent(stops[1][1])).toBe(!clearFirst);
          }
          const fade = foil.mask;
          const stops = [...fade.matchAll(/(rgba?\([^)]*\))\s+([\d.]+)%/g)];
          expect(stops.length, 'Crown has a fixed feathered protection plate').toBeGreaterThanOrEqual(4);
          expect(stops.at(-1)[1], 'Crown light fades before the lower rules').toMatch(/^rgba\(0,\s*0,\s*0,\s*0\)$/);
          expect(Number(stops.at(-1)[2])).toBeLessThanOrEqual(62);
        }
        if (id === 'thorn-tide') {
          expect(gradientKinds(stock.images), 'Reverse engraving is carried by the stock').toEqual(['url', 'conic', 'radial']);
          expect(stock.image).toContain('material-pentacle.webp');
          for (const layer of ['before', 'after']) {
            const surface = current.surfaces[layer];
            expect(surface.display, 'Tide has no opal pass over its fine orbit').toBe('none');
            expect(surface.content).toMatch(/^(none|normal)$/);
            expect(surface.image).toBe('none');
            expect(surface.mask).toBe('none');
          }
        }
        for (const layer of bourkeLayers(id)) {
          const surface = current.surfaces[layer], label = `${id} ${layer} at ${x},${y}`;
          expect(surface.display, label).not.toBe('none');
          expect(surface.opacity, label).toBeGreaterThan(0);
          expect(surface.image, label).toContain('gradient(');
          unbrokenGradientCanvas(surface, label);
          if (layer === 'foil' && bourkeMaterial(id) && id !== 'reuleaux-nebula') expect(surface.image).toContain(bourkeMaterial(id));
          if (layer === 'foil' && id !== 'thorn-crown') expect(surface.mask).toContain(`ground-${prefix}${id}.webp`);
          if (layer === 'shine') expect(surface.mask).toContain(bourkePortraits.has(id) ? 'frame-full.webp' : 'frame-window.webp');
          if (layer === 'before' || layer === 'after') {
            if (bourkeEngraving(id)) expect(surface.mask).toContain(bourkeEngraving(id));
            else expect(surface.mask, 'Gold exchanges smooth foil and grain at the light').toContain('radial-gradient(');
          }
          if (layer === 'before' || layer === 'after') {
            expect(surface.content, `${label} must generate a painted pseudo-element`).not.toBe('none');
            expect(surface.content, `${label} must generate a painted pseudo-element`).not.toBe('normal');
          }
          if (previous) {
            expect(surface.image, `${label} reflects moving light`).not.toBe(previous.surfaces[layer].image);
            const movingGoldLight = id === 'thorn-crown' && ['before', 'after'].includes(layer);
            if (movingGoldLight) {
              expect(surface.mask, `${label} light mask follows the pointer`).not.toBe(previous.surfaces[layer].mask);
              expect(surface.maskSize).toBe(previous.surfaces[layer].maskSize);
              expect(surface.maskRepeat).toBe(previous.surfaces[layer].maskRepeat);
              expect(surface.transform).toBe(previous.surfaces[layer].transform);
            } else expect(maskState(surface), `${label} registered protection/engraving`).toBe(maskState(previous.surfaces[layer]));
            if (id === 'thorn-crown' && layer === 'before') {
              expect(surface.positions.slice(0, 2), 'Gold micrograin moves independently of the print').not.toEqual(previous.surfaces[layer].positions.slice(0, 2));
              expect(surface.positions.slice(2), 'Gold illumination keeps a fixed full canvas').toEqual(previous.surfaces[layer].positions.slice(2));
            } else expect(surface.positions, `${label} fixed material canvas`).toEqual(previous.surfaces[layer].positions);
            for (const [index, image] of surface.images.entries()) if (image.startsWith('url('))
              expect(image, `${label} fixed material image`).toBe(previous.surfaces[layer].images[index]);
          }
        }
        const registration = current.registration;
        expect(registration.artTransform, `${id} stationary print`).toBe('none');
        expect(registration.foilTransform, `${id} stationary protection mask`).toBe('none');
        expect(registration.artFit).toBe('cover');
        expect(registration.maskSize).toBe(id === 'thorn-crown' ? 'auto' : 'cover');
        expect(registration.artPosition).toBe('50% 50%');
        expect(registration.maskPosition).toBe(id === 'thorn-crown' ? '0% 0%' : '50% 50%');
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
