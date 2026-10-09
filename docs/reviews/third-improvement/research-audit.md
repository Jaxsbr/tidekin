# Third improvement: bounded research audit

9 October 2026, Pacific/Auckland. Research specialist; sole write scope is this file. No runtime, save, settings, or preview changes. Read the complete [execution brief](../../third-improvement-goal.md), [current interview](../current-beta-player-interview.md), and [supplied underwater research](../../research/underwater-mechanics-player-feedback.md). The execution brief supersedes the interview's historical research-only authorization; this specialist remains documentation-only.

## Finding and evidence boundary

Proceed with all four input/action combinations. The supplied sources support alternative inputs, tangible interaction, restoration-linked upgrades and capability-based access. They do **not** establish a winning control scheme, realistic swim parameters, hold duration, or enjoyment for Jaco. The concrete proposals below are Tidekin design hypotheses unless explicitly marked as source facts or human requirements.

This scan rechecked the supplied first-party pages and added only official technical, accessibility and navigation references. No genre expansion, review-score analysis, video motion analysis or hands-on reference-game comparison. The research skill was read; its background-agent workflow could not be nested because no subagent launch tool is exposed in this specialist session. Research was completed directly without creating another user-owned chat.

Read-only local observations: `src/cleanup.js` still defines speed 2.2, air 24 seconds, range 1.25, six objects, whole-attempt failure reset and immediate retry. `src/cleanup-scene.js` uses horizontal facing and fixed underwater inclination (`heading.rotation`, approximately line 92). `src/main.js` excludes cleanup from world-click actions (pointer handlers approximately lines 935–955). These confirm the prior source observations at inspection time, not the current live preview's build or a measured feel result. Files may change under other specialists. `git status` reported no Git repository, so no Git baseline/diff is claimed.

## Audit of supplied primary evidence

| Source and authority | Confirmed source fact | Permitted inference / limit |
|---|---|---|
| Bit Blot, [Aquaria FAQ](https://www.bit-blot.com/aquaria/faq.html), [game](https://www.bit-blot.com/aquaria/index.html), [world](https://www.bit-blot.com/aquaria/world.html) | Developer documents two-button mouse play, keyboard/mouse and gamepad alternatives; game/world pages describe songs/forms and underwater settings. | Retain pointer-led and directional controls. These historical pages supply neither the exact proposed gesture arbitration nor a validated movement model. |
| Jaeho Hwang, MINTROCKET, [April 2024 director account](https://blog.playstation.com/2024/04/02/dave-the-diver-plunges-into-playstation-plus-game-catalog-april-16/) | Describes catch-and-sell prototype evolving into restaurant use for catches, and rewards for peaceful photography. | Relevant to a visible use for cleanup proceeds; no reason to add restaurant, combat or photography systems. Internal praise in the article is not evidence about Tidekin. |
| Yuna Hong, MINTROCKET, [January 2024 account](https://blog.playstation.com/2024/01/31/dave-the-diver-splashes-onto-ps5-and-ps4-this-april-godzilla-dlc-revealed/) | Describes PS5 haptics conveying a hooked fish tugging and weapon-dependent adaptive triggers. | Tighten the prior shorthand “fish-line tension”: the documented effect is tugging via controller feedback. It does not demonstrate a mouse resistance mechanic or validate lodged-trash pulling. |
| Moon Lagoon / Secret Mode, [Loddlenaut developer/publisher store description](https://store.steampowered.com/app/1644940/Loddlenaut/) | Describes bubble-gun cleanup of goop/debris, pollutant-specific gadgets, and recycling into items/upgrades. | Supports a restoration/tool/reward precedent. Exact bindings, continuous coverage semantics and action timing remain unverified; user reviews/tags were not used. |
| Capcom, [Shinsekai launch account](https://news.capcomusa.com/2020/03/26/shinsekai-into-the-depths-now-available-on-nintendo-switch/) | Describes abilities enabling deeper exploration and underwater rerecording of music/effects. | Supports coherent underwater sound and ability progression only. No evidence here for head alignment, drag, stroke cadence or a desired survival system. |
| Brian Hastings, Insomniac, [Song of the Deep launch account](https://blog.playstation.com/2016/07/12/insomniacs-song-of-the-deep-out-today-brimming-with-secrets/) | Describes upgrades/abilities opening areas and a claw catching a torpedo. | Supports visible object interaction and capability access. Neither a waterwheel/current gate nor a cleanup pull is established by this example. |

The earlier research was appropriately cautious overall. Its favorite pull action must remain a hypothesis, not become an evidence-backed winner by repetition.

## Gaps closed by additional primary sources

**Orientation machinery, not swimming biomechanics.** Three.js documents mapping one normalized direction to another with `setFromUnitVectors`, bounded rotation with `rotateTowards`, and quaternion interpolation. This establishes an implementation path; it says nothing about ideal animation timing. [Three.js Quaternion documentation](https://threejs.org/docs/pages/Quaternion.html).

**Reliable held input.** W3C defines pointer capture and the `pointercancel` / `lostpointercapture` lifecycle. Use those mechanisms to terminate gesture ownership cleanly. This supports event handling, not a specific game binding or mobile certification. [W3C Pointer Events](https://www.w3.org/TR/pointerevents3/).

**Focused teaching and remembered goals.** Microsoft recommends clear, reviewable objectives/prerequisite progress, suppressible unrelated interruptions, interactive or demonstrated tutorials, and tutorials available on demand; static control diagrams alone are insufficient. Its guidance is a design/accessibility recommendation, not a controlled study proving this opening will be enjoyable. [Xbox Accessibility Guideline 109](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/109).

**Heading-relative destination cue.** Garmin explicitly describes a destination bearing pointer that continues pointing toward the destination as travel direction changes; alignment toward the top indicates travel toward the destination. This closes the semantic gap between a bearing pointer and fixed north. Tidekin should use vessel heading as Jaco requested, including at rest, rather than importing GPS sensor behavior. [Garmin bearing-pointer manual](https://www8.garmin.com/manuals/webhelp/GUID-9B02DCC5-9EBB-4B8A-A2A8-3E75FDC66D07/EN-US/GUID-6D4E31DA-9798-4166-9AF9-E30B32F042C1.html).

**Capability gates.** The existing Insomniac and Capcom accounts already establish abilities opening exploration; a further genre survey would add little. Jaco supplies the specific current/wave obstacle. No source establishes the correct frustration, area size or wheel speed for Tidekin. These are deliberately unresolved tuning questions.

## Implementable motion and interaction constraints

The following are proposed contracts derived from the human direction and technical facts above, not claims about how the reference games implement swimming.

- Compute pose from actual nonzero swim displacement in the side-view plane, including ascent/descent. Map the model's authored head axis to that direction; preserve last stable orientation near zero speed. A bounded visual turn may smooth snapping without delaying movement input. Keep breathing upright and reaching aimed at the target as explicit pose states. Check left/right reversal and pure vertical travel, not only diagonals. Clamp at collision bounds without oscillating the pose on zero displacement.
- Normalize directional input so diagonals do not gain speed. Pointer movement uses the same movement function and bounds. Give pointer pursuit a small stop region to avoid circling the cursor; prevent overshoot by limiting a step to the remaining distance. Choose stop radius/turn smoothing through inspection, not invented research values.
- Preserve responsive stopping and short glide only if it helps comparison; long inertial drift risks reinforcing the reported clunkiness. Show stroke effort while propelling and relax limbs at rest. Attach the bag at a visible body anchor with bounded lag; do not reverse the bag instantly across the swimmer on a heading flip.
- Treat `swim`, `aim`, `interact` and `cancel` as semantic actions. Selection communicates range separately from hover: a distant target may be identified but cannot be cleaned or silently approached by an interaction gesture.
- Latch a gesture's role at pointer-down. UI consumes its own events. Capture only the active pointer; release/cancel, focus loss, pause, exit and variant changes clear held actions. Completion must never reinterpret the still-held action as movement or automatically start on the next object.

### Four retained combinations

These are concrete suggested bindings, provisional and labeled in the comparison panel. They intentionally share action rules and world difficulty.

| Combination | Input contract | Tangible action and cancellation | Essential comparison case |
|---|---|---|---|
| Directional + pull | Directions swim; pointer hovers/selects; primary hold on an eligible object pulls. | Selected target stays fixed during hold. Reach → visible resistance/displacement → release → stow. Leaving reach or releasing early cancels the pull and returns its uncommitted progress; completed objects remain attempt-local until site success. | Descend directly to a lodged object, start pulling, cancel, resume and watch it enter the bag. No nearest-neighbor substitution. |
| Pointer-led + pull | Primary hold begun in empty water swims toward pointer. A new hold begun on an in-range highlighted object pulls. Out-of-range object press shows “swim closer” and performs neither action. | Same pull as above. Crossing a target during a swim gesture never changes gesture ownership; target release never becomes swimming until a fresh press. | Swim across an object, stop, explicitly start pulling, then release near empty water without unintended travel. |
| Directional + cleaning pass | Directions swim; pointer aims a visible tool footprint; primary hold cleans only dirty surface within reach. | Dirt disappears locally under the footprint over time. Already clean surface makes no progress. Release stops emission immediately; partial surface cleaning persists only within the current attempt. | Sweep one edge, release/reposition, finish remaining dirt; confirm a timer alone cannot complete untouched surface. |
| Pointer-led + cleaning pass | Empty-water primary hold swims. A new hold begun on eligible dirty surface starts a latched cleaning gesture; drag aims the footprint while swimmer stays in place. Release and fresh empty-water press reposition. | Same coverage rule. Going off the surface or beyond reach stops progress, never turns into swim. Stroke limits are visible; re-entering valid coverage may resume within that cleaning gesture. | Clean to reach limit, deliberately release and move, then clean the remainder without mode confusion. |

Pointer-led cleaning may feel unnecessarily stop/start; directional cleaning may demand uncomfortable two-hand coordination. Pulling may become a repetitive progress bar; continuous cleaning may feel imprecise. Those are questions for comparison, not reasons to omit an alternative. An optional hold-toggle accessibility mapping can preserve identical action timing, but must be clearly labeled and applied consistently across comparisons.

Heavy/snared objects need visible seabed/vegetation contact; lighter debris may drift. Pulling should visibly loosen that contact. Cleaning should reveal the specific underlying surface and local life/color, not merely increment a HUD number. Neither action requires rhythm checks, combat, extra tools or a new resource upkeep system.

## Focused opening and capability progression

Proposed authored sequence: one movement cue acknowledged by actual movement → one readable nearby pickup with visible transfer → one polluted site's entry cue → descent/action/breathing taught one focus at a time → successful restoration and material contribution → a second purposeful cleanup if needed for the recipe → build aboard the raft → cross the visible current → track Mangrove, then home. This sequence is a hypothesis implementing Jaco's requested arc; no exact number of tasks or recipe is inferred from precedent.

Advance teaching from successful semantic events, not merely clicking a prompt or waiting. Show only the current actionable cue; acknowledge success before replacing it. Keep breath/safety information visible when needed. Skip hides teaching without granting rewards; revisit restores instruction without resetting the voyage. Continued saves derive relevant guidance from earned state. Suppress unrelated unlock messages while teaching a specific action. Show supplies/recipe and the wheel's purpose when it becomes relevant, with an on-demand reminder.

Gate contract: visible water motion must precede pushback; approaching without the wheel demonstrates insufficient thrust and gives brief actionable feedback. Turning inward must remain easy. Do not inflict damage, consume supplies or repeatedly spam the explanation. With the wheel, the same approach must visibly cross and also provide useful speed elsewhere. This is authored game behavior, not a physical claim about waterwheels.

Use one departure capability rule across sailing, map availability and quick passage. Reward/build state and the gate must agree after reload; preserve existing earned wheel ownership. Before upgrade, locked-destination tracking may remain selectable only with explicit “waterwheel needed” status so the arrow is not a promise of immediate access. Keep enough guaranteed available materials to build the wheel without needing to cross the gate first. Test oblique approaches, reverse motion and large frame steps, not only the ideal straight crossing.

## Heading-relative navigation contract

Local source currently advances world position using `(sin(heading), cos(heading))` in `src/game.js`. With that convention, calculate destination bearing as `atan2(target.x - raft.x, target.z - raft.z)`, then shortest signed relative angle `atan2(sin(bearing-heading), cos(bearing-heading))`. An upward-pointing SVG rotated clockwise uses this angle in degrees. This formula is an implementation derivation; verify signs against the actual rendered arrow.

Acceptance cases: destination ahead → up; right → right; behind → down; left → left. Repeat while stationary, reversing, detouring and orbiting the camera. Camera orbit must not rotate vessel-relative guidance. Recompute bearing from current position, not a frozen initial bearing; wrap across ±π without a full-turn animation. Never alter steering input.

No target means no arrow. Home is an explicit target using the same system. Show destination name, clear/change controls and locked status where applicable. At arrival, stop calculating a near-zero-distance bearing; proposed behavior is an “Arrived” state retaining selection until clear/change, avoiding jitter. Decide arrival radius against actual site geometry, with hysteresis if necessary. A direct bearing is not an obstacle-free route promise; no pathfinding or minimap is implied.

## Fair comparison and remaining uncertainty

Keep site geometry, start point, target placement, air/refill, failure policy, rewards and presentation quality matched across input comparisons. Compare current versus quicker movement separately; retain identical air rules and report that faster travel naturally changes time pressure rather than claiming difficulty is perfectly equal. Compare cleanup actions with equivalent restoration scope and disclose different work durations/coverage rather than quietly advantaging a favorite.

Switch variants at a safe idle state or queue the switch until then; clear held inputs/effects and announce the active combination. Changing cleanup representation mid-attempt should use a clearly labeled disposable trial reset, never destroy earned voyage progress. Each site has one permanent completion/reward identity across variants; failure/retry/revisit/reload and comparison reset cannot duplicate its payout. Successful restoration persists; failed attempts lose all partial cleanup, with immediate retry or raft return. Voluntary exit/reload behavior needs an explicit product contract and validation, not inference from these external sources.

Observe actual descent/turn/stop, missed selections, accidental movement/actions, air interruptions, understanding of visible restoration and wheel purpose. Counterbalance comparison order between agent sessions and label them as agent evidence. For Jaco, ask after each bounded trial what felt controllable, tangible or tedious, then whether he wants another patch. Keep both sailing camera alternatives for his separate comparison. Completion time and absence of bugs do not establish fun.

Remaining gaps intentionally requiring implementation evidence or human play: animation credibility in motion, pickup incident cause, best speed/turn/hold/coverage tuning, pointer-led cleaning comfort, camera preference, motivating versus annoying pushback, and replay desire. No new numerical satisfaction targets, final winner, runtime validation or human endorsement is claimed by this audit.
