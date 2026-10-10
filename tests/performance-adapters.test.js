import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm,lstat} from 'node:fs/promises';
import {mkdirSync,writeFileSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import * as Game from '../src/game.js';
import {sha256} from '../scripts/performance/evidence.mjs';
import {POLICY} from '../scripts/performance/policy.mjs';
import {browserLaunchPlan,measureBrowserRun,startMemoryBrowser} from '../scripts/performance/browser.mjs';
import {measurePair} from '../scripts/performance/pair.mjs';
import {collectRecord} from '../scripts/performance/collect.mjs';

// These are CPU adapters with injected Playwright/servers, never browser runs.
test('fingerprinted hardware override and bundled software path are actual launch paths',async()=>{
  const reads=[],launches=[],closes=[];
  const chromium={executablePath:()=>'/manufactured/bundled-chromium',launch:async options=>{
    launches.push(options);return {version:()=> 'CPU-adapter-only',newContext:async()=>{throw Error('seeded context failure');},close:async()=>{closes.push('browser');}};
  }};
  assert.equal(browserLaunchPlan({chromium,profile:'ci-software'}).options.executablePath,chromium.executablePath());
  const result=await measureBrowserRun({root:process.cwd(),url:'http://unused',policy:POLICY,profile:'hardware',repeat:1,
    browserExecutable:'/manufactured/custom-chrome'}, {chromium,Game,readBinary:async path=>{reads.push(path);return Buffer.from('inert test binary');}});
  assert.deepEqual(reads,['/manufactured/custom-chrome']);assert.equal(launches[0].executablePath,reads[0]);
  assert.equal(launches[0].channel,'chrome');assert.equal(result.executableSha256,sha256('inert test binary'));
  assert.equal(result.status,'failed');assert.match(result.failure,/seeded context failure/);assert.equal(result.browserClosed,true);assert.deepEqual(closes,['browser']);
});
test('binary read failure precedes launch, and browser close failure is explicit',async()=>{
  let launched=false;
  await assert.rejects(measureBrowserRun({root:process.cwd(),policy:POLICY,profile:'hardware',repeat:1,browserExecutable:'/missing'},
    {Game,chromium:{launch:async()=>{launched=true;}},readBinary:async()=>{throw Error('seeded binary read failure');}}),/seeded binary read failure/);
  assert.equal(launched,false);
  const result=await measureBrowserRun({root:process.cwd(),policy:POLICY,profile:'hardware',repeat:1,browserExecutable:'/inert'},
    {Game,readBinary:async()=>Buffer.from('inert'),chromium:{launch:async()=>({version:()=> 'adapter',newContext:async()=>{throw Error('seeded context failure');},close:async()=>{throw Error('seeded close failure');}})}});
  assert.equal(result.status,'failed');assert.equal(result.browserClosed,false);assert.match(result.errors.join(' '),/Browser cleanup.*seeded close failure/);
});
test('post-launch metadata failure still closes the owned browser',async()=>{
  let closed=false;
  const result=await measureBrowserRun({root:process.cwd(),policy:POLICY,profile:'hardware',repeat:1,browserExecutable:'/inert'},
    {Game,readBinary:async()=>Buffer.from('inert'),chromium:{launch:async()=>({version:()=>{throw Error('seeded version failure');},close:async()=>{closed=true;}})}});
  assert.equal(closed,true);assert.equal(result.status,'failed');assert.equal(result.browserClosed,true);assert.match(result.failure,/seeded version failure/);
});
test('context close rejection does not suppress owned browser close',async()=>{
  const closes=[];
  const context={addInitScript:async()=>{},newPage:async()=>{throw Error('seeded page failure');},close:async()=>{closes.push('context');throw Error('seeded context close failure');}};
  const result=await measureBrowserRun({root:process.cwd(),policy:POLICY,profile:'hardware',repeat:1,browserExecutable:'/inert'},
    {Game,readBinary:async()=>Buffer.from('inert'),chromium:{launch:async()=>({version:()=> 'adapter',newContext:async()=>context,close:async()=>{closes.push('browser');}})}});
  assert.deepEqual(closes,['context','browser']);assert.equal(result.status,'failed');assert.equal(result.browserClosed,true);
  assert.match(result.failure,/seeded page failure/);assert.match(result.errors.join(' '),/Context cleanup.*seeded context close failure/);
});

const BASE='a'.repeat(40),HEAD='b'.repeat(40);
async function pairFixture(t,overrides={}) {
  const root=await mkdtemp(join(tmpdir(),'tidekin-performance-adapter-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const events=[];
  const options={baseRoot:join(root,'base'),headRoot:join(root,'head'),outDir:join(root,'evidence'),expectedBase:BASE,expectedHead:HEAD,session:'CPU-adapter-only'};
  const side=path=>path.startsWith(options.baseRoot)?'base':'head';
  const api={
    prepare:async o=>{const s=side(o.root);events.push(`prepare-${s}`);return {kind:'adapter-test',source:{commit:s==='base'?BASE:HEAD,matchesCommit:true,dirty:false},
      build:{},protocol:{repeats:3},runs:[],errors:[],status:'prepared'};},
    serveBuild:async path=>{const s=side(path);events.push(`serve-${s}`);return {url:`http://127.0.0.1/${s}`,close:async()=>{events.push(`close-${s}`);}};},
    verifyServedBuild:async url=>{events.push(`verify-${url.split('/').at(-1)}`);return [];},
    measureBrowserRun:async o=>{events.push(`run-${side(o.root)}-${o.repeat}`);return {kind:'adapter-test',repeat:o.repeat,status:'complete',browserClosed:true,errors:[]};},
    finish:async (r,o)=>{events.push(`finish-${side(o.root)}`);r.status=r.errors.length?'failed':'complete';},
    compareRecords:()=>({schema:1,status:'pass',checks:[],errors:[]}), // Settlement failures must override this deliberate pass.
    ...overrides,
  };
  return {options,api,events,read:async name=>JSON.parse(await readFile(join(options.outDir,name),'utf8'))};
}
async function assertFailure(f,result,pattern) {
  assert.equal(result.status,'fail');assert.match(result.errors.join(' '),pattern);
  const manifest=await f.read('manifest.json');assert.equal(manifest.status,'fail');assert.match(manifest.errors.join(' '),pattern);
  assert.equal((await f.read('comparison.json')).status,'fail');
  assert.ok((await readFile(join(f.options.outDir,'summary.md'),'utf8')).includes('FAIL'));
  assert.ok((await readdir(f.options.outDir)).includes('base.json'));assert.ok((await readdir(f.options.outDir)).includes('head.json'));
}
test('CPU pair adapter counterbalances AB/BA and closes both servers',async t=>{
  const f=await pairFixture(t);const result=await measurePair(f.options,f.api);assert.equal(result.status,'pass');
  assert.deepEqual(f.events.filter(e=>e.startsWith('run-')),['run-base-1','run-head-1','run-head-2','run-base-2','run-base-3','run-head-3']);
  assert.deepEqual(f.events.filter(e=>e.startsWith('close-')),['close-base','close-head']);
  assert.equal((await f.read('manifest.json')).status,'pass');assert.equal((await f.read('base.json')).runs.length,3);
  assert.equal((await f.read('retention.json')).status,'compacted');assert.ok(!(await readdir(f.options.outDir)).some(name=>/-repeat-\d+\.json$/.test(name)));
});
test('prepare rejection retains expected identities and failed placeholders',async t=>{
  const f=await pairFixture(t,{prepare:async()=>{throw Error('seeded prepare failure');}});
  const result=await measurePair(f.options,f.api);await assertFailure(f,result,/prepare-base.*seeded prepare failure/);
  assert.equal((await f.read('manifest.json')).expectedBase,BASE);assert.equal((await f.read('head.json')).kind,'failed-before-preparation');
});
test('second prepare failure still finalizes the first partial record',async t=>{
  const f=await pairFixture(t);const original=f.api.prepare;
  f.api.prepare=async o=>{if(o.root===f.options.headRoot)throw Error('seeded head prepare failure');return original(o);};
  const result=await measurePair(f.options,f.api);await assertFailure(f,result,/prepare-head.*seeded head prepare failure/);
  assert.ok(f.events.includes('finish-base'));
});
test('exact-checkout rejection is durable and starts no servers',async t=>{
  const f=await pairFixture(t);const original=f.api.prepare;
  f.api.prepare=async o=>{const r=await original(o);if(o.root===f.options.headRoot)r.source.dirty=true;return r;};
  const result=await measurePair(f.options,f.api);await assertFailure(f,result,/exact-checkouts.*Exact clean/);
  assert.ok(!f.events.some(e=>e.startsWith('serve-')));
});
test('second server startup failure still closes first server',async t=>{
  const f=await pairFixture(t);const original=f.api.serveBuild;
  f.api.serveBuild=async path=>{if(path.startsWith(f.options.headRoot))throw Error('seeded server startup failure');return original(path);};
  const result=await measurePair(f.options,f.api);await assertFailure(f,result,/start-servers.*seeded server startup failure/);
  assert.ok(f.events.includes('close-base'));
});
test('rejected browser run retains diagnostics and independently closes both servers',async t=>{
  const f=await pairFixture(t,{measureBrowserRun:async()=>{throw Error('seeded rejected run');}});
  const result=await measurePair(f.options,f.api);await assertFailure(f,result,/run-base-1.*seeded rejected run/);
  assert.deepEqual(f.events.filter(e=>e.startsWith('close-')),['close-base','close-head']);
});
test('returned failed partial run is retained before settlement',async t=>{
  const f=await pairFixture(t,{measureBrowserRun:async()=>({status:'failed',browserClosed:true,errors:[],failure:'seeded partial run',scenarios:[{id:'retained raw checkpoint'}]})});
  const result=await measurePair(f.options,f.api);await assertFailure(f,result,/seeded partial run/);
  assert.equal((await f.read('base-repeat-1.json')).scenarios[0].id,'retained raw checkpoint');
});
test('close and finish failures cannot skip the other cleanup or final failure artifacts',async t=>{
  const f=await pairFixture(t);const originalServe=f.api.serveBuild,originalFinish=f.api.finish;
  f.api.serveBuild=async path=>{const server=await originalServe(path),close=server.close;server.close=async()=>{await close();if(path.startsWith(f.options.baseRoot))throw Error('seeded close failure');};return server;};
  f.api.finish=async(r,o)=>{await originalFinish(r,o);if(o.root===f.options.baseRoot)throw Error('seeded finish failure');};
  const result=await measurePair(f.options,f.api);await assertFailure(f,result,/close-base.*seeded close failure/);
  assert.match(result.errors.join(' '),/finish-base.*seeded finish failure/);
  assert.ok(f.events.includes('close-head'));assert.ok(f.events.includes('finish-head'));
  assert.equal((await f.read('base.json')).status,'failed');assert.equal((await f.read('head.json')).status,'failed');
});
async function assertFailedDispositions(f,result,blocked=[]) {
  assert.equal(result.status,'fail');
  for(const name of ['base.json','head.json','comparison.json','manifest.json']) {
    if(blocked.includes(name))continue;
    const saved=await f.read(name);assert.ok(['fail','failed'].includes(saved.status),`${name} must not retain a positive disposition`);
    assert.ok(saved.errors.length,`${name} must retain settlement diagnostics`);
  }
  if(!blocked.includes('summary.md')) {
    const summary=await readFile(join(f.options.outDir,'summary.md'),'utf8');assert.match(summary,/\*\*FAIL\*\*/);assert.doesNotMatch(summary,/\*\*PASS\*\*/);
  }
  if(!blocked.includes('retention.json'))assert.equal((await f.read('retention.json')).status,'retained');
  for(const side of ['base','head'])for(const repeat of [1,2,3])assert.ok((await readdir(f.options.outDir)).includes(`${side}-repeat-${repeat}.json`));
}
test('late artifact write failures poison every writable final disposition and keep raw repeats',async t=>{
  for(const file of ['comparison.json','summary.md','manifest.json','retention.json']) {
    const f=await pairFixture(t),original=f.api.compareRecords;
    f.api.compareRecords=(...args)=>{mkdirSync(join(f.options.outDir,file));return original(...args);};
    const result=await measurePair(f.options,f.api);
    await assertFailedDispositions(f,result,[file]);assert.match(result.errors.join(' '),new RegExp(`write-${file.replace('.', '\\.')}`));
    assert.match(result.errors.join(' '),/Incomplete durable failure settlement/);
    assert.equal((await lstat(join(f.options.outDir,file))).isDirectory(),true);
  }
});
test('retention proof rejection uses the same failed disposition settlement and preserves mismatched raw data',async t=>{
  const f=await pairFixture(t),original=f.api.compareRecords;
  f.api.compareRecords=(...args)=>{writeFileSync(join(f.options.outDir,'head-repeat-3.json'),JSON.stringify({seeded:'different raw run'}));return original(...args);};
  const result=await measurePair(f.options,f.api);await assertFailedDispositions(f,result);
  assert.match(result.errors.join(' '),/retention-verification.*raw run differs/);
  assert.equal((await f.read('head-repeat-3.json')).seeded,'different raw run');
});
test('symlink final artifact is never overwritten while other PASS artifacts are poisoned',async t=>{
  const f=await pairFixture(t),original=f.api.compareRecords,target=join(f.options.baseRoot,'keep-target.txt');
  f.api.compareRecords=(...args)=>{mkdirSync(f.options.baseRoot,{recursive:true});writeFileSync(target,'KEEP TARGET');symlinkSync(target,join(f.options.outDir,'summary.md'));return original(...args);};
  const result=await measurePair(f.options,f.api);await assertFailedDispositions(f,result,['summary.md']);
  assert.equal(await readFile(target,'utf8'),'KEEP TARGET');assert.equal((await lstat(join(f.options.outDir,'summary.md'))).isSymbolicLink(),true);
  assert.match(result.errors.join(' '),/Nonregular settlement output/);
});
test('fully unwritable comparison summary and manifest report incomplete durable failure explicitly',async t=>{
  const f=await pairFixture(t),original=f.api.compareRecords,blocked=['comparison.json','summary.md','manifest.json'];
  f.api.compareRecords=(...args)=>{for(const name of blocked)mkdirSync(join(f.options.outDir,name));return original(...args);};
  const result=await measurePair(f.options,f.api);await assertFailedDispositions(f,result,blocked);
  assert.match(result.errors.join(' '),/Incomplete durable failure settlement/);
  for(const name of blocked)assert.ok(result.durableSettlement.unwritable.includes(name));
});
test('standalone collector retains preparation failure without launching or overwriting',async t=>{
  const f=await pairFixture(t),out=join(f.options.baseRoot,'record.json');let launched=false;
  const options={root:f.options.baseRoot,build:'unused',profile:'hardware',session:'CPU-adapter-only',out};
  const result=await collectRecord(options,{prepare:async()=>{throw Error('seeded standalone prepare failure');},measureBrowserRun:async()=>{launched=true;}});
  assert.equal(result.status,'failed');assert.equal(launched,false);assert.match(result.errors.join(' '),/seeded standalone prepare failure/);
  assert.equal(JSON.parse(await readFile(out,'utf8')).status,'failed');
  assert.equal(JSON.parse(await readFile(out+'.manifest.json','utf8')).stages[0].status,'failed');
  await assert.rejects(collectRecord(options,{prepare:async()=>{throw Error('must not prepare again');}}),{code:'EEXIST'});
});
test('standalone close/finish failures independently retain a failed partial run',async t=>{
  const f=await pairFixture(t),out=join(f.options.baseRoot,'record.json');const events=[];
  const result=await collectRecord({root:f.options.baseRoot,build:'unused',profile:'hardware',session:'CPU-adapter-only',out,repeats:1},
    {prepare:f.api.prepare,verifyServedBuild:async()=>[],serveBuild:async()=>({url:'http://unused',close:async()=>{events.push('close');throw Error('seeded standalone close failure');}}),
      measureBrowserRun:async()=>({status:'failed',browserClosed:true,errors:[],failure:'seeded standalone partial run',scenarios:[{id:'retained'}]}),
      finish:async()=>{events.push('finish');throw Error('seeded standalone finish failure');}});
  assert.deepEqual(events,['close','finish']);assert.equal(result.status,'failed');
  const record=JSON.parse(await readFile(out,'utf8'));assert.match(record.errors.join(' '),/seeded standalone close failure/);assert.match(record.errors.join(' '),/seeded standalone finish failure/);
  assert.equal(JSON.parse(await readFile(out+'.repeat-1.json','utf8')).scenarios[0].id,'retained');
  assert.equal(JSON.parse(await readFile(out+'.manifest.json','utf8')).status,'failed');
});

test('memory browser closes timed ownership before verifying and launching the exact fresh binary',async()=>{
  const events=[],options={headless:false,executablePath:'/manufactured/exact-chrome'};
  const fresh={inert:true};
  const result=await startMemoryBrowser({context:{close:async()=>events.push('context-close')},browser:{close:async()=>events.push('browser-close')},
    chromium:{launch:async passed=>{assert.deepEqual(passed,options);events.push('launch');return fresh;}},options,
    executable:options.executablePath,executableSha256:sha256('inert'),readBinary:async path=>{assert.equal(path,options.executablePath);events.push('read');return Buffer.from('inert');},
    onContextClosed:()=>events.push('context-cleared'),onBrowserClosed:()=>events.push('closed-proof')});
  assert.equal(result,fresh);assert.deepEqual(events,['context-close','context-cleared','browser-close','closed-proof','read','launch']);
});
test('memory restart closure, changed binary and launch failures cannot proceed as a fresh success',async()=>{
  for(const fail of ['context','browser','binary','launch']) {
    const events=[];
    const options={executablePath:'/manufactured/exact-chrome'};
    await assert.rejects(startMemoryBrowser({context:{close:async()=>{events.push('context');if(fail==='context')throw Error('seeded context');}},
      browser:{close:async()=>{events.push('browser');if(fail==='browser')throw Error('seeded browser');}},options,executable:options.executablePath,
      executableSha256:sha256('inert'),readBinary:async()=>{events.push('read');return Buffer.from(fail==='binary'?'changed':'inert');},
      chromium:{launch:async()=>{events.push('launch');throw Error('seeded launch');}}}),/seeded|executable changed/);
    if(fail!=='launch')assert.ok(!events.includes('launch'));
    if(fail==='context')assert.deepEqual(events,['context']);
    if(fail==='browser')assert.deepEqual(events,['context','browser']);
    if(fail==='binary')assert.deepEqual(events,['context','browser','read']);
  }
});
