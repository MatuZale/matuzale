// The footer game crashing, now and then (games.js decides when; the board then stays down). The
// picture glitches: bands slip sideways, pixels turn the wrong colour, garbage appears and the caption's
// letters scramble. Then every pixel breaks out of the flat board, lifts off the page towards the viewer,
// tumbles and falls away under gravity; the large pieces (the well, the maze, the text) tip forward out
// of the board like panes. A core dump is left written on the board, over an idle prompt. Decoration only;
// loaded on the first crash.

const SVG = "http://www.w3.org/2000/svg";
const rand = (a, b) => a + Math.random() * (b - a);
const tapePaused = () => document.documentElement.classList.contains("is-tape-paused");
// Wait in tape time, so the glitch, the explosion and the dump stay in sync.
const sleep = ms => new Promise(done => {
  let remaining = ms, started = 0, timer = 0;
  function sync() {
    if (timer) { clearTimeout(timer); timer = 0; remaining -= performance.now() - started; }
    if (!tapePaused()) {
      started = performance.now();
      timer = setTimeout(() => { document.removeEventListener("tape-pause-change", sync); done(); }, Math.max(0, remaining));
    }
  }
  document.addEventListener("tape-pause-change", sync);
  sync();
});
const NOISE = "▓▒░#%&@$?!";

export async function crash({ figure, board, pixels, caption, name }) {
  figure.classList.add("is-crashing");
  await sleep(0);
  await glitch(pixels, caption, name, 1100);
  burst(board, pixels);
  caption.textContent = `${name}: crashed`;
  await sleep(900);
  dump(pixels, name);
  figure.classList.remove("is-crashing");
}

// Corrupted frames, a dozen or so, from the picture as it was.
async function glitch(pixels, caption, name, length) {
  const frame = [...pixels.children], boxes = frame.map(n => n.getBBox());
  const classes = [...new Set(frame.map(n => n.getAttribute("class")).filter(Boolean))];
  let remaining = length;
  while (remaining > 0) {
    const band = rand(10, 110), height = rand(6, 34), shift = Math.round(rand(-5, 5)) * 8;
    const out = frame.map((n, i) => {
      const copy = n.cloneNode(true), box = boxes[i], middle = box.y + box.height / 2;
      if (middle > band && middle < band + height) copy.setAttribute("transform", `translate(${shift} 0)`);
      if (Math.random() < .08) copy.setAttribute("class", classes[Math.floor(Math.random() * classes.length)]);
      return copy;
    });
    for (let i = 0, n = Math.floor(rand(3, 9)); i < n; i++) {
      const long = Math.random() < .4, garbage = document.createElementNS(SVG, "rect");
      garbage.setAttribute("x", rand(30, 340).toFixed(1));
      garbage.setAttribute("y", rand(20, 108).toFixed(1));
      garbage.setAttribute("width", long ? rand(14, 60).toFixed(1) : 6);
      garbage.setAttribute("height", long ? 1.5 : 6);
      garbage.setAttribute("class", classes[Math.floor(Math.random() * classes.length)] || "g-text");
      out.push(garbage);
    }
    pixels.replaceChildren(...out);
    caption.textContent = [...name].map(ch => Math.random() < .45 ? NOISE[Math.floor(Math.random() * NOISE.length)] : ch).join("");
    const step = rand(50, 110);
    await sleep(step);
    remaining -= step;
  }
  pixels.replaceChildren(...frame);
}

// Each piece drawn in its own little SVG in a layer over the page (fixed, so nothing it does can move
// the page), and thrown.
function burst(board, pixels) {
  const layer = Object.assign(document.createElement("div"), { className: "circuit-burst" });
  layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);
  const ctm = board.getScreenCTM(), view = board.getBoundingClientRect();
  const cx = view.left + view.width / 2, cy = view.top + view.height / 2;
  layer.style.perspectiveOrigin = `${cx}px ${cy}px`;
  let last = 0;
  const animations = [];
  for (const n of [...pixels.children]) {
    const b = n.getBBox(), pad = 3;
    if (!b.width && !b.height) continue;
    const piece = document.createElementNS(SVG, "svg");
    piece.setAttribute("viewBox", `${b.x - pad} ${b.y - pad} ${b.width + 2 * pad} ${b.height + 2 * pad}`);
    const left = ctm.a * (b.x - pad) + ctm.e, top = ctm.d * (b.y - pad) + ctm.f;
    const width = (b.width + 2 * pad) * ctm.a, height = (b.height + 2 * pad) * ctm.d;
    Object.assign(piece.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
    piece.append(n.cloneNode(true));
    layer.append(piece);
    const big = b.width > 30 || b.height > 30, delay = rand(0, 260), duration = big ? rand(1700, 2300) : rand(1600, 2700);
    if (big) piece.style.transformOrigin = "50% 100%";
    animations.push(piece.animate(big ? tip() : fling(left + width / 2 - cx, top + height / 2 - cy), { duration, delay, easing: "linear", fill: "both" }));
    last = Math.max(last, delay + duration);
  }
  pixels.replaceChildren();
  let held = [];
  function sync() {
    if (tapePaused()) {
      held = animations.filter(animation => animation.playState === "running");
      held.forEach(animation => animation.pause());
    } else {
      held.forEach(animation => { if (animation.playState === "paused") animation.play(); });
      held = [];
    }
  }
  document.addEventListener("tape-pause-change", sync);
  sync();
  sleep(last + 200).then(() => { document.removeEventListener("tape-pause-change", sync); layer.remove(); });
}

// A pixel: away from the board's middle, up, towards the viewer (up to some five times its size, with
// the layer's 700px perspective) and down, tumbling as it goes.
function fling(dx, dy) {
  const vx = dx * rand(1, 2.6) + rand(-90, 90), vy = rand(-340, -90) + dy * .6, fall = rand(560, 980);
  const lift = rand(240, 560), rx = rand(-900, 900), ry = rand(-900, 900), rz = rand(-240, 240);
  return Array.from({ length: 13 }, (_, i) => {
    const t = i / 12;
    return {
      transform: `translate3d(${(vx * t).toFixed(1)}px, ${(vy * t + fall * t * t).toFixed(1)}px, ${(lift * Math.sin(Math.PI * t * .8)).toFixed(1)}px) rotateX(${(rx * t).toFixed(1)}deg) rotateY(${(ry * t).toFixed(1)}deg) rotateZ(${(rz * t).toFixed(1)}deg)`,
      opacity: t < .7 ? 1 : 1 - (t - .7) / .3,
    };
  });
}
// A large piece: it tips forward out of the board about its bottom edge, towards the viewer, and drops.
function tip() {
  const angle = rand(60, 88), fall = rand(160, 320), lean = rand(-25, 25);
  return Array.from({ length: 9 }, (_, i) => {
    const t = i / 8, e = t * t;
    return {
      transform: `translate3d(0, ${(fall * e).toFixed(1)}px, ${(60 * t).toFixed(1)}px) rotateX(${(-angle * Math.min(1, t * 1.6)).toFixed(1)}deg) rotateZ(${(lean * t).toFixed(1)}deg)`,
      opacity: t < .6 ? 1 : 1 - (t - .6) / .4,
    };
  });
}

// The core dump, written on the empty board: the process is gone (128 + signal 11) and the shell waits.
function dump(pixels, name) {
  const line = (y, cls, text) => {
    const t = document.createElementNS(SVG, "text");
    t.setAttribute("x", 44); t.setAttribute("y", y); t.setAttribute("class", cls);
    t.textContent = text;
    return t;
  };
  const prompt = line(92, "g-text g-text--value", "$");
  const cursor = document.createElementNS(SVG, "rect");
  cursor.setAttribute("y", 86); cursor.setAttribute("width", 3.5); cursor.setAttribute("height", 6.5); cursor.setAttribute("class", "g-cursor");
  pixels.replaceChildren(
    line(50, "g-crash", "Segmentation fault (core dumped)"),
    line(63, "g-text", `pid ${Math.floor(rand(1200, 9800))} · ${name} · signal 11 (SIGSEGV)`),
    line(74, "g-text", "[process exited with code 139]"),
    prompt,
    cursor,
  );
  cursor.setAttribute("x", (44 + prompt.getComputedTextLength() + 2.5).toFixed(1));
}
