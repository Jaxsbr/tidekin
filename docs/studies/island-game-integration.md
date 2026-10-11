# Bringing authored biomes into Tidekin

Status: **proposal for discussion**, 11 October 2026. No runtime or save changes in the lab PR.

## What the current game assumes

At `origin/main` baseline `79da54b`, [game.js](../../src/game.js) exports three fixed `ISLANDS`, with IDs, positions, discovery radii and upgrade requirements. `SALVAGE_NODES`, `CLEANUP_SITES`, `SHOALS` and expedition waypoints also contain fixed positions. `scene.js` clones the same `island.glb` at those locations with an additional visual offset, so render geometry is already distinct from the domain's discovery circle.

Some objectives are reusable already: gather wood/pearls and build an upgrade. Others name `mangrove` directly, or assume exactly four discoverable places including home. The chart and tracked targets use these IDs and coordinates. Cleanup and keepsake rules also refer to named sites. Save validation checks known IDs, unlock prerequisites, exact collected-node resource totals and whether remaining resources can fund the next upgrade. Adding arbitrary generated IDs without updating that model would make saves invalid or progression impossible.

Scale is another integration problem. Existing destinations are tens of world units apart and have radii 10–12. Lab islands extend roughly 140 units from their center, with review cameras 260 units away. Dropping them at today's coordinates would overlap the world. The current sailing square is also bounded at ±150 world units. World spacing/bounds, sailing speed/time, camera framing, collision and rendering range need a joined study.

## Recommendation: curate recipes, generate islands, author reusable activities

The choice is not restricted to fully random worlds or manually building every imported island. Ship selected, versioned recipes (biome + seed + settings). Generate their geometry at load time or bake/cache it during a build. Both can use the same content description. Later, permit new seeds within biome rules that have passed validation and sampling. Art curation and the time at which geometry is generated are separate decisions.

A proposed shared `IslandDefinition` should contain:

- Stable island ID, biome/version, recipe and world placement.
- Shore/terrain footprint and traversable surfaces used consistently by rendering and collision; visual route lines alone do not establish access.
- Named activity locations with capabilities: a reachable beach, stream outlet, root snag, timber cache, dive entrance or landmark. These need positions, access rules and validated space for their activity.
- Resource/reward budget, difficulty/unlock tier and stable IDs for findings.

The generator supplies usable places. Reusable activity templates supply the interaction: clear a blocked outlet, recover a net from roots, collect driftwood or survey a reef. A placement step binds an activity only to a compatible, reachable location. Quest creation selects those capabilities and stores the resulting concrete island/activity IDs; it must not choose a different target on each load. Unique story events can still be intentionally authored.

Examples: “restore a freshwater source” binds to a generated waterfall island's `stream-outlet` location; “recover a tangled net” binds to a mangrove `root-snag`. A new seed can reuse these activities. A genuinely new biome mechanic still requires content and code work. Procedural placement multiplies variety; it does not invent meaningful experiences by itself.

## Trade-offs

| Approach | Strength | Ongoing work |
| --- | --- | --- |
| Curated recipes, generated on load | Small content files, repeatability, tool/game agreement | Load cost, generator version retention, curated seed review |
| Curated recipes, baked geometry | Predictable runtime rendering/import costs | Build/export pipeline, storage; still needs gameplay locations and content |
| Unrestricted runtime seeds | Largest layout variety | Strongest navigation/progression validation, fallback seeds, save/version strategy, broad seed testing |

Start with curated recipes. Baking can be a later performance decision without changing quest authoring. Keep landmark/story islands curated even if ambient islands eventually vary per voyage.

## Smallest useful integration slice

1. Introduce a world-definition module populated with today's existing IDs/positions first. Let domain, chart, scene, cleanup and save validation consume that definition. Preserve existing saves and progression tests before adding generation.
2. In an isolated playable study, use one curated B recipe plus the raft, collision, one usable beach and a single stream-outlet activity. Investigate world scale, travel time and approach from all four sides. Surface walking needs its own implementation; it is not supplied by the current scenery lab.
3. Add stable activity locations and resource budgets. Prove reachability, upgrade affordability and once-only completion rewards; save/reload must preserve collected items and the quest's bound target.
4. Add A/C using the same definition and reusable activities, then sample multiple seeds. Allow unconstrained runtime generation only after those checks and a human gameplay review support it.

For persistence, record the world/content version and resolved island/activity identities. Store the resolved world description or retain the exact generator versions needed by old saves. A seed alone is insufficient when generator rules change. Provide an explicit migration for existing voyages; do not silently regenerate their world or reset their progression. Freeze a quest target at creation and preserve claimed rewards through migration.

Acceptance for the first playable island: convincing approaches and shore hierarchy, an accessible landing, one rewarding activity, correct save/reload and no resource softlock, with measured cost on target hardware. The lab's still-image scores answer none of those gameplay questions.
