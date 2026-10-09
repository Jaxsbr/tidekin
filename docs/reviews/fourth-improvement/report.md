# Fourth improvement — 0.5.0-beta.1

User UI baseline: **55/100**. This pass implements the user's final control choices and replaces the text-heavy screens with original painted art. The aspiration is toward 90-level quality; independent review and human preference remain distinct.

## Delivered changes

- Always-controllable raft, following third-person camera and optional third-person inspection. No helm actions, first-person camera, comparison or disposable practice modes.
- Directional diving plus pointer-held pulling at the original 2.2 m/s pace. No trailing basket. Keyboard E remains an accessible fallback.
- One current workshop plan, large painted miniature, held/required pictured materials and one Build action. Future/locked plans and detailed upgrade prose are removed.
- Three-second assembly of actual upgrade parts, raft camera framing, sparks/light and completion; reduced motion gives a short reveal. Applied to all five modules.
- Painted HUD supplies, title/pause/settings stamps, a generated cabin cutaway, compact inspection controls, task-specific journal pictures and a coordinate-driven illustrated chart.
- One near-target square pickup card with the same painted supplies as the HUD, one/two-word labels, animated appearance/removal. Remote pickup labels, arrows, distances and poles are removed.
- A shared articulated character above/below water: face, goggles, swept hair, clothing, elbows/knees and hands. Prone propulsion, surface crawl and eased upright treading.
- Underwater bounds ±28 m and depth 18 m, following camera, layered reef, depth lighting, painted panorama and parallax. Initial composition includes the first target; normal-size character and target picking are preserved.

## Iteration and review

The first independent review found weak cabin sizing, a journal stripped of actionable meaning, plain radar graphics, an obstructive inspection panel and inconsistent icons. These were corrected. Underwater feedback identified an invisible first object, above-water idle torso and overly empty/flat scenery; entry bias, a consistent anatomical offset, lower guidance, shaded layered geometry and original painted background address those findings.

[Independent review](independent-visual-review.md) retains early observations, invalidated hot-reload captures and final rechecks separately. No interrupted capture is counted as product acceptance. [Acceptance criteria](plan.md) were written before the integrated review.

## Evidence and limits

- 107 deterministic/regression tests pass; raw result: `captures/fourth-improvement/tests-final.txt`.
- Production build succeeds. Existing Three.js chunk-size advisory remains; renderer is lazy-loaded.
- First candidate fingerprint: entry `index-B3ehq6Kw.js`, scene `scene-BZ_bP9Vt.js`, CSS `index-Db4FWzU6.css`.
- [Browser QA plan](qa-plan.md) distinguishes earned inputs from labelled visual/performance fixtures. Final outcomes are appended after completion.
- Baseline was reconstructed from frozen source plus recovered historical reef art after a specialist's early build interrupted original capture. It is not byte-identical to the old B3 entry. [Baseline provenance and complete capture](qa-baseline.md) retain this limitation. Same viewport/screen sequences support visual comparison; they are not a pixel-identical simulation-clock experiment.
- Art, illustration and pose judgments are agent review. Automated inputs do not establish fun. Sound was not audibly assessed. The real-time world remains less detailed than the supplied reference illustration.

## Provenance and compatibility

Original native ImageGen assets and exact prompts/provenance: `assets/ui-fourth/`; shipped art: `public/assets/ui-fourth/`. Commercial game examples informed presentation but their art is not shipped. The same production preview origin and save key are retained. Historical helm fields are validated/ignored; earned progress remains intact. All test browsers use isolated storage.

Final queued corrections restore explicit destination bearings, hide contextual buttons behind inspection, and improve surface framing/air separation and rock supports. Final production: `index-tY5N3BJ1.js`, `scene-qTMv-AZ0.js`, `index-D1qJB8_b.css`. The first full candidate passed 44 wide earned-flow checks and 11 square interface checks. Final exact-build verification follows below.

## Independent visual verdict

The independent reviewer rates **interface presentation 82/100** and **combined UI/art 77/100**, against the user's stated UI baseline of 55. These are different assessors and are not a controlled numeric measurement. No remaining high-severity visual blocker was observed. This pass does **not** claim 90/100 or human approval.

Remaining visual limits are coherent foreground/background material detail, the simple air/water boundary, low-contrast chart details and a deck character often hidden by the cabin in the default follow view. Assembly-row overlap identified in review was removed by the final CSS-only change; all 181 sampled active-stamp frames hid the underlying controls. The review preserves those concrete gaps instead of raising a composite score to hide them.

Final assembly layout correction changes the production fingerprint to `index-CufECat5.js`, `scene-DEbMD4yK.js`, `index-C2FIM3bx.css`. Vite cascaded the CSS hash through its chunk references despite no JavaScript source edit. The strict final earned/benchmark fingerprint gate remains in place.

## Final functional result

[Exact final-build acceptance](../../../captures/fourth-improvement/qa/2026-10-09T04-31-04.199Z-acceptance/results.json): **60 wide earned-flow checks and 19 square interface checks pass**, no browser errors, unchanged full served fingerprints. Fresh isolated storage and actual keyboard/pointer input earned the timber, both three-object reef restorations, exact waterwheel spend, animated assembly, departure, Mangrove discovery, return home and saved continuation. Destination bearings rotate with heading and clear correctly. Every active assembly stamp frame hides the bottom controls; controls return afterward.

Earlier targeted-check failures were harness assumptions: immediate sampling before the existing 200 ms HUD refresh, looking for locked Mangrove before earning the wheel, and pressing Space with the Clear button focused. The corrected harness retains angular precision, samples the settled HUD with recorded latency, checks destinations at the appropriate progression stage and explicitly restores keyboard focus to the canvas. Failed evidence remains retained; no product state or reward was injected to make the final earned run pass.

## Resource lifecycle diagnosis

The first eight-cycle GPU-resource run did not pass its strict “stable after first encounter” check: geometry registrations increased toward 296 while textures stayed at 3. The failed result is retained; it is not hidden behind the passing frame-time measurements.

[Separate 16-cycle ownership diagnostic](../../../captures/fourth-improvement/qa/resource-lifetime.json) tracks actual Three.js disposal events: Home stays at 306 attached/live geometry+material resources, Cove at 314, with no detached undisposed resource after any switch. All 1,810 observed resources dispose on final shutdown. This supports deferred GPU registration as an explanation for the browser growth, but does not by itself prove a GPU plateau; the extended browser check supplies that evidence separately. No runtime change was made for this diagnosis.

## Final hardware and memory result

[Hardware samples](../../../captures/fourth-improvement/qa/2026-10-09T04-34-51.522Z-performance/results.json) meet the unchanged budget on Apple M4 Pro / headed Chrome 154, High, 1440×900, DPR1: following **8.3ms median / 10.1ms p95**, deep cleanup **8.3ms / 10.0ms**, zero frames over 50ms. Each follows a 5s warmup with a 20s sample, without recording. These are measured rAF intervals, not GPU execution timings or universal performance claims.

[Extended 16-cycle memory-only diagnostic](../../../captures/fourth-improvement/qa/2026-10-09T04-40-12.680Z-memory-diagnostic/results.json) **passes the observed matching-site plateau check**: final three Home visits each register 263 geometries, final three Cove visits each register 262, all at 3 textures. Initial growth is retained in the raw evidence. Different route/camera warmup explains why absolute registered counts need not match the earlier eight-cycle run; the claim is stable repeated visits within the measured run, not a universal allocation ceiling. Fingerprints remain unchanged and browsers close cleanly.

All requested implementation and verification gates are complete. Remaining art-polish observations are explicitly retained in the independent review; no 90-level or human-approval claim is made.
