// CH 04, an easter egg on the AV input: Spacewar!, after the 1962 original for the PDP-1, round a black hole.
// Two ships, the needle and the wedge, duel in its gravity: an inverse-square pull, limited fuel and 32
// torpedoes, three jumps into hyperspace, each riskier than the last, stars drifting behind, and space
// wrapping round the edges of a square field seen through a round tube (the corners fall outside it, as on
// the original display). One player flies the needle against the computer for a high score; two share the
// keyboard. Drawn as a vector display with phosphor afterglow under AV glass. High scores stay in this
// browser and can be saved to a file. Desktop only; opened by channels.js (key 4, or CH 04, in AV).

const GM = .06;                 // the hole's pull (screen half-width = 1)
const HOLE = .045;              // fall closer than this and the ship is gone
const THRUST = .32, TURN = 3.4, FUEL_USE = .085;
const TORPS = 32, TORP_SPEED = .75, TORP_LIFE = 1.9, RELOAD = .22;
const JUMPS = 3, SHIP_R = .034, STEP = 1 / 120, ROUND_LIMIT = 120;
const PHOSPHOR = "#d8f6ff", GLOW = "#5dffb0";
const STORE = "spacewar-scores", INITIALS = "spacewar-initials";

// Outlines, nose along +x.
const NEEDLE = [[.065, 0], [.005, .01], [-.044, .01], [-.06, .02], [-.06, -.02], [-.044, -.01], [.005, -.01]];
const WEDGE = [[.055, 0], [-.042, .031], [-.024, 0], [-.042, -.031]];

// Keys by event.code. Alone against the computer, the needle answers to either set.
const PADS = {
  needle: { left: ["KeyA"], right: ["KeyD"], thrust: ["KeyW"], fire: ["KeyS", "Space"], hyper: ["KeyQ"] },
  wedge: { left: ["ArrowLeft"], right: ["ArrowRight"], thrust: ["ArrowUp"], fire: ["ArrowDown"], hyper: ["Enter", "NumpadEnter"] },
};
const SOLO = Object.fromEntries(Object.keys(PADS.needle).map(k => [k, [...PADS.needle[k], ...PADS.wedge[k]]]));
const GAME_KEYS = new Set(Object.values(SOLO).flat());

const TEXT = {
  en: {
    model: "CH 04 · after MIT, 1962", help: "? How to play", scores: "High scores", exit: "✕ Exit",
    mode: n => `Players: ${n}`, cpu: "WEDGE · CPU", wedge: "WEDGE", needle: "NEEDLE",
    start: "PRESS ENTER TO START", hint: "M  1 / 2 PLAYERS   ·   ?  HOW TO PLAY", paused: "PAUSED",
    round: n => `ROUND ${n}`, score: "SCORE", cleared: n => `ROUND ${n} CLEARED`, draw: "DRAW",
    needleWins: "NEEDLE WINS", wedgeWins: "WEDGE WINS", over: "GAME OVER", best: "HI",
    newBest: "New high score", initials: "Your initials", save: "Save", empty: "No scores yet. Be the first.",
    file: "Save to file (.json)", back: "Back", table: ["#", "Name", "Score", "Round", "Date"],
    helpHTML: `<h3>How to play</h3>
      <p>Two ships duel round a black hole. Its gravity pulls on everything, ships and torpedoes alike: fall in and you are gone. Fly off one edge and you come back on the other.</p>
      <table><tr><th></th><th>Needle (you)</th><th>Wedge (2nd player)</th></tr>
      <tr><td>Rotate</td><td><kbd>A</kbd> <kbd>D</kbd></td><td><kbd>←</kbd> <kbd>→</kbd></td></tr>
      <tr><td>Thrust</td><td><kbd>W</kbd></td><td><kbd>↑</kbd></td></tr>
      <tr><td>Fire</td><td><kbd>S</kbd> <kbd>Space</kbd></td><td><kbd>↓</kbd></td></tr>
      <tr><td>Hyperspace</td><td><kbd>Q</kbd></td><td><kbd>Enter</kbd></td></tr></table>
      <p>Alone, you fly the needle with either set of keys against the computer's wedge, round after round; it gets sharper each time. A round is worth 1000 × its number, plus whatever fuel, torpedoes and jumps you have left. Lose one and the game is over.</p>
      <p>Fuel and torpedoes (32) are limited. Hyperspace has three jumps and each is riskier than the last: the ship may break up on the way back.</p>
      <p><kbd>P</kbd> pause · <kbd>M</kbd> 1 / 2 players · <kbd>Esc</kbd> back, then exit</p>
      <p class="sw__note">High scores are kept only in this browser (local storage) and are never sent anywhere. To keep them elsewhere, use “Save to file” under High scores.</p>
      <p class="sw__credit">After Spacewar! (1962), conceived by the Hingham Institute Study Group on Space Warfare and first realized on the PDP-1 at MIT by Stephen Russell, Peter Samson, Dan Edwards and Martin Graetz, with Alan Kotok, Steve Piner and Robert A. Saunders. This version is written from scratch, with a black hole for the star.</p>`,
  },
  pl: {
    model: "CH 04 · wg MIT, 1962", help: "? Jak grać", scores: "Wyniki", exit: "✕ Wyjdź",
    mode: n => `Graczy: ${n}`, cpu: "WEDGE · KOMPUTER", wedge: "WEDGE", needle: "NEEDLE",
    start: "ENTER, ŻEBY ZACZĄĆ", hint: "M  1 / 2 GRACZY   ·   ?  JAK GRAĆ", paused: "PAUZA",
    round: n => `RUNDA ${n}`, score: "WYNIK", cleared: n => `RUNDA ${n} WYGRANA`, draw: "REMIS",
    needleWins: "WYGRYWA NEEDLE", wedgeWins: "WYGRYWA WEDGE", over: "KONIEC GRY", best: "REKORD",
    newBest: "Nowy rekord", initials: "Twoje inicjały", save: "Zapisz", empty: "Jeszcze nikt nie grał. Bądź pierwszy.",
    file: "Zapisz do pliku (.json)", back: "Wróć", table: ["#", "Gracz", "Wynik", "Runda", "Data"],
    helpHTML: `<h3>Jak grać</h3>
      <p>Dwa statki walczą wokół czarnej dziury. Jej grawitacja przyciąga wszystko, statki i torpedy: kto wpadnie, przepada. Kto wyleci za krawędź, wraca z drugiej strony.</p>
      <table><tr><th></th><th>Needle (Ty)</th><th>Wedge (drugi gracz)</th></tr>
      <tr><td>Obrót</td><td><kbd>A</kbd> <kbd>D</kbd></td><td><kbd>←</kbd> <kbd>→</kbd></td></tr>
      <tr><td>Ciąg</td><td><kbd>W</kbd></td><td><kbd>↑</kbd></td></tr>
      <tr><td>Strzał</td><td><kbd>S</kbd> <kbd>Spacja</kbd></td><td><kbd>↓</kbd></td></tr>
      <tr><td>Hiperprzestrzeń</td><td><kbd>Q</kbd></td><td><kbd>Enter</kbd></td></tr></table>
      <p>W pojedynkę sterujesz needle dowolnym zestawem klawiszy przeciw wedge komputera, runda po rundzie; z każdą rundą komputer gra lepiej. Runda jest warta 1000 × jej numer plus to, co zostało z paliwa, torped i skoków. Jedna przegrana kończy grę.</p>
      <p>Paliwo i torpedy (32) się kończą. Hiperprzestrzeń ma trzy skoki, każdy bardziej ryzykowny: statek może rozpaść się w drodze powrotnej.</p>
      <p><kbd>P</kbd> pauza · <kbd>M</kbd> 1 / 2 graczy · <kbd>Esc</kbd> wstecz, potem wyjście</p>
      <p class="sw__note">Wyniki zapisują się tylko w tej przeglądarce (local storage) i nigdzie nie są wysyłane. Żeby je zachować gdzie indziej, użyj „Zapisz do pliku” w Wynikach.</p>
      <p class="sw__credit">Według Spacewar! (1962), wymyślonej przez Hingham Institute Study Group on Space Warfare i pierwszy raz uruchomionej na PDP-1 w MIT przez Stephena Russella, Petera Samsona, Dana Edwardsa i Martina Graetza wraz z Alanem Kotokiem, Steve'em Pinerem i Robertem A. Saundersem. Ta wersja jest napisana od zera, z czarną dziurą zamiast gwiazdy.</p>`,
  },
};
const say = () => TEXT[document.documentElement.lang === "pl" ? "pl" : "en"];

/* ───────── Physics ───────── */

const rand = (a, b) => a + Math.random() * (b - a);
function pull(x, y) {
  const r2 = Math.max(x * x + y * y, .0009), k = -GM / (r2 * Math.sqrt(r2));
  return [k * x, k * y];
}
function wrap(o) {
  if (o.x > 1) o.x -= 2; else if (o.x < -1) o.x += 2;
  if (o.y > 1) o.y -= 2; else if (o.y < -1) o.y += 2;
}
// On a gentle ellipse round the hole, heading along it.
function makeShip(kind, x, y) {
  const r = Math.hypot(x, y), v = .22;
  return { kind, x, y, vx: -y / r * v, vy: x / r * v, a: Math.atan2(x, -y), fuel: 1, torps: TORPS, jumps: JUMPS,
    reload: 0, alive: true, gone: 0, burn: false };
}

/* ───────── The game ───────── */

let dialog, canvas, ctx, screen, panel, readouts, scoreEl, modeBtn, dpr = 1;
let state = "title", players = 1, round = 1, score = 0, wins = [0, 0], roundTime = 0, timer = 0, message = "";
let ships = [], torps = [], sparks = [], stars = [], paused = false, raf = 0, last = 0, acc = 0, refresh = 0;
const held = new Set(), tapped = new Set();
const brain = { jitter: 0, retarget: 0, cool: 1.2 };

const stored = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { return []; } };
const keep = list => { try { localStorage.setItem(STORE, JSON.stringify(list)); } catch (e) { /* storage unavailable */ } };

function newRound() {
  ships = [makeShip("needle", .6, .35), makeShip("wedge", -.6, -.35)];
  torps = []; roundTime = 0; brain.cool = 1.2; tapped.clear();
  state = "play";
}
function start() {
  closePanel();
  round = 1; score = 0; wins = [0, 0]; sparks = [];
  newRound();
  canvas.focus();
}

function pad(map) {
  const any = codes => codes.some(code => held.has(code));
  return { left: any(map.left), right: any(map.right), thrust: any(map.thrust), fire: any(map.fire),
    hyper: map.hyper.some(code => tapped.has(code)) };
}
// The computer's wedge: keep off the hole, lead the needle, fire when lined up; sharper every round.
function think(me, foe, dt) {
  const c = { left: false, right: false, thrust: false, fire: false, hyper: false };
  if (!me.alive || me.gone > 0) return c;
  const skill = Math.min(1, (round - 1) / 6), r = Math.hypot(me.x, me.y), vr = (me.x * me.vx + me.y * me.vy) / r;
  brain.cool -= dt; brain.retarget -= dt;
  if (brain.retarget <= 0) { brain.jitter = (Math.random() - .5) * (.5 - .42 * skill); brain.retarget = .5; }
  let want = me.a, d = Infinity, escaping = false;
  if ((r < .34 && vr < .06) || r < .2) {
    const sense = Math.sign(-me.y * me.vx + me.x * me.vy) || 1;
    want = Math.atan2(me.x * sense / r + .7 * me.y / r, -me.y * sense / r + .7 * me.x / r);
    escaping = true;
    c.hyper = r < .09 && vr < 0 && me.jumps > 0;
  } else if (foe.alive && foe.gone <= 0) {
    const dx = foe.x - me.x, dy = foe.y - me.y, t = (d = Math.hypot(dx, dy)) / TORP_SPEED;
    want = Math.atan2(dy + (foe.vy - me.vy) * t, dx + (foe.vx - me.vx) * t) + brain.jitter;
  }
  const diff = Math.atan2(Math.sin(want - me.a), Math.cos(want - me.a));
  c.left = diff < -.04; c.right = diff > .04;
  c.thrust = escaping ? Math.abs(diff) < 1.2 : Math.hypot(me.vx, me.vy) < .07 && me.fuel > .25 && Math.abs(diff) < .4;
  if (d < 1.15 && Math.abs(diff) < .1 && brain.cool <= 0 && me.torps > 0) { c.fire = true; brain.cool = .95 - .55 * skill; }
  return c;
}

function burst(x, y, n, speed, life) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, 2 * Math.PI), v = rand(.15, 1) * speed;
    sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(.4, 1) * life });
  }
}
function explode(s) {
  if (!s.alive) return;
  s.alive = false;
  burst(s.x, s.y, 46, .3, 1.4);
}
function reenter(s) {
  const a = rand(0, 2 * Math.PI), r = rand(.45, .85), heading = rand(0, 2 * Math.PI);
  s.x = Math.cos(a) * r; s.y = Math.sin(a) * r; s.vx = Math.cos(heading) * .1; s.vy = Math.sin(heading) * .1;
  burst(s.x, s.y, 10, .08, .5);
  // Each jump is riskier than the last: 4 %, then 16 %, then 28 %.
  if (Math.random() < .04 + .12 * (JUMPS - 1 - s.jumps)) explode(s);
}

function fly(s, c, dt) {
  if (!s.alive) return;
  if (s.gone > 0) { s.gone -= dt; if (s.gone <= 0) reenter(s); return; }
  if (c.left) s.a -= TURN * dt;
  if (c.right) s.a += TURN * dt;
  s.burn = c.thrust && s.fuel > 0;
  if (s.burn) {
    s.vx += Math.cos(s.a) * THRUST * dt; s.vy += Math.sin(s.a) * THRUST * dt;
    s.fuel = Math.max(0, s.fuel - FUEL_USE * dt);
  }
  const [gx, gy] = pull(s.x, s.y);
  s.vx += gx * dt; s.vy += gy * dt;
  s.x += s.vx * dt; s.y += s.vy * dt; wrap(s);
  s.reload -= dt;
  if (c.fire && s.reload <= 0 && s.torps > 0) {
    s.torps--; s.reload = RELOAD;
    const cx = Math.cos(s.a), cy = Math.sin(s.a);
    torps.push({ x: s.x + cx * .068, y: s.y + cy * .068, vx: s.vx + cx * TORP_SPEED, vy: s.vy + cy * TORP_SPEED, life: TORP_LIFE, owner: s, age: 0 });
  }
  if (c.hyper && s.jumps > 0) { s.jumps--; s.gone = .8; s.burn = false; burst(s.x, s.y, 10, .08, .5); }
  if (Math.hypot(s.x, s.y) < HOLE) explode(s);
}

function update(dt) {
  for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  sparks = sparks.filter(p => p.life > 0);
  for (const st of stars) { st.x -= .006 * dt; if (st.x < -1) st.x += 2; }
  if (state === "title" || state === "done" || paused) return;

  if (state === "play" || state === "ending") {
    const controls = players === 1 ? [pad(SOLO), think(ships[1], ships[0], dt)] : [pad(PADS.needle), pad(PADS.wedge)];
    ships.forEach((s, i) => fly(s, controls[i], dt));
    tapped.clear();
    for (const t of torps) {
      const [gx, gy] = pull(t.x, t.y);
      t.vx += gx * dt; t.vy += gy * dt; t.x += t.vx * dt; t.y += t.vy * dt; wrap(t);
      t.life -= dt; t.age += dt;
      if (Math.hypot(t.x, t.y) < HOLE) t.life = 0;
      for (const s of ships) {
        if (t.life > 0 && s.alive && s.gone <= 0 && (s !== t.owner || t.age > .3) && Math.hypot(s.x - t.x, s.y - t.y) < SHIP_R + .006) {
          t.life = 0; explode(s);
        }
      }
    }
    torps = torps.filter(t => t.life > 0);
    const [a, b] = ships;
    if (a.alive && b.alive && a.gone <= 0 && b.gone <= 0 && Math.hypot(a.x - b.x, a.y - b.y) < SHIP_R * 2) { explode(a); explode(b); }
    roundTime += dt;
    if (state === "play" && (ships.some(s => !s.alive) || roundTime > ROUND_LIMIT)) { state = "ending"; timer = 1.6; }
  }
  if (state === "ending" || state === "between" || state === "over") {
    timer -= dt;
    if (timer > 0) return;
    if (state === "ending") settle();
    else if (state === "between") newRound();
    else finish();
  }
}

// Who won the round, and what follows.
function settle() {
  const t = say(), [n, w] = ships.map(s => s.alive);
  timer = 2.4;
  if (players === 2) {
    if (n && !w) wins[0]++;
    if (w && !n) wins[1]++;
    message = n === w ? t.draw : n ? t.needleWins : t.wedgeWins;
    state = "between";
  } else if (n && !w) {
    const s = ships[0], gain = 1000 * round + 20 * s.torps + Math.round(500 * s.fuel) + 100 * s.jumps;
    score += gain;
    message = `${t.cleared(round)}  +${gain}`;
    round++;
    state = "between";
  } else if (n === w) {
    message = t.draw;
    state = "between";
  } else {
    message = t.over;
    state = "over";
  }
}
function finish() {
  state = "done";
  const list = stored();
  if (players === 1 && score > 0 && (list.length < 10 || score > list[list.length - 1].score)) askInitials();
  else if (players === 1) showScores();
}

/* ───────── Drawing ───────── */

function draw() {
  const W = canvas.width, h = W / 2, t = say();
  if (!W) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  // Phosphor afterglow: the last frames fade instead of vanishing.
  ctx.fillStyle = "rgba(1, 6, 4, .3)"; ctx.fillRect(0, 0, W, W);
  ctx.setTransform(h, 0, 0, h, h, h);
  const px = 1 / h;

  ctx.fillStyle = PHOSPHOR;
  for (const st of stars) { ctx.globalAlpha = st.b * rand(.5, .7); ctx.fillRect(st.x, st.y, 1.5 * dpr * px, 1.5 * dpr * px); }
  ctx.globalAlpha = 1;

  // The hole eats the afterglow that crosses it; a faint ring and a few flickering sparks mark it.
  ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(0, 0, .04, 0, 2 * Math.PI); ctx.fill();
  ctx.shadowColor = GLOW; ctx.shadowBlur = 8 * dpr;
  ctx.strokeStyle = PHOSPHOR; ctx.lineWidth = 1.3 * dpr * px; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.globalAlpha = rand(.3, .55); ctx.beginPath(); ctx.arc(0, 0, .047, 0, 2 * Math.PI); ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = rand(0, 2 * Math.PI), r = rand(.05, .075);
    ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(a) * (r + .008), Math.sin(a) * (r + .008));
  }
  ctx.globalAlpha = .8; ctx.stroke();
  ctx.globalAlpha = 1;

  if (state !== "title") {
    ctx.lineWidth = 2 * dpr * px;
    for (const s of ships) {
      if (!s.alive || s.gone > 0) continue;
      const cos = Math.cos(s.a), sin = Math.sin(s.a), at = ([x, y]) => [s.x + x * cos - y * sin, s.y + x * sin + y * cos];
      ctx.beginPath();
      (s.kind === "needle" ? NEEDLE : WEDGE).map(at).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath(); ctx.stroke();
      if (s.burn) {
        const back = s.kind === "needle" ? -.06 : -.03;
        ctx.beginPath(); ctx.moveTo(...at([back, 0])); ctx.lineTo(...at([back - rand(.02, .055), 0])); ctx.stroke();
      }
    }
    ctx.fillStyle = PHOSPHOR;
    for (const p of torps) { ctx.beginPath(); ctx.arc(p.x, p.y, 2 * dpr * px, 0, 2 * Math.PI); ctx.fill(); }
  }
  for (const p of sparks) { ctx.globalAlpha = Math.min(1, p.life * 1.5); ctx.fillRect(p.x, p.y, 2 * dpr * px, 2 * dpr * px); }
  ctx.globalAlpha = 1;

  // Words, in the tube's own lettering.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = PHOSPHOR;
  const write = (text, y, size, alpha = 1) => { ctx.globalAlpha = alpha; ctx.font = `${Math.round(W * size)}px VT323, monospace`; ctx.fillText(text, h, h + y * h); };
  if (state === "title") {
    write("SPACEWAR!", -.36, .12);
    write("1962 · PDP-1", -.22, .04, .7);
    const best = stored()[0];
    if (best) write(`${t.best} ${String(best.score).padStart(6, "0")} ${best.name}`, .3, .04, .8);
    if (Math.floor(performance.now() / 600) % 2) write(t.start, .44, .045);
    write(t.hint, .56, .032, .6);
  } else if (state === "between" || state === "over" || state === "done") {
    write(state === "between" ? message : t.over, -.3, .06);
    if (players === 1) write(`${t.score} ${String(score).padStart(6, "0")}`, -.18, .045, .85);
    if (state === "done") write(t.start, .44, .045, Math.floor(performance.now() / 600) % 2 ? 1 : .35);
  } else if (state === "play" && roundTime < 1.6) {
    write(players === 1 ? t.round(round) : `${wins[0]} : ${wins[1]}`, -.3, .06, 1 - roundTime / 1.6);
  }
  if (paused && state !== "title") write(t.paused, 0, .07);
  ctx.globalAlpha = 1;
}

function showReadouts() {
  const t = say(), bar = f => "▮".repeat(Math.ceil(f * 8)).padEnd(8, "·");
  ships.forEach((s, i) => {
    const name = i ? (players === 1 ? t.cpu : t.wedge) : t.needle;
    readouts[i].textContent = state === "title" ? name : `${name}\nT${String(s.torps).padStart(2, "0")} F${bar(s.fuel)} H${s.jumps}`;
  });
  if (!ships.length) readouts.forEach((el, i) => { el.textContent = i ? (players === 1 ? t.cpu : t.wedge) : t.needle; });
  scoreEl.textContent = players === 1 ? `${t.score} ${String(score).padStart(6, "0")}\n${t.round(round)}` : `${wins[0]} : ${wins[1]}`;
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  acc += Math.min((now - last) / 1000, .1);
  last = now;
  while (acc >= STEP) { update(STEP); acc -= STEP; }
  draw();
  if (now > refresh) { showReadouts(); refresh = now + 150; }
}

/* ───────── Panels: how to play, high scores, initials ───────── */

function openPanel(html, kind) {
  panel.innerHTML = html;
  panel.dataset.kind = kind;
  panel.hidden = false;
  paused = state === "play" || state === "ending";
  panel.querySelector("input, button")?.focus() ?? panel.focus();
}
function closePanel() {
  if (panel.hidden) return;
  panel.hidden = true;
  paused = false;
  canvas.focus();
}
const toggleHelp = () => panel.dataset.kind === "help" && !panel.hidden ? closePanel() : openPanel(say().helpHTML, "help");

function showScores(highlight = -1) {
  const t = say(), list = stored(), lang = document.documentElement.lang || "en";
  const rows = list.map((e, i) => `<tr${i === highlight ? ' class="is-new"' : ""}><td>${i + 1}</td><td>${e.name}</td><td>${String(e.score).padStart(6, "0")}</td><td>${e.round}</td><td>${new Date(e.date).toLocaleDateString(lang)}</td></tr>`).join("");
  openPanel(`<h3>${t.scores}</h3>${list.length ? `<table class="sw__table"><tr>${t.table.map(h => `<th>${h}</th>`).join("")}</tr>${rows}</table>` : `<p>${t.empty}</p>`}
    <p class="sw__row"><button type="button" data-sw="file"${list.length ? "" : " disabled"}>${t.file}</button><button type="button" data-sw="back">${t.back}</button></p>`, "scores");
}
function askInitials() {
  const t = say();
  let last = "";
  try { last = localStorage.getItem(INITIALS) || ""; } catch (e) { /* storage unavailable */ }
  openPanel(`<h3>${t.newBest}</h3><p class="sw__big">${String(score).padStart(6, "0")}</p>
    <form class="sw__row" data-sw="initials"><label>${t.initials} <input name="name" maxlength="3" autocomplete="off" spellcheck="false" value="${last}" required pattern="[A-Za-z0-9]{1,3}" /></label><button type="submit">${t.save}</button></form>`, "initials");
}
function saveScore(name) {
  name = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3) || "???";
  try { localStorage.setItem(INITIALS, name); } catch (e) { /* storage unavailable */ }
  const entry = { name, score, round: round, date: new Date().toISOString() };
  const list = [...stored(), entry].sort((a, b) => b.score - a.score).slice(0, 10);
  keep(list);
  showScores(list.indexOf(entry));
}
function saveFile() {
  const data = { game: "Spacewar! · matuzale.github.io/matuzale · CH 04", saved: new Date().toISOString(), scores: stored() };
  const link = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })),
    download: "spacewar-scores.json",
  });
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/* ───────── Keys ───────── */

function toggleMode() {
  if (state !== "title" && state !== "done") return;
  players = players === 1 ? 2 : 1;
  ships = []; wins = [0, 0]; score = 0; round = 1;
  state = "title";
  modeBtn.textContent = say().mode(players);
}
function onKey(event) {
  const down = event.type === "keydown", code = event.code;
  if (event.target.closest?.("input")) return;
  if (down && code === "Escape") {
    if (!panel.hidden) { event.preventDefault(); event.stopPropagation(); closePanel(); }
    return;                                          // otherwise the dialog closes as usual
  }
  // Buttons keep their own Enter and Space outside play.
  if (event.target.closest?.("button") && state !== "play" && state !== "ending") return;
  if (down && !event.repeat) {
    if (event.key === "?" || code === "KeyI") { event.preventDefault(); toggleHelp(); return; }
    if (code === "KeyP" && state !== "title" && state !== "done" && panel.hidden) { paused = !paused; return; }
    if (code === "KeyM") { toggleMode(); return; }
    if ((state === "title" || state === "done") && (code === "Enter" || code === "Space") && panel.hidden) { event.preventDefault(); start(); return; }
    tapped.add(code);
  }
  if (GAME_KEYS.has(code)) event.preventDefault();
  if (down) held.add(code); else held.delete(code);
}

/* ───────── The console ───────── */

const loadStyles = () => new Promise(resolve => {
  const href = new URL("../css/spacewar.css", import.meta.url).href;
  if (document.querySelector(`link[href="${href}"]`)) return resolve();
  const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href });
  link.onload = link.onerror = () => resolve();
  document.head.append(link);
});

function build() {
  dialog = document.createElement("dialog");
  dialog.className = "sw";
  dialog.setAttribute("aria-label", "Spacewar!");
  dialog.innerHTML = `
    <div class="sw__cabinet">
      <div class="sw__plate"><span class="sw__brand">SPACEWAR!</span><span class="sw__model"></span></div>
      <div class="sw__screen">
        <canvas class="sw__canvas" tabindex="-1" aria-label="Spacewar!"></canvas>
        <div class="sw__glass" aria-hidden="true"></div>
        <div class="sw__panel" tabindex="-1" hidden></div>
      </div>
      <div class="sw__readouts"><div class="sw__readout"></div><div class="sw__score" aria-live="polite"></div><div class="sw__readout sw__readout--right"></div></div>
      <div class="sw__controls">
        <button type="button" data-sw="help"></button><button type="button" data-sw="mode"></button>
        <button type="button" data-sw="scores"></button><button type="button" data-sw="close"></button>
      </div>
    </div>`;
  document.body.append(dialog);
  canvas = dialog.querySelector("canvas");
  ctx = canvas.getContext("2d");
  screen = dialog.querySelector(".sw__screen");
  panel = dialog.querySelector(".sw__panel");
  readouts = [...dialog.querySelectorAll(".sw__readout")];
  scoreEl = dialog.querySelector(".sw__score");
  modeBtn = dialog.querySelector('[data-sw="mode"]');
  stars = Array.from({ length: 150 }, () => ({ x: rand(-1, 1), y: rand(-1, 1), b: rand(.2, 1) ** 2 }));

  new ResizeObserver(() => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = canvas.height = Math.round(screen.clientWidth * dpr);
  }).observe(screen);

  dialog.addEventListener("keydown", onKey);
  dialog.addEventListener("keyup", onKey);
  dialog.addEventListener("click", event => {
    const action = event.target.closest("[data-sw]")?.dataset.sw;
    if (action === "help") toggleHelp();
    else if (action === "mode") toggleMode();
    else if (action === "scores") panel.dataset.kind === "scores" && !panel.hidden ? closePanel() : showScores();
    else if (action === "close") dialog.close();
    else if (action === "file") saveFile();
    else if (action === "back") closePanel();
  });
  dialog.addEventListener("submit", event => {
    event.preventDefault();
    saveScore(new FormData(event.target).get("name") || "");
  });
  window.addEventListener("blur", () => { held.clear(); if (state === "play") paused = true; });
  document.addEventListener("visibilitychange", () => { if (document.hidden && state === "play") paused = true; });
  dialog.addEventListener("close", () => {
    cancelAnimationFrame(raf); raf = 0;
    held.clear(); tapped.clear();
    panel.hidden = true; paused = false;
    state = "title"; ships = [];
    document.documentElement.classList.remove("sw-open");
  });
}

export async function openSpacewar() {
  await loadStyles();
  if (!dialog) build();
  const t = say();
  dialog.querySelector(".sw__model").textContent = t.model;
  dialog.querySelector('[data-sw="help"]').textContent = t.help;
  dialog.querySelector('[data-sw="scores"]').textContent = t.scores;
  dialog.querySelector('[data-sw="close"]').textContent = t.exit;
  modeBtn.textContent = t.mode(players);
  state = "title"; ships = []; score = 0; round = 1; wins = [0, 0];
  document.documentElement.classList.add("sw-open");
  dialog.showModal();
  canvas.focus();
  last = performance.now(); acc = 0;
  if (!raf) raf = requestAnimationFrame(frame);
}
