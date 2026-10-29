import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  // The VM gate allows 600 seconds for the entire matrix, including startup/reporting.
  globalTimeout: 570_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: 'test-results',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    serviceWorkers: 'block',
    locale: 'en-US',
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
    // No automatic screenshot flood; the suite saves only two technical comparisons.
    screenshot: 'off',
    trace: 'off',
    video: 'off',
  },
  projects: [
    // Functional touch profiles use DPR 1 within the 2-CPU software-rendered VM budget.
    // WebKit wide-view taps stall at DPR 3; full-resolution Chromium also leaves too
    // little time for the desktop matrix. Viewports/input/effects/assertions are unchanged.
    // Retina rendering and physical-device performance require separate checks.
    { name: 'webkit-iphone', testMatch: '**/deck-touch.spec.js', use: { ...devices['iPhone 13'], browserName: 'webkit', deviceScaleFactor: 1 } },
    { name: 'chromium-touch', testMatch: '**/deck-touch.spec.js', use: { ...devices['Pixel 7'], browserName: 'chromium', deviceScaleFactor: 1 } },
    { name: 'chromium-desktop', testMatch: ['**/deck-desktop.spec.js', '**/server.spec.js', '**/retro.spec.js', '**/easter-eggs.spec.js', '**/service-remote.spec.js', '**/footer-tape.spec.js', '**/global-pause.spec.js', '**/card-typography.spec.js', '**/project-tapes.spec.js', '**/theme-transition.spec.js', '**/about-matrix.spec.js', '**/tape-image-view.spec.js', '**/tape-player-motion.spec.js', '**/tape-shelf-3d.spec.js', '**/spacewar-tape.spec.js', '**/tape-tuning.spec.js', '**/tape-channel-osd.spec.js', '**/tape-ident-colors.spec.js', '**/attractor-warmup.spec.js', '**/tape-tv-performance.spec.js'], use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'webkit-desktop', testMatch: ['**/deck-desktop.spec.js', '**/retro.spec.js', '**/easter-eggs.spec.js', '**/service-remote.spec.js', '**/footer-tape.spec.js', '**/global-pause.spec.js', '**/card-typography.spec.js', '**/project-tapes.spec.js', '**/theme-transition.spec.js', '**/about-matrix.spec.js', '**/tape-image-view.spec.js', '**/tape-player-motion.spec.js', '**/tape-shelf-3d.spec.js', '**/spacewar-tape.spec.js', '**/tape-tuning.spec.js', '**/tape-channel-osd.spec.js', '**/tape-ident-colors.spec.js', '**/attractor-warmup.spec.js', '**/tape-tv-performance.spec.js'], use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: 'node tests/server.js',
    url: 'http://127.0.0.1:4173/cards.html',
    reuseExistingServer: false,
    timeout: 20_000,
  },
});
