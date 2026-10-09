# Independent bounded accessibility verification

9 October 2026. **Latest disposition: bounded final-candidate checks pass; A1–A3 closed by measured recheck. This is not WCAG certification.** Historical failures and pending-stage notes below retain their original evidence; the final addendum supersedes them. Implementation was read-only. Keyboard/quality/contrast execution began only after PM reported exclusive hardware QA complete and browser closed. No benchmark or performance conclusion belongs to this review.

## Candidate and reproducible evidence

Final completed keyboard-quality run: [results.json](../../../captures/second-improvement/accessibility/2026-10-09T00-09-35-375Z/results.json). Browser closed in `finally`. The original preview port 5181 was unavailable; a temporary server served unchanged `dist` on 5184 and was stopped afterward. No build occurred.

Received entry `index-9TpJEO4p.js` SHA-256 `61532996cc9f0dfe0aed04498f5e35f56d536986936e65e8c2087339ae1dbba2`, scene `scene-C3Fly4-r.js` `01fdd294a19a06f141936caa77234551cde8ddd84c5dcfac29b53214448e25ce`, CSS `index-CyPKckhp.css` `4e4a01db29e2b9f8383d0e28c5f33e573c5281f6c215e6d733ed2d486075d457`. Before/after HTML hash matched. QA’s hardware result and targeted failure-HUD/workshop results are separate evidence; current [QA report](qa.md) now records those passes.

Runner: [qa-accessibility-second.mjs](../../../scripts/qa-accessibility-second.mjs). Actual Tab/Shift+Tab/Enter/Space and native-select typeahead operate controls; no gameplay grants or action hooks. Metrics/settings reads are observations. Runtime contrast uses computed foreground and ancestor backgrounds, excludes inactive controls, labels uncertain image/opacity/scene-backed glass backgrounds unsupported, and waits for dialog animation to settle. This is a bounded assessment, not WCAG certification.

## Confirmed contrast findings — report before implementation changes

The comparison uses [W3C text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): 4.5:1 for the observed normal-sized text, 3:1 only for qualifying large text. Ratios below are computed from rendered colors on opaque surfaces, not anti-aliased glyph pixels. The 16px primary-button text does not qualify as large text.

| Finding / source reference | Reproduction and rendered pair | Ratio | Disposition |
|---|---|---:|---|
| **A1 P2: primary actions** — [style.css:37](../../../src/style.css:37) | Keyboard-open Settings: “All comfortable”; pause: “Resume voyage”. `#fff8e9` on `#d66a37`, 16px. | **3.323:1** | Below 4.5; adjust text/background pairing and recheck default/hover/focus. |
| **A2 P2: settings/recovery explanations** — [style.css:213](../../../src/style.css:213), [224](../../../src/style.css:224), [231](../../../src/style.css:231) | Settings paragraph `#798273` on `#f7f2e5`, 16px; setting descriptions `#8d927c`, 9px; saved-settings note `#9b9c82`, 9px/13px. Same paragraph style explains pause/reset policy. | **3.576 / 2.875 / 2.515:1** | Meaningful instructions are below 4.5; larger text alone does not correct contrast. |
| **A3 P2: workshop missing supplies** — [style.css:175](../../../src/style.css:175), [178](../../../src/style.css:178) | Fresh workshop, Waterwheel unavailable: cost `#aa7445` on `#faf0df`, and “Need 2 wood, 1 scrap” `#a77a50` on `#fffaf0`; observed at 13px with larger text. | **3.513 / 3.642:1** | Informational costs/reason are not exempt merely because the Build button is disabled. Recheck both normal/larger styles. |

Screenshots and full computed rows are in the linked results directory. Exclude decorative punctuation/ornaments from text-failure claims. Initial static `panel-intro` calculations were candidates only: later CSS overrides mean the original pair is not the rendered workshop introduction. Likewise, early ancestor-only ratios for the translucent gameplay context were not a valid final scene-compositing measurement; corrected results label that surface unsupported. PM may improve its color, but this report does not claim a confirmed context ratio from those early numbers.

## Keyboard order, focus and the apparent workshop escape

Sampled title order: Start → Settings; settings: quality → sound → motion → larger text → Done; gameplay: Pause → enabled contextual action → Helm → Cabin → Inspect → Workshop → Journal → Map. Workshop: Close → enabled Find buttons → later-plans summary → optional-rigs summary; expanded plans expose their enabled Find controls. Enter opens the plans section, Escape closes dialogs, and reverse Tab samples remain recorded. Buttons/inputs/select have 3px visible outlines; both workshop summaries also have 3px visible focus outlines. A workshop screenshot was visually inspected. This supports reachable controls and visible focus in sampled paths, not all screens or all assistive technology.

**No genuine workshop background-control focus escape was established.** The initial runner's concrete culprit was `if (dialog && !f.inDialog)`: it labelled a single `document.activeElement === BODY` Tab step as a trap failure. Sequences return immediately to Close/Find controls; they never show a focusable background action receiving focus. Chrome can expose BODY while focus leaves the document for browser chrome. This explanation is plausible, not directly instrumented browser-chrome proof. No panel replacement, closed-modal cause or source defect was proven for that workshop sample. The corrected criterion distinguishes BODY/document-boundary observations from an actual background control. It does not erase the observation or assert a perfect focus trap.

An earlier pause scan **did** have harness sequencing error: the gameplay Tab loop crossed the document boundary, triggering the legitimate focus-loss pause; Escape then closed that already-open modal before the pause scan. The corrected runner explicitly establishes the pause modal before scanning. Native-select arrow/popup attempts also failed to apply a value; native typeahead `l/m/h` succeeds. These are preserved harness limitations, not reported game defects.

Original stopped runs and first flags remain under `00-06-38-166Z`, `00-07-09-440Z`, `00-07-36-961Z`; the intermediate selectOption run `00-07-58-007Z` is not the final keyboard-selection evidence. Corrected contrast/focus run `00-08-43-793Z` and final native-keyboard run `00-09-35-375Z` are retained alongside them.

## Quality/settings verification

At 1440×900 CSS pixels and device DPR 2, real native-select keyboard typeahead set Low/Medium/High. Read-only renderer metrics reported each selected quality and drawing buffers **1440×900 / 1944×1215 / 2520×1575**, matching the implementation caps 1 / 1.35 / 1.75. Each selection was saved. High plus keyboard-toggled reduced motion and larger text survived document reload and reopening Settings. These observations verify application/persistence; they do not measure visual quality or frame performance.

## Pending CSS-only recheck

PM is staging corrections and owns implementation. No new runtime execution until PM confirms the next CSS-only build and releases arc/motion browser work. The runner now includes independent **1440×900 and 900×900 normal→larger** matrices for game, settings and workshop: compare each matched computed font size (no shrinking), record horizontal overflow, capture layouts, and preserve original evidence. Route text is recorded where present; a fresh voyage does not establish every unlocked route state. Square focus visibility and screenshots still require review; overflow numbers alone cannot establish legibility. Recheck corrected primary/default-hover colors, explanations, missing supplies and actual gameplay-context compositing before closing A1–A3. The added matrix is syntax-checked and **not executed yet**.

Run only after PM's signal, with the actual expected candidate entry supplied:

```sh
TIDEKIN_BASE_URL=http://127.0.0.1:5181 TIDEKIN_EXPECT_ENTRY=index-NEW.js node scripts/qa-accessibility-second.mjs --after-hardware
```

Only the owned accessibility script/report and evidence captures were written. No implementation edits, rebuilds or outstanding reviewer browser/server remain.

### Focus-boundary clarification for the next build

Source inspection confirms `refreshPanel` is invoked on panel open/action ([main.js:372](../../../src/main.js:372), [624](../../../src/main.js:624)), not periodically. No action was activated during the flagged workshop Tab sequence, so periodic panel replacement is not supported as a cause. Treat the BODY observation as an unresolved native document/browser boundary rather than a confirmed gameplay escape. The next runner records `document.hasFocus()`, visibility and all open dialog IDs per Tab step to distinguish native wrap, real browser focus loss, and closed-dialog sequencing. It neither traps browser-chrome focus nor disables the game's real focus-loss pause safeguard.

PM additionally staged separate teal-on-cream and cream-on-menu focus outlines, darker auxiliary labels/quiet actions and a 15px native quality selector. These are source-only changes: final focus-indicator contrast must be checked against actual adjacent backgrounds and screenshots after the next build. No runtime pass is inferred from the chosen color names. Original failure/flag evidence remains intact.


## Final CSS/copy candidate recheck — completed

PM released the new build after arc/motion browser work. Completed runs [00-23-37 results](../../../captures/second-improvement/accessibility/2026-10-09T00-23-37-627Z/results.json) and [00-24-41 final results](../../../captures/second-improvement/accessibility/2026-10-09T00-24-41-810Z/results.json) both have no asserted failures. The second adds settled-title focus capture and keyboard scrolling to lower workshop controls. A connection failure at `00-23-19-769Z` is retained: 5181 was not listening. The reviewer temporarily served existing `dist` on that port; no rebuild occurred. Browser and server are now closed.

Received entry `index-BFO3qo4F.js` SHA-256 `5a675698fc9437b94a63725fc6256af33d70af423db9058d84db2960a64bb2f5`, scene `scene-aZK_4lYI.js` `5ff66edce4b291749ace8c916e58b8360b3d4ce81779537870736dca2df6fc72`, CSS `index-isFjO0yW.css` `11bc9879028f23929e69104862682134d5c65665548aa9de1586b61681358010`. Before/after HTML matched within each run. All runtime observations below belong to this candidate.

**A1–A3 closed for the reproduced surfaces.** Computed primary text is **5.254:1**, settings/recovery descriptions and notes **5.871:1**, missing costs **5.576:1**, and missing-resource reason **6.053:1**. Supported active text rows in the sampled settings, pause and workshop screens have no below-threshold results. Decorative content, inactive controls and uncertain image/translucent surfaces remain excluded rather than automatically passed. Primary hover was not separately sampled in runtime; its staged CSS color remains a source-level check.

The actual gameplay context uses `rgb(77,98,87)` over `rgba(252,248,234,0.937)`. Conservative compositing against black and white underlying pixels gives **5.369–6.197:1**, above 4.5 for any underlying image color under this uniformly painted glass surface. This is a bound from rendered colors/alpha, not a false ancestor-only opaque-background assumption. Teal focus against opaque cream computes **5.532:1**. Inspected settled title and square workshop screenshots show visible cream-on-menu and teal-on-cream focus outlines; a comprehensive pixel contrast audit of every animated illustration position is not claimed.

Normal→larger measurements at **both 1440×900 and 900×900**:

| Sampled text | Normal → larger (px) |
|---|---:|
| Context hint, workshop intro/reason/costs, settings descriptions | 14 → 16 |
| Context action labels and navigation buttons | 15 → 18 |
| Resource names | 13 → 15 |
| Location metadata, settings note | 13 → 16 |
| Resource Find buttons | 12 → 12 |

No measured selector shrank. No horizontal overflow appeared in sampled context/dialog/body bounds. Settings content remains legible and fits in the inspected square screenshot. Square workshop intentionally scrolls vertically: actual Tab reaches the lower Optional rigs summary within the viewport at y=827.14, height=48.39 with larger text; its focus outline is visible in the inspected scrolled screenshot. Wide and square normal/larger summary checks all pass. Unlocked route typography and narrower-than-square layouts are not newly certified by this matrix.

**Workshop BODY observation resolved as native document-focus loss in the reproduced sequence.** Per-step evidence records `document.hasFocus() === false`, visible document and `panel-dialog` still open during BODY; subsequent Tab returns to Close/Find controls. No focusable background control is activated. Thus the initial generic escape flag was not a demonstrated gameplay focus-trap defect. Browser-focus loss remains allowed, and gameplay's pause safeguard is retained. Original flags are not deleted.

Low/Medium/High again work through real native keyboard typeahead, with correct renderer quality/drawing-buffer changes; High, reduced motion and larger text persist after reload. Focus/order coverage remains bounded to the documented paths, not screen-reader or all-control certification.

**Completed-copy fixture replay passes.** Loaded exact localStorage strings from [expert arc earned save](../../../captures/second-improvement/expert-arc/2026-10-09T00-08-42.526Z/earned-browser-save.json), without editing values or the original file. Original file SHA-256 `1a6ea291895e9d9007e22019337687332b49612c778b27f6309e724718056de4`. Only the storage origin is bound to the candidate's isolated 127.0.0.1 context. Five upgrades remain true and four regions remain discovered; hint is **“Home Reef restored. Your workshop is complete.”**, with no next-upgrade instruction. This is fixture regression evidence, not another earned completion. The outside-home unfinished hint was read in source; it was not replayed with a separately edited fixture.

Only accessibility script/report, scoring recommendation and owned captures changed in this final task. No implementation edits, rebuilds or performance certification were performed.

### Final evidence handoff

The independent source-blind fresh agent opening test is running without preannounced activity/goals. Its result is pending and is outside the completed accessibility checks above; no pass or score change is inferred. PM will integrate that separate onboarding evidence later. This reviewer’s assigned accessibility verification and evidence-based scoring handoff are complete; no browser remains open and no further execution is planned.


## Final Find-label polish recheck

Latest `CLQfBj9P/DZDgiK7l/0PpeFtuh` candidate: [bounded settled Find results](../../../captures/second-improvement/technical-transitions/2026-10-09T00-39-34-778Z/results.json) establish **14px normal → 16px larger** at 1440×900 and 900×900. Enabled Find controls remain fully within viewport, 44px high, with visible teal keyboard focus and no panel-body horizontal overflow. The settled square capture was inspected; earlier opening-animation captures remain retained. This closes the concrete uneven larger-text treatment that previously supported the accessibility 3 recommendation. Prior contrast, quality, keyboard and full normal/larger matrix evidence remain separately attributed; no broad re-run was performed for this change. New far-trash copy was sampled wide only, not a new full square cleanup audit. Browser closed; main-owned preview left running; no rebuild or implementation edit.
