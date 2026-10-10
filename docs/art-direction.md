# Tidekin art direction and editable sources

The visual promise is a small handmade home worth caring for in a luminous tropical ocean. Preserve the liked splash painting and original user reference. Use `assets/reference/ocean-workshop.png` only to guide materials, depth, silhouettes and warmth; it is not a gameplay texture or a claim of achieved render quality.

## Visual direction

Prioritize warm sculpted timber, cream canvas, restrained coral pennants, turquoise water, pale asymmetric limestone and green foliage. Primary raft/island/character silhouettes should read before lashings and surface detail. Keep interactive objects legible against decoration; painted backdrops do not define collision, reach or targets. Motion should convey buoyancy, weight and responsive purposeful action while reduced motion keeps state changes understandable.

Baseline presentation uses an original procedural articulated character above/below water, procedural reef/fish/landmarks, original Blender surface models, a shared painted UI atlas, cabin illustration, and keepsake atlas. Human approval of their final presentation is unestablished. Current art-owner evidence under `docs/art/` governs later review scope. See the catalogue for exact current hashes, dimensions, source relationships and consumers.

## Coordinates and source interface

Workshop glTF is Y-up: waterline Y=0, bow +Z, starboard +X, nominal deck 7×9 world units. Preserve named upgrade/articulation pivots and imported rest transforms. Wheel animation is local X; engine flywheel local Z. Original Blender authoring is Z-up, bow −Y. Export batching retains independently animated/hidden subtrees. `src/character-art.js` uses crown +Y, face +Z and a waist root; its animation consumes presentation values without moving gameplay coordinates.

`scripts/build_assets.py` and `scripts/build_landmarks.py` are original Blender generators. Retain `assets/workshop.blend`, `assets/island.blend`, and `assets/landmarks.blend`; runtime exports are `public/assets/*.glb`. The catalogue inspects actual GLB mesh/material counts and transformed rest-pose bounds. The generator writes temporary verification to ignored `output/assets/build-report.json`; partial exports inspect the other current GLB instead of merging old report data. Obsolete metadata and unused standalone vectors were discarded; their exact identities remain in `docs/governance/asset-report-retirement.json` and baseline Git history.

`assets/ui-fourth/package-kit.mjs` owns crop rectangles, aliases, helper CSS, manifest and contact sheet. It preserves the flattened atlas unchanged and regenerates shared PNG/CSS packaging with `node assets/ui-fourth/package-kit.mjs`. It no longer emits twelve full-PNG-embedded SVG wrappers. `assets/ui-fourth/atlas-layout.svg` remains an editable rectangle overlay linked to the original PNG. Prompt/provenance files are generation records, not fictitious layered paintings.

## Review and scope

Inspect actual running game captures against the original reference and current rubric. Separate source/model validation, agent visual assessment, human preference and exact-byte production approval. Historic comparison/practice/helm/basket instructions and historic scores are not current direction. The baseline has no runtime consumer for the retained generated reef panorama despite older integration claims.

[Asset contract](governance/asset-contract.md) defines provenance, approval and validation; [retention policy](governance/retention-policy.md) identifies required references/sources and temporary verification.
