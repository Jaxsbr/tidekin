# Maintained performance checks

The final clean hardware comparison **failed**: 319 gates passed, one failed and six were inconclusive. Home-entry peak heap increased from **42,574,900 to 69,358,920 bytes** (+62.91%), exceeding both the unchanged 8 MiB and 15% allowances in all five pairs. Allocation attribution is unknown. The draft remains blocked; no overall performance-improvement claim is established. [Current disposition](pilot10-readiness.json) holds exact commits, nonpassing gates and one compact historical diagnostic ledger.

The reusable harness is in `scripts/performance/`. [protocol.md](protocol.md) defines scenarios, capabilities, finite budgets and variance rules. [baseline-proposal.md](baseline-proposal.md) is the historical measurement proposal. Production input fingerprints cover declared tracked/untracked source, asset and build inputs, rather than the whole repository.

## Verify controls

Run from the checkout whose domain modules should be exercised:

```sh
node --test tests/performance*.test.js
node scripts/performance/collect.mjs --help
node scripts/performance/pair.mjs --help
```

Tests exercise actual domain progression, Three allocation/disposal, orphan copies, shader-uniform textures, raw-sample validation and specifically seeded regression gates. Browser/server adapters are inert CPU tests; their output is not measured performance. Temporary test directories self-clean.

The software fixture faces each buoy with bounded normal A/D steering at rest before reading fresh projection/DOM/raycast evidence and clicking. Both key-down and the wait are inside `try/finally` key-up. Permanent HUD/modal obstruction still fails. This applies only to `ci-software`; hardware input, comparator and policy remain unchanged. Current focused tests pass 14/14; the immutable legacy CPU input check passes 7/7. Browser coverage must be established by the final hosted run.

## Collect a reproducible pair

No CLI launches a browser by default. Collection requires `--run --browser-released`; hardware additionally requires `--nonexclusive`. In a shared checkout these flags require an explicit coordinator release. CPU-only collection requires no GPU release and cannot pass the browser comparator. The current wrapup authorizes no further hardware/art/optimization cycles.

For future authorized comparisons, use two exact clean checkouts with locked dependencies and newly chosen production output directories:

```sh
npm ci
npm exec vite -- build --base=/ --outDir=output/performance-build
```

Keep build logs/provenance and exact source/build fingerprints. Never rebuild another owner's measured output. Use one frozen trusted harness and one Playwright package for both trees. Each preview must use the same Vite version, root base, caching/compression method and headers. Supply `pair.mjs` with `--base-root`, `--head-root`, `--base-build`, `--head-build`, `--base-url`, `--head-url`, full `--expected-base`/`--expected-head` commits and a new exclusive session/output directory. Hardware requires the exact installed Chrome executable via `--browser-executable`; its actual launched bytes are hashed. Missing binaries fail without fallback. An explicit local `--allow-dirty-head` labels exploratory evidence and cannot certify clean committed inputs.

Hardware uses five repetitions per side in AB/BA/AB/BA/AB order. Software CI uses three. Each repetition measures cold/warm loading, seven 5+20-second frame/renderer-thread CPU scenarios and four menus before peak-memory sampling. The existing 24 transitions are followed by a sequential fresh memory-only browser for cold/warm startup, five builds and four habitat entries: all 35 non-GC windows are independently validated. No sampler runs during timed frame/CPU windows and no requested GC occurs inside sampled windows. Strict within-run resource count/byte plateaus and disposal checks remain separate from finite cross-commit allowances.

Only owned browsers/servers close; external previews stay with their owners. Exclusive output reservation prevents overwriting old evidence. Failed preparation, interrupted repeats, closure/finalization errors and inconclusive comparisons remain nonpassing evidence. A process exit, manifest and final browser closure are required before returning physical ownership.

## Saved evidence and retention

The completed formal session compared baseline `79da54b` with clean head `6acc82a`, using measured harness `becefdd0…`. It ran **03:57:52.671Z–05:13:42.268Z**, 75m49.597s; collector exit was 1. All ten repetitions and all 20 owned browser sessions closed with unchanged identities and zero collection errors. Gibbs independently validated coverage/RSS/resource plateaus and reproduced the 319/1/6 verdict. The later software-fixture harness `367ba2b5…` has no inherited formal hardware pass.

Canonical raw records are lossless deterministic gzip files in `benchmarks/accepted/formal-hardware-base79da-final-01/`. [formal-retention.json](formal-retention.json) records exact raw/gzip hashes, byte counts, comparator-dependency identities and the post-audit retirement ledger. Both decompressed byte identities and every recomputed comparator field matched. The two compressed records total **4,312,914 bytes**. Only 12 verified aggregate/duplicate-repeat JSON files were discarded: **163,913,091 logical bytes, zero skips**. All raw samples remain in the canonical gzip records. Saved manifest/comparison/summary and settlement-time retention report remain unchanged; the separate ledger describes subsequent compaction of **failed**, not accepted performance evidence.

The parent promoted exactly seven verified final artifacts into `benchmarks/accepted/formal-hardware-base79da-final-01/` and independently rechecked hashes, decompression and all comparator fields. “Accepted” denotes evidence retention, **not a passing performance result**. Unsettled `benchmarks/records/` remains ignored; never add all pilot diagnostics. After the independently audited replacement, 13 superseded pilot/setup groups were retired: 43 files,114,784,522 logical bytes,zero skips. Their exact raw hashes, truthful outcomes and inventory digest appear once in [pilot-retirement.json](pilot-retirement.json). The parent subsequently closed both historical CPU proof purposes:24 files(including the fairness helper)/four directories,total6,108,098 logical bytes retired,zero skips. Exact diagnostic numerical outcomes,source/harness/raw hashes and limits remain in that ledger; perturbed CPU profiles are not causal heap evidence. No old record directory is overwritten by another run. The parent also disposed final root/published/baseline builds and the temporary baseline source and closed both local previews at05:39:02.817Z. No local measurement, temporary dependency or physical work remains; only the final hosted cycle is pending. Canonical raw, durable build inventories and Git79da54b/6acc82a preserve the completed scope.

Re-evaluate the compressed records using the unchanged canonical comparator and policy. This temporary directory self-cleans; exit 1 is expected for the recorded failure:

```sh
(
  perf_evidence_tmp=$(mktemp -d)
  trap 'rm -rf "$perf_evidence_tmp"' EXIT
  gzip -dc benchmarks/accepted/formal-hardware-base79da-final-01/base.json.gz > "$perf_evidence_tmp/base.json"
  gzip -dc benchmarks/accepted/formal-hardware-base79da-final-01/head.json.gz > "$perf_evidence_tmp/head.json"
  node scripts/performance/compare.mjs --base="$perf_evidence_tmp/base.json" \
    --candidate="$perf_evidence_tmp/head.json" --out="$perf_evidence_tmp/comparison.json" \
    --summary="$perf_evidence_tmp/summary.md" \
    --expected-base=79da54bdbd029090d4ed9d6fd3dd2caea1a4847c \
    --expected-head=6acc82a545a59d643b7649957bc39bf9cb02bb63
)
```

Do not widen thresholds after failure or pool incompatible procedures. Existing automatic sidecar cleanup only follows a fully verified passing settlement; failed evidence required the explicit independent audit and separate disposition above.

## PR enforcement and limits

`.github/workflows/performance.yml` resolves the actual base branch tip and exact PR head, builds both with locked dependencies, and runs base-owned collector/comparator/policy on one runner. Tests run from the trusted tools checkout. It supports `merge_group` if a queue is enabled without requiring one. Software uses the base locked Playwright Chromium with explicit SwiftShader and `playwright install --with-deps chromium`; missing capability/coverage or non-SwiftShader rendering fails.

The harness-free legacy base has one explicitly authorized bootstrap: repository variable `PERFORMANCE_BOOTSTRAP_BASE=79da54bdbd029090d4ed9d6fd3dd2caea1a4847c` must match the exact resolved base. Candidate tools then measure both inputs with a visible bootstrap disclaimer. Review all control changes and remove the variable after the first main merge; there is no fallback for another harness-free base. No cached measurement becomes the next baseline.

The first hosted attempt, run `38022325442`, failed before complete coverage because the Low960x600 home buoy projected behind the raft under the Gather HUD. The software-only facing fix addresses that input preparation. One final hosted cycle is pending coordinator commit/push and review. Its result cannot erase the separately failed formal hardware gate. The first artifact is parent-verified and expires 2026-11-09; it was not downloaded or duplicated here.

CI retains final raw aggregates or partial diagnostics for 30 days, cancels superseded runs and has a 90-minute blocking timeout. The completed ten-repeat hardware pair took 75m50s; six repetitions imply roughly 45.5 hardware-equivalent minutes before preparation. Complete hosted installation/build/SwiftShader cost is still unmeasured, so 90 minutes remains unproven. Timeout cannot pass. Software relative gates do not certify hardware FPS.

Strict required `build` and `Performance regression gate` checks on main, including admin enforcement and disabled force pushes/deletion, are coordinator-configured and GET-verified; see [branch protection](../governance/branch-protection.json). Candidate workflow edits can still alter a named check, so this is accidental-regression enforcement rather than tamper-proof CI.

Physical measurements used human-approved fixed60Hz on the built-in display, with the secondary Dell untouched and other user applications open: scope is nonexclusive. The parent verified restoration to **ProMotion** after every owned browser closed; [closure record](../governance/final-session-closure.json) preserves that observation. No physical VRAM measurement is claimed. Geometry-buffer/RGBA estimates, owned-process RSS and sampled heap/backing data have distinct scope; bounded polling can miss fast spikes and plateau checks do not prove universal absence of leaks. Final independent art assessment is **88.5/100; target95 unmet**.
