# Sailing presentation — third improvement

9 October 2026. Scope: only `src/scene.js` and this note. No domain, cleanup scene, UI, CSS, Blender or saved-voyage edits. Read the full third goal, current player interview, camera comparison, domain contract, project/design/performance context and underwater research. Inspected the original ocean-workshop reference and both actual current log-incident screenshots.

## Changes and integration

- `setView('helm'|'follow')` preserves the parent's camera choice. Helm eye is behind the forward wheel, looking over a small visible timber bow. The exported shell is merged into `Workshop_Static_Geometry`: hiding `Engine` alone failed the actual first rendered check. During helm rendering only, hide that merged static mesh, named engine/flywheel and Explorer, show a procedural bow/wheel, then restore exact prior visibility in `finally`. Full raft remains in follow/inspection; no export or upgrade state is changed.
- Follow is higher, slightly off-center, and looks eight meters ahead. Nearby target labels render above hull occlusion. Floating, anchored tide/dive, seabed and locked-region labels differ in words as well as color; `E · GATHER` comes from domain availability. Collected targets hide their markers.
- Six pooled pickup pieces travel toward a point in front of the active camera rather than through the hull. They render without depth occlusion, with a short arc and stagger; reduced motion shortens the effect. `result.nodeId` identifies the acquired object even if the parent has not redrawn state yet.
- Both entries in `CLEANUP_SITES` create orange flag buoys with local murky slicks and visible litter. Completion hides that site's pollution and makes its buoy green. No invented second-site coordinates or reward authority in the renderer.
- The radial inward-moving foam band imports `SHELTER_RADIUS` and `SHELTER_BAND` from game.js (currently 25 and 3). Reduced motion freezes it. The renderer never applies pushback or changes departure state.
- `pickCleanup(clientX,clientY)` converts the canvas rectangle to NDC and delegates to `cleanupView.pick(pointer,camera,lastState)`. Returns its `{point:{x,y},trashId?}` result; outside cleanup returns null.
- `getStats()` adds read-only `targets` (IDs/access/world positions/projected object and marker positions), `cleanupSites`, `shelterRadius`, and per-site `interactions['cleanup:<id>']`. Original `interactions.cleanup` resolves the nearest buoy. Projection `visible` means inside the frustum, not a general geometry-occlusion test.

## Verification and limits

- `node --check src/scene.js` passed. Vite production build to `/tmp/tidekin-sailing-build` passed; shared `dist` and baseline were not overwritten. Existing large-chunk advisory remains.
- Isolated headless installed Chrome, 1440×900 and 900×900, source preview port 5183. Inspected initial and corrected helm captures, square and fully-upgraded helm, follow and a staged gather-transfer frame. Corrected views remove the shell intrusion and retain wheel/bow; follow shows both polluted teaching sites. No browser page errors.
- Staged domain gather succeeds; scene update leaves serialized in-memory state unchanged. Thirty helm/follow transitions keep geometry count constant. Cleanup center pick returned `{point:{x:0,y:-4.2}}`; rendered shelter radius equals domain export. Disposal completed without error.
- Temporary review harness and PNGs: `/tmp/tidekin-sailing-check.mjs`, `/tmp/tidekin-sailing-{helm,follow,square,upgraded,transfer}.png`. These are fixture/render checks, not earned play or persistent project evidence. Final production captures belong to parent QA, per the two-file ownership restriction.
- No claim of reproducing Jaco's exact log sequence or identifying its node. The screenshots support the ambiguous affordance and hull-occlusion problem. Domain specialist owns eligibility fixes and actual tide/proximity cases.
- Parent integration still needs actual-input camera switching, clipping while turning/bobbing, earned collection/boundary traversal, targeted trash picking, UI overlap at both sizes, normal/reduced-motion review and the hardware performance protocol. Headless CPU submit timings do not establish FPS, comfort or human preference.
