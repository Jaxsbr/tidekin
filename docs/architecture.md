> Current contract (fourth improvement, 9 October 2026): always-controllable third-person sailing; directional swimming + pointer pull at 2.2 m/s; no comparison, practice, helm or trailing basket. Painted UI and wider/deeper reef replace the earlier presentation. Earlier dated sections below are historical. See `reviews/fourth-improvement/plan.md` and README for current behavior.

# Tidekin architecture

Second improvement integration, 9 October 2026. Implementation and evidence are tracked separately in `docs/reviews/second-improvement/`; this describes ownership and intended invariants, not a release certification.

## State and actions

`game.js` owns the deterministic voyage, heading, helm, tide, resources, existing upgrades and expeditions. `cleanup.js` owns the bounded cleanup catalog, transient attempt and permanent completed-site IDs. Both are plain JavaScript without DOM, rendering, random numbers or wall clocks. A frame clamps elapsed simulation time, applies input, advances rules, then renders state. Failed actions do not grant resources.

The vessel faces local +Z. The helm is a control mode; leaving stops propulsion. Camera orbit never changes heading. The camera behind the vessel looks along +Z at heading zero, making screen right world −X; right steering therefore decreases heading. Legacy open-water resource diving remains separate from cleanup and uses its original movement/material rules.

A cleanup attempt has one authoritative list of collected trash IDs. Bag size, available trash, progress text and collection effects derive from it. Surfacing only replenishes air. Exhaustion changes the attempt to failed and empties its collected list. Retry constructs a fresh attempt without cooldown. The last valid collection commits permanent site completion immediately; completed attempts cannot subsequently fail. Returning or loading discards unfinished attempts. There is no checkpoint, cleanup reward currency or new exit challenge.

## Persistence

The existing browser origin/profile and `tidekin.save.v2` key are retained. Old saves without heading/cleanup data receive defaults; new completed-site IDs validate against the catalog. Serialization normalizes a copy to permanent state, so periodic autosave does not eject a live diver. Deserialization resumes off helm and without an attempt. Unrelated supplies, equipment, discoveries and prior expedition records remain in the voyage schema. Settings use a separate key. A storage failure must remain visible until a successful save.

## Rendering and input

`scene.js` owns the shared Three.js renderer, ocean scene, vessel camera, semantic interaction proxies, workbench and gathering transfer pool. `cleanup-scene.js` owns the underwater scene and presentation-only swimmer/bag motion. Cleanup switches scenes rather than placing the avatar beneath an opaque raft hull. The renderer cannot award trash or persist completion.

`main.js` owns document events, modal/panel focus, settings and browser storage. It translates the current mode's controls to domain actions. Panels, blur and mode changes clear held keys. Semantic station proxies support clicking actual world objects; labeled keyboard/button alternatives provide equivalent access. Inspection orbit and zoom are bounded and rendering-only. QA hooks are exposed only with `?qa=1`.

World geometry and materials are allocated at scene construction, and effect pools are bounded. Shared authored Explorer geometry/materials must not be disposed by a cloned character owner. Asset sources remain under the game; original workshop/island/landmark Blender sources and title artwork are preserved.

## Verification boundary

Domain tests establish rule and persistence behavior; browser input checks establish integration. Running captures and playable camera comparisons establish visual evidence. Independent reviews and novice/expert agent playtests remain judgments rather than human enjoyment evidence. Build fingerprints identify the exact code/assets tested. Performance measurements retain browser/GPU/viewport/DPR/quality and distinguish hardware from software rendering.

## Third improvement contracts (9 October 2026)

The current integration contract is [domain-contract](reviews/third-improvement/domain-contract.md). game.js owns original voyage resources, node identity, departure capability, build spending, validated migration and guidance persistence. cleanup.js owns the transient attempt, shared input/action variants, spatial cleaning coverage, and atomic completion rewards. Dynamic salvage sites adapt original node IDs; survey sites adapt original route state. Both modules use their exported catalogue bindings after initialization; no top-level cross-module invocation occurs.

main.js maps held keyboard/pointer gestures to semantic movement, target and aim. It latches pointer gesture ownership, clears input at every modal/focus/mode transition, stores comparison settings separately, and advances tutorial guidance from earned state. Disposable comparison state is held separately from the voyage and every save path is suppressed until return. No practice resources transfer back.

scene.js consumes authoritative state, owns the surface cameras/current/buoy/target/transfer presentation, and delegates side-view picking and rendering. cleanup-scene.js resolves sites dynamically and owns their disposable GPU resources. Read-only QA projections expose actual camera coordinates; QA action hooks are not used as earned-play evidence. The editable reef-art.js supplies original procedural scene assets; original Blender/title assets remain intact.
