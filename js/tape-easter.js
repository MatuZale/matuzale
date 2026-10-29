/* An original station ident: five ribbons bend into the T-120 mark. */
(() => {
  const player = document.querySelector('#project-player');
  const screen = document.querySelector('#tape-player-screen');
  const tv = player?.querySelector('.tape-player__tv');
  const trigger = player?.querySelector('.tape-player__secret');
  if (!player || !screen || !tv || !trigger) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const overlay = document.createElement('div');
  overlay.className = 'tape-ident';
  overlay.hidden = true;
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.innerHTML = `<span class="tape-ident__announce"></span><div class="tape-ident__art" aria-hidden="true"><svg class="tape-ident__svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet"><g class="tape-ident__ribbons" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="#d94f60" pathLength="1"/><path stroke="#ed894b" pathLength="1"/><path stroke="#e4ba52" pathLength="1"/><path stroke="#59a786" pathLength="1"/><path stroke="#587eae" pathLength="1"/></g></svg><div class="tape-ident__masthead"><span>TM<span class="tape-ident__dot">.</span></span><small>VIDEO LIBRARY</small></div><div class="tape-ident__details"><span>CHROMA / VIDEO SIGNAL</span><span>VHS · HIGH GRADE</span></div></div>`;
  tv.append(overlay);
  const paths = [...overlay.querySelectorAll('.tape-ident__ribbons path')];
  let timer = 0, frame = 0, observer = null;

  const line = (ax, ay, bx, by) => [ax + (bx - ax) / 3, ay + (by - ay) / 3, ax + 2 * (bx - ax) / 3, ay + 2 * (by - ay) / 3, bx, by];
  // Four cubic segments per symbol, so each uninterrupted ribbon has a real geometric destination.
  const targets = [
    [80, 225, ...line(80,225,200,225), ...line(200,225,140,225), ...line(140,225,140,375), ...line(140,375,140,375)],
    [225,300, ...line(225,300,242,300), ...line(242,300,259,300), ...line(259,300,276,300), ...line(276,300,293,300)],
    [318,250, ...line(318,250,352,225), ...line(352,225,352,375), ...line(352,375,320,375), ...line(320,375,385,375)],
    [432,254, 440,214,516,210,526,254, 532,283,451,341,430,375, ...line(430,375,532,375), ...line(532,375,532,375)],
    [624,225, 658,225,685,258,685,300, 685,342,658,375,624,375, 590,375,563,342,563,300, 563,258,590,225,624,225]
  ];
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => { n = clamp(n); return n * n * (3 - 2 * n); };
  function ribbon(index, time) {
    const y = 245 + index * 25;
    const wave = x => y + Math.sin(x / 165 - time * 1.15 + index * .07) * 30;
    const xs = [-100, 150, 400, 650, 900];
    const points = [xs[0], wave(xs[0])];
    for (let i = 0; i < 4; i++) {
      const from = xs[i], to = xs[i + 1], x1 = from + (to - from) / 3, x2 = from + 2 * (to - from) / 3;
      points.push(x1, wave(x1), x2, wave(x2), to, wave(to));
    }
    return points;
  }
  function draw(time, still = false) {
    const morph = still ? 1 : ease((time - 2.2) / 2);
    paths.forEach((path, i) => {
      const start = ribbon(i, time), target = targets[i];
      const p = start.map((n, j) => n + (target[j] - n) * morph);
      let d = `M ${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
      for (let j = 2; j < p.length; j += 6) d += ` C ${p.slice(j, j + 6).map(n => n.toFixed(1)).join(' ')}`;
      path.setAttribute('d', d);
      path.style.strokeDashoffset = still ? '0' : String(1 - ease((time - i * .13) / 1.5));
      path.style.strokeWidth = String(23 - morph * 3);
    });
  }
  function place() {
    const tube = screen.getBoundingClientRect();
    const frameRect = tv.getBoundingClientRect();
    overlay.style.left = `${tube.left - frameRect.left}px`;
    overlay.style.top = `${tube.top - frameRect.top}px`;
    overlay.style.width = `${tube.width}px`;
    overlay.style.height = `${tube.height}px`;
  }
  function stop() {
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    timer = frame = 0;
    if (overlay.hidden) return;
    overlay.hidden = true;
    overlay.classList.remove('is-running', 'is-still');
    screen.inert = false;
    observer?.disconnect();
    observer = null;
  }
  function play() {
    if (player.hidden) return;
    stop();
    if (screen.contains(document.activeElement)) trigger.focus({ preventScroll: true });
    const still = motion.matches || document.documentElement.classList.contains('is-tape-paused');
    place();
    screen.inert = true;
    overlay.querySelector('.tape-ident__announce').textContent = trigger.title;
    draw(0, still);
    overlay.hidden = false;
    overlay.classList.add(still ? 'is-still' : 'is-running');
    observer = new MutationObserver(() => {
      if (player.hidden || player.classList.contains('is-ejecting') || player.classList.contains('is-changing')) stop();
    });
    observer.observe(player, { attributes: true, attributeFilter: ['class', 'hidden'] });
    if (!still) {
      const startTime = performance.now();
      const tick = now => {
        if (overlay.hidden) return;
        const elapsed = (now - startTime) / 1000;
        draw(elapsed);
        // Once all five ribbons reach the final mark, the CSS fade is the only remaining motion.
        frame = elapsed < 4.2 ? requestAnimationFrame(tick) : 0;
      };
      frame = requestAnimationFrame(tick);
    }
    timer = setTimeout(stop, still ? 2400 : 7600);
  }
  trigger.addEventListener('click', play);
  window.addEventListener('resize', () => { if (!overlay.hidden) place(); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  document.addEventListener('tape-pause-change', stop);
  motion.addEventListener('change', stop);
})();
