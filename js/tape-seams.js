/* A character wave between chapters. Its phase follows scroll position; a nearby
   pointer bends it locally. There is no animation loop and no text in the DOM. */
(() => {
  const seams = [...document.querySelectorAll('.tape-seam')].map((el, index) => ({
    el, canvas: el.querySelector('canvas'), index, visible: false, pointer: null,
    width: 0, height: 0, scale: 0,
  })).filter(item => item.canvas && item.canvas.getContext('2d'));
  if (!seams.length) return;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const scheme = matchMedia('(prefers-color-scheme: dark)');
  const glyphs = ' .:-=+*#%@';
  let frame = 0, pointer = null;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function draw(item) {
    const rect = item.el.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.bottom < -100 || rect.top > innerHeight + 100) return;
    // The page can move under a still pointer, so recompute its local coordinates on scroll too.
    const inside = pointer && !motion.matches && fine.matches && pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom;
    item.pointer = inside ? { x: (pointer.x - rect.left) / rect.width, y: (pointer.y - rect.top) / rect.height } : null;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const width = Math.round(rect.width), height = Math.round(rect.height);
    const ctx = item.canvas.getContext('2d');
    if (item.width !== width || item.height !== height || item.scale !== dpr) {
      item.canvas.width = Math.round(width * dpr);
      item.canvas.height = Math.round(height * dpr);
      item.width = width; item.height = height; item.scale = dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const style = getComputedStyle(document.documentElement);
    const violet = style.getPropertyValue('--accent-2').trim();
    const cyan = style.getPropertyValue('--accent-3').trim();
    const progress = clamp((innerHeight - rect.top) / (innerHeight + height), 0, 1);
    const phase = (motion.matches ? .5 : progress) * Math.PI * 4 + item.index * 1.2;
    const cols = Math.min(150, Math.max(30, Math.floor(width / 8)));
    const rows = Math.max(8, Math.floor(height / 12));
    const cellW = width / cols, cellH = height / rows;
    ctx.font = `500 ${Math.min(11, cellH * .88)}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const px = item.pointer?.x ?? -2;
    const py = item.pointer?.y ?? .5;
    for (let x = 0; x < cols; x++) {
      const u = (x + .5) / cols;
      const bend = item.pointer ? .32 * (.5 - py) * Math.exp(-Math.pow((u - px) / .11, 2)) : 0;
      const first = .5 + .19 * Math.sin(u * 8.5 + phase) + .055 * Math.sin(u * 19 - phase * .7) + bend;
      const second = .5 - .17 * Math.sin(u * 8.5 + phase * .83) + .045 * Math.cos(u * 23 + phase * .6) - bend;
      const envelope = .55 + .45 * Math.pow(Math.sin(u * Math.PI), 2);
      for (let y = 0; y < rows; y++) {
        const v = (y + .5) / rows;
        const a = Math.exp(-Math.pow((v - first) / .105, 2));
        const b = Math.exp(-Math.pow((v - second) / .105, 2));
        const glow = item.pointer ? .28 * Math.exp(-Math.pow((u - px) / .09, 2) - Math.pow((v - py) / .22, 2)) : 0;
        const value = clamp((a * .78 + b * .65) * envelope + glow, 0, 1);
        const glyph = glyphs[Math.round(value * (glyphs.length - 1))];
        if (glyph === ' ') continue;
        ctx.fillStyle = a >= b ? violet : cyan;
        ctx.globalAlpha = .23 + value * .57;
        ctx.fillText(glyph, (x + .5) * cellW, (y + .5) * cellH);
      }
    }
    ctx.globalAlpha = 1;
  }

  function paint() {
    frame = 0;
    if (document.hidden) return;
    seams.forEach(item => { if (item.visible) draw(item); });
  }
  function schedule() { if (!frame && !document.hidden) frame = requestAnimationFrame(paint); }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const item = seams.find(seam => seam.el === entry.target);
        item.visible = entry.isIntersecting;
        if (!item.visible) item.pointer = null;
      }
      schedule();
    }, { rootMargin: '100px 0px' });
    seams.forEach(item => observer.observe(item.el));
  } else {
    seams.forEach(item => { item.visible = true; });
    schedule();
  }

  addEventListener('scroll', () => { if (!motion.matches) schedule(); }, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('pointermove', event => {
    if (motion.matches || !fine.matches || event.pointerType === 'touch') return;
    pointer = { x: event.clientX, y: event.clientY };
    for (const item of seams) {
      if (!item.visible) continue;
      const rect = item.el.getBoundingClientRect();
      const inside = pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom;
      if (inside) item.pointer = { x: (pointer.x - rect.left) / rect.width, y: (pointer.y - rect.top) / rect.height };
      else if (item.pointer) item.pointer = null;
      else continue;
      schedule();
    }
  }, { passive: true });
  addEventListener('blur', () => { pointer = null; seams.forEach(item => { item.pointer = null; }); schedule(); });
  motion.addEventListener('change', () => { pointer = null; seams.forEach(item => { item.pointer = null; }); schedule(); });
  scheme.addEventListener('change', schedule);
  document.addEventListener('visibilitychange', schedule);
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
