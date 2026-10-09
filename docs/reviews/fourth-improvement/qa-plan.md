# Fourth improvement QA sidecar

Ownership: `scripts/qa-fourth-improvement.mjs`, `captures/fourth-improvement/qa/`, `docs/reviews/fourth-improvement/qa*.md`. No runtime, source, build or port-5181 server changes. Source reads are preparatory and may observe the PM's in-progress edits.

## Execution gates

Default/help is inert. Baseline requires B3pFPmlR and fails closed on entry mismatch. Candidate execution requires explicit new-build readiness and its exact production entry:

```sh
node scripts/qa-fourth-improvement.mjs --mode=acceptance --build-ready --expected-entry=index-HASH.js --earned
```

Installed Chrome uses fresh nonpersistent contexts at 1440×900 and 900×900, DPR1, empty storage. Only actual keyboard, DOM and projected pointer inputs perform actions. getState/getMetrics are read-only. No H in candidate acceptance. No fixtures in the current script; any later targeted fixture must be explicitly labeled and cannot replace the fresh earned arc. Each viewport records inputs, observations, errors, screenshots, continuous video and before/after served fingerprints. Headless captures are functional/visual evidence only.

The prepared acceptance checks title/HUD/workshop/map/journal/cabin/inspect/pause/settings/diving; movement from start, after panels, pause/settings and continue; visible removed-control copy; current workshop copy; and persistence. `--earned` adds starter pickup, pre-wheel gate, both physical buoy entries, directional 2.2 pace, surface breathing reset, real pointer pull on all objects, once-per-site recipe supplies, wheel spending, rAF-correlated assembly progress/completion, departure, Mangrove discovery, home return and earned save/continue.

Preparation is syntax checked, not candidate validated. Selector and metric compatibility must be checked against the notified production. Failure evidence stays retained; distinguish a harness assumption from a product defect before rerunning only affected cases. Pace uses elapsed input duration with tolerance; retain state/time samples for refined diagnosis. Assembly frame samples establish temporal progression, not artistic quality.

## Visual acceptance still required

Review matched wide/square captures and real-time video of every requested UI. Require illustration and animation across UI, workshop showing only currently available work, and coherent waterwheel assembly stages across actual frames. Record UI overflow and square pickup-popup overlap. Inspect the 3D pickup presentation: one popup, no arrow/distance labels; DOM-only text checks cannot certify canvas content. Verify all removed helm/first-person/comparison/practice controls, including keyboard behavior and paused UI.

Review idle buoyancy, surface swimming, deeper wide camera follow and visible pointer picking at depth. Deep-target captures and actual pulls support this; camera framing and character animation need independent visual judgment. Compare to a valid frozen baseline only. Surface refill must preserve collected objects and earn no payout until restoration. Broader anti-duplicate/revisit checks should be narrow actual-input additions if required, never invented passes.

## Memory and hardware protocol, deferred

Run only after the final candidate is ready and all other GPU test sessions are confirmed closed. Preserve `docs/performance-budget.md`: headed installed Chrome, foreground/visible/focused, hardware renderer recorded, High,1440×900,DPR1,5s warmup+20s rAF samples, no screenshots/video during measurement. Record browser/OS/GPU, exact build and settings, drawing buffer, raw intervals, median/p95, >50ms, draw calls, triangles, geometries/textures. Budget median≤20ms and p95≤33.4ms. CPU submit timings are not GPU timings; headless/software results do not pass this gate.

Measure current raft and deep-cleanup views; removed first-person view has no candidate gate. Repeat the existing eight alternating actual-input Home Reef/Sheltered Cove enter/exit circuit and a sailing circuit; preserve initial warmup growth and compare matching-site plateau. Historical third-improvement samples are baseline evidence, not final candidate results. No benchmark or resource circuit has run for the fourth improvement.

## Restored baseline and independent tests

Parent authorized an isolated historical source build on5182. Use the corrected reconstructed baseline `qa/2026-10-09T04-08-34.531Z-baseline/` for all-UI wide/square comparison, with the explicit reconstructed-source/recovered-art qualification in qa-baseline.md. Both capture sequences passed with stable served hashes and no browser errors. This does not erase the interrupted B3 attempt or incompatible first reconstruction.

Independent owned `tests/third-review.test.js` was migrated to the fourth contract, historical copy preserved outside discovery;22/22 pass. See qa-reviewer-tests.md. Final browser/earned/performance acceptance still awaits PM production readiness.

Readiness update: parent reports107 source tests passing; this sidecar independently ran only its22 reviewer tests. Await exact5181 production entry after remaining main/popup-atlas polish.

`--earned` now runs the sustained earned arc in1440×900 only;900×900 still covers all UI states and fast movement/menu/continue checks. `--earned-all-viewports` explicitly enables a second sustained arc when justified. Each item route first surfaces, traverses horizontally at the surface, waits for full breathing reset, then descends vertically and pulls. Swim timeout scales with travel distance at the fixed2.2 pace; no speed, clock or runtime action is changed. Syntax/help checked after this preparatory update; candidate acceptance remains unexecuted.

Final staged source fix, not yet built: parent identified `updateNavigation` hiding all destination bearings and restored explicit Home/shore tracking arrow+name while keeping pickup distance labels removed; closed chart stops canvas redraw. Current frozen B3ehq6Kw earned arc remains valid because steering uses actual input/state, not tracking. Hardware still deferred.

Prepared targeted post-rebuild smoke and final earned-state snapshot:

```sh
node scripts/qa-fourth-improvement.mjs --mode=acceptance --build-ready --expected-entry=index-FINAL.js --bearing-smoke --earned-results=captures/fourth-improvement/qa/2026-10-09T04-17-18.532Z-acceptance/results.json
```

This explicitly labels the seed as continuation of actually earned earlier state, not a second fresh arc. Both viewports use actual map tracking for Home/Mangrove, check bearing visibility/name/no pickup-distance text, verify heading-relative rotation before/after actual D, and clearing hides bearing. Actual save/reload/continue checks permanent earned state and movement without H, records `earned-continue`, and hashes the final served production. Performance may consume that final-fingerprint continuation snapshot, preserving its provenance back to the earlier full earned arc. The original running earned harness was preserved in its run directory before these preparatory edits. No staged-source browser test has run.

Exact-final frozen entry notified: `index-tY5N3BJ1.js`, CSS `index-D1qJB8_b.css`, scene `scene-qTMv-AZ0.js`. Full fresh wide arc plus square UI acceptance is running once more with `--earned --targeted-checks`. Targeted checks are incorporated into both viewport sequences, including tracked Home/Mangrove visibility/name/heading-relative rotation/clear and inspect context-underlay hide/restore. This preserves a fresh actually earned save under the final fingerprint for later performance; the earlier55-check evidence remains intact.

At parent request the isolated reconstructed5182 preview was stopped after completed capture (owned session exited130).5181 remains parent managed and untouched. Hardware must wait for explicit Descartes reviewer browser-closure confirmation, even after parent browsers are closed.

First exact-final targeted attempt (`2026-10-09T04-24-20.162Z-acceptance`) stopped before earned play at the post-steer bearing assertion in both layouts. Observed rotation correctly changed but lagged heading by0.1867rad; source HUD refresh is throttled200ms, while the harness read immediately after releasing D. This is an invalid sampling assumption, not a demonstrated product defect. Original failed evidence is retained. Both inspect underlay hide/restore checks passed. Corrected harness allows250ms for the actual HUD refresh after steering; rerun uses the unchanged final entry. No runtime hook or product source was modified.

Parent explicitly interrupted the focused-canvas rerun to permit the CSS rebuild before further sustained work. Owned acceptance session18137 was stopped; node40840 and isolated Chrome40848 exited. Owned profile `playwright_chromiumdev_profile-xU5Nrk` was checked for remaining processes. No candidate pass is claimed from this interrupted run.5181 remains untouched;5182 was already stopped.

The next notified CSS build will receive one fresh full wide earned arc and square UI sequence so benchmark fixture and served fingerprint match exactly. No CSS-fingerprint exception is needed. Harness now checks Home before the wheel, Mangrove only after the actual wheel build, polls atomic state/DOM angle after keyup up to300ms at unchanged0.05rad precision and records first-observed settlement upper bounds, then restores native canvas focus after Clear. Earlier missing-Mangrove and Space-on-focused-Clear outcomes are retained invalid harness assumptions, not product failures.

Verified final CSS-build output corrected the parent's initial unchanged-entry assumption: entry `index-CufECat5.js`, scene `scene-DEbMD4yK.js`, CSS `index-C2FIM3bx.css`. Vite references cascade compiled hashes despite unchanged source JavaScript. Final full fresh earned acceptance now targets this exact entry; later performance keeps strict complete served-fingerprint equality to its earned-save evidence. No fingerprint exception is used.

Mandatory assembly UI evidence was added to actual rAF samples: visible assembly stamp frames must hide the bottom HUD, and completed assembly must restore bottom HUD and hide the stamp. A live assembly screenshot is retained without pausing or runtime mutation. This closes the CSS-only feedback-overlap regression in the measured wide build sequence when passing; square remains the fast UI sequence.

Parent explicitly reconfirmed no other QA/reviewer/art processes are active, and authorized direct exclusive headed hardware plus8 actual-input memory cycles after final acceptance succeeds and its browser closes. No extra permission is required.

All requested executed gates closed on final CufECat5/DEbMD4yK/C2FIM3bx. Final acceptance79 checks passes, exclusive timing passes, and authorized16-cycle memory-only diagnosis establishes the final3 matching-site plateau after retained warming; original8-cycle failed criterion/raw data remains intact. See qa.md for evidence, source diagnosis and limits. All QA browsers and5182 closed;5181 left running. Parent requested no further tests; none will run.
