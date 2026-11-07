# Deck browser checks

Run `npm run test` for the JavaScript checks. `npm run test:mobile` selects all four
Playwright projects through the prepared Agent Control offline VM, including the two
desktop projects. Do not install dependencies or launch Playwright on the host Mac.
The manifests are exact copies of the supplied cache inputs.

`node tests/spring-cadence.js` runs a short deterministic check of the production
`Spring` class without a browser. The same check runs once in the Node worker before
the server case in the regular gate; it does not add browser cases. It tests elapsed
time at 15/30/60/120 callbacks per second, the original 60 Hz lift response, moving
targets for tilt/light/spin, settlement, and bounded catch-up after a ten-second pause.
These schedules measure numerical response, not rendering throughput or phone FPS.
The controller passes RAF elapsed time to the spring, resets its clock on stop/idle,
and keeps the running clock across pointer moves. A step uses at most four reference
frames, divided into steps no larger than 1/60 s; fractional steps support 120 Hz.
This preserves the original full-step response at 60 Hz and deliberately avoids
replaying an unbounded backlog after a stalled frame. This numerical check does not
exercise CSS, textures or raster sizing. First-paint/layout/decode costs still need
separate device profiling.

Each VM run has a **600-second budget**, on 2 CPUs with software rendering. Playwright's
global timeout is 570 seconds, reserving 30 seconds for startup and reporting; individual
test timeouts do not extend this budget. One worker avoids competing software renderers.
The browser suite now exceeds one VM run's budget, so run all twelve shards sequentially
against the same unchanged source snapshot:

```sh
npx playwright test --fully-parallel --workers=1 --shard=1/12 --reporter=dot
# Repeat with 2/12 through 12/12, each in a separate offline VM run.
```

`--fully-parallel` makes Playwright partition individual tests instead of entire files;
`--workers=1` still executes only one at a time. Do not use test filters for this gate.
Record the exit code, pass count and skips for every shard. All twelve must complete
successfully; a failure, timeout, missing shard or source change makes the aggregate red.
Rerun the complete matrix after making a fix. This preserves all projects and assertions;
an explicit WebKit native-input skip remains visible and is documented below.

- Chromium touch uses CDP engine touch sequences for inspection, scrolling, cancellation
  and multiple fingers. These are browser engine inputs, not measurements on a physical phone.
- WebKit uses native Playwright taps for opening cards and operating buttons. Playwright
  exposes no equivalent native touchmove/multi-touch stream for WebKit. Inspection uses
  explicitly synthetic touch PointerEvents. A held native mouse pointer, pressed on the
  toolbar, supplies a valid pointer ID for capture; no capture API is mocked or disabled.
  This checks application handlers and real capture cleanup, not iOS touch recognition,
  native scrolling, palm rejection or physical multi-touch. The Chromium-only test is
  visibly skipped in WebKit for this reason.
- Controlled `pointercancel`, `lostpointercapture` and compatibility-click injections are
  synthetic in both engines. A controlled secondary pointer also checks partial release.
  Chromium additionally tests native cancellation and actual engine capture loss.
  Viewport resizing exercises layout and interrupted gestures;
  it does not simulate a physical device's orientation sensors or Safari browser chrome.
- Desktop projects use engine mouse movement, buttons, wheel and keyboard at wide and narrow
  sizes. Touch also runs in a wide viewport with reduced motion.
- Both touch profiles retain their device viewport, UA, touch and mobile settings but render at DPR 1.
  A controlled same-source A/B run failed the wide reduced-motion native tap at DPR 3
  and passed it at DPR 1. Effects, actionability and assertions remain enabled. This
  functional profiles do not cover Retina rasterisation, GPU performance or physical iOS;
  those require separate checks. Lowering Chromium raster resolution also gives the
  individual functional runs more practical. Production CSS, assets
  and effects are unchanged.

Every collection opening checks all 36 unique card IDs and all 36 loaded images. The
gesture sweep uses four representatives in every entry/engine combination: Clifford
(classic foil), Chirikov (reverse holo), Logistic (beam) and Halvorsen (amazing). This covers
the shared controller and the original foil families without repeating every texture in the
regular gate. Four desktop checks lift all ten symmetry editions (21–30) in two groups,
then move the native pointer to all four corners in normal and reduced motion. Artwork
foil and card surface are sampled independently, along with Golden's subject sheen.
They check material/mask references, a visible light response, changing spectral and
specular gradient images, and a stationary material. Every gradient must cover its
surface without tiling; repeated colour cycles must close without a colour jump. The
declared phase dimensions are compared with actual layout, and the phase is checked
against the former translation projected onto the gradient axis. This catches the
large-angle image-tile seams without enlarging or freezing the light field. Mayan's
conic spectrum and radial front are sampled separately. Separate wheel checks keep
the pointer fixed and observe surface-normal and painted-background changes during the turn,
with both normal and reduced motion. For a longer, separate
Chromium/cards sweep, set `DECK_FULL_COLLECTION=1`
and select that project/inspection test; it inspects all 36 cards. Run this separately
from the whole regular matrix within the existing per-command VM budget.
The six Bourke editions (31–36) are also checked in both themes: distinct material, engraving and protection assets must decode, the two portrait layouts must fill the card, printed rarities must match, and both artwork and stock reflections must respond at all four native pointer corners. Both foil pseudo-elements must generate visible, changing gradients, and stationary artwork must share the protection mask's cover/centre geometry. The fixed-pointer wheel checks now cover Thorn Rose and Reuleaux Nebula alongside Pentacle, in normal and reduced motion, including stationary print throughout the turn.
Each inspected card is lifted, tilted/lit, released
without changing face, probed for trailing clicks, put back and checked against its slot.
Halvorsen additionally covers explicit Flip and inspection of the back in each combination.

| Check | Entry and engine coverage |
|---|---|
| Regular inspection | 4 original foil families per entry and touch engine; all 36 identities/images checked each time |
| Symmetry materials | All ten editions: artwork foil and card-surface pointer response, stationary material layer, ten material textures and ten background-protection masks decoded, material contrast and duplicate-file checks |
| Symmetry corner continuity | All ten editions, four corners, normal/reduced motion: gradient coverage without image tiling, closed colour cycles, changing spectrum/front images, and phase geometry against actual layer bounds; Golden subject sheen included |
| Bourke editions | Six identities and star ranks, two full-art layouts, all material/mask assets, pointer reflections in both themes and fixed-pointer wheel reflection in normal/reduced motion |
| Symmetry protection and rotation | Both frame masks quiet text; the window-frame mask excludes the rectangular artwork; portrait ground masks protect lower text; fixed-pointer wheel reflection in normal and reduced motion |
| Full art and theme card | Desktop portrait artwork bounds; Clam Triple theme flip via button, keyboard, drag and wheel; touch Flip and theme persistence |
| Extended inspection | Optional `DECK_FULL_COLLECTION=1`, Chromium/cards: all 36 gestures; run separately |
| Synthetic cancel and capture loss; partial second-finger release | cards.html, both touch projects |
| Landscape viewport, controls, close/reopen during gesture | See examples, both touch projects |
| Separate veil dismissal and slot tracking during return scroll | Both entries, both touch projects; return scroll is programmatic |
| Native scrolling, cancellation, capture loss and two fingers | cards.html, Chromium touch; explicitly skipped in WebKit |
| Wide touch, reduced motion and live return to normal motion | See examples, both touch projects |
| Hover, drag, wheel, Enter, Space, F, arrows, two-stage Escape, reopen | cards.html at 1280px and See examples at 390px, both desktop engines |
| Desktop reduced motion | cards.html, both desktop engines |
| Public files and rejected server paths | One shared-server check in Chromium desktop |

The suite preserves distinct behaviors without repeating every lifecycle
case for every card, viewport and entry. It is not an exhaustive Cartesian matrix.
The material check samples a small grayscale signature to catch accidentally duplicated
files and rejects flat textures. Background and frame masks are checked for transparent
subject regions, visible foil regions and subdued alpha behind text. These checks cannot
judge the visual character, colour or readability of the composited card, nor prove that
every fine orbit filament is protected. The corner checks inspect computed gradients
and their geometry, not screenshot pixels or presented-frame continuity. Those need
visual inspection.

Assertions observe computed CSS values, transforms, active state, slot geometry, capture,
image loading and control hit testing. A forwarding RAF observer counts calls originating
in `deck.js`; unrelated home-page animations are excluded from this count, not disabled.
Chromium retains real engine frame scheduling. WebKit installs Playwright Clock before
navigation; it runs normally during actions, and `Clock.runFor` delivers each scheduled JS
RAF/timer in 160 ms batches while waiting for springs. Settlement must stop scheduling RAF
within 9.6 seconds of explicit virtual advancement (600 frames), or fail. This is not
`fastForward`: intermediate spring states and callbacks are not skipped. Spring parameters
are unchanged. CSS animations and transitions retain their real engine timeline and must
finish separately. Layout is checked over consecutive frames before and after lift.
No effects are disabled; there are no fixed sleeps, forced clicks or retries. Clock-driven
CSS samples are computed states, not evidence that the compositor presented each frame.
This is a lifecycle check, not a real-time performance or FPS benchmark. Browser errors fail
the test. A complete successful gate is required before accepting the result.

Every touch lift still uses native `locator.tap()`. It asserts trusted touch pointerdown/up
and a trusted click, then checks raw angles throughout lift, so even a complete 360-degree
turn fails. The click may be labelled `mouse` by WebKit; the original press must determine
the action. WebKit/cards also checks that a subsequent native mouse click selects the mouse
flourish and can put the card back. This catches a stale touch source on hybrid input.

The entrance check excludes the decorative infinite deck backdrop animation. All other
animations, including `deck-in`, `deal` and transitions, must still finish.
Off-screen fixture cards are positioned with DOM `scrollIntoView` (instant, programmatic),
then their real face geometry is checked. The subsequent native tap/click targets the stable
hit surface with normal Playwright actionability checks, including stability and hit testing.
This positioning is separate from Chromium's native scroll test. Timeouts are not converted
to passes. Failed cases attach
`deck-failure-state` JSON: pending RAF origins, recent rendered values, pointer events,
card geometry and animation names/states, without extra screenshots.

The Node server binds only `127.0.0.1:4173`, validates paths before normalization and only
serves public page files. CSP and context routing block remote requests while retaining
local assets. Service workers are disabled. Security checks send rejected paths without
creating or opening private files.

Only two neutral/held-light Chromium screenshots of Halvorsen are requested in `test-results`.
No automatic failure screenshots, video or trace collection is enabled. Run-specific results
belong in ignored technical output or the task report, rather than this coverage document.
A successful run must complete all deck cases as part of the complete sharded matrix; the
explicit WebKit native multi-touch skip remains visible. A partial or timed-out run fails.

The independent WebKit diagnostic found trusted touch down/up followed by a mouse-labelled
click. The controller therefore uses the original physical press to choose touch inspection;
raw lift-angle assertions reject even a complete accidental 360-degree turn. Clock-driven
settlement and the functional DPR setting address test synchronisation/render cost only.
They do not establish real-device smoothness, VoiceOver usability or physical Safari behaviour.

The wide reduced-motion Flip check waits for the single native click to reach a listener
registered after the product's button handler. It asserts the angle and zero pending RAFs
captured synchronously there, rather than assuming tap acknowledgement means click delivery.
A blocked click cannot pass this check, and there is no repeat tap or forced input. The
`reduced-flip-sequence` JSON attachment records state just after tap returns and after the
handler, plus the surrounding pointer/click events. Failure diagnostics also include this
probe, event targets and final `defaultPrevented`, to distinguish late delivery from a
blocked or misdirected action. These are test observations; product handlers are unchanged.

`tests/deck-benchmark.mjs` is an observational WebKit benchmark for a separately served
copy in the same prepared VM, not a pass/fail gate or a physical device measurement. It
reports frame intervals, deck callback time, rotation, asset requests and collection image
dimensions and an estimated uncompressed RGBA size. It samples three existing cards plus one
of each new finish, including Amazing Rare; `--baseline REV`
alternates the old and current source and measures shared cards in both, with new finishes
measured only in the current variant. Use `--cards id,id` to select cards present in both
variants. Compare like-for-like phases on the same VM and note that software rendering,
timings and frame intervals do not establish real-device GPU performance.
