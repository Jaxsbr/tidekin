// Construction/disposal diagnostic; isolated domain fixtures, not earned play.
import * as THREE from 'three';
import {createCleanupScene} from '../src/cleanup-scene.js';
import {createGame,act,CLEANUP_SITES} from '../src/game.js';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const scene=createCleanupScene({THREE}),state=createGame();
const known=new Set(),live=new Set(),rows=[];let disposed=0;
function inspect(){const current=new Set();scene.scene.traverse(o=>{if(o.geometry)current.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)current.add(m)});for(const resource of current)if(!known.has(resource)){known.add(resource);live.add(resource);resource.addEventListener('dispose',()=>{if(live.delete(resource))disposed++})}return current.size}
for(let i=0;i<16;i++){const id=i%2?'sheltered-cove':'home-reef';if(state.cleanup.attempt)act(state,'leave-cleanup');state.position={...CLEANUP_SITES.find(s=>s.id===id).position};assert.ok(act(state,'enter-cleanup',{siteId:id}).ok);scene.update(state,1/60);const attached=inspect();rows.push({cycle:i+1,site:id,attachedResources:attached,liveTrackedResources:live.size,disposed});assert.equal(live.size,attached,'No detached undisposed geometry/material may remain');}
scene.dispose();assert.equal(live.size,0,'All observed geometry/materials release at shutdown');const report={method:'Node/Three.js owned geometry/material disposal events across 16 isolated alternating site fixtures; no GPU, textures, or user saves. Complements browser memory samples, not a substitute.',rows,totalObserved:known.size,disposed,remaining:live.size,status:'pass'};await writeFile('captures/fourth-improvement/qa/resource-lifetime.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
