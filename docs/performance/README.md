# Maintained performance checks

The maintained harness lives in `scripts/performance/`. It measures a production build, keeps raw evidence, and compares the candidate with a fresh measurement of the actual base branch on the same runner. `policy.mjs` declares the finite thresholds; [protocol.md](protocol.md) describes their scope and rationale. [baseline-proposal.md](baseline-proposal.md) distinguishes observed exploratory evidence from the formal measurements still required.

No command launches a browser by default. Browser collection requires `--run --browser-released`; local hardware additionally requires `--nonexclusive`. In this shared checkout, those flags must follow an explicit coordinator release. CPU tests and `--cpu-only` collection require no GPU release. Do not change a measured build, stop another owner's server, or run another browser during a serialized pair.

## CPU verification

Run from the checkout whose domain modules the tests should exercise:

```sh
cd /Users/jacobusbrink/Jaxs/projects/tidekin
node --test tests/performance*.test.js
node scripts/performance/collect.mjs --help
node scripts/performance/pair.mjs --help
```

The adapter tests inject inert browser/server implementations. Their simulated run messages do not represent measurements. The collection tests exercise actual Three allocation/disposal events, shader-uniform textures, undeclared detached allocations, real domain construction/discovery, input fingerprints and binary inventory. Temporary test directories self-clean. Comparator tests use clearly manufactured records, require a valid passing control, and assert specific seeded regression gates or evidence errors.

A CPU-only record against the frozen legacy source and existing build can be created under a **new** name:

```sh
node scripts/performance/collect.mjs --run --cpu-only --profile=hardware \
  --root=/private/tmp/tidekin-performance-baseline.qav8rw \
  --source-ref=79da54bdbd029090d4ed9d6fd3dd2caea1a4847c \
  --source-git=/Users/jacobusbrink/Jaxs/projects/tidekin \
  --build=/Users/jacobusbrink/Jaxs/projects/tidekin/dist \
  --out=/private/tmp/tidekin-baseline-cpu-NEW.json --session=cpu-NEW
```

This record has `kind: cpu-only`. A completed CPU collection cannot pass the browser comparator.

## Production builds and paired collection

Use two frozen source trees with locked dependencies. Build each tree into a separate, newly chosen output directory, with the same Vite command and root base; never rebuild the coordinator's frozen `dist/`:

```sh
npm ci
npm exec vite -- build --base=/ --outDir=output/performance-build
```

CI performs those commands in each exact checkout. For local hardware, preserve the build command/log and source/build fingerprints when building; stability hashes alone do not prove that an arbitrary preexisting directory was produced from the claimed source. The preserved `79da54b` dist is an explicitly coordinator-identified historical build. A different source tree must not borrow its CPU attribution.

After coordinator release, run `pair.mjs` from one frozen trusted harness. Replace the example paths, session and full SHAs with the frozen identities. `BASE_ROOT` must expose the same Playwright dependency used by that harness. Both preview servers must use the same Vite version/method, root base, caching and compression settings. For example, each owner can serve its production directory with `npm exec vite -- preview --base=/ --host=127.0.0.1 --port=PORT --strictPort --outDir=BUILD_DIRECTORY`.

```sh
node scripts/performance/pair.mjs --run --browser-released --profile=hardware --nonexclusive \
  --base-root=/private/tmp/tidekin-performance-baseline.qav8rw \
  --base-source-ref=79da54bdbd029090d4ed9d6fd3dd2caea1a4847c \
  --base-source-git=/Users/jacobusbrink/Jaxs/projects/tidekin \
  --head-root=/ABSOLUTE/FROZEN/CANDIDATE \
  --base-build=/Users/jacobusbrink/Jaxs/projects/tidekin/dist \
  --head-build=/ABSOLUTE/FROZEN/CANDIDATE/BUILD \
  --base-url=http://127.0.0.1:5181 --head-url=http://127.0.0.1:5182 \
  --browser-executable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  --expected-base=79da54bdbd029090d4ed9d6fd3dd2caea1a4847c \
  --expected-head=FULL_40_CHARACTER_CANDIDATE_SHA \
  --session=hardware-pair-NEW --out-dir=benchmarks/records/hardware-pair-NEW
```

An uncommitted candidate requires explicit `--allow-dirty-head`, allowed only for local hardware. Its input fingerprint is retained and its evidence is labeled; it does not certify an exact committed candidate. A formal exact-commit comparison uses clean matching source trees without that flag. Hardware always uses installed Chrome, headed, at the exact executable path whose bytes are hashed. Missing/unreadable binaries fail before launch; there is no silent download or software fallback.

The pair alternates base/head, head/base, base/head, head/base, base/head. Each run gets a fresh timed browser, with cold then warm loading and all scenarios. After timed work, it samples the existing 24 transitions, closes that browser and launches a sequential fresh memory-only browser for cold/warm startup, five builds and four habitat entries. All 35 sampled windows are enforced independently; see the protocol for cadence, gap limits and missed-spike scope. Only the collector's browsers and owned servers are closed. External preview servers stay with their owners. Output directories/files are reserved exclusively; failed preparation, partial runs, closure and finalization errors are retained in manifests and failed records. Process interruption may leave only the start manifest and completed repetition sidecars; that is partial evidence, never a pass.

After a passing settlement, the pair reads back final base/head/manifest/comparison/summary files and verifies every sidecar's exact raw-run digest against its aggregate. Only regular, non-symlink repeat files in that invocation's newly reserved directory are removed; `retention.json` records the result. All raw runs remain in base/head.json. Failed, inconclusive, interrupted or unverifiable diagnostics retain sidecars for coordinator disposition. No old evidence directory is overwritten or compacted by a new run, and no unrelated output is removed. Standalone exploratory records retain their diagnostic sidecars; use paired collection for formal aggregate retention. CI's bounded 30-day artifacts contain final aggregates or partial diagnostics as appropriate.

To re-evaluate saved **compatible formal** records with the same trusted harness:

```sh
node scripts/performance/compare.mjs --base=PAIR_DIRECTORY/base.json \
  --candidate=PAIR_DIRECTORY/head.json --out=NEW-comparison.json --summary=NEW-summary.md
```

Pass exits zero; fail and inconclusive exit nonzero. Do not widen thresholds after seeing a failing candidate or compare incompatible procedures.

## PR enforcement

`.github/workflows/performance.yml` resolves the actual base branch tip at checkout and exact PR head, builds both with locked dependencies, then uses base-owned policy, collector and comparator for both. It supports `merge_group` if a queue is enabled; it does not require a queue. It uses one base Playwright package and its installed Chromium binary with explicit SwiftShader. The install step runs the locked package's `playwright install --with-deps chromium`. Missing browser/CPU samples and non-SwiftShader rendering fail.

The legacy base has no harness. The only bootstrap is an explicit repository variable `PERFORMANCE_BOOTSTRAP_BASE=79da54bdbd029090d4ed9d6fd3dd2caea1a4847c`, checked against the exact resolved base. During that one bootstrap, candidate tools measure both trees and the summary clearly disclaims protected-base-policy validation. Review the entire controls patch; remove the variable after the first main merge. There is no fallback for another harness-free base.

The workflow retains raw evidence, failure manifests, comparison summary and control changes (scripts, tests, docs and workflow) for 30 days. On cancellation/timeout, artifacts may contain only completed sidecars. No cached measurement becomes the next baseline. A PR changing the comparator cannot lower the policy used for its own ordinary base comparison; adopting new controls still needs explicit maintainer review.

The coordinator has configured and GET-verified strict required `build` and `Performance regression gate` checks from app 15368 on main, including admin enforcement and disabled force pushes/deletion; see [branch-protection.json](../governance/branch-protection.json). The workflow has **not yet completed a hosted PR run**. Requiring a check name does not prevent candidate workflow edits from changing that check's implementation. This is accidental-regression enforcement, not tamper-proof CI. Required workflow/CODEOWNERS controls are separate governance decisions.

CI has a 90-minute timeout and three repetitions per side; hardware has five. Complete hardware pilots took **462.7–486.0 seconds**, including all 35 memory windows and seven scenarios; candidate13 took 462.013 seconds. Ten repetitions imply about **77–81 minutes** before pair preparation and variation; plan 90–100 minutes locally. Six repetitions imply 46–49 hardware-equivalent minutes. Hosted installation/building and SwiftShader cost remain unmeasured: the CI timeout is unproven, and timeout remains a blocking failure. CI's lower viewport/quality is a separate declared profile retaining all seven 5+20-second samples and 24 transitions; it never certifies hardware FPS. Expensive runs cancel when superseded.

On 2026-10-10 the human explicitly approved temporary fixed 60 Hz and restoration. The coordinator verified the built-in display's change from ProMotion to 60 Hertz in macOS UI; the secondary Dell remained unchanged. Restoration to ProMotion is pending. Fresh physical comparisons must retain that observed setting and its scope; earlier dynamic-cadence pilots cannot inherit it. Other user applications remain open, so GPU scope is nonexclusive.

## Remaining validation

The current CPU tests cover enforcement and settlement. A fresh full hardware pair and the first hosted PR run remain necessary. Browser-side CPU windows, exact turnaround events and the new startup/transient memory sampling have not been validated in a formal rendered pair. The 100/250 ms cadence and one-second gap bound passed authorized pilots through candidate13 across all 35 windows. Their successful coverage does not establish formal performance acceptance or authorize widening policy. Whole-renderer exceptional shutdown is covered by the coordinator/reviewer lifecycle tests, not certified by this cleanup-scene CPU collector. Physical VRAM, exclusive GPU ownership and all future workloads remain outside observed capability.

## Next diagnostic build

The coordinator preserved baseline `dist/` and its port 5181 preview, with immutable source `/private/tmp/tidekin-performance-baseline.qav8rw`. Candidate builds change under coordinator ownership: freeze matching accepted source/build and fresh provenance before a head pilot; do not attribute an earlier build to changed live source. A legacy pilot can independently use the preserved baseline after controls review and explicit GPU release.

After an explicit GPU release and a matching source/build/control freeze, a one-repeat diagnostic can use:

```sh
node scripts/performance/collect.mjs --run --browser-released --profile=hardware --nonexclusive \
  --exploratory --repeats=1 --root=/ABSOLUTE/FROZEN/MATCHING/SOURCE \
  --build=/ABSOLUTE/FROZEN/ACCEPTED/BUILD --url=http://127.0.0.1:5182 \
  --browser-module=/Users/jacobusbrink/Jaxs/projects/tidekin/node_modules/@playwright/test/index.mjs \
  --browser-executable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  --session=memory-pilot-NEW --out=benchmarks/records/memory-pilot-NEW.json
```

The first legacy pilot failed on fresh cold-start RSS after partial coverage; both browsers closed and its failed record remains retained. Subsequent authorized pilots completed all coverage. Candidate11 observed one validated owned-PID turnover recovery; candidate12 observed none. Simulated exit recovery and live-PID access failures remain covered by CPU tests. The frozen collector records closure flags, not separate close timestamps.

Latest measured candidate13 completed **03:05:56.077Z–03:13:38.090Z**, session 15326, with all **35/7/24/5/4** memory/scenario/transition/build/menu coverage, unchanged source/build/harness/Chrome and both owned browsers closed. Ownership observed **297922 resources, 0 remaining/0 double-disposed**, strict count/byte plateaus and home geometry 319 within the unchanged allowance. Maximum sampling gap 397.9 ms. The existing [readiness JSON](pilot10-readiness.json) retains exact raw/audit hashes and compact latest results.

Five peak-heap windows still warn against variable baseline02, versus six in candidate12: transition 1/home, transition 11/pearls, transition 20/wreck, entry/home and entry/cove. Against fixed60 candidate12, three heap and nine backing peaks warn. No RSS peak or post-GC warning against either reference. One-repeat diagnostics cannot determine formal variance/acceptance. Request/operation boundaries identify when maxima occurred, but no allocation-stack or GC-reason trace identifies their exact allocating function.

Candidate13 includes the parent private per-sculptor cache only for undeformed coral/anemone unit spheres, alongside character13 changes. Stone/deformed coral remain unique. CPU proofs establish unchanged ordered topology/attributes/bounds and ownership; the physical pilot observes their combined inputs. Candidate13 is final art and no further exploratory/art cycles are planned. Final QA **4 character/6 gameplay/4 Low cases** passed with zero errors, unchanged guards and all browsers closed. Clean feature commit/build provenance and one full unchanged five-alternating-pair hardware cycle still precede performance acceptance. If formal matched evidence fails, use a bounded demonstrated allocation fix or measured revert; budgets and GC/sampling remain unchanged. Final independent art assessment is **84.5/95 assessed**, with **5 resolution points pending** and a maximum possible **89.5/100**; the 95 target is unmet.

The coordinator completed the immutable baseline-only **unprofiled fixed 60 Hz** diagnostic in **92.0 seconds**, 01:52:02.263Z–01:53:34.256Z on 2026-10-10. Independent raw validation confirms all three original 5+20-second windows, unchanged source/build/harness/Chrome identities, one owned browser closed, and no Profiler, requested GC, memory sampling or menus. The actual helper hash is `679996dc…`; the previously reviewed helper was amended only to clarify timeout metadata and assert one owned browser. Its executed adapter remains `8102c6f8…`.

| Renderer main-thread CPU, ms/s | Variable baseline02 | Fixed baseline | Head10, fixed | Profiled base09 | Profiled head09 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Follow | 88.34 | 140.69 | 130.09 | 111.78 | 126.21 |
| Sailing | 91.39 | 139.40 | 127.84 | 112.86 | 114.61 |
| Home reef | 90.96 | 136.88 | 111.71 | 119.72 | 113.54 |

Candidate13 follow/sailing/home CPU is **133.44/130.61/109.86 ms/s**, below the fresh fixed baseline 140.69/139.40/136.88. All seven frame medians are 16.7 ms, p95 range 17.4–17.6 ms. The table keeps earlier unprofiled/profiled references separate; each column is one diagnostic repetition. Separate run order/time, nonexclusive hardware and profiler perturbation prevent pooling or causal benefit claims; the full clean alternating pair remains required. A formal clean committed pair needs fresh measurements.

The coordinator verified **301/301 full-suite tests and catalogue 36** for frozen candidate13. The frozen performance suite remains 88 tests. New source changes require their own verification and measurements. Source/runtime and GPU ownership remain with the coordinator. The collector may need authorized local socket/process access. A documented command is not a GPU release. No thresholds, control code or old raw evidence changed.

Coordinator cleanup retired 875 superseded QA captures (365886000 bytes), with **6257565696 logical bytes total** retired across the exact ledgers. Canonical four PNGs/three clips remain in `docs/art/evidence`; immutable baseline and current evidence remain preserved. This is coordinator-reported disposition, not new collection. Built-in display remains 60 Hertz; original ProMotion restoration is pending.
