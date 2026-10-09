# Third improvement final QA

Final frozen production: `http://127.0.0.1:5181`, entry `index-B3pFPmlR.js`, scene `scene-COKZ-vVH.js`, CSS `index-DXHHZ4tV.css`. **Executed functional and hardware acceptance passes.** Independent final P2 image assessment subsequently closed the tested issue; see design-review.md. All QA browsers are closed; runtime/server/source were untouched.

## Functional evidence

[Final narrow suite](../../../captures/third-improvement/qa/2026-10-09T03-06-52.770Z-evidence/results.json) plus [corrected cleaning rerun](../../../captures/third-improvement/qa/2026-10-09T03-09-15.914Z-evidence/results.json) cover eleven distinct passing cases. Fresh isolated installed Chrome contexts used actual keyboard, pointer and UI controls. Domain/projection APIs were read-only. Fixtures are explicitly labeled candidate reconstructions, **not exact reproductions of Jaco’s incident**.

- Timber hull-corner pickups succeed in follow and helm; positions outside both oriented hull and circular reach reject E with Sail closer feedback. Both competing-node cameras expose exactly one active E marker, matching context selection and the actual grant. Reload checks account for distinct later pickups without permitting repayment of an existing node.
- TR5: high-tide Home timber corner, also within Home Reef entry range, names the resource on the Dive button; actual Space enters `salvage:home-timber` without moving the authoritative raft. Completion/reload pays once.
- Comparison panel and HUD explain cleaning sweeps. Actual stationary hold leaves one band incomplete; actual three-band sweep completes the object. Fresh starter pickup, reef restoration and save/continue smoke pass.
- Eight alternating actual reef enter/exit cycles show initial geometry warming 402→425→433→456, then stable matching-site counts: Home Reef433, Sheltered Cove456, textures5 throughout. This demonstrates bounded sampled transitions, not shutdown-disposal proof.

The initial cleaning assertion read hidden `#panel-dialog` workshop text. Its failure is retained; settled `#comparison-panel` read and actual sweep rerun pass. It is not a product copy regression. Earlier Arrived-arrow zero rotation and distinct-node post-reload grants likewise invalidated harness assumptions, not product behavior.

Prior full fresh earned wide/square arcs, eight scheme/action/tuning variants, lifecycle/failure/retry/practice/new-voyage persistence, survey reset, natural high→low held-position availability refresh and navigation evidence remain applicable; see [chronology](qa-plan.md). These were not needlessly repeated on the final build. Old circular-only corner rejection is deliberately superseded by final hull reach. Parent reports104 source tests passing; this QA did not rerun that source suite.

## Rendered contrast and hardware

Actual settled screenshot RGB samples: paper text **10.13:1**, toolbar **9.94:1**, coral primary **4.88:1**, disabled explanation **7.15:1**. All pass their sampled text thresholds. These representative samples do not certify every gradient pixel, all glyphs or full WCAG compliance. Earlier unstable modal samples were invalid and remain excluded. Earlier sound instrumentation observed suspended/running AudioContext after actual toggles; audibility was not certified.

[Exclusive headed benchmark](../../../captures/third-improvement/qa/2026-10-09T03-09-53.777Z-performance/results.json): installed Chrome154.0.8037.98, foreground/visible/focused, ANGLE Metal Apple M4 Pro. Mac16,8,48GiB from PM read-only sysctl. Each stationary animated view:1440×900,DPR1,High,5s warmup+20s rAF sample, no recording/screenshots during sampling. All meet median≤20ms/p95≤33.4ms. Functional headless telemetry is not used as hardware evidence.

| View | Median ms | p95 ms | >50ms | Draw calls | Triangles | Geometries / textures |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Follow |16.7|17.4|0|196|133726|227 /5|
| Helm |16.7|17.2|0|94|96570|242 /5|
| Cleanup |16.7|17.2|0|182|70531|378 /5|

Entry/CSS served fingerprints stayed unchanged before/after completed runs. [Exact final asset hashes](../../../captures/third-improvement/qa/2026-10-09T03-09-53.777Z-performance/final-assets.json) also record the scene chunk, independently verified from the served entry before testing and hashed after benchmark. rAF measures frame intervals, not GPU execution time; results apply to these stationary animated views on this machine, not every route/device or long-session workload.

## Recommendations

Using existing3 coherent MVP /4 polished beta anchors, independent of score targets:

- **Progression4, moderate confidence:** opening earned arc, exact spending, physical departure, onward/home navigation and persistence are demonstrated. Wider economy and sustained motivation remain outside this bounded QA.
- **Tide/exploration4 conditional on independent final P2 image acceptance:** actual hull reach, permission labels, single active marker, identity-correct rewards and natural tide refresh address the measured failures. Exact historical incident identity remains unresolved. Technical checks pass; final visual disposition belongs to the pending reviewer.
- **Accessibility/settings4 for the measured desktop scope, moderate confidence:** representative contrast, wide/square large-text/reduced-motion focus/layout, sweep instructions and accessible E fallback pass. No screen-reader, hearing, color-blindness, mobile or controller certification.
- **Performance4 for this measured hardware profile, high confidence in samples:** all three headed views meet budget and repeated transitions plateau. Do not extrapolate to universal hardware support or assign5 from these bounded tests.

No executed product regression remains open. Independent P2 visual sign-off is now complete; human enjoyment remains a separate unvalidated judgment.

Post-measurement harness maintenance: the current `all` suite uses the final oriented-footprint inside/outside cases and no longer also runs the superseded circle-only corner-rejection expectation. The exact measured harness is retained at `captures/third-improvement/qa/final-measurement-harness.mjs`; served code/assets are unchanged. Syntax was checked after this test-selection cleanup.
