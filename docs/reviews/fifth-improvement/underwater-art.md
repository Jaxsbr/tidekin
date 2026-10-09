# Underwater art — fifth improvement checkpoint

Status: implementation handed back to the parent for final source gates and independent visual acceptance. The art specialist has stopped runtime edits. This report records implementation evidence and limits; it does not grant final visual approval.

## Scope and direction

The specialist owned `src/cleanup-scene.js`, `assets/cleanup/reef-art.js`, and three new helpers in `assets/cleanup/`: `underwater-models.js`, `underwater-fish.js`, and `underwater-landmarks.js`. No edits were made to `main.js`, `scene.js`, styling, index, domain code, or build configuration. No build was run by the specialist. All browser work used isolated temporary Chrome profiles against the parent's source preview on port 5182; those browsers were closed.

The starting references were the user's attached `image-2.png` and `image-3.png`, the retained fifth baseline, and the earlier coherent procedural capture `captures/third-improvement/design-review/refined-earned/home-reef-start.png`. They were inspected with the image viewer. The central problems were the painted-background/primitive-foreground mismatch, oversized target-support walls, repeated coral silhouettes, weak distance hierarchy, and a flat surface transition.

The review criteria remained normal playing-size composition, coherent modeled forms and materials, actual depth-separated geometry, visible site differences, readable collection approaches, natural discovery cues, and observable resident fish behavior. Geometry counts and passing tests were not treated as evidence of visual quality.

## What changed

- Removed the raster panorama from reef construction. The environment is modeled geometry with procedural material shading and atmospheric gradients; no new raster assets or ImageGen calls were needed.
- Added four real depth ranges: far massif, middle slope, habitat gardens, and sparse near framing. Broad connected slopes replace detached rear rock stacks. Distant forms receive stronger haze and less surface detail.
- Consume the domain's actual `seed`, `biome`, `terrain`, and bounds, with a site-ID fallback for standalone callers. Biomes affect primary composition: coral canyon, kelp banks, sand gullies, an eroded arch, shell colonies, and a curved damaged wreck. The parent explicitly assigned Home Reef to coral garden and Sheltered Cove to kelp forest during integration.
- Added rounded polyp colonies, curled plate coral, branching coral, lace sea fans, brain-coral ridges, anemone crowns, and kelp with slender stems and alternating small leaves. Colonies occur in mixed patches with clear water and sand between them.
- Replaced stacked target pillows with an attached sloping outcrop using the nearby domain seabed height. A small crest and attached growth preserve the object's approach and interaction plane.
- Replaced conspicuous regular caustic lines with faint warped cellular highlights. Added restrained mineral variation, richer near colonies, soft local directional shadows, and gradual blue-teal water/fog deepening. Shadow coverage follows the local camera rather than attempting to illuminate the whole domain at high resolution.
- Added a blue sky gradient, cloud light, hazy distant land, moving surface lip/reflection, contact ripples, and world-height submerged character tint. Surface geometry and contact ripples were brought close to the character's interaction depth to avoid perspective displacement.
- Retained the 42-degree camera and local exploration view. Vertical follow looks slightly farther down during descent, uses site bounds, and does not fit the entire dive map. Bubble trails rise from target habitats to suggest a descent direction without displaying a complete map; collected habitats stop emitting those trails.
- Fish reside around reef colonies and target habitats. Skittish fish flee nearby players, watch from a safer distance, and return home. Smaller calm fish follow briefly, then return with a cooldown. Home ranges remain bounded. Reduced motion freezes fish motion. QA metadata includes seed, biome, layer count, fish count, anchor count, and behavior-state counts.

## Iteration record and evidence

The first runnable candidate removed the mixed visual styles but failed composition: repeated squashed rocks looked like floating pillows, caustics resembled a grid, and far objects competed with nearby ones. Those findings came from actual surface/depth captures, not only source inspection.

The next passes replaced stacks with connected substrate and then biome-specific slopes, increased atmospheric separation, and diversified coral. Multi-site captures exposed additional failures: oversized flat kelp blades, an insufficiently recognizable fence-like wreck, overly faceted arch surfaces, bland terrain, and repeated target pillows. Subsequent changes rebuilt kelp as stems/leaves, modeled a curved hull with ribs and broken planking, swept a smooth stone vault, replaced target supports, and strengthened near framing and contact lighting.

Surface review also caught contact ripples projecting across the forehead because their Z differed from the waterline. Aligning their depth corrected that projection error. The parent subsequently diagnosed a separate anatomical offset issue, described below.

The specialist's final frozen multi-site checkpoint is:

- [Checkpoint metadata and renderer counts](../../../captures/fifth-improvement/art/checkpoint-reef/results.json)
- [Home surface](../../../captures/fifth-improvement/art/checkpoint-reef/home-surface.png)
- [Home mid-depth](../../../captures/fifth-improvement/art/checkpoint-reef/home-mid.png)
- [Home deep](../../../captures/fifth-improvement/art/checkpoint-reef/home-deep.png)
- [Home lateral](../../../captures/fifth-improvement/art/checkpoint-reef/home-lateral.png)
- [Kelp cove](../../../captures/fifth-improvement/art/checkpoint-reef/cove-deep.png)
- [Basalt/pearl site](../../../captures/fifth-improvement/art/checkpoint-reef/pearl-deep.png)
- [Wreck site](../../../captures/fifth-improvement/art/checkpoint-reef/wreck-deep.png)

These seven views use the parent's direct-scene renderer fixture at 1440×900, fixed camera/light/tone mapping, reduced motion, and zero delta. They are comparison fixtures, not earned gameplay or animation evidence. Earlier `art/iteration*` directories were used by both parent and specialist during concurrent review; their ordinal names are not a reliable cross-agent chronology. Prefer the named checkpoint and its recorded metadata when identifying this handoff.

The parent separately reported measured landmark shifts of approximately 112/153/362/595 pixels from far to near for a uniform five-metre movement. That corroborates actual parallax; this measurement was not performed by the specialist.

## Verification

- `node --test tests/fifth-fish.test.js tests/cleanup.test.js`: 15 tests passed. The parent-authored fish tests exercise actual position changes, safe distance/curiosity, bounded following, and return to anchors; the specialist did not duplicate them.
- A separate temporary CPU exercise observed all five fish states: home, flee, curious, follow, and return.
- Projecting and picking all seven targets across Home Reef, Sheltered Cove, and the home pearl site returned the correct target IDs. The interaction remains on Z=0.
- CPU disposal instrumentation verified release of 96 attached geometries, 79 materials, and two light-shadow objects at that checkpoint. Calling disposal twice was harmless. Static construction geometry is merged by material and its intermediate buffers released; replacing sites releases old art. This is not a substitute for a repeated GPU resource-plateau test.
- The final short actual-input browser smoke used a new voyage, surface entry, and descent. Console errors were empty. At 1440×900 it reported approximately 59.88 fps from median frame interval and 16.7 ms frame P95, with 271 draw calls and 797,372 triangles at the sampled depth. These are brief local observations, not an exclusive hardware performance gate.
- Frozen checkpoint renderer counts range from 123 to 265 calls and about 760,000 to 961,000 triangles. The kelp scene is the densest reviewed case. Fixture counts do not include the same shadow/rendering conditions as the host gameplay renderer and should not be compared as a benchmark.

## Parent correction after handoff

After the specialist held the checkpoint, the parent identified that idle root offset `-.85` plus the head's local center `.85` placed the water through the head center. The parent reports changing the idle pose to `-.58 + .38 * prone`, preserving the horizontal pose's `-.2` offset, and updating the stats fallback consistently. This anatomical correction is parent-owned and postdates the specialist checkpoint captures. The specialist made no runtime edits after the hold request and has not independently validated the parent's corrected surface capture.

## Remaining limits and acceptance

Independent visual acceptance remains with the parent/reviewer. The direction is materially more coherent and the biomes are more distinct, but a static checkpoint cannot establish a convincing moving surface crossing, pleasant exploration, natural fish timing, or sustained performance. The surface/anatomy correction needs the parent's final capture and crossing sequence. Discovery bubbles need an actual novice-like descent check to establish that they are noticeable without revealing too much. The denser kelp scene and soft shadows need the final moving-dive performance and repeated resource-lifetime gates, including lower quality and reduced-motion settings.

No full-map reveal, faster swim speed, target coordinate changes, or domain reward changes were introduced by the art specialist. Final assessment should use normal playing-size multi-site evidence and the parent's final source/build gates, not the implementation detail count. The remaining visual question is whether the corrected surface crossing and richer near gardens now feel like one coherent underwater place while keeping objectives readable.

## Parent final composition adjustment

After the checkpoint, the parent added a Home Reef coral shoulder behind the swim plane. Iteration six was rejected because its front edge floated above the seabed. Iteration seven lowers and asymmetrically shapes the ridge, tapers every boundary into the floor, and anchors mixed coral colonies to the same height function. The independent narrow review closed the Home mid-depth composition issue. Final captures are in `captures/fifth-improvement/art/iteration7/`; the final built earned arc is in `captures/fifth-improvement/qa/2026-10-09T06-00-45.526Z-acceptance/`. See `qa-final-scene.md` for the exact accepted build.
