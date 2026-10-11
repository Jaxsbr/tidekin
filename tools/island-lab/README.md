# Island lab

Maintained authoring tool for A Lagoon, B Waterfall island and C Mangrove shoals. Run from the repository root:

```sh
npm ci
npm run islands:dev
```

Open `http://127.0.0.1:5188/tidekin/tools/island-lab/`. The server uses a separate port from the game; the lab writes no browser storage. The production build includes neither this entry point nor the retained study evidence.

Choose a biome/seed, tune sliders, then **Regenerate**. **New seed** varies the layout. WASD flies, Q/E changes elevation, drag looks, Shift accelerates and the wheel adjusts speed. Buttons or 1–5 select matched cardinal/overhead views. Show guides to inspect proposed routes and landing locations; these are not collision-certified.

**Copy recipe link** preserves settings. **Export recipe** records the layout and comparison fingerprint plus camera metadata; **Restore exported recipe** validates/rebuilds it and resets the camera to North. Camera metadata is review context, not replayed input. Version 4 imports v3 with an explicit upgrade; v1/v2 use retained historical tools. P3 and P4 are presets, not approval states. Human approval is recorded separately against retained evidence.

`generator.js` is the pure data interface: `generate(biome, seed, settings)` validates bounds and returns a deterministic layout; `restoreRecipe(json)` verifies version/identity and regenerates geometry descriptors. No Three.js, DOM or storage is needed. `scene.js` owns rendering/resources, and `lab.js` owns controls. This layout is not yet the game's future island/content format.

```sh
npm test
npm run islands:check
# Once per machine, install the locked Playwright browser:
npx playwright install chromium
# Leave islands:dev running in another terminal:
npm run islands:verify
npm run islands:capture -- p4 my-study
# Capture a tuned export (or a JSON array of exports):
npm run islands:capture -- recipe tuned-study /absolute/path/recipe.json
```

Capture saves nine recipes × five matched views, browser/version/viewport/clock, source hashes and errors under `output/island-lab/my-study/`. Existing runs are never overwritten. `ISLAND_LAB_URL` overrides the served tool URL. Set `PLAYWRIGHT_CHANNEL=chrome` to use installed Chrome instead of bundled Chromium. Capture output is temporary until explicitly retained with ratings and provenance.

Follow the [operating procedure](../../docs/studies/biome-generation-procedure.md). The [visual review](../../docs/studies/biome-review.html) and [adoption record](../../docs/studies/island-lab-adoption.md) distinguish historical results, Jaco's disposition and remaining limitations. Future renderer/rule changes require a new version, matched views and an explicit review; do not overwrite frozen evidence.
