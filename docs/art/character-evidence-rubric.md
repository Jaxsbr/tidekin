# Character evidence rubric — frozen before implementation

Frozen 10 October 2026 against baseline `79da54bdbd029090d4ed9d6fd3dd2caea1a4847c`. Scope: the editable shared character and its presentation animation. The user describes current gameplay art as approximately 55/100 and asks for progress toward 95/100; neither number is a measured character score. This document sets the assessment before changes. It does not certify acceptance.

## References and assessment

Primary references inspected directly: `public/assets/menu-art.png` and `assets/reference/ocean-workshop.png`. Preserve the liked menu illustration. Both depict an adventurous child whose readable face, broad head, swept chestnut hair, crown-mounted brass goggles, cream rolled sleeves, olive shorts, useful leather kit, and trailing coral scarf establish identity. The reference uses broad warm light planes and quieter cool shadow planes. Tiny accessories support those masses; they do not carry them.

Baseline source assessment, pending current rendered evidence: almost every anatomical and garment form is an ellipsoid; the repeated crown ellipsoids do not form directional locks; eye-mounted circular goggles obscure eyebrows; the closed mouth lacks a clear joyful expression; the shirt and cuffs read as inflated layers. A rigid hanging scarf has little directional silhouette. Existing shoulder/elbow and hip/knee articulation is valuable and must remain. Source observations are hypotheses, not findings about the final image.

## Fixed scoring procedure

The independent reviewer assigns each row a 0–5 evidence rating. Weighted points = weight × rating / 5. Anchors: **0** absent/broken; **1** placeholder; **2** readable but generic/awkward; **3** coherent crafted stylization with visible limitations; **4** convincing reference relationship in ordinary play; **5** exceptional execution supported by ordinary-scale still and motion evidence. Half-point ratings are allowed. No points for implementation volume or unseen detail. A close-up may diagnose craft but cannot establish ordinary-scale legibility. Do not change weights after seeing the result.

| Criterion | Weight | Evidence needed for 4 or above | Reject / reduce score for |
| --- | ---: | --- | --- |
| Child silhouette and proportion | 20 | Large head, compact torso, legible limbs, playful asymmetric silhouette in deck, surface and swim views; identity survives a native-size gameplay crop | Adult proportions, balloon torso, sausage joints, tiny limbs, hair swallowed by torso |
| Face and expression | 20 | Clear large eyes, brows, cheek/jaw planes, nose and joyful mouth; face remains friendly from actual camera angles during turns and strokes | Goggles erase brows/eyes, blank stare, pasted circles, eye/jaw intersections, smile vanishes at play scale |
| Hair and goggles | 15 | Coherent swept crown and tapered locks, bronze rim silhouette and integrated leather strap; reference-style crown placement on deck with readable continuity in water | A row of balls, crown clutter, disconnected rims, black helmet, opaque lenses covering expression |
| Clothing and material craft | 15 | Tailored cream shirt and rolled cuffs, olive shorts, boots/kit, warm skin, distinct matte cloth/leather/metal; broad painterly color variation under actual lights | All surfaces share plastic response, inflated collars, noisy tiny decoration, bleached cream/skin |
| Animation and pose appeal | 10 | Deliberate rest pose, believable shoulder/elbow and hip/knee relationships, restrained breathing/blink, directional stroke and reach; scarf trails without distracting snapping | Metronomic identical limbs, contorted elbows, permanent crouch, popping transitions, spinning root |
| Cross-scene continuity | 10 | Same child recognized on raft, at waterline and submerged; actual surface crossing, facing reversal and working pose preserve face, hair, costume and scale | Different-looking models, anatomy clipped by waterline, goggles/cloth detach, pose masks lose eyes |
| Composition at normal scale | 5 | Character separates from timber, cream canopy and blue reef at ordinary wide and narrow viewport sizes; accessories remain subordinate | Only hero close-up looks good, clutter obscures head, contrast depends on enlarged inspection |
| Resource discipline | 5 | Measured geometry/draw/material counts; rigid batching preserves pivots and animated subgroups; construction/disposal do not leak; low-quality and reduced-motion presentation remain intact | Repeated unbatched detail objects, abandoned buffers, incompatible materials, new animation allocations per frame |

Total: 100. A claimed 95 requires actual reviewer evidence, no row below 4, and all technical gates. A lower measured result should be reported plainly with the remaining visible gaps. Human approval is separate and cannot be inferred from reviewer scores.

## Required comparison evidence after baseline release

1. Parent captures matched before/after actual gameplay at the same viewport, camera, site/state, time/phase, lights and quality. Include deck, resting surface, horizontal swim left/right, diagonal descent/ascent, and working reach. Record source/build identity and whether state was earned or staged.
2. Review native-size full frames first, then identically cropped character regions. No enlargement or alternate hero camera in scored evidence. Include a narrow viewport; do not change character scale just for a capture.
3. Observe ordinary-speed motion through rest → swim → work → rest, direction reversal, and surface crossing. Record reduced-motion behavior separately. Static images cannot pass animation or crossing criteria.
4. Technical checks: same `createCharacterArt(THREE)` export and `{root, body, head, arms, legs, animate}` return fields; local +Y crown/+Z face and waist origin; existing shoulder/elbow/hand/hip/knee nodes remain usable; animate changes presentation transforms only. Validate finite transforms and sampled bounds, unique attached geometry/material resources, and current parent rigid batching.
5. Read the independent reviewer findings before revising. Keep this rubric fixed and append evidence/results elsewhere. Do not declare 95 from source review, attractive close-ups, or successful build alone.

## Integrated constraints

The shared character retains the articulated presentation API. Deck rendering uses the optional `deck: true` input with restrained breathing/blink/scarf and planted foot targets; water animation uses ordinary movement/reach inputs. Rigid batching stays within actual articulation parents, and every intermediate/final resource has an owner. The coordinator owns camera, lights, tint and parent placement. Source/build freezes and browser serialization still apply to each released capture; the original pre-baseline implementation hold has ended.

Current implementation and CPU evidence belong in [character-handoff.md](character-handoff.md) and [character-cpu-proof.json](character-cpu-proof.json). The independent review records accepted and rejected source-bound observations. Earlier implementation proposals are historical design context, not additional current requirements. The numerical rubric above remains unchanged.

## Final disposition — user-ended Candidate13 cycle

The [independent final review](independent-review.md#final-resource-disposition) closes the sole remaining resource row at4/5 using settled formal size/count/lifetime records and Gibbs's independent technical audit. The existing84.5/95 visual/motion assessment stays unchanged: **88.5/100 final;95 unmet**. Historical capture-time pending scores remain provenance, not the current result. No weight or anchor changed, and no technical/test outcome added visual points.

Formal hardware acceptance is **FAIL**: fresh home-entry heap42574900→69358920 B, with5/5 paired regression;319 gates pass,1 fails and6 are inconclusive. Passing resource counts, disposal, backing storage, frame and size gates do not waive that heap gate or establish overall acceptance. The character's causal contribution to the peak is unproven. The unchanged requirement for all technical gates therefore also prevents95 acceptance. The user retained Candidate13 and ended further art iterations; this is a closed assessment, not a new improvement plan or human production approval.
