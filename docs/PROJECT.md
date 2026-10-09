# Tidekin

A little workshop. An endless ocean.

## Product contract

A local single-player 3D desktop-browser game. Sail a handmade raft through a luminous tropical archipelago; read the tide, dive for salvage, and build increasingly useful contraptions. Progress persists across sessions. The supplied reference is the art target, not a claim of achieved render quality.

MVP: start/continue/pause menus, steering, visible tide cycle, approachable diving and recovery, spatial salvage interactions, resource feedback, five workshop upgrades, gated destinations, objectives, validated local saves, original Blender models, animated water and machinery.

Beta extension: settings, keyboard and clickable action controls, save failure recovery, reliable restart confirmation, onboarding, quality controls, performance instrumentation, production build, functional browser checks, independent architecture/art reviews, documented playtest iterations.

Third iteration adds physical first discoveries, current-tide route comparisons, optional repeatable surface/dive expeditions, persisted route progress and completion tallies, and visible pennants at 1/3/5 completed expeditions. These are assessed separately from the five-upgrade story arc. Existing saves retain their discoveries and default missing expedition data safely.

## Delivery gates

1. Evidence: 20 independently sourced successful Steam games within 2024-10-08 through 2026-10-08, multiple genres. Release dates and success signals verified. Mechanics are hypotheses, not proven causal explanations of sales.
2. Gameplay: complete first-session onboarding and full upgrade/region arc without developer resource grants; reload preserves progression. No dead ends after missed tides or oxygen depletion.
3. Art: compare captured running game against source image: turquoise translucent sea, white foam, warm sculpted handmade workshop, limestone/green silhouettes, expressive motion, legible restrained UI.
4. Engineering: domain isolated from renderer/UI, deterministic tests, validated persistence, controlled frame delta, bounded objects, clean build, independent review.
5. QA: menu/new/continue/pause/settings, input focus, gather/build/travel/quests, invalid saves/storage failure, dive exhaustion, multiple sessions, resizing, benchmark with browser/device/resolution and median/p95 frame timings.
6. Iteration: record baseline and changes using same evidence and rubric. Agent playtests are explicitly labelled; human beta feedback remains separate.

## Rating rubric (100 weighted points)

Score each dimension 0–5 (0 absent/broken, 1 severe friction, 2 functional rough, 3 coherent MVP, 4 polished beta, 5 exceptional demonstrated quality). Weighted sum = score/5 × weight. Untested dimensions remain unscored, never optimistically filled.

| Dimension | Weight | Required evidence |
|---|---:|---|
| Core interaction and agency | 16 | movement, contextual actions, consequential choices |
| Progression and session return | 14 | earned unlock arc and reload |
| Tide system and exploration | 12 | changing access/routes and timing decisions |
| Reference art fidelity | 14 | gameplay captures compared with reference |
| Animation and feedback | 10 | motion, action responsiveness and events |
| Onboarding and usability | 10 | blind/novice walkthrough |
| Reliability and persistence | 10 | tests and failure recovery |
| Performance | 8 | real browser timings/device, sustained run |
| Accessibility and settings | 6 | keyboard, contrast, focus, motion/quality controls |

Target beta: >=75/100, no critical defects, no dimension below 3. This target does not replace actual human fun testing or establish commercial readiness.

## Team

Project manager/integration: parent agent. Complex engineering/research: Sol. Art production and art critique: Astra/Sol. Routine research, QA, playtesting: Luna extra-high. Specialists own disjoint file sets. Reviewer findings must be addressed and rerun; scores must cite evidence.

## Second improvement — current execution scope (9 October 2026)

The [second-improvement brief](second-improvement-brief.md) supersedes earlier opening/control and cleanup rules. It preserves this document's nine weights and 75/100/no-dimension-below-3/no-critical-defect gate. Historical scores remain historical agent judgments.

Deliver quieter action-led onboarding, inspectable raft/workbench/cabin, explicit helm entry/exit and vessel-relative steering, clear floating/anchored/submerged gathering, and one complete snorkel cleanup. Cleanup is independent of the legacy salvage/expedition dive: surface breathing preserves progress, failure resets every current objective with immediate retry, and successful last collection permanently restores the reef. No checkpoints, sharks, puzzles, advanced gear or expanded economy.

The execution team uses Astra low for complex/creative work and Sol 6.1 low for other specialist work. This supersedes the historical Team model assignment above. Independent review, browser QA and novice/expert agent sessions are required; human enjoyment remains a separate unvalidated question. Evidence and review dispositions live in `docs/reviews/second-improvement/`.

## Third player-improvement iteration — current scope

The 9 October 2026 [third improvement execution brief](third-improvement-goal.md) supersedes prior home-only construction, no-cleanup-reward and dual public dive-mode rules. It preserves every original dimension/weight and beta threshold. Deliver the complete player-grounded opening, tracking, camera/collection, raft-wheel-current arc and all four dive input/action alternatives with fair pace/camera comparisons. Primary evidence and independent dispositions live in `docs/reviews/third-improvement/`. Historical scores are neither inherited nor human endorsement.

The team uses Astra low for PM/complex/art/design review and Sol low for routine QA/agent players. No public deployment or recruitment. Existing plain checkout and browser-local save origin stay in place. Completion requires a working local build, earned actual-input arc and persistence, independent reviews/fixes, measured hardware performance, matched wide/square motion evidence, and a concise player comparison handoff. Human enjoyment/preferences remain open.
