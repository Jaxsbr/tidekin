# Island lab adoption — 11 October 2026

**Disposition: keep as the starting authoring tool; prepare for merge.** Jaco reviewed the [biome study](biome-review.html) and said, “despite the sub 70 scoring on all, I think this is a decent start,” then requested that the tool and procedure be codified and prepared for `origin/main`.

This accepts maintaining the tool and using its results as a starting point. It does not claim high reference fidelity or approve these exact assets for production. Best final agent rubric scores remain A 67, B 67, C 68.5. Geometry, foliage and water still need improvement. Scores are subjective rubric points, not image accuracy percentages.

## Retained direction and provenance

Jaco retained all three directions from the [original generated concept sheet](../decisions/evidence/surface-biomes-v1/concepts.png): A lagoon, B waterfall, C mangrove. B was selected for the first approach study. He liked the tall pass and distant approach, requested smaller low rocks/islands leading into beaches below the cliffs, rejected A's artificial arch, and required interesting approaches from every direction.

He then authorized generated reference permutations, seeded 3D permutations, repeated agent scoring/settings passes and a reusable procedure. The [report](biome-fidelity-2026-10-11.md) records six image variations and 45 3D candidates, negative results, exact prompts, recipes and matched views. Earlier snapshots preserve the rejected arch and one-front layouts as historical evidence only. User annotations remain local in the original checkout; this change does not distribute them.

The [study catalogue](../../assets/biome-study-catalogue.json) retains stable asset IDs, provenance relationships, dimensions and exact hashes from the earlier working inventory. It is a scoped catalogue because `origin/main` does not yet contain the separate asset-governance branch. When that branch lands, reconcile these IDs into its catalogue; do not duplicate assets or treat the external source IDs as new dependencies. The original paintings' provenance includes the liked menu art and ocean-workshop reference. No study asset is a runtime consumer or human-approved production asset.

## Maintained implementation

[tools/island-lab](../../tools/island-lab/) is tracked development tooling, separate from game imports, `public/` and saves. `npm run islands:dev` opens it on port 5188. The [procedure](biome-generation-procedure.md) is its operating guide.

The maintained recipe version is **island-lab-v4**. It preserves the v3 layout/visual rules and P3/P4 settings, validates input, restores exported recipes, and quantizes output numbers to 1e-8 world units before computing identity. This fixes last-bit trigonometry differences between browser and Node. V3 import verifies the original recorded fingerprint and geometry, then explicitly upgrades to v4; v1/v2 must use their frozen source. Fingerprints are comparison aids, not cryptographic authentication. SHA-256 binds retained evidence. The renderer releases per-instance GPU buffers during regeneration and owns teardown. Source is formatted for maintenance.

The historical snapshots/manifests remain immutable. New runs record the maintained tool's actual source hashes. A formatting, validation or lifecycle change does not retroactively modify the source attributed to P4. New generated content has no automatic human approval.

## Scope and merge

This branch starts directly at `origin/main` (`79da54b`) and excludes the unmerged art/performance PR, its runtime changes and unrelated local governance edits. Only tool scripts, isolated tests, study evidence, documentation and CI checks are added. Production `src/`, runtime assets, save keys and gameplay are unchanged. Tool and evidence paths are not included in the production Vite entry graph.

Next game integration is a [proposal for discussion](island-game-integration.md), not an implemented or approved architecture. Landing gameplay, collision safety, production frame/memory budgets, world pacing and save migration remain future work.

## Verification

All 124 Node tests and the production build pass. Chrome verification covers cross-engine recipe identity, v3 import/upgrade, invalid import rejection, export roundtrip, URL restoration, camera/input focus, regeneration resource counters, storage isolation and the historical gallery. The reusable preset capture run generated nine recipes and 45 views. [Maintained-tool evidence](../decisions/evidence/island-lab-maintained-v4/verification.json) binds the sources, [browser result](../decisions/evidence/island-lab-maintained-v4/browser-verification.json) and [actual UI capture](../decisions/evidence/island-lab-maintained-v4/lab.png). These checks establish tooling behavior, not runtime performance or collision safety. Hosted CI remains independently required before merge.
