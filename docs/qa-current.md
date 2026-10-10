# Current QA operator guide

Candidate13 is the final production candidate. The completed serial queue is recorded in [qa-final.json](qa-final.json): four character cases (48 native stills, 36 verified ordinary-speed clips), six gameplay fixture/earned cases, and four maintained Low/path cases. Every case passed with zero errors, unchanged identities and closed contexts/browser. Character Chrome closed at **2026-10-10 03:21:51.701 UTC**, gameplay at **03:27:40.887**, and maintained Low/path at **03:36:30.139**. Character decoding finished before gameplay; temporary raw recordings were discarded. All browser/decode/CPU processes have exited; GPU returned. No further QA cycle is planned.

The durable summary binds source/build/controller/report hashes, case outcomes, clip PTS/frame counts, real reach/rest and held reversal, earned resources/keepsakes/autosave/Continue, atlas requests and native settling metadata. Its `originalLocation` strings identify historical transient files, not guaranteed live files or GitHub links. Hypatia completed motion review and selected four unaltered gameplay PNGs and three final ordinary-motion clips (reversal, ascent, reach), retained with verified identities in the [canonical manifest](art/evidence/manifest.json). The [exact QA capture retirement outcome](governance/qa-capture-retirement-proposal.json) records removal of 875 raw/duplicate files (365,886,000 bytes) and 114 empty listed directories, with 0 skips at `2026-10-10T03:51:32.467Z`. Original COMPLETE/FAILED/omitted statuses and all report identities remain durable. Original camera defaults 25/18 versus final 23/13.5 mean domain views are not pixel-identical framing. No art score, human approval, spoken screen-reader certification or formal performance benefit is inferred.

**Captured historical Candidate13 identities** are retained in [qa-final.json](qa-final.json); these build/provenance copies may be retired after formal disposition:

| Build | Served base | Exact entry / scene / CSS |
| --- | --- | --- |
| `.scratch/current-candidate13-dist` | `http://127.0.0.1:5182/` | `index-CdjYE9Z1.js` / `scene-3RrrFS3Q.js` / `index-1DdwmcFP.css` |
| `.scratch/current-candidate13-published` | `http://127.0.0.1:5183/tidekin/` | `index-CaGbAwpC.js` / `scene-BsFjW98V.js` / `index-6aZaE4Qu.css` |

These are capture-time bindings, not reusable live-server instructions. Catalogue 36 and the captured source's 297 tests were coordinator-verified; maintenance added four Low guards and the full CPU suite then passed **301/301**. The coordinator validated 88 performance controls. Clean commit `6acc82a545a59d643b7649957bc39bf9cb02bb63` rebuilt to the identical captured root/published inventories (`b3a27de3…` / `5d424186…`); all 13 files per build were byte-verified. Its source inventory differs only by dropping 32 already-missing tracked paths, not changes to remaining input bytes. Separate hardware formal disposition is **FAIL**: home-entry peak heap +26,784,020 bytes and six inconclusive checks; this does not relabel successful QA. The [performance owner](performance/README.md) retains that disposition and its cleanup. Parent reports built-in ProMotion restored by fresh accessibility verification; capture-time60Hz metadata and unavailable exact observation timestamps stay historical.

All reusable entry points live in `scripts/qa`; no temporary helper is required:

```sh
node scripts/qa/character.mjs --prepare
node scripts/qa/gameplay.mjs --prepare
node scripts/qa/low-path.mjs --prepare
```

Preparation performs no browser/network/evidence writes. Only a **new explicit coordinator release** permits future execution; freeze selected source/build/controllers/evidence/fixtures, use a fresh exclusive output and run sequentially without benchmarks. Tools never build or start/stop servers. Full-suite examples use local root origins; Low/path additionally verifies `/tidekin/`.

Create fresh production inputs from the repository root before any newly authorized run. The recipe records the source before the actual two Vite commands, rejects reused output names, verifies unchanged source after both inventories, and writes provenance exclusively. It does not start previews or authorize GPU use:

```sh
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { sourceFingerprint, inventory } from './scripts/performance/evidence.mjs';
const repo = process.cwd();
const paths = ['output/qa-root', 'output/qa-published', 'output/qa-provenance.json'];
assert(paths.every(path => !existsSync(path)), 'Choose unused build/provenance paths');
mkdirSync('output', { recursive: true });
const source = await sourceFingerprint(repo);
for (const [base, outDir] of [['/', paths[0]], ['/tidekin/', paths[1]]]) {
  execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build',
    '--base', base, '--outDir', outDir], { stdio: 'inherit' });
}
const root = await inventory(paths[0]);
const published = await inventory(paths[1]);
assert.equal((await sourceFingerprint(repo)).hash, source.hash, 'Source changed');
writeFileSync(paths[2], JSON.stringify({ source, root, published }, null, 2) + '\n',
  { flag: 'wx' });
console.log(root.files.filter(file => /\.(js|css)$/.test(file.path)).map(file => file.path));
console.log(published.files.filter(file => /\.(js|css)$/.test(file.path)).map(file => file.path));
NODE
```

Start production previews separately for those fresh builds at the selected local bases and verify actual HTTP bytes. Bind each **actual** entry/scene/CSS basename printed above; the uppercase placeholders below must be replaced, including fresh capture names. Low prepare currently prints helper SHA256 `0427ad315dadd547a9faa65b7edbae848205868dbff0c1fd7f742621b311d4e9`; use the reviewed prepare hash if tools change.

```sh
root_args=(
  --run --browser-released --build-ready --outside-benchmark --headed
  --url=http://127.0.0.1:5182 --build=output/qa-root
  --expected-entry=ACTUAL_ROOT_ENTRY.js --expected-scene=ACTUAL_ROOT_SCENE.js
  --expected-css=ACTUAL_ROOT_CSS.css
)
node scripts/qa/character.mjs "${root_args[@]}" --deadline-ms=600000 \
  --out=captures/current-improvement/qa/FRESH_CHARACTER_RUN
node scripts/qa/gameplay.mjs "${root_args[@]}" --suite=all --deadline-ms=600000 \
  --out=captures/current-improvement/qa/FRESH_GAMEPLAY_RUN
node scripts/qa/low-path.mjs "${root_args[@]}" --deadline-ms=180000 \
  --provenance=output/qa-provenance.json \
  --expected-helper=0427ad315dadd547a9faa65b7edbae848205868dbff0c1fd7f742621b311d4e9 \
  --published-url=http://127.0.0.1:5183/tidekin/ \
  --published-build=output/qa-published \
  --published-entry=ACTUAL_PUBLISHED_ENTRY.js --published-scene=ACTUAL_PUBLISHED_SCENE.js \
  --published-css=ACTUAL_PUBLISHED_CSS.css \
  --out=captures/current-improvement/qa/FRESH_LOW_RUN
```

Full character defaults to wide/square, ordinary/reduced motion, High, DPR1 and default follow camera. Each case retains nine three-second clips and twelve stills. Ordinary movement and labelled normal-domain entry use no live pose/camera/clock injection. The disclosed 80×16 marker binds decoded frame PTS after warmup; three seconds allows one 40 ms recorder frame. `ffmpeg`/`ffprobe` are checked before launch; Chrome closes before decoding and raw cleanup. Finish decoding before the next run or benchmark. Exact single-case retries use `--case=1440x900-ordinary-motion|1440x900-reduced-motion|900x900-ordinary-motion|900x900-reduced-motion`; anchor/inert checks do not replace full coverage.

Gameplay defaults to six cases: labelled panel/trophy and pearl-travel fixtures plus separate empty-storage earned voyages at both sizes. Salvage uses ordinary contextual Space after real sailing; fixed reefs use actual buoy clicks at 5–7 m stand-off. Materials, once-only rewards, keepsakes, 10-second autosave and Continue are checked. `--suite=earned-only|fixtures-only` narrows coverage. Low/path uses validated Low prefs and native deck/deep/held-swim stills with ordinary steering, buoy entry and swimming; all four pages request exactly one ocean-kit atlas returning 200 at the correct base. It adds no video, earned-progression or benchmark claim.

The [four-file retirement ledger](governance/qa-retirement-proposal.json) records exact authorized removal of obsolete fifth scripts: 49,682 bytes, no skips or active consumers, original bytes preserved in Git `79da54b`. Seven-view/parallax was explicitly closed as a historical purpose. The former positive-formal gate was an agent precaution removed by coordinator authority; validated controls/teardown, final actual gameplay, CPU guards and identity/consumer checks authorize source cleanup even if performance fails or is inconclusive. Protected human references and selected canonical proof remain intact. Earlier truthful diagnostic failures belong in compact cleanup dispositions, not live operator capture links.
