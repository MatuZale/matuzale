import { test as base, expect } from '@playwright/test';

export { expect };
const clockedPages = new WeakSet();
export const test = base.extend({
  page: async ({ page, context, baseURL, browserName }, use, info) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.origin === baseURL ? route.continue() : route.abort('blockedbyclient');
    });
    if (browserName === 'webkit') {
      // Install before navigation and the observer. Keep automatic clock progression
      // for native input/actionability; runFor below delivers every JS RAF/timer when
      // settling springs. CSS animations and compositor timing are NOT mocked.
      await page.clock.install();
      clockedPages.add(page);
      info.annotations.push({ type: 'clock', description: 'WebKit: Playwright Clock.runFor advances every JS RAF/timer for settlement; CSS motion and native input remain enabled. This does not measure presented frames or device performance.' });
    }
    await page.addInitScript(() => {
      // Observe only deck-owned RAFs; forward to the current scheduler (Clock in WebKit).
      // The home page has unrelated continuous effects, so a global RAF count is misleading.
      const request = window.requestAnimationFrame.bind(window);
      const cancel = window.cancelAnimationFrame.bind(window);
      window.deckAudit = { pending: new Set(), origins: new Map(), scheduled: 0, events: [], samples: [], recentFrames: [], stability: new WeakMap() };
      window.requestAnimationFrame = callback => {
        const stack = new Error().stack || '';
        const owned = stack.includes('deck.js');
        const id = request(time => {
          window.deckAudit.pending.delete(id);
          window.deckAudit.origins.delete(id);
          callback(time);
          const card = document.querySelector('.tcard.is-active');
          if (owned && card) {
            window.deckAudit.samples.push(parseFloat(card.style.getPropertyValue('--ry')));
            window.deckAudit.recentFrames.push({ time, foil: card.dataset.foil,
              values: ['--rx', '--ry', '--tx', '--ty', '--s'].map(key => card.style.getPropertyValue(key)) });
            if (window.deckAudit.recentFrames.length > 16) window.deckAudit.recentFrames.shift();
          }
        });
        if (owned) {
          window.deckAudit.scheduled++; window.deckAudit.pending.add(id);
          window.deckAudit.origins.set(id, { callback: callback.name, stack: stack.split('\n').slice(0, 5).join('\n') });
        }
        return id;
      };
      window.cancelAnimationFrame = id => {
        window.deckAudit.pending.delete(id); window.deckAudit.origins.delete(id); cancel(id);
      };
      for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'lostpointercapture', 'click', 'wheel']) {
        window.addEventListener(type, event => {
          const button = event.target.closest?.('button');
          window.deckAudit.events.push({
            type, id: event.pointerId, input: event.pointerType, trusted: event.isTrusted,
            detail: event.detail, foil: event.target.closest?.('.tcard')?.dataset.foil,
            action: button?.hasAttribute('data-deck-flip') ? 'flip' :
              button?.hasAttribute('data-deck-back') ? 'back' : button?.className,
            // Read lazily: this observer runs in capture, before the deck's click
            // guard. At diagnostic read time this reflects prevention by that guard.
            get defaultPrevented() { return event.defaultPrevented; },
          });
        }, true);
      }
    });
    await use(page);
    if (info.status !== info.expectedStatus && !page.isClosed()) {
      const diagnostic = await page.evaluate(() => ({
        pending: [...window.deckAudit.pending], origins: [...window.deckAudit.origins.values()],
        recentFrames: window.deckAudit.recentFrames, events: window.deckAudit.events.slice(-30),
        reducedFlip: window.deckAudit.reducedFlip,
        viewport: { width: innerWidth, height: innerHeight, scale: visualViewport?.scale },
        animations: document.querySelector('.deck')?.getAnimations({ subtree: true }).map(animation => ({
          name: animation.animationName || animation.transitionProperty,
          state: animation.playState, target: animation.effect?.target?.className,
          iterations: String(animation.effect?.getComputedTiming().iterations),
        })),
        cards: [...document.querySelectorAll('.tcard')].map(card => {
          const r = card.getBoundingClientRect();
          return { foil: card.dataset.foil, classes: card.className, style: card.getAttribute('style'),
            box: { x: r.x, y: r.y, width: r.width, height: r.height } };
        }),
      }));
      await info.attach('deck-failure-state', { body: JSON.stringify(diagnostic, null, 2), contentType: 'application/json' });
    }
    expect(errors, 'Uncaught browser errors, including pointer capture failures').toEqual([]);
  },
});

export async function idle(page) {
  if (clockedPages.has(page)) {
    // Bound virtual time as well as the test's real timeout. runFor (not fastForward)
    // executes every scheduled frame: an endless RAF still fails after 600 frames.
    for (let elapsed = 0; elapsed < 9_600; elapsed += 160) {
      if (await page.evaluate(() => window.deckAudit.pending.size === 0)) return;
      await page.clock.runFor(160);
    }
    expect(await page.evaluate(() => [...window.deckAudit.origins.values()]),
      'Deck must stop scheduling RAF within 600 virtual frames').toEqual([]);
    return;
  }
  // Chromium retains real engine frame scheduling, including its native touch stream.
  await page.waitForFunction(() => window.deckAudit.pending.size === 0, undefined, {
    polling: 'raf', timeout: 20_000,
  });
}

export async function dealt(page) {
  await idle(page);
  await expect(page.locator('.deck')).toHaveClass(/is-dealt/);
  await expect.poll(() => page.locator('.deck').evaluate(el =>
    el.getAnimations({ subtree: true }).filter(animation => {
      // style.css deliberately runs rgb-split forever on focused/hovered buttons.
      // Exclude the text shadow and the decorative, transform-only deck backdrop;
      // card animation, transitions and arbitrary infinite animations still settle.
      const effect = animation.effect;
      const textOnly = animation.animationName === 'rgb-split' &&
        effect?.target?.matches('.deck__close, .deck__tool') &&
        effect.getComputedTiming().iterations === Infinity &&
        effect.getKeyframes().every(frame => Object.keys(frame).every(key =>
          ['offset', 'computedOffset', 'easing', 'composite', 'textShadow'].includes(key)));
      const backdropOnly = animation.animationName === 'deck-ambient' &&
        effect?.target?.matches('.deck') && effect.pseudoElement === '::before' &&
        effect.getComputedTiming().iterations === Infinity &&
        effect.getKeyframes().every(frame => Object.keys(frame).every(key =>
          ['offset', 'computedOffset', 'easing', 'composite', 'transform'].includes(key)));
      return !textOnly && !backdropOnly && !['finished', 'idle'].includes(animation.playState);
    }).map(animation => ({ name: animation.animationName || animation.transitionProperty,
      state: animation.playState, target: animation.effect?.target?.className })),
  ), { message: 'Card motion must settle; only decorative button and backdrop loops are exempt' }).toEqual([]);
  await idle(page);
  // Prove the RAF observer actually saw the module, rather than silently counting nothing.
  expect(await page.evaluate(() => window.deckAudit.scheduled)).toBeGreaterThan(0);
}

export async function openDeck(page, entry, touch = false) {
  await page.goto(entry === 'cards' ? '/cards.html' : '/index.html', { waitUntil: 'domcontentloaded' });
  if (entry === 'home') {
    const link = page.locator('[data-deck-open]');
    await expect(link).toContainText('See examples');
    if (touch) await link.tap(); else await link.click();
    await expect(page).toHaveURL(/\/index\.html/); // Collection opens here, not via fallback navigation.
  }
  await expect(page.locator('.deck')).toBeVisible();
  await expect(page.locator('.tcard')).toHaveCount(20);
  expect(await page.locator('.tcard').evaluateAll(cards =>
    new Set(cards.map(card => card.dataset.foil)).size,
  )).toBe(20);
  await dealt(page);
  await expect.poll(() => page.locator('.tcard__art img').evaluateAll(images =>
    images.every(img => img.complete && img.naturalWidth > 0),
  )).toBe(true);
}

export async function lift(page, card, touch = true) {
  // The product now exposes a stable, unrotated hit surface. Playwright still checks
  // visibility, stability and event reception normally; the visual spring is checked below.
  // Positioning an off-screen fixture is programmatic, not a native scrolling test.
  // Check actual face geometry next; the following native tap/click still performs
  // Playwright's full visibility, stability and hit-target checks (no force).
  await card.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await stableFace(page, card);
  const eventStart = await page.evaluate(() => window.deckAudit.events.length);
  const sampleStart = await page.evaluate(() => window.deckAudit.samples.length);
  const initialAngle = (await values(card)).ry;
  if (touch) await card.tap();
  else await card.click();
  await expect(card).toHaveClass(/is-active/);
  await idle(page);
  if (touch) {
    // Preserve native tap coverage, including WebKit's touch down/up -> mouse click.
    // Do not assert the click's pointerType: engines differ. Assert its press source
    // and raw angles throughout lift so a full 360-degree turn cannot pass modulo 360.
    const events = await page.evaluate(start => window.deckAudit.events.slice(start), eventStart);
    expect(events.filter(e => e.trusted && e.type === 'pointerdown').at(-1)?.input).toBe('touch');
    expect(events.filter(e => e.trusted && e.type === 'pointerup').at(-1)?.input).toBe('touch');
    expect(events.some(e => e.trusted && e.type === 'click')).toBe(true);
    const angles = await page.evaluate(start => window.deckAudit.samples.slice(start), sampleStart);
    expect([...(angles || []), (await values(card)).ry].every(angle => Math.abs(angle - initialAngle) < .1),
      'Native touch lift must not rotate, including compatibility clicks labelled mouse').toBe(true);
  }
  await stableFace(page, card);
  await expect(card).toHaveAttribute('aria-pressed', 'true');
}

async function stableFace(page, card) {
  const handle = await card.elementHandle();
  try {
    await card.evaluate(el => window.deckAudit.stability.delete(el));
    const settled = el => {
      const r = el.querySelector('.tcard__rotator').getBoundingClientRect();
      const box = [r.x, r.y, r.width, r.height];
      const previous = window.deckAudit.stability.get(el);
      const unchanged = previous && box.every((value, i) => Math.abs(value - previous.box[i]) < .25);
      const frames = unchanged ? previous.frames + 1 : 0;
      window.deckAudit.stability.set(el, { box, frames });
      return frames >= 3;
    };
    if (clockedPages.has(page)) {
      // Read real layout on successive virtual frames, without changing CSS motion.
      // Actionability below still uses the engine and can fail on actual instability.
      await expect.poll(async () => {
        await page.clock.runFor(16);
        return page.evaluate(settled, handle);
      }, { message: 'Rendered face geometry must settle across consecutive frames' }).toBe(true);
    } else {
      await page.waitForFunction(settled, handle, { polling: 'raf', timeout: 20_000 });
    }
  } finally { await handle?.dispose(); }
}

export async function values(card) {
  return card.evaluate(el => {
    const css = getComputedStyle(el);
    const value = key => parseFloat(css.getPropertyValue(key));
    return {
      rx: value('--rx'), ry: value('--ry'), mx: value('--mx'), my: value('--my'),
      posx: value('--posx'), posy: value('--posy'), opacity: value('--o'),
      transform: getComputedStyle(el.querySelector('.tcard__rotator')).transform,
    };
  });
}

export function angleDistance(a, b) { return Math.abs(((a - b + 540) % 360 + 360) % 360 - 180); }

export async function neutral(page, card, face = 0) {
  await idle(page);
  const state = await values(card);
  expect(Math.abs(state.rx)).toBeLessThan(.1);
  expect(angleDistance(state.ry, face)).toBeLessThan(.1);
  expect(state.mx).toBeCloseTo(50, 1);
  expect(state.my).toBeCloseTo(50, 1);
  await expect(card).toHaveClass(/is-active/);
}

export async function backInSlot(page, card) {
  await idle(page);
  await expect(card).not.toHaveClass(/is-active|is-staged/);
  expect(await card.evaluate(el => {
    const card = el.getBoundingClientRect(), slot = el.parentElement.getBoundingClientRect();
    return Math.max(Math.abs(card.x - slot.x), Math.abs(card.y - slot.y), Math.abs(card.width - slot.width));
  })).toBeLessThan(1);
  await expect(card).toHaveAttribute('aria-pressed', 'false');
}

export async function controlsReachable(page) {
  for (const selector of ['.deck__close', '[data-deck-flip]', '[data-deck-back]']) {
    const button = page.locator(selector);
    await expect(button).toBeVisible();
    expect(await button.evaluate(el => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight &&
        r.height >= 44 && (hit === el || el.contains(hit));
    }), `${selector} must be on screen and unobstructed`).toBe(true);
  }
}

export async function inject(card, type, id, x, y, isPrimary = true) {
  await card.dispatchEvent(type, {
    pointerId: id, pointerType: 'touch', isPrimary,
    clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1,
    bubbles: true, composed: true, cancelable: true,
  });
}

export async function touchDriver(page, browserName, card, testInfo) {
  const native = browserName === 'chromium';
  testInfo.annotations.push({
    type: 'input',
    description: native ? 'Chromium CDP engine touch; not a physical phone.' :
      'WebKit: native tap, then synthetic touch PointerEvents using a held native mouse pointer for real capture. No native touchmove/scroll claim.',
  });
  const session = native ? await page.context().newCDPSession(page) : null;
  let id, x, y, held = false;
  const send = (type, points) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  const point = () => ({ id: 1, x, y, radiusX: 1, radiusY: 1, force: .5 });
  return {
    get id() { return id; },
    get position() { return { x, y }; },
    async start() {
      const r = await card.boundingBox();
      x = r.x + r.width * .5; y = r.y + r.height * .5;
      if (native) {
        await send('touchStart', [point()]);
        id = await page.evaluate(() => window.deckAudit.events.findLast(e => e.type === 'pointerdown' && e.input === 'touch' && e.trusted).id);
      } else {
        // Playwright WebKit exposes tap but no multi-event native touch API. A synthetic
        // pointer ID alone cannot legally acquire capture. Hold a real mouse pointer on
        // the toolbar (neutral hover), then reuse its ID for the synthetic sequence.
        // The trailing native click must be suppressed by the application, not the test.
        const button = await page.locator('[data-deck-back]').boundingBox();
        await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2);
        await page.mouse.down();
        id = await page.evaluate(() => window.deckAudit.events.findLast(e => e.type === 'pointerdown' && e.input === 'mouse' && e.trusted).id);
        await inject(card, 'pointerdown', id, x, y);
      }
      held = true;
      expect(await card.evaluate((el, id) => el.hasPointerCapture(id), id)).toBe(true);
    },
    async move(dx, dy) {
      const fromX = x, fromY = y;
      for (let step = 1; step <= 6; step++) {
        x = fromX + dx * step / 6; y = fromY + dy * step / 6;
        if (native) await send('touchMove', [point()]);
        else await inject(card, 'pointermove', id, x, y);
        if (clockedPages.has(page)) await page.clock.runFor(16);
        else await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      }
    },
    async end() {
      if (native) await send('touchEnd', []);
      else { await inject(card, 'pointerup', id, x, y); await page.mouse.up(); }
      held = false;
      expect(await card.evaluate((el, id) => el.hasPointerCapture(id), id)).toBe(false);
    },
    async cancel() {
      if (native) await send('touchCancel', []);
      else { await inject(card, 'pointercancel', id, x, y); await page.mouse.up(); }
      held = false;
    },
    async secondFinger() {
      if (!native) throw new Error('Multi-touch requires Chromium engine input');
      await send('touchStart', [point(), { ...point(), id: 2, x: x + 20 }]);
    },
    async moveSecond() {
      await send('touchMove', [point(), { ...point(), id: 2, x: x + 65, y: y + 30 }]);
    },
    async dispose() {
      if (held) {
        if (native) await send('touchCancel', []);
        else await page.mouse.up();
      }
      await session?.detach();
    },
  };
}
