# Second improvement browser QA

Functional execution began against the PM-frozen initial candidate on 5181: entry `index-Cc1c7XC3.js`, scene `scene-KQL0iZit.js`. Complete served/disk asset hashes and independent source hashes are retained in `captures/second-improvement/qa/2026-10-08T23-28-01-425Z/results.json`. Aggregate served-build fingerprint: `9cc169122e0f9e6c42671a4933b767062c7afdd907328436a3df30d415b94923`.

Current status: 30 frozen-build functional components pass, five delivery regression areas pass, and final title containment/reduced-motion/short-height checks pass. Final hardware samples and sustained transitions pass. The chronology below retains earlier failures and their exact build boundaries.

The initial cleanup air panel overlaps the snorkeler at the surface. `earned-affected-entry.png`, `earned-surface-breath.png` and matching state/metrics records preserve that initial candidate. The UI specialist is correcting the overlap; final visual comparisons require a new PM build and separate evidence. Source edits during this run do not change the existing served candidate; provenance warnings must distinguish current source from the measured build.

## Harness and evidence boundary

`scripts/qa-second-improvement.mjs` uses headless installed Chrome with hardware WebGL permitted, fresh disposable contexts, DPR 1, and no user profiles or saves. Each test context closes before the next begins. Benchmarks run last and sequentially. Actual screen clicks for helm, cabin, workshop and cleanup read `getMetrics().interactions` projections and call `page.mouse.click`; QA action hooks never perform gameplay. State and renderer metrics are read-only observations.

Actual-input cases start a fresh voyage directly through `#new-voyage`, then wait for non-null state and completion of loading; there is no old confirmation-first welcome path. Every seeded-save Continue also waits for non-null state. No runtime clock/game-state mutation accelerates cleanup or tide checks. Navigation uses feedback-driven real key presses; this is coached agent execution, not uncoached human understanding.

Earned evidence covers collect → bag progress → swim up → refill without reset; two deliberate partial failures and immediate retries; completing all six trash objectives; no resource reward/duplicate completion; map restoration; save/reload; restored reentry. Separate partial-save coverage checks the live attempt survives pause/save while reload and voluntary raft return discard unfinished attempts. Screenshots require independent visual inspection of bag/string, swimmer, trash transfer and affected/clean water: correct state alone cannot establish readable art.

Physical station tests cover vessel-relative W/S, turn-only D, heading-following motion after turning, off-helm suppression, station/modal input suppression, held-key reset on pause, settings typing focus, and a real blank-tab focus transfer during a dive. The harness fails that focus case if Chromium does not actually lose focus/visibility; synthetic events are not passed off as real focus evidence.

Explicit fixtures cover old v2 fields absent, completed restoration, invalid saves, floating/anchored/overlap tide phases and continuous real-time high-to-low recovery. Fixture data is stored with the report and clearly marked as unearned. Exact reproduction of Jaco's original tide incident remains unestablished.

Reduced motion/larger text are changed through actual settings UI, exercised during cleanup, reloaded and checked for persistence. Resize captures cover 1440×900, 900×900 and 900×700 with viewport bounds/overflow assertions. Asset load failure is explicitly injected by aborting GLB requests, then unblocked for recovery. Storage failure is explicitly injected before startup; save-return recovery must retain the live voyage, then successfully save after removing only the injected fault.

Performance mode measures surfaced sailing and cleanup surface separately: each has 5-second warmup, 20-second rAF sampling, browser/GPU/OS/DPR/quality/drawing buffer, full intervals, median/p95, >50 ms counts and renderer stats. Software is classified separately and cannot pass hardware acceptance. A real-input sailing segment series follows, then ten cleanup/station/chart transitions check warmed geometry/texture counts and the WebGL error queue. These are local measurements, not cross-device certification.

## Execution

```sh
# No browser or integration execution:
node scripts/qa-second-improvement.mjs --list

# PM builds/serves the frozen production candidate on 5181 first:
TIDEKIN_BASE_URL=http://127.0.0.1:5181 node scripts/qa-second-improvement.mjs --functional-only

# Only after camera testing ends; run sequentially:
TIDEKIN_BASE_URL=http://127.0.0.1:5181 node scripts/qa-second-improvement.mjs --performance-only
```

Each invocation writes a fresh timestamped folder under `captures/second-improvement/qa/`. Failures retain screenshot/state/UI evidence and a Playwright trace zip. Results persist between cases. Served build must remain unchanged for an invocation; source hashes are independent diagnostic provenance. `node --check` and `--list` passed during harness preparation. These preparation checks do not establish that integrated tests pass.

Baseline evidence and its two harness failures remain intact under `captures/second-improvement/baseline/`; the old candidate continues on 5183. See `docs/reviews/second-baseline.md` for eight matched original captures, stable opening supplements, hardware reference, corrected browser fixtures and continuous-tide result.

## Initial functional progress and harness corrections

The initial earned cleanup lifecycle and partial-save cases passed, with two complete fail/retry resets, successful map restoration, and reload preservation. Fifteen browser tide phase/targeting samples passed. Physical helm/station assertions reached the real-focus check; headless Chrome did not actually lose focus, so that coverage is blocked rather than a gameplay defect. The initial runner recorded it as failure; that evidence is preserved. Invalid-save recovery stopped at the legitimate replace-existing-save confirmation: the harness now explicitly confirms only its disposable malformed fixture. Neither is a demonstrated critical gameplay bug.

PM rebuilt during the initial run. Existing contexts may use the earlier bundle and fresh contexts the newer bundle; this mixed run cannot provide final acceptance. A clean re-run records response-body hashes per case as well as before/after whole-build fingerprints. The initial raw results remain unchanged, including their build/source-change termination if encountered. Final screenshots include stable title, square/wide cleanup and a sequence of transfer frames; visuals remain subject to independent art review.

## Initial run completion

Initial run: 23 passed, two harness/environment failures. Earned cleanup, partial-save, resize/reduced motion, old/completed save fixtures, all 15 tide phase/targeting cases, continuous tide, asset recovery and storage recovery passed. Its final fingerprint changed from `9cc16912…b94923` to `88f931e4…51b65`, correctly terminating acceptance. Raw report/traces remain preserved. The later harness labels inability to establish real headless blur as blocked, explicitly handles replacement confirmation for invalid fixture storage, and records served response-body hashes per case.

Tide clarity finding: current contextual HUD overwrites the blocked reason with an empty hint off helm and steering text at helm. The disabled button title and E toast explain the rule, but the visible contextual HUD fails to explain why covered salvage cannot be collected. Explicit off-helm/at-helm screenshots and a dedicated assertion now cover this requirement. No runtime collection inconsistency or exact human reproduction is claimed.

## Stable targeted recheck

Targeted run `2026-10-08T23-33-58-147Z`: stable build `88f931e45790d6b9409de35873fecfea22217692ffd6e43520cb4babee751b65`, entry `index-CYmloxBi.js`, scene `scene-D_ip2yPG.js`; per-case response-body hashes retained. Progressed old-v2/completed fixtures and corrected invalid-save replacement passed. Blocked-tide explanation failed in both modes: off helm title “Click the wheel to sail.”, at helm title “W/S forward/back · A/D steer”; both had empty hints, disabled gather and tooltip “Dive or wait for low tide”. This is a UI clarity finding, not an incorrect tide availability claim. PM has acknowledged it for correction.

Next full functional acceptance run is held for explicit PM FINAL FREEZE. No benchmark is run while camera prototyping continues. A narrow headed physical-input/focus recheck is authorized against the current production build and uses actual browser/tab focus, not synthetic blur.

## Real headed focus recheck

Run `2026-10-08T23-35-54-461Z` passed physical helm/station/focus coverage in isolated headed Chrome. Build hash `87593837c62e8e6d142ee46e3c98c5bd45f419b6183917c2c541eefc14267676` remained unchanged. Playwright enables Chromium focus emulation even when headed (verified in installed Playwright source); disabling that default via CDP permits actual tab visibility/focus. No blur/visibility events were synthesized. Actual tab transfer reported {"hidden": false, "focus": false}; cleanup air remained unchanged during the 1.2-second background interval. Vessel-relative W/S, turn-only D, off-helm suppression, actual cabin/workshop object clicks, panel/modal input suppression and held-key pause reset also passed.

The earlier headed run `2026-10-08T23-34-45-641Z` is preserved as blocked because default focus emulation prevented the condition. It is not a gameplay failure. Full functional/final visual and hardware acceptance still await explicit FINAL FREEZE and completion of camera testing.

## F6 contextual dive-routing coverage prepared

Added four final-freeze checks; these have not been executed yet:

- `legacy-dive-timber-high`: isolated fixture at home timber (6,6), time 90. Assert the actual selected node is covered timber, capture the visible dive label/hint, then use actual Space to enter `state.diving === true` with no cleanup attempt; the label must become Surface, and another Space must surface.
- `legacy-dive-pearls`: isolated fixture at home pearls (6,-9). Check the same visible-label → actual legacy dive → actual surface contract for an underwater node.
- `origin-snorkel-route`: fresh earned voyage at (0,0). Visible Snorkel and actual Space must enter cleanup with `state.diving === false`, then return normally.
- `buoy-click-cleanup-over-covered-salvage`: at the covered timber fixture, use the read-only buoy screen projection and actual mouse click. The explicit buoy interaction must enter cleanup despite the nearby blocked salvage target.

Fixtures are seeded before navigation; all entry/surface actions are real browser inputs, and each Continue waits for non-null state. No runtime state/clock mutation or QA action call is used. Syntax and test-list checks passed after the additions. Execution remains held for PM FINAL FREEZE; the UI shared contextual-dive helper is still being fixed. The earlier F6 behavior is not silently declared resolved by these unexecuted assertions.

## FINAL FREEZE functional run in progress

PM authorized a frozen-candidate run after F1–F6 and attempt-identity corrections. Run `2026-10-08T23-41-42-951Z` is executing against aggregate build SHA-256 `15dad0020b8be16575fb795b0b6b930b75661898367e81b8f4c735fc898dbd6e`; entry `index-CFK9qQDK.js`, scene `scene-Be6Rwn9a.js`. Before/after build/source fingerprints and per-case response hashes are recorded. Review-document updates do not change source fingerprints.

This invocation is functional-only. Hardware acceptance remains deferred until camera/novice/expert work completes. Prior runs, findings, traces and mixed-build termination remain preserved separately.

## Frozen-candidate functional acceptance components

The full run completed with 29 passes and one harness wording-assertion failure. Its served build remained exactly `15dad0020b8be16575fb795b0b6b930b75661898367e81b8f4c735fc898dbd6e`. Source changed only because PM staged subsequent text polish, so these results apply to the recorded frozen bundle, not that later source text.

The displayed pause policy was correct: “Reloading unfinished cleanup returns you to the raft and starts that cleanup over.” The harness had required the contiguous phrase “starts over”. The revised assertion checks unfinished cleanup, reload, raft return and restart/reset meaning separately. Only `earned-partial-save` was rerun, in `2026-10-08T23-46-41-642Z`, guarded by the exact expected build hash. It passed save-without-changing-live-attempt, paused-air stability, reload discarding partial cleanup while preserving unrelated state, and voluntary exit/reentry reset. Before/after fingerprints match the full run. The original assertion failure screenshot/trace/report is preserved unchanged.

All **30 functional cases** therefore have passing evidence on the same frozen build. `captures/second-improvement/qa/final-functional-summary.json` links each component to its raw report and explicitly identifies the single supplemental check. No critical gameplay defect was identified by these checks. This is a functional-component pass, not overall release acceptance: hardware benchmarks/sustained transitions and post-polish targeted visual/input review remain deferred.

F6 passed: timber high tide and pearls offered legacy dive, actual Space entered `state.diving` without cleanup, and actual Space surfaced; origin Snorkel entered cleanup; actual buoy click entered cleanup despite covered timber. Visible blocked-tide reasons now passed both off helm and at helm. Floating/anchored/overlap phase samples and an uninterrupted high-to-low browser sequence passed, without establishing exact reproduction of the historical human incident.

The top-right air panel no longer obscures the swimmer's head in the inspected wide capture, and irrelevant raft panels are hidden during cleanup. Square restored-scene and map captures preserve completed state; visual beauty, action satisfaction and human comprehension are not established by state assertions. The diagnostic duplicate-E test produces “This attempt has ended” in some restored screenshots; that toast follows an intentional QA input and is not the normal completion message. Normal completion/map restoration and persistent state are recorded independently.

## Expert stale failure-HUD regression check prepared

The expert found a concrete presentation defect not covered by the original state-only failure assertions: the paused HUD behind the failure modal could retain `1/6` and `Air 1s`, even though domain state had already reset. The original 30-case functional evidence remains valid for its assertions; it did not establish immediate failure-HUD correctness.

Added `failure-hud-immediate-reset` for the next build. It starts fresh, enters cleanup using actual input, collects one trash item, swims down and exhausts real air. The test waits only for failed state plus failure-modal opening, not for the desired HUD content. Its first atomic observation must show visible `0/6`, visible `Air` and `0s`, with empty collected state and no permanent completion. Immediate screenshot/state evidence preserves empty-bag presentation for visual inspection. Actual Retry must restore empty progress, surface position, full air and breathing HUD without changing unrelated voyage progress.

The first observation is retained even if assertions fail. No synthetic failure, injected clock or game-state mutation is used. Syntax/list checks passed; execution is held for PM's next final build with the pending forced HUD refresh. Hardware benchmarking remains held pending camera completion and the same next build.

## Next-build camera and polish smoke prepared

The Wheel/first-person prototype was rejected because the vessel shell clipped its view. It is deliberately absent from production acceptance; keeping a dev-only QA prototype hook does not make it a shipped camera. Follow and orbit inspection are the intended production choices.

Prepared narrow checks for the next build:

- `polish-opening-heading-inspection`: stable title/opening captures at wide/square sizes; orange-buoy Home Reef purpose hint; actual helm entry in Follow; cardinal bow text checked against authoritative heading before/after actual D steering; production inspection chooser has Follow/Inspect and no Wheel option; actual Q/Equal orbit/zoom leaves vessel position/heading unchanged.
- `stored-wheel-camera-normalization`: explicit isolated old settings fixture with `sailingCamera: helm` must produce Follow when physically taking the helm. This is a settings fixture, not a user's preference/save.
- `workshop-plan-rig-accordion`: explicit earned-structure save fixture with waterwheel; next crane plan shown directly; completed/later plans and optional rigs collapsed initially; actual accordion open and diver-rig fit preserve expansion through refresh.
- `bag-seams-actual-input`: fresh cleanup, empty bag and one earned collection; swim in both directions and capture bag attachment/seams/silhouette at wide and square sizes. Mesh appearance remains an image-review judgment, not a count assertion.
- `failure-hud-immediate-reset`: actual partial exhaustion and immediate visible reset/retry evidence as described above.

The existing sequential sailing/cleanup hardware samples and ten repeated transitions remain the benchmark path. These additions passed syntax checking only; execution is still held for PM's next final build and camera completion. No broader repeat of the preserved 30-case rules/functional suite is planned absent a new concrete defect.

## Delivery targeted results and final title fix

Delivery build `1297b74a168bd77184d5db347a80633a207821a662fffcd1a2af11ae9eca6c46` (index-DeA0w30n.js, scene-yIHawRAH.js): run `2026-10-08T23-53-27-366Z` passed opening purpose/cardinal heading/Follow+Inspect, stored rejected-camera fallback, earned bag collection captures, and immediate failure HUD/reset/retry. The first failure-modal observation showed visible 0/6 and Air 0s with empty collected state; Retry restored fresh full-air surface state. The modal blurs the bag, so its screenshot alone cannot prove mesh appearance.

Workshop initially failed a harness requirement for the literal “Next upgrade”, despite the crane plan being visibly first. Corrected semantic check alone reran in `2026-10-08T23-54-39-050Z` on the identical fingerprint and passed crane-first layout, collapsed later plans/rigs, 48.39px summary heights, real diver fitting, and preserved accordion expansion. Original failure remains intact.

Title probe `2026-10-08T23-56-33-823Z` confirmed menu scroll bounds 1472×923 within 1440×900 and 920×923 within 900×900, while document bounds matched viewport. Animated decorative overscan expanded the menu scroll container. Both failure images/layout records are preserved. Performance was held before PM rebuilt only the decorative overflow wrapper.

Final title run `2026-10-09T00-02-12-225Z` passed on `8dd2c81f93cc328928bf74c5765d7ef902469ed8c7543eb2f520cd037e9600d2` (index-9TpJEO4p.js, scene-C3Fly4-r.js, index-CyPKckhp.css). Normal and reduced-motion 1440×900 and 900×900 document/menu scroll bounds exactly match each viewport, without gutters. Reduced motion reports no artwork animation/transform. At 900×420, Start new voyage and Settings remain reachable. Inspected wide/square and short-height images show no white edge gutters. Menu overflow remains auto for controls; only art overscan is contained.

`captures/second-improvement/qa/art-review-handoff.json` indexes delivery gameplay and final title images with separate fingerprints. PM confirms all other browsers closed; final hardware/sustained measurement now runs exclusively. No full rules-suite repetition was performed for this title-only change.

## Final hardware and sustained-transition result

Exclusive run `2026-10-09T00-02-36-667Z` passed on final title build `8dd2c81f93cc328928bf74c5765d7ef902469ed8c7543eb2f520cd037e9600d2`. Before/after served fingerprints match; source stayed unchanged. All other reviewers had closed their browsers before this run. Installed headless Chrome 154.0.8037.98 used hardware ANGLE Metal Renderer: Apple M4 Pro, on macOS arm64; software classification was false. High quality, 1440×900 CSS/drawing buffer, DPR 1.

Each sample followed 5 seconds warmup. Sailing: 20,012.3ms sample, median 16.7ms, p95 16.8ms, zero intervals over 50ms; 160 draw calls, 126,364 triangles, 199 geometries, one texture. Cleanup surface: 20,003.1ms sample, median/p95 16.7ms, zero intervals over 50ms; 116 draw calls, 67,470 triangles, 308 geometries, one texture. Both meet the documented median ≤20ms and p95 ≤33.4ms budget on this local hardware profile. Raw intervals and CPU-submit diagnostics are retained; this does not certify other devices or GPU execution timing.

The actual-input sailing circuit and ten repeated cleanup/swim/return/cabin/workshop/chart transitions passed. Warmed geometry/texture counts stayed 308/1 with no continued growth; initial cleanup construction raises the sailing-only count, as expected. No WebGL errors or unexpected browser/asset errors were recorded. Context/browser closed normally.

`captures/second-improvement/qa/final-qa-summary.json` combines exact-fingerprint acceptance components: 30 functional checks on the earlier frozen behavior build, five targeted delivery regression areas on the delivery build, and title/performance checks on the final title-only build. Original harness failures, mixed-run evidence and confirmed pre-fix title overflow remain preserved. No implementation was edited by this QA task. No exact historical human tide reproduction or independent aesthetic acceptance is claimed.
