# Tidekin independent art review — beta2 final and focused beta3 delta

**Final articulated-Explorer assessment:** reference fidelity **3.05/5** (unchanged), animation/usability **3.70/5**, combined **3.25/5** (unrounded 3.245). Actual paired dive frames show attached articulated limbs changing pose; reduced motion holds the pose. Only character motion rises, from 2.0 to 3.0 within the existing 20%-weighted animation rubric. This supersedes earlier aggregate animation scores below; broader art scope remains closed.

**Latest focused beta3 verdict (5181):** the prominent rear-shoal flooding notches are resolved in matched 34/38-second captures. Water/contact rises from **1.5 to 2.0/5**; all other criteria remain unchanged. Reference fidelity is now **3.05/5**, animation/usability **3.50/5**, combined **3.19/5** (unrounded 3.185). This narrowly clears the coherent-MVP fidelity threshold. A small exposed far-right sliver remains at 38 seconds; this is not a claim that every shoreline artifact is eliminated. See the beta3 delta below. Beta2 scores below remain historical.

**Final beta2 status, shoal-polish build:** reference fidelity remains **2.98/5** (unrounded 2.975), animation/usability **3.50/5**, combined **3.13/5**. Muted sand and wet edges improve low tide, and fully submerged high tide is clean in the matched frames. However, conspicuous angular water cuts persist during flooding at 34–38 seconds, so the previously stated condition for raising water/contact from 1.5 to 2.0 has not passed. The strict reference-fidelity ≥3 gate remains unmet. See [focused shoal recheck](#focused-shoal-recheck). Earlier sections retain historical evidence and scores.

**Review disposition:** beta2 art review is finalized at the scores above. Existing sea, landmarks, and art scope are closed for this cycle; the flooding artifact is a recorded nonblocking limitation, not an outstanding request for another art iteration. The possible score uplift discussed below is conditional future guidance, not an awarded score. Beta3 optional daily expeditions will receive only a visual review of their new navigation markers and UI after that build is available. Existing art and animation scores carry forward unless new visual evidence directly invalidates them. Gameplay progression is outside this art rubric.

Only this report and `captures/art-review-*` were written. No app source, exports, or builds were edited or rebuilt by this reviewer. All capture browsers have closed; no local server was stopped.

## Original baseline review

Reviewed 8 October 2026, 22:11–22:12 NZDT, at **1440 × 900**, device scale 1, using Playwright and cached Chrome 153. Production URL: `http://127.0.0.1:5179`. This review concerns the existing `dist` snapshot, not the parent's concurrent source changes or forthcoming expedition-rig choices. No app files were edited and no build was run.

**Asset-version boundary:** the parent identified a swimmer-clone issue in the earlier baseline. Baseline and beta workshop binaries have different hashes. The latest beta mesh data independently counts **41,976 workshop + 17,778 island = 59,754 triangles**, and `Explorer` contains an `Explorer_Geometry` mesh child. Missing or occluded baseline swimmer presentation must not be attributed to the final artist export. Historical triangle totals are not used to judge art quality. The baseline character/motion scores describe the captured deployment only; beta evidence is recorded separately below.

**Baseline verdict:** the modeled workshop has recognizable craft and a coherent toy-like identity. The baseline runtime does not yet deliver the original image's ocean adventure. Its largest visual field is regular dotted water, its camera removes the horizon, and its small central raft loses the character and construction detail present in the asset preview. Renderer presentation is the best investment this cycle.

## Original three renderer priorities

1. **Reframe the home and the horizon together.** Lower the camera pitch, move closer, and retarget slightly ahead of the raft. Start by testing roughly 10–15° downward pitch with a narrow sky band; tune distance/FOV for a raft approximately 360–430 px wide at this viewport, compared with roughly 245 px now. Keep the bow, shell, character, and nearby pickups inside the clear central area. Pass when the horizon and at least three receding island layers are visible, the bow character is identifiable without zooming, and nearby gathering targets remain usable. Do not enlarge the whole world or reveal locked upgrades to achieve this. Capture the same starting state with UI on.
2. **Replace the water's uniform dot grid with sparse, directional water structure.** Reduce the regular high-frequency glitter substantially; use broad overlapping directional wave bands, broken crest ribbons, and local hull/shore foam with varied thickness and gaps. Give shallows a lighter turquoise transition and open water a darker blue-teal mass. Keep the procedural approach economical. The exposed sand disks also need coherent water intersections: in frames 04/05, the same top island changes from a cut-out wedge to a complete pale platter. Pass when water has large quiet areas, bright marks follow crests/contact, and shore edges do not switch between conspicuous flat slices. This is a presentation fix, not a request for a full wave simulation.
3. **Compose an archipelago from distinct distance silhouettes.** Replace the repeated far full-island asset with a few inexpensive arrangements: tall narrow stack, broad broken ridge, low palm cay, and paired separated spires. Vary group spacing, height/width proportions, overlap, and gaps; rotation alone will not conceal the same beach-and-palm template. Use progressively cooler, lower-contrast silhouettes and restrained haze. Keep the detailed island for approach views and align its visible beach with the gameplay bay. Pass when three distant groups are distinguishable by shape at thumbnail size and the view reads as one receding landscape rather than separate disks.

These three changes improve the majority of the image without rebuilding the artist's assets. Character acting and smaller UI refinements remain real gaps, but a new animation rig is lower leverage for this renderer-only cycle.

## Evidence and boundaries

Inspected the actual [original reference](../../assets/reference/ocean-workshop.png), [workshop preview](../../assets/previews/workshop.png), [island preview](../../assets/previews/island.png), and [art direction](../art-direction.md). The reference is a dramatic illustration; the internal brief explicitly accepts economical geometry and toy-like figures. These are separate judging standards.

| Evidence | What it establishes |
| --- | --- |
| [01 — menu](../../captures/art-review-01-menu.png) | Actual title screen, illustration, typography, CTA, and settings entry |
| [02 — default settings](../../captures/art-review-02-settings-default.png) | High detail; sound on; reduced motion off |
| [03 — new game](../../captures/art-review-03-newgame.png) | Real first-voyage instructions and confirmation |
| [04 — gameplay A](../../captures/art-review-04-gameplay-frame-a.png), [05 — gameplay B](../../captures/art-review-05-gameplay-frame-b.png) | Starting raft, visible UI, water pattern, shoreline change, motion across 1.687 seconds |
| [06 — workshop](../../captures/art-review-06-workshop.png) | Actual upgrade cards, costs, unavailable states, panel layout |
| [07 — dive A](../../captures/art-review-07-diving-frame-a.png), [08 — dive B](../../captures/art-review-08-diving-frame-b.png) | Real dive mode and oxygen countdown across 1.312 seconds |
| [09 — reduced-motion settings](../../captures/art-review-09-settings-reduced.png), [10 — reduced A](../../captures/art-review-10-reduced-frame-a.png), [11 — reduced B](../../captures/art-review-11-reduced-frame-b.png) | Toggle enabled through UI; paired active-play frames 1.678 seconds apart |
| [12 — low-detail settings](../../captures/art-review-12-settings-low.png), [13 — low detail](../../captures/art-review-13-low-detail.png) | Low detail and sound off selected through UI, then returned to gameplay |
| [Capture script](../../captures/art-review-capture.mjs), [machine-readable evidence](../../captures/art-review-evidence.json) | Reproduction, browser/version, timestamps, visible text, settings storage, asset responses |

Screenshots include the unmodified real UI. A 500 ms settling delay avoids judging dialog entrance transitions. An isolated fresh browser context avoids altering a personal save. Both runtime GLBs loaded with HTTP 200; no page errors were recorded. This is an art review, not a performance or accessibility certification.

The production assets remained `index-Yc0WkYZF.js`, `scene-Dsg6bo1O.js`, and `index-DnS3JAir.css`. SHA-256 values were unchanged before and after capture:

```text
index-Yc0WkYZF.js   5e5e4301449f750a021004d66e789ace7ad3e17e525419142560c50f53ac85b6
scene-Dsg6bo1O.js   03cacf36aaf6c790a56abb972d67ee796587c328b7f2497eb695a4053095ec88
index-DnS3JAir.css  ad9a2a3993b4db704339f6e37bac40d39432b45dda78d630398aadb6d6daf989
```

## Baseline scores: runtime against two different standards

All scores use the requested **0–5** scale: **0 absent, 1 weak, 2 partial, 3 competent, 4 strong, 5 exceptional**. The first column measures translation of the original's visible qualities; the second measures execution of Tidekin's own stylized brief. These are independent editorial judgments, not a conversion of the art-direction document's 0–4 acceptance rubric. The original contains no UI or time sequence, so those reference scores measure visual restraint and implied liveliness, not literal interface or animation matching.

| Criterion | Original /5 | Internal /5 | Evidence and judgment |
| --- | ---: | ---: | --- |
| Palette | 3 | 4 | 04/05 retain teal sea, honey timber, cream, and small warm accents. The full model preview also carries coral flags and foliage. Runtime sea stays within a narrow bright teal range; the reference separates deep blue, translucent turquoise, warm sunset, and cool distant cliffs much more clearly. |
| Material hierarchy and light | 2 | 3 | Preview timber bevels, board seams, rope bindings, matte foliage, glass frame, and shell are differentiated. In 04/05 the shell becomes a chalky pale mass and wood has little broad light/shadow modeling; the bright sea competes with every highlight. Reference pearl translucency, wet surfaces, and warm directional light are not reproduced. |
| Primary silhouette | 2 | 3 | The developed preview clearly separates wheel, sail, cabin, greenhouse, shell, and hull. The starting runtime is mostly cabin plus rectangular platform, with shell readable but small. Locked upgrades are deliberately absent; that is not an asset-loading failure. The chosen starting composition still needs its own recognizable silhouette. |
| Overall composition | 1 | 2 | 04/05 center a small raft in nearly uniform water; upper island is cropped and the right island enters as a partial sand disk. No horizon or sky is visible. The original uses a dominant foreground home, diagonal water movement, near/mid/far islands, and a clear destination. |
| Hero scale and focal hierarchy | 1 | 2 | Raft spans roughly 245 px, about 17% of viewport width; deck character is only roughly 25–35 px tall and partly lost beside the cabin. The 287 px objective card is wider than the raft. The original gives the child, dog, and home first-read status; the runtime makes the HUD easier to notice. Pixel sizes are visual estimates. |
| Sea form | 1 | 2 | 04/05 show color bands and moving marks, but no readable rolling wave silhouette, swell direction, or water weight. A calmer sea is a legitimate internal choice; the repeating surface still looks synthetic rather than calm and natural. |
| Foam and water contact | 1 | 1 | White ellipses form highly regular rows across almost all water. They read as a dotted pattern, not broken crest foam. Concentric gameplay rings are useful navigation indicators but do not supply believable hull/shore contact. Shore exposure changes into flat wedges/platter shapes between frames. |
| Depth and atmosphere | 1 | 2 | 07/08 reveal coral/sand patches through paler water, which communicates a mode change. They do not establish submerged volume; the camera remains above water, and patches read as isolated shallow disks. Surface play lacks a visible atmospheric horizon. |
| Landscape shape variety | 1 | 2 | Island preview has an asymmetric rear cliff cluster, a landing side, ledges, and separated palm fronds. Runtime frames reduce this to clipped spike groups on broad pale shelves. One template cannot convey the original's mix of distant massifs, sea stacks, coves, and inhabited islands. The fully repeated horizon arrangement is outside this camera's view, so its visual variety cannot be credited from these captures. |
| Character and expression | 1 | 2 | Preview has a friendly child-and-dog pairing, readable hair/goggles, a raised arm, and a curved dog silhouette. Faces and gestures are far more restrained than the original's wave, open smile, and eager companion. At the play camera expression is effectively unreadable. Dive mode does not visibly establish expressive swimming in the recorded baseline pair. |
| Motion and buoyancy | 2 | 3 | 04/05 show actual water and raft changes; 07/08 are active dive frames, not a static mockup. There is ambient motion, but no demonstrated character acting, articulated swim cycle, or weighty water interaction. Reduced-motion frames substantially calm the broad scene. Locked wheel, sail, crane, and reveal animations were not exercised in this baseline pass. |
| UI restraint and art integration | 3 | 3 | 01 has a strong text/image division; 02/03/06 use cream surfaces and dark teal consistently. Runtime center is clear, yet six persistent HUD blocks frame it and the navigation card is 206 × 285 px. Small secondary copy, repeated contextual information, serif display titles, coral primary buttons, and symbol-based build icons differ from parts of the internal brief. The original supplies no interface to copy; the relevant question is whether UI lets the world lead. Here it often leads the world. |

## Original reference versus internal asset style

**Original fidelity:** the strongest surviving ideas are the handcrafted timber home, oversized shell mechanism, wheel, circular window, cream canopy, pennants, and tropical limestone. The major missing qualities are the wave's scale and transparency, pearl/metal/wood separation under dramatic light, exuberant child/dog acting, a lush layered island world, and the sense of looking outward toward a destination. The illustrated menu raises expectations that the runtime camera and water do not meet.

**Internal coherence:** the previews work better as a small crafted diorama. Workshop bevels and lashings are purposeful, the sail has billow and seams, the wheel has constructed paddles, and the conch is a continuous coil. The island's pale facets and feathered palms belong to the same stylized family. Weaknesses remain: the cabin is a straight-sided box, the large canopy dominates the developed preview, the vegetation is sparse compared with the reference, and the sand/grass perimeter reads as a model base. The runtime adds large flat shelves that amplify that model-base effect. Improving camera, contact, and distance composition should precede adding more small props.

## Motion and settings observations

The gameplay pair changes the water marks and raft orientation slightly; animation is genuinely running. The top island's exposed sand changes conspicuously across the pair, giving a slicing effect rather than gradual wetting. The dive pair advances oxygen from 16s to 15s and changes water/seabed visibility. The character is not clearly separated from the hull in these retained frames; they do not justify claiming successful expressive swimming.

Reduced motion was enabled in the real settings dialog and stored as `reducedMotion: true`. In 10/11 the broad water pattern and raft pose are much more stable, while tide/contact and minor scene details can still change. This supports a calmer mode; it is not proof that every decorative subsystem stops. Low world detail and sound-off also persisted in storage and returned to a usable scene. At device scale 1, do not infer a resolution-quality difference just from selecting Low. Sound output, all quality levels, long-term settings persistence, wheel axes, facial animation, and upgrade reveals were not independently certified.

The settings and new-game dialogs are legible after transitions settle. The workshop explicitly states resource shortages instead of relying only on disabled coloring. The persistent HUD would benefit from a smaller contextual objective and collapsible bearings, but those UI adjustments should follow the three renderer priorities above.

## Beta iteration 1 — matched comparison

Captured 22:16–22:19 NZDT at `http://127.0.0.1:5180/?qa=1`, with the same viewport, browser, fresh save, High detail, and default Wanderer rig. The same UI sequence and waits were used. These are matched logical states and framing, not frame-locked simulation times. The QA inspector was used only to read state; resources and the wheel were obtained through actual movement, gather, and build controls. Both browsers were closed before the parent rebuilt beta.

| State | Baseline | Beta 1 | Independent finding |
| --- | --- | --- | --- |
| Menu | [01](../../captures/art-review-01-menu.png) | [01](../../captures/art-review-beta-01-menu.png) | Same composition and illustrated promise. Tiny fade/timing differences are not rated as art improvements. |
| New game | [03](../../captures/art-review-03-newgame.png) | [03](../../captures/art-review-beta-03-newgame.png) | Same legible paper dialog and clear primary action. |
| Starter gameplay | [04](../../captures/art-review-04-gameplay-frame-a.png), [05](../../captures/art-review-05-gameplay-frame-b.png) | [04](../../captures/art-review-beta-04-gameplay-frame-a.png), [05](../../captures/art-review-beta-05-gameplay-frame-b.png) | Dot grid removed. Sparse curved streaks and broad teal variation are materially calmer. Giant sand disks are gone; actual shore, dock, and grass read better. Camera and hero scale are unchanged. Foam still resembles soft surface brush marks more than breaking crests. |
| Dive at origin | [07](../../captures/art-review-07-diving-frame-a.png), [08](../../captures/art-review-08-diving-frame-b.png) | [07](../../captures/art-review-beta-07-diving-frame-a.png), [08](../../captures/art-review-beta-08-diving-frame-b.png) | Less patterned visual noise, but pale tint and circular seabed patches still read as a surface overlay. At origin the swimmer is hidden by the raft; this view cannot establish whether its mesh is missing. |
| Reduced motion | [10](../../captures/art-review-10-reduced-frame-a.png), [11](../../captures/art-review-11-reduced-frame-b.png) | [10](../../captures/art-review-beta-10-reduced-frame-a.png), [11](../../captures/art-review-beta-11-reduced-frame-b.png) | Broad water marks and raft pose are stable in beta. Tide forecast/notifications can change because simulation continues. |
| Workshop | [06](../../captures/art-review-06-workshop.png) | [06](../../captures/art-review-beta-06-workshop.png), [14 unlocked rigs](../../captures/art-review-beta-14-rigs-unlocked.png) | New expedition options use the established card treatment and explain speed/air tradeoffs. Three large cards push workshop plans below the first panel view; visually coherent but vertically expensive. |

Beta 1 gameplay frames are 1.715 s apart; dive frames 1.319 s apart; reduced-motion frames 1.679 s apart. [Beta evidence](../../captures/art-review-beta-evidence.json) includes actual position, game time, rig, settings, and resource responses; no page errors were recorded.

**Supplementary motion evidence:** after gathering both nearby wood and scrap and building the waterwheel, [15](../../captures/art-review-beta-15-wheel-frame-a.png)/[16](../../captures/art-review-beta-16-wheel-frame-b.png) record the upgraded boat across 1.074 s. That orientation obscures the large wheel, so these frames do **not** certify its axle behavior. The unlocked state and power generation are confirmed by [state evidence](../../captures/art-review-beta-motion-evidence.json), but a visible wheel view remains necessary for an art-motion sign-off.

In [17](../../captures/art-review-beta-17-swimmer-frame-a.png)/[18](../../captures/art-review-beta-18-swimmer-frame-b.png), the explorer has actually moved from the anchored raft to `x ≈ 8`, while the raft stays near `x = -2`. **The beta swimmer is visibly present.** It is still a small, rigid, tilted toy pose rather than an articulated stroke or expressive action. [19](../../captures/art-review-beta-19-dive-reduced-a.png)/[20](../../captures/art-review-beta-20-dive-reduced-b.png) show a stable swimmer, fish layout, and foam pattern under reduced motion while oxygen continues to decrease. This separates decorative motion from necessary gameplay feedback. See the [supplementary capture script](../../captures/art-review-beta-motion.mjs).

The matched dive sequence's immediate keyboard input after closing the workshop did not move the character; the beta inspector confirms `(0,0)`. The supplementary pass waits for focus/input settling and confirms actual movement. No missing-swimmer conclusion is drawn from those origin frames.

**Largest remaining beta 1 gap:** camera composition. With the dot grid gone, the empty water around a 245 px raft becomes even more obvious. The pending lower camera, larger home, and distinct distance silhouettes directly address it. Water/contact rises from **1/5 original, 1/5 internal** to **2/5 original, 3/5 internal**; this is a useful improvement, not a claim of reference-level wave rendering.

Beta 1 served `index-BXDoqaRD.js`, `scene-zmD0gvLo.js`, and `index-COgQWZtL.css`. Captured identities:

```text
scene-zmD0gvLo.js       33d8863556adf43754d0ca8f6f04b55ee0fa2b58529c8d57bd29d59c550f72b8
beta workshop.glb     d771ff642cebfdcb93526d43b5040d9e25fd5f7229c48905adcb790dc82978b0
baseline workshop.glb 0b1f3ebbc6a551092d6526e8f2173cb4f71474821f9bb8ce3b3939ae2383be65
island.glb            8715786f8500b90514d4fce6e747d1103b26c9bc4fbbdc368190040ba8d131bc
```

## Interim camera preview — not a scored production build

A [single dev capture](../../captures/art-review-dev-preview.png) from port 5178 verifies that the proposed lower camera increases the starter raft to roughly 420 px wide, keeps the complete raft inside 1440 × 900, and exposes the horizon. This is a material composition improvement. It also exposes a new weakness: the distant geometry reads as enormous smooth tapered pillars with flat green caps, several clipped at the top. Reduce their apparent size, give ridge/stack groups broken asymmetry, and fade far groups more strongly before calling the landscape finished. This observation is from mutable dev code and does not replace the stable beta comparison. Portrait framing was not reviewed in this landscape art pass.

## Beta iteration 2 — final comparison and scores

Captured from the rebuilt `http://127.0.0.1:5180/?qa=1` in a **fresh browser context** after the parent's readiness signal. The matched set ran at 22:26 NZDT; a separate real-play pass followed for the wheel and swimmer. Same 1440 × 900 viewport, device scale 1, High detail, default Wanderer rig, unmodified UI, initial position, and no unlocked upgrades in the matched starter views. All new PNGs have the `art-review-beta2-` prefix; baseline and beta 1 images remain intact. The fresh page loaded the new `index-D5oY78eO.js` and `scene-DDvYtD1u.js`, so this is not a cached beta 1 comparison.

| Matched state | Final evidence | What changed / what remains |
| --- | --- | --- |
| Menu and new game | [Menu](../../captures/art-review-beta2-01-menu.png), [new game](../../captures/art-review-beta2-03-newgame.png) | Illustrated menu and paper dialog remain consistent. The gap between illustration and gameplay has narrowed in composition, but the illustrated water and landscape are still substantially richer. |
| Starter gameplay | [A](../../captures/art-review-beta2-04-gameplay-frame-a.png), [B](../../captures/art-review-beta2-05-gameplay-frame-b.png), 1.736 s apart | Full raft fits the view at about 420 px wide, roughly 29% of screen width versus 17% before. Window, log ends, ropes, and shell read more clearly. Horizon is visible around y=155. Smaller, paler distant stacks provide depth, but the centered arch is geometrically uniform and competes with the nearer island. |
| Dive at origin | [A](../../captures/art-review-beta2-07-diving-frame-a.png), [B](../../captures/art-review-beta2-08-diving-frame-b.png), 1.315 s apart | Seabed and locator cues remain usable; the larger raft is still fully on screen. The diver at origin is occluded by the raft, so the supplementary movement view is the appropriate character evidence. Water becomes a pale flat field; it does not create a convincing submerged volume. |
| Reduced motion | [Enabled setting](../../captures/art-review-beta2-09-settings-reduced.png), [A](../../captures/art-review-beta2-10-reduced-frame-a.png), [B](../../captures/art-review-beta2-11-reduced-frame-b.png), 1.684 s apart | Water marks and raft pose stay stable while tide forecast and status feedback advance. Low detail was also selected and captured in [12](../../captures/art-review-beta2-12-settings-low.png)/[13](../../captures/art-review-beta2-13-low-detail.png). |
| Upgraded motion | [Wheel A](../../captures/art-review-beta2-15-wheel-frame-a.png), [wheel B](../../captures/art-review-beta2-16-wheel-frame-b.png) | Wheel was earned through real gathering/building, then viewed from a deliberately turned heading. Paddles/spokes change phase around the hub, with no visible orbit or separation. The wheel, explorer, dog, shell, and window now separate clearly in this angle. This angle is substantially stronger than the default heading, where the shell partly hides the explorer. |
| Swimmer and underwater reduced motion | [Swimmer A](../../captures/art-review-beta2-17-swimmer-frame-a.png), [B](../../captures/art-review-beta2-18-swimmer-frame-b.png), [reduced A](../../captures/art-review-beta2-19-dive-reduced-a.png), [B](../../captures/art-review-beta2-20-dive-reduced-b.png) | Actual movement places the visible swimmer outside the anchored hull. It remains a tilted static toy pose, without an articulated stroke. Reduced mode keeps the fish layout, decorative water, wheel, and character pose stable while oxygen/power feedback continues. |

The original three recommendations were **addressed, with different degrees of completion**: framing strongly; water/contact substantially but without convincing wave volume; distant composition partially, with more distance separation but still weak natural silhouettes. No new broken UI state or missing required model appeared in this art pass. This is not a certification of all domain, resource-balancing, lifecycle, or portrait checks reported by other reviewers.

### Final score changes

Same 0–5 scale and separate standards as the baseline. Arrows show **baseline → beta 2**. Scores refer to the captured runtime, including the supplementary upgraded view where explicitly stated.

| Criterion | Original /5 | Internal /5 | Final evidence-based judgment |
| --- | ---: | ---: | --- |
| Palette | 3 → 3 | 4 → 4 | Warm home against cool ocean is coherent. Muted sky/sea and the chalky shell still lack the reference's richer warm/cool and pearl color variation. |
| Material hierarchy and light | 2 → 3 | 3 → 4 | Close framing exposes bevels, lashings, board seams, window metal, and shell form. Most materials remain evenly lit and matte; the pearl mechanism has limited sheen. |
| Primary silhouette | 2 → 3 | 3 → 4 | Starter cabin, shell, bow, and hull are clear; turned upgraded view distinctly adds wheel and figures. The fully developed sail/greenhouse silhouette is still judged from the asset preview, not falsely credited as runtime-tested here. |
| Overall composition | 1 → 3 | 2 → 3 | A foreground home, middle island, distant groups, and horizon now exist in one image. The central perfect arch and nearby peak align awkwardly; lower-priority sky/cloud shapes clip the upper edge. |
| Hero scale and focal hierarchy | 1 → 3 | 2 → 4 | Raft is roughly 1.7× its former screen width and is now the main warm focal object. Character is identifiable, especially in the turned view. Default heading still hides much of the explorer behind the shell. |
| Sea form | 1 → 2 | 2 → 3 | Broad color variation and quieter streaks read better than dots. The water still resembles a mostly flat shaded plane rather than weighted swells. |
| Foam and water contact | 1 → 2 | 1 → 3 | Regular dots and giant sand plates are resolved. Crest streaks remain broad soft strokes; circular navigation/shore rings remain visibly synthetic. The original's fragmented froth and hull splash are absent. |
| Depth and atmosphere | 1 → 2 | 2 → 3 | Horizon and paler distant forms establish surface depth. Dive mode retains circular seabed patches, a uniform pale tint, and no convincing vertical underwater space. |
| Landscape shape variety | 1 → 2 | 2 → 2 | More distinct grouping and a landmark improve orientation. Smooth tapered pillars with flat caps and a nearly perfect arch still conflict with the nearby asset's broken limestone planes and the internal brief's asymmetry. |
| Character and expression | 1 → 2 | 2 → 3 | Final Explorer mesh is present and usable; child/dog features read at the new scale. Raised-arm idle and fixed tilted dive pose remain far from the original's expressive action. No facial or articulated swim performance is demonstrated. |
| Motion and buoyancy | 2 → 2 | 3 → 3 | Visible wheel motion, raft buoyancy, water movement, and calmer reduced-motion pairs are supported by captures. Character acting, all upgrade reveals, sail behavior, and crane operation are not established by this limited pass. |
| UI restraint and art integration | 3 → 3 | 3 → 3 | Paper/teal styling stays consistent and useful feedback remains legible. Larger raft reduces HUD dominance; six persistent blocks, tall rig cards, and small secondary text remain. |

**Largest remaining gap:** the far landscape's shape language. The arch provides a recognizable destination, but its constant-width curve, symmetric legs, and small regularly scattered marks look assembled. The capped stacks repeat the same taper. A later art pass should make those forms uneven, broken, clustered, and partly vegetated while preserving inexpensive distant meshes. This is more useful than adding more small workshop props.

**Next two visual priorities after that:** add actual shallow/deep water transitions and varied broken contact foam; then give the explorer a clearer default-camera silhouette and a small readable swim/idle action. These are remaining art improvements, not requests to reopen the completed build for speculative changes. The existing craft should be retained.

### Reproduction and final boundaries

- [Matched capture evidence](../../captures/art-review-beta2-evidence.json) records loaded asset URLs, settings, times, state, and no page errors. [Supplementary evidence](../../captures/art-review-beta2-motion-evidence.json) records gathering/building, positions, upgrades, and oxygen. The inspector only read state; no resources or upgrades were injected.
- Run `node captures/art-review-capture.mjs 'http://127.0.0.1:5180/?qa=1' beta2-` for the matched sequence and `node captures/art-review-beta-motion.mjs beta2` for the supplementary sequence. These overwrite only their named review captures when rerun. The main script now deliberately stays at the origin for the matched dive; the earlier ineffective immediate movement attempt was removed.
- Initial baseline and beta 2 are separate deployments. The original reference and latest offline previews were judged independently from the older baseline GLB. No missing-baseline-clone claim is applied to the final artist asset.
- Portrait, performance rates, complete rig balance, all upgrades, visitor behavior, and full accessibility are outside this final art comparison. Paired frames demonstrate visible movement/state differences, not the quality of every animation subsystem.

Final beta 2 identities:

```text
index-D5oY78eO.js  6005fc7baebcae57c7f4c6d40f4d578a5b38367a4b86e593ce860a871f92a21f
scene-DDvYtD1u.js  97b456f1bd868b6eba1bbac0565d5b7962038adfb770ba400469c0ce47ef5c9b
index-COgQWZtL.css 5556edcd6cfe791db6e52f0d7a643de0539e1b029acfa149b95669bd1c8a7280
```

## Authored-landmark final — weighted assessment

Reviewed the newly rebuilt 5180 runtime on 8 October 2026, from 22:46 NZDT, in fresh Playwright contexts at **1440 × 900**, device scale 1. Saved **24 new full-UI captures**, prefixed `art-review-final-`, preserving every earlier set. All three GLBs, including `/assets/landmarks.glb`, returned HTTP 200; the matched run recorded no page errors. JS and landmark hashes were unchanged across the capture pass. No app edits or builds were performed by this reviewer; all capture browsers closed.

### Landscape: the change is visible and worthwhile

Compare [beta 2](../../captures/art-review-beta2-04-gameplay-frame-a.png) with [final A](../../captures/art-review-final-04-gameplay-frame-a.png) and [final B](../../captures/art-review-final-05-gameplay-frame-b.png). The old constant-width arch has become a broken, unequal rock span with an irregular underside, broad ledges, different-sized supports, vegetation, and adjacent spires. The right-hand stack has a much more fractured profile. These shapes now share the nearby island's limestone language. The previous criticism of perfect pillars and a manufactured arch is **resolved for the visible final landmarks**.

The landscape criterion rises from **2/5 to 3.5/5 against the original**, and from **2/5 to 4/5 against the internal stylized brief**. Remaining differences from the original are sparse planting, simplified facets, little material/weathering variation, and fewer overlapping landscape layers. The main arch still aligns behind the middle island's peak; distance haze helps separate them but does not fully resolve that overlap. Only the visible arrangement is scored—this is not a survey of all fourteen placements.

The latest scene also visibly contains large pale elliptical shoals that were absent from the beta 2 starter view. One lies immediately above the roof silhouette; another fills much of the right edge. Across final A/B, the right shoal acquires a conspicuous triangular water cut. These are renderer-created `SHOALS` shelves, not geometry from `landmarks.glb`. Their gameplay purpose is not disputed, but their smooth outline, bright flat color, and hard water intersection are now the largest visual discontinuity. The report does not carry forward the earlier claim that all oversized pale shelf effects are resolved.

### Final evidence

| Subject | Captures | Observation |
| --- | --- | --- |
| Title and simplified introduction | [01 menu](../../captures/art-review-final-01-menu.png), [03 intro](../../captures/art-review-final-03-newgame.png) | Intro now leads with one task—collect driftwood—and leaves secondary actions to the HUD. The shorter message is easier to scan. Menu still promises much richer water and character acting than the runtime. |
| Starter landscape and active water | [04 A](../../captures/art-review-final-04-gameplay-frame-a.png), [05 B](../../captures/art-review-final-05-gameplay-frame-b.png), **1.699 s apart** | Authored arch and stacks are present; primary raft framing is retained. Soft moving crest marks remain economical; pale shoals have visibly abrupt water intersections. |
| Dive and reduced motion | [07 dive A](../../captures/art-review-final-07-diving-frame-a.png), [08 dive B](../../captures/art-review-final-08-diving-frame-b.png); [10 reduced A](../../captures/art-review-final-10-reduced-frame-a.png), [11 reduced B](../../captures/art-review-final-11-reduced-frame-b.png) | Dive pair is 1.319 s apart; reduced pair is 1.682 s apart. Decorative water and raft motion calm down, while tide/state updates remain active. Dive mode still reads as a tint and visible seabed patches rather than underwater volume. |
| Earned wheel and visible swimmer | [15 wheel A](../../captures/art-review-final-15-wheel-frame-a.png), [16 B](../../captures/art-review-final-16-wheel-frame-b.png); [17 swimmer A](../../captures/art-review-final-17-swimmer-frame-a.png), [18 B](../../captures/art-review-final-18-swimmer-frame-b.png) | Real movement, gathering, and building precede these captures. Wheel phase changes around its hub. Explorer leaves the anchored raft and remains visible; pose stays rigid rather than articulating a stroke. |
| Reduced motion while diving | [19 A](../../captures/art-review-final-19-dive-reduced-a.png), [20 B](../../captures/art-review-final-20-dive-reduced-b.png) | Wheel, fish layout, swimmer pose, and broad foam pattern remain stable; oxygen and power keep updating. Tide can still alter shoal exposure. |
| Larger text | [21 setting](../../captures/art-review-final-21-larger-settings.png), [22 intro](../../captures/art-review-final-22-larger-intro.png), [23 gameplay](../../captures/art-review-final-23-larger-gameplay.png), [24 workshop](../../captures/art-review-final-24-larger-workshop.png) | Toggle persists and meaningfully enlarges HUD hints and workshop costs/descriptions. Main controls remain visible at 1440 × 900. Bearings text wraps the final `m` onto a separate line; some settings/intro copy remains small. This is a useful option, not universal text enlargement or a full accessibility sign-off. |

Evidence files: [matched](../../captures/art-review-final-evidence.json), [motion](../../captures/art-review-final-motion-evidence.json), [larger text](../../captures/art-review-final-text-evidence.json). The state inspector was read-only. All actions used actual UI/keyboard controls; no invented resources, unlocked upgrades, hidden HUD, or mocked scene.

### Weighted rubric and aggregate

Scores run from **0 absent, 1 weak, 2 partial, 3 competent, 4 strong, 5 exceptional**; half-points distinguish meaningful intermediate quality. Weights are explicit editorial choices for this task, not objective measurements. Reference fidelity judges the original image's visual character; animation/usability judges the internal calm-motion promise and actual readability. A still illustration cannot supply an animation ground truth. No unobserved sail, crane, beacon, facial rig, or full endgame performance is awarded credit.

**Reference fidelity — weighted mean 2.975, reported as 3.0/5.**

| Criterion | Weight | Score /5 | Reason |
| --- | ---: | ---: | --- |
| Palette and light | 15% | 3.0 | Warm timber against cool sea is right; light remains broad and even rather than the original's dramatic warm/cool modeling. |
| Materials and construction craft | 15% | 3.5 | Bevels, rope, plank seams, wheel construction, shell coil, and rock ledges are authored and visible. Pearl sheen, wetness, and subtle material variation remain limited. |
| Home silhouette and hero scale | 20% | 3.5 | The large, complete foreground home reads clearly. Turned view separates wheel, child, dog, and shell; default heading partly hides the child. Starter stage intentionally lacks locked sail/greenhouse. |
| Composition and depth | 15% | 3.0 | Foreground home, middle island, horizon, and hazed landforms now establish distance. Pale shoals interrupt the scene; arch/peak alignment and uniform underwater tint limit depth. |
| Landscape shape and identity | 15% | 3.5 | Broken authored karst replaces geometric stand-ins. More lushness, terrain overlap, and surface variation would be needed for closer fidelity. |
| Sea, foam, and shore contact | 15% | 1.5 | Quieter than baseline dots, but largely planar water, soft painted-looking streaks, synthetic rings, and sharply sliced pale shoals fall well short of the original's wave volume and froth. |
| Character expression | 5% | 2.0 | Friendly recognizable figures; no equivalent of the reference's exuberant expression and active posture at the default play angle. |
| **Total** | **100%** | **3.0** | **Coherent adaptation; substantial fidelity gaps remain.** |

**Animation/usability — weighted mean 3.50, reported as 3.5/5.**

| Criterion | Weight | Score /5 | Reason |
| --- | ---: | ---: | --- |
| Buoyancy and ambient movement | 20% | 3.5 | Slow raft motion and water changes are readable and restrained. Contact does not convincingly convey water force. |
| Observed mechanical motion | 20% | 4.0 | Wheel moves around a stable hub and remains connected; rotating mechanism reads at the closer scale. Scope is the observed wheel/mechanism, not all upgrades. |
| Character action readability | 20% | 2.0 | Swimmer exists, moves independently, and has a locator. Fixed tilted pose lacks stroke, anticipation, or acting. |
| Reduced-motion behavior | 25% | 4.0 | Paired active-play captures keep decorative poses/patterns stable while necessary oxygen, tide, and power updates continue. This is useful and visibly exercised. |
| Feedback and interface readability | 15% | 4.0 | Simplified intro, resource shortages, build feedback, oxygen, and larger text support the tested flow. Small residual copy and unit wrapping prevent an exceptional score. |
| **Total** | **100%** | **3.5** | **Usable observed motion and feedback, with weak character animation.** |

**Combined art score: 3.1/5**, calculated as **70% reference fidelity + 30% animation/usability**: `0.70 × 2.975 + 0.30 × 3.50 = 3.1325`. Fidelity receives the larger weight because matching the supplied art reference is the central brief. Scores are rounded to one decimal for reporting; the calculation is shown so the result can be reweighted. The aggregate is not a performance, accessibility, gameplay-completeness, or release certification.

**Release threshold clarification:** unrounded reference fidelity is **2.975/5 (2.98 to two decimals), narrowly below 3**. Do not treat its one-decimal display as clearing a strict ≥3 gate. A focused shoal-presentation fix—muted sand, a coherent wet edge, and no conspicuous triangular wave cuts—could justify lifting the water/contact criterion from 1.5 to 2.0 **after visual verification**. With other scores unchanged, reference fidelity would become **3.05/5**, clearing a coherent-MVP threshold without changing the weights or inflating the other categories. Animation/usability already clears 3 at 3.50.

### Residual nonblocking limits

These did not prevent the exercised menu, gathering, building, diving, or settings flows. They remain visible art limitations rather than a claim that the image is finished:

1. **Shoal/contact presentation is the largest remaining polish defect.** Reduce the flat white prominence, break up the uniform oval outline, and blend wet/shallow edges when revisiting it. Preserve the required gameplay shoal footprint. This belongs to renderer integration, not a rework of the new landmark models.
2. **Water still lacks convincing volume.** Deep/shallow transitions, foam breakup, and underwater depth matter more now than further small workshop detail.
3. **Character animation is functional but static in pose.** A small articulated stroke and a better default-camera child silhouette would improve both warmth and state readability.
4. **Layout and finish:** separate the arch from the middle peak, soften clipped cloud masses, and keep distance units together under Larger text. Some small copy remains unchanged by that option.

Final observed build identities, unchanged before/after capture:

```text
index-C9tDdj1_.js  901f50507ced3d6e4da5ca52aa604ef823d7892f6fae7ded615540610ab0b7d7
scene-G34XFJZD.js  9fc1a0259a85c91708ab8832b207f0353465a8a4fe1a802176845f1e35112aeb
landmarks.glb     cf211aa82042686a9966e84029c7bf045f5342f247a6be4a175a406015cb5d67
```


## Focused shoal recheck

Fresh production load of `http://127.0.0.1:5180/?qa=1`, 1440 × 900, Chrome 153, normal motion, fresh voyage, fixed player position `(0,0)`. Captured a naturally advancing tide; QA state was read only. No UI, domain, gameplay, renderer, or build changes were made by this reviewer. Six matched screenshots cover low tide, the flooding transition, and high tide, with two actual animation frames per phase.

| Phase | Actual game time / normalized tide | Evidence | Judgment |
| --- | --- | --- | --- |
| Low | 7.850 s / 0.0187; 9.533 s / 0.0274 | [Frame A](../../captures/art-review-shoal-low-a.png), [Frame B](../../captures/art-review-shoal-low-b.png) | Muted sand and dark wet margins integrate better. Previous conspicuous triangular cuts are absent in these two low-tide frames. Broad oval forms remain apparent. |
| Flooding | 34.149 s / 0.3151; 38.132 s / 0.3813 | [Frame A](../../captures/art-review-shoal-flooding-a.png), [Frame B](../../captures/art-review-shoal-flooding-b.png) | **Not passed:** the rear shoal above the workshop roof has angular notches and a sharp water band splitting the exposed sand. Frame B also shows an isolated pale sliver at the right edge. The transition still reads as intersecting geometry. |
| High | 88.130 s / 0.9989; 90.130 s / 1.0000 | [Frame A](../../captures/art-review-shoal-high-a.png), [Frame B](../../captures/art-review-shoal-high-b.png) | Exposed sand is submerged and no comparable slicing artifact appears. Underwater shoal outlines remain broad, flat tinted shapes. High tide alone cannot validate the flooding transition. |

**Verdict:** the polish improves color and low-tide contact, but “triangles gone” is not supported across the cycle. Hold water/contact at **1.5/5**, reference fidelity at **2.975 (2.98)/5**, animation/usability at **3.50/5**, and the 70:30 aggregate at **3.1325 (3.13)/5**. Animation and other criteria were not rescored in this narrowly scoped pass. This preserves the already stated acceptance condition rather than rounding the result into a pass.

**Small remaining focused improvement:** make water and sloped shelf meet coherently throughout the flooding band, particularly normalized tide **0.31–0.39**. Check attenuation coverage across the entire shoreline transition and surrounding water triangles, not just low-tide interior vertices; that is a debugging direction, not a confirmed diagnosis. Recheck the same stationary camera at approximately 34 and 38 seconds. Removing these conspicuous cuts while retaining the improved muted sand/wet edge would support the previously proposed water/contact **2.0**, reference **3.05**, combined **3.19**. No additional art scope is necessary to test that specific threshold.

**Console and loading:** zero page exceptions and zero failed requests in the main capture. Main JS, scene JS, CSS, workshop.glb, island.glb, and landmarks.glb returned HTTP 200. A separate fresh-load console probe identifies the one console error as `http://127.0.0.1:5180/favicon.ico` returning 404, not a scene or GLB failure. This is a nonblocking browser-icon defect. [Capture state and resource evidence](../../captures/art-review-shoal-evidence.json); [console probe](../../captures/art-review-shoal-console-check.json); [reproducible capture script](../../captures/art-review-shoal-recheck.mjs).

Observed runtime resources: `index-CO9TQ3k-.js`, `scene-C7fCyTob.js`. All capture browsers are closed. Remaining broader nonblocking art limits are unchanged: simplified underwater volume, limited articulated character acting, and the previously documented layout details. The shoal transition is nonblocking for play but still material to the requested fidelity gate.


## Focused beta3 delta — 5181

Reviewed only the requested shoal transition and new expedition presentation at **1440 × 900**, actual fresh-voyage UI, normal motion. Runtime loaded `index-koKdx_hP.js`, `scene-j19sICc6.js`; JS, CSS, and all three GLBs returned 200. The capture recorded no console warnings/errors, page exceptions, or failed requests. No app changes or builds were made.

**Shoal verdict:** at **34.132 s**, the rear shoal is a continuous exposed shelf without the previous notch; at **38.115 s**, it is coherently submerged without the previous diagonal exposed-sand split. [34-second frame](../../captures/art-review-beta3-flooding-a.png), [38-second frame](../../captures/art-review-beta3-flooding-b.png). A narrow pale sliver still appears at the far-right viewport edge at 38 seconds. Its cause is not established by these images. Therefore the conspicuous central defect passes this focused recheck, while an absolute “all triangles gone everywhere” claim would exceed the evidence. No full-cycle or alternate-camera regression pass was requested or performed.

The muted wet edge plus removal of the prominent central cuts now support **water/contact 2.0/5**, still a low score acknowledging broad oval shelves and shallow-looking water. With the established rubric unchanged: `2.975 + 0.15 × 0.5 = 3.05` reference fidelity; animation/usability remains **3.50** from prior evidence; `0.70 × 3.05 + 0.30 × 3.50 = 3.185`, reported as **3.19/5 combined**. This is a narrow coherent-MVP pass, not close reference reproduction.

**New UI:** built the waterwheel through actual gathering/build controls, opened the journal accordion, and started Current run. The [expanded accordion](../../captures/art-review-beta3-expeditions-open.png) keeps existing cream/teal styling and clear route titles, rewards, and orange actions. It contains optional detail without adding permanent HUD panels. Supporting descriptions remain small. The [active-route HUD](../../captures/art-review-beta3-markers-markers-b.png) clearly displays 0/4 progress, bearing, target distance, route dots, and Follow expedition. Navigation is visually more explicit; small overlapping minimap dots and shoal shapes are the main readability limit.

**Marker/pennant evidence limit:** the paired active-play [frame A](../../captures/art-review-beta3-markers-markers-a.png) and [frame B](../../captures/art-review-beta3-markers-markers-b.png) advance from 2.816 to 4.400 seconds. World flags are not sufficiently prominent in this home-camera framing to certify their close-range silhouette or motion. No expedition completion was fabricated or earned in this short pass, so earned workshop pennants are **not visually verified**. Their existence in source is not substituted for runtime evidence. The earlier `art-review-beta3-markers-a/b.png` pair accidentally captures a pause transition and is excluded from animation judgments; the `beta3-markers-markers-*` pair is the valid active-play evidence.

[Primary capture evidence](../../captures/art-review-beta3-evidence.json), [supplementary marker evidence](../../captures/art-review-beta3-markers-evidence.json). Existing landscape, characters, and other art were not rescored. All capture browsers closed; no server stopped.


## Final articulated Explorer — focused runtime verification

Fresh actual voyage on **5181**, **1440 × 900**, normal motion followed by the real Reduced motion settings control. Loaded **scene-B-n_BpBC.js** and workshop.glb successfully (HTTP 200); no page exceptions were reported. Local public workshop SHA-256 is `20b2323fc211c83c4a7cd053238fe2f193b7fec9e1c62b39f170cd203564e561`, matching the supplied asset prefix. This local hash is distinct from a network-response hash check.

- **Swimming:** [frame A](../../captures/art-review-final-limbs-17-swimmer-frame-a.png) at 5.517 seconds and [frame B](../../captures/art-review-final-limbs-18-swimmer-frame-b.png) at 6.633 seconds show a pitched swimming body, changing hand/arm and foot silhouettes, and limbs visibly joined to the torso. No detached limb is visible in these sampled frames. The swimmer is roughly 60 pixels wide: readable as an articulated swimming figure, but too small for strong expressive acting. This verifies visible pose change, not every joint angle or every phase of the cycle.
- **Reduced motion:** [frame A](../../captures/art-review-final-limbs-19-dive-reduced-a.png) at 7.383 seconds and [frame B](../../captures/art-review-final-limbs-20-dive-reduced-b.png) at 8.483 seconds hold the swimmer pose while oxygen falls from 12.45 to 11.35 seconds. The setting works in active gameplay; it is not a paused-scene comparison.
- **Deck greeting:** [frame A](../../captures/art-review-final-limbs-deck-a.png), [frame B](../../captures/art-review-final-limbs-deck-b.png). The large foreground mechanism still obscures most of the character from this starter camera. These frames do not establish a clearly readable greeting, so no additional expression/fidelity credit is awarded.
- **Earned pennant:** inspected the tester's [first expedition claimed](../../captures/expert-2026-10-08T10-17-15-207Z/beta3-surface-expedition-claimed.png), which shows **1 completed** in the journal, and [later dive preparation](../../captures/expert-2026-10-08T10-17-15-207Z/beta3-diver-before-one-breath.png). The first scene is blurred behind the journal; the later view has an edge-on pole/flag area. Neither supports a confident pennant-shape assessment. Actual completion is evidenced by the tester's UI, but pennant visual verification remains limited. No render fixture or fabricated earned-play state was used. QA's separate 1/3/5 count checks are outside this review.

**Scoring delta only:** character motion **2.0 → 3.0/5**, weighted at 20%, raises animation/usability **3.50 → 3.70/5**. Other animation criteria remain unchanged. Reference character expression stays **2.0**, and reference fidelity stays **3.05**, because articulated movement alone does not establish stronger facial expression or deck silhouette. Combined: `0.70 × 3.05 + 0.30 × 3.70 = 3.245`, displayed as **3.25/5**. Earlier marker/UI findings carry forward without retesting or score inflation.

[Frame states](../../captures/art-review-final-limbs-motion-evidence.json), [capture script](../../captures/art-review-final-limbs.mjs). This closes the focused final art pass. Browser closed; no app edits, builds, or wider art iteration performed.
