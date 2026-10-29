(() => {
  const shelf = document.querySelector('#project-shelf');
  const stacks = shelf?.querySelector('.tape-shelf__stacks');
  const cards = document.querySelector('#project-cards');
  const player = document.querySelector('#project-player');
  const screen = document.querySelector('#tape-player-screen');
  const caseSlot = document.querySelector('#tape-player-cover');
  if (!stacks || !cards || !player || !screen || !caseSlot) return;
  const eject = player.querySelector('.tape-player__close');
  const power = player.querySelector('.tape-player__power');
  const playingStatus = player.querySelector('[data-i18n="tapes.nowPlaying"]');
  const idleStatus = player.querySelector('[data-i18n="tapes.noSignal"]');

  // The markings are a visual nod to blank tape packaging, not a claim about playback time.
  const covers = [
    ['BENTOS', 'Water quality monitoring', 'bentos', 'T-120', 'OCEAN SIGNAL'],
    ['KODLAB', 'Coding practice lab', 'kodlab', 'T-120', 'LEARNING LAB'],
    ['AGENT CONTROL', 'AI coding task manager', 'agent', 'T-120', 'WORKFLOW SYSTEM'],
    ['ATTRACTORS', 'Chaos maps and fractals', 'art', 'T-120', 'CHAOS ON TAPE'],
    ['COLDCHAIN', 'Sensor data analysis', 'cold', 'T-120', 'TEMPERATURE DATA'],
    ['FINANCE', 'Spending analysis', 'finance', 'T-120', 'DATA / PYTHON'],
    ['STUDENT DATA', 'Student data pipeline', 'cloud', 'T-120', 'CLOUD / ML'],
    ['PENDULUM', 'Pendulum wave sounds', 'sound', 'T-120', 'SOUND / CANVAS'],
    ['N-BODY', 'Gravity simulation in 3D', 'nbody', 'T-120', 'GRAVITY SIMULATION'],
    ['PHYSICS LAB', 'Interactive physics demos', 'physics', 'T-120', 'INTERACTIVE SCIENCE'],
    ['QUANTUM', 'Quantum research code', 'quantum', 'T-120', 'RESEARCH ARCHIVE']
  ];
  const summaries = {
    bentos: 'Sensors, satellite data and models in a water-quality platform for the Gulf of Gdańsk. I build the data pipelines and dashboards.',
    kodlab: 'A personal web and CS learning lab with a roadmap, browser exercises, tests and progress tracking. PL / EN.',
    agent: 'A self-hosted dashboard to queue AI coding tasks, follow live activity and review changes in isolated Git worktrees.',
    art: 'Chaotic maps, neon density plots and animations built with Python and Numba. The page background runs the same maths live.',
    cold: 'An MCP server for local cold-chain sensor analysis: threshold breaches, anomalies and journey segments. Published on PyPI.',
    finance: 'Cleans Polish bank CSVs, categorises transactions with JSON rules and charts spending in a CLI and Streamlit app.',
    cloud: 'An AWS data pipeline for student performance, with ML, exploratory analysis and a check for feature leakage.',
    sound: 'A browser simulation of a pendulum wave playing a bell synthesiser and chord pad under a starry sky.',
    nbody: '3D gravity in C++20: a leapfrog integrator, orbital camera and energy tracking.',
    physics: 'Interactive browser demos for public events: a quantum lab and a genetic algorithm solving the travelling-salesman problem.',
    quantum: 'Research tools: an SDP-based decomposability test and a Young–Yamanouchi basis generator for quantum information.'
  };
  const articles = [...cards.querySelectorAll('article.card')];
  if (articles.length !== covers.length) return;
  let active = null;
  let ejectTimer = 0;
  let revealTimer = 0;
  let tuningTimer = 0;
  let completeEject = null;
  let lastButton = null;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const desktopShelf = matchMedia('(min-width: 1024px)');
  const showcase = document.createElement('div');
  showcase.className = 'tape-shelf__showcase';
  showcase.setAttribute('aria-hidden', 'true');
  shelf.append(showcase);

  function positionShowcase(item, updateSpread = item.classList.contains('is-open')) {
    const button = item.source;
    if (!button?.isConnected) return;
    const shelfBox = shelf.getBoundingClientRect();
    const width = button.offsetWidth, height = button.offsetHeight;
    // A narrower desktop has fewer spare pixels around the row. Keep the
    // physical spines equal, while sizing the presented face to that space.
    const scale = Math.max(.8, Math.min(1, .8 + (window.innerWidth - 800) / 1500));
    const coverHeight = height * scale;
    const coverWidth = coverHeight * 3 / 4.35;
    // offsetLeft/Top ignore hover and the neighbours' ongoing transition, so a
    // fast switch still starts from the tape's actual slot, not a moving edge.
    const centre = shelfBox.left + shelf.clientLeft + button.offsetLeft - stacks.scrollLeft + width / 2;
    const leftLimit = shelfBox.left + coverWidth / 2 + 18;
    const rightLimit = shelfBox.right - coverWidth / 2 - 18;
    const target = Math.max(leftLimit, Math.min(rightLimit, centre));
    item.style.left = `${centre - shelfBox.left - width / 2}px`;
    item.style.top = `${shelf.clientTop + button.offsetTop - stacks.scrollTop}px`;
    item.style.setProperty('--spine-width', `${width}px`);
    item.style.setProperty('--case-height', `${height}px`);
    item.style.setProperty('--cover-height', `${coverHeight}px`);
    item.style.setProperty('--cover-width', `${coverWidth}px`);
    item.style.setProperty('--open-offset', `${target - centre}px`);
    if (updateSpread) {
      const first = stacks.firstElementChild, last = stacks.lastElementChild;
      const leftSpace = Math.max(0, first.offsetLeft - 14);
      const rightSpace = Math.max(0, shelf.clientWidth - last.offsetLeft - last.offsetWidth - 30);
      const leftWanted = Math.max(0, centre - width / 2 - (target - coverWidth / 2) + 12);
      const rightWanted = Math.max(0, target + coverWidth / 2 - (centre + width / 2) + 12);
      stacks.style.setProperty('--part-left', `${-Math.min(leftSpace, leftWanted)}px`);
      stacks.style.setProperty('--part-right', `${Math.min(rightSpace, rightWanted)}px`);
    }
  }

  function removeShowcase(item) {
    const button = item.source;
    item.remove();
    if (![...showcase.children].some(other => other.source === button)) button?.classList.remove('is-presented');
  }
  function closeShowcase(immediate = false) {
    stacks.querySelectorAll('.is-parting-left, .is-parting-right').forEach(button =>
      button.classList.remove('is-parting-left', 'is-parting-right', 'is-adjacent'));
    [...showcase.children].filter(item => immediate || item.classList.contains('is-open')).forEach(item => {
      clearTimeout(item.removeTimer);
      item.classList.remove('is-open');
      if (immediate || motion.matches || document.documentElement.classList.contains('is-tape-paused')) removeShowcase(item);
      else item.removeTimer = setTimeout(() => removeShowcase(item), 720);
    });
  }
  function showCase(button, cover) {
    if (!desktopShelf.matches || !button || !cover) return;
    // A rapidly reselected tape should not have a second closing copy over it.
    [...showcase.children].filter(item => item.source === button).forEach(item => {
      clearTimeout(item.removeTimer);
      removeShowcase(item);
    });
    const item = document.createElement('div');
    item.className = 'tape-showcase';
    item.source = button;
    const box = document.createElement('div');
    box.className = 'tape-showcase__box';
    const spine = document.createElement('div');
    spine.className = 'tape-showcase__spine';
    const replica = document.createElement('div');
    replica.className = 'tape-showcase__replica';
    replica.innerHTML = button.innerHTML;
    // Copy the existing printed stock rather than creating another element
    // matching the shelf's actionable .project-tape selectors.
    const properties = ['background', 'color', 'border', 'box-shadow'];
    const paint = (source, target) => {
      const style = getComputedStyle(source);
      properties.forEach(property => target.style.setProperty(property, style.getPropertyValue(property)));
    };
    paint(button, replica);
    [...button.children].forEach((source, index) => paint(source, replica.children[index]));
    spine.append(replica);
    const front = document.createElement('div');
    front.className = 'tape-showcase__front';
    front.append(cover.cloneNode(true));
    box.append(spine, front);
    item.append(box);
    showcase.append(item);
    const buttons = [...stacks.children];
    const index = buttons.indexOf(button);
    buttons.forEach((other, i) => {
      if (i < index) other.classList.add('is-parting-left');
      if (i > index) other.classList.add('is-parting-right');
      if (Math.abs(i - index) === 1) other.classList.add('is-adjacent');
    });
    positionShowcase(item, true);
    button.classList.add('is-presented');
    void item.offsetWidth;
    item.classList.add('is-open');
  }
  let shelfResizeFrame = 0;
  const updateShowcase = () => {
    cancelAnimationFrame(shelfResizeFrame);
    shelfResizeFrame = requestAnimationFrame(() => {
      [...showcase.children].forEach(positionShowcase);
    });
  };
  window.addEventListener('resize', updateShowcase, { passive: true });
  stacks.addEventListener('scroll', updateShowcase, { passive: true });
  desktopShelf.addEventListener('change', () => {
    closeShowcase(true);
    if (desktopShelf.matches && active) showCase(active.button, caseSlot.querySelector('.tape-cover'));
  });
  const kodlabPreview = document.querySelector('[data-kodlab-preview]');
  function updateKodlabPreview() {
    if (!kodlabPreview) return;
    const root = document.documentElement;
    const theme = root.dataset.theme || (systemDark.matches ? 'dark' : 'light');
    const lang = root.lang === 'pl' ? 'pl' : 'en';
    const src = `assets/kodlab-${lang}-${theme}.png`;
    if (kodlabPreview.getAttribute('src') !== src) kodlabPreview.setAttribute('src', src);
  }
  updateKodlabPreview();
  new MutationObserver(updateKodlabPreview).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  systemDark.addEventListener('change', updateKodlabPreview);
  function restore() {
    if (!active) return;
    closeShowcase();
    active.title.removeAttribute('id');
    active.title.removeAttribute('tabindex');
    active.body.querySelector('.tape-art-preview')?.remove();
    active.summary.hidden = true;
    active.article.insertBefore(active.body, active.next);
    active.button.setAttribute('aria-expanded', 'false');
    active = null;
  }
  function setIdle(idle) {
    eject.disabled = idle;
    playingStatus.hidden = idle;
    idleStatus.hidden = !idle;
    player.classList.toggle('is-idle', idle);
    for (const region of [player, screen]) {
      if (idle) {
        region.removeAttribute('aria-labelledby');
        region.setAttribute('aria-label', document.documentElement.lang === 'pl'
          ? 'Szum telewizora, brak kasety' : 'TV static, no cassette inserted');
      } else {
        region.removeAttribute('aria-label');
        region.setAttribute('aria-labelledby', 'tape-player-title');
      }
    }
  }
  function cancelPending() {
    clearTimeout(ejectTimer);
    ejectTimer = 0;
    completeEject = null;
  }
  function stopTuning() {
    clearTimeout(tuningTimer);
    tuningTimer = 0;
    screen.querySelector('.tape-test-pattern--tuning')?.remove();
    const noise = screen.querySelector('.tape-static--tuning');
    noise?.dispose?.();
    noise?.remove();
  }
  function disposeStatic() {
    screen.querySelector('.tape-static')?.dispose?.();
  }
  function tunePicture(firstPlay) {
    stopTuning();
    if (motion.matches || document.documentElement.classList.contains('is-tape-paused') ||
        typeof window.createTapeTestPattern !== 'function' || typeof window.createTapeStatic !== 'function') return;
    const noise = window.createTapeStatic();
    noise.classList.add('tape-static--tuning');
    screen.append(noise);
    // A quick burst of noise, a single test-card flash, then noise again.
    // At power-on let the tube open before showing the flash.
    tuningTimer = setTimeout(() => {
      const pattern = window.createTapeTestPattern();
      pattern.classList.add('tape-test-pattern--tuning');
      screen.append(pattern);
      tuningTimer = setTimeout(() => {
        pattern.remove();
        tuningTimer = setTimeout(stopTuning, 70);
      }, 70);
    }, firstPlay ? 420 : 70);
  }
  function ejectTape() {
    if (!active || ejectTimer) return;
    closeShowcase();
    stopTuning();
    const button = active.button;
    const finish = () => {
      cancelPending();
      restore();
      // Keep the sleeve's footprint on phones so the TV never jumps upward.
      const spacer = document.createElement('div');
      spacer.className = 'tape-cover tape-cover--placeholder';
      spacer.style.visibility = 'hidden';
      spacer.setAttribute('aria-hidden', 'true');
      caseSlot.replaceChildren(spacer);
      const noise = typeof window.createTapeStatic === 'function'
        ? window.createTapeStatic() : document.createElement('div');
      noise.classList.add('tape-static');
      noise.setAttribute('aria-hidden', 'true');
      screen.replaceChildren(noise);
      delete screen.dataset.project;
      player.classList.remove('is-ejecting', 'is-playing', 'is-changing');
      setIdle(true);
    };
    button.focus({ preventScroll: true });
    eject.disabled = true;
    player.classList.remove('is-playing', 'is-changing');
    player.classList.add('is-ejecting');
    if (motion.matches || document.documentElement.classList.contains('is-tape-paused')) return finish();
    completeEject = finish;
    ejectTimer = setTimeout(finish, 520);
  }
  function powerOff(returnFocus = true, immediate = false) {
    if (player.hidden || player.classList.contains('is-powering-off')) return;
    closeShowcase(immediate);
    stopTuning();
    cancelPending();
    clearTimeout(revealTimer);
    if (returnFocus) (active?.button || lastButton)?.focus({ preventScroll: true });
    const finish = () => {
      cancelPending();
      restore();
      player.hidden = true;
      player.inert = false;
      player.classList.remove('is-ejecting', 'is-powering-off', 'is-playing', 'is-changing', 'is-expanded', 'is-revealing', 'is-idle');
      caseSlot.replaceChildren();
      disposeStatic();
      screen.replaceChildren();
      delete screen.dataset.project;
      setIdle(false);
    };
    if (immediate || motion.matches || document.documentElement.classList.contains('is-tape-paused')) return finish();
    player.inert = true;
    player.classList.remove('is-playing', 'is-changing');
    player.classList.add('is-powering-off', 'is-ejecting', 'is-revealing');
    player.classList.remove('is-expanded');
    completeEject = finish;
    ejectTimer = setTimeout(finish, 650);
  }
  articles.forEach((article, i) => {
    const [name, category, style, format, subtitle] = covers[i];
    const button = document.createElement('button');
    button.type = 'button';
    if (style === 'art') { article.removeAttribute('id'); button.id = 'art'; }
    button.className = `project-tape project-tape--${style}`;
    button.setAttribute('aria-controls', 'project-player');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = `<span class="project-tape__brand">TM<span> /</span></span><span class="project-tape__label"><span class="project-tape__name"></span><span class="project-tape__category"></span></span><span class="project-tape__bands" aria-hidden="true"></span><span class="project-tape__format">${format}<small>VHS</small></span>`;
    button.querySelector('.project-tape__name').textContent = name;
    const description = button.querySelector('.project-tape__category');
    description.dataset.i18n = `tape.desc.${style}`;
    description.textContent = category;
    const title = article.querySelector('h3');
    const summary = document.createElement('p');
    summary.className = 'tape-summary';
    summary.dataset.i18n = `tape.summary.${style}`;
    summary.textContent = summaries[style];
    summary.hidden = true;
    title.after(summary);
    const sync = () => button.setAttribute('aria-label', `${title.textContent.trim()}: ${description.textContent.trim()}`);
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(title, { subtree: true, childList: true, characterData: true });
    observer.observe(description, { subtree: true, childList: true, characterData: true });
    button.addEventListener('click', () => {
      const firstPlay = player.hidden;
      cancelPending();
      stopTuning();
      clearTimeout(revealTimer);
      player.inert = false;
      player.classList.remove('is-playing', 'is-changing', 'is-ejecting', 'is-powering-off');
      restore();
      const body = article.querySelector('.card__body');
      active = { article, body, next: body.nextSibling, button, title, summary };
      lastButton = button;
      summary.hidden = false;
      screen.dataset.project = style;
      button.setAttribute('aria-expanded', 'true');
      title.id = 'tape-player-title';
      title.tabIndex = -1;
      setIdle(false);
      const cover = document.createElement('div');
      cover.className = `tape-cover tape-cover--${style}`;
      cover.setAttribute('aria-hidden', 'true');
      cover.innerHTML = `<span class="tape-cover__brand">TM / VIDEO LIBRARY</span><span class="tape-cover__format">${format} <b>VHS</b></span><strong class="tape-cover__title"></strong><span class="tape-cover__subtitle"></span><span class="tape-cover__art"></span><span class="tape-cover__foot">HIGH QUALITY VIDEO <b>VHS</b></span>`;
      cover.querySelector('.tape-cover__title').textContent = name;
      cover.querySelector('.tape-cover__subtitle').textContent = subtitle;
      const sourceImage = ['art', 'quantum'].includes(style) && article.querySelector('.card__print img');
      if (sourceImage) {
        const preview = document.createElement('figure');
        preview.className = `tape-art-preview tape-art-preview--${style}`;
        const image = sourceImage.cloneNode();
        image.removeAttribute('data-i18n-attr');
        preview.append(image);
        body.append(preview);
      }
      caseSlot.replaceChildren(cover);
      showCase(button, cover);
      disposeStatic();
      screen.replaceChildren(body);
      player.hidden = false;
      // Commit the closed compartment before revealing it. On a tape change or
      // interrupted eject, its current height reverses smoothly instead.
      void player.offsetWidth;
      player.classList.add('is-expanded', 'is-revealing');
      player.classList.add(firstPlay ? 'is-playing' : 'is-changing');
      revealTimer = setTimeout(() => player.classList.remove('is-revealing'), 650);
      tunePicture(firstPlay);
      title.focus({ preventScroll: true });
    });
    stacks.append(button);
  });
  // Keep DOM and keyboard order aligned with the leaning final spine.
  stacks.append(stacks.querySelector('.project-tape--art'));
  document.addEventListener('channelchange', () => {
    updateKodlabPreview();
    if (player.classList.contains('is-idle')) setIdle(true);
    const image = active?.body.querySelector('.tape-art-preview img');
    const source = active?.article.querySelector('.card__print img');
    if (image && source) image.alt = source.alt;
  });
  document.addEventListener('tape-pause-change', () => {
    if (document.documentElement.classList.contains('is-tape-paused')) {
      stopTuning();
      completeEject?.();
    }
  });
  motion.addEventListener('change', () => { if (motion.matches) { stopTuning(); completeEject?.(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopTuning(); });
  eject.addEventListener('click', ejectTape);
  power.addEventListener('click', () => powerOff());
  player.addEventListener('click', event => {
    if (event.target.closest('.tape-player__secret, .tape-image-open')) stopTuning();
    if (event.target.closest('a[href^="#"]')) powerOff(false, true);
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !player.hidden && !document.querySelector('dialog[open]') &&
        (player.contains(document.activeElement) || shelf.contains(document.activeElement))) {
      event.preventDefault();
      if (active) ejectTape();
      else powerOff();
    }
  });
  cards.hidden = true;
  shelf.hidden = false;
})();
