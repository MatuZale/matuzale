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
  const ident = player.querySelector('.tape-player__secret');
  const tuner = player.querySelector('#tape-tuner');
  const tunerFace = player.querySelector('.tape-tuner');
  const tunerValue = player.querySelector('.tape-tuner__value');
  const playingStatus = player.querySelector('[data-i18n="tapes.nowPlaying"]');
  const gameStatus = player.querySelector('[data-i18n="tapes.nowGame"]');
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
  let powerOnTimer = 0;
  let tuningTimer = 0;
  let completeEject = null;
  let lastButton = null;
  let tuningByDial = false;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const desktopShelf = matchMedia('(min-width: 1024px)');
  const desktopAvShelf = matchMedia('(min-width: 1100px)');
  const shelfHasRoom = () => desktopShelf.matches &&
    (!document.documentElement.classList.contains('is-crt') || desktopAvShelf.matches);
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
    // The target is based on the stable slot, but the replica must start at
    // the visible spine, which may still be moving from the previous selection.
    const centre = shelfBox.left + shelf.clientLeft + button.offsetLeft - stacks.scrollLeft + width / 2;
    const visible = button.getBoundingClientRect();
    const visibleCentre = visible.left + visible.width / 2;
    const transform = getComputedStyle(button).transform;
    const matrix = transform === 'none' ? null : new DOMMatrixReadOnly(transform);
    const angle = matrix ? Math.atan2(matrix.b, matrix.a) * 180 / Math.PI : 0;
    const leftLimit = shelfBox.left + coverWidth / 2 + 18;
    const rightLimit = shelfBox.right - coverWidth / 2 - 18;
    const target = Math.max(leftLimit, Math.min(rightLimit, centre));
    item.style.left = `${visibleCentre - shelfBox.left - width / 2}px`;
    item.style.top = `${visible.top + visible.height / 2 - shelfBox.top - height / 2}px`;
    item.style.setProperty('--spine-width', `${width}px`);
    item.style.setProperty('--case-height', `${height}px`);
    item.style.setProperty('--cover-height', `${coverHeight}px`);
    item.style.setProperty('--cover-width', `${coverWidth}px`);
    item.style.setProperty('--open-offset', `${target - centre}px`);
    item.style.setProperty('--spine-angle', `${angle}deg`);
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

  // Keep closing and opening replicas attached to their real spines while the
  // row is moving. This loop only runs during a transition, never at idle.
  let trackingFrame = 0, trackUntil = 0;
  function trackShowcases() {
    if (motion.matches || document.documentElement.classList.contains('is-tape-paused')) {
      cancelAnimationFrame(trackingFrame);
      trackingFrame = 0;
      [...showcase.children].forEach(item => positionShowcase(item, false));
      return;
    }
    trackUntil = performance.now() + 780;
    if (trackingFrame) return;
    const frame = () => {
      trackingFrame = 0;
      [...showcase.children].forEach(item => positionShowcase(item, false));
      if (showcase.children.length && performance.now() < trackUntil && !motion.matches &&
          !document.documentElement.classList.contains('is-tape-paused')) trackingFrame = requestAnimationFrame(frame);
    };
    trackingFrame = requestAnimationFrame(frame);
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
    if (showcase.children.length) trackShowcases();
  }
  function paintShowcase(item) {
    const button = item.source;
    const replica = item.querySelector('.tape-showcase__replica');
    if (!button || !replica) return;
    // `border` is empty for mixed sides, such as Kodlab's yellow and Agent
    // Control's pink top rules. Copy each side so the moving spine matches the
    // real one before the handover, instead of those accents popping in late.
    const properties = ['background', 'color', 'border-top', 'border-right', 'border-bottom', 'border-left', 'box-shadow', 'order', 'font-size', 'letter-spacing'];
    const sources = [button, ...button.querySelectorAll('*')];
    const targets = [replica, ...replica.querySelectorAll('*')];
    // Read all computed values before writing, avoiding a layout flush for
    // each child while neighbouring tapes are already in motion.
    const paint = sources.map(source => {
      const style = getComputedStyle(source);
      return properties.map(property => style.getPropertyValue(property));
    });
    targets.forEach((target, index) => properties.forEach((property, i) => target.style.setProperty(property, paint[index][i])));
  }
  function partShelf(button) {
    const buttons = [...stacks.children];
    const index = buttons.indexOf(button);
    buttons.forEach((other, i) => {
      other.classList.toggle('is-parting-left', i < index);
      other.classList.toggle('is-parting-right', i > index);
      other.classList.toggle('is-adjacent', Math.abs(i - index) === 1);
    });
  }
  function showCase(button, cover) {
    if (!shelfHasRoom() || !button || !cover) return;
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
    spine.append(replica);
    const front = document.createElement('div');
    front.className = 'tape-showcase__front';
    front.dataset.spine = button.querySelector('.project-tape__name').textContent;
    front.append(cover.cloneNode(true));
    box.append(spine, front);
    item.append(box);
    showcase.append(item);
    paintShowcase(item);
    partShelf(button);
    positionShowcase(item, true);
    button.classList.add('is-presented');
    void item.offsetWidth;
    item.classList.add('is-open');
    trackShowcases();
  }
  let shelfResizeFrame = 0;
  const updateShowcase = () => {
    cancelAnimationFrame(shelfResizeFrame);
    shelfResizeFrame = requestAnimationFrame(() => {
      [...showcase.children].forEach(item => { positionShowcase(item); paintShowcase(item); });
    });
  };
  window.addEventListener('resize', updateShowcase, { passive: true });
  stacks.addEventListener('scroll', updateShowcase, { passive: true });
  function syncShelfMode() {
    closeShowcase(true);
    if (shelfHasRoom() && active) showCase(active.button, caseSlot.querySelector('.tape-cover'));
  }
  desktopShelf.addEventListener('change', syncShelfMode);
  desktopAvShelf.addEventListener('change', () => {
    if (document.documentElement.classList.contains('is-crt')) syncShelfMode();
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
  function updateTheme() {
    updateKodlabPreview();
    [...showcase.children].forEach(paintShowcase);
  }
  new MutationObserver(updateTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  systemDark.addEventListener('change', updateTheme);
  function stopGame() {
    if (!active?.game) return;
    // Removing the game's cabinet volume control must not drop keyboard focus.
    const volumeSlot = player.querySelector('.tape-player__volume-slot');
    if (volumeSlot?.contains(document.activeElement)) tuner.focus({ preventScroll: true });
    active.abort.abort();
    active.gameController?.destroy();
    active.gameController = null;
  }
  function restore() {
    if (!active) return;
    closeShowcase();
    if (active.game) {
      stopGame();
      active.title.removeAttribute('id');
      active.button.setAttribute('aria-expanded', 'false');
      active = null;
      return;
    }
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
    playingStatus.hidden = idle || Boolean(active?.game);
    gameStatus.hidden = idle || !active?.game;
    idleStatus.hidden = !idle;
    player.classList.toggle('is-idle', idle);
    syncTuner();
    for (const region of [player, screen]) {
      if (idle) {
        region.removeAttribute('aria-labelledby');
        const off = player.classList.contains('is-off');
        region.setAttribute('aria-label', document.documentElement.lang === 'pl'
          ? (off ? 'Telewizor wyłączony. Wybierz kasetę, aby poznać projekty' : 'Szum telewizora, brak kasety')
          : (off ? 'TV off. Select a tape to explore projects' : 'TV static, no cassette inserted'));
      } else {
        region.removeAttribute('aria-label');
        region.setAttribute('aria-labelledby', 'tape-player-title');
      }
    }
  }
  function channelTapes() {
    // The leaning art tape is last on the shelf, but the dial follows channel
    // numbers, with the hidden game occupying channel 04 only in AV mode.
    return [...stacks.querySelectorAll('.project-tape')]
      .sort((a, b) => Number(a.dataset.tapeChannel) - Number(b.dataset.tapeChannel));
  }
  function syncTuner(value) {
    const tapes = channelTapes();
    const position = value ?? (active ? tapes.indexOf(active.button) + 1 : 0);
    const selected = tapes[position - 1];
    tuner.max = String(tapes.length);
    tuner.value = String(position);
    const channel = selected?.dataset.tapeChannel || '--';
    tunerValue.textContent = `CH ${channel}`;
    tuner.setAttribute('aria-valuetext', selected
      ? `${document.documentElement.lang === 'pl' ? 'Kanał' : 'Channel'} ${channel}: ${selected.querySelector('.project-tape__name').textContent}`
      : (document.documentElement.lang === 'pl' ? 'Brak kasety' : 'No cassette'));
    tunerFace.style.setProperty('--tune-angle', `${-135 + 270 * position / Math.max(1, tapes.length)}deg`);
  }
  tuner.addEventListener('input', () => {
    const position = Number(tuner.value);
    const button = channelTapes()[position - 1];
    syncTuner(position);
    if (!button) { if (active) ejectTape(false, false); return; }
    if (active?.button === button && !ejectTimer) return;
    tuningByDial = true;
    try { button.click(); } finally { tuningByDial = false; }
  });
  function setPowerState(off) {
    player.classList.toggle('is-off', off);
    power.setAttribute('aria-pressed', String(!off));
    const label = document.documentElement.lang === 'pl'
      ? (off ? 'Włącz telewizor' : 'Wyłącz telewizor')
      : (off ? 'Turn on TV' : 'Turn off TV');
    power.setAttribute('aria-label', label);
    power.title = label;
    ident.disabled = off;
  }
  function cancelPending() {
    clearTimeout(ejectTimer);
    ejectTimer = 0;
    completeEject = null;
  }
  function stopPowerOn() {
    clearTimeout(powerOnTimer);
    powerOnTimer = 0;
    player.classList.remove('is-powering-on');
  }
  function startPowerOn() {
    stopPowerOn();
    if (motion.matches || document.documentElement.classList.contains('is-tape-paused')) return;
    void player.offsetWidth;
    player.classList.add('is-powering-on');
    powerOnTimer = setTimeout(stopPowerOn, 700);
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
  function tunePicture() {
    stopTuning();
    if (document.hidden || motion.matches || document.documentElement.classList.contains('is-tape-paused') ||
        typeof window.createTapeTestPattern !== 'function' || typeof window.createTapeStatic !== 'function') return;
    // Occasionally the signal locks immediately. Most interruptions are brief;
    // the skewed distribution leaves room for a rare, longer burst (max 1 s).
    if (Math.random() < .03) return;
    const duration = Math.round(80 + 920 * Math.random() ** 2.5);
    const firstNoise = Math.round(duration * .4);
    const cardFlash = Math.max(20, Math.round(duration * .2));
    const finalNoise = duration - firstNoise - cardFlash;
    const noise = window.createTapeStatic();
    noise.classList.add('tape-static--tuning');
    screen.append(noise);
    tuningTimer = setTimeout(() => {
      const pattern = window.createTapeTestPattern();
      pattern.classList.add('tape-test-pattern--tuning');
      screen.append(pattern);
      tuningTimer = setTimeout(() => {
        pattern.remove();
        tuningTimer = setTimeout(stopTuning, finalNoise);
      }, cardFlash);
    }, firstNoise);
  }
  function ejectTape(immediate = false, returnFocus = true) {
    if (!active || ejectTimer) return;
    closeShowcase();
    stopTuning();
    stopPowerOn();
    stopGame();
    const button = active.button;
    const finish = () => {
      cancelPending();
      restore();
      caseSlot.replaceChildren();
      const noise = typeof window.createTapeStatic === 'function'
        ? window.createTapeStatic() : document.createElement('div');
      noise.classList.add('tape-static');
      noise.setAttribute('aria-hidden', 'true');
      screen.replaceChildren(noise);
      delete screen.dataset.project;
      player.classList.remove('is-ejecting', 'is-playing', 'is-changing');
      setIdle(true);
    };
    if (returnFocus) button.focus({ preventScroll: true });
    eject.disabled = true;
    player.classList.remove('is-playing', 'is-changing');
    player.classList.add('is-ejecting');
    if (immediate || motion.matches || document.documentElement.classList.contains('is-tape-paused')) return finish();
    completeEject = finish;
    ejectTimer = setTimeout(finish, 520);
  }
  function powerOff(returnFocus = true, immediate = false) {
    if (player.classList.contains('is-off') || player.classList.contains('is-powering-off')) return;
    closeShowcase(immediate);
    stopTuning();
    stopPowerOn();
    stopGame();
    cancelPending();
    clearTimeout(revealTimer);
    if (returnFocus) (active?.button || lastButton)?.focus({ preventScroll: true });
    const finish = () => {
      cancelPending();
      restore();
      player.inert = false;
      player.classList.remove('is-ejecting', 'is-powering-off', 'is-playing', 'is-changing', 'is-revealing');
      caseSlot.replaceChildren();
      disposeStatic();
      screen.replaceChildren();
      delete screen.dataset.project;
      setPowerState(true);
      setIdle(true);
    };
    if (immediate || motion.matches || document.documentElement.classList.contains('is-tape-paused')) return finish();
    player.inert = true;
    player.classList.remove('is-playing', 'is-changing');
    player.classList.add('is-powering-off', 'is-ejecting', 'is-revealing');
    completeEject = finish;
    ejectTimer = setTimeout(finish, 650);
  }
  articles.forEach((article, i) => {
    const [name, category, style, format, subtitle] = covers[i];
    const button = document.createElement('button');
    button.type = 'button';
    if (style === 'art') { article.removeAttribute('id'); button.id = 'art'; }
    button.className = `project-tape project-tape--${style}`;
    button.dataset.tapeChannel = String(i < 3 ? i + 1 : i + 2).padStart(2, '0');
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
      const firstPlay = player.classList.contains('is-off');
      cancelPending();
      stopTuning();
      stopPowerOn();
      clearTimeout(revealTimer);
      player.inert = false;
      player.classList.remove('is-playing', 'is-changing', 'is-ejecting', 'is-powering-off');
      setPowerState(false);
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
      // Keep the cabinet in place while the picture powers up or retunes.
      void player.offsetWidth;
      player.classList.add('is-expanded', 'is-revealing');
      player.classList.add(firstPlay ? 'is-playing' : 'is-changing');
      if (firstPlay) startPowerOn();
      revealTimer = setTimeout(() => player.classList.remove('is-revealing'), 650);
      tunePicture();
      document.dispatchEvent(new CustomEvent('tape-channel-change', {
        detail: { channel: String(i < 3 ? i + 1 : i + 2).padStart(2, '0'), title: name }
      }));
      if (!tuningByDial) title.focus({ preventScroll: true });
    });
    stacks.append(button);
  });
  // Keep DOM and keyboard order aligned with the leaning final spine.
  stacks.append(stacks.querySelector('.project-tape--art'));

  // AV reveals a playable tape alongside the project archive. It is kept
  // separate from the project cards so the non-JavaScript fallback remains intact.
  const gameTape = document.createElement('button');
  gameTape.type = 'button';
  gameTape.className = 'project-tape project-tape--spacewar';
  gameTape.dataset.tapeSpacewar = '';
  gameTape.dataset.tapeChannel = '04';
  gameTape.setAttribute('aria-controls', 'project-player');
  gameTape.setAttribute('aria-expanded', 'false');
  gameTape.innerHTML = `<span class="project-tape__brand">TM<span> /</span></span><span class="project-tape__label"><span class="project-tape__name">SPACEWAR!</span><span class="project-tape__category"></span></span><span class="project-tape__bands" aria-hidden="true"></span><span class="project-tape__format">T-120<small>VHS</small></span>`;
  function labelGameTape() {
    const description = document.documentElement.lang === 'pl' ? 'Kosmiczny pojedynek arcade' : 'Arcade duel in space';
    gameTape.querySelector('.project-tape__category').textContent = description;
    gameTape.setAttribute('aria-label', `Spacewar!: ${description}`);
  }
  labelGameTape();
  gameTape.addEventListener('click', () => {
    // Reselecting the current game is normally a no-op, but during EJECT or
    // POWER it must cancel the pending close just like any other cassette.
    if (!document.documentElement.classList.contains('is-crt') || (active?.game && !ejectTimer)) return;
    const firstPlay = player.classList.contains('is-off');
    cancelPending();
    stopTuning();
    stopPowerOn();
    clearTimeout(revealTimer);
    player.inert = false;
    player.classList.remove('is-playing', 'is-changing', 'is-ejecting', 'is-powering-off');
    setPowerState(false);
    restore();
    const title = document.createElement('h3');
    title.id = 'tape-player-title';
    title.className = 'tape-game-title';
    title.tabIndex = -1;
    title.textContent = 'Spacewar!';
    const loading = document.createElement('div');
    loading.className = 'tape-game-loading';
    loading.setAttribute('role', 'status');
    loading.textContent = document.documentElement.lang === 'pl' ? 'WCZYTYWANIE GRY…' : 'LOADING GAME…';
    const session = { game: true, button: gameTape, title, abort: new AbortController(), gameController: null };
    active = session;
    lastButton = gameTape;
    gameTape.setAttribute('aria-expanded', 'true');
    setIdle(false);
    screen.dataset.project = 'spacewar';
    const cover = document.createElement('div');
    cover.className = 'tape-cover tape-cover--spacewar';
    cover.setAttribute('aria-hidden', 'true');
    cover.innerHTML = `<span class="tape-cover__brand">TM / VIDEO LIBRARY</span><span class="tape-cover__format">T-120 <b>VHS</b></span><strong class="tape-cover__title">SPACEWAR!</strong><span class="tape-cover__subtitle">ARCADE / 1962</span><span class="tape-cover__art"></span><span class="tape-cover__foot">HIGH QUALITY VIDEO <b>VHS</b></span>`;
    caseSlot.replaceChildren(cover);
    showCase(gameTape, cover);
    disposeStatic();
    screen.replaceChildren(title, loading);
    player.hidden = false;
    void player.offsetWidth;
    player.classList.add('is-expanded', 'is-revealing', firstPlay ? 'is-playing' : 'is-changing');
    if (firstPlay) startPowerOn();
    revealTimer = setTimeout(() => player.classList.remove('is-revealing'), 650);
    tunePicture();
    document.dispatchEvent(new CustomEvent('tape-channel-change', {
      detail: { channel: '04', title: 'SPACEWAR!' }
    }));
    if (!tuningByDial) title.focus({ preventScroll: true });
    const focusGame = !tuningByDial;
    import('./spacewar.js').then(async module => {
      if (active !== session || session.abort.signal.aborted) return;
      const controller = await module.mountSpacewar(screen, player, { signal: session.abort.signal, focusGame });
      if (active !== session || session.abort.signal.aborted) { controller?.destroy(); return; }
      session.gameController = controller;
      loading.remove();
    }).catch(error => {
      if (active !== session || session.abort.signal.aborted) return;
      loading.textContent = document.documentElement.lang === 'pl' ? 'NIE UDAŁO SIĘ WCZYTAĆ GRY' : 'COULD NOT LOAD GAME';
      console.error('Could not load Spacewar', error);
    });
  });
  function syncGameTape() {
    const on = document.documentElement.classList.contains('is-crt');
    if (on && !gameTape.isConnected) {
      stacks.insertBefore(gameTape, stacks.querySelector('.project-tape--art'));
      const open = showcase.querySelector('.tape-showcase.is-open');
      if (open) partShelf(open.source);
      updateShowcase();
    } else if (!on && gameTape.isConnected) {
      if (active?.game) {
        if (player.classList.contains('is-powering-off')) stopGame();
        else { cancelPending(); ejectTape(true, false); }
      }
      gameTape.remove();
      const open = showcase.querySelector('.tape-showcase.is-open');
      if (open) partShelf(open.source);
      updateShowcase();
    }
    if (desktopShelf.matches && !desktopAvShelf.matches) syncShelfMode();
    syncTuner();
  }
  document.addEventListener('crtchange', syncGameTape);
  syncGameTape();
  document.addEventListener('channelchange', () => {
    updateKodlabPreview();
    setPowerState(player.classList.contains('is-off'));
    if (player.classList.contains('is-idle')) setIdle(true);
    else syncTuner();
    labelGameTape();
    const image = active?.body?.querySelector('.tape-art-preview img');
    const source = active?.article?.querySelector('.card__print img');
    if (image && source) image.alt = source.alt;
  });
  document.addEventListener('tape-pause-change', () => {
    if (document.documentElement.classList.contains('is-tape-paused')) {
      stopTuning();
      stopPowerOn();
      completeEject?.();
    }
  });
  motion.addEventListener('change', () => { if (motion.matches) { stopTuning(); stopPowerOn(); completeEject?.(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopTuning(); });
  eject.addEventListener('click', () => ejectTape());
  power.addEventListener('click', () => {
    if (!player.classList.contains('is-off')) return powerOff();
    setPowerState(false);
    const noise = typeof window.createTapeStatic === 'function'
      ? window.createTapeStatic() : document.createElement('div');
    noise.classList.add('tape-static');
    noise.setAttribute('aria-hidden', 'true');
    screen.replaceChildren(noise);
    setIdle(true);
    startPowerOn();
  });
  player.addEventListener('click', event => {
    if (event.target.closest('.tape-player__secret, .tape-image-open')) stopTuning();
    if (event.target.closest('a[href^="#"]')) powerOff(false, true);
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !player.classList.contains('is-off') && !document.querySelector('dialog[open]') &&
        (player.contains(document.activeElement) || shelf.contains(document.activeElement))) {
      event.preventDefault();
      if (active) ejectTape();
      else powerOff();
    }
  });
  // On phones, the fixed transport otherwise covers the TV's own controls.
  // Keep it available if it already owns keyboard focus until focus leaves it.
  const tvControls = player.querySelector('.tape-player__controls');
  const floatingControls = [document.querySelector('.footer-tape__transport'), document.querySelector('.back-top')].filter(Boolean);
  const narrowControls = matchMedia('(max-width: 680px)');
  function syncFloatingControls() {
    if (!narrowControls.matches) {
      document.documentElement.classList.remove('tv-controls-on-screen');
      return;
    }
    const rect = tvControls.getBoundingClientRect();
    const tvControlsVisible = rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
    const focused = floatingControls.some(control => control.contains(document.activeElement));
    document.documentElement.classList.toggle('tv-controls-on-screen', tvControlsVisible && !focused);
  }
  if (tvControls && floatingControls.length) {
    let visibilityFrame = 0;
    const measureControls = () => {
      cancelAnimationFrame(visibilityFrame);
      if (!narrowControls.matches) { syncFloatingControls(); return; }
      visibilityFrame = requestAnimationFrame(syncFloatingControls);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(measureControls).observe(tvControls);
    }
    // WebKit can delay observer delivery while scrolling. Keep the controls
    // clear on the next frame, and measure synchronously when focus changes.
    window.addEventListener('scroll', measureControls, { passive: true });
    window.addEventListener('resize', measureControls, { passive: true });
    measureControls();
    narrowControls.addEventListener('change', syncFloatingControls);
    document.addEventListener('focusin', syncFloatingControls);
    document.addEventListener('focusout', () => queueMicrotask(syncFloatingControls));
  }
  cards.hidden = true;
  shelf.hidden = false;
  player.hidden = false;
  player.classList.add('is-expanded');
  setPowerState(true);
  setIdle(true);
})();
