# Tidekin architecture
The playable starting point for this iteration is commit `79da54b`. README and `PROJECT.md` describe current behavior. Older iteration briefs are historical evidence; they are not features to restore.

## Ownership

| Module | Owns | Interface and constraints |
| --- | --- | --- |
| `game.js` | Voyage, steering, tide, resources, upgrades, discoveries, rewards and save schema | Deterministic actions/updates; no DOM, renderer, wall clock or browser storage |
| `cleanup.js`, `dive-world.js` | Attempts, collection, oxygen and seeded habitat layouts | Transient attempts remain separate from permanent restoration and once-only rewards |
| `persistence.js` | Save/settings validation, replacement authorization, write failures and recovery | Injected Storage adapter; outcomes rather than DOM messages; no timers; domain-owned codecs |
| `main.js` | Browser lifecycle, semantic input, dialogs, HUD, audio and autosave scheduling | Translate input to domain actions and render results; clear held input on focus/modal/mode transitions |
| `scene.js` | Shared renderer, raft/ocean, cameras, picking and construction presentation | Consume state; never award resources or save progress |
| `cleanup-scene.js` | Underwater presentation, camera tracking and site replacement | Own resources; never change authoritative coordinates or collection state |
| `character-art.js` | Shared character identity and articulated presentation | Waist origin, +Y crown, +Z face; presentation transforms only |
| `geometry/solid-silhouette.js` | Shared flat costume and fish-fin silhouettes | Closed contour, one depth step, no bevels/holes; caller owns returned geometry |
| `render-resources.js` | Owned-tree disposal and whole renderer shutdown | Deduplicate geometry/material/texture ownership; include uniforms, instances and shadows |
| `load-profile.js` | Bounded startup phase records | Record completed/failed phases; expose read-only copies; no simulation effects |

A new module should concentrate meaningful behavior behind a small interface. Persistence and resource disposal now have single owners instead of duplicated DOM-bound or renderer-specific implementations. Arbitrary file splitting does not improve ownership.

## Frame and input

A browser frame reads held input, advances deterministic rules with a bounded delta, then renders state. Sailing is always controllable during play. +Z is the bow; orbit does not change heading. Preserve 2.2 m/s swimming and sustained pointer pull / held-E fallback.

Dialogs, blur and hidden tabs pause gameplay and clear input. The UI owns gesture capture; picking returns semantic identities. Domain rules evaluate interaction reach independently of projected screen positions. Following camera, inspection orbit and animation remain presentation-only.

## State and saves

`tidekin.save.v2` remains the voyage key; `tidekin.settings.v1` stays separate. Loading validates and migrates a detached candidate. Preserve the browser origin/profile; QA uses isolated storage.

Surface breathing retains static reef work. Failure resets the whole attempt for immediate retry. Pearl survey requires one breath. Completion pays once; oxygen continues afterward, and boarding requires the surface. Leaving/reloading discards unfinished work. Permanent restorations, supplies, upgrades, discoveries and trophies persist. Legacy underwater saves resume aboard without banking partial progress.

Persistence prepares a detached voyage without changing the current save authorization. The UI commits that preparation only after rendering, resizing, settings, HUD and focus setup succeed; failure cancels it and restores the previous live voyage. Only the committed state identity can save. Keep one loading transaction at a time. Corrupt bytes remain untouched until replacement is confirmed. Storage failure leaves the live voyage playable and its warning visible; the UI retries every ten seconds and on important transitions. A successful retry announces recovery. Another session's changed saved bytes are preserved and reported rather than silently overwritten. Web Storage has no atomic cross-tab compare-and-set.

Load the world before replacing the previous save. Reuse the scene promise and renderer after successful setup. A failed new scene is disposed; a reused scene rolls back to the previous state, or is quarantined and disposed if rollback itself fails. Loading failure preserves stored bytes and presents a retry. Title/Continue may resume an in-memory attempt without reloading storage.

## Rendering resources and assets

Sites own their procedural trees. Replacement releases old resources and detaches the tree before creating the next one. Rigid character batching preserves articulated joints and animated subgroups. A borrowed or cloned asset cannot dispose another owner's resources.

Character geometry is consolidated only within a rigid articulation parent. Ordered indexed material groups preserve the separate surface attributes and material objects; no merge crosses a joint. Identity blocks retain their existing normal values. Different visibility, layers, shadow flags or render order prevent consolidation. Host material traversals flatten arrays before applying underwater tint or releasing resources. Grouped meshes remain final blocks on repeated batching; clones and staged merged geometry are released on construction failure. Exact CPU fidelity and lifecycle checks complement rendered culling, material and resource-count verification; fewer geometries alone does not establish faster rendering.

The small silhouette builder replaces the general extrusion engine only for the supported flat, untextured contours. Character curves use eight sampling segments and fish fins retain twelve. Tests compare actual fin positions, normals, draw groups and bounds with the former constructor; unused fin UVs are deliberately omitted. Unsupported bevels, paths or holes require a separate design rather than silently extending this contract. The character and underwater capability objects no longer expose the unused extrusion constructor.

Reef material batching preserves indexed vertices and gives unindexed inputs identity indices. It keeps ordered position/normal/color triangle attributes and material order, without welding seams or recomputing normals. The final typed index is filled directly, avoiding a growing boxed-number array during large habitat construction. Reef paint also fills its final Float32Array directly through BufferAttribute, preserving original colour bits without a boxed colour array or another typed copy. Within one sculptor, undeformed unit spheres share six deterministic topologies and their local paint; stone and scalloped coral remain unique. A successful batch clears the source cache after transferring ownership, so later construction cannot reuse disposed geometry. Failed new instances release an unattached fresh source; failed borrowers retain the existing scene source. Temporary transformed geometry uses a populated `BufferGeometry.copy`; primitive `.clone()` would reconstruct unused default sphere/tube topology before copying. Each temporary copy is owned before population, so partial copy failures remain releasable. Merges and final meshes are staged before removing originals; failure releases temporary copies and staged geometry while preserving original scene ownership. On success, original source geometries and temporary transformed copies are released; final meshes remain scene-owned. The CPU storage comparison in `docs/reviews/current-improvement/reef-storage-comparison.json` verifies its named indexed snapshot across all four benchmark habitats, including unchanged culling bounds. Later allocation changes need their own fidelity checks; browser frame, heap and loading claims require the paired performance records.

`releaseObjectTree` deduplicates attached geometries, materials, direct/array/shader-uniform textures, instanced buffers and shadow owners, then clears the tree. Detached textures enter its explicit texture ownership list. Whole-world teardown includes retained GLTF templates as well as visible clones, releases the underwater view, and calls `releaseScene` to release the owning renderer. Late construction and readiness callback failures use the same ownership cleanup. Whole-world shutdown is guarded against repetition. Resource plateaus are bounded evidence, not total process/GPU memory certification.

Production assets, selected references and editable sources are catalogued separately from disposable captures/builds. Read the governance policy before importing, generating, approving or deleting assets. Record approval evidence; a current baseline asset is not automatically newly human-approved.

## Verification

Domain tests verify rules and schema compatibility. Module-interface tests verify storage failure/recovery and disposal. Actual browser input verifies progression, focus and persistence. Staged visual/performance fixtures are labelled separately from earned play.

Loading phases record module import, manifest, image decode, model load, scene creation and first render. Overlapping spans are diagnostic and cannot be summed as exclusive costs. Measure loading, frame intervals, CPU work and memory separately. Records identify exact source/assets/build, scenario, environment and limits. Paused or frozen dives cannot pass active-dive benchmarks.

Independent reviewers identify the candidate reviewed. Tests do not establish human enjoyment or visual approval, and hardware results do not certify unmeasured devices.
