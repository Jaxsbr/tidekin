# Asset provenance

`assets/catalogue.json` is the current byte/provenance inventory. [Asset contract](governance/asset-contract.md) defines statuses and validation. Baseline inclusion and agent review do not establish human approval; the initial audit found no exact-byte human production approval records.

| Artifact | Origin and retained source | Current role |
| --- | --- | --- |
| `assets/reference/ocean-workshop.png` | Original user attachment, retained unchanged. | Art-direction reference only. |
| `public/assets/menu-art.png` | Native ImageGen, 8 October 2026, supplied image used as style reference. Original prompt below. Tool model/version was not verified. | Original splash painting; human interview likes its appeal. |
| Workshop/island GLBs | Original procedural Blender generator `scripts/build_assets.py`; editable `.blend` files retained. | Surface models; actual metadata is inspected by catalogue. |
| Landmarks GLB | Original `scripts/build_landmarks.py`, using shared generator helpers; editable `assets/landmarks.blend`. | Cloneable surface landmarks. |
| UI atlas | Native ImageGen original; `assets/ui-fourth/atlas-prompt.txt`, `provenance.json`, crop layout and packaging source. | Shared painted UI and pickup imagery. Twelve embedded-raster SVG wrappers and unused reference duplicate were removed after actual consumer tracing. |
| Cabin illustration | Native ImageGen original; `cabin-prompt.txt` / `cabin-provenance.json`. | Cabin UI artwork. |
| `assets/reference/reef-panorama.png` | Unchanged Native ImageGen original; `reef-prompt.txt` / `reef-provenance.json`. | Underwater depth, limestone, coral-fan, kelp and caustic-lighting reference. Removed from shipping assets because it has no runtime consumer. Historical backdrop-plane claims are not current evidence. |
| Keepsake atlas | Native ImageGen generation and spacing-edit prompts in `assets/ui-fifth/keepsakes.provenance.json`. | Six illustrated keepsakes. Native output copied without local pixel processing; low-alpha padding residuals were documented. |
| Procedural character/reef/chart/object icons | Original source in `src/character-art.js`, `src/chart-art.js`, `src/dive-icons.js`, and `assets/cleanup/*.js`. | Runtime presentation with recorded imports. |

Original generated outputs remain flattened rasters. Source-tool paths recorded in generation provenance may be external or unavailable; the retained project originals are the canonical bytes. Commercial game research informed design; no claim is made that their images were licensed/copied into these assets. Human feedback is retained in both interview documents, separately from art-generation records.

## Original splash prompt

> Use case: stylized-concept. Create a beautiful widescreen game main-menu background for Tidekin. Input image is style reference only. Preserve its sophisticated animated feature-film art direction: luminous turquoise tropical ocean, sculptural weathered pale limestone sea stacks crowned with lush foliage, handmade wooden raft workshop with cream sail, orange pennants, round glowing cabin window, goofy conch-powered engine and wooden paddlewheel, cheerful tiny adventurer and dog. New composition: raft in lower RIGHT third heading toward sunlit island archipelago, left half has calm dark teal open water with subtle waves providing legible space for menu text added later by code. Dramatic towering cliffs and distant island village, golden late afternoon rim light, expressive curving foam, depth and painterly material detail. Wide 16:9 landscape. No text, letters, logos, UI, borders or watermark. This is actual shipped menu artwork, polished and coherent.

The prompt records requested output, not an independent quality certification. The human liked the title image; exact file-version release approval is not recorded.

## Metadata discrepancies

The legacy workshop manifest states 1,421,528 bytes and 12 meshes; baseline inspection reads 1,427,024 bytes and 16 meshes. The catalogue records actual bytes and nodes rather than inheriting stale exporter reports. Original UI provenance `svgCount:12` and embedded-byte validation describe the old wrapper packaging; preserve their historical scope, not a claim that those removed files still ship.
