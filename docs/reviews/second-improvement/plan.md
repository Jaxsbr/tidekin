# Second improvement execution plan

Execution began 9 October 2026 (Pacific/Auckland). The full saved execution brief and second-improvement brief govern scope. This folder records new evidence; historical review files remain historical.

## Fixed acceptance

Preserve weights: interaction 16, progression 14, tide/exploration 12, reference art 14, animation 10, onboarding 10, reliability 10, performance 8, accessibility 6. At least 75/100, every dimension at least 3/5, no critical defects. Untested evidence remains unscored. Human enjoyment remains unvalidated; previous onboarding score is not proof of comprehension.

## Sequence and ownership

1. Baseline QA captures shipped title, first view, sailing and old diving at 1440×900 and 900×900 in isolated profiles. Record hashes, device, tide targeting sequence and timings before source changes.
2. Research audits targeted gaps; interaction design specifies bounded camera comparisons and quiet first actions.
3. Domain specialist owns game.js/cleanup.js and deterministic tests. UI specialist owns main.js/style.css/index.html. Underwater artist owns cleanup-scene.js and new asset sources. PM owns scene.js integration, shared contracts, documentation and build delivery. Existing source edits wait for baseline capture readiness. No shared-file concurrent edits.
4. Play camera alternatives with the same route/actions and record choice. Integrate full cleanup loop, then raft, opening, gathering/tide workflows.
5. Independent technical and running-art reviews, browser QA, and separate novice/expert actual-input agent playtests. Preserve failures, resolve findings and recheck affected workflows.
6. Matched final captures, hardware benchmark (5s warm-up, 20s measured, median≤20ms/p95≤33.4ms), sustained transitions, scorecard, manifest and human handoff. No completion claim until required evidence and gates are satisfied.

## Initial implementation choices to validate

Cleanup uses a separate deterministic attempt, not historical salvage/Pearl route state. One home patch, six trash items, slow vertical/horizontal swimming. Surface breathing retains the attempt. The last collection commits permanent restoration immediately: no additional exit challenge. Air failure discards every collected objective and bag fill, offers immediate retry or raft return. Save/reload discards unfinished attempts and returns to raft while keeping successful restoration and unrelated voyage state; live pause retains the attempt. Explain that policy in pause/exit UI.

Raft heading is authoritative, bow +Z. At helm W/S drives along heading, A/D turns. Off helm movement cannot sail the vessel. Camera inspection is rendering-only. Compare follow and wheel views, and side-on versus oblique underwater framing, before choosing defaults. Useful stations are the existing upgrade workbench and a bounded cabin storage/chart view; no survival or expanded economy.

## Evidence anchors

- Opening: no unsolicited instructional modal, one immediate actionable purpose, essential controls readable at square/wide sizes.
- Agency: click real helm, leave, zoom/orbit, inspect cabin/workbench, no movement leakage.
- Gathering/tides: actual browser rising/falling sequence, distinct floating versus anchored appearance and explanations, visible collection transfer.
- Cleanup: collected trash transfers into trailing attached bag; surface/refill/descend retains counts; intentional exhaustion resets all; repeated retry cannot retain partial work; success changes map/world and survives reload.
- Persistence: isolated old-save migration, current completion reload, unrelated inventory/upgrades/discoveries preserved, invalid-save/storage failures.
- Art/motion: gameplay evidence, original reference and human annotations; inspect diver, string/bag, affected/restored patch at actual camera.
- Performance: measured browser/GPU/DPR/quality and source fingerprint; resource counts through repeated transitions. Software data separate.
