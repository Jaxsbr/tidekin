import { resolve, join } from 'node:path';
import { mkdir, writeFile, lstat, open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { prepare, finish } from './collect.mjs';
import { serveBuild, verifyServedBuild } from './server.mjs';
import { measureBrowserRun } from './browser.mjs';
import { compareRecords, renderSummary } from './compare.mjs';
import { prunePairSidecars } from './retention.mjs';

async function replaceOwnedDisposition(path,contents) {
  let stat;
  try{stat=await lstat(path);}catch(e){if(e.code!=='ENOENT')throw e;}
  if(stat&&(!stat.isFile()||stat.isSymbolicLink()))throw Error(`Nonregular settlement output: ${path}`);
  const file=await open(path,stat?constants.O_WRONLY|constants.O_NOFOLLOW:'wx');
  try {
    const actual=await file.stat();
    if(!actual.isFile()||(stat&&(actual.dev!==stat.dev||actual.ino!==stat.ino)))throw Error('Settlement output identity changed');
    await file.truncate(0);await file.writeFile(contents);
  }finally{await file.close();}
}

// Execute from the trusted base checkout. Both records use that one policy,
// probe implementation, Playwright package and browser binary. No cached baseline.
export async function measurePair(options, injected = {}) {
  const api={prepare,finish,serveBuild,verifyServedBuild,measureBrowserRun,compareRecords,...injected};
  const {baseRoot,headRoot,outDir,expectedBase,expectedHead,session,profile='ci-software'}=options;
  await mkdir(resolve(outDir,'..'),{recursive:true});
  await mkdir(outDir); // Never overwrite an existing evidence directory.
  const manifest={schema:1,status:'running',startedAt:new Date().toISOString(),expectedBase,expectedHead,profile,session,
    stages:[],errors:[],order:[]};
  await writeFile(join(outDir,'manifest-start.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  const baseOptions={root:baseRoot,build:options.baseBuild??join(baseRoot,'output/performance-build'),profile,session,sourceOptions:options.baseSourceOptions??{}};
  const headOptions={root:headRoot,build:options.headBuild??join(headRoot,'output/performance-build'),profile,session};
  const records={},servers={},order=manifest.order;
  const fail=(stage,error)=>{
    const message=`${stage}: ${error?.stack??error}`;manifest.errors.push(message);
    for(const record of Object.values(records)){(record.errors??=[]).push(message);record.status='failed';}
  };
  const stage=async(name,operation)=>{
    manifest.stages.push({name,status:'started'});
    try{const value=await operation();manifest.stages.at(-1).status='complete';return value;}
    catch(e){manifest.stages.at(-1).status='failed';throw e;}
  };
  try {
    records.base=await stage('prepare-base',()=>api.prepare(baseOptions));
    records.head=await stage('prepare-head',()=>api.prepare(headOptions));
    await stage('exact-checkouts',()=>{
      if(profile!=='hardware'&&options.allowDirtyHead)throw Error('CI cannot allow dirty head');
      if(records.base.source.commit!==expectedBase||!records.base.source.matchesCommit||records.base.source.dirty||
        records.head.source.commit!==expectedHead||(records.head.source.dirty&&!options.allowDirtyHead)||(!records.head.source.matchesCommit&&!options.allowDirtyHead))
        throw Error('Exact clean base/head checkouts required');
    });
    await stage('start-servers',async()=>{
      if(profile==='hardware'&&(!options.baseUrl||!options.headUrl))throw Error('Hardware pair needs two matching external production preview URLs');
      if(options.baseUrl||options.headUrl){
        if(!options.baseUrl||!options.headUrl)throw Error('Both external URLs required');
        servers.base={url:options.baseUrl};servers.head={url:options.headUrl};
      }else{servers.base=await api.serveBuild(baseOptions.build);servers.head=await api.serveBuild(headOptions.build);}
    });
    for(const side of ['base','head'])await stage(`verify-${side}`,async()=>{
      records[side].serving={mode:options.baseUrl?'external matching production preview, root base':'owned gzip-level9 immutable server',url:servers[side].url,
        headers:await api.verifyServedBuild(servers[side].url,records[side].build)};
      records[side].exclusivity=profile==='hardware'?'nonexclusive: other user applications may use GPU':'single owned browser; hosted runner contention remains possible';
      records[side].localDirtyHeadAllowed=Boolean(options.allowDirtyHead);
    });
    if(JSON.stringify(records.base.serving.headers)!==JSON.stringify(records.head.serving.headers))throw Error('Serving cache/compression protocol differs');
    const browserModule=pathToFileURL(join(baseRoot,'node_modules/@playwright/test/index.mjs')).href;
    for(let repeat=1;repeat<=records.base.protocol.repeats;repeat++)for(const side of repeat%2?['base','head']:['head','base']){
      order.push({repeat,side});console.log(`matched pair ${repeat}/${records.base.protocol.repeats}: ${side}`);
      const run=await stage(`run-${side}-${repeat}`,()=>api.measureBrowserRun({root:side==='base'?baseRoot:headRoot,url:servers[side].url,
        policy:records[side].protocol,profile,repeat,browserModule,browserExecutable:options.browserExecutable}));
      records[side].runs.push(run);
      await writeFile(join(outDir,`${side}-repeat-${repeat}.json`),JSON.stringify(run,null,2)+'\n',{flag:'wx'});
      if(run.status!=='complete')throw Error(`${side} repeat ${repeat} failed: ${run.failure??run.errors.join('; ')}`);
    }
    for(const side of ['base','head'])await stage(`verify-after-${side}`,()=>api.verifyServedBuild(servers[side].url,records[side].build));
  }catch(e){fail(manifest.stages.at(-1)?.name??'measurement',e);}
  finally {
    for(const side of ['base','head']){
      try{await stage(`close-${side}`,async()=>{await servers[side]?.close?.();});}catch(e){fail(`close-${side}`,e);}
    }
    for(const side of ['base','head'])if(records[side]){
      records[side].order=order;
      try{await stage(`finish-${side}`,()=>api.finish(records[side],side==='base'?baseOptions:headOptions));}
      catch(e){fail(`finish-${side}`,e);}
    }
  }
  let result;
  try{result=api.compareRecords(records.base,records.head,{expectedBase,expectedHead:options.allowDirtyHead?undefined:expectedHead});}
  catch(e){fail('compare',e);result={schema:1,status:'fail',checks:[],errors:[]};}
  result.errors??=[];
  if(manifest.errors.length){result.status='fail';result.errors.push(...manifest.errors);}
  result.localDirtyHeadAllowed=Boolean(options.allowDirtyHead);
  let settlementFailed=false,retention={status:'retained',reason:'Failed artifact settlement; coordinator disposition required',removed:[]};
  const rejectArtifact=(name,error)=>{
    settlementFailed=true;fail(name,error);result.status='fail';result.errors.push(`${name}: ${error}`);manifest.status='fail';
  };
  const json=value=>JSON.stringify(value,null,2)+'\n';
  const aggregate=side=>records[side]??{kind:'failed-before-preparation',status:'failed',side,expectedCommit:side==='base'?expectedBase:expectedHead,errors:manifest.errors};
  manifest.finishedAt=new Date().toISOString();
  // Serialize each file only when writing it, after any earlier failure.
  const dispositions=[['base.json',()=>json(aggregate('base'))],['head.json',()=>json(aggregate('head'))],
    ['comparison.json',()=>json(result)],['summary.md',()=>renderSummary(result)],
    ['manifest.json',()=>{manifest.status=result.status;return json(manifest);}]];
  for(const [file,contents]of dispositions) {
    try{await writeFile(join(outDir,file),contents(),{flag:'wx'});}
    catch(e){rejectArtifact(`write-${file}`,e);}
  }
  const pruneMayRemove=result.status==='pass';
  try {
    retention=await prunePairSidecars(outDir,{records,comparison:result,manifest});
  }catch(e){rejectArtifact('retention-verification',e);}
  try {
    await writeFile(join(outDir,'retention.json'),JSON.stringify(retention,null,2)+'\n',{flag:'wx'});
  }catch(e){rejectArtifact('write-retention.json',e);}
  if(settlementFailed) {
    const unwritable=new Set();
    // A late retention-report error can happen after successful compaction.
    // Restore only missing owned repeats from the unchanged raw run objects;
    // exclusive creation preserves existing/mismatched diagnostics and links.
    if(pruneMayRemove)for(const side of ['base','head'])for(const run of records[side]?.runs??[]) {
      const file=`${side}-repeat-${run.repeat}.json`;
      try{await writeFile(join(outDir,file),json(run),{flag:'wx'});}
      catch(e){if(e.code!=='EEXIST'){unwritable.add(file);rejectArtifact(`restore-${file}`,e);}}
    }
    retention={status:'retained',reason:'Artifact write/readback failed; raw repeats retained or restored, coordinator disposition required',removed:[]};
    result.durableSettlement={status:'repairing',unwritable:[]};
    const repair=[...dispositions,['retention.json',()=>json(retention)]];
    // One shared repair path for every late write or proof failure. Each
    // writable final disposition becomes failed, independently of the others.
    for(const [file,contents]of repair) {
      try{await replaceOwnedDisposition(join(outDir,file),contents());}
      catch(e){unwritable.add(file);rejectArtifact(`repair-${file}`,e);}
    }
    result.durableSettlement={status:unwritable.size?'incomplete':'complete',unwritable:[...unwritable]};
    if(unwritable.size)result.errors.push(`Incomplete durable failure settlement; could not update: ${[...unwritable].join(', ')}`);
    // Publish the final repair diagnostics where possible; status is already
    // failed even when the filesystem blocks one or every disposition update.
    for(const [file,contents]of dispositions.slice(2)) {
      try{await replaceOwnedDisposition(join(outDir,file),contents());}
      catch(e){
        if(!unwritable.has(file)){unwritable.add(file);rejectArtifact(`repair-final-${file}`,e);result.errors.push(`Incomplete durable failure settlement; could not update: ${file}`);}
        result.durableSettlement={status:'incomplete',unwritable:[...unwritable]};
      }
    }
  }
  return result;
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
  const args=process.argv.slice(2),opt=k=>args.find(a=>a.startsWith(`--${k}=`))?.slice(k.length+3);
  if(args.includes('--help')||!args.includes('--run'))console.log('Prepared only, no browser. Trusted base: node scripts/performance/pair.mjs --run --browser-released --base-root=PATH --head-root=PATH --out-dir=NEW --expected-base=SHA --expected-head=SHA --session=ID [--profile=hardware --nonexclusive --base-url=http://127.0.0.1:5181 --head-url=http://127.0.0.1:5182 --base-build=PATH --head-build=PATH --base-source-ref=SHA --base-source-git=PATH --browser-executable=PATH --allow-dirty-head]. Dirty head is explicit local hardware only and cannot pass exact-commit CI.');
  else {
    if(!args.includes('--browser-released'))throw Error('Browser release required');
    for(const key of ['base-root','head-root','out-dir','expected-base','expected-head','session'])if(!opt(key))throw Error(`Missing --${key}`);
    for(const key of ['expected-base','expected-head'])if(!/^[a-f0-9]{40}$/.test(opt(key)))throw Error('Full exact SHA required');
    const profile=opt('profile')??'ci-software';if(!['hardware','ci-software'].includes(profile))throw Error('Invalid profile');
    if(profile==='hardware'&&!args.includes('--nonexclusive'))throw Error('Hardware cannot certify exclusive GPU use; acknowledge --nonexclusive');
    if(args.includes('--allow-dirty-head')&&profile!=='hardware')throw Error('CI cannot allow dirty head');
    const result=await measurePair({baseRoot:resolve(opt('base-root')),headRoot:resolve(opt('head-root')),outDir:resolve(opt('out-dir')),
      expectedBase:opt('expected-base'),expectedHead:opt('expected-head'),session:opt('session'),profile,
      baseBuild:opt('base-build')?resolve(opt('base-build')):undefined,headBuild:opt('head-build')?resolve(opt('head-build')):undefined,
      baseUrl:opt('base-url'),headUrl:opt('head-url'),browserExecutable:opt('browser-executable'),allowDirtyHead:args.includes('--allow-dirty-head'),
      baseSourceOptions:opt('base-source-ref')?{revision:opt('base-source-ref'),gitRoot:resolve(opt('base-source-git')??opt('base-root'))}:undefined});
    console.log(renderSummary(result));process.exitCode=result.status==='pass'?0:1;
  }
}
