# Fifth improvement domain report

## Diagnosis and red evidence

Used `/Users/jacobusbrink/.codex/skills/diagnosing-bugs/SKILL.md` before implementation. Deterministic tests exercise the real game facade: enter the home pearl dive, finish the held pickup, then update oxygen or request exit. The reproduction places the diver at the target to isolate lifecycle behavior; subsequent route tests exercise actual swimming.

Before the fix, `node --test tests/fifth-domain.test.js` produced:

- `objective completion keeps underwater oxygen ticking`: actual air `24`, expected `23` after `updateGame(state, 1)`.
- `completed diver cannot leave below the surface`: actual `cleanup_left`, expected `surface_required`; the regression also checks rejected exit leaves state unchanged.

Ranked hypotheses were published before probes:

1. Oxygen's active-only guard excludes completed attempts. Allowing completed attempts through should restore depletion. Confirmed in `updateCleanup`.
2. Leave dispatch lacks a surface gate. Gating exit by depth should reject underwater exits atomically. Confirmed in `cleanupAction`.
3. Objective completion and physical dive lifecycle share a terminal status. Keeping completion as an earned-objective state while continuing breathing should retain rewards through exhaustion and prevent retry payouts. Confirmed by completion/exhaustion/retry/reload tests.

Follow-up red command: `node --test --test-name-pattern='legacy collected relic' tests/fifth-domain.test.js`. A legacy collected home pearl bed without a trophy returned `undefined` from contextual detection instead of `salvage:home-pearls`. Ranked predictions: collected-node filtering suppresses relic revisits; both detector layers must admit the site; permanent material completion must still suppress payout. A shared `hasMissingDiveTrophy` predicate now applies in both `game.js` and `cleanup.js` dive detection. The regression uses `getContext`, both `getDiveSite` functions and `act('dive')`, earns Brass Compass, checks material remains absent from salvage listings, and proves supplies/gathered totals remain unchanged.

## Lifecycle and compatibility

Completion pays original resources and awards the site's relic immediately. Completed attempts continue to consume oxygen below the surface and refill at the surface. Leaving any living attempt requires y >= -0.35. Exhaustion rescues to (0,0), marks failed, clears transient targets/pull progress, and preserves already earned supplies and keepsakes. Unfinished cleanup trash resets; an unfinished survey also resets on surfacing. Retry respects permanent completion instead of reconstructing unpaid work and cannot duplicate rewards. The existing final-frame air gate prevents completing a pickup when remaining air is insufficient for that frame.

Save version remains 2 and cleanup revision remains 3. Attempts are transient on load. `trophies` defaults to [] in legacy saves and validates against unique known IDs. Existing earned inventory, collected salvage, restored reefs and expedition records are preserved. An already rewarded site lacking its relic starts a fresh objective attempt; permanent site completion prevents another material payout. Collected salvage relic sites remain reachable through contextual Dive until their trophy is earned. No relic is fabricated by migration.

## UI and art API

`game.js` re-exports `DIVE_TROPHIES`, `diveSeed`, and `generateDiveWorld` from `src/dive-world.js`. `DIVE_TROPHIES` is an immutable array of `{id,name,description,siteId,art}`. `state.trophies` contains permanent IDs; `art` is the trophy ID.

| Trophy ID / art | Name | Dive site ID |
| --- | --- | --- |
| nautilus-shell | Nautilus Shell | home-reef |
| glass-float | Glass Fishing Float | sheltered-cove |
| brass-compass | Brass Compass | salvage:home-pearls |
| coral-fossil | Coral Fossil | salvage:reef-pearls |
| captains-bell | Captain’s Bell | salvage:horizon-wreck |
| pearl-crown | Pearl Crown | survey:pearl-trail |

`getCleanupSite(state, siteId)` returns existing site fields plus immutable metadata:

- `seed`: stable unsigned 32-bit hash of site ID, independent of attempts, time and saves.
- `biome`: `coral-garden`, `kelp-forest`, `sand-gullies`, `basalt-arches`, `shell-shelves`, or `wreck-garden`; mangrove uses kelp and horizon uses wreck.
- `terrain`: 15 `{x,y}` points, ordered from x -28 to 28, with seabed y -16..-18. This is a decorative collision-free seabed polyline. Art must preserve traversable routes.
- `trash`: existing target IDs/names with stable generated side-view positions. Negative y is depth; movement input z positive descends.
- `trophy`: the matching trophy metadata or null.

All sites retain bounds x -28..28, y -18..0. Single salvage targets and restoration targets use lateral offset 3..10m and depth 10..15m. At unchanged speed 2.2, conservative direct round trips plus 0.8s action retain at least five seconds of the 24-second breath. Restorations allow separate breaths. Survey targets descend through 6,9,12,14m with a compact seeded horizontal circuit; the complete one-breath survey plus ascent retains at least four seconds. `getCleanupContext` also exposes `canLeave` and `objectiveComplete`; `completed` describes permanent site progress, so legacy trophy revisits can be active while completed is true.

Beacon recipe and guiding-light objective now promise a visible guiding light above the raft instead of a visiting workshop or character.

## Verification and scope

`npm test`: **118 passed, 0 failed** after the contextual revisit and beacon updates. Eleven fifth-domain tests cover both original regressions, seeded stable distinct worlds, actual swims for every undersea resource, both restorations, the one-breath survey, all six relics, payout/retry/reload protection, strict trophy validation, legacy restoration revisits and contextual legacy salvage revisits. Historical domain expectations were deliberately updated for continuing oxygen, surface-only exits and seeded positions.

Files changed: `src/cleanup.js`, `src/game.js`, new `src/dive-world.js`, `tests/cleanup.test.js`, `tests/third-domain.test.js`, `tests/fourth-domain.test.js`, new `tests/fifth-domain.test.js`, and this requested report. No UI, art, reviewer tests or dist build were edited/performed. No debug instrumentation remains. Visual biome rendering belongs to the art/UI integration; domain tests verify metadata and reachable geometry.
