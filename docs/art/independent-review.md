# Independent character review

Candidate13 is final at the user's direction. **88.5/100 final: the unchanged84.5/95 visual/motion assessment plus4/5 resource points.95 is unmet. Formal hardware acceptance is FAIL.** Further art iterations are closed. This is agent judgment of actual outputs, not human production approval.

The fixed [rubric](character-evidence-rubric.md), [original splash](../../public/assets/menu-art.png) and [user reference](../../assets/reference/ocean-workshop.png) remain the anchors. All five still ratings stay 4.5: **67.5/75**. Temporal ratings are fresh; source counts/tests earn no visual points.

| Criterion | Weight | Rating /5 | Points | Observed result and limit |
| --- | ---: | ---: | ---: | --- |
| Child silhouette and proportion | 20 | 4.5 | 18 | Compact child, large head, connected directional chest/shoulder/point and supporting/relaxed knee distinction survive deck and both facings. Whole-body opposition remains comparatively narrow. |
| Face and expression | 20 | 4.5 | 18 | Three-quarter deck intent and joyful water face read clearly. No obvious sampled iris escape. Rounded eye/separate cheek masses still dominate connected brow/cheek/jaw shaping. |
| Hair and goggles | 15 | 4.5 | 13.5 | Paired bronze/blue-green crown goggles, connected chestnut mass and quiet tapered exits preserve identity. Hair remains chiefly a smooth rounded cap rather than broad flowing light/shadow planes. |
| Clothing and material craft | 15 | 4.5 | 13.5 | Cream chest, shaded gathered flank, tuck/cuffs and olive/leather/metal/coral remain coherent. No09 triangle bands or obvious sampled shorts seam defect. Skin/crown remain rounded/even. |
| Animation and pose appeal | 10 | 4 | 8 | Planted-looking deck point, restrained rest/tread, alternating asymmetric limbs, directional tilt, reach and return are deliberate/readable. Swim repeats a limited stroke vocabulary while expression changes little; convincing appeal, not exceptional timing. |
| Cross-scene continuity | 10 | 4.5 | 9 | Same child, face, goggles and costume survive reversal, descent/ascent and work. Scarf retains breadth in both headings but compresses behind chest/head during turns. Surface transition retains identity; sampling cannot exclude brief defects. |
| Composition at normal scale | 5 | 4.5 | 4.5 | Open aft body/feet and water-backed pointing hand read wide/square; waterline face clear of HUD. Timber approaches crown/shoulder and right-facing crown meets reef detail. |
| Resource discipline | 5 | 4 | 4 | Actual batching, counts, Low/reduced presentation, once-only release and strict plateaus support convincing resource discipline. Formal size/count/backing/frame gates pass; the integrated fresh-home-entry heap regression and six inconclusive gates prevent technical acceptance or exceptional integrated resource claims. |

These explain the final result, not requests for another iteration. The previously reported84.5/95 remains intact; its89.5 maximum is now resolved to88.5/100. Even perfect resources could not reach95.

## Evidence and method

[Manifest](evidence/manifest.json) binds original paths, source/build/control identities, hashes, dimensions, actual state/inputs and sampled timestamps. Four **unaltered1440×900 gameplay originals**: [baseline deck](evidence/baseline-deck.png), [final deck](evidence/final-deck.png), [baseline underwater](evidence/baseline-underwater.png), [final underwater](evidence/final-underwater.png). Baseline deck honestly records cabin occlusion. Both underwater outputs visibly stand upright; depth/air/timing differ. Cameras/placement/host integration and harness identities changed. This is qualitative before/after evidence, not pixel matching or an isolated art-only comparison. Final originals retain the QA fiducial; no annotations/image alterations added.

All 48 High and 12 Low stills were surveyed as native-pixel character regions after full native context from the ten-view13 diagnostic and representative final frames. Not every final PNG was separately viewed full-frame. Low root/published wide/square deck, deep arrival and right swim retain face, goggles and costume; Low deep is transient horizontal arrival, not settled rest.

**CPU-decoded chronological sample assessment:**36 anchored three-second clips, nine samples each (**324 samples, not 2700 inspected frames**), actual clip PTS 0,400,800,1200,1600,2000,2400,2800,2960ms. FFprobePTS and original QA clipSHA were checked. All four wide/square ordinary/reduced cases cover deck, surface, deep, descent, both swim facings, continuous reversal, ascent and reach. Original recording offsets and retained phase anchors are in the manifest. Fixed diagnostic crops preserve native pixels; some boundaries cut a foot/tail. Initial oversized sheets were automatically reduced by the tool; subsequent sheets were bounded. No enlargement, per-frame re-centering, speed/clock/pose override was introduced.

This is agent frame-sequence judgment, **not continuous human playback or every-frame inspection**.400 ms gaps cannot exclude short pops/intersections or all blinks. Square ordinary right swim shows a closed-eye blink at 1200 ms. Ordinary rest-to-swim/deep-to-rest and alternating strokes read clearly. Reversal retains expression/goggles and swaps the trailing scarf side. Reduced motion holds a quieter articulated pose while movement/heading/work function. Ascent samples move from submerged travel to head above the waterline; reach brackets actual E input and recovery to upright rest. Three exact wide ordinary clips retained: [reversal](evidence/final-swim-reversal.webm), [ascent](evidence/final-ascent.webm), [reach](evidence/final-reach.webm). Final-only temporal evidence, not matched baseline clips.

Final character 4/4, gameplay 6/6 and Low 4/4 reports complete/unchanged/zeroerrors. Owned Chrome closure 03:21:51.701Z,03:27:40.887Z,03:28:53.312Z on 2026-10-10; character decode finished 03:22:26.095Z. Reviewer launched no browser/GPU, changed no source/build/rubric and closed all decoding/views before handback. Fixtures are staged; character QA does not certify earned progression. Baseline02-wide repairs only Baseline01's failed wide case; three other passing01 cases remain scoped history. AnchorBaseline03 validates one reach anchor only.

[Construction proof](character-cpu-proof.json):22 meshes/geometries,37 material draw groups,8 materials,15340 triangles,441924 attached bytes;216 intermediate geometries disposed;22 retained geometries/8 materials released once. Gibbs's [independent technical audit](../reviews/current-improvement/technical-review.md#settled-formal-hardware-comparison--independently-reproduced-fail) reproduces these counts, batching/ownership evidence and the settled formal comparison. Test counts earn no visual points.

## Final resource disposition

The retained [formal comparison](../../benchmarks/accepted/formal-hardware-base79da-final-01/comparison.json) covers five alternating repetitions per side, completed `2026-10-10T05:13:42.268Z`, clean baseline79da versus candidate `6acc82a545a59d643b7649957bc39bf9cb02bb63`. Final root build SHA256 `b3a27de3c4570a35df65e4b30df94d0ca12855a0710ca3ea68f87a3a8e971e8b` matches the reviewed13 build; formal source inventory `d5c0192adc04f9d034d300f7997709c5b4bb99c9c953ba0e2090b1c0276a2acf` is the later clean integration identity, not the earlier capture source inventory. Gibbs independently validates all ten raw runs, unchanged guards, recorded closures and every comparison gate. Comparison SHA256 `c2abf9d138375dd7bbc03fe4953575dc9a6b9fe53e5e582a6ee1c420d62d91bc`; technical-audit snapshot read for this disposition SHA256 `6f587b27ec6cb15937d730a83a8ef0ae8f6df8f1f9f10f177a95a339b155f72b`.

| Relevant measured evidence | Baseline → final | Disposition |
| --- | --- | --- |
| Root JS raw /level9 gzip |774327→784278 B /215814→219674 B|Pass unchanged size limits; gzip ceiling220130.28 B|
| Total build /assets |71235044→14543442 B /70417148→13715578 B|Pass; CSS32763→32780 B, gzip8619→8611 B also pass|
| Home dive observed geometries |296→319|Pass unchanged maximum allowance32; these whole-scene counts differ from character-only22|
| Home inside CPU geometry backing |90529700→27832880 B|Pass; deduplicated ArrayBuffer storage, not physical VRAM|
| CPU ownership /plateaus |Candidate297922 observed;0 remaining;0 double disposed|Strict count/backing plateaus and idempotence validate|
| Final post-GC heap |12648768→13087232 B|Pass; does not waive transient peak gate|
| Candidate timed frame maxima |Median16.7ms /p9518.5ms|Pass20/33.4ms absolute limits; renderer CPU gates also pass|
| Fresh home-entry peak heap |42574900→69358920 B|**FAIL:**+26784020 B/+62.91%; stable5/5 paired regression|

**Resource rating4/5** rests on actual counts, batching, intact Low/reduced presentation, ownership and finite-budget evidence, with the integrated memory limitation explicit. Lower backing, successful disposal or passing frames do not compensate for the failed heap gate. The audit finds no allocation-stack or isolated-feature evidence attributing that peak to the character; no such cause is claimed. The aggregate remains **319 pass /1 fail /6 inconclusive**, not a resource or hardware acceptance pass. Hosted software CI is a separate disposition and cannot override hardware failure. Under the unchanged rubric, both88.5/100 and failed technical gates exclude95 acceptance. The user ends the cycle here; no further art, capture, decode, optimization or hardware cycle is requested.

The canonical manifest retains its original84.5/95 assessment with resources pending as capture-time provenance. This review and the final disposition appended to the frozen rubric are the current scoring authority; retained original identities, source proofs and historical ratings are unchanged. This closing review used existing text/records only: no new browser, image view, decode, build or tests.

## Bounded historical outcomes

Ratings below retain their original scope and numbers; none transfer to13. S/F/H/M/C are silhouette20, face20, hair15, material15 and composition5. A/X/R are animation10, continuity10 and resources5. U=unassessed; P=pending. Superseded guidance is retired; original source history remains in baseline Git. QA completion is not reviewer coverage or human asset approval.

| Candidate | S/F/H/M/C | A/X/R | Retained result and limit |
| --- | --- | --- | --- |
| 01 | Not retained per row | U/U/P | 52.5/75 still-only; maximum77.5. Earlier bounded result, no temporal acceptance. |
| 02 | Not retained per row | U/U/P | 51/75 still-only; maximum76. Cabin-occluded composition; later placement not transferred. |
| 04 | 3.5/4/3.5/3.5/4 | 3.5/3.5/P | 69/95 assessed; maximum74. Scarf loses breadth during sustained swim; resources unscored. |
| 05 | 4/4/4/3.5/4 | U/U/P | 58.5/75 still-only; maximum83.5. Broad materials led the gap; no completed temporal score. |
| 06 | 4/4.5/4/4/4.5 | U/U/P | 62.5/75 still-only; maximum87.5. Settled rest confirmed upright form; initial arrival transient. |
| 07 | 4/4.5/3.5/4/4.5 | U/U/P | 61/75 still-only; maximum86. Hair obscured crown pair; softer tint retained after comparison. |
| 08 | 4.5/4.5/4.5/4/4.5 | U/U/P | 66/75 still-only; maximum91. Paired goggles/point restored; material treatment remained uniform. |
| 09 | 4.5/4.5/4.5/3.5/4.5 | U/U/P | 64.5/75 still-only; maximum89.5. Flat Canvas triangle bands rejected; material3.5. |
| 10 | 4.5/4.5/4.5/4.5/4.5 | U/U/P | 67.5/75 still-only; maximum92.5. Quiet broad cloth restored; stance/gaze connection limited. |
| 11 | 4.5/4.5/4.5/4.5/4.5 | U/U/P | 67.5/75 still-only; maximum92.5. Connected crown/turned face improved within4.5. |
| 12 | 4.5/4.5/4.5/4.5/4.5 | U/U/P | 67.5/75 still-only; maximum92.5. Relaxed knee and gaze improved; no obvious sampled seam/iris defect. |

Candidate04 covered40 native stills and32 three-second clips:2,400 chronological CPU-decoded frames at25fps, not human continuous playback. Its ordinary ascent crossed the surface; reduced ascent ended near/below the line. Separate facing starts did not establish uninterrupted reversal. Candidate05 covered48 native stills, but partial sequence inspection did not produce completed temporal ratings. Candidate06 used six diagnostic stills plus two settled-rest images. Candidate07 assessed ten original plus ten tint-variant images; warmer skin/cream with distinct cool shadows supported retaining tint without a score increase or animated-crossing acceptance. Candidates08–12 each used ten diagnostic stills. Counts and finite/disposal CPU claims stay in the [construction proof](character-cpu-proof.json), with their own source scope; they are not integrated performance acceptance.

Exact historical report/source/build/art hashes are compact provenance records in `evidence/manifest.json#historicalInputs`, not promises to retain every superseded raw trial.

## Retention and cleanup

Retain original splash/user references, four canonical PNGs, three representative clips, frozen rubric, compact review and current source-bound handoff/construction proof. The owner completed [full QA capture retirement](../governance/qa-capture-retirement-proposal.json) at `2026-10-10T03:51:32.467Z`: **875 files /365886000 bytes /114 empty directories /0 skips**, exact ledger SHA256 `e015525eed3bd4145d6c878089cb2116818f386d255af4037ece19be10621079`. This includes the seven copied originals; parent verified all seven canonical hashes before retirement. The redundant seven-file preparation proposal was removed. Original source-path strings in the evidence manifest remain historical identities, not live-file promises. No canonical copy, unlisted new file, benchmark, other capture or current dist was within that removal scope. Out-of-scope performance evidence remains with its owner.

Reviewer temporary sheets/scripts/input scratch were SHA/type/size rechecked immediately before unlink; exact count/bytes/skips/ledger digest/appliedUTC reside in `evidence/manifest.json#temporaryCleanup`. Reviewer temporary cleanup affected only reviewer scratch; the separate owner ledger above records raw QA retirement. Prior cleanup 438 files/367213985 bytes/0 skips has no retained exact historical digest/timestamp; none invented.
