# Second improvement delivery record

9 October 2026. Local candidate **0.3.0-beta.1**. The [scorecard](scorecard.md) owns the quality-gate decision; this record does not replace it. Preview remains at http://127.0.0.1:5181, preserving the existing origin and save key.

## Implemented experience

The original title illustration remains, with restrained drift, reduced-motion support and no decorative overflow. Start goes directly to the raft. A small invitation identifies Home Reef and its orange buoy. Essential controls replace the permanent objective/map clutter; the chart and journal remain available on demand.

Click the wheel or press H to take/leave the helm. W/S follows the vessel's bow; A/D turns it. The heading label names the bow direction. Drag/zoom and Q/R inspect the craft; cabin and bench are real world click targets as well as keyboard/toolbar actions. The cabin offers supplies, snorkel and planning information. The bench shows the next upgrade first, with later plans and optional legacy rigs tucked into expandable sections. These retain the existing economy.

Home Reef is a separate six-item snorkel cleanup with side-on vertical swimming, goggles/snorkel, a trailing tied collection sack and visible trash transfers. Surface breathing keeps partial progress. Air exhaustion restores all targets, empties progress/bag and offers immediate retry or raft return. The final collection permanently restores the reef and map, without an extra exit challenge or material payout. Returning early or reloading unfinished work discards it; live pause/title Continue preserves the current attempt. Unrelated supplies, upgrades, discoveries and expedition records survive.

Floating supplies stay gatherable through the tide. Anchored finds stay at seabed height, show their covered status and offer the appropriate legacy salvage dive. The explicit reef buoy always enters cleanup. One shared UI decision now keeps Space and its label consistent near overlapping salvage/cleanup opportunities.

## Independent findings and dispositions

| Finding | Disposition | Evidence |
|---|---|---|
| Unknown direct cleanup actions could collect; invalid deltas could corrupt state | Explicit action/input validation and atomic rejection; regression coverage | [Technical review](technical-review.md), 64-test suite |
| Accepted legacy positions teleported on idle helm input | Preserve accepted positions; permit inward movement without farther outward travel | Technical review F3 |
| Revisiting clean reef falsely announced new restoration | Announcement only for newly earned completion; no false storage success | Technical review F4; earned revisit/reload checks |
| Camera choice reset; first-person vessel shell clipped view | Rejected Wheel prototype removed; old preference becomes Follow | [Camera comparison](camera-comparison.md), delivery camera checks |
| Space offered salvage but entered cleanup at overlapping targets | Shared contextual action; explicit buoy remains cleanup | QA timber/pearls/origin/buoy routes |
| Air HUD covered head; failure modal retained stale count/air | Top-right cleanup HUD; immediate reset refresh before failure modal | [QA report](qa.md), independent targeted art review |
| Indirect opening purpose, unclear bow, dense bench, incomplete return wording | Reef invitation, cardinal heading, next-plan bench, explicit Space return | Novice/expert findings and delivery checks |
| Bag resembled a float | Dark fabric seams and tied coral mouth; actual-size reinspection | [Art review](art-review.md) |
| Fresh opening lost held movement immediately after Resume | Reproduced four times: queued dialog close erased a new keydown; synchronous close now owns input clearing, queued fallback handles only unmanaged closes | Fresh playtest, four before/after trials and independent F7 transition/held-key closure |
| Low-contrast action/settings/cost text and older larger-text rules shrinking new labels | Darker text/actions, visible focus rings and monotonic larger text; final wide/square verification | [Accessibility review](accessibility-review.md) |
| Completed-workshop HUD still suggested a next upgrade | Explicit Home Reef naming and completed-workshop message; unedited earned-save recheck | Expert arc addendum and accessibility completion-copy fixture |
| Drifting title art exposed scrollbars/gutters | Clip decorative layer only; retain control scrolling | Final normal/reduced wide/square and short-height title checks |

Harness locator/wording failures, interrupted mixed-build loads, unsupported focus emulation and the confirmed pre-fix title overflow remain retained. They are distinguished from product defects in the raw reports. No failure is rewritten into an unqualified pass.

## Verification and provenance

- [Final QA summary](../../../captures/second-improvement/qa/final-qa-summary.json): 30 functional cases on the earlier frozen behavior build; five changed-workflow areas on the delivery build; title/performance on the final title-only build. This is deliberately not described as a repeated full suite against one fingerprint.
- `npm test`: 64/64 deterministic domain/navigation/cleanup/save tests. `npm run build`: successful, with the standard large-chunk advisory retained.
- Hardware: Chrome 154.0.8037.98, ANGLE Metal Apple M4 Pro, macOS arm64, High, 1440×900, DPR 1. After five seconds warmup, 20-second samples measured sailing median/p95 16.7/16.8 ms and cleanup 16.7/16.7 ms; zero intervals over 50 ms. Ten repeated transitions stabilized at 308 geometries/one texture, without WebGL errors. These meet this device's stated budget, not a universal hardware guarantee.
- Separate [novice](playtest-novice.md) and [expert](playtest-expert.md) agent sessions used actual inputs and earned cleanup/first-build progress; the expert continuation earned all five upgrades, four regions and nine journal stories and verified reload; their coaching, pauses, state visibility and build limitations are explicit.
- [Release manifest](release-manifest.json) fingerprints source and delivery assets. [Asset provenance](asset-provenance.md) identifies editable Three.js art, unchanged original illustration/GLBs and source Blender files. No new Blender/ImageGen production is claimed.

## Remaining limits

One small reef and the existing predetermined upgrade arc constitute the playable scope. Repeated scenery, restrained restoration color contrast, deep target/coral overlap and the simpler real-time materials remain below the source illustration's finish. Follow sailing trades avatar visibility for world context; inspection exposes the character. The cabin is a bounded illustrated station, not a walkable interior.

Controlled browser tide/pickup sequences are verified; the exact earlier human incident is not reproduced from an unavailable input trace. Agent evidence cannot establish human enjoyment, camera comfort, satisfying pacing or a reason to return. Motion review must distinguish sampled objective continuity from subjective continuous-playback assessment. Desktop keyboard/pointer and measured viewports are supported; no controller/touch, cloud save or public deployment claim is made.

See [human handoff](human-handoff.md) for the next hands-on review. The earned full upgrade/region arc and objective [motion supplement](motion-supplement.md) are complete. The [accessibility review](accessibility-review.md) records corrected text/focus/larger-text checks. The fresh opening exposed the immediate-resume defect, which was corrected and independently rechecked; its original failure remains retained. The [scorecard](scorecard.md) records a provisional 75.2/100 PM judgment. Overall Goal acceptance remains open for the unreproduced historical tide incident; the numeric threshold does not erase that task.

## Delivered candidate

Final entry `index-CLQfBj9P.js`, scene `scene-DZDgiK7l.js`, CSS `index-0PpeFtuh.css`. Later changes after hardware measurement are UI colors/fonts/copy and the verified dialog-close input fix; domain and renderer logic are unchanged. The main chat owns the preview process on 5181. Earlier review-worker server shutdowns are recorded as infrastructure interruptions, not product runtime failures. No user profile or save was used for destructive testing.
