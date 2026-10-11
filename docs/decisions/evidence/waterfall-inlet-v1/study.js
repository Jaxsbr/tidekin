import * as T from 'three';
const canvas=document.querySelector('canvas'), hint=document.querySelector('#hint'), info=document.querySelector('#state');
const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xa9deeb);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
const scene=new T.Scene();scene.fog=new T.Fog(0xa9deeb,100,280);const camera=new T.PerspectiveCamera(48,1,.1,450);
scene.add(new T.HemisphereLight(0xd9f7ff,0x5f8261,2.5));const sun=new T.DirectionalLight(0xffe5a5,3);sun.position.set(-50,90,40);scene.add(sun);
const mats={sand:0xf6dca1,rock:0xd5d5bb,leaf:0x43934b,wood:0x946035,cream:0xffedbf,coral:0xe78051};
function mesh(g,c,x,y,z,parent=scene){const o=new T.Mesh(g,new T.MeshStandardMaterial({color:c,roughness:.8}));o.position.set(x,y,z);parent.add(o);return o}
function box(c,x,y,z,w,h,d,parent){return mesh(new T.BoxGeometry(w,h,d),c,x,y,z,parent)}
function rock(x,z,sx,sy,sz){const o=mesh(new T.DodecahedronGeometry(1,1),mats.rock,x,sy*.45-2,z);o.scale.set(sx,sy,sz);o.rotation.y=x*.3;return o}
function tree(x,y,z,size=1){mesh(new T.CylinderGeometry(.25,.45,5*size,6),mats.wood,x,y+2.5*size,z);for(let i=0;i<5;i++){const a=i*1.26;const o=mesh(new T.SphereGeometry(1,7,4),i%2?0x64ac48:0x36894b,x+Math.cos(a)*1.8*size,y+5*size,z+Math.sin(a)*1.8*size);o.scale.set(3*size,.8*size,1.8*size);o.rotation.y=-a;}}
const water=mesh(new T.PlaneGeometry(600,600,65,65),0x168fba,0,0,40);water.rotation.x=-Math.PI/2;water.material.roughness=.27;water.material.metalness=.2;
const shallow=mesh(new T.PlaneGeometry(49,86),0x39cfc4,0,.08,12);shallow.rotation.x=-Math.PI/2;
function center(z){return z>75?0:z>35?(75-z)*.27:10.8-(35-z)*.30;}
// Sculpted banks expose a changing route, rather than a straight corridor.
for(let i=0;i<7;i++){const z=93-i*12,c=center(z);for(const side of [-1,1]){const x=c+side*(22+(i%3)*2);rock(x,z,12,16+(i%4)*8,16);tree(x,16+(i%4)*8,z,1.3);rock(x+side*13,z-3,16,27+(i%3)*12,19);}}
box(mats.sand,0,.35,-15,42,1,32);rock(-35,-25,16,36,18);rock(35,-32,16,44,18);rock(-2,-55,23,48,17);
for(let i=0;i<12;i++)tree(-19+(i%5)*8,1,-20-Math.floor(i/5)*7,1+(i%3)*.2);
// A high waterfall glimpsed around the headland, ending in the blocked outlet.
const fall=box(0xdefaff,6,20,-29,4,39,.4);fall.material.transparent=true;fall.material.opacity=.8;fall.material.emissive=new T.Color(0x4f9fc1);fall.material.emissiveIntensity=.25;
const stream=box(0x43bdcf,6,.94,-17,4,.08,22);const pool=mesh(new T.CylinderGeometry(7,7,.15,40),0x54d7d1,6,.94,-26);
const debris=new T.Group();scene.add(debris);for(let i=0;i<8;i++){const o=box(i%2?0x79694c:0x538875,4+(i%3)*1.5,1.2+(i%2)*.2,-7+Math.floor(i/3)*.8,2,.35,.4,debris);o.rotation.y=i*.7;}
const cleared=new T.Group();scene.add(cleared);cleared.visible=false;for(let i=0;i<4;i++){const o=box(0xc5fff1,6,.15,-4+i*1.1,3,.08,.4,cleared);o.rotation.y=i*.03;}
const raft=new T.Group();scene.add(raft);for(let i=0;i<6;i++)box(mats.wood,(i-2.5)*.9,.7,0,.85,.65,6,raft);box(mats.wood,0,3.5,.7,.25,6,.25,raft);const sail=box(mats.cream,0,4,.7,3,2,.08,raft);box(mats.coral,0,6.1,.7,1,.6,.1,raft);box(mats.wood,0,1.4,1,3,1,2,raft);
const person=new T.Group();scene.add(person);mesh(new T.CapsuleGeometry(.4,.8,4,8),mats.coral,0,1,0,person);mesh(new T.SphereGeometry(.35,12,8),0xf1ca8e,0,1.9,0,person);
const keys=new Set();let mode='sailing',heading=0,done=false,orbit=0,drag=false,lastX=0,elapsed=0,landedAt=null;
function reset(){mode='sailing';heading=0;done=false;orbit=0;elapsed=0;landedAt=null;raft.position.set(0,0,145);person.position.set(0,1,-3);person.visible=false;debris.visible=true;cleared.visible=false;camera.position.set(0,13,165);keys.clear();}
function interact(){if(mode==='sailing'&&raft.position.z<9){mode='shore';landedAt=elapsed;raft.position.set(-7,0,3);person.position.set(-7,1,-3);person.visible=true;}else if(mode==='shore'&&person.position.distanceTo(new T.Vector3(6,1,-6))<5&&!done){done=true;debris.visible=false;cleared.visible=true;}else if(mode==='shore'&&person.position.distanceTo(new T.Vector3(-7,1,-3))<3){mode='sailing';person.visible=false;raft.position.set(-7,0,6);heading=Math.PI;}}
addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','KeyE','KeyR'].includes(e.code))e.preventDefault();if(e.code==='KeyE'&&!e.repeat)interact();if(e.code==='KeyR'&&!e.repeat)reset();keys.add(e.code)});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();drag=false});canvas.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(drag){orbit+=(e.clientX-lastX)*.005;orbit=Math.max(-1.2,Math.min(1.2,orbit));lastX=e.clientX}});canvas.addEventListener('pointerup',()=>drag=false);document.querySelector('#restart').onclick=reset;
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();reset();let prev=performance.now();
function frame(now){const dt=Math.min((now-prev)/1000,.05);prev=now;elapsed+=dt;
if(mode==='sailing'){heading+=((keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0))*dt*1.1;const speed=((keys.has('KeyW')?1:0)-(keys.has('KeyS')?.55:0))*9;const x=raft.position.x+Math.sin(heading)*speed*dt,z=raft.position.z-Math.cos(heading)*speed*dt;const c=center(z);if(z>=3&&z<190&&Math.abs(x-c)<(z>100?65:16)){raft.position.x=x;raft.position.z=z;}raft.rotation.y=-heading;raft.position.y=Math.sin(now*.0018)*.12;}else{const dx=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),dz=(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0);const len=Math.hypot(dx,dz)||1;person.position.x=T.MathUtils.clamp(person.position.x+dx/len*dt*4,-18,18);person.position.z=T.MathUtils.clamp(person.position.z+dz/len*dt*4,-25,-2);if(dx||dz)person.rotation.y=Math.atan2(dx,dz);}
const target=mode==='sailing'?raft.position:person.position;const angle=(mode==='sailing'?-heading:0)+orbit;const radius=mode==='sailing'?19:14;const desired=new T.Vector3(target.x+Math.sin(angle)*radius,target.y+(mode==='sailing'?11:9),target.z+Math.cos(angle)*radius);camera.position.lerp(desired,1-Math.exp(-dt*4));camera.lookAt(target.x,target.y+(mode==='sailing'?7:2),target.z-(mode==='sailing'?14:3));
fall.material.opacity=.74+Math.sin(now*.009)*.08;water.position.y=Math.sin(now*.001)*.035;
hint.textContent=mode==='sailing'?(raft.position.z<9?'E · Land on the sandy beach':raft.position.z>80?'Explore toward the limestone inlet':'Follow the turquoise channel toward the waterfall'):!done?(person.position.distanceTo(new T.Vector3(6,1,-6))<5?'E · Clear the tangled stream outlet':'Find the tangled debris at the stream outlet'):(person.position.distanceTo(new T.Vector3(-7,1,-3))<3?'E · Board the raft':'Stream cleared · Return to your raft or explore the beach');
info.textContent=`${mode==='sailing'?'Raft':'On shore'} · outlet ${done?'clear':'blocked'} · journey ${elapsed.toFixed(0)}s${landedAt===null?'':` · landed at ${landedAt.toFixed(0)}s`}`;
renderer.render(scene,camera);requestAnimationFrame(frame)}requestAnimationFrame(frame);
