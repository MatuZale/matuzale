/* An original VHS station ident, played only from the TV's TM key. */
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
  overlay.innerHTML = `<span class="tape-ident__announce"></span><div class="tape-ident__art" aria-hidden="true"><div class="tape-ident__masthead"><b>TM<span>.</span></b><small>VIDEO LIBRARY</small></div><div class="tape-ident__composition"><div class="tape-ident__sun"></div><div class="tape-ident__grid"></div><div class="tape-ident__bars"><i></i><i></i><i></i><i></i><i></i></div><div class="tape-ident__title"><span>T</span><span class="tape-ident__dash">−</span><span>120</span></div><div class="tape-ident__subtitle">HIGH GRADE / COLOUR</div></div><div class="tape-ident__details"><span>PERSONAL ARCHIVE</span><span>VHS · 01</span></div></div>`;
  tv.append(overlay);
  let timer = 0, observer = null;

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
    timer = 0;
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
    overlay.hidden = false;
    overlay.classList.add(still ? 'is-still' : 'is-running');
    observer = new MutationObserver(() => {
      if (player.hidden || player.classList.contains('is-ejecting') || player.classList.contains('is-changing')) stop();
    });
    observer.observe(player, { attributes: true, attributeFilter: ['class', 'hidden'] });
    timer = setTimeout(stop, still ? 2400 : 7600);
  }
  trigger.addEventListener('click', play);
  window.addEventListener('resize', () => { if (!overlay.hidden) place(); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  document.addEventListener('tape-pause-change', stop);
  motion.addEventListener('change', stop);
})();
