# Third improvement actual-input QA

9 October 2026. Owns `scripts/qa-third-improvement.mjs`, this plan, and generated functional evidence. No runtime edits. Prepared against the settled domain contract and current main/renderer interfaces. Jaco authorized full functional execution after production readiness; performance is explicitly deferred until other GPU sessions are closed and coordinated.

## Execution and isolation

Use installed Chrome via Playwright, launched in an escalated exec when the sandbox prevents localhost/browser access. Each case uses a fresh nonpersistent `browser.newContext`, never a user's browser/profile/storage. The earned arc has no fixture saves, injected progress, QA actions or camera hooks. Keyboard/mouse inputs and actual DOM controls perform every action. `__tidekin.getState`, `getMetrics` and `getComparison` are read-only observations.

The script does nothing without `--build-ready` (or displays help). Production default is `http://127.0.0.1:5181`. Read the served HTML/entry/CSS fingerprints before and after; optionally pin `--expected-entry=<served-entry>`. The dev/HMR port 5182 is unsuitable for acceptance. Source/domain hashes are recorded because fixture validation and site-coordinate catalogues come from local modules; a rebuilding candidate invalidates an unchanged-build verdict.

Functional command, after explicit readiness:

```sh
node scripts/qa-third-improvement.mjs --build-ready --mode=evidence --suite=all
```

Individual suites: `earned`, `variants`, `lifecycle`, `cameras`, `targets`, `adapters`, `accessibility`. Runs continue to independent cases after a failure; assertions, browser errors, state and UI observations remain visible. A passing aggregate is not a design/human-enjoyment certification.

## Input and projection helpers

- Sailing repeatedly reads position/heading, then sends bounded A/D turns and W throttle. No position changes after entry. Timeouts expose boundary/shoal/input failures.
- Cleanup movement uses real WASD for directional scheme, held empty-water pointer inputs for pointer scheme. Pointer-selected object holds are tested independently; remote object holds must not move the swimmer or collect anything.
- The renderer's `metrics.cleanupTargets` supplies target screen/world coordinates and three cleaning-segment projections. Object inputs use those actual projections. Empty-water coordinates derive from a world/screen anchor and segment scale for the confirmed planar side camera. Missing projections/other camera modes fail rather than silently reverting to actions or invented clicks.
- Pull uses actual held mouse input. Cleaning latches the target on pointer-down, then moves over all three projected strip segments (.8m total width) with adequate dwell. Stationary cleaning must never complete untouched segments. Release retains cleaning coverage but resets active indication; comparison changes clear unfinished coverage while preserving earned targets/air.
- `getComparison` verifies UI choices and disposable-practice flag. Selectors: `#compare-button`, `#compare-camera`, `#compare-scheme`, `#compare-action`, `#compare-tuning`; real `data-modal-action` buttons apply choices/start/end practice.

## Acceptance coverage

| Suite | Actual-input acceptance |
| --- | --- |
| Earned, 1440×900 and 900×900 | Fresh empty inventory; movement >2m before pickup; starter wood; locked Track explanation and clearing; pre-wheel current pushback; both authored sites completed with once-only supplies; readable recipe and exact spending; build on raft away from home; chart cannot bypass first departure; wheel clears boundary; Track Mangrove, intentional heading/detour, heading-relative arrow and arrival; Track home, actual sailing home; save/reload preserves progression/guidance. |
| Variants, eight fresh contexts | Directional/pointer × pull/clean × current/quick. Same tasks/24s air. Real pace probe, remote-action rejection, cleaning stationary-hold rejection, release semantics, variant-switch reset, complete through pointer action, restoration, revisit/reload no duplicate supply. |
| Lifecycle | Earn one partial target, run out of breath, all targets/action reset, no banking, immediate retry; reload and voluntary exit discard incomplete work; switch variants; practice restores voyage and reload returns saved voyage. |
| Practice-new-voyage regression | Disposable trial → Pause → title → New voyage confirmation → earn starter pickup → save/reload; practice flag must clear and cannot suppress new-voyage saves. |
| Cameras, wide/square | UI selects following/first-person; real helm travel/turns; take/leave helm; orbit/zoom; workbench station; screenshots/short motion for independent clipping/readability review. |
| Controlled targets | Floating before overlap/overlap/high tide; anchored timber low/high; underwater resource; actual E and side-view salvage route; original resource node commit. Each fixture explicitly names initial coordinates/tide/progress and is never presented as Jaco's incident. |
| Region edge | Controlled Mangrove pearls within 4.5m but outside region arrival radius, synthetic wheel; actual Dive must enter adapter and commit original source node. |
| Adapters | Synthetic historical world-diving save resumes aboard; active Pearl trail enters side-view; first marker partial cleaning resets on surfacing; full one-breath survey retained across reload. |
| Accessibility, wide/square | Larger text/reduced motion via settings; root overflow; repeated station transitions and dialog keyboard focus containment. |

## Evidence limits and review gates

Outputs are under `captures/third-improvement/qa/<timestamp>-evidence/`: JSON with exact inputs, explicit fixture seeds, checks, screenshots, browser/GPU, source/build fingerprints and state/UI telemetry. Variant/camera contexts record video, then retain two short six-second samples instead of full-session recordings when ffmpeg succeeds. No traces. Trim failures retain the original video transparently. Earned arc retains screenshots; sampled variant/camera videos supply motion evidence.

Concurrent reviewer GPU activity makes functional frame metrics diagnostic only. Do not attribute their timing to a benchmark. Visual review still needs full-speed playback, camera shell/target occlusion, convincing swimmer reach/stow/bag/local change, charm/cohesion, visible current challenge and contrast. Automation checks real input/outcome, not human fun. The exact screenshot-associated log identity/tide sequence remains unknown; controlled cases do not reproduce it. No mobile/controller certification.

Remaining broader manual/targeted cases must be reported as gaps if not exercised: legacy old-six-target restoration migration, all regional resource adapters/upgrade permissions, every expedition claim/day record, home Track after reload, out-of-strip pointer drag/latch behavior, audio, contrast and screen-reader interpretation, resource-count stability across longer repeated dives, continuous high-to-low tide beside the same retained object. Domain unit coverage can support these contracts but cannot substitute for user-facing actual-input evidence.

## Separate hardware mode — waiting for coordinated GPU closure

Hardware measurement is already authorized by the full user Goal. After the parent coordinates closure of other GPU sessions:

```sh
node scripts/qa-third-improvement.mjs --build-ready --mode=performance --perf-view=follow --headed
```

Repeat deliberately for `helm` / `cleanup` if requested. 1440×900, DPR1, High, five-second warmup, twenty-second rAF sample. No video or screenshots during the benchmark. Record browser/GPU/build/view/settings, full sample intervals, median/p95, >50ms frames and resource counts. Distinguish reported hardware renderer, software rendering, headless and headed measurements; CPU submit timings are not GPU timing. Existing budget median≤20ms/p95≤33.4ms only applies to an appropriate hardware run. Functional concurrent-session metrics never establish this pass.

## Functional execution notes

First authorized production fingerprint: `index-MJNMjV1l.js`, SHA256 `6c232edf1109a1435382634a28af511dcaad45a620d36079513fb1e03e33f8ca`, CSS `index-DR1CBEXT.css`. Initial run [results](../../../captures/third-improvement/qa/2026-10-09T02-28-39.943Z-evidence/results.json) retained all outcomes and an unchanged served build.

Initial harness corrections (not product failures): scope map Home via `#panel-dialog [data-track="home"]` because production contains duplicate nav/map IDs; resample position after pace-probe surface return before remote action assertion; during cleanup open comparisons through Pause → Compare prototypes because the main nav button is hidden. Initial equivalent failures are preserved and invalidated rather than erased. Duplicate HTML IDs are a real markup issue reported to the parent; chart button behavior needs its corrected input case.

The first fully corrected single [directional/pull/current case](../../../captures/third-improvement/qa/2026-10-09T02-34-21.074Z-evidence/results.json) passed the actual-input sequence including remote-action rejection, switching, restoration, revisit and reload/no duplicate. Remaining variant/arc/lifecycle/survey cases are being rerun; no full-matrix pass is claimed yet. Initial independent camera/target/accessibility and practice→new-voyage persistence cases passed.

Initial boundary evidence establishes blocked departure and wheel-enabled crossing, not visibly negative radial pushback. Parent has a pending source fix to replace the inner-radius clamp. Prepared explicit `--suite=gate` for the next notified build: controlled fresh position `(0,21.9)`, no wheel, real held W, read-only radial samples and short motion; require negative radial deltas during throttle. This targeted suite is excluded from default `all` until the later gate build is notified. Never reinterpret old clamp screenshots as proof of visible inward push.

Primary performance now requires `--headed`; an intentionally supplemental headless run requires `--supplemental-headless`. Performance remains unrun pending parent-coordinated GPU-session closure, not additional user permission.

The corrected [wide and square earned arc](../../../captures/third-improvement/qa/2026-10-09T02-35-20.033Z-evidence/results.json) both **passed**, with unchanged production fingerprint. Real input covered movement >2m, pickup, two payouts, away-home wheel spending, before/after departure, Mangrove arrival, tracked physical return home and persisted continue. Reviewed the retained wide home-arrival image directly. This does not close the later visible-pushback gate or human design judgment.

Headed benchmark preparation calls Playwright `page.bringToFront` and requires visible/focused page before warmup. No benchmark has run.

Corrected [lifecycle and adapters rerun](../../../captures/third-improvement/qa/2026-10-09T02-37-03.451Z-evidence/results.json): **4/4 passed** — lifecycle, practice→new-voyage save regression, legacy world-diving migration, Pearl survey/partial-first-marker coverage surface reset and ready-survey reload. This closes the initial hidden-Compare harness failures; production fingerprints were unchanged. No product failure was inferred from the invalid initial remote-hold assertion.

## Functional completion, before final refinement build

**25 distinct functional cases passed** across retained runs on `index-MJNMjV1l.js`. Every contributing completed run reported unchanged served fingerprints. No page errors/request failures occurred in passing cases. All Playwright contexts/browsers owned by this QA were closed after capture. Parent may now rebuild production; no hardware run has occurred.

| Final evidence | Outcome |
| --- | --- |
| [Earned wide/square](../../../captures/third-improvement/qa/2026-10-09T02-35-20.033Z-evidence/results.json) | 2/2 full arcs, home return and continue included. |
| [Directional/pull/current control](../../../captures/third-improvement/qa/2026-10-09T02-34-21.074Z-evidence/results.json) | Passed corrected real-input comparison lifecycle. |
| [Remaining seven variants](../../../captures/third-improvement/qa/2026-10-09T02-35-49.155Z-evidence/results.json) | 7/7 passed; combined 8/8 schemes/actions/paces, including stationary-clean rejection and all-segment sweeps, switches/revisit/reload/no duplicate. Two short clips retained per case. |
| [Lifecycle and adapters](../../../captures/third-improvement/qa/2026-10-09T02-37-03.451Z-evidence/results.json) | 4/4 passed, including immediate retry, partial reset, practice restoration/new-voyage persistence and survey coverage surface reset. |
| [Initial unaffected cases](../../../captures/third-improvement/qa/2026-10-09T02-28-39.943Z-evidence/results.json) | Camera wide/square, all seven controlled target/region-edge cases and accessibility wide/square passed. Use the case-level results; this original run's aggregate remains fail due to retained invalid harness cases. |

No failing executed functional acceptance remains after harness corrections. Known duplicate nav/map Home IDs were reported to the parent and remain a markup issue awaiting the final build, even though map-scoped Home input passes. The current gate's old clamp supports a blocking verdict only; inward-motion acceptance awaits the prepared targeted gate suite on the refined build. Artist/transfer/rig-text source refinements were not assessed by these earlier-build outcomes. Final refined production needs targeted smoke/current/transfer/camera evidence and coordinated headed hardware sampling. The manual/uncaptured gates above remain explicitly open; these functional passes do not establish human enjoyment or design polish.

## Refined frozen 5190 results — index-DK96C1r8.js

[Targeted gate/camera/layout run](../../../captures/third-improvement/qa/2026-10-09T02-42-56.758Z-evidence/results.json): inward-contact test passed (85 position samples; 34 radial deltas below −.02, minimum −.084m while W held). Both camera and accessibility layouts passed. The earned arc physically returned home but a harness expectation failed because the refined UI intentionally freezes the Arrived arrow at 0°; this is **not a navigation regression**. The [earned-state continuation](../../../captures/third-improvement/qa/2026-10-09T02-50-43.154Z-evidence/results.json) seeds only that actually earned home snapshot into a new isolated context, explicitly labeled. Unique chart/nav Home IDs, arrival-state arrow, effective rig speeds/universal 24s air copy and save/continue all passed. It is a continuation check, not a second fresh earned arc.

[Bounded Mangrove matrix](../../../captures/third-improvement/qa/2026-10-09T02-47-23.168Z-evidence/results.json) and [corrected competing bow check](../../../captures/third-improvement/qa/2026-10-09T02-49-59.320Z-evidence/results.json): nine distinct cases passed after correcting one persistence assertion. Both follow/helm captured isolated floating timber before overlap and at bow reach, deck corner beyond 4.5m with explicit distance feedback, and roots before/at center overlap while covered. Competing nodes agree with the actual single grant: at the bow the nearer crate is selected, then a later E after reload can validly collect the different timber; at the corner the roots are selected. The initial assertion wrongly disallowed the distinct second grant, **not a duplicate payout**. Corrected accounting checks identity and exact amounts for newly added node IDs.

The continuous roots test kept `(32,-4)` throughout natural time advancement from t95, with no re-entry/reload or clock injection until after collecting. Tide .9906 → .8828 → .5866 → .3788 kept roots/Gather blocked with visible Covered/countdown feedback; at t145, height .3287, availability and Gather refreshed automatically. E awarded exactly 6 wood and reload did not repay. Every log case is a **candidate reconstruction, NOT the exact Jaco incident**. The retained human before-overlap and reported high-tide images were inspected directly; they do not establish node, coordinates or numerical tide. Controlled passing reconstruction must not replace the human report.

[Gap measurements](../../../captures/third-improvement/qa/2026-10-09T02-50-43.154Z-evidence/results.json): AudioContext instrumentation observed actual sound-off suspended / trusted sound-on running at 48kHz; no audibility/hearing certification. Eight actual alternating starter-site enter/exit cycles plateaued per site after warmup: Home Reef 433 geometries/4 textures, Sheltered Cove 456/4, identical on later matching cycles and raft return. Initial growth 402→425→433→456 is retained rather than hidden. This supports bounded resource reuse, not GPU timing or proof of final shutdown disposal.

Screenshot-derived contrast differs from visual judgment. Stable paper text sampled **10.13:1**; toolbar **9.92:1**, with exact rendered foreground RGB found. Coral/modal and disabled-explanation samples were captured against rectangles read during panel transitions: foreground distance from expected CSS was 112.9/35.1, so these are **invalid measurements**, not product contrast ratios. Original outputs remain retained. Sampler now waits for UI settling and rejects samples without a matching rendered foreground core. The known DK96 lighter coral source endpoint does not meet normal-text 4.5:1 (PM calculated about4.19); the later darker source stop is not present in this frozen build and must be measured on the final candidate. Do not treat the invalid captured ratios1.76/1.17 as accessibility regressions or claim a rendered pass from the unbuilt fix.

All completed refined runs reported unchanged served fingerprints and no browser errors in valid passing cases. This QA's browsers are closed. Remaining work: valid final-build coral/disabled-explanation contrast and parent-coordinated headed hardware sampling; focused retest of any newly changed assets/disposal behavior. Provided hardware identity for later record: Mac16,8, Apple M4 Pro, 51539607552 bytes/48GiB, from PM read-only sysctl; no timing claim from that identity.

### Evidence-based scoring advice, pending final measurements

Using PROJECT's existing anchors (3 coherent MVP,4 polished beta), without reference to target totals:

- **Progression/session return:4, moderate confidence** on the bounded opening. Full fresh earned wide/square arcs, both once-only restorations, raft-built spending, meaningful physical gate, tracked onward/home voyage and continue passed; refined home/copy continuation also passed. Broader whole-upgrade economy and human motivation are not demonstrated by this opening QA.
- **Tide/exploration:3–4 boundary; recommend3 until integrated player readability disposition.** Controlled access refresh and identity-accounted rewards are reliable and explicit. The 4.5m circular center reach still rejects a visually overlapping deck corner, and automatic competing-node choice can differ from the intended log. Explanation is present, but independent/human assessment must determine whether that presentation resolves the original confusion; exact Jaco incident remains unknown. Do not inherit a prior4 or mark that incident reproduced.
- **Accessibility/settings:provisional3; final recommendation after valid contrast.** Wide/square large-text/reduced-motion focus/layout and AudioContext settings are demonstrated, and sampled paper/toolbar contrast is strong. Final coral and missing-resource explanation still require valid rendering samples. No screen-reader, color-blindness, mobile or controller certification.
- **Performance:unscored until exclusive headed final-build samples.** Stable eight-cycle resource counts are useful sustained-run evidence but cannot substitute for 5s+20s hardware timings. Concurrent/headless functional frame telemetry is excluded. If final appropriate samples meet budget and resource circuit remains bounded,4 may be justified for that measured hardware profile; neither a rating nor universal hardware claim is presently established.

## Final frozen build closure

Final candidate B3pFPmlR / COKZ-vVH / DXHHZ4tV: eleven distinct narrow functional cases pass after correcting a hidden workshop-dialog read; original failure retained. New hull-corner success supersedes old circular-only rejection. TR5 actual resource Space entry passes despite nearby Home Reef. Contrast10.13/9.94/4.88/7.15 passes representative rendered samples. Eight transitions plateau433/456 geometries,5 textures after initial warming. Three exclusive headed installed Chrome M4 Pro High DPR1 1440×900 samples, each5+20s: medians16.7ms, p95 17.4/17.2/17.2ms, zero>50ms. No recording during sampling; all browsers closed. Full final evidence, scope limits and updated score advice are in [qa.md](qa.md). Pending independent final P2 image acceptance remains explicit. No further broad test repetition needed.
