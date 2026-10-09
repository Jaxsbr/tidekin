/** CPU-only scene disposal fixtures. No browser, GPU, build, earned-play claim or save mutation. */
import * as THREE from 'three';
import {createCleanupScene} from '../src/cleanup-scene.js';
import {createGame,act,CLEANUP_SITES} from '../src/game.js';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const args=process.argv.slice(2);
if(!args.includes('--run')){console.log('Prepared CPU-only fixture harness. After final source readiness: node scripts/qa-fifth-resource-lifetime.mjs --run --build-ready.16 alternating scene fixtures, geometry/material/texture disposal and final shutdown; no browser.');process.exit(0);}
assert.ok(args.includes('--build-ready'),'Parent final source/build readiness required; reef art pending');
const out=`captures/fifth-improvement/qa/${new Date().toISOString().replaceAll(':','-')}-resource-lifetime`;
await mkdir(out,{recursive:true});
const report={method:'CPU-only direct scene fixture;16 alternating sites, final3 per site assessed. Tracks attached geometries, materials and direct material textures via dispose events. No GPU allocation claim, earned progression claim, air changes or frozen state.',rows:[],status:'pending'};
async function fingerprint(){const files=[];const seen=new Set();async function visit(path){if(seen.has(path))return;seen.add(path);const bytes=await readFile(path);files.push({path,sha256:createHash('sha256').update(bytes).digest('hex')});for(const m of bytes.toString().matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){const {resolve,dirname}=await import('node:path');await visit(resolve(dirname(path),m[1]));}}await visit(new URL('../src/cleanup-scene.js',import.meta.url).pathname);await visit(new URL('../src/game.js',import.meta.url).pathname);files.sort((a,b)=>a.path.localeCompare(b.path));return {files,hash:createHash('sha256').update(JSON.stringify(files)).digest('hex')};}
let scene;const known=new Set(),live=new Set(),disposeCounts=new Map();
function inspect(){const current=new Set();scene.scene.traverse(o=>{if(o.geometry)current.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){current.add(m);for(const v of Object.values(m))if(v?.isTexture)current.add(v);}});for(const resource of current)if(!known.has(resource)){known.add(resource);live.add(resource);resource.addEventListener('dispose',()=>{disposeCounts.set(resource,(disposeCounts.get(resource)??0)+1);live.delete(resource);});}return current.size;}
try{
 report.before=await fingerprint();scene=createCleanupScene({THREE});inspect();const state=createGame();
 for(let i=0;i<16;i++){const id=i%2?'sheltered-cove':'home-reef';if(state.cleanup.attempt)assert.ok(act(state,'leave-cleanup').ok);state.position={...CLEANUP_SITES.find(s=>s.id===id).position};assert.ok(act(state,'enter-cleanup',{siteId:id}).ok);scene.update(state,1/60);const attached=inspect();report.rows.push({cycle:i+1,site:id,attachedResources:attached,liveTrackedResources:live.size,disposedResources:disposeCounts.size});assert.equal(live.size,attached,'No detached undisposed resources');assert.ok(act(state,'leave-cleanup').ok);scene.update(state,1/60);assert.equal(live.size,inspect(),'Surface exit fixture retains only attached owned resources');}
 report.plateau=Object.fromEntries(CLEANUP_SITES.map(s=>{const rows=report.rows.filter(r=>r.site===s.id),tail=rows.slice(-3);const stable=tail.every(r=>r.liveTrackedResources===tail[0].liveTrackedResources);assert.ok(stable,'Final three same-site CPU plateau');return [s.id,{tail,stable}];}));
 scene.dispose();assert.equal(live.size,0,'All observed owned resources disposed at shutdown');const counts=[...disposeCounts.values()];scene.dispose();assert.deepEqual([...disposeCounts.values()],counts,'Shutdown dispose is idempotent');
 report.after=await fingerprint();report.sourceUnchanged=report.before.hash===report.after.hash;assert.ok(report.sourceUnchanged,'Source changed during fixture diagnostic');report.status='pass';
}catch(error){report.status='fail';report.failure=error.stack;process.exitCode=1;}finally{scene?.dispose();report.totalObserved=known.size;report.disposedResources=disposeCounts.size;report.remaining=live.size;report.finishedAt=new Date().toISOString();await writeFile(out+'/results.json',JSON.stringify(report,null,2));}
console.log(JSON.stringify({out,status:report.status,remaining:report.remaining,failure:report.failure}));
