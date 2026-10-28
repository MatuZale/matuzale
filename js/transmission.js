// A small signal hidden in the footer; the game keeps running independently.
(() => {
  const button = document.getElementById('footer-signal');
  const board = document.getElementById('footer-game');
  const message = document.getElementById('signal-message');
  if (!button || !board || !message) return;
  let knocks = 0, timer;
  // Channel changes own the label, including its encoded binary state.
  document.addEventListener('channelchange', () => {
    knocks = 0;
    clearTimeout(timer);
    board.querySelector('.signal-attractor')?.remove();
    board.closest('figure').classList.remove('is-searching');
    message.textContent = '';
  });
  button.addEventListener('click', () => {
    if (++knocks < 3) return;
    knocks = 0;
    clearTimeout(timer);
    board.querySelector('.signal-attractor')?.remove();
    const figure = board.closest('figure');
    const polish = document.documentElement.lang.toLowerCase().startsWith('pl');
    const signal = button.querySelector('[data-i18n]');
    if (!document.documentElement.classList.contains('is-binary'))
      signal.textContent = polish ? 'Sygnał: szukanie…' : 'Signal: searching…';
    message.textContent = polish ? 'Dziwny atraktor pojawił się w układzie.' : 'A strange attractor has entered the circuit.';
    const resetSignal = () => {
      const pl = document.documentElement.lang.toLowerCase().startsWith('pl');
      if (!document.documentElement.classList.contains('is-binary'))
        signal.textContent = pl ? 'Sygnał: stabilny' : 'Signal: stable';
      message.textContent = '';
    };
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      figure.classList.add('is-searching');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.classList.add('signal-attractor');
      let x = .1, y = .1, d = '';
      for (let i = 0; i < 700; i++) {
        const nextX = Math.sin(-1.4 * y) + 1.8 * Math.cos(-1.4 * x);
        y = Math.sin(1.6 * x) + .9 * Math.cos(1.6 * y);
        x = nextX;
        d += `${i ? 'L' : 'M'}${(192 + x * 29).toFixed(1)} ${(64 + y * 19).toFixed(1)} `;
      }
      path.setAttribute('d', d);
      board.querySelector('[clip-path]').append(path);
      timer = setTimeout(() => { path.remove(); figure.classList.remove('is-searching'); resetSignal(); }, 5200);
    } else {
      timer = setTimeout(resetSignal, 5200);
    }
  });
})();
