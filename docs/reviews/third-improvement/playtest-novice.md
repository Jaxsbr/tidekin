# Fresh novice agent playtest

Agent session, 2026-10-09. Tested the running game at `http://127.0.0.1:5181/?qa=1`, not pending production visual fixes. This is agent interaction evidence, not a claim about human fun or a hardware benchmark.

## Isolation and method

Started Chrome with the supplied launch flags and a fresh `browser.newContext`, 1440×900, device scale 1. No user profile/storage was used. Did not read project source, design documents, existing reviews, or test scripts. The only script created/read was this session's own minimal Playwright input bridge, `scripts/third-novice.mjs`. No runtime edits, grants, state mutation, action hooks, install, or download. Inputs were real mouse clicks/holds and keyboard presses/holds, chosen from screenshots and visible UI text.

The initial process lost stdin before gameplay; restarted with a new fresh context and persistent terminal. Browser closed successfully at completion. Read-only `getState/getMetrics` was called once after the visible pointer+clean attempt for corroboration, and reduced `getState` reads after visible restoration/continue choices. Those reads did not supply navigation decisions. The broad metrics output included internal details and timing fields; none were used for subsequent actions or hardware claims.

## Earned journey

1. Started new voyage. Visible tutorial said “Take the helm to begin.” Gathered starting floating wood (4) with E and scrap (3) with E. Workshop clearly showed wheel cost 6 wood/2 scrap, deficits, and Find Wood.
2. Find Wood tracked anchored timber at 9 m. Holding W did not visibly move the raft after the earlier Take helm interaction. H changed the footer to Leave helm and bow/sailing instructions; movement then worked. Timber became covered by the tide, and the footer offered diving/waiting.
3. Entered Home Reef with Space. Learned S descent, A/D sideways swimming, and held-object pulling from visible guidance. First attempt collected one bottle, then ran out of air during observation/tool turnaround. Failure explicitly reset all trash. Retried and used the visible pause control between observations.
4. Restored Home Reef by actual swims and holds. Collected bottle, bag, can; overshot the can once and corrected using the displayed distance/arrow. UI awarded 1 wood/1 scrap. Swam up and returned with Space. Inventory 5 wood/4 scrap.
5. Followed “Find next reef”; chart showed Sheltered Cove 13 m west. Turned and sailed using bow/bearing feedback. Current-push message appeared before wheel. Restored Sheltered Cove through actual inputs, surfaced and returned. Inventory 6 wood/5 scrap.
6. Built Waterwheel at the workshop. Visible resources became 0 wood/3 scrap; UI announced added speed. Tracked Mangrove Reach, sailed east, gathered 5 wood en route, and reached/discovered Mangrove. UI confirmed the wheel carried the raft beyond sheltered waters.
7. Returned through the chart's Return home button, saved and returned to title, then Continue restored Home Waters, the visible wheel, and 5 wood/3 scrap.

## Ordered comparisons

Following view and the displayed Quicker response setting stayed constant. Each combination used a new/reset disposable Home Reef trial. Bounded attempts only; full completion coverage belongs to QA. Paused between observations. Coordinates came from visible screenshots, not metrics. Later trials benefit from earlier learning and are not a counterbalanced human comparison.

| Order | Combination | Real attempt and observation |
|---|---|---|
| 1 | Pointer + clean | Held near the bottle: no approach/collection. Clearly empty water moved the swimmer; another near-object hold failed to close the last gap. Holding empty water above/left finally brought it into reach. Held bottle: Clean 33%, 0/3. A further stationary hold left Clean 33% unchanged. Stopped rather than retrying indefinitely. |
| 2 | Directional + pull | Reset trial; held S+A to approach bottle, then held its visible position. 1/3 collected; next target bag, air displayed 22s. |
| 3 | Pointer + pull | Reset trial; held empty water above/left, released, then held bottle. 1/3 collected; next target bag, air displayed 21s. |
| 4 | Directional + clean | Reset trial; held S+A to approach, then held bottle. Clean 33%, 0/3; air displayed 22s. |

Pull gave me an understandable completion response in both movement schemes. Clean gave visible partial progress but I did not discover how to advance beyond 33% through the visible instructions in the bounded attempts. The menu says “Hold a target to clean”; sustained central holding alone did not complete it. This is an instruction/discoverability finding, not proof cleanup cannot complete. My intermediate guess that it merely needed a longer hold was not borne out.

Pointer swimming has an approach/action distinction: the menu explicitly says objects never move you, but clicks near the object still left me out of reach. Empty-water approach worked after adjustment. Directional approach was easier for this agent to reproduce after the earned voyage; that is not evidence of universal preference.

## Troubles and limits

- Helm state was unclear after Take helm and workshop/gather interactions: W initially appeared ineffective. H plus Leave helm/bow feedback resolved it. Cause unverified.
- First air-loss failure was affected by agent observation latency; do not present it as a human difficulty rate. Pause clearly explained that air stops and unfinished reload resets cleanup.
- Exact role/text lookups for Start new voyage and Resume voyage timed out; Find Wood matched multiple elements. Visible-coordinate clicks worked. This is automation/accessibility-query friction, not a demonstrated broken mouse control.
- Map Track closed the panel; an assumed M-close reopened it and subsequent movement did nothing until I visibly closed it. Comparison menu adds Return to my voyage and shifts Reset upward, causing one missed click. Corrected from screenshots; only actual active attempts counted above.
- Map bearing copy still said “Sail here to discover it” while the Mangrove card already said Discovered/Quick passage. Home Reef footer/task copy also persisted while sailing to later objectives. These mixed messages deserve review.
- Several captures include fade transitions or paused blur. No claim about pending rebuilt visuals, performance, or final hardware suitability.

## Restoration and evidence

After all trials, Return to my voyage restored Home Waters with 1/5 upgrades and 5 wood/3 scrap. Then Save & return to title, reload, and Continue again retained the same visible values. Read-only corroboration: waterwheel true; discoveries home/mangrove; completed home-reef/sheltered-cove; practice false; inventory wood 5, scrap 3, pearls 0. Disposable trials did not overwrite the earned voyage in this session.

Captures: `captures/third-improvement/novice-fresh/`. Key files: 08 air-loss; 11 restored reef; 15 wheel ready; 16 wheel built/map; 21 saved title; 23–24 pointer+clean; 27 directional+pull; 28 pointer+pull; 29 directional+clean; 30 restored voyage; 31 reload/continue. Browser closed; no session remains running.

## Targeted follow-up — revised cleaning instructions

2026-10-09; candidate `entryCrEO52lV` at port 5181, as identified by the user (bundle identity not independently inspected). This is a returning agent follow-up, **not a fresh-novice claim**. Original findings above remain unchanged.

Opened a new isolated browser context using the same supplied launch configuration. Used only visible UI text/screenshots and real inputs; no source, QA, other reviews, state, or metrics reads. Started a voyage solely to open Compare, selected Continuous cleaning pass, and started one disposable Home Reef trial. Retained Directions + pointer action and the existing response setting. No earned arc or other variant testing.

The revised Compare instructions explicitly said: “Clean: hold and sweep across all three dirty bands; holding one spot only cleans that band.” They also offered “Hold E for an automatic sweep.” The in-trial footer repeated “Hold + sweep across all dirty bands · Hold E to auto-sweep.” This directly explained why the original stationary hold stalled at 33%.

Approached the first object with S+A, paused to inspect its visible position, then resumed and held the pointer while sweeping horizontally back and forth across the object. The single bounded sweep attempt collected it: **1/3 collected**, next target Snared bag, air displayed 14s. Did not use E auto-sweep, attempt another object, or retry. The swimmer partly overlapped the target visually, but the sweep still succeeded.

**Result:** the revised instructions resolved the prior 33% stall for this returning agent's one-object attempt. This establishes successful understanding and execution in this follow-up, not independent novice discoverability or full-site completion. Browser closed immediately after the result capture; process exit 0. No hardware measurements.

Evidence under `captures/third-improvement/novice-fresh/`: `followup-02-controls.png` (revised Compare text), `followup-03-object.png` (in-reach Clean 0% and revised footer), `followup-04-sweep-result.png` (1/3 collected). `followup-01-entry.png` records the new-context title screen without Continue.
