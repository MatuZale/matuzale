// Background processes for the footer: small games that play themselves on the torn-open circuit board.
// Snake is the usual guest; Tetris and Pac-Man drop in now and then. Each game is plain state with a
// tick() that returns the delay until the next tick and a draw() that returns SVG nodes, so the board
// only ever has one set of pixels to replace. Colours come from CSS classes (see style.css), which is
// how the games follow the light / dark theme. Now and then, at random, the game crashes and breaks out
// of the board (crash.js), and the board stays down until the page is loaded again. Loaded on first sight
// of the footer by script.js.

const SVG = "http://www.w3.org/2000/svg";
function node(tag, attributes, text) {
  const element = document.createElementNS(SVG, tag);
  for (const name in attributes) element.setAttribute(name, attributes[name]);
  if (text !== undefined) element.textContent = text;
  return element;
}
const rect = (x, y, w, h, cls, extra = {}) => node("rect", { x, y, width: w, height: h, class: cls, ...extra });
const pick = list => list[Math.floor(Math.random() * list.length)];
const shuffle = list => { for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list; };

/* ───────── Snake ─────────
   A closed route through every cell provides a safe fallback. Shortcuts may approach the food, but
   never pass the tail or reverse the body's route order. */
export function createSnake() {
  const columns = 40, rows = 8, cell = 8, ox = 33, oy = 33, maxLength = 44, goal = 14;
  const cycle = [{ x: 0, y: 0 }];
  for (let y = 0; y < rows; y++) {
    for (let step = 1; step < columns; step++) cycle.push({ x: y % 2 ? columns - step : step, y });
  }
  for (let y = rows - 1; y > 0; y--) cycle.push({ x: 0, y });
  const total = cycle.length;
  const routeIndex = Array.from({ length: rows }, () => Array(columns));
  cycle.forEach((point, i) => { routeIndex[point.y][point.x] = i; });
  const distance = (from, to) => (to - from + total) % total;
  let body = Array.from({ length: 10 }, (_, i) => 166 - i), food = 0, eaten = 0;

  function placeFood() {
    const vacant = cycle.map((_, i) => i).filter(i => !body.includes(i));
    food = pick(vacant);
  }
  placeFood();

  return {
    over: false,
    preview: 0,
    tick() {
      const head = cycle[body[0]], target = cycle[food];
      const gap = distance(body[0], body[body.length - 1]);
      const foodAhead = distance(body[0], food);
      const candidates = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dx, dy]) => {
        const x = head.x + dx, y = head.y + dy;
        if (x < 0 || x >= columns || y < 0 || y >= rows) return null;
        const index = routeIndex[y][x], skip = distance(body[0], index);
        const grows = index === food && body.length < maxLength;
        if (!skip || skip > foodAhead || skip > gap || (skip === gap && grows)) return null;
        return { index, skip, score: Math.abs(x - target.x) + Math.abs(y - target.y) };
      }).filter(Boolean).sort((a, b) => a.score - b.score || b.skip - a.skip);
      // The next cycle cell is always safe while the board has free space.
      const next = candidates[0]?.index ?? (body[0] + 1) % total;
      const ate = next === food;
      body.unshift(next);
      if (!ate || body.length > maxLength) body.pop();
      if (ate) { placeFood(); if (++eaten >= goal) this.over = true; }
      return 110;
    },
    draw() {
      const out = [];
      body.forEach((index, i) => {
        const { x, y } = cycle[index];
        out.push(rect(ox + x * cell, oy + y * cell, 6, 6, i === 0 ? "g-snake circuit-window__head" : "g-snake circuit-window__segment", {
          rx: 1, style: `--t: ${(i / body.length).toFixed(3)}`, opacity: i === 0 ? 1 : (1 - .45 * i / body.length).toFixed(3),
        }));
      });
      const head = cycle[body[0]], neck = cycle[body[1]];
      const dx = head.x - neck.x, dy = head.y - neck.y;
      [-1, 1].forEach(side => out.push(node("circle", {
        cx: ox + 3 + head.x * cell + dx * 1.5 + (dy ? side * 1.3 : 0),
        cy: oy + 3 + head.y * cell + dy * 1.5 + (dx ? side * 1.3 : 0),
        r: .65, class: "g-eye",
      })));
      const target = cycle[food];
      out.push(rect(ox + target.x * cell, oy + target.y * cell, 6, 6, "circuit-window__food", { rx: 1.5 }));
      return out;
    },
  };
}

/* ───────── Tetris ─────────
   A small bag-of-seven player with the usual heuristic (low stack, few holes, flat surface, lines). */
const SHAPES = {
  I: [[0, 0], [1, 0], [2, 0], [3, 0]], O: [[0, 0], [1, 0], [0, 1], [1, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]],
  L: [[2, 0], [0, 1], [1, 1], [2, 1]],
};
const normalise = cells => {
  const x = Math.min(...cells.map(c => c[0])), y = Math.min(...cells.map(c => c[1]));
  return cells.map(([a, b]) => [a - x, b - y]);
};
const ROTATIONS = {};
for (const kind in SHAPES) {
  const list = [], seen = new Set();
  let cells = normalise(SHAPES[kind]);
  for (let i = 0; i < 4; i++) {
    const key = cells.map(c => c.join()).sort().join("|");
    if (!seen.has(key)) { seen.add(key); list.push(cells); }
    cells = normalise(cells.map(([x, y]) => [-y, x]));
  }
  ROTATIONS[kind] = list;
}

export function createTetris() {
  const W = 10, H = 17, cell = 5, ox = 167, oy = 22, goal = 12;
  const grid = Array.from({ length: H }, () => Array(W).fill(""));
  let bag = [], piece = null, plan = null, flash = null, lines = 0, over = false, upcoming = null;

  const fits = (cells, px, py) => cells.every(([x, y]) => {
    const gx = px + x, gy = py + y;
    return gx >= 0 && gx < W && gy < H && (gy < 0 || !grid[gy][gx]);
  });
  const draw7 = () => { if (!bag.length) bag = shuffle([..."IOTSZJL"]); return bag.pop(); };

  function evaluate(cells, px, py) {
    const g = grid.map(row => row.map(Boolean));
    for (const [x, y] of cells) g[py + y][px + x] = true;
    const kept = g.filter(row => !row.every(Boolean));
    const cleared = H - kept.length;
    const board = [...Array.from({ length: cleared }, () => Array(W).fill(false)), ...kept];
    let height = 0, holes = 0, bumpiness = 0, previous = null;
    for (let x = 0; x < W; x++) {
      let top = H;
      for (let y = 0; y < H; y++) if (board[y][x]) { top = y; break; }
      const h = H - top;
      height += h;
      for (let y = top + 1; y < H; y++) if (!board[y][x]) holes++;
      if (previous !== null) bumpiness += Math.abs(h - previous);
      previous = h;
    }
    return -.51 * height + .76 * cleared - .36 * holes - .18 * bumpiness + Math.random() * .05;
  }
  function choose(kind) {
    let best = null;
    ROTATIONS[kind].forEach((cells, r) => {
      const w = 1 + Math.max(...cells.map(c => c[0]));
      for (let px = 0; px + w <= W; px++) {
        if (!fits(cells, px, 0)) continue;
        let py = 0;
        while (fits(cells, px, py + 1)) py++;
        const value = evaluate(cells, px, py);
        if (!best || value > best.value) best = { r, px, value };
      }
    });
    return best;
  }
  function spawn() {
    const kind = upcoming ?? draw7();
    upcoming = draw7();
    const cells = ROTATIONS[kind][0];
    const px = Math.floor((W - (1 + Math.max(...cells.map(c => c[0])))) / 2);
    if (!fits(cells, px, 0)) { over = true; piece = null; return; }
    piece = { kind, r: 0, px, py: 0 };
    plan = choose(kind);
  }
  spawn();

  return {
    get over() { return over || lines >= goal; },
    preview: 90,
    tick() {
      if (flash) {
        if (--flash.n > 0) return 90;
        const kept = grid.filter((_, y) => !flash.rows.includes(y));
        grid.splice(0, H, ...Array.from({ length: H - kept.length }, () => Array(W).fill("")), ...kept);
        flash = null;
        spawn();
        return 70;
      }
      if (!piece) { spawn(); return 70; }
      const rotations = ROTATIONS[piece.kind];
      if (plan) {
        // One manoeuvre per tick, then gravity: it reads as a quick, practised soft drop.
        if (piece.r !== plan.r) {
          const next = (piece.r + 1) % rotations.length;
          if (fits(rotations[next], piece.px, piece.py)) piece.r = next;
        } else if (piece.px !== plan.px) {
          const step = Math.sign(plan.px - piece.px);
          if (fits(rotations[piece.r], piece.px + step, piece.py)) piece.px += step;
        }
      }
      const cells = rotations[piece.r];
      if (fits(cells, piece.px, piece.py + 1)) { piece.py++; return 65; }
      for (const [x, y] of cells) grid[piece.py + y][piece.px + x] = piece.kind;
      piece = null;
      const full = grid.map((row, y) => row.every(Boolean) ? y : -1).filter(y => y >= 0);
      if (full.length) { lines += full.length; flash = { rows: full, n: 3 }; }
      return 90;
    },
    draw() {
      const out = [rect(ox - 1.5, oy - 1.5, W * cell + 3, H * cell + 3, "g-well", { rx: 1 })];
      const block = (x, y, kind, size = cell, cls = "") => rect(ox + x * size + .4, oy + y * size + .4, size - .8, size - .8, `g-block g-block--${kind} ${cls}`, { rx: .6 });
      grid.forEach((row, y) => row.forEach((kind, x) => {
        if (kind) out.push(block(x, y, kind, cell, flash?.rows.includes(y) ? "is-flash" : ""));
      }));
      if (piece) for (const [x, y] of ROTATIONS[piece.kind][piece.r]) out.push(block(piece.px + x, piece.py + y, piece.kind));
      // Silkscreen beside the well: the next piece and the line count.
      const nx = ox + W * cell + 9, ny = oy + 11;
      out.push(node("text", { x: nx, y: oy + 4, class: "g-text" }, "NEXT"));
      for (const [x, y] of ROTATIONS[upcoming][0]) out.push(rect(nx + x * 4 + .3, ny + y * 4 + .3, 3.4, 3.4, `g-block g-block--${upcoming}`, { rx: .5 }));
      out.push(node("text", { x: ox - 40, y: oy + 4, class: "g-text" }, "LINES"));
      out.push(node("text", { x: ox - 40, y: oy + 12, class: "g-text g-text--value" }, String(lines).padStart(2, "0")));
      return out;
    },
  };
}

/* ───────── Pac-Man ─────────
   A 39 × 11 maze with a tunnel through the middle row. Pac-Man looks for pellets and keeps away from
   the ghosts, eating them while the power pellets last; the ghosts chase by the classic rule of
   picking the turn that ends nearest their target. */
const MAZE = [
  "#######################################",
  "#o...................................o#",
  "#.####..######..#######..######..####.#",
  "#.....................................#",
  "#...######..####.#####.####..######...#",
  " ................#####................ ",
  "#...######..####.#####.####..######...#",
  "#.....................................#",
  "#.####..######..#######..######..####.#",
  "#o...................................o#",
  "#######################################",
];
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

export function createPacman() {
  const W = 39, H = 11, cell = 7, ox = 55, oy = 26, scaredFor = 36;
  const wall = MAZE.map(row => [...row].map(ch => ch === "#"));
  const pellets = MAZE.map(row => [...row].map(ch => ch === "." ? 1 : ch === "o" ? 2 : 0));
  let left = pellets.flat().filter(Boolean).length;
  const isOpen = (c, r) => r >= 0 && r < H && !wall[r][(c + W) % W];
  const wrap = c => (c + W) % W;
  const start = { c: 19, r: 9 };
  const homes = [{ c: 37, r: 1 }, { c: 37, r: 9 }, { c: 19, r: 1 }];
  const pac = { ...start, dir: 2, prev: { ...start } };
  const ghosts = homes.map((home, i) => ({ ...home, home, dir: 2, prev: { ...home }, state: "chase", timer: 0, wait: i * 22 }));
  let ticks = 0, lives = 3, score = 0, dying = 0, finish = 0, over = false;

  // Breadth-first distances from a cell, through the tunnel.
  function distances(c, r) {
    const map = Array.from({ length: H }, () => Array(W).fill(-1));
    map[r][c] = 0;
    const queue = [[c, r]];
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      for (const [dx, dy] of DIRS) {
        const nx = wrap(x + dx), ny = y + dy;
        if (isOpen(nx, ny) && map[ny][nx] < 0) { map[ny][nx] = map[y][x] + 1; queue.push([nx, ny]); }
      }
    }
    return map;
  }
  const nearest = (map, wanted) => {
    let best = 99;
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (pellets[r][c] >= wanted && map[r][c] >= 0 && map[r][c] < best) best = map[r][c];
    return best;
  };

  function steerPac() {
    const hunters = ghosts.filter(g => g.state === "chase" && g.wait <= 0).map(g => ({ ghost: g, map: distances(g.c, g.r) }));
    const danger = hunters.some(({ map }) => map[pac.r][pac.c] >= 0 && map[pac.r][pac.c] <= 9);
    let best = null;
    DIRS.forEach(([dx, dy], dir) => {
      const c = wrap(pac.c + dx), r = pac.r + dy;
      if (!isOpen(c, r)) return;
      const here = distances(c, r);
      // With a hunter close by, a power pellet is worth a detour.
      let value = -(danger ? Math.min(nearest(here, 1), nearest(here, 2) - 6) : nearest(here, 1));
      for (const { map } of hunters) {
        const d = map[r][c];
        if (d >= 0 && d <= 1) value -= 500;
        else if (d >= 0 && d <= 5) value -= (6 - d) * 14;
      }
      for (const g of ghosts) {
        if (g.state !== "scared") continue;
        const d = here[g.r][g.c];
        if (d >= 0 && d <= g.timer - 2) value += 36 - 3 * d;
      }
      if (dir === (pac.dir + 2) % 4) value -= 1.5;
      value += Math.random() * .4;
      if (!best || value > best.value) best = { dir, value };
    });
    return best ? best.dir : pac.dir;
  }
  function target(g, i) {
    if (g.state === "eyes") return g.home;
    if (i === 1) return { c: Math.max(0, Math.min(W - 1, pac.c + DIRS[pac.dir][0] * 4)), r: Math.max(0, Math.min(H - 1, pac.r + DIRS[pac.dir][1] * 4)) };
    if (i === 2) { const d = Math.hypot(g.c - pac.c, g.r - pac.r); return d > 9 ? pac : { c: 1, r: H - 2 }; }
    return pac;
  }
  function stepGhost(g, i) {
    const options = DIRS.map(([dx, dy], dir) => ({ dir, c: wrap(g.c + dx), r: g.r + dy }))
      .filter(o => isOpen(o.c, o.r) && o.dir !== (g.dir + 2) % 4);
    if (!options.length) { g.dir = (g.dir + 2) % 4; return; }
    let choice;
    if (g.state === "scared") choice = pick(options);
    else {
      const goal = target(g, i);
      choice = options.map(o => ({ ...o, d: (o.c - goal.c) ** 2 + (o.r - goal.r) ** 2 + Math.random() * .3 })).sort((a, b) => a.d - b.d)[0];
    }
    g.prev = { c: g.c, r: g.r };
    g.c = choice.c; g.r = choice.r; g.dir = choice.dir;
  }
  function meet() {
    for (const g of ghosts) {
      if (g.wait > 0 || g.state === "eyes") continue;
      const same = g.c === pac.c && g.r === pac.r;
      const swapped = g.c === pac.prev.c && g.r === pac.prev.r && g.prev.c === pac.c && g.prev.r === pac.r;
      if (!same && !swapped) continue;
      if (g.state === "scared") { g.state = "eyes"; g.timer = 9; score += 200; }
      else { dying = 7; return; }
    }
  }
  function reset() {
    Object.assign(pac, start, { dir: 2, prev: { ...start } });
    ghosts.forEach((g, i) => Object.assign(g, g.home, { prev: { ...g.home }, dir: 2, state: "chase", timer: 0, wait: 14 + i * 22 }));
  }

  return {
    get over() { return over; },
    preview: 40,
    tick() {
      ticks++;
      if (dying) {
        if (--dying === 0) { if (--lives <= 0) over = true; else reset(); }
        return 110;
      }
      if (finish) { if (--finish === 0) over = true; return 140; }
      pac.prev = { c: pac.c, r: pac.r };
      pac.dir = steerPac();
      pac.c = wrap(pac.c + DIRS[pac.dir][0]); pac.r += DIRS[pac.dir][1];
      const eaten = pellets[pac.r][pac.c];
      if (eaten) {
        pellets[pac.r][pac.c] = 0; left--; score += eaten === 2 ? 50 : 10;
        if (eaten === 2) ghosts.forEach(g => { if (g.state === "chase") { g.state = "scared"; g.timer = scaredFor; g.dir = (g.dir + 2) % 4; } });
        if (!left) { finish = 8; return 140; }
      }
      meet();
      if (dying) return 110;
      ghosts.forEach((g, i) => {
        if (g.wait > 0) { g.wait--; return; }
        if (g.state === "eyes") { if (--g.timer <= 0) Object.assign(g, g.home, { prev: { ...g.home }, state: "chase", wait: 6 }); return; }
        if (g.state === "scared" && --g.timer <= 0) g.state = "chase";
        // Ghosts are a little slower than Pac-Man, and the frightened ones slower still.
        if (g.state === "scared" ? ticks % 2 : ticks % 5 === 0) return;
        stepGhost(g, i);
      });
      meet();
      return 130;
    },
    draw() {
      const out = [];
      let d = "";
      const cx = c => ox + c * cell + cell / 2, cy = r => oy + r * cell + cell / 2;
      for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
        if (!wall[r][c]) continue;
        if (c + 1 < W && wall[r][c + 1]) d += `M${cx(c)} ${cy(r)}H${cx(c + 1)}`;
        if (r + 1 < H && wall[r + 1][c]) d += `M${cx(c)} ${cy(r)}V${cy(r + 1)}`;
      }
      out.push(node("path", { d, class: finish && ticks % 2 ? "g-wall is-flash" : "g-wall" }));
      for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
        const p = pellets[r][c];
        if (p === 1) out.push(node("circle", { cx: cx(c), cy: cy(r), r: .9, class: "g-pellet" }));
        else if (p === 2) out.push(node("circle", { cx: cx(c), cy: cy(r), r: ticks % 8 < 4 ? 2.2 : 1.6, class: "g-pellet" }));
      }
      // Pac-Man: a wedge whose mouth opens and closes, or folds away when he is caught.
      const px = cx(pac.c), py = cy(pac.r), radius = 3.1;
      const mouth = dying ? (8 - dying) * 24 : ticks % 2 ? 6 : 36;
      const a = pac.dir * 90, rad = deg => deg * Math.PI / 180;
      const p1 = [px + radius * Math.cos(rad(a + mouth)), py + radius * Math.sin(rad(a + mouth))];
      const p2 = [px + radius * Math.cos(rad(a - mouth)), py + radius * Math.sin(rad(a - mouth))];
      out.push(node("path", { d: `M${px} ${py}L${p1[0].toFixed(2)} ${p1[1].toFixed(2)}A${radius} ${radius} 0 1 1 ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}Z`, class: "g-pac" }));
      if (!dying) ghosts.forEach((g, i) => {
        const gx = ox + g.c * cell, gy = oy + g.r * cell;
        const [dx, dy] = DIRS[g.dir];
        const flashing = g.state === "scared" && g.timer < 10 && g.timer % 2;
        if (g.state !== "eyes") out.push(node("path", {
          d: "M.4 6.6V3.5a3.1 3.1 0 0 1 6.2 0v3.1l-1.03-1-1.03 1-1.04-1-1.03 1-1.03-1-1.04 1Z",
          transform: `translate(${gx} ${gy})`,
          class: g.state === "scared" ? `g-ghost g-ghost--scared${flashing ? " is-ending" : ""}` : `g-ghost g-ghost--${i}`,
        }));
        for (const side of [-1, 1]) {
          out.push(node("circle", { cx: gx + 3.5 + side * 1.2, cy: gy + 3.1, r: .95, class: "g-ghost-eye" }));
          out.push(node("circle", { cx: gx + 3.5 + side * 1.2 + dx * .45, cy: gy + 3.1 + dy * .45, r: .45, class: "g-ghost-pupil" }));
        }
      });
      return out;
    },
  };
}

/* ───────── The footer board ───────── */
const GAMES = { snake: createSnake, tetris: createTetris, pacman: createPacman };
const WEIGHTS = [["snake", 6], ["tetris", 2], ["pacman", 2]];
const TITLES = { snake: "Snake", tetris: "Tetris", pacman: "Pac-Man" };
const label = name => name === "pacman" ? "pac-man" : name;            // as the caption shows it

// The crash comes at random, like the rare events above Journey: at every moment of play the same small
// chance, on average once in 90 s of play (about one in four sees it within 30 s), never in a game's first
// seconds. document.getElementById("footer-game").crash() brings it on from the console.
const CRASH_MEAN = 90000, CRASH_AFTER = 4000;

function chooseGame() {
  let roll = Math.random() * WEIGHTS.reduce((sum, [, w]) => sum + w, 0);
  for (const [name, weight] of WEIGHTS) { if ((roll -= weight) < 0) return name; }
  return "snake";
}

export function startFooterGames({ board, pixels, toggle, caption }) {
  const figure = board.closest("figure");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let name, game, runtime = 0, delay = 110, timer = 0, visible = false, paused = motion.matches, crashing = false;

  function draw() { pixels.replaceChildren(...game.draw()); }
  function start(next) {
    name = next;
    game = GAMES[name]();
    runtime = 0;
    delay = 110;
    // Reduced motion shows one still frame, so give it a game already under way.
    if (paused) for (let i = 0; i < game.preview; i++) game.tick();
    caption.textContent = label(name);
    board.setAttribute("aria-label", `A little ${TITLES[name]} game playing itself beneath a torn-open circuit board`);
    updateToggle();
    draw();
  }
  function step() {
    delay = game.tick();
    runtime += delay;
    // A session ends when the game does, or after a while; the next one is drawn by the same weights.
    if (game.over || runtime > 70000) start(chooseGame());
    else if (runtime > CRASH_AFTER && Math.random() < 1 - Math.exp(-delay / CRASH_MEAN)) { breakDown(); return; }
    else draw();
    schedule();
  }
  // A crash is final: no more ticks, nothing to pause, and the core dump stays on the board.
  function breakDown() {
    if (crashing || motion.matches) return;
    crashing = true;
    schedule();
    draw();
    toggle.hidden = true;
    import("./crash.js")
      .then(module => module.crash({ figure, board, pixels, caption, name: label(name) }))
      .catch(error => console.error(error))
      .finally(() => {
        figure.classList.add("is-crashed");
        board.setAttribute("aria-label", `The little ${TITLES[name]} game beneath the circuit board has crashed`);
      });
  }
  board.crash = breakDown;
  // The service remote (remote.js) picks a game: it starts afresh and plays, even if it was paused. A
  // crashed board stays down.
  board.play = next => {
    if (crashing || !GAMES[next]) return false;
    if (!motion.matches) paused = false;
    start(next);
    return true;
  };
  function schedule() {
    clearTimeout(timer);
    timer = 0;
    const running = visible && !document.hidden && !paused && !crashing;
    figure.classList.toggle("is-paused", !running && !crashing);
    if (running) timer = setTimeout(step, delay);
  }
  function updateToggle() {
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", `${paused ? "Play" : "Pause"} ${TITLES[name]} animation`);
    toggle.textContent = paused ? "play ▷" : "pause Ⅱ";
    schedule();
  }
  toggle.hidden = false;
  toggle.addEventListener("click", () => { paused = !paused; updateToggle(); });
  motion.addEventListener("change", event => { if (event.matches) { paused = true; updateToggle(); } });
  document.addEventListener("visibilitychange", schedule);
  window.addEventListener("pagehide", () => { clearTimeout(timer); timer = 0; });
  window.addEventListener("pageshow", schedule);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, { threshold: .1 }).observe(board);
  } else {
    const check = () => {
      const rect = board.getBoundingClientRect();
      visible = rect.bottom > 0 && rect.top < window.innerHeight;
      schedule();
    };
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    check();
  }
  start(chooseGame());
}
