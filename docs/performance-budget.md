# Performance budget and measurement protocol

Target: 60 FPS on a modern laptop with hardware WebGL at 1440×900 CSS pixels, pixel ratio capped at 1.75 (high), 1.35 (medium), or 1 (low). High enables 2048² shadow map; low disables shadows. Threshold for first beta: median frame interval <=20ms, p95 <=33.4ms on the measured hardware profile. Software-rendered/headless results are a separate compatibility profile and cannot validate hardware performance.

Collect 20 seconds after assets load and 5 seconds warm-up, record browser/version, operating system, WebGL renderer if available, viewport, drawing buffer resolution, quality, median/p95 requestAnimationFrame intervals, frames exceeding 50ms, draw calls, triangles, geometry/texture count. Repeat one sailing circuit to observe growth. CPU render-submit timings are diagnostic, not FPS or GPU time.

Asset budget: aim under 100k source triangles for hero assets combined; scene instances and horizon stacks must be counted separately. No per-frame GLTF loading or geometry construction. Geometry/material disposal on shutdown. Bounded particles, frame-time samples and animation arrays. All gameplay time steps clamped during foreground frames; paused/hidden tabs must not silently exhaust oxygen.

Correctness precedes performance: do not remove visual cues for salvage or tide access merely to increase FPS. Check medium/low preserves gameplay affordances. User-readable loading/error state is required if WebGL/assets cannot initialize.

## Third player-improvement candidate — measured 9 October 2026

Final entry `index-B3pFPmlR.js`, Chrome 154.0.8037.98 headed, ANGLE Metal Apple M4 Pro. Mac16,8 with 48 GiB memory. Each view: 1440×900 CSS pixels, DPR 1, High, 5-second warmup and 20-second stationary animation sample; no screenshot/video during measurement and all other agent test browsers closed.

| View | Median frame interval | p95 | Frames >50ms |
|---|---:|---:|---:|
| Following |16.7ms|17.4ms|0|
| First-person helm |16.7ms|17.2ms|0|
| Side-view cleanup |16.7ms|17.2ms|0|

All three meet the unchanged 20ms median/33.4ms p95 budget on this measured machine. These are requestAnimationFrame intervals, not GPU execution timings or certification of every laptop. Exact samples, GPU/browser/build/settings and before/after counts are retained in `captures/third-improvement/qa/2026-10-09T03-09-53.777Z-performance/results.json`. Separate actual-input eight-cycle site tests plateaued after warmup at 433/456 geometries by site and 5 textures; initial cache growth is retained. Headless functional timings were not used to pass the hardware gate.

## Fourth improvement — final 0.5.0-beta.1

Entry `index-CufECat5.js`, Chrome 154.0.8037.98 headed, ANGLE Metal Apple M4 Pro, 1440×900, DPR1, High. Five-second warmup and twenty-second stationary animation sample per view, no screenshots/video during measurement, other agent GPU sessions closed. Deep dive uses a clearly labelled benchmark fixture derived from the actually earned completed-site save, permitting an uninterrupted sample without oxygen expiry.

| View | Median frame interval | p95 | Frames >50ms |
|---|---:|---:|---:|
| Following |8.3ms|10.1ms|0|
| Deep cleanup |8.3ms|10.0ms|0|

Both valid samples meet the unchanged 20ms/33.4ms thresholds. These are rAF intervals on this hardware/display configuration, not GPU timings or a claim of equivalent performance everywhere. Do not infer a twofold improvement over the earlier 60Hz samples from a different observed cadence.

Raw samples: `captures/fourth-improvement/qa/2026-10-09T04-34-51.522Z-performance/results.json`. That run's overall status is **fail** because its separate initial eight-cycle resource check grew during warmup; the frame-time pass does not overwrite that status. Resource diagnosis and extended plateau evidence are recorded in the fourth improvement report.

The subsequent memory-only 16-cycle diagnostic (`captures/fourth-improvement/qa/2026-10-09T04-40-12.680Z-memory-diagnostic/results.json`) records a stable final-three matching-site plateau: Home263 / Cove262 geometries,3 textures throughout. Initial registration growth remains visible. The previous strict eight-cycle failure is preserved. A separate CPU ownership check observes all1,810 geometry/material resources disposed, with no detached resource after16 alternating site fixtures. These bounded observations support resource-lifecycle correctness without asserting universal memory safety.
