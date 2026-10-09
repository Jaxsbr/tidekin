# Tidekin iteration scorecard

These are evidence-backed agent judgments using the weights in [PROJECT.md](../PROJECT.md). They are not human enjoyment ratings, market predictions, or statistical measurements. A score of 3 means a coherent MVP; 4 means a polished beta within the tested scope. Weighted total = sum of score × weight ÷ 5. The target remains 75/100 with no dimension below 3.

## Baseline and beta 2

The baseline uses the original earned expert route and browser benchmark. Beta 2 combines the revised earned route, independent art comparison, novice revisit, final functional QA and hardware benchmark. Its short arc was exposed by an efficient automated input sequence; the reported 16.6 game seconds are not a human completion-time estimate.

| Dimension | Weight | Baseline | Beta 2 | Evidence |
|---|---:|---:|---:|---|
| Core interaction and agency | 16 | 2 | 3 | [Expert route and rig comparison](playtest-expert.md) |
| Progression and session return | 14 | 3 | 2 | Earned full route and reload worked, but the prescribed chain could be rushed through chart passage and rewards |
| Tide system and exploration | 12 | 3 | 3 | Actual low-tide crossings, forecast, and rig route timings |
| Reference art fidelity | 14 | 2 | 2.98 | [Independent reference comparison](art-review.md); retain the below-3 finding rather than rounding it into a pass |
| Animation and feedback | 10 | 3 | 3.5 | Motion frames and functional feedback; rigid swimmer remains a limit |
| Onboarding and usability | 10 | 3 | 4 | [Novice revisit](playtest-novice.md) and QA of focused intro/resource finder |
| Reliability and persistence | 10 | 3 | 4 | [QA recovery cases](qa.md), 28 domain tests, [six closed code findings](code-review.md) |
| Performance | 8 | 4 | 4 | Hardware Chrome/M4 Pro, 20-second rAF sample and repeated circuits; one device only |
| Accessibility and settings | 6 | 2 | 3 | Keyboard focus, text size/persistence, named controls; not a complete assistive-technology audit |
| **Weighted total** | **100** | **54.4** | **63.7** | **Improved by 9.3 points; beta target not met** |

Beta 2 passed its tested functional checks, but progression and reference fidelity were below the minimum dimension target. It is retained as an intermediate candidate, not described as having passed the full beta gate.

## Why beta 3 is being built

The next iteration addresses observed problems, not a numerical score alone:

- First visits require physical sailing before quick passage unlocks, making exploration part of the actual upgrade route.
- Optional surface and continuous-dive expeditions make rig choice consequential and give repeated sessions persistent completion records and visible pennants.
- Direct-versus-bypass estimates show the time cost of current-tide shoals before choosing a route. Estimates explicitly hold the current tide fixed.
- Calming every water-mesh vertex near the full shore footprint addresses the remaining flooding cuts, which the first visual fix did not remove across the whole tide cycle.
- Separate character limb pivots will allow swimming strokes instead of moving a rigid deck pose.

## Beta 3 result

The [expert's earned expedition runs](playtest-expert.md#beta-3-functional-candidate--earned-expedition-playtest), [final art review](art-review.md), [closed code review](code-review.md), and final [save-fixture](../../captures/qa-2026-10-08T10-37-20-605Z/qa-results.json) and [render/route benchmark](../../captures/qa-2026-10-08T10-38-21-370Z/qa-results.json) support this synthesis. Onboarding and general settings judgments retain the earlier novice/QA evidence; they are not presented as a new blind novice study of the expeditions.

| Dimension | Weight | Beta 3 | Weighted points | Evidence and limit |
|---|---:|---:|---:|---|
| Core interaction and agency | 16 | 4 | 12.8 | Actual route choice, Diver success versus Skimmer failure, safe retry, physical discovery |
| Progression and session return | 14 | 3 | 8.4 | Earned active-route save, two route types, day-two repeat, three persistent completions and two visible pennants; only two fixed circuits |
| Tide system and exploration | 12 | 4 | 9.6 | A selected ~13-second bypass took 12.58 seconds; first discovery requires sailing; current-tide estimates are explicitly limited |
| Reference art fidelity | 14 | 3.05 | 8.54 | Authored limestone landmarks, improved framing and flooding contact; water/depth remain simpler than the reference |
| Animation and feedback | 10 | 3.7 | 7.4 | Art review's motion/usability assessment: articulated swim frames, reduced-motion pose, responsive action feedback; simple rigid limbs rather than a skeletal rig |
| Onboarding and usability | 10 | 4 | 8.0 | Earlier novice first loop and targeted UI checks; optional expeditions stay in a native accordion, which now remains open after a claim |
| Reliability and persistence | 10 | 4 | 8.0 | 49 rules/navigation tests, earned save-return, isolated save fixtures, all eight reported P2 findings closed, no runtime errors in final QA |
| Performance | 8 | 4 | 6.4 | Final hardware benchmark passes on the measured M4 Pro/Chrome profile; no lower-end device matrix |
| Accessibility and settings | 6 | 3 | 3.6 | Keyboard/focus, semantic controls, persistent larger text and motion settings; full contrast and assistive-technology audits remain open |
| **Weighted total** | **100** | | **72.7 / 100** | **+18.3 from baseline; +9.0 from beta 2** |

**Disposition: playable local beta candidate.** All nine scored dimensions reach 3, but the original 75-point target remains unmet. Do not present this as having passed that wider-beta quality target. The prototype, additional features, and multiple feedback/iteration cycles are delivered; further progression variety, stronger water/scene fidelity, and real human sessions are the highest-value next work. The score is a structured judgment, not proof of fun.

### Final verification scope

- **49/49 deterministic tests pass:** 38 simulation/save/expedition tests and 11 navigation tests. The full main arc uses actual domain steering in its current test; this is not browser input.
- The five-upgrade arc was earned through browser input in beta 2. Beta 3's browser run separately earned the wheel, expeditions, first sailing discovery, a next-day repeat, and cross-session continuation. A complete five-upgrade browser replay was not repeated after beta 3; that limit is retained.
- Final save fixtures cover old-v2 migration, active/ready expedition records, claims, and 1/3/5 completion tiers. Fixtures are coverage data, not evidence that a player earned those tiers.
- Final renderer: **59.88 median FPS**, **16.7 ms median / 16.8 ms p95**, **zero frames over 50 ms**, 1,200 samples over 20 seconds after five seconds warm-up. Chrome 154.0.8037.98, hardware ANGLE Metal Apple M4 Pro, 1440×900, DPR 1, High quality. One profile only.
- All three GLBs loaded successfully; all observed shader compiles and program links succeeded; final runtime, request, and WebGL error counts were zero. Two short sailing circuits exercised movement and visibility. Geometry counters rose 163→169→170 as more geometry was encountered; this is not a long-session leak certification. Source geometry/particle creation is bounded.
- [Release manifest](release-manifest.json) identifies source, asset and production-bundle hashes. Historical failures and harness corrections remain in the QA records rather than being removed.

The [human beta handoff](../design-decisions.md#human-beta-handoff) describes the next observation protocol. No human study, public hosting, or recruitment is claimed.
