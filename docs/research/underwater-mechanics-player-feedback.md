# Underwater mechanics after Jaco's beta playtest

9 October 2026, Pacific/Auckland. Research and proposed comparisons only; no runtime, save or settings changes. Requested during the [current player interview](../reviews/current-beta-player-interview.md).

## Question and human evidence

What could make a side-view restoration dive enjoyable to move through and interact with, rather than a slow trip between E-button pickups?

Jaco reports slow movement, an implausible fixed inclined swimmer pose during descent, clunky E collection, unconvincing trash placement and a bag that looks wrong. He suggests mouse interaction may be underused but has not selected a control scheme or decided the game is desktop-exclusive. He asks for research and assistance, rather than being asked to invent the mechanics himself. His proposed opening now connects cleanup rewards to a waterwheel that improves speed and permits departure from a sheltered starting area.

## Current implementation evidence

Read-only source inspection confirms cleanup speed is a fixed 2.2 units/second, with 24 seconds of air and proximity-based collection of six targets ([cleanup.js](../../src/cleanup.js)). These are implementation constants, not recommended values. In [cleanup-scene.js](../../src/cleanup-scene.js), horizontal movement sets facing, and underwater body inclination is a fixed angle based on that facing, rather than following vertical travel. The source supports his pose complaint; it does not measure perceived responsiveness or enjoyment. Pointer handling in [main.js](../../src/main.js) currently excludes cleanup world-click interactions. No hands-on comparison was conducted for this research.

## Primary-source precedents

| Reference | Documented behavior | Tidekin inference and boundary |
|---|---|---|
| Aquaria | Bit Blot describes mouse-only swimming/action controls, with keyboard/mouse and Xbox 360 controller alternatives. Songs change abilities/forms; its world includes caves, sunlit areas and kelp. | Mouse-led swimming is a relevant option to compare. Keyboard support need not decide platform exclusivity. Exact gesture mappings and ideal swim tuning are not established by these pages. [Developer game page](https://www.bit-blot.com/aquaria/index.html), [input FAQ](https://bit-blot.com/aquaria/faq.html), [world](https://www.bit-blot.com/aquaria/world.html). |
| Dave the Diver | Its director describes an early catch-and-sell prototype evolving into catches used in restaurant preparation. Peaceful photography also earns rewards. Mintrocket describes haptic fish-line tension on PS5. | An acquired object can have a visible use beyond an inventory number; an action can convey resistance. These do not establish that mouse clicking alone makes collection fun or justify copying fishing/combat/restaurant systems. [Director account](https://blog.playstation.com/2024/04/02/dave-the-diver-plunges-into-playstation-plus-game-catalog-april-16/), [Mintrocket presentation](https://blog.playstation.com/2024/01/31/dave-the-diver-splashes-onto-ps5-and-ps4-this-april-godzilla-dlc-revealed/). |
| Loddlenaut — restoration comparison, not a side-view input precedent | Creator-authored description names a bubble gun for goop/debris, gadgets for different pollutants, recycling trash into useful items/upgrades, and restoring habitable water. | Cleanup can have a tool action and connect to the desired wheel progression. Do not infer exact mouse bindings, collection duration, a creature-care requirement or a full tool catalogue. [Creator-authored Steam page](https://store.steampowered.com/app/1644940/Loddlenaut/). |
| Shinsekai: Into the Depths | Capcom describes abilities/puzzle solutions enabling descent, and music/effects played back and rerecorded underwater. | Water identity can involve audio and environmental presentation as well as color. Borrowing that principle does not require its survival premise or literally recreating its recording process. Consulted written material does not specify pose, speed or propulsion tuning. [Capcom launch account](https://news.capcomusa.com/2020/03/26/shinsekai-into-the-depths-now-available-on-nintendo-switch/). |
| Song of the Deep | Insomniac's Brian Hastings gives a concrete claw/object combination, catching a torpedo, and describes abilities opening areas and regional storytelling through art/music. | Interacting can involve doing something with an object, rather than removing it with one button. Restoration can borrow that structure without torpedoes, combat or a large ability catalogue. No swim tuning is established by this account. [Developer launch account](https://blog.playstation.com/2016/07/12/insomniacs-song-of-the-deep-out-today-brimming-with-secrets/). |

These are examples of designs, not evidence that a particular mechanic causes enjoyment for Jaco. Historical developer pages support historical features, not current support guarantees. No review scores or sales claims are used as proof of feel.

## Recommended next comparison — proposal, not an agreed design

First make moving through an empty attractive patch credible enough to assess. The swimmer should orient head-first along movement, including descent and ascent, with readable strokes, responsive direction changes and restrained glide. Compare a quicker tuning to the current one without adding inertial delay that could compound the clunkiness. Keep the surface/breathing pose distinct. These recommendations come directly from Jaco's account, not measured animation requirements from the reference games.

Compare two input arrangements on the same small scene:

1. Directional movement plus pointer-selected interaction: swim with directions, aim/select the object with a pointer, and perform the cleanup action with a click/hold.
2. Pointer-led swimming plus object selection: direct swimming through a pointer gesture and interact with a clearly highlighted nearby object. Resolve movement-versus-interaction ambiguity visibly; selecting a distant object must not secretly clean it or unexpectedly navigate.

Represent the underlying actions as swim, aim/select and interact so later controller or touch mappings remain possible. This is a design constraint to preserve options, not a promise that other platforms have been tested.

My preferred first activity to compare is pulling a lodged piece of rubbish free: select it in reach, perform a brief sustained pull, see the swimmer reach and the object shift/release, then see it stow and the patch improve. This adds a tangible action to the existing collection intent without starting with combat or a puzzle catalogue. A second candidate is a continuous cleaning pass over a visibly dirty surface; it may offer better immediate before/after feedback but requires different art and interaction work. These are original Tidekin hypotheses inspired by tool interaction and restoration precedents, not mechanics verified to exist exactly this way in every cited game.

Simply replacing E with click retains the existing travel-and-disappear activity. The point of the comparison is whether target selection and the actual action become satisfying. Avoid repetitive holds that merely delay an otherwise identical pickup.

Place heavy rubbish on the seabed or snagged in plants, and reserve drifting behavior for objects whose appearance supports it. Use coherent environmental motion, visible surface light, subtle particles/bubbles and underwater sound without obscuring the player. Give the bag a credible attachment, recognizable contents and bounded trailing behavior; test whether it communicates collection rather than assuming the earlier idea is approved in its current execution.

## Order and observations

Proposed order: movement/pose comparison → one cleanup action and convincing placement → readable local restoration → clear reward contribution toward the wheel → focused teaching through that action. Compare input schemes before multiplying tasks or sites. This is researcher-recommended order, not Jaco's ranking of all game issues.

Observe whether Jaco can descend/turn/stop where intended, distinguish interactable targets, understand and enjoy the action, notice what changed, and want to do another patch. Ask for his response to concrete alternatives after experiencing them. Preserve full-attempt failure/reset and immediate retry unless he explicitly revises them; do not silently change the air budget or failure policy to make a faster prototype appear easier.

## Limits

This is a bounded primary-source scan plus source inspection, not comparative hands-on play, motion analysis or proof of enjoyment. The preferred action, mouse-led option and environmental presentation need human comparison. Target platforms, final control scheme and reward economy remain open. No content expansion, prototype build or implementation was launched.

Shinsekai/Song source research was delegated as a bounded background task and integrated here. Linked diary videos were not watched. Detailed current/drag models, animation rules and exact controls for those games remain unverified; recommendations do not claim otherwise.
