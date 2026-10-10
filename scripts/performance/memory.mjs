import { setTimeout as delay } from 'node:timers/promises';
import { digest } from './evidence.mjs';
import { validateOwnedRss } from './rss.mjs';
export {readOwnedRss} from './rss.mjs';

export const MEMORY_SAMPLING=Object.freeze({heapIntervalMs:100,rssIntervalMs:250,maxGapMs:1000,
  requestTimeoutMs:1000,tailMs:1000,minHeapSamples:10,minRssSamples:4,maxWindowMs:120000});
export const MEMORY_KEYS=['heapBytes','backingStorageBytes','processRssBytes'];
export const NO_VRAM={status:'unavailable',reason:'No reliable physical per-scene VRAM API; RSS and buffer estimates are not VRAM.'};
export function memoryWindowIds(policy) {
  return [...Array.from({length:policy.transitionCycles},(_,i)=>`transition/${i+1}/${policy.habitats[i%policy.habitats.length]}`),
    'startup-cold','startup-warm',...['waterwheel','crane','greenhouse','sail','beacon'].map(id=>`build/${id}`),
    ...policy.habitats.map(id=>`entry/${id}`)];
}

// One coordinator guards both execution and raw access. An active sampler is
// never permitted during timed work or requested GC. Failed windows remain raw.
export function createMemoryCoordinator({readHeap,readRss,windows,timedIntervals,gcIntervals=[],clock=()=>performance.now(),
  sleep=(ms,signal)=>delay(ms,undefined,{signal}),sampling=MEMORY_SAMPLING}) {
  let mode='idle';
  async function wait(ms,signal) {
    const due=clock()+ms;
    do {await sleep(Math.max(1,Math.ceil(due-clock())),signal);}while(clock()<due);
  }
  const requireIdle=()=>{if(mode!=='idle')throw Error(`Memory scope overlaps ${mode}`);};
  const timed=async(id,operation)=>{
    requireIdle();mode='timed';const row={id,startMs:clock()};timedIntervals.push(row);
    try{return await operation();}finally{row.endMs=clock();mode='idle';}
  };
  const gc=async(id,operation)=>{
    if(typeof id==='function'){operation=id;id='manual';}
    requireIdle();mode='gc';const row={id,startMs:clock()};gcIntervals.push(row);
    try{return await operation();}finally{row.endMs=clock();mode='idle';}
  };
  async function peak(id,operation) {
    requireIdle();mode='peak';
    const row={id,startMs:clock(),sampling:{...sampling},clock:'Node performance.now monotonic milliseconds',requestedGc:false,gpuVramBytes:{...NO_VRAM},
      heap:[],rss:[],errors:[],status:'running',samplerStopped:false,drained:false};windows.push(row);
    const controller=new AbortController(),pending=new Set();let workers=[];
    let rejectSampling;const samplingFailure=new Promise((_,reject)=>{rejectSampling=reject;});
    // Attach before readers start, including failures before the operation.
    samplingFailure.catch(()=>{});
    const fail=e=>{row.errors.push(String(e));rejectSampling(e);controller.abort();};
    async function request(kind) {
      if(mode!=='peak')throw Error('Memory request outside its peak window');
      const sample={requestStartMs:clock()};row[kind].push(sample);
      let timeout;
      const raw=Promise.resolve().then(kind==='heap'?readHeap:readRss);pending.add(raw);
      raw.then(()=>pending.delete(raw),()=>pending.delete(raw));
      try {
        sample.raw=await Promise.race([raw,new Promise((_,reject)=>{
          timeout=setTimeout(()=>reject(Error('Memory request exceeded coverage bound')),sampling.requestTimeoutMs);
        })]);
      }catch(e){sample.error=String(e);if(e.evidence)sample.raw=e.evidence;sample.unresolved=(e.pendingRequestCount??0)>0;fail(Error(`${kind}: ${e}`,{cause:e}));}
      finally{clearTimeout(timeout);sample.responseEndMs=clock();}
    }
    async function poll(kind,interval) {
      try {
        while(!controller.signal.aborted){
          await wait(interval,controller.signal);
          if(!controller.signal.aborted)await request(kind);
        }
      }catch(e){if(!controller.signal.aborted){fail(Error(`poll ${kind}: ${e}`,{cause:e}));}}
    }
    try {
      await Promise.all([request('heap'),request('rss')]);
      if(row.errors.length)throw Error('Initial memory readers failed');
      workers=[poll('heap',sampling.heapIntervalMs),poll('rss',sampling.rssIntervalMs)];
      row.operationStartMs=clock();
      let deadline;
      try {
        row.evidence=await Promise.race([samplingFailure,Promise.resolve().then(operation),new Promise((_,reject)=>{
          deadline=setTimeout(()=>reject(Error('Memory phase exceeded bounded deadline')),sampling.maxWindowMs);
        })]);
      }finally{clearTimeout(deadline);row.operationEndMs=clock();}
      await Promise.race([wait(sampling.tailMs,controller.signal),samplingFailure]);
    }catch(e){row.errors.push(String(e));}
    finally {
      controller.abort();await Promise.all(workers);
      if(!pending.size&&!row.errors.length)await Promise.all([request('heap'),request('rss')]);
      row.endMs=clock();row.samplerStopped=true;row.drained=pending.size===0&&!row.rss.some(s=>s.unresolved);
      // An unresolved CDP request forces failure and browser closure; it cannot
      // spill into a subsequent timed/GC operation under a passing disposition.
      try{row.maxima=validateMemoryWindow(row,{sampling});row.status='complete';}
      catch(e){row.status='failed';row.errors.push(String(e));}
      mode=row.status==='complete'?'idle':'failed';
    }
    if(row.status!=='complete')throw Error(`Memory window failed ${id}: ${row.errors.join('; ')}`);
    return row.evidence;
  }
  return {timed,gc,peak,get mode(){return mode;}};
}

function assert(ok,message){if(!ok)throw Error(message);}
function finite(n,name,positive=false){assert(Number.isFinite(n)&&n>=0&&(!positive||n>0),`Invalid memory ${name}`);}
export function validateMemoryWindow(row,{sampling=MEMORY_SAMPLING,timedIntervals=[]}={}) {
  assert(row&&typeof row.id==='string','Missing memory window');
  assert(row.clock==='Node performance.now monotonic milliseconds','Memory monotonic clock identity missing');
  assert(digest(row.sampling)===digest(sampling),'Memory sampling protocol changed');
  assert(row.requestedGc===false&&row.samplerStopped===true&&row.drained===true,'Memory sampler not stopped/drained or requested GC');
  assert(row.errors?.length===0,'Memory sampling errors');
  for(const key of ['startMs','operationStartMs','operationEndMs','endMs'])finite(row[key],key);
  assert(row.startMs<=row.operationStartMs&&row.operationStartMs<=row.operationEndMs&&row.endMs>=row.operationEndMs+sampling.tailMs,'Memory boundary/tail coverage missing');
  assert(row.endMs-row.startMs<=sampling.maxWindowMs+sampling.tailMs+sampling.maxGapMs*3,'Memory window exceeded deadline');
  assert(timedIntervals.every(t=>row.endMs<=t.startMs||row.startMs>=t.endMs),'Memory window overlaps timed warmup/frame/CPU work');
  assert(row.gpuVramBytes?.status==='unavailable'&&typeof row.gpuVramBytes.reason==='string','Memory VRAM capability missing');
  const values={heapBytes:[],backingStorageBytes:[],processRssBytes:[]};let backingSupported;
  for(const [kind,min,interval] of [['heap',sampling.minHeapSamples,sampling.heapIntervalMs],['rss',sampling.minRssSamples,sampling.rssIntervalMs]]) {
    const samples=row[kind];assert(Array.isArray(samples)&&samples.length>=min,`Memory ${kind} samples missing`);
    let previousEnd=row.startMs,method;
    for(const [i,s] of samples.entries()) {
      finite(s.requestStartMs,'request start');finite(s.responseEndMs,'response end');
      assert(!s.error&&s.requestStartMs>=previousEnd&&s.responseEndMs>=s.requestStartMs&&s.responseEndMs<=row.endMs,'Invalid/overlapping memory requests');
      assert(s.responseEndMs-previousEnd<=sampling.maxGapMs,'Memory sampling gap exceeds 1000 ms');
      assert(s.responseEndMs-s.requestStartMs<=sampling.requestTimeoutMs,'Memory request latency exceeded');
      if(i&&i<samples.length-1)assert(s.requestStartMs-previousEnd>=interval-.01,'Memory poll faster than declared interval');
      previousEnd=s.responseEndMs;
      if(kind==='heap') {
        finite(s.raw?.usedSize,'raw usedSize');finite(s.raw?.totalSize,'raw totalSize',true);
        assert(s.raw.usedSize<=s.raw.totalSize,'Heap usage exceeds total size');
        values.heapBytes.push(s.raw.usedSize);
        if(s.raw.embedderHeapUsedSize!==undefined)finite(s.raw.embedderHeapUsedSize,'embedder heap');
        const supported=s.raw.backingStorageSize!==undefined;
        if(backingSupported===undefined)backingSupported=supported;
        assert(backingSupported===supported,'Memory backing capability changed within window');
        if(supported){finite(s.raw.backingStorageSize,'raw backing');values.backingStorageBytes.push(s.raw.backingStorageSize);}
      }else {
        const peak=validateOwnedRss(s.raw,{requestStartMs:s.requestStartMs,responseEndMs:s.responseEndMs});
        method??=s.raw.method;assert(method===s.raw.method,'RSS sampling method changed');values.processRssBytes.push(peak);
      }
    }
    assert(samples[0].responseEndMs<=row.operationStartMs&&samples.at(-1).responseEndMs>=row.operationEndMs+sampling.tailMs,'Memory operation not bracketed by samples');
    assert(row.endMs-previousEnd<=sampling.maxGapMs,'Memory final gap exceeded');
  }
  const maxima=Object.fromEntries(MEMORY_KEYS.map(key=>[key,values[key].length?{status:'measured',value:Math.max(...values[key]),method:key==='processRssBytes'?row.rss[0].raw.method:'CDP Runtime.getHeapUsage without requested GC'}:
    {status:'unavailable',reason:'CDP Runtime.getHeapUsage has no backingStorageSize'}]));
  if(row.maxima!==undefined)assert(digest(row.maxima)===digest(maxima),'Forged memory maxima');
  return maxima;
}

export function validateHabitatRenderProgress(e,site) {
  const points=e?.insideCheckpoints;
  assert(Array.isArray(points)&&points.length===2,'Active habitat render checkpoints missing');
  for(const p of points) {
    finite(p.rendered,'inside rendered');finite(p.air,'inside air',true);
    finite(p.requestStartMs,'inside request start');finite(p.responseEndMs,'inside response end');
    assert(p.responseEndMs>=p.requestStartMs,'Invalid active habitat checkpoint boundary');
    assert(p.site===site&&p.status==='active'&&p.visible===true&&p.focused===true&&p.paused===false,
      'Habitat render checkpoint not active at requested site');
  }
  assert(points[1].requestStartMs>=points[0].responseEndMs,'Active habitat checkpoints overlap');
  assert(e.insideRenderedBefore===points[0].rendered&&e.insideRendered===points[1].rendered,
    'Habitat render counters do not match active checkpoints');
  assert(points[1].rendered>points[0].rendered,'Habitat lacks rendered progress while active');
}

export function validateMemoryRound(run,policy) {
  const expected=memoryWindowIds(policy),windows=run.memoryWindows;
  assert(Array.isArray(windows)&&windows.length===expected.length&&windows.every((w,i)=>w.id===expected[i]),'Missing/duplicate memory phase');
  assert(run.timingBrowserClosed===true,'Timed browser not closed before fresh memory round');
  assert(run.memoryBrowser?.fixture?.sha256===run.developedFixture?.sha256,'Memory fixture identity changed');
  assert(run.memoryBrowser?.fresh===true&&run.memoryBrowser.version===run.version&&run.memoryBrowser.closed===true&&run.memoryBrowser.executableSha256===run.executableSha256&&digest(run.memoryBrowser.graphics)===digest(run.graphics),'Fresh memory browser identity/closure missing');
  const timed=run.timedIntervals;
  assert(Array.isArray(timed)&&timed.length===policy.scenarios.length+1&&new Set(timed.map(t=>t.id)).size===timed.length,'Timed exclusion intervals missing');
  for(const id of [...policy.scenarios,'menus'])assert(timed.some(t=>t.id===id),'Timed interval identity missing');
  for(const t of timed){finite(t.startMs,'timed start');finite(t.endMs,'timed end');assert(t.endMs>t.startMs,'Invalid timed interval');
    if(t.id!=='menus')assert(t.endMs-t.startMs>=policy.warmupMs+policy.sampleMs,'Timed exclusion interval shortened');}
  const orderedTimed=[...timed].sort((a,b)=>a.startMs-b.startMs);
  assert(orderedTimed.every((t,i)=>!i||t.startMs>=orderedTimed[i-1].endMs),'Timed intervals overlap');
  const timedEnd=Math.max(...timed.map(t=>t.endMs));
  const gc=run.gcIntervals,gcIds=['before',...Array.from({length:policy.transitionCycles},(_,i)=>`cycle-${i+1}`),'after'];
  assert(Array.isArray(gc)&&gc.length===gcIds.length&&gc.every((g,i)=>g.id===gcIds[i]),'GC checkpoint intervals missing');
  for(const g of gc){finite(g.startMs,'GC start');finite(g.endMs,'GC end');assert(g.endMs>=g.startMs&&g.startMs>=timedEnd,'Invalid GC interval');}
  const summaries={};let backingStatus;
  for(const id of expected) {
    const w=windows.find(w=>w.id===id);assert(w?.status==='complete',`Memory phase failed/missing: ${id}`);
    assert(w.startMs>=timedEnd,'Memory sampling preceded completion of timed scenarios');
    summaries[id]=validateMemoryWindow(w,{timedIntervals:timed});
    backingStatus??=summaries[id].backingStorageBytes.status;
    assert(backingStatus===summaries[id].backingStorageBytes.status,'Memory backing capability changed within run');
    assert(gc.every(g=>w.endMs<=g.startMs||w.startMs>=g.endMs),'Requested GC overlaps memory sampling');
    const e=w.evidence;
    finite(e?.renderedBefore,'rendered before');finite(e?.renderedAfter,'rendered after',true);
    assert(e?.renderedAfter>e.renderedBefore&&e.visible===true&&e.focused===true&&e.paused===false,'Memory phase lacks real foreground render progress');
    if(id.startsWith('startup-'))assert(e.menuVisible===true&&e.ready===true,'Memory startup readiness missing');
    else if(id.startsWith('build/'))assert(e.upgrade===id.slice(6)&&e.built===true&&e.outcome?.ok===true,'Memory construction outcome missing');
    else {
      const site=id.startsWith('entry/')?id.slice(6):id.split('/').slice(2).join('/');
      finite(e.air,'habitat air',true);
      assert(e.site===site&&e.requestedSite===site&&e.status==='active'&&e.air>0&&e.exited===true,'Memory habitat entry/exit evidence missing');
      validateHabitatRenderProgress(e,site);
      finite(e.exitRequestStartMs,'habitat exit boundary');
      assert(e.insideCheckpoints[0].requestStartMs>=w.operationStartMs&&e.insideCheckpoints[1].responseEndMs<=e.exitRequestStartMs&&e.exitRequestStartMs<=w.operationEndMs,
        'Active habitat render checkpoints outside entry/before-exit scope');
    }
  }
  const ordered=[...windows].sort((a,b)=>a.startMs-b.startMs);
  assert(ordered.every((w,i)=>!i||w.startMs>=ordered[i-1].endMs),'Memory phase windows overlap');
  return summaries;
}
