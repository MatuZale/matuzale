/* A little tracking noise, only while the TV is on screen and tape time is running. */
(() => {
  const player = document.querySelector('#project-player');
  const screen = document.querySelector('#tape-player-screen');
  if (!player || !screen) return;
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const effect = document.createElement('div');
  effect.className = 'tape-interference';
  effect.setAttribute('aria-hidden', 'true');
  screen.append(effect);
  let visible = false, next = 0, end = 0;

  const allowed = () => visible && !player.hidden && !document.hidden && !motion.matches &&
    !root.classList.contains('is-tape-paused') && !root.classList.contains('deck-open') &&
    !player.classList.contains('is-ejecting') && !player.classList.contains('is-off') && !screen.inert;

  function clear() {
    clearTimeout(next);
    clearTimeout(end);
    next = end = 0;
    effect.classList.remove('is-tracking');
  }

  function schedule() {
    clear();
    if (allowed()) next = setTimeout(showInterference, 45000 + Math.random() * 55000);
  }

  function showInterference() {
    next = 0;
    if (!allowed()) return;
    effect.classList.add('is-tracking');
    end = setTimeout(schedule, 1400);
  }

  // Don't keep a timer alive while the user is away from the television.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      // The CRT's continuous tracking line shares this visibility lifecycle.
      player.classList.toggle('is-tv-offscreen', !visible);
      schedule();
    }, { threshold: .2 }).observe(screen);
  } else {
    visible = true;
  }
  new MutationObserver(schedule).observe(player, { attributes: true, attributeFilter: ['hidden', 'class'] });
  new MutationObserver(() => {
    // The player moves a new card body into the tube on every selection.
    if (!screen.contains(effect)) screen.append(effect);
    schedule();
  }).observe(screen, { attributes: true, attributeFilter: ['inert'], childList: true });
  new MutationObserver(schedule).observe(root, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', schedule);
  document.addEventListener('tape-pause-change', schedule);
  motion.addEventListener('change', schedule);
  schedule();
})();
