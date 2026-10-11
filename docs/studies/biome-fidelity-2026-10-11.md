# Biome fidelity study — 11 October 2026

Status: **retained by Jaco as a decent starting point; close reference fidelity not achieved**. Authority: [adoption and feedback](island-lab-adoption.md). [Open the visual review](biome-review.html), [follow the reusable procedure](biome-generation-procedure.md), or [inspect every rating](../decisions/evidence/biome-fidelity-v1/reviews.json).

## What changed

A is Lagoon, with the artificial arch removed. Radial land clusters and three intended approach sectors replace the single-front layout in all three biomes. The lab adds controllable geometry resolution, rock/coast irregularity, foliage density and scale, sand/shallow width, water contrast, limestone relief and water detail. Free flight, seed/recipe exports and four-direction/overhead viewpoints support inspection.

The prototype remains outside production imports and save storage. It demonstrates scenery and repeatable recipe tuning; it does not certify collision, landings, gameplay or production performance.

## Reference permutations

Native ImageGen produced two permutations per biome, each with a painted approach and reverse/elevated view, using the [original three-biome sheet](../decisions/evidence/surface-biomes-v1/concepts.png) as a style reference. These are concept paintings, not code captures or proof of 3D consistency. The [exact prompt set](../decisions/evidence/biome-fidelity-v1/references/prompts.json) and image hashes are retained.

- [A1/A2: Lagoon](../decisions/evidence/biome-fidelity-v1/references/A-lagoon.png). Agent target: A2, whose separated limestone masses better express an open basin. A1 remains a viable alternative.
- [B1/B2: Waterfall](../decisions/evidence/biome-fidelity-v1/references/B-waterfall.png). Agent target: B1, a compact spring island; B2's extra cascade is retained as a broader alternative.
- [C1/C2: Mangrove](../decisions/evidence/biome-fidelity-v1/references/C-mangrove.png). Agent target: C1 for its dominant root/channel identity; C2 has more dry sand and rock.

Reference ratings use the same visual aspects but have lower confidence for all-angle consistency. Their ranking is an agent's choice for this experiment, not human approval.

## Fixed rubric and results

The [rubric](../decisions/evidence/biome-fidelity-v1/rubric.json) was recorded before scoring. Geometry, foliage, water and identity each weigh 20%; all-angle composition 15%; landing readability 5%. Each aspect is scored 0–5, with weighted totals out of 100. **These are subjective rubric points, not an objective accuracy percentage.** A high composite cannot waive a failed constraint. Earlier passes have lower all-angle confidence; final candidates were examined from every sampled direction.

| Pass | A mean | B mean | C mean |
| --- | ---: | ---: | ---: |
| legacy-v1 | 21.0 | 25.0 | 29.0 |
| p0 | 34.3 | 36.3 | 40.3 |
| p1 | 46.8 | 46.8 | 55.5 |
| p2 | 46.8 | 46.8 | 57.5 |
| p3 | 61.7 | 61.7 | 60.2 |
| p4 | 65.7 | 65.7 | 67.2 |

Legacy uses one seed per biome. P0–P4 average the same three seeds: `waterfall-01`, `island-mqbxgd`, `study-03`. Three seeds × three biomes × five passes gives **45 rated 3D variants**, with 225 captures before selected retention. A separate 12-capture legacy baseline records the former one-front layout. [All recipes](../decisions/evidence/biome-fidelity-v1/recipes/) preserve parameters and fingerprints.

| Selected P4 candidate | Seed | Geometry / foliage / water / identity / all angles / landing | Total |
| --- | --- | --- | ---: |
| A | `island-mqbxgd` | 3 / 3 / 3.5 / 3.5 / 4 / 3 | 67.0 |
| B | `island-mqbxgd` | 3 / 3 / 3.5 / 3.5 / 4 / 3 | 67.0 |
| C | `study-03` | 3 / 3.5 / 3.5 / 3.5 / 4 / 2.5 | 68.5 |

The selected seeds are the highest ranked examples within each biome in this run; ties and lower-ranked seeds remain recorded. The final comparison sheets show [A](../decisions/evidence/biome-fidelity-v1/captures/contact-p4-A.png), [B](../decisions/evidence/biome-fidelity-v1/captures/contact-p4-B.png), and [C](../decisions/evidence/biome-fidelity-v1/captures/contact-p4-C.png) from north, east, south, west and overhead.

## Iteration record

1. **Legacy baseline:** faceted towers, sparse repeated foliage, weak depth cues and uninteresting reverse views. A still carried the rejected arch.
2. **P0, v2 coarse settings:** establish open radial layouts and explicit controls. Multiple intended approaches and distinct biome roles improve structure, but sparse plants and cones remain. This is a tool extension, not a settings-only improvement to v1.
3. **P1, same v2:** increase smoothing, foliage, shore width and shallow-water contrast. Water/shore separation improves. C benefits more than A/B from foliage density.
4. **P2, same v2:** stronger settings reach a plateau for A/B; scores stay unchanged. Underlying rock shapes and plant scale limit the result. This negative outcome is retained.
5. **P3, explicit v3 extension:** introduce canopy scale, limestone ledge relief, better perimeter planting and irregular water detail. Spatial RNG and cameras stay comparable. Coverage and depth contrast improve, but oversized crowns hide limestone and root curtains obscure C's beaches.
6. **P4, same v3 geometry/renderer:** reduce canopy density/scale and relief, adjust heights and shelf widths, widen access settings. Exposed rock, beach and canopy balance improves. The report retains the overshoot as evidence of why maximum settings are not best.

P0–P2 share one frozen generator/renderer. P3→P4 share another; changes are settings-only within each version. UI additions/default selection are distinguished from renderer changes in the source records. No geometry was hand-edited for a favored seed.

## Evidence and reproducibility

Matched stills use 1280×800, 53° FOV, cardinal cameras at radius 260 and height 23 looking at (0,17,0), a fixed sun and water clock at 12 seconds. Overview uses (165,210,190) looking at the origin. Legacy required a camera-only inspection adapter and fixed water clock; it did not change its geometry. These distant views aid fair layout comparison but undersample small foliage details; selected full-size captures were also examined. A near-detail human review remains useful.

[Manifest](../decisions/evidence/biome-fidelity-v1/manifest.json) binds source snapshots, prompts, recipes, captures, rubric, review judgments and verification. [v2 source](../decisions/evidence/biome-fidelity-v1/source/island-lab-v2/) and [v3 source](../decisions/evidence/biome-fidelity-v1/source/island-lab-v3/) are retained outside production. The maintained successor is [tools/island-lab](../../tools/island-lab/README.md), served on port 5188. Historical versions are directly runnable from their retained evidence paths on that server. V3 exposes P3/P4; use the retained v2 tool for P0–P2. The [capture helpers](../decisions/evidence/biome-fidelity-v1/tools/) document the actual run; restore them to `output/biome-study-2026-10-11/` with sources under their original prototype paths before rerunning their relative imports.

Browser verification passed: repeatable regeneration, settings/URL restoration, free-camera movement, input focus, guides, export identity, no browser-storage writes and stable geometry/texture counts after eight regenerations. Sixty extra deterministic recipes passed finite-value, signature, arch-absence and three-route checks. See [verification](../decisions/evidence/biome-fidelity-v1/verification.json). Render counters were retained; no frame-time, heap or production performance acceptance is implied. C is materially more detailed than A/B and needs production budgeting later.

## Remaining gaps and disposition

- Rock masses still resemble repeated columns; ledge relief does not yet produce the reference's fractured limestone and connected coves.
- Foliage types differ, but broadleaf crowns remain rounded clusters and palms lack fine frond structure. Root curtains repeat and can obscure landings.
- Shallows are more legible, but their analytic color fields are an approximation, not a rendered bathymetry/seabed model. Highlights remain synthetic.
- The waterfall is recognizable but narrow and mechanically straight; these stills do not assess its movement.
- Three planned access sectors and all-angle captures do not prove collision-safe navigation. Landing activity, voyage pacing and control enjoyment remain unresolved.

**Agent disposition:** retain P4 as the current review candidate and preserve the procedure/tool improvements; keep all approvals pending. The attempt improved the match but did not attain high reference accuracy. Further score inflation would conceal remaining tool/art limitations. Jaco can now curate biomes and direct the next fidelity work using a reproducible process. Production integration and the previous performance-blocked PR remain outside this study.

**Subsequent human disposition:** Jaco called the sub-70 results a decent start and requested codification/merge preparation. See the [adoption record](island-lab-adoption.md); exact production-asset approval remains separate.
