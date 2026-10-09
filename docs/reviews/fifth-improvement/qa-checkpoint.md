# Fifth staged functional acceptance checkpoint

PASS at `http://127.0.0.1:5183`, captured entry **index-Cc-YxsQN.js**. This is the first functional checkpoint, not final release/art approval. Existing hosting-base configuration was not changed. No builds, restarts, runtime edits, or requests to ports 5181/5182 were made during candidate acceptance.

Evidence: `captures/fifth-improvement/qa/2026-10-09T05-44-38.126Z-acceptance/results.json`.

Executed:

```sh
node scripts/qa-fifth-improvement.mjs --mode=acceptance --build-ready --expected-entry=index-Cc-YxsQN.js --base=http://127.0.0.1:5183 --earned
```

Five cases passed, 638 checks, no browser errors:

| Case | Checks | Result |
| --- | ---: | --- |
| 1440×900 labelled panel/save fixture | 245 | Pass |
| 1440×900 labelled pearl travel fixture with actual earned input | 30 | Pass |
| 1440×900 fresh actually earned pearl + reef arc | 88 | Pass |
| 900×900 labelled panel/save fixture | 245 | Pass |
| 900×900 labelled pearl travel fixture with actual earned input | 30 | Pass |

Both sizes pass all four panels' cyclic left/right pointer and keyboard navigation, accessible labels/current-page/focus checks, no Look/manual-save controls, cabin exact material counts and found keepsake atlas loading, timer-save before pause/reload, and Continue persistence. Complete generated site catalogue passes deterministic and unique terrain/target-coordinate checks through getCleanupSite. Catalogue checks are source-domain checks; distant locations were not all visually entered.

Both single-object fixture dives pass generated-target actual swim/pull input, separate air/image objectives, no location/guidance/Space-return text, no canvas or drag/orbit/zoom titles (pause accessibility title allowed), oxygen depletion after objective completion, rejected below-water exit, and surface pointer boarding. New Brass Compass reveal is visible, image/check only, named accessibly, and already saved.

The wide fresh case starts with empty storage and earns the home pearl bed and Brass Compass through real keyboard sailing/swimming and pointer holds. It then restores all three generated Home Reef targets and earns Nautilus Shell. Both reveals pass; supplies, completed restoration, and trophies survive Continue. Actual movement followed by uninterrupted 10.5-second waiting verifies changed localStorage containing the moved position/materials/trophies before pause, action, navigation or reload. The earned cabin atlas loads after Continue. Square does not repeat this fresh full arc.

Served entry SHA-256: `5d642b63b7ba1a7e2ae1ce7faa76a2bc4b58e90cd164adddb43a91c751935271`. HTML/CSS/entry/scene fingerprints are unchanged before and after; detailed hashes are retained in results.json. This fingerprint does not claim an exhaustive hash of every image asset. Installed Chrome launches without a user profile, using fresh nonpersistent contexts and DPR 1. No GPU exclusivity or benchmark/performance certification is claimed.

Reveal screenshot visually inspected: `1440x900-actually-earned/new-keepsake-brass-compass.png` shows the separate air dial, collected objective picture, and compass/check reveal without top-left location text. Screenshots capture this staged art only; art is still iterating. Reveal expiry duration is not measured (source contract 6500ms). Screen-reader interpretation and final art/full-motion review remain manual gates.

Evidence limitation: generic `objective-complete-underwater.png` and `back-aboard.png` in the fresh earned case retain the final Home Reef state because the second site reuses those filenames. Per-target and per-trophy screenshots are unique, and results.json retains all labelled state observations for both dives. This does not affect assertions, the sidecar now uses site-specific completion/boarding filenames for future runs. This naming-only change was syntax-checked after the checkpoint; the executed harness hash remains recorded in results.json.

Capture review correction: the staged actually-earned cabin screenshot was taken 200ms into its 500ms plan-arrive animation and therefore shows partially faded art. This is a capture artifact, not a UI defect. The sidecar now waits 650ms only when #panel-dialog is open; other captures, including underwater evidence, retain 200ms to preserve the air budget. This capture-only adjustment was syntax-checked; no new browser run or final-art approval is claimed.
