/** Maintained actual-input gameplay acceptance. Preparation is the default. */
import assert from 'node:assert/strict';
import { options, execute, hash, metrics, viewports, loadGame } from './runtime.mjs';
import { start, swim, reload, enter as enterSite } from './input.mjs';

const config = options('gameplay');
const Game = config.run ? await loadGame(config) : null;
const enter = (h, id) => enterSite(h, id, Game);
function fixture(label, mutate) {
  const state = Game.createGame();
  state.guidance = { stage: 0, skipped: true };
  mutate?.(state);
  const raw = Game.serializeGame(state);
  Game.deserializeGame(raw);
  return { label, state };
}
await execute(config, Game, async ({ runCase }) => {
  for (const viewport of viewports) {
    const size = `${viewport.width}x${viewport.height}`;
    if (config.suite !== 'earned-only') {
      await runCase(
        size + '-panels',
        viewport,
        fixture(
          'Synthetic home save; supplied materials, completed reef and trophies are NOT earned progression; panel/persistence checks only.',
          (state) => {
            state.inventory = { wood: 7, scrap: 4, pearls: 2 };
            state.cleanup.completed = ['home-reef'];
            state.trophies = Game.DIVE_TROPHIES.map((t) => t.id);
          },
        ),
        panels,
      );
      await runCase(
        size + '-dive-fixture',
        viewport,
        fixture(
          'Synthetic valid save at first pearl node; initial travel NOT earned; objective is earned through real keyboard/pointer input.',
          (state) => {
            state.position = { ...Game.SALVAGE_NODES.find((n) => n.id === 'home-pearls').position };
          },
        ),
        diveChecks,
      );
    }
    if (config.suite !== 'fixtures-only')
      await runCase(size + '-actually-earned', viewport, null, earned);
  }
});

async function pull(h, item) {
  const before = await h.state();
  const site = Game.getCleanupSite(before);
  const t = (await metrics(h.p)).cleanupTargets?.find((t) => t.id === item.id);
  h.check('Projected target visible ' + item.id, t?.visible, t);
  h.r.inputs.push({ pointer: item.id, x: t.x, y: t.y, holdMs: 1050 });
  await h.p.mouse.move(t.x, t.y);
  await h.p.mouse.down();
  try {
    await h.p.waitForTimeout(1050);
  } finally {
    await h.p.mouse.up();
  }
  const after = await h.state();
  h.check('Actually earned target ' + item.id, after.cleanup.attempt.collected.includes(item.id));
  if (
    after.cleanup.attempt.status === 'complete' &&
    site.trophy &&
    !(before.trophies ?? []).includes(site.trophy.id)
  ) {
    const trophy = site.trophy;
    h.check('Completion earns new trophy ' + trophy.id, after.trophies.includes(trophy.id));
    const reveal = h.p.locator('#dive-keepsake');
    await reveal.waitFor({ state: 'visible', timeout: 1500 });
    h.check('New trophy reveal visible ' + trophy.id, await reveal.isVisible());
    const label = await reveal.getAttribute('aria-label');
    h.check(
      'Reveal accessible Found name ' + trophy.id,
      Boolean(label?.startsWith('Found ') && label.includes(trophy.name)),
      label,
    );
    h.check(
      'Reveal picture and check only',
      (await reveal.innerText()).trim() === '✓' &&
        (await reveal.locator('.keepsake-art').count()) === 1 &&
        (await reveal.locator('.find-check').count()) === 1,
    );
    h.check(
      'Reveal uses earned trophy art',
      await reveal
        .locator('.keepsake-art')
        .evaluate((e, art) => e.classList.contains('keepsake-' + art), trophy.art),
    );
    const raw = await h.p.evaluate(() => localStorage.getItem('tidekin.save.v2'));
    const saved = raw ? Game.deserializeGame(raw) : null;
    h.check('New trophy already preserved in save', saved?.trophies.includes(trophy.id), {
      trophyId: trophy.id,
      saveSha256: raw ? hash(raw) : null,
    });
    h.r.keepsakeReveals ??= [];
    h.r.keepsakeReveals.push({
      trophyId: trophy.id,
      name: trophy.name,
      label,
      observedAt: Date.now(),
      durationContractMs: 6500,
      durationMeasured: false,
    });
    await h.shot('new-keepsake-' + trophy.id);
  }
}
async function panels(h) {
  await h.shot('menu-fixture');
  await start(h, true);
  h.check(
    'Exactly four navigation pages',
    (await h.p.locator('.game-nav [data-panel]').count()) === 4,
  );
  h.check('Look control absent', (await h.p.locator('[data-panel="inspect"]').count()) === 0);
  await h.key('i');
  h.check('I does not open Look', !(await h.p.locator('#panel-dialog').isVisible()));
  await h.key('Escape');
  await h.shot('pause-no-manual-save');
  h.check(
    'Manual save absent',
    (await h.p.locator('[data-modal-action="save"]').count()) === 0 &&
      !/manual\s*save/i.test(await h.p.locator('#modal-dialog').innerText()),
  );
  await h.click('[data-modal-action="play"]');
  const ids = ['workshop', 'chart', 'journal', 'cabin'];
  for (let i = 0; i < 4; i++) {
    await h.key(['b', 'm', 'j', 'c'][i]);
    await h.p.locator('#panel-dialog').waitFor({ state: 'visible' });
    const active = () => h.p.locator('#panel-dialog').getAttribute('data-panel');
    h.check('Shortcut opens ' + ids[i], (await active()) === ids[i]);
    h.check(
      'Dialog labelled',
      (await h.p.locator('#panel-dialog').getAttribute('aria-labelledby')) === 'panel-title' &&
        (await h.p.locator('#panel-title').innerText()).length > 0,
    );
    for (const direction of [1, -1]) {
      for (let n = 1; n <= 4; n++) {
        const button = direction > 0 ? '#panel-next' : '#panel-previous';
        h.check(
          'Named carousel control',
          Boolean(await h.p.locator(button).getAttribute('aria-label')),
        );
        await h.click(button);
        h.check(
          'Pointer cycle ' + ids[i] + ' ' + direction + ' ' + n,
          (await active()) === ids[(i + direction * n + 16) % 4],
        );
        h.check(
          'Current page marked',
          (await h.p.locator('#panel-pages [aria-current="page"]').count()) === 1,
        );
      }
    }
    for (const direction of [1, -1])
      for (let n = 1; n <= 4; n++) {
        await h.key(direction > 0 ? 'ArrowRight' : 'ArrowLeft');
        h.check(
          'Keyboard cycle ' + ids[i] + ' ' + direction + ' ' + n,
          (await active()) === ids[(i + direction * n + 16) % 4],
        );
        h.check(
          'Focus retained in dialog',
          await h.p.evaluate(() =>
            document.querySelector('#panel-dialog').contains(document.activeElement),
          ),
        );
      }
    await h.shot(ids[i] + '-fixture');
    if (ids[i] === 'cabin') {
      const inv = (await h.state()).inventory;
      const counts = await h.p.locator('.supply-row strong').allTextContents();
      h.check(
        'Cabin exact material counts',
        JSON.stringify(counts) === JSON.stringify(Object.values(inv).map(String)),
        { counts, inv },
      );
      const text = await h.p.locator('#panel-body').innerText();
      for (const trophy of Game.DIVE_TROPHIES)
        h.check(
          'Cabin displays trophy ' + trophy.id,
          text.includes(trophy.name) ||
            ((await h.p.locator('#panel-body').evaluate((e) => e.innerHTML)) ?? '').includes(
              trophy.id,
            ) ||
            (await h.p
              .locator('#panel-body [aria-label]')
              .evaluateAll(
                (els, name) => els.some((e) => e.getAttribute('aria-label').includes(name)),
                trophy.name,
              )),
        );
      await keepsakeArt(h);
    }
    await h.click('#close-panel');
  }
  await timerPersistence(h);
  const before = await h.state();
  await reload(h);
  const after = await h.state();
  h.check(
    'Automatic persistence materials and trophies',
    JSON.stringify(after.inventory) === JSON.stringify(before.inventory) &&
      JSON.stringify(after.trophies) === JSON.stringify(before.trophies),
  );
  await h.key('c');
  await keepsakeArt(h);
  await h.shot('cabin-after-continue');
  const s = await h.state(),
    siteIds = [
      ...Game.CLEANUP_SITES.map((t) => t.id),
      ...Game.SALVAGE_NODES.filter((n) => n.access !== 'shore').map((n) => 'salvage:' + n.id),
      'survey:pearl-trail',
    ];
  const layouts = siteIds.map((id) => {
    const t = Game.getCleanupSite(s, id),
      again = Game.getCleanupSite(s, id);
    h.check('Deterministic generated layout ' + id, JSON.stringify(t) === JSON.stringify(again));
    h.check('Procedural terrain and seed ' + id, Number.isInteger(t.seed) && t.terrain?.length > 0);
    return { id, seed: t.seed, biome: t.biome, terrain: t.terrain, trash: t.trash };
  });
  h.r.layouts = layouts;
  h.check(
    'All sites unique procedural terrain',
    new Set(layouts.map((t) => JSON.stringify(t.terrain))).size === layouts.length,
  );
  h.check(
    'All sites unique target coordinates',
    new Set(layouts.map((t) => JSON.stringify(t.trash.map((o) => [o.x, o.y])))).size ===
      layouts.length,
  );
}
async function underwater(h) {
  await h.p.waitForTimeout(250);
  h.check('No underwater top-left location', !(await h.p.locator('.location-card').isVisible()));
  h.check('No underwater guidance', !(await h.p.locator('#voyage-guide').isVisible()));
  h.check(
    'No Space-return instruction',
    !/space.*(?:return|surface|raft)|(?:return|surface).*space/i.test(
      await h.p.locator('body').innerText(),
    ),
  );
  h.check('Air independently visible', await h.p.locator('#dive-overlay').isVisible());
  h.check(
    'Objective images independently visible',
    await h.p.locator('#dive-objectives').isVisible(),
  );
  h.check(
    'Objective pictures match targets',
    (await h.p.locator('#dive-objectives [role="img"]').count()) ===
      Game.getCleanupSite(await h.state()).trash.length,
  );
  h.check(
    'No text in objective strip',
    (await h.p.locator('#dive-objectives').innerText()).replaceAll('✓', '').trim() === '',
  );
  const ui = await h.p.evaluate(() => {
    const visible = (e) =>
      e.getBoundingClientRect().width &&
      e.getBoundingClientRect().height &&
      getComputedStyle(e).visibility !== 'hidden';
    return {
      titles: [...document.querySelectorAll('[title]')]
        .filter(
          (e) =>
            visible(e) && e.title && (e.id === 'game-canvas' || /drag|orbit|zoom/i.test(e.title)),
        )
        .map((e) => ({ id: e.id, title: e.title })),
      air: document.querySelector('#dive-overlay').getBoundingClientRect().toJSON(),
      objectives: document.querySelector('#dive-objectives').getBoundingClientRect().toJSON(),
    };
  });
  h.check(
    'Air and objectives occupy independent regions',
    ui.air.bottom <= ui.objectives.top ||
      ui.objectives.bottom <= ui.air.top ||
      ui.air.right <= ui.objectives.left ||
      ui.objectives.right <= ui.air.left,
    ui,
  );
  h.check('No underwater canvas or drag/orbit/zoom tooltip', ui.titles.length === 0, ui.titles);
}
async function objectiveRoundtrip(h, id) {
  await enter(h, id);
  const site = Game.getCleanupSite(await h.state());
  h.r.derivedSite = site;
  const before = (await h.state()).inventory;
  for (const item of site.trash) {
    const a = (await h.state()).cleanup.attempt;
    await swim(h, { x: a.x, y: 0 });
    await h.p.waitForFunction(() => window.__tidekin.getState().cleanup.attempt.air >= 23.8);
    await swim(h, item);
    await underwater(h);
    await h.shot('deep-' + item.id);
    await pull(h, item);
  }
  const completed = await h.state();
  h.check('Objective completes', completed.cleanup.attempt.status === 'complete');
  for (const [key, amount] of Object.entries(site.reward ?? {}))
    h.check(
      'Exact once-only earned payout ' + key,
      completed.inventory[key] === before[key] + amount,
    );
  await h.shot('objective-complete-underwater-' + id.replaceAll(':', '-'));
  const air = completed.cleanup.attempt.air;
  await h.p.waitForTimeout(650);
  h.check(
    'Air depletes after objective completion',
    (await h.state()).cleanup.attempt.air < air - 0.3,
    { airBefore: air, airAfter: (await h.state()).cleanup.attempt.air },
  );
  await h.key('Space');
  h.check('No below-water exit', (await h.state()).cleanup.attempt?.siteId === id);
  h.check('No submerged board button', !(await h.p.locator('#dive-button').isVisible()));
  const a = (await h.state()).cleanup.attempt;
  await swim(h, { x: a.x, y: 0 });
  await h.p.waitForTimeout(250);
  h.check('Board appears at surface', await h.p.locator('#dive-button').isVisible());
  await h.click('#dive-button');
  h.check('Surface pointer exit boards raft', !(await h.state()).cleanup.attempt);
  await h.shot('back-aboard-' + id.replaceAll(':', '-'));
  return site;
}
async function diveChecks(h) {
  await start(h, true);
  await objectiveRoundtrip(h, 'salvage:home-pearls');
  const before = await h.state();
  await reload(h);
  h.check(
    'Earned objective persists within travel fixture',
    (await h.state()).collected.includes('home-pearls') &&
      JSON.stringify((await h.state()).inventory) === JSON.stringify(before.inventory),
  );
  await h.key('c');
  await keepsakeArt(h);
  await h.shot('earned-trophy-within-travel-fixture');
}
async function earned(h) {
  await start(h, false);
  h.check('Fresh actually earned run has no fixture', h.r.initialStorage.length === 0);
  await h.shot('fresh-start');
  await objectiveRoundtrip(h, 'salvage:home-pearls');
  const pearl = await h.state();
  h.check(
    'Single pearl-bed roundtrip earned',
    pearl.collected.includes('home-pearls') &&
      pearl.inventory.pearls === Game.SALVAGE_NODES.find((n) => n.id === 'home-pearls').amount,
  );
  await objectiveRoundtrip(h, 'home-reef');
  h.check('Reef restoration earned', (await h.state()).cleanup.completed.includes('home-reef'));
  await timerPersistence(h);
  const before = await h.state();
  await reload(h);
  const after = await h.state();
  h.check(
    'Actual earned automatic continue persists',
    JSON.stringify(before.inventory) === JSON.stringify(after.inventory) &&
      JSON.stringify(before.trophies) === JSON.stringify(after.trophies) &&
      after.cleanup.completed.includes('home-reef'),
  );
  await h.key('c');
  await keepsakeArt(h);
  await h.shot('actually-earned-cabin-continued');
}

async function keepsakeArt(h) {
  const earned = (await h.state()).trophies ?? [];
  h.check(
    'Found keepsakes exactly match earned trophies',
    (await h.p.locator('.keepsake.found').count()) === earned.length,
    { earned },
  );
  for (const id of earned) {
    const tile = h.p.locator(`.keepsake.found[data-keepsake="${id}"] .keepsake-art`);
    h.check('Found keepsake art visible ' + id, await tile.isVisible());
    const art = await tile.evaluate(async (e) => {
      const css = getComputedStyle(e),
        url = css.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
      if (!url) return { loaded: false, background: css.backgroundImage };
      const img = new Image();
      const loaded = await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000);
        img.onload = () => {
          clearTimeout(timeout);
          resolve(img.naturalWidth > 0 && img.naturalHeight > 0);
        };
        img.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
        img.src = url;
      });
      return {
        url,
        loaded,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        backgroundSize: css.backgroundSize,
        backgroundPosition: css.backgroundPosition,
      };
    });
    h.check(
      'Found keepsake atlas loaded ' + id,
      art.loaded && new URL(art.url).pathname === '/assets/ui-fifth/keepsakes.png',
      art,
    );
  }
  await keepsakeSelections(h);
}
async function keepsakeSelections(h) {
  const s = await h.state();
  const found = Game.DIVE_TROPHIES.find((t) => s.trophies.includes(t.id)),
    empty = Game.DIVE_TROPHIES.find((t) => !s.trophies.includes(t.id));
  if (found) {
    await h.click(`[data-keepsake="${found.id}"]`);
    h.check(
      'Collected keepsake selected accessibly',
      (await h.p.locator(`[data-keepsake="${found.id}"]`).getAttribute('aria-expanded')) === 'true',
    );
    h.check(
      'Collected keepsake story shown',
      (await h.p.locator('#keepsake-detail').innerText()) === found.description,
    );
    await h.shot('cabin-collected-selected');
  }
  if (empty) {
    await h.click(`[data-keepsake="${empty.id}"]`);
    h.check(
      'Empty keepsake selected accessibly',
      (await h.p.locator(`[data-keepsake="${empty.id}"]`).getAttribute('aria-expanded')) === 'true',
    );
    const detail = await h.p.locator('#keepsake-detail').innerText();
    h.check(
      'Empty keepsake exploration hint shown',
      detail.includes(empty.name) && Boolean(empty.hint) && detail.includes(empty.hint),
      { detail, expectedHint: empty.hint },
    );
    await h.shot('cabin-empty-selected-hint');
  }
}
async function timerPersistence(h) {
  // Observe storage before navigation/pause can cause an event-triggered save.
  const rawBefore = await h.p.evaluate(() => localStorage.getItem('tidekin.save.v2'));
  const liveBefore = await h.state();
  await h.p.locator('#game-canvas').focus();
  await h.key('w', 700);
  const moved = await h.state();
  h.check(
    'Actual movement before timer save',
    Math.hypot(moved.position.x - liveBefore.position.x, moved.position.z - liveBefore.position.z) >
      0.5,
    { before: liveBefore.position, after: moved.position },
  );
  const waitStart = Date.now();
  await h.p.waitForTimeout(10500);
  const rawAfter = await h.p.evaluate(() => localStorage.getItem('tidekin.save.v2'));
  h.check(
    '10 second timer writes before pause/reload/pagehide',
    Boolean(rawAfter) && rawAfter !== rawBefore,
    {
      elapsedMs: Date.now() - waitStart,
      beforeSha256: rawBefore ? hash(rawBefore) : null,
      afterSha256: rawAfter ? hash(rawAfter) : null,
    },
  );
  const saved = Game.deserializeGame(rawAfter);
  h.r.timerPersistence = {
    waitMs: 10500,
    rawBefore,
    rawAfter,
    movedPosition: moved.position,
    savedState: saved,
    method:
      'Actual W movement, then uninterrupted visible gameplay; read localStorage before any pause, action, reload or pagehide.',
  };
  h.check(
    'Timer save contains moved position',
    Math.hypot(saved.position.x - moved.position.x, saved.position.z - moved.position.z) < 0.1,
    { moved: moved.position, saved: saved.position },
  );
  h.check(
    'Timer save contains current materials and trophies',
    JSON.stringify(saved.inventory) === JSON.stringify(moved.inventory) &&
      JSON.stringify(saved.trophies) === JSON.stringify(moved.trophies),
  );
  h.check('Timer save advances voyage time', saved.time > moved.time, {
    movedTime: moved.time,
    savedTime: saved.time,
  });
}
