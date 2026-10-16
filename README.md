# Tomasz Młynik — portfolio

Personal portfolio of **Tomasz Młynik, PhD** — physicist turned data & software engineer.
Plain HTML, CSS and JavaScript: no build step, no dependencies.

**Live:** https://matuzale.github.io/

## What's inside

- **Hero** with a live [Clifford attractor](https://en.wikipedia.org/wiki/Clifford_attractor) rendered on `<canvas>` (reacts to the mouse, pauses off-screen, static with `prefers-reduced-motion`)
- **Bento-grid projects** with a spotlight hover effect
- **BENTOS** deep-dive — the open-source water-quality buoy for the Gulf of Gdańsk
- Publications, experience & education timeline, contact
- Light / dark theme (follows the system, remembers the choice), fully responsive, accessible

## Structure

```
index.html   content
style.css    design tokens, layout, themes
script.js    theme, nav, reveal-on-scroll, attractor
assets/      photo, images, CV (resume.pdf)
```

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Deploy

GitHub Pages, served from the `main` branch root. Name the repository `MatuZale.github.io`
to publish at the root URL above.

## License

MIT — see [LICENSE](LICENSE). The photo and CV are © Tomasz Młynik; please don't reuse them.
