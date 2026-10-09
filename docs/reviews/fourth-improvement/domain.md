# Fourth improvement domain contract

The user’s final choice supersedes the third improvement comparison controls.

## Renderer seam

`steerGame(state, dt, { x, z, interact, targetId })` accepts frame deltas through 0.05 seconds. Afloat, W/S are vessel-relative forward/reverse (z −1/+1), A/D turn (x −1/+1). Steering is always available; there is no helm field, gate or action. Leaving a side-view dive resumes steering immediately. Legacy boolean save `helm` is validated and ignored; serialized saves omit it.

Side-view directional and pointer controls use the same normalized x/z input (z positive descends). Presentation converts a held pointer direction into x/z and identifies its target with targetId. Holding interact within 1.25 m pulls for 0.8 seconds. Release, changing target or leaving reach clears unfinished pull progress. Pointer aim does not create a cleaning mechanic.

Exports retained through game.js: CLEANUP_SITES, getCleanupContext, getCleanupSite, CLEANUP_AIR (24), CLEANUP_SWIM_SPEED (2.2), CLEANUP_ACTION_SECONDS (0.8), CLEANUP_SURFACE (−0.35), CLEANUP_REFILL (10), CLEANUP_COLLECT_RANGE (1.25). CLEANUP_QUICK_SPEED is removed. Attempt fields are siteId, status, x, y, air, collected, selectedId, actionProgress and facing. No variant, cleaning or practice fields/actions remain. Obsolete option fields do not alter behavior or suppress earned rewards.

## Worlds and earned progress

All side-view adapters expose immutable bounds x −28..28, y −18..0. Home targets retain reef-bottle, reef-can, reef-bag at (−5,−3), (−11,−7), (9,−10). Cove retains reef-rope, reef-tin, reef-net at (6,−4), (13,−8), (−10,−11). Depth 18 is optional exploration: direct descent and ascent at 2.2 m/s fit within 24 seconds. Horizontal travel can be performed at the breathing surface.

Public resource Dive and Pearl trail survey still enter side-view adapters. Node IDs, resource amounts, once-only awards, hull reach, capability gates and survey claims remain intact. Explicit entry also respects recovery. Each restoration retains its 1 wood/1 scrap reward. Static dives retain gathered targets when breathing; an unfinished survey resets on surfacing. Exhaustion clears transient targets, retry starts with full air at the surface, and leaving abandons unfinished work. Reload discards all attempts including historical variant/cleaning attempts while retaining earned supplies, completion, expedition rewards and reset behavior. Save revision remains 3.

## Verification and scope

85 owned domain tests pass with:

`node --test tests/game.test.js tests/cleanup.test.js tests/navigation.test.js tests/third-domain.test.js tests/fourth-domain.test.js`

The superseded comparison-only tests are preserved in tests/historical/third-comparison.test.js.txt outside the active test glob. Remaining third-domain tests were updated to the chosen contract; no compatibility flags were added to force obsolete expectations.

The reviewer-owned tests/third-review.test.js was not edited. Its separate run has 14 passes and 6 failures: four tests assume removed cleaning/variant/practice behavior, one expects a helm event, and one inspects renderer source for an E marker. Thus the full default test command remains red pending reviewer updates. No main, index, style or scene files were edited; no build or browser was run.
