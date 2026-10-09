# Asset provenance

## Reference

`assets/reference/ocean-workshop.png`: user-supplied reference, copied unchanged from the chat attachment. Defines visual target; not used as an in-game screenshot.

## Menu illustration

`public/assets/menu-art.png`: generated using the built-in image generation tool on 2026-10-08, using the supplied reference. The tool does not expose a model selector or verified version; the user's requested “image-gen 2.5” version could not be established. No external stock asset or copied commercial game asset used.

Prompt:

> Use case: stylized-concept. Create a beautiful widescreen game main-menu background for Tidekin. Input image is style reference only. Preserve its sophisticated animated feature-film art direction: luminous turquoise tropical ocean, sculptural weathered pale limestone sea stacks crowned with lush foliage, handmade wooden raft workshop with cream sail, orange pennants, round glowing cabin window, goofy conch-powered engine and wooden paddlewheel, cheerful tiny adventurer and dog. New composition: raft in lower RIGHT third heading toward sunlit island archipelago, left half has calm dark teal open water with subtle waves providing legible space for menu text added later by code. Dramatic towering cliffs and distant island village, golden late afternoon rim light, expressive curving foam, depth and painterly material detail. Wide 16:9 landscape. No text, letters, logos, UI, borders or watermark. This is actual shipped menu artwork, polished and coherent.

## Three-dimensional assets

See `scripts/build_assets.py` and `docs/art-direction.md` for original procedural Blender source, export budgets and node names. Runtime effects in `src/scene.js` are original procedural geometry/shaders. Models and animations require separate comparison against the reference; menu fidelity does not imply gameplay fidelity.

`scripts/build_landmarks.py` generates `assets/landmarks.blend` and `public/assets/landmarks.glb` with Blender 5.1.2. Original asymmetric arch, stack, and ridge groups total 13,600 triangles with six shared materials and no textures. The three groups use identity transforms, Y-up export and waterline Y=0. The artist verified a fresh GLB import and retained `assets/previews/landmarks.png`; workshop and island sources were unchanged by this pass.

The beta 3 workshop separates the existing explorer geometry into shoulder and hip pivots for procedural animation. Blender fresh-import checks preserve the rest pose, original 41,976 triangle count and 19 materials; batching adds four meshes and ten material draws. The exporter contract and sampled swim bounds are in `docs/art-direction.md`. `src/scene.js` supplies the actual swim strokes and deck greeting. Runtime expedition flags and earned pennants are original code-generated geometry; no external model or texture was introduced.

## Fourth improvement painted UI and character

`public/assets/ui-fourth/ocean-kit-atlas.png` is an original native ImageGen atlas: five workshop miniatures, three supplies and four menu stamps. Raster alpha and crop bounds were inspected. CSS shares the original atlas without raster edits; editable wrapper/crop definitions, exact prompt and SHA-256 provenance are under `assets/ui-fourth/`.

`public/assets/ui-fourth/cabin-interior.png` is an original generated cabin cutaway for the cabin screen, with its prompt/provenance retained alongside the atlas. Game reference research informed presentation choices; commercial game images were not copied into runtime assets.

`src/character-art.js` is an original articulated procedural Three.js character, with head, torso, shoulder/elbow and hip/knee pivots, layered clothing, swept hair, visible eyes/goggles and fingers. The same source is used above and below water. This replaces the earlier explorer presentation without claiming reference-level fidelity.

`src/chart-art.js` draws a stylized navigational chart from authoritative coordinates. Painted menu stamps are decorative; they do not replace the actual map's geography.

`public/assets/ui-fourth/reef-panorama.png` is a new original 1536×1024 painted underwater background (prompt and provenance: `assets/ui-fourth/reef-*`). It contains no character, trash, text or UI. One sRGB background plane adds subtle parallax behind the interactive three-dimensional reef; an air band masks it above the surface. Target coordinates, reach, and picking remain domain-driven. This is a 2D backdrop within the 3D scene, not a claim that every painted coral form is modeled or interactive.
