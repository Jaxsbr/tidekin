# Asset catalogue contract

`assets/catalogue.json` inventories original references, editable sources, prompts/provenance, runtime derivatives, and temporary previews. IDs identify a logical artifact/version independently of its path. Preserve IDs when moving an artifact; create a new ID for a distinct candidate/version. A file record owns its exact SHA-256 and bytes; raster/SVG records carry measured dimensions, and GLB records carry actual node/mesh/material metadata and conservative transformed default-scene bounds.

`source` relationships are recorded in `sources` by ID. A reference/prompt informs an output; a generator or Blender source produces a derivative. These relationships record provenance, not proof that regeneration produces identical bytes. `origin.evidence` identifies retained records; unavailable external ImageGen paths in those original records remain historical provenance, not required local dependencies. Flattened PNGs are not layered painting sources. Editable packaging, scripts, models and prompts are retained as the actual editable sources.

## Status and approvals

- `baseline`: observed in the source baseline or retained source inventory. It may be generated, unused, disliked, or reviewed by agents; it carries no exact-byte human approval.
- `generated-candidate`: separate generated proposal with no runtime consumer. Keep it outside `public/`, record its prompt/reference role and bytes, and give it a distinct ID. Promotion to runtime requires intentional integration and catalogue updates.
- `approved`: a human approval record naming the person, date, purpose/scope, repository evidence path, and this exact SHA-256. The validator checks record existence and byte binding; the coordinator checks that its contents are genuinely human evidence.

The initial audit found zero exact-byte human production approvals. The human interview strongly likes the title artwork and requests preserving its appeal; this is recorded as a scoped human preference, not converted to an invented release approval. User-supplied reference status protects its stated use without making it a game texture.

## Validation and refresh

Run `node scripts/assets/catalogue.mjs` from the repository root, then `node --test tests/asset-catalogue*.test.js`. Validation fails for missing files/evidence/sources/consumers, duplicate IDs/paths, unexplained duplicate hashes, mismatched hashes/sizes/dimensions/model metadata, cyclic provenance, false approval binding, candidate runtime consumers, unrecorded runtime references, or uncatalogued assets/public files.

The scanner inspects source imports, literal public URLs, CSS dependencies, the bounded model-loader template, and the manifest atlas URL. Manifest wrapper URLs historically described packaging outputs: the renderer consumes rectangles, not wrapper URLs. Static analysis is conservative; computed future loaders, new formats, or new manifest conventions must extend it before making disposal claims. This is not proof of dynamic runtime reachability.

After integrated art changes, run `node scripts/assets/refresh.mjs`, inspect the catalogue diff, then validate. It updates known bytes and observed consumers only. New/removed paths and new provenance require deliberate records; it refuses to silently absorb them. A changed approved hash is downgraded to baseline with the old approval preserved in `previousApprovals`. The refresh never promotes approval. Final refresh is deferred until the art owner finishes.

The catalogue validator is a deep module with one validation interface and structured findings. It runs in Node using byte inspection and mathematical GLB bounds; it starts no browser, GPU, renderer or Blender. Production loads existing URLs directly and does not load the catalogue.
