import { test, expect } from '@playwright/test';

const tape = page => page.locator('#project-shelf .project-tape--spacewar[data-tape-spacewar]');
const screen = page => page.locator('#tape-player-screen');
const game = page => screen(page).locator('.sw-embed');

async function tuneAV(page) {
  await page.locator('[data-av]').evaluate(el => el.click());
  await expect(page.locator('html')).toHaveClass(/is-crt/);
  await expect(tape(page)).toBeVisible();
}

async function playSpacewar(page) {
  await tape(page).evaluate(el => el.click());
  await expect(screen(page)).toHaveAttribute('data-project', 'spacewar');
  await expect(game(page)).toBeVisible();
  await expect(game(page).locator('canvas.sw__canvas')).toBeVisible();
  // The game deliberately sleeps outside the viewport. Bring the television
  // into view before exercising its input, playback or audio controls.
  await screen(page).scrollIntoViewIfNeeded();
}

test('selecting the Spacewar cassette does not move the camera', async ({ page }) => {
  await page.goto('/?lang=en');
  await tuneAV(page);
  await page.locator('#project-shelf').scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  await tape(page).click();
  await expect(screen(page)).toHaveAttribute('data-project', 'spacewar');
  await page.waitForTimeout(850);
  expect(Math.abs(await page.evaluate(() => scrollY) - before)).toBeLessThanOrEqual(1);
});

test('AV reveals a Spacewar cassette and plays inside the existing TV', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  await expect(tape(page)).toHaveCount(0);
  await tuneAV(page);
  await expect(page.locator('[data-game]')).toHaveCount(0);
  await expect(page.locator('#project-shelf .project-tape')).toHaveCount(12);
  await playSpacewar(page);
  await expect(page.locator('dialog.sw')).toHaveCount(0);
  const player = page.locator('#project-player');
  await expect(player.locator('[data-i18n="tapes.nowGame"]')).toBeVisible();
  await expect(player.locator('[data-i18n="tapes.nowPlaying"]')).toBeHidden();
  await expect(player.locator('[data-sw="start"]')).toBeVisible();
  await expect(player.locator('[data-sw="help"]')).toBeVisible();
  await expect(player.locator('.sw__volume[role="slider"]')).toBeVisible();
  await player.locator('[data-sw="start"]').click();
  await expect(game(page)).toHaveAttribute('data-state', 'play');
  await expect(page.locator('#project-player')).toBeVisible();
});

test('AV keeps all twelve tapes reachable at 1024px, then restores the normal 3D shelf', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  await tuneAV(page);
  const shelf = page.locator('#project-shelf');
  await shelf.scrollIntoViewIfNeeded();
  const buttons = shelf.locator('.tape-shelf__stacks .project-tape');
  await expect(buttons).toHaveCount(12);
  for (const selected of ['bentos', 'spacewar']) {
    await shelf.locator(`.project-tape--${selected}`).click();
    await expect(screen(page)).toHaveAttribute('data-project', selected);
    await expect(shelf.locator('.tape-shelf__showcase')).toBeHidden();
    const unreachable = await buttons.evaluateAll(items => items.filter(el => {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) return true;
      return ![.15, .35, .5, .65, .85].some(x => [.25, .5, .75].some(y => {
        const px = box.left + box.width * x, py = box.top + box.height * y;
        if (px < 0 || px >= innerWidth || py < 0 || py >= innerHeight) return false;
        const hit = document.elementFromPoint(px, py);
        return hit === el || el.contains(hit);
      }));
    }).map(el => el.getAttribute('aria-label')));
    expect(unreachable).toEqual([]);
  }
  await page.locator('[data-av]').evaluate(el => el.click());
  await expect(page.locator('html')).not.toHaveClass(/is-crt/);
  await expect(tape(page)).toHaveCount(0);
  await expect(buttons).toHaveCount(11);
  await shelf.locator('.project-tape--kodlab').click();
  await expect(shelf.locator('.tape-showcase.is-open .tape-cover--kodlab')).toBeVisible();
});

test('AV enables 3D at 1100px while neighbouring cassettes stay clickable', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  await tuneAV(page);
  const shelf = page.locator('#project-shelf');
  await shelf.scrollIntoViewIfNeeded();
  await shelf.locator('.project-tape--bentos').click();
  await expect(shelf.locator('.tape-showcase.is-open .tape-cover--bentos')).toBeVisible();
  await tape(page).click();
  await expect(screen(page)).toHaveAttribute('data-project', 'spacewar');
  await expect(shelf.locator('.tape-showcase.is-open .tape-cover--spacewar')).toBeVisible();
  await shelf.locator('.project-tape--art').click();
  await expect(screen(page)).toHaveAttribute('data-project', 'art');
});

for (const action of ['close', 'power']) {
  test(`reselecting Spacewar during ${action === 'close' ? 'EJECT' : 'POWER'} keeps the TV playing`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?lang=en');
    await tuneAV(page);
    await playSpacewar(page);
    const player = page.locator('#project-player');
    // Activate both controls while the close animation is in flight; waiting
    // for the timeout afterwards catches stale callbacks hiding the new game.
    await player.locator(`.tape-player__${action}`).evaluate(el => el.click());
    await expect(player).toHaveClass(/is-ejecting/);
    await tape(page).evaluate(el => el.click());
    await expect(game(page)).toBeVisible();
    await page.waitForTimeout(800);
    await expect(player).toBeVisible();
    await expect(player).not.toHaveClass(/is-ejecting|is-powering-off/);
    await expect(screen(page)).toHaveAttribute('data-project', 'spacewar');
    await expect(tape(page)).toHaveAttribute('aria-expanded', 'true');
    await player.locator('[data-sw="start"]').evaluate(el => el.click());
    await expect(game(page)).toHaveAttribute('data-state', 'play');
  });
}

test('game input stays inside the TV and the game follows language changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?lang=en');
  await tuneAV(page);
  await playSpacewar(page);
  const player = page.locator('#project-player');
  const canvas = game(page).locator('canvas.sw__canvas');
  await player.locator('[data-sw="start"]').click();
  await expect(game(page)).toHaveAttribute('data-state', 'play');
  await canvas.focus();
  const inside = await canvas.evaluate(el => {
    const options = { key: 'w', code: 'KeyW', bubbles: true, cancelable: true };
    const accepted = el.dispatchEvent(new KeyboardEvent('keydown', options));
    el.dispatchEvent(new KeyboardEvent('keyup', options));
    return accepted;
  });
  expect(inside).toBe(false);
  const outside = await page.locator('#about').evaluate(el =>
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', bubbles: true, cancelable: true })));
  expect(outside).toBe(true);
  const help = player.locator('[data-sw="help"]');
  const english = await help.textContent();
  await page.locator('[data-channel="pl"]').evaluate(el => el.click());
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  await expect(player.locator('[data-i18n="tapes.nowGame"]')).toHaveText('TERAZ ODTWARZANE / SPACEWAR!');
  await expect(help).not.toHaveText(english);
  await help.evaluate(el => el.click());
  await expect(game(page).locator('.sw__panel')).toBeVisible();
  await page.locator('[data-channel="en"]').evaluate(el => el.click());
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(help).toHaveText(english);
  expect(errors).toEqual([]);
});

test('focused game controls respond to native Enter, Space and Tab', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  await tuneAV(page);
  await playSpacewar(page);
  const player = page.locator('#project-player');
  const canvas = game(page).locator('.sw__canvas');
  const start = player.locator('[data-sw="start"]');
  const pause = player.locator('[data-sw="pause"]');
  const help = player.locator('[data-sw="help"]');
  await start.focus();
  await page.keyboard.press('Enter');
  await expect(game(page)).toHaveAttribute('data-state', 'play');
  await expect(pause).toBeEnabled();
  // Safari's default keyboard-navigation setting may skip buttons on Tab;
  // focus explicitly before checking the native key activation in both engines.
  await canvas.focus();
  await page.keyboard.press('Tab');
  await pause.focus();
  await page.keyboard.press('Enter');
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  await pause.focus();
  await page.keyboard.press('Space');
  await expect(pause).toHaveAttribute('aria-pressed', 'false');
  await help.focus();
  await page.keyboard.press('Enter');
  await expect(game(page).locator('.sw__panel')).toBeVisible();
  await help.focus();
  await page.keyboard.press('Space');
  await expect(game(page).locator('.sw__panel')).toBeHidden();
});

test('eject, project switching, power and leaving AV clean up the game', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    window.spacewarAudioSuspends = 0;
    for (const Context of new Set([window.AudioContext, window.webkitAudioContext].filter(Boolean))) {
      const suspend = Context.prototype.suspend;
      Context.prototype.suspend = function (...args) {
        window.spacewarAudioSuspends++;
        return suspend.apply(this, args);
      };
    }
  });
  await page.goto('/?lang=en');
  await tuneAV(page);
  await playSpacewar(page);
  const player = page.locator('#project-player');
  await player.locator('[data-sw="start"]').click();
  await expect(game(page)).toHaveAttribute('data-state', 'play');
  await player.locator('.tape-player__close').evaluate(el => el.click());
  await expect(game(page)).toHaveCount(0);
  await expect(screen(page).locator('.tape-static')).toBeVisible();
  await expect(player.locator('[data-i18n="tapes.nowGame"]')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.spacewarAudioSuspends), { timeout: 4000 }).toBeGreaterThan(0);
  await expect(player).toBeVisible();

  await playSpacewar(page);
  await page.locator('.project-tape--kodlab').evaluate(el => el.click());
  await expect(game(page)).toHaveCount(0);
  await expect(screen(page)).toHaveAttribute('data-project', 'kodlab');
  await playSpacewar(page);
  await player.locator('.tape-player__power').evaluate(el => el.click());
  await expect(game(page)).toHaveCount(0);
  await expect(player).toHaveClass(/is-off/);
  await playSpacewar(page);
  await page.locator('[data-av]').evaluate(el => el.click());
  await expect(page.locator('html')).not.toHaveClass(/is-crt/);
  await expect(game(page)).toHaveCount(0);
  await expect(tape(page)).toHaveCount(0);
});

test('quickly changing cassette cannot mount a stale game', async ({ page }) => {
  await page.goto('/?lang=en');
  await tuneAV(page);
  await page.evaluate(() => {
    document.querySelector('.project-tape--spacewar').click();
    document.querySelector('.project-tape--kodlab').click();
  });
  await expect(screen(page)).toHaveAttribute('data-project', 'kodlab');
  await page.waitForTimeout(1000);
  await expect(game(page)).toHaveCount(0);
  await expect(screen(page).locator('.card__body h3')).toBeVisible();
});

for (const width of [1280, 375]) {
  test(`game controls do not move the following section at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?lang=en');
    await page.evaluate(() => document.fonts.ready);
    await tuneAV(page);
    await page.locator('#project-shelf').scrollIntoViewIfNeeded();
    // Sample throughout the asynchronous game load and the subsequent switch.
    // DOM clicks avoid actionability's automatic scrolling.
    const recordSwitch = selector => page.evaluate(async selector => {
      const samples = [];
      const sample = () => samples.push({
        nextTop: document.querySelector('#bentos').getBoundingClientRect().top + scrollY,
        scroll: scrollY,
      });
      sample();
      document.querySelector(selector).click();
      const start = performance.now();
      await new Promise(resolve => {
        const frame = now => {
          sample();
          if (now - start < 1600) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
      return samples;
    }, selector);
    const assertStable = (samples, baseline) => {
      for (const key of ['nextTop', 'scroll']) {
        expect(Math.max(...samples.map(sample => Math.abs(sample[key] - baseline[key])))).toBeLessThanOrEqual(1);
      }
    };
    const opening = await recordSwitch('.project-tape--spacewar');
    const baseline = opening[0];
    assertStable(opening, baseline);
    await expect(game(page)).toBeVisible();
    await expect(page.locator('.sw-controls-slot')).toHaveClass(/is-expanded/);
    assertStable(await recordSwitch('.project-tape--kodlab'), baseline);
    await expect(screen(page)).toHaveAttribute('data-project', 'kodlab');
    assertStable(await recordSwitch('.project-tape--spacewar'), baseline);
    await expect(screen(page)).toHaveAttribute('data-project', 'spacewar');
    await expect(game(page)).toBeVisible();
  });
}

test('global pause holds the game and resumes without discarding it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  await tuneAV(page);
  await playSpacewar(page);
  const player = page.locator('#project-player');
  await player.locator('[data-sw="start"]').click();
  await expect(game(page)).toHaveAttribute('data-state', 'play');
  const pause = page.locator('[data-tape-action="pause"]');
  await pause.evaluate(el => el.click());
  await expect(page.locator('html')).toHaveClass(/is-tape-paused/);
  await expect(game(page)).toBeVisible();
  await pause.evaluate(el => el.click());
  await expect(page.locator('html')).not.toHaveClass(/is-tape-paused/);
  await expect(game(page)).toHaveAttribute('data-state', 'play');
});

test('TM ident temporarily holds the game without resetting it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  await tuneAV(page);
  await playSpacewar(page);
  const player = page.locator('#project-player');
  await player.locator('[data-sw="start"]').click();
  await expect(game(page)).toHaveAttribute('data-state', 'play');
  await player.locator('.tape-player__secret').evaluate(el => el.click());
  await expect(screen(page)).toHaveAttribute('inert', '');
  await expect(player.locator('.sw-controls')).toHaveAttribute('inert', '');
  await expect(player.locator('.tape-ident')).toBeHidden({ timeout: 4000 });
  await expect(screen(page)).not.toHaveAttribute('inert', '');
  await expect(player.locator('.sw-controls')).not.toHaveAttribute('inert', '');
  await expect(game(page)).toHaveAttribute('data-state', 'play');
});

for (const width of [320, 375, 1280]) {
  test(`help and ten scores fit the TV in both languages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      const scores = Array.from({ length: 10 }, (_, index) => ({
        name: String.fromCharCode(65 + index).repeat(3), score: 9000 - index * 100,
        round: index + 1, date: '2026-01-01T00:00:00.000Z',
      }));
      localStorage.setItem('spacewar-scores', JSON.stringify(scores));
    });
    await page.goto('/?lang=en');
    await tuneAV(page);
    await playSpacewar(page);
    const player = page.locator('#project-player');
    const panel = game(page).locator('.sw__panel');
    const checkFits = async () => {
      await expect.poll(() => panel.evaluate(el => {
        const outer = el.getBoundingClientRect();
        return {
          horizontal: el.scrollWidth - el.clientWidth,
          vertical: el.scrollHeight - el.clientHeight,
          clippedButtons: [...el.querySelectorAll('button, input')].filter(button => {
            const box = button.getBoundingClientRect();
            return box.left < outer.left - 1 || box.right > outer.right + 1 ||
              box.top < outer.top - 1 || box.bottom > outer.bottom + 1;
          }).length,
        };
      })).toEqual({ horizontal: 0, vertical: 0, clippedButtons: 0 });
      expect(await screen(page).evaluate(el => el.scrollHeight - el.clientHeight)).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    };
    for (const lang of ['en', 'pl']) {
      await page.locator(`[data-channel="${lang}"]`).evaluate(el => el.click());
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await player.locator('[data-sw="help"]').evaluate(el => el.click());
      await expect(panel).toBeVisible();
      await checkFits();
      await panel.locator('[data-sw="back"]').evaluate(el => el.click());

      await player.locator('[data-sw="scores"]').evaluate(el => el.click());
      await expect(panel.locator('table tr')).toHaveCount(6);
      await expect(panel).toContainText('AAA');
      await expect(panel).toContainText('EEE');
      await checkFits();
      await panel.locator('[data-sw="scores-page"]').evaluate(el => el.click());
      await expect(panel.locator('table tr')).toHaveCount(6);
      await expect(panel).toContainText('FFF');
      await expect(panel).toContainText('JJJ');
      await checkFits();
      await panel.locator('[data-sw="back"]').evaluate(el => el.click());
      await expect(panel).toBeHidden();
    }
  });
}

test.describe('touch game controls', () => {
  test.use({ hasTouch: true });
  test('global tape pause holds game input while help and resume remain available', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?lang=en');
    await tuneAV(page);
    await playSpacewar(page);
    const player = page.locator('#project-player');
    const canvas = game(page).locator('canvas.sw__canvas');
    const start = player.locator('[data-sw="start"]');
    const one = player.locator('[data-sw="mode"][data-players="1"]');
    const two = player.locator('[data-sw="mode"][data-players="2"]');
    const pause = page.locator('[data-tape-action="pause"]');
    const thrust = player.locator('[data-pad="KeyW"]');
    await canvas.scrollIntoViewIfNeeded();
    await canvas.focus();
    await pause.evaluate(el => el.click());
    await expect(page.locator('html')).toHaveClass(/is-tape-paused/);
    await expect(start).toBeDisabled();
    await expect(one).toBeDisabled();
    await expect(two).toBeDisabled();
    await expect(thrust).toBeDisabled();
    await expect(player.locator('[data-sw="help"]')).toBeEnabled();
    await expect(player.locator('[data-sw="scores"]')).toBeEnabled();
    await expect(player.locator('.sw__volume')).toBeVisible();
    await page.keyboard.press('Enter');
    await page.keyboard.press('m');
    await page.keyboard.press('p');
    await page.keyboard.press('w');
    await expect(game(page)).toHaveAttribute('data-state', 'title');
    await expect(one).toHaveAttribute('aria-pressed', 'true');
    await expect(two).toHaveAttribute('aria-pressed', 'false');
    await expect(thrust).not.toHaveClass(/is-on/);
    const help = player.locator('[data-sw="help"]');
    await help.focus();
    await page.keyboard.press('Enter');
    await expect(game(page).locator('.sw__panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(game(page).locator('.sw__panel')).toBeHidden();
    await pause.evaluate(el => el.click());
    await expect(start).toBeEnabled();
    await expect(thrust).toBeEnabled();
    await canvas.focus();
    await page.keyboard.press('Enter');
    await expect(game(page)).toHaveAttribute('data-state', 'play');
    await expect(player.locator('[data-sw="pause"]')).toBeEnabled();
  });
  test('the AV cassette and touch controls work on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?lang=en');
    await tuneAV(page);
    await playSpacewar(page);
    const player = page.locator('#project-player');
    await player.locator('[data-sw="start"]').click();
    await expect(game(page)).toHaveAttribute('data-state', 'play');
    const thrust = player.locator('[data-pad="KeyW"]');
    await expect(thrust).toBeVisible();
    await thrust.scrollIntoViewIfNeeded();
    await expect(page.locator('html')).toHaveClass(/sw-controls-on-screen/);
    await expect(page.locator('.footer-tape__transport')).toHaveCSS('visibility', 'hidden');
    await expect(page.locator('.back-top')).toHaveCSS('visibility', 'hidden');
    const hit = await thrust.evaluate(el => {
      const box = el.getBoundingClientRect();
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return top === el || el.contains(top);
    });
    expect(hit).toBe(true);
    await thrust.tap();
    await expect(thrust).not.toHaveClass(/is-on/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    const help = player.locator('[data-sw="help"]');
    await help.evaluate(el => el.click());
    const panel = game(page).locator('.sw__panel');
    await expect(panel).toBeVisible();
    for (const lang of ['en', 'pl']) {
      await page.locator(`[data-channel="${lang}"]`).evaluate(el => el.click());
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect.poll(() => panel.evaluate(el => ({
        horizontal: el.scrollWidth - el.clientWidth,
        vertical: el.scrollHeight - el.clientHeight,
      }))).toEqual({ horizontal: 0, vertical: 0 });
      await expect(panel.locator('[data-sw="back"]')).toBeVisible();
    }
  });
});
