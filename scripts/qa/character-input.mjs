/** Ordinary held-input reversal; owns key release even when capture fails. */
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

export async function heldReversal(
  {
    keyboard, wait, observe, complete,
    now = () => performance.now(), wallNow = Date.now,
  },
  record = {},
) {
  const held = new Set();
  const started = now();
  record.startedWallAt = wallNow();
  record.events = [];
  record.observations = {};
  record.method = 'Ordinary held A then D; no deliberate wait, observation or rest between keyup A and keydown D';
  async function key(action, name) {
    const event = {
      action, key: name, wallAt: wallNow(), elapsedMs: now() - started,
    };
    record.events.push(event);
    // Register before sending: a rejected command may still have reached Chrome.
    if (action === 'down') held.add(name);
    await keyboard[action](name);
    event.completedWallAt = wallNow();
    event.completedElapsedMs = now() - started;
    if (action === 'up') held.delete(name);
  }
  async function until(elapsed) {
    let remaining;
    while ((remaining = elapsed - (now() - started)) > 0)
      await wait(Math.ceil(remaining));
  }
  try {
    await key('down', 'a');
    await until(750);
    record.observations.left = await observe('left');
    await until(1100);
    await key('up', 'a');
    await key('down', 'd'); // Adjacent commands: no intentional rest gap.
    const swap = record.events.at(-1);
    record.swapElapsedMs = swap.completedElapsedMs;
    record.releaseToPressMs =
      swap.completedElapsedMs - record.events.at(-2).completedElapsedMs;
    await until(record.swapElapsedMs + 600);
    record.observations.right = await observe('right');
    assert(held.has('d') && !held.has('a'), 'Reversal tail must retain only D');
    await complete(); // Caller closes its existing three-second anchored window while D remains held.
    return record;
  } finally {
    // Attempt every release independently; one failed release cannot strand the other.
    for (const name of held) {
      try {
        await key('up', name);
      } catch (error) {
        (record.releaseErrors ??= []).push(String(error));
      }
    }
    assert(!record.releaseErrors?.length, 'Reversal key release failed');
  }
}
