/* A character wave between chapters. Time moves it gently; a nearby pointer
   bends it. Only visible seams animate, and reduced motion stays still. */
(() => {
  const seams = [...document.querySelectorAll('.tape-seam')].map((el, index) => ({
    el, canvas: el.querySelector('canvas'), index, visible: false, pointer: null,
    influence: { x: .5, y: .5, strength: 0 },
    transition: el.classList.contains('tape-seam--to-bentos') ? 'to' : el.classList.contains('tape-seam--from-bentos') ? 'from' : null,
    width: 0, height: 0, scale: 0,
  })).filter(item => item.canvas && item.canvas.getContext('2d'));
  if (!seams.length) return;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const scheme = matchMedia('(prefers-color-scheme: dark)');
  const glyphs = ' .:-=+*#%@';
  let frame = 0, pointer = null, elapsed = 0, lastTime = 0, lastPaint = 0;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const paused = () => document.hidden || document.documentElement.classList.contains('deck-open') || document.documentElement.classList.contains('is-tape-paused');

  function draw(item) {
    const rect = item.el.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.bottom < -100 || rect.top > innerHeight + 100) return;
    // The page can move under a still pointer, so recompute its local coordinates on scroll too.
    const inside = pointer && !motion.matches && fine.matches && pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom;
    item.pointer = inside ? { x: (pointer.x - rect.left) / rect.width, y: (pointer.y - rect.top) / rect.height } : null;
    const influence = item.influence;
    const target = item.pointer;
    if (motion.matches) influence.strength = 0;
    else {
      influence.x += ((target?.x ?? influence.x) - influence.x) * .18;
      influence.y += ((target?.y ?? influence.y) - influence.y) * .18;
      influence.strength += ((target ? 1 : 0) - influence.strength) * .16;
    }
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
    const phase = item.index * 1.2 + (motion.matches ? 0 : elapsed * .00035);
    const bendAt = u => influence.strength * .055 * (1 + .4 * (.5 - influence.y)) * Math.exp(-Math.pow((u - influence.x) / .16, 2));
    const surface = u => .5 + .15 * Math.sin(u * 6.5 + phase) + .045 * Math.sin(u * 15 - phase * .7) + bendAt(u);
    if (item.transition) {
      // The wave itself is the boundary between the current theme and BENTOS blue.
      // The top and bottom edges are solid so neighbouring sections join exactly.
      const page = style.getPropertyValue('--bg').trim();
      const sea = '#00093d';
      ctx.globalAlpha = 1;
      ctx.fillStyle = item.transition === 'to' ? page : sea;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = item.transition === 'to' ? sea : page;
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, surface(0) * height);
      for (let x = 1; x <= 100; x++) ctx.lineTo(width * x / 100, surface(x / 100) * height);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Feather the changing boundary locally, following the same surface as the
      // characters. The solid colours at the edges still meet the sections exactly.
      const top = item.transition === 'to' ? page : sea;
      const bottom = item.transition === 'to' ? sea : page;
      const feather = Math.min(30, height * .12);
      const strips = Math.min(180, Math.max(40, Math.ceil(width / 8)));
      for (let x = 0; x < strips; x++) {
        const left = x * width / strips;
        const middle = (x + .5) / strips;
        const edge = surface(middle) * height;
        const blend = ctx.createLinearGradient(0, edge - feather, 0, edge + feather);
        blend.addColorStop(0, top);
        blend.addColorStop(1, bottom);
        ctx.fillStyle = blend;
        ctx.fillRect(left, edge - feather, width / strips + .5, feather * 2);
      }
    }
    const cols = Math.min(150, Math.max(30, Math.floor(width / 8)));
    const rows = Math.max(8, Math.floor(height / 12));
    const cellW = width / cols, cellH = height / rows;
    ctx.font = `500 ${Math.min(11, cellH * .88)}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const px = influence.x;
    const py = influence.y;
    for (let x = 0; x < cols; x++) {
      const u = (x + .5) / cols;
      const bend = bendAt(u);
      const first = item.transition ? surface(u) : .5 + .19 * Math.sin(u * 8.5 + phase) + .055 * Math.sin(u * 19 - phase * .7) + bend;
      const second = item.transition ? surface(u) + .09 * Math.sin(u * 11 - phase) : .5 - .17 * Math.sin(u * 8.5 + phase * .83) + .045 * Math.cos(u * 23 + phase * .6) + bend;
      const envelope = .55 + .45 * Math.pow(Math.sin(u * Math.PI), 2);
      for (let y = 0; y < rows; y++) {
        const v = (y + .5) / rows;
        const a = Math.exp(-Math.pow((v - first) / .105, 2));
        const b = Math.exp(-Math.pow((v - second) / .105, 2));
        const glow = influence.strength * .16 * Math.exp(-Math.pow((u - px) / .14, 2) - Math.pow((v - py) / .3, 2));
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

  function paint(time) {
    frame = 0;
    if (paused()) { lastTime = 0; return; }
    if (!motion.matches && lastTime) elapsed += Math.min(time - lastTime, 80);
    lastTime = time;
    if (!motion.matches && lastPaint && time - lastPaint < 55) { if (seams.some(item => item.visible)) schedule(); return; }
    lastPaint = time;
    seams.forEach(item => { if (item.visible) draw(item); });
    if (!motion.matches && seams.some(item => item.visible)) schedule();
  }
  function schedule() { if (!frame && !paused()) frame = requestAnimationFrame(paint); }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const item = seams.find(seam => seam.el === entry.target);
        item.visible = entry.isIntersecting;
        if (!item.visible) { item.pointer = null; item.influence.strength = 0; }
      }
      schedule();
    }, { rootMargin: '100px 0px' });
    seams.forEach(item => observer.observe(item.el));
  } else {
    seams.forEach(item => { item.visible = true; });
    schedule();
  }

  // A stationary mouse should not disturb every wave that scrolls underneath it.
  addEventListener('scroll', () => { pointer = null; if (!motion.matches) schedule(); }, { passive: true });
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
  motion.addEventListener('change', () => { pointer = null; lastTime = 0; lastPaint = 0; seams.forEach(item => { item.pointer = null; }); schedule(); });
  scheme.addEventListener('change', schedule);
  document.addEventListener('visibilitychange', () => { lastTime = 0; lastPaint = 0; schedule(); });
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
})();
