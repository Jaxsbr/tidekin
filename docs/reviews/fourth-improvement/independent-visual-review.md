# Final independent visual review — fourth improvement

**Reviewer UI/art judgment: 77/100 overall; interface presentation alone 82/100.** Substantial improvement over the user's **55/100 baseline**, but below the aspirational **90/100**. These are subjective review scores, not measured gains, functional certification, or human approval. Earlier agent 75 scores are not used as the baseline.

**Final focused verification complete; all reviewer browsers closed.** Production `http://127.0.0.1:5181/?qa=1`, entry `index-tY5N3BJ1.js`, CSS `index-D1qJB8_b.css`, scene `scene-qTMv-AZ0.js`. HTML and all three asset SHA-256 fingerprints matched before/after the focused capture. Evidence: `captures/fourth-improvement/reviewer/affected-final/results.json`. Actual DOM/keyboard inputs; isolated Chrome, High, DPR1, 1440×900 and 900×900. No implementation changes, builds, restarts or performance benchmarks performed by reviewer.

## Final affected checks

| Check | Result and evidence under reviewer/affected-final/ |
|---|---|
| Narrow entry framing | Resolved oxygen/head overlap. First bottle visible, face unobstructed, air/water separation explicit. `900/03-entry-idle.png`. |
| Surface crawl | Horizontal prone pose, readable face/body and bent limbs at surface. `900/04-surface-prone.png`; wide equivalent also checked. Still visually simple water contact. |
| Deeper scrolling | Character remains readable while background/rock position changes; narrower supports/openings reduce screen blockage. `900/05-swimming.png`, `06-idle.png`, `07-deep.png`. |
| Inspection | Underlying Gather/Dive actions hidden; compact controls clear of raft and bottom navigation. `900/01-inspect.png`. |
| Track home | Actual Map → Track click produces visible arrow, “Home anchorage”, dismiss control. `900/02-bearing.png`. |
| Pull instruction | “Hold object to pull” visible in the lower-left guide. `900/03-entry-idle.png`. |

## Scores by criterion

| Criterion | /100 | Evidence and reason |
|---|---:|---|
| Illustration-led interfaces | 85 | `final/*/01-title.png`, `03-workshop.png`, `06-cabin.png`: strong hero art, large wheel, full cabin; text no longer dominates. |
| Action clarity | 81 | `final/*/05-journal.png`: actual timber and “Gather supplies”; workshop owned/required counts; labelled nav and settings. Map remains the weakest explanatory screen. |
| Illustration quality and scale | 83 | Painted assets read cleanly at workshop/cabin scale; small toolbar images remain recognizable. In-world objects are much simpler than their pictured counterparts. |
| Layout at both sizes | 83 | Captured panel actions fit; corrected inspection and entry HUD overlap. Evidence combines `final/` all-screen batch and `affected-final/` fixes. |
| Character and swimming | 77 | Distinct hair, goggles, face/clothing; prone left/right swimming and eased upright idle; no basket. Surface contact lacks convincing ripples/refraction. |
| Reef/world coherence | 65 | Painted panorama adds depth and richness; slender open pillars improve composition. Plain foreground rock surfaces and repeated disc corals still contrast with the painterly background. |
| Camera and visual task discovery | 80 | First target visible, narrow face clear, left/right/down tracking readable. Earlier actual pointer collection after scrolling succeeded; final focused pass did not repeat picking. |
| Collectible cards | 83 | One compact painted Timber card; no remote distance labels or former raft circle. Card can still sit over raft detail in inspection. |
| Assembly presentation | 78 | Labelled fixture on B3ehq6Kw showed parts arriving, wheel attaching, camera change and completion. Finished wheel clearly changes raft. Result is plainer than the recipe picture. |

Overall judgment weighs the persistent world/character presentation alongside UI; it is not an arithmetic claim that all acceptance gates pass.

## Remaining actionable limitations, ranked

1. **Medium — Art coherence remains the largest distance from 90.** `affected-final/900/07-deep.png`: smooth olive pillar with repeated shelf discs against intricate, slightly soft painted reef; thin procedural coral at bottom. Add coherent material/value detail and more varied authored foreground clusters. Avoid solving this solely with more backdrop detail.
2. **Medium — Surface treatment is mechanically clear but visually unfinished.** `affected-final/900/03-entry-idle.png` and `04-surface-prone.png`: large flat grey sky/air band ends in a perfectly straight boundary. Add a restrained sky gradient and water-contact highlights/ripples; keep the corrected face clearance and readable surface pose.
3. **Medium — Chart contrast and geographic meaning need polish.** `final/900/04-map.png`: pale shoals and tiny reef legend remain weak; Home is a small label/marker rather than a recognizable island. Improve silhouettes and contrast without bringing back verbose prose.
4. **Low — Assembly feedback layers over contextual buttons.** `final-followup/FIXTURE-assembly-0.png` and `-3.png`: Waterwheel feedback occupies the Gather/Dive row. Reserve the row during assembly, as inspection now does. This was observed on B3ehq6Kw; assembly was not recaptured on tY5N3BJ1 because the requested final pass was limited to affected views.
5. **Low — Default sailing view hides most of the adventurer behind the cabin.** `final/900/02-hud.png`: charming face is mostly absent in normal sailing despite being strong underwater. A small camera bias or more readable deck position would improve character continuity.

No remaining high-severity visual blocker was observed in the final focused checks. This does not claim complete functional acceptance.

## Post-review assembly fix — pending QA verification

Parent reports a staged CSS-only fix: `.game-view:has(#build-presentation:not([hidden])) .hud-bottom{visibility:hidden}`. This hides the bottom HUD during visible assembly feedback and is intended to resolve remaining limitation 4. It has **not yet been independently verified**; the QA owner will check assembly HUD hiding/restoration after the final rebuild and may append the result here. No further reviewer browser session or full visual re-review is required for this scoped change. Scores remain **82/100 interface presentation and 77/100 overall UI/art**.

## Coverage and acceptance boundaries

- All requested UI screens captured at both sizes on frozen **B3ehq6Kw**: title, HUD, workshop, chart, journal, cabin, inspection, pause, settings, dive. Parent states unaffected UI is unchanged in final build. Final affected views rechecked on **tY5N3BJ1** at both sizes. See `final/observations.json` and `affected-final/results.json`.
- **Workshop gate:** one current plan, large artwork, materials with owned/required counts, Build; no future plans or speed prose. Assembly screenshots are explicitly **FIXTURE**: isolated saved inventory (6 wood, 2 scrap), actual Build button. No claim of earning those supplies. `final-followup/results.json` records presentation progression ~0.19 → 0.99 → 1/inactive and stable prior-build HTML/entry fingerprint.
- **Controls/interaction:** actual forward input moved raft z0 → z2.5 without helm on prior frozen build. Actual swimming plus pointer hold collected `reef-bottle`, 0/3 → 1/3, after camera scrolling. This is a scoped interaction observation, not full persistence/reset validation.
- **Character/camera gate:** prone propulsion, upright idle, surface crawl, no trailing basket, readable scale and multidirectional scrolling visually supported. Full animation cadence is not scored from a video; these are timed actual-input frame sequences.
- **Functional gate:** parent reports 44 earned-route and 11 square checks passed on prior candidate and final exact-build earned rerun underway. Those are parent-reported QA, not independent reviewer results. Persistence, all reset/failure cases and full earned progression are outside this visual sign-off.
- **Performance gate:** unassessed here; screenshots/read-only metrics are not benchmarks. Reviewer browsers are closed for exclusive hardware QA. Sound, reduced-motion behavior and larger-text mode were not independently assessed. No human approval asserted.

---

# Historical review notes (superseded where final findings above resolve them)

# Independent visual review — fourth improvement

Status: review in progress, first capture defects available for integration. User baseline remains **55/100**; aspirational target **90/100**. No human approval is implied.

Source: http://127.0.0.1:5190/?qa=1, isolated Chrome, 1440×900 and 900×900, DPR1, High. Captures and read-only state/metrics are under `captures/fourth-improvement/reviewer/`. Actual keyboard/DOM inputs, no runtime action hooks. No builds, restarts, implementation edits or performance benchmark. Browser closed after first capture batch. Integration changed live during the 1440 dive: `held-a` and `14-dive-idle` returned to title and are INVALID dive evidence; do not call this a product defect without reproduction.

## Early ranked defects

1. **High — Cabin illustration scale/layout is broken.** Both `1440/06-cabin.png` and `900/06-cabin.png`: roughly 70×45 cabin art in a ~700×750 panel, enormous empty central area. Enlarge the actual child illustration to fill the scene region; retain concise visible labels on the three destinations. This does not meet the illustrations-dominate gate.
2. **High — Journal removed the task, not just excess prose.** `*/05-journal.png`: book image, “Something from the sea”, 0/4. No pictured target or short action identifies what to collect. Show the actual objective object and a concise verb/count. A book represents Journal, not the task.
3. **Medium — Chart has weak pictorial meaning.** `*/04-map.png`: colored dots and tan slivers on a pale radar with no legend; a small interior picture represents home. Use recognizable miniature islands/reef/salvage marks and concise identity on selection; improve contrast. Avoid adding paragraphs.
4. **Medium — Look panel obscures what it should reveal at 900 wide.** `900/07-inspect.png`: panel overlays the right half of the raft and collectible. Move controls to a compact edge strip; use visible rotate/zoom glyphs (current rotate symbols are tiny).
5. **Medium — Icon language is inconsistent.** HUD Map and Look share the same map illustration; Cabin toolbar uses a sailboat while Cabin/home use an interior. Collectible Timber uses a flat log pictogram, while inventory timber is painted. Use dedicated, coherent illustrations that match the action and object.

## First positive findings

Workshop is materially improved: large waterwheel artwork, pictured material costs, one current plan, no locked/future list or speed prose. Title has clear actions and strong illustrated composition. HUD is much less obstructive; only one compact timber card is visible. The swimmer is larger and more expressive, has no trailing basket, faces left/right, and takes a prone propulsion pose in the actual-input 900 captures. These improvements do not erase the remaining defects or imply 90-level finish.

## Parent integration update / capture hold

Parent reports Cabin sizing fixed after first captures, new chart integrating, and Journal/Look/icon identity fixes planned. Earlier defects remain historical observations pending frozen-candidate verification, not claims about the latest source. Browser capture is on hold awaiting parent freeze. A follow-up had already completed when the hold arrived; its browser is closed. `followup/results.json` reports `sourceUnchanged: false`; none of that batch establishes stable-candidate acceptance, including its explicitly labelled assembly fixture.

## Underwater review from valid first-batch 900×900 frames

- **High — Entry gives no visible task object.** In `900/10-dive-idle.png`, all three target projections are outside the viewport (bottle x=-16.5, can x=-576.3, bag x=1289.7/y=1070.5). The first descent still has zero visible target centers (`held-s`). A new player sees “Pull it free” without an “it”. Adjust initial composition or place the first cleanup object in the entry view; preserve scrolling and character scale rather than returning to whole-world zoom.
- **Medium — Entry idle floats above the surface.** `900/10-dive-idle.png`: surface line ~y160; head ~y16, torso mostly above water and only legs submerged. It reads as standing/hovering, not treading water. Align waterline near neck/shoulders at idle, then inspect the moving surface crawl separately. This is a visual observation; do not infer broken physics.
- **Medium — Guidance can conceal target art.** In `900/held-a.png` and `14-dive-idle.png`, bottle center projects around (213–222,209), with its upper silhouette behind the bottom of the upper-left guidance panel (panel ends around y185). Keep the target's visible silhouette clear or collapse/move guidance after movement begins.
- **Medium — Reef composition remains sparse and washed out.** `900/held-d.png`, `held-a.png`: broad pale cyan empty field, large plain polygon rock slabs, repeated thin horizontal discs, very little readable coral/plant life at the character's depth. Add authored clusters, stronger near/mid/far value separation and varied silhouettes around the traversable route. More tiny fish alone will not bridge the supplied reference's visual richness.
- **Low — Action copy duplicates the shortcut.** `900/10-dive-idle.png`: “Space / Return · Space”. Retain one shortcut plus a clear return label. Guidance's “Hold E / target · Pull” is too compressed to explain pointer holding; use a compact pointer-hold visual or “Hold object to pull”.

Positive evidence: the swimmer is approximately 220px long at 900×900, with readable goggles/hair/clothing, prone left/right propulsion and no basket. `held-a` to `14-dive-idle` visibly eases toward upright. World x travels 0 → 5.17 → -2.24 while swimmer projection remains approximately x429–481, supporting horizontal camera tracking. Descending from y0 to -4.51 shifts the rock/target projections upward while keeping the character readable, supporting vertical tracking. These frames do not verify hit testing, surface crawl, full stroke timing, or final settled idle.

Provisional criterion scores for these valid frames only: character readability/detail **73/100**; propulsion pose/facing **76/100**; camera framing/scrolling **72/100**; underwater art richness/coherence **52/100**; immediate dive task/action clarity **55/100**. These are reviewer judgments, not measurements or human approval. No composite candidate score while integration is changing.

## Frozen UI recheck; production endpoint pending

`ui-frozen/` captures cover all nine UI screens at 1440×900 and 900×900 with isolated Chrome and actual inputs; browser closed. Visual inspection confirms full-size Cabin artwork and visible destination labels, Journal timber illustration plus “Gather supplies”, distinct Look eye, painted timber pickup, compact bottom inspection controls, and styled Settings switches. Earlier high-impact Cabin/Journal defects are resolved in this source snapshot. The new chart has a map border, compass, reef legend and geography; its pale shoals and small legend still have weak contrast. Inspection clears the raft but overlaps the underlying Gather/Dive buttons in the 900-wide capture; hide those contextual actions while inspection is open or reserve nonoverlapping space.

Final production request identifies `http://127.0.0.1:5181/?qa=1` / `index-B3ehq6Kw.js`. Browser navigation and two subsequent endpoint checks returned connection refused. No server changes were attempted. Final production/reef/assembly acceptance and final score remain pending accessible frozen endpoint. No inference of product failure from this infrastructure condition. The prepared `final.mjs` and `final-followup.mjs` capture scripts remain in the reviewer-owned directory; assembly uses labelled isolated inventory fixture, not earned progression.
