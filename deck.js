// The attractor collection: trading cards for the renders behind "Strange attractors & fractals".
// Loaded on first use by script.js. Each card follows the pointer on springs; a lifted card can be
// tilted hard and spun round by dragging. The equations and parameters are the ones used for the
// renders (github.com/MatuZale/color_recursive_maps).

const CARDS = [
  {
    id: "clifford", name: "Clifford", kind: "2D map", symbol: "↻", rarity: "★",
    credit: "after Clifford A. Pickover",
    eq: ["<i>x</i>′ = sin(<i>a y</i>) + <i>c</i> cos(<i>a x</i>)", "<i>y</i>′ = sin(<i>b x</i>) + <i>d</i> cos(<i>b y</i>)"],
    params: "<i>a</i> = −1.4 · <i>b</i> = 1.6 · <i>c</i> = 1.0 · <i>d</i> = 0.7",
    text: "Four numbers and two trigonometric terms. Every orbit lands on the same filigree, so a density histogram of the hits reads like silk. The hero of this page runs this map live.",
    stats: "4096² · 30.8 M points",
    alt: "Clifford attractor in electric violet with yellow-green edges",
  },
  {
    id: "dejong", name: "Peter de Jong", kind: "2D map", symbol: "↻", rarity: "★",
    credit: "after Peter de Jong",
    eq: ["<i>x</i>′ = sin(<i>a y</i>) − cos(<i>b x</i>)", "<i>y</i>′ = sin(<i>c x</i>) − cos(<i>d y</i>)"],
    params: "<i>a</i> = 1.4 · <i>b</i> = −2.3 · <i>c</i> = 2.4 · <i>d</i> = −2.1",
    text: "Clifford's sibling, with its own frequency for every term. Most parameter sets collapse onto a few points; a handful unfold into folded veils like this one.",
    stats: "4096² · 33 M points",
    alt: "Peter de Jong attractor: folded magenta veils on black",
  },
  {
    id: "simon", name: "Simon", kind: "2D map", symbol: "↻", rarity: "★",
    credit: "Clifford, with sine and cosine swapped",
    eq: ["<i>x</i>′ = cos(<i>b y</i>) + <i>c</i> sin(<i>b x</i>)", "<i>y</i>′ = cos(<i>a x</i>) + <i>d</i> sin(<i>a y</i>)"],
    params: "<i>a</i> = 1.9 · <i>b</i> = 1.3 · <i>c</i> = −1.6 · <i>d</i> = 0.8",
    text: "A tiny change to the formula and a different creature: wide translucent ribbons, pinched into two bright cusps where the orbit lingers.",
    stats: "4096² · 30 M points",
    alt: "Simon attractor: translucent teal ribbons with two bright cusps",
  },
  {
    id: "ikeda", name: "Ikeda", kind: "2D map", symbol: "◎", rarity: "★",
    credit: "Kensuke Ikeda, 1979",
    eq: ["<i>t</i> = 0.4 − 6 / (1 + <i>x</i>² + <i>y</i>²)", "<i>x</i>′ = 1 + <i>u</i>(<i>x</i> cos <i>t</i> − <i>y</i> sin <i>t</i>)", "<i>y</i>′ = <i>u</i>(<i>x</i> sin <i>t</i> + <i>y</i> cos <i>t</i>)"],
    params: "<i>u</i> = 0.9",
    text: "Light circulating in a nonlinear optical ring cavity. Each pass rotates the field by an angle that depends on its intensity, winding the orbit into a spiral.",
    stats: "4096² · 35 M points",
    alt: "Ikeda attractor: a spiral of peach and pink filaments",
  },
  {
    id: "julia", name: "Julia set", kind: "Fractal", symbol: "✣", rarity: "★★",
    credit: "Gaston Julia, 1918",
    eq: ["<i>z</i>′ = <i>z</i>² + <i>c</i>", "escape when |<i>z</i>| > 2"],
    params: "<i>c</i> = −0.8 + 0.156<i>i</i> · 220 iterations",
    text: "Not an attractor but its mirror image: the border between points that stay bounded and points that run off to infinity. Colour counts how fast each pixel escapes.",
    stats: "4096² · every pixel iterated",
    alt: "Julia set for c = −0.8 + 0.156i in rainbow colours",
  },
  {
    id: "thomas", name: "Thomas", kind: "3D flow", symbol: "∿", rarity: "★★",
    credit: "René Thomas, 1999",
    eq: ["<i>ẋ</i> = sin <i>y</i> − <i>b x</i>", "<i>ẏ</i> = sin <i>z</i> − <i>b y</i>", "<i>ż</i> = sin <i>x</i> − <i>b z</i>"],
    params: "<i>b</i> ≈ 0.208 · d<i>t</i> = 0.006",
    text: "A continuous flow, not a map: three identical equations chasing each other round x → y → z. b is the friction; near 0.208 the motion turns chaotic. A frame from a particle animation.",
    stats: "2560 × 1440 · 150 k particles",
    alt: "Thomas attractor: neon particle trails in cyan, magenta and yellow",
  },
  {
    id: "layered", name: "Layered Clifford", kind: "2D maps", symbol: "≋", rarity: "★★",
    credit: "three Clifford maps, one exposure",
    eq: ["<i>x</i>′ = sin(<i>a</i><sub>k</sub><i>y</i>) + <i>c</i><sub>k</sub> cos(<i>a</i><sub>k</sub><i>x</i>)", "<i>y</i>′ = sin(<i>b</i><sub>k</sub><i>x</i>) + <i>d</i><sub>k</sub> cos(<i>b</i><sub>k</sub><i>y</i>)"],
    params: "<i>a</i> = −1.4 · <i>b</i> = 1.7 · (<i>c</i>, <i>d</i>)<sub>k</sub> = (1, .7) (−.5, −1) (1.6, .9)",
    text: "Three Clifford maps with different weights, each nudged off the base parameters, blurred by different amounts and summed like layers of a long exposure.",
    stats: "3 layers · density composite",
    alt: "Layered Clifford attractors in cosmic-fire orange on deep blue",
  },
  {
    id: "smoke", name: "Simon · smoke", kind: "Alt art", symbol: "↻", rarity: "✦",
    credit: "same map, heavier exposure",
    eq: ["<i>x</i>′ = cos(<i>b y</i>) + <i>c</i> sin(<i>b x</i>)", "<i>y</i>′ = cos(<i>a x</i>) + <i>d</i> sin(<i>a y</i>)"],
    params: "<i>a</i> = −1.2 · <i>b</i> = 1.9 · <i>c</i> = 1.3 · <i>d</i> = −1.1",
    text: "Alternate art. Four times the points, more iterations, a wider blur and a softer tone curve: 117 million hits dissolved into smoke.",
    stats: "4096² · 117 M points",
    alt: "Smoky magenta Simon attractor shaped like a twisted ribbon",
  },
];

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
  const number = String(index + 1).padStart(2, "0") + "/" + String(CARDS.length).padStart(2, "0");
  return `
    <li class="deck__slot" style="--i: ${index}">
      <div class="tcard tcard--${card.id}" role="button" tabindex="0" aria-pressed="false" aria-label="${card.name}: lift the card">
        <div class="tcard__rotator">
          <div class="tcard__face tcard__front">
            <div class="tcard__panel">
              <div class="tcard__head">
                <h3 class="tcard__name">${card.name}</h3>
                <span class="tcard__kind">${card.kind}<span class="tcard__symbol" aria-hidden="true">${card.symbol}</span></span>
              </div>
              <div class="tcard__art">
                <img src="assets/deck/${card.id === "smoke" ? "simon-smoke" : card.id}.webp" alt="${card.alt}" width="1200" height="900" decoding="async" draggable="false" />
                <span class="tcard__foil" aria-hidden="true"></span>
              </div>
              <p class="tcard__credit">${card.credit}</p>
              <div class="tcard__eq">${card.eq.map(line => `<span>${line}</span>`).join("")}</div>
              <p class="tcard__params">${card.params}</p>
              <p class="tcard__text">${card.text}</p>
              <div class="tcard__foot"><span>No. ${number}</span><span>${card.stats}</span><span class="tcard__rarity" aria-hidden="true">${card.rarity}</span></div>
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
        <span class="deck__hint--pointer">Tilt a card with the pointer. Click to lift it out, drag to spin it round, Esc to put it back.</span>
        <span class="deck__hint--touch">Tap a card to lift it out and drag to spin it round. Tap again to put it back.</span>
      </p>
      <button type="button" class="deck__close">Close <span aria-hidden="true">✕</span></button>
    </div>
    <ul class="deck__grid">${CARDS.map(cardMarkup).join("")}</ul>
    <div class="deck__veil" aria-hidden="true"></div>`;
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
      const width = Math.min(vh * .88 * 63 / 88, vw * .92, 560);
      el.style.setProperty("--stage-w", width.toFixed(1) + "px");
      el.style.setProperty("--stage-x", ((vw - width) / 2).toFixed(1) + "px");
      el.style.setProperty("--stage-y", ((vh - width * 88 / 63) / 2).toFixed(1) + "px");
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
