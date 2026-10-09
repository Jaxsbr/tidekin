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
