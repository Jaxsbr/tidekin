# Novice playtest: first five minutes and save-return

**Run:** 2026-10-08, approximately 09:18:32–09:23:32 UTC (22:18:32–22:23:32 NZDT), baseline production build at `http://127.0.0.1:5179`  
**Scope:** five-minute window from the first title screen, covering onboarding, resource orientation, first upgrade, dive/surface, and save-return/continue. The run stayed on the 5179 baseline; beta2 at 5180 was not used.  
**Method:** agent-operated visible browser UI. This is usability observation, not human enjoyment data, expert completion, or evidence of player skill.

## Setup and limits

The run used a fresh Chrome Incognito session so its local save was isolated from the user’s browser profile. A headed Playwright launch with a fresh persistent profile failed before navigation because Chrome’s Crashpad access was denied in this environment. I therefore completed the observation in the visible system Chrome Incognito window through its UI. No user save was opened or changed. The Playwright launch attempt is not counted as gameplay evidence; `scripts/playtest-novice.mjs` provides a fresh-profile capture workflow for a later run.

The game UI and its accessible text were the evidence during the trial. I did not inspect `game.js` or use a QA state hook. I read the README controls after the trial, then checked the relevant synthesis in `docs/research/cross-genre.md`; I did not repeat the broader research or expert progression run.

One screenshot attempt briefly captured the full desktop, including unrelated private content. Those two files were deleted immediately. The retained capture below is a game-window-only Chrome screenshot. It shows the pause state before selecting “Save & return to title”; the subsequent title and Continue states were recorded from visible UI text, but not captured as images.

## Observed path

| Stage | Visible evidence and result |
|---|---|
| Start | The title screen offered “Start new voyage” and Settings. A fresh session meant no Continue option. |
| Onboarding | “Ready to cast off?” presented steering, map-following, 3 m gathering range, E, Space, B/J/M, home anchorage, free chart return, Esc, and autosave in one paragraph. I proceeded without opening README. |
| Find and gather | The HUD showed “Collect 4 wood from driftwood,” starting stock of 4 wood, nearest Driftwood at 5 m E, and a disabled E Gather action explaining “Move within 3m.” Holding Right for about 0.9 s changed the map reading to 2 m SW and enabled gathering. E raised wood from 4 to 8; the objective reached 4/4 and the UI acknowledged collection and save. |
| Objective reward | The objective pointed to the journal. Its “Something from the sea” card showed 4/4 and a claimable reward of 2 Wood + 1 Scrap. Claiming it completed the story and supplied the missing scrap for the Waterwheel. |
| Dive and surface | The visible Dive action opened an oxygen view with an 18 s timer and “Space to surface · Your supplies are safe.” The visible Surface action returned safely and showed an oxygen-recovery message. A direct Space keystroke was not verified: the CUA keyboard wrapper rejected its key name, so that harness issue is not treated as a game input defect. |
| Upgrade | Workshop text placed building within 7 m of the golden home anchorage. Waterwheel cost 6 wood and 2 scrap; at 8 wood / 1 scrap it was clearly disabled with “Need 1 scrap.” After claiming the journal reward, the workshop became ready; building consumed the displayed cost, showed “Built” and 1/5 upgrades, and completed “Turn the tide” 1/1. |
| Save and return | Pause explained that voyage, oxygen, and tide were safe. “Save & return to title” led to a title screen with “Continue voyage — Day 1 · Home Waters.” Continue restored the 4 wood / 0 scrap state and completed Waterwheel objective; reopening the workshop still showed it built. |

The first resource, reward, dive/surface, Waterwheel, and return loop all completed in the isolated session. The clearest guidance was proximity-based gathering: the disabled control stated the distance condition, then enabled with a range label once close enough. The clearest understanding gap was resource wayfinding: the workshop explained the missing scrap count, while the visible nearest-target card still named Driftwood; the journal reward, rather than a scrap-directed route cue, bridged the requirement.

![Pause and save-return options in the isolated novice session](/Users/jacobusbrink/Jaxs/projects/tidekin/captures/novice-01-pause.jpg)

After the trial, I checked README’s Controls section. It confirms WASD/arrows, E, Space, B, M, J, and Escape, and says floating salvage supplies both wood and scrap. The observed loop also fits the limited relevant research synthesis: recovery preserved supplies and returned home, while the upgrade’s cost and completion were visible. This is a design comparison, not a claim about enjoyment or causal player behavior.

## Focused rubric scores

Scores use the 0–5 definitions in `docs/PROJECT.md`. These are provisional scores for the observed slice, not a full project or human-beta rating.

| Dimension | Score | Evidence and limits |
|---|---:|---|
| Onboarding and usability | **4/5** | The first objective, map distance, 3 m threshold, journal reward, and workshop requirement formed a coherent first loop. Friction: the initial modal front-loaded many controls and several later actions before they were needed. |
| Core interaction and agency (controls slice) | **4/5** | Arrow steering changed the map distance; E gathered in range; visible Dive, Surface, Journal, Workshop, and Pause actions worked. Space key input was not verified. This does not assess the full movement/action set. |
| Feedback (component of Animation and feedback) | **4/5** | Inventory, objective progress, collection/save messages, disabled-cost reason, claim state, built state, and oxygen recovery all changed legibly after actions. Motion/animation quality was not assessed, so the full combined rubric dimension remains unscored. |
| Accessibility and settings | **2/5, limited probe** | Supplemental post-trial settings inspection found sound, world-detail quality, reduced motion, and an “All comfortable” Done/close button (not a preset), with an explanation that settings save separately. I did not test focus order, contrast ratios, screen-reader behavior, or text scaling; no contrast, text-size, or key-remapping controls were evident in the inspected settings. |

## Three improvements to prioritize

1. **Stage the onboarding.** Keep movement/map and gathering in the first cue; introduce dive/surface when the first dive becomes relevant; reveal workshop, journal, chart-return, pause, and autosave alongside those actions. Keep a compact all-controls reference available afterward. Evidence: the current first modal presents all of these before the player has a context for most of them, even though the first objective only needs steering and gathering.
2. **Point directly to the missing resource.** When Waterwheel is blocked by scrap, add a visible scrap map legend/target choice or a contextual “find nearby scrap” action on the cost row. Evidence: the workshop’s “Need 1 scrap” is clear, but the tested nearest-target card continued to point at Driftwood; the journal reward happened to solve the gap.
3. **Make save-return a clear pause action.** Render “Save & return to title” as a full-size, contrast-checked button with a concise “Continue is available from the title screen” hint. Evidence: in the captured pause view it appears as a low-emphasis text action beneath three full-width buttons; it worked when selected, and Continue then appeared correctly.

Keyboard focus and contrast still need a deliberate accessibility pass. This report does not label either as a confirmed defect because neither was measured here. Human beta feedback remains separate, as required by `docs/PROJECT.md`.

## Candidate 5180 focused revisit (partial)

**Run:** 2026-10-08, candidate at `http://127.0.0.1:5180`, fresh Chrome Incognito origin. This was a focused check, not another five-minute progression or research run. No user-profile save was used.

The headed Playwright launch again stopped before navigation on Chrome Crashpad permissions. I opened 5180 in a new visible Incognito window. The browser then moved focus to the regular Chrome window during the How to play check; I stopped interacting at that point. Candidate screenshots were viewed live but not retained as files, so these observations are recorded from the visible UI and its accessibility tree without image artifacts.

| Check | Candidate observation | Status |
|---|---|---|
| Staged opening | The first modal asks only for driftwood: WASD/arrows, follow the map, get within 3 m, press E. It says the journal guides the next step, other actions are along the bottom, Escape pauses, and the voyage saves as you go. | Verified; substantially more focused than the baseline all-controls paragraph. |
| First movement and gather | Right for about 0.9 s changed Driftwood from 5 m E to 2 m SW and enabled E Gather. Pressing E worked; wood changed 4→8, objective 0/4→4/4, and the journal-next-step message appeared. | Verified with visible keyboard input and UI feedback. |
| Keyboard focus | Escape opened Pause with Resume focused. Tab moved focus to Save voyage, and a clear orange outline followed focus. | Verified for this pause-menu segment only; full focus order and settings navigation untested. |
| Save & return | Pause now presents Save & return to title as a full-width secondary button and says, “Choose Continue on the title screen to return to this voyage.” | Visual clarity and hint verified; activation, title state, and continue restoration not retested on 5180. |
| How to play | The button is present in Pause. | Whether it opens the promised full controls remains unverified because browser focus changed during this check. |
| Find Scrap | Not reached in this partial run. | Shortcut-to-nearest-reachable-scrap map cue remains unverified. |
| Larger text | Settings were not reached. | Text-size effect, enlarged secondary labels/tap targets, and persistence remain unverified. |

### Candidate score status

These are scores for the evidence collected on 5180, not a completed final candidate rating. Per `docs/PROJECT.md`, the combined accessibility/settings dimension stays unscored until the new text setting and settings navigation can be checked.

| Dimension | Candidate score | Evidence limit |
|---|---:|---|
| Onboarding and usability | **4/5** | Focused first task and map-distance cue worked; later staged prompts were not followed. |
| Core interaction and agency (controls slice) | **4/5** | Arrow steering, E gathering, and Escape pause worked; this is not a full controls pass. |
| Feedback (component of Animation and feedback) | **4/5** | Map distance, gather availability, inventory, objective progress, and next-step message updated; animation remains unscored. |
| Accessibility and settings | **Unscored** | A visible focus ring and one Tab transition were confirmed; larger text, settings persistence, contrast, and the rest of focus order were not tested. |

**Remaining checks before finalizing 5180:** verify How to play opens the full controls; use the Waterwheel shortage’s Find Scrap action and confirm the map tracks the closest reachable scrap; activate Save & return and verify Continue returns to the same saved voyage; then toggle Larger text, compare secondary labels and tap targets, and verify the setting persists after leaving and reopening Settings. The isolated 5180 Incognito window must be foregrounded for those checks so the regular Chrome profile remains untouched.
