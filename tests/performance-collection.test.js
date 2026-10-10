import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import * as THREE from 'three';
import * as Game from '../src/game.js';
import { freshFixture } from '../scripts/performance/fixtures.mjs';
import { createResourceFixture, findTextures, measureResources } from '../scripts/performance/resources.mjs';
import { inventory, sourceFingerprint } from '../scripts/performance/evidence.mjs';
import { POLICY } from '../scripts/performance/policy.mjs';

test('supplied fixture validates prerequisites and upgrades can be built through real domain actions',()=>{
  const {state,serialized}=freshFixture(Game,{supplied:true});assert.doesNotThrow(()=>Game.deserializeGame(serialized));
  assert.deepEqual(state.discoveries,['home']);
  for(const upgrade of Object.keys(state.upgrades))assert.equal(Game.act(state,'build',{upgrade}).ok,true);
  assert.doesNotThrow(()=>Game.serializeGame(state));
});
test('CPU developed fixture earns departure/discovery, validates its save and can travel',()=>{
  const state=createResourceFixture(Game);
  assert.equal(state.departed,true);assert.ok(state.discoveries.includes('horizon'));
  assert.ok(Object.values(state.upgrades).every(Boolean));
  assert.doesNotThrow(()=>Game.deserializeGame(Game.serializeGame(state)));
  assert.equal(Game.act(state,'travel',{region:'horizon'}).ok,true);
});
test('uniform texture discovery handles nested arrays and cycles',()=>{
  const a=new THREE.Texture(),b=new THREE.Texture(),uniforms={a:{value:a},nested:{value:[[b,a]]}};
  uniforms.loop=uniforms;assert.deepEqual(findTextures(uniforms),new Set([a,b]));
});
function viewFactory({leak=false,double=false}={}) {
  return ({THREE})=>{
    const scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(),texture=new THREE.Texture();
    const material=new THREE.ShaderMaterial({uniforms:{layers:{value:[texture]}}});scene.add(new THREE.Mesh(geometry,material));
    if(leak)new THREE.BoxGeometry(); // Real unattached allocation; collector must discover it.
    let disposed=false;
    return {scene,update(){},dispose(){if(disposed)return;disposed=true;geometry.dispose();material.dispose();texture.dispose();if(double)geometry.dispose();}};
  };
}
test('CPU tracker catches a real unattached geometry allocation and double disposal, restores prototypes',async()=>{
  const original=THREE.BufferGeometry.prototype.setAttribute;
  const policy={...POLICY,habitats:['home-reef'],transitionCycles:12};
  const clean=await measureResources(process.cwd(),policy,{THREE,Game,createCleanupScene:viewFactory()});
  assert.equal(clean.remaining,0);assert.equal(clean.rows[0].inside.detached,0);assert.equal(clean.rows[0].inside.textures,1);
  const leaked=await measureResources(process.cwd(),policy,{THREE,Game,createCleanupScene:viewFactory({leak:true})});
  assert.equal(leaked.remaining,1);assert.equal(leaked.rows[0].inside.detached,1);
  const double=await measureResources(process.cwd(),policy,{THREE,Game,createCleanupScene:viewFactory({double:true})});assert.equal(double.doubleDisposed,1);
  assert.equal(THREE.BufferGeometry.prototype.setAttribute,original);
});
function cloneViewFactory({kind='populated',leak=false,double=false}={}) {
  return ({THREE})=>{
    const scene=new THREE.Scene(),source=kind==='populated'?new THREE.BoxGeometry():new THREE.BufferGeometry();
    if(kind==='morph-only')source.morphAttributes.position=[new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3)];
    const material=new THREE.MeshBasicMaterial();scene.add(new THREE.Mesh(source,material));
    const orphan=source.clone(); // Real clone/copy path, never attached or given a dummy attribute.
    if(!leak){orphan.dispose();if(double)orphan.dispose();}
    let disposed=false;
    return {scene,update(){},dispose(){if(disposed)return;disposed=true;source.dispose();material.dispose();}};
  };
}
test('real populated, empty and morph-only orphan clones are counted once; leaks and double disposal cannot hide',async()=>{
  const policy={...POLICY,habitats:['home-reef'],transitionCycles:12};
  const originals=[THREE.BufferGeometry.prototype.setAttribute,THREE.BufferGeometry.prototype.copy,THREE.BufferGeometry.prototype.clone];
  for(const kind of ['populated','empty','morph-only']) {
    const clean=await measureResources(process.cwd(),policy,{THREE,Game,createCleanupScene:cloneViewFactory({kind})});
    const leaked=await measureResources(process.cwd(),policy,{THREE,Game,createCleanupScene:cloneViewFactory({kind,leak:true})});
    assert.equal(leaked.remaining,1,`${kind}: missing clone disposal was silently accepted`);
    assert.equal(leaked.rows[0].inside.detached,1);assert.equal(leaked.rows[0].outside.detached,1);
    assert.equal(clean.observed,3,`${kind}: source, material and unattached clone must each be observed once`);
    assert.equal(clean.remaining,0);assert.equal(clean.doubleDisposed,0);assert.equal(clean.idempotent,true);
    const doubled=await measureResources(process.cwd(),policy,{THREE,Game,createCleanupScene:cloneViewFactory({kind,double:true})});
    assert.equal(doubled.doubleDisposed,1,`${kind}: unattached clone double disposal was missed`);
  }
  assert.deepEqual([THREE.BufferGeometry.prototype.setAttribute,THREE.BufferGeometry.prototype.copy,THREE.BufferGeometry.prototype.clone],originals);
});
test('allocation hooks restore after a real clone is created before factory failure',async()=>{
  const originalCopy=THREE.BufferGeometry.prototype.copy,originalSet=THREE.BufferGeometry.prototype.setAttribute;
  await assert.rejects(measureResources(process.cwd(),POLICY,{THREE,Game,createCleanupScene:()=>{
    const source=new THREE.BufferGeometry(),clone=source.clone();clone.dispose();source.dispose();
    throw Error('Injected factory failure after clone');
  }}),/Injected factory failure after clone/);
  assert.equal(THREE.BufferGeometry.prototype.copy,originalCopy);assert.equal(THREE.BufferGeometry.prototype.setAttribute,originalSet);
});
test('build inventory fingerprints binary bytes and deterministic compressed sizes',async t=>{
  const root=await mkdtemp(join(tmpdir(),'tidekin-performance-inventory-'));t.after(()=>rm(root,{recursive:true,force:true}));await mkdir(join(root,'assets'));
  await writeFile(join(root,'index.html'),'<script src="/assets/a.js"></script>');await writeFile(join(root,'assets/a.js'),'let x=1;');
  await writeFile(join(root,'assets/a.png'),Buffer.from([0,255,0,128]));
  const before=await inventory(root);assert.equal(before.totals.assetBytes,4);assert.ok(before.totals.jsGzipBytes>0);
  await writeFile(join(root,'assets/a.png'),Buffer.from([0,254,0,128]));const after=await inventory(root);
  assert.notEqual(before.hash,after.hash);assert.equal(before.totals.totalBytes,after.totals.totalBytes);
});
test('untracked build inputs enter the fingerprint; evidence output does not create a hash loop',async t=>{
  const root=await mkdtemp(join(tmpdir(),'tidekin-performance-inputs-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  // A minimal Git command shim supplies immutable metadata, without creating commits.
  const git=join(root,'git');
  await writeFile(git,'#!/bin/sh\nshift 2\ncase "$1" in\nls-files) if [ "$2" = "--others" ]; then printf "src/new.js\\000benchmarks/records/run.json\\000"; else printf "src/old.js\\000"; fi ;;\nrev-parse) printf "79da54bdbd029090d4ed9d6fd3dd2caea1a4847c" ;;\nstatus) : ;;\nesac\n',{mode:0o755});
  await mkdir(join(root,'src'));await mkdir(join(root,'benchmarks/records'),{recursive:true});
  await writeFile(join(root,'src/old.js'),'old');await writeFile(join(root,'src/new.js'),'new');await writeFile(join(root,'benchmarks/records/run.json'),'first');
  const originalPath=process.env.PATH;process.env.PATH=root+':'+originalPath;
  try {
    const before=await sourceFingerprint(root);assert.ok(before.files.some(f=>f.path==='src/new.js'));
    assert.equal(before.dirty,true);assert.equal(before.matchesCommit,false);
    await writeFile(join(root,'benchmarks/records/run.json'),'second');assert.equal((await sourceFingerprint(root)).hash,before.hash);
    await writeFile(join(root,'src/new.js'),'changed');assert.notEqual((await sourceFingerprint(root)).hash,before.hash);
  }finally{process.env.PATH=originalPath;}
});
test('immutable revision snapshot missing a committed input throws',async t=>{
  const root=await mkdtemp(join(tmpdir(),'tidekin-performance-missing-snapshot-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  await assert.rejects(sourceFingerprint(root,{gitRoot:process.cwd(),revision:'HEAD'}),{code:'ENOENT'});
});
test('default collector and pair commands do not launch a browser',()=>{
  for(const file of ['collect.mjs','pair.mjs']){
    const result=spawnSync(process.execPath,[`scripts/performance/${file}`],{encoding:'utf8'});
    assert.equal(result.status,0);assert.match(result.stdout,/no browser|no browser launched/i);
  }
  const gated=spawnSync(process.execPath,['scripts/performance/collect.mjs','--run','--out=/private/tmp/tidekin-must-not-launch.json'],{encoding:'utf8'});
  assert.notEqual(gated.status,0);assert.match(gated.stderr,/browser release required/);
});
