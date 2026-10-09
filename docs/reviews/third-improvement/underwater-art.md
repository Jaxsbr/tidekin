# Underwater presentation — third improvement

Owned files: `src/cleanup-scene.js`, `assets/cleanup/reef-art.js`, and this report. Read the full third goal, current interview, underwater research, original reference image, art direction/provenance, previous art review and performance budget, then the current domain contract and research audit. Existing baseline remains under `captures/third-improvement/baseline`; no renderer, UI, domain, main, Blender or title asset edits.

## Integration

- Factory still returns `scene`, `root`, `update(state,dt,{reducedMotion})`, `cameraPose(aspect,variant)`, and idempotent `dispose()`. New `pick(ndc,camera,state)` raycasts onto world Z=0 and returns `{point:{x,y},trashId?}`, or null without an attempt/intersection. Proximity radius is .8; domain independently enforces interaction reach.
- Resolve sites through `getCleanupContext(state).site`, including dynamic salvage/survey. Rebuild on **site ID**, not object identity: dynamic resolver results are freshly allocated. Site replacement disposes owned target/support/contents resources. Completion respects attempt status, including disposable practice.
- Read attempt `x,y,facing,siteId,status,collected,selectedId,actionProgress,variant.action,cleaning`. No state writes. Input scheme and tuning remain domain/UI-owned. Parent relays picking; pointer gesture latching remains UI-owned.
- Spatial clean: `cleaning[targetId]` is `[left,middle,right]`, each 0..1. Three equal bands cover the contract's x±.4 strip; their centers are x−.8/3, x, x+.8/3. Five separate flecks per band shrink only with that band's coverage, revealing the underlying warm coral. Partial coverage persists visually after release and clears with authoritative reset. Whole-object `actionProgress` never substitutes for spatial coverage.
- The domain does not store pointer aim. The brush follows the **band whose authoritative coverage increased**, and stops when coverage stops; it does not pretend to track an unavailable continuous cursor coordinate. No extra domain field is required. If exact cursor-follow is desired later, expose a read-only action aim field through the contract.
- Pull: articulated reach to object → restrained resistant movement against visible snag → release and bounded transfer into bag. Cleaning removes local fouling without a fake solid-trash flight. Variant changes clear presentation flights. Collected contents are recognizable miniatures matched by target ID.

## Art and provenance

Original editable Three.js procedural geometry, extending the previous original reef source. Existing articulated Explorer is deep-cloned from the supplied project GLB; its resources are copied before editing. No new generated bitmap, downloaded artwork, or Blender export is claimed. The supplied ocean-workshop image informs warm coral/sand, cream equipment, turquoise water and approachable explorer scale; its pixels are not reused.

Head axis follows actual two-dimensional travel including pure descent/ascent, with short angular interpolation and stable rest direction. Surface breathing stays upright. Arm/leg stroke effort responds to movement; working arms reach the selected action surface. Open translucent collection net has a waist tether, visible identified contents, bounded growth and trailing lag. Heavy rubbish rests against rock ledges/snags; lightweight pieces have slight tethered drift beside rooted kelp. Rooted leaf ribbons sway, bubbles rise, shafts and caustic contours move gently. Background limestone silhouettes add depth. Reduced motion freezes decorative time while preserving state changes and a short direct transfer.

## Verification and limits

Syntax checks passed. Isolated headless installed Chrome/Vite staged renders inspected at 1440×900 and 900×900 for pull, clean and per-band restoration. No page errors in these checks. These are assigned-state art tests, **not earned play, hardware benchmarks or human approval**. Temporary inspection captures are in `/tmp`, not delivery evidence.

Ray projection of target (−3,−3) returned approximately (−3,−3) and `reef-bottle`. Sixty-frame directional samples converged to Z rotations down −3.14159, up approximately 0, right −1.57080, left +1.57080. Thirty alternating static-site/failed/retry cycles did not grow geometry counts (184 to 180; differing visible/allocated states). Double disposal returned 0 geometries and 0 textures. These counters preceded the final six-mesh explicit reaching-arm refinement; final integrated QA counters supersede them.

Remaining integration checks: earned pointer/directional × pull/clean action paths, exact UI aim/range feedback, all dynamic adapters, actual transfer continuity under live frame timing, square HUD overlap, independent art assessment and hardware performance. Research does not establish this art or either action as enjoyable; Jaco's comparison remains necessary.

Final refinement check: dynamic salvage rendered for 100 further frames with stable geometry count **153→153**, and the Pearl survey adapter rendered successfully. Final reaching-pose square capture inspected; 173 draw calls / 70,825 triangles in that staged home-reef frame. No page errors; double disposal again returned **0 geometries / 0 textures**. Dynamic sites no longer rebuild each frame. These are isolated headless render checks, not hardware performance measurements.

## Read-only QA projection seam

`getStats(camera, rect, state)` now returns `{siteId,status,action,cleanupTargets,swimmer}`. Without an attempt or after disposal it returns empty targets/null swimmer. Each target exposes `id`, `trashId`, `name`, CSS client `x,y`, `screen:{x,y}`, `world:{x,y,z}`, frustum `visible`, `collected`, `selected`, `distance`, and three `segments`. Each segment has `index`, `coverage`, and the same screen/world projection fields. Targets and segments project the Z=0 interaction plane, so they round-trip through `pick`; swimmer projects the displayed center. Canvas rect left/top offsets are included. Caller supplies its current camera/matrices and actual canvas rect. No arbitrary camera or actions are introduced.

Verified all three target centers and nine segment centers round-trip through `pick` within 1e-8 world units, including nonzero rect offsets. State serialization and camera matrix remained unchanged. Syntax passed. This metadata seam is ready for parent delegation and actual-pointer QA; the verification's synthetic state was confined to an isolated Node process.

## Independent-review refinement

The first terrain revision's repeated bulb supports were rejected by PM and design review. The editable reef source now uses faceted connected limestone slopes with asymmetric embedded shelves, offsets the working body from the pollution surface, and distinguishes timber bundles, oyster/pearl beds and survey flags. Staged source renders are preserved in `captures/third-improvement/art-refinement/`; these demonstrate geometry only, not final integrated HUD or actual earned progression. Integrated recheck belongs to the independent design review.
