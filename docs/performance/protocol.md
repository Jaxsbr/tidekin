# Measurement protocol and finite gates

`scripts/performance/policy.mjs` is executable policy. These thresholds were declared before formal paired records, following the coordinator's within-reason size/resource instructions. Independent review agreed with bounded count allowances as a principle; this document does not claim independent approval of each numeric threshold. Policy changes need a separately reviewed rationale and fresh paired observations, not retrospective relaxation of a failing result.

## Profiles and scenarios

| Profile | Browser/rendering | Viewport, DPR, quality | Repetitions per source |
| --- | --- | --- | ---: |
| hardware | Exact installed Chrome, headed, hardware renderer | 1440×900, 1, High | 5 |
| ci-software | Exact bundled Chromium, headless, explicit SwiftShader | 960×600, 1, Low | 3 |

Both profiles run 5 seconds of fixed warmup then 20 seconds of timed frames for each scenario:

| Scenario | Required physical coverage |
| --- | --- |
| follow-stationary | Fresh raft, active Follow view, position stationary |
| sailing-circuit | Actual steering, more than 8 metres of movement |
| moving-dive-home-reef | Home reef habitat |
| moving-dive-sheltered-cove | Sheltered cove habitat |
| moving-dive-salvage:home-pearls | Distinct pearl habitat with construction prerequisites |
| moving-dive-salvage:horizon-wreck | Distinct horizon wreck, discovered through sailing before travel |
| developed-raft | All five upgrades built by normal actions, active stationary surface scene |

Each dive must visit at least 12 metres, remain viable with positive air, move for at least 60% of the timed sample, naturally return to the surface and spend at least 500 ms breathing there. Inputs change direction from real state; neither oxygen nor clocks are frozen. Exact turnaround events supplement the 200 ms checkpoints, because a short physical depth peak can fall between checkpoints. Invalid event values fail rather than supplying inferred coverage.

Fresh saves are controlled synthetic fixtures, not evidence of earned user progression. The supplied fixture starts with 100 wood/scrap/pearls, validates through the actual save codec, then builds waterwheel/crane/greenhouse/sail/beacon with real prerequisites/costs. Departure and horizon discovery are earned through domain steering/update in CPU preparation and actual keyboard sailing in the browser. Travel and salvage entry use public semantic QA actions with normal preconditions; home/cove entry uses projected buoy clicks. The CPU fixture validates the developed save before resource cycling. It never writes source files.

Home/cove pointer entry sails to a 6 m outward stand-off with .75 m arrival tolerance, leaving at least 5 m clearance while staying within the real entry range and keeping the requested habitat nearest. After 500 ms of normal updates, it checks the actual domain preconditions on a detached state clone, then projects `interactions['cleanup:<id>']`, not the buoy group's visual origin. A real pointer hover must resolve to main's `Snorkel · Space` title and the canvas must receive DOM input before clicking. Requested-site entry has a bounded 5-second outcome wait. Failed inputs retain position/heading/range/nearest-site/domain outcome, hover winner, DOM interception and panel/state diagnostics. There is no home/cove semantic entry fallback, teleport, unlock or clock/oxygen replacement. CPU camera/raycast/pointer-handler tests cover the clearance and interception pattern; real browser validation is still required.

After all seven timed scenarios and the four menu timings, the developed raft cycles 24 times through the four habitats in fixed order, recording inside/outside scene counters, non-GC sampled maxima and separate post-exit forced-GC memory. The first eight cycles are fixed resource warmup and remain in raw evidence. Workshop, chart, journal and cabin also open/close through normal keyboard/UI inputs, with pause and positive scene-render checks. Construction completion must advance real rendered frames.

## Loading and raw signals

Each fresh browser context loads a cold document, then a new document in the same context for warm loading. Cold here means a fresh browser/context cache, **not** a reset of OS caches, server caches, storage hardware or all GPU driver state. Warm results depend on the recorded server cache headers; uncached/revalidated bytes are reported as observed.

Menu readiness is observed after the visible Continue control. Click-to-first-interactive ends only when the game view and nonzero canvas bounds/styles are visible, the scene is unpaused, document visibility is positive and `activeRenderedFrames > 0`. Existence of game state alone is insufficient. This is measured readiness for this canvas/control contract; it is not a universal human responsiveness score. Full byte accounting waits for network idle after capturing the readiness timestamp, so network idle does not inflate that timing.

Keep navigation and every resource's encoded, decoded and transfer byte fields, as well as raw resource durations. Cold and warm totals include navigation. Shipped bytes and actual transfer are different gates: unused duplicated SVG atlases can inflate shipped size without being fetched, while two atlas URLs can duplicate actual transfer. The harness verifies every served file against the on-disk inventory before and after collection. The two sides must share root URL base and cache/compression signatures. Resource Timing distinguishes these byte fields and cached transfers; see [MDN's API reference](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming).

The candidate must report exactly one complete bounded phase for scene-module, scene-create, asset-manifest, atlas-decode, model-load and first-render. Durations are diagnostics; overall first interactive is gated. Failed, missing and relabeled phases fail. Only clean inputs matching exact legacy commit `79da54bdbd029090d4ed9d6fd3dd2caea1a4847c` may declare phase instrumentation unavailable. A dirty working tree retaining that HEAD gets no exemption. This exception does not waive its other samples.

Raw rAF timestamps produce interval median, p95 and proportion over 50 ms. Validation also requires 100 frames, nearly the full 20 seconds, monotonic checkpoints, active rendering, positive draw calls/triangles, correct viewport/quality/Follow view, foreground focus and positive game-clock advancement. rAF cadence is a presentation scheduling proxy, not GPU execution time. Browser/shader-related console errors, failed requests, HTTP errors and page exceptions invalidate a run. No independent shader compiler/program counter is exposed by the current QA hook; positive submitted work and errors are the available signals.

CDP Performance `Timestamp` and `ThreadTime` are collected at timed-window boundaries, retaining other available CPU counters. Their delta yields renderer-main-thread CPU milliseconds per wall second, including application/probe work. It catches CPU growth hidden behind vsync, without claiming GPU time or render-submit-only cost. The game's rolling render-submit summary remains diagnostic, not a full-window aggregate. See [Chromium's implementation](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/inspector/inspector_performance_agent.cc) and [Playwright CDP sessions](https://playwright.dev/docs/api/class-cdpsession).

## Memory and resource ownership

| Signal | Scope and limitations |
| --- | --- |
| Runtime heap | Raw target-renderer `Runtime.getHeapUsage` payload during memory-only windows and separately after requested GC; retain usedSize, totalSize and optional embedderHeapUsedSize/backingStorageSize |
| Typed data backing | Separate finite gate when backingStorageSize exists; absent support has an explicit reason, not zero bytes |
| Owned browser process RSS | CDP process IDs only; one `/bin/ps -o pid=,rss= -p PID,PID` batch on macOS, concurrent `/proc/PID/status` reads on Linux; bracketed ownership checks; summed RSS double-counts shared pages |
| Geometry CPU storage | Deduplicated live attribute/index underlying ArrayBuffer byteLength; excludes morph attributes and GPU copies |
| Texture storage estimate | Per-texture decoded image dimensions ×4, uncompressed RGBA assumption; unknown images counted; excludes mipmaps/compression/render targets/driver allocations |
| Renderer resources | Three geometry/texture counts, draw calls and triangles; counts are not byte measurements |
| Physical VRAM | Explicitly unavailable; neither RSS nor estimated RGBA bytes substitutes for actual VRAM |

Heap capability and optional fields come from [CDP Runtime](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-getHeapUsage) and its [canonical protocol definition](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/js_protocol.pdl): heap usage covers the corresponding isolate; backing storage includes ArrayBuffers and external strings; process identity comes from [CDP SystemInfo](https://chromedevtools.github.io/devtools-protocol/tot/SystemInfo/#method-getProcessInfo). If a measured capability disappears on the candidate or changes during a run, comparison fails. Both sides lacking an optional capability produce a visible unavailable result. Hardware records explicitly acknowledge other user applications may use the GPU.

Every repetition has 35 separate sampled-memory windows in a fixed order: 24 existing untimed enter/exit transitions, cold and warm startup in a fresh memory-only browser, five real builds, then one entry/exit for each of the four habitats. The timed browser closes before the fresh browser launches; the executable is rehashed and browser version, renderer, drawing buffer and supplied fixture identity must match. The supplied save has no prebuilt upgrades; construction uses the same normal costs and prerequisites. Cold startup sampling attaches to the new page before navigation; warm uses a new document in the same context. Startup timing gates continue to use the earlier unsampled documents. These memory-only loads retain their own loading diagnostics and do not enter loading-timing gates.

The two independent polling loops wait at least 100 ms after a heap response and 250 ms after an RSS response, then issue the next request. These are minimum intervals plus request latency, not a guaranteed 10 Hz/4 Hz wall cadence. Initial responses precede the operation; polling continues through the operation and a fixed one-second tail; final responses bracket the tail. Each window needs at least ten heap and four RSS samples. Adjacent response gaps, initial/final coverage gaps and individual request latency must each stay within one second. The operation has a 120-second deadline. Missing/unreadable required heap/RSS, stalled requests, excessive gaps, changed methods or optional backing capability changes fail. Unsupported backing storage on both sources is explicitly unavailable, never a zero maximum.

Raw observations retain Node monotonic request/response/window/operation boundaries, every heap payload, and every RSS attempt's before/after CDP process lists, reader boundaries and per-process KiB/bytes. On macOS the retained exact command, stdout, stderr, exit code and signal follow Apple's [ps implementation manual](https://raw.githubusercontent.com/apple-oss-distributions/adv_cmds/main/ps/ps.1): comma-separated PID selection and output fields, empty column headings, and RSS in 1024-byte units. Linux retains each owned PID's VmRSS line or structured read error. Neither method gives an atomic memory snapshot; PID bracketing also cannot exclude extremely fast PID reuse.

Each RSS sample has at most three whole-snapshot attempts within a 700 ms total deadline. Membership is enumerated again after reading. Missing still-live PIDs, permission errors, malformed rows, unrelated PIDs and incomplete final coverage fail immediately. A proved membership change permits a fresh complete snapshot; only Linux ENOENT or absent macOS rows can represent a departed PID. Partial sums never become a complete zero/total. All attempts remain raw, including failed reads and departure/arrival evidence. The final stable membership supplies the post-GC value; sampled-window RSS uses the maximum of all fully read attempts, preserving an earlier larger observation even if its PID set subsequently changed. The comparator rederives both values, ownership, command and retry proof. Deadline failures retain pending-request counts; unresolved work cannot allow subsequent timing/GC. The existing one-second request/gap bounds remain unchanged; 250 ms plus the reader's 700 ms deadline leaves 50 ms for scheduling overhead, which a pilot must verify rather than waive.

The comparator recalculates each window maximum, checks stored maxima, phase identities/order, real foreground render/entry/build outcomes, browser closure and nonoverlap with all timed and requested-GC intervals. Habitat windows additionally retain two atomic state/render checkpoints after actual requested-site entry and before exit, separated by the existing 500 ms observation. Both must remain active at that site with positive air and foreground focus, and rendered frames must advance between them. Declared inside counters must match those checkpoints; their raw boundaries must precede exit and lie inside the operation. Sailing/pre-entry/post-exit progress cannot satisfy this requirement. Each phase/metric maximum is independently compared across matched repetitions with the existing memory allowances and variance rules: used heap/backing 15% and 8 MiB; summed RSS 15% and 32 MiB. A lower maximum in another phase cannot offset a regression.

No sampler runs during the seven 5+20-second frame/CPU scopes or menu timing. No GC is requested inside sampled windows; natural browser GC remains possible. Samplers stop and drain before each separate forced-GC checkpoint. The 24 transitions are reused rather than duplicated; sampling deliberately pauses for those post-exit checkpoints, so it does not claim continuous coverage across requested GC. Any sampler failure bars later timing/GC scopes and causes owned browser cleanup, retaining the failed window. Sampling perturbs the memory-only workloads symmetrically. Maxima are **observed sampled maxima**, not guaranteed instantaneous peaks: spikes between polls, other isolates/workers, browser-launch memory before CDP attachment, later lifetimes and physical VRAM remain unmeasured. A one-second maximum gap bounds a blind interval, not the size of a missed spike.

CPU ownership tracking instruments actual Three prototype operations, restores them after collection, tracks unattached geometry/material allocations, and discovers direct and nested shader-uniform textures, including arrays/cycles. Geometry `setAttribute` and `copy` receivers are tracked once by identity; standard `clone` calls `copy`. Installed Three 0.180 already routes populated copies through `setAttribute`, while empty/morph-only copies need the separate hook. Every observed resource must remain attached or be disposed, shutdown must leave zero live resources, disposal must happen once, and repeated shutdown must be idempotent. Bare geometry constructors never attached or invoking these operations, and texture constructors never attached to a sampled tree/uniform, cannot be discovered by this tracker. CPU ownership covers the cleanup-scene factory; it is not a whole-browser teardown or actual GPU release test.

For each habitat and phase after the fixed eight warmup cycles, counts **and geometry/texture-byte estimates** must plateau exactly within a run. Both inside and outside phases are checked. Browser renderer counts have the same fixed plateau rule. Memory instead compares medians of the first four and last four post-warmup checkpoints with its finite allowance. Twenty-four cycles can expose sustained growth in these workloads; a plateau alone cannot prove no leak for all lifetimes, error paths or longer sessions.

## Gates and variance

A cross-source regression exceeds **both** the absolute and relative allowance. Equivalently, permitted growth is bounded by the larger allowance at that baseline size. Each named metric is independent: a smaller asset total cannot excuse a JS regression.

| Metric | Relative allowance | Absolute allowance |
| --- | ---: | ---: |
| Total / assets / existing same-path asset / network byte totals | 1% | 64 KiB |
| JS raw / gzip | 2% | 8 KiB / 2 KiB |
| CSS raw / gzip | 2% | 2 KiB / 1 KiB |
| Geometry / material / live-resource / texture counts | 5% | 32 / 4 / 32 / 2 |
| CPU geometry backing / estimated texture bytes, each phase | 10% | 1 MiB |
| Draw calls / triangles | 2% | 2 / 1000 |
| Menu ready / play ready / panel open | 15% | 75 / 150 / 25 ms |
| Frame median / p95 | 15% / 20% | 2 / 4 ms |
| Proportion of intervals over 50 ms | 25% | 0.02 (two percentage points) |
| Renderer-main-thread CPU | 20% | 20 ms per second |
| Used heap / typed backing | 15% | 8 MiB |
| Summed owned-process RSS | 15% | 32 MiB |

Size slack permits small module reorganization/art corrections while keeping transfer increments finite: 2 KiB gzip or 64 KiB assets represent about 16 ms or 524 ms at 1 Mbit/s before latency/decode, an illustrative loader-cost scale rather than a measured network forecast. Count slack permits small additional character/buffer components; counts alone do not imply corresponding byte cost. The accompanying storage/memory gates and strict within-run disposal/plateau constraints prevent count slack from becoming a leak waiver. Geometry byte allowance makes a roughly 93 KiB buffer tradeoff reviewable without claiming it reduces all memory. These are governance budgets, not empirically guaranteed perception thresholds.

Hardware absolute limits remain median ≤20 ms and p95 ≤33.4 ms for **every** candidate scenario/repetition. Software CI never applies or certifies those physical limits. Timing/post-GC memory/each named sampled maximum compare medians across repetitions, with paired significant-regression agreement: at least four of five hardware pairs or all three software pairs. Median absolute deviation divided by max(median, absolute allowance) must stay within 10% for frame median, 25% for the >50 ms ratio, or 15% for other timed/memory metrics. A range exceeding max(50% of median, four absolute allowances) is also noisy. Excess noise or contradictory significant pairs is inconclusive and exits nonzero; it never enlarges a budget. Rerun both commits in a matched session after investigating contention.

## Evidence identity and comparability

Records retain per-file SHA-256/bytes/gzip, focused build-input fingerprints before/after, committed Git blob identities, dirty/untracked inputs, policy and harness hashes, host OS/CPU/RAM/Node, runner image/run/attempt when available, exact browser executable SHA/version/arguments/channel, WebGL vendor/renderer/drawing buffer, fixture hashes, serving headers, inputs, checkpoints and raw observations. The focused input scope is src/**, assets/**, public/**, index.html, package manifests and supported Vite JS config names. It excludes evidence/tool outputs to avoid a self-hash loop; it is not a total repository/dependency/OS fingerprint. Revision snapshots require every expected input and matching blob, while local tracked deletions are represented explicitly. Missing revision files throw.

Different harnesses/policies/sessions/environments/browser binaries/renderers/fixtures/profiles cannot be mixed. The comparator derives summaries from raw observations, verifies inventories and sums, and rejects missing scenarios/repetitions or failed/unclosed runs. Parent/source changes while a build remains frozen do not inherit that build's observations. Historical measurements with other refresh cadence, quality, resolution, headless/software mode or incomplete windows are historical context only, not a matched baseline. Five then five sequential runs also differ from the declared alternating procedure and must disclose order rather than claim counterbalancing.
