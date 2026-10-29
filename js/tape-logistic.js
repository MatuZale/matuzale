/* A monochrome, computed bifurcation diagram for the attractor tape. */
(() => {
  // Each column samples r in [2.5, 4] and records the long-term values of
  // x_(n+1) = r*x_n*(1-x_n), after discarding transients.
  function bifurcation(columns, rows) {
    const hits = Array.from({ length: rows }, () => new Uint16Array(columns));
    const samples = 4, burnIn = 240, keep = 160;
    for (let col = 0; col < columns; col++) {
      for (let sample = 0; sample < samples; sample++) {
        const r = 2.5 + 1.5 * (col + (sample + .5) / samples) / columns;
        let x = .501;
        for (let i = 0; i < burnIn + keep; i++) {
          x = r * x * (1 - x);
          if (i >= burnIn) {
            const row = Math.max(0, Math.min(rows - 1, Math.floor((1 - x) * rows)));
            hits[row][col]++;
          }
        }
      }
    }
    const ink = ' .:-=+*#%@';
    return hits.map(row => Array.from(row, count => {
      if (!count) return ' ';
      const level = Math.min(ink.length - 1, 1 + Math.floor(Math.log2(1 + count)));
      return ink[level];
    }).join('')).join('\n');
  }

  // Called only for the Attractors tape; the returned cleanup stops all observers.
  window.createTapeLogistic = view => {
    const panel = document.createElement('div');
    panel.className = 'tape-logistic';
    if (document.documentElement.classList.contains('is-tape-paused')) panel.classList.add('is-start-paused');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = '<div class="tape-logistic__header"><span class="tape-logistic__title"></span><span>ASCII / 01</span></div><div class="tape-logistic__scope"><span class="tape-logistic__axis" aria-hidden="true">x</span><pre class="tape-logistic__plot"></pre><span class="tape-logistic__sweep"></span></div><div class="tape-logistic__formula">xₙ₊₁ = r · xₙ · (1 − xₙ)</div><div class="tape-logistic__footer"><span>r 2.5</span><span>r 4.0</span></div>';
    const plot = panel.querySelector('.tape-logistic__plot');
    // Update the existing text node; the surrounding TV observes child-list mutations.
    const pixels = document.createTextNode('');
    plot.append(pixels);
    let last = '';
    function resize() {
      if (!panel.isConnected) return;
      const area = panel.querySelector('.tape-logistic__scope').getBoundingClientRect();
      const size = parseFloat(getComputedStyle(plot).fontSize) || 10;
      const columns = Math.max(32, Math.min(98, Math.floor((area.width - 16) / (size * .64))));
      const rows = Math.max(20, Math.min(38, Math.floor((area.height - 8) / (size * 1.15))));
      const dimensions = `${columns}x${rows}`;
      if (dimensions === last) return;
      last = dimensions;
      pixels.data = bifurcation(columns, rows);
    }
    function translate() {
      panel.querySelector('.tape-logistic__title').textContent = document.documentElement.lang === 'pl' ? 'MAPA LOGISTYCZNA' : 'LOGISTIC MAP';
    }
    translate();
    view.classList.add('is-logistic');
    view.append(panel);
    const observer = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    observer?.observe(panel.querySelector('.tape-logistic__scope'));
    let visible = true;
    const syncVisibility = () => panel.classList.toggle('is-suspended', document.hidden || !visible);
    const viewport = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncVisibility();
    }) : null;
    viewport?.observe(panel);
    const resumeFromStill = () => {
      if (!document.documentElement.classList.contains('is-tape-paused')) panel.classList.remove('is-start-paused');
    };
    document.addEventListener('channelchange', translate);
    document.addEventListener('visibilitychange', syncVisibility);
    document.addEventListener('tape-pause-change', resumeFromStill);
    window.addEventListener('resize', resize, { passive: true });
    const resizeFrame = requestAnimationFrame(resize);
    return () => {
      cancelAnimationFrame(resizeFrame);
      observer?.disconnect();
      viewport?.disconnect();
      document.removeEventListener('channelchange', translate);
      document.removeEventListener('visibilitychange', syncVisibility);
      document.removeEventListener('tape-pause-change', resumeFromStill);
      window.removeEventListener('resize', resize);
      view.classList.remove('is-logistic');
      panel.remove();
    };
  };
})();
