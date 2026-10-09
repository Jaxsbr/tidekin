# Fourth improvement final QA

Final frozen production5181: `index-CufECat5.js`, scene `scene-DEbMD4yK.js`, CSS `index-C2FIM3bx.css`, version0.5.0-beta.1. **Final acceptance, hardware timings and the bounded extended resource plateau pass.** Complete served fingerprints match final earned acceptance and stay unchanged through hardware and memory runs. All QA browsers and the reconstructed5182 preview are closed;5181 is left running. No runtime/source/build changes were made by this sidecar.

## Acceptance

[Exact-final evidence](../../../captures/fourth-improvement/qa/2026-10-09T04-31-04.199Z-acceptance/results.json): wide60/60, square19/19 checks pass, zero browser errors. Fresh isolated contexts use actual controls and read-only state/metrics; wide earns starter timber, both restorations, recipe supplies and waterwheel, crosses the current, discovers Mangrove, returns home and saves/continues. Surface-horizontal routes preserve the fixed2.2 swimming pace; deep pointer pulls and full breath reset pass. Square covers all requested UI states, menus, movement without H, persistence and diving.

Home bearing passes both layouts; Mangrove passes after earning the wheel. Arrow/name visibility, no pickup-distance text, heading-relative rotation and clear behavior pass. Maximum first-observed post-keyup settlement79ms (Home73/79ms, Mangrove67ms), within the200ms HUD cadence; unchanged0.05rad angle precision, bounded300ms polling. Inspect context underlay hides/restores in both sizes.

Waterwheel assembly advances through181 actual active rendered frames. Every visible-stamp frame hides bottom HUD; **zero overlap frames**; HUD returns and stamp hides after completion. Live assembly screenshot directly inspected. Final earned-save fixture and exact served hashes are retained for benchmark provenance. [Acceptance details](qa-final-status.md).

Earlier B3ehq6Kw55-check evidence remains intact. Failed/canceled intermediate harness runs are preserved and distinguished from product findings: HUD sampling before its refresh, selecting locked Mangrove, Space acting on focused Clear, and parent-requested cancellation before final CSS rebuild. Final corrected harness uses native canvas focus and earned unlocks. No additional executed product defect remains open.

## Exclusive hardware

[Hardware evidence](../../../captures/fourth-improvement/qa/2026-10-09T04-34-51.522Z-performance/results.json): installed Chrome154.0.8037.98, ANGLE Metal Apple M4 Pro, headed/foreground/focused, High1440×900,DPR1, drawing buffer1440×900. Parent explicitly confirmed all other QA/reviewer/art browsers closed. Each stationary animated view has5s warmup+20s rAF sampling,2401 intervals, no screenshots/video. The labeled actually earned completed-reef save enables a live deep character/camera sample at−10.34m without oxygen failure, pause or state hooks.

| View | Median ms | p95 ms | >50ms | Draw calls | Triangles | Geometries/textures |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Following raft |8.3|10.1|0|142|149368|122/2|
| Deep completed cleanup |8.3|10.0|0|156|114176|247/3|

Both meet the unchanged median≤20ms,p95≤33.4ms budget. Samples are valid: visibility/focus and state persist, actual rendering advances, High remains selected. These are rAF intervals, not GPU execution timings, and apply to the measured stationary scenes/machine. FPS samples were **not repeated** during later resource diagnosis.

The initial benchmark stopped before browser launch because fingerprint fields were serialized in different orders. Every per-asset path/byte/hash matched; harmonizing field order restored strict equality. That failed preparation artifact is retained at `qa/2026-10-09T04-34-26.226Z-performance/`.

## Resource warmup and bounded plateau

The original eight-cycle result remains **fail/unresolved for resource plateau**, with its original strict `stableAfterFirst` assessment and running harness retained. Home247→263→296→296; Cove239→295→295→296; textures3. The final sailing circuit stayed296/3. These counts did not yet demonstrate three stable matching-site tail samples. They were not retroactively relabeled a pass. The after-first criterion exceeded the original protocol's allowance for initial cache warming.

[Authorized sixteen-cycle memory-only diagnostic](../../../captures/fourth-improvement/qa/2026-10-09T04-40-12.680Z-memory-diagnostic/results.json): actual buoy entries, surface exits and steering; raw per-cycle positions, headings, rendered-frame counts and inside/raft metrics retained. No FPS resampling or recording.

| Site | Observed warmup | Stable suffix | Final three matching-site samples |
| --- | --- | --- | --- |
| Home Reef |cycle1:207;cycle3:230 geometries |263 from cycle5 through15 |cycles11/13/15:263/3 each |
| Sheltered Cove |cycle2:206 geometries |262 from cycle4 through16 |cycles12/14/16:262/3 each |

Textures remain3 throughout. Final local sailing circuit remains262/3 before/after. The assessment requires final three matching-site samples to match and records the entire observed warmup/suffix; no first-visit plateau is assumed. This closes the sampled resource gate for these bounded transitions.

Source diagnosis supports first-use renderer uploads: Three.js `WebGLRenderer.projectObject` skips invisible/frustum-culled objects before `WebGLObjects.update`; `WebGLGeometries.get` increments renderer geometry counts on first registration, and disposal decrements them. The shared renderer retains both raft and cleanup scenes. Cleanup swaps dispose owned site resources before replacement; fixed art/character/effect pools are reused. Distinct shallow-only263/262 versus deep-warmed296 totals therefore support view-dependent warmup, **not a universal allocation ceiling**.

Parent's separate [Node lifecycle diagnostic](../../../captures/fourth-improvement/qa/resource-lifetime.json) corroborates disposal across16 switches: Home306/Cove314 attached geometry/material resources, no detached undisposed resources,1810 observed/all1810 disposed at shutdown,0 remaining. It does not assess GPU textures. Combined evidence supports bounded warmup rather than a leak in the tested transition pattern; it does not certify JS heap, every camera/depth, arbitrary session duration or whole-renderer shutdown on GPU.

## Baseline and scope

[Complete reconstructed baseline](../../../captures/fourth-improvement/qa/2026-10-09T04-08-34.531Z-baseline/results.json) captures all requested UI at both sizes, with stable hashes/no browser errors. Historical source required recovered procedural art from a retained third-candidate bundle; it is explicitly **not byte-identical B3 production**. Interrupted original and incompatible first reconstruction remain retained. [Baseline provenance](qa-baseline.md).

Independent reviewer tests22/22 passed during source preparation; parent reported107 overall source tests. This sidecar did not repeat the broad suite. [Test migration](qa-reviewer-tests.md). Functional/temporal checks and captured imagery complement the independent visual review; they do not prove human enjoyment or certify untested devices/accessibility profiles. No more tests are required for this requested scope.
