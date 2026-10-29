/* A moving light on the attractor print. Event delegation also covers newly selected tapes. */
(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const precise = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const properties = ['--print-tilt-x', '--print-tilt-y', '--print-light-x', '--print-light-y', '--print-foil-x', '--print-foil-y', '--print-foil-angle', '--print-stars-x', '--print-stars-y'];
  let active = null, raf = 0, pointerX = 0, pointerY = 0;

  function reset() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (!active) return;
    active.classList.remove('is-print-holo-active');
    properties.forEach(property => active.style.removeProperty(property));
    active = null;
  }

  // Measure the untransformed layout box so tilting does not chase the pointer.
  function layoutBox(print) {
    const parent = print.offsetParent;
    if (!parent) return print.getBoundingClientRect();
    const base = parent.getBoundingClientRect();
    const left = base.left + print.offsetLeft;
    const top = base.top + print.offsetTop;
    return { left, top, right: left + print.offsetWidth, bottom: top + print.offsetHeight, width: print.offsetWidth, height: print.offsetHeight };
  }

  function paint() {
    raf = 0;
    if (!active?.isConnected || document.hidden || motion.matches || !precise.matches) { reset(); return; }
    const rect = layoutBox(active);
    if (!rect.width || !rect.height || pointerX < rect.left || pointerX > rect.right || pointerY < rect.top || pointerY > rect.bottom) { reset(); return; }
    const x = Math.max(0, Math.min(1, (pointerX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (pointerY - rect.top) / rect.height));
    active.style.setProperty('--print-tilt-x', `${((.5 - y) * 12).toFixed(2)}deg`);
    active.style.setProperty('--print-tilt-y', `${((x - .5) * 12).toFixed(2)}deg`);
    active.style.setProperty('--print-light-x', `${(x * 100).toFixed(1)}%`);
    active.style.setProperty('--print-light-y', `${(y * 100).toFixed(1)}%`);
    active.style.setProperty('--print-foil-x', `${(100 - x * 100).toFixed(1)}%`);
    active.style.setProperty('--print-foil-y', `${(100 - y * 100).toFixed(1)}%`);
    active.style.setProperty('--print-foil-angle', `${(122 + (x - .5) * 36 - (y - .5) * 18).toFixed(1)}deg`);
    active.style.setProperty('--print-stars-x', `${((x - .5) * -3).toFixed(1)}px`);
    active.style.setProperty('--print-stars-y', `${((y - .5) * -3).toFixed(1)}px`);
  }

  function track(event) {
    if (event.pointerType === 'touch' || motion.matches || !precise.matches || document.hidden) { reset(); return; }
    let print = event.target.closest?.('.tape-art-preview--art');
    if (!print && active?.isConnected) {
      const rect = layoutBox(active);
      if (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) print = active;
    }
    if (!print) { reset(); return; }
    if (print !== active) { reset(); active = print; active.classList.add('is-print-holo-active'); }
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!raf) raf = requestAnimationFrame(paint);
  }

  document.addEventListener('pointerover', track, { passive: true });
  document.addEventListener('pointermove', track, { passive: true });
  document.addEventListener('pointerout', event => {
    if (!active || active.contains(event.relatedTarget)) return;
    const rect = layoutBox(active);
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) reset();
  }, { passive: true });
  document.addEventListener('pointercancel', reset, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  window.addEventListener('blur', reset);
  window.addEventListener('resize', reset, { passive: true });
  window.addEventListener('scroll', reset, { passive: true, capture: true });
  motion.addEventListener('change', reset);
  precise.addEventListener('change', reset);
})();
