# Performance procedure and current evidence

Target: responsive 60 FPS play on a modern hardware-WebGL laptop at 1440×900. Preserve the established hardware limits: median frame interval ≤20 ms, p95 ≤33.4 ms. These are rAF intervals, not GPU execution time. High detail supports a DPR cap of 1.75; comparisons below use DPR1. Medium/low and reduced motion must preserve gameplay affordances.

## Baseline for this goal

Before implementation, the coordinator measured commit `79da54bdbd029090d4ed9d6fd3dd2caea1a4847c` using headed Chrome on ANGLE Metal Apple M4 Pro, 1440×900, DPR1, High. Three repetitions each sampled stationary following and a live moving Home Reef dive, with five-second warmup and twenty-second recording. Other user applications remained open; exclusive GPU/CPU ownership was not established. No screenshot/video was recorded during timing samples.

| Scenario | Median across repetitions | Observed p95 range |
| --- | ---: | ---: |
| Following |16.7 ms|18.2–18.3 ms|
| Moving dive, ascent and surface breathing |16.7 ms|18.2–18.4 ms|

Cold click-to-play observations were 1.28–1.46 seconds on a local unthrottled server. These include UI click and observation overhead and do not establish network/device-independent loading. Cold resource timing showed two separate URLs downloading the same 2,961,160-byte atlas. Removing that duplication requires candidate verification rather than a source-only claim.

This narrow diagnostic is retired after the stronger full paired comparison. Its original status, raw hash and scope remain in [pilot retirement](performance/pilot-retirement.json). Redundant baseline captures are retired; selected unchanged before/after images remain in `docs/art/evidence/`. These early observations cannot replace broader paired measurements.

## Maintained protocol

`scripts/performance/` owns the scenario policy, measurement and comparison commands. Keep matched build/source/asset identities, browser/version/renderer, viewport/DPR, quality, cache/compression/network conditions, samples, repetitions and fixture seed in every record. Record CPU render-submit time separately from frame intervals; loading spans overlap and are not additive exclusive costs.

Measure cold/warm loading and first interactive play, transferred/decoded asset and script sizes, scene construction and image/model work; surface/developed raft, all distinct underwater habitats, active swimming/collection/ascent, menus/construction; repeated transitions and sustained memory/resource behavior. JS heap, process RSS, typed-buffer/texture estimates and actual VRAM are different measures. Unsupported measurements remain explicit. CPU ownership events do not certify GPU release, and shared-page RSS sums are not unique physical memory.

Run one owned test browser at a time. Use isolated test storage, with fixture state distinguished from earned progression. Reject paused, hidden, incomplete, changing-build or missing-scenario observations. Preserve initial warmup/cache growth rather than selecting a convenient suffix to hide leaks.

Keep an optimization only with matched evidence of its stated benefit and no failed gameplay/art/memory gate; otherwise revert that change. New finite relative/absolute PR thresholds are provisional until paired runs establish their practical noise behavior. Software-rendered CI comparisons are a distinct profile and cannot pass hardware certification.

Legacy measurements and retired raw-capture links are summarized in [historical outcomes](reviews/historical-summary.md). They are not current candidate evidence. The final clean five-pair comparison is **FAIL**:319 gates pass,one home-entry peak-heap gate fails, six are inconclusive. [Retained raw evidence](performance/formal-retention.json) reproduces exact bytes and unchanged comparator results. The candidate remains an unapproved draft; passing size/resource checks do not approve its runtime optimizations for release. Main requires build/performance checks. The bounded software fixture correction has passed focused review and308 CPU tests; final hosted coverage is separate. See [final status](performance/implementation-status.md).
