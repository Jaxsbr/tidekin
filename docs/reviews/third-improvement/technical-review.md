# Independent technical review — third improvement

Status: **CLOSED — TR-1 through TR-5 independently verified fixed, including the later bounded hull-reach revision. No open reproduced technical findings; no critical known technical defect. Final source awaits next build**. Runtime is concurrently edited. This review owns only this report and `tests/third-review.test.js`. No runtime edits. The known full-arc sailing test failure is excluded, not counted as a new finding. No other user-owned chats contacted. No subagent dispatch/model-selection capability was exposed to this reviewer; no claim of a model switch or delegated review.

## Findings reported immediately

### TR-1 · P1 · FIX VERIFIED — New voyages silently stop saving after entering practice

`src/main.js:308` retains the original voyage in `practiceVoyage`. From practice, Pause → Save & return to title → New voyage → Begin a new voyage calls `startGame(false)` (`:234`). That function assigns the new `state` but never clears `practiceVoyage`. Every subsequent `saveGame` exits successfully at `:110`, before serialization or localStorage writes. Reload therefore loads the old voyage and loses the newly earned voyage. “Return to my voyage” can also resurrect the pre-new-game voyage. Clear/resolve practice ownership when a new voyage is successfully installed; preserve it on failed loading. Verify actual title/new-game flow and a save/reload after earning progress.

### TR-2 · P2 · FIX VERIFIED — Survey surface reset retains cleaning before first completed target

`src/cleanup.js:updateCleanup` resets the one-breath survey only when `a.collected.length` is nonzero. In the clean variant, sweep part of the first marker, ascend and refill: `a.cleaning` retains that progress. The player can bank work across breaths until the first target completes. Reset unfinished coverage and selected action on surfacing as well as collected targets. Verify partial first-marker work, subsequent markers, full completion, and ordinary non-survey breathing.

## Source identity

No Git repository was found at the project or its parent, so a commit cannot identify this working tree. Initial SHA-256 snapshot at **2026-10-09T02:24:16.990795+00:00** (UTC; NZDT is UTC+13). Reads before this snapshot are exploratory; tests and a final drift check follow. These hashes identify bytes, not a release/build or the final integration.

| File | SHA-256 |
| --- | --- |
| `docs/reviews/third-improvement/domain-contract.md` | `4df7139f2fca40ccf6de09030bece9f7cbd009875628ce0e12a9a1eb5c600ab6` |
| `docs/third-improvement-goal.md` | `242ac4aa3336fb07776467455c19702b66885d4b0ac8d5c029cca3e4754c2881` |
| `index.html` | `699da650d2b4f9b6655460e9d6881c74023fd7b57d9165251d45ec2e472b946a` |
| `src/cleanup-scene.js` | `f607e7d039d9b2ca73723b2769922e82effa83c7999422d11ccd0df91c8d5951` |
| `src/cleanup.js` | `d6e400661ee4c161576a83231d78ffa3fb313c058ba785ebde5765239061dfa3` |
| `src/game.js` | `23a4a17ac8ca5737bc391158fabe9627318e20ee55712752169a1485af4d307e` |
| `src/main.js` | `6d9067d680e57f61041a00343d7d014055b2792a71a72f384469319fda77ee8e` |
| `src/navigation.js` | `d6ec27e1986273ae1850f85f1219fb4650349ab182d6af51c1f9ed2b19b03410` |
| `src/scene.js` | `d729902a781450ce18253201018ccdb192eeba5df944cfd19e53f7afba8c3127` |
| `src/style.css` | `d731768f297d8f0aba404286f49a9793764fc82ffd38b2d5e3c847dba194ec25` |

## Pending independent verification

TR-1 and TR-2 were fixed by the engineer and independently retested below. TR-3 is now independently verified fixed (see latest recheck below). Camera occlusion and GPU lifetime claims require measured rendering evidence; source inspection alone will not be labelled a visual or hardware pass.


## Independent fix verification and remaining finding

TR-1: verified that `startGame` clears `practiceVoyage` immediately after successful state installation, before `saveGame`. The source-extracted asynchronous UI lifecycle test now clears the old trial and performs one save. This uses inert DOM/renderer stubs and is **not** the actual-browser title → new voyage → reload case; QA is adding that separate case. The reset is after awaiting scene readiness, preserving the old live state if scene loading rejects.

TR-2: verified survey surfacing now resets when there are collected targets, a selection, or any cleaning coverage. Tests cover partial pull, partial first-target clean, completed first target, and preservation of ordinary static reef cleaning while breathing. Existing successful survey completion/reload/claim tests still pass.

### TR-3 · P2 · FIX VERIFIED — Rig fit toast reported obsolete speed and breath

`src/game.js:532` returns “Skimmer fitted. 7 m/s sailing · 12s air.” `src/main.js:performAction` sends this message directly to `showToast` for `rig` actions. Actual wheel-equipped Skimmer speed is 9.8 m/s; all side-view dives have 24 seconds of air. This is a visible contradiction after pressing Fit, not merely unused API descriptions. Update the result message to effective sailing speed and side-view breath, or omit the obsolete measurements. `TR-3` regression initially failed with that exact message; the latest recheck passes. Rig cards themselves correctly show 24 seconds and wheel-adjusted speeds.

## Coverage and bounded test evidence

| Area | Independent result / remaining limit |
| --- | --- |
| Targeting / range | Explicit distant target cannot fall through to nearer target. Existing domain tests pass capability-based targeting across region edges and tide states, 4.5m edge, and all resource adapters. Exact historical log identity remains unresolved; no claim to reproduce Jaco's screenshot incident. |
| Camera clipping / restoration | Source uses temporary helm obstruction hiding with `try/finally` visibility restoration; dedicated bow camera, pickup transfers in camera space, and explicit station/helm transitions inspected. No static defect established. Full-upgrade hull/camera clipping and wide/square views remain visual QA gates; no rendered pass claimed. |
| Boundary / map bypass | 72 radial headings × forward/reverse × 80 bounded steps remain contained before wheel. Existing tests verify chart departure gate, actual wheel crossing, and save persistence. No legacy position snap. |
| Guidance / save validation | Bounded integer stage and boolean skipped validation pass; absent old-save guidance skips onboarding. UI advances guidance from performed actions. Actual novice arc remains QA's responsibility. Tracking is in-memory UI state and resets on reload; this review does not claim saved destination tracking. |
| Atomic rewards / old saves | Existing tests cover final-frame air exhaustion, no partial reward banking, once-only rewards through reload/revisit, and old six-object Home Reef migration into both patches without retroactive payout. |
| Practice | Static and survey domain attempts do not grant permanent rewards or survey readiness. UI save suppression and parent restoration inspected. TR-1 fixed/tested; actual browser title lifecycle still to be verified. |
| Variants / input latch | All 56 ordered transitions among eight scheme/action/tuning combinations preserve collected targets and air while clearing unfinished work. Actual pointer handlers retain original target while pointer moves across another, release stops action, reset clears keys/pointer. These are deterministic handler tests, not full browser pointer-capture certification. |
| Legacy salvage / survey | All resource node adapter amounts, gathered counters, completion/revisit and round-trip saves pass. Legacy underwater partial survey resets, ready survey and lifetime stats survive. TR-2 now passes all added reset variants. |
| Resource lifetimes | Three.js cleanup scene site replacement disposes every removed geometry; final disposal releases remaining geometries and is idempotent. Update leaves authoritative state unchanged. Source has owned cloned explorer resources, instanced-mesh disposal, and failed GLB load cleanup. This does not measure GPU allocation plateau, textures or browser context recovery. |
| Navigation / rig UI | Route ETA test confirms 1.4 wheel multiplier for all three rigs in clear water. Existing navigation tests pass. Rig card descriptions and TR-3 toast now agree on effective speed and 24s dive air. |

Commands:

```sh
node --test tests/third-review.test.js
node --test --test-skip-pattern='fresh voyage public salvage entries' tests/third-domain.test.js tests/navigation.test.js
```

Pre-TR-3-fix run: **12 review tests: 11 pass, 1 fails (TR-3); 24 selected existing domain/navigation tests pass.** See final passing recheck below. Known full-arc case explicitly excluded from this final run. An earlier negative-lookahead filter inadvertently included it and it passed; it was not filed as a new issue. No runtime code, build output, user storage, or other review files modified.

## Exact recheck fingerprint

Started **2026-10-09T02:29:25.756805+00:00**, ended **2026-10-09T02:29:26.020747+00:00** UTC. Pre/post hashes across the test invocation: **unchanged**. This supersedes the initial snapshot for fix verification; integration remains mutable afterward.

| File | SHA-256 |
| --- | --- |
| `assets/cleanup/reef-art.js` | `4d05a803555afe414d304ac85457576fa354a263c4c9f5376a4a23b747f574e7` |
| `index.html` | `699da650d2b4f9b6655460e9d6881c74023fd7b57d9165251d45ec2e472b946a` |
| `src/cleanup-scene.js` | `515f4ae0377f001640bdbf5a1231eaa0d6a03a9df67f216e52184c9c04373232` |
| `src/cleanup.js` | `06ee412ee6e6c1257c9c01e73559ccda3240b3ad1d7a2da663f06a86dd92b37e` |
| `src/game.js` | `23a4a17ac8ca5737bc391158fabe9627318e20ee55712752169a1485af4d307e` |
| `src/main.js` | `72459af36d1f1c3dcc4b1561f8dc8e206dc086318c37f8281372da45fbe0bbd6` |
| `src/navigation.js` | `433199fd483970c1bf2f7fbbaac65903dc8f433f2d43740770b58764f6dd4e37` |
| `src/scene.js` | `49ec562d172553bb63cad0c43cf5da88bd0e7f7709817f01925d6b319fdb7eb0` |
| `src/style.css` | `7ea0603d9804c60e3f5e2549ce7a0d6bc5bf2032fa8636880512ba0a9d3b238c` |
| `tests/navigation.test.js` | `3b102b9e5f5bc5e13d21b26c0b38fe680ba988869259bc582b8f9a5f3172c1a5` |
| `tests/third-domain.test.js` | `6edcd836d00a9434926ef50375c49aa5143b5544ada8432b44d5ad739789d0d5` |
| `tests/third-review.test.js` | `a25918c4583715cf1b87762660a894ead4a2d5c3a65fed2f4347f7ffa7b8aa0b` |

Remaining acceptance gates: attach actual-browser practice/new-voyage/save/reload evidence and camera/transition visual QA before declaring the candidate fully verified. No human enjoyment or hardware performance claim is made here.


## Final TR-3 independent recheck

**All three reported fixes verified.** At 2026-10-09T02:30:08.111376+00:00 through 2026-10-09T02:30:08.399969+00:00 UTC (15:30 NZDT), the same bounded commands above passed **12/12 reviewer tests and 24/24 selected domain/navigation tests**. Pre/post file hashes were unchanged during these runs. No browser was launched, so this recheck cannot overlap a browser benchmark.

The rig action now formats `sailingSpeed(state)` and `24s dive air`; the Skimmer regression passes for 9.8 m/s and 24s. RIGS descriptions no longer promise different dive breaths. Legacy numerical oxygen capacities remain 18/12/28, `maxOxygen`, rig oxygen clamping and save validation remain intact; side-view attempt air remains independently 24 seconds. Legacy survey migration tests still pass. No runtime changes made by this reviewer. Browser lifecycle and visual camera/GPU gates above remain distinct from these passing technical checks.

Final test-source fingerprint (supersedes earlier snapshots):

| File | SHA-256 |
| --- | --- |
| `assets/cleanup/reef-art.js` | `4d05a803555afe414d304ac85457576fa354a263c4c9f5376a4a23b747f574e7` |
| `index.html` | `699da650d2b4f9b6655460e9d6881c74023fd7b57d9165251d45ec2e472b946a` |
| `src/cleanup-scene.js` | `515f4ae0377f001640bdbf5a1231eaa0d6a03a9df67f216e52184c9c04373232` |
| `src/cleanup.js` | `06ee412ee6e6c1257c9c01e73559ccda3240b3ad1d7a2da663f06a86dd92b37e` |
| `src/game.js` | `197e209c8a037cd43a6e3104956246f1e23b086c649b278f6a8422d55575c76f` |
| `src/main.js` | `72459af36d1f1c3dcc4b1561f8dc8e206dc086318c37f8281372da45fbe0bbd6` |
| `src/navigation.js` | `433199fd483970c1bf2f7fbbaac65903dc8f433f2d43740770b58764f6dd4e37` |
| `src/scene.js` | `49ec562d172553bb63cad0c43cf5da88bd0e7f7709817f01925d6b319fdb7eb0` |
| `src/style.css` | `7ea0603d9804c60e3f5e2549ce7a0d6bc5bf2032fa8636880512ba0a9d3b238c` |
| `tests/navigation.test.js` | `3b102b9e5f5bc5e13d21b26c0b38fe680ba988869259bc582b8f9a5f3172c1a5` |
| `tests/third-domain.test.js` | `6edcd836d00a9434926ef50375c49aa5143b5544ada8432b44d5ad739789d0d5` |
| `tests/third-review.test.js` | `a25918c4583715cf1b87762660a894ead4a2d5c3a65fed2f4347f7ffa7b8aa0b` |


## Inner-edge pushback correction — independent verification

**Verified at source level; production preview still uses the old build per the integrator.** This is the integrator's additional finding, not a fourth independently discovered defect. The earlier reviewer boundary test established containment but did not require backward displacement at first contact; that coverage gap is now closed.

The revised `max(inner - .75, beforeRadius - 5*dt)` produces an actual negative radial delta when an outward step first crosses the inner foam edge. In clear water at dt=.05, starting radius 21.875m attempts to move beyond 22m and now finishes at 21.625m: **−0.25m**, rather than the old clamp's **+0.125m** to 22m. This is a correction to first-contact response; the old formula could already push inward from positions sufficiently inside the band.

Added independent regression checks 72 headings × forward/reverse outward travel × three frame durations (.001, 1/60, .05): **432 first-contact cases** require negative radial delta and no push larger than .25m. High tide isolates the current from shoal drag. Additional checks verify inward escape in forward/reverse, turning without translation, and positive outward crossing/departure after building the wheel. The existing multi-frame containment and chart gate checks still pass.

To establish regression sensitivity, copied source and the reviewer test into temporary storage and restored only the old push formula there. The new first-contact test failed with an outward delta of +0.002500000000001279m at dt=.001. The real working source was never changed. Temporary mutation files were removed.

**14/14 reviewer tests and 24/24 selected domain/navigation tests pass.** Known full-arc case remains excluded. Rig formatting test also passes. No browser launch, build, production change, or user-save access occurred. Sustained outward input can produce repeated approach/backstep motion; how readable that feels with the foam and follow camera remains a visual QA item after the next build, not a deterministic-test claim.

Test interval: **2026-10-09T02:32:25.002731+00:00** to **2026-10-09T02:32:25.403761+00:00** UTC. Pre/post hashes unchanged. Exact latest source/test fingerprint:

| File | SHA-256 |
| --- | --- |
| `assets/cleanup/reef-art.js` | `4d05a803555afe414d304ac85457576fa354a263c4c9f5376a4a23b747f574e7` |
| `index.html` | `699da650d2b4f9b6655460e9d6881c74023fd7b57d9165251d45ec2e472b946a` |
| `src/cleanup-scene.js` | `515f4ae0377f001640bdbf5a1231eaa0d6a03a9df67f216e52184c9c04373232` |
| `src/cleanup.js` | `06ee412ee6e6c1257c9c01e73559ccda3240b3ad1d7a2da663f06a86dd92b37e` |
| `src/game.js` | `88963451d57cdec4f60cb03ddc35a1a4d74b80eb14bb3e471f534ac660ad67a9` |
| `src/main.js` | `72459af36d1f1c3dcc4b1561f8dc8e206dc086318c37f8281372da45fbe0bbd6` |
| `src/navigation.js` | `433199fd483970c1bf2f7fbbaac65903dc8f433f2d43740770b58764f6dd4e37` |
| `src/scene.js` | `49ec562d172553bb63cad0c43cf5da88bd0e7f7709817f01925d6b319fdb7eb0` |
| `src/style.css` | `7ea0603d9804c60e3f5e2549ce7a0d6bc5bf2032fa8636880512ba0a9d3b238c` |
| `tests/navigation.test.js` | `3b102b9e5f5bc5e13d21b26c0b38fe680ba988869259bc582b8f9a5f3172c1a5` |
| `tests/third-domain.test.js` | `6edcd836d00a9434926ef50375c49aa5143b5544ada8432b44d5ad739789d0d5` |
| `tests/third-review.test.js` | `d8265d58fb9bca1efe9d5b7c853bef1472bcc61ef7435133f5f79318edb3bf77` |


## Final source disposition after artist completion

Snapshot: **2026-10-09T02:42:39.700546+00:00** UTC. Parent confirmed no active source writers. **No critical known technical defect.** Recommend **reliability/persistence 4/5 — polished beta, contributing 8/10 weighted points** using the unchanged `docs/PROJECT.md` anchors. This is an evidence-based agent recommendation for this dimension, not overall release approval or human validation.

Evidence: parent reports full `npm test` **92/92**, including the formerly failing complete upgrade arc. This reviewer did not repeat that broad run. Independently read QA JSON for [wide/square earned arc](../../../captures/third-improvement/qa/2026-10-09T02-35-20.033Z-evidence/results.json): both cases pass, 36 checks each, no recorded browser errors. [Lifecycle/adapters](../../../captures/third-improvement/qa/2026-10-09T02-37-03.451Z-evidence/results.json): all four pass (16 lifecycle, 4 practice/new-voyage, 2 legacy migration, 12 survey checks), no recorded browser errors. Both report unchanged production **index-MJNMjV1l.js**, SHA-256 `6c232edf1109a1435382634a28af511dcaad45a620d36079513fb1e03e33f8ca`. This closes the earlier actual-browser TR-1 and TR-2 confirmation gates **for MJNM**, not for the unbuilt later visual/source refinements.

A 5/5 is not supported: the final source refinements still need the next production build and focused visual/functional recheck; extended GPU/resource recovery and storage failure coverage are incomplete. The score is not reduced for unvalidated enjoyment and does not replace a hardware benchmark. The small teardown issue found in this pass was subsequently fixed and independently verified below.

### Final changes inspected

- Boundary backstep and truthful rig messages remain as independently verified above; domain game/cleanup behavior is otherwise unchanged from that fingerprint.
- Duplicate Home ID is corrected to `nav-track-home` in static markup, HUD updates, and event wiring; generated chart IDs remain separate. Static HTML parser finds **zero duplicate IDs**.
- World labels use camera-space depth, screen-size scaling and frustum-edge suppression; close helm beacons are suppressed. Temporary hull hiding still restores visibility in `finally`. New foam has **96 preallocated instances** with a reused transform and bounded per-frame matrix updates; reduced-motion freezes its phase. These changes never write authoritative state.
- Pickup effects use four preallocated material-specific groups, shared geometry/materials, and a physical bow tray world-space destination; no new per-pickup resource allocations. They still render without depth testing. Appearance, occlusion and whether the tray is visible at final camera angles remain design/QA questions after building.
- Cleanup pose moves only presentation objects to make working clearance; authoritative target/swimmer state and picking remain unchanged. New wood/pearl/survey silhouettes and cliff surfaces use site-scoped resources disposed when the site changes. Existing isolated cleanup-resource/state-immutability test passes against these changed files.
- CSS changes reposition guide controls, comparison layout and toast lanes with small-screen/reduced-motion rules. Source inspection found no new state/persistence coupling; wide/square overlap and visual polish are not certified by syntax or prior-build captures.

### TR-4 · P3 · FIX VERIFIED — World teardown omitted InstancedMesh disposal

`src/scene.js:releaseScene` disposes geometry/materials and renderer, but never calls `dispose()` on instanced objects. The new `currentFlow` (96 instances) and existing cloud mesh therefore do not emit the disposal event Three.js uses to release `instanceMatrix`/`instanceColor` buffers. Installed `node_modules/three/src/renderers/webgl/WebGLObjects.js` registers `onInstancedMeshDispose`; its general `dispose()` only resets the update map. This is limited to scene teardown/recreation, not repeated normal gameplay transitions, so it is **noncritical P3**. Add `if (object.isInstancedMesh) object.dispose()` during world traversal, as the cleanup renderer already does.

A new independent source-extracted teardown test with a real Three.js InstancedMesh reproduces the omission (object disposal events: expected 1, actual 0). Focused run only: **cleanup resource/state test passes; TR-4 fails**. Full 92/92 is the parent's earlier run, before this added regression; do not describe the present suite as all green until TR-4 is resolved and rechecked.

Syntax checks pass for changed main/world scene/cleanup scene/art files. No browser, build or broad suite rerun performed. No runtime files modified by this reviewer. The teardown fix and focused regression have since completed (closure below); remaining integration work is the parent's next build and focused gate/label/pose/tray/layout QA. Prior earned persistence evidence remains valid for its recorded MJNM build.

| Final source/test file | SHA-256 |
| --- | --- |
| `assets/cleanup/reef-art.js` | `a686c33179a569d01b2860090d09a42b258f56b24703480fae39a03296b99123` |
| `index.html` | `02c82ddb10a5e6a6c28924794c7149425f93f3897e18c1db6f86e5f5140f5c96` |
| `src/cleanup-scene.js` | `29c1db5ec99b9e7f0d221d6ad516c1582ec9e316d8d7829661d10a1741319ba9` |
| `src/cleanup.js` | `06ee412ee6e6c1257c9c01e73559ccda3240b3ad1d7a2da663f06a86dd92b37e` |
| `src/game.js` | `88963451d57cdec4f60cb03ddc35a1a4d74b80eb14bb3e471f534ac660ad67a9` |
| `src/main.js` | `9e46e77d28fd61dca120047b92cfeee49f190520eb417833470257f27b688054` |
| `src/navigation.js` | `433199fd483970c1bf2f7fbbaac65903dc8f433f2d43740770b58764f6dd4e37` |
| `src/scene.js` | `b826662827245a3ccb8d693e8c92a4b358b58332f655f4fd09d4421d84376583` |
| `src/style.css` | `5d5bb30e44a22ab6f087b54d3b9d3cb11c379f3ec616843e5f451b7e64a65db1` |
| `tests/third-review.test.js` | `a050b16bc01b8f1f118648cd1f84b817f0dccb16fd2e19c52e4cb01cacf50252` |


## Report closure — TR-4 fixed, final copy corrections verified

**Technical review closed: all four findings independently verified fixed; no open reproduced technical finding and no critical known defect.** Reliability/persistence recommendation remains **4/5 (8/10 weighted)** with the evidence and limitations above.

At **2026-10-09T02:45:19.076342+00:00–2026-10-09T02:45:19.177885+00:00 UTC**, ran only `node --test --test-name-pattern=TR-4 tests/third-review.test.js`: **1/1 passes**. `releaseScene` now emits the instanced-object disposal event before releasing shared geometry/materials and renderer; the regression checks exactly one release of each. No broad test repetition. Pre/post hashes unchanged.

Inspected navigation copy: salvage distance now interpolates `Game.GATHER_RANGE` (4.5m); underwater expedition guidance now says “Dive at the survey marker.” The 3m sailing waypoint cue remains appropriate for its separate expedition radius. No legacy oxygen/save contract change.

These are **source fixes pending the next build**. Per the integrator, production on port5190 currently serves DK96 without the disposal fix. Its existing visual QA remains applicable to appearance because teardown and the two text corrections do not change the rendered scene; it is not evidence that DK96 includes this source fix. This reviewer did not launch a browser, rebuild, inspect that served bundle, or interfere with benchmark activity. Final build identity and narrow integration acceptance remain the parent/QA responsibility.

| Closure file | SHA-256 |
| --- | --- |
| `src/scene.js` | `521f7478a2489db8e4b4f2f5a9d86d27fe7d42500a251901e398bca572a46e06` |
| `src/main.js` | `7afe35f23b7a2573a6609ba0f7fd51df3015c69f34e42ea7736f6d9584ffba2a` |
| `tests/third-review.test.js` | `a050b16bc01b8f1f118648cd1f84b817f0dccb16fd2e19c52e4cb01cacf50252` |


## Bounded hull-reach revision and TR-5 closure

Scope was reopened only for the completed oriented hull / existing-circle union and its public/UI consumers, after the parent notified that Lagrange had finished. No browser, hardware test, broad suite or scoring revision. **Targeted source disposition: pass; no open reproduced defect in this revision.** This is not reproduction of the still-unidentified human log incident.

Geometry provenance: `scripts/build_assets.py:306–307` defines the authored deck as 7m wide ×9m deep. Exported half-extents 3.5m ×4.5m match that baseline. Independent test constructs offsets using **Three.js axis-angle rotation**, separately from domain inverse trigonometry, at 36 headings. All four corners, the old circle's lateral endpoints, and points .00001m outside each union boundary behave correctly. These are a rectangle/circle union, not an enlarged 5.7m circle. Legacy world swimmers remain circle-only.

Domain inspection: `salvageReach` is read-only. `getContext` uses its `inReach` for `nearby`/`gatherTarget`; gathering retains tide/submerged/region gates. Public salvage selection uses the same hull reach, stable center-distance ordering, and original IDs. The temporary entry view shares the intended cleanup/stats records but never moves the authoritative raft; successful helm transition is copied back. Tests confirm public and explicit rotated-corner entries preserve position, exact original node payout/counters and save roundtrip. Public recovery/active-attempt gates, survey priority at its buoy, survey's original 3m entry radius and starter-site entry circles remain intact. Low-level cleanup dispatcher remains circular; public consumers correctly go through the game facade.

Target identity: actual source-extracted HUD selection and marker-status calculation agree with `act('gather')` for tied starter targets and a newly reachable corner target after the starter pickup. Exactly one marker advertises E; other eligible labels say Nearby supply. Named marker textures are preallocated per node and repaint only on changed status/selection. No additional domain or render authority was introduced.

### TR-5 · P2 · FIX VERIFIED — UI retained circular salvage priority at hull corners

Initial reproduction: gather `home-driftwood`, set raft position `(2.5,1.5)`, heading0, time90. `home-timber` at `(6,6)` lies on the hull corner (center distance≈5.70m), is nearest, and is high-tide salvage reachable by the domain. Home Reef is also within its independent entry radius. The UI's old `target.distance <= GATHER_RANGE` check chose Home Reef for Space instead of salvage. The parent replaced that check with authoritative `target?.inReach`. Independent regression now selects `dive`, with `context.diveSite.nodeId === home-timber`.

Further center-distance scan: no remaining aboard gather/public-salvage **permission** reconstruction found in main. `nodeBlock` honors domain `available` and `too_far`; E passes the context target's ID to the domain; the dive button uses the corrected choice plus `context.canDive`. Remaining center-distance uses sort targets, show distance, determine navigation arrival/detours, or control display thresholds. The preliminary ≤4.5m “within reach” title is overwritten by the more specific aboard target display for all hull-reachable points (corner≤5.71m, display threshold8.5m). The chart's “Gather within 4.5m” note still describes the guaranteed circular zone and under-describes the extra hull-corner allowance; it does not disable an action. No new permission defect filed from that copy.

**Focused final run: 5/5 pass**, command:

```sh
node --test --test-name-pattern='hull review|TR-5' tests/third-review.test.js
```

Started **2026-10-09T03:03:34.343918+00:00**, ended **2026-10-09T03:03:34.453252+00:00** UTC. Pre/post hashes unchanged. Parent reported 99/99 before these independent additions and retained an intermediate 102/103 run containing the newly exposed TR-5 failure; this reviewer does not erase that history or claim a new full-suite result. One additional gate test was then added, so use the final parent's test summary for current total counts.

**Build boundary:** parent reports current CrEO does not contain TR-5; source remains pending rebuild. Prior production/visual evidence does not prove this new reach/priority behavior. Existing scores are unchanged; this was correctness review only. No runtime edits by reviewer.

| Reviewed file | SHA-256 |
| --- | --- |
| `src/game.js` | `bed2bb46d6caa51b7b3187ed0c3d21665a954f3f4f68dd4dacda2dc35463168e` |
| `src/cleanup.js` | `06ee412ee6e6c1257c9c01e73559ccda3240b3ad1d7a2da663f06a86dd92b37e` |
| `src/main.js` | `1cb5f1053184933b1923afa969db920f8520021a28fbe78d8a6a96c9863a91d5` |
| `src/scene.js` | `29b20daf561b56c3c3359bf9b1a25224b7798492767ac1d38c969d67dad0295d` |
| `scripts/build_assets.py` | `aea37e29e9f8159ece0649c02a8a62b70bcd0629d940b6818bae3fd63e63317e` |
| `tests/third-review.test.js` | `9ed889d6a74a46573f846f14e9b74d6b7fb654315b858b11792b6f36b5fa8cdd` |
| `docs/reviews/third-improvement/domain-contract.md` | `ff2be7f90936922b422e349090834541c32d6ce238542e535c2f6ebeabdfedf9` |
