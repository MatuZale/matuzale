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
- Light / dark theme (follows the system, remembers the choice), responsive and accessible

```
index.html   content (+ JSON-LD Person metadata)
404.html     not-found page
style.css    design tokens, layout, themes
script.js    theme, nav, reveal-on-scroll, attractor
assets/      photo, images, public CV (resume.pdf)
cv/          HTML source of the public CV
```

The public CV is rendered from `cv/resume.html` (contains no ID number, date of birth, phone or street address):

```
chromium --headless --no-pdf-header-footer --print-to-pdf=assets/resume.pdf cv/resume.html
```

Run locally by opening `index.html`, or `python3 -m http.server 8000`.
Deployed with GitHub Pages from the `main` branch (root).

## License

MIT — see [LICENSE](LICENSE). The photo and CV are © Tomasz Młynik; please don't reuse them.
Third-party logos in `assets/brand/` belong to their respective owners and are excluded from the MIT license; see [asset sources](assets/brand/README.md).
