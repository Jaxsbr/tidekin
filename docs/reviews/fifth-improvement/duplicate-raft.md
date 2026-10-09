# Duplicate raft diagnosis

The reported symptom was a second, smaller complete workshop raft near Beacon Shoal after save and Continue, with the fully upgraded player raft in the foreground.

## Actual renderer reproduction

The dedicated harness, `scripts/qa-duplicate-raft.mjs`, runs the source app on temporary port 5186 in a disposable Playwright browser context. It seeds a validated upgraded save at Beacon Shoal with day 4, high tide, and inventory 71 wood / 35 scrap / 17 pearls, then exercises the actual Continue and save paths. Browser-only module instrumentation exposes the Three.js scene so the harness can count visible complete workshop roots; the application source does not retain this instrumentation.

Before changing `src/scene.js`, this command was run:

```sh
RAFT_RUN=red node scripts/qa-duplicate-raft.mjs
```

It exited 1 with the exact symptom:

```text
continue-beacon: rendered complete rafts=2; expected=1
save-continue: rendered complete rafts=2; expected=1
reload-continue: rendered complete rafts=2; expected=1
AssertionError: continue-beacon: duplicate complete raft rendered
2 !== 1
```

Retained evidence: [red results](../../../captures/duplicate-raft/red/results.json). A subsequent pre-fix capture used heading π to put the smaller raft in view alongside the upgraded player raft: [matching red screenshot](../../../captures/duplicate-raft/red-matched/continue-beacon.png).

## Ranked hypotheses, stated before testing

1. **Beacon-triggered visitor clone.** If a visitor clones the workshop when beacon is enabled, disabling only beacon should remove the second raft.
2. **Continue accumulates player objects.** If Continue adds another player raft without removing the previous one, repeated Continue should increase the count beyond two.
3. **Duplicate geometry in the workshop asset.** If the loaded asset contains the second complete raft, it should persist with beacon disabled on the first Continue.

The red evidence and ranked predictions were posted in commentary before hypothesis tests. An attempted parent update was refused because the destination was the native ancestor; no direct parent delivery was available through that tool.

## Findings and cause

The beacon-off probe (`RAFT_RUN=beacon-off RAFT_BEACON_OFF=1 node scripts/qa-duplicate-raft.mjs`) passed all three Continue/reload checks with one complete raft. With beacon enabled, repeated Continue stayed at two, rather than accumulating additional objects. These results support hypothesis 1 and reject hypotheses 2 and 3 for the reported symptom.

The renderer explicitly created `visitor = raft.clone(true)`, scaled it to 0.48, added it to the world, enabled its visibility when `state.upgrades.beacon` was true, and animated it around a fixed world location. Continuing the upgraded save restored the beacon condition and therefore displayed the visitor. This was an intentional feature: the beacon recipe promises that a friendly workshop will sail over to greet the player, and retained fourth-improvement art notes reference the visitor clone. The user nevertheless requested its removal as a duplicate-raft bug.

The fix removes the visitor allocation, visibility toggle, and motion update. It retains the player's workshop and beacon light. No camera capabilities were removed. The beacon recipe's visitor promise is a parent follow-up outside this specialist's source ownership.

## Regression and screenshot proof

```sh
RAFT_RUN=green node scripts/qa-duplicate-raft.mjs
node --test tests/*.test.js
```

The renderer regression exited 0 with one complete raft for initial Continue, Save & quit → Continue, reload → Continue, travel home, travel to Beacon Shoal, before beacon construction, during construction, and after the build presentation completed. It also checks that mouse drag orbit and wheel zoom change the camera position. All 116 existing tests passed.

Retained evidence: [green results](../../../captures/duplicate-raft/green/results.json), [matching green screenshot](../../../captures/duplicate-raft/green/continue-beacon.png), and [completed beacon construction](../../../captures/duplicate-raft/green/beacon-build-complete.png). The matching screenshots visibly show the smaller distant workshop disappearing while the upgraded player raft remains.

`getStats()` retains the spread of `cleanupView.getStats(camera, rect, lastState)`, preserving forwarding of new cleanup art fish/layer metadata.

The work used isolated browser storage and source preview 5186. It did not modify the user's save, production baseline 5181, candidate 5182, or build `dist`. The temporary 5186 preview was stopped after documentation.
