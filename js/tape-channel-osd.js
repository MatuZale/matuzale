/* The readout belongs to the picture, so it follows rapid tape changes. */
(() => {
  const player = document.querySelector('#project-player');
  const screen = document.querySelector('#tape-player-screen');
  if (!player || !screen) return;

  let readout = null;
  let timer = 0;
  let revision = 0;

  function clear() {
    revision++;
    clearTimeout(timer);
    timer = 0;
    readout?.remove();
    readout = null;
  }

  document.addEventListener('tape-channel-change', event => {
    clear();
    const { channel, title } = event.detail || {};
    if (!channel || !title) return;
    const current = revision;

    function show() {
      if (current !== revision || player.hidden || player.classList.contains('is-ejecting') || screen.inert) return;
      readout = document.createElement('div');
      readout.className = 'tape-channel-osd';
      // The selected project heading already announces the same information.
      readout.setAttribute('aria-hidden', 'true');
      const number = document.createElement('span');
      number.textContent = `CH ${channel}`;
      const name = document.createElement('span');
      name.className = 'tape-channel-osd__name';
      name.textContent = title;
      readout.append(number, name);
      screen.append(readout);
      timer = setTimeout(clear, 1800);
    }
    // A tape change also ends the ident; let its mutation observer restore the
    // picture first if the selection happened while the ident was playing.
    if (screen.inert) queueMicrotask(show);
    else show();
  });

  const observer = new MutationObserver(() => {
    if (readout && (player.hidden || player.classList.contains('is-ejecting') || screen.inert)) clear();
  });
  observer.observe(player, { attributes: true, attributeFilter: ['class', 'hidden'] });
  observer.observe(screen, { attributes: true, attributeFilter: ['inert'] });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
})();
