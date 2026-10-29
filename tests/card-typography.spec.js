import { test, expect } from '@playwright/test';

for (const entry of ['cards', 'home']) for (const width of [1280, 390]) {
  test(`${entry} card typography stays legible and complete at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(entry === 'cards' ? '/cards.html' : '/');
    if (entry === 'home') await page.locator('[data-deck-open]').click();
    await expect(page.locator('.deck[open] .tcard')).toHaveCount(20);
    const audit = await page.evaluate(async () => {
      const faces = ['400 16px "STIX Two Math"', 'italic 400 16px "STIX Two Text"', '700 16px "Deck Sans"'];
      const loaded = await Promise.all(faces.map(async face => {
        const fonts = await document.fonts.load(face, 'xẋ ż σ ρ β √ ± − ∞');
        return fonts.length > 0 && fonts.every(font => font.status === 'loaded');
      }));
      await document.fonts.ready;
      const clipped = [...document.querySelectorAll('.tcard__eq, .tcard__name')]
        .filter(el => el.scrollWidth > el.clientWidth + 1)
        .map(el => `${el.closest('.tcard').className}: ${el.textContent.trim()}`);
      return { loaded, clipped, titleFont: getComputedStyle(document.querySelector('.tcard__name')).fontFamily };
    });
    expect(audit.loaded).toEqual([true, true, true]);
    expect(audit.titleFont).toContain('Deck Sans');
    expect(audit.clipped).toEqual([]);
  });
}
