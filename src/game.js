import { DIVE_TROPHIES, hasMissingDiveTrophy } from './dive-world.js';
export { DIVE_TROPHIES, diveSeed, generateDiveWorld } from './dive-world.js';
import { CLEANUP_SITES, getCleanupContext, freshCleanup, cleanupAction, steerCleanup, updateCleanup, getCleanupSite, getDiveSite as getCircularDiveSite } from './cleanup.js';
export { CLEANUP_SITES, getCleanupContext, getCleanupSite, CLEANUP_ACTION_SECONDS, CLEANUP_AIR, CLEANUP_SWIM_SPEED,
  CLEANUP_SURFACE, CLEANUP_REFILL, CLEANUP_COLLECT_RANGE } from './cleanup.js';

/** Deterministic voyage facade. See docs/reviews/fourth-improvement/domain.md.
 * Legacy world-diving simulation is retained only to validate historical saves;
 * all public Dive entry now uses side-view adapters. Cleanup attempts are transient.
 */
export const SHELTER_RADIUS = 25;
export const SHELTER_BAND = 3;
export const WATERWHEEL_SPEED_MULTIPLIER = 1.4;
export function sailingSpeed(state) { return RIGS[state.rig].speed * (state.upgrades.waterwheel ? WATERWHEEL_SPEED_MULTIPLIER : 1); }
export const SAVE_VERSION = 2;
export const TIDE_PERIOD = 180;
export const MAX_OXYGEN = 18;
export const RIGS = Object.freeze({
  balanced: Object.freeze({ name: 'Wanderer', speed: 5, oxygen: 18, description: 'Steady all-round sailing. Side-view dives share 24 seconds of air.' }),
  skimmer: Object.freeze({ name: 'Skimmer', speed: 7, oxygen: 12, description: 'Travel 40% faster. Side-view dives share 24 seconds of air.' }),
  diver: Object.freeze({ name: 'Pearl diver', speed: 3.5, oxygen: 28, description: 'A relaxed sailing pace. Side-view dives share 24 seconds of air.' }),
});
export function maxOxygen(state) { return RIGS[state.rig ?? 'balanced']?.oxygen ?? MAX_OXYGEN; }
export const SHOALS = Object.freeze([
  Object.freeze({ x: 18, z: -4, radiusX: 3.5, radiusZ: 20, angle: .3 }),
  Object.freeze({ x: -16, z: -22, radiusX: 13, radiusZ: 2.8, angle: -.3 }),
]);
export function inShallows(state) {
  if (tideHeight(state) > .35) return false;
  return SHOALS.some(shoal => {
    const dx = state.position.x - shoal.x, dz = state.position.z - shoal.z;
    const x = dx * Math.cos(shoal.angle) - dz * Math.sin(shoal.angle);
    const z = dx * Math.sin(shoal.angle) + dz * Math.cos(shoal.angle);
    return (x / shoal.radiusX) ** 2 + (z / shoal.radiusZ) ** 2 <= 1;
  });
}
// Preserve accepted legacy coordinates outside the sailing square. Permit gradual
// inward movement but no further outward movement; never snap an old save to an edge.
function boundedMove(position, step) {
  return Math.max(Math.min(-150, position), Math.min(Math.max(150, position), position + step));
}
/** Pure continuous steering seam; rendering never writes authoritative state. */
export function steerGame(state, dt, input = {}) {
  if (!Number.isFinite(dt) || dt < 0 || dt > .05) throw new RangeError('Steering dt must be 0..0.05 seconds');
  if (dt === 0) return state;
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Steering input must be an object');
  if (state.cleanup.attempt) { steerCleanup(state, dt, input); return state; }
  const x = Number.isFinite(input.x) ? input.x : 0;
  const z = Number.isFinite(input.z) ? input.z : 0;
  if (x === 0 && z === 0) return state;
  if (state.diving) {
    const step = SWIM_SPEED * dt / Math.max(1, Math.hypot(x, z));
    state.position.x = boundedMove(state.position.x, x * step);
    state.position.z = boundedMove(state.position.z, z * step);
    return state;
  }
  state.heading = ((state.heading - Math.max(-1, Math.min(1, x)) * 1.6 * dt) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const beforeRadius = Math.hypot(state.position.x,state.position.z);
  const step = -Math.max(-1, Math.min(1, z)) * sailingSpeed(state) * (inShallows(state) ? .32 : 1) * dt;
  state.position.x = boundedMove(state.position.x, Math.sin(state.heading) * step);
  state.position.z = boundedMove(state.position.z, Math.cos(state.heading) * step);
  const radius = Math.hypot(state.position.x,state.position.z);
  if (step !== 0 && !state.upgrades.waterwheel && beforeRadius <= SHELTER_RADIUS && radius > SHELTER_RADIUS-SHELTER_BAND && radius > beforeRadius) {
    const pushed = Math.max(SHELTER_RADIUS-SHELTER_BAND-.75, beforeRadius - 5*dt);
    state.position.x *= pushed/radius; state.position.z *= pushed/radius;
    if (state.lastEvent?.code !== 'current_pushback') result(state,true,'current_pushback','The current pushes you back. Build the waterwheel for more speed.');
  } else if (state.upgrades.waterwheel && !state.departed && beforeRadius <= SHELTER_RADIUS && radius > SHELTER_RADIUS) {
    state.departed=true; result(state,true,'first_departure','Your waterwheel carries you beyond the sheltered waters.');
  }
  return state;
}
export const GATHER_RANGE = 4.5;
// Baseline hull is 7m across local X and 9m along local Z (bow +Z).
export const RAFT_HALF_WIDTH = 3.5;
export const RAFT_HALF_LENGTH = 4.5;
export function salvageReach(state, position) {
  if (!validPosition(state.position) || !validPosition(position)) return false;
  const dx=position.x-state.position.x, dz=position.z-state.position.z;
  if (Math.hypot(dx,dz)<=GATHER_RANGE+(state.diving?0:1e-12)) return true;
  // Preserve the circular-only reach of historical world swimmers.
  if (state.diving) return false;
  const heading=state.heading ?? 0;
  if (!Number.isFinite(heading)) return false;
  const x=dx*Math.cos(heading)-dz*Math.sin(heading);
  const z=dx*Math.sin(heading)+dz*Math.cos(heading);
  // Rotation roundoff only: this is not an additional interaction margin.
  const epsilon=1e-12;
  return Math.abs(x)<=RAFT_HALF_WIDTH+epsilon && Math.abs(z)<=RAFT_HALF_LENGTH+epsilon;
}
export function getDiveSite(state) {
  if (state.cleanup.attempt || state.diving || state.recovery>0) return null;
  // Survey buoy entry keeps its existing radius and priority.
  const original=getCircularDiveSite(state);
  if (original?.kind==='survey') return original;
  const node=SALVAGE_NODES.filter(n=>n.access!=='shore' && (!state.collected.includes(n.id)||hasMissingDiveTrophy(state,`salvage:${n.id}`))
    && (n.region==='home' || state.upgrades[ISLANDS.find(i=>i.id===n.region).requires])
    && salvageReach(state,n.position))
    .sort((a,b)=>distance(state.position,a.position)-distance(state.position,b.position))[0];
  return node ? getCleanupSite(state,`salvage:${node.id}`) : null;
}
function enterDiveSite(state, payload) {
  const site=getCleanupSite(state,payload.siteId);
  if (site?.kind!=='salvage' || !salvageReach(state,site.position)) return cleanupAction(state,'enter-cleanup',payload);
  // The facade adjudicates hull reach. Supply the already-reachable entry point
  // to the side-view dispatcher without moving the authoritative raft. Shared
  // cleanup/stats records receive its normal gated transition.
  const entryState={...state,position:site.position};
  const outcome=cleanupAction(entryState,'enter-cleanup',payload);
  return outcome;
}
export const WORKSHOP_RANGE = 7;
export const ENERGY_CAP = 100;
export const MAX_UPDATE_SECONDS = 604800;
export const HOME = Object.freeze({ x: 0, z: 0 });
const RESOURCES = ['wood', 'scrap', 'pearls'];
const UPGRADE_IDS = ['waterwheel', 'crane', 'greenhouse', 'sail', 'beacon'];

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const EXPEDITION_RADIUS = 3;
export const SWIM_SPEED = 3.25;
export const EXPEDITIONS = freeze([
  { id: 'current-run', name: 'Current run', requires: 'waterwheel', kind: 'sailing',
    description: 'Sail the marked circuit through both shoals. High tide opens the channels. Return home to claim.',
    waypoints: [{ x: 18, z: -4 }, { x: 34, z: -12 }, { x: -16, z: -22 }, { x: 0, z: 0 }],
    reward: { wood: 8, scrap: 5, pearls: 0 } },
  { id: 'pearl-trail', name: 'Pearl trail', requires: 'waterwheel', kind: 'diving',
    description: 'Sail to the first buoy, then survey the side-view markers in one breath. Return to the raft after the last marker and sail home to claim.',
    waypoints: [{ x: 8, z: -12 }, { x: 24, z: -24 }, { x: 8, z: -42 }, { x: -16, z: -32 }],
    reward: { wood: 2, scrap: 2, pearls: 3 } },
]);

function freshExpeditions() {
  return { active: null,
    completed: Object.fromEntries(EXPEDITIONS.map(route => [route.id, 0])),
    lastCompletedDay: Object.fromEntries(EXPEDITIONS.map(route => [route.id, 0])) };
}

export const ISLANDS = freeze([
  { id: 'mangrove', region: 'mangrove', name: 'Mangrove Reach', x: 36, z: 0,
    position: { x: 36, z: 0 }, radius: 10, requires: 'waterwheel',
    description: 'Sheltered timber and the remains of an old workshop.' },
  { id: 'reef', region: 'reef', name: 'Prism Reef', x: -28, z: -32,
    position: { x: -28, z: -32 }, radius: 12, requires: 'greenhouse',
    description: 'Pearl beds beneath a bright coral shelf.' },
  { id: 'horizon', region: 'horizon', name: 'Beacon Shoal', x: 6, z: 62,
    position: { x: 6, z: 62 }, radius: 11, requires: 'sail',
    description: 'A distant wreck with supplies for your guiding light.' },
]);

function node(id, region, type, amount, x, z, access = 'tidal') {
  return { id, nodeId: id, region, type, amount, x, z, position: { x, z }, access,
    exposedBelow: access === 'shore' ? 1 : 0.35,
    name: type === 'pearls' ? 'Pearl bed' : access === 'shore'
      ? (type === 'wood' ? 'Floating driftwood' : 'Floating salvage crate')
      : (type === 'wood' ? 'Anchored timber' : 'Anchored wreckage') };
}

export const SALVAGE_NODES = freeze([
  node('home-driftwood', 'home', 'wood', 4, 4, 1, 'shore'),
  node('home-crate', 'home', 'scrap', 3, -4, 1, 'shore'),
  node('home-timber', 'home', 'wood', 5, 6, 6),
  node('home-wreck', 'home', 'scrap', 4, -7, -5),
  node('home-pearls', 'home', 'pearls', 2, 6, -9, 'underwater'),
  node('home-pearls-west', 'home', 'pearls', 2, -6, -10, 'underwater'),
  node('mangrove-timber', 'mangrove', 'wood', 8, 38, 3, 'shore'),
  node('mangrove-roots', 'mangrove', 'wood', 6, 32, -4),
  node('mangrove-crate', 'mangrove', 'scrap', 5, 41, -3),
  node('mangrove-pearls', 'mangrove', 'pearls', 3, 34, -7, 'underwater'),
  node('reef-driftwood', 'reef', 'wood', 6, -24, -29, 'shore'),
  node('reef-wreck', 'reef', 'scrap', 8, -32, -35),
  node('reef-pearls', 'reef', 'pearls', 4, -23, -37, 'underwater'),
  node('reef-pearls-deep', 'reef', 'pearls', 3, -33, -39, 'underwater'),
  node('horizon-timber', 'horizon', 'wood', 8, 10, 65, 'shore'),
  node('horizon-wreck', 'horizon', 'scrap', 10, 2, 58),
  node('horizon-pearls', 'horizon', 'pearls', 5, 10, 56, 'underwater'),
]);

export const RECIPES = freeze({
  waterwheel: { id: 'waterwheel', name: 'Waterwheel', requires: null,
    cost: { wood: 6, scrap: 2, pearls: 0 },
    description: 'Sail 40% faster through the sheltered current. Stores tide energy and opens Mangrove Reach.' },
  crane: { id: 'crane', name: 'Salvage crane', requires: 'waterwheel',
    cost: { wood: 8, scrap: 5, pearls: 0 },
    description: 'Every 12s, spend 4 energy to recover 2 wood and 1 scrap.' },
  greenhouse: { id: 'greenhouse', name: 'Greenhouse', requires: 'crane',
    cost: { wood: 8, scrap: 4, pearls: 2 },
    description: 'Every 24s, spend 3 energy to grow 3 wood. Opens Prism Reef.' },
  sail: { id: 'sail', name: 'Sail', requires: 'greenhouse',
    cost: { wood: 10, scrap: 6, pearls: 2 },
    description: 'Reach Beacon Shoal and its wreck.' },
  beacon: { id: 'beacon', name: 'Beacon', requires: 'sail',
    cost: { wood: 12, scrap: 10, pearls: 5 },
    description: 'Raise a guiding light above your raft to mark your position across the water.' },
});

const NODE_BY_ID = new Map(SALVAGE_NODES.map(node => [node.id, node]));
const REGION_IDS = ['home', ...ISLANDS.map(island => island.id)];
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const validPosition = p => p && typeof p === 'object' && !Array.isArray(p)
  && Number.isFinite(p.x) && Number.isFinite(p.z);

function regionAtPosition(state) {
  if (!validPosition(state.position)) return state.region;
  if (distance(state.position, HOME) <= 16) return 'home';
  const island = ISLANDS.find(island => state.upgrades[island.requires]
    && distance(state.position, island.position) <= island.radius);
  return island ? island.id : state.region;
}

function discoverRegion(state) {
  state.region = regionAtPosition(state);
  if (!state.discoveries.includes(state.region)) state.discoveries.push(state.region);
}

function result(state, ok, code, message, details = {}) {
  if (ok) state.lastEvent = { code, message, at: state.time };
  return { ok, code, message, ...details };
}

function atHome(state) {
  return validPosition(state.position) && distance(state.position, HOME) <= WORKSHOP_RANGE;
}

function expeditionStartBlock(state, id) {
  if (state.cleanup.attempt) return 'cleanup_active';
  if (!EXPEDITIONS.some(route => route.id === id)) return 'unknown_expedition';
  if (!state.upgrades.waterwheel) return 'expedition_locked';
  if (state.expeditions.active) return 'expedition_active';
  if (state.diving) return 'surface_required';
  if (!atHome(state)) return 'workshop_required';
  if (state.expeditions.lastCompletedDay[id] >= state.day) return 'expedition_daily_limit';
  return null;
}

function expeditionClaimBlock(state) {
  if (state.cleanup.attempt) return 'cleanup_active';
  const active = state.expeditions.active;
  if (!active) return 'no_expedition';
  if (!active.ready) return 'expedition_incomplete';
  if (state.diving) return 'surface_required';
  if (!atHome(state)) return 'workshop_required';
  if (state.expeditions.lastCompletedDay[active.id] >= state.day) return 'expedition_daily_limit';
  return null;
}

export function getExpeditionContext(state) {
  return {
    active: state.expeditions.active ? { ...state.expeditions.active } : null,
    total: Object.values(state.expeditions.completed).reduce((sum, n) => sum + n, 0),
    routes: EXPEDITIONS.map(route => ({ ...route,
      available: !expeditionStartBlock(state, route.id), reason: expeditionStartBlock(state, route.id) })),
    canClaim: !expeditionClaimBlock(state),
  };
}

function expeditionAction(state, action, id) {
  const block = action === 'start-expedition' ? expeditionStartBlock(state, id)
    : action === 'claim-expedition' ? expeditionClaimBlock(state)
      : state.expeditions.active ? null : 'no_expedition';
  if (block) {
    const messages = {
      unknown_expedition: 'Choose a known expedition.', expedition_locked: 'Build the waterwheel to take expeditions.',
      expedition_active: 'Finish or abandon your active expedition first.',
      surface_required: 'Surface before managing your expedition.',
      workshop_required: 'Return to the home anchorage to start or claim an expedition.',
      expedition_daily_limit: 'This expedition was claimed today. Return on the next tide day.',
      no_expedition: 'There is no active expedition.', expedition_incomplete: 'Visit all expedition markers first.',
    };
    return result(state, false, block, messages[block]);
  }
  if (action === 'start-expedition') {
    state.expeditions.active = { id, index: 0, ready: false, startedAt: state.time };
    const route = EXPEDITIONS.find(route => route.id === id);
    return result(state, true, 'expedition_started', `${route.name} started. ${route.description}`);
  }
  if (action === 'abandon-expedition') {
    state.expeditions.active = null;
    return result(state, true, 'expedition_abandoned', 'Expedition abandoned. Your supplies and completed expeditions are safe.');
  }
  const active = state.expeditions.active;
  if (id !== undefined && id !== active.id) {
    return result(state, false, 'unknown_expedition', 'Claim the active expedition.');
  }
  const route = EXPEDITIONS.find(route => route.id === active.id);
  for (const type of RESOURCES) state.inventory[type] += route.reward[type];
  state.expeditions.completed[active.id] += 1;
  state.expeditions.lastCompletedDay[active.id] = state.day;
  state.expeditions.active = null;
  return result(state, true, 'expedition_claimed', `${route.name} reward claimed. Try again on the next tide day.`,
    { id: route.id, reward: { ...route.reward } });
}

function resetExpedition(state, divingOnly = false) {
  const active = state.expeditions.active;
  if (!active || active.ready) return false;
  const route = EXPEDITIONS.find(route => route.id === active.id);
  if (divingOnly && route.kind !== 'diving') return false;
  active.index = 0;
  return true;
}

function advanceExpedition(state) {
  if (state.cleanup.attempt) return;
  const active = state.expeditions.active;
  if (!active || active.ready) return;
  const route = EXPEDITIONS.find(route => route.id === active.id);
  if ((route.kind === 'diving') !== state.diving) return;
  if (distance(state.position, route.waypoints[active.index]) > EXPEDITION_RADIUS) return;
  active.index += 1;
  active.ready = active.index === route.waypoints.length;
  result(state, true, active.ready ? 'expedition_ready' : 'expedition_waypoint', active.ready
    ? `${route.name} complete. Surface and return home to claim your reward.`
    : `${route.name}: marker ${active.index}/${route.waypoints.length} reached.`);
}

function gatherBlock(state, target) {
  if (state.cleanup.attempt) return 'cleanup_active';
  if (target.region !== 'home' && !state.upgrades[ISLANDS.find(i=>i.id===target.region).requires]) return 'locked_region';
  if (state.collected.includes(target.id)) return 'already_collected';
  if (!salvageReach(state, target.position)) {
    return 'too_far';
  }
  if (target.access === 'underwater' && !state.diving) return 'dive_required';
  if (target.access === 'tidal' && !state.diving && tideHeight(state) > target.exposedBelow) {
    return 'high_tide';
  }
  return null;
}

function gather(state, payload) {
  let target;
  if (payload.nodeId !== undefined) {
    target = NODE_BY_ID.get(payload.nodeId);
    if (!target) return result(state, false, 'unknown_node', 'That salvage does not exist.');
    if (payload.type !== undefined && payload.type !== target.type) {
      return result(state, false, 'invalid_target', 'The resource type does not match that node.');
    }
  } else {
    if (payload.type !== undefined && !RESOURCES.includes(payload.type)) {
      return result(state, false, 'invalid_target', 'Choose wood, scrap, or pearls.');
    }
    if (payload.position !== undefined && !validPosition(payload.position)) {
      return result(state, false, 'invalid_target', 'A target position needs finite x and z.');
    }
    const candidates = SALVAGE_NODES.filter(node => !state.collected.includes(node.id) && (!payload.type || node.type === payload.type)
      && (!payload.position || distance(payload.position, node.position) <= 0.01));
    // Accessible salvage wins over a closer submerged/covered node.
    candidates.sort((a, b) => Number(Boolean(gatherBlock(state, a)))
      - Number(Boolean(gatherBlock(state, b)))
      || distance(state.position, a.position) - distance(state.position, b.position));
    target = candidates[0];
    if (!target) return result(state, false, 'no_salvage', 'No matching salvage remains here.');
  }
  if (payload.position && (!validPosition(payload.position)
    || distance(payload.position, target.position) > 0.01)) {
    return result(state, false, 'invalid_target', 'The position does not match that node.');
  }
  const block = gatherBlock(state, target);
  if (block) {
    const messages = {
      locked_region: 'Build the required region upgrade first.', already_collected: 'Already collected.',
      too_far: 'Move closer to the salvage.', dive_required: 'Dive to reach this pearl bed.',
      high_tide: 'Wait for low tide, or dive to reach this salvage.',
    };
    return result(state, false, block, messages[block]);
  }
  discoverRegion(state);
  if (!state.discoveries.includes(target.region)) state.discoveries.push(target.region);
  state.collected.push(target.id);
  state.inventory[target.type] += target.amount;
  state.stats.gathered[target.type] += target.amount;
  return result(state, true, 'gathered', `Collected ${target.amount} ${target.type}.`,
    { nodeId: target.id, type: target.type, amount: target.amount });
}

function buildBlock(state, id) {
  if (state.cleanup.attempt) return 'cleanup_active';
  if (!UPGRADE_IDS.includes(id)) return 'unknown_upgrade';
  if (state.upgrades[id]) return 'already_built';
  if (state.diving) return 'surface_required';
  const recipe = RECIPES[id];
  if (recipe.requires && !state.upgrades[recipe.requires]) return 'prerequisite';
  if (RESOURCES.some(type => state.inventory[type] < recipe.cost[type])) return 'unaffordable';
  return null;
}

function build(state, id) {
  const block = buildBlock(state, id);
  if (block) {
    const messages = {
      unknown_upgrade: 'Choose a known workshop upgrade.', already_built: 'Already built.',
      surface_required: 'Surface before using the workshop.',
      workshop_required: 'Return to the home workshop to build.',
      prerequisite: 'Build the preceding workshop upgrade first.',
      unaffordable: 'Gather more materials for this upgrade.',
    };
    return result(state, false, block, messages[block]);
  }
  const recipe = RECIPES[id];
  discoverRegion(state);
  RESOURCES.forEach(type => { state.inventory[type] -= recipe.cost[type]; });
  state.upgrades[id] = true;
  return result(state, true, 'built', `Built ${recipe.name}.`, { upgrade: id });
}

function travelBlock(state, region) {
  if (state.cleanup.attempt) return 'cleanup_active';
  if (!REGION_IDS.includes(region)) return 'unknown_region';
  if (state.diving) return 'surface_required';
  if (region !== 'home' && state.expeditions.active) return 'expedition_active';
  const island = ISLANDS.find(island => island.id === region);
  if (island && !state.upgrades[island.requires]) return 'locked_region';
  if (region !== 'home' && !state.discoveries.includes(region)) return 'undiscovered_region';
  if (region !== 'home' && !state.departed) return 'departure_required';
  return null;
}

function travel(state, region) {
  const block = travelBlock(state, region);
  if (block) {
    const messages = {
      surface_required: 'Surface before travelling.',
      locked_region: 'Build the required upgrade to reach this destination.',
      undiscovered_region: 'Sail there to discover it first. Chart travel opens after your first arrival.',
      expedition_active: 'Finish or abandon your expedition before chart travel. You can still return home.',
      departure_required: 'Sail through the sheltered current with your waterwheel first.',
      unknown_region: 'Choose a known destination.',
    };
    return result(state, false, block, messages[block]);
  }
  state.region = region;
  const island = ISLANDS.find(island => island.id === region);
  state.position = { ...(island ? island.position : HOME) };
  if (!state.discoveries.includes(region)) state.discoveries.push(region);
  if (region === 'home' && resetExpedition(state)) {
    return result(state, true, 'expedition_reset', 'Returned home. Unfinished expedition reset to its first marker.', { region });
  }
  return result(state, true, 'travelled', `Arrived at ${island ? island.name : 'the home raft'}.`, { region });
}

const OBJECTIVES = freeze([
  { id: 'first-salvage', title: 'Something from the sea', description: 'Collect 4 wood from driftwood.',
    kind: 'gather', resource: 'wood', target: 4, reward: { wood: 2, scrap: 1 } },
  { id: 'tide-power', title: 'Turn the tide', description: 'Build the waterwheel aboard your raft.',
    kind: 'build', upgrade: 'waterwheel', target: 1, reward: { wood: 4, scrap: 3 } },
  { id: 'first-pearls', title: 'Beneath the blue', description: 'Dive and collect 2 pearls.',
    kind: 'gather', resource: 'pearls', target: 2, reward: { wood: 3, scrap: 1, pearls: 1 } },
  { id: 'salvage-workshop', title: 'A helping hand', description: 'Build the salvage crane.',
    kind: 'build', upgrade: 'crane', target: 1, reward: { wood: 3, scrap: 2 } },
  { id: 'mangrove-visit', title: 'Beyond the shallows', description: 'Discover Mangrove Reach.',
    kind: 'visit', region: 'mangrove', target: 1, reward: { wood: 2, scrap: 2, pearls: 1 } },
  { id: 'sea-garden', title: 'Life on the raft', description: 'Build the greenhouse.',
    kind: 'build', upgrade: 'greenhouse', target: 1, reward: { wood: 4, scrap: 3 } },
  { id: 'set-sail', title: 'Follow the wind', description: 'Build the sail.',
    kind: 'build', upgrade: 'sail', target: 1, reward: { scrap: 4 } },
  { id: 'charted-waters', title: 'Every horizon', description: 'Visit home and all three destinations.',
    kind: 'explore', target: 4, reward: { wood: 4, scrap: 4, pearls: 2 } },
  { id: 'guiding-light', title: 'A light for others', description: 'Build the beacon and raise a guiding light above your raft.',
    kind: 'build', upgrade: 'beacon', target: 1, reward: { pearls: 3, energy: 20 } },
]);
const OBJECTIVE_IDS = OBJECTIVES.map(goal => goal.id);

export function getObjectives(state) {
  return OBJECTIVES.map(goal => {
    const progress = goal.kind === 'gather' ? state.stats.gathered[goal.resource]
      : goal.kind === 'build' ? Number(state.upgrades[goal.upgrade])
        : goal.kind === 'visit' ? Number(state.discoveries.includes(goal.region))
          : state.discoveries.length;
    const claimed = state.quest.claimed.includes(goal.id);
    return { ...goal, reward: { ...goal.reward }, progress: Math.min(goal.target, progress),
      complete: progress >= goal.target, claimed, claimable: progress >= goal.target && !claimed };
  });
}

function claim(state, id) {
  const goal = getObjectives(state).find(goal => goal.id === id);
  if (!goal) return result(state, false, 'unknown_objective', 'Choose a known objective.');
  if (goal.claimed) return result(state, false, 'already_claimed', 'This reward was already claimed.');
  if (!goal.complete) return result(state, false, 'objective_incomplete', 'Complete the objective first.');
  for (const [resource, amount] of Object.entries(goal.reward)) {
    if (resource === 'energy') state.energy = Math.min(ENERGY_CAP, state.energy + amount);
    else state.inventory[resource] += amount;
  }
  state.quest.claimed.push(id);
  return result(state, true, 'claimed', `Claimed the reward for ${goal.title}.`, { id, reward: goal.reward });
}

/** Read-only presentation context; distances/blocks refer to authoritative coordinates. */
export function getContext(state) {
  const height = tideHeight(state);
  const cycle = state.time % TIDE_PERIOD;
  const lowEnd = Math.acos(1 - 2 * 0.35) / (2 * Math.PI) * TIDE_PERIOD;
  const lowStart = TIDE_PERIOD - lowEnd;
  const windowSeconds = height <= 0.35
    ? (cycle <= lowEnd ? lowEnd - cycle : TIDE_PERIOD - cycle + lowEnd)
    : lowStart - cycle;
  const region = regionAtPosition(state);
  const nodes = SALVAGE_NODES.filter(node => !state.collected.includes(node.id))
    .map(node => ({ ...node, distance: distance(state.position, node.position), inReach: salvageReach(state,node.position),
      available: !gatherBlock(state, node), reason: gatherBlock(state, node) }))
    .sort((a, b) => a.distance - b.distance);
  const nearby = nodes.filter(node => node.inReach);
  const recipes = UPGRADE_IDS.map(id => ({ ...RECIPES[id], built: state.upgrades[id],
    affordable: RESOURCES.every(type => state.inventory[type] >= RECIPES[id].cost[type]),
    available: !buildBlock(state, id), reason: buildBlock(state, id) }));
  return {
    region, tideHeight: height, lowTide: height <= 0.35, inShallows: inShallows(state),
    tide: { height, phase: height <= 0.35 ? 'low' : height >= 0.8 ? 'high' : 'mid',
      rising: cycle < TIDE_PERIOD / 2, period: TIDE_PERIOD,
      windowSeconds: Math.max(0, windowSeconds), window: height <= 0.35 ? 'closes' : 'opens' },
    atWorkshop: !state.diving && !state.cleanup.attempt,
    workshop: { position: { ...HOME }, range: WORKSHOP_RANGE },
    nearby, nearest: nodes[0] ?? null, gatherTarget: nearby.find(node => node.available) ?? null,
    nodes, recipes,
    destinations: [{ id: 'home', name: 'Home anchorage', position: { ...HOME }, requires: null }, ...ISLANDS]
      .map(island => ({ ...island, unlocked: !island.requires || state.upgrades[island.requires],
        available: !travelBlock(state, island.id), reason: travelBlock(state, island.id),
        discovered: state.discoveries.includes(island.id) })),
    objectives: getObjectives(state),
    diveSite: getDiveSite(state),
    canDive: Boolean(getDiveSite(state)),
    sailingSpeed: sailingSpeed(state),
    shelter: {radius:SHELTER_RADIUS,band:SHELTER_BAND,departed:state.departed,blocked:!state.upgrades.waterwheel},
    canSurface: !state.cleanup.attempt && state.diving,
    cleanup: getCleanupContext(state),
  };
}

export function act(state, action, payload = {}) {
  if (typeof payload === 'string') payload = { nodeId: payload, upgrade: payload, region: payload, id: payload };
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return result(state, false, 'invalid_payload', 'Provide an action payload object.');
  }
  if (['enter-cleanup', 'collect-trash', 'retry-cleanup', 'leave-cleanup'].includes(action)) {
    const outcome = action === 'enter-cleanup' ? enterDiveSite(state,payload) : cleanupAction(state, action, payload);
    return result(state, outcome.ok, outcome.code, outcome.message, outcome);
  }
  if (state.cleanup.attempt) return result(state, false, 'cleanup_active', 'Return to the raft before doing that.');
  if (['start-expedition', 'abandon-expedition', 'claim-expedition'].includes(action)) {
    return expeditionAction(state, action, payload.id);
  }
  if (action === 'rig') {
    const id = payload.rig ?? payload.id;
    if (!Object.hasOwn(RIGS, id)) return result(state, false, 'unknown_rig', 'Choose a known expedition rig.');
    if (!state.upgrades.waterwheel) return result(state, false, 'rig_locked', 'Build the waterwheel to fit expedition rigs.');
    if (state.diving || state.recovery > 0 || regionAtPosition(state) !== 'home' || distance(state.position, HOME) > WORKSHOP_RANGE) {
      return result(state, false, 'workshop_required', 'Surface and recover at the home anchorage to change your rig.');
    }
    state.rig = id;
    state.speed = RIGS[id].speed;
    state.oxygen = Math.min(state.oxygen, RIGS[id].oxygen);
    return result(state, true, 'rigged', `${RIGS[id].name} fitted. ${sailingSpeed(state).toFixed(1)} m/s sailing · 24s dive air.`, { rig: id });
  }
  if (action === 'gather') return gather(state, payload);
  if (action === 'build') return build(state, payload.upgrade ?? payload.id);
  if (action === 'travel') return travel(state, payload.region ?? payload.id);
  if (action === 'claim') return claim(state, payload.id ?? payload.objectiveId);
  if (action === 'dive') {
    const site = getDiveSite(state);
    if (!site) return result(state,false,'no_dive_site','Sail to a marked salvage site or survey buoy.');
    const outcome=enterDiveSite(state,{...payload,siteId:site.id});
    return result(state,outcome.ok,outcome.code,outcome.message,outcome);
  }
  if (action === 'surface') {
    if (!state.diving) return result(state, false, 'already_surfaced', 'Already at the surface.');
    state.diving = false;
    if (resetExpedition(state, true)) {
      return result(state, true, 'expedition_reset', 'Surfaced safely. Pearl trail reset: return to its first buoy and try again in one breath.');
    }
    return result(state, true, 'surfaced', 'Surfaced safely. Oxygen is recovering.');
  }
  return result(state, false, 'unknown_action', `Unknown action: ${String(action)}.`);
}

export function createGame() {
  return {
    version: SAVE_VERSION,
    position: { ...HOME },
    heading: 0,
    departed: false,
    guidance: {stage:0,skipped:false},
    cleanup: freshCleanup(),
    trophies: [],
    speed: 5,
    rig: 'balanced',
    region: 'home',
    time: 0,
    day: 1,
    oxygen: MAX_OXYGEN,
    diving: false,
    recovery: 0,
    inventory: { wood: 0, scrap: 0, pearls: 0 },
    energy: 0,
    upgrades: Object.fromEntries(UPGRADE_IDS.map(id => [id, false])),
    discoveries: ['home'],
    collected: [],
    stats: {
      gathered: { wood: 0, scrap: 0, pearls: 0 },
      dives: 0,
      rescues: 0,
      automated: { wood: 0, scrap: 0, pearls: 0 },
    },
    quest: { claimed: [] },
    expeditions: freshExpeditions(),
    automation: { crane: 0, greenhouse: 0 },
    lastEvent: null,
  };
}

export function tideHeight(state) {
  return (1 - Math.cos(2 * Math.PI * (state.time % TIDE_PERIOD) / TIDE_PERIOD)) / 2;
}

const MACHINES = freeze({
  crane: { period: 12, energy: 4, yield: { wood: 2, scrap: 1 } },
  greenhouse: { period: 24, energy: 3, yield: { wood: 3 } },
});

function advanceMachines(state, dt) {
  if (!state.upgrades.waterwheel) return;
  const active = Object.keys(MACHINES).filter(id => state.upgrades[id]);
  let elapsed = 0;
  const omega = 2 * Math.PI / TIDE_PERIOD;
  while (elapsed < dt) {
    const step = Math.min(dt - elapsed, ...active.map(id => MACHINES[id].period - state.automation[id]));
    const start = (state.time + elapsed) % TIDE_PERIOD;
    // Exact integral of power = 0.6 + 0.8 * tideHeight, in energy/second.
    const generated = step - 0.4 / omega * (Math.sin((start + step) * omega) - Math.sin(start * omega));
    state.energy = Math.min(ENERGY_CAP, state.energy + generated);
    elapsed += step;
    for (const id of active) {
      const machine = MACHINES[id];
      state.automation[id] += step;
      if (state.automation[id] >= machine.period - 1e-10) {
        state.automation[id] = 0;
        if (state.energy >= machine.energy) {
          state.energy -= machine.energy;
          for (const [resource, amount] of Object.entries(machine.yield)) {
            state.inventory[resource] += amount;
            state.stats.automated[resource] += amount;
          }
        }
      }
    }
  }
}

export function updateGame(state, dt) {
  if (!Number.isFinite(dt) || dt < 0 || dt > MAX_UPDATE_SECONDS
    || state.time + dt > Number.MAX_SAFE_INTEGER) {
    throw new RangeError('dt must be finite, nonnegative seconds, at most one week per update');
  }
  if (dt === 0) return state;
  discoverRegion(state);
  advanceMachines(state, dt);
  let remaining = dt;
  let rescued = false;
  if (state.diving) {
    const underwater = Math.min(remaining, state.oxygen);
    state.oxygen -= underwater;
    remaining -= underwater;
    if (state.oxygen === 0) {
      rescued = true;
      state.diving = false;
      state.region = 'home';
      state.position = { ...HOME };
      state.recovery = 6;
      state.stats.rescues += 1;
      const reset = resetExpedition(state, true);
      state.lastEvent = { code: reset ? 'expedition_reset' : 'rescued', at: state.time + underwater,
        message: 'The current carried you home. Your supplies are safe. Catch your breath.'
          + (reset ? ' Pearl trail reset: try again from its first buoy.' : '') };
    }
  }
  if (!state.diving) {
    state.oxygen = Math.min(maxOxygen(state), state.oxygen + remaining * 3);
    state.recovery = Math.max(0, state.recovery - remaining);
  }
  state.time += dt;
  state.day = 1 + Math.floor(state.time / TIDE_PERIOD);
  updateCleanup(state, dt);
  if (!rescued) advanceExpedition(state);
  return state;
}

function invalidSave(message) {
  const error = new Error(`Invalid Tidekin save: ${message}`);
  error.code = 'INVALID_SAVE';
  return error;
}

function checkSave(condition, field) {
  if (!condition) throw invalidSave(`invalid ${field}`);
}

function record(value, field) {
  checkSave(value !== null && typeof value === 'object' && !Array.isArray(value), field);
  return value;
}

function number(value, field, min = 0, max = Number.MAX_SAFE_INTEGER) {
  checkSave(Number.isFinite(value) && value >= min && value <= max, field);
  return value;
}

function count(value, field) {
  number(value, field);
  checkSave(Number.isSafeInteger(value), field);
  return value;
}

function boolean(value, field) {
  checkSave(typeof value === 'boolean', field);
  return value;
}

function idList(value, known, field) {
  checkSave(Array.isArray(value) && value.length <= known.length
    && value.every(id => typeof id === 'string' && known.includes(id))
    && new Set(value).size === value.length, field);
  return [...value];
}

function resourceCounts(raw, field) {
  record(raw, field);
  return Object.fromEntries(RESOURCES.map(id => [id, count(raw[id], `${field}.${id}`)]));
}

function exactRecord(raw, keys, field) {
  record(raw, field);
  checkSave(Object.keys(raw).length === keys.length && keys.every(key => Object.hasOwn(raw, key)), field);
  return raw;
}

function validateExpeditions(raw, state) {
  if (raw === undefined) return freshExpeditions();
  exactRecord(raw, ['active', 'completed', 'lastCompletedDay'], 'expeditions');
  const ids = EXPEDITIONS.map(route => route.id);
  exactRecord(raw.completed, ids, 'expeditions.completed');
  exactRecord(raw.lastCompletedDay, ids, 'expeditions.lastCompletedDay');
  const saved = freshExpeditions();
  for (const id of ids) {
    const total = count(raw.completed[id], `expeditions.completed.${id}`);
    const day = count(raw.lastCompletedDay[id], `expeditions.lastCompletedDay.${id}`);
    checkSave(day <= state.day && total <= day && (total === 0) === (day === 0), 'expedition claim days');
    checkSave(total === 0 || state.upgrades.waterwheel, 'expedition unlock');
    saved.completed[id] = total;
    saved.lastCompletedDay[id] = day;
  }
  checkSave(saved.completed['pearl-trail'] <= state.stats.dives, 'expedition dive history');
  if (raw.active !== null) {
    const active = exactRecord(raw.active, ['id', 'index', 'ready', 'startedAt'], 'expeditions.active');
    const route = EXPEDITIONS.find(route => route.id === active.id);
    checkSave(Boolean(route) && state.upgrades.waterwheel, 'active expedition');
    const index = count(active.index, 'expedition index');
    const ready = boolean(active.ready, 'expedition ready');
    const startedAt = number(active.startedAt, 'expedition startedAt', 0, state.time);
    checkSave(index <= route.waypoints.length && ready === (index === route.waypoints.length), 'expedition progress');
    checkSave(index === 0 || state.time > startedAt, 'expedition elapsed time');
    checkSave(1 + Math.floor(startedAt / TIDE_PERIOD) > saved.lastCompletedDay[route.id], 'expedition daily start');
    if (route.kind === 'diving' && index > 0) {
      checkSave(ready || state.diving, 'expedition continuous breath');
      checkSave(state.stats.dives > saved.completed['pearl-trail'], 'active expedition dive');
    }
    saved.active = { id: route.id, index, ready, startedAt };
  }
  return saved;
}

function validateSave(raw) {
  record(raw, 'state');
  checkSave(raw.version === SAVE_VERSION, 'version');
  const state = createGame();
  record(raw.position, 'position');
  state.position = {
    x: number(raw.position.x, 'position.x', -1e6, 1e6),
    z: number(raw.position.z, 'position.z', -1e6, 1e6),
  };
  state.departed = raw.departed === undefined ? Boolean(raw.discoveries?.some(id=>id!=='home')) : boolean(raw.departed,'departed');
  if (raw.guidance === undefined) state.guidance={stage:0,skipped:true};
  else {
    record(raw.guidance,'guidance');
    const stage=count(raw.guidance.stage,'guidance.stage');
    checkSave(stage<=9,'guidance.stage');
    state.guidance={stage,skipped:boolean(raw.guidance.skipped,'guidance.skipped')};
  }
  state.trophies = raw.trophies === undefined ? [] : idList(raw.trophies,DIVE_TROPHIES.map(t=>t.id),'trophies');
  state.heading = raw.heading === undefined ? 0 : number(raw.heading, 'heading', 0, 2 * Math.PI);
  if (raw.helm !== undefined) boolean(raw.helm, 'helm');
  if (raw.cleanup !== undefined) {
    record(raw.cleanup, 'cleanup');
    state.cleanup.completed = idList(raw.cleanup.completed, CLEANUP_SITES.map(site => site.id), 'cleanup.completed');
    if (raw.cleanup.revision !== undefined) checkSave(raw.cleanup.revision === 3,'cleanup.revision');
    // Old Home Reef covered all six original objects. Preserve both restored halves
    // without manufacturing a retrospective reward for either patch.
    if (raw.cleanup.revision === undefined && state.cleanup.completed.includes('home-reef') && !state.cleanup.completed.includes('sheltered-cove')) state.cleanup.completed.push('sheltered-cove');
  }
  state.speed = number(raw.speed, 'speed', 0.1, 50);
  state.rig = raw.rig === undefined ? 'balanced' : raw.rig;
  checkSave(typeof state.rig === 'string' && Object.hasOwn(RIGS, state.rig), 'rig');
  checkSave(state.speed === RIGS[state.rig].speed, 'rig/speed');
  state.time = number(raw.time, 'time');
  state.day = count(raw.day, 'day');
  checkSave(state.day === 1 + Math.floor(state.time / TIDE_PERIOD), 'day/time');
  state.oxygen = number(raw.oxygen, 'oxygen', 0, maxOxygen(state));
  state.diving = boolean(raw.diving, 'diving');
  state.recovery = number(raw.recovery, 'recovery', 0, 6);
  checkSave(!state.diving || (state.oxygen > 0 && state.recovery === 0), 'diving/recovery');
  state.inventory = resourceCounts(raw.inventory, 'inventory');
  state.energy = number(raw.energy, 'energy', 0, ENERGY_CAP);
  record(raw.upgrades, 'upgrades');
  for (const id of UPGRADE_IDS) state.upgrades[id] = boolean(raw.upgrades[id], `upgrades.${id}`);
  checkSave(state.rig === 'balanced' || state.upgrades.waterwheel, 'rig unlock');
  for (const id of UPGRADE_IDS) {
    checkSave(!state.upgrades[id] || !RECIPES[id].requires
      || state.upgrades[RECIPES[id].requires], `upgrade prerequisite for ${id}`);
  }
  checkSave(REGION_IDS.includes(raw.region), 'region');
  state.region = raw.region;
  state.discoveries = idList(raw.discoveries, REGION_IDS, 'discoveries');
  checkSave(state.discoveries.includes('home') && state.discoveries.includes(state.region), 'visited region');
  for (const island of ISLANDS) {
    checkSave(!state.discoveries.includes(island.id) || state.upgrades[island.requires], 'discovery unlock');
  }
  state.collected = idList(raw.collected, SALVAGE_NODES.map(node => node.id), 'collected');
  const gathered = { wood: 0, scrap: 0, pearls: 0 };
  for (const id of state.collected) {
    const node = NODE_BY_ID.get(id);
    checkSave(state.discoveries.includes(node.region), 'collected region');
    gathered[node.type] += node.amount;
  }
  record(raw.stats, 'stats');
  state.stats = {
    gathered: resourceCounts(raw.stats.gathered, 'stats.gathered'),
    automated: resourceCounts(raw.stats.automated, 'stats.automated'),
    dives: count(raw.stats.dives, 'stats.dives'),
    rescues: count(raw.stats.rescues, 'stats.rescues'),
  };
  checkSave(state.stats.rescues <= state.stats.dives, 'rescue count');
  checkSave(!state.diving || state.stats.dives > 0, 'dive count');
  for (const type of RESOURCES) checkSave(state.stats.gathered[type] === gathered[type], 'gathered totals');
  record(raw.quest, 'quest');
  state.quest = { claimed: idList(raw.quest.claimed, OBJECTIVE_IDS, 'quest.claimed') };
  checkSave(getObjectives(state).every(goal => !goal.claimed || goal.complete), 'claimed objective progress');
  state.expeditions = validateExpeditions(raw.expeditions, state);
  const nextUpgrade = UPGRADE_IDS.find(id => !state.upgrades[id]);
  if (nextUpgrade) {
    // Check the next capability is obtainable without reconstructing historical rewards.
    const unlocked = REGION_IDS.filter(region => region === 'home' || state.upgrades[ISLANDS.find(i => i.id === region).requires]);
    const obtainable = { ...state.inventory };
    const possibleGathered = { ...state.stats.gathered };
    for (const site of CLEANUP_SITES) if (!state.cleanup.completed.includes(site.id)) {
      for (const type of RESOURCES) obtainable[type] += site.reward[type] || 0;
    }
    for (const node of SALVAGE_NODES) {
      if (unlocked.includes(node.region) && !state.collected.includes(node.id)) {
        obtainable[node.type] += node.amount;
        possibleGathered[node.type] += node.amount;
      }
    }
    for (const goal of OBJECTIVES) {
      if (state.quest.claimed.includes(goal.id)) continue;
      const possible = goal.kind === 'build' ? state.upgrades[goal.upgrade]
        : goal.kind === 'gather' ? possibleGathered[goal.resource] >= goal.target
          : goal.kind === 'visit' ? unlocked.includes(goal.region)
            : unlocked.length >= goal.target;
      if (possible) for (const type of RESOURCES) obtainable[type] += goal.reward[type] || 0;
    }
    if (state.upgrades.crane) { obtainable.wood = Infinity; obtainable.scrap = Infinity; }
    // Optional repeat routes are a real future income source, including pearls.
    // Daily limits delay that income; free refits make the dive route attainable.
    if (state.upgrades.waterwheel) {
      for (const type of RESOURCES) {
        if (EXPEDITIONS.some(route => route.reward[type] > 0)) obtainable[type] = Infinity;
      }
    }
    for (const type of RESOURCES) checkSave(obtainable[type] >= RECIPES[nextUpgrade].cost[type], `unrecoverable ${nextUpgrade} ${type}`);
  }
  record(raw.automation, 'automation');
  for (const id of Object.keys(MACHINES)) {
    const work = number(raw.automation[id], `automation.${id}`, 0, MACHINES[id].period);
    checkSave(work < MACHINES[id].period && (state.upgrades[id] || work === 0), `automation.${id}`);
    state.automation[id] = work;
  }
  if (raw.lastEvent === null) state.lastEvent = null;
  else {
    const event = record(raw.lastEvent, 'lastEvent');
    checkSave(typeof event.code === 'string' && event.code.length > 0 && event.code.length <= 64, 'event code');
    checkSave(typeof event.message === 'string' && event.message.length <= 512, 'event message');
    state.lastEvent = { code: event.code, message: event.message,
      at: number(event.at, 'event time', 0, state.time) };
  }
  // Historical underwater saves validate before conversion; no partial survey is banked.
  if (state.diving) { state.diving=false; resetExpedition(state,true); }
  return state;
}

function migrateSave(raw) {
  record(raw, 'state');
  if (raw.version === SAVE_VERSION) return raw;
  checkSave(raw.version === 1 || raw.version === undefined, 'version');
  // A legacy save still needs its two identifying core fields; {} is corrupt.
  record(raw.position, 'position');
  record(raw.inventory, 'inventory');
  const migrated = { ...createGame(), ...raw, version: SAVE_VERSION };
  if (raw.guidance === undefined) migrated.guidance={stage:0,skipped:true};
  if (raw.departed === undefined) delete migrated.departed;
  migrated.inventory = { wood: 0, scrap: 0, pearls: 0, ...raw.inventory };
  const legacyUpgrades = raw.upgrades === undefined ? {} : raw.upgrades;
  if (Array.isArray(legacyUpgrades)) {
    idList(legacyUpgrades, UPGRADE_IDS, 'upgrades');
    migrated.upgrades = Object.fromEntries(UPGRADE_IDS.map(id => [id, legacyUpgrades.includes(id)]));
  } else {
    record(legacyUpgrades, 'upgrades');
    migrated.upgrades = { ...createGame().upgrades, ...legacyUpgrades };
  }
  migrated.time = raw.time === undefined ? (raw.elapsed === undefined ? 0 : raw.elapsed) : raw.time;
  number(migrated.time, 'time');
  migrated.day = 1 + Math.floor(migrated.time / TIDE_PERIOD);
  migrated.collected = raw.collected === undefined ? [] : idList(raw.collected, [...NODE_BY_ID.keys()], 'collected');
  const gathered = { wood: 0, scrap: 0, pearls: 0 };
  for (const id of migrated.collected) {
    const node = NODE_BY_ID.get(id);
    gathered[node.type] += node.amount;
  }
  if (raw.discoveries === undefined) {
    migrated.discoveries = [...new Set(['home', migrated.region,
      ...migrated.collected.map(id => NODE_BY_ID.get(id).region)])];
  }
  const stats = raw.stats === undefined ? {} : record(raw.stats, 'stats');
  const legacyGathered = stats.gathered === undefined ? {} : record(stats.gathered, 'stats.gathered');
  const legacyAutomated = stats.automated === undefined ? {} : record(stats.automated, 'stats.automated');
  migrated.stats = { dives: migrated.diving ? 1 : 0, rescues: 0, ...stats,
    gathered: { ...gathered, ...legacyGathered },
    automated: { wood: 0, scrap: 0, pearls: 0, ...legacyAutomated } };
  const quest = raw.quest === undefined ? {} : record(raw.quest, 'quest');
  migrated.quest = { claimed: [], ...quest };
  const automation = raw.automation === undefined ? {} : record(raw.automation, 'automation');
  migrated.automation = { crane: 0, greenhouse: 0, ...automation };
  return migrated;
}

export function serializeGame(state) {
  const saved = validateSave(state);
  delete saved.helm;
  saved.cleanup = { completed: saved.cleanup.completed, revision:3 };
  return JSON.stringify(saved);
}

export function deserializeGame(text) {
  try {
    if (typeof text !== 'string' || text.length > 1000000) throw invalidSave('expected a JSON string under 1 MB');
    return validateSave(migrateSave(JSON.parse(text)));
  } catch (error) {
    if (error.code === 'INVALID_SAVE') throw error;
    throw invalidSave('malformed JSON');
  }
}
