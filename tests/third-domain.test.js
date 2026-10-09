import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,act,steerGame,updateGame,getCleanupSite,getCleanupContext,getContext,
 CLEANUP_SITES,SALVAGE_NODES,ISLANDS,RECIPES,serializeGame,deserializeGame,SHELTER_RADIUS,sailingSpeed,EXPEDITIONS} from '../src/game.js';
function hold(s,t,input={}) {
 const a=s.cleanup.attempt;a.x=t.x;a.y=t.y;
 for(let i=0;i<18;i++){steerGame(s,.05,{interact:true,targetId:t.id,...input});updateGame(s,.05);}
}
function finish(s,input={}) {for(const t of getCleanupSite(s).trash)hold(s,t,input);assert.equal(s.cleanup.attempt.status,'complete');}
function enter(s,site,extra={}) {s.position={...site.position};assert.equal(act(s,'enter-cleanup',{siteId:site.id,...extra}).ok,true);}
function permanent(s){return JSON.stringify({inventory:s.inventory,collected:s.collected,stats:s.stats,completed:s.cleanup.completed,expeditions:s.expeditions});}
test('two bounded restorations and one starter pickup fund a wheel aboard the raft',()=>{
 const s=createGame();assert.deepEqual(s.inventory,{wood:0,scrap:0,pearls:0});
 assert.equal(CLEANUP_SITES.length,2);assert.equal(new Set(CLEANUP_SITES.flatMap(s=>s.trash.map(t=>t.id))).size,6);
 s.position={x:4,z:1};act(s,'gather','home-driftwood');
 for(const site of CLEANUP_SITES){enter(s,site);finish(s);(s.cleanup.attempt.y=0,act(s,'leave-cleanup'));}
 assert.deepEqual(s.inventory,RECIPES.waterwheel.cost);assert.equal(s.upgrades.waterwheel,false);
 assert.equal(act(s,'build','waterwheel').ok,true);assert.equal('helm' in s,false);
 assert.deepEqual(s.inventory,{wood:0,scrap:0,pearls:0});assert.equal(sailingSpeed(s),7);
 assert.deepEqual(deserializeGame(serializeGame(s)).inventory,s.inventory);
});
test('successful completion is once-only across retry exit reload and old completed-site saves',()=>{
 let s=createGame();enter(s,CLEANUP_SITES[0]);finish(s);const earned={...s.inventory};
 for(let i=0;i<3;i++){s=deserializeGame(serializeGame(s));enter(s,CLEANUP_SITES[0]);assert.equal(s.cleanup.attempt.status,'complete');assert.equal(act(s,'retry-cleanup').ok,false);(s.cleanup.attempt.y=0,act(s,'leave-cleanup'));assert.deepEqual(s.inventory,earned);}
 const old=createGame();old.cleanup={completed:['home-reef']};delete old.guidance;delete old.departed;
 s=deserializeGame(JSON.stringify(old));assert.deepEqual(s.cleanup.completed,['home-reef','sheltered-cove']);enter(s,CLEANUP_SITES[0]);assert.equal(s.cleanup.attempt.status,'active','legacy completion permits a fresh relic dive');assert.deepEqual(s.inventory,old.inventory);assert.equal(s.guidance.skipped,true);
});
test('failure retry voluntary exit and reload never bank unfinished rewards',()=>{
 const s=createGame();enter(s,CLEANUP_SITES[0]);const before=permanent(s);hold(s,getCleanupSite(s).trash[0]);
 const saved=serializeGame(s);assert.equal(s.cleanup.attempt.collected.length,1);assert.equal(deserializeGame(saved).cleanup.attempt,null);
 updateGame(s,24);assert.equal(s.cleanup.attempt.status,'failed');assert.deepEqual(s.cleanup.attempt.collected,[]);assert.equal(permanent(s),before);
 act(s,'retry-cleanup');assert.equal(s.cleanup.attempt.air,24);hold(s,getCleanupSite(s).trash[0]);(s.cleanup.attempt.y=0,act(s,'leave-cleanup'));assert.equal(permanent(s),before);
});
test('air exhaustion during final action frame cannot win or pay',()=>{
 const s=createGame();enter(s,CLEANUP_SITES[0]);const site=getCleanupSite(s);for(const t of site.trash.slice(0,-1))hold(s,t);
 const a=s.cleanup.attempt,t=site.trash.at(-1);a.x=t.x;a.y=t.y;a.selectedId=t.id;a.actionProgress=.99;a.air=.01;
 steerGame(s,.05,{interact:true,targetId:t.id});updateGame(s,.05);assert.equal(a.status,'failed');assert.deepEqual(s.cleanup.completed,[]);assert.equal(s.inventory.wood,0);
});
test('current pushes outward sailing inward before wheel; actual crossing earns departure once, chart cannot bypass',()=>{
 const s=createGame();s.position={x:0,z:SHELTER_RADIUS-1};steerGame(s,.05,{z:-1});
 assert.ok(s.position.z<SHELTER_RADIUS-1);assert.equal(s.lastEvent.code,'current_pushback');assert.equal(s.departed,false);
 s.inventory={...RECIPES.waterwheel.cost};act(s,'build','waterwheel');s.discoveries.push('mangrove');
 assert.equal(act(s,'travel','mangrove').code,'departure_required');
 for(let i=0;i<10;i++)steerGame(s,.05,{z:-1});assert.equal(s.departed,true);assert.equal(s.lastEvent.code,'first_departure');
 assert.equal(act(s,'travel','mangrove').ok,true);assert.equal(deserializeGame(serializeGame(s)).departed,true);
});
test('nearby resource targeting uses capability and range, not stale region labels, through tide transitions',()=>{
 const s=createGame();s.inventory={wood:6,scrap:2,pearls:0};act(s,'build','waterwheel');s.region='mangrove';s.discoveries.push('mangrove');
 const node=SALVAGE_NODES.find(n=>n.id==='home-timber');s.position={x:node.x+4.5,z:node.z};
 assert.equal(getContext(s).nodes.find(n=>n.id===node.id).available,true);assert.equal(act(s,'gather',node.id).ok,true);
 const s2=createGame();const remote=SALVAGE_NODES.find(n=>n.region==='mangrove');s2.position={...remote.position};
 assert.equal(act(s2,'gather',remote.id).code,'locked_region');assert.equal(act(s2,'enter-cleanup',{siteId:`salvage:${remote.id}`}).code,'locked_region');
 for(const time of [0,45,90,179]) {const a=createGame();a.time=time;a.day=1;a.position={...node.position};const n=getContext(a).nodes.find(n=>n.id===node.id);assert.equal(n.available,time===0||time===179);assert.equal(getContext(a).canDive,true);}
});
test('all resource Dive adapters preserve exact original node amounts and no duplicate awards',()=>{
 const s=createGame();s.inventory={wood:100,scrap:100,pearls:100};for(const id of Object.keys(RECIPES))act(s,'build',id);
 for(const n of SALVAGE_NODES) {
  s.position={...n.position};const before=s.inventory[n.type];
  if(n.access==='shore')assert.equal(act(s,'gather',n.id).ok,true);
  else {assert.equal(act(s,'dive').ok,true);const site=getCleanupSite(s);assert.equal(site.nodeId,n.id);finish(s);(s.cleanup.attempt.y=0,act(s,'leave-cleanup'));}
  assert.equal(s.inventory[n.type],before+n.amount);assert.ok(s.collected.includes(n.id));
 }
 assert.equal(s.collected.length,SALVAGE_NODES.length);assert.equal(s.stats.gathered.pearls,19);
 const saved=deserializeGame(serializeGame(s));assert.deepEqual(saved.collected,s.collected);assert.deepEqual(saved.stats,s.stats);
 for(const n of SALVAGE_NODES.filter(n=>n.access!=='shore')){saved.position={...n.position};assert.equal(act(saved,'enter-cleanup',{siteId:`salvage:${n.id}`}).ok,true);assert.equal(saved.cleanup.attempt.status,'complete');act(saved,'leave-cleanup');}
 assert.deepEqual(saved.inventory,s.inventory);
});
test('Pearl survey adapter preserves route claims and lifetime records with whole-attempt reset',()=>{
 const s=createGame();s.inventory={...RECIPES.waterwheel.cost};act(s,'build','waterwheel');act(s,'start-expedition','pearl-trail');s.position={...EXPEDITIONS[1].waypoints[0]};
 assert.equal(act(s,'dive').ok,true);assert.equal(getCleanupSite(s).kind,'survey');hold(s,getCleanupSite(s).trash[0]);
 s.cleanup.attempt.y=0;updateGame(s,.1);assert.equal(s.cleanup.attempt.collected.length,0);assert.equal(s.expeditions.active.index,0);
 finish(s);assert.equal(s.expeditions.active.ready,true);assert.equal(s.expeditions.active.index,4);
 const loaded=deserializeGame(serializeGame(s));assert.equal(loaded.expeditions.active.ready,true);act(loaded,'travel','home');
 const before=loaded.inventory.pearls;assert.equal(act(loaded,'claim-expedition').ok,true);assert.equal(loaded.inventory.pearls,before+3);assert.equal(loaded.expeditions.completed['pearl-trail'],1);
 assert.equal(act(loaded,'claim-expedition').ok,false);assert.equal(act(loaded,'start-expedition','pearl-trail').code,'expedition_daily_limit');
});
test('guidance validates bounded stages and old voyages retain discoveries and supplies',()=>{
 const s=createGame();s.guidance={stage:9,skipped:true};assert.deepEqual(deserializeGame(serializeGame(s)).guidance,s.guidance);
 for(const guidance of [{stage:10,skipped:false},{stage:-1,skipped:false},{stage:.5,skipped:false},{stage:0,skipped:1},null])assert.throws(()=>deserializeGame(JSON.stringify({...s,guidance})),{code:'INVALID_SAVE'});
 const old=createGame();delete old.departed;delete old.guidance;old.upgrades.waterwheel=true;old.discoveries.push('mangrove');
 const loaded=deserializeGame(JSON.stringify(old));assert.equal(loaded.departed,true);assert.equal(loaded.guidance.skipped,true);assert.deepEqual(loaded.inventory,old.inventory);assert.equal(act(loaded,'travel','mangrove').ok,true);
});
test('a real outer-region edge permits nearby salvage before geographic arrival is classified',()=>{
 const s=createGame();s.inventory={...RECIPES.waterwheel.cost};act(s,'build','waterwheel');
 const n=SALVAGE_NODES.find(n=>n.id==='mangrove-pearls'), island=ISLANDS[0];
 const dx=n.x-island.x,dz=n.z-island.z,len=Math.hypot(dx,dz);
 s.position={x:n.x+dx/len*4.4,z:n.z+dz/len*4.4};
 assert.ok(Math.hypot(s.position.x-island.x,s.position.z-island.z)>island.radius);
 assert.equal(getContext(s).region,'home');assert.equal(getContext(s).canDive,true);
 assert.equal(act(s,'dive').ok,true);assert.equal(getCleanupSite(s).nodeId,n.id);finish(s);(s.cleanup.attempt.y=0,act(s,'leave-cleanup'));
 assert.equal(s.inventory.pearls,n.amount);assert.ok(s.discoveries.includes('mangrove'));
 assert.doesNotThrow(()=>serializeGame(s));
});
test('fresh voyage public salvage entries fund every upgrade without quests or resource grants',()=>{
 const s=createGame();
 function sail(p) {
  
  for(let frame=0;frame<20000;frame++) {
   const dx=p.x-s.position.x,dz=p.z-s.position.z;if(Math.hypot(dx,dz)<.3){return;}
   const error=Math.atan2(Math.sin(Math.atan2(dx,dz)-s.heading),Math.cos(Math.atan2(dx,dz)-s.heading));
   steerGame(s,.05,{x:Math.max(-1,Math.min(1,-error/.08)),z:Math.abs(error)<.1?-1:0});updateGame(s,.05);
  }
  assert.fail('sailing did not arrive');
 }
 function harvest(region) {
  for(const n of SALVAGE_NODES.filter(n=>n.region===region)) {
   sail(n.position);
   if(n.access==='shore')assert.equal(act(s,'gather',n.id).ok,true);
   else {assert.equal(act(s,'dive').ok,true);finish(s);(s.cleanup.attempt.y=0,act(s,'leave-cleanup'));}
  }
 }
 harvest('home');assert.equal(act(s,'build','waterwheel').ok,true);
 harvest('mangrove');for(const id of ['crane','greenhouse'])assert.equal(act(s,'build',id).ok,true,id);
 harvest('reef');updateGame(s,24);assert.equal(act(s,'build','sail').ok,true);harvest('horizon');updateGame(s,24);assert.equal(act(s,'build','beacon').ok,true);
 assert.equal(s.departed,true);assert.deepEqual(s.quest.claimed,[]);assert.equal(s.collected.length,17);assert.equal(s.stats.gathered.pearls,19);
 assert.deepEqual(deserializeGame(serializeGame(s)).inventory,s.inventory);
});

// Reach regression: the old 4.5m centre circle excluded real 7x9m hull corners.
// Local X is across the hull; local +Z is the bow, rotated by domain heading.
function raftAtOffset(state, node, x, z, heading) {
 state.heading=heading;
 state.position={x:node.x-(x*Math.cos(heading)+z*Math.sin(heading)),
   z:node.z-(-x*Math.sin(heading)+z*Math.cos(heading))};
}
test('oriented footprint includes sides bow stern and exact corners at forward reverse and oblique headings',async()=>{
 const {salvageReach,RAFT_HALF_WIDTH,RAFT_HALF_LENGTH}=await import('../src/game.js');
 assert.equal(RAFT_HALF_WIDTH,3.5);assert.equal(RAFT_HALF_LENGTH,4.5);
 const n=SALVAGE_NODES.find(n=>n.id==='home-driftwood');
 for(const heading of [0,Math.PI/2,Math.PI,3*Math.PI/2,.73]) {
  for(const [x,z] of [[3.5,0],[-3.5,0],[0,4.5],[0,-4.5],[3.5,4.5],[-3.5,4.5],[3.5,-4.5],[-3.5,-4.5],[4.5,0],[-4.5,0]]) {
   const s=createGame();raftAtOffset(s,n,x,z,heading);const before=structuredClone(s.position);
   assert.equal(salvageReach(s,n.position),true,`${heading}: ${x},${z}`);
   const context=getContext(s), entry=context.nodes.find(t=>t.id===n.id);
   assert.equal(entry.inReach,true);assert.equal(entry.available,true);assert.equal(entry.reason,null);
   assert.ok(context.nearby.some(t=>t.id===n.id));
   assert.equal(act(s,'gather',n.id).ok,true);assert.deepEqual(s.position,before);
  }
 }
});
test('union reach rejects just-outside corners and circle and preserves circular-only legacy swim reach',async()=>{
 const {salvageReach}=await import('../src/game.js');const n=SALVAGE_NODES.find(n=>n.id==='home-driftwood');
 for(const heading of [0,Math.PI/2,Math.PI,3*Math.PI/2,.73]) {
  for(const [x,z] of [[3.500001,4.5],[3.5,4.500001],[-3.500001,-4.5],[-3.5,-4.500001],[4.500001,0],[0,4.500001]]) {
   const s=createGame();raftAtOffset(s,n,x,z,heading);const before=structuredClone(s);
   assert.equal(salvageReach(s,n.position),false,`${heading}: ${x},${z}`);
   assert.equal(getContext(s).nodes.find(t=>t.id===n.id).reason,'too_far');
   assert.equal(act(s,'gather',n.id).code,'too_far');assert.deepEqual(s,before);
  }
  const s=createGame();raftAtOffset(s,n,3.5,4.5,heading);s.diving=true;
  assert.equal(salvageReach(s,n.position),false);assert.equal(act(s,'gather',n.id).code,'too_far');
  raftAtOffset(s,n,4.4,0,heading);assert.equal(act(s,'gather',n.id).ok,true);
 }
});
test('public salvage Dive and explicit entry use footprint without moving raft or changing surface air and gates',()=>{
 const n=SALVAGE_NODES.find(n=>n.id==='home-wreck');
 for(const heading of [0,Math.PI/2,Math.PI,3*Math.PI/2,.73])for(const [x,z] of [[3.5,4.5],[-3.5,-4.5]])for(const explicit of [false,true]) {
  const s=createGame();raftAtOffset(s,n,x,z,heading);
  // Isolate selection while preserving every normal entry gate.
  s.collected=SALVAGE_NODES.filter(t=>t.access!=='shore'&&t.id!==n.id).map(t=>t.id);
  const position={...s.position};
  assert.equal(getContext(s).diveSite.nodeId,n.id);assert.equal(getContext(s).canDive,true);
  const outcome=explicit?act(s,'enter-cleanup',{siteId:`salvage:${n.id}`}):act(s,'dive');
  assert.equal(outcome.ok,true);assert.equal(getCleanupSite(s).nodeId,n.id);assert.deepEqual(s.position,position);
  assert.equal('helm' in s,false);assert.equal(s.cleanup.attempt.air,24);
 }
 const outside=createGame();raftAtOffset(outside,n,3.500001,4.5,0);
 outside.collected=SALVAGE_NODES.filter(t=>t.access!=='shore'&&t.id!==n.id).map(t=>t.id);
 assert.equal(getContext(outside).canDive,false);const before=structuredClone(outside);
 assert.equal(act(outside,'dive').code,'no_dive_site');assert.equal(act(outside,'enter-cleanup',{siteId:`salvage:${n.id}`}).code,'too_far');assert.deepEqual(outside,before);
});
test('footprint still enforces high water underwater-only nodes and region capability',()=>{
 for(const id of ['home-timber','home-pearls','mangrove-crate']) {
  const s=createGame(),n=SALVAGE_NODES.find(n=>n.id===id);raftAtOffset(s,n,3.5,4.5,.73);
  if(n.region!=='home') {
   assert.equal(act(s,'gather',id).code,'locked_region');
   assert.equal(act(s,'enter-cleanup',{siteId:`salvage:${id}`}).code,'locked_region');
   s.upgrades.waterwheel=true;
  }
  s.time=90;
  assert.equal(act(s,'gather',id).code,n.access==='underwater'?'dive_required':'high_tide');
  assert.equal(act(s,'enter-cleanup',{siteId:`salvage:${id}`}).ok,true);
  (s.cleanup.attempt.y=0,act(s,'leave-cleanup'));s.time=0;
  assert.equal(act(s,'gather',id).code,n.access==='underwater'?'dive_required':'gathered');
 }
});
test('competing targets preserve nearest eligible order and stable catalogue ties',()=>{
 const s=createGame();s.position={x:0,z:1};
 for(let i=0;i<3;i++)assert.equal(getContext(s).gatherTarget.id,'home-driftwood');
 assert.equal(act(s,'gather').nodeId,'home-driftwood');assert.equal(getContext(s).gatherTarget.id,'home-crate');
 const n=SALVAGE_NODES.find(n=>n.id==='home-timber');raftAtOffset(s,n,3.5,4.5,0);
 assert.ok(getContext(s).nearby.some(t=>t.id===n.id));
 // The already collected closer driftwood must never mask a reachable corner.
 assert.equal(getContext(s).gatherTarget.id,n.id);assert.equal(act(s,'gather').nodeId,n.id);
 const d=createGame();d.position={x:-6.5,z:-7.5};d.heading=Math.PI/2;
 // Equal distances retain catalogue order on repeated read-only queries.
 for(let i=0;i<3;i++)assert.equal(getContext(d).diveSite.nodeId,'home-wreck');
 assert.equal(act(d,'dive').ok,true);assert.equal(getCleanupSite(d).nodeId,'home-wreck');
});
test('footprint entry keeps recovery active-attempt and survey-buoy limits unchanged',()=>{
 const n=SALVAGE_NODES.find(n=>n.id==='home-wreck'),s=createGame();raftAtOffset(s,n,3.5,4.5,Math.PI);
 s.recovery=1;assert.equal(getContext(s).canDive,false);assert.equal(act(s,'dive').code,'no_dive_site');
 s.recovery=0;assert.equal(act(s,'enter-cleanup',{siteId:`salvage:${n.id}`}).ok,true);
 const before=structuredClone(s);assert.equal(act(s,'dive').code,'cleanup_active');assert.deepEqual(s,before);
 const survey=createGame();survey.inventory={...RECIPES.waterwheel.cost};act(survey,'build','waterwheel');act(survey,'start-expedition','pearl-trail');
 const buoy=getCleanupSite(survey,'survey:pearl-trail');raftAtOffset(survey,buoy,3.5,4.5,0);
 assert.notEqual(getContext(survey).diveSite?.kind,'survey');
 assert.equal(act(survey,'enter-cleanup',{siteId:buoy.id}).code,'too_far');
});
