# Tidekin

A little workshop. An endless ocean.

A single-player 3D ocean workshop prototype: sail between limestone islands, restore reefs, gather supplies and grow a floating home. Progress stays in this browser. Current candidate: **0.6.0-beta.1**.

## Run locally

Requires Node.js 20.19+ (or 22.12+) and a WebGL-capable desktop browser.

```sh
npm install
npm run dev -- --base / --port 5181
```

Open http://127.0.0.1:5181. Keep the same origin/browser/profile to retain your save.

```sh
npm test
npm run build -- --base /
npm run preview -- --base / --port 5181
```

## Play

**W/S** sails along the bow, **A/D** steers. The raft is always controllable during play. The camera follows in third person. **E** gathers the one nearby highlighted item; reach includes the raft footprint. Orange flags mark reef dives.

**Space** dives. Underwater, **WASD** swims at the original 2.2 m/s pace; hold a nearby object with the pointer to pull it free. **Hold E** provides a keyboard fallback. Swim to the surface to refill 24 seconds of air. The camera follows seeded reef layouts down to 18 metres, with single finds 10–15 metres deep. Air keeps draining after collection: reach the surface before boarding. Restore all three objects for supplies. Failure resets the attempt; retry immediately. Surface breathing retains static cleanup work, while the optional Pearl survey requires one breath. Leaving or reloading discards unfinished work.

**B** opens the workshop's current illustrated plan. Material pictures show held/required counts. Building attaches the actual upgrade to the raft in a short assembly sequence. The first waterwheel costs six wood and two scrap: floating starter timber plus both reef restorations can fund it.

**M** opens the chart. Track a shore or home to display a destination bearing. First visits require sailing; discovered shores allow passage. **J** opens earned and current journal tasks. **C** opens the cabin’s materials and six collectible keepsakes. Select a shelf to read its discovery story. Every page has left/right carousel controls; the arrow keys cycle pages too. Drag the world to orbit, scroll or +/− to zoom, Q/R to rotate. Closing a panel returns to following view. **Escape** pauses.

## Saves and settings

The existing `tidekin.save.v2` key and saved progress are retained. Legacy helm fields are ignored. Old underwater attempts return aboard, preserving completed restoration, supplies, upgrades, discoveries and expedition records. No practice or comparison modes remain.

Pausing retains the live attempt. Reload discards unfinished cleanup. Successful completion, its once-only payout, and any unique keepsake save together. Exhaustion retains earned rewards. Autosave runs every ten seconds and on important transitions. Save failures remain visible and retry automatically; replacing a voyage requires confirmation.

Settings: sound, world detail, reduced motion and larger text. Reduced motion shortens assembly and suppresses secondary effects.

## Implementation and evidence

- `src/game.js`, `src/cleanup.js`: deterministic rules, progress and save validation.
- `src/scene.js`, `src/build-cinematic.js`: ocean world, third-person cameras and upgrade assembly.
- `src/cleanup-scene.js`, `src/character-art.js`, `assets/cleanup/reef-art.js`: articulated character and scrolling reef.
- `src/main.js`, `src/style.css`, `src/chart-art.js`: illustrated menus, input, map and persistence.
- `assets/ui-fourth/`, `public/assets/ui-fourth/`: original image-generation provenance and shipped painted artwork.
- [Fifth improvement review](docs/reviews/fifth-improvement/report.md): deeper procedural dives, reactive fish, keepsakes, carousel, oxygen and save fixes.
- [Fourth improvement review](docs/reviews/fourth-improvement/report.md): changes, independent scores, acceptance and hardware evidence.
- [Performance protocol](docs/performance-budget.md): hardware gates and measurement limits.
- [Research](docs/research/cozy-systems.md): earlier game research and design context.

Browser checks use isolated storage; fixtures are explicitly distinguished from earned play. Run hardware benchmarks alone. Historical comparison code in archived tests/reports is evidence, not available gameplay.

## Prototype limits

Five authored workshop modules, two repeatable expedition routes and a small archipelago form a bounded vertical slice. Construction is predetermined. The underwater area is wider and deeper, but remains a modest exploration space. Illustrated menus accompany a real-time procedural underwater world. Agent review does not establish human enjoyment or approval.

## Island authoring lab

Run `npm run islands:dev` for the maintained seeded biome tool on port 5188. See the [tool guide](tools/island-lab/README.md), [reference-to-biome procedure](docs/studies/biome-generation-procedure.md) and [visual study review](docs/studies/biome-review.html). Jaco retained these as a decent starting point. They are development tooling and evidence, separate from the shipped game. [Game integration proposal](docs/studies/island-game-integration.md).
