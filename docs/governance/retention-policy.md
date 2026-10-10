# Retention and disposal

Retain the original user reference at `assets/reference/ocean-workshop.png` solely for art-direction/material/depth guidance. Preserve the original splash at `public/assets/menu-art.png`: the human likes its visual appeal. Preserve editable `.blend` files, original procedural art, Blender generators, generation/edit prompts, provenance, packaging/crop sources, and original generated painted rasters. Keep their exact identities and purpose in the catalogue. External original-tool paths are provenance strings, not an instruction to copy a whole generated-image folder.

`assets/reference/reef-panorama.png` is the unchanged generated underwater depth, limestone, coral-fan, kelp and caustic-lighting reference. It has no runtime consumer and is deliberately outside public shipping assets. Its stable catalogue ID retains its historical origin; the ID prefix does not imply current runtime use.

Retain these human screenshots only for their documented purpose, at their current paths:

[Human reference identities](human-references.json) records their exact hashes, dimensions and local distribution scope. They remain separate from shipped production assets; no human approval is inferred.

| Reference | Stated purpose |
| --- | --- |
| `captures/player-interview-2026-10-09/jaco-title-annotations.png` | Original title copy/clutter feedback; evidence of liked splash art. |
| `captures/player-interview-2026-10-09/jaco-gameplay-annotations.png` | Original HUD/world competition and nearly-square-window feedback. |
| `captures/current-beta-player-interview-2026-10-09/jaco-log-before-overlap.png` | User-reported gathering incident before overlap; not a controlled reproduction. |
| `captures/current-beta-player-interview-2026-10-09/jaco-log-high-tide-inactive-gather.png` | User-reported high-tide/overlap/inactive-Gather incident; cause remains unverified. |

Retain `benchmarks/**`, `captures/current-improvement/**`, `.scratch/current-baseline.mjs`, current art/performance/review docs, the latest fifth QA harnesses, and live `dist/` while their owners complete the current work. Current raw numerical baseline and its four screenshots are intentionally bounded evidence. Governance does not modify these files or rebuild the measured distribution.

Historical QA traces/videos/screenshots, failed/interrupted retries, rebuilt distribution copies, whole-source scratch snapshots, and old `dist-beta*` are temporary verification. Once the coordinator approves an exact unchanged file ledger, discard them. Keep a compact outcome with byte counts, skips, limitations, and retained reference purposes. Git baseline `79da54b` preserves tracked historical sources and documentation; avoid duplicate archive/repository copies. A differing old snapshot is not automatically a required source: inspect whether it is uniquely needed for an approved artifact or is simply an obsolete generator revision.

## Execution protocol

1. Inventory exact file paths, type, size, SHA-256, and link targets without traversing symlinks. Record protected current paths and source-preservation decisions.
2. Resolve actual runtime consumers and operational source dependencies. Replace obsolete packaging/preview links before removing source production outputs. Route unowned runtime/integration edits to the coordinator.
3. Apply only authorized manifest entries. Reverify type/size/hash immediately before unlink; skip changed/missing files and new files absent from the ledger. Unlink authorized symlinks themselves only after checking their target string. Remove only empty directories produced by this batch.
4. Keep a compact summary; discard the giant temporary per-file ledger after successful application. Refresh catalogue hashes after final art integration; validate all retained sources and reference purposes.

The authorized 10 October batch is in `cleanup-summary.json`. Historical evidence links into removed captures must be retired alongside obsolete reports rather than left presented as live acceptance evidence. Applied historical document/script retirement is separately enumerated in `consolidation-plan.md` and `retirement-summary.json`.

Fourteen historical temporary asset preview renders were discarded after their links were retired. Retention is for a named operational or human-reference purpose, never “keep everything just in case.”
