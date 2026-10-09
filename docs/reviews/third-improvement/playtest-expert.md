# Informed expert agent playtest — current production

9 October 2026. Local target http://127.0.0.1:5181/?qa=1. Agent session, not human validation. Fresh nonpersistent Chrome context, 1440×900, headless SwiftShader. Browser launched via project @playwright/test with channel chrome and --enable-unsafe-swiftshader, using approved require_escalated execution. No runtime edits, action hooks, state injection or grants. Read-only getState used after actual visible choices. No benchmark taken.

## Earned journey

- Clicked Start new voyage. E gathered the starter's 4 wood. H took the helm; W sailed; H left; Space entered Home Reef.
- First attempts overshot targets and ran out of air while inspecting screenshots. Failed UI explicitly reset trash and offered immediate Retry. Retry worked. Agent observation delays materially contributed to failure; this is not a calibrated human difficulty finding.
- Read the domain contract and, after these failures, source target coordinates to calibrate key-hold durations. This is informed expert play. Successful Home Reef path at Quicker response: S800ms, A850ms, E1000ms; S800ms, A550ms, E1000ms; D2500ms, W550ms, E1000ms. All three collected; visible reward +1 wood/+1 scrap.
- Space returned aboard. B showed wheel benefit (40% faster), 6 wood/2 scrap cost, 5/1 held, and exact missing supplies. Find next reef tracked Sheltered Cove persistently.
- Took an accidental eastward detour with A then W. Tracker distance increased. Nearby covered anchored timber explained its tide gate and offered a salvage dive. Space opened side-view Anchored timber, not legacy world swimming; Space exited unfinished. Turned around and sailed to Cove.
- Sheltered Cove arrival offered its named dive. S800/A850/E1000, S800/D850/E1000, D850/W400/E1000 restored all three, granting +1 wood/+1 scrap. Inventory now 6/2.
- Held W outward for 7 seconds before building: visible current-pushback toast, still departed false. Read-only position after stopping (-21.724,3.475), within the sheltered boundary. B opened raft workshop away from home and left helm. Pointer clicked Build Waterwheel; supplies fell to 0/0.
- H then W1500 crossed physically: visible waterwheel departure toast, departed true, position (-32.223,3.552).
- Map: tabbed through controls to scroll destination cards, clicked Mangrove Track. Track closed the map automatically; an extra Escape unexpectedly opened Pause, so the first attempted navigation inputs did nothing. Resumed explicitly, took helm and sailed east, then corrected heading and approached until Mangrove Reach Arrived. Chart marked Discovered and enabled Quick passage. No quick passage used.
- Clicked Home Track, took helm, turned and sailed west. Home Waters reached; home distance reduced to 7m (within arrival range), then saved and returned to title through Pause. Reloaded page; clicked Continue voyage.
- Read-only continued state: position (5.084,-1.969), guidance stage9, wheel true, departed true, discoveries home/mangrove, completed home-reef/sheltered-cove, inventory0/0/0. The earned progression survived reload intact. Continue resumed safely aboard with helm false.

## Initial comparison evidence

Opened Compare; retained Quicker response throughout initial trials. Order requested: directional+pull → directional+clean → pointer+pull → pointer+clean. Only confirmed active settings count below; failed automation selections do not count as tested variants.

Directional+pull: Start disposable reef trial, S800/A850, held pointer on bottle (548,375)1000; S800/A550, held bag (430,550)1000; D2500/W550, held can (890,468)1000. Completed3/3. Read-only state practice true, completed permanent sites empty, zero inventory: disposable success earned nothing. Trial clone's wheel/discovery fields differ from voyage by design; reload/return must recover voyage.

Attempting exact accessible-label selects for Cleanup action and Swimming timed out. This is an automation targeting issue pending keyboard selection; not yet established as an accessibility defect. A prior click based on the normal comparison panel's coordinates missed after the trial panel added Return to my voyage and shifted rows upward. Erroneously named 40/42/43/44 screenshots do not establish their names' variants: state still showed directional+pull.

## Judgment so far

The restoration → supplies → wheel → departure arc is concrete and coherent. Costs and missing amounts are unusually clear. Persistent tracking helps recover from detours; both restored sites survive voyage return. The nearest-trash direction/range is useful.

Trouble: underwater scale was difficult to estimate from the initial image and overshooting is easy; broad screenshot inspection consumes air. Guidance said “Swim up, then Space to return” after success, but Space returned directly underwater, so the copy overstates the requirement. Track closes its panel immediately while other panel interactions keep theirs open; habitual Escape pauses unexpectedly. The chart's top overview fills the panel before destination controls, requiring scrolling/focus traversal. A heading-relative arrow should be evaluated during motion; screenshots alone do not establish human intuitiveness.

Evidence lives in captures/third-improvement/expert. Novice failed launch/protocol record is preserved separately as novice-launch-attempt.md.

## Confirmed directional cleaning and trial caveats

The wrapped label's full text (including option text) allowed actual Playwright selectOption; short exact labels did not. No accessibility defect is claimed from that mismatch. Native End-key selection did not change the setting in this environment.

Confirmed directional+clean trial: reset through visible UI; S800/A850 positioned within reach. Held bottle center (548,375)1200ms: getState showed cleaning [0,1,0], actionProgress1/3, no collected target. Held left (532,375)400 and right (564,375)400: [1,1,1], bottle collected. Evidence55–57 records the actual clean variant. Stationary holding therefore differs mechanically from sweeping, as intended.

An unfinished underwater trial has a disabled Return to raft until the swimmer reaches the surface. Space did not exit these active trials. Once failure overlay opens, use its actual Return to raft or Retry buttons; repeated generic Space/pointer commands against obscured UI are invalid trial evidence. Evidence45–54 remained directional+pull or failed and should not be interpreted by filenames. UI/agent observation delays repeatedly exhausted air.

## Final bounded comparisons and cameras

Confirmed test order: **directional+pull → directional+clean → pointer+pull → pointer+clean**, all at Quicker response. Full-site directional pull; one genuinely collected object in each other variant. These are disposable achievements, not additional earned voyage resources.

Pointer+pull: initial empty-water intent at (570,343) selected the nearby out-of-range bottle instead of moving; actual state remained x0/y0/air24. This illustrates movement/action ambiguity close to an object. After resuming from Pause, held unoccupied water at (610,400)1400ms, then held bottle (548,375)1100ms. Collected reef-bottle at (-1.852,-3.197), active pointer/pull/quick, air21.53. Evidence62.

Returned to surface through actual pointer/up inputs, exited, reset through Compare and selected pointer+clean. Held empty water (610,400)1400ms; center (548,375)600, left(532,375)400, right(564,375)400. Collected reef-bottle with [1,1,1] coverage, pointer/clean/quick, air21.20. Evidence63. Paused immediately for inspection. No grind of the remaining targets.

Reloaded out of the trial and clicked Continue: original wheel/departure, both restorations, Mangrove discovery and guidance9 all intact, inventory0/0/0. No duplicate rewards observed from these trials. Final restored-voyage state after camera motions still retained these milestones, home region, position(-1.718,-.750).

Selected first-person helm through Compare, applied choices, H and brief W/A. Evidence64 shows a **large nearby world label (“FLOATING · Gather”) occupying most of the upper view**, obscuring the forward scene. This is a concrete camera/readability issue on5181; wheel/rail are visible and I did not observe shell clipping in this brief sample. Following view after applied selection and actual H/W (evidence66) gives a readable surrounding overview; the raft still occupies central space and target labels add visual clutter. I provisionally prefer following view for local pickup/navigation, while first-person needs label scale/near-camera handling reviewed. No claim that camera preference or enjoyment is human-validated.

The success-return hint observed above belongs to old5181. Parent reports it corrected in refined5190; treat that wording finding as superseded, not an outstanding current-candidate bug. This session did not switch builds or independently verify5190.

No blocking progression defect found in this bounded session. Distinct trouble: underwater approach/overshoot, empty-water click near object being treated as interaction, inconsistent panel-closing habits causing accidental pause, chart destination cards below a tall overview, and first-person near-label occlusion. Agent provisional action preference is directional+pull for predictability; pointer+clean works and produces distinct segmented removal, but requires more careful movement-versus-action targeting. Human action preference remains open.

Browser close was requested after final Pause. An abandoned first noninteractive launch had left a separate empty-context Chrome alive; process inspection identified its exact parent/child and it was terminated along with this session's harness. Other functional browsers were not touched. Parent may proceed with its own global browser check before hardware sampling. No runtime/dist modifications or performance measurements were made.
