# Benchmark evidence

`scripts/performance/` collects production loading, frame/renderer CPU, geometry/resource lifetime, sampled transient heap/backing storage and owned-process RSS. [Protocol](../docs/performance/protocol.md) defines coverage, profiles, gates and limits; [operator guide](../docs/performance/README.md) describes invocation. A new comparison measures both exact commits on the same runner rather than reusing cached timings.

`records/` is ignored, unsettled verification: exploratory pilots, failures and active paired collection. Preserve raw statuses and identities until a verified replacement and coordinator-approved exact disposal ledger close their purpose. An exploratory repetition cannot pass formal acceptance.

Accepted evidence is promoted deliberately to `accepted/<session>/`: compact comparison/summary, source/build/control/browser/environment identities, raw and compressed SHA-256/byte counts, and deterministic `gzip -n` raw aggregates. Verify decompression produces the original raw bytes, then rerun the unchanged comparator on self-cleaning temporary decompressed files. Compression does not change the collector or comparator. Preserve limitations and failed/inconclusive outcomes; no score or status may be rewritten during retention.

GitHub Actions retains the exact raw or partial diagnostic artifacts for 30 days. Record the run URL, exact head/base, artifact identity and disposition in accepted metadata. Required checks block material regression, invalid/missing coverage and inconclusive comparisons. The first hosted run and formal hardware comparison remain pending in this iteration; this file records the procedure, not a successful measurement.
