(() => {
  const shelf = document.querySelector('#project-shelf');
  const stacks = shelf?.querySelector('.tape-shelf__stacks');
  const cards = document.querySelector('#project-cards');
  const player = document.querySelector('#project-player');
  const screen = document.querySelector('#tape-player-screen');
  const caseSlot = document.querySelector('#tape-player-cover');
  if (!stacks || !cards || !player || !screen || !caseSlot) return;

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
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
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
    active.title.removeAttribute('id');
    active.title.removeAttribute('tabindex');
    active.body.querySelector('.tape-art-preview')?.remove();
    active.summary.hidden = true;
    active.article.insertBefore(active.body, active.next);
    active.button.setAttribute('aria-expanded', 'false');
    active = null;
  }
  function closePlayer(returnFocus = true, immediate = false) {
    if (!active || ejectTimer) return;
    const button = active.button;
    const finish = () => {
      ejectTimer = 0;
      restore();
      player.hidden = true;
      player.classList.remove('is-ejecting', 'is-playing', 'is-changing');
      caseSlot.replaceChildren();
      if (returnFocus) button?.focus({ preventScroll: true });
    };
    if (immediate || motion.matches || document.documentElement.classList.contains('is-tape-paused')) {
      finish();
      return;
    }
    player.classList.remove('is-playing', 'is-changing');
    player.classList.add('is-ejecting');
    ejectTimer = setTimeout(finish, 300);
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
      clearTimeout(ejectTimer);
      ejectTimer = 0;
      player.classList.remove('is-playing', 'is-changing', 'is-ejecting');
      restore();
      const body = article.querySelector('.card__body');
      active = { article, body, next: body.nextSibling, button, title, summary };
      summary.hidden = false;
      screen.dataset.project = style;
      button.setAttribute('aria-expanded', 'true');
      title.id = 'tape-player-title';
      title.tabIndex = -1;
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
      screen.replaceChildren(body);
      player.hidden = false;
      void player.offsetWidth; // Restart the appropriate transition without restarting the TV.
      player.classList.add(firstPlay ? 'is-playing' : 'is-changing');
      title.focus({ preventScroll: true });
    });
    stacks.append(button);
  });
  // Keep DOM and keyboard order aligned with the leaning final spine.
  stacks.append(stacks.querySelector('.project-tape--art'));
  document.addEventListener('channelchange', () => {
    updateKodlabPreview();
    const image = active?.body.querySelector('.tape-art-preview img');
    const source = active?.article.querySelector('.card__print img');
    if (image && source) image.alt = source.alt;
  });
  player.querySelector('.tape-player__close').addEventListener('click', () => closePlayer());
  player.addEventListener('click', event => {
    if (event.target.closest('a[href^="#"]')) closePlayer(false, true);
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !player.hidden && !document.querySelector('dialog[open]') &&
        (player.contains(document.activeElement) || shelf.contains(document.activeElement))) {
      event.preventDefault();
      closePlayer();
    }
  });
  cards.hidden = true;
  shelf.hidden = false;
})();
