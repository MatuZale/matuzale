# Notes for coding agents

Project-specific guidance for agents working in this repository (Codex reads this file
automatically; Agent Control's general rules still apply).

## Screenshots and exports with the WebKit renderer

- LinkedIn 4:5 images are 1200×1500 (`"scale": 1`), not 1200×1350.
- Rotating holographic cards (`cards.html`): render with `"waitForRotation": true` and the card as
  `"selector"`, so the renderer waits until the rotation (`--ry`) settles near a multiple of 360°.
- WebKit snapshots may flatten CSS `preserve-3d` and show an invisible reverse face. If that
  happens, hide only the reverse face in an export wrapper after checking that the front face is
  stable, then inspect the image again.
- Example request (`.agent-output/render.json`):
  `{"renders":[{"page":"cards.html","output":"cards/lorenz.png","width":1080,"height":1350,"scale":2,"selector":".tcard","click":[".tcard"],"waitMs":2000,"colorScheme":"dark"}]}`
