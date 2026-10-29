// Spacewar!, after the 1962 PDP-1 original, plays from an AV cassette in the
// portfolio's television. Two ships duel around a black hole, with limited
// fuel, torpedoes and hyperspace jumps. One player faces the computer; two can
// share a keyboard. Touch controls provide the first player's controls on phones.
// The vector picture supports both page themes; sound and high scores stay local.

import * as sound from "./spacewar-sound.js";

const GM = .06;                 // the hole's pull (screen half-width = 1)
const HOLE = .045;              // fall closer than this and the ship is gone
const THRUST = .32, TURN = 3.4, FUEL_USE = .085;
const TORPS = 32, TORP_SPEED = .75, TORP_LIFE = 1.9, RELOAD = .22;
const JUMPS = 3, SHIP_R = .034, STEP = 1 / 120, ROUND_LIMIT = 120;
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
const lightMode = () => document.documentElement.dataset.theme === "light" ||
  (!document.documentElement.dataset.theme && !systemDark.matches);
const STORE = "spacewar-scores", INITIALS = "spacewar-initials";
const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

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
    model: "Precision CRT display · CH 04", help: "How to play", scores: "Scores", exit: "Power", volume: "Volume", off: "off",
    one: "1 player", two: "2 players", cpu: "WEDGE · CPU", wedge: "WEDGE", needle: "NEEDLE",
    ctl: ["Rotate", "Thrust", "Fire", "Hyper"], fuel: "FUEL", torp: "TORP", jump: "JUMP",
    start: "PRESS PLAY OR ENTER", hint: "M  1 / 2 PLAYERS   ·   ?  HOW TO PLAY", paused: "PAUSED",
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
      <p><kbd>P</kbd> pause · <kbd>M</kbd> 1 / 2 players · <kbd>V</kbd> sound off / on (or turn the volume knob) · <kbd>Esc</kbd> back, then exit</p>
      <p class="sw__note">High scores are kept only in this browser (local storage) and are never sent anywhere. To keep them elsewhere, use “Save to file” under High scores.</p>
      <p class="sw__credit">After Spacewar! (1962), conceived by the Hingham Institute Study Group on Space Warfare and first realized on the PDP-1 at MIT by Stephen Russell, Peter Samson, Dan Edwards and Martin Graetz, with Alan Kotok, Steve Piner and Robert A. Saunders. This version is written from scratch, with a black hole for the star. The original was silent; the sounds here are made in the browser from square waves and noise, as the PDP-1 played music.</p>`,
  },
  pl: {
    model: "Precyzyjny wyświetlacz CRT · CH 04", help: "Jak grać", scores: "Wyniki", exit: "Zasilanie", volume: "Głośność", off: "wyłączona",
    one: "1 gracz", two: "2 graczy", cpu: "WEDGE · KOMPUTER", wedge: "WEDGE", needle: "NEEDLE",
    ctl: ["Obrót", "Ciąg", "Strzał", "Skok"], fuel: "PALIWO", torp: "TORP", jump: "SKOK",
    start: "GRAJ LUB ENTER", hint: "M  1 / 2 GRACZY   ·   ?  JAK GRAĆ", paused: "PAUZA",
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
      <p><kbd>P</kbd> pauza · <kbd>M</kbd> 1 / 2 graczy · <kbd>V</kbd> dźwięk wył. / wł. (albo pokrętło głośności) · <kbd>Esc</kbd> wstecz, potem wyjście</p>
      <p class="sw__note">Wyniki zapisują się tylko w tej przeglądarce (local storage) i nigdzie nie są wysyłane. Żeby je zachować gdzie indziej, użyj „Zapisz do pliku” w Wynikach.</p>
      <p class="sw__credit">Według Spacewar! (1962), wymyślonej przez Hingham Institute Study Group on Space Warfare i pierwszy raz uruchomionej na PDP-1 w MIT przez Stephena Russella, Petera Samsona, Dana Edwardsa i Martina Graetza wraz z Alanem Kotokiem, Steve'em Pinerem i Robertem A. Saundersem. Ta wersja jest napisana od zera, z czarną dziurą zamiast gwiazdy. Oryginał był niemy; dźwięki powstają w przeglądarce z fal prostokątnych i szumu, tak jak PDP-1 grał muzykę.</p>`,
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

let dialog, canvas, ctx, screen, picture, beam, panel, scopes, boxes, scoreEl, dpr = 1, previousLight;
let mounted = false, destroyActive = null, scoresPage = 0, acceptsInput = () => false;
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
  sound.roundStart();
}
function start() {
  if (document.documentElement.classList.contains('is-tape-paused')) return;
  closePanel();
  paused = false;
  dialog.querySelector('[data-sw="pause"]')?.setAttribute('aria-pressed', 'false');
  round = 1; score = 0; wins = [0, 0]; sparks = [];
  newRound();
  refreshUi();
  canvas.focus({ preventScroll: true });
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
function explode(s, intoHole = false) {
  if (!s.alive) return;
  s.alive = false;
  burst(s.x, s.y, 46, .3, 1.4);
  if (intoHole) sound.swallowed(s.x); else sound.crash(s.x);
}
function reenter(s) {
  const a = rand(0, 2 * Math.PI), r = rand(.45, .85), heading = rand(0, 2 * Math.PI);
  s.x = Math.cos(a) * r; s.y = Math.sin(a) * r; s.vx = Math.cos(heading) * .1; s.vy = Math.sin(heading) * .1;
  burst(s.x, s.y, 10, .08, .5);
  sound.jump(s.x, false);
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
    sound.fire(s.kind, s.x);
  }
  if (c.hyper && s.jumps > 0) { s.jumps--; s.gone = .8; s.burn = false; burst(s.x, s.y, 10, .08, .5); sound.jump(s.x, true); }
  if (Math.hypot(s.x, s.y) < HOLE) explode(s, true);
}

function update(dt) {
  for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  sparks = sparks.filter(p => p.life > 0);
  for (const st of stars) { st.x -= .006 * dt; if (st.x < -1) st.x += 2; }
  if (state === "title" || state === "done" || paused) return;

  if (state === "play" || state === "ending") {
    const controls = players === 1 ? [pad(SOLO), think(ships[1], ships[0], dt)] : [pad(PADS.needle), pad(PADS.wedge)];
    ships.forEach((s, i) => { fly(s, controls[i], dt); s.ctl = controls[i]; });
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
    if (n === w) sound.roundDrawn(); else sound.roundWon();
  } else if (n && !w) {
    const s = ships[0], gain = 1000 * round + 20 * s.torps + Math.round(500 * s.fuel) + 100 * s.jumps;
    score += gain;
    message = `${t.cleared(round)}  +${gain}`;
    round++;
    state = "between";
    sound.roundWon();
  } else if (n === w) {
    message = t.draw;
    state = "between";
    sound.roundDrawn();
  } else {
    message = t.over;
    state = "over";
    sound.gameOver();
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
  const light = lightMode(), phosphor = light ? "#322946" : "#d8f6ff", glow = light ? "#a58bb2" : "#5dffb0";
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  // Phosphor afterglow: the last frames fade instead of vanishing.
  ctx.fillStyle = light ? `rgba(242, 238, 224, ${previousLight === light ? .3 : 1})` : `rgba(1, 6, 4, ${previousLight === light ? .3 : 1})`;
  ctx.fillRect(0, 0, W, W);
  previousLight = light;
  ctx.setTransform(h, 0, 0, h, h, h);
  const px = 1 / h;

  ctx.fillStyle = phosphor;
  for (const st of stars) { ctx.globalAlpha = st.b * rand(.5, .7); ctx.fillRect(st.x, st.y, 1.5 * dpr * px, 1.5 * dpr * px); }
  ctx.globalAlpha = 1;

  // The hole eats the afterglow that crosses it; a faint ring and a few flickering sparks mark it.
  ctx.fillStyle = light ? "#292032" : "#000"; ctx.beginPath(); ctx.arc(0, 0, .04, 0, 2 * Math.PI); ctx.fill();
  ctx.shadowColor = glow; ctx.shadowBlur = (light ? 3 : 8) * dpr;
  ctx.strokeStyle = phosphor; ctx.lineWidth = 1.3 * dpr * px; ctx.lineCap = "round"; ctx.lineJoin = "round";
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
    ctx.fillStyle = phosphor;
    for (const p of torps) { ctx.beginPath(); ctx.arc(p.x, p.y, 2 * dpr * px, 0, 2 * Math.PI); ctx.fill(); }
  }
  for (const p of sparks) { ctx.globalAlpha = Math.min(1, p.life * 1.5); ctx.fillRect(p.x, p.y, 2 * dpr * px, 2 * dpr * px); }
  ctx.globalAlpha = 1;

  // Words, in the tube's own lettering.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = phosphor;
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

// The oscilloscopes in the control boxes: fuel as a trace across the graticule, torpedoes and jumps left.
function showReadouts() {
  const t = say();
  scopes.forEach((scope, i) => {
    const s = ships[i], live = s && state !== "title";
    scope.name.textContent = i ? (players === 1 ? t.cpu : t.wedge) : t.needle;
    scope.el.style.setProperty("--fuel", live ? s.fuel.toFixed(3) : 1);
    scope.data.textContent = `${t.torp} ${live ? String(s.torps).padStart(2, "0") : TORPS}   ${t.jump} ${live ? s.jumps : JUMPS}`;
    scope.fuel.textContent = t.fuel;
  });
  scoreEl.textContent = players === 1 ? `${t.score} ${String(score).padStart(6, "0")}  ·  ${t.round(round)}` : `${t.needle} ${wins[0]} : ${wins[1]} ${t.wedge}`;
}
// The levers in the control boxes follow the keys, or the computer's hands.
function showControls() {
  boxes.forEach((box, i) => {
    const c = (state === "play" || state === "ending") && !paused && ships[i]?.alive ? ships[i].ctl || {} : {};
    const tilt = c.left && !c.right ? "left" : c.right && !c.left ? "right" : "";
    if (box.rotate.dataset.tilt !== tilt) box.rotate.dataset.tilt = tilt;
    for (const name of ["thrust", "fire", "hyper"]) box[name].classList.toggle("is-on", !!c[name]);
  });
}

function refreshUi() {
  if (!mounted || !canvas?.isConnected) return;
  canvas.closest('.sw-embed').dataset.state = state;
  const tapePaused = document.documentElement.classList.contains('is-tape-paused');
  const playing = state === 'play' || state === 'ending' || state === 'between' || state === 'over';
  for (const button of dialog.querySelectorAll('[data-sw="mode"]')) button.disabled = playing || tapePaused;
  const pauseKey = dialog.querySelector('[data-sw="pause"]');
  pauseKey.disabled = tapePaused || (state !== 'play' && state !== 'ending') || !panel.hidden;
  pauseKey.setAttribute('aria-pressed', String(paused));
  for (const button of dialog.querySelectorAll('[data-pad]')) button.disabled = tapePaused;
  const startKey = dialog.querySelector('[data-sw="start"]');
  startKey.disabled = tapePaused;
  const startLabel = document.documentElement.lang === 'pl' ? (playing ? 'OD NOWA' : 'GRAJ') : (playing ? 'RESTART' : 'PLAY');
  if (startKey.textContent !== startLabel) startKey.textContent = startLabel;
}
function frame(now) {
  if (document.documentElement.classList.contains("is-tape-paused")) { raf = 0; sound.hush(); return; }
  raf = requestAnimationFrame(frame);
  acc += Math.min((now - last) / 1000, .1);
  last = now;
  while (acc >= STEP) { update(STEP); acc -= STEP; }
  draw();
  refreshUi();
  showControls();
  const live = (state === "play" || state === "ending") && !paused;
  for (let i = 0; i < 2; i++) {
    const s = ships[i];
    sound.engine(i, !!(live && s?.alive && s.gone <= 0 && s.burn), s?.x ?? 0);
  }
  if (now > refresh) { showReadouts(); refresh = now + 150; }
}

/* ───────── Panels: how to play, high scores, initials ───────── */

function openPanel(html, kind) {
  panel.innerHTML = html;
  panel.dataset.kind = kind;
  panel.hidden = false;
  paused = state === "play" || state === "ending";
  latchKeys();
  refreshUi();
  (panel.querySelector("input, button") || panel).focus({ preventScroll: true });
}
function closePanel() {
  if (panel.hidden) return;
  panel.hidden = true;
  paused = false;
  latchKeys();
  refreshUi();
  canvas.focus({ preventScroll: true });
}
const compactHelp = () => document.documentElement.lang === "pl" ? `<h3>JAK GRAĆ</h3><p>Walka statków wokół czarnej dziury. Uważaj na grawitację, paliwo i torpedy.</p><p><kbd>A</kbd> <kbd>D</kbd> obrót · <kbd>W</kbd> ciąg<br><kbd>S</kbd> / <kbd>SPACJA</kbd> strzał · <kbd>Q</kbd> skok</p><p>Drugi gracz: strzałki i <kbd>ENTER</kbd>.<br><kbd>P</kbd> pauza · <kbd>M</kbd> tryb · <kbd>V</kbd> dźwięk</p><button type="button" data-sw="back">WRÓĆ</button>` : `<h3>HOW TO PLAY</h3><p>Two ships duel around a black hole. Watch gravity, fuel and torpedoes.</p><p><kbd>A</kbd> <kbd>D</kbd> rotate · <kbd>W</kbd> thrust<br><kbd>S</kbd> / <kbd>SPACE</kbd> fire · <kbd>Q</kbd> jump</p><p>Player two: arrow keys and <kbd>ENTER</kbd>.<br><kbd>P</kbd> pause · <kbd>M</kbd> mode · <kbd>V</kbd> sound</p><button type="button" data-sw="back">BACK</button>`;
const toggleHelp = () => panel.dataset.kind === "help" && !panel.hidden ? closePanel() : openPanel(compactHelp(), "help");

function showScores(highlight = -1) {
  const t = say(), list = stored(), lang = document.documentElement.lang || "en";
  scoresPage = Math.min(scoresPage, Math.max(0, Math.ceil(list.length / 5) - 1));
  const rows = list.slice(scoresPage * 5, scoresPage * 5 + 5).map((e, i) => `<tr${i + scoresPage * 5 === highlight ? ' class="is-new"' : ""}><td>${i + 1 + scoresPage * 5}</td><td>${e.name}</td><td>${String(e.score).padStart(6, "0")}</td><td>${e.round}</td></tr>`).join("");
  openPanel(`<h3>${t.scores}</h3>${list.length ? `<table class="sw__table"><tr>${t.table.slice(0, 4).map(h => `<th>${h}</th>`).join("")}</tr>${rows}</table>` : `<p>${t.empty}</p>`}
    <p class="sw__row">${list.length > 5 ? `<button type="button" data-sw="scores-page">${scoresPage ? '← 1–5' : '6–10 →'}</button>` : ''}<button type="button" data-sw="file"${list.length ? "" : " disabled"}>${document.documentElement.lang === 'pl' ? 'ZAPISZ JSON' : 'EXPORT JSON'}</button><button type="button" data-sw="back">${t.back}</button></p>`, "scores");
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
  scoresPage = Math.floor(list.indexOf(entry) / 5);
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

function toggleMode(to = players === 1 ? 2 : 1) {
  if (document.documentElement.classList.contains('is-tape-paused')) return;
  if ((state !== "title" && state !== "done") || to === players) return;
  players = to;
  ships = []; wins = [0, 0]; score = 0; round = 1;
  state = "title";
  latchKeys();
  refreshUi();
}
function togglePause() {
  if (document.documentElement.classList.contains('is-tape-paused')) return;
  if ((state !== "play" && state !== "ending") || !panel.hidden) return;
  paused = !paused;
  refreshUi();
}
// Piano keys latch like an old radio's, with a clack: the chosen player count stays down, an open panel
// keeps its key down.
function latchKeys(audible = true) {
  const kind = panel.hidden ? "" : panel.dataset.kind;
  let moved = false;
  dialog.querySelectorAll(".sw__key[data-sw]").forEach(key => {
    if (key.dataset.sw === 'tape') return;
    const on = String(key.dataset.sw === "mode" ? +key.dataset.players === players : key.dataset.sw === kind);
    if (key.getAttribute("aria-pressed") !== on) { key.setAttribute("aria-pressed", on); moved = true; }
  });
  if (moved && audible) sound.clack();
  boxes[1]?.el.classList.toggle("is-cpu", players === 1);
  dialog.querySelectorAll(".sw__keyhint--wedge").forEach(hint => { hint.hidden = players === 1; });
}
function onKey(event) {
  const down = event.type === "keydown", code = event.code;
  if (!mounted) return;
  if (down && code === "Escape") {
    if (!panel.hidden) { event.preventDefault(); event.stopPropagation(); closePanel(); }
    return;                                          // otherwise the console switches off (the dialog's cancel)
  }
  if (!acceptsInput()) return;
  if (event.target.closest?.("input")) return;
  if (!panel.hidden) return;
  // The controls and knob always keep native keyboard activation. Ship keys
  // belong to the focused picture, not to a button that happens to have focus.
  if (event.target.closest?.('button, [role="slider"]')) return;
  if (down) sound.wake();
  if (down && !event.repeat) {
    if (event.key === "?" || code === "KeyI") { event.preventDefault(); toggleHelp(); return; }
    if (code === "KeyV") { toggleMute(); return; }
    if (code === "KeyP" && panel.hidden) { event.preventDefault(); togglePause(); return; }
    if (code === "KeyM") { toggleMode(); return; }
    if ((state === "title" || state === "done") && (code === "Enter" || code === "Space") && panel.hidden) { event.preventDefault(); start(); return; }
    tapped.add(code);
  }
  if (GAME_KEYS.has(code)) event.preventDefault();
  if (down) held.add(code); else held.delete(code);
}

/* ───────── The volume knob ───────── */

// A detented pot, 0 to 10 over three quarters of a turn, with the switch at 0. Drag it up or right to turn
// it up, roll the wheel over it, or use the arrow keys on it; V turns it down to 0 and back.
const turnOf = n => -135 + 27 * n;
let dial, knob, before = 6;
const scale = () => Array.from({ length: 11 }, (_, i) => {
  const a = turnOf(i) * Math.PI / 180, at = r => `${(36 + r * Math.sin(a)).toFixed(2)} ${(36 - r * Math.cos(a)).toFixed(2)}`;
  return `<path d="M${at(23)}L${at(i % 5 ? 26.5 : 29)}"/>`;
}).join("");
function showLevel() {
  const n = sound.level();
  knob.style.setProperty("--turn", `${turnOf(n)}deg`);
  dial.setAttribute("aria-valuenow", n);
  dial.setAttribute("aria-valuetext", n ? `${n} / 10` : say().off);
}
function turnTo(n) {
  n = Math.min(10, Math.max(0, Math.round(n)));
  if (n === sound.level()) return;
  sound.wake();
  sound.setLevel(n);
  sound.detent();
  showLevel();
}
function toggleMute() {
  if (sound.level()) { before = sound.level(); turnTo(0); }
  else turnTo(before || 6);
}
function wireKnob() {
  dial.addEventListener("pointerdown", event => {
    if (event.button) return;
    event.preventDefault();
    dial.setPointerCapture(event.pointerId);
    const x0 = event.clientX, y0 = event.clientY, from = sound.level();
    const move = e => turnTo(from + ((e.clientX - x0) + (y0 - e.clientY)) / 14);
    const drop = () => {
      dial.removeEventListener("pointermove", move);
      dial.removeEventListener("pointerup", drop);
      dial.removeEventListener("pointercancel", drop);
    };
    dial.addEventListener("pointermove", move);
    dial.addEventListener("pointerup", drop);
    dial.addEventListener("pointercancel", drop);
  });
  // A notch of a mouse wheel is a detent; a trackpad's small rolls add up to one.
  let roll = 0;
  dial.addEventListener("wheel", event => {
    event.preventDefault();
    roll -= event.deltaMode ? event.deltaY * 40 : event.deltaY;
    if (Math.abs(roll) < 50) return;
    turnTo(sound.level() + Math.sign(roll));
    roll = 0;
  }, { passive: false });
  dial.addEventListener("keydown", event => {
    const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 3, PageDown: -3 }[event.key];
    const to = event.key === "Home" ? 0 : event.key === "End" ? 10 : step && sound.level() + step;
    if (to === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    turnTo(to);
  });
}

/* ───────── The cassette game in the portfolio's television ───────── */

let stylesReady;
const loadStyles = () => stylesReady ||= Promise.all(['spacewar.css', 'spacewar-inline.css'].map(name => new Promise(resolve => {
  const href = new URL(`../css/${name}`, import.meta.url).href;
  const existing = document.querySelector(`link[href="${href}"]`);
  if (existing) return resolve();
  const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
  link.onload = link.onerror = () => resolve();
  document.head.append(link);
})));

// One instance is mounted at a time. The caller owns cassette changes and calls
// destroy when the tape is removed; an abort prevents stale async mounts.
export async function mountSpacewar(hostScreen, player, { signal } = {}) {
  await loadStyles();
  if (signal?.aborted || !hostScreen.isConnected || !player.isConnected) return null;
  destroyActive?.();
  const life = new AbortController();
  const element = document.createElement('div');
  element.className = 'sw-embed';
  element.dataset.state = 'title';
  element.setAttribute('role', 'region');
  element.setAttribute('aria-label', 'Spacewar!');
  element.innerHTML = `<div class="sw-embed__meta" aria-hidden="true"><span>TM / GAME SIGNAL</span><span>CH 04</span></div><div class="sw__screen"><div class="sw__picture"><canvas class="sw__canvas" tabindex="0" aria-label="Spacewar!"></canvas><div class="sw__panel" tabindex="-1" hidden></div></div></div><div class="sw-embed__footer" aria-hidden="true"><span>PDP-1 / 1962</span><span>VECTOR DISPLAY</span></div>`;
  const deck = document.createElement('div');
  deck.className = 'sw-controls';
  deck.innerHTML = `<div class="sw-controls__header"><strong>SPACEWAR!</strong><span class="sw__score" aria-live="polite"></span></div>
    <div class="sw-controls__deck"><div class="sw__keys"><button type="button" class="sw__key" data-sw="start"></button><button type="button" class="sw__key" data-sw="mode" data-players="1"></button><button type="button" class="sw__key" data-sw="mode" data-players="2"></button><button type="button" class="sw__key" data-sw="pause" aria-pressed="false"></button><button type="button" class="sw__key" data-sw="help"></button><button type="button" class="sw__key" data-sw="scores"></button><button type="button" class="sw__key sw__tape-control" data-sw="tape" aria-pressed="false"></button></div>
    <div class="sw__volume" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="10"><svg class="sw__scale" viewBox="0 0 72 72" aria-hidden="true">${scale()}<text x="13" y="62">0</text><text x="59" y="62">10</text><text class="sw__scale-name" x="36" y="70"></text></svg><i class="sw__knob"></i></div></div>
    <div class="sw-controls__pad" aria-label="Game controls"><button type="button" data-pad="KeyA"><span>◀</span><small></small></button><button type="button" data-pad="KeyD"><span>▶</span><small></small></button><button type="button" data-pad="KeyW"><span>▲</span><small></small></button><button type="button" data-pad="KeyS"><span>●</span><small></small></button><button type="button" data-pad="KeyQ"><span>✦</span><small></small></button></div>`;
  hostScreen.append(element);
  let slot = player.querySelector('.sw-controls-slot');
  if (slot) {
    clearTimeout(slot.closeTimer);
    slot.inert = false;
    slot.querySelector('.sw-controls-slot__clip').replaceChildren(deck);
  } else {
    slot = document.createElement('div');
    slot.className = 'sw-controls-slot';
    const clip = document.createElement('div');
    clip.className = 'sw-controls-slot__clip';
    clip.append(deck);
    slot.append(clip);
    hostScreen.insertAdjacentElement('afterend', slot);
  }
  void slot.offsetWidth;
  slot.classList.add('is-expanded');
  dialog = player.querySelector('.tape-player__tv');
  canvas = element.querySelector('canvas');
  ctx = canvas.getContext('2d');
  screen = element.querySelector('.sw__screen');
  picture = element.querySelector('.sw__picture');
  panel = element.querySelector('.sw__panel');
  beam = null;
  dial = deck.querySelector('.sw__volume');
  knob = deck.querySelector('.sw__knob');
  scoreEl = deck.querySelector('.sw__score');
  scopes = []; boxes = [];
  mounted = true;
  state = 'title'; players = 1; ships = []; torps = []; sparks = []; score = 0; round = 1; wins = [0, 0]; paused = false; scoresPage = 0; previousLight = undefined;
  stars = Array.from({ length: 150 }, () => ({ x: rand(-1, 1), y: rand(-1, 1), b: rand(.2, 1) ** 2 }));
  held.clear(); tapped.clear();
  wireKnob();

  function relabel() {
    const t = say();
    deck.querySelector('[data-sw="start"]').textContent = document.documentElement.lang === 'pl' ? 'GRAJ' : 'PLAY';
    deck.querySelector('[data-players="1"]').textContent = t.one;
    deck.querySelector('[data-players="2"]').textContent = t.two;
    deck.querySelector('[data-sw="pause"]').textContent = document.documentElement.lang === 'pl' ? 'PAUZA' : 'PAUSE';
    deck.querySelector('[data-sw="help"]').textContent = t.help;
    deck.querySelector('[data-sw="scores"]').textContent = t.scores;
    const tapeKey = deck.querySelector('[data-sw="tape"]');
    const tapePaused = document.documentElement.classList.contains('is-tape-paused');
    tapeKey.textContent = `${document.documentElement.lang === 'pl' ? 'TAŚMA' : 'TAPE'} ${tapePaused ? '▶' : 'Ⅱ'}`;
    tapeKey.setAttribute('aria-label', document.documentElement.lang === 'pl'
      ? (tapePaused ? 'Wznów całą taśmę' : 'Pauza całej taśmy')
      : (tapePaused ? 'Resume the whole tape' : 'Pause the whole tape'));
    deck.querySelector('.sw__scale-name').textContent = t.volume.toUpperCase();
    dial.setAttribute('aria-label', t.volume);
    const names = document.documentElement.lang === 'pl' ? ['Obrót w lewo', 'Obrót w prawo', 'Ciąg', 'Strzał', 'Skok w hiperprzestrzeń'] : ['Rotate left', 'Rotate right', 'Thrust', 'Fire', 'Hyperspace'];
    const labels = document.documentElement.lang === 'pl' ? ['LEWO', 'PRAWO', 'CIĄG', 'STRZAŁ', 'SKOK'] : ['LEFT', 'RIGHT', 'THRUST', 'FIRE', 'HYPER'];
    deck.querySelectorAll('[data-pad]').forEach((button, i) => { button.setAttribute('aria-label', names[i]); button.title = names[i]; button.querySelector('small').textContent = labels[i]; });
    deck.querySelector('.sw-controls__pad').setAttribute('aria-label', document.documentElement.lang === 'pl' ? 'Sterowanie grą' : 'Game controls');
    showLevel(); showReadouts(); refreshUi();
    if (!panel.hidden && panel.dataset.kind === 'help') panel.innerHTML = compactHelp();
    else if (!panel.hidden && panel.dataset.kind === 'scores') showScores();
    if (mounted && document.documentElement.classList.contains('is-tape-paused')) draw();
  }
  relabel(); latchKeys(false);

  const size = () => {
    if (!mounted) return;
    // The inner vector field remains square inside the existing 4:3 or phone CRT.
    const side = Math.floor(Math.min(hostScreen.clientWidth, hostScreen.clientHeight));
    if (!side) return;
    screen.style.width = `${side}px`;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const pixels = Math.round(side * dpr);
    if (canvas.width !== pixels || canvas.height !== pixels) {
      canvas.width = canvas.height = pixels;
      previousLight = undefined;
      draw();
    }
  };
  const resize = new ResizeObserver(size);
  resize.observe(hostScreen);
  size();
  // The fixed tape transport can sit directly over game/EJECT controls on a
  // phone. Hide it only while either control row is in view, then restore it.
  const narrow = matchMedia('(max-width: 680px)');
  const visibleControls = new Set();
  const setTransportVisibility = () => document.documentElement.classList.toggle('sw-controls-on-screen', mounted && narrow.matches && visibleControls.size > 0);
  const controlsObserver = new IntersectionObserver(entries => {
    if (!element.isConnected) return;
    for (const entry of entries) {
      if (entry.isIntersecting) visibleControls.add(entry.target);
      else visibleControls.delete(entry.target);
    }
    setTransportVisibility();
  });
  controlsObserver.observe(deck);
  controlsObserver.observe(player.querySelector('.tape-player__controls'));
  narrow.addEventListener('change', setTransportVisibility, { signal: life.signal });
  const initialBounds = hostScreen.getBoundingClientRect();
  let gameVisible = initialBounds.bottom > 0 && initialBounds.top < innerHeight && initialBounds.right > 0 && initialBounds.left < innerWidth;
  const inactive = () => !gameVisible || hostScreen.inert || document.hidden || document.documentElement.classList.contains('is-tape-paused');
  acceptsInput = () => gameVisible && !hostScreen.inert && !document.hidden && !document.documentElement.classList.contains('is-tape-paused');
  function syncActivity() {
    if (!mounted) return;
    deck.inert = hostScreen.inert;
    const tapePaused = document.documentElement.classList.contains('is-tape-paused');
    const tapeKey = deck.querySelector('[data-sw="tape"]');
    tapeKey.setAttribute('aria-pressed', String(tapePaused));
    tapeKey.textContent = `${document.documentElement.lang === 'pl' ? 'TAŚMA' : 'TAPE'} ${tapePaused ? '▶' : 'Ⅱ'}`;
    tapeKey.setAttribute('aria-label', document.documentElement.lang === 'pl'
      ? (tapePaused ? 'Wznów całą taśmę' : 'Pauza całej taśmy')
      : (tapePaused ? 'Resume the whole tape' : 'Pause the whole tape'));
    sound.setVisible(!inactive());
    refreshUi();
    if (inactive()) {
      cancelAnimationFrame(raf); raf = 0; held.clear(); tapped.clear(); sound.hush();
      deck.querySelectorAll('[data-pad].is-on').forEach(key => key.classList.remove('is-on'));
    }
    else if (!raf) { last = performance.now(); acc = 0; raf = requestAnimationFrame(frame); }
  }
  const inertObserver = new MutationObserver(syncActivity);
  inertObserver.observe(hostScreen, { attributes: true, attributeFilter: ['inert'] });
  const gameVisibility = new IntersectionObserver(([entry]) => { gameVisible = entry.isIntersecting; syncActivity(); });
  gameVisibility.observe(hostScreen);
  const redrawStill = () => { if (mounted && inactive()) draw(); };
  const themeObserver = new MutationObserver(redrawStill);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  systemDark.addEventListener('change', redrawStill, { signal: life.signal });
  document.addEventListener('tape-pause-change', syncActivity, { signal: life.signal });
  document.addEventListener('visibilitychange', syncActivity, { signal: life.signal });
  document.addEventListener('channelchange', relabel, { signal: life.signal });
  window.addEventListener('blur', () => { held.clear(); if (state === 'play') paused = true; sound.hush(); }, { signal: life.signal });

  // Keyboard handling stays scoped to the game and its own controls. The page's
  // Escape/EJECT control continues to work, unless Escape closes a game panel.
  for (const target of [element, deck]) {
    target.addEventListener('keydown', onKey, { signal: life.signal });
    target.addEventListener('keyup', onKey, { signal: life.signal });
  }
  const click = event => {
    const control = event.target.closest('[data-sw]');
    if (!control) return;
    sound.wake();
    const action = control.dataset.sw;
    if (action === 'tape') { document.querySelector('[data-tape-action="pause"]')?.click(); return; }
    if (action === 'start') start();
    else if (action === 'pause') togglePause();
    else if (action === 'help') toggleHelp();
    else if (action === 'mode') toggleMode(+control.dataset.players);
    else if (action === 'scores') { scoresPage = 0; panel.dataset.kind === 'scores' && !panel.hidden ? closePanel() : showScores(); }
    else if (action === 'scores-page') { scoresPage = scoresPage ? 0 : 1; showScores(); }
    else if (action === 'file') saveFile();
    else if (action === 'back') closePanel();
  };
  element.addEventListener('click', click, { signal: life.signal });
  deck.addEventListener('click', click, { signal: life.signal });
  element.addEventListener('submit', event => { event.preventDefault(); saveScore(new FormData(event.target).get('name') || ''); }, { signal: life.signal });
  const release = event => {
    const key = event.target.closest('[data-pad]');
    if (!key) return;
    held.delete(key.dataset.pad); key.classList.remove('is-on');
  };
  deck.addEventListener('pointerdown', event => {
    const key = event.target.closest('[data-pad]');
    if (!key || event.button !== 0) return;
    event.preventDefault();
    if (inactive()) return;
    sound.wake();
    key.setPointerCapture(event.pointerId); key.classList.add('is-on');
    if (!held.has(key.dataset.pad)) tapped.add(key.dataset.pad);
    held.add(key.dataset.pad);
    canvas.focus({ preventScroll: true });
  }, { signal: life.signal });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) deck.addEventListener(type, release, { signal: life.signal });

  const destroy = () => {
    if (!mounted || destroyActive !== destroy) return;
    mounted = false;
    cancelAnimationFrame(raf); raf = 0;
    life.abort(); resize.disconnect(); controlsObserver.disconnect(); gameVisibility.disconnect(); inertObserver.disconnect(); themeObserver.disconnect();
    document.documentElement.classList.remove('sw-controls-on-screen');
    held.clear(); tapped.clear(); paused = false; state = 'title'; ships = [];
    acceptsInput = () => false;
    sound.setVisible(false); sound.rest();
    element.remove();
    slot.inert = true;
    slot.classList.remove('is-expanded');
    if (motion.matches || document.documentElement.classList.contains('is-tape-paused')) slot.remove();
    else slot.closeTimer = setTimeout(() => { if (!slot.classList.contains('is-expanded')) slot.remove(); }, 420);
    destroyActive = null;
  };
  destroyActive = destroy;
  signal?.addEventListener('abort', destroy, { once: true, signal: life.signal });
  if (signal?.aborted) { destroy(); return null; }
  syncActivity();
  if (!inactive()) { sound.wake(); sound.staticHiss(.15); }
  const bounds = hostScreen.getBoundingClientRect();
  if (bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth)
    canvas.focus({ preventScroll: true });
  return { element, destroy };
}
