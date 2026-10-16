# Hi, I'm Tomasz Młynik 👋

**PhD in Physics · data & software engineer · Gdańsk, Poland**

Physicist turned data & software engineer. I turn messy scientific and sensor data into pipelines,
dashboards and tools people actually use — from quantum-information theory to an open-source buoy
for the Baltic Sea.

### 🌐 [**matuzale.github.io/matuzale**](https://matuzale.github.io/matuzale/) — my portfolio

[![Portfolio preview](assets/og.jpg)](https://matuzale.github.io/matuzale/)

## Find me

- 💼 [LinkedIn](https://www.linkedin.com/in/tomasz-m%C5%82ynik-phd-949659163/)
- 🎓 [Google Scholar](https://scholar.google.com/citations?user=Fzdweu4AAAAJ&hl=en)
- ✉️ tomek.mlynik@gmail.com

---

## About this repository

The source of the portfolio site — plain HTML, CSS and JavaScript, no build step, no dependencies.

- Hero with a live [Clifford attractor](https://en.wikipedia.org/wiki/Clifford_attractor) on `<canvas>` (reacts to the mouse, pauses off-screen, static with `prefers-reduced-motion`)
- Bento-grid projects, a BENTOS feature using the project's navy/lime branding, publications, timeline and contact
- Linked EmbeddedSystems.do branding, section tracking, scroll progress and a keyboard-accessible mobile menu
- Neon gradient frames in the toolbox, with softly lit publications and timeline. Project cards use textured cardstock, thin layered edges and a matte printed body. Only “Strange attractors & fractals” and “Tools from my PhD” have reflective image windows. The other cards carry a generated, engraved foil motif per project (isotherms, a guilloche rosette, data streams, a harmonograph, orbits, interference), with a latent image that only appears under the light, as on a banknote. The research print is a reverse holo: chrome card suits on granular pearl stock, with a hidden ket under the diagram. Spectral reflections, faceted stars and the cast shadow respond to pointer position and perspective tilt. A stationary outer slot keeps tracking steady; larger cards rotate less. Touch / reduced motion keep the cards flat, keyboard focus reveals the foil, and BENTOS keeps its own palette.
- Visual inspiration: [Pokémon holographic cards by Simon Goellner](https://codepen.io/simeydotme/pen/abYWJdX). The CSS/JS, [faceted stars](assets/holo-stars.svg) and [paper grain](assets/card-grain.svg) and [foil motifs](assets/holo/) are original; no reference code, Pokémon art or external texture assets are bundled. About pairs a short biography with a small terminal below the photo, inspired by this [terminal card](https://uiverse.io/mrhyddenn/tame-mouse-76).
- A torn-open circuit board in the footer reveals an autonomous Snake. It follows a safe closed route with food-seeking shortcuts, runs only while visible, pauses in background tabs, and starts static with reduced motion. A play/pause button is always available. SVG keeps it crisp without a second canvas or any dependencies.
- The “Currently learning” card is torn open, like the footer, onto the CSS rules that colour the toolbox cards.
- The TM logo briefly glitches at random intervals (disabled with reduced motion; focus it and press G to trigger manually).
- Buttons briefly split into RGB shadows on hover, keyboard focus or press; icon controls get matching coloured edges. The effect leaves the lettering and layout in place, follows each section's palette, and becomes a small static text shadow with reduced motion.
- “Observer detected” in the footer opens a local browser readout. A separate button fetches the visitor's public IPv4/IPv6 address from [ipify](https://www.ipify.org/); no lookup happens automatically, and the portfolio does not store the readout.
- Light / dark theme (follows the system, remembers the choice), responsive and accessible

```
index.html   content (+ JSON-LD Person metadata)
404.html     not-found page
style.css    design tokens, layout, themes
script.js    theme, nav, reveal-on-scroll, attractor and footer Snake
assets/      photo, images, public CV (resume.pdf)
cv/          HTML source of the public CV
```

CV files remain in this repository; the portfolio currently has no CV download links.
The public CV is rendered from `cv/resume.html` (contains no ID number, date of birth, phone or street address):

```
chromium --headless --no-pdf-header-footer --print-to-pdf=assets/resume.pdf cv/resume.html
```

Run locally with `python3 -m http.server 8000`, then open `http://localhost:8000`. Serve over HTTP so the browser can load the SVG foil mask.
Deployed with GitHub Pages from the `main` branch (root).

## License

MIT — see [LICENSE](LICENSE). The photo and CV are © Tomasz Młynik; please don't reuse them.
Third-party logos in `assets/brand/` belong to their respective owners and are excluded from the MIT license; see [asset sources](assets/brand/README.md).
