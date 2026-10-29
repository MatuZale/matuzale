// The attractor collection: trading cards for the renders behind "Strange attractors & fractals".
// Loaded on first use by script.js. Each card follows the pointer on springs; a lifted card can be
// tilted by touch, or spun round by dragging with a mouse. The equations and parameters are the ones used for the
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
  // From here on, renders of chaos_cards.py (2048 × 1536, scaled to 1200 × 900), in three foils after printed
  // cards: reverse holo (◆), holo rare with vertical beams (★) and amazing rare (★★★). See HOLO below.
  {
    id: "chirikov", name: "Chirikov", stage: "2D map", dim: 2, symbol: "⊙", rarity: "◆",
    credit: "Boris Chirikov, 1969", ability: "Islands in a chaotic sea",
    eq: [[X("p"), "<i>p</i><sub>n</sub> + <i>K</i> sin <i>θ</i><sub>n</sub>"], [X("θ"), "<i>θ</i><sub>n</sub> + <i>p</i><sub>n+1</sub>"], ["", "both mod 2π"]],
    stats: [["<i>K</i>", "0.9716"], ["orbits", "12 800"], ["iterations", "12 000"]],
    text: "A rotor kicked once a turn. Regular orbits wind round islands, coloured by mean |<i>p</i>|; the rest roam a navy chaotic sea. At Greene's <i>K</i> the last golden torus is about to break.",
    size: "2048 × 1536 · 154 M points",
    alt: "Chirikov standard map: rainbow rings of islands in a navy chaotic sea",
  },
  {
    id: "hopalong", name: "Hopalong", stage: "2D map", dim: 2, symbol: "✿", rarity: "◆",
    credit: "Barry Martin, 1986", ability: "Mandala", style: "--eq: .9",
    eq: [[X("x"), "<i>y</i><sub>n</sub> − sgn(<i>x</i><sub>n</sub>) √|<i>b x</i><sub>n</sub> − <i>c</i>|"], [X("y"), "<i>a</i> − <i>x</i><sub>n</sub>"]],
    stats: [["<i>a</i>", "−55"], ["<i>b</i>", "−1"], ["<i>c</i>", "−42"]],
    text: "A square root and a sign. One orbit from (0, 0) hops round the plane and lays down a mandala, ring after ring. Colour is when the orbit first reached each pixel.",
    size: "2048 × 1536 · 300 M iterations",
    alt: "Hopalong orbit: a mandala of rings of dark disks in teal and gold",
  },
  {
    id: "popcorn", name: "Popcorn", stage: "2D map", dim: 2, symbol: "❋", rarity: "◆",
    credit: "after Clifford A. Pickover", ability: "Popping kernels", style: "--eq: .86",
    eq: [[X("x"), "<i>x</i><sub>n</sub> − <i>h</i> sin(<i>y</i><sub>n</sub> + tan 3<i>y</i><sub>n</sub>)"], [X("y"), "<i>y</i><sub>n</sub> − <i>h</i> sin(<i>x</i><sub>n</sub> + tan 3<i>x</i><sub>n</sub>)"]],
    stats: [["<i>h</i>", "0.05"], ["iterations", "60"], ["starts", "2048²"]],
    text: "Every point of a grid takes sixty small steps. Near their poles the tangents swing each step round, and the tracks curl into a lattice of kernels. Colour is the direction of the starting point from the centre.",
    size: "2048 × 1536 · 252 M points",
    alt: "Pickover popcorn: a lattice of curled kernels in rainbow quadrants",
  },
  {
    id: "logistic", name: "Logistic map", stage: "1D map", dim: 1, symbol: "⋔", rarity: "★",
    credit: "Robert May, 1976", ability: "Period doubling",
    eq: [[X("x"), "<i>r x</i><sub>n</sub>(1 − <i>x</i><sub>n</sub>)"], ["<i>λ</i>", "mean of ln |<i>r</i>(1 − 2<i>x</i><sub>n</sub>)|"]],
    stats: [["<i>r</i>", "2.9 – 4"], ["burn-in", "2000"], ["iterations", "5000"]],
    text: "One parabola, iterated. As <i>r</i> grows, a steady value splits into 2, 4, 8, … states, each split about 4.669 times sooner than the last (Feigenbaum's <i>δ</i>), then chaos with windows of order. Colour is <i>λ</i>: blue below zero, red above.",
    size: "2048 × 1536 · 82 M points",
    alt: "Logistic map bifurcation diagram: one branch splitting into a fan of orange and red chaos",
  },
  {
    id: "halvorsen", name: "Halvorsen", stage: "3D flow", dim: 3, symbol: "✇", rarity: "★★★",
    credit: "after Arne Dehli Halvorsen", ability: "Three-fold propeller", style: "--eq: .9",
    eq: [["<i>ẋ</i>", "−<i>a x</i> − 4<i>y</i> − 4<i>z</i> − <i>y</i>²"], ["<i>ẏ</i>", "−<i>a y</i> − 4<i>z</i> − 4<i>x</i> − <i>z</i>²"], ["<i>ż</i>", "−<i>a z</i> − 4<i>x</i> − 4<i>y</i> − <i>x</i>²"]],
    stats: [["<i>a</i>", "1.4"], ["<i>dt</i>", "0.002"], ["view", "(1, 1, 1)"]],
    text: "One equation three times, round <i>x</i> → <i>y</i> → <i>z</i>; seen down the diagonal, the lobes make a propeller. The usual <i>a</i> = 1.89 settles onto a cycle in this form, so this one runs at 1.4.",
    size: "2048 × 1536 · 400 M RK4 steps",
    alt: "Halvorsen attractor seen along its diagonal: a three-lobed propeller in green and blue",
  },
  {
    id: "lorenz", name: "Lorenz", stage: "3D flow", dim: 3, symbol: "∞", rarity: "★★★",
    credit: "Edward N. Lorenz, 1963", ability: "Butterfly effect",
    eq: [["<i>ẋ</i>", "<i>σ</i>(<i>y</i> − <i>x</i>)"], ["<i>ẏ</i>", "<i>x</i>(<i>ρ</i> − <i>z</i>) − <i>y</i>"], ["<i>ż</i>", "<i>x y</i> − <i>β z</i>"]],
    stats: [["<i>σ</i>", "10"], ["<i>ρ</i>", "28"], ["<i>β</i>", "8/3"]],
    text: "Convection in a layer of fluid, cut down to three equations. Two orbits a hair apart soon part company, yet both trace the same two wings. Colour is speed.",
    size: "2048 × 1536 · 16 orbits · 3.2 M RK4 steps",
    alt: "Lorenz attractor: two wings of fine red and orange threads on black",
  },
  {
    id: "aizawa", name: "Aizawa", stage: "3D flow", dim: 3, symbol: "◍", rarity: "★★★",
    credit: "after Yoji Aizawa", ability: "Through the axis", style: "--eq: .78; --dd: 2.6cqw",
    eq: [["<i>ẋ</i>", "(<i>z</i> − <i>b</i>)<i>x</i> − <i>d y</i>"], ["<i>ẏ</i>", "<i>d x</i> + (<i>z</i> − <i>b</i>)<i>y</i>"], ["<i>ż</i>", "<i>c</i> + <i>a z</i> − <i>z</i>³/3 − (<i>x</i>² + <i>y</i>²)(1 + <i>e z</i>) + <i>f z x</i>³"]],
    stats: [["<i>a</i>", ".95"], ["<i>b</i>", ".7"], ["<i>c</i>", ".6"], ["<i>d</i>", "3.5"], ["<i>e</i>", ".25"], ["<i>f</i>", ".1"]],
    text: "A sphere wound round its axis: the orbit rises up the central tube, spirals out over the top, down the surface and back in at the bottom. <i>d</i> sets the spin; colour is depth.",
    size: "2048 × 1536 · 400 M RK4 steps",
    alt: "Aizawa attractor: a translucent green sphere pierced by a twisted teal tube",
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

// The kind of foil on the frame, as on printed holo cards: reverse holo (texture everywhere but the artwork),
// regular holo (matte frame, foil in the artwork only) or full art (gold). See deck.css.
const KIND = { clifford: "reverse", dejong: "reverse", simon: "reverse", ikeda: "reverse", thomas: "reverse", bedhead: "reverse", layered: "regular", symmetric: "regular", gumowski: "regular", harmonic: "regular", julia: "full", mcmullen: "full" };

// The artwork foil, as on printed cards: holo bars, an etched texture or sun pillars on the background around
// the attractor. See deck.css and assets/deck/foil/generate.py.
const ART = {
  clifford: "bars", layered: "bars", symmetric: "bars", gumowski: "bars", harmonic: "bars",
  dejong: "etched", simon: "etched", julia: "etched", mcmullen: "etched",
  ikeda: "pillar", thomas: "pillar", bedhead: "pillar",
};

// The chaos_cards.py renders carry the foils of three printed rarities instead (see deck.css, "Three printed
// foils", and assets/deck/foil/generate_holo.py):
//   reverse  reverse holo: an etched foil all over the card but the artwork, under a glare of its own
//   beam     holo rare: rainbow foil with vertical beams, in the artwork window only
//   amazing  amazing rare: the attractor breaks out of its window in a splash of glitter (Halvorsen's window
//            also an etched swirl, after the Jirachi amazing rare)
const HOLO = { chirikov: "reverse", hopalong: "reverse", popcorn: "reverse", logistic: "beam", halvorsen: "amazing", lorenz: "amazing", aizawa: "amazing" };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// Whether a spring has all but arrived: within eps of its target and hardly moving.
const near = eps => spring => Math.abs(spring.target - spring.value) < eps && Math.abs(spring.velocity) < eps / 4;

const SPRING_FRAME_MS = 1000 / 60;
// Coefficients retain the original 60 Hz feel. Exported for the deterministic cadence check.
export class Spring {
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
  step(elapsed = SPRING_FRAME_MS) {
    // Integrate at most four reference frames, never one large unstable step after
    // a stalled frame/background pause. Fractional steps also work at 120 Hz.
    const frames = clamp(elapsed / SPRING_FRAME_MS, 0, 4);
    for (let remaining = frames; remaining > 1e-9; remaining -= 1) {
      const dt = Math.min(remaining, 1);
      this.velocity = (this.velocity + (this.target - this.value) * this.stiffness * dt) * Math.pow(1 - this.damping, dt);
      this.value += this.velocity * dt;
    }
    if (Math.abs(this.velocity) < 1e-3 && Math.abs(this.target - this.value) < 1e-3) { this.jump(this.target); return false; }
    return true;
  }
}

function cardMarkup(card, index) {
  const number = String(index + 1).padStart(3, "0");
  const set = String(index + 1).padStart(2, "0") + "/" + String(CARDS.length).padStart(2, "0");
  const energy = `<span class="tcard__energy" aria-hidden="true">${card.symbol}</span>`;
  // The alternate art is a portrait full-bleed render; the others sit in a landscape window. An amazing rare
  // shows its render cut out of the dark background, so it can spill over the card (generate_holo.py).
  const [file, width, height] = card.id === "smoke" ? ["simon-smoke", 900, 1257]
    : HOLO[card.id] === "amazing" ? [`foil/cut-${card.id}`, 1200, 900] : [card.id, 1200, 900];
  return `
    <li class="deck__slot" style="--i: ${index}">
      <div class="tcard tcard--${card.id}" data-foil="${card.id}" data-kind="${KIND[card.id] ?? ""}" data-art="${ART[card.id] ?? ""}" data-holo="${HOLO[card.id] ?? ""}" ${card.style ? `style="${card.style}"` : ""} role="button" tabindex="0" aria-pressed="false" aria-label="${card.name}${card.id === "smoke" ? " (alternate art)" : ""}: lift the card">
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
                ${HOLO[card.id] === "amazing" ? `<span class="tcard__glitter" aria-hidden="true"></span>` : ""}
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
  const href = new URL("../css/deck.css", import.meta.url).href;
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
        <span class="deck__hint--touch">Tap to lift a card. Slide one finger to tilt it and explore the light; release to relax. Use Flip card to turn it over, or Put back to return it.</span>
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
  const tools = dialog.querySelector(".deck__tools");
  const closeButton = dialog.querySelector(".deck__close");
  const cards = [...dialog.querySelectorAll(".tcard")].map(el => controller(el));
  let active = null, opener = null;

  function controller(el) {
    const label = el.getAttribute("aria-label");
    const rotator = el.querySelector(".tcard__rotator");
    const s = {
      rx: new Spring(0), ry: new Spring(0), spin: new Spring(0, .05, .2),
      mx: new Spring(50), my: new Spring(50), o: new Spring(0, .05, .3),
      tx: new Spring(0, .06, .28), ty: new Spring(0, .06, .28), scale: new Spring(1, .06, .28),
    };
    let raf = 0, returning = false, lastFrame = null;
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
    function tick(time = performance.now()) {
      const elapsed = lastFrame === null ? 0 : Math.max(0, time - lastFrame);
      lastFrame = time;
      // On its way home a card follows its place in the grid, which may scroll meanwhile, and drops back
      // into the grid as soon as it is over it; its tilt and light settle there.
      if (returning) { const to = slotOffset(); s.tx.set(to.x); s.ty.set(to.y); s.scale.set(to.scale); }
      let moving = false;
      for (const spring of Object.values(s)) {
        if (motion.matches || document.documentElement.classList.contains("is-tape-paused")) spring.jump(spring.target);
        else moving = spring.step(elapsed) || moving;
      }
      if (returning && [s.tx, s.ty].every(near(.5)) && near(.002)(s.scale)) { returning = false; unstage(); }
      render();
      raf = moving ? requestAnimationFrame(tick) : 0;
      if (!moving) lastFrame = null;
    }
    function wake() {
      // Layout/hit-test changes can repeat pointerleave at a stationary pointer (notably
      // in WebKit). Resting an already settled card must not start another render cycle.
      if (!returning && Object.values(s).every(spring => spring.value === spring.target && spring.velocity === 0)) return;
      // While the tape is held, interactions still work, but settle instantly.
      if (motion.matches || document.documentElement.classList.contains("is-tape-paused")) { stop(); tick(); return; }
      if (!raf) {
        // Start a fresh clock on wake; idle time is not animation time. Do not reset
        // it on pointermove while running, or frequent input would starve the spring.
        lastFrame = performance.now();
        raf = requestAnimationFrame(tick);
      }
    }
    function stop() { cancelAnimationFrame(raf); raf = 0; lastFrame = null; }
    // Pointer position on the card, 0…1 on both axes, mapped to rotation and light.
    function aim(x, y, strength) {
      if (motion.matches) strength = 0;
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
      const viewport = window.visualViewport;
      const vw = viewport?.width ?? document.documentElement.clientWidth;
      const vh = viewport?.height ?? window.innerHeight;
      const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
      // Measure the actual controls (including safe-area padding), also in landscape and at zoom.
      const upper = Math.max(top + 8, closeButton.getBoundingClientRect().bottom + 10);
      const lower = Math.min(top + vh - 8, tools.getBoundingClientRect().top - 12);
      const width = Math.max(1, Math.min((lower - upper) * .9 * 63 / 88, vw * .86, 560));
      el.style.setProperty("--stage-w", width.toFixed(1) + "px");
      el.style.setProperty("--stage-x", (left + (vw - width) / 2).toFixed(1) + "px");
      el.style.setProperty("--stage-y", (upper + (lower - upper - width * 88 / 63) / 2).toFixed(1) + "px");
      el.classList.add("is-staged");
      el.parentElement.classList.add("is-raised");
    }
    function unstage() {
      returning = false;
      if (!el.classList.contains("is-staged")) return;
      el.classList.remove("is-staged");
      el.parentElement.classList.remove("is-raised", "is-returning");
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
    function lift(input) {
      const flying = el.classList.contains("is-staged");
      returning = false;
      el.parentElement.classList.remove("is-returning");
      el.classList.add("is-active");
      el.setAttribute("aria-pressed", "true");
      el.setAttribute("aria-label", label.replace("lift the card", "touch: slide to explore the light; mouse: drag to turn; use Flip card or Put back; Enter or Escape puts it back"));
      stage();
      if (!flying) {
        const from = slotOffset();
        s.tx.jump(from.x); s.ty.jump(from.y); s.scale.jump(from.scale);
      }
      s.tx.set(0); s.ty.set(0); s.scale.set(1);
      // A flourish on the way out of the deck, then it settles face up.
      if (!motion.matches && input !== "touch") s.spin.set(s.spin.target + 360, .03, .14);
      else s.spin.jump(Math.round(s.spin.target / 360) * 360);
      s.rx.set(0); s.ry.set(0);
      s.o.set(1); s.mx.set(50); s.my.set(50);
      wake();
    }
    function drop() {
      el.classList.remove("is-active");
      el.setAttribute("aria-pressed", "false");
      el.setAttribute("aria-label", label);
      returning = true;
      el.parentElement.classList.add("is-returning");
      s.spin.set(Math.round(s.spin.target / 360) * 360, .04, .2);
      rest();
    }
    function flip(direction) { s.spin.set((Math.round(s.spin.target / 180) + direction) * 180, .04, .18); wake(); }
    function spinTo(value, snap) {
      if (snap) s.spin.set(Math.round(value / 180) * 180, .04, .18);
      else s.spin.set(value, .2, .45);
      wake();
    }
    function reset() {
      stop();
      el.classList.remove("is-active");
      el.setAttribute("aria-pressed", "false");
      el.setAttribute("aria-label", label);
      unstage();
      for (const spring of Object.values(s)) spring.jump(spring === s.scale ? 1 : spring === s.mx || spring === s.my ? 50 : 0);
      render();
    }
    const staged = () => el.classList.contains("is-staged");
    return { el, rotator, s, aim, rest, place, lift, drop, flip, spinTo, render, staged, reset, stop, wake };
  }

  document.addEventListener("tape-pause-change", () => {
    cards.forEach(card => document.documentElement.classList.contains("is-tape-paused") ? card.stop() : card.wake());
  });

  function lift(card, input) {
    if (active === card) return;
    interrupt();
    if (active) active.drop();
    active = card;
    dialog.classList.add("has-active");
    card.lift(input);
  }
  function drop() {
    interrupt();
    if (!active) return;
    active.drop();
    active = null;
    dialog.classList.remove("has-active");
  }

  // Hover tilt in the grid.
  for (const card of cards) {
    card.render();
    card.el.addEventListener("pointermove", event => {
      if (card === active || card.staged() || event.pointerType === "touch") return;
      const r = card.el.getBoundingClientRect();
      card.aim(clamp((event.clientX - r.left) / r.width, 0, 1), clamp((event.clientY - r.top) / r.height, 0, 1), 26);
    });
    card.el.addEventListener("pointerleave", () => { if (card !== active) card.rest(); });
    card.el.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); card === active ? drop() : lift(card); }
      else if (card === active && (event.key === "ArrowLeft" || event.key === "ArrowRight")) { event.preventDefault(); flip(event.key === "ArrowLeft" ? -1 : 1); }
      else if (card === active && event.key.toLowerCase() === "f") { event.preventDefault(); flip(1); }
    });
  }

  // Each physical press owns its click eligibility. Keep the completed sequence until the
  // next press, since a compatibility click can follow pointerup/lostpointercapture.
  const pointers = new Map();
  let gesture = null, lastPress = null, wheelEnd = 0, dealFrame = 0;
  const cardAt = target => cards.find(card => card.el.contains(target));
  const touchCount = () => [...pointers.values()].filter(press => press.type === "touch").length;

  function finishGesture(cancelled = false) {
    if (!gesture) return;
    const g = gesture;
    gesture = null; // releasePointerCapture may itself dispatch lostpointercapture.
    if (g.type === "touch") g.card.rest();
    else if (g.press.moved || cancelled) {
      g.card.spinTo(cancelled ? g.spin : g.card.s.spin.target, true);
      g.card.rest();
    }
    if (g.card.el.hasPointerCapture(g.id)) g.card.el.releasePointerCapture(g.id);
  }
  function interrupt() {
    for (const press of pointers.values()) press.suppress = true;
    finishGesture(true);
    finishWheel();
  }
  function finishWheel() {
    clearTimeout(wheelEnd);
    if (wheelEnd && active) active.spinTo(active.s.spin.target, true);
    wheelEnd = 0;
  }
  function flip(direction) {
    interrupt();
    active?.flip(direction);
  }

  // Guard button/veil handlers too: a finger starting on a card cannot become a Flip,
  // Put back or veil click after capture is released or geometry changes.
  dialog.addEventListener("click", event => {
    const physical = event.detail > 0 || event.pointerType === "touch";
    if (physical && (lastPress?.suppress || touchCount())) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const card = cardAt(event.target);
    if (!card) return;
    // WebKit can label the compatibility click as mouse after touch down/up (even
    // with a different pointerId). The press owns the source, just as it owns click
    // eligibility. A new mouse press replaces it; keyboard activation has no press.
    const input = physical ? (lastPress?.type || event.pointerType) : "keyboard";
    if (card !== active) lift(card, input);
    else if (input !== "touch") drop();
  }, true);

  // Track releases on window as scrolling/capture can move their target outside the dialog.
  // A second finger cancels inspection; neither can take over until both are up.
  window.addEventListener("pointerdown", event => {
    if (!dialog.open) return;
    if (event.pointerType) dialog.dataset.input = event.pointerType;
    const press = {
      id: event.pointerId, type: event.pointerType, x: event.clientX, y: event.clientY,
      moved: false, suppress: false,
    };
    if (!pointers.size) lastPress = null;
    pointers.set(event.pointerId, press);
    lastPress = press;
    if (touchCount() > 1 || (press.type === "touch" && !event.isPrimary)) {
      interrupt();
      return;
    }
    if (gesture || event.button !== 0) { press.suppress = true; return; }
    const card = cardAt(event.target);
    if (!card || card !== active) return;
    finishWheel();
    const r = card.el.getBoundingClientRect();
    const touch = press.type === "touch";
    press.suppress = touch;
    gesture = {
      card, press, id: event.pointerId, type: press.type,
      x: event.clientX, y: event.clientY, width: r.width, height: r.height,
      // Start at the rendered light: touching an edge never jumps the highlight.
      lightX: card.s.mx.value / 100, lightY: card.s.my.value / 100,
      spin: card.s.spin.target,
    };
    card.el.setPointerCapture(event.pointerId);
    if (touch) card.aim(gesture.lightX, gesture.lightY, 26);
  }, true);

  window.addEventListener("pointermove", event => {
    if (!dialog.open) return;
    const press = pointers.get(event.pointerId);
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) {
      press.moved = true;
      press.suppress = true;
    }
    if (!gesture || gesture.id !== event.pointerId) return;
    const g = gesture;
    const dx = event.clientX - g.x, dy = event.clientY - g.y;
    if (g.type === "touch") {
      // Frozen, unrotated layout dimensions avoid feedback from the animated 3D face.
      // Half a card's travel explores most of the foil; tilt stays within ±13 degrees.
      g.card.aim(clamp(g.lightX + dx / g.width, 0, 1), clamp(g.lightY + dy / g.height, 0, 1), 26);
    } else if (press.moved) {
      g.card.s.rx.set(motion.matches ? 0 : clamp(-dy * .2, -30, 30), .1, .3);
      g.card.s.my.set(clamp(50 + dy * .25, 0, 100), .1, .3);
      g.card.s.mx.set(clamp(50 + dx * .25, 0, 100), .1, .3);
      g.card.spinTo(g.spin + dx * .6, false);
    }
  }, true);

  dialog.addEventListener("pointermove", event => {
    if (!active || gesture || touchCount() || event.pointerType === "touch") return;
    if (event.pointerType) dialog.dataset.input = event.pointerType;
    // Over the buttons the card faces the viewer instead of craning towards the pointer.
    if (event.target.closest(".deck__tools")) { active.aim(.5, .5, 0); return; }
    // The staged card's own box, unaffected by its tilt.
    const r = active.el.getBoundingClientRect();
    active.aim(clamp((event.clientX - r.left) / r.width, 0, 1), clamp((event.clientY - r.top) / r.height, 0, 1), 34);
  });
  function endPress(event) {
    const press = pointers.get(event.pointerId);
    if (!press) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) {
      press.moved = true;
      press.suppress = true;
    }
    if (event.type === "pointercancel") press.suppress = true;
    if (gesture?.id === event.pointerId) finishGesture(event.type === "pointercancel");
    pointers.delete(event.pointerId);
    lastPress = press;
  }
  window.addEventListener("pointerup", endPress, true);
  window.addEventListener("pointercancel", endPress, true);
  dialog.addEventListener("lostpointercapture", event => {
    if (gesture?.id !== event.pointerId) return;
    gesture.press.suppress = true;
    finishGesture(true);
    // Capture loss is not necessarily a release; keep tracking the physical press.
  });
  veil.addEventListener("click", drop);
  dialog.querySelector("[data-deck-flip]").addEventListener("click", () => flip(1));
  dialog.querySelector("[data-deck-back]").addEventListener("click", () => {
    const card = active;
    drop();
    card?.el.focus({ preventScroll: true });
  });
  // The wheel turns a lifted card like a dial and lets it settle on the nearer face.
  dialog.addEventListener("wheel", event => {
    if (!active) return;
    event.preventDefault();
    if (gesture || touchCount()) return;
    active.spinTo(active.s.spin.target + clamp(event.deltaY + event.deltaX, -80, 80) * .9, false);
    clearTimeout(wheelEnd);
    const card = active;
    wheelEnd = setTimeout(() => { wheelEnd = 0; if (active === card) card.spinTo(card.s.spin.target, true); }, 160);
  }, { passive: false });

  dialog.querySelector(".deck__close").addEventListener("click", () => dialog.close());
  // Esc first puts a lifted card back; a second Esc leaves the collection. Handled on keydown:
  // browsers stop honouring a cancelled "cancel" event after the first few in a row.
  dialog.addEventListener("keydown", event => {
    if (event.key === "Escape" && active) { event.preventDefault(); event.stopPropagation(); drop(); }
  });
  dialog.addEventListener("cancel", event => { if (active) { event.preventDefault(); drop(); } });
  dialog.addEventListener("close", () => {
    interrupt();
    pointers.clear();
    cancelAnimationFrame(dealFrame);
    dealFrame = 0;
    active = null;
    dialog.classList.remove("has-active");
    cards.forEach(card => card.reset());
    document.documentElement.classList.remove("deck-open");
    opener?.focus();
  });
  const replace = () => {
    if (!dialog.open) return;
    interrupt();
    active?.rest();
    active?.place();
  };
  window.addEventListener("resize", replace, { passive: true });
  window.addEventListener("orientationchange", replace, { passive: true });
  window.visualViewport?.addEventListener("resize", replace, { passive: true });
  window.visualViewport?.addEventListener("scroll", replace, { passive: true });
  // Scrolling the grid does not change the fixed stage; returning cards track their slot in tick().
  window.addEventListener("blur", () => { interrupt(); pointers.clear(); active?.rest(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { interrupt(); pointers.clear(); active?.rest(); }
  });
  motion.addEventListener("change", () => {
    if (!dialog.open) return;
    interrupt();
    cards.forEach(card => card.rest());
  });

  return {
    open(trigger) {
      if (dialog.open) return;
      opener = trigger;
      document.documentElement.classList.add("deck-open");
      dialog.classList.remove("is-dealt");
      dialog.showModal();
      dialog.scrollTop = 0;
      dialog.querySelector(".deck__close").focus();
      // Re-deal on every visit; the class restarts the CSS entrance.
      dealFrame = requestAnimationFrame(() => { dealFrame = 0; if (dialog.open) dialog.classList.add("is-dealt"); });
    },
  };
}
