# Tidekin third improvement execution brief

9 October 2026, Pacific/Auckland. Jaco explicitly requests execution in one new chat in **jaxs-tidekin**, with this full brief, interview evidence and research incorporated into its Goal. This supersedes the interview's historical research-only boundary and the older brief's exclusion of cleanup rewards. No implementation is assigned to the interview chat.

## Desired outcome

Deliver the complete player-grounded third improvement iteration: a charming coherent interface and focused interactive opening; persistent destination guidance; readable, predictable sailing and gathering; raft-based construction; restoration rewards funding a useful waterwheel; a visible sheltered-area departure challenge overcome by that wheel; and credible, responsive underwater restoration with all discussed prototype alternatives implemented and toggleable for hands-on comparison. Carry the work through specialist production, independent review, QA and refinement to a polished local beta candidate. Preserve uncertainty about enjoyment and final prototype preference.

## Context and ownership

Tidekin is a local single-player Three.js/Vite ocean exploration/workshop game. It should be relaxed and attractive, with concrete progress and local restoration, rather than survival upkeep. Jaco liked the original illustration/world, but his latest playtest describes fundamental dissatisfaction with the interface, learning, navigation, collection, sailing visibility and dive feel. The previous 75.2/100 is a provisional agent judgment, not human endorsement or an inherited score.

Own the entire implementation iteration in one independent user-owned execution chat. Use specialist subagents, not additional user-owned chats. Project root in Codex is `/Users/jacobusbrink/Jaxs`; actual game and all durable outputs belong at `/Users/jacobusbrink/Jaxs/projects/tidekin`. Work in the existing checkout; no worktree requested. Check current changes before editing, use disjoint specialist write scopes, and avoid colliding with any existing process/work.

Parent interview: `01a11e41-fa08-7ac0-8e7c-50b92ae06d5a`, host local. Previous implementation: `01a11dce-0172-7e00-8a63-52835799e43e`, host local. Earlier interview: `01a11d67-8117-71d3-a5e2-805d874b8ddf`, host local. Read the parent with read_thread and paginate as needed; extract human statements and final evidence rather than huge tool dumps. If inaccessible, use the saved evidence and explicitly preserve missing context.

## Goal activation

This new execution chat is explicitly authorized to create and pursue a Goal. Check get_goal first and avoid duplicate activation. If the objective length limit prevents registering this whole document, register a concise objective explicitly incorporating **every section of this file and the complete current interview/research files below** as binding scope. Do not truncate the scope to diving, selected priorities, a prototype plan or an initial task. No token budget requested. Begin execution immediately, not another broad interview. The interview parent must not create this Goal for itself.

## References and constraints

Read applicable AGENTS.md/CLAUDE.md, including `/Users/jacobusbrink/Jaxs/AGENTS.md`. Read these game-relative references in full where relevant:

- `docs/reviews/current-beta-player-interview.md`: complete current human findings, corrections, confirmed preferences, proposals and unknowns; incorporated into this objective.
- `docs/research/underwater-mechanics-player-feedback.md`: primary-source precedents, source observations, both input schemes, both cleanup actions, comparison proposals and limits; incorporated into this objective.
- `captures/current-beta-player-interview-2026-10-09/jaco-log-before-overlap.png` and `jaco-log-high-tide-inactive-gather.png`: inspect actual images, not only captions.
- `README.md`, `docs/PROJECT.md`, `docs/design-decisions.md`, `docs/art-direction.md`, `docs/performance-budget.md`, original `assets/reference/ocean-workshop.png`, and original title/gameplay annotated captures under `captures/player-interview-2026-10-09/`.
- `docs/second-improvement-brief.md`, `docs/second-improvement-design.md`, `docs/reviews/second-improvement/{delivery,human-handoff,scorecard,goal-status,technical-review,qa,camera-comparison,art-review}.md` and release manifest: previous implementation and evidence, not authority to override new human direction.
- Existing research under `docs/research/`, source modules and editable Blender/procedural assets. Audit actual runtime and asset provenance before claims. Native ImageGen/Blender may be used where helpful; preserve editable sources and original liked illustration.

Documented previous candidate is 0.3.0-beta.1, entry `index-CLQfBj9P.js`, preview `http://127.0.0.1:5181`. The interview HTTP probe could not verify accessibility; check listener/build before using or restarting. Preserve origin/browser/profile and user saves. Run destructive tests and prototype reset fixtures in isolated storage; keep a same-origin live preview accessible for Jaco. No public deployment, recruitment or external messaging authorized.

## Full implementation scope and evidence

### Interface and interactive learning

Jaco calls every UI element ugly, flat, too textual, mismatched to the game's style and lacking charm/cohesion. Many menus make the experience feel like a kitchen sink. This requires a substantial visual and interaction redesign, not a few label/color changes. Preserve the liked title art and attractive world. Establish a deliberate visual vocabulary, readable hierarchy and restrained presentation with useful information revealed at the moment it matters.

Build a friendly, single-focus interactive opening with attractive animated click/action cues. Teach through performing movement, collection and diving, acknowledging success and moving to the next skill. Avoid a wall of text or simultaneous prompts. Support skipping/revisiting guidance and continued saves without forcing repeat tutorials. Starting activities should be visibly polluted patches at specific dive sites; a bounded couple of cleanup tasks teaches the basics and provides rewards toward the wheel. Choose a small sufficient authored sequence, not a catalogue of unrelated starter tasks.

### Navigation

Track currently produces a brief “Tracking Mangrove” toast and no guidance Jaco can use. Implement a persistent arrow near the top of the screen pointing toward the tracked destination relative to sailing heading: turns/detours rotate the arrow; facing the destination makes it point up/ahead. It guides without steering. Home is tracked explicitly through the map using the same system. No tracked destination means no arrow; the user's “no error” was contextually interpreted as “no arrow” and stated for correction. Do not infer fixed geographic north or an always-visible home arrow. A minimap is not separately required by the later specific solution. Track selection, clear/change and arrival need coherent state and feedback, including locked areas without misleading guidance.

### Sailing, gathering and reported failures

The raft obscures travel direction, intersected targets and collection animation. Implement both first-person helm and an improved following view, selectable for comparison, with the same vessel-relative controls. The previous wheel-eye option was rejected for shell clipping: solve clipping/visibility rather than merely restoring the defective camera. Maintain inspect/zoom/rotation and take/leave helm/station transitions. Make pickup targets and feedback visible at the actual camera; do not animate rewards invisibly through the hull. Communicate interactability before overlapping targets, with readable feedback beyond a tiny color-changing E button.

Reproduce and investigate the current wooden-log incident using the retained screenshots and scene geometry/target identities. Jaco could collect starter piles but repeatedly could not collect farther-away objects. Gather did not change color. He identifies wooden logs; the second screenshot is reported high-tide raft overlap with Gather inactive and Salvage dive offered. The same bundle was already inaccessible **before high tide**; exact tide height, world coordinates, and a post-fall retry are unverified. Do not rewrite this as a successful pre-high-tide pickup or assume anchored-category rules explain away the experience. If a rule is functioning but visual affordances imply floating pickup, correct that mismatch and demonstrate the result. Fix actual targeting/proximity defects when reproduced. Keep current incident evidence separate from the older historical high-to-low incident and controlled passing cases. Do not claim the older exact incident reproduced if its sequence remains unavailable; deliver meaningful current investigation and keep any residual gate visible.

### Raft construction and tangible progression

Jaco discovered the wheel prerequisite on the map and build menu by chance. He did not understand task origin, benefit, costs or whether gathered scrap paid for it. Returning to the starting ocean patch to build felt arbitrary; it has no meaningful base function for him. Enable construction aboard the raft while exploring, with sensible station/input state, rather than a hidden home-location restriction. Show a wanted result, readable requirements/current supplies and actual spending/build feedback.

Wheel increases sailing speed and permits overcoming a visible current/wave departure boundary around a generous sheltered starting area. Before upgrading, approaching the boundary visibly pushes the raft back and provides brief contextual insufficient-speed feedback; slight motivating frustration should demonstrate need without trapping or punishing the player. After construction, the raft visibly clears the challenge. Ensure chart/quick passage cannot silently bypass the intended first departure milestone. Tune through play; no new speed/area-size targets invented. Keep a small learnable restoration-to-wheel arc with clear rewards, no starvation/fuel maintenance economy. Extend the boundary pattern beyond the start only if necessary to the bounded route, not as an automatic regional overhaul.

### Diving and toggleable comparisons

Jaco reports slow motion, fixed inclined pose/head failing to point down, repetitive E pickup, a silly/unconvincing bag and artificially arranged floating trash. The separate side-view dive works mechanically but is not enjoyable for him. Source inspection confirms fixed underwater inclination based on horizontal facing. Align head/body to travel direction including descent/ascent, improve strokes/reach/breathing, responsive motion and restrained glide; compare current and quicker movement tuning without hidden differences in air/failure difficulty.

**Build all the discussed bounded prototype alternatives, retain them in the delivered candidate and expose clear toggles for Jaco to compare:**

- Directional swimming plus pointer-selected click/hold interaction.
- Pointer-led swimming plus clearly distinguished object interaction, resolving movement-versus-action ambiguity.
- Pulling lodged rubbish free, with visible reach/resistance/release/stowing and local change.
- A continuous cleaning pass/tool action over visible surface pollution.
- Current versus quicker swim tuning, plus first-person versus improved-follow sailing above.

Support both input schemes with both cleanup actions where appropriate; deliver the four input/action combinations rather than picking only the researcher's favorite. Keep comparison selection in a compact optional test panel that does not clutter normal onboarding. Switching variants must not silently destroy earned saves, grant duplicate rewards, leave stale effects/input, or create unfair air/task differences. Use clearly labeled disposable comparison resets when a fresh trial is necessary, preserving the user's voyage. Expose controls and current variant succinctly. Select a provisional default but retain alternatives for later human preference. Research proposals are now authorized experiments, not proven fun or settled winners.

Use grounded seabed/snared rubbish and plausible drifting lighter objects, coherent moving vegetation, subtle particles/bubbles, surface lighting and underwater sound. Keep the swimmer and action readable. Repair the bag's attachment, silhouette, contents, growth and trailing behavior; prior desire for a bag is not endorsement of its current presentation. Merely changing E to click is insufficient; make the action tangible and the result visible.

Some Dive actions currently enter legacy world swimming. Jaco expects the new side-view experience. Audit and resolve user-facing dive routes so available salvage/cleanup entries lead to a coherent intended side-view dive, rather than surprise raft-jump swimming. Preserve earned legacy resource/expedition progress and migrate or adapt relevant objectives; do not delete saves or leave essential resource progression unreachable. Historical existence of a legacy mode does not dismiss the current expectation mismatch.

Keep snorkel/surface breathing, whole-attempt failure reset, immediate retry or raft return, and permanent successful restoration. No checkpoints, cooldown, mandatory raft trip before retry or partial reward banking. Cleanup rewards toward the wheel are newly authorized: grant on successful completion, once, with visible resource/use feedback; prevent duplicate payouts on retries/revisits/reload. Preserve unrelated voyage progress. Resolve voluntary exit/reload/completion behavior coherently and document any changed contract. No sharks, combat, advanced dive gear, broad puzzle systems or creature-care catalogue required.

## Role and team

Act as project manager: define bounded scope/contracts, coordinate specialist dependencies, integrate work and drive review/fixes to delivery.

- Researcher: audit the supplied primary-source evidence and close concrete gaps in underwater motion/interaction, focused teaching, navigation and ability gates; do not restart a broad genre survey or treat popularity as proof of fun.
- Designer/creator: cohesive charming UI, action-led tutorial, sailing camera/readability, sheltered departure scene and convincing underwater art/motion; produce editable assets and both cleanup interaction designs.
- Design reviewer: independently assess actual wide/square gameplay and motion against original art, screenshots and latest human dissatisfaction; compare all variants, not menu illustrations alone.
- Engineer: implement full scope, deterministic progression/reset/rewards, input abstraction, safe prototype toggles, save migration and clear module ownership/performance.
- Technical reviewer: independently review targeting, camera clipping, boundary movement, tutorial state, rewards/save atomicity, variant transitions, legacy migration and resource lifetimes; verify fixes.
- QA: actual-input workflows, screenshot-associated pickup cases, tide/overlap, navigation/arrival, tutorial, boundary before/after, both cameras, all input/action variants, failures/retries/save return, layouts/accessibility and hardware performance.
- User testers: separate novice/expert agent sessions with earned progression and actual inputs, realistic detours and failures, comparisons in differing orders. Label these agent sessions. Prepare Jaco's concise toggle-testing handoff; do not fabricate human validation or recruit anyone.

## Process

1. Inspect current source/build, full evidence and references; capture honest baseline, including known failures and actual motion.
2. Define complete MVP, acceptance cases and unchanged weighted rubric; document assumptions and comparison controls.
3. Implement all scope and alternatives with specialist work in parallel where disjoint; sequence input/state/save contracts before integration.
4. Conduct independent design/technical review and actual-input QA, resolve findings and preserve before/after evidence.
5. Refine to a polished local beta comparison candidate suitable for Jaco's hands-on review, without adding deferred systems.
6. Repeat targeted review/testing only when changed behavior, failures or unresolved concerns justify it. Keep substantive failures visible separately from aggregate scores.

## Completion and validation

Deliver working build and accessible same-origin preview; complete implementation and toggleable variants; updated README/architecture/design decisions; editable art/provenance; matched screenshots/motion; tests, hardware benchmark, review dispositions and fresh scorecard; a player-grounded handoff listing controls/toggles and outstanding uncertainties.

Required earned arc: start → focused movement/collection teaching → specific visible cleanup dives → successful restoration/rewards → understandable raft-built wheel → visible boundary crossing → Track Mangrove and navigate with persistent arrow → track home → save/continue with progress intact. Also verify failed collection explanation/behavior, visible pickup transfer, both sailing cameras, all four dive input/action combinations, normal breathing, complete failure reset and immediate retry, voluntary exit/reload, site permanence and no duplicate rewards. No surprise legacy world-swimming route.

Preserve the existing nine dimension weights: core interaction16, progression/session return14, tide/exploration12, art14, animation/feedback10, onboarding/usability10, reliability/persistence10, performance8, accessibility/settings6. Retain historical beta gate ≥75/100, each dimension ≥3/5 and no critical defect; do not change weights or inherit ratings to declare success. These are agent judgments. Human enjoyment, camera preference and action preference remain unvalidated until Jaco plays alternatives.

Use existing hardware protocol: measured modern laptop, 1440×900, DPR1, High, five-second warmup and 20-second samples; median frame interval ≤20ms and p95 ≤33.4ms from existing performance budget. Record browser/GPU/view/settings/build and long frames/resource counts; separate software/headless from hardware results. Include nearly square/compact layouts, larger text, contrast, keyboard focus, reduced motion and repeated transitions. No unsupported mobile/controller certification or newly invented numeric satisfaction targets.

## Working preferences

Use **gpt-6-astra, low reasoning** for project management, complex/creative/artistic work and corresponding specialists; **gpt-6.1-sol, low reasoning** for routine tasks and other specialists. Latest explicit instruction supersedes older preferences. Keep concise progress updates; make bounded implementation choices and ask only when missing information materially changes direction. No restart of the broad interview. Keep facts, human reports, hypotheses and measured results distinct. Do not lower acceptance criteria or claim agent checks establish fun. No communication with other user-owned chats unless separately authorized.
