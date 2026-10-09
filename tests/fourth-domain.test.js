import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,act,steerGame,updateGame,CLEANUP_SITES,CLEANUP_SWIM_SPEED,CLEANUP_AIR,serializeGame,deserializeGame} from '../src/game.js';
const enter=s=>assert.equal(act(s,'enter-cleanup',{siteId:'home-reef',practice:true,variant:{action:'clean',tuning:'quick'}}).ok,true);
test('chosen contract has seeded wide worlds, original pace and fixed air',()=>{
 assert.equal(CLEANUP_SWIM_SPEED,2.2);assert.equal(CLEANUP_AIR,24);
 assert.ok(CLEANUP_SITES[0].trash.every(t=>t.y<=-10&&t.y>=-15));
 assert.equal(typeof CLEANUP_SITES[0].seed,'number');
 assert.notDeepEqual(CLEANUP_SITES[1].trash.map(t=>[t.x,t.y]),CLEANUP_SITES[0].trash.map(t=>[t.x,t.y]));
 for(const site of CLEANUP_SITES)assert.deepEqual(site.bounds,{minX:-28,maxX:28,minY:-18,maxY:0});
 const s=createGame();enter(s);const a=s.cleanup.attempt;
 for(const key of ['practice','variant','cleaning'])assert.equal(key in a,false);
 steerGame(s,.05,{z:1,tuning:'quick',action:'clean',scheme:'pointer'});assert.ok(Math.abs(a.y+.11)<1e-12);
 assert.equal(act(s,'cleanup-variant',{action:'clean'}).ok,false);
});
test('raft steers immediately and after leaving dives; legacy helm is ignored',()=>{
 const s=createGame();assert.equal('helm' in s,false);
 assert.equal(act(s,'take-helm').code,'unknown_action');assert.equal(act(s,'leave-helm').code,'unknown_action');
 steerGame(s,.05,{z:-1});assert.equal(s.position.z,.25);
 enter(s);act(s,'leave-cleanup');steerGame(s,.05,{z:1});assert.equal(s.position.z,0);
 for(const helm of [true,false]){const loaded=deserializeGame(JSON.stringify({...s,helm}));assert.equal('helm' in loaded,false);steerGame(loaded,.05,{z:-1});assert.equal(loaded.position.z,.25);}
});
test('maximum depth round trip at 2.2 is safe within a full breath',()=>{
 const s=createGame();enter(s);const a=s.cleanup.attempt;
 for(let i=0;i<164;i++){steerGame(s,.05,{z:1});updateGame(s,.05);}
 assert.equal(a.y,-18);
 for(let i=0;i<164;i++){steerGame(s,.05,{z:-1});updateGame(s,.05);}
 assert.equal(a.y,0);assert.equal(a.status,'active');assert.ok(a.air>7);
 a.x=28;a.y=-18;assert.equal(deserializeGame(serializeGame(s)).cleanup.attempt,null);
});
test('held pull is identical for pointer and directional inputs; obsolete practice cannot suppress earned rewards',()=>{
 for(const scheme of ['pointer','directional']){
  const s=createGame();enter(s);const a=s.cleanup.attempt;
  for(const t of CLEANUP_SITES[0].trash){a.x=t.x;a.y=t.y;
   for(let i=0;i<15;i++)steerGame(s,.05,{interact:true,targetId:t.id,scheme,action:'clean',aim:{x:999,y:999}});
   assert.equal(a.collected.includes(t.id),false);
   steerGame(s,.05,{});assert.equal(a.actionProgress,0);
   for(let i=0;i<16;i++)steerGame(s,.05,{interact:true,targetId:t.id,scheme});
   assert.equal(a.collected.includes(t.id),true);
  }
  assert.deepEqual(s.inventory,{wood:1,scrap:1,pearls:0});
  const loaded=deserializeGame(serializeGame(s));enter(loaded);assert.equal(loaded.cleanup.attempt.status,'complete');assert.deepEqual(loaded.inventory,s.inventory);
 }
});
