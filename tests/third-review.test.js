import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as G from '../src/game.js';

function enterSurvey() {
  const s=G.createGame();s.inventory={...G.RECIPES.waterwheel.cost};
  assert.equal(G.act(s,'build','waterwheel').ok,true);
  assert.equal(G.act(s,'start-expedition','pearl-trail').ok,true);
  s.position={...G.EXPEDITIONS[1].waypoints[0]};
  assert.equal(G.act(s,'dive').ok,true);return s;
}
function work(s,t,input={},frames=18) {
  Object.assign(s.cleanup.attempt,{x:t.x,y:t.y});
  for(let i=0;i<frames;i++){G.steerGame(s,.05,{interact:true,targetId:t.id,...input});G.updateGame(s,.05);}
}

test('review: surfacing resets an incomplete one-breath survey pull',()=>{
 const s=enterSurvey(),a=s.cleanup.attempt,t=G.getCleanupSite(s).trash[0];
 work(s,t,{},3);assert.ok(a.actionProgress>0);assert.equal(a.collected.length,0);
 a.y=0;G.updateGame(s,.05);assert.equal(a.actionProgress,0);assert.equal(a.selectedId,null);assert.deepEqual(a.collected,[]);
});

test('review: confirmed new voyage saves a fresh always-controllable raft',async()=>{
  // Execute the actual UI entry function with inert DOM/renderer dependencies.
  // This is a lifecycle unit test, not evidence of browser rendering.
  const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const start=source.slice(source.indexOf('async function startGame('),source.indexOf('\nfunction showTutorial('));
  const noop=()=>{};
  const node={hidden:false,open:false,focus:noop,querySelector:()=>null};
  const renderer={resize:noop,update:noop,setView:noop};
  const context=vm.createContext({loading:false,createGame:G.createGame,deserializeGame:G.deserializeGame,
    state:null,scene:null,scenePromise:Promise.resolve(renderer),
    resetInput:noop,panelDialog:node,closePanel:noop,showModal:noop,modalDialog:node,
    menu:{},gameView:{},applySettings:noop,closeModal:noop,refreshHud:noop,canvas:node,
    lastCleanupStatus:null,fatalError:false,lastEventKey:null,trackedTarget:null,guideStart:null,
    chosenDetour:null,rafIntervals:[],renderedFrames:0,saves:0,
    knownTrophies:new Set(),keepsakeTimer:null,clearTimeout:noop,$:()=>node,escapeHTML:String,
    saveGame(){context.saves++;return true;},console});
  await vm.runInContext(start+'\nstartGame(false)',context);
  assert.equal('helm' in context.state,false);
  G.steerGame(context.state,.05,{z:-1});assert.equal(context.state.position.z,.25);
  assert.equal(context.saves,1);
});

test('review: removed variant action cannot reset an earned target or partial pull',()=>{
 const s=G.createGame();G.act(s,'enter-cleanup',{siteId:'home-reef'});
 const [one,two]=G.getCleanupSite(s).trash;work(s,one);work(s,two,{},3);
 const before=structuredClone(s);
 assert.equal(G.act(s,'cleanup-variant',{scheme:'pointer',action:'clean',tuning:'quick'}).ok,false);
 assert.deepEqual(s.cleanup.attempt,before.cleanup.attempt);assert.deepEqual(s.inventory,before.inventory);
});

test('review: legacy underwater survey migration resets partial but retains ready and lifetime records',()=>{
  for(const ready of [false,true]){
    const s=enterSurvey();s.cleanup.attempt=null;s.diving=true;s.time=10;
    s.expeditions.active.index=ready?4:2;s.expeditions.active.ready=ready;
    const loaded=G.deserializeGame(JSON.stringify(s));
    assert.equal(loaded.diving,false);assert.equal(loaded.cleanup.attempt,null);
    assert.equal(loaded.expeditions.active.index,ready?4:0);assert.equal(loaded.expeditions.active.ready,ready);
    assert.deepEqual(loaded.stats,s.stats);assert.deepEqual(loaded.inventory,s.inventory);
  }
});

test('review: selected target outside reach never falls through to a nearby target',()=>{
  const s=G.createGame();G.act(s,'enter-cleanup',{siteId:'home-reef'});
  const [near,far]=G.getCleanupSite(s).trash;
  work(s,near,{targetId:far.id},40);
  assert.deepEqual(s.cleanup.attempt.collected,[]);assert.equal(s.cleanup.attempt.actionProgress,0);
});

test('review: radial boundary contains both forward and reverse outward movement at every heading',()=>{
  for(let i=0;i<72;i++)for(const reverse of [false,true]){
    const angle=i*Math.PI/36,s=G.createGame();
    s.position={x:Math.sin(angle)*21.95,z:Math.cos(angle)*21.95};
    s.heading=(angle+(reverse?Math.PI:0))%(2*Math.PI);
    for(let j=0;j<80;j++)G.steerGame(s,.05,{z:reverse?1:-1});
    assert.ok(Math.hypot(s.position.x,s.position.z)<=22.001);
    assert.equal(s.departed,false);assert.equal(G.act(s,'travel','mangrove').ok,false);
  }
});

test('review: obsolete practice entry earns real static restoration and survey readiness',()=>{
 for(const survey of [false,true]){
 const s=survey?enterSurvey():G.createGame();if(survey)G.act(s,'leave-cleanup');
 assert.equal(G.act(s,'enter-cleanup',{siteId:survey?'survey:pearl-trail':'home-reef',practice:true}).ok,true);
 const before={...s.inventory};for(const t of G.getCleanupSite(s).trash)work(s,t);
 assert.equal(s.cleanup.attempt.status,'complete');
 if(survey){assert.equal(s.expeditions.active.ready,true);assert.deepEqual(s.inventory,before);}
 else{assert.deepEqual(s.cleanup.completed,['home-reef']);assert.equal(s.inventory.wood,before.wood+1);assert.equal(s.inventory.scrap,before.scrap+1);}
 }
});

test('review: UI pointer tracks hovered pull target, release and reset clear held input',()=>{
  const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const section=source.slice(source.indexOf("canvas.addEventListener('pointerdown', event =>"),source.indexOf("canvas.addEventListener('wheel',"));
  const reset=source.slice(source.indexOf('function resetInput()'),source.indexOf('\n',source.indexOf('function resetInput()')));
  const handlers={};let pick={point:{x:1,y:-2},trashId:'first'};
  const c=vm.createContext({canvas:{addEventListener:(name,fn)=>handlers[name]=fn,focus(){},setPointerCapture(){},style:{}},
    isPaused:()=>false,state:{cleanup:{attempt:{}}},scene:{pickCleanup:()=>pick},
    divePointer:{},drag:null,keys:new Set(['KeyE']),touchKeys:new Set(['up']),lastTimestamp:1});
  vm.runInContext(section+'\n'+reset,c);
  handlers.pointerdown({button:0,clientX:0,clientY:0,pointerId:1});
  pick={point:{x:4,y:-3},trashId:'second'};handlers.pointermove({clientX:2,clientY:2});
  assert.equal(c.divePointer.targetId,'second');assert.equal(c.divePointer.held,true);
  handlers.pointerup({});assert.equal(c.divePointer.held,false);
  vm.runInContext('resetInput()',c);assert.equal(c.divePointer.targetId,null);assert.equal(c.keys.size,0);assert.equal(c.touchKeys.size,0);
});

test('review: cleanup scene releases replaced site resources and does not mutate authoritative state',async()=>{
  const THREE=await import('three');
  const {createCleanupScene}=await import('../src/cleanup-scene.js');
  const view=createCleanupScene({THREE});const s=G.createGame();
  G.act(s,'enter-cleanup',{siteId:'home-reef'});view.update(s,.05);
  // Identify replaceable content by geometry ownership instead of relying on art names.
  const geometries=()=>{const set=new Set();view.root.traverse(o=>{if(o.geometry)set.add(o.geometry);});return set;};
  const before=geometries(),disposed=new Set();for(const geo of before)geo.addEventListener('dispose',()=>disposed.add(geo));
  G.act(s,'leave-cleanup');s.position={x:-12,z:8};G.act(s,'enter-cleanup',{siteId:'sheltered-cove'});
  const stateBefore=JSON.stringify(s);view.update(s,.05);assert.equal(JSON.stringify(s),stateBefore);
  const after=geometries(),removed=[...before].filter(g=>!after.has(g));assert.ok(removed.length>0);
  assert.ok(removed.every(g=>disposed.has(g)),'all replaced geometries released');
  for(const geo of after)geo.addEventListener('dispose',()=>disposed.add(geo));
  view.dispose();assert.ok([...after].every(g=>disposed.has(g)));view.dispose();
});

test('review: survey breathing resets partial and completed markers; static breathing preserves pulls',()=>{
 for(const frames of [3,18]){const s=enterSurvey(),a=s.cleanup.attempt,t=G.getCleanupSite(s).trash[0];
 work(s,t,{},frames);a.y=0;G.updateGame(s,.05);
 assert.deepEqual(a.collected,[]);assert.equal(a.selectedId,null);assert.equal(a.actionProgress,0);}
 const s=G.createGame();G.act(s,'enter-cleanup',{siteId:'home-reef'});const a=s.cleanup.attempt,t=G.getCleanupSite(s).trash[0];
 work(s,t,{},3);const progress=a.actionProgress;const air=a.air;a.y=0;G.updateGame(s,.05);
 assert.equal(a.actionProgress,progress);assert.ok(a.air>air);
});

test('review: chart route ETA uses wheel multiplier for every sailing rig',async()=>{
  const {planRoutes}=await import('../src/navigation.js');
  for(const rig of Object.keys(G.RIGS)){
    const s=G.createGame();s.rig=rig;s.speed=G.RIGS[rig].speed;s.time=90;
    const before=planRoutes(s,{x:0,z:14});s.upgrades.waterwheel=true;
    const after=planRoutes(s,{x:0,z:14});
    assert.ok(Math.abs(after.direct.seconds-before.direct.seconds/1.4)<1e-9);
    assert.ok(Math.abs(after.direct.seconds-14/G.sailingSpeed(s))<1e-9);
  }
});

test('TR-3 fitting a rig reports the actual sailing speed and common side-view air',()=>{
  const s=G.createGame();s.inventory={...G.RECIPES.waterwheel.cost};G.act(s,'build','waterwheel');
  const result=G.act(s,'rig','skimmer');assert.equal(result.ok,true);
  assert.match(result.message,/9\.8 m\/s/);assert.match(result.message,/24s/);
});

test('review: current pushes raft backward when outward sailing first crosses the inner foam edge',()=>{
  const inner=G.SHELTER_RADIUS-G.SHELTER_BAND;
  for(const dt of [.001,1/60,.05])for(let i=0;i<72;i++)for(const reverse of [false,true]){
    const angle=i*Math.PI/36,s=G.createGame();s.time=90; // High tide isolates the current from shoal drag.
    const startRadius=inner-G.sailingSpeed(s)*dt/2;
    s.position={x:Math.sin(angle)*startRadius,z:Math.cos(angle)*startRadius};
    s.heading=(angle+(reverse?Math.PI:0))%(2*Math.PI);
    const before=Math.hypot(s.position.x,s.position.z);
    G.steerGame(s,dt,{z:reverse?1:-1});
    const delta=Math.hypot(s.position.x,s.position.z)-before;
    assert.ok(delta < -1e-6,`entry must move backward, not merely stop; dt=${dt}, angle=${angle}, reverse=${reverse}, delta=${delta}`);
    assert.ok(delta>=-.25-1e-9,'pushback is bounded to 0.25m per allowed frame');
    assert.equal(s.lastEvent.code,'current_pushback');assert.equal(s.departed,false);
  }
});

test('review: current permits inward escape, stationary turning and wheel-enabled outward crossing',()=>{
  const inner=G.SHELTER_RADIUS-G.SHELTER_BAND;
  for(const reverse of [false,true]){
    const s=G.createGame();s.time=90;s.position={x:0,z:inner+.1};
    s.heading=reverse?Math.PI:0;
    G.steerGame(s,.05,{z:reverse?-1:1});
    assert.ok(Math.abs(s.position.z-(inner+.1-.25))<1e-9);
    assert.notEqual(s.lastEvent?.code,'current_pushback');
    const before={...s.position};G.steerGame(s,.05,{x:1});assert.deepEqual(s.position,before);
  }
  const s=G.createGame();s.time=90;s.inventory={...G.RECIPES.waterwheel.cost};
  G.act(s,'build','waterwheel');s.position={x:0,z:G.SHELTER_RADIUS-.05};
  const before=s.position.z;G.steerGame(s,.05,{z:-1});
  assert.ok(s.position.z>before);assert.equal(s.departed,true);assert.equal(s.lastEvent.code,'first_departure');
});

test('TR-4 world scene teardown disposes instanced object buffers as well as shared geometry',async()=>{
  const THREE=await import('three');
  const source=readFileSync(new URL('../src/scene.js',import.meta.url),'utf8');
  const release=source.slice(source.indexOf('function releaseScene('),source.indexOf('\nexport async function createScene('));
  const scene=new THREE.Scene(),geo=new THREE.BoxGeometry(),mat=new THREE.MeshBasicMaterial();
  const instances=new THREE.InstancedMesh(geo,mat,96);scene.add(instances);
  const released={object:0,geometry:0,material:0,renderer:0};
  instances.addEventListener('dispose',()=>released.object++);geo.addEventListener('dispose',()=>released.geometry++);mat.addEventListener('dispose',()=>released.material++);
  vm.runInNewContext(release+'\nreleaseScene(scene,renderer)',{scene,renderer:{dispose(){released.renderer++;}}});
  assert.equal(released.object,1,'Three.js WebGLObjects releases instanceMatrix on the object dispose event');
  assert.equal(released.geometry,1);assert.equal(released.material,1);assert.equal(released.renderer,1);
});

function reviewFunction(source,name,next){return source.slice(source.indexOf(`function ${name}(`),source.indexOf(`\nfunction ${next}(`));}

test('hull review: independent Three.js rotation confirms rectangle/circle union and strict outside edges',async()=>{
  const THREE=await import('three');assert.equal(G.RAFT_HALF_WIDTH,3.5);assert.equal(G.RAFT_HALF_LENGTH,4.5);
  const cases=[[3.5,4.5,true],[-3.5,4.5,true],[3.5,-4.5,true],[-3.5,-4.5,true],
    [4.5,0,true],[-4.5,0,true],[3.50001,4.5,false],[3.5,4.50001,false],[4.50001,0,false]];
  for(let i=0;i<36;i++)for(const [x,z,expected] of cases){
    const s=G.createGame();s.position={x:31,z:-27};s.heading=i*Math.PI/18;
    const p=new THREE.Vector3(x,0,z).applyAxisAngle(new THREE.Vector3(0,1,0),s.heading).add(new THREE.Vector3(s.position.x,0,s.position.z));
    assert.equal(G.salvageReach(s,{x:p.x,z:p.z}),expected,`${i}: ${x},${z}`);
    if(Math.hypot(x,z)>G.GATHER_RANGE){s.diving=true;assert.equal(G.salvageReach(s,{x:p.x,z:p.z}),false);}
  }
});

test('hull review: rotated corner adapters retain identity rewards position gates and save roundtrip',async()=>{
  const THREE=await import('three');
  for(const id of ['home-timber','home-pearls','mangrove-crate'])for(const explicit of [false,true]){
    const s=G.createGame(),n=G.SALVAGE_NODES.find(n=>n.id===id);s.time=90;s.heading=.83;
    const offset=new THREE.Vector3(3.5,0,4.5).applyAxisAngle(new THREE.Vector3(0,1,0),s.heading);
    s.position={x:n.x-offset.x,z:n.z-offset.z};
    if(n.region!=='home'){
      assert.equal(G.act(s,'gather',id).code,'locked_region');
      assert.equal(G.act(s,'enter-cleanup',{siteId:`salvage:${id}`}).code,'locked_region');
      s.upgrades.waterwheel=true;
    }
    const c=G.getContext(s),entry=c.nodes.find(t=>t.id===id);assert.equal(entry.inReach,true);
    assert.equal(entry.reason,n.access==='underwater'?'dive_required':'high_tide');
    const chosen=explicit?n:c.diveSite;assert.ok(chosen);
    const expectedId=explicit?id:chosen.nodeId,expected=G.SALVAGE_NODES.find(t=>t.id===expectedId);
    const before={position:{...s.position},inventory:{...s.inventory},gathered:{...s.stats.gathered},dives:s.stats.dives};
    const result=explicit?G.act(s,'enter-cleanup',{siteId:`salvage:${id}`}):G.act(s,'dive');assert.equal(result.ok,true);
    assert.equal(G.getCleanupSite(s).nodeId,expectedId);assert.deepEqual(s.position,before.position);assert.equal(s.stats.dives,before.dives+1);
    work(s,G.getCleanupSite(s).trash[0]);assert.equal(s.cleanup.attempt.status,'complete');
    assert.equal(s.inventory[expected.type],before.inventory[expected.type]+expected.amount);
    assert.equal(s.stats.gathered[expected.type],before.gathered[expected.type]+expected.amount);
    G.act(s,'leave-cleanup');assert.deepEqual(G.deserializeGame(G.serializeGame(s)).inventory,s.inventory);
  }
});

test('hull review: HUD selection agrees with actual single resource grant',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 for(const setup of [s=>{s.position={x:0,z:1};},s=>{G.act(s,'gather','home-driftwood');s.position={x:2.5,z:1.5};}]){
 const state=G.createGame();setup(state);const context=G.getContext(state);
 const target=vm.runInNewContext(reviewFunction(main,'contextNode','performAction')+'\ncontextNode(context)',{context,nearestNode:()=>null});
 const before=[...state.collected];assert.equal(G.act(state,'gather').nodeId,target.id);
 assert.deepEqual(state.collected.filter(id=>!before.includes(id)),[target.id]);
 }
});

test('TR-5 hull-corner high-tide salvage UI must not redirect into nearby starter cleanup',()=>{
  const state=G.createGame();assert.equal(G.act(state,'gather','home-driftwood').ok,true);
  state.position={x:2.5,z:1.5};state.time=90;
  const context=G.getContext(state);assert.equal(context.nearest.id,'home-timber');
  assert.equal(context.nearest.reason,'high_tide');assert.ok(context.nearest.distance>G.GATHER_RANGE);
  assert.equal(context.diveSite.nodeId,'home-timber');assert.equal(context.canDive,true);
  assert.equal(G.getCleanupContext(state).canEnter,true);
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const choice=vm.runInNewContext(reviewFunction(main,'contextualDiveChoice','toggleDive')+'\ncontextualDiveChoice()',
    {state,Game:G,getContext:G.getContext,GATHER_RANGE:G.GATHER_RANGE,contextNode:c=>c.gatherTarget??c.nearest});
  assert.equal(choice.action,'dive','Space must follow the reachable high-tide resource, not Home Reef');
});

test('hull review: recovery, active attempts and authored entry circles retain their gates',()=>{
  const s=G.createGame();s.position={x:2.5,z:1.5};s.time=90;s.recovery=1;
  assert.equal(G.getContext(s).canDive,false);assert.equal(G.act(s,'dive').code,'no_dive_site');
  s.recovery=0;assert.equal(G.act(s,'dive').ok,true);
  const entered=structuredClone(s);assert.equal(G.act(s,'dive').code,'cleanup_active');assert.deepEqual(s,entered);
  const survey=G.createGame();survey.inventory={...G.RECIPES.waterwheel.cost};G.act(survey,'build','waterwheel');G.act(survey,'start-expedition','pearl-trail');
  const buoy=G.getCleanupSite(survey,'survey:pearl-trail');survey.position={x:buoy.x-3.5,z:buoy.z-4.5};
  assert.equal(G.salvageReach(survey,buoy.position),true);
  assert.equal(G.act(survey,'enter-cleanup',{siteId:buoy.id}).code,'too_far');assert.notEqual(G.getDiveSite(survey)?.kind,'survey');
  survey.position={...buoy.position};assert.equal(G.getDiveSite(survey).kind,'survey');
  const reef=G.createGame(),site=G.CLEANUP_SITES[0];reef.position={x:site.x+site.entryRange+.001,z:site.z};
  assert.equal(G.act(reef,'enter-cleanup',{siteId:site.id}).code,'too_far');
});

// Rendering-unit checks; browser frames and independent visual review remain separate.
test('fourth review: waterwheel assembly unfolds over time, restores final transforms and leaves voyage untouched',async()=>{
 const THREE=await import('three');const {createBuildCinematic}=await import('../src/build-cinematic.js');
 for(const reduced of [false,true]){
 const boat=new THREE.Group(),parts=new THREE.Group();boat.add(parts);
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,1,1),new THREE.MeshBasicMaterial());mesh.position.set(-4,2,1);parts.add(mesh);
 const position=mesh.position.clone(),scale=mesh.scale.clone(),s=G.createGame(),saved=JSON.stringify(s);
 const view=createBuildCinematic(boat,[{id:'waterwheel',object:parts}]);view.begin(reduced);
 const first=view.getStatus();assert.equal(first.active,true);assert.equal(first.progress,0);
 view.update(1/60,reduced);assert.ok(view.getStatus().progress>0&&view.getStatus().progress<1);
 assert.ok(mesh.scale.x<scale.x,'partial assembly must differ from final geometry');
 const elapsed=[];for(let i=1;i<240&&view.getStatus().active;i++){view.update(1/60,reduced);elapsed.push(view.getStatus().progress);}
 assert.ok(elapsed.length>(reduced?10:100),'assembly duration must span meaningful update steps');
 assert.equal(view.getStatus().active,false);assert.equal(view.getStatus().progress,1);
 assert.deepEqual(mesh.position,position);assert.deepEqual(mesh.scale,scale);assert.equal(view.wheelSpeed(),1);
 assert.equal(JSON.stringify(s),saved,'presentation cannot grant resources or alter voyage');
 boat.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 }
});

test('fourth review: changing held pull target cannot transfer progress or collect remotely',()=>{
 const s=G.createGame();assert.equal(G.act(s,'enter-cleanup',{siteId:'home-reef'}).ok,true);
 const a=s.cleanup.attempt,[one,two]=G.getCleanupSite(s).trash;
 work(s,one,{},12);assert.equal(a.collected.length,0);assert.ok(a.actionProgress>.7);
 G.steerGame(s,.05,{interact:true,targetId:two.id});assert.equal(a.actionProgress,0);assert.equal(a.selectedId,null);
 Object.assign(a,{x:two.x,y:two.y});G.steerGame(s,.05,{interact:true,targetId:two.id});assert.ok(a.actionProgress<.1);
 assert.deepEqual(a.collected,[]);assert.deepEqual(s.inventory,{wood:0,scrap:0,pearls:0});
 work(s,two,{},15);assert.deepEqual(a.collected,[two.id]);assert.deepEqual(s.inventory,{wood:0,scrap:0,pearls:0});
});
