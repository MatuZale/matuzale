// The attractor collection: trading cards for the renders behind "Strange attractors & fractals".
// Loaded on first use by script.js. Each card follows the pointer on springs; a lifted card can be
// tilted hard and spun round by dragging. The equations and parameters are the ones used for the
// renders (github.com/MatuZale/color_recursive_maps).

// Each card reads like a trading card: a stage tag and dimension in the header, a Pokédex-style
// strip under the art, an ability, the update rules as "attacks", the parameters in the
// weakness / resistance bar and the description as flavour text.
// The left-hand side of an update rule: the next value of a variable.
const X = name => `<i>${name}</i><sub>n+1</sub>`;

const CARDS = [
  {
    id: "clifford", name: "Clifford", stage: "2D map", dim: 2, symbol: "↻", rarity: "★",
    credit: "after Clifford A. Pickover", ability: "Four-number filigree",
    eq: [[X("x"), "sin(<i>a y</i><sub>n</sub>) + <i>c</i> cos(<i>a x</i><sub>n</sub>)"], [X("y"), "sin(<i>b x</i><sub>n</sub>) + <i>d</i> cos(<i>b y</i><sub>n</sub>)"]],
    stats: [["<i>a</i>", "−1.4"], ["<i>b</i>", "1.6"], ["<i>c</i>", "1.0"], ["<i>d</i>", "0.7"]],
    text: "Every orbit lands on the same filigree, so a histogram of 30 million hits reads like silk. The hero of this page runs this map live.",
    size: "4096² · 30.8 M points",
    alt: "Clifford attractor in electric violet with yellow-green edges",
  },
  {
    id: "dejong", name: "Peter de Jong", stage: "2D map", dim: 2, symbol: "↻", rarity: "★",
    credit: "after Peter de Jong", ability: "Folded veil",
    eq: [[X("x"), "sin(<i>a y</i><sub>n</sub>) − cos(<i>b x</i><sub>n</sub>)"], [X("y"), "sin(<i>c x</i><sub>n</sub>) − cos(<i>d y</i><sub>n</sub>)"]],
    stats: [["<i>a</i>", "1.4"], ["<i>b</i>", "−2.3"], ["<i>c</i>", "2.4"], ["<i>d</i>", "−2.1"]],
    text: "Clifford's sibling, with its own frequency for every term. Most parameter sets collapse onto a few points; a handful unfold into veils.",
    size: "4096² · 33 M points",
    alt: "Peter de Jong attractor: folded magenta veils on black",
  },
  {
    id: "simon", name: "Simon", stage: "2D map", dim: 2, symbol: "↻", rarity: "★",
    credit: "Clifford, with sine and cosine swapped", ability: "Swapped phase",
    eq: [[X("x"), "cos(<i>b y</i><sub>n</sub>) + <i>c</i> sin(<i>b x</i><sub>n</sub>)"], [X("y"), "cos(<i>a x</i><sub>n</sub>) + <i>d</i> sin(<i>a y</i><sub>n</sub>)"]],
    stats: [["<i>a</i>", "1.9"], ["<i>b</i>", "1.3"], ["<i>c</i>", "−1.6"], ["<i>d</i>", "0.8"]],
    text: "A tiny change to the formula, a different creature: translucent ribbons pinched into two bright cusps where the orbit lingers.",
    size: "4096² · 30 M points",
    alt: "Simon attractor: translucent teal ribbons with two bright cusps",
  },
  {
    id: "ikeda", name: "Ikeda", stage: "2D map", dim: 2, symbol: "◎", rarity: "★",
    credit: "Kensuke Ikeda, 1979", ability: "Ring-cavity spiral", style: "--eq: .86",
    eq: [["<i>t</i><sub>n</sub>", "0.4 − 6 / (1 + <i>x</i><sub>n</sub>² + <i>y</i><sub>n</sub>²)"], [X("x"), "1 + <i>u</i>(<i>x</i><sub>n</sub> cos <i>t</i><sub>n</sub> − <i>y</i><sub>n</sub> sin <i>t</i><sub>n</sub>)"], [X("y"), "<i>u</i>(<i>x</i><sub>n</sub> sin <i>t</i><sub>n</sub> + <i>y</i><sub>n</sub> cos <i>t</i><sub>n</sub>)"]],
    stats: [["<i>u</i>", "0.9"], ["iterations", "160"], ["orbits", "220 k"]],
    text: "Light circling a nonlinear optical cavity. Each pass turns the field by an angle set by its intensity, winding the orbit into a spiral.",
    size: "4096² · 35 M points",
    alt: "Ikeda attractor: a spiral of peach and pink filaments",
  },
  {
    id: "julia", name: "Julia set", stage: "Fractal", dim: 2, symbol: "✣", rarity: "★★",
    credit: "Gaston Julia, 1918", ability: "Escape time",
    eq: [[X("z"), "<i>z</i><sub>n</sub>² + <i>c</i>"], ["", "escape when |<i>z</i><sub>n</sub>| &gt; 2"]],
    stats: [["<i>c</i>", "−0.8 + 0.156<i>i</i>"], ["iterations", "220"]],
    text: "Not an attractor but its mirror image: the border between points that stay bounded and points that run to infinity. Colour is escape speed.",
    size: "4096² · every pixel iterated",
    alt: "Julia set for c = −0.8 + 0.156i in rainbow colours",
  },
  {
    id: "thomas", name: "Thomas", stage: "3D flow", dim: 3, symbol: "∿", rarity: "★★",
    credit: "René Thomas, 1999", ability: "Cyclic symmetry",
    eq: [["<i>ẋ</i>", "sin <i>y</i> − <i>b x</i>"], ["<i>ẏ</i>", "sin <i>z</i> − <i>b y</i>"], ["<i>ż</i>", "sin <i>x</i> − <i>b z</i>"]],
    stats: [["<i>b</i>", "≈ 0.208"], ["<i>dt</i>", "0.006"], ["particles", "150 k"]],
    text: "A flow, not a map: three identical equations chasing each other round x → y → z. b is friction; near 0.208 the motion turns chaotic.",
    size: "2560 × 1440 · animation frame",
    alt: "Thomas attractor: neon particle trails in cyan, magenta and yellow",
  },
  {
    id: "layered", name: "Layered Clifford", stage: "2D maps", dim: 2, symbol: "≋", rarity: "★★",
    credit: "three Clifford maps, one exposure", ability: "Long exposure", style: "--eq: .94",
    eq: [[X("x"), "sin(<i>a</i><sub>k</sub><i>y</i><sub>n</sub>) + <i>c</i><sub>k</sub> cos(<i>a</i><sub>k</sub><i>x</i><sub>n</sub>)"], [X("y"), "sin(<i>b</i><sub>k</sub><i>x</i><sub>n</sub>) + <i>d</i><sub>k</sub> cos(<i>b</i><sub>k</sub><i>y</i><sub>n</sub>)"], ["", "layers <i>k</i> = 1, 2, 3 · weights 1, 0.8, 0.6"]],
    stats: [["<i>a</i>", "−1.4"], ["<i>b</i>", "1.7"], ["layers <i>k</i>", "3"]],
    text: "Three Clifford maps, (<i>c</i>, <i>d</i>) = (1, 0.7), (−0.5, −1) and (1.6, 0.9), with <i>a</i> and <i>b</i> nudged by ×1.15 · ×0.92 and ×0.88 · ×1.12, blurred by different amounts and summed like layers of film.",
    size: "density composite",
    alt: "Layered Clifford attractors in cosmic-fire orange on deep blue",
  },
  {
    id: "symmetric", name: "Symmetric icon", stage: "2D map", dim: 2, symbol: "✺", rarity: "★★",
    credit: "after Field &amp; Golubitsky", ability: "23-fold lace", style: "--eq: .9",
    eq: [[X("z"), "(<i>λ</i> + <i>α</i>|<i>z</i><sub>n</sub>|² + <i>iω</i>) <i>z</i><sub>n</sub>"], ["", "+ <i>β</i> Re(<i>z</i><sub>n</sub><sup>m</sup>) <i>z</i><sub>n</sub> + <i>γ</i> <i class=\"ol\">z</i><sub>n</sub><sup>m−1</sup>"]],
    stats: [["<i>λ</i>", "2.409"], ["<i>α</i>", "−2.5"], ["<i>γ</i>", "0.9"], ["<i>m</i>", "23"]],
    text: "One complex map mixing a polynomial, a conjugate and a radial term. It turns by 2π/<i>m</i>, so the picture does too: a lace rosette from a single orbit. (<i>β</i> = <i>ω</i> = 0.)",
    size: "1600 × 1200 · 64 M steps",
    alt: "Symmetric icon: a 23-fold lace rosette in pale blue on navy",
  },
  {
    id: "gumowski", name: "Gumowski–Mira", stage: "2D map", dim: 2, symbol: "❧", rarity: "★★",
    credit: "after Gumowski &amp; Mira", ability: "Feather fan", style: "--eq: .86",
    eq: [[X("x"), "<i>y</i><sub>n</sub> + <i>a y</i><sub>n</sub>(1 − <i>b y</i><sub>n</sub>²) + <i>G</i>(<i>x</i><sub>n</sub>)"], [X("y"), "−<i>x</i><sub>n</sub> + <i>G</i>(<i>x</i><sub>n+1</sub>)"], ["<i>G</i>(<i>x</i>)", "<i>μx</i> + 2(1 − <i>μ</i>)<i>x</i>² / (1 + <i>x</i>²)"]],
    stats: [["<i>a</i>", "0.008"], ["<i>b</i>", "0.05"], ["<i>μ</i>", "−0.496"]],
    text: "Two lines of algebra fold a bird out of one orbit, its wings thousands of nested curves. The catch: <i>y</i> must use the new <i>x</i><sub>n+1</sub>, or the bird never takes off.",
    size: "1600 × 1200 · 64 M steps",
    alt: "Gumowski–Mira attractor: a bird with fanned wings in indigo and teal",
  },
  {
    id: "bedhead", name: "Bedhead", stage: "2D map", dim: 2, symbol: "∾", rarity: "★",
    credit: "after Ivan Emrich", ability: "Tangled ribbons",
    eq: [[X("x"), "<i>y</i><sub>n</sub> sin(<i>x</i><sub>n</sub><i>y</i><sub>n</sub> / <i>b</i>) + cos(<i>a x</i><sub>n</sub> − <i>y</i><sub>n</sub>)"], [X("y"), "<i>x</i><sub>n</sub> + sin(<i>y</i><sub>n</sub>) / <i>b</i>"]],
    stats: [["<i>a</i>", "−0.81"], ["<i>b</i>", "−0.92"]],
    text: "The product <i>x</i>·<i>y</i> inside the sine tangles the orbit into ribbons that fold back over themselves, like hair after a night's sleep.",
    size: "1600 × 1200 · 64 M steps",
    alt: "Bedhead attractor: twisted ribbons in violet, teal and yellow",
    style: "--eq: .86",
  },
  {
    id: "mcmullen", name: "McMullen", stage: "Fractal", dim: 2, symbol: "◌", rarity: "★★",
    credit: "after Curtis McMullen", ability: "Ring after ring", style: "--eq: .86",
    eq: [["<i>F</i>(<i>z</i>)", "<i>z</i><sup>n</sup> + <i>λ</i> / <i>z</i><sup>n</sup>"], ["<i>z</i><sub>k+1</sub>", "<i>ω</i><sup>j</sup> ((<i>z</i><sub>k</sub> ± √(<i>z</i><sub>k</sub>² − 4<i>λ</i>)) / 2)<sup>1/n</sup>"], ["", "<i>ω</i> = e<sup>2π<i>i</i>/n</sup> · one of 2<i>n</i> branches, at random"]],
    stats: [["<i>λ</i>", "0.02"], ["<i>n</i>", "3"], ["branches", "6"]],
    text: "A Julia set once more, drawn by running the map in reverse: every step picks one of the 2<i>n</i> inverse branches at random and the orbit settles onto the set.",
    size: "1600 × 1200 · 64 M steps",
    alt: "McMullen map Julia set: a golden foam of nested rings on dark brown",
  },
  {
    id: "harmonic", name: "Harmonic", stage: "Chaos game", dim: 2, symbol: "✧", rarity: "★★",
    credit: "an IFS of my own", ability: "Field lines", style: "--eq: .92; --dd: 2.5cqw",
    eq: [[X("z"), "<i>s</i> / (<i>A z</i><sub>n</sub> + <i>B</i> <i class=\"ol\">z</i><sub>n</sub> + <i>C</i>)"], ["", "<i>s</i> = +0.995 or −1, chosen at random"]],
    stats: [["<i>A</i> ≈", "2.7+0.7<i>i</i>"], ["<i>B</i> ≈", "−0.7−0.4<i>i</i>"], ["<i>C</i> ≈", "−0.5+0.4<i>i</i>"]],
    text: "One inversion with a conjugate in the denominator, played as a chaos game. Nothing in it is a magnet, yet the density settles into field lines around two poles.",
    size: "1600 × 1200 · 800 k orbits",
    alt: "Harmonic IFS: magenta and cyan field lines with golden poles on deep violet",
  },
  {
    id: "smoke", name: "Simon", stage: "Alt art", dim: 2, symbol: "↻", rarity: "✦",
    credit: "smoke variant · heavier exposure", ability: "Smoke screen",
    eq: [[X("x"), "cos(<i>b y</i><sub>n</sub>) + <i>c</i> sin(<i>b x</i><sub>n</sub>)"], [X("y"), "cos(<i>a x</i><sub>n</sub>) + <i>d</i> sin(<i>a y</i><sub>n</sub>)"]],
    stats: [["<i>a</i>", "1.5"], ["<i>b</i>", "−1.8"], ["<i>c</i>", "1.6"], ["<i>d</i>", "0.9"]],
    text: "Alternate art. Twice the orbits, longer runs, a wider blur and a softer tone curve: 117 million hits dissolved into smoke.",
    size: "4096² · 117 M points",
    alt: "Smoky Simon attractor in indigo with green and yellow highlights",
  },
];

// The kind of foil, as on printed holo cards: reverse holo (texture everywhere but the artwork), regular holo
// (the artwork only) or full art. See deck.css.
const KIND = { clifford: "reverse", dejong: "reverse", simon: "reverse", ikeda: "reverse", thomas: "reverse", bedhead: "reverse", layered: "regular", symmetric: "regular", gumowski: "regular", harmonic: "regular", julia: "full", mcmullen: "full" };

// What lights the artwork window: cosmos dust (the default) or etched sun pillars. See deck.css.
const ART = { clifford: "pillar", simon: "pillar", ikeda: "pillar" };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// A damped spring per animated value. Small steps feel like a card in the hand rather than a tween.
class Spring {
  constructor(value, stiffness = .07, damping = .26) {
    this.value = this.target = value; this.velocity = 0;
    this.stiffness = stiffness; this.damping = damping;
  }
  set(target, stiffness, damping) {
    this.target = target;
    if (stiffness) this.stiffness = stiffness;
    if (damping) this.damping = damping;
  }
  jump(value) { this.value = this.target = value; this.velocity = 0; }
  step() {
    this.velocity = (this.velocity + (this.target - this.value) * this.stiffness) * (1 - this.damping);
    this.value += this.velocity;
    if (Math.abs(this.velocity) < 1e-3 && Math.abs(this.target - this.value) < 1e-3) { this.value = this.target; return false; }
    return true;
  }
}

function cardMarkup(card, index) {
  const number = String(index + 1).padStart(3, "0");
  const set = String(index + 1).padStart(2, "0") + "/" + String(CARDS.length).padStart(2, "0");
  const energy = `<span class="tcard__energy" aria-hidden="true">${card.symbol}</span>`;
  // The alternate art is a portrait full-bleed render; the others sit in a landscape window.
  const [file, width, height] = card.id === "smoke" ? ["simon-smoke", 900, 1257] : [card.id, 1200, 900];
  return `
    <li class="deck__slot" style="--i: ${index}">
      <div class="tcard tcard--${card.id}" data-foil="${card.id}" data-kind="${KIND[card.id] ?? ""}" data-art="${ART[card.id] ?? "dust"}" ${card.style ? `style="${card.style}"` : ""} role="button" tabindex="0" aria-pressed="false" aria-label="${card.name}${card.id === "smoke" ? " (alternate art)" : ""}: lift the card">
        <div class="tcard__rotator">
          <div class="tcard__face tcard__front">
            <div class="tcard__panel">
              <div class="tcard__head">
                <span class="tcard__stage">${card.stage}</span>
                <h3 class="tcard__name">${card.name}</h3>
                <span class="tcard__hp"><small>DIM</small>${card.dim}</span>
                ${energy}
              </div>
              <div class="tcard__art">
                <img src="assets/deck/${file}.webp" alt="${card.alt}" width="${width}" height="${height}" decoding="async" draggable="false" />
                <span class="tcard__foil" aria-hidden="true"></span>
              </div>
              <p class="tcard__strip"><span>NO. ${number}</span>${card.credit}</p>
              <p class="tcard__ability"><span class="tcard__ability-tag">Ability</span>${card.ability}</p>
              <div class="tcard__moves">${card.eq.map(([lhs, rhs]) => `<p class="tcard__move">${energy}<span class="tcard__eq">${lhs ? `<b>${lhs}</b> = ` : ""}${rhs}</span></p>`).join("")}</div>
              <dl class="tcard__stats">${card.stats.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>
              <p class="tcard__flavor">${card.text}</p>
              <div class="tcard__foot"><span>Illus. Tomasz Młynik</span><span>${card.size}</span><span>${set} <span class="tcard__rarity" aria-hidden="true">${card.rarity}</span></span></div>
            </div>
            <span class="tcard__shine" aria-hidden="true"></span>
            <span class="tcard__glare" aria-hidden="true"></span>
          </div>
          <div class="tcard__face tcard__back" aria-hidden="true">
            <span class="tcard__back-motif"></span>
            <span class="tcard__back-mark">TM</span>
            <span class="tcard__back-title">Strange attractors</span>
            <span class="tcard__glare"></span>
          </div>
        </div>
      </div>
    </li>`;
}

function loadStyles() {
  const href = new URL("deck.css", import.meta.url).href;
  if (document.querySelector(`link[href="${href}"]`)) return Promise.resolve();
  return new Promise(resolve => {
    const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href });
    link.onload = link.onerror = () => resolve();
    document.head.append(link);
  });
}

export async function createDeck() {
  await loadStyles();
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const dialog = document.createElement("dialog");
  dialog.className = "deck";
  dialog.setAttribute("aria-labelledby", "deck-title");
  dialog.innerHTML = `
    <div class="deck__bar">
      <div class="deck__heading">
        <p class="deck__kicker">Strange attractors &amp; fractals</p>
        <h2 id="deck-title">The collection <span>· ${CARDS.length} cards</span></h2>
      </div>
      <p class="deck__hint">
        <span class="deck__hint--pointer">Tilt a card with the pointer and click to lift it out. Flip it with the button, the mouse wheel, F or a sideways drag. Esc puts it back.</span>
        <span class="deck__hint--touch">Tap a card to lift it out and drag to spin it round. Tap again to put it back.</span>
      </p>
      <button type="button" class="deck__close">Close <span aria-hidden="true">✕</span></button>
    </div>
    <ul class="deck__grid" style="--mid: ${(CARDS.length - 1) / 2}">${CARDS.map(cardMarkup).join("")}</ul>
    <div class="deck__veil" aria-hidden="true"></div>
    <div class="deck__tools">
      <button type="button" class="deck__tool" data-deck-flip>Flip card <span aria-hidden="true">↻</span></button>
      <button type="button" class="deck__tool" data-deck-back>Put back</button>
    </div>`;
  document.body.append(dialog);

  const veil = dialog.querySelector(".deck__veil");
  const cards = [...dialog.querySelectorAll(".tcard")].map(el => controller(el));
  let active = null, opener = null;

  function controller(el) {
    const rotator = el.querySelector(".tcard__rotator");
    const s = {
      rx: new Spring(0), ry: new Spring(0), spin: new Spring(0, .05, .2),
      mx: new Spring(50), my: new Spring(50), o: new Spring(0, .05, .3),
      tx: new Spring(0, .06, .28), ty: new Spring(0, .06, .28), scale: new Spring(1, .06, .28),
    };
    let raf = 0;
    function render() {
      const mx = s.mx.value, my = s.my.value;
      const st = el.style;
      st.setProperty("--rx", s.rx.value.toFixed(2) + "deg");
      st.setProperty("--ry", (s.ry.value + s.spin.value).toFixed(2) + "deg");
      st.setProperty("--mx", mx.toFixed(2) + "%");
      st.setProperty("--my", my.toFixed(2) + "%");
      // The foil patterns move against the light and much less than it, as printed foil does.
      st.setProperty("--posx", (50 + (mx - 50) / 3.5).toFixed(2) + "%");
      st.setProperty("--posy", (50 + (my - 50) / 2.5).toFixed(2) + "%");
      st.setProperty("--hyp", clamp(Math.hypot(mx - 50, my - 50) / 50, 0, 1).toFixed(3));
      // Unitless offsets (-1 … 1) and an angle, for parallax and for conic / sweeping foils.
      st.setProperty("--px", ((mx - 50) / 50).toFixed(3));
      st.setProperty("--py", ((my - 50) / 50).toFixed(3));
      st.setProperty("--ang", (mx * 3.6 + my * .9).toFixed(1) + "deg");
      st.setProperty("--o", s.o.value.toFixed(3));
      st.setProperty("--tx", s.tx.value.toFixed(1) + "px");
      st.setProperty("--ty", s.ty.value.toFixed(1) + "px");
      st.setProperty("--s", s.scale.value.toFixed(4));
    }
    function tick() {
      let moving = false;
      for (const spring of Object.values(s)) moving = spring.step() || moving;
      if (!moving && !el.classList.contains("is-active")) unstage();
      render();
      raf = moving ? requestAnimationFrame(tick) : 0;
    }
    function wake() {
      if (motion.matches) { for (const spring of Object.values(s)) spring.jump(spring.target); tick(); return; }
      if (!raf) raf = requestAnimationFrame(tick);
    }
    // Pointer position on the card, 0…1 on both axes, mapped to rotation and light.
    function aim(x, y, strength) {
      s.rx.set((.5 - y) * strength, .07, .26);
      s.ry.set((x - .5) * strength, .07, .26);
      s.mx.set(x * 100, .07, .26);
      s.my.set(y * 100, .07, .26);
      s.o.set(1, .07, .26);
      wake();
    }
    function rest() {
      s.rx.set(0, .02, .12); s.ry.set(0, .02, .12);
      s.mx.set(50, .02, .12); s.my.set(50, .02, .12);
      s.o.set(0, .03, .2);
      wake();
    }
    // A lifted card is laid out at its full size in the middle of the viewport, rather than scaled up
    // from the grid: browsers rasterise a card tilted in 3D at its layout size, so an upscaled card
    // would turn soft. The flight between grid and stage is a scale *down* from the staged size.
    function stage() {
      const vw = document.documentElement.clientWidth, vh = window.innerHeight;
      // Leave room under the card for the flip / put back buttons.
      const room = 64, width = Math.min((vh - room) * .9 * 63 / 88, vw * .92, 560);
      el.style.setProperty("--stage-w", width.toFixed(1) + "px");
      el.style.setProperty("--stage-x", ((vw - width) / 2).toFixed(1) + "px");
      el.style.setProperty("--stage-y", ((vh - room - width * 88 / 63) / 2).toFixed(1) + "px");
      el.classList.add("is-staged");
      el.parentElement.classList.add("is-raised");
    }
    function unstage() {
      if (!el.classList.contains("is-staged")) return;
      el.classList.remove("is-staged");
      el.parentElement.classList.remove("is-raised");
      s.tx.jump(0); s.ty.jump(0); s.scale.jump(1);
    }
    // Offset and scale that draw the staged card exactly over its place in the grid.
    function slotOffset() {
      const slot = el.parentElement.getBoundingClientRect(), card = el.getBoundingClientRect();
      return {
        x: slot.left + slot.width / 2 - (card.left + card.width / 2),
        y: slot.top + slot.height / 2 - (card.top + card.height / 2),
        scale: slot.width / card.width,
      };
    }
    function place() { stage(); }
    function lift() {
      const flying = el.classList.contains("is-staged");
      el.classList.add("is-active");
      el.setAttribute("aria-pressed", "true");
      el.setAttribute("aria-label", el.getAttribute("aria-label").replace("lift the card", "put the card back"));
      stage();
      if (!flying) {
        const from = slotOffset();
        s.tx.jump(from.x); s.ty.jump(from.y); s.scale.jump(from.scale);
      }
      s.tx.set(0); s.ty.set(0); s.scale.set(1);
      // A flourish on the way out of the deck, then it settles face up.
      if (!motion.matches) s.spin.set(s.spin.target + 360, .03, .14);
      s.o.set(1); s.mx.set(50); s.my.set(50);
      wake();
    }
    function drop() {
      el.classList.remove("is-active");
      el.setAttribute("aria-pressed", "false");
      el.setAttribute("aria-label", el.getAttribute("aria-label").replace("put the card back", "lift the card"));
      const to = slotOffset();
      s.tx.set(to.x); s.ty.set(to.y); s.scale.set(to.scale);
      s.spin.set(Math.round(s.spin.target / 360) * 360, .04, .2);
      rest();
    }
    function flip(direction) { s.spin.set((Math.round(s.spin.target / 180) + direction) * 180, .04, .18); wake(); }
    function spinTo(value, snap) {
      if (snap) s.spin.set(Math.round(value / 180) * 180, .04, .18);
      else s.spin.set(value, .2, .45);
      wake();
    }
    return { el, rotator, s, aim, rest, place, lift, drop, flip, spinTo, render, unstage };
  }

  function lift(card) {
    if (active === card) return;
    if (active) active.drop();
    active = card;
    dialog.classList.add("has-active");
    card.lift();
  }
  function drop() {
    if (!active) return;
    active.drop();
    active = null;
    dialog.classList.remove("has-active");
  }

  // Hover tilt in the grid.
  for (const card of cards) {
    card.render();
    card.el.addEventListener("pointermove", event => {
      if (card === active || event.pointerType === "touch" || motion.matches) return;
      const r = card.el.getBoundingClientRect();
      card.aim(clamp((event.clientX - r.left) / r.width, 0, 1), clamp((event.clientY - r.top) / r.height, 0, 1), 26);
    });
    card.el.addEventListener("pointerleave", () => { if (card !== active) card.rest(); });
    card.el.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); card === active ? drop() : lift(card); }
      else if (card === active && (event.key === "ArrowLeft" || event.key === "ArrowRight")) { event.preventDefault(); card.flip(event.key === "ArrowLeft" ? -1 : 1); }
      else if (card === active && event.key.toLowerCase() === "f") { event.preventDefault(); card.flip(1); }
    });
  }

  // A click on a grid card lifts it (a click rather than a press, so a swipe can still scroll the
  // grid on touch screens). On the lifted card, a click puts it back and a drag spins it round;
  // releasing settles it on whichever face is nearer.
  let drag = null, spun = false;
  dialog.addEventListener("click", event => {
    const card = cards.find(c => c.el.contains(event.target));
    if (!card) return;
    if (card !== active) lift(card);
    else if (!spun) drop();
  });
  dialog.addEventListener("pointerdown", event => {
    spun = false;
    const card = cards.find(c => c.el.contains(event.target));
    if (!card || card !== active || event.button !== 0) return;
    drag = { card, id: event.pointerId, x: event.clientX, y: event.clientY, spin: card.s.spin.target, moved: false };
    card.el.setPointerCapture(event.pointerId);
  });
  dialog.addEventListener("pointermove", event => {
    if (!active) return;
    if (drag && drag.id === event.pointerId) {
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (Math.hypot(dx, dy) > 6) drag.moved = true;
      if (drag.moved) {
        active.spinTo(drag.spin + dx * .6, false);
        active.s.rx.set(clamp(-dy * .2, -30, 30), .1, .3);
        active.s.my.set(clamp(50 + dy * .25, 0, 100), .1, .3);
        active.s.mx.set(clamp(50 + dx * .25, 0, 100), .1, .3);
      }
      return;
    }
    if (event.pointerType === "touch" || motion.matches) return;
    // Over the buttons the card faces the viewer instead of craning towards the pointer.
    if (event.target.closest(".deck__tools")) { active.aim(.5, .5, 0); return; }
    // The staged card's own box, unaffected by its tilt.
    const r = active.el.getBoundingClientRect();
    active.aim(clamp((event.clientX - r.left) / r.width, 0, 1), clamp((event.clientY - r.top) / r.height, 0, 1), 34);
  });
  function endDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    const { card, moved } = drag;
    drag = null;
    spun = moved;
    if (moved) { card.spinTo(card.s.spin.target, true); card.s.rx.set(0, .04, .2); }
  }
  dialog.addEventListener("pointerup", endDrag);
  dialog.addEventListener("pointercancel", endDrag);
  veil.addEventListener("click", drop);
  dialog.querySelector("[data-deck-flip]").addEventListener("click", () => active?.flip(1));
  dialog.querySelector("[data-deck-back]").addEventListener("click", () => {
    const card = active;
    drop();
    card?.el.focus({ preventScroll: true });
  });
  // The wheel turns a lifted card like a dial and lets it settle on the nearer face.
  let wheelEnd = 0;
  dialog.addEventListener("wheel", event => {
    if (!active) return;
    event.preventDefault();
    active.spinTo(active.s.spin.target + clamp(event.deltaY + event.deltaX, -80, 80) * .9, false);
    clearTimeout(wheelEnd);
    const card = active;
    wheelEnd = setTimeout(() => card.spinTo(card.s.spin.target, true), 160);
  }, { passive: false });

  dialog.querySelector(".deck__close").addEventListener("click", () => dialog.close());
  // Esc first puts a lifted card back; a second Esc leaves the collection. Handled on keydown:
  // browsers stop honouring a cancelled "cancel" event after the first few in a row.
  dialog.addEventListener("keydown", event => {
    if (event.key === "Escape" && active) { event.preventDefault(); event.stopPropagation(); drop(); }
  });
  dialog.addEventListener("cancel", event => { if (active) { event.preventDefault(); drop(); } });
  dialog.addEventListener("close", () => {
    if (active) { active.drop(); active = null; dialog.classList.remove("has-active"); }
    cards.forEach(card => { for (const spring of Object.values(card.s)) spring.jump(spring === card.s.scale ? 1 : spring === card.s.mx || spring === card.s.my ? 50 : 0); card.unstage(); card.render(); });
    document.documentElement.classList.remove("deck-open");
    opener?.focus();
  });
  const replace = () => active?.place();
  window.addEventListener("resize", replace, { passive: true });
  dialog.addEventListener("scroll", replace, { passive: true });

  return {
    open(trigger) {
      opener = trigger;
      document.documentElement.classList.add("deck-open");
      dialog.classList.remove("is-dealt");
      dialog.showModal();
      dialog.scrollTop = 0;
      dialog.querySelector(".deck__close").focus();
      // Re-deal on every visit; the class restarts the CSS entrance.
      requestAnimationFrame(() => dialog.classList.add("is-dealt"));
    },
  };
}
