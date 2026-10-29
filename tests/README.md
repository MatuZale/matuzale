# Deck browser checks

Run `npm run test` for the JavaScript syntax check. `npm run test:mobile` runs all four
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
replaying an unbounded backlog after a stalled frame. CSS, textures and raster sizing
are unchanged. First-paint/layout/decode costs still need separate device profiling.

The gate has a **600-second total budget**, on 2 CPUs with software rendering. Playwright's
global timeout is 570 seconds, reserving 30 seconds for the surrounding gate; individual
test timeouts do not extend this budget. One worker avoids competing software renderers.
Actual completion within that budget must still be confirmed by the VM run.

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
  complete matrix time to finish in the same 600-second VM gate. Production CSS, assets
  and effects are unchanged.

Every collection opening checks all 20 unique card IDs and all 20 loaded images. The
gesture sweep uses four representatives in every entry/engine combination: Clifford
(classic foil), Chirikov (reverse holo), Logistic (beam) and Halvorsen (amazing). This covers
the shared controller and every foil family without repeating it for all textures in the
regular gate. For a longer, separate Chromium/cards sweep, set `DECK_FULL_COLLECTION=1`
and select that project/inspection test; it inspects all 20 cards. Run this separately
from the whole regular matrix within the existing per-command VM budget.
Each inspected card is lifted, tilted/lit, released
without changing face, probed for trailing clicks, put back and checked against its slot.
Halvorsen additionally covers explicit Flip and inspection of the back in each combination.

| Check | Entry and engine coverage |
|---|---|
| Regular inspection | 4 foil families per entry and touch engine; all 20 identities/images checked each time |
| Extended inspection | Optional `DECK_FULL_COLLECTION=1`, Chromium/cards: all 20 gestures; run separately |
| Synthetic cancel and capture loss; partial second-finger release | cards.html, both touch projects |
| Landscape viewport, controls, close/reopen during gesture | See examples, both touch projects |
| Separate veil dismissal and slot tracking during return scroll | Both entries, both touch projects; return scroll is programmatic |
| Native scrolling, cancellation, capture loss and two fingers | cards.html, Chromium touch; explicitly skipped in WebKit |
| Wide touch, reduced motion and live return to normal motion | See examples, both touch projects |
| Hover, drag, wheel, Enter, Space, F, arrows, two-stage Escape, reopen | cards.html at 1280px and See examples at 390px, both desktop engines |
| Desktop reduced motion | cards.html, both desktop engines |
| Public files and rejected server paths | One shared-server check in Chromium desktop |

This defines 21 test cases across the four projects: 20 executable cases and one explicit
WebKit native-input skip. It preserves distinct behaviors without repeating every lifecycle
case for every card, viewport and entry. It is not an exhaustive Cartesian matrix.

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
A successful run must complete all 20 executable cases within the 600-second gate; the
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
