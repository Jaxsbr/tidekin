# Second improvement baseline

Baseline image gate released after eight matched screenshots were secure, at 2026-10-08 23:19:55 UTC (9 October, Auckland). No implementation files were edited by this specialist. Owned outputs are `scripts/qa-second-baseline.mjs`, `captures/second-improvement/baseline/`, and this report.

## Candidate identity and isolation

Port 5181 initially had no listener. The existing production `dist` was served with Vite preview, without rebuilding; listener PID 44726 was subsequently verified. Served HTML, menu artwork, entry JS and CSS matched disk byte hashes. Entry JS: `index-DUFqV722.js`, SHA-256 `bf4b6f342f34343c383b4c978b0413896ebf13dc92ae7fd6396f344ce0d48c4b`. Entry fingerprint: `1c435f3aff1033f7709c84423dd0802dae8cd09e02f9fd23aef36ebb2cd87e5a`. See `fingerprint-before.json` and `capture-ready.json`.

The complete shipped build is retained as `dist-beta3/`, with an eight-file manifest and aggregate digest in `retained-build-manifest.json`. Later tide checks use this copy on port 5183, allowing implementation/rebuilding on 5181. `source-reference/` retains domain helpers for reproducible fixture creation; shipped browser behavior comes from retained built JS. This directory is a build/artifact snapshot, not a Git revision (this checkout has no Git metadata).

The existing runner was read: headless cached Chromium, then installed Chrome fallback; WebGL flags permit software fallback. The new runner uses browser.newContext for each test, DPR 1, with fresh disposable storage. It never opens a persistent browser profile or accesses user saves. `?qa=1` exposes read-only state/metrics for observations; QA action hooks are not used. Fixtures seed isolated localStorage before entry. Gather/dive/steering use real Playwright keyboard inputs. Fixture setup is distinct from earned progression.

## Matched images and opening observations

For both 1440×900 and 900×900: `title-*`, `new-first-view-*`, `water-gameplay-*`, `old-dive-*`. The first view includes the existing arrival instruction dialog. Original first-view frames caught its fade transition; stable title/arrival supplements (`title-stable-*`, `new-first-view-stable-*`) were subsequently captured from the identical retained build after 500/700 ms. Originals remain preserved. Neither viewport showed document overflow (scroll dimensions matched viewport). State confirms diving was true in both old-dive images. Raw UI text and state accompany images in `baseline-results.json`.

At square size the old dive retains the surface-oriented raft view, with character visibility obscured by the vessel. Region, resources, objective, bearings, oxygen, toast, interaction bar and navigation compete for attention. This is an agent inspection of screenshots, not a human usability result. The captures preserve the candidate rather than assigning a revised score.

## Tests and performance

`npm test`: 49 passed, 0 failed, 0 skipped. These are source-domain tests, distinct from browser checks of the shipped build. `node --check scripts/qa-second-baseline.mjs` passed.

Hardware browser: installed Chrome 154.0.8037.98; Apple M4 Pro, ANGLE Metal; vendor Google Inc. (Apple). Cached Chromium launch failed and installed Chrome fallback succeeded. Host is Darwin 25.6.0, arm64; OS/version/architecture and launch failure are recorded in `baseline-results.json`.

1440×900, DPR 1, High, drawing buffer 1440×900: 5-second warmup, 20,012 ms sample, 1,200 rAF intervals. Median 16.7 ms (59.88 FPS), p95 16.8 ms; zero frames above 50 ms. Local hardware budget passed (median ≤20 ms; p95 ≤33.4 ms). This is hardware rendering, not SwiftShader. It matches the historical reference on this host but cannot certify other devices.

Before/after one real-input D/S/A/W sailing circuit: 185 draw calls, 131,454 triangles, 155 geometries, one texture, with no observed growth. Each segment moved about 3.5 m. The 20-second sample itself was stationary active surfaced gameplay; the circuit followed it. CPU render-submit diagnostics are retained separately and are not GPU timing. No page errors or failed requests were observed during the capture run. Shader-compile tracing and broad multi-device compatibility were not repeated here.

## Tide incident and preserved failures

First attempt: floating shore-log samples passed at seeded times 0, 60, 90, 135 and 170. A malformed tidal fixture omitted matching gathered totals; serialization rejected it. That harness failure remains in `baseline-results.json`.

Second attempt: fifteen browser samples completed, covering floating, tidal and a near-boundary targeting location. Floating shore log collected at all five phases. Tidal log collected at low tide (0 and 170); E did not collect it at rising/high/falling mid-tide (60, 90, 135). UI said “Dive or wait for low tide” while blocked. The continuous sequence then hit an asynchronous startup race reading a null state; this is preserved in `fixture-results.json`. Neither failure is attributed to gameplay.

The original overlap location (5,4) put the floating log just outside the 3 m gather radius (3.162 m), while the tidal log was inside. Corrected overlap coverage uses (5,3.6), where both are within range and the tidal log is nearer. Final fixture evidence is retained separately in `fixture-results-final.json`.

Exact human reproduction remains unestablished. The test saves deliberately control positions, tide and previously collected nodes; they do not recover Jaco's browser state or exact inputs. Floating and tidal logs sharing “Driftwood” presentation remains a readability concern even if domain/browser availability is consistent.

## Re-run commands

Use the retained build as the preview output directory to avoid measuring new implementation:

```sh
npx vite preview --host 127.0.0.1 --port 5183 --strictPort --outDir captures/second-improvement/baseline/dist-beta3
TIDEKIN_BASE_URL=http://127.0.0.1:5183 node scripts/qa-second-baseline.mjs --fixtures-only
TIDEKIN_BASE_URL=http://127.0.0.1:5183 node scripts/qa-second-baseline.mjs --arrival-only
```

A full run without flags captures the matched views and benchmark before fixtures. Archive existing output before repeating a full run; original evidence in this session was retained separately from corrected fixture reports.

## Final browser tide result

All 15 corrected phase/targeting cases passed. At the overlap location, low tide selected nearer timber; rising/high/falling mid-tide selected accessible floating driftwood instead of nearer covered timber. Continuous unmodified game time advanced from 55 through 150 seconds: real E input failed to collect tidal timber at 56, 90 and 135; the disabled button/hint agreed. At 145 (height 0.3288, below 0.35), the button enabled and E collected timber. A further E at 150 did not duplicate collection. No runtime/request errors were recorded; before/after retained-build fingerprints match. See `fixture-results-final.json` and `verification-summary.json`. This browser fixture reproduces the intended tide rules, not the exact reported human incident.
