/goal Deliver Tidekin's complete second improvement iteration: a clearer, quieter opening; inspectable and useful raft spaces; intuitive helm steering; coherent gathering and tides; and an immersive snorkel cleanup MVP with a trailing trash bag, surface breathing, full-attempt failure/reset, immediate retry, and lasting map/world restoration. Carry the full scope through specialist production, independent reviews, QA, playtesting, and repeated improvement to a polished local beta candidate for Jaco's next hands-on review.

Context:
We are improving Tidekin, an existing local single-player 3D ocean exploration/workshop game for players who want a relaxed, beautiful exploration experience with concrete progress. Jaco is the product owner and the first human feedback source. His experience exposed excessive text/panels, weak onboarding and reward meaning, noninteractive raft objects, confusing fixed-world movement, ambiguous tide pickups, and a disappointing underwater mode. Preserve the liked title art and attractive gameplay world. Exploration and local restoration lead; survival and constant upkeep are not the premise.

This is one independent user-owned execution chat in the Codex project "jaxs-tidekin" on host local. Its saved project directory is /Users/jacobusbrink/Jaxs, but the game and all game outputs belong under /Users/jacobusbrink/Jaxs/projects/tidekin. Own the complete iteration across the scope below, not only diving. You are not a subagent of the parent. Use specialist subagents for execution work rather than creating additional user-owned chats.

Parent interview chat: 01a11d67-8117-71d3-a5e2-805d874b8ddf, host local.
Original implementation chat: 01a11ab0-798c-7e72-ad72-f0b0065c867e, host local, title "Prototype tide-powered island game".
Use read_thread on the parent ID, paginating when needed for decisions or uncertainty; prefer concise turns and avoid dumping the huge original implementation turn. If inaccessible, proceed from this self-contained objective and the local interview/review artifacts, explicitly retaining any remaining uncertainty.

Goal activation:
The human explicitly requested /goal execution in this new chat. Inspect get_goal first. If this same requested goal is already active, continue it. Otherwise call create_goal with the complete filled execution brief in this message, including the full review scope below, as the objective. No token budget was requested: omit token_budget. Begin work now and continue through the working result and validation, not just a plan. This instruction supersedes historical "wait for implementation" statements and previous model preferences in older documents or turns. Do not start another broad interview.

References and constraints:
- Read /Users/jacobusbrink/Jaxs/AGENTS.md and any applicable descendant instructions before editing.
- /Users/jacobusbrink/Jaxs/projects/tidekin/README.md
- /Users/jacobusbrink/Jaxs/projects/tidekin/docs/PROJECT.md
- /Users/jacobusbrink/Jaxs/projects/tidekin/docs/second-improvement-brief.md — full authorized review scope, reproduced below.
- /Users/jacobusbrink/Jaxs/projects/tidekin/docs/reviews/player-interview.md — human observations, decisions and corrections; latest explicit decisions prevail.
- /Users/jacobusbrink/Jaxs/projects/tidekin/docs/design-decisions.md and docs/art-direction.md.
- /Users/jacobusbrink/Jaxs/projects/tidekin/assets/reference/ocean-workshop.png — original visual reference; inspect the actual image.
- /Users/jacobusbrink/Jaxs/projects/tidekin/captures/player-interview-2026-10-09/jaco-title-annotations.png and jaco-gameplay-annotations.png — inspect actual annotated screenshots.
- /Users/jacobusbrink/Jaxs/projects/tidekin/captures/player-interview-2026-10-09/salvage-rule-probe.json — limited domain probe, not reproduction or clearance of the reported runtime defect.
- /Users/jacobusbrink/Jaxs/projects/tidekin/docs/research/cozy-systems.md and cross-genre.md — existing research covering 20 Steam games; treat mechanics as hypotheses, not proven causes of commercial success.
- /Users/jacobusbrink/Jaxs/projects/tidekin/docs/reviews/beta-scorecard.md, art-review.md, code-review.md, qa.md, playtest-novice.md, playtest-expert.md and release-manifest.json.
- /Users/jacobusbrink/Jaxs/projects/tidekin/docs/performance-budget.md — existing measurable budgets and benchmark protocol.
- Three.js/Vite/JavaScript with deterministic domain rules, browser-local saves, original editable Blender assets and the existing asset pipeline. Inspect source and shipped assets before strong conclusions. Use Blender and native image generation when appropriate; preserve editable sources and provenance and do not claim an image-tool version you cannot verify.
- Existing local candidate is 0.2.0-beta.3; preview has been http://127.0.0.1:5181/. Check the current process/build before using it; follow README if restarting. Preserve user saves and their origin/browser/profile. Run destructive/restart/invalid-save tests in isolated profiles or fixtures.
- Keep captures, outputs and documentation with the game. Coordinate shared checkout edits with clear specialist ownership and integration points; no worktree has been requested.
- Read the exact diving exclusions below. Do not expand this iteration into sharks, puzzles, advanced gear, checkpoints, survival needs or a full new economy.

Your role:
Act as project manager. Define the bounded implementation plan, assemble specialist agents, coordinate dependencies and shared files, and drive the full scope through design, implementation, independent review, testing and iteration. Make reasonable implementation decisions for choices deliberately left to prototyping; record what was chosen and why. The expected benefit is a legible, satisfying first session and a complete restoration outing whose actions, failure and visible progress make sense to a player.

Team:
- Researcher: audit the existing research and investigate targeted evidence gaps about gradual onboarding, direct object interaction, cozy restoration feedback, readable underwater movement, and forgiving retries with full-level resets. Use credible primary sources and actual project observations. Recommend small experiments; don't restart broad 20-game research or import feature bloat.
- Designer / creator: establish the quiet opening, purposeful UI hierarchy, usable raft/helm/station interactions, and a cohesive underwater cleanup experience. Produce required snorkeler, swimming/breathing, trash, trailing bag/string, underwater environment, localized affected/clean water, map feedback, and restrained title motion assets. Preserve the liked art and reference direction; don't replace a title illustration merely to make animation easier.
- Design reviewer: independently critique actual running captures and motion against the original reference, Jaco's annotations and the full review brief. Assess nearly square as well as wide layouts, diver visibility, meaningful action feedback and before/after restoration. Do not substitute menu art or source code for gameplay evidence.
- Engineer / implementer: deliver every in-scope section of the full review brief: title/onboarding/HUD, inspection camera, helm entry/exit and vessel-relative steering, bounded useful stations/cabin view, satisfying gathering and consistent tide access, complete cleanup dive state machine, bag feedback, whole-attempt resets, persistent successful restoration, and save migration as needed. Prioritize clear module boundaries, deterministic rules, maintainability, input correctness, asset lifetime and performance.
- Technical reviewer: independently review correctness, state ownership, rendering boundaries, input modes, attempt versus persistent progress, reset/exit/save behavior, migrations, resource cleanup and risks. Review against the current scope rather than obsolete rules; verify fixes.
- QA: exercise real browser workflows, edge cases, layout, keyboard/pointer/focus, reduced motion, saves, resets, assets, WebGL and hardware performance. Keep exact build fingerprints and distinguish fixtures from earned play.
- User testers: use separate novice and experienced agent playtests with actual inputs and realistic repeated sessions, including intentional failure and retry. Critique clarity and action satisfaction. Label them agent playtests; do not present them as human fun/retention evidence. Prepare a concise human playtest handoff for Jaco; do not recruit or message other people.

Process:
1. Inspect the context, actual reference/screenshots/assets and current build; capture an honest baseline before changing it. Use the existing research and targeted successful examples to inform bounded experiments.
2. Define the full iteration MVP, acceptance cases and weighted quality rubric. Preserve the existing nine dimension weights from PROJECT.md: core interaction 16, progression/session return 14, tide/exploration 12, reference art 14, animation/feedback 10, onboarding/usability 10, reliability/persistence 10, performance 8, accessibility/settings 6. Add task-specific evidence anchors without moving the weights or lowering gates to manufacture a pass. Scores are judgments, not statistical measures.
3. Resolve camera/interaction choices through small playable comparisons, then implement the complete scope. Parallelize disjoint research/art/UI/domain work where practical; sequence shared input, dive-state, renderer and save contracts before integration. The minimal complete cleanup loop comes first as an integration anchor; finishing it does not excuse omitting the other approved work.
4. Run independent art and technical review plus domain/browser QA. Resolve findings, recheck the affected workflows and preserve failure evidence as well as successful results.
5. Improve the candidate to a polished local beta suitable for Jaco's next hands-on review, within the explicitly bounded scope. Do not widen to deferred diving features just to seek higher scores.
6. Repeat targeted testing, feedback and improvement cycles against matched baseline captures, human-reported problems, the unchanged rubric, and comparable performance measurements. Stop expanding/repeating checks once relevant evidence passes unless a change, failure or unresolved concern justifies another cycle.

Completion:
- Deliver a working local build and accessible preview, complete scope implementation, editable/new asset sources and provenance, updated architecture/design decisions/README, test and benchmark evidence, matched captures, review dispositions, final scorecard and remaining limitations.
- Critical workflows: start/continue/settings and gradual first action; zoom/inspect; take/leave helm and steer relative to heading; use a bounded useful raft station/cabin view; understand and gather floating versus tide-covered objects; enter a cleanup dive; swim and collect visibly into the trailing bag; surface and replenish air without leaving/resetting the attempt; deliberately exhaust air after partial cleanup; retry immediately with all attempt objectives/trash/bag reset; optionally return to raft; successfully clean the site and see map/world restoration; save/reload without losing unrelated or previously completed progress.
- No checkpoints or retention of completed objectives within a failed attempt. No failure cooldown or mandatory raft trip before retry. Do not let historical rescue or Pearl trail rules override these explicit requirements.
- Quality gate remains at least 75/100 using the existing weighted rubric, no dimension below 3/5, and no critical defects. Historical agent baseline was 72.7/100 after 54.4 initially; do not carry its onboarding 4/5 forward as proof of human comprehension. Report task-specific failures independently of the aggregate.
- Performance: target 60 FPS on the measured modern-laptop hardware WebGL profile at 1440×900, with the existing acceptance budgets of median frame interval <=20 ms and p95 <=33.4 ms. Collect 20 seconds after 5 seconds warm-up, record browser/GPU/viewport/DPR/quality, long frames and renderer resource counters. Compare with historical M4 Pro/Chrome High/DPR1 59.88 median FPS, 16.7 ms median and 16.8 ms p95 where comparable. Keep hardware and headless/software results separate; add a bounded sustained-use check for the new scene transitions. Do not strip necessary visuals to pass performance.
- Run build and relevant existing tests; the historical 49 rules/navigation tests are a baseline, not immutable specifications when behavior intentionally changes. Add meaningful coverage for new whole-attempt reset, surface breathing, completion, input transitions and persistence. Make no claim that old passing tests validate new game feel.
- Provide the working result, validation evidence, final scorecard and candid limitations. Human enjoyment and retention remain unvalidated until human observation; do not fabricate human results or use that distinction to avoid completing the authorized implementation and agent verification.

Working preferences:
- Use gpt-6-astra with reasoning effort low for complex and creative/artistic work, including this project-management execution chat and specialists whose work fits those categories.
- Use gpt-6.1-sol with reasoning effort low for everything else. This is the user's "sol-6.1 low" preference. Do not use the old Luna extra-high preference.
- Keep Jaco informed with concise meaningful progress updates. Make reasonable implementation decisions and ask only when missing information materially affects direction; he explicitly stopped the broad interview.
- Distinguish verified results, proposals and assumptions; don't lower acceptance criteria to declare completion. Keep unresolved issues visible and never mark the Goal complete while required work remains.
- This chat is independent. Do not message the parent or other user-owned chats unless Jaco authorizes that communication. Use subagents for this implementation team.

Full review brief — part of the Goal objective:
The following is the complete authorized scope from /Users/jacobusbrink/Jaxs/projects/tidekin/docs/second-improvement-brief.md. Relative links in this embedded document resolve from /Users/jacobusbrink/Jaxs/projects/tidekin/docs. Its MVP exclusions and Jaco's whole-dive restart correction are binding. The historical interview's requests to wait have been superseded by this explicit execution instruction.

# Tidekin second improvement scope

Consolidated with Jaco on 9 October 2026, Pacific/Auckland. He has now requested a new execution chat in the Codex project jaxs-tidekin, using this full brief as its Goal objective and the filled project-manager execution template. This instruction authorizes implementation of the complete scope below, with the stated diving MVP exclusions. The [interview record](reviews/player-interview.md) retains the observations, corrections and history. The new chat owns implementation; this interview chat prepares the handoff.

## Overall direction

Build a relaxed exploration game with clear, concrete progress. The raft is a home and working vessel with things to use and improve. Local ocean restoration provides an understandable activity and visible achievement within a world that is beautiful most of the time. Survival, starvation and maintenance for their own sake are not the intended premise. Cleanup is important but need not become every activity or define every location.

Preserve the title illustration and the attractive qualities of the existing gameplay art. Jaco liked both; his opening difficulties were dominated by interface overload, unresponsive objects, confusing steering, purposeless collection and disappointing diving.

## Title and first session

- Remove redundant slogans, subtext and decorative information from the title screen. Keep essential menu choices clear and let the artwork carry the atmosphere.
- Add restrained life through layers, parallax or a similar subtle treatment. Full cinematic animation is unnecessary; the exact technique remains open.
- Substantially reduce simultaneous gameplay panels and text. Establish a clear visual focus, particularly in nearly square or compact windows.
- Replace the text-heavy arrival and immediate instruction popup with gradual learning through actions and visible consequences. The exact opening sequence remains to be designed.
- Make useful controls, including journal/map/workshop access, discoverable and comfortably readable. Shrinking everything is not a solution to panel overload.
- Explain gathering through a wanted activity or visible outcome, rather than requiring the player to infer why inventory numbers or reward claims matter.

## Camera and vessel control

- Allow closer inspection and viewing the raft/character from different angles through zoom and rotation or an equivalent inspection interaction.
- Clicking the steering wheel should take the helm. The player must also be able to leave the helm and attend to the raft.
- W/S should control forward/backward movement relative to the vessel, and A/D should steer its heading. The existing fixed-world translation with the model turning afterward does not match the expected vehicle controls.
- Choose the sailing perspective by playing prototypes. First-person at the wheel and a close following view are candidates, not settled choices.
- Continuous free avatar walking is not required to deliver the intended experience. Station access can use direct interactions and appropriate views or modes.

## Raft stations and meaningful gathering

- The raft should support useful, inspectable stations away from the helm. Opening a cabin should expose a view or mode where its contents can be understood.
- Gathering should eventually support expanding stations and gaining useful equipment or vessel capabilities.
- Crafting benches, planting and food preparation are examples to consider, not a committed feature catalogue. A full navigable cabin and interaction with every decorative prop are not requirements.
- Give acquisition a visible, satisfying action and result. The current instant disappearance/chime and unclear journal reward do not establish value for Jaco.
- Whether manual journal claims remain, and the exact station interactions, still need design. The executing project manager may make bounded choices to deliver meaningful raft interactions without treating every example as a required station.

## Tide and pickup consistency

Floating debris must behave and read as floating debris. Tide-covered or anchored wreckage and submerged finds must be distinguishable in the world, with consistent collection rules and understandable feedback.

Jaco reported apparently floating items becoming unavailable as the tide rose and remaining unavailable when he expected the tide to have fallen enough. Keep this as an unresolved runtime incident. The [disposable rule probe](../captures/player-interview-2026-10-09/salvage-rule-probe.json) passed for two home nodes at exact positions and recovered after high water, but did not reproduce his browser sequence. Floating and tidal wood share the Driftwood label and basic log geometry. Reproduce the actual interaction before claiming a fix; domain correctness alone does not establish readable presentation or correct UI targeting.

## Diving MVP

The current implementation needs an immersive, readable underwater activity. Limit the MVP to a small cleanup area and the challenge of managing a snorkeler's breath.

### Movement and breathing

- Basic goggles and a snorkel/breather only; the starting character swims relatively slowly.
- The player can swim through the underwater area and go up to the water surface to replenish air while remaining in the water, then descend again.
- The player and nearby targets must be clearly visible. The current experience of appearing under the raft with an obscured, murky character is inadequate.
- A side-on swimming space with 3D visuals and vertical movement is the proposed presentation to explore. The exact view and layout are not locked.

### Cleanup action and reward

- Place a limited set of trash in a small underwater patch. A localized greenish tint is a suggested way to distinguish the affected water while preserving an attractive surrounding ocean.
- Attach a small collection bag to the diver by a string. It follows the swimmer and grows slightly as trash is collected.
- Make trash visibly enter or otherwise clearly transfer into the bag; the exact action and animation are implementation choices, not a new minigame requirement.
- Completing the cleanup successfully clears that dive spot on the map. The area becomes cleaner and more beautiful, providing the MVP reward.
- Additional material payouts, new boats, equipment rewards and a broader economy are not needed to validate this MVP.
- Required art includes readable snorkeler/swimming and breathing behavior, trash, the trailing bag and attachment, an attractive underwater environment, affected/clean presentation, and clear map completion feedback. Reuse existing art where it serves these outcomes.

### Failure and full restart

A dive is a level with objectives. It must be completed without a failure. If the player runs out of air, the whole attempt fails: all cleanup objectives from that attempt reset, including objectives already completed during it. Reset the attempt's trash, bag progress and other temporary state consistently. The previous recommendation to retain completed objectives was rejected by Jaco.

Offer an immediate restart of the dive or an optional return to the raft to come back later. No waiting penalty, cooldown, mandatory raft trip before retry, or checkpoints in this MVP. Normal surfacing for breath is part of the attempt and does not reset it.

Keep successfully cleared sites and unrelated voyage/equipment progress distinct from an unfinished attempt. The precise completion trigger (last trash pickup or an explicit safe exit) was not chosen in the interview; resolve that detail consistently before implementing persistence. Do not silently add a new exit challenge. The central rule is that permanent completion follows a successful dive, not partial work from a failed one.

## Later ideas outside the diving MVP

- Fins increase swimming speed.
- A wetsuit opens deeper, colder water.
- Scuba equipment supports an entire dive without surfacing for oxygen, freeing attention for more complex activities.
- Small environmental puzzles and navigation challenges can add variety.
- Occasional shark encounters can ask the player to hide until the shark passes. A catch fails the whole dive, even if its individual objectives had already been completed before the dive ended.
- Checkpoints may become useful for much longer dive levels, but are deliberately excluded now.
- Equipment/boat rewards, production chains and a larger progression economy remain later work. The fuel/biofuel example illustrated purposeful resource use; it was not an agreed feature.

These remain a recorded direction, not an instruction to implement them with the cleanup MVP. No sharks, puzzle failure systems, advanced dive gear or checkpoints are required for this first dive.

## Decisions to resolve through implementation planning or prototypes

The user has asked for no more broad interview questions and has now authorized execution. Resolve these choices through bounded implementation planning and prototypes: exact sailing and diving views, camera/input details, cleanup interaction, station selection, opening sequence, successful dive completion trigger, voluntary exit/save behavior for an unfinished attempt, and numerical tuning. Record decisions and assumptions. Ask only when missing information materially affects direction; do not require a complete economy or answers to every earlier interview branch before testing the bounded cleanup activity.

## Proposed delivery and validation

The implementation sequence and validation approach below are the interviewer's proposals for executing the user-approved scope; they do not expand the product feature set.

First establish the complete small cleanup attempt: enter, swim, collect into the bag, surface for air, fail and restart, finish and see the map/world change. Compare underwater presentation while working on that same activity. Camera, diver visibility, assets and feedback need to be assessed together. Deliver the title/UI, helm, camera inspection, station/cabin interactions, gathering and tide consistency work as part of the full improvement scope, choosing a bounded useful station implementation rather than building every possible station.

An interaction designer and engineer should define the attempt lifecycle and inputs together; an artist/animator should make swimming, bag collection and restoration readable. Independent art/code reviewers and QA should evaluate the integrated result. Human play observations remain necessary for clarity and feel. The latest model instruction supersedes earlier preferences: use gpt-6-astra at low reasoning effort for complex and artistic work, and gpt-6.1-sol at low reasoning effort for everything else. Apply this to specialist assignments as well as project management. This handoff does not itself claim that implementation, a team or a goal has already started.

Review evidence should include:

- Matched title/first-view/gameplay captures, including a nearly square window and the earlier wide benchmark view.
- An uncoached first interaction that establishes the player's immediate goal without the old panel overload.
- A complete snorkel cleanup, normal surface breathing, deliberate air exhaustion after partial cleanup, and immediate retry with all attempt objectives restored. Check repeated retries for duplicate rewards or surviving partial completion.
- Successful site clearing reflected in both the map and the underwater scene, preserved across save/reload without modifying other completed sites.
- Readable diver, targets, bag attachment/growth and clean/affected water at the actual play camera. The tint must not reproduce the old murky-player problem.
- Helm entry/exit and vessel-relative movement tests, with no stray steering input while inspecting stations or changing view.
- Browser reproduction and resolution of the tide/pickup incident, separate from the limited existing rule probe.
- Relevant rule/save, input/focus, resize, reduced-motion and rendering checks. Protect existing saves; define migrations if the state model changes.
- Comparison with the historical M4 Pro/Chrome benchmark where possible: 1440×900, DPR 1, High; 59.88 median FPS and 16.7/16.8 ms median/p95 frame intervals in a 20-second sample. This is a reference measurement, not certification of other hardware or long sessions.

Retain the historical nine-dimension rubric and original 75/100 target for comparable reporting. Its 72.7 score and onboarding 4/5 are agent judgments, not evidence that Jaco understood or enjoyed the opening. No revised numeric targets or new rubric scores were agreed. Assess clarity, action satisfaction, reset correctness and visible progress through the new evidence without lowering a threshold to declare success.

Jaco has requested execution in a new chat. Its filled Goal prompt incorporates this full scope and the project references; the new chat should activate the Goal and carry the work through implementation, independent review, testing and iteration. Do not restart the broad interview or include the explicitly deferred diving features.


