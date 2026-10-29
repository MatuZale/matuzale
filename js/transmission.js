// The receiver is independent of the game: opening it never covers or changes the board.
(() => {
  const button = document.getElementById('footer-signal');
  const panel = document.getElementById('signal-message');
  if (!button || !panel) return;
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
  });
})();
