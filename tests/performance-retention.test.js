import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {prunePairSidecars} from '../scripts/performance/retention.mjs';

async function fixture(t) {
  const root=await mkdtemp(join(tmpdir(),'tidekin-performance-retention-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const outDir=join(root,'evidence');await mkdir(outDir);
  const records=Object.fromEntries(['base','head'].map(side=>[side,{status:'complete',errors:[],runs:[1,2].map(repeat=>
    ({repeat,status:'complete',browserClosed:true,raw:{label:'CPU manufactured retention test only',timestamps:[1,2,3],checkpoints:[{inside:10,outside:5}]}}))}]));
  const comparison={status:'pass',checks:[],errors:[]},manifest={status:'pass',errors:[],order:[]};
  const save=async(name,value)=>writeFile(join(outDir,name),JSON.stringify(value)+'\n',{flag:'wx'});
  for(const side of ['base','head']) {
    await save(`${side}.json`,records[side]);
    for(const run of records[side].runs)await save(`${side}-repeat-${run.repeat}.json`,run);
  }
  await save('comparison.json',comparison);await save('manifest.json',manifest);await writeFile(join(outDir,'summary.md'),'Synthetic CPU test **PASS**\n',{flag:'wx'});
  await save('unrelated-owned-output.json',{keep:true});
  return {root,outDir,expected:{records,comparison,manifest}};
}
test('successful verified aggregation removes only duplicate owned repeat sidecars',async t=>{
  const f=await fixture(t),result=await prunePairSidecars(f.outDir,f.expected);
  assert.equal(result.status,'compacted');assert.deepEqual(result.removed,['base-repeat-1.json','base-repeat-2.json','head-repeat-1.json','head-repeat-2.json']);
  assert.deepEqual((await readdir(f.outDir)).sort(),['base.json','comparison.json','head.json','manifest.json','summary.md','unrelated-owned-output.json']);
  assert.deepEqual(JSON.parse(await readFile(join(f.outDir,'base.json'),'utf8')),f.expected.records.base);
});
test('failed and inconclusive settlement keeps all diagnostic sidecars',async t=>{
  for(const status of ['fail','inconclusive']) {
    const f=await fixture(t);f.expected.comparison.status=status;f.expected.manifest.status=status;
    const result=await prunePairSidecars(f.outDir,f.expected);assert.equal(result.status,'retained');
    assert.ok((await readdir(f.outDir)).includes('head-repeat-2.json'));
  }
});
test('raw mismatch or changed final aggregate fails proof before any removal',async t=>{
  for(const name of ['head-repeat-2.json','base.json','comparison.json','manifest.json']) {
    const f=await fixture(t),path=join(f.outDir,name);await writeFile(path,JSON.stringify({changed:true}));
    await assert.rejects(prunePairSidecars(f.outDir,f.expected),/differs/);
    for(const side of ['base','head'])for(const repeat of [1,2])assert.ok((await readdir(f.outDir)).includes(`${side}-repeat-${repeat}.json`));
  }
});
test('symlink sidecar is retained and target untouched, missing proof cannot compact',async t=>{
  const f=await fixture(t),sidecar=join(f.outDir,'head-repeat-2.json'),target=join(f.root,'must-keep.json');
  const raw=JSON.stringify(f.expected.records.head.runs[1]);await writeFile(target,raw);await rm(sidecar);await symlink(target,sidecar);
  await assert.rejects(prunePairSidecars(f.outDir,f.expected),/nonregular file/);assert.equal(await readFile(target,'utf8'),raw);
  assert.ok((await readdir(f.outDir)).includes('base-repeat-1.json'));
  await rm(join(f.outDir,'summary.md'));await assert.rejects(prunePairSidecars(f.outDir,f.expected),{code:'ENOENT'});
});
