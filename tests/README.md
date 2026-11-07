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

Every collection opening checks all 36 unique card IDs and loaded eager/visible images.
The first eight artworks load immediately; later ones load near the viewport or on lift.
A separate desktop case checks that the distant last image is not requested on entry,
that keyboard inspection promotes it, and that all 36 source images decode. A retry case
interrupts a stylesheet request, checks that no unstyled dialog opens, and successfully
reopens the collection after the next request. The
gesture sweep uses four representatives in every entry/engine combination: Clifford
(classic foil), Chirikov (reverse holo), Logistic (beam) and Halvorsen (amazing). This covers
the shared controller and the original foil families without repeating every texture in the
regular gate. Four desktop checks lift all ten symmetry editions (21–30) in two groups,
then move the native pointer to all four corners in normal and reduced motion. The
asserted optical constructions differ: laser combs, crystal planes, gold engraving,
fixed crosshatching, separate glass panes, reverse opal stock and radial diffraction.
Pentacle carries the opal material and engraved nacre fields formerly used on Thorn
Tide, while retaining its own artwork-protection mask. The active material assets
are checked by their bindings, so swapping a finish never swaps the protected subject.
Stationary image textures, lattice geometry and printed ink must stay fixed; every
illumination field must change across the corner samples, and the combined reflection
must respond to both axes. Every gradient must cover its surface without tiling, and
repeated colour cycles must close without a colour jump. Fields that use a projected
phase retain the independent geometry check against their actual layer bounds.

Sand Dollar, Golden Flintstone and Clam Triple have three distinct printed paint
structures. Their colour print remains stationary, selective foil masks align with
that ink, and the cut-out and its mask move together. Reduced motion keeps the cut-out
still. The fixed paint sits below the printed rules; frame and portrait masks retain
their text-protection alpha limits. Golden's separate subject sheen is also checked.
Pentagon's crystal glint and Halloween's subject reflection follow the same corner
checks; Halloween's soft fading mask subtracts its own ground and keeps the lower
rules outside the light, without a hard clipping edge.
Asset checks decode the print, relief, glass, glitter and protection files, reject
accidentally duplicate textures and compare paint-mask coverage with the printed ink.

The six Bourke editions (31–36) are checked in both themes. Their declared materials,
engraving and protection assets must decode, both portrait layouts must fill the card,
and printed star ranks must match. Active reflection layers must respond at every
native pointer corner, while material images and protective masks remain registered.
Layer presence follows each finish: uncoated stock and absent decorative passes are
asserted explicitly rather than requiring the same pseudo-elements on every card.
Stationary artwork must share its ground mask's cover/centre geometry.
Thorn Tide carries the transferred fivefold reverse engraving, with a quiet image
window and both former opal overlays explicitly absent. Its own ground mask remains
registered to the original fractal; the lower stock carries the richer spectrum.

Fixed-pointer wheel checks cover Sand Dollar, Pentacle, Clam Triple, Thorn Rose and
Reuleaux Nebula in normal and reduced motion. They observe surface-normal and painted
reflection changes without changing pointer coordinates, and preserve registration of
the protective plate, printed ink and cut-out. For a longer, separate Chromium/cards
sweep, set `DECK_FULL_COLLECTION=1` and select that project/inspection test; it inspects
all 36 cards. Run this separately from the whole regular matrix within the existing
per-command VM budget. Focused material or asset runs are diagnostics only: filtered
passes do not replace the twelve-shard gate or clear a failure elsewhere in that gate.
Each inspected card is lifted, tilted/lit, released
without changing face, probed for trailing clicks, put back and checked against its slot.
Halvorsen additionally covers explicit Flip and inspection of the back in each combination.

| Check | Entry and engine coverage |
|---|---|
| Regular inspection | 4 original foil families per entry and touch engine; all 36 identities and eager/visible images checked on entry, each inspected artwork checked on lift |
| Symmetry materials | Ten distinct constructions; material, glass, glitter, paint, relief and protection assets decoded; material contrast, duplicate-file and registered paint-mask checks |
| Symmetry corner continuity | Ten editions, four corners, normal/reduced motion: fixed print/grooves, changing illumination, both-axis response, full gradient coverage, closed colour cycles and projected-phase geometry where used; Golden subject sheen included |
| Bourke editions | Six optical constructions and star ranks, two full-art layouts, current material/mask assets, active versus uncoated layers, both-theme pointer reflections and fixed mask registration |
| Protection and rotation | Both frame masks quiet text; portrait ground masks protect lower text; registered cut-outs/paint; five representative fixed-pointer wheel reflections in normal and reduced motion |
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
