/* One chance per page visit: a one-in-a-million visitor sees the terminal receive a message. */
(() => {
  const terminal = document.querySelector('.about-terminal');
  const horizon = document.querySelector('.horizon');
  const sun = horizon?.querySelector('.horizon__sun');
  if (!terminal || !horizon) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const display = document.createElement('div');
  display.className = 'about-matrix';
  display.setAttribute('aria-hidden', 'true');
  display.hidden = true;
  const text = document.createElement('span');
  text.className = 'about-matrix__text';
  const cursor = document.createElement('span');
  cursor.className = 'about-matrix__cursor';
  display.append(text, cursor);
  terminal.append(display);
  let visible = false, rolled = false, timer = 0, active = false, count = 0, wait = 0, message = '';
  const paused = () => root.classList.contains('is-tape-paused');
  const horizonBusy = () => horizon.classList.contains('is-night') || horizon.classList.contains('is-tape-sun') ||
    Boolean(sun?.getAnimations().some(a => a.playState === 'running' &&
      !(typeof CSSAnimation !== 'undefined' && a instanceof CSSAnimation) &&
      !(typeof CSSTransition !== 'undefined' && a instanceof CSSTransition)));
  function stop() {
    clearTimeout(timer);
    timer = 0;
    active = false;
    display.hidden = true;
    terminal.classList.remove('is-matrix');
    text.textContent = '';
  }
  function tick() {
    timer = 0;
    if (!active || document.hidden || !visible || motion.matches || horizonBusy()) { stop(); return; }
    if (paused()) return;
    if (count < message.length) text.textContent = message.slice(0, ++count);
    else if (++wait >= 40) { stop(); return; }
    timer = setTimeout(tick, 75);
  }
  function start() {
    if (active || !visible || document.hidden || motion.matches || paused() || horizonBusy() || root.classList.contains('is-binary')) return false;
    message = root.lang === 'pl'
      ? '… Podążaj za białym królikiem.'
      : '… Follow the white rabbit.';
    count = wait = 0;
    active = true;
    text.textContent = '';
    terminal.classList.add('is-matrix');
    display.hidden = false;
    tick();
    return true;
  }
  // Exposed like horizon.nightfall(), for deterministic local checks without changing the odds.
  terminal.matrix = start;
  function maybeRoll() {
    if (rolled || !visible || document.hidden || motion.matches || paused() || horizonBusy() || root.classList.contains('is-binary')) return;
    rolled = true;
    if (Math.random() < 1 / 1_000_000) start();
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible && active) stop();
      if (visible) maybeRoll();
    }, { threshold: .25 }).observe(terminal);
  } else {
    // With no visibility observer we cannot tell when the terminal is in view.
    visible = false;
  }
  new MutationObserver(() => {
    if (active && horizonBusy()) stop();
    else if (!active) maybeRoll();
  }).observe(horizon, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('tape-pause-change', () => {
    if (active) {
      clearTimeout(timer);
      timer = 0;
      if (!paused()) tick();
    } else maybeRoll();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && active) stop(); else maybeRoll(); });
  document.addEventListener('channelchange', () => { if (active) stop(); });
  motion.addEventListener('change', () => { if (motion.matches && active) stop(); else maybeRoll(); });
})();
