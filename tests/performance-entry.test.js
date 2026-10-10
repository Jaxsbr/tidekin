import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import * as Game from '../src/game.js';
import { createCharacterArt } from '../src/character-art.js';
import { createCleanupScene } from '../src/cleanup-scene.js';
import { createBuildCinematic } from '../src/build-cinematic.js';
import { releaseScene } from '../src/render-resources.js';
import { enterSurfaceBuoy } from '../scripts/performance/browser.mjs';

// Run the actual scene camera/projections/raycaster and main pointer handlers.
// Only rendering, model/network loading and DOM delivery are CPU adapters.
// These checks cannot establish browser focus, compositor or real pointer capture.
async function fixture(t) {
  const source=readFileSync(new URL('../src/scene.js',import.meta.url),'utf8');
  const noop=()=>{};
  class Renderer {
    constructor(){this.shadowMap={};this.info={render:{calls:0,triangles:0},memory:{geometries:0,textures:0}};}
    setPixelRatio(){} setSize(){} dispose(){}
    render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}
  }
  class Loader {
    async loadAsync(path){
      const root=new THREE.Group();
      for(const name of path.endsWith('landmarks.glb')?['Landmark_Arch','Landmark_Stacks','Landmark_Ridge']:['Model']){
        const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());mesh.name=name;root.add(mesh);
      }
      return {scene:root};
    }
  }
  const handlers={},canvas={id:'game-canvas',clientWidth:1440,clientHeight:900,style:{},focus:noop,setPointerCapture:noop,
    addEventListener:(type,fn)=>{handlers[type]=fn;},getBoundingClientRect:()=>({left:0,top:0,width:1440,height:900})};
  const draw={beginPath:noop,roundRect:noop,fill:noop,stroke:noop,drawImage:noop,fillText:noop};
  const context=vm.createContext({...Game,THREE:{...THREE,WebGLRenderer:Renderer},GLTFLoader:Loader,
    createCharacterArt,createCleanupScene,createBuildCinematic,releaseScene,URL,performance,
    location:{href:'https://tidekin.invalid/'},devicePixelRatio:1,innerWidth:1440,innerHeight:900,
    Image:class{async decode(){}},document:{createElement:()=>({getContext:()=>draw})},
    fetch:async()=>({ok:true,json:async()=>({atlas:{url:'atlas.png'},assets:Object.fromEntries(
      ['resource-wood','resource-scrap','resource-pearl'].map(id=>[id,{rect:[0,0,32,32]}]))})})});
  for(const name of ['characterThree','cleanupThree']){
    const declaration=source.match(new RegExp(`^const ${name} = \\{[\\s\\S]*?^\\};`,'m'))?.[0];
    assert.ok(declaration,`Missing ${name} capability declaration`);vm.runInContext(declaration,context);
  }
  const start=source.indexOf('export async function createScene(');assert.ok(start>=0);
  vm.runInContext(source.slice(start).replace(/^export /,'').replaceAll('import.meta.env.BASE_URL',"'/'"),context);
  const scene=await context.createScene(canvas);t.after(()=>scene.dispose());
  const state=Game.createGame(),inputLog=[],clicks=[],actions=[],waitOptions=[];
  const panel={open:false,dataset:{}},modal={open:false};
  Object.assign(context,{Game,scene,state,canvas,drag:null,divePointer:{held:false},
    isPaused:()=>panel.open||modal.open,openPanel:id=>{panel.open=true;panel.dataset.panel=id;},
    performAction:(action,payload)=>{actions.push({action,payload});return Game.act(state,action,payload);}});
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const pointerStart=main.indexOf("canvas.addEventListener('pointerdown',"),pointerEnd=main.indexOf("canvas.addEventListener('pointercancel',",pointerStart);
  assert.ok(pointerStart>=0&&pointerEnd>pointerStart);vm.runInContext(main.slice(pointerStart,pointerEnd),context);
  const metrics=()=>({...scene.getStats(),paused:panel.open||modal.open});
  context.window={__tidekin:{getState:()=>structuredClone(state),getMetrics:metrics}};
  let domHit=canvas;
  context.document={elementFromPoint:()=>domHit,getElementById:id=>id==='panel-dialog'?panel:id==='modal-dialog'?modal:canvas};
  const advance=(dt,input={})=>{Game.steerGame(state,dt,input);Game.updateGame(state,dt);scene.update(state,dt);};
  const settle=()=>{for(let i=0;i<30;i++)advance(1/60);};
  async function sail(target,tolerance=1.5){
    for(let i=0;i<5000;i++){
      const dx=target.x-state.position.x,dz=target.z-state.position.z;
      if(Math.hypot(dx,dz)<=tolerance){settle();return;}
      const a=Math.atan2(Math.sin(Math.atan2(dx,dz)-state.heading),Math.cos(Math.atan2(dx,dz)-state.heading));
      advance(.05,{x:Math.abs(a)>.07?(a>0?-1:1):0,z:Math.abs(a)>.07?0:-1});
    }
    throw Error('CPU sailing did not reach target');
  }
  const evaluate=(fn,arg)=>{context.argument=arg;return vm.runInContext(`(${fn.toString()})(argument)`,context);};
  const page={evaluate,waitForTimeout:async ms=>{for(let n=0;n<ms;n+=50)advance(Math.min(50,ms-n)/1000);},
    waitForFunction:async(fn,arg,options)=>{waitOptions.push(options);if(!evaluate(fn,arg))throw Error('Entry outcome not reached');},
    mouse:{move:async(x,y)=>handlers.pointermove({clientX:x,clientY:y}),click:async(x,y)=>{
      clicks.push({x,y,picked:scene.pickInteraction(x,y)});
      const event={button:0,clientX:x,clientY:y,pointerId:1};handlers.pointerdown(event);handlers.pointerup(event);
    }}};
  settle();
  const args={Game,state:async()=>structuredClone(state),metrics:async()=>metrics(),sail,page,inputLog};
  return {state,scene,metrics,actions,clicks,inputLog,panel,page,sail,advance,settle,args,waitOptions,
    interceptDOM:()=>{domHit={id:'blocking-dialog',tagName:'DIALOG'};},enter:site=>enterSurfaceBuoy({...args,site})};
}

test('surface buoy entry sails legitimately from the circuit, uses real hit testing and enters the requested habitat',async t=>{
  const f=await fixture(t);
  await f.sail({x:-12,z:8});
  await f.enter('home-reef');
  assert.ok(Math.hypot(f.state.position.x,f.state.position.z-8)>=5,'Raft was sailed onto the buoy instead of a clear approach');
  assert.equal(f.state.cleanup.attempt?.siteId,'home-reef');
  assert.equal(f.panel.open,false,'Entry opened a raft panel');
  assert.equal(f.clicks.at(-1).picked,'cleanup');
  assert.equal(f.inputLog.at(-1).pointer.hoverTitle,'Snorkel · Space');
  assert.equal(f.inputLog.at(-1).stage,'entered');
  assert.equal(f.actions.length,1,'Unexpected action retry or semantic bypass');
  assert.deepEqual(structuredClone(f.actions[0]),{action:'enter-cleanup',payload:{siteId:'home-reef'}});
});

test('actual hotspot at the buoy centre can hit the cabin; projection correction alone is insufficient',async t=>{
  const f=await fixture(t);await f.sail({x:0,z:8},.05);
  for(let i=0;i<8;i++){
    for(let n=0;n<10;n++)f.advance(Math.PI/8/1.6/10,{x:1});f.settle();
  }
  const h=f.metrics().interactions['cleanup:home-reef'];assert.equal(h.visible,true);
  assert.equal(f.scene.pickInteraction(h.x,h.y),'cabin');
  await f.page.mouse.click(h.x,h.y);
  assert.equal(f.panel.open,true);assert.equal(f.state.cleanup.attempt,null);
});

test('cove stand-off remains inside its range and nearest-site input enters cove',async t=>{
  const f=await fixture(t);await f.enter('sheltered-cove');
  assert.equal(f.state.cleanup.attempt?.siteId,'sheltered-cove');
  const entry=f.inputLog.at(-1);assert.ok(entry.before.distance>=5&&entry.before.distance<=10);
  assert.equal(entry.before.nearestSite,'sheltered-cove');assert.equal(f.clicks.at(-1).picked,'cleanup');
});

test('legitimate but out-of-range sailing fails the real domain precondition before input',async t=>{
  const f=await fixture(t);
  await assert.rejects(enterSurfaceBuoy({...f.args,site:'home-reef',sail:()=>f.sail({x:-20,z:0})}),/Buoy entry preconditions failed/);
  assert.equal(f.inputLog.at(-1).before.domainOutcome.code,'too_far');
  assert.equal(f.clicks.length,0);assert.equal(f.actions.length,0);assert.equal(f.state.cleanup.attempt,null);
});

test('missing interactive projection fails instead of falling back to visual group coordinates',async t=>{
  const f=await fixture(t);
  await assert.rejects(enterSurfaceBuoy({...f.args,site:'home-reef',metrics:async()=>({...f.metrics(),interactions:{}})}),/Interactive buoy hotspot unavailable/);
  assert.equal(f.clicks.length,0);assert.equal(f.inputLog.at(-1).stage,'preconditions');
});

test('a DOM overlay blocks entry without clicking through it and retains the actual hover winner',async t=>{
  const f=await fixture(t);f.interceptDOM();
  await assert.rejects(f.enter('home-reef'),/does not resolve to the cleanup interaction/);
  const entry=f.inputLog.at(-1);assert.equal(entry.pointer.hitId,'blocking-dialog');
  assert.equal(entry.pointer.hoverTitle,'Snorkel · Space');assert.equal(entry.pointer.canvasReceivesInput,false);
  assert.equal(f.clicks.length,0);assert.equal(f.actions.length,0);
});

test('a click resolving to cabin retains panel and state diagnostics and cannot pass entry',async t=>{
  const f=await fixture(t),click=f.page.mouse.click;
  f.page.mouse.click=async()=>{const cabin=f.metrics().interactions.cabin;await click(cabin.x,cabin.y);};
  await assert.rejects(f.enter('home-reef'),/Entry outcome not reached/);
  const entry=f.inputLog.at(-1);assert.equal(entry.stage,'click');assert.equal(entry.after.site,null);
  assert.equal(entry.pointerAfter.panelOpen,true);assert.equal(entry.pointerAfter.panel,'cabin');
  assert.equal(f.waitOptions.at(-1).timeout,5000,'Failure retained the original 30-second wait');
  assert.equal(f.actions.length,0);assert.equal(f.state.cleanup.attempt,null);
});
