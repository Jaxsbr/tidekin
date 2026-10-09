# Fourth improvement — sailing art

Owned files: `src/scene.js`, `src/build-cinematic.js`. No main/index/CSS changes.

## PM integration contract

- Scene defaults to `follow`; `setView('follow')` is supported. Only inspect/cabin/workshop opt into another third-person framing; unknown modes resolve to follow.
- Call `scene.onAction(action, result, previous)` after domain actions. A successful waterwheel build (`result.ok`, `result.upgrade === 'waterwheel'`, previous not built) starts the presentation immediately.
- `scene.getBuildPresentation()` returns `{ active, progress, id }`. The same object is exposed as `scene.getStats().buildPresentation`. `id` is null before first build and `waterwheel` thereafter; progress stays 1 on completion.
- While active, pause domain movement/time but keep passing visual delta seconds to `scene.update(state, visualDt, input)`. Presentation consumes this delta, independent of domain time. Duration is 3 seconds (0.35 seconds with reduced motion). Do not replay the build event.
- Main may use active status for its minimal Waterwheel/Ready stamp. Scene does not change domain controls or inventory.

## Changes

Removed first-person branch, hull-obstruction hiding, surrogate bow/wheel, and helm raycast proxy. Original GLB world assets remain unchanged.

Removed every salvage locator pole, locator ring, and remote rectangular label. One shared 80px square sprite uses original canvas illustrations of timber, scrap, or pearls. Selection consumes `context.gatherTarget`; a Covered fallback only uses reachable high-tide/dive-required nodes. No distance, arrow, amount, or instruction text. Popup fades and scales between selections; original visible junk and the exact gathered-resource transfer remain.

Waterwheel presentation assembles its actual authored mesh/material parts with staggered eased arrival and scale, warm point light, pooled sparks, third-person raft framing, and late wheel acceleration. Reduced motion uses a short reveal without sparks, travel, camera movement, or rotation.

## Validation

- `node --check src/scene.js` and `node --check src/build-cinematic.js`: pass.
- `npm run build`: pass; existing large-chunk advisory remains.
- Runtime and contract checks recorded below after completion.

### Browser verification (headless Chrome, 1280×800)

- Default view: follow. Raycast identities: cabin, workshop, and cleanup sites; no helm.
- Exactly one reachable timber popup; its node ID is `home-driftwood` and label is Timber.
- Remote position: zero visible pickup popups. Reachable pearl bed: one Covered popup.
- Explicit target gather delivers exactly the node's authored reward.
- Successful build immediately returns active/progress 0; at 80 visual frames progress is 0.4444; after completion active is false/progress 1 while domain state remains frozen.
- Reduced motion completes within 22 frames at 60 Hz (0.367 seconds).
- No browser page errors. Scene disposal succeeds.
- Source search confirms no helm, legacy pickup marker/pole, distance-arrow, or instructional pickup-label code remains in scene.js.

Captures: `captures/fourth-improvement/scene-pickup.png`, `scene-waterwheel-mid.png`, and `scene-waterwheel-ready.png`. Inspected pickup and assembly captures: compact legible popup, recognizable timber icon, original raft/world preserved, actual wheel components visible during assembly.

Ampere (`01a11ece-334b-7830-9910-40dc9ae57228`) received the integration contract directly. Browser checks exercised the scene independently of the concurrent main/index/CSS integration.

## Final follow-up / QA freeze

- Integrated Hume's shared `createCharacterArt` for the deck explorer and legacy world swimmer. Original GLB Explorer is hidden, including on the visitor clone. New deck waist uses the authored placement plus the feet-to-waist offset; greeting remains articulated. The swimmer uses crawl/kicks while moving and eases upright on release without moving authoritative coordinates.
- Rigid sibling meshes are merged by material inside each articulated group. Shoulder, elbow, hip, knee, head, and body pivots remain intact. Orphaned source geometries are disposed; remaining resources use normal scene teardown.
- Generalized the assembly to waterwheel, crane, greenhouse, sail, and beacon. Same duration/status API; `id` now reports the actual upgrade. Each upgrade's authored meshes assemble, with light/sparks centered on that upgrade. Waterwheel acceleration is restricted to its own presentation.
- Removed `cleanupCamera`, `setCleanupCamera`, and the comparison argument/stat. The underwater scene's single side-follow pose is used directly.
- Removed the large home anchorage ring. It was decoration, not an authoritative reach indicator.
- No production build run during this follow-up. Syntax checks passed. Isolated source fixture (`output/fourth-scene/preview.html`) and headless Chrome verified all five presentations reaching `{active:false,progress:1,id}`; no page errors; disposal succeeds. Close inspect frame: 203 draw calls, 171,898 triangles at 1280×800 (not a performance benchmark).
- Inspected `output/fourth-scene/deck-character.png`, `surface-crawl.png`, and `surface-tread.png`; all-upgrades capture is alongside them. New face/clothing match underwater character, prone-to-upright posture works, and giant anchorage ring is absent.

Scene files are ready for integration QA; no main/index/CSS changes were made by this owner.

### Final bounded atlas alignment

Pickup cards now draw the same painted wood/scrap/pearl art as inventory directly from `public/assets/ui-fourth/ocean-kit-atlas.png`, using each resource's source rectangle from `manifest.json`. The atlas is asynchronously decoded once per scene before scene allocation and readiness. No image processing or atlas changes. Card sizing (80px), labels, reach/selection and motion are unchanged. Syntax check passes; no production build run. Scene frozen again for QA.
