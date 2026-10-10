import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

export const clipMs = 3000;
export const frameToleranceMs = 40;
export const timingReason =
  "Monotonic time ensures a full three-second capture. Decoded QA fiducial frames and original presentation timestamps anchor trimming. Wall times are diagnostics only; integer wall rounding and the 25 fps recorder permit at most one 40 ms frame. No playback retiming or benchmark tolerance change.";

export async function waitForClipEnd(
  started,
  wait,
  now = () => performance.now(),
) {
  let remaining;
  while ((remaining = clipMs - (now() - started)) > 0) {
    await wait(Math.ceil(remaining));
  }
}

export function focusedWindow(clip, offsetMs, sourceDurationMs) {
  const wallDurationMs = clip.finishedAt - clip.startedAt;
  const elapsedMs = clip.monotonicDurationMs;
  assert(
    [offsetMs, wallDurationMs, elapsedMs, sourceDurationMs].every(
      Number.isFinite,
    ),
    "Focused window requires finite wall and monotonic timing",
  );
  assert(
    offsetMs >= 0 && elapsedMs >= clipMs && elapsedMs < clipMs + 1000,
    "Focused window must be short and within recording; screenshot/input overhead cannot extend it by a second",
  );
  assert(
    Math.abs(wallDurationMs - elapsedMs) <= frameToleranceMs,
    "Wall/monotonic clock disagreement exceeds one recorder frame",
  );
  assert(
    offsetMs + clipMs <= sourceDurationMs + frameToleranceMs,
    "Clip extends beyond source recording",
  );
  return {
    offsetMs,
    durationMs: clipMs,
    wallDurationMs,
    monotonicDurationMs: elapsedMs,
  };
}

export function verifyEncodedDuration(durationMs) {
  assert(
    Number.isFinite(durationMs) &&
      Math.abs(durationMs - clipMs) <= frameToleranceMs,
    "Encoded clip duration differs from the three-second window by more than one recorder frame",
  );
}
