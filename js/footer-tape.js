// The cassette follows the page like a tape. Seeking is a normal scroll, and pause is an
// optical still-frame effect: it never freezes the document or intercepts its controls.
import { counter, osd, osdSub } from './retro.js';

const tape = document.querySelector('.footer-tape');
const controls = document.querySelector('.footer-tape__transport');
if (tape && controls) {
  const pause = controls.querySelector('[data-tape-action="pause"]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false, seeking = null, seekTimer, holdTimer, holdInterval, held = false;
  let frame = 0;

  const still = document.createElement('div');
  still.className = 'tape-still';
  still.setAttribute('aria-hidden', 'true');
  still.innerHTML = '<i class="tape-still__tracking"></i><i class="tape-still__noise"></i>';
  document.body.append(still);

  const tracking = document.createElement('div');
  tracking.className = 'footer-tape-seek';
  tracking.setAttribute('aria-hidden', 'true');
  tracking.innerHTML = '<i class="tape-transport__band"></i><i class="tape-transport__band tape-transport__band--second"></i><i class="tape-transport__band tape-transport__band--major"></i>';
  document.body.append(tracking);

  function labels() {
    const pl = document.documentElement.lang === 'pl';
    const label = paused ? (pl ? 'Wznów odtwarzanie taśmy' : 'Resume tape playback') : (pl ? 'Zatrzymaj odtwarzanie taśmy' : 'Pause tape playback');
    pause.setAttribute('aria-label', label);
    pause.title = label;
    pause.setAttribute('aria-pressed', String(paused));
  }
  function state() {
    tape.classList.toggle('is-paused', paused);
    controls.classList.toggle('is-paused', paused);
    tape.classList.toggle('is-playing', !paused && !seeking);
    tape.classList.toggle('is-rewinding', seeking === 'back');
    tape.classList.toggle('is-forwarding', seeking === 'forward');
    still.classList.toggle('is-on', paused);
    labels();
  }
  function position() {
    frame = 0;
    const length = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const progress = Math.max(0, Math.min(1, scrollY / length));
    tape.style.setProperty('--tape-progress', progress.toFixed(4));
    if (!paused || seeking) tape.style.setProperty('--tape-turn', `${(progress * 1440).toFixed(2)}deg`);
    if (seeking) osdSub(counter());
  }
  function updatePosition() { if (!frame) frame = requestAnimationFrame(position); }
  function finishSeek() {
    clearTimeout(seekTimer);
    if (!seeking) return;
    seeking = null;
    tracking.classList.remove('is-on');
    state();
    osd(paused ? 'Ⅱ PAUSE' : '▶ PLAY', counter(), 1300);
    updatePosition();
  }
  function seek(direction, distance, smooth = false) {
    seeking = direction;
    tracking.dataset.direction = direction;
    tracking.classList.toggle('is-on', !motion.matches);
    state();
    osd(direction === 'back' ? '◀◀ REW' : 'FF ▶▶', counter(), 1500);
    window.scrollBy({ top: direction === 'back' ? -distance : distance, behavior: smooth && !motion.matches ? 'smooth' : 'instant' });
    clearTimeout(seekTimer);
    seekTimer = setTimeout(finishSeek, 700);
    updatePosition();
  }
  function stopHold() {
    clearTimeout(holdTimer);
    clearInterval(holdInterval);
    holdTimer = holdInterval = undefined;
  }
  for (const [action, direction] of [['rewind', 'back'], ['forward', 'forward']]) {
    const button = controls.querySelector(`[data-tape-action="${action}"]`);
    if (!button) continue;
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      held = false;
      stopHold();
      holdTimer = setTimeout(() => {
        held = true;
        seek(direction, innerHeight * .13);
        holdInterval = setInterval(() => seek(direction, innerHeight * .13), 90);
      }, 350);
    });
    button.addEventListener('click', event => {
      if (held && event.detail !== 0) { held = false; return; }
      seek(direction, innerHeight * .85, true);
    });
  }
  window.addEventListener('pointerup', stopHold);
  window.addEventListener('pointercancel', stopHold);
  window.addEventListener('blur', stopHold);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopHold(); finishSeek(); }
    else updatePosition();
  });
  motion.addEventListener('change', () => { if (motion.matches) tracking.classList.remove('is-on'); });
  window.addEventListener('scroll', () => {
    updatePosition();
    if (seeking && !holdInterval) { clearTimeout(seekTimer); seekTimer = setTimeout(finishSeek, 700); }
  }, { passive: true });
  window.addEventListener('resize', updatePosition, { passive: true });
  document.addEventListener('channelchange', labels);
  function togglePause() {
    stopHold();
    if (seeking) finishSeek();
    paused = !paused;
    state();
    document.documentElement.classList.toggle('is-tape-paused', paused);
    document.dispatchEvent(new CustomEvent('tape-pause-change', { detail: { paused } }));
    osd(paused ? 'Ⅱ PAUSE' : '▶ PLAY', counter(), 1500);
    if (!paused) updatePosition();
  }
  pause?.addEventListener('click', togglePause);
  state();
  updatePosition();
}
