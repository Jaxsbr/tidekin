# Second improvement independent technical review — domain stage

> **Latest disposition — immediate-input source/runtime closure, 9 October 2026:** F1–F6 remain closed. F7 (queued dialog-close erasing new movement input) is independently closed on `index-CLQfBj9P.js` / `scene-DZDgiK7l.js`: actual immediate panel H/W and Resume/S inputs survive close events arriving after keydown; held W/S remains cleared. Activity-specific copy and requested Find-label fit/focus checks pass. No new implementation edit or rebuild by reviewer; browser closed. Historical results remain attributed to their recorded candidates.

Reviewed 9 October 2026, Pacific/Auckland. Reviewer did not implement the changes. Scope: `src/game.js`, `src/cleanup.js`, their deterministic tests, and navigation tests, against the full second-improvement brief and the recorded execution plan. Source was read-only; only this review document was written. Renderer/UI integration review is pending and is not covered by this disposition.

**Disposition:** 59/59 existing tests pass, and the exercised cleanup lifecycle follows the specified ownership/reset model. Three actionable boundary findings remain below. The first two concern exported cleanup functions when called directly; the current `game.js` facade guards these cases. They are not demonstrated failures of the current facade or browser. The third is a save/movement inconsistency in the shared domain. This review does not establish completed implementation, human clarity, rendered restoration, or overall acceptance.

## Actionable findings

### F1 — P2: Exported cleanup dispatcher treats unknown actions as collection

Location: [cleanup.js](../../../src/cleanup.js:70), lines 70–83. After handling entry/leave/retry, any other action proceeds into collection for an active attempt. An accidental action name can remove trash and, on the final item, commit permanent completion. This violates the domain's stated unsuccessful-action/no-mutation model at the exported cleanup seam. `act()` currently dispatches only four recognized names, so this does not bypass its allowlist.

Reproduced in an ephemeral Node invocation, with no source/test edits:

```js
import { createGame, act } from './src/game.js';
import { cleanupAction } from './src/cleanup.js';
const s = createGame();
act(s, 'enter-cleanup', { siteId: 'home-reef' });
Object.assign(s.cleanup.attempt, { x: -3, y: -2 });
cleanupAction(s, 'typo-action', {});
// Actual: { ok: true, code: 'trash_collected', trashId: 'reef-bottle', ... }
// s.cleanup.attempt.collected becomes ['reef-bottle'].
```

Requested correction: explicitly recognize `collect-trash` before entering collection, or make the helper a deliberately private implementation detail with a documented guarded caller contract. Regression: unknown action at an in-range item returns a rejection and deep-equal state; also exercise unknown action with only the final item remaining to protect permanent completion. Existing rejection tests call `act()`, so do not expose this direct-call behavior.

### F2 — P2: Exported cleanup movement/update accept invalid deltas and corrupt attempt state

Locations: [cleanup.js](../../../src/cleanup.js:85) and [cleanup.js](../../../src/cleanup.js:94). Neither export validates `dt`. `steerCleanup(s, NaN, {x:1,z:1})` writes NaN coordinates; `updateCleanup(s, NaN)` writes NaN air; `updateCleanup(s, -1)` underwater raises a full 24-second air supply to 25. A poisoned attempt can then evade distance comparisons because comparisons with NaN are false. These are reproducible direct-export failures, not hypothetical numerical noise.

```js
import { createGame, act } from './src/game.js';
import { steerCleanup, updateCleanup } from './src/cleanup.js';
const s = createGame();
act(s, 'enter-cleanup', { siteId: 'home-reef' });
steerCleanup(s, NaN, { x: 1, z: 1 });
// Actual x/y: NaN/NaN.
updateCleanup(s, NaN);
// Actual air: NaN.

const t = createGame();
act(t, 'enter-cleanup', { siteId: 'home-reef' });
t.cleanup.attempt.y = -2;
updateCleanup(t, -1);
// Actual air: 25 (outside the 0..24 range).
```

Requested correction: either validate these exported entry points atomically with the same delta limits/zero semantics as the facade, or explicitly restrict/private them so integration cannot use them as equivalent domain APIs. Include input-object validation if direct movement calls remain supported. Regression: negative/nonfinite/string/null deltas must reject without mutation; zero delta must be a no-op; null input must have a defined behavior. `steerGame` and `updateGame` already protect their caller paths, and the suite verifies several of those protections. Avoid duplicating unrelated lifecycle tests to address this boundary.

### F3 — P2: Save validator accepts positions that idle steering silently teleports

Locations: [game.js](../../../src/game.js:816) accepts each saved coordinate within ±1,000,000, while [game.js](../../../src/game.js:137) clamps helm movement to ±150, even when thrust is zero. A valid loaded state outside the movement rectangle changes position on an idle steering call. This is an inherited/shared-domain consistency issue, not specifically a cleanup reset defect; an exact old-file diff was not supplied, so introduction attribution is not claimed.

```js
import { createGame, serializeGame, deserializeGame, act, steerGame } from './src/game.js';
let s = createGame();
s.position = { x: 999, z: 0 };
s = deserializeGame(serializeGame(s)); // Accepted.
act(s, 'take-helm');
steerGame(s, .05, { x: 0, z: 0 });
// Actual: position changes from {x:999,z:0} to {x:150,z:0} without movement input.
```

Requested correction: align validation with the playable domain, or normalize legacy positions explicitly during migration with a recorded policy. Idle movement should not silently perform migration. Regression: save boundary values and just-outside values, then load→take helm→zero-input steering; accepted saves must retain their location or undergo an explicit documented load migration. Protect existing user saves while choosing the policy. Current position-validation tests cover nonfinite/extreme values but not this accepted-range mismatch.

## Verified domain behavior and limits

- **Ownership:** `cleanup.completed` owns durable site IDs; `cleanup.attempt` owns status, local swimmer coordinates, air and collected trash. Cleanup steering does not move the raft. Inventory, legacy gathered totals, dive/rescue statistics and expedition tallies are not used as cleanup objective progress.
- **Failure/retry:** exhaustion marks the attempt failed and empties its entire collection list; failed movement/collection is blocked. Retry replaces the attempt with surface position, full air and empty collection, without imposing the legacy recovery timer. Tests perform three failures/retries. They verify state, not bag/trash rendering.
- **Normal breathing:** the surface threshold refills air without changing collected objectives. This path does not call legacy `surface`, reset the Pearl trail, or leave the cleanup mode.
- **Success:** final collection immediately commits the site, matching the plan's explicit completion choice. Subsequent collection/retry cannot duplicate completion; clean sites reopen as complete and remain swimmable. There is no extra safe-exit challenge or cleanup payout. The synchronous action commits immediately; renderer/main-loop ordering of a collection versus oxygen depletion remains an integration test obligation.
- **Persistence:** serialization validates into a fresh state, drops helm and transient cleanup attempts, and does not mutate the live state. Reload preserves site completion and tested unrelated progress. Old v2 saves missing heading/helm/cleanup receive defaults; present durable IDs, duplicates, heading and helm type are checked. v1/unversioned migration is exercised by the broader suite. The loader intentionally ignores transient `cleanup.attempt` rather than resuming or validating it; this is consistent with the documented discard policy, not a finding. UI must explain that unfinished cleanup is abandoned on reload/exit.
- **Expedition coexistence:** entry into cleanup while an expedition is active is allowed. Conflicting actions are blocked and `advanceExpedition` stops while cleanup exists. Tests demonstrate no Pearl-route advancement/reset from cleanup breathing. World time, tide, machine production and surfaced legacy oxygen/recovery still advance in `updateGame`; they are ongoing world behavior, not an isolated frozen snapshot of unrelated state. The cleanup attempt does not award their rewards. Preserving existing salvage/rig/expedition mechanics is not evidence that deferred cleanup gear has been implemented.
- **Heading:** helm steering uses authoritative radians, bow +Z, clamped turn input and forward thrust from negative input z. Off-helm sailing is stopped; legacy diving retains world-relative swimming. Tests cover heading 0 and π/2, reverse thrust, bounds and leaving the helm. Whether actual keys, camera and visible raft bow agree is not established by these domain tests.
- **Invalid facade calls/mutations:** invalid payload types and unavailable/conflicting actions return errors without changing state in tested cases; update delta validation occurs before mutation. Context helpers return fresh target records and immutable catalog data. No uncontrolled context mutation of domain state was found in this inspection.

## Targeted follow-up tests and integration obligations

Besides F1–F3 regressions, add focused coverage for cleanup entered during legacy rescue recovery (cleanup air/retry must remain independent), an active sailing route suspended through failure/retry/leave, invalid steering delta while cleanup is active, and complete-site free swimming after reload. The present tests cover portions of these relationships but not every transition. These are coverage requests, not additional demonstrated defects.

Only one cleanup site exists. Failure tests therefore cannot naturally demonstrate preserving a different previously completed cleanup site; do not claim multi-site isolation was earned by the current suite. Check that collection commits exactly once at an air-depletion boundary under the integrated frame ordering. Independently test exit, autosave and reload with real UI state and isolated user saves.

The full brief also requires quieter onboarding, usable raft/cabin/stations, physical collection/bag feedback, world/map restoration, readable underwater motion, tide presentation, input focus and performance. Domain exports and 59 passing tests cannot clear those requirements. Review actual running UI/renderer when integration is ready; do not award an overall completion or quality score from this stage.

## Reproducibility

Command: `npm test` → 59 tests, 59 passed, 0 failed. Additional reproductions above ran through `node --input-type=module` using disposable in-memory states; no real browser saves were accessed.

Reviewed SHA-256 fingerprints:

```text
src/game.js              a8c9fb6b60dc5d5bd0eacc91cd8e08b87d525b2f0e324a5823f8917a725de0f8
src/cleanup.js           fe7e04140f34b2dd2b1e1f5c175a660298686bf7499474f10dfa256c51b1d427
tests/game.test.js       7e702031b3f4713c924f4024ad0364d4dcd03c17a7060c06c67f2f1a10a640b1
tests/cleanup.test.js    b2d4f567c8c26e0c960fc90834a19bdc009620ff1923bb5936518cb3da8178b8
tests/navigation.test.js 3b102b9e5f5bc5e13d21b26c0b38fe680ba988869259bc582b8f9a5f3172c1a5
```

Re-review changed fingerprints and affected tests after corrections. No source fixes were made by this reviewer.

## Integrated-stage addendum

Read `main.js`, `scene.js`, `cleanup-scene.js` and editable `assets/cleanup/reef-art.js`, then rechecked the updated domain and tests. All implementation files remained read-only. `npm run build` produced generated build output; no source fix or committed regression test was written. Parallel implementation changed `main.js` during this review, so the latest snapshot supersedes the initial completion-toast observation.

### Domain finding dispositions

- **F1 closed:** the direct dispatcher now allowlists actions before accessing/mutating the attempt and validates payload objects. Original unknown-action reproduction rejects with deep-equal state. New regression also exercises the final remaining trash boundary. [cleanup.js](../../../src/cleanup.js:45).
- **F2 closed:** direct movement and update validate deltas before mutation, zero is a strict no-op, and movement validates the input object. Original NaN/negative-delta reproductions reject without mutation. [cleanup.js](../../../src/cleanup.js:90), [cleanup.js](../../../src/cleanup.js:103).
- **F3 closed:** `boundedMove` preserves accepted legacy coordinates outside ±150, permits inward travel and prevents further outward movement. Idle and turn-only reproduction retains x=999. Save acceptance remains intentionally compatible; it no longer silently migrates during an idle frame. [game.js](../../../src/game.js:121), [game.js](../../../src/game.js:126). New tests cover accepted legacy positions. Steering sign was additionally corrected and tested: D decreases heading from bow +Z, matching screen-right in the following/helm frame.

### F4 — P3: Visiting an already clean reef announces another restoration

Location: [main.js](../../../src/main.js:393), especially line 400. `checkCleanupOutcome` checks only status transitions, not whether durable completion was newly earned. Entering an already completed site creates an attempt with status `complete`; after leaving (`null`) and reentering (`complete`), the same restoration announcement is shown. State does not duplicate rewards/completion, but feedback falsely presents revisiting as a new achievement.

Source reproduction: complete the reef, return to the raft, then choose Visit reef. Each entry produces “Home Reef restored” without cleaning anything. The core sequence can also be reproduced by extracting the exact `checkCleanupOutcome` function into a Node VM with a previously completed-site state and `lastCleanupStatus=null`; its complete branch runs on reentry. This is source/function evidence, not a claimed browser observation.

Requested correction: distinguish a newly committed site from a complete-site visit, using the action outcome or a durable completion transition. Regression: first earned completion announces once; repeated leave/reentry and load→visit never announce fresh restoration.

**Save accuracy correction verified:** initial `main.js` fingerprint `404f2ae1…` unconditionally said “Saved on your map” after `saveGame()`, even on false. I reported this promptly. Latest `d1cca5b8…` says only “Home Reef restored.” The extracted current function run with `saveGame=()=>false` no longer claims storage success. The persistent error banner remains owned by `saveGame` ([main.js](../../../src/main.js:109)); browser quota/disabled-storage verification is still required. The completion toast may replace the transient save-error toast, but the persistent failure banner is not cleared, so this is not retained as a false-save claim.

### F5 — P2: Wheel camera selection cannot survive taking the helm

Locations: [main.js](../../../src/main.js:348), [main.js](../../../src/main.js:600), [main.js](../../../src/main.js:801), and [scene.js](../../../src/scene.js:322).

Camera controls offer “Wheel camera,” but selecting it occurs in the inspection panel, whose opening leaves the helm. After closing the panel with wheel view selected, H/clicking the wheel calls `performAction('take-helm')`, which unconditionally overwrites the view with `follow`. Attempting to change the camera while sailing likewise opens a panel that leaves the helm, and retaking it resets the selection again. Thus the production UI cannot actually sail using the wheel camera; a QA-only camera setter can hide this defect. This prevents the intended normal-control camera comparison.

Reproduced using the exact current `performAction` function extracted into a Node VM, the real `createGame`/`act`, and a recording `scene.setView` stub:

```text
scene.setView('helm'); performAction('take-helm');
state.helm === true
Recorded camera calls: ['helm', 'follow']
```

Normal UI reproduction for QA: I → Wheel camera → H → W. Expect wheel perspective and vessel-relative sailing; source guarantees Follow instead. Repeat after choosing Wheel while already at helm. Requested correction: preserve a chosen sailing-camera preference across control transitions, while keeping station access and inspection free of steering. Regression should use the actual menu→helm sequence and verify both selected perspective and authoritative input mode; QA setters alone are insufficient.

### Input, exits and legacy-rule separation inspected

- `resetInput` clears keyboard/touch state, pointer drag and frame timestamp. It is invoked for dialogs, panels, focus/visibility loss, title transitions and cleanup retry/leave/entry. Modal/panel state blocks ordinary frame steering and simulation. Source supports a paused retry choice without draining air. [main.js](../../../src/main.js:172), [main.js](../../../src/main.js:729), [main.js](../../../src/main.js:865).
- Failed cleanup opens a mandatory choice with direct retry/raft actions; Escape cannot dismiss the failure dialog. Cleanup Space at the breathing band leaves the attempt, while W swims up for normal refill. Entry chooses cleanup when nearby; elsewhere Space retains the separate salvage dive. Cleanup collection calls the cleanup action, not salvage gather. [main.js](../../../src/main.js:374), [main.js](../../../src/main.js:381), [main.js](../../../src/main.js:829).
- `performAction` does not itself require an unpaused state because workshop/modal actions use it intentionally. Ordinary keyboard handlers and canvas/touch paths supply pause guards; review found no source-visible ordinary-input bypass. QA-only actions can bypass these UI guards and must not count as real-input verification.
- Save/return checks failed storage before entering the menu and offers an explicit keep-playing/return-anyway choice. It retains a live in-memory voyage for same-session Continue; reload uses the serialized state, discarding cleanup attempts. Therefore title-return→Continue and browser reload differ deliberately; verify this policy against the final exit copy rather than claiming every exit resets. [main.js](../../../src/main.js:288), [main.js](../../../src/main.js:313).
- The pause description at [main.js](../../../src/main.js:276) currently says “Reloading returns you to the raft.” This is accurate for cleanup but overgeneralizes legacy salvage, whose underwater breath is deliberately serialized/resumed. Qualify this copy during UI polish; the existing saved-underwater-survey test demonstrates the underlying behavior. No domain change to force legacy surfacing is requested.
- Frame ordering is steering→domain update→renderer→outcome UI. Collection is an event-driven action between frames, with immediate domain completion. This establishes ordering, not a browser-tested last-air tie policy. Domain failure blocks later collection; a valid final collection before the next update commits success. Preserve that explicit choice in integration tests.

### Renderer/resource ownership checks

`createScene` constructs one cleanup scene and the app reuses one scene promise. Cleanup entry/exit switches the rendered scene without allocating a fresh GPU scene each time. The local cleanup renderer consumes authoritative state; it does not steer the raft or advance legacy oxygen/expeditions. Its affected-water opacity reads durable completion, while trash/bag read attempt collection; failure resets collection visuals. [scene.js](../../../src/scene.js:104), [scene.js](../../../src/scene.js:253), [cleanup-scene.js](../../../src/cleanup-scene.js:69).

Ran an ephemeral Node/Three.js test through **50 enter→fail→retry→leave cycles**, then compared state around a presentation update: no domain mutation. This is a CPU object/animation test, not shader execution, input playtesting or visual QA. Scene construction was performed with a disposable Explorer template. The test recorded unique reachable resource disposal events: **133 geometries and 43 materials**, each disposed once even after calling `dispose()` twice; original template geometry/material received zero disposal events. This verifies the clone's independent geometry/material ownership for this fixture. [cleanup-scene.js](../../../src/cleanup-scene.js:26), [cleanup-scene.js](../../../src/cleanup-scene.js:116).

Static reef authoring batches geometry by material and disposes temporary geometries after merging; trash constructors dispose unused authoring materials. Final scene traversal owns the retained resources. Parent scene disposal calls cleanup disposal once before releasing the surface scene/renderer. No repeated-entry resource leak was found in inspected code or the CPU fixture. These checks do **not** measure GPU texture/shadow allocations, real GLTF texture cloning, shader compile failures, WebGL context loss or allocation behavior during failed post-load initialization. Those require browser/GPU evidence. [reef-art.js](../../../assets/cleanup/reef-art.js:64), [scene.js](../../../src/scene.js:342).

Main keeps the renderer for the app lifetime and does not dispose on every title return; this is intentional reuse, not by itself a leak. Never dispose the same cleanup scene both through its own method and an external traversal. Actual sustained transition counts and renderer.info counters remain a QA obligation.

### Current verification and fingerprint

`npm test`: **64 passed, 0 failed**. `npm run build`: **passed**; Vite reports the large scene chunk warning. Build success verifies bundling/exports, not runtime GLSL compilation or GPU/frame budgets. Current function-level tests confirm F1–F3 fixes, F5's camera overwrite and the revised completion branch. No source fixes were made.

```text
src/game.js              77c763311667652c7c31716d43df4acee636f17618b55fb5141637664a56c37a
src/cleanup.js           07af7c144c24d65aae35dbbcdff48b11e3955406bb9e5135c4844508a2793002
src/main.js              d1cca5b84b2d09f1bbe036e854348f621c883c091cef5f795db408038f698691
src/scene.js             a18687e43a36cf0ea035313dcd96150ed75cb744082ba8232900595f7e8976e7
src/cleanup-scene.js     3d4cf12f7c36d5bd6b8e93a6ed92093872e357b0d380150c37e101727cd963e8
assets/cleanup/reef-art.js dc59e71b3244bacc16ce7f463daed26e239736033c537c8f9ec8b6fd608459e9
tests/game.test.js       0046a01adff5db0d6db4c1b7c7cd645e9875265b50dfcc6193f7a762fe79aec5
tests/cleanup.test.js    31b1a92fbd47a6ef089a92a6a0f575ecd0bb09a7b9cb2f609f6b1cf55e54b336
```

Before an integrated technical pass, close F5, recheck F4, and exercise real-input held-key/mode transitions, failed-storage completion/exit, repeated failure/retry, successful reload, clean-site reentry and WebGL resource counters. Remaining visual/readability and hardware performance gates are independent of this review; no final completion score is assigned here.

## Closure recheck — latest UI and attempt-identity changes

### F4 and F5 closed at source/function level

F4: [main.js](../../../src/main.js:369) now announces restoration only when a successful action adds a durable site ID absent from the previous state. The outcome watcher no longer announces all `complete` status entries ([main.js](../../../src/main.js:395)). Tested the exact extracted functions with the real domain: six collection actions yield one restoration toast; leave/reenter and serialized reload→visit yield no extra restoration toast. These are disposable position fixtures, not earned browser cleanup.

F5: [main.js](../../../src/main.js:349) uses `settings.sailingCamera` on helm entry. The camera-selection handler stores Follow/Wheel preference ([main.js](../../../src/main.js:810)); settings parsing defaults safely to Follow ([main.js](../../../src/main.js:57)). The exact extracted action function with Wheel selected now records `helm → inspect → helm` across take→leave→take. Normal production input can retain the chosen perspective. A final frozen-build UI camera sequence is still required to verify the complete handler/render path.

### F6 — P2: Covered-salvage explanation recommends the wrong nearby dive mode

Locations: [main.js](../../../src/main.js:480), especially lines 484–486, versus [main.js](../../../src/main.js:381), especially lines 385–387.

The newly visible nearby blocked-target explanation correctly labels Anchored/Floating/Submerged and provides a tide countdown, both off and at helm. However, at covered Home timber it says “Salvage dive or wait for low tide,” while the single Space/dive action prioritizes nearby cleanup. The cleanup attempt then locks salvage collection. This reproduces an action/purpose mismatch at the precise location whose explanation is meant to remove hidden collection rules.

Reproduced with the exact extracted `toggleDive` and real domain:

```js
const state = Game.createGame();
state.position = { x: 6, z: 6 }; // Home anchored timber.
Game.updateGame(state, 90);     // High tide, covered.
// toggleDive(), with performAction backed by Game.act:
// Actual dispatched action: enter-cleanup; attempt.siteId: home-reef.
// Expected from hint: a salvage dive that can gather this timber.
```

Requested correction: make the visible hint and accessible action agree. Either provide a distinct salvage action when it is recommended, or use accurate wait/tide guidance where the current control exclusively enters cleanup. Do not silently swap cleanup's normal surface-breathing rules for legacy salvage behavior. Regression: covered home timber at high water, both helm states; assert the visible instruction and actual button/Space dispatch lead to the same intended activity. Existing tide-state tests do not verify this UI dispatch relationship.

### Attempt-identity presentation reset verified

Latest [cleanup-scene.js](../../../src/cleanup-scene.js:75) compares `previousAttempt !== a`, and records the read-only reference at [cleanup-scene.js](../../../src/cleanup-scene.js:114). Ran an ephemeral Node/Three lifecycle matching PM's defect: enter, move left/deep with zero collected, update presentation, leave, immediately reenter the same site **without any cleanup update while outside it**, then update at dt=0. Bag position resets immediately from approximately `[-2.091,-1.507,1.15]` to fresh `[-1.3,-.65,1.15]`; attempt object identity changes; deep comparison verifies presentation did not mutate game state. Reset also sets facing/lastX and clears per-trash flight bookkeeping. Retaining the previous attempt reference is local presentation bookkeeping, not authoritative state mutation.

This source fix is CPU-verified. It was not included in the preceding build; final freeze/build must include it. No source edit was made by this reviewer.

### Capture, QA provenance and outstanding gates

Viewed the actual [integration-cleanup.png](../../../captures/second-improvement/integration-cleanup.png): the breathing panel is at upper right and does not cover the centered surface swimmer in this wide capture. Swimmer, bag and tether are visible. This closes the claimed overlap only for this supplied still/view; it does not prove square-layout or motion/readability acceptance.

Read [QA's report](qa.md), which documents earned two-failure/retry/breath/success/reload coverage and preserves its mixed-build provenance. That supports the tested cleanup lifecycle, not final frozen-build acceptance. Headless Chrome failing to establish actual focus loss is a blocked harness/environment case, not a confirmed gameplay focus defect. Source focus guards remain inspected; actual focus-transfer behavior remains unvalidated until the harness genuinely produces loss of focus/visibility.

Latest UI recheck: 64 tests pass; production build passed before the new attempt-identity change. Final build/freeze, real camera UI sequence, F6 disposition, storage behavior and hardware/GPU evidence remain required. No false completion or full technical acceptance is asserted.

Latest changed-file SHA-256:

```text
src/main.js          ccad29b0496c50ef8330239bff973255fdc15616e891dfba94a77db8a8779505
src/cleanup-scene.js 8ba3abf8037b1869be12ef8340ca06a69a1baec3f11c10937f9ed49330ea39ef
src/style.css        021f494f74c36b4357d105872019b8cdd9571cbc0a26b271b4ddaba6a4f00ac1
```

## F6 final source closure — no rebuild

**F6 closed.** [main.js](../../../src/main.js:383) now centralizes the action, label and disabled state in `contextualDiveChoice`. A within-3m underwater target or tide-covered anchored target selects salvage dive ahead of nearby cleanup. `toggleDive` dispatches that exact choice ([main.js](../../../src/main.js:393)); HUD reads the same choice ([main.js](../../../src/main.js:454)). Direct buoy clicks still explicitly enter cleanup ([main.js](../../../src/main.js:923)). No obsolete salvage oxygen rule crosses into an active cleanup attempt: its surface exit remains conditional on the cleanup breathing band.

Ran the exact extracted helper/dispatcher in an ephemeral Node VM with the real game domain. Covered Home timber at high tide passes both off-helm and at-helm cases: label is “Salvage dive,” action is `dive`, cleanup remains null, and subsequent gathering of that timber succeeds. Additional cases pass for nearby underwater salvage, ordinary Home cleanup entry, cleanup surface exit/underwater exit suppression, and legacy recovery blocking salvage entry. Source checks confirm HUD uses the shared label and buoy clicks remain direct cleanup.

Latest reviewed `src/main.js` SHA-256: `f806c6f3c8cae02d5f935fe04d8dcee06f45f8e6bf306851d7fa2655148e913d`.

These are source/function tests using disposable in-memory fixtures; they are not new earned browser observations. No `npm run build`, preview restart, source edit or stable-dist modification was performed in this closure turn. Earlier review builds did write generated `dist`; further builds must be coordinated with PM after agent contexts are ready and final freeze is agreed. Final QA should verify button/Space label-action agreement at covered timber and near underwater salvage on the frozen served build. Actual focus-loss coverage remains blocked by the harness until a genuine focus/visibility transition is established. Technical finding closure is complete at source level; final browser and release gates remain separate.

## Frozen production browser review

Ran fresh isolated installed-Chrome headless contexts against production `http://127.0.0.1:5181/?qa=1`, 1440×900, DPR 1. Browser actions used actual keyboard, button and menu events; the QA hook was used only for state/metrics reads. No source/state injection accelerated gameplay. Explicit initial-save fixtures supplied covered/underwater salvage and already completed restoration; those are not earned voyage progress. Browser profiles were disposable and did not access user saves. No benchmark, build or preview restart ran.

### Exact frozen build

Read all nine dist files and fetched their served counterparts; every SHA-256 matched. The aggregate algorithm matches the QA fingerprint method: sort `{path,bytes,diskSha256,servedSha256,matches}` records by path, then hash their JSON. Aggregate before/after browser run stayed:

```text
15dad0020b8be16575fb795b0b6b930b75661898367e81b8f4c735fc898dbd6e
assets/index-CFK9qQDK.js abf6d8dafa1a18f70b9a8030f6040c42e788df5dfa10d3d0def81a3cbf93db32
assets/scene-Be6Rwn9a.js c9f4bfebc5b76073e5ed520afaf23f6bd91747f50ae71edd4a02c60b99d52c48
dist/index.html         2aec736356adbb8af8438b837b1dc98464caaaa42531a4733e0d55b33c58c52d
```

Source remains at the recorded final `main.js f806c6f3…` and attempt-reset `cleanup-scene.js 8ba3abf8…` fingerprints. PM supplies the build/source provenance; matching served/disk assets was verified independently here.

### Actual-input results

| Workflow | Result and evidence boundary |
|---|---|
| F5 camera/menu/station transitions | **Pass on settled-focus retest.** I→Wheel camera→H selects actual rendered helm mode; held W moves z from 0 to 2.5005. B leaves helm; W while workbench is open does not move position. Closing and retaking helm retains Wheel. Choosing Follow via the same menu then taking helm selects rendered Follow. Actual screenshots of both rendered views were inspected from temporary scratch files. |
| F6 covered timber, off helm | **Pass.** Initial high-tide save fixture at (6,6); visible Covered/Salvage-dive hint, matching button label; Space starts legacy diving with no cleanup attempt; E gathers `home-timber`. Collection was earned through inputs from a fixture location. |
| F6 covered timber, at helm | **Pass.** Same fixture, H first; same visible explanation and successful Space/E salvage path, without cleanup crossover. |
| F6 underwater pickup/surface | **Pass.** Initial fixture at (6,-9); Salvage dive button enters legacy mode; E collects `home-pearls`; Space surfaces. |
| Cleanup zero-collected leave/reentry | **Pass.** New voyage→Space enters snorkel cleanup. A/S swims away/down; underwater return button is disabled and Space does not leave. W surfaces; Space leaves and reenters. Fresh attempt has x/y=0, air=24 and no collected trash. Immediate bag/facing reset itself remains confirmed by the earlier CPU lifecycle reproduction; this browser state test does not measure bag coordinates. |
| F4 completed-site reentry/reload | **Pass.** Completed-site initial fixture, two real leave/reentry sequences, then browser reload→Continue→visit: completion survives and no restoration toast reappears. Newly earned final-completion toast is covered by the source/function reproduction and QA's earned cleanup run, not re-earned in this targeted browser review. |

No unexpected page/network errors occurred in the five passing initial cases. The camera retest completed without a runtime-error UI. Console/GPU certification is not inferred from these limited checks.

### Initial camera timing failure retained

The first camera run issued H/W immediately after clicking Wheel camera, without waiting for dialog-close/focus settling. Helm state and camera selection succeeded, but a 200 ms W hold left position at (0,0); the assertion failed. This is **not erased** by the retest. On recheck with 250 ms dialog settling, canvas focus verified and a 100 ms post-helm settle, a 500 ms W hold moved normally and all subsequent station/camera checks passed. State reported visible document, true focus, canvas active, closed dialogs and unpaused play.

This does not confirm a persistent movement defect or establish the exact cause of the initial failure. Retain it as an immediate-input timing coverage caveat; if normal-input playtests reproduce a missed held key around dialog closure, isolate that event ordering as a new concrete defect. Do not label it the existing genuine-focus-loss problem, which remains independently blocked until the harness actually induces blur/visibility loss.

### Technical disposition

Targeted frozen-build technical verification passes with the timing caveat above; F1–F6 remain closed and no new critical defect is confirmed. Existing earned cleanup fail/retry/breath/success/reload evidence remains QA-owned and must retain its exact served fingerprint. This report does not promote older mixed-build evidence to final acceptance. PM should combine final frozen QA, camera/novice/expert reports and later hardware performance evidence before assigning overall release gates. No source or stable-dist modification was made during this final review.


## Delivery-freeze focused source closure

Reviewed the final changed source independently; implementation remained read-only. Disk production entry is `assets/index-DeA0w30n.js`, scene `assets/scene-yIHawRAH.js`. This identifies the PM-built delivery candidate, not a new browser acceptance claim. The reported 64 passing tests and earlier 30 functional components do not substitute for changed-workflow/runtime and performance QA on this candidate.

- **Failure HUD:** [main.js](../../../src/main.js:403) publishes `refreshHud(true)` at line 410 before opening the failure modal at line 411. This bypasses the 200 ms throttle and displays the already-reset domain state before frames pause. The expert’s stale 1/6, Air 1 report is closed at source level. Exact extracted functions with the real domain, one collected item and elapsed air, and an intentionally recent HUD timestamp assert **0/6, 0 seconds and progress 0 at modal invocation**, not after a later refresh. Pass. QA should retain the earned failure/modal regression on this delivery candidate.
- **Workshop:** [main.js](../../../src/main.js:687) places the first unbuilt plan before two initially closed sections, keeping every existing plan and optional rig available. Exact renderer checks across all five successive upgrades and the all-built case pass. [main.js](../../../src/main.js:635) captures each details element’s open state by stable ID; lines 652–654 restore it after replacement. Executed the exact `refreshPanel` function with mixed open/closed states and scroll 42: both states and scroll remain unchanged. This is a DOM-stub source-function check; live keyboard/focus/layout belongs to runtime QA.
- **Camera choice:** [main.js](../../../src/main.js:56) forces `sailingCamera: 'follow'` when reading old settings; [main.js](../../../src/main.js:699) exposes only Inspect and Following camera. Executed `readSettings` with a stored `helm` choice: result is Follow while valid low-quality and sound settings remain intact. This intentional production-option removal supersedes historical F5 Wheel-menu observations. Dormant renderer/QA camera support does not provide a normal production UI choice.
- **Bag seams/lifetimes:** [cleanup-scene.js](../../../src/cleanup-scene.js:51) creates two fixed seam meshes and one tie mesh once, adding three geometries and one material. Updates animate existing objects; they allocate no seam geometry. Attempt identity at line 83 resets presentation on zero-item leave/reentry as well as fail/retry. CPU Three lifecycle verification across 20 enter/collect/fail/retry/exit cycles leaves domain state untouched. Disposal at line 124 disposes each of **136 unique geometries and 44 unique materials once**, including seams/tie, even with a second dispose call. Browser GPU/motion/readability acceptance remains QA’s gate.

Purpose/bow/return text at [main.js](../../../src/main.js:475) and [main.js](../../../src/main.js:486) matches the active cleanup exit condition and heading coordinates; no new domain rule or cleanup/legacy ownership crossover was found. Source syntax checks pass. Domain file hashes remain unchanged from the preceding verified domain review. No new source finding is outstanding in this focused closure.

Reviewed SHA-256:

```text
src/main.js          8bae22422b2b6379891f0499883fc64ca94d0f6f7a9131f11b4a874a3a85a00d
src/cleanup-scene.js f70b69387a6b347edb93d9eb916a1da1192c3ee71b1c8a27b3a73c5072440cad
src/game.js          77c763311667652c7c31716d43df4acee636f17618b55fb5141637664a56c37a
src/cleanup.js       07af7c144c24d65aae35dbbcdff48b11e3955406bb9e5135c4844508a2793002
```

Only this review document changed. No browser was launched for this source-only closure; previous isolated review scripts closed their browsers. No builds, preview restarts, implementation edits or benchmarks were performed. Final runtime QA remains separate from source closure.


## Final title-backdrop source addendum

No actionable source issue found in the staged title-only fix. [index.html](../../../index.html:16) wraps only decorative art/shade in an `aria-hidden` backdrop; title and controls remain outside it. [style.css](../../../src/style.css:15) retains the menu’s `overflow: auto` and isolated stacking context. The absolute inset-zero backdrop at line 16 clips the oversized animated art (line 290), uses `pointer-events: none`, and stays behind controls with `z-index: -1` inside that isolated context. Control scrolling and focus outlines are not clipped by the new wrapper. No domain or renderer rule change is involved.

Source hashes: `index.html` = `bcb933655a4cefea48412ca63a1dfc76c57621cf65b6a2a1babc3f38dd0660f3`; `src/style.css` = `13d365c721d9c809c9936b013dabf1446cb5d512805e1adbe6365ce8ed4e1a0d`. This staged source change is separate from the preceding delivery build; before/after visual QA remains pending. Only this review document was written. No rebuild or browser launch; no reviewer-owned browser remains.


## F7 — queued close resets new input: independent closure

**Original concrete P2 failure retained:** PM’s [four failed immediate-Resume trials](../../../captures/second-improvement/resume/2026-10-09T00-34-45.708Z/results.json) showed new KeyS followed 5–9 ms later by queued modal close, with no descent. This is a confirmed current-build input defect before the fix, not merely the earlier unresolved tool-focus ambiguity. The old 250 ms settle tests did not cover that boundary. Passing those tests did not establish correct immediate Resume behavior.

Source fixes at [main.js:870](../../../src/main.js:870) and [main.js:910](../../../src/main.js:910) reset on an unexpected native close only while the corresponding owner marker remains non-null. Normal `closeModal` clears `modalKind` before close ([main.js:188](../../../src/main.js:188)); `closePanel` clears `activePanel` before close ([main.js:194](../../../src/main.js:194)); both retain synchronous input reset. A queued old close therefore cannot erase a later key. An already reopened dialog is protected by the `!dialog.open` guard. External/native closure with a retained marker still clears input. No source mutation was made by the reviewer.

Executed the exact two extracted close handlers in Node VM: closed+null marker causes zero resets; closed+retained marker causes one; open+new marker causes zero. All six cases pass. This validates the fallback logic rather than assuming it from browser happy paths.

Independent real-input run: [results](../../../captures/second-improvement/technical-transitions/2026-10-09T00-38-45-989Z/results.json), runner [qa-transition-review.mjs](../../../scripts/qa-transition-review.mjs).

- Four close-panel → immediate H → W trials (two Close button, two Escape) move about **1.916–1.917 m** each. Event log records KeyW **3.6–11 ms before** the queued panel close; movement survives it. No post-close settle delay.
- Two independent click-Resume → immediate S trials descend **0.880 m** and **0.843 m**. Modal close arrives **0.9 ms / 5.7 ms after** KeyS. This exercises the actual bad ordering, not an input issued after the close event has settled. PM’s separate four-trial regression is separate evidence.
- Physically held W across panel open/close and across pause/Resume produces **zero subsequent raft displacement** without a fresh keydown. Held S across pause/Resume retains exactly the same swimmer y. Thus the guard does not preserve stale held input while protecting new presses. Keyup is deliberately withheld until after each no-leak assertion.

**F7 closed for these reproduced paths.** This is stronger evidence than merely waiting for stable focus; it does not certify every browser/platform scheduling sequence.

### New activity-specific copy

[main.js:274](../../../src/main.js:274) now distinguishes ordinary raft pause from cleanup and legacy salvage pause. Runtime ordinary pause explains raft/supplies/restored reefs without unrelated unfinished-cleanup or current-breath prose. Active cleanup pause states Resume retains the attempt and reload starts it over. Legacy pause wording was checked in source, not separately entered during this bounded run.

Opening [main.js:500](../../../src/main.js:500) shows **“Home Reef needs a cleanup.” / “Click the orange buoy or press Space to snorkel.”** at the fresh off-helm position. Existing nearby salvage still takes priority when in actual gather range; no rule/action dispatch change was introduced. Far-trash guidance [main.js:479](../../../src/main.js:479) shows **“0/6 collected · Bottle 4 m ↙”** on entry; later screenshot shows named rope, distance and down direction. The label derives direction from local swimmer/target coordinates and disappears as a target becomes collectible. These UI observations verify displayed content, not a new source-blind comprehension test.

### Requested small Find-label recheck

Only normal/larger Find text at wide/square was checked; the full accessibility matrix was not repeated. The first captures sampled the panel opening animation and are retained. [Find-only settled follow-up](../../../captures/second-improvement/technical-transitions/2026-10-09T00-39-34-778Z/results.json) passes: **14→16px** at 1440×900 and 900×900, enabled Find button fully inside viewport, 44px height, visible teal focus, no panel-body horizontal overflow. The settled square screenshot was inspected. Reviewer browser closed normally after both runs; main-owned preview was left untouched.

Served entry SHA-256 `dc44634105660831834c3d9b7613b0732b42afcf6073f39971fb9b6a1117309b`; scene `ba96e6246e6952b311c9cfe582c089bd26172673d125bba670a07b61e24cb426`; CSS `a77de6115ae25480e3b3b18f2656841d5bbae2bb816b0871d21f96ec1399ed39`. Before/after HTML matched per run. Reviewed `src/main.js` SHA-256 `08bd0f990b3d83923199ee7afb382d98701a6124922539bffaa39317076872dc`; `src/style.css` `4a8c51a6820a3b1a1f2cd3e43204ecb581644e49b0613fb8a5f1bf4e0c531698`. Domain file hashes are unchanged. No rebuild, implementation fix, benchmark or performance certification was performed by this reviewer.
