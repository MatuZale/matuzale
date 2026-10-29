// CH 04, an easter egg on the AV input: Spacewar!, after the 1962 original for the PDP-1, round a black hole.
// Two ships, the needle and the wedge, duel in its gravity: an inverse-square pull, limited fuel and 32
// torpedoes, three jumps into hyperspace, each riskier than the last, stars drifting behind, and space
// wrapping round the edges of a square field seen through a round tube (the corners fall outside it, as on
// the original display). One player flies the needle against the computer for a high score; two share the
// keyboard. Drawn as a vector display with phosphor afterglow, in a console after the original display,
// with wooden control boxes whose levers move with the keys (and with the computer's moves), oscilloscope
// readouts and latching piano keys. The screens are under the AV glass; the machine stands in front of the
// page, out of focus behind it. The tube switches on from a bright line and off into a dot.
// Sound (spacewar-sound.js) has a volume knob on the console. High scores stay in this browser and can be
// saved to a file. Desktop only; opened by channels.js (key 4, or CH 04, in AV).

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
      <p><kbd>P</kbd> pause · <kbd>M</kbd> 1 / 2 players · <kbd>V</kbd> sound off / on (or turn the volume knob) · <kbd>Esc</kbd> back, then exit</p>
      <p class="sw__note">High scores are kept only in this browser (local storage) and are never sent anywhere. To keep them elsewhere, use “Save to file” under High scores.</p>
      <p class="sw__credit">After Spacewar! (1962), conceived by the Hingham Institute Study Group on Space Warfare and first realized on the PDP-1 at MIT by Stephen Russell, Peter Samson, Dan Edwards and Martin Graetz, with Alan Kotok, Steve Piner and Robert A. Saunders. This version is written from scratch, with a black hole for the star. The original was silent; the sounds here are made in the browser from square waves and noise, as the PDP-1 played music.</p>`,
  },
  pl: {
    model: "Precyzyjny wyświetlacz CRT · CH 04", help: "Jak grać", scores: "Wyniki", exit: "Zasilanie", volume: "Głośność", off: "wyłączona",
    one: "1 gracz", two: "2 graczy", cpu: "WEDGE · KOMPUTER", wedge: "WEDGE", needle: "NEEDLE",
    ctl: ["Obrót", "Ciąg", "Strzał", "Skok"], fuel: "PALIWO", torp: "TORP", jump: "SKOK",
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

let dialog, canvas, ctx, screen, picture, beam, panel, scopes, boxes, scoreEl, dpr = 1, closing = false, tunedAway = false, previousLight;
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

function frame(now) {
  if (document.documentElement.classList.contains("is-tape-paused")) { raf = 0; sound.hush(); return; }
  raf = requestAnimationFrame(frame);
  acc += Math.min((now - last) / 1000, .1);
  last = now;
  while (acc >= STEP) { update(STEP); acc -= STEP; }
  draw();
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
  panel.querySelector("input, button")?.focus() ?? panel.focus();
}
function closePanel() {
  if (panel.hidden) return;
  panel.hidden = true;
  paused = false;
  latchKeys();
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

function toggleMode(to = players === 1 ? 2 : 1) {
  if ((state !== "title" && state !== "done") || to === players) return;
  players = to;
  ships = []; wins = [0, 0]; score = 0; round = 1;
  state = "title";
  latchKeys();
}
// Piano keys latch like an old radio's, with a clack: the chosen player count stays down, an open panel
// keeps its key down.
function latchKeys(audible = true) {
  const kind = panel.hidden ? "" : panel.dataset.kind;
  let moved = false;
  dialog.querySelectorAll(".sw__key[data-sw]").forEach(key => {
    const on = String(key.dataset.sw === "mode" ? +key.dataset.players === players : key.dataset.sw === kind);
    if (key.getAttribute("aria-pressed") !== on) { key.setAttribute("aria-pressed", on); moved = true; }
  });
  if (moved && audible) sound.clack();
  boxes[1].el.classList.toggle("is-cpu", players === 1);
  dialog.querySelectorAll(".sw__keyhint--wedge").forEach(hint => { hint.hidden = players === 1; });
}
function onKey(event) {
  const down = event.type === "keydown", code = event.code;
  if (closing || event.target.closest?.("input")) return;
  if (down && code === "Escape") {
    if (!panel.hidden) { event.preventDefault(); event.stopPropagation(); closePanel(); }
    return;                                          // otherwise the console switches off (the dialog's cancel)
  }
  // Buttons keep their own Enter and Space outside play.
  if (event.target.closest?.("button") && state !== "play" && state !== "ending") return;
  if (down) sound.wake();
  if (down && !event.repeat) {
    if (event.key === "?" || code === "KeyI") { event.preventDefault(); toggleHelp(); return; }
    if (code === "KeyV") { toggleMute(); return; }
    if (code === "KeyP" && state !== "title" && state !== "done" && panel.hidden) { paused = !paused; return; }
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

/* ───────── Power ───────── */

// The tube switching on draws a bright line out and opens the picture from it; switching off folds the
// picture into the line and the line into a dot, as the page's CRT does (retro.js).
const OFF = 480, DOT = .75 * OFF;            // ms: the whole switch-off, and the moment the picture is a dot
function tube(on) {
  const easing = "cubic-bezier(.6, 0, .4, 1)";
  [picture, beam].forEach(el => el.getAnimations().forEach(a => a.cancel()));
  sound.power(on, on && !motion.matches ? .3 : 0);
  if (motion.matches) return;
  if (on) {
    const timing = { duration: 560, delay: 300, easing, fill: "backwards" };
    picture.animate([{ transform: "scaleY(.004)" }, { transform: "scaleY(.004)", offset: .4 }, { transform: "none" }], timing);
    beam.animate([
      { opacity: 1, transform: "scaleX(0)" }, { opacity: 1, transform: "scaleX(1)", offset: .4 },
      { opacity: .9, transform: "scaleX(1) scaleY(6)", offset: .55 }, { opacity: 0, transform: "scaleX(1) scaleY(40)" },
    ], timing);
    return;
  }
  const timing = { duration: OFF, easing, fill: "forwards" };
  picture.animate([{ transform: "none" }, { transform: "scaleY(.004)", offset: .4 }, { transform: "scale(0, .004)" }], timing);
  beam.animate([
    { opacity: 0, transform: "scaleX(1)" }, { opacity: 1, transform: "scaleX(1)", offset: .35 },
    { opacity: 1, transform: "scaleX(.012)", offset: DOT / OFF }, { opacity: 0, transform: "scaleX(0)" },
  ], timing);
}
// Power (or Esc): the tube and the scopes go dark and, the moment the dot is gone, the TV changes channel:
// the static runs over the machine as it leaves and the page comes back into focus beneath it.
function switchOff() {
  if (closing || !dialog.open) return;
  closing = true;
  paused = true;
  dialog.classList.add("is-shutting");
  sound.hush();
  tube(false);
  if (motion.matches) { tuneAway(); dialog.close(); return; }
  setTimeout(() => {
    tuneAway();
    dialog.classList.add("is-off");
    setTimeout(() => dialog.close(), 420);    // as long as the static lasts
  }, DOT);
}
// Once per session, also when the dialog is closed some other way.
function tuneAway() {
  if (tunedAway) return;
  tunedAway = true;
  sound.staticHiss();
  dialog.dispatchEvent(new Event("poweroff"));
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
  const box = (side, keys) => `
    <div class="sw__box sw__box--${side}">
      <div class="sw__scope"><span class="sw__scope-name"></span><span class="sw__scope-fuel"></span><i class="sw__trace"></i><span class="sw__scope-data"></span></div>
      <div class="sw__levers">
        ${["rotate", "thrust", "fire", "hyper"].map((name, i) => `
        <div class="sw__lever sw__lever--${name}" data-ctl="${name}">
          ${name === "fire" ? '<i class="sw__button"></i>' : '<i class="sw__nut"></i><i class="sw__stick"></i>'}
          <span class="sw__engrave" data-ctl-label="${i}"></span>
          <kbd class="sw__keyhint sw__keyhint--${side}">${keys[i]}</kbd>
        </div>`).join("")}
      </div>
      <span class="sw__box-plate">${side === "needle" ? "1" : "2"}</span>
    </div>`;
  dialog.innerHTML = `
    <div class="sw__scene">
      ${box("needle", ["A D", "W", "S", "Q"])}
      <div class="sw__cabinet">
        <div class="sw__trim"><span class="sw__brand">SPACEWAR!</span><span class="sw__model"></span></div>
        <div class="sw__face">
          <i class="sw__screw"></i><i class="sw__screw"></i><i class="sw__screw"></i><i class="sw__screw"></i>
          <div class="sw__screen">
            <div class="sw__picture">
              <canvas class="sw__canvas" tabindex="-1" aria-label="Spacewar!"></canvas>
              <div class="sw__panel" tabindex="-1" hidden></div>
            </div>
            <i class="sw__beam" aria-hidden="true"></i>
            <div class="sw__crt" aria-hidden="true"><i class="sw__grain"></i><i class="sw__roll"></i></div>
            <div class="sw__glass" aria-hidden="true"></div>
          </div>
        </div>
        <div class="sw__scope sw__scope--score"><span class="sw__score" aria-live="polite"></span></div>
        <div class="sw__deck">
          <div class="sw__keys">
            <button type="button" class="sw__key" data-sw="mode" data-players="1"></button>
            <button type="button" class="sw__key" data-sw="mode" data-players="2"></button>
            <button type="button" class="sw__key" data-sw="help"></button>
            <button type="button" class="sw__key" data-sw="scores"></button>
            <button type="button" class="sw__key sw__key--power" data-sw="close"></button>
          </div>
          <div class="sw__volume" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="10">
            <svg class="sw__scale" viewBox="0 0 72 72" aria-hidden="true">${scale()}<text x="13" y="62">0</text><text x="59" y="62">10</text><text class="sw__scale-name" x="36" y="70"></text></svg>
            <i class="sw__knob"></i>
          </div>
        </div>
      </div>
      ${box("wedge", ["← →", "↑", "↓", "Enter"])}
    </div>`;
  document.body.append(dialog);
  canvas = dialog.querySelector("canvas");
  ctx = canvas.getContext("2d");
  screen = dialog.querySelector(".sw__screen");
  picture = dialog.querySelector(".sw__picture");
  beam = dialog.querySelector(".sw__beam");
  panel = dialog.querySelector(".sw__panel");
  dial = dialog.querySelector(".sw__volume");
  knob = dialog.querySelector(".sw__knob");
  wireKnob();
  scoreEl = dialog.querySelector(".sw__score");
  scopes = [...dialog.querySelectorAll(".sw__box .sw__scope")].map(el => ({
    el, name: el.querySelector(".sw__scope-name"), fuel: el.querySelector(".sw__scope-fuel"), data: el.querySelector(".sw__scope-data") }));
  boxes = [...dialog.querySelectorAll(".sw__box")].map(el => ({
    el, ...Object.fromEntries([...el.querySelectorAll("[data-ctl]")].map(lever => [lever.dataset.ctl, lever])) }));
  stars = Array.from({ length: 150 }, () => ({ x: rand(-1, 1), y: rand(-1, 1), b: rand(.2, 1) ** 2 }));

  new ResizeObserver(() => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = canvas.height = Math.round(screen.clientWidth * dpr);
    if (dialog.open && document.documentElement.classList.contains("is-tape-paused")) { previousLight = undefined; draw(); }
  }).observe(screen);
  const redrawStill = () => {
    if (dialog.open && document.documentElement.classList.contains("is-tape-paused")) draw();
  };
  new MutationObserver(redrawStill).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  systemDark.addEventListener("change", redrawStill);

  dialog.addEventListener("keydown", onKey);
  dialog.addEventListener("keyup", onKey);
  dialog.addEventListener("click", event => {
    sound.wake();
    const action = event.target.closest("[data-sw]")?.dataset.sw;
    if (action === "help") toggleHelp();
    else if (action === "mode") toggleMode(+event.target.closest("[data-sw]").dataset.players);
    else if (action === "scores") panel.dataset.kind === "scores" && !panel.hidden ? closePanel() : showScores();
    else if (action === "close") { sound.clack(); switchOff(); }
    else if (action === "file") saveFile();
    else if (action === "back") closePanel();
  });
  dialog.addEventListener("submit", event => {
    event.preventDefault();
    saveScore(new FormData(event.target).get("name") || "");
  });
  window.addEventListener("blur", () => { held.clear(); if (state === "play") paused = true; });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    sound.hush();
    if (state === "play") paused = true;
  });
  document.addEventListener("tape-pause-change", () => {
    if (!dialog.open) return;
    if (document.documentElement.classList.contains("is-tape-paused")) {
      cancelAnimationFrame(raf); raf = 0; sound.hush();
    } else if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });
  dialog.addEventListener("cancel", event => { event.preventDefault(); switchOff(); });
  dialog.addEventListener("close", () => {
    tuneAway();
    tunedAway = false;
    cancelAnimationFrame(raf); raf = 0;
    held.clear(); tapped.clear();
    panel.hidden = true; paused = false;
    state = "title"; ships = [];
    closing = false;
    sound.rest();
    dialog.classList.remove("is-shutting", "is-off");
    [picture, beam].forEach(el => el.getAnimations().forEach(a => a.cancel()));
    document.documentElement.classList.remove("sw-open");
  });
}

// Opens the console and returns it; switched off, it fires "poweroff" as its tube goes dark, then "close".
export async function openSpacewar() {
  await loadStyles();
  if (!dialog) build();
  const t = say();
  dialog.querySelector(".sw__model").textContent = t.model;
  dialog.querySelector('[data-players="1"]').textContent = t.one;
  dialog.querySelector('[data-players="2"]').textContent = t.two;
  dialog.querySelector('[data-sw="help"]').textContent = t.help;
  dialog.querySelector('[data-sw="scores"]').textContent = t.scores;
  dialog.querySelector('[data-sw="close"]').textContent = t.exit;
  dialog.querySelectorAll("[data-ctl-label]").forEach(label => { label.textContent = t.ctl[label.dataset.ctlLabel]; });
  dialog.querySelector(".sw__scale-name").textContent = t.volume.toUpperCase();
  dial.setAttribute("aria-label", t.volume);
  showLevel();
  // The glass on the screens shares the page's grain.
  const grain = document.querySelector("body > .crt-screen")?.style.getPropertyValue("--grain");
  if (grain) dialog.style.setProperty("--grain", grain);
  state = "title"; ships = []; score = 0; round = 1; wins = [0, 0];
  latchKeys(false); showReadouts();
  document.documentElement.classList.add("sw-open");
  dialog.showModal();
  canvas.focus();
  sound.wake();
  sound.staticHiss();
  tube(true);
  last = performance.now(); acc = 0;
  if (document.documentElement.classList.contains("is-tape-paused")) draw();
  if (!raf) raf = requestAnimationFrame(frame);
  return dialog;
}
