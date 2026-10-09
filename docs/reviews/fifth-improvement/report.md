# Fifth improvement — 0.6.0-beta.1

All fourteen feedback areas are implemented and the verification pass is complete. The updated local preview is running at http://localhost:5181.

## Result

The underwater panorama is replaced by a coherent modeled world with four genuinely separated depth layers. Seeded terrain and targets persist across reloads; coral gardens, kelp, arches and a wreck give sites different identities. Seven visual capture iterations refined silhouettes, connected terrain, foreground framing and the surface crossing. Home Reef now introduces a coral shoulder halfway down. Fish anchor around habitats: wary schools flee and watch, while calm fish briefly follow and return.

Single finds sit 10–15 metres down at the original swim speed. Air continues after collection, and boarding requires the surface. The separate air ring shows seconds and a low-air state; objective pictures carry checkmarks. Location/day/tide, drag guidance and the Space prompt disappear underwater. A rippled waterline, submerged tint and distant horizon soften the crossing.

Cabin materials sit beside six persistent unique keepsakes, with original illustrated finds, discovery stories, missing-item hints and a brief underwater find reveal. Cabin, journal, chart and workshop wrap in both directions by pointer or arrow keys. Look controls and manual Save are removed; world drag/zoom and ten-second autosave remain. The duplicate raft was a beacon visitor clone and is removed, including its misleading recipe description.

## Verification and attribution

- 120 automated domain, regression and fish-behavior tests. Oxygen, surface gates, reward/trophy uniqueness, legacy saves, seeded layouts and feasible round trips are covered. Fish tests observe retreat and follow/return positions.
- 658 production browser checks at 1440×900 and 900×900 passed before the final scenery-only shoulder patch, with zero browser errors. This includes 92 checks in a fresh, actually earned pearl-and-reef arc; the other cases are explicitly labelled fixtures. The earned arc obtained Brass Compass and Nautilus Shell through actual sailing, swimming and pointer pulls, then retained them through Continue. Timer save was read before pausing/reloading. See [functional acceptance](qa-final-status.md).
- Final scenery integration independently passed another 92 actual-input earned-play checks on the exact final build, with no errors or fingerprint change. See [final scene acceptance](qa-final-scene.md).
- Seven normal-size scene comparisons, including distinct sites, surface/depth and lateral views. Final iteration-seven points were visible in both lateral frames, unchanged in world position, with far-to-near shifts of 112.19 / 166.00 / 243.14 / 614.16 pixels. [Independent review](independent-review.md) closed its final major composition concern at prototype quality.
- Actual-renderer duplicate-raft regression changed from two rafts to one across Continue/reload/travel/build. See [diagnosis](duplicate-raft.md).
- Final CPU lifetime diagnostic passed after the shoulder change, with zero observed resources remaining: `captures/fifth-improvement/qa/2026-10-09T06-00-21.094Z-resource-lifetime/results.json`.

Final local production build: `index-BqHxL0Q5.js`, `scene-6sbYOEGm.js`, `index-XQSqB-rG.css`. Vite build passes with the existing large Three.js chunk advisory. The localhost preview uses a command-line root-base override; the concurrently added GitHub Pages configuration is preserved.

## Final hardware and resource result

The exact final build passed the headed Chrome M4 Pro protocol at 1440×900, DPR1, High. Sailing and a natural moving dive each measured 16.7ms median / 17.4ms p95 frame intervals, with zero frames over 50ms. The dive included live oxygen, depth beyond 12m, ascent and surface breathing; it did not freeze a completed attempt. All other agent test browsers were closed during recording.

Sixteen alternating actual-input reef entry/exit cycles showed a final-three matching-site plateau: Home 279 geometries / Cove 288, with 3 textures throughout. Initial cache growth is retained in the report, with stable suffixes beginning at cycles five and four respectively. The separate CPU diagnostic disposed all 2,572 observed resources. These bounded observations do not establish universal memory safety.

Evidence: `captures/fifth-improvement/qa/2026-10-09T06-03-36.979Z-performance/results.json`. Overall pass, unchanged build fingerprint, zero browser errors, browser closed. See [performance protocol](../../performance-budget.md) for measurement limits. Temporary source/staging servers are stopped; the production preview on 5181 remains available.

## Criteria disposition

| Feedback | Outcome |
| --- | --- |
| Look / manual Save | Removed; drag/zoom and automatic persistence retained |
| Underwater quality / parallax / variety | Modeled layered worlds, seeded layouts, seven capture iterations; independent major concerns closed |
| Meaningful depth / wildlife | Deeper feasible routes; anchored reactive fish |
| Cabin / menu navigation | Six persistent keepsakes and wrapping four-page carousel |
| Second raft | Reproduced in actual renderer and fixed |
| Oxygen / boarding / surface | Continuous air consumption, surface-only exit, softened waterline |
| Air display / objectives / clutter | Separate gauge, image checks, unnecessary underwater text hidden |

## Evidence and limits

Baseline source, assets and build remain in `captures/fifth-improvement/baseline/`. Visual iterations, including rejected attempts, remain in `captures/fifth-improvement/art/`. Native keepsake generation and revision prompts are retained in `assets/ui-fifth/keepsakes.provenance.json`. See [domain notes](domain.md), [art implementation](underwater-art.md), and [criteria](criteria.md).

This is a bounded stylized prototype. Coral forms and terrain contacts retain some roughness. Agent still-image review does not establish motion feel or human enjoyment; synthetic full-cabinet images do not establish that every trophy was earned in browser play. Existing user storage was not used by test contexts. No production deployment or Git commit is part of this pass.

Next player question: do the deeper dives feel rewarding, with enough air pressure to make the return interesting?
