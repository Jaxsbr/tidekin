import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir, open, writeFile } from 'node:fs/promises';
import { POLICY, policyForProfile } from './policy.mjs';
import { inventory, sourceFingerprint, environment, harnessFingerprint, digest } from './evidence.mjs';
import { serveBuild, verifyServedBuild } from './server.mjs';
import { measureResources } from './resources.mjs';
import { measureBrowserRun } from './browser.mjs';

export async function prepare({ root, build, profile, session, sourceOptions = {} }) {
  const policy=policyForProfile(profile);
  return { schema: POLICY.schema, kind: 'measured', profile, session,
    startedAt: new Date().toISOString(), environment: environment(),
    protocol: policy, policySha256: digest(policy), harnessSha256: await harnessFingerprint(),
    source: await sourceFingerprint(root, sourceOptions), build: await inventory(build),
    cpuResources: await measureResources(root, policy), runs: [], errors: [] };
}

export async function finish(record, { root, build, sourceOptions = {} }) {
  record.sourceAfter = await sourceFingerprint(root, sourceOptions);
  record.buildAfter = await inventory(build);
  record.harnessAfterSha256=await harnessFingerprint();
  record.unchanged = record.source.hash === record.sourceAfter.hash && record.build.hash === record.buildAfter.hash && record.harnessSha256===record.harnessAfterSha256;
  record.finishedAt = new Date().toISOString();
  record.status = record.unchanged && !record.errors.length && record.runs.every(r => r.status === 'complete' && r.browserClosed) ? 'complete' : 'failed';
}

export async function collectRecord(options, injected={}) {
  const api={prepare,finish,serveBuild,verifyServedBuild,measureBrowserRun,...injected};
  const {out,root,build,profile,cpuOnly=false,exploratory=false,repeats=policyForProfile(profile).repeats,url:externalUrl}=options;
  await mkdir(resolve(out,'..'),{recursive:true});
  const output=await open(out,'wx'); // Reserve before preparation or launch, without replacing evidence.
  const manifest={schema:1,status:'running',startedAt:new Date().toISOString(),profile,session:options.session,stages:[],errors:[]};
  let record,server;
  const stage=async(name,operation)=>{
    manifest.stages.push({name,status:'started'});
    try{const value=await operation();manifest.stages.at(-1).status='complete';return value;}
    catch(e){manifest.stages.at(-1).status='failed';throw e;}
  };
  const fail=(name,error)=>{const message=`${name}: ${error?.stack??error}`;manifest.errors.push(message);if(record){record.errors.push(message);record.status='failed';}};
  try {
    await writeFile(out+'.manifest-start.json',JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
    record=await stage('prepare',()=>api.prepare(options));
    record.exploratory=exploratory;
    record.exclusivity=profile==='hardware'?'nonexclusive: other user applications may use GPU':'single owned browser; hosted runner contention remains possible';
    if(cpuOnly)record.kind='cpu-only';
    else {
      if(!externalUrl)server=await stage('start-server',()=>api.serveBuild(build));
      const url=externalUrl??server.url;
      record.serving={url,mode:externalUrl?'external coordinator server; actual compression/caching recorded':'owned gzip-level9 immutable server',
        headers:await stage('verify-served',()=>api.verifyServedBuild(url,record.build))};
      const browserModule=pathToFileURL(resolve(options.browserModule??join(root,'node_modules/@playwright/test/index.mjs'))).href;
      for(let repeat=1;repeat<=repeats;repeat++) {
        const run=await stage(`run-${repeat}`,()=>api.measureBrowserRun({root,url,policy:record.protocol,profile,repeat,browserModule,browserExecutable:options.browserExecutable}));
        record.runs.push(run);
        await writeFile(`${out}.repeat-${repeat}.json`,JSON.stringify(run,null,2)+'\n',{flag:'wx'});
        console.log(`repeat ${repeat}/${repeats}: ${run.status}; browserClosed=${run.browserClosed}`);
        if(run.status!=='complete')throw Error(`Repeat ${repeat} failed: ${run.failure??run.errors.join('; ')}`);
      }
      await stage('verify-after',()=>api.verifyServedBuild(url,record.build));
    }
  }catch(e){fail(manifest.stages.at(-1)?.name??'manifest-start',e);}
  finally {
    try{await stage('close-server',async()=>{await server?.close();});}catch(e){fail('close-server',e);}
    if(record)try{await stage('finish',()=>api.finish(record,options));}catch(e){fail('finish',e);}
    record??={kind:'failed-before-preparation',profile,session:options.session,status:'failed',errors:manifest.errors};
    if(manifest.errors.length)record.status='failed';
    manifest.status=record.status;manifest.finishedAt=new Date().toISOString();
    try{await writeFile(out+'.manifest.json',JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});}
    catch(e){fail('write-manifest',e);record.status='failed';}
    try{await output.writeFile(JSON.stringify(record,null,2)+'\n');}finally{await output.close();}
  }
  return record;
}

async function cli() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || !args.includes('--run')) {
    console.log('Prepared only: no browser launched. --run --browser-released --root=PATH --build=PATH --out=NEW.json --profile=ci-software|hardware --session=ID [--url=http://127.0.0.1:PORT] [--nonexclusive] [--exploratory --repeats=1] [--source-ref=SHA --source-git=PATH] [--browser-module=PATH]. --cpu-only needs --run but no browser release. Output uses exclusive creation; existing evidence is never replaced.'); return;
  }
  const flags = new Set(['--run','--help','--browser-released','--cpu-only','--nonexclusive','--exploratory']);
  const keys = new Set(['root','build','out','profile','session','url','repeats','source-ref','source-git','browser-module','browser-executable']);
  for (const arg of args) if (!flags.has(arg) && (!arg.startsWith('--') || !keys.has(arg.slice(2).split('=')[0]) || !arg.includes('='))) throw Error(`Unknown argument: ${arg}`);
  const opt = (key, fallback) => args.find(a => a.startsWith(`--${key}=`))?.slice(key.length+3) ?? fallback;
  const root = resolve(opt('root', '.')), build = resolve(opt('build', join(root, 'dist')));
  const out = opt('out'); if (!out) throw Error('Explicit new --out required');
  const profile = opt('profile', 'hardware'); if (!['hardware','ci-software'].includes(profile)) throw Error('Invalid profile');
  const repeats = Number(opt('repeats', policyForProfile(profile).repeats));
  if (!Number.isInteger(repeats) || repeats < 1 || repeats > 10) throw Error('Invalid repeats');
  if (repeats !== policyForProfile(profile).repeats && !args.includes('--exploratory')) throw Error('Nonstandard repeats require --exploratory; cannot pass enforcement');
  if (!args.includes('--cpu-only') && !args.includes('--browser-released')) throw Error('Coordinator browser release required');
  if (profile === 'hardware' && !args.includes('--cpu-only') && !args.includes('--nonexclusive')) throw Error('This collector cannot certify exclusive GPU use: acknowledge --nonexclusive');
  const sourceOptions = opt('source-ref') ? { revision:opt('source-ref'), gitRoot:resolve(opt('source-git', root)) } : {};
  const record=await collectRecord({root,build,out,profile,session:opt('session',`local-${Date.now()}`),sourceOptions,repeats,
    cpuOnly:args.includes('--cpu-only'),exploratory:args.includes('--exploratory'),url:opt('url'),
    browserModule:opt('browser-module'),browserExecutable:opt('browser-executable')});
  console.log(JSON.stringify({ out:resolve(out), status:record.status, kind:record.kind, exploratory:record.exploratory }));
  if (record.status !== 'complete') process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await cli();
