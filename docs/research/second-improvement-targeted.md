# Tidekin second iteration: targeted evidence and experiments

Prepared 9 October 2026 (Pacific/Auckland). Research-only handoff; no source changes or new gameplay validation. Scope: gradual onboarding, direct raft interactions, restoration feedback, underwater readability, and forgiving retries that reset the complete attempt.

## Evidence boundary and audit

Read the workspace instructions, second-improvement goal (historical source: `git show 79da54b:docs/second-improvement-goal.md`), brief (historical source: `git show 79da54b:docs/second-improvement-brief.md`), [player interview](../reviews/player-interview.md), and existing [cozy-systems](cozy-systems.md) and [cross-genre](cross-genre.md) research. The goal document describes the larger execution team's task; this specialist owns only this research file. Primary sources below were browsed for this targeted investigation. No comparison game was played, no new human participants were recruited, and no current Tidekin build was tested here.

Evidence labels used below:

- **Reported observation:** Jaco's experience recorded in the interview; valuable first-session evidence from one participant, without recorded timings or exact inputs.
- **Requirement:** Jaco's latest explicit decision, carried by the brief. This determines scope regardless of comparison games.
- **Documented precedent/guidance:** a creator's description of their game or a guideline author's recommendation. Neither proves a causal benefit for Tidekin.
- **Hypothesis/proposal:** a transfer or tuning choice requiring playable evaluation.

| Area | Evidence already available | Remaining gap |
|---|---|---|
| Gradual onboarding | Jaco reported competing panels, an immediate popup, unclear gathering purpose and reward value. Historical onboarding 4/5 was an agent judgment. | Which first action conveys a wanted outcome with less simultaneous information? Removing text alone does not establish comprehension. |
| Direct interactions | He clicked helm, door, plants and other raft objects without response. Vessel-relative steering and leaving the helm are requirements; full deck walking is not. | Which objects are recognizably actionable, and can players predict their result and return to sailing? Camera choice remains open. |
| Restoration | Local cleanup, bag transfer/growth, cleaner world and cleared map site are requirements. | Whether the action and its lasting result are visible and satisfying at the actual camera, rather than merely reflected in counters. |
| Underwater readability | Jaco reported appearing under the raft, struggling to see the explorer and experiencing another murky E-to-gather loop. | Camera, target contrast, depth/vertical navigation, collection range and breathing must be evaluated together in motion. |
| Retry/reset | Whole-dive objective reset, immediate retry, optional raft return and no checkpoints are explicit Round 7 requirements. | Whether players understand the reset boundary and can use knowledge from failure without a punitive replay burden. |

### What to retain and supersede from existing research

The existing research usefully distinguishes creator descriptions, individual reviews, dated reception snapshots and transfer hypotheses. Its warning that reception does not prove mechanics caused success remains valid. Individual Steam reviews describe their authors' experiences; small contrasted samples cannot establish complaint prevalence or Tidekin audience preference. No review-count refresh or 20-game replication is needed for these five questions.

Retain the ideas of visible useful consequences, inspectable outcomes, contextual feedback and recovery without dead ends. Treat dated source audits as historical snapshots, not current-build facts during parallel implementation.

**Superseded for this iteration:** cozy-systems' endorsement of an 18-second no-loss dive/rescue plus recovery delay, and cross-genre's checkpoint/retained-salvage proposals, cannot govern the cleanup attempt. Reset every current-attempt objective and bag contribution after failure; preserve unrelated voyage state and previously completed sites. The old 18-second value is not a new tuning target. Normal surface breathing stays within the attempt. The older mechanism-building slice, multiple tool choices, companions, social quests, machinery vocabulary and storage comparisons are outside this targeted assignment and must not become delivery dependencies.

The tide rule probe is limited evidence at exact node positions. It does not reproduce Jaco's runtime incident or establish correct visual targeting. Keep that issue open for browser QA; use distinct floating versus anchored presentations as a readability hypothesis, not a claimed diagnosis or fix. [Interview, Round 4](../reviews/player-interview.md).

## Targeted primary-source findings

### 1. Teach through an action with a visible purpose

**Guidance:** Game Accessibility Guidelines recommends interactive tuition over an instructions screen and teaching mechanics within gameplay, explaining that practising in context reduces the need to remember instructions for later. This supports contextual teaching, not eliminating all help. [Include interactive tutorials](https://gameaccessibilityguidelines.com/include-interactive-tutorials/).

**Guidance:** Microsoft's UI-context guideline recommends making an element's purpose, operation and expected consequence understandable; labels should be associated with their elements and help should be contextual. [XAG 114: UI context](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/114).

**Tidekin hypothesis:** a quiet view, one discoverable raft action and a visible consequence will teach purpose better than the existing simultaneous panels. Show a concise action prompt when its object is targeted, then reveal the next relevant cue after the action. Keep map/journal access readable and available; progressive teaching should not hide the only route to essential help. Do not infer that “no text” is best, or that a checklist completed by an agent proves human understanding.

### 2. Make objects' interaction promises reliable

**Guidance:** Game Accessibility Guidelines explicitly recommends indicating that interactive elements are interactive. Microsoft's object-clarity guideline recommends reviewable objectives and demonstrates an on-demand hint identifying remaining objects and their destination. These support legible affordances and reminders; they do not specify a world-click camera architecture. [GAG full list](https://gameaccessibilityguidelines.com/full-list/), [XAG 109: Object clarity](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/109).

**Tidekin hypothesis:** use one consistent hover/focus cue and short verb for helm, the chosen useful station and cabin door. Clicking should produce the promised control/view, with an equally discoverable way back. Keyboard activation should provide the same result. An inactive station should disclose its bounded purpose or availability, rather than silently failing. Decorative plants do not require production systems; avoid making every prop glow as if actionable.

Apply the same principle to pickups: position, silhouette and target wording should distinguish a free-floating object from anchored/tide-covered wreckage before a blocked action. A world explanation near the target is preferable to teaching hidden categories through repeated rejection. This is a proposed presentation improvement, not proof of the reported bug's cause.

### 3. Let the place show the work

**Documented precedent:** Moon Lagoon's Loddlenaut description connects clearing goop/debris with reviving underwater ecosystems and making polluted waters habitable; it also describes recycling and creature care. This is a directly relevant relationship between an action and a changed environment, not evidence about ideal collection timing or reward strength. [Creator-authored Steam description](https://store.steampowered.com/app/1644940/Loddlenaut/).

Loddlenaut is a targeted precedent outside the old cohort's release window, not a replacement cohort member. Its gadgets, care, crafting and expanded biomes are not recommendations for this MVP. The existing Aloft profile's restoration/audio examples remain background hypotheses; this investigation does not independently revalidate every linked update.

**Tidekin hypothesis:** make each collection visibly transfer trash into the trailing bag, then make successful completion change the local scene and map consistently. The bag communicates attempt progress; the changed place communicates durable achievement. Use the same camera and lighting to assess before/after. Removing trash plus easing local haze can be enough; do not require new fish behavior, payouts or an economy to create a result.

Partial removal is temporary. A failed attempt must visibly restore its trash and bag, and must not leave a permanent clean tint or cleared map marker. Reserve the unmistakable final restoration treatment for successful completion so world presentation agrees with persistence.

### 4. Keep the swimmer, surface and action readable

**Guidance:** XAG 102 asks whether important gameplay elements remain visible against their backgrounds and gives contrast guidance for important visual information. For text over non-solid backgrounds, it recommends measuring against the least contrasting background region. Its UI contrast numbers should not be presented as a certified pass for a moving, shaded 3D swimmer. [XAG 102: Contrast](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/102).

**Tidekin hypothesis:** localize green water treatment to the affected environment; keep the swimmer and nearby targets readable through value/silhouette separation and restrained foreground clutter. Keep the surface visible or consistently indicated, show upward swimming and breathing clearly, and provide a visible air cue whose recovery agrees with the breathing animation. Do not rely only on color or sound. A side-on scene may simplify vertical navigation, but no browsed source establishes that it will outperform a close following view for Tidekin.

Moving visibility matters: a readable still image can conceal camera occlusion, bag overlap or target confusion during turns. Test both polluted and restored states, with UI open/closed where relevant, at a wide and nearly square viewport.

### 5. Separate reset scope from retry friction

**Documented precedent:** Celeste's creator-authored store description emphasizes simple controls and rapid respawns. This supports fast re-entry as a design precedent, but does not establish that a whole cleanup level reset feels forgiving; it supplies no measured retry-time prescription. [Celeste on Steam](https://store.steampowered.com/app/504230/Celeste/).

**Requirement:** Tidekin resets the whole failed dive. **Hypothesis:** it can still feel approachable if the cause is legible, the initial attempt is small, surface breathing is taught before depletion, and restarting is one direct choice without travel or cooldown. Keep the initial trash layout stable across retries so a better route can reflect learning. Do not compensate by retaining objectives or adding checkpoints.

Suggested failure copy: “Out of air. This cleanup attempt resets.” Actions: “Retry dive” and “Return to raft.” Copy is a proposal. Explain the consequence before starting via a short contextual cue, not a long warning screen. Previously restored sites must stay restored. A fast retry cannot compensate for repeated losses caused by unreadable controls.

## Small concrete experiments for this build

All timings, counts and layouts below are proposed formative parameters, not agreed acceptance gates or published benchmarks. Preserve the project's existing quality rubric. Use disposable saves for failure testing, record the exact build and viewport, and avoid developer coaching. Agent sessions can find interaction defects; only human observations can inform human clarity, satisfaction or willingness to repeat. Do not recruit/message participants from this assignment.

| Experiment | Bounded comparison or task | Record and decision |
|---|---|---|
| E1 — Quiet first action | Same scene and first useful outcome. Compare the old opening with one active contextual prompt; reveal later hints after relevant actions. Observe the first two minutes before asking about purpose. | First attempted click, wrong clicks, stalls, help use, and the player's account of what changed and why. Keep the quieter version only if it improves both focus and understood purpose; restore a missing local cue rather than adding all panels back. |
| E2 — Raft objects and helm | Same helm, chosen station and cabin. Ask for take helm → steer toward nearby salvage → leave helm → use station/open cabin → resume. Compare first-person and close-follow helm views in counterbalanced order where practical. | Target acquisition, predicted action, accidental steering during inspection, exit discovery and station result comprehension. Choose the view that makes the whole sequence readable, not the more attractive screenshot. No full deck-walking dependency. |
| E3 — Trash to changed place | Same small site and collection rules. Compare disappearance/chime with a brief visible trash-to-bag transfer. Use matched before/after world views and a cleared map marker on success. | Whether the player tracks the destination of trash, notices bag growth, identifies the changed area without being told, and distinguishes temporary cleanup from lasting success. If transfer is missed, adjust camera/visibility before extending animation or adding celebrations. |
| E4 — Swim, breathe, return | Same site, trash positions, swim speed and air budget. Compare side-on 3D and close-follow presentation. Put one initial target shallow enough for a safe round trip. | Initial swimmer identification, intended versus actual direction, locating the surface, understanding air recovery, occlusion and collection-range errors. Adjust one variable at a time. Failure here blocks interpreting air tension or retry preference. |
| E5 — Full reset with immediate retry | Collect two of a proposed four-to-six pieces, deliberately exhaust air, retry immediately, then complete. Compare a second ordinary attempt after learning the route, without changing layout. | Failure cause comprehension, expected versus actual reset, time from retry activation to control, repeated collection burden, planned surfacing and willingness to continue. Proposal: aim for control within one second of retry activation, excluding time choosing; measure it rather than claim it. If replay drags, reduce site/trash traversal or retune air, preserving full reset. |

Suggested tuning method for E4/E5: measure actual slow-swim travel from the deepest target to the breathing band, including a normal turn and targeting action. Start with enough air for collection plus that return and a generous observed error margin; do not copy the old 18-second timer. Keep normal surface refill separate from failure and avoid a lingering oxygen countdown while the player is choosing Retry. Numbers should follow the playable route, not determine its readability in advance.

Suggested implementation default for the team to evaluate: complete on the final valid collection, then commit restoration once. The brief permits this choice; it avoids an unrequested exit challenge. Decide update ordering for an air-depletion/final-collection tie and test it explicitly. This is a design recommendation, not an externally established rule. Voluntary exit/reload policy likewise needs a single recorded contract for unfinished attempts; it must not permit banking partial completion contrary to the full-reset requirement.

## Verification handoff and unresolved questions

Before declaring the integrated loop clear, reviewers should observe these separately from aggregate score:

- Normal surfacing restores air without restoring trash or emptying the bag.
- Failure after partial work restores all attempt trash, bag state and temporary visuals; retry is directly controllable without a raft trip.
- Successful completion changes map and world once and survives reload; unrelated progression and earlier completed sites survive failure/retry.
- World-click and keyboard interaction agree; camera changes, station access and focus loss do not leak helm or swim input.
- Floating versus tide-covered objects are understandable in actual browser sequences. The existing exact-position rule probe cannot close the incident.
- Swimmer, surface, bag/string and targets stay readable during motion in both affected and clean water, at both viewport shapes. Captures should retain failures as well as successful outcomes.

Remaining empirical gaps: no source establishes the best camera, collection duration, trash count, air budget or human replay tolerance for this specific game. No new human evidence establishes enjoyment or retention. These gaps call for the bounded experiments above, not more comparison games or new features. The strongest immediate recommendation is to validate one complete understandable outing—from discovering an action, through swimming and breathing, to full reset and durable restoration—before increasing content.
