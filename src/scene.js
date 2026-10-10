import * as THREE from 'three';
import { createCharacterArt } from './character-art.js';
import { releaseScene } from './render-resources.js';
import { createBuildCinematic } from './build-cinematic.js';
import { createCleanupScene } from './cleanup-scene.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ISLANDS, SALVAGE_NODES, SHOALS, EXPEDITIONS, tideHeight, getContext, CLEANUP_SITES, SHELTER_RADIUS, SHELTER_BAND } from './game.js';

// Explicit factory capabilities keep Rollup from retaining the entire engine
// namespace when calls occur inside the exception-safe construction scope.
const characterThree = {
  BufferGeometry: THREE.BufferGeometry,
  CatmullRomCurve3: THREE.CatmullRomCurve3,
  Color: THREE.Color,
  Float32BufferAttribute: THREE.Float32BufferAttribute,
  Group: THREE.Group,
  MathUtils: THREE.MathUtils,
  Mesh: THREE.Mesh,
  MeshStandardMaterial: THREE.MeshStandardMaterial,
  Shape: THREE.Shape,
  SphereGeometry: THREE.SphereGeometry,
  TorusGeometry: THREE.TorusGeometry,
  TubeGeometry: THREE.TubeGeometry,
  Vector3: THREE.Vector3,
};
const cleanupThree = {
  BoxGeometry: THREE.BoxGeometry,
  BufferGeometry: THREE.BufferGeometry,
  CatmullRomCurve3: THREE.CatmullRomCurve3,
  CircleGeometry: THREE.CircleGeometry,
  Color: THREE.Color,
  CylinderGeometry: THREE.CylinderGeometry,
  DirectionalLight: THREE.DirectionalLight,
  DoubleSide: THREE.DoubleSide,
  Float32BufferAttribute: THREE.Float32BufferAttribute,
  Fog: THREE.Fog,
  Group: THREE.Group,
  HemisphereLight: THREE.HemisphereLight,
  IcosahedronGeometry: THREE.IcosahedronGeometry,
  InstancedMesh: THREE.InstancedMesh,
  MathUtils: THREE.MathUtils,
  Mesh: THREE.Mesh,
  MeshBasicMaterial: THREE.MeshBasicMaterial,
  MeshStandardMaterial: THREE.MeshStandardMaterial,
  Object3D: THREE.Object3D,
  Plane: THREE.Plane,
  PlaneGeometry: THREE.PlaneGeometry,
  Raycaster: THREE.Raycaster,
  Scene: THREE.Scene,
  ShaderMaterial: THREE.ShaderMaterial,
  Shape: THREE.Shape,
  SphereGeometry: THREE.SphereGeometry,
  TorusGeometry: THREE.TorusGeometry,
  TubeGeometry: THREE.TubeGeometry,
  Vector3: THREE.Vector3,
};

// Rendering consumes state; authoritative steering and rules live in game.js.
export async function createScene(canvas, options = {}) {
  const measure = options.measure ?? (async (_name, operation) => operation());
  // Decode the inventory atlas once before allocating scene resources or reporting ready.
  const manifestUrl=new URL(`${import.meta.env.BASE_URL}assets/ui-fourth/manifest.json`,location.href);
  const pickupArt=await measure('asset-manifest', async () => {
    const response=await fetch(manifestUrl);
    if(!response.ok)throw new Error('Could not load pickup art manifest.');
    return response.json();
  });
  const pickupAtlas=new Image();pickupAtlas.src=new URL(pickupArt.atlas.url,manifestUrl).href;
  await measure('atlas-decode', () => pickupAtlas.decode());
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const scene = new THREE.Scene();
  const templateRoots = [];
  const detachedTextures = new Set();
  let constructionCleanup = null;
  try {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  scene.background = new THREE.Color('#84cee6');
  scene.fog = new THREE.FogExp2('#8fd5e1', 0.006);
  const camera = new THREE.PerspectiveCamera(43, 1, 0.2, 650);
  const ambient = new THREE.HemisphereLight('#ddf9ff', '#497c72', 2.2);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight('#fff0c3', 3.2);
  sun.position.set(-35, 65, 35); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 180 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 vPos; void main(){float h=clamp(normalize(vPos).y,0.,1.); vec3 c=mix(vec3(.73,.89,.91),vec3(.17,.52,.80),pow(h,.65));gl_FragColor=vec4(c,1.);}'
  })); scene.add(sky);

  const cloudGeometry=new THREE.SphereGeometry(1,10,7);
  const cloudMaterial=new THREE.MeshStandardMaterial({color:'#fff7df',roughness:1});
  const clouds=new THREE.InstancedMesh(cloudGeometry,cloudMaterial,100);
  const cloudTransform=new THREE.Object3D();
  for(let i=0;i<100;i++){const cluster=Math.floor(i/5),angle=cluster/20*Math.PI*2;cloudTransform.position.set(Math.cos(angle)*180+(i%5-2)*5,32+(cluster%4)*7+Math.sin(i)*2,Math.sin(angle)*180);cloudTransform.scale.set(6+(i%3)*2,3+(i%4),4+(i%2)*3);cloudTransform.updateMatrix();clouds.setMatrixAt(i,cloudTransform.matrix);}scene.add(clouds);
  // Share the authored ellipse locations with gameplay. Calmer shallows prevent
  // coarse ocean triangles from visibly slicing through exposed sand shelves.
  const shoalFunctions = SHOALS.map((s,i)=>`float shoal${i}(vec2 p){vec2 d=p-vec2(${s.x.toFixed(3)},${s.z.toFixed(3)});return length(vec2(d.x*${Math.cos(s.angle).toFixed(6)}-d.y*${Math.sin(s.angle).toFixed(6)},d.x*${Math.sin(s.angle).toFixed(6)}+d.y*${Math.cos(s.angle).toFixed(6)})/vec2(${s.radiusX.toFixed(3)},${s.radiusZ.toFixed(3)}));}`).join('\n')+'\nfloat shoreDistance(vec2 p){return min(shoal0(p),shoal1(p));}';
  // A full ocean triangle spans nearly ten meters. Calm the complete shoreline
  // neighborhood, including vertices outside the narrow ellipse, during flooding.
  const waveShelter = `float waveShelter(vec2 p){return min(${SHOALS.map(s=>`length(p-vec2(${s.x.toFixed(3)},${s.z.toFixed(3)}))-${Math.max(s.radiusX,s.radiusZ).toFixed(3)}`).join(',')});}`;
  const waterUniforms = { uTime:{value:0}, uTide:{value:0}, uDive:{value:0}, uRestored:{value:0} };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1000,1000,150,150),new THREE.ShaderMaterial({
    transparent:true, uniforms:waterUniforms, side:THREE.DoubleSide,
    vertexShader:`varying vec3 vWorld; varying float vWave; uniform float uTime;
      ${waveShelter}
      void main(){vec3 p=position;vec4 base=modelMatrix*vec4(p,1.);vec2 q=base.xz;float t=uTime;float a=sin(q.x*.075+t*.65)*.34+sin(q.y*.13-t*.8)*.2+sin((q.x+q.y)*.23+t)*.10;a*=smoothstep(12.,25.,waveShelter(q));p.z+=a;vWave=a;vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`varying vec3 vWorld;varying float vWave;uniform float uTime;uniform float uDive;uniform float uTide;uniform float uRestored;
      ${shoalFunctions}
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec2 p=vWorld.xz;float t=uTime;
      float swell=noise(p*.035+vec2(t*.018,0.));float detail=noise(p*.28+vec2(-t*.04,t*.035));
      vec3 col=mix(vec3(.012,.28,.40),vec3(.025,.61,.64),swell*.8+.2+vWave*.2);
      float crest=sin(p.x*.33+p.y*.19+detail*4.+t*.9);float foam=smoothstep(.93,1.,crest)*smoothstep(.5,.86,detail)*.32;
      vec3 n=normalize(vec3(-.065*cos(p.x*.075+t*.65)-.025*cos((p.x+p.y)*.23+t),1.,-.06*cos(p.y*.13-t*.8)));
      vec3 viewDir=normalize(cameraPosition-vWorld);vec3 halfway=normalize(viewDir+normalize(vec3(-.45,.8,.35)));
      float sparkle=pow(max(dot(n,halfway),0.),220.)*.6;float fres=pow(1.-max(dot(viewDir,n),0.),3.);
      col=mix(col,vec3(.58,.84,.88),fres*.6);col+=vec3(1.,.91,.64)*sparkle;
      col=mix(col,vec3(.76,.96,.91),foam);
      float shore=shoreDistance(p);float rim=1.-smoothstep(.018,.065,abs(shore-(1.03-uTide*.31)));
      rim*=1.-smoothstep(.38,.60,uTide);col=mix(col,vec3(.62,.79,.69),rim*.32);
      float affected=(1.-smoothstep(2.,7.,length(p-vec2(0.,8.))))*(1.-uRestored);col=mix(col,vec3(.28,.46,.30),affected*.43);
      float distanceFog=1.-exp(-length(cameraPosition-vWorld)*.0025);col=mix(col,vec3(.56,.81,.84),distanceFog*.65);
      col=mix(col,vec3(.02,.29,.37),uDive*.32);gl_FragColor=vec4(col,.87-uDive*.38);}`
  }));water.rotation.x=-Math.PI/2;water.position.y=0;scene.add(water);

  const loader = new GLTFLoader();
  const load = async path => (await loader.loadAsync(path)).scene;
  const loaded = await measure('model-load', () => Promise.allSettled(['workshop','island','landmarks'].map(name=>load(`${import.meta.env.BASE_URL}assets/${name}.glb`))));
  for (const result of loaded) if (result.status === 'fulfilled') templateRoots.push(result.value);
  if(loaded.some(result=>result.status==='rejected')) {
    throw loaded.find(result=>result.status==='rejected').reason;
  }
  const [raft,islandTemplate,landmarkTemplate]=loaded.map(result=>result.value);
  const materials=new Set();
  function prepare(group){group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});return group;}
  prepare(raft);prepare(islandTemplate);prepare(landmarkTemplate);
  const boat = new THREE.Group();boat.add(raft);scene.add(boat);
  // Three permanent pennants visibly record repeated voyages at 1, 3 and 5 completions.
  const pennantRack=new THREE.Group();boat.add(pennantRack);
  const rackWood=new THREE.MeshStandardMaterial({color:'#986337',roughness:.85});
  const rackPole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.07,3.4,8),rackWood);rackPole.position.set(-2.9,2.3,2.7);pennantRack.add(rackPole);
  const rackBar=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,2.5,8),rackWood);rackBar.rotation.z=Math.PI/2;rackBar.position.set(-1.7,4,2.7);pennantRack.add(rackBar);
  const pennantGeometry=new THREE.BufferGeometry();pennantGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,.6,0,0,.3,-.7,.025],3));pennantGeometry.computeVertexNormals();
  const earnedPennants=['#eab350','#d77c58','#66aaa0'].map((color,i)=>{const mesh=new THREE.Mesh(pennantGeometry,new THREE.MeshStandardMaterial({color,roughness:.85,side:THREE.DoubleSide}));mesh.position.set(-2.75+i*.75,3.97,2.7);pennantRack.add(mesh);return mesh;});
  const originalExplorer=raft.getObjectByName('Explorer');
  if(originalExplorer)originalExplorer.visible=false;
  function characterArt() {
    const art = createCharacterArt(characterThree);
    art.root.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
    return art;
  }
  const deckCharacter=characterArt(),explorer=deckCharacter.root;
  // The forward explorer was hidden behind the cabin from the following view.
  // This open aft deck position keeps the navigator visible during normal play.
  explorer.position.set(2.6,1.725,-4.02);
  explorer.rotation.set(0,0,0);deckCharacter.body.rotation.y=Math.PI+.25;
  (originalExplorer?.parent??raft).add(explorer);
  const cleanupView=constructionCleanup=createCleanupScene({THREE: cleanupThree});
  let viewMode='follow', orbitYaw=0, orbitPitch=0, zoomScale=1;
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const interactionGroup=new THREE.Group();boat.add(interactionGroup);
  const hotspotMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
  const hotspots=[['cabin',.48,1.8,-2.1,1.15],['workshop',2.5,1.5,.4,.95]].map(([id,x,y,z,r])=>{
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),hotspotMaterial);mesh.position.set(x,y,z);mesh.userData.interaction=id;interactionGroup.add(mesh);return mesh;
  });
  // A compact workbench makes the existing upgrade workshop a place aboard.
  const bench=new THREE.Group();bench.position.set(2.5,.85,.4);boat.add(bench);
  const benchWood=new THREE.MeshStandardMaterial({color:'#c88e52',roughness:.85});
  const benchMetal=new THREE.MeshStandardMaterial({color:'#39787b',roughness:.65});
  const top=new THREE.Mesh(new THREE.BoxGeometry(1.35,.16,1.65),benchWood);top.position.y=.65;bench.add(top);
  for(const x of [-.5,.5])for(const z of [-.65,.65]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.13,.65,.13),benchWood);leg.position.set(x,.3,z);bench.add(leg);}
  const plan=new THREE.Mesh(new THREE.BoxGeometry(.8,.018,.9),new THREE.MeshStandardMaterial({color:'#fff0c3'}));plan.position.set(0,.745,0);bench.add(plan);
  const tool=new THREE.Mesh(new THREE.BoxGeometry(.4,.12,.16),benchMetal);tool.position.set(.3,.82,.4);tool.rotation.y=.4;bench.add(tool);
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.035,.04,.5,8),benchWood);handle.rotation.z=1.57;handle.position.set(.1,.82,.4);bench.add(handle);
  // Each authored teaching site carries its own pollution and completion signal.
  const cleanupBuoys=CLEANUP_SITES.map(site=>{
    const group=new THREE.Group();group.position.set(site.x,0,site.z);scene.add(group);
    const material=new THREE.MeshStandardMaterial({color:'#dc7147',roughness:.7});
    const buoy=new THREE.Mesh(new THREE.SphereGeometry(.48,12,8),material);buoy.scale.y=.65;group.add(buoy);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,2.2,6),benchWood);pole.position.y=1;group.add(pole);
    const flag=new THREE.Mesh(new THREE.BoxGeometry(.9,.55,.04),material);flag.position.set(.4,1.8,0);group.add(flag);
    const hotspot=new THREE.Mesh(new THREE.SphereGeometry(1.5,10,8),hotspotMaterial);hotspot.position.y=.8;hotspot.userData.interaction='cleanup';hotspot.userData.siteId=site.id;group.add(hotspot);
    const pollution=new THREE.Group();group.add(pollution);
    const slick=new THREE.Mesh(new THREE.CircleGeometry(3.3,40),new THREE.MeshBasicMaterial({color:'#73794e',transparent:true,opacity:.48,depthWrite:false,side:THREE.DoubleSide}));slick.rotation.x=-Math.PI/2;slick.position.y=-.08;slick.scale.set(1,.75,1);pollution.add(slick);
    const litterMaterial=new THREE.MeshStandardMaterial({color:'#b3aa83',roughness:.85});
    for(let i=0;i<7;i++){const litter=new THREE.Mesh(new THREE.BoxGeometry(.35,.16,.65),litterMaterial);const a=i*2.4;litter.position.set(Math.cos(a)*(1+i%3*.6),.04,Math.sin(a)*(1+i%3*.6));litter.rotation.y=a;pollution.add(litter);}
    return {site,group,material,hotspot,pollution};
  });
  const buoyHotspots=cleanupBuoys.map(b=>b.hotspot);
  // The foam band shares the authoritative pushback radius and width exactly.
  const currentUniforms={time:{value:0}};
  const currentBand=new THREE.Mesh(new THREE.RingGeometry(SHELTER_RADIUS-SHELTER_BAND,SHELTER_RADIUS+SHELTER_BAND,192,4),new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:currentUniforms,
    vertexShader:'varying vec2 p; void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 p;uniform float time;void main(){float r=length(p);float edge=1.-smoothstep(0.,${SHELTER_BAND.toFixed(1)},abs(r-${SHELTER_RADIUS.toFixed(1)}));float angle=atan(p.y,p.x);float streak=.45+.55*smoothstep(-.3,.7,sin(angle*37.+sin(angle*13.)*2.));float crest=pow(.5+.5*sin(r*3.+time*4.2+sin(angle*22.)*.65),3.)*streak;gl_FragColor=vec4(mix(vec3(.20,.61,.62),vec3(.88,.98,.89),crest),edge*(.16+crest*.64));}`
  }));currentBand.rotation.x=-Math.PI/2;scene.add(currentBand);
  // Raised, broken foam fronts travel inward across the actual contact radius.
  // One instanced draw keeps the all-around cue bounded, including after the wheel.
  const flowPositions=[],flowIndices=[];
  for(let i=0;i<=12;i++){
    const u=i/12,x=(u-.5)*2.8,curve=Math.sin(u*Math.PI);
    flowPositions.push(x,.06,curve*.32,x,.12+curve*.32,curve*.32+.24);
    if(i<12){const k=i*2;flowIndices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const flowGeometry=new THREE.BufferGeometry();flowGeometry.setAttribute('position',new THREE.Float32BufferAttribute(flowPositions,3));flowGeometry.setIndex(flowIndices);flowGeometry.computeVertexNormals();
  const flowMaterial=new THREE.MeshStandardMaterial({color:'#e1fff0',roughness:.7,side:THREE.DoubleSide,transparent:true,opacity:.82,depthWrite:false});
  const currentFlow=new THREE.InstancedMesh(flowGeometry,flowMaterial,96);
  currentFlow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);currentFlow.frustumCulled=false;scene.add(currentFlow);
  const flowTransform=new THREE.Object3D();
  // Gathered resources land in the physical bow tray.
  const bowStorage=new THREE.Group();bowStorage.position.set(-1.15,1.02,3.9);boat.add(bowStorage);
  const trayBase=new THREE.Mesh(new THREE.BoxGeometry(1.05,.09,.72),benchWood);bowStorage.add(trayBase);
  for(const x of [-.51,.51]){const side=new THREE.Mesh(new THREE.BoxGeometry(.07,.22,.78),benchWood);side.position.set(x,.09,0);bowStorage.add(side);}
  for(const z of [-.36,.36]){const side=new THREE.Mesh(new THREE.BoxGeometry(1.05,.22,.07),benchWood);side.position.set(0,.09,z);bowStorage.add(side);}
  const transferGroup=new THREE.Group();scene.add(transferGroup);
  const transferWood=new THREE.MeshStandardMaterial({color:'#bb814a',roughness:.9,depthTest:false,depthWrite:false});
  const transferEnd=new THREE.MeshStandardMaterial({color:'#edc58c',roughness:.9,depthTest:false,depthWrite:false});
  const transferMetal=new THREE.MeshStandardMaterial({color:'#70a49d',metalness:.45,roughness:.5,depthTest:false,depthWrite:false});
  const transferPearl=new THREE.MeshStandardMaterial({color:'#fff0d4',metalness:.12,roughness:.25,depthTest:false,depthWrite:false});
  const logGeometry=new THREE.CylinderGeometry(.085,.10,.58,8);logGeometry.rotateZ(Math.PI/2);
  const scrapGeometry=new THREE.TorusGeometry(.14,.045,6,10,Math.PI*1.65);
  const pearlGeometry=new THREE.SphereGeometry(.09,10,6);
  const transfers=[];
  for(let i=0;i<4;i++){
    const mesh=new THREE.Group(),wood=new THREE.Mesh(logGeometry,[transferWood,transferEnd,transferEnd]),scrap=new THREE.Mesh(scrapGeometry,transferMetal),pearls=new THREE.Group();
    for(let j=0;j<3;j++){const pearl=new THREE.Mesh(pearlGeometry,transferPearl);pearl.position.set((j-1)*.13,j===1?.07:0,0);pearls.add(pearl);}
    mesh.add(wood,scrap,pearls);mesh.traverse(o=>{if(o.isMesh)o.renderOrder=20;});mesh.visible=false;transferGroup.add(mesh);
    transfers.push({mesh,wood,scrap,pearls,age:2,start:new THREE.Vector3(),index:i});
  }
  const storageLanding=new THREE.Vector3();
  function onAction(action,result,previous){
    if(action==='build'&&result.ok&&upgradeParts.some(part=>part.id===result.upgrade)&&!previous?.upgrades?.[result.upgrade]){buildPresentation.begin(reducedMotion,result.upgrade);return;}
    if(action!=='gather'||!result.ok||!previous)return;
    const id=result.nodeId??lastState?.collected.find(id=>!previous.collected.includes(id));
    const node=SALVAGE_NODES.find(node=>node.id===id);if(!node)return;
    transfers.forEach((item,i)=>{
      item.age=reducedMotion?.65:-i*.09;item.start.set(node.x,water.position.y+.4,node.z);item.mesh.position.copy(item.start);item.mesh.visible=true;
      item.wood.visible=node.type==='wood';item.scrap.visible=node.type==='scrap';item.pearls.visible=node.type==='pearls';
    });
  }
  function pickInteraction(clientX,clientY){
    if(lastState?.cleanup?.attempt||lastState?.diving)return null;
    const rect=canvas.getBoundingClientRect();pointer.set((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);
    scene.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);
    return raycaster.intersectObjects([...hotspots,...buoyHotspots],false)[0]?.object.userData.interaction??null;
  }
  function pickCleanup(clientX,clientY){
    if(!lastState?.cleanup?.attempt||disposed)return null;
    const rect=canvas.getBoundingClientRect();
    if(!rect.width||!rect.height)return null;
    pointer.set((clientX-rect.left)/rect.width*2-1,1-(clientY-rect.top)/rect.height*2);
    camera.updateMatrixWorld(true);
    return cleanupView.pick(pointer,camera,lastState);
  }
  function setView(mode){viewMode=['inspect','cabin','workshop'].includes(mode)?mode:'follow';orbitYaw=0;orbitPitch=0;zoomScale=1;if(lastState)update(lastState,0,{});}
  function orbit(dx,dy){orbitYaw-=dx*.006;orbitPitch=THREE.MathUtils.clamp(orbitPitch+dy*.003,-.28,.7);if(lastState)update(lastState,0,{});}
  function zoom(delta){zoomScale=THREE.MathUtils.clamp(zoomScale*Math.exp(delta*.001),.45,1.65);if(lastState)update(lastState,0,{});}

  const swimmer=new THREE.Group();swimmer.rotation.order='YXZ';scene.add(swimmer);
  const surfaceCharacter=characterArt();swimmer.add(surfaceCharacter.root);
  const diveRing=new THREE.Mesh(new THREE.TorusGeometry(.8,.035,6,40),new THREE.MeshBasicMaterial({color:'#fff1b4',transparent:true,opacity:.75}));diveRing.rotation.x=Math.PI/2;swimmer.add(diveRing);
  const boatAnchor=new THREE.Vector2();let wasDiving=false;
  const beaconGlow=new THREE.PointLight('#ffc970',0,13,1.5);beaconGlow.position.set(3.2,3.8,3.9);boat.add(beaconGlow);
  const tails=[];raft.traverse(o=>{if(o.name==='Dog_Tail')tails.push({object:o,rotation:o.rotation.y});});
  const upgradeParts=[];raft.traverse(o=>{const match=o.name.match(/^Upgrade_(waterwheel|crane|greenhouse|sail|beacon)$/i);if(match)upgradeParts.push({object:o,id:match[1].toLowerCase()});});
  const buildPresentation=createBuildCinematic(boat,upgradeParts);
  const flywheel=raft.getObjectByName('Engine_Flywheel');const craneHook=raft.getObjectByName('Crane_Hook');const hookY=craneHook?.position.y||0;
  const wheels=[],flags=[];raft.traverse(o=>{if(o.name==='Wheel')wheels.push(o);if(o.name==='Pennant_Main')flags.push({object:o,rotation:o.rotation.y});});
  const landmarks=[];
  for(const [index,island] of ISLANDS.entries()){
    const clone=islandTemplate.clone(true);const p=island.position||island;
    clone.position.set(p.x, -.15, p.z-18);const scale=index===0?1.2:.85+(index%3)*.2;clone.scale.setScalar(scale);clone.rotation.y=index*1.8;scene.add(clone);landmarks.push({mesh:clone,island,scale});
  }
  // Original Blender landmarks preserve the broken limestone language at distance.
  const archTemplate=landmarkTemplate.getObjectByName('Landmark_Arch');
  const stackTemplate=landmarkTemplate.getObjectByName('Landmark_Stacks');
  const ridgeTemplate=landmarkTemplate.getObjectByName('Landmark_Ridge');
  for(let cluster=0;cluster<14;cluster++){
    const angle=cluster/14*Math.PI*2,range=135+(cluster%3)*29;
    const template=cluster%3===0?ridgeTemplate:stackTemplate;
    const group=template.clone(true);group.position.set(Math.cos(angle)*range,-.5,Math.sin(angle)*range);
    group.rotation.y=cluster*1.72;group.scale.setScalar(.7+(cluster%4)*.18);
    group.traverse(o=>{if(o.isMesh)o.castShadow=false;});scene.add(group);
  }
  const arch=archTemplate.clone(true);arch.position.set(-65,-.5,-105);arch.rotation.y=.35;arch.scale.setScalar(1.25);arch.traverse(o=>{if(o.isMesh)o.castShadow=false;});scene.add(arch);
  const foamMat = new THREE.MeshBasicMaterial({color:'#d7fff2',transparent:true,opacity:.40,side:THREE.DoubleSide,depthWrite:false});
  const shores=[];
  for(const l of landmarks){const ring=new THREE.Mesh(new THREE.RingGeometry(9*l.scale,9.5*l.scale,80),foamMat);ring.rotation.x=-Math.PI/2;ring.position.copy(l.mesh.position);ring.position.y=.1;scene.add(ring);shores.push(ring);}

  const pickupGroup=new THREE.Group();scene.add(pickupGroup);
  const routeMarkerGeometry=new THREE.TorusGeometry(1.05,.075,6,32);
  const routeMarkerStem=new THREE.CylinderGeometry(.04,.06,2.2,6);
  const routeMarkers=Array.from({length:Math.max(...EXPEDITIONS.map(r=>r.waypoints.length))},(_,i)=>{
    const group=new THREE.Group(),material=new THREE.MeshBasicMaterial({color:'#ffda83',transparent:true,opacity:.85});
    const ring=new THREE.Mesh(routeMarkerGeometry,material);ring.rotation.x=Math.PI/2;group.add(ring);
    const stem=new THREE.Mesh(routeMarkerStem,material);stem.position.y=1.1;group.add(stem);
    const flag=new THREE.Mesh(pennantGeometry,material);flag.position.set(0,2.2,0);group.add(flag);
    scene.add(group);return {group,material,flag,index:i};
  });
  const seabed=new THREE.Group();scene.add(seabed);
  const sandMat=new THREE.MeshStandardMaterial({color:'#eadba5',roughness:1});
  const shoalMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
  for(const shoal of SHOALS){
    const positions=[],colors=[],indices=[],segments=64;
    const rings=[[0,.44,'#a5aa7b'],[.5,.43,'#aeb182'],[.82,.42,'#a5aa7b'],[.96,.16,'#788f76'],[1.12,-.24,'#51796f']];
    for(const [radius,height,color] of rings){const c=new THREE.Color(color);for(let j=0;j<=segments;j++){const angle=j/segments*Math.PI*2;const irregular=1+.026*Math.sin(angle*5)+.018*Math.cos(angle*3);positions.push(Math.cos(angle)*radius*irregular,height,Math.sin(angle)*radius*irregular);colors.push(c.r,c.g,c.b);}}
    for(let r=0;r<rings.length-1;r++)for(let j=0;j<segments;j++){const a=r*(segments+1)+j,b=a+segments+1;indices.push(a,a+1,b,a+1,b+1,b);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const shelf=new THREE.Mesh(geometry,shoalMat);
    shelf.scale.set(shoal.radiusX,1,shoal.radiusZ);shelf.rotation.y=shoal.angle;
    shelf.position.set(shoal.x,0,shoal.z);shelf.receiveShadow=true;scene.add(shelf);
  }
  const coralMats=['#e8a09e','#b0b2dd','#e9c06e','#78bda5'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.8}));
  for(const [i,node] of SALVAGE_NODES.entries())if(node.type==='pearls'){
    const bed=new THREE.Mesh(new THREE.CylinderGeometry(4,5,.35,24),sandMat);bed.position.set(node.x,-1.3,node.z);seabed.add(bed);
    for(let j=0;j<8;j++){const coral=new THREE.Mesh(new THREE.IcosahedronGeometry(.3+j%3*.15,0),coralMats[(i+j)%4]);coral.position.set(node.x+Math.cos(j*2.4)*2.2,-.9,node.z+Math.sin(j*2.4)*2.2);coral.scale.y=1.5+(j%3);seabed.add(coral);}
  }
  // Sand shelves rise above water at low tide, then become shallow channels.

  const fishGroup=new THREE.Group();scene.add(fishGroup);const fish=[];
  const fishGeo=new THREE.ConeGeometry(.13,.65,5);fishGeo.rotateX(Math.PI/2);
  const fishMat=new THREE.MeshStandardMaterial({color:'#eebf55',roughness:.6});
  for(let i=0;i<24;i++){const m=new THREE.Mesh(fishGeo,fishMat);fishGroup.add(m);fish.push(m);}
  // One screen-sized card uses the same painted resource art as the inventory.
  function paintPickup(type, covered=false) {
    const c=document.createElement('canvas');c.width=c.height=160;const g=c.getContext('2d');
    g.fillStyle='#183e40';g.beginPath();g.roundRect(4,4,152,152,22);g.fill();
    g.strokeStyle=covered?'#b9b8a0':'#f5d38d';g.lineWidth=4;g.stroke();
    const key={wood:'resource-wood',scrap:'resource-scrap',pearls:'resource-pearl'}[type];
    const [sx,sy,sw,sh]=pickupArt.assets[key].rect;
    const width=124,height=width*sh/sw;
    g.drawImage(pickupAtlas,sx,sy,sw,sh,(160-width)/2,10+(100-height)/2,width,height);
    g.fillStyle='#fff0cc';g.textAlign='center';g.font='bold 24px sans-serif';g.fillText(covered?'Covered':{wood:'Timber',scrap:'Scrap',pearls:'Pearls'}[type],80,132);
    const texture=new THREE.CanvasTexture(c);detachedTextures.add(texture);texture.colorSpace=THREE.SRGBColorSpace;return texture;
  }
  const popupTextures=Object.fromEntries(['wood','scrap','pearls'].flatMap(type=>[[type,paintPickup(type)],[type+'-covered',paintPickup(type,true)]]));
  const pickupPopup=new THREE.Sprite(new THREE.SpriteMaterial({map:popupTextures.wood,transparent:true,depthTest:false,depthWrite:false,opacity:0}));
  pickupPopup.renderOrder=10;pickupPopup.visible=false;scene.add(pickupPopup);
  let popupTarget=null,popupAmount=0,popupFeedback=0;
  const pickups = SALVAGE_NODES.map((node,i)=>{
    const group=new THREE.Group(); const p=node.position||node;group.position.set(p.x,.4,p.z);
    const color={wood:'#bf7c3d',scrap:'#80b9b1',pearls:'#fff0cc'}[node.type]||'#fff0cc';
    const mat=new THREE.MeshStandardMaterial({color,roughness:.65,metalness:node.type==='scrap'?.55:.05});
    if(node.type==='wood')for(let k=0;k<3;k++){const m=new THREE.Mesh(new THREE.CylinderGeometry(.19,.23,1.5,8),mat);m.rotation.z=Math.PI/2;m.position.z=(k-1)*.38;group.add(m);}
    else if(node.type==='scrap'){const m=new THREE.Mesh(new THREE.TorusGeometry(.55,.16,7,12),mat);m.rotation.x=.6;group.add(m);const b=new THREE.Mesh(new THREE.BoxGeometry(.6,.5,.6),mat);group.add(b);}
    else {const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.48,1),mat);group.add(m);}
    if(node.access==='tidal'){
      const anchorMat=new THREE.MeshStandardMaterial({color:'#777e6c',roughness:1});
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.42,0),anchorMat);rock.position.set(.55,-.12,.3);rock.scale.y=.6;group.add(rock);
      const tether=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.85,6),new THREE.MeshStandardMaterial({color:'#655a43'}));tether.position.set(.25,.2,0);tether.rotation.z=.9;group.add(tether);
      group.rotation.y=.35;
    }
    pickupGroup.add(group);return {node,group,index:i};
  });
  // Foam wake particles are pooled, with no allocations inside the frame loop.
  const wakeCount=110, wakePositions=new Float32Array(wakeCount*3),wakeAges=new Float32Array(wakeCount).fill(5);
  const wakeGeo=new THREE.BufferGeometry();wakeGeo.setAttribute('position',new THREE.BufferAttribute(wakePositions,3));
  const wake=new THREE.Points(wakeGeo,new THREE.PointsMaterial({color:'#e6fff7',size:.28,transparent:true,opacity:.65,depthWrite:false}));wake.frustumCulled=false;scene.add(wake);
  let wakeCursor=0,wakeClock=0;
  // Small animated gulls: paired wings with an actual flapping silhouette.
  const birds=[];const wingMat=new THREE.MeshBasicMaterial({color:'#fff9de',side:THREE.DoubleSide});
  const wingGeo=new THREE.BufferGeometry();wingGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1.3,.1,.1,.5,0,-.35],3));wingGeo.computeVertexNormals();
  for(let i=0;i<11;i++){const g=new THREE.Group();const left=new THREE.Mesh(wingGeo,wingMat),right=left.clone();right.scale.x=-1;g.add(left,right);scene.add(g);birds.push({g,left,right,index:i});}
  const follow=new THREE.Vector3(),desired=new THREE.Vector3(),look=new THREE.Vector3();
  const labelWorld=new THREE.Vector3(),labelView=new THREE.Vector3(),labelNdc=new THREE.Vector3();
  let initialized=false,elapsed=0,lastRegion=null,heading=0,frameTimes=[],frames=0,quality='high',reducedMotion=false;
  let disposed=false,lastState=null;
  function resize(){const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(lastState&&!disposed)update(lastState,0,{});}
  resize();
  function update(state, dt, input={}) {
    if(disposed)return;lastState=state;
    const t0=performance.now();dt=Math.max(0,Math.min(dt,.05));elapsed+=dt;const motionTime=reducedMotion?0:elapsed;
    if(state.cleanup?.attempt){
      cleanupView.update(state,dt,{reducedMotion});
      const pose=cleanupView.cameraPose(camera.aspect);
      camera.position.fromArray(pose.position);camera.lookAt(new THREE.Vector3().fromArray(pose.target));
      renderer.render(cleanupView.scene??cleanupView.root,camera);frames++;frameTimes.push(performance.now()-t0);if(frameTimes.length>600)frameTimes.shift();return;
    }
    const vx=Number(input.x)||0,vz=Number(input.z)||0,mag=Math.hypot(vx,vz),moving=mag>.01;
    if(state.diving&&moving)heading=Math.atan2(vx,vz);else if(!state.diving)heading=state.heading??0;
    const tide=tideHeight(state);
    const completed=Object.values(state.expeditions?.completed??{}).reduce((sum,n)=>sum+n,0);
    pennantRack.visible=completed>0;
    earnedPennants.forEach((flag,i)=>{flag.visible=completed>=[1,3,5][i];flag.rotation.y=reducedMotion?0:Math.sin(elapsed*2.1+i)*.13;});
    const activeExpedition=state.expeditions?.active;
    const expedition=EXPEDITIONS.find(route=>route.id===activeExpedition?.id);
    for(const marker of routeMarkers){
      const waypoint=expedition?.waypoints[marker.index];
      marker.group.visible=Boolean(waypoint&&!activeExpedition.ready&&marker.index>=activeExpedition.index);
      if(waypoint){marker.group.position.set(waypoint.x,tide*1.15+.12,waypoint.z);marker.group.scale.setScalar(marker.index===activeExpedition.index?1:.72);marker.material.opacity=marker.index===activeExpedition.index?.9:.4;marker.flag.rotation.y=reducedMotion?0:Math.sin(elapsed*2+marker.index)*.1;}
    }
    beaconGlow.intensity=state.upgrades?.beacon?9:0;

    for(let i=0;i<fish.length;i++){const a=motionTime*.35+i*.7;fish[i].position.set(6+Math.cos(a)*(3+i%4),-.55+Math.sin(a*2)*.2,-9+Math.sin(a)*(2+i%3));fish[i].rotation.y=-a;}
    water.position.y=tide*1.15;waterUniforms.uTide.value=water.position.y;waterUniforms.uTime.value=reducedMotion?0:elapsed;waterUniforms.uDive.value=THREE.MathUtils.lerp(waterUniforms.uDive.value,state.diving?1:0,dt*3);
    // The raft stays above water when diving; camera and tint show the dive mode.
    if(state.diving&&!wasDiving)boatAnchor.set(state.position.x,state.position.z);
    wasDiving=state.diving;
    swimmer.visible=state.diving;if(explorer)explorer.visible=!state.diving;
    swimmer.position.set(state.position.x,water.position.y-.85,state.position.z);
    // Character animation is authored in its local XY plane; local +X becomes heading +Z.
    swimmer.rotation.set(0,heading-Math.PI/2,0);
    surfaceCharacter.animate({dt,moving,surface:true,facing:1,reducedMotion});
    surfaceCharacter.body.rotation.y=Math.PI/2;
    diveRing.rotation.z=motionTime;
    deckCharacter.animate({ dt, time: elapsed, deck: true, reducedMotion });
    deckCharacter.body.rotation.y = Math.PI + .25;
    boat.position.set(state.diving?boatAnchor.x:state.position.x,tide*1.15+(reducedMotion?0:Math.sin(elapsed*1.35)*.10),state.diving?boatAnchor.y:state.position.z);
    for(const tail of tails)tail.object.rotation.y=tail.rotation+(reducedMotion?0:Math.sin(elapsed*6)*.2*Math.max(0,Math.sin(elapsed*.4)));
    if(!state.diving)boat.rotation.y=heading;
    boat.rotation.z=reducedMotion?0:Math.sin(elapsed*.9)*.022;boat.rotation.x=reducedMotion?0:Math.sin(elapsed*1.15)*.016;
    for(const p of upgradeParts){const built=Boolean(state.upgrades?.[p.id]);if(p.built===false&&built)p.reveal=0;p.built=built;p.object.visible=built;if(p.reveal!==undefined){p.reveal=Math.min(1,p.reveal+dt*2.8);p.object.scale.setScalar(reducedMotion?1:.94+.06*(1-Math.pow(1-p.reveal,3)));}}
    buildPresentation.update(dt,reducedMotion);
    for(const wheel of wheels)if(state.upgrades?.waterwheel&&!reducedMotion)wheel.rotation.x+=dt*(.7+tide*1.5)*buildPresentation.wheelSpeed();
    if(flywheel&&state.upgrades?.waterwheel&&!reducedMotion)flywheel.rotation.z+=dt*1.4*buildPresentation.wheelSpeed();
    if(craneHook)craneHook.position.y=hookY;
    for(const f of flags)f.object.rotation.y=f.rotation+(reducedMotion?0:Math.sin(elapsed*2.4)*.028);
    const context=getContext(state);
    for(const p of pickups){
      p.group.visible=!(state.collected||[]).includes(p.node.id);
      const bob=reducedMotion?0:Math.sin(elapsed*1.8+p.index)*.10;
      p.group.position.y=p.node.access==='shore'?water.position.y+.35+bob:p.node.access==='underwater'?-.65:.22;
    }
    const nextTarget=context.gatherTarget??context.nearby.find(node=>node.inReach&&['high_tide','dive_required'].includes(node.reason));
    if(!popupTarget&&nextTarget){popupTarget=nextTarget;popupFeedback=0;}
    const sameTarget=nextTarget?.id===popupTarget?.id;
    const show=Boolean(nextTarget)&&(!popupTarget||sameTarget)&&!buildPresentation.getStatus().active;
    popupAmount=THREE.MathUtils.damp(popupAmount,show?1:0,reducedMotion?35:18,dt);
    if(popupAmount<.025&&!sameTarget){popupTarget=nextTarget??null;popupFeedback=0;}
    if(sameTarget)popupTarget=nextTarget;
    popupFeedback=Math.min(1,popupFeedback+dt*5);
    if(popupTarget){
      pickupPopup.material.map=popupTextures[popupTarget.type+(popupTarget.available?'':'-covered')];
      pickupPopup.position.set(popupTarget.x,water.position.y+2.3,popupTarget.z);
      pickupPopup.material.opacity=popupAmount;
      pickupPopup.userData.label={id:popupTarget.id,name:popupTarget.available?{wood:'Timber',scrap:'Scrap',pearls:'Pearls'}[popupTarget.type]:'Covered',selected:Boolean(popupTarget.available)};
    }
    pickupPopup.visible=Boolean(popupTarget)&&popupAmount>.025;
    for(const s of shores){s.position.y=water.position.y+.04;s.scale.setScalar(1+Math.sin(motionTime*.7)*.025);}
    for(const b of birds){const a=motionTime*.045+b.index*1.74;b.g.position.set(Math.cos(a)*(40+b.index*5),18+b.index*1.5,Math.sin(a)*(40+b.index*5));b.g.rotation.y=-a;const flap=reducedMotion?.15:Math.sin(elapsed*4+b.index)*.38;b.left.rotation.z=flap;b.right.rotation.z=-flap;}
    wakeClock+=dt;if(moving&&!state.diving&&wakeClock>.04&&!reducedMotion){wakeClock=0;for(let side=-1;side<=1;side+=2){const k=wakeCursor++%wakeCount;wakePositions[k*3]=boat.position.x-Math.sin(boat.rotation.y)*4+Math.cos(boat.rotation.y)*side*2.1;wakePositions[k*3+2]=boat.position.z-Math.cos(boat.rotation.y)*4-Math.sin(boat.rotation.y)*side*2.1;wakeAges[k]=0;}}
    for(let i=0;i<wakeCount;i++){wakeAges[i]+=dt;wakePositions[i*3+1]=wakeAges[i]<3?water.position.y+.15:-10;}wakeGeo.attributes.position.needsUpdate=true;
    if(!initialized||lastRegion!==state.region){follow.set(state.position.x,0,state.position.z);initialized=true;lastRegion=state.region;}
    desired.set(state.position.x,0,state.position.z);follow.lerp(desired,1-Math.exp(-dt*3.5));
    for(const b of cleanupBuoys){const restored=state.cleanup?.completed?.includes(b.site.id);b.group.position.y=water.position.y+.2;b.material.color.set(restored?'#71c4a5':'#dc7147');b.pollution.visible=!restored;}
    waterUniforms.uRestored.value=state.cleanup?.completed?.includes('home-reef')?1:0;
    currentBand.position.y=water.position.y+.12;currentUniforms.time.value=motionTime;
    for(let i=0;i<96;i++){
      const sector=i%32,lane=Math.floor(i/32),angle=sector/32*Math.PI*2+lane*.055;
      const phase=(motionTime*.30+lane/3+(sector%5)*.027)%1;
      const radius=SHELTER_RADIUS+SHELTER_BAND-phase*(SHELTER_BAND*2+1);
      const envelope=Math.sin(phase*Math.PI);
      flowTransform.position.set(Math.sin(angle)*radius,water.position.y+.09,Math.cos(angle)*radius);
      flowTransform.rotation.set(0,angle,0);flowTransform.scale.set(.7+(sector%3)*.18,.45+envelope*.9,envelope*.8+.2);flowTransform.updateMatrix();
      currentFlow.setMatrixAt(i,flowTransform.matrix);
    }
    currentFlow.instanceMatrix.needsUpdate=true;
    const framing=Math.max(1,Math.min(2,1.15/camera.aspect));
    const presentation=buildPresentation.getStatus();
    const mode=presentation.active?'follow':viewMode;
    if(mode==='follow'){
      const angle=heading+Math.PI+.32+orbitYaw;const radius=23*framing*zoomScale;
      camera.position.set(follow.x+Math.sin(angle)*radius,water.position.y+(13.5+orbitPitch*15)*zoomScale,follow.z+Math.cos(angle)*radius);
      look.set(follow.x+Math.sin(heading)*6,water.position.y+1.5,follow.z+Math.cos(heading)*6);
    }else{
      const angle=.665+orbitYaw, radius=(mode==='cabin'||mode==='workshop'?13:29)*framing*zoomScale;
      camera.position.set(follow.x+Math.sin(angle)*radius,water.position.y+(11+orbitPitch*20)*zoomScale,follow.z+Math.cos(angle)*radius);
      look.set(follow.x,water.position.y+1.7,follow.z-1);
    }
    if(presentation.active&&!reducedMotion){
      const blend=Math.sin(Math.PI*presentation.progress)**.7;
      const angle=heading+Math.PI+.95;
      desired.set(boat.position.x+Math.sin(angle)*18*framing,water.position.y+11,boat.position.z+Math.cos(angle)*18*framing);
      camera.position.lerp(desired,blend);look.lerp(boat.position,blend*.85);
    }
    camera.lookAt(look);
    camera.updateMatrixWorld(true);
    const viewHeight=canvas.clientHeight||innerHeight;
    if(pickupPopup.visible){
      labelWorld.copy(pickupPopup.position);labelView.copy(labelWorld).applyMatrix4(camera.matrixWorldInverse);
      labelNdc.copy(labelWorld).project(camera);
      const depth=-labelView.z,worldPerPixel=2*Math.max(.1,depth)*Math.tan(camera.fov*Math.PI/360)/viewHeight;
      const pop=reducedMotion?1:.75+.25*popupAmount+Math.sin(popupFeedback*Math.PI)*.10;
      pickupPopup.scale.setScalar(worldPerPixel*80*pop);
      pickupPopup.visible=depth>1&&Math.abs(labelNdc.x)<.95&&Math.abs(labelNdc.y)<.95;
    }
    sky.position.copy(camera.position);water.position.x=follow.x;water.position.z=follow.z;
    sun.position.set(follow.x-35,65,follow.z+35);sun.target.position.set(follow.x,0,follow.z);sun.target.updateMatrixWorld();
    camera.updateMatrixWorld(true);
    boat.updateMatrixWorld(true);bowStorage.getWorldPosition(storageLanding);storageLanding.y+=.2;
    for(const item of transfers){
      item.age+=dt;const t=THREE.MathUtils.clamp(item.age/1.05,0,1);item.mesh.visible=item.age>=0&&item.age<1.05;
      if(item.mesh.visible){
        item.mesh.position.lerpVectors(item.start,storageLanding,t);
        item.mesh.position.y+=reducedMotion?0:Math.sin(t*Math.PI)*1.7;
        item.mesh.position.x+=(item.index-1.5)*.12*t;
        item.mesh.rotation.set(reducedMotion?0:Math.sin(t*Math.PI)*.4,heading+(1-t)*item.index*.5,0);
        item.mesh.scale.setScalar(1-t*.12);
      }
    }
    renderer.render(scene,camera);
    frames++;frameTimes.push(performance.now()-t0);if(frameTimes.length>600)frameTimes.shift();
  }
  function setQuality(value){quality=value;renderer.setPixelRatio(Math.min(devicePixelRatio,value==='low'?1:value==='medium'?1.35:1.75));renderer.shadowMap.enabled=value!=='low';resize();}
  function getStats(){
    const rect=canvas.getBoundingClientRect();
    const project=object=>{
      const p=object.getWorldPosition(new THREE.Vector3()).project(camera);
      return {x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2,
        visible:!lastState?.cleanup?.attempt&&object.visible&&p.z>=-1&&p.z<=1&&Math.abs(p.x)<=1&&Math.abs(p.y)<=1};
    };
    const interactions=Object.fromEntries(hotspots.map(mesh=>[mesh.userData.interaction,project(mesh)]));
    // Preserve the original nearest cleanup interaction plus per-site QA identities.
    const sortedBuoys=[...cleanupBuoys].sort((a,b)=>a.group.position.distanceToSquared(boat.position)-b.group.position.distanceToSquared(boat.position));
    for(const b of cleanupBuoys)interactions[`cleanup:${b.site.id}`]=project(b.hotspot);
    if(sortedBuoys[0])interactions.cleanup=project(sortedBuoys[0].hotspot);
    const targets=pickups.map(p=>({id:p.node.id,access:p.node.access,world:{x:p.node.x,z:p.node.z},...project(p.group),marker:{...project(pickupPopup),...pickupPopup.userData.label,visible:pickupPopup.visible&&popupTarget?.id===p.node.id}}));
    const cleanupSites=cleanupBuoys.map(b=>({id:b.site.id,...project(b.group)}));
    const a=[...frameTimes].sort((a,b)=>a-b);
    return {frames,quality,viewMode,interactions,targets,cleanupSites,buildPresentation:buildPresentation.getStatus(),shelterRadius:SHELTER_RADIUS,...cleanupView.getStats?.(camera,rect,lastState),
      renderCpuMsMedian:a[Math.floor(a.length*.5)]||0,renderCpuMsP95:a[Math.floor(a.length*.95)]||0,
      drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,width:canvas.width,height:canvas.height};
  }
  function dispose(){
    if(disposed)return;
    disposed=true;
    try { cleanupView.dispose?.(); }
    finally {
      for (const template of templateRoots) scene.add(template);
      releaseScene(scene,renderer,{textures:[...detachedTextures]});
    }
  }
  options.onReady?.();
  return {update,resize,dispose,getStats,getBuildPresentation:buildPresentation.getStatus,setQuality,pickInteraction,pickCleanup,setView,orbit,zoom,onAction,setReducedMotion:v=>{reducedMotion=Boolean(v);}};
  } catch (error) {
    // Constructors do not return a disposal handle on failure. Release every
    // acquired world, template and detached texture before propagating it.
    try { constructionCleanup?.dispose?.(); }
    catch (releaseError) { console.error('Underwater construction release failed:', releaseError); }
    for (const template of templateRoots) scene.add(template);
    try { releaseScene(scene,renderer,{textures:[...detachedTextures]}); }
    catch (releaseError) { console.error('World construction release failed:', releaseError); }
    throw error;
  }

}
