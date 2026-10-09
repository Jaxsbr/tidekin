# Fifth improvement QA baseline

Captured the production fourth build on localhost:5181 before candidate execution. No build, runtime-file write, or server restart was performed.

Evidence: `captures/fifth-improvement/qa/2026-10-09T05-24-14.270Z-baseline/results.json`. Exact entry verified against `captures/fifth-improvement/baseline/dist/index.html`; served asset SHA-256 fingerprint unchanged before/after. Both viewport cases passed with no browser errors.

Each of `1440x900-labelled-save-fixture/` and `900x900-labelled-save-fixture/` contains the original source screenshots:

- `01-menu-labelled-save-fixture.png`
- `02-cabin-labelled-save-fixture.png`
- `03-pause-labelled-save-fixture.png`
- `04-deep-reef-labelled-save-fixture.png`

These are synthetic home-save fixtures with 7 wood, 4 scrap, and 2 pearls, explicitly not earned progression. The saved state and input log are in results.json. Frozen baseline domain modules were used rather than concurrently edited candidate source. Chrome was launched independently without a user profile, using a fresh nonpersistent browser context per viewport.

Wide deep screenshot visually inspected: fourth build retains top-left Home Reef/location text and combines numeric objective fraction and air in the top-right meter. Candidate checks require their fifth replacements. Existing source/assets/dist baseline snapshots remain owned by the parent and were not modified.
