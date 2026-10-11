# Reference-to-biome study procedure

Use this procedure when Jaco supplies or curates an island biome and requests generated 3D candidates, reference matching, or repeated agent scoring. Current example: [11 October fidelity study](biome-fidelity-2026-10-11.md). The [adoption record](island-lab-adoption.md) defines current authorization and evidence ownership. Jaco curates visual direction and approves production use separately from agent scoring.

## 1. Establish the target

Read the current decision and human feedback. Extract the biome's silhouette, shore/height hierarchy, foliage types, water-depth cues, landings and distinctive findings. Separate human requirements from agent proposals. Existing constraints include a lagoon without an arch and islands with interesting approaches from every direction; a single theatrical front is insufficient.

Generate two reference permutations per biome using native ImageGen and the retained original concept sheet as a style reference. Include an approach and reverse/elevated view. Label them generated references, preserve prompts and exact image identities, and describe inconsistencies or unseen sides. Reuse already accepted references instead of regenerating unnecessarily. Choose a provisional target for this study; agent selection does not approve production art.

Done when the target images, constraints, open questions, review scope and permissible iteration effort are recorded. Jaco may authorize several agent-scored passes at once, as in decision 0004. Preserve that authorization; do not re-request approval between those passes.

## 2. Freeze the experiment

Use the maintained [island lab](../../tools/island-lab/README.md). From a clean checkout, run `npm ci` and `npm run islands:dev`; open `http://127.0.0.1:5188/tidekin/tools/island-lab/`. It is tracked tooling, outside production imports and saves. Do not edit frozen historical evidence to make a new study.

Version 4 retains the v3 visual rules and quantizes coordinates for stable cross-engine fingerprints. Importing a v3 recipe verifies it, then explicitly upgrades its identity. Historical P0–P2 require the retained v2 engine; the review gallery links to those exact snapshots. Never run a historic recipe through a newer renderer and label its captures as historic evidence.

Run `npm run islands:verify` against the running server. `npm run islands:capture -- p4 <new-run-name>` records three seeds per biome and five views each under ignored `output/island-lab/`; it refuses to overwrite an existing run. Use P3 or current settings as the baseline when appropriate; custom tuning is performed in the lab and exported with its URL/recipe. Capture custom settings with `npm run islands:capture -- recipe <new-run-name> <export.json>`; the file can contain one recipe or an array. Do not silently alter a historic preset to capture new settings.

Record source SHA-256, dependency versions, seed set, recipe settings, target reference, browser, viewport, camera positions, light and visual clock. Use the same seeds throughout a comparison; the example uses `waterfall-01`, `island-mqbxgd`, `study-03`. Capture four cardinal approaches, an overview and a useful near view if fine details cannot be judged. Camera/lighting improvements are not geometry improvements: mark supplemental views separately.

Use the [fixed rubric](../decisions/evidence/biome-fidelity-v1/rubric.json), or create an explicitly new rubric before scoring. Each aspect has 0–5 anchors: geometry, foliage, water, biome identity, all-angle composition and readable landings. Weighted totals are rubric points, not objective image-similarity percentages. Keep every aspect visible. Mark missing evidence unassessed and record confidence. Motion, fun and collision safety require different evidence.

Done when the baseline and reproducible inputs are retained before tuning.

## 3. Tune through the lab

For each biome, generate at least three seed permutations with a fixed settings recipe. Inspect the resulting 3D views against the target, not just against the previous low-quality pass. Record observation → consequence → settings change → expected visible result.

Use existing controls first. Hold the seed fixed while tuning geometry smoothness, peak height, foliage density/scale, shelf width, shallow-water contrast and rock relief. Regenerate and use the same cameras. Show the seed/version/settings fingerprint in review records. Save the recipe JSON; the URL preserves generator settings, while the JSON also preserves camera position.

Rate every permutation after each pass, with linked captures, per-aspect scores, total, confidence and a within-biome rank. Ties are legitimate. Retain or reject a candidate on the agent's assessment explicitly; reserve human approval for Jaco. A higher total cannot hide an arch violation, a blocked sole entrance, floating plants or a lost landing. Preserve negative results and regressions.

If settings reach a plateau because the required capability is absent, document the limitation. Extend the tool in a new version with a named control; do not silently hand-place geometry in one favored seed or claim the change was settings-only. Reuse the same comparison seeds/cameras, mark the version boundary, then freeze that version for subsequent settings passes. The example's v2 plateau led to v3 canopy-scale, relief and irregular-water controls.

Done when the authorized pass budget is used, material gains plateau, or a candidate reaches the agreed diagnostic target. Report unresolved fidelity plainly. Do not manufacture a high score to end the loop. A productive outcome may be a better tool and a documented capability gap.

## 4. Verify and retain

Check deterministic recipes, finite geometry, biome signatures and intended access routes over additional seeds. In a browser, verify actual controls, regeneration, URL restoration, export identity, free-camera/input focus and resource disposal. Record errors and limits. Visual route guides do not prove collision-safe navigation; mesh/texture counters are not performance benchmarks.

Promote a compact set of meaningful baseline/intermediate/final captures, rejected overshoots, all recipe/rating data, source snapshots, prompts and a SHA-256 manifest to `docs/decisions/evidence/<study-id>/`. Catalogue retained art references, captures and source code with stable IDs, measured dimensions, SHA-256, byte size and provenance (the current scoped inventory is `assets/biome-study-catalogue.json`); include no runtime consumers or production approval unless those are real. Keep user annotations local under the human-reference policy. Temporary renders remain under `output/` until their review purpose is released only after their review purpose is released.

Done when another agent can restore the source, reproduce the selected settings, identify the reviewed images and understand why alternatives were kept or rejected without reading the chat.

## 5. Present for human curation

Present the image-generation targets separately from running-code captures. Show before/after aspect scores and remaining weaknesses, with links to the lab, exact candidate recipes and study report. Ask Jaco to retain, revise, defer or discard specific biome directions or artifacts. Record his response against the exact version and scope. Update roadmap readiness only as far as that response supports; production integration, performance acceptance and release remain separate work.

## Current disposition

Jaco retained the sub-70 results as a decent starting point and requested a maintained tool ready for merge. Do not repeat that approval question. A future biome/recipe still needs its own scoped curation; game integration remains a proposal.
