# Second improvement interaction design

9 October 2026. Design specialist handoff; proposals for implementation and playable validation, not claims of tested gameplay. This assignment changes this document only. Baseline capture remains a prerequisite to source edits; no camera winner or new rubric score is declared here.

## Evidence and boundaries

Read root AGENTS.md, second-improvement-goal.md, second-improvement-brief.md, reviews/player-interview.md, design-decisions.md and art-direction.md. Inspected the actual ocean-workshop reference and both annotated player screenshots. Inspected game.js, main.js, scene.js and the Blender asset generation/export pipeline.

The reference puts a warm, inhabited raft against generous turquoise water, with coral flags and cream cloth as accents. Preserve that relationship. The title annotation explicitly removes slogans, secondary descriptions, decorative arrow and peripheral labels while retaining the illustration. The gameplay annotation identifies three competing UI masses: left location/objective, right resources/map, and stacked bottom bars. Reduce simultaneous surfaces, not type size. These screenshots include browser chrome and do not establish the exact CSS viewport.

The current renderer clones the articulated Explorer, fixes the underwater swimmer just below water, and retains an elevated following camera. That explains an implementation risk for visibility, not a reproduced browser defect. Current world-relative movement and renderer-owned visual turning must yield to the proposed domain heading. Existing oxygen rescue, cooldown and Pearl trail reset rules do not define cleanup behavior.

Scope: one home cleanup patch, one existing upgrade workbench, one bounded cabin planning view, direct station selection, inspection and a matched two-camera sailing experiment. No walking simulation, new economy, extra recipes, survival upkeep, sharks, puzzles, advanced gear or checkpoints.

## Quiet opening and first actions

1. Title: illustration, Tidekin, Start new voyage, Continue when a save exists, Settings. Continue becomes primary for returning players. Remove annotated slogans and ornamental copy. Preserve the image; add only a slow low-amplitude image drift or restrained overlay ripples, with enough overscan to avoid exposed edges. Do not fabricate separable character layers from the flat illustration. Reduced motion leaves the art still.
2. New voyage opens stationary, off helm, in an oblique inspection view with the wheel, cabin door and proposed bench hotspot visible. No arrival modal. One small prompt: **“Click the wheel to sail.”** Keyboard equivalent is a labeled Helm button. Hover/focus gives only the selected object's label and a restrained outline.
3. Taking the helm changes the view and replaces the prompt with **“W/S forward/back · A/D steer.”** Reveal a nearby home cleanup buoy and localized affected water in the forward route; short site label: **“Home shallows · cleanup.”** No starting inventory task or compulsory reward claim. The player can inspect the bench or cabin first; the sequence is guidance, never a lock.
4. At the site, the sole contextual action becomes **“Space · Snorkel”**. On entry, surface and diver are immediately visible; start with full breath at the left surface entry. Show **“W/S up/down · A/D swim”** until movement, then **“E · Collect”** only beside the nearest eligible trash. First shallow trash should be reachable within roughly 5 seconds of intentional input, a tuning target rather than a human observation.
5. A collect moves the object toward the bag and increments its fill. Low breath teaches **“W · Surface for air”**. Ordinary surfacing refills this same attempt. Final collection clears the patch and marks the map immediately; one line **“Home shallows restored”**, then an optional **“Space · Return to raft”** at the surface.
6. Returning to the raft exposes a quiet **“Bench · Make something for your next voyage”** prompt, dismissible by any other action. The bench explains the existing waterwheel's purpose before asking for materials. Cleanup does not grant currency or gate the bench. Returning saves skip completed tutorial beats; derive prompts from current state, not forced timers.

Opening should demonstrate a desired action and changed place before presenting the existing progression catalogue. No timed requirement to follow this order.

## UI layout and hierarchy

Use existing cream/teal field-kit styling and readable 16–18 px action/body type, 14–16 px secondary type, 44 px minimum controls. Normal text needs 4.5:1 contrast. One active action surface; text never crosses the raft/diver silhouette.

| Layer | Sailing / raft | Cleanup |
| --- | --- | --- |
| Top left | Compact location and tide phase; expand exact exposure forecast only for a selected tidal target | Site name and collected count, e.g. 2/6 |
| Top right | Pause and compact labeled Map / Journal access | Breath bar with numeric seconds; Pause |
| Bottom edge | Labeled Helm, Bench, Cabin access off helm; Leave helm while sailing; one contextual action above or beside it | One contextual collect/return action; compact movement help only until understood |
| On demand | Map, journal, inventory and bench detail replace each other in a single panel | Failure card or pause; no map/build panels over live breath countdown |

At 1440×900 use a maximum 340 px station panel aligned to one edge, with the raft framed in the remaining space. At 900×900 use a bottom station sheet no taller than 40% of the viewport, reframing the station above it. At 640×720 retain labeled access in a compact Raft menu rather than reducing text. Panels may scroll internally; primary actions remain reachable. No permanent minimap, resource bank, objective card and full controls bar together. During unpanelled play aim for at least 70% unobstructed world area; inspect actual captures rather than relying on this percentage alone.

Toasts occupy one reserved slot, last about 2 seconds, and do not queue routine movement messages. Storage failure remains persistent and separate. Inventory appears within the bench/journal and briefly alongside a collected-material result. Pause/help contains the full controls. Focus is visible, modal focus contained, and closing restores focus to the originating control.

## Raft stations and gathering

**Helm:** click the actual steering wheel, not the side paddle wheel. A forgiving proxy hit volume supplies selection independently of mesh batching. Entering sets state.helm true; leaving sets false and stops propulsion. No drift simulation needed. Direct station selection leaves the helm before opening its view. Decorative objects get a short inspect label on deliberate click, without implying each is a new subsystem.

**Bench:** use a real visible work surface plus a focused existing-recipe card. Start with Waterwheel: “Store tide power · Reach Mangrove,” existing cost 6 wood / 2 scrap, owned/missing amounts and Build. Show a subdued preview of the existing Upgrade_waterwheel subtree in its final position; reveal the solid model on construction. Once built, show stored power and the next existing upgrade's concrete function. Avoid dumping all five recipes on first opening. Existing build rules require the fixed home anchorage: away from home allow inspection and explain “Build at home anchorage,” with Map access. Do not promise unrestricted crafting aboard until domain rules change.

**Cabin:** clicking its door opens a small cutaway/planning view containing a chart table and shelf for the current snorkel kit. Chart selects Home shallows and shows its affected/restored status; selecting a destination uses existing navigation behavior, with first discovery still requiring sailing. The kit label explains surface breathing; it neither sells gear nor changes legacy rigs. Journal is the cabin's voyage record. This is a usable planning station, not a full interior to walk through. Keep the exterior cabin intact when the view closes.

**Surface acquisition:** E selects nearest eligible item inside gather range, stable tie-break by ID; the highlight and prompt name that exact target. A 300–450 ms lift/arc to raft cargo, short material sound and “+N wood · Waterwheel X/6” connect action to use when that recipe is selected. Credit is domain-immediate; animation cannot double-award or delay saving. Reduced motion uses a brief object highlight and updated cargo amount. No hold-to-collect minigame.

Floating wood follows surface height and remains collectible at all tides. Anchored timber gets visibly grounded/tethered geometry and its own name, e.g. “Stranded timber”; when inaccessible, say “Covered · exposed in Ns,” from the same threshold as the domain. Submerged finds sit below the surface. Do not let an unavailable nearby object hide an eligible gather target. If nothing is eligible, show the closest blocked target's reason. Reproduce rising/falling tide targeting in-browser before declaring Jaco's incident fixed.

Keep existing journal rewards explicitly optional and secondary for this bounded pass. Their buttons name the payout (“Claim 2 wood + 1 scrap”), and the result shows changed amounts/use. Cleanup completion is automatic, never another journal claim. No reward balance rewrite is needed to validate restoration.

## Controls and input ownership

| Context | Input | Result |
| --- | --- | --- |
| Raft inspection | Drag empty world; wheel scroll | Orbit raft; bounded zoom, never below deck or inside cabin |
| Raft inspection | Click object / labeled button | Helm, bench, cabin or brief inspect feedback |
| Helm | W/S or Up/Down | Forward/reverse along heading; release stops |
| Helm | A/D or Left/Right | Turn left/right, including at rest; no strafing |
| Helm | Leave helm button / H | Stop and return to raft inspection |
| At cleanup buoy | Space / Snorkel button | Leave helm and enter cleanup |
| Active cleanup | W/S or Up/Down | Ascend/descend in site-local vertical axis |
| Active cleanup | A/D or Left/Right | Swim left/right; normalized diagonal speed |
| Active cleanup | E / Collect button | Collect nearest eligible trash within reach |
| Cleanup surface | Space / Return to raft | Exit; unfinished attempt discarded, completed site retained |
| Failure | Retry / Return to raft buttons | Fresh attempt immediately / exit |
| Surface raft | B / J / M | Bench / journal / map; leave helm before station view |
| Any play | Escape | Close top panel, otherwise pause; never silently abandon cleanup |

Space underwater away from the surface never teleports upward. Show “Swim up to return” if pressed there. At the surface, returning before completion has the concise label/help “Return to raft · restart cleanup later”; no checkpoint promise. Failure initially focuses Retry; Enter activates the focused button. Ignore the key that caused the transition until released, so held keys cannot retry or exit unintentionally. Clear held inputs on blur, pause, view transition and focus inside UI. Prevent browser scrolling only for handled game keys outside text controls. Pause and hidden-tab state suspend breath and movement.

Heading is radians, bow +Z. Forward vector is (sin heading, cos heading) in world X/Z; W adds it and S subtracts it. D decreases heading and A increases it: with Y up, bow +Z and a camera behind at −Z looking toward +Z, screen right is world −X. Reverse does not invert the meaning of A/D. Renderer consumes heading; it must not derive a competing heading from movement. Camera orbit never changes vessel heading. Cleanup uses its own x/y, never vessel position or heading.

## Side-on cleanup proposal

Use a bounded 3D diorama viewed along Z, with movement strictly in local X/Y. Initial tuning: x from −9 to +9, y from −7 to 0, surface at y=0; six trash at (−6,−1.5), (−2,−3), (3,−2), (7,−4.5), (1,−6), (−5,−5). Spawn at (−7,0). Art positions may be adjusted for silhouette separation without creating an obstacle puzzle. Use a 1.2-unit collection radius and 2.2 units/second movement, 24 seconds of breath (PM tuning override, pending playable test) and roughly 3 seconds to refill fully at surface. These are starting constants, independent of legacy rig air, to tune through play.

Keep the entire surface line visible and reachable vertically from every trash location. At wide aspect fit the 18-unit patch with margins. At square aspect widen vertical framing enough to retain patch width, rather than cropping side trash. Do not zoom out until the swimmer becomes a speck: target at least 48 CSS px for the body silhouette at tested desktop sizes, visibly distinct goggles and bag. If framing fails, compress the authored layout before adding scrolling. Keep foreground vegetation below/behind the swim plane and exclude the raft hull from the swimmer's sightline; a small raft edge above the entry establishes location.

Layer pale sand and limestone at the rear, clustered coral/grass behind targets, trash and swimmer on the action plane, and sparse distant fish. Avoid collision mazes. Local desaturated green haze sits behind the affected patch; no opaque green overlay over the player or UI. Surrounding water stays turquoise. After completion clear the haze, reveal warmer sand/coral color and bring fish into the cleaned area. Readability must improve without flashing or globally recoloring the ocean.

The snorkeler needs face-mounted goggles, a visible snorkel ending above water when breathing, and a calm horizontal swim pose. Reuse existing articulated Explorer but correct the raised greeting arm and boot-heavy silhouette; goggles currently on the head are not sufficient. At surface, lift the face/snorkel and use a quiet tread/breath pose, small ripple and rising breath meter. No scuba tank or fins.

A cream mesh sack with a coral tie trails about 0.7–1 body length behind the swimmer. A visible curved string attaches at the waist; it never crosses the face or becomes a long straight spike on turning. Bag lag is presentation-only with bounded distance and scene-bound clamping. Derive fill from collected IDs, with at most about 35% size growth. Each pickup visibly transfers to the bag over 300–450 ms, with a small settling motion. Do not require a physics rope. Reduced motion snaps to readable trailing placement and preserves transfer confirmation without oscillation.

## Attempt and persistence contract

Adopt the PM proposal exactly: state.helm boolean; state.heading radians; state.cleanup = { completed: siteIDs, attempt: null | { siteId, status: 'active' | 'failed' | 'complete', x, y, air, collected: trashIDs } }. One stable home site ID and fixed trash IDs. Bag fill, remaining trash, tint and map status are derived; do not persist competing counters.

| Event | Required result |
| --- | --- |
| Enter unfinished site | Fresh active attempt at surface, full air, empty collected; helm false |
| Surface during active attempt | Replenish air; preserve collected and the same attempt |
| Collect final trash | Atomically add site ID once to completed and set status complete; save immediately; permanent restoration begins |
| Air reaches zero before completion | status failed, collected cleared, bag empty; freeze controls and show failure card |
| Retry | Reset position, air, every trash and temporary effect; new active attempt, no cooldown |
| Return before completion | attempt null; raft at site, helm false; no partial credit |
| Return after completion | attempt null; completed unchanged |
| Reload unfinished/failed attempt | Return to raft with attempt null and helm false; no partial cleanup retained |
| Reload after successful last pickup | Site remains completed; return safely to raft, no exit requirement |

Completed status stops breath failure immediately: returning to the surface is optional movement, not a new challenge. Surface restoration/map check is awarded once even if repeated E events arrive. If final collect and exhaustion meet on a frame boundary, engineers must give a deterministic rule: accept collect only while active with positive air; an already accepted final collect is never undone by the subsequent update. A completed site stays visitable as clean scenery, with no trash regeneration or repeat reward.

Keep legacy inventory, upgrades, discoveries, rigs and expedition records intact. Cleanup cannot call legacy rescue, apply its cooldown, advance Pearl trail markers or reset that route through ordinary breathing. Migration initializes empty cleanup for old saves; no existing pearls become cleanup credit. Saving an unfinished attempt can normalize it to a raft return in the serialized copy without ejecting the live player. A storage error must remain visible; do not claim completion survived reload until verified.

Failure copy: **“Out of breath. This cleanup starts over.”** Buttons **Retry cleanup** and **Return to raft**. No lost materials, paid retry, countdown or preserved trash subset.

## Sailing camera comparison after baseline

Build only two selectable configurations over identical heading/movement rules and the same disposable starting save. A: eye at the steering station, looking over the bow, stable horizon, approximately 65° vertical FOV. B: close following camera behind the bow direction, approximately 45° vertical FOV, offset initially (0,6,−12) in vessel-local coordinates, looking ahead. Final anchors must be checked against actual shell/canopy bounds. Neither camera inherits raft bob/roll. Do not make pointer lock a prerequisite; bounded drag-look and a visible Recenter control suffice. Inspection returns to the same orbital view from both.

Run A then B for one agent tester and B then A for another; these are agent comparisons, not human preference evidence. Use 1440×900 and 900×900, same tide, route, speed, targets and quality. Sequence: click helm; sail straight; turn 90°; reverse; approach floating salvage and gather; stop; leave helm; inspect cabin and bench; re-enter; approach cleanup buoy. Capture entry, turn, approach and station transitions, plus short motion recording.

Record wrong-direction inputs, overshoots, lost-target moments, accidental station selection, view clipping, time spent searching and camera discomfort observations separately from completion time. Hard gates: input direction correct, no geometry blocks the forward route/target, wheel click works, leaving stops motion, station controls never steer, and both aspect ratios retain usable targets/UI. Compare target recognition, vessel orientation, station continuity and visual appeal on anchored 1–5 reviewer judgments; do not change the project's weighted rubric. Favor neither perspective by giving it extra movement assistance. If tied, use follow as the provisional default for nearby-world visibility, keep the camera setting available, and record that human preference is unresolved. Never report this recommendation as the result of an experiment not yet run.

## Practical art reuse and verification handoff

Existing pipeline: Three.js/Vite, GLBs loaded from public/assets, editable assets/workshop.blend and island.blend, scripts/build_assets.py exporting optimized batches with named upgrade and moving roots. Bow +Z and Y-up are verified documented conventions. Current explorer has four rigid articulated limb roots, not a skinned rig or animation clips. Clone all of Explorer, preserve imported limb pivot translations, and share geometry/materials unless editing appearance. Current workshop metadata in art-direction reports 41,976 triangles and 79 primitives; verify the actual candidate export before budget claims.

Reuse workshop, islands, landmarks, palette, upgrade reveals and existing explorer limbs. Add goggles/snorkel, bag/tether, six simple trash instances and a small reef diorama as separately owned asset work. Reuse rounded timber/rope/material helper functions. Cabin/bench hit areas should be explicit semantic proxies: static export batching means source object names do not necessarily survive as separately selectable geometry. A cabin cutaway can be a modest separate asset or composed view; an opening door requires a preserved pivot/export boundary and is not already supplied. Do not regenerate the whole workshop solely to implement click targets. Keep title art unchanged apart from presentation motion.

Before integration approval, capture matched title and first view; test wheel/bench/cabin by pointer and keyboard; observe nearest-target highlighting over rising/falling tides; compare both sailing cameras; inspect diver, bag and surface breathing in wide/square layouts; fail after partial collection and retry twice; finish, reload and revisit clean water. Capture near-empty air plus last pickup, incomplete save/reload, focus loss and reduced motion. Repeated scene entry must reuse/dispose assets correctly; apply the existing hardware performance protocol and unchanged rubric. These are required future checks, not results from this document-only pass.
