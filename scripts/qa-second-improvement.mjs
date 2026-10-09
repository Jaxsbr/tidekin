import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { chromium } from '@playwright/test';
import { createGame, act, serializeGame, getContext, getCleanupContext, CLEANUP_SITES } from '../src/game.js';

// All writes to runtime game state are prohibited. Browser hooks are read-only.
// Fixtures seed disposable storage before navigation; actual actions use mouse/keys.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir=process.env.TIDEKIN_BUILD_DIR?path.resolve(root,process.env.TIDEKIN_BUILD_DIR):path.join(root,'dist');
const base = (process.env.TIDEKIN_BASE_URL || 'http://127.0.0.1:5181').replace(/\/$/, '');
const modes = new Set(process.argv.slice(2));
const onlyCases=process.argv.filter(a=>a.startsWith('--case=')).map(a=>a.slice(7));
const names = ['title-overflow','polish-opening-heading-inspection','workshop-plan-rig-accordion','stored-wheel-camera-normalization','bag-seams-actual-input','earned-cleanup-lifecycle','failure-hud-immediate-reset','earned-partial-save','physical-helm-stations-focus','resize-reduced-motion','save-fixture-old-v2','save-fixture-completed','invalid-save-fixture','legacy-dive-timber-high','legacy-dive-pearls','origin-snorkel-route','buoy-click-cleanup-over-covered-salvage','blocked-tidal-explanation',...['floating','tidal','overlap'].flatMap(label=>[0,60,90,135,170].map(time=>`tide-${label}-${time}`)),'continuous-tide-fixture','asset-error-recovery','storage-error-recovery','hardware-benchmarks-transitions'];
if (modes.has('--list')) { console.log(names.join('\n')); process.exit(0); }
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = path.join(root, 'captures/second-improvement/qa', stamp);
const report = { generatedAt: new Date().toISOString(), base, status: 'running', isolation: 'New disposable browser contexts; no user profile/save access', results: [], events: [], fixtures: [], inputs: [], host: { os: os.platform(), release: os.release(), architecture: os.arch() }, humanPlaytest: false, execution:{headed:modes.has('--headed'),arguments:process.argv.slice(2),selectedCases:onlyCases} };
let browser;
let transferSequence=0;
const sha = b => createHash('sha256').update(b).digest('hex');
async function persist() { await writeFile(path.join(dir, 'results.json'), JSON.stringify(report, null, 2)); }
async function fingerprint() {
  const files = [];
  async function walk(relative = '') { for (const e of await readdir(path.join(buildDir, relative), { withFileTypes: true })) {
    const p = path.posix.join(relative, e.name); if (e.isDirectory()) await walk(p); else {
      const disk = await readFile(path.join(buildDir, p)); const response = await fetch(base + '/' + p, { signal: AbortSignal.timeout(10000) });
      const served = Buffer.from(await response.arrayBuffer()); assert.equal(response.status, 200, p + ' HTTP status');
      files.push({ path: p, bytes: disk.length, diskSha256: sha(disk), servedSha256: sha(served), matches: sha(disk) === sha(served) });
    }
  } }
  await walk(); files.sort((a,b)=>a.path.localeCompare(b.path));
  const html = await (await fetch(base + '/')).text(); assert.ok(!html.includes('/@vite/client'), 'Use production preview, not dev server');
  assert.ok(files.every(f=>f.matches), 'Served files do not match current dist');
  const sources = [];
  for (const p of ['index.html','src/main.js','src/style.css','src/game.js','src/cleanup.js','src/scene.js','src/cleanup-scene.js']) {
    try { sources.push({path:p,sha256:sha(await readFile(path.join(root,p)))}); } catch(e) { sources.push({path:p,error:e.code}); }
  }
  return { files, buildHash: sha(JSON.stringify(files)), sources, sourceHash: sha(JSON.stringify(sources)), caveat: 'Source fingerprint is recorded independently; matching source to build requires PM build provenance.' };
}
const state = p => p.evaluate(() => window.__tidekin?.getState());
const metrics = p => p.evaluate(() => window.__tidekin?.getMetrics());
async function waitState(p) { await p.waitForFunction(() => Boolean(window.__tidekin?.getState()?.position), null, {timeout:20000}); }
async function snap(p, name) {
  await p.screenshot({path:path.join(dir,name+'.png')});
  const value = {state:await state(p),metrics:await metrics(p),ui:await p.locator('body').innerText()};
  await writeFile(path.join(dir,name+'.json'),JSON.stringify(value,null,2)); return value;
}
function invariant(s) { return { inventory:s.inventory,upgrades:s.upgrades,quest:s.quest,expeditions:s.expeditions,collected:s.collected,discoveries:s.discoveries,stats:s.stats }; }
async function click(p, selector) { report.inputs.push({kind:'click',selector,at:new Date().toISOString()}); await p.locator(selector).click(); }
async function key(p,k,ms=0) {
  report.inputs.push({kind:'key',key:k,durationMs:ms,at:new Date().toISOString()});
  if(!ms) return p.keyboard.press(k);
  await p.keyboard.down(k); try {await p.waitForTimeout(ms);} finally {await p.keyboard.up(k);}
}
async function physical(p, station) {
  await p.waitForTimeout(250); const point=(await metrics(p))?.interactions?.[station];
  assert.ok(point?.visible && Number.isFinite(point.x) && Number.isFinite(point.y), station+' projection unavailable');
  report.inputs.push({kind:'physical-object-click',station,point,at:new Date().toISOString()}); await p.mouse.click(point.x,point.y);
}
async function fresh(p) { await click(p,'#new-voyage'); await waitState(p); await p.waitForFunction(()=>!document.querySelector('#modal-dialog').open); }
async function resume(p) { await click(p,'#continue-voyage'); await waitState(p); await p.waitForFunction(()=>!document.querySelector('#modal-dialog').open); }
async function pauseSave(p) { await click(p,'#pause-button'); await click(p,'[data-modal-action="save"]'); }
async function play(p) { await click(p,'[data-modal-action="play"]'); }
async function closePanel(p) { await click(p,'#close-panel'); }
async function enter(p,physicalEntry=true) { if(physicalEntry) await physical(p,'cleanup'); else await key(p,'Space'); await p.waitForFunction(()=>Boolean(window.__tidekin.getState().cleanup.attempt)); }
async function swim(p,x,y) {
  await p.locator('#game-canvas').focus();
  for (let i=0;i<220;i++) {
    const a=(await state(p)).cleanup.attempt; assert.ok(a && a.status!=='failed','Swim route exhausted air');
    const dx=x-a.x,dy=y-a.y;if(Math.hypot(dx,dy)<.22)return;
    // Axis segments make key direction unambiguous; feedback only reads state.
    const horizontal=Math.abs(dx)>.15; const delta=horizontal?dx:dy;
    const k=horizontal?(delta>0?'d':'a'):(delta>0?'w':'s');
    await key(p,k,Math.max(25,Math.min(160,Math.abs(delta)/2.2*1000)));
  }
  assert.fail('Actual-input swim did not converge');
}
async function collect(p,t) {
  await swim(p,t.x,0); await swim(p,t.x,t.y);
  const before=(await state(p)).cleanup.attempt.collected;
  const transfer=t.id===CLEANUP_SITES[0].trash[0].id?`transfer-${String(transferSequence++).padStart(2,'0')}`:null;
  if(transfer)await snap(p,transfer+'-before');
  await key(p,'e'); await p.waitForFunction(id=>window.__tidekin.getState().cleanup.attempt.collected.includes(id),t.id);
  if(transfer){await snap(p,transfer+'-start');await p.waitForTimeout(180);await snap(p,transfer+'-180ms');await p.waitForTimeout(500);await snap(p,transfer+'-settled');}
  assert.equal((await state(p)).cleanup.attempt.collected.length,before.length+1);
}
async function breathe(p) {
  const before=(await state(p)).cleanup.attempt; await swim(p,before.x,0);
  await p.waitForFunction(()=>window.__tidekin.getState().cleanup.attempt.air>=23.9);
  assert.deepEqual((await state(p)).cleanup.attempt.collected,before.collected,'Surface breath lost partial work');
}
async function leave(p) { const a=(await state(p)).cleanup.attempt; if(a) { await swim(p,a.x,0); await key(p,'Space'); await p.waitForFunction(()=>!window.__tidekin.getState().cleanup.attempt); } }
async function isolated(name, fn, options={}) {
  if(onlyCases.length&&!onlyCases.includes(name))return;
  const c=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'no-preference'});
  await c.tracing.start({screenshots:true,snapshots:true});
  if(options.save!==undefined) {
    report.fixtures.push({name,save:options.save,scope:'Seeded isolated localStorage before navigation; not earned progress'});
    await c.addInitScript(save=>localStorage.setItem('tidekin.save.v2',save),options.save);
  }
  if(options.settings){report.fixtures.push({name,settings:options.settings,scope:'Explicit isolated settings fixture; not user preferences'});await c.addInitScript(settings=>localStorage.setItem('tidekin.settings.v1',JSON.stringify(settings)),options.settings);}
  if(options.init) await c.addInitScript(options.init);
  const p=await c.newPage();p.setDefaultTimeout(12000);const errors=[];const assetTasks=[];
  p.on('response',r=>{if(r.url().startsWith(base)&&r.status()===200)assetTasks.push(r.body().then(b=>({url:r.url(),sha256:sha(b),bytes:b.length})).catch(e=>({url:r.url(),bodyReadError:e.message})));});
  p.on('pageerror',e=>errors.push({kind:'pageerror',message:e.message}));
  p.on('console',m=>{if(m.type()==='error')errors.push({kind:'console',message:m.text()});});
  p.on('requestfailed',r=>errors.push({kind:'requestfailed',url:r.url(),message:r.failure()?.errorText}));
  p.on('response',r=>{if(r.status()>=400)errors.push({kind:'http',url:r.url(),status:r.status()});});
  if(options.routes) await options.routes(p);
  let passed=false;
  try {
    await p.goto(base+'/?qa=1',{waitUntil:'networkidle'});
    const detail=await fn(p,c);
    const unexpected=errors.filter(e=>!options.expectedError?.(e));
    assert.deepEqual(unexpected,[],'Unexpected browser/network errors');
    console.log('PASS '+name);report.results.push({name,status:'pass',assets:await Promise.all(assetTasks),evidenceClass:options.evidenceClass||(options.save===undefined?'actual-input':'explicit-save-fixture'),detail,errors}); passed=true;
  } catch(e) {
    console.log((e.coverageBlocked?'BLOCKED ':'FAIL ')+name+': '+e.message);await snap(p,'failure-'+name).catch(()=>{}); report.results.push({name,status:e.coverageBlocked?'blocked':'fail',assets:await Promise.all(assetTasks),error:e.stack,errors});
  } finally {
    await c.tracing.stop(passed?{}:{path:path.join(dir,'failure-'+name+'.zip')});await c.close();await persist();
  }
}
function validFixture(kind) {
  const s=createGame();
  for(const [id,position] of [['home-driftwood',{x:4,z:1}],['home-crate',{x:-4,z:1}]]) {s.position=position;assert.ok(act(s,'gather',{nodeId:id}).ok);}
  s.position={x:0,z:0};assert.ok(act(s,'build',{recipeId:'waterwheel',id:'waterwheel'}).ok);
  if(kind==='completed') s.cleanup.completed=[CLEANUP_SITES[0].id];
  if(kind==='old-v2') {const old=JSON.parse(serializeGame(s));delete old.cleanup;delete old.heading;delete old.helm;return JSON.stringify(old);}
  return serializeGame(s);
}

async function polishSmoke() {
 await isolated('title-overflow',async p=>{
 const samples=[];for(const motion of ['no-preference','reduce']) { await p.emulateMedia({reducedMotion:motion});for(const viewport of [{width:1440,height:900},{width:900,height:900}]){
 await p.setViewportSize(viewport);await p.waitForTimeout(600);await p.mouse.move(viewport.width-1,viewport.height-1);await p.waitForTimeout(250);
 const layout=await p.evaluate(()=>{
 const menu=document.querySelector('#main-menu'),art=menu.querySelector('.menu-art');const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
 return {viewport:{width:innerWidth,height:innerHeight},document:{scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,clientWidth:document.documentElement.clientWidth,clientHeight:document.documentElement.clientHeight},body:{scrollWidth:document.body.scrollWidth,scrollHeight:document.body.scrollHeight,rect:box(document.body)},menu:{scrollWidth:menu.scrollWidth,scrollHeight:menu.scrollHeight,clientWidth:menu.clientWidth,clientHeight:menu.clientHeight,offsetWidth:menu.offsetWidth,offsetHeight:menu.offsetHeight,overflowX:getComputedStyle(menu).overflowX,overflowY:getComputedStyle(menu).overflowY,rect:box(menu)},art:{rect:box(art),transform:getComputedStyle(art).transform,animation:getComputedStyle(art).animationName}};
 });layout.motion=motion;samples.push(layout);await snap(p,`title-overflow-${viewport.width}x${viewport.height}-${motion}`);
 }}
 await writeFile(path.join(dir,'title-layouts.json'),JSON.stringify(samples,null,2));
 assert.ok(samples.every(s=>s.document.scrollWidth<=s.viewport.width&&s.document.scrollHeight<=s.viewport.height),'Title document overflows viewport');
 assert.ok(samples.every(s=>s.menu.scrollWidth<=s.menu.clientWidth+1&&s.menu.scrollHeight<=s.menu.clientHeight+1||s.menu.overflowX==='clip'&&s.menu.overflowY==='clip'),'Animated title art creates an unclipped scroll container');
 assert.ok(samples.every(s=>s.menu.offsetWidth-s.menu.clientWidth<=1&&s.menu.offsetHeight-s.menu.clientHeight<=1),'Title has scrollbar gutters');
 await p.setViewportSize({width:900,height:420});await p.waitForTimeout(300);const shortControls=[];for(const selector of ['#new-voyage','#menu-settings']){await p.locator(selector).scrollIntoViewIfNeeded();const box=await p.locator(selector).boundingBox();assert.ok(box&&box.y>=-1&&box.y+box.height<=421,'Short-height title control not reachable: '+selector);shortControls.push({selector,box});}await snap(p,'title-short-height-controls');await writeFile(path.join(dir,'title-short-controls.json'),JSON.stringify(shortControls,null,2));return {samples,shortControls};
 });
 await isolated('polish-opening-heading-inspection',async p=>{
 for(const viewport of [{width:1440,height:900},{width:900,height:900}]){await p.setViewportSize(viewport);await p.waitForTimeout(400);await snap(p,`polish-title-${viewport.width}x${viewport.height}`);}
 await p.setViewportSize({width:1440,height:900});await fresh(p);await p.waitForTimeout(250);
 const purpose=(await p.locator('#context-title').innerText())+' '+(await p.locator('#context-hint').innerText());assert.match(purpose,/Home Reef.*cleanup/i);assert.match(purpose,/orange buoy/i);assert.match(purpose,/Space.*snorkel/i);
 await snap(p,'polish-opening-1440x900');await p.setViewportSize({width:900,height:900});await p.waitForTimeout(250);await snap(p,'polish-opening-900x900');await p.setViewportSize({width:1440,height:900});
 await physical(p,'helm');await p.waitForFunction(()=>window.__tidekin.getState().helm);assert.equal((await metrics(p)).viewMode,'follow');
 const headings=[];for(const turn of [false,true]){if(turn)await key(p,'d',450);const s=await state(p);const expected=['S','SE','E','NE','N','NW','W','SW'][((Math.round(s.heading/(Math.PI/4))%8)+8)%8];await p.waitForFunction(word=>document.querySelector('#context-title').innerText.includes('Bow '+word+' ·'),expected);headings.push({heading:s.heading,expected,prompt:await p.locator('#context-title').innerText()});await snap(p,turn?'polish-bow-turned':'polish-bow-initial');}
 await key(p,'h');await click(p,'[data-panel="inspect"]');assert.equal(await p.locator('[data-camera="helm"]').count(),0,'Rejected Wheel option still exposed in production UI');assert.ok(await p.locator('[data-camera="follow"]').isVisible());assert.ok(await p.locator('[data-camera="inspect"]').isVisible());await snap(p,'polish-inspection-options');await click(p,'[data-camera="inspect"]');
 const before=await state(p);await p.locator('#game-canvas').focus();await key(p,'q');await key(p,'Equal');await snap(p,'polish-orbit-zoom');assert.deepEqual((await state(p)).position,before.position);assert.equal((await state(p)).heading,before.heading);
 return {purpose,headings,productionCameras:'follow and orbit inspection; Wheel deliberately rejected',orbitVisualReview:'Actual Q/+ input and snapshot establish an inspection interaction with unchanged vessel state; visual framing requires image review.'};
 });
 await isolated('stored-wheel-camera-normalization',async p=>{
 await fresh(p);await physical(p,'helm');await p.waitForFunction(()=>window.__tidekin.getState().helm);assert.equal((await metrics(p)).viewMode,'follow','Legacy saved Wheel preference escaped normalization');await snap(p,'normalized-legacy-wheel-preference');await key(p,'h');await click(p,'[data-panel="inspect"]');assert.equal(await p.locator('[data-camera="helm"]').count(),0);return {seededCamera:'helm',actualProductionCamera:'follow'};
 },{settings:{sailingCamera:'helm',quality:'high',sound:false,reducedMotion:false,largeText:false},evidenceClass:'explicit-settings-fixture'});
 await isolated('workshop-plan-rig-accordion',async p=>{
 await resume(p);assert.equal((await state(p)).upgrades.waterwheel,true);await physical(p,'workshop');await p.locator('#panel-dialog').waitFor({state:'visible'});
 assert.match(await p.locator('#panel-body > .recipe-card').first().innerText(),/Salvage crane/i,'First directly exposed plan is not the next crane upgrade');assert.ok(await p.locator('#craft-crane').isVisible(),'Next crane plan is not directly exposed');
 const summaryHitTargets=await p.locator('#workshop-other-plans > summary, #workshop-rigs > summary').evaluateAll(elements=>elements.map(e=>{const r=e.getBoundingClientRect();return {text:e.innerText,width:r.width,height:r.height};}));assert.ok(summaryHitTargets.every(b=>b.width>=44&&b.height>=44),'Workshop summary hit target below 44px');
 for(const id of ['workshop-other-plans','workshop-rigs'])assert.equal(await p.locator('#'+id).evaluate(e=>e.open),false,'Optional/completed plans are expanded by default');
 await snap(p,'workshop-next-crane-collapsed');await click(p,'#workshop-rigs > summary');await p.locator('[data-game-action="rig"][data-id="diver"]').waitFor({state:'visible'});
 await p.waitForTimeout(350);assert.equal(await p.locator('#workshop-rigs').evaluate(e=>e.open),true,'HUD refresh collapsed the rig accordion');await snap(p,'workshop-rig-accordion-open');
 await click(p,'[data-game-action="rig"][data-id="diver"]');await p.waitForFunction(()=>window.__tidekin.getState().rig==='diver');assert.equal(await p.locator('#workshop-rigs').evaluate(e=>e.open),true,'Fitting a rig collapsed the accordion');
 await click(p,'#workshop-other-plans > summary');assert.ok(await p.locator('#craft-greenhouse').isVisible());await snap(p,'workshop-later-plans-open');await closePanel(p);return {nextPlan:'crane',summaryHitTargets,accordionPreserved:true,actualRigFit:'diver'};
 },{save:validFixture('completed')});
 await isolated('bag-seams-actual-input',async p=>{
 await fresh(p);await enter(p);await snap(p,'bag-seams-empty-surface');await collect(p,CLEANUP_SITES[0].trash[0]);await breathe(p);
 await swim(p,0,-2);await p.waitForTimeout(300);await snap(p,'bag-seams-swim-right');await swim(p,-4,-2);await p.waitForTimeout(300);await snap(p,'bag-seams-swim-left');
 await p.setViewportSize({width:900,height:900});await p.waitForTimeout(250);await snap(p,'bag-seams-square');assert.equal((await state(p)).cleanup.attempt.collected.length,1);await breathe(p);await leave(p);
 return {actualInputs:true,count:1,visualReview:'Inspect bag seams, attachment and filled/empty silhouettes in screenshots; no mesh visual pass inferred from count.'};
 });
}
async function failureHudReset() {
 await isolated('failure-hud-immediate-reset',async p=>{
 await fresh(p);const unrelated=invariant(await state(p));await enter(p);await collect(p,CLEANUP_SITES[0].trash[0]);
 assert.equal((await state(p)).cleanup.attempt.collected.length,1);await snap(p,'failure-hud-partial-before-exhaustion');
 await swim(p,0,-5);const air=(await state(p)).cleanup.attempt.air;
 // Wait only for failure modal opening, never for the expected HUD values.
 // The first observation must agree with the reset domain state without grace.
 await p.waitForFunction(()=>window.__tidekin.getState().cleanup.attempt.status==='failed'&&document.querySelector('#modal-dialog').open&&document.querySelector('[data-modal-action="retry-cleanup"]'),null,{timeout:Math.ceil(air*1000)+8000});
 const observation=await p.evaluate(()=>{
 const s=window.__tidekin.getState();const read=id=>{const e=document.getElementById(id),style=getComputedStyle(e);return {text:e.innerText,visible:e.getClientRects().length>0&&style.visibility==='visible'&&style.display!=='none'};};
 return {state:s,observedAt:performance.now(),count:read('context-title'),air:read('oxygen-seconds'),airLabel:read('oxygen-label'),modal:document.querySelector('#modal-dialog').innerText};
 });
 await writeFile(path.join(dir,'failure-hud-immediate-observation.json'),JSON.stringify(observation,null,2));await snap(p,'failure-hud-immediate-empty-bag');
 assert.deepEqual(observation.state.cleanup.attempt.collected,[]);assert.equal(observation.state.cleanup.attempt.air,0);assert.deepEqual(observation.state.cleanup.completed,[]);
 assert.equal(observation.count.visible,true);assert.match(observation.count.text,/^0\s*\/\s*6\b/,'Failure HUD retained partial cleanup count');
 assert.equal(observation.air.visible,true);assert.match(observation.air.text,/^0\s*s$/,'Failure HUD retained stale remaining air');assert.equal(observation.airLabel.visible,true);assert.match(observation.airLabel.text,/^air$/i);
 assert.deepEqual(invariant(observation.state),unrelated,'Failure changed unrelated voyage progress');
 await click(p,'[data-modal-action="retry-cleanup"]');await p.waitForFunction(()=>window.__tidekin.getState().cleanup.attempt.status==='active');
 const retry=await state(p);assert.deepEqual(retry.cleanup.attempt.collected,[]);assert.equal(retry.cleanup.attempt.x,0);assert.equal(retry.cleanup.attempt.y,0);assert.ok(retry.cleanup.attempt.air>=23.9);assert.deepEqual(retry.cleanup.completed,[]);
 assert.match(await p.locator('#context-title').innerText(),/^0\s*\/\s*6\b/);assert.match(await p.locator('#oxygen-seconds').innerText(),/^24\s*s$/);assert.match(await p.locator('#oxygen-label').innerText(),/breathing/i);await snap(p,'failure-hud-retry-fresh');
 return {immediateObservation:observation,actualPartialExhaustion:true,retryFresh:true,bagVisualReview:'Immediate failure and retry screenshots retain empty-bag presentation; DOM/state alone does not prove bag mesh appearance.'};
 });
}
async function functional() {
await isolated('earned-cleanup-lifecycle',async p=>{
 await p.waitForTimeout(400);await snap(p,'title-1440x900');await p.setViewportSize({width:900,height:900});await p.waitForTimeout(300);await snap(p,'title-900x900');await p.setViewportSize({width:1440,height:900});
 await fresh(p);await p.waitForTimeout(300);const original=invariant(await state(p));const site=CLEANUP_SITES[0];
 await snap(p,'earned-opening-wide');await physical(p,'cleanup');await p.waitForFunction(()=>window.__tidekin.getState().cleanup.attempt?.status==='active');
 await snap(p,'earned-affected-entry');await collect(p,site.trash[0]);await snap(p,'earned-bag-one');await breathe(p);await snap(p,'earned-surface-breath');
 for(let retry=0;retry<2;retry++) {
   if(retry)await collect(p,site.trash[0]);
   await swim(p,0,-5);const air=(await state(p)).cleanup.attempt.air;
   await p.waitForFunction(()=>window.__tidekin.getState().cleanup.attempt.status==='failed',null,{timeout:Math.ceil(air*1000)+8000});
   const failed=await state(p);assert.deepEqual(failed.cleanup.attempt.collected,[]);assert.deepEqual(failed.cleanup.completed,[]);assert.equal(failed.recovery,0);
   await snap(p,'earned-failure-'+retry);await click(p,'[data-modal-action="retry-cleanup"]');
   await p.waitForFunction(()=>window.__tidekin.getState().cleanup.attempt.status==='active');
   const restarted=(await state(p)).cleanup.attempt;assert.deepEqual(restarted.collected,[]);assert.equal(restarted.x,0);assert.equal(restarted.y,0);assert.ok(restarted.air>=23.9);await snap(p,'earned-retry-'+retry);
 }
 for(const t of site.trash){await collect(p,t);if((await state(p)).cleanup.attempt.status==='active')await breathe(p);}
 const done=await state(p);assert.equal(done.cleanup.attempt.status,'complete');assert.deepEqual(done.cleanup.completed,[site.id]);assert.deepEqual(invariant(done),original);
 await key(p,'e');assert.equal((await state(p)).cleanup.completed.length,1);await p.waitForTimeout(900);await snap(p,'earned-restored-underwater');await p.setViewportSize({width:900,height:900});await p.waitForTimeout(300);await snap(p,'earned-restored-underwater-square');await p.setViewportSize({width:1440,height:900});
 await leave(p);await click(p,'[data-panel="chart"]');assert.match(await p.locator('#panel-body').innerText(),/Home Reef.*Restored/i);await snap(p,'earned-restored-map');await closePanel(p);
 await pauseSave(p);const saved=JSON.parse(await p.evaluate(()=>localStorage.getItem('tidekin.save.v2')));assert.deepEqual(saved.cleanup,{completed:[site.id]});assert.ok(!('helm'in saved));await play(p);
 await p.reload({waitUntil:'networkidle'});await resume(p);assert.deepEqual((await state(p)).cleanup,{completed:[site.id],attempt:null});assert.deepEqual(invariant(await state(p)),original);
 await enter(p);assert.equal((await state(p)).cleanup.attempt.status,'complete');await snap(p,'earned-restored-reload');await leave(p);
 return {earnedSuccess:true,repeatedFailures:2,reloadPreservedRestoration:true,visualReview:'Screenshots require independent inspection of swimmer, bag/string/transfer and affected/clean water; assertions establish state only.'};
});
await isolated('earned-partial-save',async p=>{
 await fresh(p);const original=invariant(await state(p));await enter(p);await collect(p,CLEANUP_SITES[0].trash[0]);
 const before=(await state(p)).cleanup.attempt;await pauseSave(p);const policy=await p.locator('#modal-dialog .modal-description').innerText();assert.match(policy,/unfinished cleanup/i);assert.match(policy,/reload/i);assert.match(policy,/raft/i);assert.match(policy,/starts?[^.]*over|reset/i);
 assert.deepEqual((await state(p)).cleanup.attempt.collected,before.collected);const pausedAir=(await state(p)).cleanup.attempt.air;await p.waitForTimeout(700);assert.equal((await state(p)).cleanup.attempt.air,pausedAir);
 await snap(p,'earned-partial-save-warning');await p.reload({waitUntil:'networkidle'});await resume(p);
 const loaded=await state(p);assert.deepEqual(loaded.cleanup,{completed:[],attempt:null});assert.equal(loaded.helm,false);assert.deepEqual(invariant(loaded),original);
 await enter(p);assert.deepEqual((await state(p)).cleanup.attempt.collected,[]);await collect(p,CLEANUP_SITES[0].trash[0]);await breathe(p);await leave(p);await enter(p);assert.deepEqual((await state(p)).cleanup.attempt.collected,[]);
 return {partialReloadAndVoluntaryExitReset:true};
});
await isolated('physical-helm-stations-focus',async(p,c)=>{
 await fresh(p);await p.locator('#game-canvas').focus();const off=await state(p);await key(p,'w',350);assert.deepEqual((await state(p)).position,off.position);
 await physical(p,'helm');await p.waitForFunction(()=>window.__tidekin.getState().helm===true);const from=await state(p);await key(p,'w',500);const forward=await state(p);
 const dx=forward.position.x-from.position.x,dz=forward.position.z-from.position.z;assert.ok(dx*Math.sin(from.heading)+dz*Math.cos(from.heading)>.5,'W did not move along bow');
 await key(p,'s',500);const back=await state(p);assert.ok(Math.hypot(back.position.x-from.position.x,back.position.z-from.position.z)<.4);
 await key(p,'d',400);const turn=await state(p);assert.notEqual(turn.heading,back.heading);assert.ok(Math.hypot(turn.position.x-back.position.x,turn.position.z-back.position.z)<.05,'Turn-only input translated vessel');
 await key(p,'w',350);const angled=await state(p);assert.ok((angled.position.x-turn.position.x)*Math.sin(turn.heading)+(angled.position.z-turn.position.z)*Math.cos(turn.heading)>.3);
 await key(p,'h');assert.equal((await state(p)).helm,false);const stopped=await state(p);await key(p,'w',300);assert.deepEqual((await state(p)).position,stopped.position);
 for(const station of ['cabin','workshop']) {await physical(p,station);await p.locator('#panel-dialog').waitFor({state:'visible'});const before=await state(p);await key(p,'w',300);await key(p,'d',300);assert.deepEqual((await state(p)).position,before.position);assert.equal((await state(p)).heading,before.heading);assert.equal((await state(p)).helm,false);assert.match(await p.locator('#panel-title').innerText(),station==='cabin'?/cabin/i:/workshop/i);await snap(p,'station-'+station);await closePanel(p);}
 await physical(p,'helm');await p.waitForFunction(()=>window.__tidekin.getState().helm);await p.keyboard.down('w');await p.waitForTimeout(200);await click(p,'#pause-button');await p.keyboard.up('w');const paused=await state(p);await play(p);await p.waitForTimeout(500);assert.deepEqual((await state(p)).position,paused.position,'Held input leaked through pause');
 await click(p,'#pause-button');await click(p,'[data-modal-action="settings"]');const inSettings=await state(p);await p.locator('#quality-setting').focus();await key(p,'w');assert.deepEqual((await state(p)).position,inSettings.position);await click(p,'[data-modal-action="settings-done"]');await play(p);
 await key(p,'h');await enter(p);await swim(p,0,-2);const beforeBlur=await state(p);
 // Playwright Chromium enables focus emulation by default, including headed.
 // Disable it to observe real Chrome tab/window visibility; never dispatch blur.
 const focusSession=await c.newCDPSession(p);await focusSession.send('Emulation.setFocusEmulationEnabled',{enabled:false});
 const other=await c.newPage();const otherSession=await c.newCDPSession(other);await otherSession.send('Emulation.setFocusEmulationEnabled',{enabled:false});await other.goto('about:blank');await other.bringToFront();const atBlur=await state(p);await p.waitForTimeout(1200);
 const focus=await p.evaluate(()=>({hidden:document.hidden,focus:document.hasFocus()}));const blurred=await state(p);await p.bringToFront();await other.close();
 if(!focus.hidden&&focus.focus){const e=new Error('Browser did not establish real focus loss after disabling Playwright focus emulation; coverage blocked, not a gameplay defect');e.coverageBlocked=true;throw e;}assert.equal(blurred.cleanup.attempt.air,atBlur.cleanup.attempt.air,'Air depleted on real focus loss');await snap(p,'focus-return');
 return {physicalStationClicks:true,focus};
});
await isolated('resize-reduced-motion',async p=>{
 await click(p,'#menu-settings');await p.locator('#motion-setting').check();await p.locator('#large-text-setting').check();await click(p,'[data-modal-action="settings-done"]');await fresh(p);
 const layouts=[];for(const v of [{width:1440,height:900},{width:900,height:900},{width:900,height:700}]) {
 await p.setViewportSize(v);await p.waitForTimeout(300);const layout=await p.evaluate(()=>({viewport:[innerWidth,innerHeight],scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],large:document.documentElement.classList.contains('large-text'),controls:['#pause-button','#helm-button','#dive-button','.game-nav'].map(s=>{const e=document.querySelector(s),b=e.getBoundingClientRect();return {selector:s,visible:e.getClientRects().length>0,x:b.x,y:b.y,right:b.right,bottom:b.bottom};})}));
 assert.ok(layout.scroll[0]<=v.width&&layout.scroll[1]<=v.height,'Viewport overflow');assert.ok(layout.large);assert.ok(layout.controls.every(b=>b.visible&&b.x>=-1&&b.y>=-1&&b.right<=v.width+1&&b.bottom<=v.height+1),'Clipped critical controls');await snap(p,`responsive-${v.width}x${v.height}`);layouts.push(layout);
 }
 await p.setViewportSize({width:900,height:900});await enter(p,false);await snap(p,'cleanup-square-affected');await collect(p,CLEANUP_SITES[0].trash[0]);await breathe(p);await snap(p,'reduced-motion-cleanup');await p.setViewportSize({width:1440,height:900});await p.waitForTimeout(300);await snap(p,'reduced-motion-cleanup-wide');
 await p.reload({waitUntil:'networkidle'});await click(p,'#menu-settings');assert.ok(await p.locator('#motion-setting').isChecked());assert.ok(await p.locator('#large-text-setting').isChecked());return {layouts};
});
for(const kind of ['old-v2','completed'])await isolated('save-fixture-'+kind,async p=>{
 await resume(p);const s=await state(p);assert.equal(s.helm,false);assert.equal(s.cleanup.attempt,null);assert.equal(s.upgrades.waterwheel,true);assert.ok(s.collected.includes('home-driftwood')&&s.collected.includes('home-crate'));assert.deepEqual(s.cleanup.completed,kind==='completed'?[CLEANUP_SITES[0].id]:[]);await snap(p,'save-fixture-'+kind);
 await click(p,'[data-panel="chart"]');assert.match(await p.locator('#panel-body').innerText(),kind==='completed'?/Home Reef.*Restored/i:/Cleanup available/i);return {fixture:kind,loaded:s};
},{save:validFixture(kind)});
await isolated('invalid-save-fixture',async p=>{assert.ok(await p.locator('#new-voyage').isVisible());await snap(p,'invalid-save-fallback');await click(p,'#new-voyage');await click(p,'[data-modal-action="confirm-new"]');await waitState(p);await p.waitForFunction(()=>!document.querySelector('#modal-dialog').open);assert.deepEqual((await state(p)).cleanup.completed,[]);return {safeFreshVoyage:true};},{save:'{"version":2,"cleanup":{"completed":["unknown"]}}'});
}

async function diveRouting() {
 for(const [name,nodeId,position,time] of [
 ['legacy-dive-timber-high','home-timber',{x:6,z:6},90],
 ['legacy-dive-pearls','home-pearls',{x:6,z:-9},0],
 ]) {
 const s=createGame();s.position=position;s.time=time;
 await isolated(name,async p=>{
 await resume(p);const before=await state(p);const context=getContext(before);
 assert.equal(context.nearest.id,nodeId,'Fixture does not select intended salvage');assert.equal(context.nearest.available,false);
 const label=await p.locator('#dive-label').innerText();const hint=await p.locator('#context-hint').innerText();
 await snap(p,name+'-before');assert.ok(await p.locator('#dive-button').isVisible());assert.ok(await p.locator('#dive-button').isEnabled());
 assert.match(label,/salvage|dive|pearls/i,'Covered/submerged salvage action has no diving label');assert.doesNotMatch(label,/snorkel|reef/i,'Salvage target misleadingly offers cleanup');
 await p.locator('#game-canvas').focus();await key(p,'Space');await p.waitForFunction(()=>window.__tidekin.getState().diving===true);
 const diving=await state(p);assert.equal(diving.cleanup.attempt,null,'Space diverted salvage to cleanup');assert.deepEqual(diving.position,before.position);
 assert.match(await p.locator('#dive-label').innerText(),/surface/i);await snap(p,name+'-diving');
 await key(p,'Space');await p.waitForFunction(()=>window.__tidekin.getState().diving===false);assert.equal((await state(p)).cleanup.attempt,null);await snap(p,name+'-surfaced');
 return {selectedNode:nodeId,visibleLabel:label,hint,actualSpaceEnteredLegacyDive:true,actualSpaceSurfaced:true};
 },{save:serializeGame(s)});
 }
 await isolated('origin-snorkel-route',async p=>{
 await fresh(p);assert.deepEqual((await state(p)).position,{x:0,z:0});const label=await p.locator('#dive-label').innerText();assert.match(label,/snorkel/i);
 await snap(p,'origin-snorkel-before');await p.locator('#game-canvas').focus();await key(p,'Space');await p.waitForFunction(()=>window.__tidekin.getState().cleanup.attempt?.status==='active');
 assert.equal((await state(p)).diving,false);await snap(p,'origin-snorkel-cleanup');await leave(p);return {visibleLabel:label,actualSpaceEnteredCleanup:true};
 });
 const covered=createGame();covered.time=90;covered.position={x:6,z:6};
 await isolated('buoy-click-cleanup-over-covered-salvage',async p=>{
 await resume(p);const context=getContext(await state(p));assert.equal(context.nearest.id,'home-timber');assert.equal(context.nearest.available,false);
 await snap(p,'buoy-over-covered-salvage-before');await physical(p,'cleanup');await p.waitForFunction(()=>window.__tidekin.getState().cleanup.attempt?.status==='active');
 assert.equal((await state(p)).diving,false);await snap(p,'buoy-over-covered-salvage-cleanup');await leave(p);return {actualBuoyClickEnteredCleanup:true,nearbySalvage:'home-timber'};
 },{save:serializeGame(covered)});
}
async function tides() {
const blocked=createGame();blocked.time=90;blocked.position={x:6,z:6};blocked.collected=['home-driftwood'];blocked.stats.gathered.wood=4;blocked.inventory.wood+=4;
await isolated('blocked-tidal-explanation',async p=>{
 await resume(p);const observations=[];
 for(const mode of ['off-helm','at-helm']) {
 if(mode==='at-helm'){await physical(p,'helm');await p.waitForFunction(()=>window.__tidekin.getState().helm);}
 const observation={mode,title:await p.locator('#context-title').innerText(),hint:await p.locator('#context-hint').innerText(),disabled:await p.locator('#gather-button').isDisabled(),tooltip:await p.locator('#gather-button').getAttribute('title')};
 observations.push(observation);await snap(p,'blocked-tidal-'+mode);
 }
 await writeFile(path.join(dir,'blocked-tidal-explanation.json'),JSON.stringify(observations,null,2));
 assert.ok(observations.every(o=>/low tide|covered|dive.*reach|submerged/i.test(o.title+' '+o.hint)),'Covered tidal target has no visible contextual reason off helm/at helm; tooltip or post-E toast alone does not satisfy clarity');return {observations};
},{save:serializeGame(blocked)});
for(const label of ['floating','tidal','overlap'])for(const time of [0,60,90,135,170]) {
 const s=createGame();s.time=time;s.position=label==='floating'?{x:4,z:1}:label==='tidal'?{x:6,z:6}:{x:5,z:3.6};
 if(label==='tidal'){s.collected=['home-driftwood'];s.stats.gathered.wood=4;s.inventory.wood+=4;}
 await isolated(`tide-${label}-${time}`,async p=>{
 await resume(p);const before=await state(p);const target=getContext(before);const ui=await p.locator('#context-title').innerText();const hint=await p.locator('#context-hint').innerText();await key(p,'e');await p.waitForTimeout(200);const after=await state(p);const added=after.collected.filter(id=>!before.collected.includes(id));
 const expected=label==='floating'?['home-driftwood']:label==='tidal'?([0,170].includes(time)?['home-timber']:[]):([0,170].includes(time)?['home-timber']:['home-driftwood']);assert.deepEqual(added,expected);await snap(p,`tide-${label}-${time}`);
 return {seededTime:time,actualTime:before.time,nearest:target.nearest,selected:target.gatherTarget,ui,hint,added};
 },{save:serializeGame(s)});
}
const s=createGame();s.time=55;s.position={x:6,z:6};s.collected=['home-driftwood'];s.stats.gathered.wood=4;s.inventory.wood+=4;
await isolated('continuous-tide-fixture',async p=>{
 await resume(p);const samples=[];for(const t of [56,90,135,145,150]) {await p.waitForFunction(t=>window.__tidekin.getState().time>=t,t,{timeout:60000});const before=await state(p);const context=getContext(before);const disabled=await p.locator('#gather-button').isDisabled();await key(p,'e');await p.waitForTimeout(120);const after=await state(p);const added=after.collected.filter(id=>!before.collected.includes(id));assert.deepEqual(added,t===145?['home-timber']:[]);await snap(p,'continuous-tide-'+t);samples.push({time:before.time,tide:context.tide,disabled,added,ui:await p.locator('#context-title').innerText()});}return {samples,exactHumanReproduction:false};
},{save:serializeGame(s)});
}

async function recovery() {
let blocked=false;
await isolated('asset-error-recovery',async p=>{
 await click(p,'#new-voyage');await p.waitForFunction(()=>/couldn.t open|unavailable|assets/i.test(document.querySelector('#modal-dialog')?.innerText||''));assert.match(await p.locator('#modal-dialog').innerText(),/couldn.t open|unavailable|assets/i);await snap(p,'asset-error');
 blocked=false;await p.unroute('**/*.glb');await click(p,'[data-modal-action="menu"]');await fresh(p);await snap(p,'asset-recovered');return {injectedAssetFailure:true,recovered:true};
},{routes:async p=>{await p.route('**/*.glb',route=>{blocked=true;return route.abort('failed');});},expectedError:e=>e.kind==='requestfailed'&&e.url?.endsWith('.glb')||e.kind==='console'&&/load|fetch|ERR_FAILED|model/i.test(e.message)});
await isolated('storage-error-recovery',async p=>{
 await fresh(p);await p.locator('#save-banner').waitFor({state:'visible'});assert.match(await p.locator('#save-banner-text').innerText(),/not saved/i);await click(p,'#pause-button');await click(p,'[data-modal-action="menu"]');assert.match(await p.locator('#modal-dialog').innerText(),/save didn.t reach shore/i);assert.ok(await p.locator('#game-view').isVisible());await snap(p,'storage-error');
 // Restore only the injected storage fault, never game state.
 await p.evaluate(()=>{window.__qaStorageFault=false;});await click(p,'[data-modal-action="play"]');await pauseSave(p);assert.ok(await p.evaluate(()=>localStorage.getItem('tidekin.save.v2')));assert.match(await p.locator('#save-banner-text').innerText(),/voyage saved/i);return {explicitStorageFault:true,recovered:true};
},{init:()=>{window.__qaStorageFault=true;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.__qaStorageFault)throw new DOMException('QA blocked storage','QuotaExceededError');return original.call(this,k,v);};}});
}
async function frameSample(p,label) {
 await p.waitForTimeout(5000);const before=await metrics(p);assert.equal(before.paused,false);assert.equal(before.quality,'high');
 const graphics=await p.locator('#game-canvas').evaluate(canvas=>{const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const ext=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER),vendor:gl.getParameter(ext?ext.UNMASKED_VENDOR_WEBGL:gl.VENDOR),drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight]};});
 const sample=await p.evaluate(()=>new Promise(resolve=>{const intervals=[];let previous;const start=performance.now();function frame(now){if(previous!==undefined)intervals.push(now-previous);previous=now;if(now-start>=20000)resolve({elapsedMs:now-start,intervals});else requestAnimationFrame(frame);}requestAnimationFrame(frame);}));
 const sorted=[...sample.intervals].sort((a,b)=>a-b);const percentile=n=>sorted[Math.ceil(sorted.length*n)-1];const software=/swiftshader|llvmpipe|software/i.test(JSON.stringify(graphics));
 const value={label,graphics,browser:report.browser,warmupMs:5000,...sample,medianMs:percentile(.5),p95Ms:percentile(.95),framesOver50ms:sorted.filter(x=>x>50).length,software,hardwareBudgetEvaluated:!software,metrics:before,after:await metrics(p),viewport:{width:1440,height:900,dpr:1},caveat:'Stationary active-play rAF intervals; CPU submit diagnostics are not GPU timing.'};
 await writeFile(path.join(dir,'benchmark-'+label+'.json'),JSON.stringify(value,null,2));assert.ok(sorted.length>500,'Insufficient benchmark samples');
 if(!software){assert.ok(value.medianMs<=20&&value.p95Ms<=33.4,'Hardware frame budget exceeded');}return value;
}
async function performance() {
await isolated('hardware-benchmarks-transitions',async p=>{
 await fresh(p);await physical(p,'helm');await p.waitForFunction(()=>window.__tidekin.getState().helm);const sailing=await frameSample(p,'sailing');
 const circuit=[];for(const k of ['w','d','w','a','s']){const from=await state(p);await key(p,k,400);circuit.push({key:k,from,to:await state(p)});}await key(p,'h');
 await enter(p,false);const cleanup=await frameSample(p,'cleanup-surface');await leave(p);const counts=[];
 for(let i=0;i<10;i++){await enter(p,false);await swim(p,0,-2);await swim(p,0,0);await leave(p);for(const panel of ['cabin','workshop','chart']){await click(p,`[data-panel="${panel}"]`);await closePanel(p);}await p.waitForTimeout(150);counts.push(await metrics(p));}
 const stable=counts.slice(2);assert.ok(Math.max(...stable.map(m=>m.geometries))-Math.min(...stable.map(m=>m.geometries))<=2,'Geometry count grew over warmed transitions');assert.ok(Math.max(...stable.map(m=>m.textures))-Math.min(...stable.map(m=>m.textures))<=1,'Texture count grew over warmed transitions');await snap(p,'sustained-transitions-final');
 const glErrors=await p.locator('#game-canvas').evaluate(canvas=>{const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const errors=[];for(let i=0;i<32;i++){const e=gl.getError();if(e===gl.NO_ERROR)break;errors.push(e);}return errors;});assert.deepEqual(glErrors,[]);
 if(sailing.software||cleanup.software)throw new Error('Software compatibility measured; hardware budget remains unvalidated');return {sailing,cleanup,circuit,transitions:counts,glErrors};
});
}

await mkdir(dir,{recursive:true});
try {
 report.before=await fingerprint();if(process.env.TIDEKIN_EXPECTED_BUILD_HASH)assert.equal(report.before.buildHash,process.env.TIDEKIN_EXPECTED_BUILD_HASH,'Unexpected candidate fingerprint');await persist();
 const args=['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'];
 try {browser=await chromium.launch({headless:!modes.has('--headed'),channel:'chrome',args});report.launch=(modes.has('--headed')?'Headed':'Headless')+' installed Chrome, hardware permitted';}
 catch(e){report.chromeLaunchFailure=e.message;browser=await chromium.launch({headless:!modes.has('--headed'),args});report.launch='Cached Chromium fallback; renderer classification required';}
 report.browser=browser.version();
 // Every case is awaited; contexts close before the next. Benchmarks run last,
 // sequentially, without another harness browser competing for GPU/foreground.
 if(!modes.has('--performance-only')) {await polishSmoke();await functional();await failureHudReset();await diveRouting();await tides();await recovery();}
 if(!modes.has('--functional-only'))await performance();
 report.after=await fingerprint();assert.equal(report.after.buildHash,report.before.buildHash,'Build changed during QA');report.sourceChanged=report.after.sourceHash!==report.before.sourceHash; if(report.sourceChanged)report.provenanceNote='Source edited during QA; checks apply only to unchanged served build fingerprint, not the current source tree.';
 report.deferred=modes.has('--functional-only')?['hardware-benchmarks-transitions']:modes.has('--performance-only')?names.filter(n=>n!=='hardware-benchmarks-transitions'):[];report.status=report.results.some(r=>r.status==='fail')?'fail':report.deferred.length||report.results.some(r=>r.status==='blocked')||onlyCases.length?'partial':'pass';
} catch(e){report.status='fatal';report.fatal=e.stack;} finally {await browser?.close();await persist();}
console.log(JSON.stringify({status:report.status,report:path.join(dir,'results.json'),results:report.results.map(r=>({name:r.name,status:r.status})),fatal:report.fatal},null,2));
if(['fail','fatal'].includes(report.status))process.exitCode=1;
