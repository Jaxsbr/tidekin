> Current contract (fourth improvement, 9 October 2026): always-controllable third-person sailing; directional swimming + pointer pull at 2.2 m/s; no comparison, practice, helm or trailing basket. Painted UI and wider/deeper reef replace the earlier presentation. Earlier dated sections below are historical. See `reviews/fourth-improvement/plan.md` and README for current behavior.

# Tidekin — art, interface, and motion direction

The visual promise is **a little home worth caring for, afloat in an enormous living ocean**. The supplied [`ocean-workshop.png`](../assets/reference/ocean-workshop.png) is the primary visual reference. These assets translate its warm, hand-built raft and tropical limestone setting into readable, economical real-time geometry. They do not attempt to reproduce the painting's wave simulation, photographic microdetail, or elaborate character expressions.

## What to take from the reference

| Evidence in the image | Concrete game treatment | Avoid |
| --- | --- | --- |
| Honey-colored logs, broad planks, visible endgrain, lashed posts | Rounded flotation logs; individually edged boards; offset seams; pale log ends; selective rope wraps at real connections | A flat brown box, identical unbroken slabs, sharp industrial edges |
| Small cabin underneath a soft cream canopy | A compact, welcoming cabin with a large round amber window; larger sail silhouette above it | A rectangular white house, oversized roof obscuring every deck activity |
| Orange swallowtail and loose hanging pennants | Coral-orange flags against cream and ocean teal; one simple shell spiral insignia | Several equally bright competing accent colors |
| Large side waterwheel and luminous shell mechanism | Functional radial spokes, broad paddles, visible axle; a continuous ridged spiral shell and metal nozzle | Random gears without connections; a sphere standing in for a shell |
| Planted rooftop, overflowing pots, little glasshouse | Clustered broad leaves with midribs, a few warm fruits, delicate greenhouse frame | Uniform green cones; fully opaque greenhouse walls |
| White limestone spires and small palm-covered beaches | Asymmetric tapered karst, broken ledges, sun-facing chalk planes, moss caps, feathered curved palms | Gray low-poly pyramids, stacked circular tiers, evenly spaced palms |
| Child and dog sharing an adventure | Small, approachable, toy-like navigator and dog with readable poses | Realistic anatomy that looks uncanny at game distance |
| Brilliant turquoise water, ivory foam, warm directional light | Ocean is the largest color field; thin ivory foam; warm key and cool sky fill | Black ambient shadows, neon cyan, full-screen bloom |

## Shapes and composition

Use three detail scales. Primary masses are raft, cabin, sail, wheel, shell, and island cliffs. Secondary shapes are railings, spars, window rims, greenhouse frames, palm crowns, and rock terraces. Tertiary marks are lashings, board pegs, pot rims, barrel hoops, and fruit. At the normal play camera, primary masses must read first and secondary shapes must remain distinct; tertiary details may disappear gracefully.

The raft deck is **7 × 9 world units**. Its center is `(0, 0, 0)` in exported glTF horizontal coordinates; `Y = 0` is the waterline, not the top of the deck. The deck top is approximately `Y = 0.76`. Bow points toward **glTF +Z**; starboard is **+X**. The left wheel intentionally extends beyond the nominal deck footprint. The shallow hull sits through the waterline and the wheel dips below it. Do not move the complete asset upwards to put its minimum bound at zero.

Cabin and canopy favor the aft/port side, leaving the bow usable. The shell and greenhouse balance the wheel. Preserve visible air around the wheel, cabin window, shell opening, and navigable bow. The crane is compact and aft; the beacon occupies one corner. Upgrades can be hidden as whole subtrees so the beginning raft feels modest. The fully visible asset is the developed workshop shown for art review.

Island beach radius is approximately **9 units** with a roughly elliptical footprint. Cliffs form an asymmetric high rear cluster with a lower sandy foreground, rather than a solid mountain in the middle of a disk. Most beach content stays inside a seven-unit central region. The dock indicates an approach; it does not imply a collision or salvage layout. Gameplay target locations, visual island offsets, and collision geometry remain the renderer's responsibility. Positioning visible islands about 16 units behind gameplay targets can leave a useful open bay.

## Modeling and material rules

- Broad timber edges use single-segment bevels: deck boards around 0.035 units, rail caps around 0.025, larger supports around 0.05–0.075. Preserve flat board faces and broad highlights. Tiny bevels that cannot be seen are wasted geometry.
- Logs have 10-sided cross sections and slight radius/length variation. Ends show a small number of readable growth rings. Do not model bark as noisy displacement.
- Rope uses economical polygon tubes. Concentrate it at rigging corners, post bindings, engine connections, and bow cargo net. No dense rope texture is necessary.
- Use radial rims and spokes for wheels. Every paddle belongs to the same rotating axle subtree. Preserve the actual central pivot when batching.
- The conch is one smoothly shaded expanding spiral with subtly ribbed cross sections and two pearl colors. It must read as a coiled shell at thumbnail size.
- Sail geometry contains the billow and broad seams. Use two-sided canvas, few polygons, and an irregular silhouette. Do not use expensive cloth simulation during play.
- Leaves have a raised midrib and two colored planes. Palms use tapered curved trunks and feathered fronds with real silhouette gaps.
- Rock facets are intentional planes, varied ledges, and vertical taper. Combine limestone, chalk, and muted shadow faces. Moss should follow upper ledges, never coat the entire cliff green.
- Standard metallic/roughness materials, no external textures, no generated-image dependency, no runtime procedural shaders required. Most materials are opaque. Only greenhouse panes use low-alpha blending; keep them out of distant island assets.
- Paint and wood are matte. Brass catches broad highlights, not mirror reflections. The shell is smoother than timber but never chrome. Emission belongs to window and lantern glass only.

### Palette

The hex values below are sRGB authoring colors. The Blender script converts them to linear material inputs before exporting.

| Role | Color | Use |
| --- | --- | --- |
| Ocean deep | `#237D90` | Water depth and large background regions |
| Ocean sunlit | `#63C5CA` | Shallows, water edge, restrained interactive accents |
| Deep ink | `#233E44` | Text, deepest creases, shell nozzle |
| Cedar | `#AF673D` | Timber warmth, barrel variation |
| Honey | `#C98C50` | Main wood |
| Sunwood | `#E0AE6D` | Board faces, cuts, warm highlights |
| Dark wood | `#624737` | Joins, recesses, support contrast |
| Canvas / UI paper | `#FFF0C3` | Sail, paper panels, clothing |
| Rope | `#D9BD86` | Lashings and light frames |
| Coral | `#E9713F` | Pennants, selected actions, terracotta |
| Patina | `#39787B` | Small metal parts and restrained teal accents |
| Brass | `#D9A547` | Window fasteners, engine, hardware |
| Amber light | `#FFD070` | Window and beacon glow |
| Foliage | `#285A44` / `#548B42` / `#96B951` | Dark interiors, main leaves, sun planes |
| Sand | `#EFD29C` | Beach and neutral warm ground |
| Limestone | `#B7B9A2` / `#DFD7B7` / `#829A91` | Cliff body, sun planes, cool recesses |

World color hierarchy: ocean dominates; timber and sand are the main warm masses; orange and emitted gold are small focal accents. Keep large UI panels off the raft silhouette.

## Interface direction

The UI should feel like a navigator's small field kit: cream cards, dark teal ink, warm timber hardware cues, and a few coral cloth tabs. It should be calm enough to let the workshop and sea carry the scene.

- **Layout:** keep the center and forward travel direction clear. Put compact resource chips at the top edge, a small contextual objective near a corner, and a single build/action tray along the bottom. A build detail card may expand beside that tray. Do not surround the play view with permanent panels.
- **Typography:** rounded humanist sans-serif for labels and quantities; semibold for actions; normal sentence case. Use the project's available font. Suggested sizes: 14–16 px secondary labels, 16–18 px body, 22–28 px short headings. Numbers should align and remain stable as totals change.
- **Panels:** cream surface, warm sand border, 12–18 px corner radius, slight offset shadow in translucent deep teal. A tiny folded tab or rope divider is enough decoration. Avoid wood textures behind text, thick black strokes, bevel-heavy skeuomorphism, and translucent glass panels over busy water.
- **Buttons:** 44 px minimum touch target; one clear verb plus optional cost. Primary action uses dark teal with cream text. Coral marks selection, new construction, or a celebratory badge. Do not use cream text on bright orange without validating contrast.
- **Icons:** rounded strokes with filled silhouettes: plank, leaf, shell, compass, hook, and lantern. Keep the icon family consistent. Resource amounts require both icon and number; disabled and unavailable states require shape/text cues as well as color.
- **Build cards:** show an illustration or clean silhouette, name, one useful benefit, exact resource cost, and action. During placement show a footprint and valid/invalid cue. After success, reveal the relevant `Upgrade_*` subtree and update resource counts together.
- **Feedback:** costs that cannot be paid stay legible, with the missing amount stated. Loading indicates work in progress. Failure leaves the previous usable state intact and offers a concise retry. Never silently replace a failed model with an unrelated box.
- **Legibility:** target 4.5:1 contrast for normal text and 3:1 for large text / essential control graphics. Ocean color changes and bloom must not affect text contrast. At 375 px viewport width, all primary actions remain reachable and readable without truncating essential amounts.

## Motion direction

Motion should suggest weight, wind, and buoyancy. Most of the screen must remain quiet. Use independent phases instead of moving every prop in synchrony.

| Element | Treatment | Suggested range |
| --- | --- | --- |
| Whole raft | Slow buoyancy on its root around the waterline | Vertical ±0.045–0.08 units; pitch ±0.7°; roll ±1.0°; periods 4–7 s |
| `Wheel` | Continuous, linear rotation about **local X** | Approximately 0.35–0.8 rad/s while powered; ease to rest over 0.6 s |
| `Engine_Flywheel` | Continuous rotation about **local Z in glTF** | 1.5–2.5 rad/s; its Blender source axle is Y |
| `Pennant_Main` | Small swivel at mast attachment | Local Y yaw ±3° at 1–1.6 Hz; no huge rigid sweeps |
| Cream sail | Built-in billow is sufficient; optional shader displacement later | At most 0.02–0.05 units, pinned edges; never scale the whole rig rhythmically |
| `Dog_Tail` | Occasional light wag about local Y | ±12°, 2–3 Hz for a short greeting; long idle pauses |
| `Crane_Boom` | Rotate about local Z at the kingpost pivot when lifting | Small purposeful arcs; keep cable/hook placement coherent |
| `Crane_Hook` | Static in this delivery; optional local Y lift/lower with cable adjustment | Any motion must also retension the attached line so its top remains at the pulley |
| Upgrade reveal | Brief settling motion on the exact upgrade subtree | 350–500 ms; ease-out from 96% to 100% scale; tiny dust/spark accent |
| Buttons / resource changes | Prompt, small feedback with stable layout | Press 90–120 ms; card 180–240 ms; quantity tick 200–300 ms |
| Island palms | Static by default, optional vertex sway for nearby instances | Tips only, below 0.08 units; no whole-island bob |

Reduced-motion mode should remove raft camera coupling, idle bob, pennant wag, reveal overshoot, and decorative particles. Keep wheel movement slow or stopped and preserve only state changes needed to understand play. Never pulse the entire scene or move text continuously.

No animation clips are baked into these GLBs. Named articulated nodes allow the renderer to drive motion without an animation mixer. Reset each node to its imported rest transform before applying procedural offsets; do not overwrite imported pivot translations.

## Asset delivery and integration contract

Run the executable build script using the installed Blender:

```sh
cd /Users/jacobusbrink/Jaxs/projects/tidekin
/opt/homebrew/bin/blender --background --factory-startup --python-exit-code 1 --python scripts/build_assets.py
# Rebuild one asset without a preview:
/opt/homebrew/bin/blender --background --factory-startup --python-exit-code 1 --python scripts/build_assets.py -- --only island --no-render
```

| File | Purpose |
| --- | --- |
| `scripts/build_assets.py` | Deterministic Blender geometry, materials, batching, export, and art-preview build; seed 47 |
| `assets/workshop.blend` | Editable individual raft objects, bevel modifiers, source hierarchy, review lights/camera |
| `assets/island.blend` | Editable terrain, rock, foliage, dock, and review lights/camera |
| `public/assets/workshop.glb` | Real glTF 2.0 binary export; all upgrades present and visible |
| `public/assets/island.glb` | Real glTF 2.0 binary export; all static material batches merged |
| `assets/previews/workshop.png`, `assets/previews/island.png` | Native Blender renders for visual QA |
| `assets/previews/workshop-export.png`, `assets/previews/island-export.png` | Renders after re-importing the actual GLBs into fresh Blender scenes |
| `assets/previews/workshop-starter.png` | Exported raft with all five upgrade subtrees hidden; checked for floating upgrade leftovers |
| `assets/asset-manifest.json` | Actual export bytes, triangles, primitives/material draws, named roots, and glTF-space evaluated bounds |
| `assets/export-validation.json` | Fresh-import verification, independent explorer descendants, upgrade membership, and root orientation |

Blender source is Z-up; GLBs are **Y-up**, with one source meter equal to one world unit. The exported scene has one root (`Workshop` or `Island`) with **identity rotation, zero translation, and unit scale**. Three.js `gltf.scene.rotation` should remain `(0, 0, 0)`; do not add an X-axis −90° correction. Node coordinates and vertex data have already been converted by Blender's glTF exporter. Review lights, camera, ocean plane, and background are omitted from exports. The meshes do not include an ocean. Retain the root at the waterline and apply scene placement to the complete root.

### Toggle and animation hierarchy

| Root / node | Purpose | Rest pivot in exported glTF XYZ |
| --- | --- | --- |
| `Workshop` | Placement and whole-raft buoyancy | `(0, 0, 0)` |
| `Workshop_Static` | Batched always-visible hull, cabin, engine housing, deck contents and dog body | `(0, 0, 0)` |
| `Explorer` → `Explorer_Geometry` plus four limb pivots | Independent complete character subtree; hide on deck while diving, clone for swimmer | `(-0.90, 0.77, 1.75)` |
| `Upgrade_waterwheel` → `Wheel` | Reveal complete wheel; rotate child on local X | Wheel: `(-3.98, 0.74, 0.25)` |
| `Upgrade_crane` → `Crane_Boom`, `Crane_Hook` | Reveal crane; drive articulated parts independently | Boom: `(2.78, 3.30, -3.77)`; hook: `(4.10, 2.47, -3.77)` |
| `Upgrade_greenhouse` | Reveal raised planter, glass, frame, and enclosed plants together | `(0, 0, 0)` |
| `Upgrade_sail` → `Pennant_Main` | Reveal mast, stays, canvas, and signal flags together | Main flag: `(0.20, 7.20, -2.80)` |
| `Upgrade_beacon` | Reveal corner beacon and its post together | `(0, 0, 0)` |
| `Engine_Flywheel` | Independent small brass engine wheel; rotate local Z | `(0.28, 1.60, 3.42)` |
| `Dog_Tail` | Optional independent greeting motion | `(0.50, 1.27, 1.71)` |
| `Island` → `Island_Static` | Place island; one mesh with one primitive per used material | `(0, 0, 0)` |

Use an exact-name lookup such as `getObjectByName('Upgrade_greenhouse')` and change its visibility. Geometry descendants have `_Geometry` suffixes. Source-only organizational empties may also appear in the GLB; they carry no render cost. No material opacity trick is needed to hide an upgrade.

`Explorer` is not an empty marker: the exported `Explorer_Geometry` body mesh and four articulated limb subtrees are its descendants and are excluded from `Workshop_Static`. Clone this complete subtree for the swimmer, set the clone visible, and replace its root position with the desired world-space swimmer position after parenting it to the gameplay scene. Its local origin is at the feet and it faces glTF +Z. Beta 3 adds rigid shoulder/hip articulation; this is not a skinned rig and has no elbow or knee joints. Keep the original hidden on deck during a dive and keep the raft anchored independently. The exact beta 3 binding and bounds contract is below.

The animation nodes above have identity rest rotations. For example, `Wheel.rotation.x += dt * 0.55` rotates the large wheel around its own axle. `Engine_Flywheel.rotation.z -= dt * 2.0` rotates the small wheel in the direction corresponding to positive Blender Y. The sign can be reversed to suit travel direction; the axes cannot. Animate these named empty parents, not their `_Geometry` child transforms, which may retain a local mesh offset from batching.

### Geometry and rendering budget

Hard cap: **under 100,000 triangles for workshop plus one island**. Preferred target: under 40,000; if exceeded, preserve silhouette and the important articulation boundaries before retaining tiny detail. Counts parsed from the current GLB are authoritative. The shared manifest records the full-build baseline; the narrowly scoped beta 3 articulation update below supersedes its workshop mesh/draw/byte metadata.

The island is merged to one static mesh with one glTF primitive per material; target **8–15 material draws** per visible instance. The workshop merges static source objects together and batches within upgrade/moving boundaries, preserving the five reveal roots. Reuse cloned geometry/material resources when repeating islands; avoid reparsing separate GLB downloads per instance. The editable `.blend` deliberately retains separate objects for art iteration.

An island repeated 3 times nearby and 14 times at distance still multiplies triangle and draw counts. This template is the nearby art asset. For the far 14, prefer instanced simplified opaque cliff/beach/palm silhouettes or another low-detail mesh; do not render the full frond geometry and dock at a few pixels. Far instances should cast no dynamic shadows. The parent renderer owns that substitution and visibility policy.

The delivered build contains **41,976 workshop triangles + 17,778 island triangles = 59,754 total**, below the hard cap but above the preferred 40k target. The island has **13 material primitives in one mesh**; the beta 3 fully upgraded workshop has **79 primitives across 16 meshes**, including its independent explorer limbs and articulation/upgrade boundaries. Hidden upgrade subtrees incur no visible draws. This preserves the reference's wheel, shell, ropes, plants, and feathered palms; distant island substitution remains necessary for the repeated arrangement.

| Delivered asset | Full dimensions, glTF X × Y × Z | Bounds relative to waterline | Binary size |
| --- | --- | --- | --- |
| Workshop, every upgrade visible | `9.094 × 8.450 × 9.230` | Y −0.900 to +7.550; deck footprint 7 × 9 | 1,427,024 bytes |
| Island | `18.455 × 9.677 × 14.371` | Y −0.400 to +9.277; beach approximately 9-unit radius | 782,572 bytes |

Both delivered GLBs passed a fresh Blender import and were rendered again for comparison with the source scenes. Counts matched, every upgrade had mesh descendants, `Explorer_Geometry` remained exclusively below `Explorer`, roots retained identity rotation, and there were no external buffers, textures, cameras, or baked animation clips. The hidden-upgrade starting raft was also rendered and inspected. Runtime reference fidelity, repeated-island profiling, and UI/motion acceptance remain part of the parent renderer's separate review.

## Quality rubric

Score each row 0–4: **0 missing, 1 placeholder, 2 functional, 3 production-ready stylized, 4 exceptional reference match**. Accept at least **26/32**, with no row below 3 and all technical gates passing. Judge both a full-resolution art review and the actual gameplay camera. The rubric is an acceptance tool, not a claim that this first asset pass has automatically achieved a score.

| Criterion | A score of 3 requires | Common rejection |
| --- | --- | --- |
| Primary silhouette | Wheel, canopy, cabin, shell, and planted workshop are distinguishable at 320 px; island has asymmetry and an obvious landing side | Box raft, featureless shell, uniform triangular peaks |
| Reference character | Warm sunlit timber, cream canvas, coral flags, pearl shell, lush plants, pale tropical cliffs, and a friendly scale relationship | Generic gray survival props or dark pirate aesthetic |
| Modeling craft | Bevel highlights, real plank seams, radial wheel construction, ridged shell, leaf silhouettes, purposeful irregularity | Coplanar flicker, intersecting focal shapes, hidden wheel paddles |
| Material hierarchy | Matte wood, modest metal glints, restrained emission, transparent greenhouse, readable dark recesses | Metallic timber, blown-out cream, black shadow blobs, glass sorting dominating the scene |
| Composition | Aft cabin leaves bow activity visible; sail and rigging preserve focal breathing room; islands leave navigable water | Clutter covering window/hero/shell; every feature equally large |
| UI clarity | Stable amounts, one primary action, coherent field-kit styling, contrast and 44 px targets | Tiny labels, ornamental texture behind text, ambiguous affordability |
| Motion quality | Correct axle, calm buoyancy, independently phased accents, clear build reveal, reduced-motion path | Wheel orbiting its parent, frantic sway, synchronized breathing props |
| Runtime discipline | Hard geometry cap passes; island draw target passes; movable and upgrade roots survive batching; waterline and axes are verified | Per-leaf objects in GLB, exported preview stage, missing buffers, arbitrary origin offsets |

### Technical and visual review gates

1. Open each exported GLB in a fresh scene and verify it contains actual mesh data, standard materials, and no external dependencies. Confirm import bounds and expected root names. The build also parses the GLB headers and counts triangle indices.
2. Check all five upgrade roots independently. Hiding one must hide every part of that upgrade while leaving the base raft intact. Check `Wheel` rotates about its own local X axle rather than orbiting the origin.
3. Compare the exported render against the editable source view. Check backfaces, glass, the shell spiral, sail faces, deck seams, and the palms at normal game distance.
4. Inspect the native Blender previews at full size and thumbnail size. Reject conspicuous intersections, visual tangles at the window, floating props, and clipped silhouette details. Inspect a rear view when changing layout.
5. Read actual counts from `assets/asset-manifest.json`. Confirm total <100k and island ≤15 material primitives. Do not estimate by Blender object count or pre-bevel polygon count.
6. In the renderer, verify the real GLBs load before revealing the play scene, profile the repeated-island arrangement, and test mobile framing plus reduced motion. Those runtime checks belong to the application integration pass and cannot be inferred from an offline render.

## Distant limestone landmarks — beta 2 critique response

The independent beta 2 review identified the distant landscape as the weakest remaining shape language: a regular torus arch and tapered, flat-capped pillars. The replacement is an original Blender-authored family of three economical silhouettes. The arch has unequal eroded buttresses and five independently outlined broken span fragments; the stacks have different heights, leaning fins, undercuts, and discontinuous ledges; the ridge has interlocking weathered masses with an uneven skyline. Vegetation forms irregular shrub clusters, hanging patches, and wind-combed palms rather than planar green caps. Three limestone colors, two foliage colors, and one trunk color keep the whole family coherent with the existing workshop and near island.

| Cloneable group | Full dimensions X × Y × Z, world units | Height above Y=0 | Triangles | Material primitives |
| --- | --- | --- | ---: | ---: |
| `Landmark_Arch` | `24.845 × 23.725 × 7.038` | 23.075 | 3,392 | 6 |
| `Landmark_Stacks` | `18.651 × 23.718 × 6.930` | 23.068 | 3,628 | 6 |
| `Landmark_Ridge` | `30.008 × 23.471 × 8.371` | 22.821 | 6,580 | 6 |

**13,600 triangles total; 848,304-byte GLB.** Each group contains exactly one merged mesh, named `<group>_Geometry`, with one primitive per material. All materials are opaque and shared across groups. No textures, baked animation, ocean, lights, or review camera are exported. Each mesh extends to Y=−0.65 for a reliable water intersection.

The glTF hierarchy is `Landmarks` → `Landmark_Arch`, `Landmark_Stacks`, `Landmark_Ridge`. The parent and each child have zero translation, identity rotation, and unit scale. **Each individual group's horizontal bounds are centered on its own origin; all three intentionally overlap in the export until placed.** Clone the desired named child into the world, position it at waterline Y=0, and rotate it about Y as needed. Do not display the entire unplaced `Landmarks` root or apply a Z-up correction. The arch's opening lies primarily in the XY plane and reads best from glTF +Z; modest oblique views reveal depth, while an edge-on view naturally hides the opening.

Use the arch sparingly as an offset landmark, rather than aligning its opening with a nearer central peak. Alternate the low-wide ridge and separated stacks across depth layers. These distant assets do not require broad sand disks or perfect circular shoreline rings. Apply cooler, lower-contrast atmospheric treatment through the renderer. Clone material instances before any per-instance color edits so shared material changes do not affect every landmark. The supplied meshes are static; no new gameplay mechanics are introduced.

Rebuild only this asset family:

```sh
/opt/homebrew/bin/blender --background --factory-startup --python-exit-code 1 --python scripts/build_landmarks.py
```

- `scripts/build_landmarks.py` owns generation, per-group batching, budget/origin validation, export, and the review render. It imports only reusable helper functions from `build_assets.py`; it does not invoke the workshop/island build.
- `assets/landmarks.blend` retains individually editable crags, span fragments, shrubs, and palms in the **Assets — origin-centered cloneable groups** scene. The **Presentation — linked review layout** scene arranges linked copies side by side for review; its offsets are not in the GLB.
- `public/assets/landmarks.glb` is the real Blender glTF export, ready for renderer integration.
- `assets/previews/landmarks.png` is the inspected native render, arranged left-to-right as arch, stacks, ridge.

Validation completed: actual export indices counted; all three groups are at their own origin; each has six material primitives; combined triangles are below 15k; a fresh Blender import preserves the named groups and their mesh descendants. The final render was inspected for distinct silhouettes, readable negative space, and foliage. SHA-256 checks confirm the existing workshop/island `.glb` and `.blend` files were unchanged. Runtime scenery integration and the independent rescore remain the parent's next pass.

## Beta 3 — explorer shoulder and hip articulation

The existing explorer meshes are now separated into four rigid limb groups beneath `Explorer`. No geometry or materials were added, and the greeting rest pose is unchanged. `Explorer_Geometry` retains the head, torso, neckerchief, strap, and satchel. Each limb pivot has exactly one `<pivot>_Geometry` child and is preserved as a separate export batch. Clone/hide the entire `Explorer` subtree, not just its body mesh.

| Direct child of `Explorer` | Pivot XYZ relative to Explorer, glTF units | Attached geometry | Rest Euler XYZ / quaternion XYZW |
| --- | --- | --- | --- |
| `Explorer_Arm_L` | `(-0.26, 1.30, 0)` | Existing left sleeve and forearm | `(0,0,0)` / `(0,0,0,1)` |
| `Explorer_Arm_R` | `(+0.26, 1.30, 0)` | Existing right sleeve, forearm, and waving mitten | `(0,0,0)` / `(0,0,0,1)` |
| `Explorer_Leg_L` | `(-0.16, 0.85, 0)` | Existing left shorts, calf, and boot | `(0,0,0)` / `(0,0,0,1)` |
| `Explorer_Leg_R` | `(+0.16, 0.85, 0)` | Existing right shorts, calf, and boot | `(0,0,0)` / `(0,0,0,1)` |

L means the negative-X side; R means positive X. Every pivot uses **local X for fore/aft swing, Y for twist, Z for sideways sweep**. Rotate these named parents. Their geometry children retain batching transforms and must not have their rotations/translations reset. The raised right-arm pose is modeled into its geometry, so an identity right-arm pivot still means a raised greeting arm.

The parent's reported bindings match the export: gentle right-arm X motion on deck; swimming with root X = **1.18 radians**, left arm Z = **+0.12**, right arm Z = **−2.1**, opposing arm X strokes of **±0.85**, and opposing leg X kicks of **±0.34**. Use radians and XYZ Euler order. The right-arm Z offset brings its original greeting pose into the swim posture. For a sinusoidal phase `s`, the checked assignments are:

```text
Explorer_Arm_L.rotation = (+0.85*s, 0, +0.12)
Explorer_Arm_R.rotation = (-0.85*s, 0, -2.10)
Explorer_Leg_L.rotation = (+0.34*s, 0,  0)
Explorer_Leg_R.rotation = (-0.34*s, 0,  0)
```

Apply the 1.18-radian swim pitch and travel heading to the cloned Explorer root; preserve the original deck root at `(-0.90, 0.77, 1.75)`. Reduced motion holds a static pose rather than accumulating rotation. No animation clips, skinning, or application code are supplied in this art revision.

### Verified character bounds

Coordinates below are XYZ, relative to the Explorer foot-origin. The swim envelope samples **129 phases** of the parent's exact bindings above; add **0.02 units of padding** for culling rather than treating this sampled bound as an analytic collision surface. World translation and heading yaw must be applied after these bounds.

| Pose / space | Minimum XYZ | Maximum XYZ |
| --- | --- | --- |
| Original greeting rest, Explorer-local | `(-0.5024, -0.0100, -0.3400)` | `(0.6556, 2.1340, 0.3168)` |
| Full sampled swim cycle, Explorer-local before root pitch | `(-0.4880, -0.0147, -0.4606)` | `(0.6534, 2.1340, 0.5341)` |
| Same cycle after root X=1.18, heading zero, before world translation | `(-0.4880, -0.4136, -0.0689)` | `(0.6534, 1.0119, 2.0550)` |

### Delivery, cost, and provenance

The final workshop is **41,976 triangles**, **19 shared materials**, **16 meshes**, and **79 material primitives**, with a **1,427,024-byte GLB**. Relative to beta 2 this is **zero additional triangles or materials, four additional meshes, ten additional material draws, and 5,496 additional bytes**. All workshop dimensions, waterline, upgrade root names, `Wheel` local-X axis, and `Engine_Flywheel` local-Z axis are preserved.

Generation used installed **Blender 5.1.2**, with the existing geometry functions and explicit world-preserving reparenting. Fresh GLB import verified four pivot descendants, identity rest rotations, all upgrade/motion roots, and triangle counts. A bidirectional nearest-vertex comparison between old and new full-workshop exports found a maximum rest-position difference of **3.5763 × 10⁻⁷ world units**, consistent with export floating-point rounding. The inspected [pose study](../assets/previews/explorer-articulation.png) shows the original greeting and two alternating articulated poses; those illustrative study poses are slightly wider than the final parent amplitudes tabulated above. The complete workshop and fresh-import preview were also updated.

Only `scripts/build_assets.py`, `assets/workshop.blend`, `public/assets/workshop.glb`, workshop/character previews, and this art document were revised. The narrow build used `--only workshop --no-manifest`; the shared asset manifest and previous validation JSON remain historical full-build records. SHA-256 checks confirm the island and landmark GLBs and Blender sources are unchanged. No application scene code was edited.

```sh
/opt/homebrew/bin/blender --background --factory-startup --python-exit-code 1 --python scripts/build_assets.py -- --only workshop --no-manifest
```

Final workshop GLB SHA-256: `20b2323fc211c83c4a7cd053238fe2f193b7fec9e1c62b39f170cd203564e561`.

## Second improvement — snorkel cleanup and useful raft spaces

The original title illustration, workshop, islands and landmarks are preserved. Title presentation now uses a restrained slow image drift with a reduced-motion still alternative. The opening keeps the world visible and moves the map/journal/workshop detail behind deliberate access.

The separate Home Reef scene uses the same cream/coral/turquoise palette and existing articulated Explorer. New editable geometry supplies face goggles and a bent snorkel, six recognizable trash silhouettes, a cream collection sack with visible contents, a curved waist tether, layered limestone/sand/coral and fish. No fins or scuba tank were added. The affected tint is local and behind the swimmer; successful restoration fades it and brings more fish into the patch. Trash transfer and bag fill are derived from authoritative attempt progress.

Editable sources are `src/cleanup-scene.js` and `assets/cleanup/reef-art.js`. They are original procedural Three.js geometry, not a flattened image or a newly claimed Blender export. Existing Blender sources remain editable and unchanged. See [asset provenance](reviews/second-improvement/asset-provenance.md) for ownership, staged previews, geometry/resource checks and limitations. Staged previews must not be described as earned cleanup play.

The ocean scene adds a small timber workbench with a paper plan and tool, semantic helm/door/bench hit volumes and an orange cleanup buoy. Anchored salvage has fixed-height tether/rock cues; floating salvage follows water height. A bounded acquisition effect moves material pieces toward the raft; the actual material credit remains domain-immediate.

The independent running-art review and final scorecard, rather than this direction document, determine acceptance. Camera alternatives and actual square/wide captures are retained with their tested fingerprints.

## Third player-improvement presentation

Original title pixels and Blender workshop/island/landmark sources are retained. Current UI uses compact bound-paper instruments, brass/coral accents, a single stitched action cue and optional Raft/Compare panels. Original vector sources live in `assets/ui/`; no external font/art dependency.

Both sailing cameras are retained for human comparison. First-person renders a small original bow/helm proxy while temporarily omitting shell/static geometry that would clip the eye; exact visibility is restored after rendering. Following view frames more navigable water, with target identity/access labels and camera-visible transfer. The outer current and both polluted cleanup buoys derive positions/state from the domain.

Underwater art is editable procedural Three.js, with the existing Explorer clone, travel-aligned orientation, articulated reach/strokes, net bag and recognizable contents. Pull and spatial-clean variants share geometry and local restoration identity. Independent actual-game review—not intention—governs readiness; see third-improvement reports for evidence and unresolved preferences.
