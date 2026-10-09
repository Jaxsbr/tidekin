# Baseline capture interruption

Requested frozen production:5181, `index-B3pFPmlR.js`, `scene-COKZ-vVH.js`, `index-DXHHZ4tV.css`. The initial served fingerprint matched these assets. [Retained run](../../../captures/fourth-improvement/qa/2026-10-09T03-58-29.617Z-baseline/results.json).

Port5181 changed during capture. Wide1440×900 retained title and failure image/video; the original scene request aborted and gameplay initialization timed out. Square900×900 subsequently captured title, live HUD, workshop, map, journal, cabin, inspect, pause, settings, diving and descent with no browser errors, but loaded after the transition. The final served entry no longer matched B3. These square captures are **not frozen baseline evidence** and must not support a before/after verdict.

Both contexts started with empty storage. All interactions used actual inputs; only read-only state/metrics were inspected. Installed Chrome154.0.8037.98 was closed in finally. No user saves, runtime/source, build or server were changed. Initial sandbox-localhost restriction required the explicitly authorized installed-Chrome escalation; it was allowed.

No retained B3 built entry/scene/CSS copy was found under captures/output/dist-beta/dist-beta3. The source-only copy in `captures/fourth-improvement/baseline/` cannot reconstruct exact production without a new build, which this sidecar is not authorized to do. A complete matched baseline therefore remains unavailable from this attempt. Preserve the interruption and wait for PM direction/readiness rather than restarting5181 or testing an unannounced candidate.

The script now fingerprints each viewport before navigation and records build drift without discarding results. The candidate full arc and remaining gates are prepared in [qa-plan.md](qa-plan.md), syntax checked, unexecuted. No fourth-improvement acceptance or performance pass is claimed.

## Authorized isolated reconstruction on 5182

The parent subsequently authorized a separate build/preview. Frozen source remains under `baseline/`; node_modules/public are symlinked, and compiled output lives solely under `qa/restored-baseline-dist/`. Preview uses strict localhost port5182;5181 and the project's current dist were untouched.

The first reconstruction (`index-B4uOowHo.js`) used the current shared reef-art dependency. Both viewport runs captured all requested UI states but raised `patchMat.uniforms` errors: the frozen cleanup renderer and edited art interface were incompatible. Preserve `qa/2026-10-09T04-05-26.790Z-baseline/` as failed reconstruction evidence, not a passing baseline.

Recovered the historical procedural reef-art functions from retained `output/third-candidate/assets/scene-BeOvE1Uj.js`, into owned isolated `qa/restored-baseline-assets/cleanup/reef-art.js`; mergeGeometries imports from installed Three.js. No original runtime/art file was edited. Recovery provenance/hashes are in `qa/restored-baseline-assets/recovery.json`. The baseline's assets symlink now points at that isolated recovery, with a read-only UI symlink for original artwork.

Corrected reconstruction: `index-CHjAOVzK.js`, `scene-iUIKPVtF.js`, unchanged baseline CSS `index-DXHHZ4tV.css`. Manifest: `qa/restored-baseline-manifest.json`. This is a historical source reconstruction with recovered art, **not byte-identical B3**. Keep that distinction in before/after judgments. Corrected complete capture outcome is recorded below after execution.

Corrected [complete reconstructed baseline run](../../../captures/fourth-improvement/qa/2026-10-09T04-08-34.531Z-baseline/results.json): **both viewport capture sequences pass**, all ten requested UI states plus descent retained, zero browser errors, empty initial storage, and unchanged served fingerprints before/after each viewport and the full run. Continuous video retained per viewport. QA Chrome contexts/browser closed; the requested isolated5182 preview remains running.

Directly inspected wide diving and square workshop screenshots: the historical reef renders without the former dependency exception; square workshop retains old helm guidance, floating-distance overlays and later-plan disclosure as expected of the baseline. These images confirm baseline presentation, not acceptance of the new UI or animation. Remaining images/video are retained for matched final review. Exact B3 binary equivalence remains unproven; use this reconstruction label in comparisons.
