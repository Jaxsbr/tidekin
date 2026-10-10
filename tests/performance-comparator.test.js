import {RSS_PROTOCOL,RSS_METHODS} from '../scripts/performance/rss.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { MEMORY_SAMPLING, memoryWindowIds, validateMemoryWindow } from '../scripts/performance/memory.mjs';
import { POLICY, policyForProfile } from '../scripts/performance/policy.mjs';
import { digest } from '../scripts/performance/evidence.mjs';
import { compareRecords, summarizeScenario, timingDecision } from '../scripts/performance/compare.mjs';

// Manufactured evidence is test data only. No browser/hardware result is asserted.
const hash = 'a'.repeat(64), commit = 'b'.repeat(40);
function scene(id, interval = 1000/60) {
  const timestamps=Array.from({length:Math.ceil(20000/interval)+1},(_,i)=>i*interval);
  const checkpoints=Array.from({length:101},(_,i)=> {
    const seconds=i*.2,diving=id.startsWith('moving-dive-');
    const depth=seconds<6?seconds*2:seconds<12?24-seconds*2:seconds<15?0:(seconds-15)*2;
    return {t:i*200,gameTime:seconds,position:{x:id==='sailing-circuit'?seconds:0,z:0},
      depth:diving?depth:null,air:diving?22:null,status:diving?'active':null,site:diving?id.slice('moving-dive-'.length):null,
      visible:true,focused:true,paused:false,quality:'high',view:'follow',rendered:Math.floor(i*200/interval),
      geometries:100,textures:3,drawCalls:50,triangles:10000,viewport:{...POLICY.viewport,devicePixelRatio:1}};
  });
  return {id,timestamps,checkpoints,cpu:{status:'measured',method:'CDP Performance ThreadTime synthetic test only',start:{Timestamp:1,ThreadTime:0},end:{Timestamp:21,ThreadTime:2}}};
}
function loading() {
  return {menuReadyMs:200,playReadyMs:500,firstInteractiveMs:750,clickMs:250,activeRenderedFrames:1,
    navigation:{encodedBodySize:100,decodedBodySize:100,transferSize:400},
    resources:[{path:'/assets/atlas.png',encodedBodySize:1000,decodedBodySize:1000,transferSize:1300}],
    network:{encodedBodySize:1100,decodedBodySize:1100,transferSize:1700},phases:{status:'measured',rows:POLICY.loadingPhases.map(name=>({name,durationMs:10,status:'complete'}))}};
}
const memory=()=>({heapBytes:{status:'measured',value:40*1024**2,method:'synthetic heap'},backingStorageBytes:{status:'measured',value:80*1024**2,method:'synthetic backing storage'},processRssBytes:{status:'unavailable',reason:'synthetic unsupported host'},
  runtimeHeapUsage:{status:'measured',raw:{usedSize:40*1024**2,totalSize:60*1024**2,embedderHeapUsedSize:5*1024**2,backingStorageSize:80*1024**2}},gpuVramBytes:{status:'unavailable',reason:'synthetic VRAM unsupported'}});
const metrics=frames=>({geometries:100,textures:3,activeRenderedFrames:frames,drawCalls:50,triangles:10000,paused:false,visibility:'visible',quality:'high'});
const cpuMetrics=()=>({attached:130,live:130,detached:0,disposed:50,geometries:100,materials:30,textures:0,geometryBackingBytes:100000,textureRgbaBytesEstimate:0,unknownTextureImages:0});
function manufacturedRss(t,value=200*1024**2) {
  const processInfo=[{id:123,type:'browser'}],rssKiB=value/1024;
  return {status:'measured',platform:'darwin',method:RSS_METHODS.darwin,protocol:{...RSS_PROTOCOL},
    requestStartMs:t+.01,responseEndMs:t+.95,value,peakValue:value,
    attempts:[{number:1,startMs:t+.01,endMs:t+.95,status:'complete',departedPids:[],arrivedPids:[],
      before:{requestStartMs:t+.01,responseEndMs:t+.2,processInfo:structuredClone(processInfo)},
      read:{requestStartMs:t+.2,responseEndMs:t+.7,status:'complete',command:'/bin/ps',args:['-o','pid=,rss=','-p','123'],
        result:{stdout:`123 ${rssKiB}\n`,stderr:'',code:0,signal:null},processes:[{pid:123,type:'browser',rssKiB,rssBytes:value}]},
      after:{requestStartMs:t+.7,responseEndMs:t+.95,processInfo:structuredClone(processInfo)}}]};
}
function memoryWindows() {
  return memoryWindowIds(POLICY).map((id,i)=>{
    const startMs=300000+i*2000;
    const rawHeap={usedSize:40*1024**2,totalSize:60*1024**2,embedderHeapUsedSize:5*1024**2,backingStorageSize:80*1024**2};
    const channel=(step,raw)=>[0,...Array.from({length:Math.floor(1499/step)},(_,j)=>(j+1)*step),1500]
      .map(t=>{
        const value=raw?structuredClone(raw):manufacturedRss(startMs+t);
        return {requestStartMs:startMs+t,responseEndMs:startMs+t+1,raw:value};
      });
    const site=id.startsWith('entry/')?id.slice(6):id.split('/').slice(2).join('/');
    const row={id,startMs,operationStartMs:startMs+2,operationEndMs:startMs+400,endMs:startMs+1501,
      clock:'Node performance.now monotonic milliseconds',sampling:{...MEMORY_SAMPLING},requestedGc:false,
      gpuVramBytes:{status:'unavailable',reason:'synthetic unavailable VRAM'},heap:channel(101,rawHeap),rss:channel(251,null),
      errors:[],status:'complete',samplerStopped:true,drained:true,
      evidence:{renderedBefore:0,renderedAfter:30,visible:true,focused:true,paused:false,menuVisible:true,ready:true,
        upgrade:id.slice(6),built:true,outcome:{ok:true},site,requestedSite:site,status:'active',air:24,exited:true,
        exitRequestStartMs:startMs+300,insideRenderedBefore:10,insideRendered:20,insideCheckpoints:[10,20].map((rendered,j)=>({site,status:'active',air:24,rendered,visible:true,focused:true,paused:false,
          requestStartMs:startMs+20+j*250,responseEndMs:startMs+21+j*250}))}};
    row.maxima=validateMemoryWindow(row);return row;
  });
}
export function syntheticRecord() {
  const files=[{path:'index.html',bytes:100,gzipBytes:70,sha256:hash},{path:'assets/app.js',bytes:100000,gzipBytes:30000,sha256:hash},
    {path:'assets/app.css',bytes:1000,gzipBytes:500,sha256:hash},{path:'assets/atlas.png',bytes:3000000,gzipBytes:3000000,sha256:hash}];
  const build={files,hash:digest(files),totals:{totalBytes:3101100,jsBytes:100000,jsGzipBytes:30000,cssBytes:1000,cssGzipBytes:500,assetBytes:3000000}};
  const source={commit,hash:digest([]),files:[],dirty:false,matchesCommit:true,committedInputs:[]};
  return {schema:1,kind:'measured',profile:'hardware',status:'complete',session:'synthetic-test-only',protocol:POLICY,
    policySha256:digest(POLICY),harnessSha256:hash,harnessAfterSha256:hash,source,sourceAfter:structuredClone(source),build,buildAfter:structuredClone(build),unchanged:true,errors:[],
    environment:{host:'manufactured',platform:'darwin',node:'v24.0.0',cpuCount:1,cpus:['synthetic'],memoryBytes:1000000},
    serving:{mode:'synthetic',headers:[]},cpuResources:{measured:true,observed:1000,remaining:0,doubleDisposed:0,idempotent:true,
      rows:Array.from({length:POLICY.transitionCycles},(_,i)=>({cycle:i+1,site:POLICY.habitats[i%POLICY.habitats.length],inside:cpuMetrics(),outside:cpuMetrics()}))},
    runs:Array.from({length:POLICY.repeats},(_,i)=>({
      gcIntervals:[{id:'before',startMs:290000,endMs:290100},...Array.from({length:POLICY.transitionCycles},(_,i)=>({id:`cycle-${i+1}`,startMs:300000+i*2000+1502,endMs:300000+i*2000+1600})),{id:'after',startMs:347700,endMs:347800}],
      memoryWindows:memoryWindows(),timedIntervals:[...POLICY.scenarios,'menus'].map((id,j)=>({id,startMs:j*30000,endMs:j*30000+29000})),
      timingBrowserClosed:true,memoryBrowser:{cold:{...loading(),cacheMode:'cold-memory-only'},warm:{...loading(),cacheMode:'warm-memory-only'},fixture:{sha256:hash},fresh:true,closed:true,version:'manufactured-browser',executableSha256:hash,graphics:{renderer:'synthetic hardware',drawingBuffer:[1440,900]}},repeat:i+1,status:'complete',browserClosed:true,errors:[],version:'manufactured-browser',executableSha256:hash,
      graphics:{renderer:'synthetic hardware',drawingBuffer:[1440,900]},launchArgs:[],fixture:{sha256:hash},developedFixture:{sha256:hash},
      cold:loading(),warm:loading(),scenarios:POLICY.scenarios.map(id=>scene(id)),memoryBefore:memory(),memoryAfter:memory(),
      construction:['waterwheel','crane','greenhouse','sail','beacon'].map(upgrade=>({upgrade,built:true,outcome:{ok:true},before:{activeRenderedFrames:1},after:{activeRenderedFrames:10}})),
      transitions:Array.from({length:POLICY.transitionCycles},(_,j)=>({cycle:j+1,site:POLICY.habitats[j%POLICY.habitats.length],inside:metrics(j*100+1),outside:metrics(j*100+10),
        insideState:{cleanup:{attempt:{siteId:POLICY.habitats[j%POLICY.habitats.length],status:'active',air:24}}},outsideState:{cleanup:{attempt:null}},memory:memory()})),
      menus:POLICY.menus.map(panel=>({panel,openMs:20,paused:true,gameSeconds:0,sceneFrames:1}))}))};
}
function changeFile(r,path,delta,gzipDelta=delta) {
  const f=r.build.files.find(f=>f.path===path);f.bytes+=delta;f.gzipBytes+=gzipDelta;
  r.build.totals.totalBytes+=delta;
  if(path.endsWith('.js')){r.build.totals.jsBytes+=delta;r.build.totals.jsGzipBytes+=gzipDelta;}
  else if(path.endsWith('.css')){r.build.totals.cssBytes+=delta;r.build.totals.cssGzipBytes+=gzipDelta;}
  else r.build.totals.assetBytes+=delta;
  r.build.hash=digest(r.build.files);r.buildAfter=structuredClone(r.build);
}
const verdict=r=>compareRecords(syntheticRecord(),r);
function failsWith(record, pattern) {
  const result=verdict(record);assert.equal(result.status,'fail');assert.match(result.errors.join(' '),pattern);
  return result;
}
function failsGate(record, name) {
  const result=verdict(record);assert.deepEqual(result.errors,[]);
  assert.equal(result.status,'fail');assert.ok(result.checks.some(c=>c.name===name&&c.verdict==='fail'),`Expected failing gate ${name}`);
}
test('equal valid records and materially faster candidate pass',()=>{
  assert.equal(verdict(syntheticRecord()).status,'pass');
  const c=syntheticRecord();for(const r of c.runs){r.cold.playReadyMs=300;r.cold.firstInteractiveMs=r.cold.clickMs+300;}
  assert.equal(verdict(c).status,'pass');
});
test('post-GC RSS uses the same owned snapshot proof and rejects a seeded regression or forged PID sum',()=>{
  const baseline=syntheticRecord();
  for(const run of baseline.runs) {
    run.memoryBefore.processRssBytes=manufacturedRss(run.gcIntervals[0].startMs+1);
    run.memoryAfter.processRssBytes=manufacturedRss(run.gcIntervals.at(-1).startMs+1);
    for(const row of run.transitions)row.memory.processRssBytes=manufacturedRss(run.gcIntervals[row.cycle].startMs+1);
  }
  assert.equal(compareRecords(baseline,structuredClone(baseline)).status,'pass');
  const regression=structuredClone(baseline);
  for(const run of regression.runs)run.memoryAfter.processRssBytes=manufacturedRss(run.gcIntervals.at(-1).startMs+1,240*1024**2);
  const result=compareRecords(baseline,regression);
  assert.deepEqual(result.errors,[]);assert.ok(result.checks.some(c=>c.name==='processRssBytes'&&c.verdict==='fail'));
  const forged=structuredClone(baseline);forged.runs[0].memoryAfter.processRssBytes.value++;
  assert.match(compareRecords(baseline,forged).errors.join(' '),/Forged RSS final sum/);
});
test('finite small code growth passes; seeded material gzip growth fails',()=>{
  const c=syntheticRecord();changeFile(c,'assets/app.js',1000,1000);assert.equal(verdict(c).status,'pass');
  changeFile(c,'assets/app.js',10000,4000);
  assert.equal(verdict(c).status,'fail');assert.ok(verdict(c).checks.some(c=>c.name==='size/jsGzipBytes'&&c.verdict==='fail'));
});
test('seeded atlas duplication fails deterministic shipped and individual asset budgets',()=>{
  const c=syntheticRecord();changeFile(c,'assets/atlas.png',3000000);
  assert.equal(verdict(c).status,'fail');assert.ok(verdict(c).checks.some(c=>c.name==='asset/assets/atlas.png'&&c.verdict==='fail'));
});
test('seeded first interactive delay and frame slowdown fail',()=>{
  const c=syntheticRecord();for(const r of c.runs){r.cold.playReadyMs+=500;r.cold.firstInteractiveMs+=500;}
  assert.ok(verdict(c).checks.some(c=>c.name==='cold/playReadyMs'&&c.verdict==='fail'));
  const slow=syntheticRecord();for(const r of slow.runs)r.scenarios[0]=scene('follow-stationary',30);
  assert.equal(verdict(slow).status,'fail');assert.ok(verdict(slow).checks.some(c=>c.name==='follow-stationary/frameMedianMs'&&c.verdict==='fail'));
});
test('missing/duplicate habitat, missing repeat and short/invalid samples fail closed',()=>{
  for(const [mutate,reason] of [[r=>r.runs[0].scenarios.pop(),/Missing\/duplicate scenario/],
    [r=>r.runs[0].scenarios[2]=r.runs[0].scenarios[0],/Missing\/duplicate scenario/],[r=>r.runs.pop(),/Missing repetitions/],
    [r=>r.runs[0].scenarios[0].timestamps.splice(100),/shortened frame recording/],
    [r=>r.runs[0].scenarios[0].timestamps[10]=NaN,/Invalid frame timestamp/],
    [r=>r.runs[0].scenarios[0].timestamps[10]=-1,/Invalid frame timestamp/],
    [r=>r.runs[0].scenarios[0].checkpoints[5].paused=true,/Hidden, unfocused, paused/],
    [r=>r.runs[0].scenarios[0].checkpoints.forEach(c=>c.gameTime=0),/game-clock advancement/],
    [r=>r.runs[0].scenarios[0].checkpoints.forEach(c=>c.rendered=0),/rendered progress invalid/],
    [r=>r.runs[0].scenarios[2].checkpoints.forEach(c=>c.depth=0),/Deep habitat never visited/],
    [r=>r.runs[0].scenarios[2].checkpoints[10].air=0,/Dive site\/status\/air invalid/]]) {
    const r=syntheticRecord();mutate(r);failsWith(r,reason);
  }
});
test('seeded resource leak/disposal failure and late steady count increase fail',()=>{
  for(const [mutate,reason] of [[r=>r.cpuResources.remaining=1,/CPU owned resources leaked/],
    [r=>r.cpuResources.doubleDisposed=1,/double-disposed/],[r=>r.cpuResources.idempotent=false,/non-idempotent/],
    [r=>r.cpuResources.rows[12].inside.detached=1,/Detached undisposed CPU resource/],
    [r=>r.runs[0].transitions.at(-1).inside.geometries++,/Renderer resource growth.*salvage:horizon-wreck\/inside\/geometries/]]) {
    const c=syntheticRecord();mutate(c);failsWith(c,reason);
  }
  const c=syntheticRecord();c.runs.forEach(run=>run.transitions.forEach(t=>t.inside.geometries+=100));
  failsGate(c,'renderer/home-reef/inside/geometries');
});
test('seeded sustained heap growth and losing measurement capability fail',()=>{
  const c=syntheticRecord();for(const run of c.runs)for(const t of run.transitions){t.memory.heapBytes.value+=t.cycle*2*1024**2;t.memory.runtimeHeapUsage.raw.usedSize=t.memory.heapBytes.value;}
  assert.match(verdict(c).errors.join(' '),/Sustained heapBytes growth/);
  const unavailable=syntheticRecord();for(const r of unavailable.runs){r.memoryBefore.heapBytes={status:'unavailable',reason:'disabled'};r.memoryAfter.heapBytes={status:'unavailable',reason:'disabled'};
    r.memoryBefore.runtimeHeapUsage={status:'unavailable',reason:'disabled'};r.memoryAfter.runtimeHeapUsage={status:'unavailable',reason:'disabled'};
    for(const t of r.transitions){t.memory.heapBytes={status:'unavailable',reason:'disabled'};t.memory.runtimeHeapUsage={status:'unavailable',reason:'disabled'};}}
  assert.match(verdict(unavailable).errors.join(' '),/availability differs/);
});
test('noisy/contradictory repeated timing is inconclusive, never silently passes',()=>{
  assert.equal(timingDecision([500,510,490,505,495],[500,1100,700,900,1300],POLICY.timing.playReadyMs).verdict,'inconclusive');
  const c=syntheticRecord();[500,1100,700,900,1300].forEach((v,i)=>{c.runs[i].cold.playReadyMs=v;c.runs[i].cold.firstInteractiveMs=c.runs[i].cold.clickMs+v;});
  assert.equal(verdict(c).status,'inconclusive');
});
test('policy edits, runner mismatch, changed build and invented network totals fail',()=>{
  for(const [mutate,reason] of [[r=>r.policySha256=hash,/policy changed/],[r=>r.protocol={...r.protocol,sampleMs:1000},/policy changed/],
    [r=>r.environment.host='other',/Different runner\/session\/harness\/environment/],
    [r=>r.build.files[0].bytes++,/Invalid build inventory fingerprint/],[r=>r.sourceAfter.hash=hash,/Inputs\/build\/harness changed/],
    [r=>r.harnessAfterSha256='c'.repeat(64),/Inputs\/build\/harness changed/],
    [r=>r.runs[0].cold.network.transferSize=0,/Network total/],[r=>r.runs[0].cold.firstInteractiveMs=1,/First interactive/],
    [r=>r.runs[0].cold.phases={status:'measured',rows:[{name:'scene-create',durationMs:1,status:'failed'}]},/Failed\/missing loading phase/]]) {
    const c=syntheticRecord();mutate(c);failsWith(c,reason);
  }
});
test('software relative timing gates remain enforced without certifying hardware budget',()=>{
  const b=syntheticRecord(),c=syntheticRecord();
  const softwarePolicy=policyForProfile('ci-software');
  for(const r of [b,c]){
    r.profile='ci-software';r.protocol=softwarePolicy;r.policySha256=digest(softwarePolicy);
    r.runs=r.runs.slice(0,softwarePolicy.repeats);
    for(const run of r.runs){run.graphics.renderer='SwiftShader';run.graphics.drawingBuffer=[960,600];run.memoryBrowser.graphics=structuredClone(run.graphics);
      for(const scene of run.scenarios)for(const row of scene.checkpoints){row.quality='low';row.viewport={width:960,height:600,devicePixelRatio:1};}
      for(const t of run.transitions){t.inside.quality='low';t.outside.quality='low';}
    }
  }
  for(const r of c.runs)r.scenarios[0]=scene('follow-stationary',30);
  for(const row of c.runs.flatMap(r=>r.scenarios[0].checkpoints)){row.quality='low';row.viewport={width:960,height:600,devicePixelRatio:1};}
  const result=compareRecords(b,c);assert.equal(result.status,'fail');assert.ok(!result.checks.some(c=>c.name.startsWith('hardware-budget/')));
});
test('standalone raw scenario summarizes genuine intervals rather than trusting a summary field',()=>{
  const s=scene('follow-stationary');s.frameMedianMs=999;assert.ok(summarizeScenario(s).frameMedianMs<17);
});
test('missing, relabelled and unavailable candidate phases fail; exact legacy base absence is explicit',()=>{
  for(const mutate of [r=>r.runs[0].cold.phases.rows.pop(),r=>r.runs[0].cold.phases.rows[0].name='something-else',
    r=>r.runs[0].cold.phases={status:'unavailable',reason:'removed'}]) {
    const c=syntheticRecord();mutate(c);assert.equal(verdict(c).status,'fail');assert.match(verdict(c).errors.join(' '),/phase/i);
  }
  const b=syntheticRecord(),c=syntheticRecord();b.source.commit='79da54bdbd029090d4ed9d6fd3dd2caea1a4847c';b.sourceAfter.commit=b.source.commit;
  for(const r of b.runs)for(const mode of ['cold','warm'])r[mode].phases={status:'unavailable',reason:'legacy baseline hook'};
  assert.equal(compareRecords(b,c).status,'pass');
  for(const flag of ['dirty','matchesCommit']) {
    const modified=structuredClone(b);modified.source[flag]=flag==='dirty';modified.sourceAfter=structuredClone(modified.source);
    failsWith(modified,/Loading phases unavailable outside explicitly legacy baseline/);
  }
});
test('exact SHA comparison rejects extra untracked input despite same commit',()=>{
  const b=syntheticRecord(),c=syntheticRecord();c.source.matchesCommit=false;
  assert.equal(compareRecords(b,c,{expectedBase:commit,expectedHead:commit}).status,'fail');
  c.source.matchesCommit=true;c.source.dirty=true;assert.equal(compareRecords(b,c,{expectedBase:commit,expectedHead:commit}).status,'fail');
});
test('seeded CPU regression behind stable vsync fails, missing CPU window fails',()=>{
  const c=syntheticRecord();for(const r of c.runs)r.scenarios[0].cpu.end.ThreadTime=4;
  assert.ok(verdict(c).checks.some(c=>c.name==='follow-stationary/rendererThreadCpuMsPerSecond'&&c.verdict==='fail'));
  const missing=syntheticRecord();delete missing.runs[0].scenarios[0].cpu;failsWith(missing,/Window-local renderer CPU missing/);
});
test('seeded typed-array backing growth fails and physical turn events preserve brief deep coverage',()=>{
  const c=syntheticRecord();for(const r of c.runs){r.memoryAfter.backingStorageBytes.value+=20*1024**2;r.memoryAfter.runtimeHeapUsage.raw.backingStorageSize=r.memoryAfter.backingStorageBytes.value;}
  assert.ok(verdict(c).checks.some(c=>c.name==='backingStorageBytes'&&c.verdict==='fail'));
  const s=scene('moving-dive-home-reef');for(const row of s.checkpoints)row.depth=Math.min(11.8,row.depth);
  assert.throws(()=>summarizeScenario(s),/Deep habitat never visited/);
  s.coverageEvents=[{event:'deep-turn',t:6000,depth:12.1,air:20,status:'active',site:'home-reef',visible:true,focused:true,paused:false,quality:'high',gameTime:6,rendered:360}];
  assert.doesNotThrow(()=>summarizeScenario(s));s.coverageEvents[0].air=0;assert.throws(()=>summarizeScenario(s),/Invalid physical/);
});
test('bounded cross-commit count/storage tradeoffs pass while a single late leak still fails',()=>{
  const c=syntheticRecord();
  for(const r of c.runs)for(const t of r.transitions)t.inside.geometries+=26;
  for(const r of c.cpuResources.rows){r.inside.geometries+=26;r.inside.live+=26;r.inside.attached+=26;r.inside.geometryBackingBytes+=92544;}
  assert.equal(verdict(c).status,'pass');
  c.runs[0].transitions.at(-1).inside.geometries++;failsWith(c,/Renderer resource growth.*salvage:horizon-wreck\/inside\/geometries/);
});
test('inside and outside byte growth fails even when resource counts plateau',()=>{
  for(const phase of ['inside','outside'])for(const key of ['geometryBackingBytes','textureRgbaBytesEstimate']) {
    const c=syntheticRecord();c.cpuResources.rows[12][phase][key]++;
    failsWith(c,new RegExp(`CPU resource growth.*home-reef/${phase}/${key}`));
  }
});
test('cross-commit CPU buffer and RGBA storage allowances apply to both phases',()=>{
  for(const phase of ['inside','outside'])for(const key of ['geometryBackingBytes','textureRgbaBytesEstimate']) {
    const c=syntheticRecord();for(const row of c.cpuResources.rows)row[phase][key]+=2*1024**2;
    failsGate(c,`cpu-storage-estimate/home-reef/${phase}/${key}`);
  }
});
test('cross-commit resource count allowances also cover the outside phase',()=>{
  for(const phase of ['inside','outside']) {
    const c=syntheticRecord();for(const row of c.cpuResources.rows) {
      row[phase].geometries+=40;row[phase].live+=40;row[phase].attached+=40;
    }
    failsGate(c,`cpu/home-reef/${phase}/geometries`);
  }
});

test('every independently seeded startup, entry, assembly and sustained peak gate fails',()=>{
  for(const id of ['startup-cold','startup-warm','entry/salvage:horizon-wreck','build/crane','transition/24/salvage:horizon-wreck'])
    for(const key of ['heapBytes','backingStorageBytes','processRssBytes']) {
      const c=syntheticRecord();
      for(const run of c.runs) {
        const w=run.memoryWindows.find(w=>w.id===id),delta=key==='processRssBytes'?64*1024**2:24*1024**2;
        if(key==='processRssBytes') {const sample=w.rss[2];sample.raw=manufacturedRss(sample.requestStartMs,sample.raw.value+delta);}
        else {const raw=w.heap[2].raw;raw[key==='heapBytes'?'usedSize':'backingStorageSize']+=delta;raw.totalSize+=delta;}
        delete w.maxima;w.maxima=validateMemoryWindow(w);
      }
      failsGate(c,`memory-peak/${id}/${key}`);
    }
});
test('missing peak, forged maxima, invalid samples and timing overlap fail specifically',()=>{
  for(const [mutate,reason] of [
    [r=>r.runs[0].timedIntervals[0].endMs=10,/Timed exclusion interval shortened/],
    [r=>delete r.runs[0].memoryBrowser.cold,/Loading resource entries missing/],
    [r=>r.runs[0].memoryWindows.pop(),/Missing\/duplicate memory phase/],
    [r=>r.runs[0].memoryWindows.find(w=>w.id==='startup-cold').maxima.heapBytes.value++,/Forged memory maxima/],
    [r=>r.runs[0].memoryWindows.find(w=>w.id==='startup-cold').heap[4].raw.usedSize=-1,/Invalid memory raw usedSize/],
    [r=>r.runs[0].memoryWindows.find(w=>w.id==='startup-cold').rss[1].raw.attempts[0].read.result.stdout='999 204800\n',/RSS PID not owned/],
    [r=>r.runs[0].memoryWindows.find(w=>w.id==='startup-cold').rss[1].raw.value++,/Forged RSS final sum/],
    [r=>r.runs[0].memoryWindows.find(w=>w.id==='startup-cold').requestedGc=true,/requested GC/],
    [r=>r.runs[0].memoryWindows.find(w=>w.id==='startup-cold').drained=false,/not stopped\/drained/],
    [r=>r.runs[0].memoryWindows.find(w=>w.id==='startup-cold').heap.splice(1,10),/samples missing/],
    [r=>r.runs[0].memoryWindows.find(w=>w.id==='startup-cold').heap[1].responseEndMs+=1001,/overlapping memory requests|sampling gap/],
    [r=>{r.runs[0].timedIntervals.at(-1).endMs=300500;r.runs[0].gcIntervals[0]={id:'before',startMs:300600,endMs:300700};},/preceded completion|overlaps timed/],
    [r=>r.runs[0].gcIntervals[1].startMs=300100,/Requested GC overlaps/],
    [r=>r.runs[0].memoryWindows.find(w=>w.id==='startup-cold').rss[1].responseEndMs+=900,/sampling gap/],
    [r=>r.runs[0].memoryWindows.find(w=>w.id==='startup-cold').rss[1].raw.attempts[0].read.responseEndMs=0,/RSS read boundary\/status/],
    [r=>r.runs[0].memoryWindows.find(w=>w.id==='startup-cold').rss[1].raw.method='changed',/RSS method\/platform\/status invalid/],
    [r=>r.runs[0].memoryBrowser.closed=false,/browser identity\/closure/],
    [r=>delete r.runs[0].memoryWindows[2].evidence.insideCheckpoints,/Active habitat render checkpoints missing/],
    [r=>r.runs[0].memoryWindows[2].evidence.insideCheckpoints[0].site='other',/not active at requested site/],
    [r=>r.runs[0].memoryWindows[2].evidence.exitRequestStartMs=300001,/outside entry\/before-exit scope/],
    [r=>r.runs[0].memoryWindows[2].evidence.air=0,/habitat entry\/exit|Invalid memory habitat air/],
    [r=>r.runs[0].memoryWindows[2].evidence.renderedAfter=0,/render progress|Invalid memory rendered after/],
  ]) {const c=syntheticRecord();mutate(c);failsWith(c,reason);}
});
test('optional backing capability is explicit on both sides and cannot disappear or switch mid-run',()=>{
  const b=syntheticRecord(),c=syntheticRecord();
  for(const r of [b,c])for(const run of r.runs)for(const w of run.memoryWindows) {
    for(const sample of w.heap)delete sample.raw.backingStorageSize;
    delete w.maxima;w.maxima=validateMemoryWindow(w);
  }
  const result=compareRecords(b,c);assert.equal(result.status,'pass');
  assert.ok(result.checks.some(c=>c.name==='memory-peak/startup-cold/backingStorageBytes'&&c.verdict==='unavailable'));
  assert.match(compareRecords(syntheticRecord(),c).errors.join(' '),/availability differs/);
  const changed=syntheticRecord();for(const sample of changed.runs[0].memoryWindows.find(w=>w.id==='startup-cold').heap)delete sample.raw.backingStorageSize;
  delete changed.runs[0].memoryWindows.find(w=>w.id==='startup-cold').maxima;failsWith(changed,/capability changed within run/);
});

test('active habitat checkpoint progress is a passing control for every entry and transition',()=>{
  const c=syntheticRecord();assert.equal(verdict(c).status,'pass');
  for(const run of c.runs)for(const w of run.memoryWindows.filter(w=>w.id.startsWith('entry/')||w.id.startsWith('transition/'))) {
    assert.equal(w.evidence.insideCheckpoints[0].site,w.evidence.requestedSite);
    assert.ok(w.evidence.insideCheckpoints[1].rendered>w.evidence.insideCheckpoints[0].rendered);
  }
});
test('zero/flat inside frames cannot borrow sailing or post-exit progress in any habitat window',()=>{
  for(const id of memoryWindowIds(POLICY).filter(id=>id.startsWith('entry/')||id.startsWith('transition/'))) {
    const zero=syntheticRecord();zero.runs[0].memoryWindows.find(w=>w.id===id).evidence.insideRendered=0;
    failsWith(zero,/Habitat render counters do not match active checkpoints/);
    for(const rendered of [0,10]) {
      const c=syntheticRecord(),e=c.runs[0].memoryWindows.find(w=>w.id===id).evidence;
      e.insideRenderedBefore=rendered;e.insideRendered=rendered;
      e.insideCheckpoints.forEach(p=>p.rendered=rendered);
      assert.equal(e.renderedAfter,30);failsWith(c,/Habitat lacks rendered progress while active/);
    }
  }
});
