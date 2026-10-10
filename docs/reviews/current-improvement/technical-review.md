# Independent technical review — final13 disposition

10 October 2026. Baseline: `79da54bdbd029090d4ed9d6fd3dd2caea1a4847c`.

**Formal hardware acceptance is FAIL and merging is blocked.** Independent review reproduces all326 gates exactly:319 pass, one fresh-home-entry heap gate fails, six are inconclusive. All ten raw runs, clean commit/source guards, coverage, recorded closures and strict resource plateaus validate; this is a measured candidate regression, not missing evidence. No new production save/disposal or formal-record integrity defect was found. The later software-only steering patch’s input-cleanup finding(TR-S1) is addressed in the focused re-review below. Candidate `6acc82a545a59d643b7649957bc39bf9cb02bb63` remains frozen; no additional art, hardware cycles or speculative optimization is authorized. Art owner’s final assessment is **88.5/100**, including4/5 resource points: **95 is unmet**. Historical84.5/95 described the earlier assessment before resource scoring. Hosted/software CI remains separate and pending.

This reviewer independently evaluated persistence/startup, resource ownership, performance controls and the named CPU/retained-record evidence below. Runtime, persistence, art and performance authors are separate owners. Coordinator full-suite/catalogue/final-QA results are owner evidence, not reviewer reruns or visual approval. Hashes bind reviewed snapshots, not future changes. This final review edits only this report and runs the14 focused CPU entry tests; no source/test mutation, builds, browser/GPU, commits or pushes.

## Required wrapup

1. Keep the settled hardware comparison **FAIL**, retain its raw evidence and keep draft PR1 unmerged. Six inconclusive gates also prevent acceptance; passing hosted software CI cannot override hardware failure.
2. TR-S1 is addressed and its focused CPU re-review passes14/14. Hosted/operator software smoke, artifact retention and required-status execution remain owner work and unverified here. Hardware policy/semantics and historical FAIL remain unchanged.
3. Finalize honest PR/results and cleanup within the user’s wrapup scope. Final QA is coordinator-complete; clean6acc and final-root file hashes/level9 recompression are now independently verified below. No selective allocation/art revert is demonstrated by these records. Do not advertise a fix or a passing unmeasured revert; do not widen thresholds, omit required tails or authorize another cycle through this report.

No new optimization or generic ownership redesign is proposed. These are outstanding validation requirements, not newly established runtime defects.

## Accepted architecture and defect dispositions

| Finding | Disposition and independently checked behavior |
| --- | --- |
| TR-C1 · P1 · Failed startup could authorize/write candidate saves | Addressed. Prepare creates detached state; loading blocks saves through staged settings, resize, first render and UI callbacks. Commit must return success before save authorization. Cancel restores prior state identity, scene promise and UI ownership. Real persistence/load-profile plus actual-main VM checks preserve the exact 42-wood save and healthy/partial-dive references; later autosave cannot write the failed candidate. |
| TR-C2 · P2 · Failed worlds could remain live or leak construction resources | Addressed in reviewed CPU paths. New failed scenes dispose once and restore the healthy predecessor. Failed restoration of a reused scene quarantines/disposes it and inhibits saves. Constructor ownership covers surface roots, fulfilled GLTF templates, detached popup textures and separate cleanup world; actual createScene onReady failure and successful shutdown checks release these resources. |
| TR-P1 · P2 · Fingerprinted binary could differ from launched binary | Addressed. Actual launch uses the fingerprinted executablePath; positive/failing launch adapters check this and owned cleanup. |
| TR-P2/P3 · P2 · Outer or late settlement could leave false PASS | Addressed. Preparation/run/cleanup/artifact failures retain durable failed evidence and attempt remaining cleanup. Write/readback failures poison writable dispositions; unchanged missing sidecars can recover, mismatches/symlink targets remain untouched, unwritable evidence fails explicitly. |
| TR-P4/P5 · P2 · Memory coverage could omit peaks or underwater progress | Addressed controls; formal cost outcome fails.35 named no-requested-GC windows cover 24 transitions, cold/warm startup, 5 builds and 4 entries. Atomic requested-active state/frame checkpoints occur after entry and before exit; zero/stalled or misplaced counters reject. |
| RSS membership/retry and orphan-copy tracking | Addressed. Ownership is re-enumerated around complete RSS reads; a live unreadable PID fails. Up to 3 complete retries fit 700ms, raw attempts and earlier complete peaks survive. Generic geometry-copy receivers register before population; identity deduplication and prototype restoration detect orphan leaks/double disposal. |
| Earlier home geometry count regression | Formal final observed count296→319(+23≤32) passes unchanged finite allowance. Earlier347 remains a historical failed representation; count acceptance does not override the failed formal heap gate. |

Persistence keeps unreadable storage distinct from corruption: replacement of unknown/existing bytes requires confirmation; cancellation writes nothing. Changed external bytes, including deletion/corruption, reject saving. Unchanged authorized bytes can recover after a transient storage failure. Web Storage compare/write is not atomic. No confirmed paused-input or structuredClone-overhead regression was found. First-render await is a microtask boundary, not proof of RAF/input interleaving; loading remains inhibited through setup.

Resource release deduplicates shared geometry/materials/textures, including shader uniforms, detached popup textures and template sources. Cleanup flattens material arrays for all eight character tint/shadow hooks. Independent CPU evidence includes 21 startup lifecycle checks, 2 actual constructor checks, real module teardown, material-array host coverage and meaningful failure injection. This is not browser acceptance or recovery certification for unreachable allocations inside a throwing third-party constructor.

## Performance control integrity

The frozen harness enforces base-owned policy, exact source/build/fixture/binary/version/renderer/session identity and sequential owned browsers. Raw window-local CDP ThreadTime/Timestamp supplies renderer-thread CPU; it is not total process CPU. All six loading phases are required except for verified clean literal 79da legacy input; dirty/extra source cannot claim that exemption. CI builds both actual checkouts; independent source/build inventories alone do not prove a fresh source-to-build relationship.

Timed 5+20-second scenarios finish before peak sampling. Heap/RSS polling waits at least 100/250ms after responses, includes a one-second tail and initial/final coverage, and keeps 1,000ms request/gap bounds plus 120-second operation deadlines. Requested-GC scopes cannot overlap peak/timed scopes. Unresolved sampling is undrained/failed and bars later work; required reader failures cannot become unsupported PASS. Per-window maxima and raw RSS units/membership/sums are recomputed. Missing-live, forged retry, dropped peak, changed capability, late artifact and missing progress controls reject.

Finite gates stay unchanged: cross-commit geometry/live 5% or 32, materials 5% or 4, textures 5% or 2; estimated storage 10% or 1MiB. The permitted delta is **max(relative,absolute)**, not their sum. Same-site/same-phase post-fixed-warmup count/backing plateaus, zero remaining/double disposal and idempotence remain strict. Heap/backing allowances 15% or 8MiB and RSS 15% or 32MiB receive matched-repetition noise/agreement checks; inconclusive fails. Baseline 215,814 B gzip allows 220,130.28 B: integer 220,130 passes and 220,131 fails.

Independent control evidence: earlier 72/72 performance tests, 5 focused habitat-progress tests, 10 RSS tests plus 5 focused sampler/comparator tests,56 zero/stalled injections across all 28 habitat windows, six boundary guards and complete-record positive/negative retry/settlement replays. These are staged focused acceptances, not a claim to rerun the author's whole final suite. Surface entry uses real 6m stand-off, domain range, projected hotspot/raycast-winner and bounded diagnostics; CPU adapters do not certify browser input/compositor behavior.

The workflow's bootstrap permits candidate tooling only for exact legacy base plus the explicit admin variable; it is not protected-base-policy certification or inferred human approval. Retire bootstrap after the first harness-bearing main merge. Retained protection configuration reports strict build/performance statuses (appId15368), admins enforced, no force push/delete and no mandatory reviews. Hosted execution remains pending. Ordinary CI protects against accidental regressions; candidate workflow tampering is the accepted limitation. No sole-owner self-approval requirement, new collaborator or organization security flow is imposed.

## Settled formal hardware comparison — independently reproduced FAIL

Reviewed the full raw aggregates, comparison and closure manifest before lossless curation. Canonical evidence is now retained as [base gzip](../../../benchmarks/accepted/formal-hardware-base79da-final-01/base.json.gz), [candidate gzip](../../../benchmarks/accepted/formal-hardware-base79da-final-01/head.json.gz), [comparison](../../../benchmarks/accepted/formal-hardware-base79da-final-01/comparison.json) and [closure manifest](../../../benchmarks/accepted/formal-hardware-base79da-final-01/manifest.json). The [durable retention disposition](../../performance/formal-retention.json) records coordinator verification at05:29:14.970 UTC: decompression preserves both reviewed raw SHA-256 identities and unchanged comparator plus false pair-wrapper metadata reproduces all fields. This reviewer independently checks compressed byte/hash identity and all five retained metadata identities at this handoff; the prior complete raw audit remains the coverage/gate review. The directory name accepted means verified retention, **not performance acceptance**. Five runs per side satisfy unchanged hardware POLICY. Actual validateRecord accepts both originals; compareRecords reproduces every stored check/error/identity, with pair's explicitly false dirty-head annotation separately verified. Independent arithmetic also rederives the seven non-pass medians, MAD/spread/noise, paired agreement and verdicts. No test-suite repeat, browser/renderer or collection was run.

Both sources are clean/matchesCommit=true and match exact requested79da/6acc commits. Before/after inventories and harness are exactly equal;127 inventoried source blobs are independently checked against actual Git tree/blob bytes, size and SHA. All ten repeat sidecars equal their aggregate runs. Manifest22 preparation/run/verify/close/finish stages are complete/errors[]; fail status matches comparison. Recorded global monotonic intervals independently confirm alternating B1/H1,H2/B2,B3/H3,H4/B4,B5/H5 with no cross-run overlap. Same host/session/harness/policy/fixtures/Chrome binary/version/launch args/graphics/serving signatures validate. Hardware remains nonexclusive of other user applications.

| Full raw integrity/coverage check | Result |
| --- | ---: |
| Recorded interval / elapsed |03:57:52.671–05:13:42.268 UTC /4,549.597s(75m49.597s)|
| Repetitions / scenarios / peak windows |5+5 /70 /350|
| Transitions / builds / menus / post-GC scopes |240 /50 /40 /260|
| Heap samples / peak RSS snapshots / PID rows |20,518 /8,426 /60,802|
| Maximum gap / outer request / inner RSS latency |532.111 /429.578 /135.121ms|
| Minimum required tail / active habitat advance |1,013.368ms /30 frames|
| Verified turnover / recorded owned browser closures |0 /20|
| CPU observed base→head / remaining / double disposal |431,045→297,922 /0 /0|
| Strict count/backing plateaus / idempotence |pass /pass|
| Recomputed gates pass /fail /inconclusive /unavailable |319 /1 /6 /0|

Every35-window round, all28 active-habitat entry/transition scopes per run, raw RSS attempts/units/membership/sums/peaks, loading/readiness/foreground/network checks and timed/no-GC/drain boundaries validate. Twenty timed/fresh owned-browser closure flags and ten final cleanup flags are true; separate OS close timestamps are not available. Resource-lifetime plateau/zero remaining is evidence against the tested leak seams, not evidence that transient peaks are acceptable.

**TR-F1 · P2 · Confirmed fresh home-reef entry peak-heap regression; merge blocker.** Base median42,574,900 B(40.602589MiB) rises to69,358,920 B(66.145821MiB): **+26,784,020 B/+25.543232MiB/+62.91%**. Unchanged max(15%,8MiB) gives ceiling48.602589MiB. All5/5 paired deltas exceed both predicates; MAD ratios1.259%/1.215% and spreads5.576/7.294MiB are within noise bounds. This is fail, not inconclusive. Reproduction is the retained fresh-memory-browser entry/home-reef window on clean79da versus clean6acc, after that browser's startup/build work, including its required one-second tail.

| Matched repetition | Base peak MiB | Candidate peak MiB | Delta MiB |
| --- | ---: | ---: | ---: |
|1|40.196|66.950|26.754|
|2|45.667|66.146|20.479|
|3|45.545|66.497|20.951|
|4|40.091|59.700|19.608|
|5|40.603|59.655|19.053|

Candidate maxima in repeats1–3 occur402–508ms into the operation tail; repeats4–5 occur during entry. Baseline also peaks in both phases. Tail is declared coverage and cannot be removed to pass. Natural-GC usedSize includes retained/transient JS heap; no allocation/GC-reason stacks or isolated feature measurements establish an allocating function. Combined changes include character, batching/storage/cache and lifecycle work. **No bounded cache/character/helper revert is causally evidenced as a remedy.** Prior exact-fidelity/allocation proofs remain valid but do not close this relative peak failure. A blanket measured-baseline fallback is a different product decision, not a demonstrated selective fix; this reviewer performs neither a revert nor a new measurement.

| Other non-pass gate | Base→candidate median | Reason |
| --- | --- | --- |
| cold/menuReadyMs |54.1→58.9ms|base MAD15.6% exceeds15%; no paired regression|
| transition1/home heap |39.486→59.474MiB|exceeds median allowance, only3/5 paired agreement;4 required|
| transition8/wreck heap |62.397→63.111MiB|baseline spread32.881MiB exceeds32MiB bound|
| transition20/wreck heap |58.413→65.626MiB|baseline MAD18.11% exceeds15%|
| entry/cove heap |98.741→90.955MiB|baseline spread58.345MiB exceeds49.370MiB bound|
| entry/pearls heap |79.191→58.301MiB|candidate MAD24.39% and spread49.005MiB exceed bounds|

Lower medians in noisy windows are not passes. Formal transition11/pearls and transition20/wreck do not inherit earlier one-repeat warnings as failed verdicts; current results supersede those diagnostics, while inconclusive still exits nonzero.

All size/resource/storage, panel, renderer CPU/frame, hardware absolute frame budgets, backing/RSS peaks and final post-GC gates pass. Head frame median maximum16.7ms/p95 maximum18.5ms across35 scenarios meets20/33.4ms limits. First-three CPU medians123.229/124.430/129.170→129.091/125.797/123.869ms/s pass unchanged20%/20ms/s gates; passing CPU does not compensate for heap. Home geometry296→319 remains bounded. Home inside attached geometry bytes90,529,700→27,832,880 and final post-GC heap12,648,768→13,087,232 pass; these distinguish retained backing/lifetime from the failing transient-window heap.

Independently reread all13 final-root files and level9-recompressed JS/CSS: root digestb3a27de3,784,278 raw/219,674 gzip,456.28 B headroom below220,130.28 ceiling. Published219,686 remains coordinator evidence, not a new reviewer artifact reread. Final source/build relationship is coordinator build provenance plus actual clean source and retained served/build guards; no independent build was executed. Baseline source is Git-verified; baseline build inventory/serving proof validates, but baseline files were not all reread during this pass.

Historical final13 pilot coverage passed, with five diagnostic heap warnings; it remains exploratory and does not substitute for this formal failure. No new art/hardware cycles, speculative optimization, threshold waiver or silent warning removal is recommended. Sampled spikes/isolate scope/shared-page RSS/non-atomic PID sums/pre-CDP launch/physicalVRAM limits remain explicit, without invalidating the stable5/5 heap failure.

### Later software-only surface-entry steering review

Reviewed fixed browser.mjs SHA256 `93ce073dc97adcc996890f4d4c763c01b581438c437a622996a6192050689221` and test SHA256 `1f102649f653ef2370293812a63130e2783d1af40d9c388fcaca3923f2df9d0b`. Independently ran **14/14 performance-entry CPU adapter tests** from repository root. They execute actual scene camera/projection/raycast, domain steering and main pointer handlers with inert rendering/DOM delivery: software Low960×600 home/cove entry, unchanged raft position, overlay rejection, post-registration key-down rejection, wait rejection, stalled steering and original hardware input all pass. Tests/source hashes are unchanged after the run. No actual software browser smoke was run by this reviewer.

The branch runs only for profile ci-software, turns with normal A/D at rest, uses finite60-iteration/6,000ms requested-hold budgets with a10-second clock check, and records facing diagnostics. Original nearest/range/paused preconditions, actual interactive projection, DOM reception, hover-title winner, one click and5-second actual-entry guard remain intact. Removing only the software branch and profile plumbing reconstructs frozen6acc browser.mjs **exactly**, independently rechecked at this fixed hash; hardware awaits/input/guard path is unchanged. Policy source4de058e4, comparator03debe32 and workflow50224ea9 are unchanged. Later software controls have their own fingerprint; formal hardware records retain becefdd0.

**TR-S1 · P2 · Addressed:** both keyboard.down and its hold wait are now inside try/finally-up at lines75–76. The meaningful new test first registers the key, then rejects down; it verifies exactly down/up, zero held keys, zero clicks/actions and rejected entry. Wait-throw and finite stalled-turn tests also verify release. A release rejection still fails the operation and outer owned-browser cleanup remains responsible; if both operations reject, finally can mask the primary error. That is a diagnostic limitation, not a remaining false-PASS or cleanup-attempt bypass, and no further blocking change is requested within this wrapup.

Coordinator reports307 full tests and catalogue36 passed **before** this bounded guard fix; this reviewer does not claim that suite covers the later patch. The durable [production equivalence record](../../governance/final-runtime-equivalence.json) records measured source d5c0192a/root b3a27de3/published5d424186 unchanged and distinguishes later software controls from measured becefdd0. Its reviewed SHA256 is `9ef27309213f7f8ce99e7bd3a511b25a9b990c227f00a45238911315ccd452aa`; this is owner provenance, not another reviewer source/build collection.

Hosted/operator smoke remains owner work; canonical gzip/metadata retention is now linked and verified above. Passing software checks cannot pool with hardware, overwrite its FAIL or permit merging. No runtime/owner-patch/test mutation, browser launch or new hardware cycle by the reviewer.


## Reef and character CPU fidelity

Latest reef model passed12/12 targeted tests. Typed merge preserves ordered position/normal/color and uses the installed Three width rule: maximum 65,534 uses Uint16; 65,535 uses Uint32. It avoids 9,927,840 generic numeric-index entries across the four habitats, without asserting physical JS bytes saved. Generic BufferGeometry registered before copy avoids default primitive reconstruction; direct Float32 paint avoids the 204,363-value boxed-color test allocation and second typed copy. Original sources stay attached until every copy/merged geometry/Mesh is staged successfully.

Independent actual four-habitat comparisons cover 1,232 meshes, 3,464 retained ordered-attribute hashes and 2,464 exact local box/sphere checks. Immutable79da retained attributes, materials/groups, transforms and ordered triangles match, except 232 explicitly reviewed untextured fin UV omissions. Against the pre-cache5a oracle, **every final raw attribute/index array, topology and bound matches exactly**. Historical oracle identities below bind these outcomes; retired temporary modules are not required source dependencies.

The sculptor-private cache has exactly six undeformed sphere pairs 16/10,9/6,6/4,20/12,12/8,7/5; deformed stone/scallop sources remain individual. A 105-mesh colony uses 3 source spheres instead of 105. Two differently colored colonies share 3 sources across 210 originals. Second-material index failure disposes all 212 temporaries once while preserving original identities/sources/materials. Retry commits and disposes sources once; cache clearing makes the next colony allocate 3 fresh sources. First-add/borrow/populated-copy/second-Mesh failures preserve ownership; final/repeated release is once/zero. This proves allocation mechanisms and fidelity, not isolated physical benefit.

Final character13 passed 7/7 targeted grouping tests with unchanged helper 6cd5. Actual 22 meshes/geometries, 37 groups, eight materials, 15,340 triangles and 441,924 attached buffer bytes are reproduced; finite attributes, valid indices/indexed unit normals, idempotent batching and once-only release pass. Generic helper copy and host material-array behavior retain their prior focused acceptance. Shared solid silhouette preserves actual fish fin position/normal/group/bounds at 12 samples, character 8; materials use no UV maps and omitted UVs are explicit.2/2 shared-fin checks and actual capability/scene cleanup probes passed previously.

Character13's internal pelvis translation/roll stays inside host-owned heading; ankle compensation subtracts translation before inverse attitude. Water calls neutralize pelvis/chest/shoulder offsets. Independent12→13 comparison matches 315,840 existing-node world-matrix values exactly across seven water poses; three host headings /120 deck frames keep ankle/knee matrix deltas ≤1.78e−15/8.89e−16. Another 135,360 mixed-call transform values are finite and preserve host root position. Twelve unchanged mesh blocks and all five Canvas groups match ordered arrays. Face directions 44.908°/42.360° reproduce at authored camera coordinates; changed cheek/jaw/cap/waist shapes require native judgment and do not claim pixel equivalence. One extra Group adds a transform node; no per-frame allocation, capability, material, texture or draw group is added.

## Compact historical and cleanup outcomes

Earlier save/scene and TR-P1–P5 defects remain addressed in their named scopes. The first RSS pilot remains failed; its ps error did not establish PID disappearance. A later actual arrival-only retry retained two complete sums(1,238,253,568→1,245,724,672 B); it proves membership retry, not physical missing-PID or higher-earlier-peak recovery, which remain CPU-test evidence. Earlier profile measurements were perturbed diagnostics; the347-geometry representation failed. Earlier gzip failures stay failures; an earlier written artifact was independently recompressed successfully. None of these outcomes confers final13 formal acceptance or requires old scratch/raw paths in this report.

User-authorized reviewer cleanup retired 5 exact regular temp files /45,647 B, zero skips and no author files, after immediate type/size/SHA re-verification. All three author Candidate12 comparison-module holds are released. Applied ledger SHA256: `f0c8e369c10ca9dc4d95e279e88715652ccf7d4a211e6a314813bc186bfbd4e8`. Retired12 outcome SHA256: `27146511f9b52427f116be3958ff6391beff646573bf41ec7e0896d6c92960c1`; retired13 outcome SHA256: `459934d9dfb79a357807c7a0c671b47429a1744f72a31ef8c4c85c2ab6404a7e`. Prior same-art helper comparison matched 66 attribute arrays /46,020 indices/groups/bounds and 135,360 matrix values; its representation digest is `40bc28557b6c023a0eb0e2c714d8b35952cbe07c659c77757aa730ea1dcd9167`. Outcomes are consolidated here; deleted probes are not required to remain available. Other owners execute their own cleanup ledgers.

Final reviewer-only cleanup separately retired **2 regular files /9,995 logical bytes /0 skips**, without double-counting the earlier5-file/45,647 B batch: old `tidekin-character-reviewer-cleanup-ledger.json`(2,301 B, SHA256 `f0c8e369c10ca9dc4d95e279e88715652ccf7d4a211e6a314813bc186bfbd4e8`) and bounded `tidekin-software-entry-review.mjs`(7,694 B, SHA256 `32fa406ccf00810051dda0b68b7f071739ba80c0f02543d6eeadeeb079e58a7a`). Exact two-entry inventory digest: `3ab295997d1ab15a21ebb942ae4d94c440bcebb473b87abd24c013e45c64f85f`(SHA256 of sorted-key compact JSON). Applied outcome: both removed and absence confirmed after directory-relative no-follow open, regular type/size/hash and immediate inode/timestamp re-verification. No separate reviewer software log was present; probe output and accepted14/14 disposition are already retained above. No other owner files were touched, no tests rerun and no new temporary ledger created. Reviewer is idle.


Asset-report migration has no identified defect: ignored output/assets/build-report.json is diagnostic; --only freshly inspects the other GLB and does not consume stale reports. Previously authorized four exact asset retirements preserved required sources/references. No catalogue rerun or author-ledger deletion was performed by this reviewer.

## Reviewed input identities

These bind the settled clean6acc/79da formal comparison and unchanged reviewed13 components. The earlier dirty pilot identity is not substituted into formal guards; later edits require their own provenance. Harness fingerprint covers maintained performance modules, not tests/dependencies/workflow. Formal source bytes were checked against their actual Git commits; no runtime source mutation or new test suite was performed.

| Input | SHA-256 |
| --- | --- |
| Formal clean6acc source inventory |d5c0192adc04f9d034d300f7997709c5b4bb99c9c953ba0e2090b1c0276a2acf|
| Formal clean baseline source inventory |03da6b4709db3f6326e1917d2b68849b3ed44d1a4bea43a3e0f3805a321eb742|
| Final13 root build inventory |b3a27de3c4570a35df65e4b30df94d0ca12855a0710ca3ea68f87a3a8e971e8b|
| Formal base raw record |211a4c320a765eed0ee66a73b5443e9a4b8aaacb9316ef885005ff278ff52a24|
| Formal head raw record |eb82085a8356c29199261a79121a0a72a6c822d35d8cb2ad0a336c79abf67bda|
| Formal comparison |c2abf9d138375dd7bbc03fe4953575dc9a6b9fe53e5e582a6ee1c420d62d91bc|
| Formal manifest |63088c491f6809d33afa0bcb4341cc5a7724dd05f61e93944104179d9f942436|
| Maintained performance harness |becefdd0d422c01ae8b01c1d6c5320898571ae05b5937c16e802a9b8f81d9fc5|
| Hardware policy digest |2093d943829bf9926d77784293da22396f1dd948639fb44d6c69d30427bdcf18|
| Reviewed performance workflow |50224ea903422110e78324d72f01f8aec5f65cf6e3862dedd934266f2c4503d1|
| src/main.js |ba1b2cd96e1c918bd3a694ff6d9f349af658a229a9422c6ecab980509836f180|
| src/persistence.js |17591a345cb40e8dc236123d5eda594b5a50ccbe0fe652379e6613255a143bec|
| src/load-profile.js |4c4917d112da7e02e69e095df332b514e2c699f79a4a3b041a5f15f0a06c8c4c|
| src/render-resources.js |ec1135aa664a77e31063aacf75f818d459ea74a3f16fafa305aa34e3ce6ca1cd|
| src/scene.js |f1fa28b9839ce8f06ef059e082854a8d243487be2b446f45080f80ece821a226|
| src/cleanup-scene.js |dff1fd2cb18b5ff43e5728316fc9bd6dab56faa89f7f7bc255bd730fa7f84221|
| assets/cleanup/underwater-models.js |9ee70b8598cd0f5a837104c6faa2d1f98f94bb4a733e3dad191db2f6269b5cc2|
| src/character-art.js |bf0f46dde85b9754a42c1b662580ac430084e3e03da73dda3bdc3a0adcc5450e|
| src/character/geometry.js |6cd5b1f67d4b47640732872f342a5d6cdd291a78135c4edecbaad1cb0049c179|
| src/geometry/solid-silhouette.js |4477775c47e8c575447e6d970ec8ceefda53f598a9329dc21aee50609a4b5738|
| Current reef-batching test |f499ae53bd52021c486eb790f80a2a7f5a2da3729747cdacf7e743e88eadc1ad|
| Current character-grouping test |c40f5ceb87280ac8412e8e871cb656dfe808ecced16b591352a84bf802624bb3|
| Immutable79da reef model oracle |948d9cc61f85f83627b20f891a42d3329ea2ddcd712838a947ffdb45ab29e190|
| Pre-cache reef oracle, canonical source bytes |5a1bd004bddc2f1dd36dce5e740aa70b36b1fa38b1bfb1d71735f4bfb03331d4|

All reviewer CPU processes have exited; no browser/renderers are active. Current guidance is the wrapup requirements above: formal hardware FAIL, one confirmed heap regression plus six inconclusive gates, merge blocked, software-only guard accepted14/14, hosted execution pending, canonical evidence retained and final88.5/100 below95. No new collection or speculative revert is authorized.
