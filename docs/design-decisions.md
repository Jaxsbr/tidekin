> Historical design rationale, not current gameplay instructions. Read [current contract](governance/current-contract.md) and coordinator-owned architecture for current behavior and ownership. Retired iteration sources are recoverable from Git baseline `79da54b`.

# From research to Tidekin

Decision record, 8 October 2026. Evidence lives in [cozy systems](research/cozy-systems.md) and [cross-genre games](research/cross-genre.md). The cohort includes 20 distinct games across multiple genres, qualifying through initial playable releases or substantial 1.0 releases between 8 October 2024 and 8 October 2026. Earlier Early Access dates and mixed reception are explicitly retained in the research. Success means evidenced audience traction, not an inferred profit figure.

## MVP decisions

| Research relationship | Relevant games | Implemented interpretation | Verification |
|---|---|---|---|
| A traveling home makes finds immediately relevant | Aloft, Forever Skies | Raft carries its cabin, plants and contraptions; built upgrades appear on deck | Runtime art captures and upgrade playthrough |
| Automation frees the player for another activity | Slime Rancher 2, Oddsparks | Wheel stores tide energy, crane produces wood/scrap, greenhouse produces wood | Domain tests compare large and small timesteps; earned progression test |
| Earned capabilities open places | Abiotic Factor, Grounded 2, Silksong | Wheel opens Mangrove, greenhouse opens Reef, sail opens Beacon Shoal | World gates and exploration tests |
| A short failure should leave a clear recovery route | Forever Skies feedback, DOOM checkpoints | Oxygen rescue returns home, preserves resources, imposes six seconds recovery | Exhaustion/boundary tests and QA |
| Visible goals can guide without mandatory chore chains | Dinkum, Tiny Bookshop | Optional journal rewards; all required pearls exist in the world without claiming quests | Independent no-quest supply test |
| Accumulated investment survives stopping | Broad persistent-world cohort | Autosave/actions/page-hide saves, continue, strict validation, prior-format migration | Save round trips, corrupt-save tests, browser reload |

The baseline has a short finite upgrade arc. It is intentionally not described as a factory simulator or construction sandbox: recipes assemble predetermined modules, rather than arbitrary physically simulated contraptions.

## Beta iteration 1: replace a checklist moment with a choice

Research criticized the mandatory five-upgrade chain: it provides progress, but does not provide different builds. Rather than add more mandatory recipes, the wheel unlocks three freely reversible expedition rigs at the home anchorage:

| Rig | Sailing speed | Air | Intended choice |
|---|---:|---:|---|
| Wanderer | 5 m/s | 18 s | Balanced mixed excursion |
| Skimmer | 7 m/s | 12 s | Faster travel and surface salvage, short dives |
| Pearl diver | 3.5 m/s | 28 s | Slower travel, longer underwater route |

The inspiration is legible loadout trade-offs in Path of Exile 2/Mewgenics and previewable planning in Slay the Spire 2, adapted without combat, deck complexity or permanent loss. This is a hypothesis to test, not proof of fun. Rigs cost no resources, cannot be switched underwater or away from home, persist across saves, and do not refill air instantly. Existing saves migrate to Wanderer. Their names and exact consequences are shown before fitting.

The tide HUD also forecasts the actual salvage threshold: seconds until shallow salvage is covered or exposed. Domain and UI use the same threshold. High water supplies more simplified game energy; this is not a physically accurate current simulation. Forecasting makes timing observable rather than leaving players to infer it from a decorative label.

Art iteration replaces a regular dot-like sea pattern with irregular swells, curved foam and directional highlights, removes oversized circular sand plates, corrects articulated pivots, preserves an independent swimmer, and stops decorative animation under reduced-motion settings. These are verified against new captures, not assumed improvements.

## Next features for a wider beta

The local beta should be treated as a small vertical slice. Priority after current validation:

1. Real novice/human sessions: observe first salvage, first dive, rig choice and save return without coaching. Eight participants is a starting research sample, not statistical proof.
2. Additional assembly freedom: two slots and interchangeable float/pulley/valve modules, with visible cause and effect, undo and no irreversible trap. Prototype one machine with two uses before expanding the catalogue.
3. One restored route and returning island visitor: spending resources should change a place or relationship, not merely extend numerical requirements.
4. Save export/import with clear backups and device portability; browser-local storage is currently the only persistence.
5. Expand the authored landmark set into distinct playable island layouts and more tide channels, then controller and touch testing. Current keyboard/buttons target desktop; the final candidate already includes three distinct Blender horizon landmarks and two shallow routes.
6. Hardware browser benchmarks on at least one integrated-GPU laptop and a lower-end device. Software rendering is only a compatibility profile.
7. An explicit long-term endgame: the beacon currently ends the main progression arc. Repeated exploration alone is not sufficient evidence of enduring replay value.

Do not add inventory handling chores, destructive raft loss, hostile combat, online accounts, or a large currency economy without demonstrating a benefit to this game's core loop.

## Beta iteration 2: enforce the exploration promise and improve framing

The research economy audit demonstrated a concrete loophole: four home pearls plus five pearls in home-earned upgrade/dive rewards funded all nine required pearls. Automation supplied the other resources, so no island excursion was necessary. The second iteration removes pearl bonuses from the crane, greenhouse and sail objectives. It retains the first-dive pearl, common-material rewards, and all previously earned saves. A new deterministic test proves a home-only new voyage is four pearls short of the full chain, while the earned full-route and no-quest completion tests still pass. This adds a reason to explore without penalizing failure or inflating costs.

The beacon now attracts a visible friendly workshop skiff and lights a warm beacon. It remains a finite prototype capstone, not a complete social/NPC system.

Independent art review identified composition as the weakest link. The revised camera lowers its pitch, brings the hero raft closer, and reveals the horizon. Narrow viewports pull back enough to retain the raft. Distant full-island repetitions are replaced by merged low-cost clusters with tall thin stacks, broad ridges, low groups and separated spires. Gameplay assets remain the original Blender models. The art reviewer compares retained baseline and candidate captures; no claim of matching the reference is made solely from source changes.

## Final candidate hardening

The architecture review's six reproducible defects were fixed: exhausted starter saves are rejected; wake particles do not use stale culling bounds; submerged salvage stays at a fixed elevation while its locator remains visible; resizing/quality changes redraw a frozen scene without advancing simulation; shadow targets are disposed; and failed GLB initialization rolls back both completed resources and the renderer before allowing another attempt. Steering now lives in the pure domain and has normalization/bounds/dive-speed tests.

A durable save-failure banner is independent of temporary action toasts. It stays until a successful save, so a welcome or collection message cannot silently hide storage failure.

Two low-water shoals now alter sailing routes. They impose a forgiving 32% speed while exposed and regain normal traversal at high water; players may steer around, cross slowly, or use chart travel. The HUD identifies slow shoals. They never immobilize the raft. This simplified shallow-water drag is intentionally not a physical grounding simulation. Domain tests cover low/high traversal and escape; browser playtests remain the evidence for whether the choice is useful.

Expedition cards were made more compact after art review found that three large cards crowded the workshop plans. The options and controls remain identical.

The final art pass replaces placeholder distant cylinders and the perfect circular arch with three original Blender landmark groups: asymmetric arch, weathered stacks, and broken ridge. The source totals 13,600 triangles and six shared materials; instantiated scene cost is measured separately by QA. The real-time water and swimmer remain simpler than the reference, as recorded in the independent art review.

The novice pass completed first salvage, dive, waterwheel, save-return, and Continue, but identified an overloaded introduction and missing-resource wayfinding. The candidate narrows the first prompt to steering/gathering, keeps full controls in Pause, adds contextual Find Wood/Scrap/Pearls buttons, promotes Save & return to a full button, and adds persistent larger text. These changes receive a focused novice/QA recheck.

A further paired art review identified flat bright shoals and coarse wave intersections. Their final render uses irregular sloped sand, muted wet-edge vertex colors, and calmer world-anchored waves around the same gameplay ellipses. Gameplay thresholds and movement stay unchanged. Final art captures and QA benchmarks distinguish this pass from the earlier landmark-only candidate.

## Beta iteration 3: make preparation useful and give return sessions a goal

The expert's efficient input sequence completed beta 2's five upgrades in 16.6 game seconds. This is not a human completion-time estimate, but it demonstrated that instant chart passage, generous milestone rewards, and shallow pearl pickups could bypass the intended travel and preparation. Progression fell to 2/5 in the evidence-based rubric even though persistence and completion worked.

First discoveries now require physical sailing; quick passage unlocks only after finding a shore. The map compares the current rig's direct shoal crossing and a perimeter bypass, reports approximate seconds with the current tide held fixed, and can guide the chosen bend. The tide countdown remains separate so the estimate is not misrepresented as a forecast of future conditions.

Two optional expeditions open after the waterwheel. Current run visits four surface markers across both shoals. Pearl trail visits four underwater markers on one breath; all rigs now swim at the same 3.25 m/s, making the 28-second Diver useful without also slowing its swimming. The deterministic continuous-steering test proves the 55–65 m survey fits Diver air while exhausting the shorter tanks. Neither route is mandatory for the five-upgrade story. Surfacing early resets the unfinished dive route; rescue preserves other progress.

Expeditions give resources once per route per in-game day and record bounded lifetime totals, last completion day, and a resumable active route. Pennants at 1, 3, and 5 completions make that investment visible on the workshop. These are deliberately small repeatable goals, not a claim of a durable long-term endgame. Saves from earlier versions retain their earned islands and receive empty expedition records. Functional browser playtests must verify the real UI route, failure recovery, and cross-session continuation before these features receive rubric credit.

## Human beta handoff

The next external validation is eight observed desktop sessions, split between people familiar with cozy/survival games and people new to them. This is a proposed qualitative sample, not completed testing or statistical evidence. Recruitment and publication have not been performed.

Give participants only the launch link and the in-game controls. Ask them to make their first waterwheel, discover an island, choose an expedition and rig, recover from an interrupted dive, save partway through a voyage, and continue in a second session. Avoid telling them which route or rig to choose. Record time-to-understanding separately from completion time; agent automation timings are not useful human pacing targets.

Use anonymous session labels and record the build, browser, hardware class, viewport, chosen rig/route, moments of confusion, unintended failures, and what they would choose to do next. Ask them to explain the tide forecast and the difference between quick passage and first discovery. For the pearl trail, distinguish learning the route from simply memorizing a required loadout.

Before widening access, require no lost progress in the observed sessions; a clear first task without coaching; participants able to explain at least one meaningful preparation choice; a reason to return that is not merely waiting for a daily counter; and measured performance on at least one lower-end integrated GPU. Revise the rubric from those observations rather than treating the agent score as a substitute for player experience.

## Second improvement — quiet opening and restoration (9 October 2026)

Current authority is the human-approved brief (historical source: `git show 79da54b:docs/second-improvement-brief.md`); older rescue/checkpoint recommendations apply only to historical legacy modes, not cleanup. This iteration preserves the original title artwork and Blender workshop/island/landmarks.

- **Opening:** directly enter a stationary raft with one helm prompt. Map, journal and workbench details are on demand. The buoy offers a concrete nearby cleanup activity; existing upgrades give gathered wood/scrap a practical purpose.
- **Stations:** the visible workbench uses the existing upgrade chain; the cabin provides a bounded illustrated planning/storage view. No free walking, farming/food catalogue or survival economy was added.
- **Controls:** the domain owns heading. Off-helm movement cannot move the raft. W/S follows the bow; A/D turns. Camera orbit/zoom only changes inspection. Camera alternatives are evaluated in the recorded comparison, not assumed to establish human preference.
- **Cleanup:** one six-item Home Reef; initial tuning is 2.2 units/second, 24 seconds of air, surface refill at 10 units/second, collection radius 1.25. These values are bounded gameplay choices, not physiological simulation. The separate side-on diorama removes hull occlusion and supports clear vertical navigation.
- **Success:** final collection commits restoration immediately. This avoids adding an unrequested exit challenge. Clean-site revisits are safe, contain no regenerated trash and grant no material reward.
- **Failure:** exhaustion clears the entire current collected list. Retry reconstructs the complete attempt immediately. Temporary bag/trash effects reset with attempt identity. Normal surface breathing preserves the attempt.
- **Persistence:** save only permanent cleanup IDs, not partial attempts. Reload returns an unfinished cleanup to the raft while preserving unrelated voyage state; pausing and same-session title/Continue retain the live attempt. Existing v2 saves and legacy resource-dive saves remain supported. Accepted old positions outside the current sailing rectangle are not silently snapped: idle/turning preserves them, inward travel remains possible and outward travel cannot extend them.
- **Tides:** distinct floating/anchored/submerged names and anchored geometry supplement browser phase/targeting tests. Jaco's exact original input sequence is unavailable; tests of the reported interaction class must not be described as recovery of his original browser incident.

New underwater artwork is editable procedural geometry plus the existing articulated Explorer, with separately documented provenance. No new ImageGen output or unverified model/tool version is claimed. Current test and score outcomes belong in the final review record, not inferred from these design decisions.

### Final camera and feedback disposition

Actual prototype inputs/captures compared wheel and following sailing views and side-on/oblique cleanup at wide and square sizes. The delivery candidate selects **following sailing** with bounded orbit/zoom inspection and **side-on cleanup**. The wheel-eye prototype showed near shell geometry intruding into the frame, so its production option is removed; its QA-only camera path remains for retained comparison evidence. An old saved prototype camera preference normalizes safely to follow. The independent comparison report records its own verdict and limitations.

Novice/expert sessions then prompted a single nearby-reef purpose hint and cardinal bow cue, clearer surface/Space return copy, a next-plan-first workshop with later plans and legacy rigs collapsed, and seams/drawstring on the collection sack. A failure-modal refresh now updates the HUD immediately to zero collected/zero air alongside the domain reset. These are targeted responses to observed friction, not new progression systems. The final QA report links the original stable 30-case functional evidence and the changed-workflow rechecks on the delivery bundle.

## Third improvement: player-grounded comparisons

The complete third brief (historical source: `git show 79da54b:docs/third-improvement-goal.md`) supersedes home-only building, the cleanup-without-material-reward exclusion, and the retained public world-swimming route. Two small restoration patches and starter timber teach a purposeful wheel arc. The wheel increases speed and defeats a visible sheltered departure current; chart passage requires actual first departure. Existing resources and onward upgrades remain through side-view salvage adapters.

Keep all four directional/pointer × pull/spatial-clean combinations plus two swim paces and two sailing cameras. Default directional/pull/quick/follow is provisional. Pull uses sustained reach/resistance; cleaning requires actual three-section coverage rather than the same timer under another label. Air remains 24 seconds across variants; faster movement naturally changes travel time, not hidden air rules. Normal breathing retains cleanup progress; whole-attempt failure resets everything; final success commits reward once. Completion permits immediate return; early departure or reload loses unfinished work.

The optional panel keeps experiments out of the opening's primary path. Disposable trial reset cannot write voyage saves. UI uses warm paper, timber/brass and restrained coral/sea accents; original title art survives. Explicit heading-relative tracking never steers and no selection means no arrow. Human enjoyment and final preferences require Jaco's hands-on comparison.
