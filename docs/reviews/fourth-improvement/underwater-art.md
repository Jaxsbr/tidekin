# Fourth improvement: underwater art and motion

Owned source: `src/cleanup-scene.js`, `assets/cleanup/reef-art.js`, and new `src/character-art.js`. No production build or baseline files changed. The workshop quality guide and both supplied screenshots were inspected before implementation.

## Character

An original procedural 3D character replaces the cloned, rotated surface figure. It has a tapered shirt, overlapping collar, seam/buttons, belt/buckle, shaped shorts and cuffs, rounded limbs, elbow/knee pivots, individual fingers and thumbs, a projected nose/jaw, ears, visible eyes inside bronze goggle rims, swept crown/temple locks, and a scarf. Swim yaw turns the actual three-dimensional face into profile; torso inclination and articulated limb strokes are independent.

`createCharacterArt(THREE)` returns `{root, body, head, arms, legs, animate}`. Local +Y points toward the crown, +Z faces forward, and the root is the waist. Surface scene reuse can import this directly; geometries/materials are owned by the returned tree and can be disposed by the normal scene resource traversal. `animate({dt, moving, surface, facing, vertical, working, progress, reducedMotion, reset})` uses facing ±1 and vertical pitch in radians. It does not own world position or gameplay.

Propulsion eases into prone posture, alternating arm sweeps and delayed knee kicks. Surface propulsion uses wider crawl strokes with flattened wake rings and a trailing bubble stream. Releasing movement eases upright over roughly a second while hands scull and knees tread. Reduced motion freezes secondary cycles and suppresses wake/bubbles while retaining pose readability. All basket, tether, brush, and comparison presentation code is removed. Pull completion contracts the item toward the player and removes it.

## Landscape and camera

The seabed sits around eighteen metres and extends beyond ±28. Target supports derive their height from authoritative coordinates; broad stepped limestone buttresses connect each target sill to the seabed. Coral, rooted plants, sandstone layers, distant ridgelines, fish and world-space depth layers establish exploration scale and parallax. The water gradient darkens downward and character lighting attenuates with depth.

`cameraPose(aspect)` keeps a local view at a fixed readable scale, with modest portrait adjustment. Update tracks player position with exponential easing, a small deadzone and bounded velocity lookahead. Near the surface, the waterline remains in frame; deeper views retain downward lighting and layered silhouettes rather than zooming out to show the whole world. Host integration must apply the pose every frame after `update`, not only on entry.

Scene API is unchanged: `{scene, root, update, cameraPose, pick, getStats, dispose}`. Projection and picking both use the caller's actual camera and the authoritative Z=0 target plane. Rendering never mutates domain state. Domain changes appearing concurrently now supply the requested ±28 / depth18 bounds and starter positions; this work does not edit `cleanup.js`.

## Verification and integration notes

- JavaScript syntax checks passed for all three owned modules.
- Direct Three.js checks passed for state immutability, swimmer visibility at both deep domain edges in landscape/portrait, projection-to-pick round trips for all targets after scrolling, and repeat disposal.
- Isolated source preview rendered in installed Chrome with no page errors. Inspected character close-up, propulsion and released/treading captures. Fixed old-height floating plant clusters found during inspection.
- Preview and captures: `output/fourth-underwater/`. This is an isolated art fixture, not the production build.
- Actual buoyant world displacement belongs to the domain owner. This scene returns the posture upright and tolerates gentle upward drift (<.75 units/sec) without treating drift as propulsion. PM clarified that prone/profile swimming with upright pose recovery is sufficient; leave idle domain coordinates stationary and do not add drift. Do not add presentation-only translation, which would desynchronize reach/picking.
- Independent review should inspect surface stroke timing, pull reach at diagonals, and portrait HUD clearance in the integrated app. The art fixture does not verify host input/UI integration.

Surface reuse handoff: sent the character API, coordinate convention, resource ownership and inspected close-up to Gauss (surface scene owner). Await integrated candidate/UI build before final cross-scene visual review.

## Final bounded background pass — frozen for candidate QA

Parent review found large plain supports and flat cyan across long views. Reef-only changes strengthen the vertical water gradient, replace two low ridges with three differently elevated vertex-shaded contour layers, and add sparse kelp/coral silhouettes rooted to those contours. All added silhouette details are merged into two static material batches. Sunshafts now fade at their sides and downward ends instead of displaying hard rectangular edges. Target buttresses receive baked vertex-color strata, with no extra wall draw calls. No labels, camera/API/domain changes, or production build.

Syntax and a 120-frame Three.js construction/update smoke check passed. Background enrichment adds only three net meshes to the reef (156 total mesh nodes, including existing articulated plants/fish); all new geometry is created once. Integrated candidate rendering remains the final visual QA gate.

Final entry/anatomy correction: camera seeds horizontal framing halfway toward the first uncollected target, capped at 2.8 metres; this bias fades as the player leaves the entry column or descends beyond three metres. No world-fit zoom or domain target change. Rendered waist uses a fixed −0.55 m Y offset in every pose, and swimmer stats report that rendered location. Target projection/picking and domain coordinates remain unchanged. Entry checks passed with both first target and swimmer visible at aspect ratios 0.75, 1 and 1.6. Parent owns moving the guide to a small bottom-left position. Source frozen for integrated QA.

## Generated panorama integration — source frozen

Coordinated with Anscombe to deliver the original generated image to `public/assets/ui-fourth/reef-panorama.png`. The renderer now loads that exact public URL once, uses sRGB color, preserves image aspect, and displays one panorama plane at Z=-10, behind all target/player geometry. A pale tint and 0.84 opacity blend it into the water; bounded world-space camera parallax is 8% horizontally and 2.5% vertically. The plane covers at least 100×40 world units so the expanded domain has no visible texture edge. Existing 3D foreground, target supports, fish and plants remain authoritative visual interaction objects.

The plane stays hidden until the texture loads; procedural art remains the error/loading fallback. Disposal now includes owned textures, and a late image callback checks geometry disposal before revealing the plane. No per-frame geometry/material creation. One added draw call when loaded. Syntax plus construction/disposal checks passed; generated file delivery and integrated visual review remain pending at this source freeze. No reference image is copied into game assets; no production build run.

Asset delivery confirmed: Anscombe supplied the original generated opaque 1536×1024 (3:2) panorama at the integrated path, with prompt/provenance under `assets/ui-fourth/`. At this ratio the renderer sizes the plane to 100×66.67 world units without stretching. Delivery is no longer pending; integrated opacity/composition review remains the final gate.

## Last source-only staging pass

Supersedes earlier fixed waist-offset notes: anatomical offset now follows the character's already-eased torso inclination, from −0.85 m upright to −0.2 m prone. Surface camera air margin increases from 1.35 to 2.1 m, putting the waterline lower on screen and leaving more HUD clearance without changing domain coordinates. `getStats` uses the actual rendered waist. Upright placement is an approximate anatomical choice pending integrated visual QA, not a claimed render verification.

Target buttresses and their boulders are narrowed 40%; deep supports have eroded openings, thinner separated rock strata, and one merged moss/branch batch each. The target-top sill stays in its authoritative location. One opaque vertex-gradient air plane begins at world Y=0 and sits in front of panorama/ridges but behind character and waterline, preventing underwater artwork appearing in the sky.

Syntax, entry visibility/state-isolation checks, support construction and exact air boundary checks passed. No production build or production runtime changes. Source frozen for the queued rebuild and final visual review.
