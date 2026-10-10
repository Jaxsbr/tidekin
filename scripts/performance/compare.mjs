import {validateMemoryRound, memoryWindowIds, MEMORY_KEYS} from './memory.mjs';
import {validateOwnedRss} from './rss.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { POLICY, policyForProfile } from './policy.mjs';
import { digest } from './evidence.mjs';

export const quantile = (values, p) => {
  if (!values.length || values.some(v => !Number.isFinite(v))) throw Error('Empty or nonfinite sample');
  const sorted = [...values].sort((a,b) => a-b);
  return sorted[Math.min(sorted.length-1, Math.max(0, Math.ceil(sorted.length*p)-1))];
};
const median = values => quantile(values, .5);
const finite = (value, label, positive = false) => {
  if (!Number.isFinite(value) || value < 0 || (positive && value === 0)) throw Error(`Invalid ${label}: ${value}`);
};
const assert = (value, message) => { if (!value) throw Error(message); };

export function summarizeScenario(sample, policy = POLICY, { requireCpu = true } = {}) {
  assert(sample && policy.scenarios.includes(sample.id), 'Unknown/missing scenario');
  const ts = sample.timestamps, checkpoints = sample.checkpoints;
  assert(Array.isArray(ts) && ts.length >= 100, `${sample.id}: insufficient frames`);
  ts.forEach(t => finite(t, 'frame timestamp'));
  const intervals = ts.slice(1).map((t,i) => t-ts[i]);
  intervals.forEach(t => { finite(t, 'frame interval', true); assert(t < 2000, 'Frame recording stalled'); });
  assert(ts.at(-1)-ts[0] >= policy.sampleMs-200, `${sample.id}: shortened frame recording`);
  assert(Array.isArray(checkpoints) && checkpoints.length >= 20, 'Missing state checkpoints');
  for (const [i,c] of checkpoints.entries()) {
    for (const key of ['t','gameTime','rendered','geometries','textures','drawCalls','triangles']) finite(c[key], `checkpoint.${key}`);
    assert(c.drawCalls > 0 && c.triangles > 0, 'Scene never submitted render work');
    assert(c.visible === true && c.focused === true && c.paused === false && c.quality === policy.quality && c.view === 'follow', 'Hidden, unfocused, paused, wrong quality/view');
    assert(c.viewport?.width === policy.viewport.width && c.viewport.height === policy.viewport.height && c.viewport.devicePixelRatio === policy.dpr, 'Viewport/DPR changed');
    assert(Number.isFinite(c.position?.x) && Number.isFinite(c.position?.z), 'Invalid position');
    if (i) assert(c.t > checkpoints[i-1].t && c.t-checkpoints[i-1].t < 2500 && c.gameTime >= checkpoints[i-1].gameTime && c.rendered > checkpoints[i-1].rendered, 'Checkpoint timestamps or rendered progress invalid');
  }
  const first = checkpoints[0], last = checkpoints.at(-1), elapsed = last.t-first.t;
  assert(elapsed >= policy.sampleMs-500, 'Incomplete checkpoint coverage');
  assert(last.gameTime-first.gameTime >= elapsed/1000*.70, 'Insufficient positive game-clock advancement');
  assert(last.rendered-first.rendered >= ts.length*.70, 'Too few actual rendered frames');
  let rendererThreadCpuMsPerSecond = null;
  if(requireCpu || sample.cpu) {
    assert(sample.cpu?.status==='measured' && sample.cpu.method?.startsWith('CDP Performance ThreadTime'),'Window-local renderer CPU missing');
    const cpu=sample.cpu;
    for(const point of [cpu.start,cpu.end])for(const key of ['Timestamp','ThreadTime'])finite(point?.[key],`CPU ${key}`);
    const cpuElapsed=(cpu.end.Timestamp-cpu.start.Timestamp)*1000,cpuDelta=cpu.end.ThreadTime-cpu.start.ThreadTime;
    assert(cpuElapsed>=policy.sampleMs-500 && cpuElapsed<=policy.sampleMs+1500 && cpuDelta>=0,'Invalid CPU window');
    rendererThreadCpuMsPerSecond=cpuDelta*1000/(cpuElapsed/1000);
  }
  if (sample.id.startsWith('moving-dive-')) {
    const site = sample.id.slice('moving-dive-'.length);
    assert(checkpoints.every(c => c.site === site && c.status === 'active' && Number.isFinite(c.air) && c.air > 0 && Number.isFinite(c.depth) && c.depth >= 0), 'Dive site/status/air invalid');
    const turns=(sample.coverageEvents??[]).filter(e=>e.event==='deep-turn'&&e.t>=ts[0]&&e.t<=ts.at(-1));
    for(const e of turns)assert(Number.isFinite(e.depth)&&e.depth>=12&&e.air>0&&e.status==='active'&&e.site===site&&e.visible===true&&e.focused===true&&e.paused===false&&e.quality===policy.quality&&Number.isFinite(e.gameTime)&&e.rendered>first.rendered,'Invalid physical turnaround event');
    assert(Math.max(...checkpoints.map(c => c.depth),...turns.map(e=>e.depth)) >= 12, 'Deep habitat never visited');
    let surfaceMs = 0, movingMs = 0, surfaceReturns = 0;
    for (let i=1;i<checkpoints.length;i++) {
      const a=checkpoints[i-1],b=checkpoints[i],dt=b.t-a.t;
      if (b.depth <= .35) surfaceMs += dt;
      if (Math.abs(b.depth-a.depth) > .001) movingMs += dt;
      if (a.depth > .35 && b.depth <= .35) surfaceReturns++;
    }
    assert(surfaceMs >= 500 && movingMs >= policy.sampleMs*.60 && surfaceReturns >= 1, 'Missing natural moving dive / surface breathing coverage');
  } else {
    assert(checkpoints.every(c => c.site === null && c.depth === null), 'Surface scenario contains dive');
    let distance = 0;
    for (let i=1;i<checkpoints.length;i++) distance += Math.hypot(checkpoints[i].position.x-checkpoints[i-1].position.x, checkpoints[i].position.z-checkpoints[i-1].position.z);
    if (sample.id === 'sailing-circuit') assert(distance > 8, 'Sailing scenario never moved');
    else assert(distance < .5, 'Stationary scenario moved');
  }
  return { frameMedianMs:median(intervals), frameP95Ms:quantile(intervals,.95),
    rendererThreadCpuMsPerSecond,
    frameOver50Ratio:intervals.filter(t => t>50).length/intervals.length,
    geometries:Math.max(...checkpoints.map(c => c.geometries)), textures:Math.max(...checkpoints.map(c => c.textures)),
    drawCalls:Math.max(...checkpoints.map(c => c.drawCalls)), triangles:Math.max(...checkpoints.map(c => c.triangles)) };
}

function loadingSummary(load, { allowLegacy = false, policy = POLICY } = {}) {
  assert(load && Array.isArray(load.resources) && load.resources.length > 0, 'Loading resource entries missing');
  for (const key of ['menuReadyMs','playReadyMs','firstInteractiveMs','clickMs','activeRenderedFrames']) finite(load[key], `loading.${key}`, true);
  assert(load.firstInteractiveMs > load.clickMs && Math.abs(load.playReadyMs-(load.firstInteractiveMs-load.clickMs)) < .001, 'First interactive precedes input or inconsistent');
  const totals = {};
  for (const key of ['encodedBodySize','decodedBodySize','transferSize']) {
    finite(load.navigation?.[key], `navigation.${key}`);
    for (const resource of load.resources) { assert(typeof resource.path === 'string', 'Resource path missing'); finite(resource[key], `resource.${key}`); }
    totals[key] = load.navigation[key]+load.resources.reduce((n,r) => n+r[key],0);
    assert(totals[key] === load.network?.[key], 'Network total does not match raw resource entries');
  }
  assert(totals.decodedBodySize > 0, 'No bytes decoded');
  assert(['measured','unavailable'].includes(load.phases?.status), 'Missing phase capability declaration');
  if (load.phases.status === 'measured') {
    assert(Array.isArray(load.phases.rows) && load.phases.rows.length > 0 && load.phases.rows.length <= 64, 'Invalid bounded loading phases');
    for (const p of load.phases.rows) { assert(typeof p.name === 'string' && p.status === 'complete', 'Failed/missing loading phase'); finite(p.durationMs, 'loading phase'); }
    for(const name of policy.loadingPhases)assert(load.phases.rows.filter(p=>p.name===name).length===1,`Loading phase coverage missing/duplicate: ${name}`);
  } else {
    assert(allowLegacy,'Loading phases unavailable outside explicitly legacy baseline');
    assert(typeof load.phases.reason === 'string' && load.phases.reason.length > 0, 'Missing phase unavailable reason');
  }
  return { menuReadyMs:load.menuReadyMs, playReadyMs:load.playReadyMs, ...totals };
}

function validateCpu(cpu, policy) {
  assert(cpu?.measured === true && cpu.remaining === 0 && cpu.doubleDisposed === 0 && cpu.idempotent === true && cpu.observed > 0, 'CPU owned resources leaked/double-disposed/non-idempotent/missing');
  assert(cpu.rows?.length === policy.transitionCycles, 'CPU transition cycles missing');
  for (const [i,r] of cpu.rows.entries()) {
    assert(r.cycle === i+1 && r.site === policy.habitats[i%policy.habitats.length], 'CPU site/cycle coverage missing');
    for (const phase of ['inside','outside']) {
      const c = r[phase];
      for (const key of ['attached','live','detached','disposed','geometries','materials','textures','geometryBackingBytes','textureRgbaBytesEstimate','unknownTextureImages']) finite(c?.[key], `CPU ${key}`);
      assert(c.geometries+c.materials+c.textures===c.live,'CPU resource type counts do not match live total');
      assert(c.detached === 0 && c.attached === c.live && c.live > 0, 'Detached undisposed CPU resource');
    }
  }
  // Fixed warmup: first two complete rounds are retained, not moved to fit growth.
  for (const site of policy.habitats) for (const phase of ['inside','outside']) for (const key of ['live','geometries','materials','textures','geometryBackingBytes','textureRgbaBytesEstimate','unknownTextureImages']) {
    const values = cpu.rows.filter(r => r.site===site && r.cycle>policy.habitats.length*2).map(r=>r[phase][key]);
    assert(values.length>=3 && values.every(v=>v===values[0]), `CPU resource growth after fixed warmup: ${site}/${phase}/${key}`);
  }
}

function validateMemory(memory, label) {
  for (const key of Object.keys(POLICY.memory)) {
    const m = memory?.[key]; assert(['measured','unavailable'].includes(m?.status), `${label}: memory capability missing`);
    if (m.status==='measured') { finite(m.value, key, key!=='backingStorageBytes'); assert(typeof m.method==='string' && m.method.length>0, 'Memory method missing'); }
    else assert(typeof m.reason==='string' && m.reason.length>0, 'Memory unavailable reason missing');
  }
  assert(memory?.gpuVramBytes?.status==='unavailable'&&typeof memory.gpuVramBytes.reason==='string','Physical VRAM capability must be explicit');
  const rss=memory.processRssBytes;
  if(rss.status==='measured')validateOwnedRss(rss,{requestStartMs:rss.requestStartMs,responseEndMs:rss.responseEndMs});
  const heap=memory?.runtimeHeapUsage;
  assert(heap?.status===memory.heapBytes.status,'Raw heap capability differs');
  if(heap.status==='measured') {
    finite(heap.raw?.usedSize,'raw usedSize');finite(heap.raw?.totalSize,'raw totalSize',true);
    assert(heap.raw.usedSize===memory.heapBytes.value,'Raw usedSize differs from measured heap');
    for(const key of ['embedderHeapUsedSize','backingStorageSize'])if(heap.raw[key]!==undefined)finite(heap.raw[key],`raw ${key}`);
    if(memory.backingStorageBytes.status==='measured')assert(memory.backingStorageBytes.value===heap.raw.backingStorageSize,'Raw backing storage differs');
  } else assert(typeof heap.reason==='string'&&heap.reason.length>0,'Raw heap unavailable reason missing');
}

function validateRun(run, policy, allowLegacy) {
  assert(run?.status==='complete' && run.browserClosed===true && run.errors?.length===0, 'Browser run failed/not closed/errors');
  assert(typeof run.version==='string' && /^[a-f0-9]{64}$/.test(run.executableSha256), 'Browser identity missing');
  assert(typeof run.graphics?.renderer==='string' && run.graphics.drawingBuffer?.[0]===policy.viewport.width && run.graphics.drawingBuffer[1]===policy.viewport.height, 'Graphics identity/drawing buffer invalid');
  assert(run.scenarios?.length===policy.scenarios.length && new Set(run.scenarios.map(s=>s.id)).size===policy.scenarios.length, 'Missing/duplicate scenario');
  const scenarios = Object.fromEntries(policy.scenarios.map(id => {
    const sample = run.scenarios.find(s=>s.id===id); assert(sample, `Missing scenario ${id}`); return [id,summarizeScenario(sample,policy)];
  }));
  const cold=loadingSummary(run.cold,{allowLegacy,policy}),warm=loadingSummary(run.warm,{allowLegacy,policy});
  assert(run.transitions?.length===policy.transitionCycles, 'Browser transition cycles missing');
  validateMemory(run.memoryBefore,'before'); validateMemory(run.memoryAfter,'after');
  for (const [i,r] of run.transitions.entries()) {
    assert(r.cycle===i+1 && r.site===policy.habitats[i%policy.habitats.length], 'Browser transition site/cycle missing');
    assert(r.insideState?.cleanup?.attempt?.siteId===r.site && r.insideState.cleanup.attempt.status==='active' && r.insideState.cleanup.attempt.air>0 && r.outsideState?.cleanup?.attempt===null, 'Transition did not enter/exit viable site');
    for (const phase of ['inside','outside']) {
      for (const key of ['geometries','textures','activeRenderedFrames','drawCalls','triangles']) finite(r[phase]?.[key], `transition.${key}`);
      assert(r[phase].paused===false && r[phase].visibility==='visible' && r[phase].quality===policy.quality && r[phase].drawCalls>0 && r[phase].triangles>0, 'Inactive transition');
    }
    assert(r.outside.activeRenderedFrames>r.inside.activeRenderedFrames, 'Transition made no rendered progress');
    validateMemory(r.memory,`cycle ${r.cycle}`);
  }
  for (const site of policy.habitats) for (const phase of ['inside','outside']) for (const key of ['geometries','textures']) {
    const values=run.transitions.filter(r=>r.site===site && r.cycle>policy.habitats.length*2).map(r=>r[phase][key]);
    assert(values.length>=3 && values.every(v=>v===values[0]), `Renderer resource growth after fixed warmup: ${site}/${phase}/${key}`);
  }
  for (const key of Object.keys(policy.memory)) {
    const values=run.transitions.filter(r=>r.cycle>policy.habitats.length*2).map(r=>r.memory[key]);
    assert(new Set([run.memoryBefore[key].status,run.memoryAfter[key].status,...values.map(m=>m.status)]).size===1, 'Memory capability changed within run');
    if (values[0].status==='measured') {
      const start=median(values.slice(0,4).map(m=>m.value)),end=median(values.slice(-4).map(m=>m.value));
      const allowance=policy.memory[key];
      assert(!(end-start>allowance.absolute && end>start*(1+allowance.relative)), `Sustained ${key} growth after fixed warmup`);
    }
  }
  assert(run.menus?.length===policy.menus.length && new Set(run.menus.map(m=>m.panel)).size===policy.menus.length, 'Panel scenarios missing/duplicate');
  for (const panel of policy.menus) {
    const m=run.menus.find(m=>m.panel===panel); assert(m && m.paused===true, `Panel ${panel} not visibly paused`);
    finite(m.openMs,'panel open',true); assert(m.gameSeconds<.2 && m.sceneFrames>=1, 'Panel render or pause contract failed');
  }
  assert(run.construction?.length===5 && new Set(run.construction.map(c=>c.upgrade)).size===5,'Construction coverage missing/duplicate');
  for(const c of run.construction)assert(c.built===true&&c.outcome?.ok===true&&c.after?.activeRenderedFrames>c.before?.activeRenderedFrames,'Construction did not complete through real frames');
  const memoryPeaks=validateMemoryRound(run,policy);
  for(const mode of ['cold','warm']) {
    const load=run.memoryBrowser[mode];loadingSummary(load,{allowLegacy,policy});
    assert(load.cacheMode===`${mode}-memory-only`,'Memory startup cache identity missing');
    const window=run.memoryWindows.find(w=>w.id===`startup-${mode}`);
    assert(window.evidence.renderedAfter>=load.activeRenderedFrames,'Memory startup render evidence differs from loading');
  }
  return { cold,warm,scenarios,memoryPeaks }; 
}

export function validateRecord(record, policy=policyForProfile(record?.profile)) {
  assert(record?.schema===policy.schema && record.kind==='measured' && record.status==='complete' && record.exploratory!==true, 'Missing/failed/exploratory measurement record');
  assert(record.policySha256===digest(policy) && digest(record.protocol)===digest(policy), 'Measurement policy changed');
  assert(/^[a-f0-9]{64}$/.test(record.harnessSha256), 'Harness fingerprint missing');
  assert(record.unchanged===true && record.source?.hash===record.sourceAfter?.hash && record.build?.hash===record.buildAfter?.hash && record.harnessSha256===record.harnessAfterSha256, 'Inputs/build/harness changed during measurement');
  assert(/^[a-f0-9]{40}$/.test(record.source?.commit) && /^[a-f0-9]{64}$/.test(record.source.hash), 'Source identity missing');
  assert(Array.isArray(record.source.files) && digest(record.source.files)===record.source.hash, 'Input file fingerprint does not match files');
  assert(record.errors?.length===0 && ['ci-software','hardware'].includes(record.profile), 'Profile/errors invalid');
  const env=record.environment;
  assert(env && typeof env.host==='string' && typeof env.platform==='string' && typeof env.node==='string' && env.cpuCount>0 && env.memoryBytes>0 && Array.isArray(env.cpus) && env.cpus.length>0, 'Environment identity missing');
  assert(typeof record.session==='string' && record.session.length>0, 'Session identity missing');
  assert(typeof record.serving?.mode==='string'&&Array.isArray(record.serving.headers),'Serving protocol missing');
  const files=record.build.files; assert(Array.isArray(files) && files.length>0 && digest(files)===record.build.hash, 'Invalid build inventory fingerprint');
  assert(new Set(files.map(f=>f.path)).size===files.length && files.some(f=>f.path==='index.html'), 'Missing entry/duplicate inventory path');
  const totals={totalBytes:0,jsBytes:0,jsGzipBytes:0,cssBytes:0,cssGzipBytes:0,assetBytes:0};
  for (const f of files) {
    assert(typeof f.path==='string' && /^[a-f0-9]{64}$/.test(f.sha256), 'Inventory file identity invalid');
    finite(f.bytes,'file bytes'); finite(f.gzipBytes,'file gzip bytes'); totals.totalBytes+=f.bytes;
    const kind=f.path.endsWith('.js')?'js':f.path.endsWith('.css')?'css':null;
    if(kind){totals[`${kind}Bytes`]+=f.bytes;totals[`${kind}GzipBytes`]+=f.gzipBytes;}
    else if(f.path!=='index.html')totals.assetBytes+=f.bytes;
  }
  for(const key of policy.sizeMetrics)assert(totals[key]===record.build.totals[key], `Incorrect inventory total ${key}`);
  validateCpu(record.cpuResources,policy);
  assert(record.runs?.length===policy.repeats && record.runs.every((r,i)=>r.repeat===i+1), 'Missing repetitions/duplicate repeat ID');
  const allowLegacy=record.source.commit==='79da54bdbd029090d4ed9d6fd3dd2caea1a4847c'&&record.source.matchesCommit===true&&record.source.dirty===false;
  const summaries=record.runs.map(r=>validateRun(r,policy,allowLegacy));
  for(const run of record.runs) {
    if(record.profile==='ci-software')assert(/swiftshader/i.test(run.graphics.renderer),'Software CI did not use SwiftShader');
    else assert(!/swiftshader|llvmpipe|software/i.test(run.graphics.renderer),'Hardware profile used software renderer');
  }
  return summaries;
}

export function timingDecision(base, candidate, allowance) {
  assert(base.length===candidate.length && base.length>=3, 'Insufficient matched repetitions');
  base.forEach(v=>finite(v,'timing'));candidate.forEach(v=>finite(v,'timing'));
  const b=median(base),c=median(candidate),delta=c-b;
  const mad = values => median(values.map(v=>Math.abs(v-median(values))));
  const noiseB=mad(base)/Math.max(b,allowance.absolute),noiseC=mad(candidate)/Math.max(c,allowance.absolute);
  const exceeds=delta>allowance.absolute && delta> b*allowance.relative;
  const agreement=candidate.filter((v,i)=>v-base[i]>allowance.absolute && v-base[i]>base[i]*allowance.relative).length;
  const spread = values => Math.max(...values)-Math.min(...values);
  const noisy=noiseB>allowance.noise || noiseC>allowance.noise ||
    spread(base)>Math.max(b*.50,allowance.absolute*4) || spread(candidate)>Math.max(c*.50,allowance.absolute*4);
  const verdict=noisy ? 'inconclusive' : exceeds ? agreement>=Math.ceil(candidate.length*.8)?'fail':'inconclusive' : 'pass';
  return { verdict,baseMedian:b,candidateMedian:c,delta,absoluteAllowance:allowance.absolute,relativeAllowance:allowance.relative,noiseB,noiseC,agreement,repetitions:candidate.length };
}

export function compareRecords(base,candidate,{ policy=policyForProfile(base?.profile), expectedBase,expectedHead }={}) {
  const result={schema:1,status:'fail',checks:[],errors:[],policySha256:digest(policy)};
  try {
    const bs=validateRecord(base,policy),cs=validateRecord(candidate,policy);
    assert(base.session===candidate.session && base.harnessSha256===candidate.harnessSha256 && digest(base.environment)===digest(candidate.environment), 'Different runner/session/harness/environment');
    assert(base.profile===candidate.profile, 'Software and hardware profiles are incomparable');
    assert(base.serving?.mode===candidate.serving?.mode, 'Serving/compression protocol changed');
    assert(digest(base.serving?.headers)===digest(candidate.serving?.headers),'Serving headers differ');
    if(expectedBase)assert(base.source.commit===expectedBase && !base.source.dirty && base.source.matchesCommit===true,'Base is not exact requested clean branch commit');
    if(expectedHead)assert(candidate.source.commit===expectedHead && !candidate.source.dirty && candidate.source.matchesCommit===true,'Candidate is not exact requested clean head commit');
    for(let i=0;i<policy.repeats;i++) {
      const b=base.runs[i],c=candidate.runs[i];
      assert(b.version===c.version && b.executableSha256===c.executableSha256 && digest(b.graphics)===digest(c.graphics) && digest(b.launchArgs)===digest(c.launchArgs),'Browser/GPU/settings mismatch');
      assert(b.launchChannel===c.launchChannel,'Browser channel changed');
      assert(b.fixture.sha256===c.fixture.sha256 && b.developedFixture.sha256===c.developedFixture.sha256,'Fixture changed; explicit protocol review required');
    }
    function gate(name,b,c,allowance={relative:0,absolute:0}) {
      const fails=c-b>allowance.absolute && c-b>b*allowance.relative;
      result.checks.push({ name,verdict:fails?'fail':'pass',base:b,candidate:c,delta:c-b,allowance });
    }
    function timing(name,b,c,allowance) { result.checks.push({name,...timingDecision(b,c,allowance)}); }
    for(const key of policy.sizeMetrics)gate(`size/${key}`,base.build.totals[key],candidate.build.totals[key],policy.sizes[key]);
    // Preserve per-asset accountability so shrinking other files cannot hide a large atlas increase.
    for(const f of base.build.files.filter(f=>!f.path.endsWith('.js')&&!f.path.endsWith('.css')&&f.path!=='index.html')) {
      const c=candidate.build.files.find(c=>c.path===f.path);if(c)gate(`asset/${f.path}`,f.bytes,c.bytes,policy.sizes.assetBytes);
    }
    for(const mode of ['cold','warm']) {
      for(const key of ['menuReadyMs','playReadyMs'])timing(`${mode}/${key}`,bs.map(s=>s[mode][key]),cs.map(s=>s[mode][key]),policy.timing[key]);
      for(const key of ['encodedBodySize','decodedBodySize','transferSize'])gate(`${mode}/${key}`,median(bs.map(s=>s[mode][key])),median(cs.map(s=>s[mode][key])),policy.sizes.assetBytes);
    }
    for(const id of policy.scenarios) {
      for(const key of ['frameMedianMs','frameP95Ms','frameOver50Ratio','rendererThreadCpuMsPerSecond'])timing(`${id}/${key}`,bs.map(s=>s.scenarios[id][key]),cs.map(s=>s.scenarios[id][key]),policy.timing[key]);
      for(const key of ['geometries','textures'])gate(`${id}/${key}`,Math.max(...bs.map(s=>s.scenarios[id][key])),Math.max(...cs.map(s=>s.scenarios[id][key])),policy.resources[key]);
      for(const key of ['drawCalls','triangles'])gate(`${id}/${key}`,Math.max(...bs.map(s=>s.scenarios[id][key])),Math.max(...cs.map(s=>s.scenarios[id][key])), {relative:.02,absolute:key==='drawCalls'?2:1000});
      if(base.profile==='hardware')for(const key of Object.keys(policy.hardware)) for(const [i,s] of cs.entries()) {
        result.checks.push({name:`hardware-budget/${id}/${key}/repeat-${i+1}`,verdict:s.scenarios[id][key]<=policy.hardware[key]?'pass':'fail',candidate:s.scenarios[id][key],maximum:policy.hardware[key]});
      }
    }
    for(const site of policy.habitats)for(const phase of ['inside','outside'])for(const key of ['geometries','textures']) {
      const values=r=>Math.max(...r.runs.flatMap(run=>run.transitions.filter(t=>t.site===site&&t.cycle>policy.habitats.length*2).map(t=>t[phase][key])));
      gate(`renderer/${site}/${phase}/${key}`,values(base),values(candidate),policy.resources[key]);
    }
    for(const site of policy.habitats)for(const phase of ['inside','outside'])for(const key of ['live','geometries','materials','textures']) {
      const values=r=>Math.max(...r.cpuResources.rows.filter(t=>t.site===site&&t.cycle>policy.habitats.length*2).map(t=>t[phase][key]));
      gate(`cpu/${site}/${phase}/${key}`,values(base),values(candidate),policy.resources[key]);
    }
    for(const site of policy.habitats)for(const phase of ['inside','outside'])for(const key of ['geometryBackingBytes','textureRgbaBytesEstimate']) {
      const values=r=>Math.max(...r.cpuResources.rows.filter(t=>t.site===site&&t.cycle>policy.habitats.length*2).map(t=>t[phase][key]));
      gate(`cpu-storage-estimate/${site}/${phase}/${key}`,values(base),values(candidate),policy.resources.storageEstimateBytes);
    }
    for(const panel of policy.menus)timing(`panel/${panel}/openMs`,base.runs.map(r=>r.menus.find(m=>m.panel===panel).openMs),candidate.runs.map(r=>r.menus.find(m=>m.panel===panel).openMs),policy.timing.menuOpenMs);
    for(const key of Object.keys(policy.memory)) {
      const b=base.runs.map(r=>r.memoryAfter[key]),c=candidate.runs.map(r=>r.memoryAfter[key]);
      assert(new Set([...b,...c].map(m=>m.status)).size===1, `${key} availability differs; cannot silently skip`);
      if(b[0].status==='unavailable')result.checks.push({name:key,verdict:'unavailable',reason:b[0].reason});
      else { assert([...b,...c].every(m=>m.method===b[0].method),'Memory method changed');timing(key,b.map(m=>m.value),c.map(m=>m.value),policy.memory[key]); }
    }
    for(const id of memoryWindowIds(policy))for(const key of MEMORY_KEYS) {
      const b=bs.map(s=>s.memoryPeaks[id][key]),c=cs.map(s=>s.memoryPeaks[id][key]),name=`memory-peak/${id}/${key}`;
      assert(new Set([...b,...c].map(m=>m.status)).size===1,`${name} availability differs; cannot silently skip`);
      if(b[0].status==='unavailable')result.checks.push({name,verdict:'unavailable',reason:b[0].reason});
      else {
        assert([...b,...c].every(m=>m.method===b[0].method),`${name} memory sampling method changed`);
        timing(name,b.map(m=>m.value),c.map(m=>m.value),policy.memory[key]);
      }
    }
    result.base={commit:base.source.commit,sourceHash:base.source.hash,buildHash:base.build.hash};
    result.candidate={commit:candidate.source.commit,sourceHash:candidate.source.hash,buildHash:candidate.build.hash};
    result.status=result.checks.some(c=>c.verdict==='fail')?'fail':result.checks.some(c=>c.verdict==='inconclusive')?'inconclusive':'pass';
  }catch(e){result.errors.push(e.message);}
  return result;
}

export function renderSummary(result) {
  const lines=[`Tidekin performance: **${result.status.toUpperCase()}**`, '',
    `Base: ${result.base?.commit??'invalid'} · Candidate: ${result.candidate?.commit??'invalid'}`, '',
    '| Gate | Verdict | Base | Candidate | Delta |', '|---|---|---:|---:|---:|'];
  for(const c of result.checks.filter(c=>c.verdict!=='pass'))lines.push(`| ${c.name} | ${c.verdict} | ${c.baseMedian??c.base??''} | ${c.candidateMedian??c.candidate??''} | ${c.delta??''} |`);
  if(result.status==='pass'&&result.checks.length>0&&result.checks.every(c=>c.verdict==='pass'))lines.push('| All enforced checks | pass | | | |');
  for(const error of result.errors)lines.push('',`Invalid evidence: ${error}`);
  lines.push('', 'Raw records retain collected frame/state/transition checkpoints and fixed transition warmup. Inconclusive exits nonzero; rerun both commits, never widen policy automatically. Software CI does not certify hardware FPS.');
  return lines.join('\n')+'\n';
}

if(process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
  const args=process.argv.slice(2),opt=k=>args.find(a=>a.startsWith(`--${k}=`))?.slice(k.length+3);
  if(args.includes('--help'))console.log('node scripts/performance/compare.mjs --base=base.json --candidate=head.json --out=NEW.json [--summary=NEW.md --expected-base=SHA --expected-head=SHA]');
  else {
    const result=compareRecords(JSON.parse(await readFile(opt('base'),'utf8')),JSON.parse(await readFile(opt('candidate'),'utf8')),{expectedBase:opt('expected-base'),expectedHead:opt('expected-head')});
    if(opt('out'))await writeFile(opt('out'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
    if(opt('summary'))await writeFile(opt('summary'),renderSummary(result),{flag:'wx'});
    console.log(renderSummary(result));process.exitCode=result.status==='pass'?0:1;
  }
}
