import {lstat,readFile,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {digest} from './evidence.mjs';

async function regular(path) {
  const stat=await lstat(path);
  if(!stat.isFile()||stat.isSymbolicLink())throw Error(`Retention refuses nonregular file: ${path}`);
  return stat;
}
async function readJson(path) {
  await regular(path);
  return JSON.parse(await readFile(path,'utf8'));
}

// Called only for this invocation's exclusively reserved output directory.
// Validate every proof before deleting any duplicate. No failed-run compaction.
export async function prunePairSidecars(outDir,{records,comparison,manifest}) {
  const directory=await lstat(outDir);
  if(!directory.isDirectory()||directory.isSymbolicLink())throw Error('Retention refuses nonregular output directory');
  if(comparison.status!=='pass'||manifest.status!=='pass'||manifest.errors.length||
    !['base','head'].every(side=>records[side]?.status==='complete'&&records[side].errors.length===0))
    return {status:'retained',reason:'Failed, inconclusive or incomplete settlement; coordinator disposition required',removed:[]};
  const savedComparison=await readJson(join(outDir,'comparison.json')),savedManifest=await readJson(join(outDir,'manifest.json'));
  if(digest(savedComparison)!==digest(comparison)||digest(savedManifest)!==digest(manifest))throw Error('Retention final comparison/manifest differs on readback');
  await regular(join(outDir,'summary.md'));
  const summary=await readFile(join(outDir,'summary.md'),'utf8');
  if(!summary.includes('**PASS**'))throw Error('Retention requires durable passing summary');
  const pending=[];
  for(const side of ['base','head']) {
    const saved=await readJson(join(outDir,`${side}.json`));
    if(digest(saved)!==digest(records[side])||!saved.runs.length)throw Error(`Retention ${side} final record differs or lacks runs`);
    for(const [index,run] of saved.runs.entries()) {
      if(run.repeat!==index+1||run.status!=='complete'||run.browserClosed!==true)throw Error('Retention requires ordered complete closed runs');
      const name=`${side}-repeat-${index+1}.json`,path=join(outDir,name),stat=await regular(path);
      if(digest(await readJson(path))!==digest(run))throw Error(`Retention raw run differs: ${name}`);
      pending.push({name,path,stat});
    }
  }
  // Recheck identity for the complete set before unlinking anything.
  for(const {path,stat} of pending) {
    const now=await regular(path);
    if(now.dev!==stat.dev||now.ino!==stat.ino||now.size!==stat.size||now.mtimeMs!==stat.mtimeMs)throw Error('Retention sidecar changed during verification');
  }
  for(const {path} of pending)await unlink(path);
  return {status:'compacted',reason:'Every raw repeat exactly matched its durable final aggregate on readback',removed:pending.map(p=>p.name)};
}
