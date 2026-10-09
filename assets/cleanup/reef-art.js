/** Original modeled reef. World metres, Y up, interaction plane Z=0. */
import { reefRandom, createReefSculptor } from './underwater-models.js';
import { createReefFish } from './underwater-fish.js';
import { sculptWreck, sculptArch } from './underwater-landmarks.js';

export function createReefArt(THREE,site={}) {
  const root=new THREE.Group();root.name='Cleanup_Reef';
  const random=reefRandom(site.seed??site.id??'home-reef');
  const biomes=['coral-garden','kelp-forest','sand-gullies','basalt-arches','shell-shelves','wreck-garden'];
  const biome=site.biome??biomes[Math.floor(random()*biomes.length)];
  const palettes={
    'coral-garden':{rock:0x719e9c,sand:0xb9cfb5,coral:[0xe88c91,0xbe8ed1,0x83cbb9]},
    'kelp-forest':{rock:0x558b85,sand:0xa9c6aa,coral:[0xc1b879,0x6dbba2,0xd89a83]},
    'sand-gullies':{rock:0x99b5ad,sand:0xd7d6b2,coral:[0xbfa2ce,0xdba67f,0x79c4bd]},
    'basalt-arches':{rock:0x527b8c,sand:0x9cb4b9,coral:[0xbf97bc,0x8fbfd0,0xde9f85]},
    'shell-shelves':{rock:0x97b5b4,sand:0xd3cfb4,coral:[0xe4bb9d,0xbaa1cb,0x92cebf]},
    'wreck-garden':{rock:0x648e8b,sand:0xb6c5ad,coral:[0xd49f7b,0x87b8b7,0xc794ac]}
  };
  const palette=palettes[biome]??palettes['coral-garden'],floor=site.bounds?.minY??-18;
  const terrain=site.terrain??Array.from({length:15},(_,i)=>({x:-28+i*4,y:floor+1+random()*1.4}));
  const height=x=>{
    const i=Math.max(0,Math.min(terrain.length-2,Math.floor((x-terrain[0].x)/4))),a=terrain[i],b=terrain[i+1];
    const t=Math.max(0,Math.min(1,(x-a.x)/(b.x-a.x)));return a.y+(b.y-a.y)*t;
  };
  const sculptors=[],anchors=[],layers=[];
  const canyonOffset=(random()-.5)*5;
  // Four genuinely separated habitats: distant massif, middle reef slope,
  // detailed seabed gardens and sparse close framing. The XY swim lane is clear.
  for(let layer=0;layer<4;layer++){
    const group=new THREE.Group();group.name=['Far_Reef','Middle_Reef','Habitat_Reef','Near_Reef'][layer];root.add(group);layers.push(group);
    const s=createReefSculptor(THREE,group,random);sculptors.push(s);
    const z=[-29,-15,-4.5,2.6][layer],phase=random()*6.28;
    const riseAt=x=>{
      if(layer>=2)return 0;
      const u=x-canyonOffset,far=layer===0?1.3:1;
      if(biome==='coral-garden')return far*(1.0+4.4*(1-Math.exp(-u*u/65)))+Math.sin(x*.52+phase)*.45;
      if(biome==='kelp-forest')return far*(1.2+Math.sin(x*.18+phase)*.6);
      if(biome==='wreck-garden')return far*(.6+Math.sin(x*.13+phase)*.4);
      if(biome==='basalt-arches')return far*(.9+Math.max(0,u)*.25)+Math.sin(x*.45+phase)*.5;
      if(biome==='sand-gullies')return far*(.6+Math.sin(x*.35+phase)*.55);
      return far*(2+Math.sin(x*.23+phase)*1.4);
    };
    const tint=new THREE.Color(palette.rock).lerp(new THREE.Color(0x348f9a),[.85,.48,0,.08][layer]);
    if(layer<2){
      // One continuous sculpted surface per depth layer. The front rolls down
      // into the seabed; broad gullies replace the old isolated rock stacks.
      const g=new THREE.PlaneGeometry(120,22,140,30);g.rotateX(-Math.PI/2);
      const p=g.attributes.position;
      for(let i=0;i<p.count;i++){
        const x=p.getX(i),localZ=p.getZ(i),front=Math.max(0,Math.min(1,(localZ+2)/13));
        const ridge=height(x)+riseAt(x),erosion=Math.sin(x*1.4+Math.sin(localZ*.8))*Math.sin(localZ*.6)*.17;
        p.setXYZ(i,x,ridge-front*front*(riseAt(x)+4)+erosion,z+localZ);
      }
      g.computeVertexNormals();s.add(g,s.material(tint.getHex()));
    }
    const count=layer===0?13:layer===1?15:layer===2?17:8;
    for(let i=0;i<count;i++){
      const x=-40+i*80/(count-1)+(random()-.5)*3.8,zz=z+(random()-.5)*1.4;
      const y=height(x)+riseAt(x)-.04;
      const sparse=biome==='sand-gullies'&&random()<.58;
      if(sparse)continue;
      if(layer===0){
        s.coral([x,y,zz],.9+random()*1.3,tint.getHex(),i%3===0?3:0);continue;
      }
      // Colonies occur in irregular mixed patches, with open sand between them.
      const size=layer===1?1.0+random()*.7:.65+random()*.55;
      if(layer>=2)s.stone([x,y-.23,zz],[size*.7,size*.34,size*.55],palette.rock);
      const dominant=biome==='shell-shelves'?1:biome==='kelp-forest'?4:biome==='basalt-arches'?3:Math.floor(random()*6);
      const speciesColor=layer===1?new THREE.Color(palette.coral[i%3]).lerp(tint,.4).getHex():palette.coral[i%3];
      s.coral([x,y,zz],size,speciesColor,dominant);
      if(layer<3){
        s.coral([x+size*.75,y-.10,zz+.3],size*.65,palette.coral[(i+1)%3],(dominant+2)%6);
        s.coral([x-size*.55,y-.13,zz+.4],size*.43,palette.coral[(i+2)%3],(dominant+4)%6);
      }
      if(biome==='kelp-forest'||random()<.24)s.kelp([x+size*.6,y-.10,zz],biome==='kelp-forest'?2.8+random()*2.7:.8+random(),0x519d88);
      if(layer===2&&i%3===0)anchors.push({x,y:y+1,z:zz+1});
    }
    if(layer===2){
      const g=new THREE.PlaneGeometry(100,25,120,22);g.rotateX(-Math.PI/2);
      const p=g.attributes.position;
      for(let i=0;i<p.count;i++){const x=p.getX(i),z0=p.getZ(i);p.setY(i,height(x)-.3+Math.sin(x*5+z0*.7)*.023+Math.sin(z0*.55)*.10);}
      g.computeVertexNormals();s.add(g,s.material(palette.sand));
    }
    if(layer===3&&biome!=='kelp-forest'){
      for(const x of [-8,-3.8,4.2,9]){
        const y=height(x)-.08;
        const targetAbove=(site.trash??[]).filter(t=>Math.abs(t.x-x)<2.5).reduce((v,t)=>Math.min(v,t.y),0);
        const size=Math.min(1.7,Math.max(.7,(targetAbove-y-.7)/1.4));
        s.stone([x,y-.22,2.7],[1.3,.35,1],palette.rock);
        s.coral([x,y,2.7],size,palette.coral[x<0?0:1],x<0?3:0);
        s.coral([x+.75,y-.03,2.9],size*.65,palette.coral[2],1);
        s.coral([x-.6,y-.05,3],size*.5,palette.coral[1],5);
      }
    }
    if(layer===2&&site.id==='home-reef'){
      // A single coral shoulder introduces the habitat during descent, before
      // the deep seabed appears. Its whole mass stays behind the swim plane.
      const cx=6.7+canyonOffset*.25;
      const shoulderHeight=(x,z)=>{
        const edge=Math.max(0,Math.min(1,(z+16)/2,(-z-2)/3,(11-Math.abs(x-cx))/2));
        const ridge=6.5*Math.exp(-Math.pow((x-cx)/3.4,2)-Math.pow((z+10)/3.8,2))
          +2.6*Math.exp(-Math.pow((x-cx+3.5)/3,2)-Math.pow((z+9)/3,2));
        const relief=(Math.sin(x*2.1+z*.8)*Math.sin(z*1.6)*.28+Math.sin(x*4+z)*.1)*Math.min(1,ridge);
        return height(x)-.4+edge*(ridge+relief);
      };
      const g=new THREE.PlaneGeometry(22,14,72,44);g.rotateX(-Math.PI/2);
      const p=g.attributes.position;
      for(let i=0;i<p.count;i++){
        const x=p.getX(i)+cx,z0=p.getZ(i)-9;
        p.setXYZ(i,x,shoulderHeight(x,z0),z0);
      }
      g.computeVertexNormals();s.add(g,s.material(palette.rock));
      const colonies=[[cx-4,-9,1.4,1],[cx-2.5,-8.4,1.5,3],[cx-.7,-9,1.9,2],[cx+1,-10,1.6,0],[cx+2.6,-8.5,1.4,5],[cx,-7,1.1,1],[cx-3,-6.8,1.1,0]];
      for(const [i,c] of colonies.entries()){
        const [x,z0,size,type]=c,y=shoulderHeight(x,z0);
        s.coral([x,y,z0],size,palette.coral[i%3],type);
        const xx=x+.55,zz=z0+.5;
        s.coral([xx,shoulderHeight(xx,zz),zz],size*.6,palette.coral[(i+1)%3],0);
      }
      anchors.push({x:cx-1,y:shoulderHeight(cx-1,-9)+1,z:-8.5});
    }

    if(layer===2&&biome==='basalt-arches'){
      const x=6+canyonOffset*.3;sculptArch(THREE,s,x,height(x)-.2,-6.8,palette.rock);
    }
    if(layer===2&&biome==='wreck-garden')sculptWreck(THREE,s,-1.5,height(-1.5),-5);
    if((layer===1||layer===2)&&biome==='kelp-forest'){
      for(const x of [-12,-8,-4.2,3.4,7.5,12])s.kelp([x+canyonOffset,height(x),z+.4],5.5+random()*3.7,layer===1?0x498e83:0x559f84);
    }
    s.batch();
    for(const mesh of group.children){mesh.castShadow=layer>=2;mesh.receiveShadow=layer>=1;}
    if(layer===0){
      // Far silhouettes use diffuse water-colored shading, no hard caustic edges.
      for(const mesh of group.children){mesh.material.onBeforeCompile=()=>{};mesh.material.customProgramCacheKey=()=> 'far-reef-haze';}
    }
  }
  // Targets sit in small side-wall outcrops, with schools and ascending aeration
  // trails leading into their habitat. Their precise objects still require diving.
  for(const item of site.trash??[])anchors.push({x:item.x+(random()-.5)*2,y:item.y+.5,z:-1.5});
  const fish=createReefFish(THREE,anchors.slice(-9),random);root.add(fish.root);
  const immersion={value:0};
  const water=new THREE.Mesh(new THREE.PlaneGeometry(220,130),new THREE.ShaderMaterial({depthWrite:false,uniforms:{immersion},
    vertexShader:'varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}',
    fragmentShader:'varying vec3 world;uniform float immersion;void main(){float depth=clamp(-world.y/42.,0.,1.);vec3 c=mix(vec3(.30,.73,.73),vec3(.025,.17,.27),pow(depth,.65));c=mix(c,vec3(.065,.31,.40),immersion*.42);gl_FragColor=vec4(c,1.);}'
  }));water.position.set(0,-22,-45);root.add(water);
  const clock={value:0};
  // A translucent curved surface shows a sky reflection and a soft submerged lip.
  // Sky has a warm horizon and clouds; it no longer reads as an empty gray panel.
  const sky=new THREE.Mesh(new THREE.PlaneGeometry(180,55),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:clock},
    vertexShader:'varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}',
    fragmentShader:`varying vec3 world;uniform float time;void main(){
      float wave=.035*sin(world.x*.75+time*.6)+.017*sin(world.x*2.3-time*.8);
      float h=world.y-wave;
      float cloud=pow(max(0.,sin(world.x*.26+sin(world.x*.61)*.4+time*.008)),10.)*exp(-pow((h-1.0)*2.0,2.));
      vec3 c=mix(vec3(.68,.83,.82),vec3(.23,.53,.74),smoothstep(0.,2.2,h));
      float sun=exp(-pow((world.x+6.)*.065,2.)-pow((h-1.6)*.38,2.));
      c+=cloud*.17+sun*vec3(.07,.045,.01);
      float coast=.16+.65*exp(-pow((world.x+8.)*.22,2.))+.45*exp(-pow((world.x-14.)*.19,2.))+.025*sin(world.x*4.);
      float island=(1.-smoothstep(coast-.025,coast+.025,h))*smoothstep(.1,.20,h);
      c=mix(c,vec3(.40,.65,.65),island*.55);
      gl_FragColor=vec4(c,smoothstep(-.10,.045,h));}`
  }));sky.position.set(0,26.9,.28);root.add(sky);
  const surfaceGeometry=new THREE.PlaneGeometry(160,.44,160,3);
  const surface=new THREE.Mesh(surfaceGeometry,new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:clock},
    vertexShader:'varying vec2 v;varying vec3 world;uniform float time;void main(){v=uv;vec3 p=position;p.y+=sin(p.x*.75+time*.6)*.035+sin(p.x*2.3-time*.8)*.017;world=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}',
    fragmentShader:`varying vec2 v;varying vec3 world;uniform float time;void main(){
      float lip=exp(-pow((v.y-.61)*22.,2.));
      float reflection=pow(max(0.,sin(world.x*4.5+sin(world.x*1.7-time*.45)*2.)),8.);
      float foam=lip*(.16+.48*reflection);
      float submerged=exp(-pow((v.y-.35)*6.,2.))*.15;
      gl_FragColor=vec4(mix(vec3(.37,.80,.78),vec3(.87,.98,.89),lip),foam+submerged);
    }`
  }));surface.position.set(0,0,.40);root.add(surface);
  const rayMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:clock},
    vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 v;uniform float time;void main(){float edge=pow(sin(v.x*3.14159),3.);float a=edge*sin(v.y*3.14159)*.08;gl_FragColor=vec4(.72,.96,.84,a);}'
  });
  for(let i=0;i<10;i++){const ray=new THREE.Mesh(new THREE.PlaneGeometry(1.1+random()*2,30),rayMat);ray.position.set(-40+i*9,-12,-8);ray.rotation.z=-.18-random()*.1;root.add(ray);}
  const particleGeo=new THREE.SphereGeometry(.025,5,4),particleMat=new THREE.MeshBasicMaterial({color:0xc6e9db,transparent:true,opacity:.30,depthWrite:false});
  const particles=new THREE.InstancedMesh(particleGeo,particleMat,100);root.add(particles);const dummy=new THREE.Object3D();
  const trails=new THREE.InstancedMesh(new THREE.SphereGeometry(.032,7,5),new THREE.MeshBasicMaterial({color:0xd4f6e0,transparent:true,opacity:.46,depthWrite:false}),Math.max(1,(site.trash?.length??0)*18));root.add(trails);
  trails.visible=!!site.trash?.length;
  function update(time,reduced,focus={x:0,y:-4},interaction={}){
    const t=reduced?0:time;clock.value=t;immersion.value=Math.max(0,Math.min(1,(-focus.y-4)/12));sculptors.forEach(s=>s.time.value=t);
    fish.update(t,interaction.dt??0,interaction.player??null,reduced,interaction.reset??false);
    for(let i=0;i<100;i++){
      dummy.position.set(-44+(i*5.713%88)+Math.sin(t*.15+i)*.1,floor+((i*.917+t*.06)%-floor),-12+(i%7)*2);
      dummy.scale.setScalar(.45+(i%4)*.18);dummy.updateMatrix();particles.setMatrixAt(i,dummy.matrix);
    }particles.instanceMatrix.needsUpdate=true;
    (site.trash??[]).forEach((item,index)=>{
      for(let j=0;j<18;j++){
        const progress=((j/18+t*.045)%1),y=item.y+(Math.min(-.65,item.y+10)-item.y)*progress;
        dummy.position.set(item.x+Math.sin(j*2.4+t*.6)*.09,y,-.55);
        const known=interaction.collected?.includes(item.id);
        dummy.scale.setScalar(known?0:(.4+(j%3)*.18)*Math.sin(progress*Math.PI));dummy.updateMatrix();trails.setMatrixAt(index*18+j,dummy.matrix);
      }
    });trails.instanceMatrix.needsUpdate=true;
  }
  update(0,true);
  return {root,update,get metadata(){return {biome,seed:site.seed??site.id,reefLayers:layers.length,fishCount:fish.root.children.length,fishAnchors:anchors.length,fishBehaviors:fish.getStats()};}};
}

export function createTrashArt(THREE,kind) {
  const g=new THREE.Group();g.name=`Trash_${kind}`;
  const dark=new THREE.MeshStandardMaterial({color:0x344952,roughness:.85});
  const pale=new THREE.MeshStandardMaterial({color:0xe7e5cb,roughness:.7});
  const orange=new THREE.MeshStandardMaterial({color:0xd57245,roughness:.75});
  const add=(geo,mat,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m;};
  if(kind==='wood') {
    for(let i=0;i<3;i++){
      const log=add(new THREE.CylinderGeometry(.12,.15,.85-i*.07,9),orange,(i-1)*.19,-.08+Math.abs(i-1)*.06,0);log.rotation.z=Math.PI/2-.16;
      const end=add(new THREE.CircleGeometry(.115,9),pale,.41+(i-1)*.19,-.01+Math.abs(i-1)*.06,.02);end.rotation.y=Math.PI/2;
    }
    for(const x of [-.23,.23])add(new THREE.TorusGeometry(.24,.025,5,16),dark,x,-.05,0).rotation.y=Math.PI/2;
  }
  else if(kind==='pearl') {
    const shellMat=new THREE.MeshStandardMaterial({color:0xbab5cc,roughness:.65});
    const pearlMat=new THREE.MeshStandardMaterial({color:0xfff0d6,roughness:.22,metalness:.12});
    add(new THREE.SphereGeometry(1,14,8),shellMat,0,-.25,0).scale.set(.48,.12,.3);
    const lid=add(new THREE.SphereGeometry(1,14,8),pale,0,.02,-.14);lid.scale.set(.47,.31,.07);lid.rotation.x=-.25;
    add(new THREE.SphereGeometry(.15,16,12),pearlMat,0,-.07,.1);
    for(let i=0;i<7;i++){const rib=add(new THREE.BoxGeometry(.018,.33,.023),shellMat,(i-3)*.105,.02,-.055);rib.rotation.z=(3-i)*.15;}
  }
  else if(kind==='survey') {
    add(new THREE.CylinderGeometry(.035,.035,.76,8),dark,0,-.05,0);
    add(new THREE.BoxGeometry(.44,.29,.07),pale,.2,.21,0);
    add(new THREE.BoxGeometry(.21,.035,.08),orange,.2,.21,.04);
    add(new THREE.BoxGeometry(.035,.17,.08),orange,.2,.21,.04);
    add(new THREE.IcosahedronGeometry(.16,0),dark,0,-.4,0).scale.set(1.6,.6,1);
  }
  else if(kind==='rope') {for(let i=0;i<4;i++){const m=add(new THREE.TorusGeometry(.26+i*.045,.035,6,24),orange,0,(i-2)*.05);m.rotation.x=.25;}add(new THREE.CylinderGeometry(.035,.035,.5,6),orange,.32,-.3).rotation.z=-.4;}
  else if(kind==='net') {for(let i=0;i<5;i++){add(new THREE.BoxGeometry(.85,.028,.035),dark,0,-.4+i*.2);add(new THREE.BoxGeometry(.028,.85,.035),dark,-.4+i*.2);}for(const x of [-.4,.4])add(new THREE.SphereGeometry(.08,8,6),orange,x,.43);g.rotation.z=.18;}
  else if(kind==='tire') {add(new THREE.TorusGeometry(.38,.12,8,20),dark);for(let i=0;i<12;i++){const a=i*Math.PI/6;const m=add(new THREE.BoxGeometry(.07,.13,.25),pale,Math.cos(a)*.39,Math.sin(a)*.39);m.rotation.z=a;}}
  else if(kind==='bottle') {add(new THREE.CylinderGeometry(.16,.19,.65,10),pale);add(new THREE.CylinderGeometry(.08,.13,.2,10),pale,0,.4);add(new THREE.CylinderGeometry(.085,.085,.09,10),orange,0,.53);add(new THREE.CylinderGeometry(.166,.18,.18,10),orange,0,-.04);g.rotation.z=.38;}
  else if(kind==='can') {add(new THREE.CylinderGeometry(.23,.23,.47,12),orange);add(new THREE.CylinderGeometry(.245,.245,.04,12),pale,0,.24);add(new THREE.TorusGeometry(.07,.018,5,10),dark,0,.269,.02).rotation.x=-Math.PI/2;g.rotation.z=-.25;}
  else if(kind==='crate') {for(const y of [-.3,0,.3])for(const z of [-.2,.2])add(new THREE.BoxGeometry(.75,.13,.1),orange,0,y,z);for(const x of [-.32,.32])add(new THREE.BoxGeometry(.13,.8,.48),pale,x);g.rotation.z=.15;}
  else {add(new THREE.BoxGeometry(.55,.65,.12),pale).rotation.z=.12;for(const x of [-.16,.16])add(new THREE.TorusGeometry(.11,.04,6,12,Math.PI),pale,x,.33);add(new THREE.BoxGeometry(.29,.2,.14),orange,0,-.07);}
  // Dispose authoring materials unused by this silhouette.
  for(const mat of [dark,pale,orange])if(!g.children.some(o=>o.material===mat))mat.dispose();
  return g;
}

/** Small encrusted ledges preserve target readability without screen-height pillars. */
export function createCleanupPatch(THREE,item,index) {
  const root=new THREE.Group();root.name=`Habitat_${item.id}`;root.position.set(item.x,item.y,0);
  const random=reefRandom(item.id),s=createReefSculptor(THREE,root,random),side=index%2?-1:1;
  const color=index%2?0x719b97:0x7fa5a3;
  // A single sloping limestone outcrop runs back down to the authoritative
  // seabed. The small crest supports the target without a foreground column.
  const height=Math.max(.7,item.y-(item.floorY??-18)+.1),g=new THREE.PlaneGeometry(2,1,22,20),p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const u=p.getX(i),t=p.getY(i)+.5,width=.72+(1-t)*2.2,px=side*(1-t)*1.0+u*width;
    p.setXYZ(i,px,-.52-height*(1-t)+Math.sin(px*4+t*13)*.055*Math.sin(t*Math.PI),-.78+(1-t)*.66-u*u*.20+Math.sin(t*24+Math.sin(u*3))*Math.sin(t*Math.PI)*.09);
  }
  g.computeVertexNormals();s.add(g,s.material(color));
  s.stone([0,-.57,-.66],[.72,.17,.45],color);
  s.coral([-side*.66,-.58,-.7],.5,index%2?0xd49bba:0xdc9b87,0);
  s.coral([side*.85,-.9,-1.25],.55,0x84bfae,1);
  s.kelp([side*1.1,-1.1,-1.55],.8,0x559c89);s.batch();
  root.traverse(o=>{if(o.isMesh){o.castShadow=o.material.userData.reefKind!=='stone';o.receiveShadow=true;}});
  const snag=new THREE.Group();root.add(snag);
  const weed=new THREE.MeshStandardMaterial({color:0x558e7f,roughness:.9});
  for(let i=0;i<3;i++){
    const curve=new THREE.CatmullRomCurve3([[-.4+i*.3,-.48,-.1],[-.3+i*.3,-.15,.20],[-.36+i*.3,.23,.05]].map(p=>new THREE.Vector3(...p)));
    snag.add(new THREE.Mesh(new THREE.TubeGeometry(curve,10,.022,5,false),weed));
  }
  return {root,update(progress,time,reduced){s.time.value=reduced?0:time;snag.visible=progress<1;snag.scale.y=1-progress*.5;snag.rotation.z=reduced?0:Math.sin(time*.8+index)*.025;}};
}
