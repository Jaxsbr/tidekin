# Current contract

Authority: this is the observed source contract at `79da54bdbd029090d4ed9d6fd3dd2caea1a4847c`, audited 10 October 2026. Current user instructions and coordinator-approved integration take precedence. It supersedes older iteration documents as current guidance; those documents describe historical intent or measurements. This document establishes neither human enjoyment nor production art approval.

## Product and controls

Tidekin is a local single-player ocean exploration prototype. The human interviews favor purposeful exploration, raft improvements, localized restoration, coherent charming UI, and gradual learning. Preserve the liked title painting and original visual reference. Detailed human statements remain in `docs/reviews/player-interview.md` and `docs/reviews/current-beta-player-interview.md`; their build identity and some incident causes are unverified.

Baseline sailing is always controllable: W/S propel along the vessel heading, A/D steer, E gathers, Space dives. Third-person follow and bounded inspection orbit/zoom are implemented. First-person sailing was a comparison proposal, not a recorded human camera approval. The wheel increases speed and overcomes a visible sheltered-water departure restriction. Workshop construction is aboard the raft, with illustrated plans, costs, and assembly presentation.

Baseline underwater movement is directional at 2.2 world units/second. Pointer hold or held E collects reachable objects. Twenty-four seconds of air continues draining after objective completion. Surfacing replenishes air; boarding requires surfacing unless failed. Static cleanup retains collected objects while breathing; the survey requires one breath. Failure resets the attempt and allows immediate retry. Completion payouts and unique keepsakes are once-only persistent changes; later exhaustion retains earned rewards. Leaving/reloading discards unfinished attempts. Comparison/practice/helm/trailing-basket guidance is historical.

## Architecture and persistence

The coordinator-owned `docs/architecture.md` is the single authority for integrated module ownership, interfaces, storage, and teardown. This contract records gameplay and evidence scope; it does not duplicate the final ownership map. At the baseline, storage coordination lived in `main.js`; the current integration assigns storage to `src/persistence.js`. Consult the final architecture before changing either module.

Preserve the current origin/profile and `tidekin.save.v2` key. Settings use `tidekin.settings.v1`. Validate legacy fields, retain earned supplies/upgrades/discoveries/expeditions, and discard unfinished dives on reload. Save errors remain visible and retryable. Pausing retains the live attempt; input/focus transitions clear held controls. State update and rendering frame deltas are bounded.

## Safe architecture

Use a deep module at the resource-ownership seam: one interface establishes ownership, handles textures/material arrays/instanced geometry/shadows/late callbacks, and disposes each owned resource once. Keep disposal complexity local rather than copying traversals across renderers. The coordinator's added `src/render-resources.js` is integrated work after this baseline; `docs/architecture.md` must describe its final interface and ownership rules. This audit does not certify the new implementation or GPU teardown.

Keep deterministic rules testable through domain interfaces. Renderer construction, DOM, storage, random/wall-clock access, and GPU effects stay in their existing adapters. New assets enter via stable catalogue IDs and recorded consumers, not a runtime catalogue framework. Runtime URLs and save contracts remain unchanged during governance cleanup.

## Evidence limits

Node tests prove selected rules and asset integrity. Browser actual-input checks prove selected integration behavior. Performance results apply to their recorded build/device/viewport/quality; source changes do not inherit frozen-dist measurements. Agent reviews and playtests remain agent judgments. A liked illustration, inherited score, or shipped file does not approve every asset or prove human enjoyment.

The historical panorama provenance claims a loaded painted plane. The baseline source contains no panorama loader or consumer; the unchanged generated PNG is now a named reference outside public shipping assets. Frozen baseline CSS and pickup manifest consume two atlas copies. Current packaging consistently uses the public atlas. Final Candidate13 root and `/tidekin/` builds each contain one PNG, and four Low-quality browser checks verified one successful request at the appropriate path with zero errors and unchanged inputs. Final paired performance remains pending. Consult `docs/governance/parent-integration.md` for the integrated status rather than attributing current changes to the baseline.
