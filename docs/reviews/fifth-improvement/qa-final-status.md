# Fifth final functional acceptance — before coral shoulder rebuild

PASS: five cases, **658 checks**, zero browser errors. Production origin `http://127.0.0.1:5181`; version `0.6.0-beta.1` checked against package.json. Exact served files validated before launch:

- Entry: `index-DEoE_vNG.js`
- Scene: `scene-CpbJOsCn.js`
- CSS: `index-XQSqB-rG.css`

Evidence: `captures/fifth-improvement/qa/2026-10-09T05-54-28.490Z-acceptance/results.json`. Served fingerprint unchanged before/after. All isolated Chrome contexts and browser closed at **2026-10-09 05:57:42.717 UTC**. Hardware exclusivity itself was not measured or claimed.

| Case | Checks | Result |
| --- | ---: | --- |
| 1440×900 labelled panel/save fixture | 249 | Pass |
| 1440×900 labelled pearl travel fixture | 34 | Pass |
| 1440×900 fresh actually earned pearl and reef arc | 92 | Pass |
| 900×900 labelled panel/save fixture | 249 | Pass |
| 900×900 labelled pearl travel fixture | 34 | Pass |

Includes the full checkpoint contract plus collected-story and empty-slot hint selection checks. Fresh earned run sailed/swum/pulled the home pearl bed, returned to the raft, restored Home Reef, earned Brass Compass and Nautilus Shell, verified both reveals and immediate saved trophies, verified the periodic save from actual movement before pause/reload, and retained supplies/restoration/trophies through Continue. Exact generated layout/pointer projections used; no action hooks or fixtures in this fresh case.

Panel screenshots now wait 650ms; underwater screenshots retain 200ms. The previously observed cabin fade artifact is resolved in this capture. Completion and boarding filenames are distinct per site. Both selected states retained:

- `1440x900-actually-earned/cabin-collected-selected.png`
- `1440x900-actually-earned/cabin-empty-selected-hint.png`
- `1440x900-actually-earned/actually-earned-cabin-continued.png`

The empty selection capture was visually inspected: fully opaque cabin art, Nautilus Shell and Brass Compass collected, materials 1 wood/1 scrap/2 pearls, selected unfound Glass Fishing Float with its Sheltered Cove exploration hint. These represent the exact build above.

A later coral-shoulder art addition is being made only in assets/cleanup/reef-art.js. It was not part of the accepted served scene. This pass remains valid for the recorded entry/scene and must not be described as accepting that subsequent art. Await a new exact entry before integration rerun. No runtime files, servers, baseline snapshots, staging output, or hosting configuration were changed by QA.

The sidecar now supports `--suite=earned-only` for that upcoming integration run. This is a prepared, syntax-checked harness change made after the completed run, not a rerun. It executes the fresh wide earned pearl/reef arc including deep screenshots, revelations, timer save, Continue, and collected/empty cabin selections. It records source hashes for UI/domain/art attribution. Use the parent's newly declared entry and scene, retaining CSS/version assertions. No browser has been launched for this pending integration step.

Visual art approval, full-motion camera review, screen-reader interpretation, and hardware performance remain separate from these functional results. Reveal expiry duration is not timed. No GPU benchmark or hardware exclusivity claim is made.

Final scene integration subsequently completed: see `qa-final-scene.md`. New entry `index-BqHxL0Q5.js` / scene `scene-6sbYOEGm.js` passed **92 earned-only checks** with unchanged served fingerprint and no errors. This supplements, rather than relabels, the 658-check full result above. Browser closed 06:02:27.140 UTC; parent notified that no browser QA remains active for the headed hardware protocol.
