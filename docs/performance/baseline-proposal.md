# Baseline proposal and evidence status

This document proposes the formal matched procedure and describes preserved observations. It is **not** a completed formal hardware comparison or an approval of current art/source changes.

The coordinator's original `benchmarks/records/baseline-79da54b.json` has three repetitions of Follow and moving dive, with 5-second warmups/20-second samples, on the unchanged legacy production build. It remains an honest limited reference. Extended records use new names and never replace it. The immutable source snapshot for legacy CPU attribution is `/private/tmp/tidekin-performance-baseline.qav8rw`, from exact commit `79da54bdbd029090d4ed9d6fd3dd2caea1a4847c`; root `dist/` remains separately coordinator-owned.

## Preserved exploratory attempts

| Record in benchmarks/records | Outcome and scope |
| --- | --- |
| baseline-79da54b-extended.json | Local-socket fetch failure, no browser runs; failed attempt |
| baseline-79da54b-extended-02.json | Missing bundled Chromium; no runs; failed attempt |
| baseline-79da54b-extended-03.json | Reached scenes, then invalid discovery/unlock fixture rejected; partial failed attempt, browser closed |
| baseline-79da54b-extended-04.json | One exploratory repeat, seven frame scenarios, five constructions, four menus and 24 transitions; owned browser closed, no recorded browser errors |

Failures are retained as diagnostics rather than rewritten as completed measurements. No failed/partial record can satisfy enforcement.

Extended 04 ran from 2026-10-09T20:11:49.992Z to 20:17:43.599Z, 353.6 seconds, with Chrome 154.0.8037.98, Apple M4 Pro through ANGLE Metal, High 1440×900 DPR1. Other user applications remained open: hardware scope is **nonexclusive**. Source/build hashes were unchanged and served files matched the inventory. Exact identities belong to the raw record:

| Fingerprint | SHA-256 |
| --- | --- |
| Focused source inputs | b4b7913259f2d59a26af230e4fc5926f097e16c0835dce1683172be21e55a606 |
| Build inventory | 17c974dc30535f00582c4d26e725137f8711fa65c7f960869584a3f982153e0a |
| Harness at collection | a0cb8c7ed60c5408941a9d283a2d9e9a0c6b9215c951acf75ca9e140036ae244 |
| Policy at collection | 8f2f650b0f34ed82095f9b1c2aa088344b380dc28cf33a66088a943137851c3c |

Observed legacy shipped total was 71,235,044 bytes, assets 70,417,148, raw JS 774,327 and deterministic gzip JS 215,814. The large unused SVG wrappers and two atlas paths explain why shipped size and startup transfer need separate accounting; their proposed removal/unification is coordinator-owned source work, not an observed result of this record.

Cold menu readiness was 43.6 ms, click-to-ready 244.6 ms, network encoded/decoded/transfer totals 14,801,950 / 15,391,850 / 14,805,550 bytes. Warm readiness was 33.4 / 211.6 ms, with the same encoded/decoded totals and 3,600 transfer bytes. Frame interval medians were 16.7 ms across all seven scenarios; p95 ranged 18.1–18.3 ms, with no >50 ms intervals. These are one-repeat observations, not variance estimates or CPU/GPU execution durations. Resource counters plateaued over the 24 sampled transitions; this cannot establish absence of all leaks.

Extended 04 predates mandatory window-local CPU evidence, raw backing-storage retention, startup/transient sampled-memory windows, exact turnaround events and final launch/settlement corrections. Three dive checkpoints peaked just below 12 m because the 200 ms sampling missed a brief peak; the later physical-turn event records address that collection precision. Do not backfill inferred depth/CPU/heap values or run this record through the final policy as if compatible. Its `exploratory` flag and one repetition explicitly prevent a formal pass.

## Proposed formal record

After the coordinator accepts visuals and explicitly releases browser ownership, freeze the harness/policy and the exact candidate source/build. Use the same external Vite production-preview method/root base for baseline and candidate. Preserve observed build provenance, exact byte inventory and source input fingerprints. Run one `pair.mjs` session with alternating AB/BA order, five hardware repetitions per source and all [protocol scenarios](protocol.md), with fresh cold and same-context warm loading per run.

Collect the 35 named non-GC sampled-memory windows plus separate post-GC payloads/backing/RSS, window-local renderer CPU, physical dive progress, all habitat inside/outside counts/byte estimates, construction/menu behavior and 24 sustained cycles. Unsupported physical VRAM remains explicit. No other agent browser overlaps; user applications still mean nonexclusive GPU scope. Close the owned browser before returning ownership, leaving externally owned preview servers running.

The formal pair should produce base/head raw records, temporary per-repeat recovery sidecars, final stage manifest, comparison JSON and readable gate summary. Any failed preparation, invalid fixture/sample, browser/shader error, changed source/build, noisy timing or cleanup failure yields fail/inconclusive and retained diagnostics. No acceptance is implied by successful collection alone.

The first hosted PR should then exercise the explicit legacy bootstrap, same-runner software pair, artifact upload and required check. It needs no hardware claim. A successful local CPU test/static workflow parse does not replace that end-to-end run. The coordinator has already verified main's required checks in [the protection record](../governance/branch-protection.json).

Historical refresh cadence and headless/software captures remain separate. Report matched hardware and software results under their actual profile names, and avoid claiming exclusive GPU use, exact VRAM, universal leak freedom or measurements of changed-but-unbuilt source.

## Retention after stronger evidence

Keep current raw attempts unchanged until the coordinator authorizes disposition. Once complete verified fresh five-pair evidence supersedes them, the original narrow three-repeat baseline has historical scope only: preserve a compact purpose/outcome/SHA entry rather than redundant raw data. Setup failures with zero runs need only a compact failure/outcome/hash ledger. Resolved partial entry/fixture diagnostics and their duplicate sidecars can retire after the new validated pilot/formal pair, with exact unchanged-file authorization; no archive folder is proposed. Final fresh base/head aggregates retain every raw run, comparison, summary and manifest. Select those final records deliberately rather than committing the entire records directory.
