# Independent experienced agent playtest — Tidekin 0.3.0-beta.1

9 October 2026 NZDT. Actual-input headless Chrome, isolated Playwright contexts, 900×900 and 1440×900. Read Jaxs root AGENTS and second-improvement brief for goals; no implementation-source inspection. No implementation edits, rebuilds, gameplay grants, action hooks, camera hooks, state setters, or clock manipulation. **Read-only getState assistance** verified heading/position, informed timed navigation, and checked earned progress/reset. This is experienced agent assessment, not human comprehension or fun evidence. No benchmark performed. All playtest browsers closed before report completion; QA was notified that Chrome was released.

## Served builds and evidence provenance

Capture root: `captures/second-improvement/expert/`. Session JSON records actual input commands, UI text, response SHA-256 fingerprints; the final session also records read-only state snapshots. Earlier state observations were printed to the live tool transcript, not saved in those earlier JSON files. Some screenshots have aspirational names (e.g. earlier `31-cleared` was actually a failed attempt); trust image/UI/state contents rather than filenames.

| Session | Evidence | Served assets | Scope |
| --- | --- | --- | --- |
| Initial square | root `session.json`, images 01–05 | index-CYmloxBi.js / scene-D_ip2yPG.js | Opening, helm forward, cabin, workshop |
| Intermediate square | `2026-10-08T23-35-07.701Z/` | index-ByGbsOiN.js / scene-K26CILKt.js | Clicked visible wheel, turn/reverse, earned wood, repeated failures, successful full cleanup, return/chart |
| Final freeze, wide then square | `2026-10-08T23-42-00.334Z/` | **index-CFK9qQDK.js / scene-Be6Rwn9a.js** | Earned Waterwheel, partial failure, full retry/success, reload, restored revisit, fresh context using earned browser save |

Exact SHA-256:

- CYmloxBi: `6d1d03f554c5f4e0c2f9ba597f8e6553cc96fc3a98a0e5c381eb97a9b61a4128`; D_ip2yPG: `20a3a45a183c6f47a55d49bbf4e7f02de8d8e7c7aaec876b80e2caa9f5a51779`.
- ByGbsOiN: `ddbc983b219c6478e2c97cf61b432277cc35cac6642dfa223b18ea8017b43386`; K26CILKt: `dabb52e81d322c4aaa719f164d891c301bb065e1d24a76b999ccb43d811353c6`.
- **CFK9qQDK: `abf6d8dafa1a18f70b9a8030f6040c42e788df5dfa10d3d0def81a3cbf93db32`; Be6Rwn9a: `c9f4bfebc5b76073e5ed520afaf23f6bd91747f50ae71edd4a02c60b99d52c48`.**

Browser sessions used `http://localhost:5181/?qa=1`. After browser closure, read-only HTTP requests to `http://127.0.0.1:5181/?qa=1` and both final assets returned exactly the same hashes, including HTML `2aec736356adbb8af8438b837b1dc98464caaaa42531a4733e0d55b33c58c52d`. See `final-loopback-fingerprints.json`. Fresh context final asset responses are also retained in final session JSON. No server was started or rebuilt by this playtester.

## Final-freeze findings to act on

**P2 — failure HUD contradicts full reset.** Final screenshot `17-failure-final.png`: dialog says “All trash has reset,” but HUD still says `1/6 collected`, `Air 1s`. Read-only state says failed, air zero, collected empty. Intermediate failures after one and four pickups reproduced this too. Update displayed air/count and trash/bag presentation to reflect failure reset, or clearly present previous-attempt results and say retry restores the scene. Immediate retry itself worked and the successful subsequent attempt required all six pickups. This is a presentation inconsistency, not evidence of retained permanent partial progress.

**Polish — workshop progression is useful but dense.** Waterwheel cost, missing-material finder and home-distance blocker are actionable. After building it, three rig descriptions and all five build plans create a long scroll before the next attainable construction goal. Put the immediate plan near the top and collapse distant prerequisites. Square `28-second-context-workshop.png` and wide `08-workshop.png` show the panel occupying a substantial part of the vessel view. Text remains readable; shrinking it would be the wrong response.

**Polish — completion message implies a surface exit that did not trigger.** Final `19-final-clear.png` shows the swimmer already at y=0, while text says “Swim up to return.” I returned with the visibly available Space action. Clarify whether swimming up exits automatically; if Space is required, use “Return to raft when ready.” No extra safe-exit challenge blocked successful completion.

**Polish — collection bag needs clearer material cues.** Attachment and increased bag size are visible, including a rope/tin at its opening after completion. Initially its pale round silhouette resembles a float. A stronger bag opening/seam or more explicit transfer cue could make collection feel more tactile. Static captures establish disappearing targets, growing contents and count changes; they do not certify the readability of the brief transfer animation.

## What the purposeful outing established

Final build earned four wood and three scrap via helm movement and E collection: inventory 4/1 → 8/4. Waterwheel finder targeted “Floating salvage crate,” chart gave 11 m NW, and reverse along the changed heading reached collection range. Free return home was a visible chart action. Workshop consumed six wood and two scrap, leaving **2 wood/2 scrap** and Waterwheel built. Later energy rose above 92, Mangrove became available for first discovery, and cabin offered “Plan Salvage crane.” This connects gathering to an understandable vessel improvement and subsequent exploration. Evidence: final 03, 09–14 and state log.

At anchored timber the final HUD said **“Covered · Exposed in 94 s. Salvage dive or wait for low tide.”** E returned the matching low-tide/dive explanation and Space was labelled Salvage dive (07-tidal-gather). This successfully distinguishes the blocked target in this reproduced interaction. I did not execute that salvage dive or wait through the whole exposure cycle, so I do not certify every tide/action route or the original reported incident.

Intermediate visible wheel click took the helm. D changed heading from 0 to about 4.683 radians; S moved toward positive x along reverse heading. Final outing turned with A/D and moved/reversed on that heading, then left helm for cabin/workshop. Vessel-relative navigation was consistent with the actual route. First immediate W after wheel click and first S after retry sometimes produced no movement in intermediate sessions. Later inputs worked; I used an extra short key pulse to avoid losing the route. **Cause unresolved; not established as a final-build defect.** Initial wrong “Retry dive,” “×,” and later exact “Map” locators caused harness timeouts; final Map accessible name includes M. Those timeouts are not game failures. Some long inspection pauses consumed air and caused unplanned failures; do not treat those as difficulty measurements.

Final cleanup: collected rope (1/6), surfaced and waited normally until **Breathing 24s**, kept 1/6, descended and waited 25 real seconds to deliberately fail. Retry restored a fresh attempt; six real pickups with surface breath stops then completed the reef. UI showed 6/6 Restored, water was clear, targets absent, fish abundant, and chart showed ✓ Restored. The short route is legible and the surface line makes the air-management loop understandable. Controls feel predictable once input begins; the 24-second budget accommodates short excursions with regular breath stops. Do not infer human comfort from this assisted timed route.

Final reload → Continue voyage → reef revisit retained completion and earned Waterwheel. A new isolated context loaded Playwright's exported **earned browser storage** (no save editing) and repeated Continue/revisit at 900×900. State retained Waterwheel true, inventory 2/2, both gathered node IDs, gathered totals 4 wood/3 scrap, home-reef completed, and growing energy. No repeated “Home Reef restored” toast on either revisit. Evidence: final 19–28, `earned-browser-save.json`, session state records. Immediate getState after Continue returned null during initialization; later revisit's state verifies persistence. No duplicate material payout was observed.

## Presentation and limits

Title lets illustration carry the scene. Square opening gives the raft a clear focal point with readable actions; wide play offers more ocean context and exposes shortcut labels, which disappear at square width. Both retain the same basic actions. Underwater square and wide views keep the diver, surface line and trash readable. The restored scene is attractive and its missing targets are a concrete reward, although the affected-to-clean tint difference is subtler than the fish/target change. Cabin is a useful supplies/planning panel rather than an explorable interior; it communicates equipment and next plan adequately.

No new rubric score, threshold change, human fun claim, performance certification, reduced-motion check, multi-site persistence test, camera-choice persistence assertion, exhaustive focus check or full tide-cycle certification. Inspected camera controls but did not systematically select/reload each camera. Historical benchmark and QA-exclusive run remain separate. Core final-freeze earned gathering/building, normal breathing, partial failure/full retry, full cleanup, restored chart, reload and second-context persistence have direct input evidence. Remaining issues above were reported live before report completion.

## Bounded arc addendum — final candidate 9TpJEO4p / C3Fly4-r

**PASS: five earned upgrades, four discovered regions, nine earned journal stories, then unchanged progression across save/reload.** This closes the requested original-project progression coverage gap. The Waterwheel and restored Home Reef were inherited from this playtester's own previously earned, unmodified browser save; the crane, greenhouse, sail and beacon were earned in this continuation. No grants, state mutation, gameplay hooks, implementation inspection, source edits or rebuilds were used.

Run: 9 October 2026, approximately 13:08–13:19 NZDT, after PM explicitly released the browser following hardware QA. Evidence directory: `captures/second-improvement/expert-arc/2026-10-09T00-08-42.526Z/`. Harness: `scripts/playtest-second-expert-arc.mjs`. Eight screenshots, no video or heavy tracing. Browser closed at the end. The 5181 preview remains running for PM/user use as requested.

The first connection attempt failed because neither loopback endpoint was listening. I started `npm run preview -- --port 5181 --strictPort` against the existing final `dist`, without rebuilding. Browser origin stayed `http://localhost:5181/?qa=1` to use the original save's origin without editing it; the preview listens on 127.0.0.1:5181. PM later confirmed its duplicate restart had failed because this preview was already serving the port. The initial failed-launch evidence directory is retained separately.

Exact served fingerprints, identical before and after reload:

- HTML: `cf69a62355dcfcc2118271ea8ece10e34d2a763b74313cb9a5674cca7afa3d93`.
- `index-9TpJEO4p.js`: `61532996cc9f0dfe0aed04498f5e35f56d536986936e65e8c2087339ae1dbba2`.
- `scene-C3Fly4-r.js`: `01fdd294a19a06f141936caa77234551cde8ddd84c5dcfac29b53214448e25ce`.

### Earned route and verification

Read-only state assistance provided position/heading for timed W/A/D navigation and checked outcomes. Targets were estimated from visible chart bearings/distances and prior observed route positions, never a hidden node list. All movement, surfacing, collection, journal claims, builds and free returns used ordinary keyboard or visible UI buttons. The steering helper holds real keys and waits real milliseconds; no simulated time was injected. Menus naturally pause gameplay. The crane/greenhouse produced resources during ordinary sailing, using their earned power/capabilities.

| Step | Directly observed result |
| --- | --- |
| Continue own save | Waterwheel true; Home Reef restored; 2 wood, 2 scrap, 0 pearls |
| Home salvage | Anchored timber +5 wood, wreckage +4 scrap; real salvage dive at western pearl bed +2 pearls; normal surface return |
| Earned journal claims | First salvage, Waterwheel and pearl milestones paid their displayed rewards; inventory reached 16 wood/11 scrap/3 pearls |
| Home workshop | Crane cost 8 wood/5 scrap; its journal reward was claimed. Greenhouse cost 8 wood/4 scrap/2 pearls; its journal reward was claimed |
| Mangrove | Sailed east from home into Mangrove; collected 8 wood from floating driftwood; claimed discovery reward; chart enabled quick passage |
| Sail | Returned home through the visible free-return button; paid 10 wood/6 scrap/2 pearls; claimed its displayed reward |
| Prism | Sailed northwest into Prism Reef; used Find Pearls and chart bearing to reach a pearl bed; ordinary Space/E/Space salvage dive earned 4 pearls |
| Beacon Shoal | Returned home and sailed south into Beacon Shoal; all four regions discovered; claimed Every horizon reward |
| Beacon | Returned home; paid 12 wood/10 scrap/5 pearls from 20 wood/14 scrap/6 pearls; all five upgrades true. Claimed the earned final story reward |
| Completion | 9/9 journal stories, 4 waters visited, all workshop upgrades built. Final inventory 8 wood/4 scrap/4 pearls; home reef remained restored |
| Reload | Continue voyage retained all progression; workshop and chart visibly confirmed complete builds and discovered regions |

`session.json` contains commands, text, state observations and response hashes. `earned-before-reload.json` and `earned-browser-save.json` preserve genuine browser saves. `reload-comparison.json` compares every state field: **only `time` and `automation` advanced, by the expected 0.05 seconds immediately after Continue.** All other fields were equal, including inventory, energy (100), all five upgrade booleans, four discoveries, seven collected nodes, gathered totals (17 wood/7 scrap/6 pearls), automated totals (9 wood/3 scrap), nine claimed stories and Home Reef completion. There were no page errors or harness errors in the successful arc run.

Evidence anchors: `01-mangrove-arrival.png`, `02-prism-arrival.png`, `03-beacon-approach.png`, `04-earned-five-upgrades.png`, `05-all-stories-earned.png`, `06-completed-home.png`, `07-reload-completed-workshop.png`, `08-reload-all-regions.png`. The completed-home image visibly shows the upgraded raft and a second small workshop vessel nearby, supporting the beacon's promised arrival beyond its state flag.

### Experienced-agent assessment and remaining bounded findings

The arc establishes a coherent purpose for gathering: timber and scrap lead to raft stations, stations open regions, and pearls support the later builds. Visible route bearings, material finders, free return and first-visit discovery make progression navigable without a hidden-resource lookup. The visible raft additions and visiting workshop vessel give the final build a concrete result. The crane and greenhouse are useful during travel; this run did not need an artificial wait to fund a build.

**Earlier workshop-density finding improved on this candidate.** The active plan now appears first, with “Completed and later plans” and optional rigs collapsed. After the final build, the workshop explicitly says “All workshop upgrades built.” This is clearer than the earlier five-plan scroll.

**P3 copy/context issue remains:** the general HUD says “Reef restored. Visit the bench to plan your next upgrade” in Mangrove, Prism and Beacon despite only Home Reef being restored. It also persists after all five upgrades are built, contradicting the workshop's completion message. Specify Home Reef when outside its region and replace the next-upgrade instruction after completion. Evidence: region-arrival logs and `06-completed-home.png` / `07-reload-completed-workshop.png`. This did not block the route.

**Progression readability observation:** journal claims are consequential, supplying substantial build resources and one needed pearl before the sail. I deliberately checked and claimed earned milestones as an experienced agent. This proves the economy route is available; it does not establish that a first-time human will discover those claims promptly. No new numeric rubric score is assigned.

Bounded limits: this continuation did not repeat cleanup-failure HUD checks on 9TpJEO4p, so the earlier stale-failure finding remains tied to its recorded earlier candidate until QA verifies it. It did not complete optional expeditions, all salvage nodes, alternate rigs, every tide cycle or all cleanup sites. It provides no performance certification and does not replace the hardware benchmark in QA's report. All assigned five-upgrade/region and persistence checks are complete; browser closed, existing preview retained.
