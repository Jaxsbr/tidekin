# Tidekin browser QA

Status: baseline, iterations 1 and 2, final beta2, and final beta3 checks
completed on 2026-10-08. The beta3 candidate passed the focused expedition
fixtures, final route-condition checks, shader/link and WebGL error checks,
asset fingerprinting, and 20-second hardware rAF benchmark. The current
nine-dimension scorecard is 72.7/100; all dimensions meet the 3/5 floor, while
the total remains 2.3 points below the project's 75-point target.

## Current readiness

Checked 2026-10-08. Port 5179 served the baseline only when its historical
captures were made; it no longer serves that baseline. Port 5180 retains beta2,
and port 5181 serves the current final beta3 candidate. The beta3 snapshot
contains workshop.glb, island.glb, and landmarks.glb. QA targets the selected
preview directly and never rebuilds it.

## Coverage

The browser runner uses the local Vite app and real Chromium input at 1440x900,
900x700, and (in the final candidate pass) 390x844. It covers the menu settings
and new-voyage confirmation, keyboard
movement, contextual gathering, journal progress and claiming, workshop
crafting and expedition-rig choices, tide forecast, underwater gathering,
surfacing, pause/resume, valid-save reload and Continue, saved-voyage
replacement, malformed-save recovery, the How to Play control reference,
Find Wood/Scrap/Pearls map targeting, Larger text effect and persistence, and
Save & return followed by Continue. It checks the page for JavaScript and
console errors, captures screenshots, checks compact layouts for overflow,
and reads the QA-only inspection hook when the URL contains qa=1.

Separate disposable contexts also exercise save quota failure and session-only
recovery, a blocked GLB with error/menu/reload recovery, hidden-tab and blur
pauses during a dive, and Low quality retaining visible and usable gameplay
controls. The intentional GLB abort is recorded as an expected recovery event,
separately from unexpected runtime and network failures. Iteration 2 exercises
all these scenarios; its first combined report exposed an inverted assertion
in the QA runner (it expected the durable error banner to be hidden behind the
recovery modal). The screenshot showed the red warning visible as designed.
After correcting that assertion, the focused recovery rerun passed all four
recovery scenarios and runtime/network checks. The original report and its
failure screenshot are retained unchanged.

Gameplay actions use visible controls or keyboard input. The runner does not
write game state, grant resources, teleport, or invoke the hook's action API.
The malformed-save case writes an invalid save only in a separate disposable
browser context, as required to exercise recovery.

After a 5-second warm-up, the performance run measures requestAnimationFrame
intervals for 20 seconds while the rendered game is active. It records median,
p95, frames over 50 ms, browser and OS, viewport and drawing-buffer resolution,
quality, WebGL renderer, and available renderer counters. It repeats a
keyboard-steered sailing circuit and compares renderer counters. Renderer
CPU-submit timings are labelled as diagnostics, separate from rAF intervals;
they are not GPU time or FPS. Results produced by SwiftShader describe
software rendering on this QA machine and cannot be treated as a hardware GPU
benchmark.

This is agent-operated functional QA. It does not replace an independent human
playtest or establish player enjoyment. The final rubric scores below combine
the cited browser evidence with the existing expert, novice-slice, and art
reviews; limitations are stated for each score.

## Run

For the current beta3 candidate, run the two focused checks from the Tidekin project directory:

    TIDEKIN_BASE_URL=http://127.0.0.1:5181 node scripts/qa-browser.mjs --beta3-fixtures-only
    TIDEKIN_BASE_URL=http://127.0.0.1:5181 node scripts/qa-browser.mjs --beta3-final-render-only

The runner defaults to http://127.0.0.1:5181 and waits briefly for Vite,
src/main.js, and the three GLBs. Set TIDEKIN_BASE_URL to use another local URL or
pass --wait-ms=12000 to allow a longer readiness window. Screenshots and qa-results.json are written under a
timestamped captures/qa-* directory. A readiness timeout exits with code 2;
functional QA failures exit with code 1.

The no-flag full suite remains for historical cross-candidate coverage; use the
focused beta3 commands above for current validation because the earliest full
flow assumes the older chart/travel progression.

## Results

### Baseline — historical production preview 5179 (at capture time)

Capture: [qa-results.json](../../captures/qa-2026-10-08T09-14-36-069Z/qa-results.json)
and screenshots in `captures/qa-2026-10-08T09-14-36-069Z/`.

All scripted browser checks passed at 1440x900 and 900x700: menu/settings and
new-voyage confirmation, movement, contextual gathering, quest claim, workshop
crafting, dive/gather/surface, pause/resume, save/Continue, replacement
confirmation, malformed-save fallback, and runtime/network health. The browser
reported zero runtime errors, failed requests, and HTTP failures. The 900x700
layout had no horizontal overflow.

The 20-second active-play rAF sample (after 5-second warm-up) recorded 1,200
intervals: median 16.7 ms, p95 16.7 ms, zero intervals over 50 ms, about 59.88
FPS. It met the documented hardware frame-time budget (median <=20 ms, p95
<=33.4 ms). Chrome 154 used ANGLE Metal on Apple M4 Pro at 1440x900, DPR 1,
high quality; this was a hardware-renderer run, not SwiftShader. Renderer
counters were 187 draw calls, 141,236 triangles, and 1 texture. Geometry count
rose from 156 to 161 on the first sailing circuit and stayed at 161 after the
repeat; draw calls, triangles, and textures stayed constant. CPU render-submit
median/p95 were 0.8/1.1 ms and remain diagnostic only, distinct from rAF and
GPU time.

The local domain suite passes: 24 tests, 0 failures, including old-v2 rig
default and rig-save validation.

### Iteration 1 — production preview 5180

Capture: [qa-results.json](../../captures/qa-2026-10-08T09-18-37-984Z/qa-results.json)
and screenshots in `captures/qa-2026-10-08T09-18-37-984Z/`, including the
[fitted-rig workshop](../../captures/qa-2026-10-08T09-18-37-984Z/workshop-rigs-skimmer-1440x900.png)
and [900x700 gameplay layout](../../captures/qa-2026-10-08T09-18-37-984Z/gameplay-900x700.png).

All scripted checks passed, including the baseline flows and the new rig/tide
coverage. Rig choices were hidden before Waterwheel, then Wanderer, Skimmer,
and Pearl diver were each shown and fitted through the Workshop UI at home.
Displayed speed/air trade-offs and enabled choices matched the legal options;
the test read the forecast against the domain tide context after every fit.
Skimmer remained selected at save/reload and restored as rig `skimmer` at
7 m/s. Runtime errors, failed local requests, and HTTP failures were all zero.

The 20-second active-play rAF sample after warm-up recorded 1,200 intervals:
median 16.7 ms, p95 16.7 ms, zero intervals over 50 ms, about 59.88 FPS. It
met the same hardware budget on Chrome 154 / ANGLE Metal / Apple M4 Pro at
1440x900, DPR 1, high quality. Renderer counters were 185 draw calls, 140,522
triangles, and 1 texture. Geometry count rose from 154 to 159 on the first
sailing circuit and stayed at 159 on the repeat. CPU render-submit median/p95
were 0.7/0.8 ms, diagnostic only. The 900x700 screenshot showed visible HUD
controls and no horizontal overflow.

### Iteration 2 — production preview 5180

Full-run capture: [qa-results.json](../../captures/qa-2026-10-08T09-33-29-226Z/qa-results.json)
and [gameplay screenshot](../../captures/qa-2026-10-08T09-33-29-226Z/gameplay-1440x900.png).
Focused recovery rerun: [qa-results.json](../../captures/qa-2026-10-08T09-35-28-959Z/qa-results.json)
and [save-warning screenshot](../../captures/qa-2026-10-08T09-35-28-959Z/quota-save-recovery-1440x900.png).

All gameplay checks passed at 1440x900 and 900x700, including menu/settings,
new-voyage confirmation, keyboard movement, contextual gathering, quest claim,
workshop crafting, all three expedition rigs, tide forecast, underwater
gathering/surfacing, pause/resume, save reload/Continue, replacement, malformed
save fallback, and the sailing circuit. The disposable recovery rerun passed
the quota-failure warning and successful retry, blocked-GLB menu/retry,
hidden/blur pause during a dive, and Low-quality affordances. The warning stayed
visible for at least 2.6 seconds, never claimed success, preserved session-only
progress, and cleared its error styling after a successful retry. The first
combined report is marked failed solely because the runner incorrectly
expected that visible error banner to be hidden behind the recovery modal; the
corrected focused check passed. The stored first report is retained as-is.
Runtime errors, unexpected failed requests, and HTTP failures were all zero;
the intentionally blocked GLB request is recorded separately.

The 20-second active-play rAF sample after the 5-second warm-up recorded 1,200
intervals: median 16.7 ms, p95 16.7 ms, zero intervals over 50 ms, about 59.88
FPS. It met the hardware budget (median <=20 ms, p95 <=33.4 ms) on Chrome 154 /
ANGLE Metal / Apple M4 Pro at 1440x900, DPR 1, high quality. Counters were 161
draw calls, 124,096 triangles, and 1 texture; geometry rose from 145 to 146 on
the first sailing circuit and remained 146 on the repeated circuit. Relative
to the baseline capture, draw calls fell by 26 and triangles by 17,140. CPU
render-submit median/p95 were 0.6/0.7 ms, diagnostic only, separate from rAF
intervals and GPU time. A fresh run of the current source domain suite passes
28 tests, including the low-tide shoal speed penalty and high-tide route
opening; shoal traversal was not independently measured in the browser run.

### Final beta2 candidate — dist-beta, production preview 5180

Final evidence: [qa-results.json](../../captures/qa-2026-10-08T09-59-20-540Z/qa-results.json),
[gameplay at 1440x900](../../captures/qa-2026-10-08T09-59-20-540Z/final-gameplay-1440x900.png),
[How to Play](../../captures/qa-2026-10-08T09-59-20-540Z/final-how-to-play-1440x900.png),
[Larger text setting](../../captures/qa-2026-10-08T09-59-20-540Z/final-settings-large-text-1440x900.png),
[Find resources](../../captures/qa-2026-10-08T09-59-20-540Z/final-workshop-find-resources-1440x900.png),
[Save & return](../../captures/qa-2026-10-08T09-59-20-540Z/final-pause-save-return-1440x900.png),
and [390x844 gameplay](../../captures/qa-2026-10-08T09-59-20-540Z/final-gameplay-390x844.png).
The tested dist-beta snapshot was built at 22:55:20 NZDT. These SHA-256
fingerprints identify the retained build; no rebuild was made during this QA:

| File | SHA-256 |
|---|---|
| `index.html` | `48179180a1128131fd29685f2a68ada5e7b643256079c5950f6aa3f63b21274d` |
| `assets/index-CO9TQ3k-.js` | `05ed25d59c90b73e2474c405a532e8c670b8c4806dcd9e7725981cf02c1c4215` |
| `assets/index-BApVFWji.css` | `7ca7f80bd22db30b103d80dc83ddcbdb6e6f82bd4ed4a3d6ac2f7c43cc83b9a2` |
| `assets/scene-C7fCyTob.js` | `a6a7fb71a1c22bf0aaef0f4ae7606be1dbbbc6efb2c16c292506d7dd8e13b90e` |
| `assets/menu-art.png` | `74125146d18e8b798bfe984148472c927b51f31ca25aabe3b93ec91e2a147d1a` |
| `assets/workshop.glb` | `d771ff642cebfdcb93526d43b5040d9e25fd5f7229c48905adcb790dc82978b0` |
| `assets/island.glb` | `8715786f8500b90514d4fce6e747d1103b26c9bc4fbbdc368190040ba8d131bc` |
| `assets/landmarks.glb` | `cf211aa82042686a9966e84029c7bf045f5342f247a6be4a175a406015cb5d67` |

The three requested GLBs returned HTTP 200.

The staged first-voyage introduction opened and cancelled cleanly. Settings
were operated by keyboard: Space toggled Larger text, the `.settings-note`
computed size increased from 9px to 13px, and the preference remained enabled
after reload and reopening Settings. Tab moved to the completion button, whose
focus outline measured 3px solid orange. The title had English document
language, one h1, and no unnamed visible buttons. This is a focused semantics
and keyboard probe, not a full accessibility audit.

The Workshop's Find Wood, Find Scrap, and Find Pearls actions each closed the
panel, confirmed map tracking, and named the expected target. Find Scrap set
the navigator to the Salvage crate at 5m W with the “Gather within 3 m” hint.
Using only movement, gather, Journal claim, and Workshop controls, the browser
earned and built the Waterwheel. After Save & return, Continue restored that
upgrade. The save action measured 353×45px and was full-width, though it uses
the secondary button class. How to Play included movement, gathering,
dive/surface, workshop, journal, chart, and pause controls and returned to the
voyage. The three unlocked rig cards measured 102–117px tall; fit buttons were
38px high.

At 1440×900, 900×700, and 390×844, the canvas and sampled Pause, Gather, Dive,
and navigation controls remained visible and inside the viewport, with no
horizontal overflow. This checks the sampled controls, not every HUD element
or a physical touch device. A disposable context blocked all storage writes:
the settings still applied, the durable unsaved warning appeared, the active
voyage remained available for session-only Continue, and a later Save after
storage recovery succeeded. Runtime errors, failed requests, and HTTP failures
were all zero.

Chrome 154 / ANGLE Metal / Apple M4 Pro, macOS 25.6 arm64, DPR 1, high quality,
1440×900 hardware WebGL: after 5 seconds of warm-up, the 20-second active-play
sample recorded 1,200 rAF intervals, median 16.7ms, p95 16.7ms, 59.88 median
FPS, and zero frames over 50ms. This meets the documented 20ms median / 33.4ms
p95 budget on this one machine; it does not establish performance on other
hardware. The actual sailing circuit moved in all four directions. Renderer
counters stayed at 176 draw calls, 134,602 triangles, 151 geometries, and one
texture; CPU submit timing (0.7/1.0ms median/p95) is diagnostic only. Instrumented
shader compilation succeeded 22/22 times and program linking 11/11 times. The
explicit WebGL error queue was empty after scene load and after the benchmark;
no runtime, console, or network failures were observed. The fresh source domain
suite passed 28/28 tests.

The retained final capture shows the larger readable raft and authored
landmarks. The world remains much flatter and less lush than the supplied
reference, and pale shoal forms remain visible; the final renderer polish does
not close those art-fidelity gaps.

### Final beta3 candidate — dist-beta3, production preview 5181

The final candidate was tested on `http://127.0.0.1:5181/?qa=1` with Chrome
154.0.8037.98 via the installed Google Chrome channel because cached Playwright
Chromium did not launch. Focused fixture coverage passed in
[qa-results.json](../../captures/qa-2026-10-08T10-37-20-605Z/qa-results.json):
active expedition index survived reload/Continue; a ready coverage fixture
claimed through the Journal, announced the new pennant, emitted the three-tone
chime (392/523.25/659.25 Hz), showed “Next workshop pennant: 1 / 3 completed
voyages,” and retained its open native disclosure; and 1/3/5-completion save
fixtures showed the expected badge and next-pennant copy. These are explicitly
coverage fixtures, not voyages earned by this QA. The expert separately earned
three completions across sessions.

The earlier mixed beta3 functional report at
[10:24](../../captures/qa-2026-10-08T10-24-04-856Z/qa-results.json) had already
passed legal first-visit discovery, disabled-to-enabled chart permission,
quick-passage travel, direct/bypass UI choice, old-v2 migration, and 1440×900,
900×700, and 390×844 layouts with no horizontal overflow. Its remaining
fixture failures were harness seeding: a prior pagehide wrote the old live save
over the injected fixture. The corrected pre-initialization fixture setup
passed at 10:37; the failed diagnostic reports remain in `captures/` and are
not classified as product defects.

The final route check used the exact legal fixture at `(34,-12)`, time 10,
tracking Current run waypoint 3 at `(-16,-22)`. It rendered Direct ~18s and
Around ~14s: `planRoutes` returns 17.8466s and 13.2443s here, rounded upward by
the UI. The expert's approximately 13s observation was from a nearby in-game
position, not the fixture center. Direct and Around controls both worked;
diving hid and cleared the detour, surfacing restored the tracked waypoint, and
the live high-water transition at game time 38.08 hid the option and cleared
the old detour label. The final report is
[qa-results.json](../../captures/qa-2026-10-08T10-38-21-370Z/qa-results.json),
with [final gameplay](../../captures/qa-2026-10-08T10-38-21-370Z/beta3-final-render-1440x900.png),
[high-water route behavior](../../captures/qa-2026-10-08T10-38-21-370Z/beta3-final-route-high-water-clear-detour-1440x900.png),
and [post-circuit gameplay](../../captures/qa-2026-10-08T10-38-21-370Z/beta3-final-render-after-sailing-circuit-1440x900.png).

Other failed beta3 reports are retained as harness diagnostics: the 10:32
fixture lookup assumed the Journal disclosure had reopened, the 10:36 cleanup
clicked Pause while the now-preserved Journal panel intercepted input, and the
first 10:37 route attempt expected the expert's nearby-position estimate
instead of the exact-center fixture's rounded value. The focused 10:37 fixture
rerun and 10:38 render/benchmark rerun passed. None of these failures reproduced
as an application defect.

The three final GLBs returned HTTP 200. All 22 instrumented shader compiles and
11 program links succeeded; the WebGL error queue was empty after scene load,
the benchmark, and the sailing circuits. Runtime errors, failed requests, and
HTTP failures were all zero. Served-file SHA-256 fingerprints identify the
snapshot tested; no rebuild occurred during this run:

| Served file | SHA-256 |
|---|---|
| `/` | `c8862a6d5ea39b947c47f11d13dd0cc7aeb2b1c4fa83996254bef83d7c1b3e79` |
| `assets/index-DUFqV722.js` | `bf4b6f342f34343c383b4c978b0413896ebf13dc92ae7fd6396f344ce0d48c4b` |
| `assets/index-CF5Vdp0c.css` | `3e69da3c8a56ffaddd757a20bac2e43b7707bea2624e914b8867ab17e8fb5438` |
| `assets/scene-BP71JcR4.js` | `48a2c414f258b7e5a1de1eb31d8b34579a4a6114b09b523176ec76653e24193f` |
| `assets/menu-art.png` | `74125146d18e8b798bfe984148472c927b51f31ca25aabe3b93ec91e2a147d1a` |
| `assets/workshop.glb` | `20b2323fc211c83c4a7cd053238fe2f193b7fec9e1c62b39f170cd203564e561` |
| `assets/island.glb` | `8715786f8500b90514d4fce6e747d1103b26c9bc4fbbdc368190040ba8d131bc` |
| `assets/landmarks.glb` | `cf211aa82042686a9966e84029c7bf045f5342f247a6be4a175a406015cb5d67` |

After a 5-second warm-up, the sustained 20-second hardware sample captured
1,200 actual rAF intervals at 1440×900, DPR 1, High quality: median 16.7ms,
p95 16.8ms, 59.88 median FPS, and zero intervals over 50ms. It met the project
budget of median ≤20ms and p95 ≤33.4ms on Chrome 154 / ANGLE Metal / Apple M4
Pro, macOS 25.6 arm64. This is one high-end machine/browser profile, so it does
not establish performance across a device matrix and does not merit a 5/5
performance rating. CPU render-submit median/p95 were 0.8/1.1ms; these are CPU
diagnostics only, distinct from rAF/FPS and GPU time. Renderer counters before
the circuit were 196 draw calls, 154,555 triangles, 163 geometries, and one
texture. Geometry count was 169 after the first circuit and 170 after the
repeat; two short laps do not establish long-session resource stability.
The parent reported 49 passing source tests (38 domain, 11 navigation).

### Beta2 scorecard (historical)

These are conservative **agent QA synthesis** scores using the 0–5 rubric in
`docs/PROJECT.md`, not a player-fun verdict. Weighted points equal score ÷ 5 ×
weight. For comparison, the baseline column synthesizes the historical 5179
expert review, baseline browser benchmark, and the novice's limited settings
probe; it is not a second contemporaneous nine-dimension panel.

| Dimension | Weight | Baseline | Beta2 | Beta2 weighted points | Evidence and limit |
|---|---:|---:|---:|---:|---|
| Core interaction and agency | 16 | 2 | **3** | 9.6 | Movement, resource targeting, gathering, quest claim, build, dive/surface controls, and rig options work through normal UI. Route and recipe choices remain constrained; the final pass earned the first upgrade, not the entire arc. |
| Progression and session return | 14 | 3 | **2** | 5.6 | The expert beta2 run earned all five upgrades and three discoveries, then reloaded successfully. However, its direct route completed in 16.3 in-game seconds with a short, prescribed recipe/reward chain and little pacing or branching. Functional completion is not evidence of satisfying progression. |
| Tide system and exploration | 12 | 3 | **3** | 7.2 | Forecast/access behavior and low-tide slow-shoal route are covered by prior browser/domain evidence; 28 tests pass. This final focused run did not physically cross a shoal. |
| Reference art fidelity | 14 | 2 | **2.98** | 8.34 | Lower framing and authored landmarks materially improve scale/depth; the final capture still shows planar water, pale shoals, and a simpler world than the reference. Independent art review rates final fidelity 2.98/5, just below the floor. |
| Animation and feedback | 10 | 3 | **3.5** | 7.0 | Visible motion and clear action feedback are supported by the independent art/motion review and current UI checks. Character animation remains rigid; not every upgrade animation was exercised. |
| Onboarding and usability | 10 | 3 | **4** | 8.0 | Novice revisit scored its slice 4/5; final intro and all How to Play control groups were verified in-browser. This is still a limited novice slice, not broad user research. |
| Reliability and persistence | 10 | 3 | **4** | 8.0 | 28/28 domain tests, valid Save & Continue, injected total storage-write failure with recovery, three HTTP-200 models, and zero runtime/network errors. Cross-browser and long-session reliability remain unmeasured. |
| Performance | 8 | 4 | **4** | 6.4 | Actual 20-second hardware rAF run met budget at 59.88 median FPS. Score remains 4 because it is one headless Chrome run on one high-end M4 Pro profile, not a device matrix. |
| Accessibility and settings | 6 | 2 | **3** | 3.6 | Measured 3px keyboard focus ring, keyboard switch activation, persistent text scaling (9→13px in sampled copy), English language, one h1, and named visible buttons. Contrast ratios, screen-reader output, full focus order, and physical touch were not audited. |
| **Weighted total** | **100** |  |  | **63.7 / 100** | **Baseline synthesis: 54.4; change: +9.3. Progression (2) and art fidelity (2.98) are below the 3/5 floor; the total also remains below 75.** |

This scorecard is retained as beta2 history and is superseded by the final beta3
scorecard below.

### Final project scorecard — beta3

Scores use the project's 0–5 rubric in `docs/PROJECT.md` and match the
[coordinator beta scorecard](beta-scorecard.md). Expert-provided beta3
ratings are used for core interaction, progression, and tide/exploration; the
remaining ratings synthesize the retained browser evidence and earlier expert,
novice, and art reviews. Weighted points equal score ÷ 5 × weight. The baseline
column is the earlier synthesis from the historical 5179 expert review, baseline browser
benchmark, and novice's limited settings probe.

| Dimension | Weight | Baseline | Beta3 | Beta3 weighted points | Evidence and limit |
|---|---:|---:|---:|---:|---|
| Core interaction and agency | 16 | 2 | **4** | 12.8 | Expert beta3 rating 4; browser checks cover gathering, workshop, expedition selection, tracking, route choice, diving, claiming, and saved continuation. |
| Progression and session return | 14 | 3 | **3** | 8.4 | Expert rated 3 after earning three completions across sessions. QA verified active-index persistence and valid pennant/claim UI fixtures; fixtures are not counted as earned progress. |
| Tide system and exploration | 12 | 3 | **4** | 9.6 | Expert beta3 rating 4; UI exposed a valid low-tide alternative and cleared it on live high water. Prior domain/navigation suite was reported at 49/49; this QA did not physically complete a shoal crossing. |
| Reference art fidelity | 14 | 2 | **3.05** | 8.54 | Lower framing, authored landmarks, sloped shoals, and water treatment improve the view; the capture still shows a simpler world than the supplied reference. Independent art review rates fidelity 3.05/5. |
| Animation and feedback | 10 | 3 | **3.7** | 7.4 | Art review supports articulated swim frames, reduced-motion pose, and responsive feedback; the QA also verified the claim chime/copy. Limbs remain simple rather than a skeletal rig. |
| Onboarding and usability | 10 | 3 | **4** | 8.0 | Novice revisit rated its slice 4/5; the intro, How to Play, resource finding, larger text, focus, and responsive layouts were verified in prior retained runs. This is not broad user research. |
| Reliability and persistence | 10 | 3 | **4** | 8.0 | Save/Continue, old-v2 migration, active route index, claim flow, the beta2 quota-failure recovery, three final HTTP-200 models, and zero final runtime/request failures. Cross-browser and long-session reliability remain unmeasured. |
| Performance | 8 | 4 | **4** | 6.4 | Final hardware rAF sample met both budgets with zero >50ms intervals. Kept at 4 because it covers one high-end M4 Pro / Chrome profile only. |
| Accessibility and settings | 6 | 2 | **3** | 3.6 | Retained measures include 3px keyboard focus, persistent text scaling 9→13px, language/heading/name checks, and responsive controls. Contrast, screen-reader output, and full keyboard/touch audits remain untested. |
| **Weighted total** | **100** |  |  | **72.7 / 100** | **Baseline synthesis: 54.4; change: +18.3 from baseline and +9.0 from beta2. Every dimension meets the 3/5 floor; total is 2.3 points below the 75-point target.** |

These ratings combine independent expert judgments with limited automated and
agent-operated checks. They are evidence-backed product scores, not a player-fun
verdict or commercial-readiness certification.
