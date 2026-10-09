# Third improvement UI art direction

9 October 2026. Designer scope: `src/style.css`, original `assets/ui/*.svg`, and this review note. No HTML, main, domain, renderer, or save code edited. The parent supplies the action sequence and DOM. CSS is stable for independent review and integrated QA.

## Evidence and direction

Read the full third improvement execution goal and current beta player interview. Inspected the original `assets/reference/ocean-workshop.png`: honey-colored planks, cream canopy, brass hardware, coral flags, pearl shell, curved rope and turquoise water establish a warm handmade vocabulary. Preserve the existing title painting. The UI borrows material and shape cues, not its pixel density or a claim of matching illustrated rendering quality.

Inspected the actual retained second-improvement wide gameplay image `captures/second-improvement/qa/2026-10-08T23-41-42-951Z/responsive-1440x900.png` and the actual third-improvement square baseline `captures/third-improvement/baseline/runtime/900x900/03-start.png`. Both show pale rounded rectangles, a broad six-option text toolbar, and a pill-shaped context bar. These observations are image-grounded; Jaco's dislike and enjoyment remain human evidence, not something a designer can reverse with a score.

## Delivered language

- Canvas note with stitched inset, brass-like action emblem, serif title, coral action and a subtle arrow nudge. Real 44px dismiss target; no perpetual pulsing of the entire note.
- Compact supplies laid horizontally in one instrument, differentiated resource symbols plus names and counts. Counts use tabular numerals. Region label has a coral binding edge.
- Dark teal toolbar separates persistent controls from the cream interaction note. Parent's Raft disclosure contains Cabin, Inspect and Journal; Compare is a quiet separated control. CSS does not remove access to those functions.
- Brass directional badge near the top; only the runtime arrow rotates. At square widths it occupies a separate lane below the top-right supplies. Hidden state stays authoritative.
- Workbench recipe leaves use timber-colored top rules, a wheel emblem, explicit held/required chips, dashed missing-material borders and a clear construction action. Chart leaves have green binding and original wave-line/compass artwork.
- Comparison choices live in a wider optional paper dialog. Narrow viewports use one column to keep select labels readable. The ordinary voyage does not acquire a persistent grid of test controls.
- Underwater guide is a short upper-left note, with breath separated at upper right. It does not become a large bottom prose panel. The parent supplies action/count feedback separately.

## Original assets

`assets/ui/compass-rose.svg` and `assets/ui/chart-waves.svg` are original hand-authored vector markup created for this iteration. CSS-relative URLs allow Vite to bundle them; no external fonts, downloaded art, raster generation, or runtime fetch dependencies were added. Compass has a brass ring and coral/teal rose; wave lines are intentionally faint and used away from body text. Title asset is unchanged.

## Focused verification

Used isolated headless installed Chrome contexts on the local Vite servers, never the user's persistent browser storage. Inspected temporary actual runtime screenshots at 1440×900 and 900×900: opening HUD, square workshop, comparison dialog, and underwater larger text. Temporary evidence remains at `/tmp/tidekin-ui-{first,square,workshop,comparison,dive,dive-large}.png`; integrated QA owns durable matched captures.

The inspected 900×900 larger-text dive image places the guide at x18/y102 with 300×99px bounds, with the swimmer visible to its right and below. The settled workshop image shows readable wheel requirements and the two optional disclosures. The settled comparison image exposed a truncated swimming selection in the initial 480px dialog; the final stylesheet increases that dialog to 620px and switches to a single column at ≤700px. This final targeted width fix still needs the independent review capture.

Keyboard focus uses a light inner outline and dark outer ring, including the canvas. Buttons and selects use ≥44px targets; larger-text hooks include the new guide, bearing and comparisons. Reduced-motion media and in-app class disable all CSS animation and transitions, including tutorial nudge. Forced-colors uses explicit borders and system highlight. These are implemented provisions, not a full accessibility certification or measured contrast audit.

No gameplay acceptance or performance claim follows from these screenshots. Parent-integrated actual-input QA and independent design review must still inspect persistent bearing while turning, guide progression, optional menus, overflow with large text, and all dive variants. Large world-space pickup labels visible in current screenshots belong to the scene renderer, outside this CSS scope, and still require hierarchy review. No human enjoyment or preference has been established.
