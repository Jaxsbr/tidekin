# Fourth UI art handoff

Ready: 12 original painted assets. Native ImageGen; no raster pixel edits. No main, style or index changes.

## Integrate now

Atlas: `/assets/ui-fourth/ocean-kit-atlas.png` — **1536 × 1024 RGBA**, 2,961,160 bytes. Genuine alpha: 646,254 transparent pixels. Preserve alpha; hidden RGB is not the intended backdrop.

Import `/assets/ui-fourth/atlas.css`. Parent helper is supported directly:

```html
<span class="game-art art-waterwheel" style="--art-size:280px" aria-hidden="true"></span>
<span class="game-art art-wood" style="--art-size:56px" aria-hidden="true"></span>
```

Default width: 64px. Preserve supplied aspect ratios; fixed heights distort sprite coordinates. Full names such as `art-module-waterwheel` also work. `art-pearls` aliases `art-pearl`; `art-chart` aliases `art-map`. Counts, names and actions remain accessible live DOM.

`/assets/ui-fourth/manifest.json` contains exact URLs and rectangles. Standalone `/assets/ui-fourth/NAME.svg` images also exist. They are self-contained editable viewport wrappers embedding the unchanged raster atlas, not line icons or raster crops. Each is approximately 3.95 MB: prefer shared PNG/CSS in production.

## Exact layout

Four columns, three visual rows; boundaries adjusted to actual silhouettes. **Do not assume uniform row heights.** Rectangles are x, y, width, height in source pixels.

| Short class | Standalone NAME | x | y | Width | Height |
|---|---|---:|---:|---:|---:|
| waterwheel | module-waterwheel | 0 | 0 | 384 | 337 |
| crane | module-crane | 384 | 0 | 384 | 345 |
| greenhouse | module-greenhouse | 768 | 0 | 384 | 342 |
| sail | module-sail | 1152 | 0 | 384 | 347 |
| beacon | module-beacon | 0 | 337 | 384 | 327 |
| wood | resource-wood | 384 | 345 | 384 | 313 |
| scrap | resource-scrap | 768 | 342 | 384 | 316 |
| pearl | resource-pearl | 1152 | 347 | 384 | 314 |
| voyage | stamp-voyage | 0 | 664 | 384 | 360 |
| map | stamp-map | 384 | 658 | 384 | 366 |
| journal | stamp-journal | 768 | 658 | 384 | 366 |
| settings | stamp-settings | 1152 | 661 | 384 | 363 |

## Composition

- **Workshop:** ONE current plan, miniature at 240–300px wide, pictured nonzero recipe materials at 48–64px with held/required counts, one short benefit, one build action. Remove intro/readiness filler and future locked plans entirely. Later module assets appear only when current. Five available assets do not imply a five-plan gallery.
- **HUD:** material pictures at 32–40px with counts; 48px on touch surfaces. Keep one focused interaction label instead of labels over every object. Check detailed silhouettes at small sizes in-game.
- **Title/voyage/pause:** voyage stamp at 100–160px beside the primary continue/resume action, complementing ocean scenery.
- **Chart:** map stamp at 100–140px as navigation/heading art. The actual map remains live and geographically accurate; this decorative chart does not represent world coordinates.
- **Journal:** book at 100–140px; material pictures beside concise earned-reward rows.
- **Settings:** cog/wrench at 88–112px above compact labeled controls and real toggles.
- **Cabin/inspection:** chart and journal objects identify actions at 64–96px. Inventory pictures accompany supplies. Built module art may illustrate inspection without revealing future plans.

Cream paper #fcf5e2; warm backing #efe5c8; ocean ink #204b4d; deep sea #28545b; coral #ef6d47. Art includes timber grain, rope, patinated metal, glass, iridescent pearl and warm directional light. Avoid another bordered textual panel around every illustration.

## Editable sources and provenance

- `assets/ui-fourth/atlas-prompt.txt`: exact production prompt.
- `assets/ui-fourth/package-kit.mjs`: editable rectangles, names, CSS aliases and packaging. Run `node assets/ui-fourth/package-kit.mjs` from project root to regenerate wrappers, manifest, helper CSS and preview.
- `assets/ui-fourth/atlas-layout.svg`: editable crop-rectangle overlay linked to original raster.
- `assets/ui-fourth/preview.html`: contact sheet with light/dark backing toggle.
- `assets/ui-fourth/provenance.json`: source path, SHA-256, dimensions, reference roles and validation. Raster is flattened; editable packaging and prompt are provided, not fictional layered painting sources.

Inspected `assets/reference/ocean-workshop.png` and supplied `image-1.png`, `image-3.png`. Original ocean art informed materials/depth; screenshots established rejected text-heavy workshop and crowded labels. References were visually inspected, not supplied as image-generation edit inputs. Optional official-game research was unnecessary. No external art was copied into final assets. Temporary `/assets/ui-fourth/placeholder.png` remains for existing integration references; replace it with final art.

Validation: generated atlas visually inspected; dimensions and alpha checked; row boundaries selected from alpha occupancy; 12 SVG XML files and embedded PNG byte identity checked; all rectangles inside atlas. Browser contact-sheet QA could not run because browser policy rejected local file URLs; no workaround attempted. Final in-game sizing/layout remains PM integration work. Asset-only delivery required no gameplay tests.
