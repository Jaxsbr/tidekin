# Current log pickup investigation

9 October 2026. Documentation-only sidecar. Actual retained images inspected with the image tool; no browser, runtime edits, or user-save changes. Engineer retains targeting ownership. This investigates concrete failure mechanisms without claiming the exact reported encounter has been reproduced.

## Evidence and incident identity

- [Before overlap](../../../captures/current-beta-player-interview-2026-10-09/jaco-log-before-overlap.png): three golden logs are plainly visible beside the raft, in a pale ring with vertical locator. Gather is muted. A waterwheel is visibly installed. HUD says “Bow S” and “Home Reef restored”; no target-specific name, distance or blocked reason is visible. A faceted pale pickup sits beyond the cabin; scenery edges are cropped. The displayed generic restoration message identifies completed cleanup, **not current region**.
- [Reported high-tide overlap](../../../captures/current-beta-player-interview-2026-10-09/jaco-log-high-tide-inactive-gather.png): raft occupies the reported target position; that target cannot be individually identified under the hull. Separate rings and submerged-looking objects remain to the left, including another log-like bundle. Gather is muted; “Salvage dive” is available. The helm is now unattended (“Click the wheel to sail”), and framing differs. These observations do not yield world coordinates or prove physical center overlap.
- Jaco reports the **same bundle was inaccessible before high tide**, then reports overlap at high tide. “Before high tide” supplies neither a numerical tide height nor proof of the exposed phase. A later retry after falling tide remains unconfirmed. Never substitute successful collection before high tide for his report.
- The older historical high-to-low incident is a separate report without its exact position/sequence. Controlled success after a falling tide below is not its reproduction or resolution.

The baseline snapshot is the code under `captures/third-improvement/baseline/src/`. Its correspondence to the exact interview build/save is not established by the screenshots alone. Current-code observations below are a dated snapshot, not final integration approval. [Domain results and SHA-256 source hashes](../../../captures/third-improvement/pickup-analysis/domain-comparison.json) identify inspected versions; [asset bounds](../../../captures/third-improvement/pickup-analysis/asset-bounds.json) records current GLB measurements.

## Candidate nodes, not identifications

All baseline wood nodes use the same three-cylinder log motif: cylinders length 1.5, radius .19–.23, spaced .38 in local Z. A one-unit ring and tall locator appear on every node. Tidal nodes additionally have a small rock/tether and .35-radian yaw; shore nodes bob with the water. Perspective, occlusion and color are insufficient to turn these differences into a reliable ID here. See [baseline scene construction](../../../captures/third-improvement/baseline/src/scene.js:219).

| Candidate | Coordinate X,Z | Rule | Assessment |
|---|---|---|---|
| `mangrove-timber` | 38,3 | Shore; available at all tides when region unlocked and in reach | Useful leading hypothesis: wheel is visible, nearby cluster/scenery is compatible, and logs look freely floating. No unique landmark/coordinate establishes Mangrove. A shore-node failure cannot be explained by tide alone. |
| `mangrove-roots` | 32,-4 | Tidal; exposed at height ≤.35 | Plausible alternate log in a Mangrove cluster, including the other submerged bundle. Small anchor cues may be obscured. Do not assign the hidden target to this category merely because Dive is offered. |
| `home-timber` | 6,6 | Tidal | Remains possible; “farther away” is not a region name. `home-driftwood` at 4,1 is shore, but the report that starter piles were collected makes it a weaker candidate. Individual collected IDs are unknown. |
| `reef-driftwood`, `horizon-timber` | -24,-29; 10,65 | Shore, gated by greenhouse/sail respectively | Weaker without evidence of those upgrades/region. Screenshot cropping is not enough to exclude them conclusively. |

A baseline “Salvage dive” button is **not diagnostic of an anchored target**: `contextualDiveChoice()` falls back to legacy salvage diving whenever cleanup entry is unavailable, even without an eligible nearby resource. [Baseline main](../../../captures/third-improvement/baseline/src/main.js:390).

## Geometry and rule mismatch

Baseline gather range is a horizontal **center-to-node distance ≤3**, independent of raft heading, hull footprint, camera projection or log mesh extent. The raft is positioned at the domain center with no scene scale applied; heading rotates it. Current GLB metadata gives deck width 7 and depth 9, matching the asset generator. Its static geometry bounds are X [-3.665,3.731], Z [-4.615,4.615]; these bounds include cabin/decorations, not an exact deck collision polygon. The nominal deck alone extends ±3.5 sideways and ±4.5 fore/aft. Source: [asset generator](../../../scripts/build_assets.py:300), [baseline boat placement](../../../captures/third-improvement/baseline/src/scene.js:291).

Consequently, a target at local (0,4) lies beneath the nominal deck yet fails the original distance rule. A target at (3.4,4.3) lies near the deck corner and is 5.482 units from center. Mesh/ring overlap can begin even earlier. Screen overlap can additionally be caused by perspective and tall cabin occlusion; it is not proof that either of these planar fixtures matches the photo.

**Land versus region:** Mangrove's domain center is (36,0), radius 10; scene island land is offset to (36,-18), scale 1.2, yaw zero. Current island asset bounds transformed by that baseline placement span approximately X [25.293,47.439], Z [-26.147,-8.902]. Roots at (32,-4) are about 4.90 units beyond the nearest Z bound, so “roots inside rendered island” is not supported by this asset/placement. This uses current asset bounds, not a retained historical GLB; an AABB also is not a land collision model. Baseline movement contains world bounds/shoal slowdown, not island-mesh collision blocking. The **domain region disk** and **rendered land** must not be conflated.

## Controlled pure-domain results

Imported the retained baseline module and current module directly into Node. Each fixture creates an independent synthetic state, explicitly sets position/time/unlocks, reads `getContext`, then calls `act('gather',{nodeId})`. These are permission/geometry tests, not earned playthroughs, UI tests or reconstructed saves. Time is seconds in the 180-second cycle; tide height is `(1-cos(2πt/180))/2`.

| Fixture | Baseline result | Current inspected result |
|---|---|---|
| Mangrove shore timber; raft (38,-1), target (38,3), low tide, wheel present | `too_far`, distance 4; no gather target | Explicit timber gather succeeds with range 4.5. Automatic context instead selects closer available `mangrove-crate`. |
| Same timber; raft (34.6,-1.3), corner offset (3.4,4.3) | `too_far`, distance 5.482 | Still `too_far` for timber; another node (`mangrove-roots`) becomes automatic gather target. |
| Same timber; center distance exactly 3 at t=90/high | Success | Success. Shore access is not tide-gated. |
| Roots centered, t=0/height 0 | Success | Success |
| Roots centered, t=45/height .5, still rising before high | `high_tide` | `high_tide`; this code name also covers mid-tide above .35. |
| Roots centered, t=90/height 1 | `high_tide` | `high_tide` |
| Roots centered, t=150/height .25 | Success | Success; separate synthetic fixture, not Jaco's post-fall retry. |
| Roots centered without wheel, prior region home | `wrong_region`; absent from context nodes | `locked_region`; included in context with reason |
| Pearl node approached radially from outside Mangrove disk: raft (33.2033,-9.7884), distance 2.9, wheel present, legacy diving true | `wrong_region`; absent from context despite being in gather range | Success in pure domain; current public dive routing must be tested separately. |
| Roots radially outside region: raft (28.8887,-7.1113), distance 4.4, wheel present | `wrong_region`, also beyond original reach | Success; addresses wider reach overlapping region edge. |

The regional pearl case is a real baseline defect class. Region fallback retains prior `state.region`, so approach history can affect outside-disk behavior. However, roots lie 5.657 units from region center, leaving 4.343 units to its edge; their **entire original three-unit gather disk** is inside the unlocked region. Timber's margin is 6.394. Thus an unlocked within-three-unit Mangrove **log** failure is not explained by this regional edge. The retained JSON computes margins for every non-home node; Mangrove pearls are the only node whose original reach disk crosses its region edge.

The baseline HUD replaces its generic restoration text with target-specific information when the chosen target is within three units. Both screenshots retain generic text. This is consistent with center-distance exclusion or target omission; it weakens a simple “in-range anchored object correctly blocked by tide” account. It remains conditional on code/build identity, selected target and HUD refresh timing. It is evidence to investigate, not a deduction of exact coordinates.

## Current engineer changes and remaining risks

Inspected changes increase `GATHER_RANGE` from 3 to 4.5, replace the gather region-equality check with upgrade permission, include uncollected nodes across regions in context/candidate evaluation, and record target-region discovery on collection. Current `main.js` obtains availability from domain context and displays distance/blocked advice. These changes address the reproduced bow-distance and region-filter cases. They do not yet establish that the screenshots' encounter is fixed.

Residuals: a circular 4.5 reach still misses deck corners, and larger reach allows a different nearby resource to win automatic selection. Clear target feedback is essential so an available Gather does not imply the visually intended log is selected. The engineer should decide whether footprint-aware reach or clearly communicated center reach best fits the experience; this sidecar changes neither. Current scene readability, hint visibility, actual keyboard/button agreement and transfer animation have not been visually validated here.

## QA acceptance fixtures

1. **Shore log approach:** use `mangrove-timber`, wheel earned, other nearby node states explicitly recorded. Approach from bow, stern, side and corner at heading 0 then quarter-turn. Capture the target before occlusion, first actionable frame, overlap and E/button result in both sailing cameras. Log raft/node coordinates, local offset, selected ID, range/reason, tide, upgrades, collected IDs and frame/build. Require either clearly available collection before misleading overlap or an intelligible visible reach explanation; a silent muted button fails.
2. **Competing targets:** replay (38,-1) and (34.6,-1.3) with crate/roots uncollected, then collected. Verify visible target identity agrees with actual resource granted; one input grants once. Do not count “some item gathered” as the intended log passing.
3. **Tidal threshold:** at the same roots position and uncollected state test just below/above .35 on both rising and falling phases, plus .5 and 1. Hold position while tide falls and verify availability refreshes without reload/re-entry. Require explanatory feedback while blocked. Keep this result separate from the unverified historical incident.
4. **Region edge:** test the pearl radial fixture with wheel and prior regions home/mangrove, plus roots at 4.4 with current reach. Test locked upgrade separately. Verify the current side-view entry/resource adapter preserves availability and rewards; direct legacy-domain success alone does not validate the new route.
5. **Save/entry:** collect a newly reachable cross-region node, save/reload and verify one grant, valid discovery and no rejected save. Repeat locked-node attempt with no mutation. Retain original player save untouched.
6. **Screenshot-associated pass:** arrange the plausible shore and tidal log clusters independently, matching camera/heading as closely as possible. Retain each as a candidate reconstruction with its own evidence; only call it the exact incident if node, position, tide and saved-state provenance are established. Show proximity/blocked feedback in compact layout and while the hull hides the object, not only in debug output.

Disposition: a baseline visual-footprint/range mismatch and a separate pearl regional-edge failure are demonstrated. Candidate identity, exact log incident root cause, historical falling-tide failure and integrated visual fix remain open. Passing unrelated fixtures must not erase Jaco's report.

## Final implementation refinement

Independent rendered review found the larger circle alone still mismatched corner contact and multiple Gather markers did not identify the active object. The final domain now unions the existing 4.5m circle with the heading-oriented 7×9m raft footprint, covering actual corners without a blanket larger circle. Public resource entry and UI permission consume the same reach result. The scene names every nearby source, highlights the active source, and shows E only for that source; blocked distance/direction and covered-tide reasons replace unconditional Gather claims. Later controlled final-build results in QA and design review supersede the earlier corner-rejection acceptance. This closes demonstrated current defect classes, not the unidentified historical screenshot incident.
