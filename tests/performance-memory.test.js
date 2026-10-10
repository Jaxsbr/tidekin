import {runInNewContext} from 'node:vm';
import {observeActiveHabitat} from '../scripts/performance/browser.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {createMemoryCoordinator,readOwnedRss,validateMemoryWindow,MEMORY_SAMPLING} from '../scripts/performance/memory.mjs';

// CPU-only readers; shorter protocol is explicit test data, never production policy.
const sampling={heapIntervalMs:10,rssIntervalMs:25,maxGapMs:1000,requestTimeoutMs:100,
  tailMs:100,minHeapSamples:10,minRssSamples:4,maxWindowMs:500};
function fixture(overrides={}) {
  const windows=[],timedIntervals=[],calls=[];
  const heap={usedSize:40,totalSize:100,embedderHeapUsedSize:3,backingStorageSize:80,extraRawField:7};
  const rss={value:1024,processInfo:[{id:123,type:'renderer'}],processes:[{pid:123,type:'renderer',rssBytes:1024}],method:'CPU adapter RSS'};
  const scope=createMemoryCoordinator({windows,timedIntervals,sampling,
    readHeap:async()=>{calls.push({kind:'heap',time:performance.now()});return structuredClone(heap);},
    readRss:async()=>{calls.push({kind:'rss',time:performance.now()});return readOwnedRss({send:async()=>({processInfo:rss.processInfo})},{platform:'linux',readStatus:async()=> 'VmRSS: 1 kB\n'});},...overrides});
  return {windows,timedIntervals,calls,scope};
}
test('non-GC sampler brackets real asynchronous work, retains payloads and stops before later timing/GC',async()=>{
  const f=fixture();let max=40;
  await f.scope.timed('first',()=>delay(10));
  await f.scope.peak('CPU-only',async()=>{
    assert.equal(f.scope.mode,'peak');await delay(30);max=70;await delay(30);return {value:max};
  });
  assert.equal(f.scope.mode,'idle');assert.equal(f.windows[0].status,'complete');
  assert.equal(f.windows[0].heap[0].raw.extraRawField,7);assert.equal(f.windows[0].requestedGc,false);
  assert.deepEqual(validateMemoryWindow(f.windows[0],{sampling,timedIntervals:f.timedIntervals}),f.windows[0].maxima);
  const count=f.calls.length;
  await f.scope.timed('last',()=>delay(40));
  let gcCalls=0;await f.scope.gc(async()=>{gcCalls++;await delay(40);});
  assert.equal(gcCalls,1);assert.equal(f.calls.length,count,'No reader may continue after sampler settlement');
  assert.ok(f.calls.every(c=>!f.timedIntervals.some(t=>c.time>=t.startMs&&c.time<t.endMs)));
});
test('real polling observes a transient used/backing peak rather than the post-work value',async()=>{
  let peak=false;
  const f=fixture({readHeap:async()=>({usedSize:peak?90:40,totalSize:100,backingStorageSize:peak?160:80})});
  await f.scope.peak('transient',async()=>{peak=true;await delay(40);peak=false;await delay(30);return {};});
  assert.equal(f.windows[0].heap.at(-1).raw.usedSize,40);
  assert.equal(f.windows[0].maxima.heapBytes.value,90);assert.equal(f.windows[0].maxima.backingStorageBytes.value,160);
});
test('active memory scopes reject both timed work and GC before those operations execute',async()=>{
  const f=fixture();let forbidden=0;
  await f.scope.peak('guarded',async()=>{
    await assert.rejects(f.scope.timed('forbidden',async()=>{forbidden++;}),/overlaps peak/);
    await assert.rejects(f.scope.gc(async()=>{forbidden++;}),/overlaps peak/);
    await assert.rejects(f.scope.peak('nested',async()=>{forbidden++;}),/overlaps peak/);
    await delay(30);return {};
  });
  assert.equal(forbidden,0);assert.equal(f.timedIntervals.length,0);assert.equal(f.windows.length,1);
});
test('reader rejection prevents phase work, retains failure, stops workers and bars later scopes',async()=>{
  let operated=false;
  const f=fixture({readHeap:async()=>{throw Error('seeded heap failure');}});
  await assert.rejects(f.scope.peak('failed',async()=>{operated=true;}),/seeded heap failure/);
  assert.equal(operated,false);assert.equal(f.windows[0].status,'failed');assert.equal(f.windows[0].samplerStopped,true);
  assert.match(f.windows[0].heap[0].error,/seeded heap failure/);
  const count=f.calls.length;await delay(40);assert.equal(f.calls.length,count);
  await assert.rejects(f.scope.gc(async()=>{}),/overlaps failed/);
});
test('mid-phase failed reader stops without waiting for the operation deadline',async()=>{
  let reads=0;
  const f=fixture({readHeap:async()=>{if(++reads===3)throw Error('seeded mid-phase failure');return {usedSize:1,totalSize:2};}});
  const started=performance.now();
  await assert.rejects(f.scope.peak('failed',()=>delay(250)),/seeded mid-phase failure/);
  assert.ok(performance.now()-started<200);assert.equal(f.scope.mode,'failed');
  const count=reads;await delay(50);assert.equal(reads,count);
});
test('unresolved reader cannot drain or permit post-GC/timing; raw request timeout retained',async()=>{
  const f=fixture({readHeap:()=>new Promise(()=>{})});
  await assert.rejects(f.scope.peak('stalled',()=>delay(1)),/coverage bound/);
  assert.equal(f.windows[0].drained,false);assert.equal(f.scope.mode,'failed');
  await assert.rejects(f.scope.timed('later',()=>delay(1)),/overlaps failed/);
});
test('operation failure and bounded deadline retain stopped raw diagnostics',async()=>{
  for(const operation of [async()=>{throw Error('seeded operation failure');},()=>new Promise(()=>{})]) {
    const f=fixture({sampling:{...sampling,maxWindowMs:40}});
    await assert.rejects(f.scope.peak('operation',operation),/operation failure|bounded deadline/);
    assert.equal(f.windows[0].status,'failed');assert.equal(f.windows[0].samplerStopped,true);assert.equal(f.windows[0].drained,true);
  }
});
test('owned RSS reads only numeric CDP-owned PIDs and retains per-process evidence',async()=>{
  const pids=[],processInfo=[{id:123,type:'browser',cpuTime:2},{id:456,type:'renderer',cpuTime:1}];
  const cdp={send:async method=>{assert.equal(method,'SystemInfo.getProcessInfo');return {processInfo};}};
  const r=await readOwnedRss(cdp,{platform:'linux',readStatus:async pid=>{pids.push(pid);return `VmRSS: ${pid===123?10:20} kB\n`;}});
  assert.deepEqual(pids,[123,456]);assert.equal(r.value,30*1024);assert.deepEqual(r.attempts[0].before.processInfo,processInfo);assert.deepEqual(r.attempts[0].after.processInfo,processInfo);
  assert.match(r.method,/shared-page double counting/);
  for(const info of [[{id:'123',type:'browser'}],[{id:-1}],[{id:123},{id:123}],[]]) {
    let reads=0;await assert.rejects(readOwnedRss({send:async()=>({processInfo:info})},{platform:'linux',readStatus:async()=>{reads++;return 'VmRSS: 1 kB\n';}}));
    assert.equal(reads,0);
  }
  await assert.rejects(readOwnedRss(cdp,{platform:'linux',readStatus:async()=> 'invalid RSS'}),/Owned proc reader failed/);
});

test('production cadence covers even a short operation with required tail samples',async()=>{
  const f=fixture({sampling:MEMORY_SAMPLING});
  await f.scope.peak('short',async()=>({testOnly:true}));
  const w=f.windows[0];assert.equal(w.status,'complete');
  assert.ok(w.heap.length>=10&&w.rss.length>=4);assert.ok(w.endMs-w.operationEndMs>=1000);
  assert.deepEqual(validateMemoryWindow(w),w.maxima);
});

function habitatAdapter(site,{frames=100,advance=30,loseAttempt=false,actualSite=site}={}) {
  const events=[];let rendered=frames;
  const state={cleanup:{attempt:{siteId:actualSite,status:'active',air:24}}};
  const surface={window:{__tidekin:{getState:()=>structuredClone(state),getMetrics:()=>({activeRenderedFrames:rendered,paused:false})}},
    document:{visibilityState:'visible',hasFocus:()=>true}};
  const page={evaluate:async callback=>{
    events.push({action:'snapshot',site:state.cleanup.attempt?.siteId,rendered});
    return runInNewContext(`(${callback.toString()})()`,surface);
  },waitForTimeout:async ms=>{assert.equal(ms,500);events.push({action:'wait-active'});rendered+=advance;if(loseAttempt)state.cleanup.attempt=null;}};
  return {page,events,exit:()=>{state.cleanup.attempt=null;rendered+=500;}};
}
test('collector captures two actual active-state counters before exit for every habitat',async()=>{
  for(const site of ['home-reef','sheltered-cove','salvage:home-pearls','salvage:horizon-wreck']) {
    const f=habitatAdapter(site),result=await observeActiveHabitat(f.page,site);
    f.exit(); // Post-exit rendering must not enter the stored inside evidence.
    assert.equal(result.evidence.insideRenderedBefore,100);assert.equal(result.evidence.insideRendered,130);
    assert.ok(result.evidence.insideCheckpoints.every(p=>p.site===site&&p.status==='active'&&p.air>0));
    assert.deepEqual(f.events.map(e=>e.action),['snapshot','wait-active','snapshot']);
    assert.equal(result.state.cleanup.attempt.siteId,site);
  }
});
test('collector rejects zero and stalled active rendering instead of counting surrounding frames',async()=>{
  for(const frames of [0,100]) {
    const f=habitatAdapter('home-reef',{frames,advance:0});
    await assert.rejects(observeActiveHabitat(f.page,'home-reef'),/Habitat lacks rendered progress while active/);
    f.exit();assert.equal(f.events[1].action,'wait-active');
  }
});
test('advancing frames at another or departed habitat cannot satisfy active checkpoint proof',async()=>{
  const wrong=habitatAdapter('home-reef',{actualSite:'sheltered-cove'});
  await assert.rejects(observeActiveHabitat(wrong.page,'home-reef'),/not active at requested site/);
  const departed=habitatAdapter('home-reef',{loseAttempt:true});
  await assert.rejects(observeActiveHabitat(departed.page,'home-reef'),/Invalid memory inside air/);
});
