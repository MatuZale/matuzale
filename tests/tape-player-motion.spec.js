import { test, expect } from '@playwright/test';

// Sample actual document geometry during transitions, not just their final state.
// DOM clicks avoid Playwright scrolling the controls into view.
async function recordChange(page, selector) {
  return page.evaluate(async selector => {
    const samples = [];
    const sample = () => samples.push({
      nextTop: document.querySelector('#bentos').getBoundingClientRect().top + window.scrollY,
      playerHeight: document.querySelector('#project-player').getBoundingClientRect().height,
      scroll: window.scrollY,
    });
    sample();
    document.querySelector(selector).click();
    const start = performance.now();
    await new Promise(resolve => {
      const frame = now => {
        sample();
        if (now - start >= 1200) resolve();
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    return samples;
  }, selector);
}

function expectStableFlow(samples, baseline) {
  for (const key of ['nextTop', 'playerHeight', 'scroll']) {
    expect(Math.max(...samples.map(sample => Math.abs(sample[key] - baseline[key])))).toBeLessThanOrEqual(1);
  }
}

// Sample the actual CSS animation at two instants in one browser task. Pausing
// it avoids depending on how many frames a busy renderer can present.
async function samplePower(page, selector, animationName) {
  return page.evaluate(({ selector, animationName }) => {
    document.querySelector(selector).click();
    const player = document.querySelector('#project-player');
    const screen = document.querySelector('#tape-player-screen');
    const tube = player.querySelector('.tape-player__tube');
    const animation = screen.getAnimations().find(item => item.animationName === animationName);
    if (!animation) return { classes: player.className, animation: null };
    animation.pause();
    const clips = [70, 400].map(time => {
      animation.currentTime = time;
      return getComputedStyle(screen).clipPath;
    });
    const beam = getComputedStyle(tube, '::after').animationName;
    animation.play();
    return { classes: player.className, animation: animation.animationName, clips, beam };
  }, { selector, animationName });
}

test('power transitions collapse and restore the picture inside the stationary TV', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?lang=en');
  const player = page.locator('#project-player');
  const on = await samplePower(page, '.project-tape--kodlab', 'crt-power-on');
  expect(on.classes).toContain('is-powering-on');
  expect(on.animation).toBe('crt-power-on');
  expect(on.clips[0]).not.toBe(on.clips[1]);
  expect(on.beam).toBe('crt-beam-on');
  await expect(player).not.toHaveClass(/is-powering-on/);

  const off = await samplePower(page, '.tape-player__power', 'crt-power-off');
  expect(off.classes).toContain('is-powering-off');
  expect(off.animation).toBe('crt-power-off');
  expect(off.clips[0]).not.toBe(off.clips[1]);
  expect(off.beam).toBe('crt-beam-off');
  await expect(player).toHaveClass(/is-off/);
  await expect(player.locator('#tape-player-screen')).toHaveText('');

  const onFromButton = await samplePower(page, '.tape-player__power', 'crt-power-on');
  expect(onFromButton.animation).toBe('crt-power-on');
  expect(onFromButton.clips[0]).not.toBe(onFromButton.clips[1]);
  await expect(player).not.toHaveClass(/is-powering-on/);
  await expect(player.locator('.tape-static')).toBeVisible();
});

test('new selections and eject cancel power animations without a stale transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?lang=en');
  const player = page.locator('#project-player');
  const screen = page.locator('#tape-player-screen');
  const state = await page.evaluate(() => {
    const player = document.querySelector('#project-player');
    document.querySelector('.project-tape--kodlab').click();
    const started = player.classList.contains('is-powering-on');
    document.querySelector('.project-tape--agent').click();
    return { started, cancelled: !player.classList.contains('is-powering-on') };
  });
  expect(state).toEqual({ started: true, cancelled: true });
  await screen.locator('h3').waitFor({ state: 'visible' });
  await page.evaluate(() => {
    document.querySelector('.tape-player__power').click();
    document.querySelector('.project-tape--art').click();
  });
  await expect(player).not.toHaveClass(/is-powering-off/);
  await expect(screen).toHaveAttribute('data-project', 'art');
  await page.waitForTimeout(1000);
  await expect(player).not.toHaveClass(/is-off|is-powering-off|is-powering-on/);
  await expect(screen).toHaveAttribute('data-project', 'art');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await player.locator('.tape-player__power').evaluate(el => el.click());
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const eject = await page.evaluate(() => {
    const player = document.querySelector('#project-player');
    document.querySelector('.project-tape--kodlab').click();
    const started = player.classList.contains('is-powering-on');
    document.querySelector('.tape-player__close').click();
    return { started, cancelled: !player.classList.contains('is-powering-on') };
  });
  expect(eject).toEqual({ started: true, cancelled: true });
  await expect(player.locator('.tape-static')).toBeVisible();
  await expect(player).not.toHaveClass(/is-off|is-powering-on/);
});

test('reduced motion and tape pause finish power transitions immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  const player = page.locator('#project-player');
  const screen = page.locator('#tape-player-screen');
  await page.locator('.project-tape--kodlab').evaluate(el => el.click());
  await expect(player).not.toHaveClass(/is-powering-on/);
  await expect(screen).not.toHaveCSS('animation-name', 'crt-power-on');
  await player.locator('.tape-player__power').evaluate(el => el.click());
  await expect(player).toHaveClass(/is-off/);
  await expect(player).not.toHaveClass(/is-powering-off/);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('.project-tape--kodlab').evaluate(el => el.click());
  await expect(player).toHaveClass(/is-powering-on/);
  await page.locator('[data-tape-action="pause"]').evaluate(el => el.click());
  await expect(player).not.toHaveClass(/is-powering-on/);
  await player.locator('.tape-player__power').evaluate(el => el.click());
  await expect(player).toHaveClass(/is-off/);
  await expect(player).not.toHaveClass(/is-powering-off/);

  // Changing the preference while a transition is in flight must also settle it.
  await page.locator('[data-tape-action="pause"]').evaluate(el => el.click());
  await player.locator('.tape-player__power').evaluate(el => el.click());
  await expect(player).toHaveClass(/is-powering-on/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(player).not.toHaveClass(/is-powering-on/);
  await player.locator('.tape-player__power').evaluate(el => el.click());
  await expect(player).toHaveClass(/is-off/);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('.project-tape--kodlab').evaluate(el => el.click());
  await player.locator('.tape-player__power').evaluate(el => el.click());
  await expect(player).toHaveClass(/is-powering-off/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(player).toHaveClass(/is-off/);
  await expect(player).not.toHaveClass(/is-powering-off/);
});

for (const width of [1280, 375]) {
  test(`TV and following section stay in place through playback at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?lang=en');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#project-shelf').scrollIntoViewIfNeeded();
    const player = page.locator('#project-player');
    await expect(player).toBeVisible();
    await expect(player).toHaveClass(/is-off/);
    const opening = await recordChange(page, '.project-tape--kodlab');
    const baseline = opening[0];
    expectStableFlow(opening, baseline);
    await expect(player).not.toHaveClass(/is-off/);
    await expect(page.locator('#tape-player-screen')).toHaveAttribute('data-project', 'kodlab');
    expectStableFlow(await recordChange(page, '.project-tape--agent'), baseline);
    await expect(page.locator('#tape-player-screen')).toHaveAttribute('data-project', 'agent');
    expectStableFlow(await recordChange(page, '.tape-player__close'), baseline);
    await expect(player.locator('.tape-static')).toBeVisible();
    expectStableFlow(await recordChange(page, '.tape-player__power'), baseline);
    await expect(player).toBeVisible();
    await expect(player).toHaveClass(/is-off/);
    await expect(page.locator('.project-tape--agent')).toBeFocused();
  });
}

test('eject leaves the TV on with static and selecting a new cassette keeps its size', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.locator('.project-tape--kodlab').evaluate(el => el.click());
  await expect(page.locator('#project-player')).toBeVisible();
  await page.waitForTimeout(900);
  const before = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, scroll: window.scrollY }));
  await page.locator('.tape-player__close').evaluate(el => el.click());
  await expect(page.locator('.tape-static')).toBeVisible();
  await expect(page.locator('#project-player')).toBeVisible();
  await expect(page.locator('.project-tape--kodlab')).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(before.height);
  expect(Math.abs(await page.evaluate(() => window.scrollY) - before.scroll)).toBeLessThanOrEqual(1);
  await page.locator('.project-tape--art').evaluate(el => el.click());
  await expect(page.locator('#tape-player-cover .tape-cover--art')).toHaveCount(1);
  await expect(page.locator('#tape-player-cover .tape-cover--art')).toBeHidden();
  await expect(page.locator('.tape-static:not(.tape-static--tuning)')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(before.height);
});

test('tuning goes from snow to test card to snow, then the latest project', async ({ page }) => {
  await page.goto('/?lang=en');
  const screen = page.locator('#tape-player-screen');
  const setup = await page.evaluate(() => {
    const screen = document.querySelector('#tape-player-screen');
    const states = window.tuningStates = [];
    const sample = () => {
      const state = screen.querySelector('.tape-test-pattern--tuning') ? 'test card'
        : screen.querySelector('.tape-static--tuning') ? 'snow' : 'project';
      if (states.at(-1) !== state) states.push(state);
    };
    new MutationObserver(sample).observe(screen, { childList: true });
    const random = Math.random;
    Math.random = () => .5;
    document.querySelector('.project-tape--kodlab').click();
    Math.random = random;
    sample();
    return states[0];
  });
  expect(setup).toBe('snow');
  await expect(screen.locator('.tape-static--tuning')).toHaveCount(0, { timeout: 2000 });
  expect(await page.evaluate(() => window.tuningStates)).toEqual(['snow', 'test card', 'snow', 'project']);

  const snapshot = await page.evaluate(() => {
    window.tuningStates.length = 0;
    const random = Math.random;
    Math.random = () => .5;
    document.querySelector('.project-tape--art').click();
    document.querySelector('.project-tape--quantum').click();
    Math.random = random;
    return {
      snow: document.querySelectorAll('.tape-static--tuning').length,
      card: document.querySelectorAll('.tape-test-pattern--tuning').length,
    };
  });
  expect(snapshot).toEqual({ snow: 1, card: 0 });
  await expect(screen.locator('.tape-static--tuning')).toHaveCount(0, { timeout: 2000 });
  expect(await page.evaluate(() => window.tuningStates)).toEqual(['snow', 'test card', 'snow', 'project']);
  await expect(screen).toHaveAttribute('data-project', 'quantum');
  await expect(screen.locator('.card__body h3')).toBeVisible();
  await page.waitForTimeout(850);
  await expect(screen).toHaveAttribute('data-project', 'quantum');
  await expect(screen.locator('.tape-static--tuning, .tape-test-pattern--tuning')).toHaveCount(0);
});

test('reduced motion and pause skip tuning and hold static still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  const screen = page.locator('#tape-player-screen');
  const tuning = screen.locator('.tape-test-pattern--tuning');
  const eject = page.locator('.tape-player__close');
  const pause = page.locator('[data-tape-action="pause"]');
  const kodlab = page.locator('.project-tape--kodlab');
  await kodlab.evaluate(el => el.click());
  await expect(tuning).toHaveCount(0);
  await eject.evaluate(el => el.click());
  await expect(screen.locator('.tape-static')).toBeVisible();
  await expect(screen.locator('.tape-static__grain')).toHaveCSS('animation-name', 'none');
  expect(await screen.locator('.tape-static__grain').evaluate(el => getComputedStyle(el, '::before').animationName)).toBe('none');
  expect(await screen.locator('.tape-static__grain').evaluate(el => getComputedStyle(el, '::after').animationName)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await pause.evaluate(el => el.click());
  await expect(screen.locator('.tape-static__grain')).toHaveCSS('animation-play-state', 'paused');
  expect(await screen.locator('.tape-static__grain').evaluate(el => getComputedStyle(el, '::before').animationPlayState)).toBe('paused');
  expect(await screen.locator('.tape-static__grain').evaluate(el => getComputedStyle(el, '::after').animationPlayState)).toBe('paused');
  await kodlab.evaluate(el => el.click());
  await expect(tuning).toHaveCount(0);
  await eject.evaluate(el => el.click());
  await expect(screen.locator('.tape-static')).toBeVisible();
  await expect(screen.locator('.tape-static__grain')).toHaveCSS('animation-play-state', 'paused');
  expect(await screen.locator('.tape-static__grain').evaluate(el => getComputedStyle(el, '::before').animationPlayState)).toBe('paused');
});

test('off-air snow moves continuously on both layers', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.locator('.project-tape--kodlab').evaluate(el => el.click());
  await page.locator('.tape-player__screen').scrollIntoViewIfNeeded();
  await page.locator('.tape-player__close').evaluate(el => el.click());
  const grain = page.locator('.tape-static__grain');
  await expect(grain).toBeVisible();
  const before = await grain.evaluate(el => ({
    timing: getComputedStyle(el, '::after').animationTimingFunction,
    secondTiming: getComputedStyle(el, '::before').animationTimingFunction,
    first: getComputedStyle(el, '::after').transform,
    second: getComputedStyle(el, '::before').transform,
  }));
  expect(before.timing).toBe('linear');
  expect(before.secondTiming).toBe('linear');
  await page.waitForTimeout(100);
  const after = await grain.evaluate(el => ({
    first: getComputedStyle(el, '::after').transform,
    second: getComputedStyle(el, '::before').transform,
  }));
  expect(after.first).not.toBe(before.first);
  expect(after.second).not.toBe(before.second);
});

test('selecting another cassette interrupts power-off without a stale close', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.locator('.project-tape--kodlab').evaluate(el => el.click());
  await expect(page.locator('#project-player')).toBeVisible();
  await page.waitForTimeout(900);
  await page.locator('.tape-player__power').evaluate(el => el.click());
  await page.waitForTimeout(100);
  await page.locator('.project-tape--art').evaluate(el => el.click());
  await expect(page.locator('#tape-player-cover .tape-cover--art')).toHaveCount(1);
  await expect(page.locator('#tape-player-cover .tape-cover--art')).toBeHidden();
  await page.waitForTimeout(1000);
  await expect(page.locator('#project-player')).toBeVisible();
  await expect(page.locator('#tape-player-screen')).toHaveAttribute('data-project', 'art');
  await expect(page.locator('#art')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#project-player')).not.toHaveAttribute('inert', '');
});

test('reduced motion and a tape pause settle the player immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  const player = page.locator('#project-player');
  const tape = page.locator('.project-tape--kodlab');
  await tape.evaluate(el => el.click());
  await expect(player).toBeVisible();
  const openedHeight = await player.evaluate(el => el.getBoundingClientRect().height);
  await page.waitForTimeout(100);
  expect(await player.evaluate(el => el.getBoundingClientRect().height)).toBe(openedHeight);
  await page.locator('.tape-player__power').evaluate(el => el.click());
  await expect(player).toHaveClass(/is-off/);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const pause = page.locator('[data-tape-action="pause"]');
  await pause.evaluate(el => el.click());
  await tape.evaluate(el => el.click());
  await expect(player).toBeVisible();
  await page.locator('.tape-player__power').evaluate(el => el.click());
  await expect(player).toHaveClass(/is-off/);
  // Pausing during the exit must not leave a half-closed, inaccessible player.
  await pause.evaluate(el => el.click());
  await tape.evaluate(el => el.click());
  await page.waitForTimeout(900);
  await page.locator('.tape-player__power').evaluate(el => el.click());
  await page.waitForTimeout(80);
  await pause.evaluate(el => el.click());
  await expect(player).toHaveClass(/is-off/, { timeout: 2000 });
  await expect(tape).toBeFocused();
});
