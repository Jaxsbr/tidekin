import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {readOwnedRss,validateOwnedRss,RSS_PROTOCOL} from '../scripts/performance/rss.mjs';
import {createMemoryCoordinator} from '../scripts/performance/memory.mjs';

const owners=(...ids)=>ids.map((id,i)=>({id,type:i?'renderer':'browser'}));
function enumerations(sets) {
  let calls=0;
  return {send:async method=>{
    assert.equal(method,'SystemInfo.getProcessInfo');
    assert.ok(calls<sets.length,'Unexpected extra ownership request');
    return {processInfo:structuredClone(sets[calls++])};
  },get calls(){return calls;}};
}
const checked=raw=>validateOwnedRss(raw,{requestStartMs:raw.requestStartMs,responseEndMs:raw.responseEndMs});
async function failed(operation,pattern) {
  let error;try{await operation();}catch(e){error=e;}
  assert.ok(error,'Seeded failure must reject');assert.match(error.message,pattern);
  assert.equal(error.evidence.status,'failed');return error;
}
test('macOS batched partial read proves renderer exit then retries the complete new owned set',async()=>{
  const old=owners(101,202),fresh=owners(101,303),cdp=enumerations([old,fresh,fresh,fresh]),args=[];
  const raw=await readOwnedRss(cdp,{platform:'darwin',runPs:async input=>{
    args.push(input);
    if(args.length===1)throw Object.assign(Error('ps PID exited'),{code:1,signal:null,stdout:'101 10\n',stderr:''});
    return {stdout:'101 12\n303 25\n',stderr:''};
  }});
  assert.deepEqual(args,[['-o','pid=,rss=','-p','101,202'],['-o','pid=,rss=','-p','101,303']]);
  assert.equal(raw.attempts[0].read.result.code,1);assert.equal(raw.attempts[0].read.result.message,'ps PID exited');
  assert.equal(raw.attempts[0].read.status,'partial');assert.equal(raw.attempts[0].status,'turnover');
  assert.deepEqual(raw.attempts[0].departedPids,[202]);assert.deepEqual(raw.attempts[0].arrivedPids,[303]);
  assert.equal(raw.value,37*1024);assert.equal(checked(raw),37*1024);
});
test('earlier fully observed RSS peak survives PID turnover and a lower final complete snapshot',async()=>{
  const first=owners(101,202),last=owners(101,303),cdp=enumerations([first,last,last,last]);let reads=0;
  const raw=await readOwnedRss(cdp,{platform:'darwin',runPs:async()=>({stdout:++reads===1?'101 50\n202 90\n':'101 10\n303 20\n'})});
  assert.equal(raw.value,30*1024);assert.equal(raw.peakValue,140*1024);assert.equal(checked(raw),140*1024);
  const forged=structuredClone(raw);forged.peakValue=forged.value;
  assert.throws(()=>checked(forged),/Forged RSS sampled peak/);
});
test('missing still-live macOS PID fails immediately with retained read and fresh ownership proof',async()=>{
  const set=owners(101,202),cdp=enumerations([set,set]);let reads=0;
  const error=await failed(()=>readOwnedRss(cdp,{platform:'darwin',runPs:async()=>{reads++;return {stdout:'101 10\n'};}}),/Unreadable live owned PID: 202/);
  assert.equal(reads,1);assert.equal(cdp.calls,2);assert.equal(error.evidence.attempts.length,1);
  assert.equal(error.evidence.attempts[0].read.result.stdout,'101 10\n');
  assert.deepEqual(error.evidence.attempts[0].after.processInfo,set);
  assert.equal(error.evidence.pendingRequestCount,0);
});
test('macOS permission, signal, malformed and unrelated-process results never become turnover successes',async()=>{
  for(const result of [
    {stdout:'',stderr:'Operation not permitted',code:1},
    {stdout:'101 10\n',signal:'SIGTERM'},
    {stdout:'bad row\n'}, {stdout:'999 20\n'}, {stdout:'101 10\n101 10\n'}, {stdout:'101 0\n'},
  ]) {
    const cdp=enumerations([owners(101,202),owners(101,303)]);
    const error=await failed(()=>readOwnedRss(cdp,{platform:'darwin',runPs:async()=>result}),/Owned ps reader failed|Malformed ps|not owned|Duplicate RSS|Invalid owned RSS/);
    assert.equal(cdp.calls,2);assert.equal(error.evidence.attempts.length,1);
    assert.deepEqual(error.evidence.attempts[0].after.processInfo,owners(101,303));
    assert.equal(error.evidence.attempts[0].read.status,'failed');
  }
});
test('Linux ENOENT requires proved departure and a whole new snapshot, while live ENOENT or EACCES fail',async()=>{
  const a=owners(101,202),b=owners(101,303),cdp=enumerations([a,b,b,b]),reads=[];
  const raw=await readOwnedRss(cdp,{platform:'linux',readStatus:async pid=>{
    reads.push(pid);if(pid===202)throw Object.assign(Error('gone'),{code:'ENOENT'});
    return 'Name: owned\nVmRSS: 20 kB\n';
  }});
  assert.deepEqual(reads,[101,202,101,303]);assert.equal(checked(raw),40*1024);
  assert.equal(raw.attempts[0].read.reads[1].error.code,'ENOENT');
  for(const [code,after,pattern] of [['ENOENT',a,/Unreadable live owned PID/],['EACCES',b,/non-exit reason/]]) {
    const c=enumerations([a,after]);
    const error=await failed(()=>readOwnedRss(c,{platform:'linux',readStatus:async pid=>{
      if(pid===202)throw Object.assign(Error('reader failure'),{code});return 'VmRSS: 20 kB\n';
    }}),pattern);
    assert.equal(c.calls,2);assert.equal(error.evidence.attempts[0].read.reads[1].error.code,code);
  }
});
test('perpetual PID turnover stops at three complete-snapshot attempts and retains every attempt',async()=>{
  const sets=Array.from({length:6},(_,i)=>owners(101,200+i)),cdp=enumerations(sets);let reads=0;
  const error=await failed(()=>readOwnedRss(cdp,{platform:'darwin',runPs:async args=>{
    reads++;return {stdout:args[3].split(',').map(pid=>`${pid} 10\n`).join('')};
  }}),/retry bound/);
  assert.equal(reads,RSS_PROTOCOL.maxAttempts);assert.equal(cdp.calls,6);
  assert.equal(error.evidence.attempts.length,3);assert.ok(error.evidence.attempts.every(a=>a.status==='turnover'));
});
test('deadline retains unresolved CDP ownership request and never schedules more work after it settles',async()=>{
  let finish,calls=0,reads=0;
  const cdp={send:()=>{calls++;return new Promise(resolve=>{finish=resolve;});}};
  const error=await failed(()=>readOwnedRss(cdp,{platform:'darwin',protocol:{...RSS_PROTOCOL,deadlineMs:30},runPs:async()=>{reads++;return {};}}),/deadline exceeded/);
  assert.equal(error.pendingRequestCount,1);assert.equal(error.evidence.attempts[0].before.processInfo,undefined);
  finish({processInfo:owners(101)});await delay(40);
  assert.equal(calls,1);assert.equal(reads,0);assert.equal(error.evidence.attempts[0].before.processInfo,undefined,'Failure snapshot remains immutable');
});
test('deadline aborts native reader scope and retains Linux per-PID requests already issued',async()=>{
  const cdp=enumerations([owners(101,202)]);let finished,signal;
  const error=await failed(()=>readOwnedRss(cdp,{platform:'linux',protocol:{...RSS_PROTOCOL,deadlineMs:30},readStatus:async(pid,options)=>{
    signal=options.signal;if(pid===101)return 'VmRSS: 10 kB\n';return new Promise(resolve=>{finished=resolve;});
  }}),/deadline exceeded/);
  assert.equal(signal.aborted,true);assert.equal(error.pendingRequestCount,1);
  assert.equal(error.evidence.attempts[0].read.reads[0].rssKiB,10);
  assert.equal(error.evidence.attempts[0].read.reads[1].pid,202);
  finished('VmRSS: 20 kB\n');await delay(30);assert.equal(cdp.calls,1);
});
test('failed inner RSS request prevents sampler drain, later timing and GC even after its outer reader rejects',async()=>{
  const windows=[];let finish,calls=0,operated=false;
  const scope=createMemoryCoordinator({windows,timedIntervals:[],sampling:{heapIntervalMs:10,rssIntervalMs:25,maxGapMs:1000,requestTimeoutMs:100,tailMs:100,minHeapSamples:10,minRssSamples:4,maxWindowMs:500},
    readHeap:async()=>({usedSize:1,totalSize:2}),readRss:()=>readOwnedRss({send:()=>{calls++;return new Promise(resolve=>{finish=resolve;});}},
      {platform:'darwin',protocol:{...RSS_PROTOCOL,deadlineMs:30},runPs:async()=>({stdout:'101 10\n'})})});
  await assert.rejects(scope.peak('startup-cold',async()=>{operated=true;}),/Owned RSS snapshot failed/);
  assert.equal(operated,false);assert.equal(windows[0].drained,false);
  assert.equal(windows[0].rss[0].raw.pendingRequestCount,1);assert.equal(windows[0].rss[0].unresolved,true);
  await assert.rejects(scope.gc(async()=>{}),/overlaps failed/);
  await assert.rejects(scope.timed('later',async()=>{}),/overlaps failed/);
  finish({processInfo:owners(101)});await delay(40);assert.equal(calls,1);
});
test('validator rejects forged membership, dropped retry evidence, partial sums and changed retry protocol',async()=>{
  const a=owners(101,202),b=owners(101,303),cdp=enumerations([a,b,b,b]);let reads=0;
  const raw=await readOwnedRss(cdp,{platform:'darwin',runPs:async()=>({stdout:++reads===1?'101 10\n':'101 10\n303 20\n'})});
  assert.equal(checked(raw),30*1024);
  for(const [mutate,pattern] of [
    [r=>{r.attempts[0].after.processInfo=a;},/missing live process/],
    [r=>{r.attempts[0].departedPids=[];},/turnover summary forged/],
    [r=>{r.attempts.pop();},/final membership proof/],
    [r=>{r.value=10*1024;},/Forged RSS final sum/],
    [r=>{r.protocol.maxAttempts=4;},/retry protocol changed/],
    [r=>{r.attempts[1].read.args[3]='101,999';},/command\/PID provenance/],
  ]) {const seeded=structuredClone(raw);mutate(seeded);assert.throws(()=>checked(seeded),pattern);}
});
