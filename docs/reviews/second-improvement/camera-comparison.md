# Camera comparison — completed

9 October 2026. **Independent recommendation: follow for production sailing; side-on for cleanup. Reject the current first-person wheel view.** This recommendation was reached from the captures before PM selected follow. The first-person experiment was useful; shipping both alternatives is not required.

All eight final short trials completed, and their Chrome browser closed. No further recording is running from this comparison. Final evidence: [run manifest](../../../captures/second-cameras/2026-10-08T23-43-20-064Z/evidence.json), 124 PNG checkpoints and eight recorded videos. Chrome 154.0.8037.98, headed, DPR 1, High, 1440×900 and 900×900. All eight loaded the same final-freeze assets:

- `index-CFK9qQDK.js`: SHA-256 `abf6d8dafa1a18f70b9a8030f6040c42e788df5dfa10d3d0def81a3cbf93db32`
- `scene-Be6Rwn9a.js`: SHA-256 `c9f4bfebc5b76073e5ed520afaf23f6bd91747f50ae71edd4a02c60b99d52c48`

Later source-only copy, woven-bag, failure-HUD and workshop changes are **not assessed by this fingerprint**. The separately captured full cleanup predates this freeze; see limitations below.

## Actual experiment

The specialist ran `scripts/compare-second-cameras.mjs --auto --brief --art`, not a tool awaiting a human operator. Four pairs: sailing helm/follow at each viewport and cleanup side/oblique at each viewport. Each fresh context started through the real Start button. World helm/cabin/workshop selection used projected hotspot coordinates with real mouse clicks. Movement, collect, surface and panel keys were real keyboard events. Only camera selection used approved mutable hooks; state/metrics were read-only. No action, teleport, resource, completion or save-state grants.

Sailing sequence: W 600 ms; D 980 ms; W/S 650 ms each; A 980 ms; S 600 ms; E; leave helm; W 350 ms; world-click cabin and bench; use I → Wheel camera → H → W 350 ms; leave again. Both pairs began at position (0,0), heading 0, initial inventory, low tide; domain ready times ranged only 1.2924–1.3253 s. Movement end positions differ slightly because real frame scheduling is not deterministic. D produced heading approximately 4.70–4.71 radians (a right turn from zero); A returned close to zero. Off-helm W left the position exactly unchanged in all four sailing trials.

Cleanup sequence: enter at home; select view; swim to bottle (−3,−2), collect E, surface and refill; swim to can (3,−2.5), collect; descend to net (3,−7), collect; surface again. Read-only position feedback bounded the real key holds, so this is an instrument-assisted camera/layout experiment, not a blind novice test. All four runs started with 24 air and zero trash, retained one pickup after initial breathing, and ended at surface with 24 air and the same three IDs (bottle, can, net). Same targets and route intent; no claims about human completion time, search behavior or enjoyment.

## Verdict by pair

| Pair | Actual observation | Decision |
| --- | --- | --- |
| Wide sailing | Wheel view has a large opaque polygon intruding from upper left, hides the raft footprint and nearby lateral targets. Follow exposes the raft footprint, nearby salvage and turning orientation, though the cabin hides the avatar. | Follow wins. Wheel fails framing gate. |
| Square sailing | Wheel gives a readable forward horizon but less surrounding context. Follow keeps the whole craft and nearby water in frame with usable controls. Cabin still hides avatar. | Follow wins for navigation; inspection supplies character viewing. |
| Wide cleanup | Both show all targets, bag, diver and surface. Oblique slopes the surface and adds modest depth without helping collection. Side-on gives a level, direct W-to-surface relationship. | Side-on preferred. Both routes completed. |
| Square cleanup | Both retain the full target field, including the deep net; no air-panel/head overlap in the sampled route. Side-on is easier to interpret vertically. Diver is smaller than wide but goggles, body and bag remain recognizable. | Side-on preferred. |

Direct evidence:

- [Final wide wheel intrusion](../../../captures/second-cameras/2026-10-08T23-43-20-064Z/wide-AB-sailing-A/08-ready.png), [wide follow](../../../captures/second-cameras/2026-10-08T23-43-20-064Z/wide-AB-sailing-B/04-ready.png).
- [Square wheel](../../../captures/second-cameras/2026-10-08T23-43-20-064Z/square-AB-sailing-A/08-ready.png), [square follow](../../../captures/second-cameras/2026-10-08T23-43-20-064Z/square-AB-sailing-B/04-ready.png).
- [Wide side](../../../captures/second-cameras/2026-10-08T23-43-20-064Z/wide-AB-cleanup-A/04-ready.png), [wide oblique](../../../captures/second-cameras/2026-10-08T23-43-20-064Z/wide-AB-cleanup-B/04-ready.png).
- [Square side](../../../captures/second-cameras/2026-10-08T23-43-20-064Z/square-AB-cleanup-A/04-ready.png), [square oblique](../../../captures/second-cameras/2026-10-08T23-43-20-064Z/square-AB-cleanup-B/04-ready.png), [deep target remains reachable/readable](../../../captures/second-cameras/2026-10-08T23-43-20-064Z/square-AB-cleanup-A/10-deepest-target.png).

Do not spend another iteration adjusting the wheel anchor now. Remove its production option, normalize a saved wheel preference to follow, retain the prototype hook, and use orbit/zoom inspection to recover the avatar/station view. Follow's rear cabin occlusion is an acknowledged presentation tradeoff, not equivalent to the wheel geometry intrusion. Production removal/migration still needs its own targeted check after implementation; this report does not certify a not-yet-built change.

## Functional observations and limits

The actual chooser route preserved `viewMode: helm` with `helm: true` after H and W in all four final sailing trials. Thus the earlier preference-reset defect is not reproduced on this fingerprint. This uses the visible chooser after the camera experiment, without another setter. World cabin and bench clicks opened the expected views and left the helm. No page errors were logged.

The deliberately short E attempt during sailing was out of range and displayed “Move closer to the salvage”; it **did not prove successful surface gathering**. QA's earned gathering tests remain the authority. The compared cleanup targets were successfully collected through E, and surface breathing retained them. No full lifecycle was repeated on the final build.

Earlier [earned full cleanup](../../../captures/second-cameras/2026-10-08T23-37-06-173Z/evidence.json), served `index-ByGbsOiN.js` / `scene-K26CILKt.js`, records intentional partial failure, retry, six pickups, immediate completion, restored map, reload and clean revisit. Use its bag-fill/restoration images for visual state comparison only; it predates final reset fixes and cannot certify final persistence or failure UI.

Videos were recorded, but continuous playback was not inspected with a video-capable review surface. **Smoothness, subjective motion comfort and animation timing are unassessed.** Actual input logs and sampled frames establish poses, response, item transfer positions and state transitions; they do not establish smooth motion. End-of-trial frame interval samples reported medians around 8.3 ms and p95 9.2–9.3 ms under recording. These are incidental diagnostics, not the specified warmed hardware benchmark and not proof of visual comfort.

## Recorder and disk disposition

The script now defaults to eight AB trials; BA repeats require `--all-orders`. Use `--auto --brief` for bounded noninteractive comparisons. `--art` adds normal/reduced title snapshots through the real settings switch. Traces are now off by default; optional `--trace` excludes automatic screenshots/DOM snapshots. No more comparison runs are required for the verdict above.

Earlier default tracing was too expensive. At the retention check the largest files were the aborted orientation `2026-10-08T23-30-52-149Z/.../trace.zip` (401 MB), its idle video (144 MB), full-cleanup `2026-10-08T23-37-06-173Z/.../trace.zip` (305 MB), and individual trial traces up to 161 MB. All evidence has been preserved; nothing was deleted. Recommend reviewing these traces for deletion while retaining manifests, meaningful PNGs and selected short videos. The final run had already started with tracing before that default was corrected. Do not mistake an idle orientation recording for a gameplay test.
