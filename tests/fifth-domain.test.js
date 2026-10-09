import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,act,steerGame,updateGame,getCleanupSite} from '../src/game.js';
function completedDive(){const s=createGame();s.position={x:6,z:-9};assert.equal(act(s,'enter-cleanup',{siteId:'salvage:home-pearls'}).ok,true);const t=getCleanupSite(s).trash[0];Object.assign(s.cleanup.attempt,{x:t.x,y:t.y});for(let i=0;i<16;i++)steerGame(s,.05,{interact:true,targetId:t.id});assert.equal(s.cleanup.attempt.status,'complete');return s;}
test('objective completion keeps underwater oxygen ticking',()=>{const s=completedDive(),air=s.cleanup.attempt.air;updateGame(s,1);assert.equal(s.cleanup.attempt.air,air-1);});
test('completed diver cannot leave below the surface',()=>{const s=completedDive(),before=structuredClone(s);assert.equal(act(s,'leave-cleanup').code,'surface_required');assert.deepEqual(s,before);});

import {CLEANUP_SITES,SALVAGE_NODES,DIVE_TROPHIES,generateDiveWorld,diveSeed,serializeGame,deserializeGame,EXPEDITIONS} from '../src/game.js';
function swim(s,x,y){for(let i=0;i<2000;i++){const a=s.cleanup.attempt,dx=x-a.x,dy=y-a.y,d=Math.hypot(dx,dy);if(d<1e-8)return;const m=Math.min(1,d/(2.2*.05))/d;steerGame(s,.05,{x:dx*m,z:-dy*m});updateGame(s,.05);assert.notEqual(a.status,'failed','round trip must fit breath');}assert.fail('swim timed out');}
function collect(s,t){swim(s,t.x,t.y);for(let i=0;i<16;i++){steerGame(s,.05,{interact:true,targetId:t.id});updateGame(s,.05);}assert.ok(s.cleanup.attempt.collected.includes(t.id));}
function unlockedState(){const s=createGame();for(const id of Object.keys(s.upgrades))s.upgrades[id]=true;return s;}
test('each undersea resource has a stable distinct seeded world and a meaningful safe full swim',()=>{
 const shapes=new Set(),seeds=new Set(),biomes=new Set();
 for(const n of SALVAGE_NODES.filter(n=>n.access!=='shore')){
  const s=unlockedState();s.position={...n.position};assert.equal(act(s,'enter-cleanup',{siteId:`salvage:${n.id}`}).ok,true);
  const site=getCleanupSite(s),t=site.trash[0];assert.ok(t.y<=-10);assert.ok(Math.abs(t.x)>=3);
  assert.equal(site.seed,diveSeed(site.id));assert.deepEqual(getCleanupSite(s),site);
  assert.deepEqual(generateDiveWorld({...site,trash:[{id:n.id,name:n.name,x:0,y:-4}]}),site);
  seeds.add(site.seed);shapes.add(JSON.stringify(site.terrain));biomes.add(site.biome);
  assert.equal(site.terrain.length,15);for(const p of site.terrain){assert.ok(p.y<=-16&&p.y>=-18);}
  collect(s,t);assert.equal(s.cleanup.attempt.status,'complete');swim(s,0,0);
  assert.ok(s.cleanup.attempt.air>=5,'conservative round trip retains five seconds of air');assert.ok(s.time>=9,'single pickup still involves meaningful swimming');
  assert.equal(act(s,'leave-cleanup').ok,true);
 }
 assert.equal(seeds.size,SALVAGE_NODES.filter(n=>n.access!=='shore').length);assert.equal(shapes.size,seeds.size);assert.ok(biomes.size>=4);
});
test('both seeded restorations are reachable with separate breaths and no reward until final pickup',()=>{
 for(const site of CLEANUP_SITES){const s=createGame();s.position={...site.position};act(s,'enter-cleanup',{siteId:site.id});
  for(const [i,t] of site.trash.entries()){collect(s,t);if(i<site.trash.length-1)assert.deepEqual(s.inventory,{wood:0,scrap:0,pearls:0});swim(s,0,0);updateGame(s,3);}
  assert.deepEqual(s.inventory,site.reward);assert.equal(act(s,'leave-cleanup').ok,true);
 }
});
test('deeper seeded survey fits one breath with air remaining and preserves expedition rules',()=>{
 const s=unlockedState();assert.equal(act(s,'start-expedition','pearl-trail').ok,true);s.position={...EXPEDITIONS[1].waypoints[0]};act(s,'dive');const site=getCleanupSite(s);
 for(const t of site.trash)collect(s,t);assert.equal(s.expeditions.active.ready,true);assert.ok(Math.min(...site.trash.map(t=>t.y))<=-14);
 swim(s,0,0);assert.ok(s.cleanup.attempt.air>=4);assert.equal(s.cleanup.attempt.collected.length,4);assert.ok(s.trophies.includes('pearl-crown'));assert.equal(act(s,'leave-cleanup').ok,true);
});
test('completion exhaustion retry reentry and reload cannot duplicate credits or relics',()=>{
 let s=completedDive();const inventory={...s.inventory},trophies=[...s.trophies];assert.deepEqual(trophies,['brass-compass']);
 updateGame(s,24);assert.equal(s.cleanup.attempt.status,'failed');assert.equal(s.cleanup.attempt.y,0);assert.deepEqual(s.inventory,inventory);assert.deepEqual(s.trophies,trophies);
 for(let i=0;i<3;i++){assert.equal(act(s,'retry-cleanup').ok,true);assert.equal(s.cleanup.attempt.status,'complete');s.cleanup.attempt.y=-12;updateGame(s,24);assert.deepEqual(s.inventory,inventory);assert.deepEqual(s.trophies,trophies);}
 assert.equal(act(s,'leave-cleanup').ok,true);s=deserializeGame(serializeGame(s));assert.deepEqual(s.trophies,trophies);
 act(s,'enter-cleanup',{siteId:'salvage:home-pearls'});assert.equal(s.cleanup.attempt.status,'complete');assert.deepEqual(s.inventory,inventory);assert.deepEqual(s.trophies,trophies);
});
test('six distinct tangible relics are earned through assigned dives and persist in cabin saves',()=>{
 let s=unlockedState();assert.equal(new Set(DIVE_TROPHIES.map(t=>t.id)).size,6);assert.equal(new Set(DIVE_TROPHIES.map(t=>t.siteId)).size,6);
 for(const trophy of DIVE_TROPHIES){if(trophy.siteId.startsWith('survey:')){s.position={x:0,z:0};act(s,'start-expedition','pearl-trail');}
  const site=getCleanupSite(s,trophy.siteId);assert.ok(site);assert.equal(site.trophy.id,trophy.id);s.position={...site.position};assert.equal(act(s,'enter-cleanup',{siteId:site.id}).ok,true);
  for(const [i,t] of site.trash.entries()){collect(s,t);if(site.kind!=='survey'&&i<site.trash.length-1){swim(s,0,0);updateGame(s,3);}}
  assert.equal(s.trophies.filter(id=>id===trophy.id).length,1);swim(s,0,0);act(s,'leave-cleanup');
 }
 const loaded=deserializeGame(serializeGame(s));assert.deepEqual(loaded.trophies,DIVE_TROPHIES.map(t=>t.id));assert.deepEqual(loaded.inventory,s.inventory);
});
test('legacy saves preserve earned resources without fabricated trophies and trophy IDs validate strictly',()=>{
 const s=completedDive();s.cleanup.attempt=null;const saved=JSON.parse(serializeGame(s));delete saved.trophies;const legacy=deserializeGame(JSON.stringify(saved));assert.deepEqual(legacy.trophies,[]);assert.deepEqual(legacy.inventory,s.inventory);assert.deepEqual(legacy.collected,s.collected);
 for(const trophies of [null,{},['unknown'],['brass-compass','brass-compass']])assert.throws(()=>deserializeGame(JSON.stringify({...saved,trophies})),{code:'INVALID_SAVE'});
});
test('surface gate also protects unfinished objectives and zero-air last-frame cannot earn a relic',()=>{
 const s=createGame();act(s,'enter-cleanup',{siteId:'home-reef'});s.cleanup.attempt.y=-2;const before=structuredClone(s);assert.equal(act(s,'leave-cleanup').code,'surface_required');assert.deepEqual(s,before);
 const site=getCleanupSite(s),a=s.cleanup.attempt,t=site.trash.at(-1);Object.assign(a,{x:t.x,y:t.y,collected:site.trash.slice(0,-1).map(t=>t.id),selectedId:t.id,actionProgress:.99,air:.01});
 steerGame(s,.05,{interact:true,targetId:t.id});updateGame(s,.05);assert.equal(a.status,'failed');assert.deepEqual(s.trophies,[]);assert.deepEqual(s.cleanup.completed,[]);assert.deepEqual(s.inventory,{wood:0,scrap:0,pearls:0});
});
test('a legacy rewarded site can earn its new relic through a fresh dive without repaying supplies',()=>{
 const s=createGame();s.cleanup.completed=['home-reef'];const supplies={...s.inventory};act(s,'enter-cleanup',{siteId:'home-reef'});assert.equal(s.cleanup.attempt.status,'active');
 const site=getCleanupSite(s);for(const [i,t] of site.trash.entries()){collect(s,t);if(i<site.trash.length-1){swim(s,0,0);updateGame(s,3);}}
 assert.deepEqual(s.inventory,supplies);assert.deepEqual(s.cleanup.completed,['home-reef']);assert.deepEqual(s.trophies,['nautilus-shell']);
 swim(s,0,0);act(s,'leave-cleanup');act(s,'enter-cleanup',{siteId:'home-reef'});assert.equal(s.cleanup.attempt.status,'complete');assert.deepEqual(s.inventory,supplies);
});
test('legacy collected relic salvage remains available through contextual dive without duplicate material',async()=>{
 const {getContext,getDiveSite}=await import('../src/game.js');const {getDiveSite:cleanupDiveSite}=await import('../src/cleanup.js');
 let s=completedDive();s.cleanup.attempt=null;const raw=JSON.parse(serializeGame(s));delete raw.trophies;s=deserializeGame(JSON.stringify(raw));const supplies={...s.inventory},gathered={...s.stats.gathered};
 assert.equal(getDiveSite(s)?.id,'salvage:home-pearls');assert.equal(cleanupDiveSite(s)?.id,'salvage:home-pearls');assert.equal(getContext(s).canDive,true);assert.equal(getContext(s).diveSite.id,'salvage:home-pearls');
 const material=getContext(s).nodes.find(n=>n.id==='home-pearls');assert.equal(material,undefined,'collected material is not shown as salvage');assert.equal(act(s,'gather','home-pearls').ok,false);
 assert.equal(act(s,'dive').ok,true);assert.equal(getCleanupSite(s).id,'salvage:home-pearls');collect(s,getCleanupSite(s).trash[0]);assert.deepEqual(s.trophies,['brass-compass']);assert.deepEqual(s.inventory,supplies);assert.deepEqual(s.stats.gathered,gathered);
 swim(s,0,0);act(s,'leave-cleanup');assert.notEqual(getDiveSite(s)?.id,'salvage:home-pearls');assert.notEqual(cleanupDiveSite(s)?.id,'salvage:home-pearls');
});
