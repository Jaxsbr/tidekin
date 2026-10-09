import { inShallows, RIGS, SHOALS, tideHeight } from './game.js';

const SAMPLE_METERS = 0.25;
const MAX_SAMPLES = 4096;
const SHOAL_MARGIN = 4;
const PERIMETER_SAMPLES = 64;
const SHALLOW_SPEED_FACTOR = 0.32;
const SWIM_SPEED = 3.25;

function checkPoint(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.z)) {
    throw new RangeError('Route points must have finite x and z coordinates');
  }
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

function shallowDistance(start, end, meters, time) {
  if (meters === 0) return 0;
  // Quarter-meter midpoint samples cover the game world; cap work for distant inputs.
  const samples = Math.min(MAX_SAMPLES, Math.ceil(meters / SAMPLE_METERS));
  const probe = { time, position: { x: 0, z: 0 } };
  let shallowSamples = 0;
  for (let i = 0; i < samples; i++) {
    const fraction = (i + 0.5) / samples;
    probe.position.x = start.x * (1 - fraction) + end.x * fraction;
    probe.position.z = start.z * (1 - fraction) + end.z * fraction;
    if (inShallows(probe)) shallowSamples++;
  }
  return meters * (shallowSamples / samples);
}

function perimeterPoint(shoal, index) {
  const angle = index * 2 * Math.PI / PERIMETER_SAMPLES;
  const x = (shoal.radiusX + SHOAL_MARGIN) * Math.cos(angle);
  const z = (shoal.radiusZ + SHOAL_MARGIN) * Math.sin(angle);
  const cos = Math.cos(shoal.angle);
  const sin = Math.sin(shoal.angle);
  // Inverse of inShallows' world-to-ellipse transform.
  return { x: shoal.x + x * cos + z * sin, z: shoal.z - x * sin + z * cos };
}

/**
 * Pure route comparison, in meters and seconds, with the current tide held fixed.
 * points excludes the starting position: direct [target], bypass [via, target].
 * Sailing uses the state's current speed (or its rig speed when omitted).
 * Diving is a direct-only approximation at 3.25m/s, without a shoal penalty.
 * This estimates travel at current conditions; it does not forecast future tide.
 * Invalid coordinates, time, speed, or overflowing estimates throw RangeError.
 */
export function planRoutes(state, target) {
  checkPoint(state?.position);
  checkPoint(target);
  if (!Number.isFinite(state.time)) throw new RangeError('Route time must be finite');
  const baseSpeed = state.speed ?? RIGS[state.rig ?? 'balanced']?.speed;
  const speed = state.diving ? SWIM_SPEED : baseSpeed * (state.upgrades?.waterwheel ? 1.4 : 1);
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new RangeError('Route speed must be finite and positive');
  }

  const start = { x: state.position.x, z: state.position.z };
  const destination = { x: target.x, z: target.z };
  const lowWater = tideHeight(state) <= 0.35;

  function estimate(points) {
    let previous = start;
    let meters = 0;
    let shallowMeters = 0;
    for (const point of points) {
      const legMeters = distance(previous, point);
      if (!Number.isFinite(legMeters)) throw new RangeError('Route distance must be finite');
      meters += legMeters;
      if (lowWater) shallowMeters += shallowDistance(previous, point, legMeters, state.time);
      previous = point;
    }
    const seconds = state.diving
      ? meters / speed
      : (meters - shallowMeters) / speed + shallowMeters / (speed * SHALLOW_SPEED_FACTOR);
    if (!Number.isFinite(meters) || !Number.isFinite(seconds)) {
      throw new RangeError('Route estimate must be finite');
    }
    return { points, seconds, shallowMeters, meters };
  }

  const direct = estimate([destination]);
  let bypass = null;
  // Require at least one meter and 10% less shallow travel to offer a useful choice.
  const minimumSaving = Math.max(1, direct.shallowMeters * 0.1);
  if (state.diving || !lowWater || direct.shallowMeters < minimumSaving) {
    return { direct, bypass };
  }

  const maximumMeters = direct.meters * 2.5 + 10;
  for (const shoal of SHOALS) {
    for (let i = 0; i < PERIMETER_SAMPLES; i++) {
      const via = perimeterPoint(shoal, i);
      if (inShallows({ time: state.time, position: via })) continue;
      if (distance(start, via) + distance(via, destination) > maximumMeters) continue;
      const candidate = estimate([via, { ...destination }]);
      if (direct.shallowMeters - candidate.shallowMeters < minimumSaving) continue;
      if (bypass === null || candidate.seconds < bypass.seconds) bypass = candidate;
    }
  }
  return { direct, bypass };
}
