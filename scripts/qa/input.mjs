import assert from 'node:assert/strict';
import { interactive, metrics } from './runtime.mjs';

export async function start(h, seeded = false) {
  await h.click(seeded ? '#continue-voyage' : '#new-voyage');
  await interactive(h.p);
}

export async function swim(h, target) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    const a = (await h.state()).cleanup.attempt;
    assert.ok(a && a.status !== 'failed', 'Dive still viable');
    const dx = target.x - a.x,
      dy = target.y - a.y;
    if (Math.hypot(dx, dy) < 0.3) return;
    const keys = [];
    if (Math.abs(dx) > 0.18) keys.push(dx > 0 ? 'd' : 'a');
    if (Math.abs(dy) > 0.18) keys.push(dy > 0 ? 'w' : 's');
    h.r.inputs.push({ swimKeys: keys, ms: 70, at: Date.now() });
    const held = [];
    try {
      for (const key of keys) {
        await h.p.keyboard.down(key);
        held.push(key);
      }
      await h.p.waitForTimeout(70);
    } finally {
      for (const key of held) await h.p.keyboard.up(key).catch(() => {});
    }
  }
  throw Error('Actual keyboard swim timeout');
}

export async function sail(h, target, Game) {
  await h.p.locator('#game-canvas').focus();
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const s = await h.state(),
      dx = target.x - s.position.x,
      dz = target.z - s.position.z,
      distance = Math.hypot(dx, dz);
    if (distance < 1) return;
    const angle = Math.atan2(
      Math.sin(Math.atan2(dx, dz) - s.heading),
      Math.cos(Math.atan2(dx, dz) - s.heading),
    );
    await h.key(
      Math.abs(angle) > 0.06 ? (angle > 0 ? 'a' : 'd') : 'w',
      Math.abs(angle) > 0.06
        ? Math.min(180, Math.max(25, (Math.abs(angle) / 1.6) * 800))
        : Math.min(180, Math.max(35, (distance / Game.sailingSpeed(s)) * 700)),
    );
  }
  throw Error('Actual keyboard sail timeout');
}

export async function enter(h, id, Game, { semantic = false } = {}) {
  const initial = await h.state();
  const site = Game.getCleanupSite(initial, id);
  assert.ok(site);
  const surfaceBuoy = Game.CLEANUP_SITES.some(candidate => candidate.id === id);
  // Real steering stops six metres short, keeping the entry buoy clear of raft
  // cabin/workshop ray targets while remaining inside the twelve-metre range.
  const target = semantic || !surfaceBuoy ? site.position : {
    // Outward sides keep each fixed reef the nearest entry site, matching the
    // validated performance approach. Travel still uses ordinary steering.
    x: site.position.x + (id === 'home-reef' ? 6 : -6),
    z: site.position.z,
  };
  await sail(h, target, Game);
  if (semantic) {
    h.r.inputs.push({
      action: 'enter-cleanup',
      siteId: id,
      method: 'labelled normal domain precondition; position reached with real keyboard sailing',
      at: Date.now(),
    });
    const result = await h.p.evaluate(
      (id) => window.__tidekin.action('enter-cleanup', { siteId: id }),
      id,
    );
    h.check('Normal domain entry succeeds', result?.ok, result);
  } else if (surfaceBuoy) {
    const stopped = await h.state();
    const standOff = Math.hypot(stopped.position.x - site.position.x, stopped.position.z - site.position.z);
    assert(standOff >= 5 && standOff <= 7, 'Ordinary steering must leave five to seven metres of buoy clearance');
    const buoy = (await metrics(h.p)).interactions?.[`cleanup:${id}`];
    assert(buoy?.visible, 'Actual entry hotspot must be visible for pointer coverage');
    h.r.inputs.push({ buoy: id, point: buoy, standOff, at: Date.now() });
    await h.p.mouse.click(buoy.x, buoy.y);
  } else {
    // Salvage/survey sites have no reef-buoy hotspot. Their normal contextual
    // keyboard control adjudicates hull reach and selects the actual site.
    h.r.inputs.push({ siteId: id, method: 'ordinary contextual keyboard Dive', at: Date.now() });
    await h.key('Space');
  }
  await h.p.waitForFunction((id) => window.__tidekin.getState().cleanup.attempt?.siteId === id, id);
}

export async function reload(h) {
  await h.key('Escape');
  const menu = h.p.locator('[data-modal-action="menu"]');
  if (await menu.isVisible()) await menu.click();
  await h.p.reload({ waitUntil: 'networkidle' });
  await h.click('#continue-voyage');
  await interactive(h.p);
}
