# Fifth improvement — acceptance criteria

The user's fourteen requested changes are the scope. Preserve illustrated menus, original swim pace, earned progress, and the localhost:5181 save origin. Source/assets/dist baseline retained in captures/fifth-improvement/baseline; user's three screenshots are the initial visual evidence.

- Remove Look controls/menu and manual Save; drag/orbit/zoom remain. Autosave retries and storage failure remain understandable.
- Four destination panels form a wrapping carousel with pointer and keyboard navigation, retaining dialog focus and accessible names.
- Cabin shows materials plus individually earned, persistent unique finds; empty displays explain where to find them.
- Underwater world uses coherent modeled scenery, actual multiple-depth parallax, visibly seeded site differences, detailed silhouettes/materials, and a softened living surface transition. Compare normal playing-size captures over multiple iterations; passing tests is not a taste verdict.
- Single-item dives require meaningful depth/travel, with a feasible ascent and unchanged 2.2 swim speed. Procedural layouts are stable through save/continue.
- Fish exhibit observable flee/curious and follow/return behavior around anchors, not only looping decoration.
- Oxygen continues after collection; below-surface return is rejected for active and completed dives. Failure/retry cannot duplicate rewards or trophies.
- Air has its own readable visual meter. Objectives use object images and completion states separately. Hide underwater location/day/tide, tooltip, and Space-return indicator.
- Save/continue renders exactly one raft in the reported upgraded Beacon scenario.

Verification: deterministic red regressions, domain suite, isolated browser actual input including an earned deep collection/ascent, wide and square menu/HUD captures, underwater site comparisons, fish behavior checks, renderer lifetime and performance check. Record fixture evidence separately from earned play. Visual judgment and fun remain subjective and must be labelled.
