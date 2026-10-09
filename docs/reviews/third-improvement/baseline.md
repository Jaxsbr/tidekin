# Third improvement runtime baseline

Captured 9 October 2026, approximately 15:16 Pacific/Auckland (02:16 UTC). Assignment limited to baseline evidence and capture script. Read the third-improvement goal, current player interview, workspace instructions and existing baseline/motion/fresh-play scripts. No implementation, rebuild, server restart, user-profile access or user-save alteration occurred. The existing source snapshot was left untouched.

## Runtime identity and isolation

- Existing listener: Node PID **73342**, started Fri Oct 9 13:28:33 2026; working directory `/Users/jacobusbrink/Jaxs/projects/tidekin`.
- Command: `node /Users/jacobusbrink/Jaxs/projects/tidekin/node_modules/.bin/vite preview --host 127.0.0.1 --port 5181 --strictPort`.
- Served production entry **index-CLQfBj9P.js**, matching the documented 0.3.0-beta.1 candidate. Served HTML, entry JS, CSS and menu illustration matched the existing disk dist files before capture. Their fingerprints remained identical afterward. This fingerprint covers HTML-referenced assets, not every dynamically loaded asset.
- Entry SHA-256: `dc44634105660831834c3d9b7613b0732b42afcf6073f39971fb9b6a1117309b`.
- Browser: installed Chrome, headless, **154.0.8037.98**, macOS Darwin ARM64. Both contexts reported **ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version)**; vendor Google Inc. (Apple). Hardware Metal renderer reported despite allowing SwiftShader fallback in launch flags.
- Independent fresh `browser.newContext` for **1440×900** and **900×900**, DPR1, default **High**, inspect/follow sailing and side cleanup. Initial localStorage keys were empty in both. Browser was separately launched, never attached to Jaco's browser. Application autosaves went only into disposable context storage.
- `?qa=1` enabled the established API. Only `getState` and `getMetrics` were read; no action/camera hooks, clocks, fixture saves, position edits or input-state injection.

## Evidence

All runtime evidence is under [baseline/runtime](../../../captures/third-improvement/baseline/runtime/). [results.json](../../../captures/third-improvement/baseline/runtime/results.json) contains timestamped actual inputs, state, DOM text, gather affordance, layout, GPU and rolling renderer metrics at every screenshot. [fingerprint-before.json](../../../captures/third-improvement/baseline/runtime/fingerprint-before.json) retains initial build identity. Script: [third-baseline.mjs](../../../scripts/third-baseline.mjs).

Each layout has eleven PNGs: title, opening, stable start, initial gather attempt, helm motion, second gather attempt, dive entry, descent, pre-pickup, post-pickup and ascent. The short recordings retain the opening/loading transition and the complete tested motion sequence:

- [Wide recording, 12.88 seconds](../../../captures/third-improvement/baseline/runtime/1440x900/page@1b31ac6862cfa1bcb9d9a83d7d38da97.webm).
- [Square recording](../../../captures/third-improvement/baseline/runtime/900x900/page@1d9cf13f0092cef005b129a1b346ed6b.webm).
- [Wide recorded-frame contact sheet](../../../captures/third-improvement/baseline/runtime/1440x900/motion-contact-sheet.png), row-major 2 fps samples beginning at the start of the recording. This was actually inspected, alongside wide descent/follow and square opening images. It supports sampled pose/placement observations, not a full-speed smoothness judgment.

## Actual-input outcomes

Start-new-voyage click entered play after the loading presentation. E at the starting position left inventory/collected state unchanged and showed “Move closer to the salvage.” H took the helm; W held 900 ms moved the raft from `(0,0)` to approximately `(0,4.42)` wide / `(0,4.50)` square. D held 550 ms turned heading from 0 to about 5.403 radians. The following camera engaged. A second E again gave proximity rejection. These are normal out-of-range tests, **not reproduction of Jaco's uncollectable log incident**.

H left the helm. Space entered Home Reef side cleanup in both layouts. S held 900 ms descended from y=0 to approximately −1.98/−2.02. A held 1300 ms reached x≈−2.86/−2.90, near the bottle. E successfully collected `reef-bottle`, visibly changing the count from 0/6 to 1/6. D held 600 ms and W held 1200 ms returned to y=0; the air restored to 24 and “Breathing” appeared. No page errors or failed requests were observed. Root scroll dimensions matched the viewport throughout these captured states.

## Observed defects and presentation gaps

1. **Descent pose does not align with descent.** While actual S input changed only vertical position, the captured swimmer remained sideways/inclined, head toward the right rather than downward. The recorded samples show the same mismatch during submerged ascent; the surface breathing pose then becomes upright. This corroborates the specific pose complaint, without claiming the movement is enjoyable or unenjoyable.
2. **Stale collection tooltip crosses modes.** In both layouts the underwater “Collect Bottle” button was enabled, yet its DOM title still read “Move within 3 m,” inherited from surface salvage. Successful E pickup demonstrates that the tooltip did not describe the current permission state.
3. **Surface error toast persists into cleanup.** “Move closer to the salvage” from the second surface E attempt remained visible on dive entry/descent. This is confusing feedback for a newly entered, differently controlled activity.
4. **Following view has strong raft occlusion.** The cabin/roof occupies the central foreground in the actual helm view; a log bundle overlaps the raft's lower silhouette in the wide helm capture. This establishes camera/visibility friction, not a targeting failure for that bundle.
5. **Opening exposes many actions at once.** The square opening shows the cleanup prompt, Gather/Snorkel and six additional station/menu actions together, plus resources/tide. There is no captured action-by-action movement/collection teaching sequence in this short opening. “Ugly” remains Jaco's judgment; these captures establish the visible hierarchy and density for comparison.
6. **Underwater objects are visibly suspended and outlined.** Bottle, cans, bag and rope occupy distinct open-water positions above the seabed, with circular target outlines. The swimmer's bag floats beside/behind the upper body. These are observed composition details consistent with the reported artificial placement; no claim about physical bag dynamics, asset provenance or enjoyment is made.

## Limits and handoff

The short route did not reproduce the retained pre-high-tide/high-tide wooden-log incident; no tide fixture was introduced. No successful surface pickup/transfer was captured. No legacy dive route, map tracking, wheel construction, departure gate, full cleanup completion, failure/retry or persistence reload was exercised. Those remain implementation/QA responsibilities, not baseline passes. Short sampled motion supports the pose finding above; no full-speed subjective animation or responsiveness certification is claimed.

Rolling in-game rAF metrics in the recorded sessions were approximately median 16.7 ms and p95 16.7–16.8 ms. Video recording and screenshots were active. This was **not** the specified five-second warmup plus twenty-second hardware benchmark, and is not a performance-budget pass. Resource counts and CPU submission timings are retained as telemetry in results.json, not GPU timing.

Captures complete. The existing port 5181 preview remains running and its served build was unchanged across capture. Other agents may now implement using this preserved evidence.
