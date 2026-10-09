import { getCleanupContext, CLEANUP_SURFACE } from './cleanup.js';
import { createReefArt, createTrashArt, createCleanupPatch } from '../assets/cleanup/reef-art.js';
import { createCharacterArt } from './character-art.js';

/** Owns presentation resources. State stays authoritative; camera uses 42° vertical FOV.
 * Call dispose OR the host scene resource releaser, never both. */
export function createCleanupScene({THREE}) {
  const scene=new THREE.Scene();scene.name='Cleanup';scene.background=new THREE.Color(0x53b9c4);
  const root=new THREE.Group();scene.add(root);
  const ambient=new THREE.HemisphereLight(0xc8fff0,0x17394d,1.7);scene.add(ambient);
  const sun=new THREE.DirectionalLight(0xffe6bb,2.5);sun.position.set(-8,14,12);scene.add(sun);
  const rim=new THREE.DirectionalLight(0x75dfe9,1.1);rim.position.set(8,2,-8);scene.add(rim);
  const art=createReefArt(THREE);root.add(art.root);
  const character=createCharacterArt(THREE),swimmer=character.root;root.add(swimmer);
  const siteRoot=new THREE.Group();root.add(siteRoot);
  let site=null,trash=[],clock=0,initialized=false,disposed=false,lastX=0,lastY=0,facing=1,attempt=null;
  const follow={x:0,y:-2.4},velocity={x:0,y:0};
  function releaseTree(tree){const geos=new Set(),mats=new Set(),textures=new Set();tree.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){mats.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());tree.clear();}
  function loadSite(next){
    if(site?.id===next?.id)return;releaseTree(siteRoot);site=next;
    trash=(site?.trash??[]).map((item,index)=>{
      const kind=site.kind==='survey'?'survey':item.kind??(/pearl|oyster/i.test(item.name)?'pearl':/wood|log|timber/i.test(item.name)?'wood':/scrap/i.test(item.name)?'can':item.id.split('-').at(-1));
      const mesh=createTrashArt(THREE,kind==='tin'?'can':kind);siteRoot.add(mesh);
      const patch=createCleanupPatch(THREE,{...item,kind},index);siteRoot.add(patch.root);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.64,.019,6,40),new THREE.MeshBasicMaterial({color:0xffe5a0,transparent:true,opacity:.8,depthWrite:false}));ring.position.set(item.x,item.y,.06);siteRoot.add(ring);
      return {item,mesh,patch,ring,collected:false,flight:0};
    });
  }
  const bubbleGeometry=new THREE.SphereGeometry(1,8,6),bubbleMaterial=new THREE.MeshBasicMaterial({color:0xd5fff4,transparent:true,opacity:.52,depthWrite:false});
  const bubbles=Array.from({length:24},()=>{const m=new THREE.Mesh(bubbleGeometry,bubbleMaterial);m.visible=false;root.add(m);return {mesh:m,life:0};});
  const wake=new THREE.Group();root.add(wake);
  for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.TorusGeometry(.35+i*.19,.012,4,32),bubbleMaterial);m.scale.y=.14;m.position.z=.4;wake.add(m);}
  let emission=0;
  function cameraPose(aspect=1){
    // Portrait increases vertical context modestly, never fits the whole domain.
    const halfHeight=Math.max(4.7,Math.min(7.4,4.7/Math.max(.5,aspect)));
    const y=Math.min(-halfHeight+2.1,Math.max(-18+halfHeight*.65,follow.y));
    return {position:[follow.x,y,halfHeight/Math.tan(21*Math.PI/180)],target:[follow.x,y,0]};
  }
  function update(state,dt=0,{reducedMotion=false}={}){
    if(disposed)return;dt=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.1));if(!reducedMotion)clock+=dt;
    const a=state.cleanup?.attempt,context=getCleanupContext(state);const changed=site?.id!==context.site?.id;loadSite(context.site);
    const active=!!a&&a.siteId===site?.id,reset=changed||!initialized||attempt!==a;
    swimmer.visible=active;wake.visible=false;
    const completed=active?a.status==='complete':context.completed,collected=active&&a.status!=='failed'?a.collected:[];
    const progress=Math.max(0,Math.min(1,a?.actionProgress??0));
    if(active){
      if(reset){lastX=a.x;lastY=a.y;follow.x=a.x;follow.y=a.y-2.4;velocity.x=velocity.y=0;bubbles.forEach(b=>{b.life=0;b.mesh.visible=false;});}
      const vx=dt>0?(a.x-lastX)/dt:0,vy=dt>0?(a.y-lastY)/dt:0;
      // Passive buoyancy is not propulsion: horizontal displacement or a strong
      // vertical stroke activates swimming; gentle upward drift returns to tread.
      const moving=Math.abs(vx)>.08||Math.abs(vy)>.75;
      if(Math.abs(vx)>.05)facing=Math.sign(vx);
      const surface=a.y>=CLEANUP_SURFACE;
      const selected=trash.find(t=>t.item.id===a.selectedId);
      const working=a.status==='active'&&!!selected&&progress>0;
      if(working&&Math.abs(selected.item.x-a.x)>.1)facing=Math.sign(selected.item.x-a.x);
      character.animate({dt,time:clock,moving,surface,facing,vertical:moving?Math.atan2(vy,Math.abs(vx)||.01):0,working,progress,reducedMotion,reset});
      // Follow the eased anatomical pose: upright crown stays clear of HUD,
      // while the narrow prone torso swims close to the actual surface.
      const prone=Math.abs(Math.sin(swimmer.rotation.z));
      swimmer.position.set(a.x,a.y-.85+.65*prone,.35);
      const ease=reducedMotion?1:1-Math.exp(-dt*4);
      velocity.x+=(vx-velocity.x)*ease;velocity.y+=(vy-velocity.y)*ease;
      const entryTarget=site.trash.find(t=>!collected.includes(t.id));
      const entryWeight=entryTarget?Math.max(0,1-Math.abs(a.x)/3)*Math.max(0,Math.min(1,(a.y+3)/1.5)):0;
      const entryBias=entryTarget?Math.max(-2.8,Math.min(2.8,(entryTarget.x-a.x)*.5))*entryWeight:0;
      const tx=a.x+entryBias+Math.max(-1.4,Math.min(1.4,velocity.x*.5)),ty=a.y-1.0+Math.max(-.8,Math.min(.8,velocity.y*.3));
      if(reset){follow.x=tx;follow.y=ty;}
      const dead=(delta,size)=>Math.sign(delta)*Math.max(0,Math.abs(delta)-size);
      follow.x+=dead(tx-follow.x,.35)*ease;follow.y+=dead(ty-follow.y,.25)*ease;
      sun.intensity=2.5-Math.min(1.5,Math.max(0,-a.y)*.075);ambient.intensity=1.7-Math.min(.55,Math.max(0,-a.y)*.028);
      wake.visible=surface&&moving&&!reducedMotion;wake.position.set(a.x-facing*.65,-.015,.35);
      wake.children.forEach((m,i)=>{m.position.x=-facing*i*.22;m.scale.set(1+Math.sin(clock*5-i)*.12,.14,1);});
      emission+=moving&&!reducedMotion?dt:0;
      if(emission>.09){emission=0;const b=bubbles.find(b=>b.life<=0);if(b){b.life=1;b.mesh.position.set(a.x-facing*.8,a.y-.08,.4);b.mesh.visible=true;}}
      lastX=a.x;lastY=a.y;
    }
    bubbles.forEach((b,i)=>{if(reducedMotion||!active){b.life=0;b.mesh.visible=false;}if(b.life>0){b.life-=dt*.65;b.mesh.position.y+=dt*.36;b.mesh.position.x+=Math.sin(clock+i)*dt*.05;b.mesh.scale.setScalar((.025+(i%3)*.012)*Math.max(0,b.life));b.mesh.visible=b.life>0;}});
    for(const t of trash){
      const has=completed||collected.includes(t.item.id);
      if(!reset&&has&&!t.collected)t.flight=1;
      if(reset)t.flight=0;t.collected=has;
      t.patch.update(has?1:t.item.id===a?.selectedId?progress:0,clock,reducedMotion);
      t.ring.visible=active&&!has&&(t.item.id===a.selectedId||Math.hypot(t.item.x-a.x,t.item.y-a.y)<1.6);
      if(t.flight>0&&active){t.flight=Math.max(0,t.flight-dt/.45);const p=1-t.flight;t.mesh.position.set(t.item.x+(a.x-t.item.x)*p,t.item.y+(a.y-t.item.y)*p,.2);t.mesh.scale.setScalar(1-p);t.mesh.visible=t.flight>0;}
      else {t.mesh.visible=!has;t.mesh.position.set(t.item.x,t.item.y,0);t.mesh.scale.setScalar(1);}
    }
    art.update(clock,reducedMotion,follow);attempt=a;initialized=true;
  }
  function dispose(){if(disposed)return;disposed=true;releaseTree(scene);}
  const raycaster=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),0),hit=new THREE.Vector3();
  function pick(ndc,camera,state){
    if(disposed||!state.cleanup?.attempt)return null;
    raycaster.setFromCamera(ndc,camera);
    if(!raycaster.ray.intersectPlane(plane,hit))return null;
    const context=getCleanupContext(state),a=state.cleanup.attempt;
    const nearest=context.site.trash.filter(t=>!a.collected.includes(t.id)).map(t=>({item:t,d:Math.hypot(t.x-hit.x,t.y-hit.y)})).sort((a,b)=>a.d-b.d)[0];
    return {point:{x:hit.x,y:hit.y},...(nearest?.d<=.8?{trashId:nearest.item.id}:{})};
  }
  /** CSS client coordinates, using the caller's current camera and canvas rect.
   * Target projections use the same Z=0 interaction plane as pick().
   * Returns fresh metadata only; never updates camera, presentation or domain state.
   */
  function getStats(camera,rect,state){
    const a=state.cleanup?.attempt;
    if(disposed||!a)return {cleanupTargets:[],swimmer:null};
    const actualSite=getCleanupContext(state).site;
    const left=rect.left??rect.x??0,top=rect.top??rect.y??0;
    const project=(x,y,z=0)=>{
      const world={x,y,z},point=new THREE.Vector3(x,y,z);
      const inFront=point.clone().applyMatrix4(camera.matrixWorldInverse).z<0;
      point.project(camera);
      const screen={x:left+(point.x+1)*rect.width/2,y:top+(1-point.y)*rect.height/2};
      return {...screen,screen,world,visible:inFront&&Math.abs(point.x)<=1&&Math.abs(point.y)<=1&&point.z>=-1&&point.z<=1};
    };
    const cleanupTargets=actualSite.trash.map(target=>{
      const collected=a.collected.includes(target.id)||a.status==='complete';
      return {id:target.id,trashId:target.id,name:target.name,...project(target.x,target.y),collected,
        selected:a.selectedId===target.id,distance:Math.hypot(target.x-a.x,target.y-a.y)};
    });
    const position=initialized&&site?.id===a.siteId?swimmer.position:{x:a.x,y:a.y-.85,z:.35};
    return {siteId:actualSite.id,status:a.status,action:'pull',cleanupTargets,
      swimmer:project(position.x,position.y,position.z)};
  }
  return {scene,root,update,cameraPose,pick,getStats,dispose};
}
