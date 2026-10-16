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
- Bento-grid projects, a BENTOS deep-dive, publications, timeline and contact
- Light / dark theme (follows the system, remembers the choice), responsive and accessible

```
index.html   content
style.css    design tokens, layout, themes
script.js    theme, nav, reveal-on-scroll, attractor
assets/      photo, images, CV (resume.pdf)
```

Run locally by opening `index.html`, or `python3 -m http.server 8000`.
Deployed with GitHub Pages from the `main` branch (root).

## License

MIT — see [LICENSE](LICENSE). The photo and CV are © Tomasz Młynik; please don't reuse them.
