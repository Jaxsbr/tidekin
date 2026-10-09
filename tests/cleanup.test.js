import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, act, steerGame, updateGame, getCleanupContext, CLEANUP_SITES,
  serializeGame, deserializeGame, getContext, SALVAGE_NODES } from '../src/game.js';
const site = CLEANUP_SITES[0];
function enter(state = createGame()) {
  assert.equal(act(state,'enter-cleanup',{siteId:site.id}).ok,true);
  return state;
}
function swimTo(state,x,y) {
  for(let i=0;i<3000;i++) {
    const a=state.cleanup.attempt, dx=x-a.x, dy=y-a.y;
    if(Math.hypot(dx,dy)<.01)return;
    const scale=Math.min(1,Math.hypot(dx,dy)/(.02*2.2))/Math.hypot(dx,dy);
    steerGame(state,.02,{x:dx*scale,z:-dy*scale});updateGame(state,.02);
    assert.notEqual(a.status,'failed','route should allow enough air');
  }
  assert.fail('swim did not arrive');
}
function gatherAt(state,trash) {
  swimTo(state,trash.x,0); swimTo(state,trash.x,trash.y);
  assert.equal(act(state,'collect-trash',{trashId:trash.id}).code,'action_required');
  for(let i=0;i<16;i++){steerGame(state,.05,{interact:true,targetId:trash.id});updateGame(state,.05);}
}
test('catalog is immutable and entry uses actual raft distance with inclusive 12m boundary',()=>{
  assert.equal(site.trash.length,3);assert.equal(new Set(site.trash.map(t=>t.id)).size,3);
  assert.throws(()=>{site.trash[0].x=123;},TypeError);
  const state=createGame();assert.equal(getCleanupContext(state).canEnter,true);
  state.position={x:0,z:20.001};let before=structuredClone(state);
  assert.equal(act(state,'enter-cleanup',{siteId:site.id}).code,'too_far');assert.deepEqual(state,before);
  state.position.z=20;assert.equal(getCleanupContext(state).ready,true);enter(state);
  assert.equal(state.diving,false);assert.equal(state.cleanup.attempt.air,24);
  assert.equal(getCleanupContext(state).status,'active');
});
test('swimming is slow normalized x/up with bounds and never moves the raft',()=>{
  const state=enter();const raft={...state.position};
  steerGame(state,.05,{x:1,z:1});let a=state.cleanup.attempt;
  assert.ok(Math.abs(Math.hypot(a.x,a.y)-.11)<1e-12);assert.ok(a.y<0);
  steerGame(state,.05,{x:0,z:-1});assert.equal(a.y,0);
  for(let i=0;i<500;i++)steerGame(state,.05,{x:1,z:1});
  assert.equal(a.x,28);assert.equal(a.y,-18);assert.deepEqual(state.position,raft);
  const before=structuredClone(state);steerGame(state,.05,{x:NaN,z:Infinity});updateGame(state,0);
  assert.deepEqual(state,before);
});
test('surface replenishes ten seconds of air per second without resetting objectives',()=>{
  const state=enter();gatherAt(state,site.trash[0]);
  swimTo(state,state.cleanup.attempt.x,-.34);
  const a=state.cleanup.attempt, air=a.air;assert.equal(getCleanupContext(state).atSurface,true);
  updateGame(state,.2);assert.ok(Math.abs(a.air-Math.min(24,air+2))<1e-10);
  assert.deepEqual(a.collected,[site.trash[0].id]);
  updateGame(state,5);assert.equal(a.air,24);
  a.y=-.350001;updateGame(state,1);assert.equal(a.air,23);
});
test('exhaustion clears all trash immediately; repeated retries reset breath position and bag without cooldown',()=>{
  const state=enter(), supplies=structuredClone(state.inventory);
  for(let retry=0;retry<3;retry++){
    gatherAt(state,site.trash[0]);const a=state.cleanup.attempt;
    updateGame(state,a.air);assert.equal(a.status,'failed');assert.equal(a.air,0);assert.deepEqual(a.collected,[]);
    assert.deepEqual(state.cleanup.completed,[]);assert.equal(state.recovery,0);
    const before=structuredClone(a);steerGame(state,.05,{x:1,z:-1});updateGame(state,10);assert.deepEqual(a,before);
    assert.equal(act(state,'collect-trash').ok,false);
    assert.equal(act(state,'retry-cleanup').ok,true);
    assert.deepEqual(state.cleanup.attempt,{siteId:site.id,status:'active',x:0,y:0,air:24,collected:[],selectedId:null,actionProgress:0,facing:{x:1,y:0}});
  }
  assert.deepEqual(state.inventory,supplies);assert.equal(state.stats.dives,0);assert.equal(state.stats.rescues,0);
});
test('last pickup completes immediately, persists, and reentry shows clean site without duplicate rewards',()=>{
  const state=enter(), supplies=structuredClone(state.inventory), stats=structuredClone(state.stats);
  for(const trash of site.trash){gatherAt(state,trash);if(state.cleanup.attempt.status==='active'){
    swimTo(state,trash.x,0);updateGame(state,3);
  }}
  assert.equal(state.cleanup.attempt.status,'complete');assert.deepEqual(state.cleanup.completed,[site.id]);
  assert.equal(getCleanupContext(state).count,3);assert.equal(getCleanupContext(state).target,null);
  updateGame(state,100);assert.equal(state.cleanup.attempt.status,'complete');
  assert.equal(act(state,'retry-cleanup').ok,false);assert.equal(state.cleanup.attempt.status,'complete');assert.equal(act(state,'collect-trash').ok,false);
  assert.deepEqual(state.inventory,{wood:supplies.wood+1,scrap:supplies.scrap+1,pearls:supplies.pearls});assert.deepEqual(state.stats,stats);
  const loaded=deserializeGame(serializeGame(state));assert.deepEqual(loaded.cleanup,{revision:3,completed:[site.id],attempt:null});
  enter(loaded);assert.equal(loaded.cleanup.attempt.status,'complete');assert.equal(getCleanupContext(loaded).count,3);
  act(loaded,'leave-cleanup');enter(loaded);assert.deepEqual(loaded.cleanup.completed,[site.id]);
});
test('partial exit abandons the attempt and saves discard only transient cleanup and helm',()=>{
  const state=createGame();state.position={x:4,z:1};act(state,'gather','home-driftwood');
  act(state,'claim','first-salvage');act(state,'build','waterwheel');act(state,'start-expedition','current-run');
  enter(state);gatherAt(state,site.trash[0]);
  const before=structuredClone(state), loaded=deserializeGame(serializeGame(state));
  assert.deepEqual(state,before,'saving cannot change live pause/attempt');
  assert.deepEqual(loaded.cleanup,{revision:3,completed:[],attempt:null});
  for(const key of ['inventory','upgrades','quest','stats','expeditions','collected','position','time'])assert.deepEqual(loaded[key],state[key]);
  const raw=JSON.parse(serializeGame(state));assert.deepEqual(Object.keys(raw.cleanup),['completed','revision']);assert.equal('helm' in raw,false);
  swimTo(state,state.cleanup.attempt.x,0);act(state,'leave-cleanup');enter(state);assert.deepEqual(state.cleanup.attempt.collected,[]);
  act(state,'leave-cleanup');steerGame(state,.05,{x:1,z:-1});
  const restored=deserializeGame(serializeGame(state));assert.equal('helm' in restored,false);assert.equal(restored.heading,state.heading);
});
test('cleanup locks conflicting actions and legacy expeditions cannot advance or reset from its breathing',()=>{
  const state=createGame();state.inventory={wood:100,scrap:100,pearls:100};act(state,'build','waterwheel');
  act(state,'start-expedition','pearl-trail');enter(state);
  for(const action of ['dive','surface','gather','build','travel','claim','rig','start-expedition','claim-expedition','abandon-expedition']){
    const before=structuredClone(state);assert.equal(act(state,action).code,'cleanup_active');assert.deepEqual(state,before);
  }
  assert.equal(getContext(state).canDive,false);assert.equal(getContext(state).gatherTarget,null);
  state.position={x:8,z:-12};updateGame(state,1);assert.equal(state.expeditions.active.index,0);
  gatherAt(state,site.trash[0]);swimTo(state,-3,0);updateGame(state,3);
  assert.equal(state.cleanup.attempt.collected.length,1);assert.equal(state.expeditions.active.index,0);
});
test('collect validates nearest range identity and duplicates atomically; context is read-only',()=>{
  const state=enter();const before=structuredClone(state);const originalX=site.trash[0].x;const context=getCleanupContext(state);
  assert.equal(context.canCollect,false);assert.equal(context.count,0);assert.equal(context.total,3);
  assert.deepEqual(state,before);context.target.x=100;assert.equal(site.trash[0].x,originalX);
  assert.notEqual(site.trash[0].x,100);
  for(const payload of [{trashId:'unknown'},{trashId:site.trash[0].id},null,[]]){
    assert.equal(act(state,'collect-trash',payload).ok,false);assert.deepEqual(state,before);
  }
  const trash=site.trash[0];state.cleanup.attempt.x=trash.x+1.25;state.cleanup.attempt.y=trash.y;
  assert.equal(getCleanupContext(state).canCollect,true);assert.equal(act(state,'collect-trash').ok,true);
  for(let i=0;i<16;i++)steerGame(state,.05,{interact:true,targetId:trash.id});
  const collected=structuredClone(state);assert.equal(act(state,'collect-trash',{trashId:trash.id}).code,'already_collected');assert.deepEqual(state,collected);
});
test('old v2 saves default new fields; present progress and headings validate strictly',()=>{
  const old=createGame();delete old.cleanup;delete old.helm;delete old.heading;
  assert.deepEqual(deserializeGame(JSON.stringify(old)).cleanup,{revision:3,completed:[],attempt:null});
  for(const cleanup of [null,[],{}, {completed:['unknown']},{completed:[site.id,site.id]},{completed:'home-reef'}]){
    assert.throws(()=>deserializeGame(JSON.stringify({...old,cleanup})),{code:'INVALID_SAVE'});
  }
  for(const heading of [-1,null,'0',7])assert.throws(()=>deserializeGame(JSON.stringify({...old,heading})),{code:'INVALID_SAVE'});
  assert.throws(()=>deserializeGame(JSON.stringify({...old,helm:'yes'})),{code:'INVALID_SAVE'});
  assert.equal('helm' in deserializeGame(JSON.stringify({...old,helm:true})),false);
});
test('floating and anchored node names distinguish their collection rules',()=>{
  assert.match(SALVAGE_NODES.find(n=>n.id==='home-driftwood').name,/Floating/);
  assert.match(SALVAGE_NODES.find(n=>n.id==='home-timber').name,/Anchored/);
});

test('direct cleanup dispatcher rejects unknown actions even at the last trash atomically', async()=>{
  const {cleanupAction}=await import('../src/cleanup.js');
  for(const final of [false,true]){
    const state=enter(), a=state.cleanup.attempt, target=site.trash.at(-1);
    Object.assign(a,{x:target.x,y:target.y,collected:final?site.trash.slice(0,-1).map(t=>t.id):[]});
    const before=structuredClone(state);
    assert.equal(cleanupAction(state,'typo-action',{}).code,'unknown_action');
    assert.deepEqual(state,before);
    for(const payload of [null,[],2,'trash']){
      assert.equal(cleanupAction(state,'collect-trash',payload).code,'invalid_payload');assert.deepEqual(state,before);
    }
  }
});
test('direct cleanup delta boundaries and input validation reject without corrupting attempts',async()=>{
  const {steerCleanup,updateCleanup}=await import('../src/cleanup.js');
  const state=enter();state.cleanup.attempt.y=-2;const before=structuredClone(state);
  for(const dt of [-1,NaN,Infinity,-Infinity,'1',null,undefined]){
    assert.throws(()=>steerCleanup(state,dt,{x:1,z:1}),RangeError);
    assert.throws(()=>updateCleanup(state,dt),RangeError);assert.deepEqual(state,before);
    assert.throws(()=>steerGame(state,dt,{x:1,z:1}),RangeError);assert.deepEqual(state,before);
  }
  assert.throws(()=>steerCleanup(state,.050001,{}),RangeError);
  assert.throws(()=>updateCleanup(state,604801),RangeError);
  for(const input of [null,[],1,'move']){
    assert.throws(()=>steerCleanup(state,.05,input),TypeError);
    assert.throws(()=>steerGame(state,.05,input),TypeError);assert.deepEqual(state,before);
  }
  steerCleanup(state,0,null);updateCleanup(state,0);steerCleanup(state,.05);assert.deepEqual(state,before);
  updateCleanup(state,604800);assert.equal(state.cleanup.attempt.status,'failed');
});
test('game facade exports all cleanup tuning constants used by presentation',async()=>{
  const game=await import('../src/game.js'), cleanup=await import('../src/cleanup.js');
  for(const key of ['CLEANUP_AIR','CLEANUP_SWIM_SPEED','CLEANUP_SURFACE','CLEANUP_REFILL','CLEANUP_COLLECT_RANGE']){
    assert.equal(typeof game[key],'number');assert.equal(game[key],cleanup[key]);
  }
});
