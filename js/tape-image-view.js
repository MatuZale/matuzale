/* The picture can fill the CRT without changing the television or the source card. */
(() => {
  const player = document.querySelector('#project-player');
  const screen = document.querySelector('#tape-player-screen');
  if (!player || !screen) return;
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = null, imageObserver = null, transitionTimer = 0;
  const pl = () => root.lang === 'pl';
  const openLabel = image => `${pl() ? 'Powiększ obraz' : 'Enlarge image'}: ${image.alt}`;
  const closeLabel = (image, logistic) => logistic
    ? (pl() ? 'Mapa logistyczna, wykres bifurkacyjny. Wróć do opisu projektu' : 'Logistic map, bifurcation diagram. Return to the project description')
    : `${image.alt}. ${pl() ? 'Wróć do opisu projektu' : 'Return to the project description'}`;

  function syncLabels() {
    screen.querySelectorAll('.tape-image-open').forEach(button => {
      const image = button.querySelector('img');
      if (!image) return;
      const logistic = Boolean(button.closest('.tape-art-preview--art'));
      const title = logistic ? (pl() ? 'Zobacz mapę logistyczną ASCII' : 'View the ASCII logistic map') : (pl() ? 'Powiększ obraz' : 'Enlarge image');
      button.setAttribute('aria-label', logistic ? title : openLabel(image));
      button.setAttribute('title', title);
      const hint = button.querySelector('.tape-image-open__hint');
      const label = logistic ? (pl() ? 'MAPA ASCII ↗' : 'ASCII MAP ↗') : (pl() ? 'POWIĘKSZ ↗' : 'ENLARGE ↗');
      if (hint.textContent !== label) hint.textContent = label;
    });
    if (current) {
      current.view.setAttribute('aria-label', closeLabel(current.source, current.logistic));
      const hint = current.view.querySelector('.tape-image-full__hint');
      const label = pl() ? '← WRÓĆ DO OPISU' : '← BACK TO PROJECT';
      if (hint.textContent !== label) hint.textContent = label;
      if (current.image.alt !== current.source.alt) current.image.alt = current.source.alt;
      if (current.image.src !== current.source.src) current.image.src = current.source.src;
    }
  }

  function addControls() {
    screen.querySelectorAll('.tape-preview, .tape-art-preview').forEach(figure => {
      const image = figure.querySelector('img');
      if (!image || image.closest('.tape-image-open')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tape-image-open';
      const hint = document.createElement('span');
      hint.className = 'tape-image-open__hint';
      hint.setAttribute('aria-hidden', 'true');
      image.before(button);
      button.append(image, hint);
    });
    syncLabels();
  }

  function transition() {
    const old = screen.querySelector('.tape-image-interruption');
    old?.remove();
    clearTimeout(transitionTimer);
    if (motion.matches || root.classList.contains('is-tape-paused')) return;
    const effect = document.createElement('div');
    effect.className = 'tape-image-interruption';
    effect.setAttribute('aria-hidden', 'true');
    screen.append(effect);
    transitionTimer = setTimeout(() => effect.remove(), 580);
  }

  function close(restoreFocus = true, animate = true) {
    if (!current) return;
    const { body, button, view, wasInert, cleanup } = current;
    current = null;
    imageObserver?.disconnect();
    imageObserver = null;
    cleanup?.();
    body.inert = wasInert;
    view.remove();
    if (animate && screen.contains(body) && !player.hidden) transition();
    if (restoreFocus && screen.contains(button) && !screen.inert) button.focus({ preventScroll: true });
  }

  function open(button) {
    const body = screen.querySelector('.card__body');
    const source = button.querySelector('img');
    if (!body || !source || player.hidden || screen.inert || current) return;
    const view = document.createElement('button');
    view.type = 'button';
    view.className = 'tape-image-full';
    const image = document.createElement('img');
    image.src = source.src;
    image.alt = source.alt;
    const hint = document.createElement('span');
    hint.className = 'tape-image-full__hint';
    hint.setAttribute('aria-hidden', 'true');
    view.append(image, hint);
    const logistic = screen.dataset.project === 'art' && typeof window.createTapeLogistic === 'function';
    current = { body, source, button, view, image, logistic, cleanup: null, wasInert: body.inert };
    body.inert = true;
    screen.append(view);
    if (logistic) current.cleanup = window.createTapeLogistic(view);
    syncLabels();
    imageObserver = new MutationObserver(syncLabels);
    imageObserver.observe(source, { attributes: true, attributeFilter: ['src', 'alt'] });
    transition();
    view.focus({ preventScroll: true });
  }

  screen.addEventListener('click', event => {
    const button = event.target.closest('.tape-image-open');
    if (button && screen.contains(button)) { open(button); return; }
    if (event.target.closest('.tape-image-full')) close();
  });
  // First Escape returns to the description; a subsequent Escape can eject the cassette.
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !current || document.querySelector('dialog[open]')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    close();
  }, true);
  document.addEventListener('channelchange', syncLabels);
  new MutationObserver(() => {
    if (current && (player.hidden || player.classList.contains('is-ejecting') || screen.inert || !screen.contains(current.body))) close(false, false);
    addControls();
  }).observe(screen, { childList: true, subtree: true, attributes: true, attributeFilter: ['inert'] });
  new MutationObserver(() => {
    if (current && (player.hidden || player.classList.contains('is-ejecting') || player.classList.contains('is-changing'))) close(false, false);
  }).observe(player, { attributes: true, attributeFilter: ['class', 'hidden'] });
  addControls();
})();
