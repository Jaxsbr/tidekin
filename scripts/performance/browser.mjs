import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import os from 'node:os';
import { sha256 } from './evidence.mjs';
import { freshFixture } from './fixtures.mjs';
import { cpuCheckpoint, cpuWindow } from './cpu.mjs';
import { createMemoryCoordinator, readOwnedRss, NO_VRAM, validateHabitatRenderProgress } from './memory.mjs';

export function browserLaunchPlan({chromium,profile,browserExecutable,platform=os.platform()}) {
  const executable = profile==='hardware' ? browserExecutable ?? (platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':null) : chromium.executablePath();
  if(!executable)throw Error('Hardware needs installed Chrome binary path for fingerprint via --browser-executable');
  const args=profile==='ci-software'?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']:[];
  return {executable,options:{headless:profile==='ci-software',executablePath:executable,args,...(profile==='hardware'?{channel:'chrome'}:{})}};
}

export async function startMemoryBrowser({context,browser,chromium,options,executable,executableSha256,
  readBinary=readFile,onContextClosed=()=>{},onBrowserClosed=()=>{}}) {
  await context.close();onContextClosed();
  await browser.close();onBrowserClosed();
  if(sha256(await readBinary(executable))!==executableSha256)throw Error('Browser executable changed before memory round');
  return chromium.launch(options);
}

// Called only after enter() has confirmed the actual requested attempt. Both
// snapshots read state and counters in one page turn, before exit() is invoked.
export async function observeActiveHabitat(page,site) {
  async function capture() {
    const requestStartMs=performance.now();
    const result=await page.evaluate(()=>{
      const state=window.__tidekin.getState(),metrics=window.__tidekin.getMetrics(),a=state.cleanup.attempt;
      return {state,metrics,checkpoint:{site:a?.siteId,status:a?.status,air:a?.air,
        rendered:metrics.activeRenderedFrames,visible:document.visibilityState==='visible',focused:document.hasFocus(),paused:metrics.paused}};
    });
    Object.assign(result.checkpoint,{requestStartMs,responseEndMs:performance.now()});return result;
  }
  const before=await capture();await page.waitForTimeout(500);const after=await capture();
  const evidence={insideRenderedBefore:before.checkpoint.rendered,insideRendered:after.checkpoint.rendered,
    insideCheckpoints:[before.checkpoint,after.checkpoint]};
  validateHabitatRenderProgress(evidence,site);
  return {...after,evidence};
}

export async function enterSurfaceBuoy({Game,site,state,metrics,sail,page,inputLog,profile='hardware'}) {
  if(!['home-reef','sheltered-cove'].includes(site))throw Error(`Not a surface buoy: ${site}`);
  const targetSite=Game.getCleanupSite(await state(),site);
  // Approach on each habitat's outward side, where it remains the nearest
  // fixed site. The .75 m arrival tolerance leaves >5 m hull clearance and
  // stays inside both real entry ranges. All displacement uses normal sailing.
  const approach={x:targetSite.position.x+(site==='home-reef'?6:-6),z:targetSite.position.z};
  const entry={action:'buoy',site,approach,stage:'sailing'};inputLog.push(entry);
  const pointerStatus=point=>page.evaluate(point=>{
    const canvas=document.getElementById('game-canvas'),hit=document.elementFromPoint(point.x,point.y);
    const panel=document.getElementById('panel-dialog'),modal=document.getElementById('modal-dialog');
    return {canvasReceivesInput:hit===canvas,hitId:hit?.id??null,hitTag:hit?.tagName??null,
      hoverTitle:canvas?.title??null,panelOpen:Boolean(panel?.open),panel:panel?.dataset.panel??null,
      modalOpen:Boolean(modal?.open),paused:window.__tidekin.getMetrics().paused};
  },point);
  try {
    await sail(approach,.75);await page.waitForTimeout(500);
    // At Low 960x600, a buoy behind the follow camera falls under the HUD.
    // Only software fixtures turn at rest, through the game's normal keys.
    // Hardware retains the measured stand-off, heading and input sequence.
    if(profile==='ci-software') {
      entry.stage='facing';entry.facing={method:'normal A/D steering at rest',holds:[]};
      const deadline=Date.now()+10000;let heldMs=0,aligned=false;
      for(let turn=0;turn<60&&Date.now()<deadline&&heldMs<6000;turn++) {
        const current=await state(),dx=targetSite.position.x-current.position.x,dz=targetSite.position.z-current.position.z;
        const angle=Math.atan2(Math.sin(Math.atan2(dx,dz)-current.heading),Math.cos(Math.atan2(dx,dz)-current.heading));
        if(!Number.isFinite(angle))throw Error('Invalid buoy facing angle');
        if(turn===0)entry.facing.before={position:current.position,heading:current.heading,angle};
        if(Math.abs(angle)<=.07){aligned=true;entry.facing.after={position:current.position,heading:current.heading,angle};break;}
        const key=angle>0?'a':'d',ms=Math.min(180,Math.max(25,Math.abs(angle)/1.6*800),6000-heldMs);
        entry.facing.holds.push({key,ms,angle});heldMs+=ms;
        try {await page.keyboard.down(key);await page.waitForTimeout(ms);}
        finally {await page.keyboard.up(key);}
      }
      if(!aligned)throw Error('Buoy facing deadline exceeded');
      await page.waitForTimeout(500);
    }
    const s=await state(),m=await metrics(),distance=Math.hypot(s.position.x-targetSite.position.x,s.position.z-targetSite.position.z);
    const outcome=Game.act(structuredClone(s),'enter-cleanup',{siteId:site});
    entry.before={position:s.position,heading:s.heading,region:s.region,distance,entryRange:targetSite.entryRange,
      nearestSite:Game.getCleanupContext(s).site.id,domainOutcome:{ok:outcome.ok,code:outcome.code},paused:m.paused};
    entry.stage='preconditions';
    if(!outcome.ok||entry.before.nearestSite!==site||distance<5||distance>targetSite.entryRange||m.paused)
      throw Error('Buoy entry preconditions failed');
    const target=m.interactions?.[`cleanup:${site}`];
    if(!target?.visible||!Number.isFinite(target.x)||!Number.isFinite(target.y))throw Error('Interactive buoy hotspot unavailable');
    entry.x=target.x;entry.y=target.y;entry.projection='interactions cleanup hotspot';entry.stage='hover';
    await page.mouse.move(target.x,target.y);
    entry.pointer=await pointerStatus(target);
    // main's real pointermove handler reports its raycast winner through the
    // canvas title. Do not infer a hit from projection visibility alone.
    if(!entry.pointer.canvasReceivesInput||entry.pointer.paused||entry.pointer.hoverTitle!=='Snorkel · Space')
      throw Error('Buoy hotspot does not resolve to the cleanup interaction');
    entry.stage='click';await page.mouse.click(target.x,target.y);
    await page.waitForFunction(site=>window.__tidekin.getState().cleanup.attempt?.siteId===site,site,{timeout:5000});
    const after=await state();entry.after={position:after.position,site:after.cleanup.attempt?.siteId,status:after.cleanup.attempt?.status};
    entry.stage='entered';
  } catch(error) {
    entry.failure=String(error);
    try {
      const s=await state();entry.after={position:s.position,heading:s.heading,site:s.cleanup.attempt?.siteId??null};
      if(Number.isFinite(entry.x))entry.pointerAfter=await pointerStatus(entry);
    } catch(diagnosticError){entry.diagnosticFailure=String(diagnosticError);}
    throw Error(`Surface buoy entry failed: ${JSON.stringify(entry)}`,{cause:error});
  }
}

export async function measureBrowserRun({ root, url, policy, profile, repeat, browserModule, browserExecutable }, injected={}) {
  // Called only after the CLI release gate. Importing this module launches nothing.
  const { chromium } = injected.chromium ? {chromium:injected.chromium} : await import(browserModule);
  const Game = injected.Game ?? await import(pathToFileURL(join(root, 'src/game.js')));
  const fixture = freshFixture(Game), supplied = freshFixture(Game, {supplied:true});
  const save = fixture.serialized;
  const {executable,options}=browserLaunchPlan({chromium,profile,browserExecutable});
  const args=options.args;
  const executableSha256=sha256(await (injected.readBinary??readFile)(executable));
  let browser = await chromium.launch(options);
  const errors = [], inputLog = [];
  const report = { repeat, fixture: { label: 'synthetic fresh save, skipped guide, no earned progression', sha256: sha256(save) },
    launchArgs: args, launchChannel:profile==='hardware'?'chrome':'bundled-chromium', executablePath:executable, executableSha256,
    scenarios: [], transitions: [], memoryWindows:[], timedIntervals:[],gcIntervals:[], errors, inputLog };
  let context;
  try {
    report.version=browser.version();
    async function createContext(serializedSave) {
    const ctx = await browser.newContext({ viewport: policy.viewport, deviceScaleFactor: policy.dpr,
      reducedMotion: 'no-preference', locale: 'en-NZ', timezoneId: 'Pacific/Auckland', serviceWorkers: 'block' });
    await ctx.addInitScript(({ save, quality }) => {
      localStorage.setItem('tidekin.save.v2', save);
      localStorage.setItem('tidekin.settings.v1', JSON.stringify({ quality, sound: false, reducedMotion: false, largeText: false }));
      performance.setResourceTimingBufferSize(10000);
      window.__perfLoading = {};
      new PerformanceObserver(list => { for (const entry of list.getEntries()) {
        if (entry.entryType === 'event' && entry.name === 'click' && !window.__perfLoading.clickMs) window.__perfLoading.clickMs = entry.startTime;
      } }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
      document.addEventListener('click', event => {
        if (event.target.closest('#continue-voyage')) window.__perfLoading.clickMs = performance.now();
      }, true);
      function ready() {
        const canvas = document.getElementById('game-canvas'), m = window.__tidekin?.getMetrics();
        const bounds=canvas?.getBoundingClientRect(),style=canvas&&getComputedStyle(canvas);
        if (bounds?.width > 0 && bounds.height > 0 && style.visibility==='visible' && style.display!=='none' && Number(style.opacity)>0 && m?.activeRenderedFrames > 0 && !m.paused &&
            m.visibility === 'visible' && !document.getElementById('game-view').hidden) {
          window.__perfLoading.firstInteractiveMs = performance.now();
          window.__perfLoading.activeRenderedFrames = m.activeRenderedFrames;
        } else requestAnimationFrame(ready);
      }
      requestAnimationFrame(ready);
    }, { save: serializedSave, quality: policy.quality });
    return ctx;
    }
    context = await createContext(save);

    async function open(mode, preparedPage) {
      const page = preparedPage ?? await context.newPage(); page.setDefaultTimeout(30000);
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', message => { if (message.type()==='error') errors.push(`console: ${message.text()}`); });
      page.on('requestfailed', r => errors.push(`${r.url()}: ${r.failure()?.errorText}`));
      page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
      await page.goto(url + '/?qa=1', { waitUntil: 'domcontentloaded' });
      await page.locator('#continue-voyage').waitFor({ state: 'visible' });
      const menuReadyMs = await page.evaluate(() => performance.now());
      await page.locator('#continue-voyage').click();
      await page.waitForFunction(() => Number.isFinite(window.__perfLoading?.firstInteractiveMs));
      await page.bringToFront(); await page.locator('#game-canvas').focus();
      // Timings are captured before networkidle; wait only to complete byte accounting.
      await page.waitForLoadState('networkidle');
      const loading = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0].toJSON();
        const resources = performance.getEntriesByType('resource').map(r => ({ path: new URL(r.name).pathname,
          initiatorType: r.initiatorType, startTime: r.startTime, duration: r.duration,
          encodedBodySize: r.encodedBodySize, decodedBodySize: r.decodedBodySize, transferSize: r.transferSize }));
        const phases = window.__tidekin?.getMetrics().loadingPhases;
        return { ...window.__perfLoading, navigation, resources,
          phases: Array.isArray(phases) ? { status: 'measured', rows: phases } : { status: 'unavailable', reason: 'legacy QA hook has no loadingPhases' } };
      });
      loading.menuReadyMs = menuReadyMs;
      loading.playReadyMs = loading.firstInteractiveMs - loading.clickMs;
      loading.network = Object.fromEntries(['encodedBodySize', 'decodedBodySize', 'transferSize'].map(key =>
        [key, loading.resources.reduce((n, r) => n + r[key], loading.navigation[key])]));
      loading.cacheMode = mode;
      return { page, loading };
    }
    const cold = await open('cold-fresh-browser-context'); report.cold = cold.loading;
    await cold.page.close();
    const warm = await open('warm-same-context-new-document'); report.warm = warm.loading;
    let page = warm.page;
    let cdp = await context.newCDPSession(page);
    let browserCdp = await browser.newBrowserCDPSession();
    const scopes=createMemoryCoordinator({readHeap:()=>cdp.send('Runtime.getHeapUsage'),
      readRss:()=>readOwnedRss(browserCdp),windows:report.memoryWindows,timedIntervals:report.timedIntervals,gcIntervals:report.gcIntervals});
    report.graphics = await page.locator('#game-canvas').evaluate(canvas => {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) throw Error('WebGL unavailable');
      const extension = gl.getExtension('WEBGL_debug_renderer_info');
      return { renderer: gl.getParameter(extension ? extension.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
        vendor: gl.getParameter(extension ? extension.UNMASKED_VENDOR_WEBGL : gl.VENDOR),
        drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight] };
    });
    if (profile === 'ci-software' && !/swiftshader/i.test(report.graphics.renderer)) throw Error('CI requires explicit SwiftShader renderer');
    if (profile === 'hardware' && /swiftshader|llvmpipe|software/i.test(report.graphics.renderer)) throw Error('Hardware profile has software renderer');
    const state = () => page.evaluate(() => window.__tidekin.getState());
    const metrics = () => page.evaluate(() => window.__tidekin.getMetrics());
    const press = async (key, ms) => {
      inputLog.push({ action: 'hold', key, ms }); await page.keyboard.down(key);
      try { await page.waitForTimeout(ms); } finally { await page.keyboard.up(key); }
    };
    async function sail(target, tolerance = 1.5) {
      const deadline = Date.now() + 90000;
      while (Date.now() < deadline) {
        const s = await state(), dx = target.x - s.position.x, dz = target.z - s.position.z, distance = Math.hypot(dx, dz);
        if (distance <= tolerance) return;
        const a = Math.atan2(Math.sin(Math.atan2(dx, dz) - s.heading), Math.cos(Math.atan2(dx, dz) - s.heading));
        await press(Math.abs(a) > .07 ? a > 0 ? 'a' : 'd' : 'w', Math.abs(a) > .07 ?
          Math.min(180, Math.max(25, Math.abs(a) / 1.6 * 800)) : Math.min(180, Math.max(35, distance / Game.sailingSpeed(s) * 650)));
      }
      throw Error('Sailing deadline exceeded');
    }
    async function enter(site) {
      const s = await state(), targetSite = Game.getCleanupSite(s, site);
      if (site === 'salvage:horizon-wreck') {
        if (!s.discoveries.includes('horizon')) await sail(Game.ISLANDS.find(i=>i.id==='horizon').position);
        await page.evaluate(() => window.__tidekin.action('travel', { region:'horizon' }));
        inputLog.push({ action:'travel', region:'horizon', method:'public semantic QA action; normal domain preconditions' });
      } else if (s.region !== 'home') {
        await page.evaluate(() => window.__tidekin.action('travel', { region:'home' }));
        inputLog.push({ action:'travel', region:'home', method:'public semantic QA action; normal domain preconditions' });
      }
      if (site.startsWith('salvage:')) {
        await sail(targetSite.position);
        inputLog.push({ action:'enter-cleanup', site, method:'public semantic QA action; normal domain preconditions' });
        await page.evaluate(site => window.__tidekin.action('enter-cleanup', { siteId:site }), site);
        await page.waitForFunction(site => window.__tidekin.getState().cleanup.attempt?.siteId === site, site);
        return;
      }
      await enterSurfaceBuoy({Game,site,state,metrics,sail,page,inputLog,profile});
    }
    async function exit() {
      const deadline = Date.now() + 15000;
      while ((await state()).cleanup.attempt.y < -.25) {
        if (Date.now() > deadline) throw Error('Surface exit deadline exceeded');
        await press('w', 100);
      }
      inputLog.push({ action: 'surface-exit', key: 'Space' }); await page.keyboard.press('Space');
      await page.waitForFunction(() => window.__tidekin.getState().cleanup.attempt === null);
    }
    async function memory() {
      // Forced GC belongs only to memory checkpoints, outside timed frame windows.
      const result = { gpuVramBytes:{...NO_VRAM} };
      try {
        await cdp.send('HeapProfiler.collectGarbage');
        const heap = await cdp.send('Runtime.getHeapUsage');
        result.runtimeHeapUsage={status:'measured',raw:heap,method:'CDP Runtime.getHeapUsage after forced GC; raw fields retained'};
        result.heapBytes = { status: 'measured', value: heap.usedSize, method: 'CDP usedSize after forced GC' };
        result.backingStorageBytes=Number.isFinite(heap.backingStorageSize)?{status:'measured',value:heap.backingStorageSize,method:'CDP backingStorageSize after forced GC'}:
          {status:'unavailable',reason:'CDP Runtime.getHeapUsage did not provide backingStorageSize'};
      } catch (e) {
        result.runtimeHeapUsage={status:'unavailable',reason:String(e)};
        result.heapBytes = { status: 'unavailable', reason: String(e) };
        result.backingStorageBytes = { status: 'unavailable', reason: String(e) };
      }
      try {
        result.processRssBytes={status:'measured',...await readOwnedRss(browserCdp)};
      } catch (e) {
        result.processRssBytes = { status: 'unavailable', reason: String(e),raw:e.evidence??null,unresolved:(e.pendingRequestCount??0)>0 };
        report.failedMemoryCheckpoint=result;
        throw e;
      }
      return result;
    }
    async function sample(id) {
      const before = await metrics();
      await cdp.send('Performance.enable',{timeDomain:'timeTicks'});
      await page.evaluate(({ warmupMs, sampleMs }) => {
        const probe = window.__perfProbe = { start: performance.now(), timestamps: [], checkpoints: [], events:[], done: false };
        let lastCheck = -Infinity;
        function frame(now) {
          const t = now - probe.start;
          if (t >= warmupMs) {
            probe.timestamps.push(t);
            if (t - lastCheck >= 200) {
              const s = window.__tidekin.getState(), m = window.__tidekin.getMetrics(), a = s.cleanup.attempt;
              probe.checkpoints.push({ t, gameTime: s.time, position: s.position, depth: a ? -a.y : null,
                air: a?.air ?? null, status: a?.status ?? null, site: a?.siteId ?? null,
                visible: document.visibilityState === 'visible', focused: document.hasFocus(), paused: m.paused,
                quality: m.quality, view: m.viewMode, rendered: m.activeRenderedFrames,
                geometries: m.geometries, textures: m.textures, drawCalls: m.drawCalls, triangles: m.triangles,
                viewport: m.viewport }); lastCheck = t;
            }
          }
          if (t >= warmupMs + sampleMs) probe.done = true; else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }, policy);
      const deadline = Date.now() + policy.warmupMs + policy.sampleMs + 15000;
      let held = null, phase = 'descend', targetIndex = 0;
      let cpuStart;
      const targets = [{ x:0, z:8 }, { x:-12, z:8 }, { x:0, z:0 }];
      try {
        while (!await page.evaluate(() => window.__perfProbe.done)) {
          if (Date.now() > deadline) throw Error('Frame probe deadline exceeded');
          if(!cpuStart && await page.evaluate(()=>window.__perfProbe.timestamps.length>0))cpuStart=await cpuCheckpoint(cdp);
          let desired = null;
          if (id.startsWith('moving-dive-')) {
            const a = (await state()).cleanup.attempt;
            if (!a || a.status === 'failed' || a.air <= 0) throw Error('Dive no longer viable');
            if (phase === 'descend' && a.y <= -12) {
              // Record the physical turnaround exactly; periodic 200ms state
              // checkpoints can miss this brief peak. Never infer a depth.
              await page.evaluate(()=>{
                const p=window.__perfProbe,s=window.__tidekin.getState(),m=window.__tidekin.getMetrics(),a=s.cleanup.attempt;
                p.events.push({event:'deep-turn',t:performance.now()-p.start,depth:-a.y,air:a.air,status:a.status,site:a.siteId,
                  gameTime:s.time,rendered:m.activeRenderedFrames,visible:document.visibilityState==='visible',focused:document.hasFocus(),paused:m.paused,quality:m.quality});
              });
              phase = 'ascend';
            }
            if (phase === 'ascend' && a.y >= -.25) phase = 'breathe';
            if (phase === 'breathe' && a.air >= 23.8) phase = 'descend';
            desired = phase === 'descend' ? 's' : phase === 'ascend' ? 'w' : null;
          } else if (id === 'sailing-circuit') {
            const s = await state(), target = targets[targetIndex % targets.length], dx = target.x-s.position.x, dz = target.z-s.position.z;
            if (Math.hypot(dx,dz) < 1.5) targetIndex++;
            else { const a = Math.atan2(Math.sin(Math.atan2(dx,dz)-s.heading), Math.cos(Math.atan2(dx,dz)-s.heading)); desired = Math.abs(a) > .07 ? a > 0 ? 'a' : 'd' : 'w'; }
          }
          if (held !== desired) { if (held) await page.keyboard.up(held); if (desired) await page.keyboard.down(desired);
            inputLog.push({ scenario:id, key:desired, phase }); held = desired; }
          await page.waitForTimeout(60);
        }
      } finally { if (held) await page.keyboard.up(held); }
      const probe = await page.evaluate(() => window.__perfProbe);
      const cpuEnd=await cpuCheckpoint(cdp);
      if(!cpuStart)throw Error('CPU recording window never started');
      return { id, timestamps: probe.timestamps, checkpoints: probe.checkpoints, coverageEvents:probe.events, cpu:cpuWindow(cpuStart,cpuEnd), before, after: await metrics() };
    }
    async function developedContext() {
      await context.close();
      report.developedFixture = { label:supplied.label, sha256:sha256(supplied.serialized) };
      context = await createContext(supplied.serialized);
      page = (await open('developed-fixture-fresh-context')).page;
      cdp = await context.newCDPSession(page);
      report.construction = [];
      for (const upgrade of Object.keys(supplied.state.upgrades)) {
        const before = await metrics();
        const outcome = await page.evaluate(upgrade => window.__tidekin.action('build', {upgrade}), upgrade);
        if (!outcome?.ok) throw Error(`Fixture construction failed: ${upgrade} ${outcome?.code}`);
        await page.waitForFunction(() => !window.__tidekin.getMetrics().buildPresentation?.active);
        await page.waitForTimeout(300);
        report.construction.push({ upgrade, outcome, before, after:await metrics(), built:(await state()).upgrades[upgrade] });
        inputLog.push({action:'build',upgrade,method:'public semantic QA action; normal costs/prerequisites'});
      }
    }
    for (const id of policy.scenarios) {
      if (id === 'developed-raft') continue;
      if (id === 'moving-dive-salvage:home-pearls') await developedContext();
      if (id.startsWith('moving-dive-')) await enter(id.slice('moving-dive-'.length));
      console.log(`repeat ${repeat}: sample ${id}`);
      report.scenarios.push(await scopes.timed(id,()=>sample(id)));
      if (id.startsWith('moving-dive-')) await exit();
    }
    // Finish every timing scope before the first peak-memory request.
    await page.evaluate(() => window.__tidekin.action('travel', { region:'home' }));
    report.scenarios.push(await scopes.timed('developed-raft',()=>stationarySample(page,cdp,'developed-raft',policy)));
    report.menus = [];
    await scopes.timed('menus',async()=>{
      for (const [panel, key] of [['workshop','b'], ['chart','m'], ['journal','j'], ['cabin','c']]) {
        const before = await page.evaluate(() => ({ t:performance.now(), m:window.__tidekin.getMetrics(), time:window.__tidekin.getState().time }));
        await page.keyboard.press(key);
        await page.waitForFunction(panel => document.getElementById('panel-dialog').open && document.getElementById('panel-dialog').dataset.panel === panel, panel);
        const after = await page.evaluate(() => ({ t:performance.now(), m:window.__tidekin.getMetrics(), time:window.__tidekin.getState().time }));
        report.menus.push({ panel, openMs:after.t-before.t, paused:after.m.paused, view:after.m.viewMode,
          sceneFrames:after.m.frames-before.m.frames, gameSeconds:after.time-before.time,
          drawCalls:after.m.drawCalls, triangles:after.m.triangles });
        await page.locator('#close-panel').click(); await page.locator('#game-canvas').focus();
      }
    });
    const foreground=()=>page.evaluate(()=>({visible:document.visibilityState==='visible',focused:document.hasFocus(),paused:window.__tidekin.getMetrics().paused}));
    const entryEvidence=async(site,before,active)=>({site:active.state.cleanup.attempt?.siteId,requestedSite:site,renderedBefore:before.activeRenderedFrames,
      renderedAfter:(await metrics()).activeRenderedFrames,...await foreground(),status:active.state.cleanup.attempt?.status,
      air:active.state.cleanup.attempt?.air,exited:(await state()).cleanup.attempt===null,...active.evidence});
    report.memoryBefore = await scopes.gc('before',memory);
    for (let cycle = 1; cycle <= policy.transitionCycles; cycle++) {
      const site = policy.habitats[(cycle-1) % policy.habitats.length];let transition;
      await scopes.peak(`transition/${cycle}/${site}`,async()=>{
        const before=await metrics();
        await enter(site);const active=await observeActiveHabitat(page,site),inside=active.metrics,insideState=active.state;
        active.evidence.exitRequestStartMs=performance.now();await exit();await page.waitForTimeout(300);
        transition={cycle,site,inside,insideState,outside:await metrics(),outsideState:await state()};
        return entryEvidence(site,before,active);
      });
      transition.memory=await scopes.gc(`cycle-${cycle}`,memory);report.transitions.push(transition);
      if (cycle % 4 === 0) console.log(`repeat ${repeat}: sustained transitions ${cycle}/${policy.transitionCycles}`);
    }
    report.memoryAfter = await scopes.gc('after',memory);

    // Sequential fresh browser: the timed browser is closed before launching
    // memory-only cold/warm documents. Timed readiness values remain untouched.
    browser=await startMemoryBrowser({context,browser,chromium,options,executable,executableSha256,
      readBinary:injected.readBinary??readFile,onContextClosed:()=>{context=null;},onBrowserClosed:()=>{report.timingBrowserClosed=true;}});
    report.memoryBrowser={fresh:true,version:browser.version(),executableSha256,closed:false,
      fixture:{label:supplied.label,sha256:sha256(supplied.serialized)}};
    browserCdp=await browser.newBrowserCDPSession();context=await createContext(supplied.serialized);
    for(const mode of ['cold','warm']) {
      page=await context.newPage();await page.bringToFront();cdp=await context.newCDPSession(page);
      await scopes.peak(`startup-${mode}`,async()=>{
        const opened=await open(`${mode}-memory-only`,page);
        report.memoryBrowser[mode]=opened.loading;
        const m=await metrics();return {renderedBefore:0,renderedAfter:m.activeRenderedFrames,...await foreground(),
          menuVisible:opened.loading.menuReadyMs>0,ready:opened.loading.activeRenderedFrames>0};
      });
      if(mode==='cold')await page.close();
    }
    report.memoryBrowser.graphics=await page.locator('#game-canvas').evaluate(canvas=>{
      const gl=canvas.getContext('webgl2')||canvas.getContext('webgl'),extension=gl.getExtension('WEBGL_debug_renderer_info');
      return {renderer:gl.getParameter(extension?extension.UNMASKED_RENDERER_WEBGL:gl.RENDERER),
        vendor:gl.getParameter(extension?extension.UNMASKED_VENDOR_WEBGL:gl.VENDOR),drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight]};
    });
    if(JSON.stringify(report.memoryBrowser.graphics)!==JSON.stringify(report.graphics)||report.memoryBrowser.version!==report.version)
      throw Error('Memory-only browser identity changed');
    for(const upgrade of Object.keys(supplied.state.upgrades))await scopes.peak(`build/${upgrade}`,async()=>{
      const before=await metrics(),outcome=await page.evaluate(upgrade=>window.__tidekin.action('build',{upgrade}),upgrade);
      if(!outcome?.ok)throw Error(`Memory construction failed: ${upgrade} ${outcome?.code}`);
      await page.waitForFunction(()=>!window.__tidekin.getMetrics().buildPresentation?.active);await page.waitForTimeout(300);
      inputLog.push({action:'build',upgrade,scope:'memory-only',method:'public semantic QA action; normal costs/prerequisites'});
      return {upgrade,outcome,built:(await state()).upgrades[upgrade],renderedBefore:before.activeRenderedFrames,
        renderedAfter:(await metrics()).activeRenderedFrames,...await foreground()};
    });
    for(const site of policy.habitats)await scopes.peak(`entry/${site}`,async()=>{
      const before=await metrics();await enter(site);const active=await observeActiveHabitat(page,site);
      active.evidence.exitRequestStartMs=performance.now();await exit();await page.waitForTimeout(300);
      return entryEvidence(site,before,active);
    });
    report.status = errors.length ? 'failed' : 'complete';
    return report;
  } catch (e) { report.status = 'failed'; report.failure = String(e.stack); return report; }
  finally {
    try { await context?.close(); } catch(e) { report.status='failed';report.errors.push(`Context cleanup: ${e}`); }
    try { await browser.close();report.browserClosed=true;if(report.memoryBrowser)report.memoryBrowser.closed=true; } catch(e) { report.status='failed';report.browserClosed=false;report.errors.push(`Browser cleanup: ${e}`); }
  }
}

async function stationarySample(page, cdp, id, policy) {
  const before = await page.evaluate(() => window.__tidekin.getMetrics());
  await page.waitForTimeout(policy.warmupMs);
  await cdp.send('Performance.enable',{timeDomain:'timeTicks'});
  const cpuStart=await cpuCheckpoint(cdp);
  const probe = await page.evaluate(async ({ sampleMs }) => {
    const timestamps = [], checkpoints = []; let start, lastCheck = -Infinity;
    await new Promise((resolve,reject) => {
      const timer=setTimeout(()=>reject(Error('Stationary probe deadline exceeded')),sampleMs+15000);
      function frame(now) {
      start ??= now; const t=now-start; timestamps.push(t);
      if (t-lastCheck>=200) { const s=window.__tidekin.getState(),m=window.__tidekin.getMetrics();
        checkpoints.push({ t,gameTime:s.time,position:s.position,depth:null,air:null,status:null,site:null,
          visible:document.visibilityState==='visible',focused:document.hasFocus(),paused:m.paused,quality:m.quality,view:m.viewMode,
          rendered:m.activeRenderedFrames,geometries:m.geometries,textures:m.textures,drawCalls:m.drawCalls,triangles:m.triangles,viewport:m.viewport });lastCheck=t; }
      if(t>=sampleMs){clearTimeout(timer);resolve();}else requestAnimationFrame(frame);
    } requestAnimationFrame(frame); }); return { timestamps,checkpoints };
  }, policy);
  return { id, ...probe, cpu:cpuWindow(cpuStart,await cpuCheckpoint(cdp)), before, after:await page.evaluate(() => window.__tidekin.getMetrics()) };
}
