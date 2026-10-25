import {
  test, expect, openDeck, dealt, lift, idle, values, neutral, backInSlot,
  controlsReachable, angleDistance, inject, touchDriver,
} from './deck-support.js';

test.beforeEach(async ({}, info) => {
  test.skip(!info.project.use.hasTouch, 'Touch projects only; desktop regressions have a separate suite.');
});

for (const entry of ['cards', 'home']) {
  test(`${entry}: foil inspection without spinning or dropping (four foil families; optional full collection)`, async ({ page, browserName }, info) => {
    const fullCollection = process.env.DECK_FULL_COLLECTION === '1' && entry === 'cards' && browserName === 'chromium';
    test.setTimeout(fullCollection ? 360_000 : 120_000);
    await openDeck(page, entry, true);
    const ids = await page.locator('.tcard').evaluateAll(cards => cards.map(card => card.dataset.foil));
    expect(new Set(ids).size).toBe(20);
    const inspected = fullCollection
      ? ids : ['clifford', 'chirikov', 'logistic', 'halvorsen'];
    info.annotations.push({ type: 'coverage', description: `Inspected cards: ${inspected.join(', ')}. All 20 identities and images checked on entry.` });
    const seenHolo = new Set();
    for (const id of inspected) {
      await test.step(id, async () => {
        const card = page.locator(`.tcard[data-foil="${id}"]`);
        seenHolo.add(await card.getAttribute('data-holo'));
        await page.evaluate(() => { window.deckAudit.samples = []; });
        await lift(page, card);
        await controlsReachable(page);
        const before = await values(card);
        expect(angleDistance(before.ry, 0)).toBeLessThan(.1);
        const driver = await touchDriver(page, browserName, card, info);
        try {
          const comparison = entry === 'cards' && id === 'halvorsen' && browserName === 'chromium';
          if (comparison) await page.screenshot({ path: info.outputPath('halvorsen-neutral.png') });
          await driver.start();
          const r = await card.boundingBox();
          await driver.move(r.width * .28, r.height * .2);
          await idle(page);
          const held = await values(card);
          expect(Math.abs(held.rx - before.rx)).toBeGreaterThan(2);
          expect(angleDistance(held.ry, before.ry)).toBeGreaterThan(2);
          expect(held.mx - before.mx).toBeGreaterThan(15);
          expect(held.my - before.my).toBeGreaterThan(10);
          expect(held.posx - before.posx).toBeGreaterThan(1);
          expect(held.posy - before.posy).toBeGreaterThan(1);
          expect(held.posx - before.posx).toBeLessThan(held.mx - before.mx);
          expect(held.opacity).toBeGreaterThan(.9);
          expect(held.transform).not.toBe(before.transform);
          await expect(card).toHaveClass(/is-active/);
          // Include lift and every rendered spring frame, not just the final orientation.
          const angles = await page.evaluate(() => window.deckAudit.samples);
          expect(angles.length).toBeGreaterThan(0);
          expect(Math.max(...angles.map(angle => angleDistance(angle, 0)))).toBeLessThan(25);
          if (comparison) await page.screenshot({ path: info.outputPath('halvorsen-touch-light.png') });
          await driver.end();
          await neutral(page, card);
          // Explicit synthetic compatibility-click probes, separate from native engine input.
          await card.dispatchEvent('click', { detail: 1 });
          await page.locator('.deck__veil').dispatchEvent('click', { detail: 1 });
          await expect(card).toHaveClass(/is-active/);
          if (id === 'clifford') {
            await card.locator('.tcard__rotator').tap();
            await neutral(page, card); // A fresh native tap also inspects instead of putting back.
          }
          // The face lifecycle is shared by all foils; inspect the back once per combination.
          if (id === 'halvorsen') {
            await page.locator('[data-deck-flip]').tap();
            await idle(page);
            expect(angleDistance((await values(card)).ry, 180)).toBeLessThan(.1);
            await driver.start();
            await driver.move(-r.width * .2, -r.height * .15);
            await idle(page);
            expect(angleDistance((await values(card)).ry, 180)).toBeLessThan(20);
            await driver.end();
            await neutral(page, card, 180);
          }
          await page.locator('[data-deck-back]').tap();
          await backInSlot(page, card);
          if (entry === 'cards' && id === 'clifford' && browserName === 'webkit') {
            // A new real mouse press must replace the preceding touch source. Keep
            // this hybrid-input regression once, alongside the native WebKit tap.
            const angle = (await values(card)).ry;
            await lift(page, card, false);
            expect((await values(card)).ry - angle).toBeCloseTo(360, 1);
            await card.click();
            await backInSlot(page, card);
          }
        } finally { await driver.dispose(); }
      });
    }
    expect([...seenHolo].sort()).toEqual(['', 'amazing', 'beam', 'reverse']);
  });

  test(`${entry}: ${entry === 'cards' ? 'synthetic cancellation and capture loss' : 'viewport rotation and close/reopen'}`, async ({ page, browserName }, info) => {
    test.setTimeout(180_000);
    await openDeck(page, entry, true);
    const card = page.locator('.tcard').first();
    const portrait = page.viewportSize();
    // Split the shared controller's lifecycle across entries, retaining both engines for each case.
    const reasons = entry === 'cards' ? ['pointercancel', 'lostpointercapture'] : ['landscape', 'close'];
    for (const reason of reasons) {
      await test.step(reason, async () => {
        await lift(page, card);
        const driver = await touchDriver(page, browserName, card, info);
        try {
          await driver.start();
          await driver.move(45, 35);
          await idle(page);
          expect((await values(card)).mx).toBeGreaterThan(55);
          if (reason === 'close') {
            // Controlled lifecycle action during a held gesture, not a second-finger button tap.
            await page.locator('.deck').evaluate(dialog => dialog.close());
            await expect(page.locator('.deck')).not.toBeVisible();
            await idle(page);
            expect(await card.evaluate((el, id) => el.hasPointerCapture(id), driver.id)).toBe(false);
            await expect(page.locator('.tcard.is-staged')).toHaveCount(0);
            await driver.cancel();
            await page.locator('[data-deck-open]').tap();
            await dealt(page);
            await lift(page, card);
            await driver.start();
            await driver.move(30, 20);
            await idle(page);
            expect((await values(card)).mx).toBeGreaterThan(55);
          } else {
            if (reason === 'landscape') {
              // A viewport resize exercises geometry cleanup; this is not a physical rotation.
              await page.setViewportSize({ width: portrait.height, height: portrait.width });
            } else {
              info.annotations.push({ type: 'synthetic', description: `${reason}: controlled PointerEvent injection during a held pointer.` });
              await inject(card, reason, driver.id, driver.position.x, driver.position.y);
            }
            await neutral(page, card);
            expect(await card.evaluate((el, id) => el.hasPointerCapture(id), driver.id)).toBe(false);
            if (reason !== 'landscape') {
              await driver.move(30, 15);
              await neutral(page, card); // The cancelled press cannot resume inspection.
            }
          }
          await driver.end();
          await neutral(page, card);
          await controlsReachable(page);
          await page.locator('[data-deck-back]').tap();
          // Change the slot while the return spring is running.
          await page.locator('.deck').evaluate(dialog => { dialog.scrollTop += 120; });
          await backInSlot(page, card);
          if (reason === 'landscape') await page.setViewportSize(portrait);
        } finally { await driver.dispose(); }
      });
    }
    // A fresh, separate veil tap remains an intentional dismissal.
    await lift(page, card);
    await page.touchscreen.tap(3, portrait.height / 2);
    await backInSlot(page, card);
  });

  if (entry === 'home') test(`${entry}: reduced motion keeps direct light and explicit actions, including wide touch`, async ({ page, browserName }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1100, height: 800 });
    await openDeck(page, entry, true);
    const card = page.locator('.tcard[data-foil="halvorsen"]');
    await lift(page, card);
    const before = await values(card);
    const driver = await touchDriver(page, browserName, card, info);
    try {
      await driver.start();
      await driver.move(65, 40);
      const held = await values(card);
      expect(held.rx).toBe(0);
      expect(held.ry).toBe(0);
      expect(held.transform).toBe(before.transform);
      expect(held.mx).toBeGreaterThan(55);
      expect(held.posx).toBeGreaterThan(before.posx);
      expect(await page.evaluate(() => window.deckAudit.pending.size)).toBe(0);
      await driver.end();
      await neutral(page, card);
      const flip = page.locator('[data-deck-flip]');
      await flip.evaluate(button => {
        window.deckAudit.reducedFlip = { eventStart: window.deckAudit.events.length, handled: null };
        // Registered after the product's button listener: record its synchronous
        // result. If the dialog's guard blocks the click, this listener never runs.
        button.addEventListener('click', event => {
          const active = document.querySelector('.tcard.is-active');
          window.deckAudit.reducedFlip.handled = {
            trusted: event.isTrusted, defaultPrevented: event.defaultPrevented,
            ry: active ? parseFloat(getComputedStyle(active).getPropertyValue('--ry')) : null,
            pending: window.deckAudit.pending.size,
          };
        }, { once: true });
      });
      await flip.tap();
      await page.evaluate(() => {
        const active = document.querySelector('.tcard.is-active');
        window.deckAudit.reducedFlip.onTapReturn = {
          handled: window.deckAudit.reducedFlip.handled !== null,
          ry: active ? parseFloat(getComputedStyle(active).getPropertyValue('--ry')) : null,
        };
      });
      // Native tap acknowledgement can precede click delivery. Wait for the single
      // action, not a delay or a second tap; reduced motion must still flip immediately
      // inside that handler, with no spring/RAF needed to reach the expected face.
      await expect.poll(() => page.evaluate(() => window.deckAudit.reducedFlip.handled), {
        message: 'The native Flip click must reach its handler after the touch release',
      }).not.toBeNull();
      const flipped = await page.evaluate(() => window.deckAudit.reducedFlip.handled);
      expect(flipped.trusted).toBe(true);
      expect(flipped.defaultPrevented).toBe(false);
      expect(flipped.ry).not.toBeNull();
      expect(angleDistance(flipped.ry, 180)).toBeLessThan(.1);
      expect(flipped.pending).toBe(0);
      expect(angleDistance((await values(card)).ry, 180)).toBeLessThan(.1);
      await info.attach('reduced-flip-sequence', {
        body: JSON.stringify(await page.evaluate(() => ({
          ...window.deckAudit.reducedFlip,
          events: window.deckAudit.events.slice(Math.max(0, window.deckAudit.reducedFlip.eventStart - 8)),
        })), null, 2),
        contentType: 'application/json',
      });
      expect(await page.evaluate(() => window.deckAudit.pending.size)).toBe(0);
      await page.locator('[data-deck-back]').tap();
      await backInSlot(page, card);
      // Stay wide and re-enable motion: pointerType, not viewport width, must select inspection.
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await lift(page, card);
      await driver.start();
      await driver.move(65, 40);
      await idle(page);
      expect(Math.abs((await values(card)).rx)).toBeGreaterThan(1);
      await driver.end();
      await neutral(page, card);
      await page.locator('[data-deck-back]').tap();
      await backInSlot(page, card);
    } finally { await driver.dispose(); }
  });

  if (entry === 'cards') test(`${entry}: synthetic remaining finger cannot inherit the cancelled gesture`, async ({ page, browserName }, info) => {
    info.annotations.push({ type: 'synthetic', description: 'Controlled secondary PointerEvents and partial release; native multi-touch is tested separately in Chromium.' });
    await openDeck(page, entry, true);
    const card = page.locator('.tcard').first();
    await lift(page, card);
    const driver = await touchDriver(page, browserName, card, info);
    try {
      await driver.start();
      await driver.move(35, 25);
      const second = driver.id + 10_000;
      const { x, y } = driver.position;
      await inject(card, 'pointerdown', second, x + 15, y, false);
      await neutral(page, card);
      await driver.end(); // The secondary press is still held in application state.
      await inject(card, 'pointermove', second, x + 60, y + 30, false);
      await neutral(page, card);
      await page.locator('.deck__veil').dispatchEvent('click', { detail: 1 });
      await expect(card).toHaveClass(/is-active/);
      await inject(card, 'pointerup', second, x + 60, y + 30, false);
      await driver.start();
      await driver.move(40, 20);
      await idle(page);
      expect((await values(card)).mx).toBeGreaterThan(55);
      await driver.end();
      await page.locator('[data-deck-back]').tap();
      await backInSlot(page, card);
    } finally { await driver.dispose(); }
  });

  if (entry === 'cards') test(`${entry}: Chromium engine touch scroll, cancel and two fingers`, async ({ page, browserName }, info) => {
    test.skip(browserName !== 'chromium', 'Playwright WebKit has no equivalent native multi-touch/scroll API.');
    await openDeck(page, entry, true);
    const session = await page.context().newCDPSession(page);
    try {
      const x = Math.round(page.viewportSize().width * .35);
      const y = Math.round(page.viewportSize().height * .75);
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] });
      for (let step = 1; step <= 10; step++) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x, y: y - step * 30 }] });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      }
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect.poll(() => page.locator('.deck').evaluate(el => el.scrollTop)).toBeGreaterThan(100);
      await expect(page.locator('.tcard.is-active')).toHaveCount(0);
    } finally { await session.detach(); }
    const card = page.locator('.tcard[data-foil="chirikov"]');
    await lift(page, card);
    const driver = await touchDriver(page, browserName, card, info);
    try {
      await driver.start();
      await driver.move(40, 25);
      await driver.cancel();
      await neutral(page, card);
      expect(await page.evaluate(id => window.deckAudit.events.some(e => e.type === 'pointercancel' && e.id === id && e.input === 'touch' && e.trusted), driver.id)).toBe(true);
      await driver.start();
      await driver.move(40, 25);
      await card.evaluate((el, id) => el.releasePointerCapture(id), driver.id);
      await driver.move(5, 5); // Flush the engine's pending lostpointercapture event.
      await neutral(page, card);
      expect(await page.evaluate(id => window.deckAudit.events.some(e => e.type === 'lostpointercapture' && e.id === id && e.trusted), driver.id)).toBe(true);
      await driver.end();
      await driver.start();
      await driver.move(40, 25);
      await driver.secondFinger();
      await neutral(page, card);
      expect(await card.evaluate((el, id) => el.hasPointerCapture(id), driver.id)).toBe(false);
      await driver.moveSecond();
      await neutral(page, card);
      await driver.end();
      await neutral(page, card);
      await driver.start();
      await driver.move(45, 30);
      await idle(page);
      expect((await values(card)).mx).toBeGreaterThan(55);
      await driver.end();
      await page.locator('[data-deck-back]').tap();
      await backInSlot(page, card);
    } finally { await driver.dispose(); }
  });
}
