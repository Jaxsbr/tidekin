/** Original editable procedural art. Units are metres; Y up, player in XY at Z=0. */
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function createReefArt(THREE) {
  const root = new THREE.Group(); root.name = 'Cleanup_Reef';
  const mats = {};
  const material = (name, color, extra = {}) => mats[name] ||= new THREE.MeshStandardMaterial({color, roughness:.86, ...extra});
  const sand=material('sand',0xefd29c), chalk=material('chalk',0xded9b8), rock=material('rock',0x729e99), shadow=material('shadow',0x377f84);
  const coral=[material('salmon',0xe88669),material('rose',0xbd7894),material('gold',0xe1b95c),material('lavender',0x9d9cc1)];
  const grass=material('grass',0x438f79), tips=material('tips',0x9bc9a0);
  const sphere = new THREE.SphereGeometry(1,12,8), stone=new THREE.IcosahedronGeometry(1,1);
  function mesh(geo,mat,pos,scale=[1,1,1],parent=root) {const o=new THREE.Mesh(geo,mat);o.position.set(...pos);o.scale.set(...scale);parent.add(o);return o;}
  function tube(points,r,mat,parent=root) {return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),12,r,6,false),mat,[0,0,0],[1,1,1],parent);}
  // Clear warm sand shelf; back and foreground gardens leave the entire swim plane open.
  mesh(sphere,sand,[0,-10.6,-.8],[28,1.8,14]);
  const seabed=mesh(new THREE.PlaneGeometry(100,80),sand,[0,-9.6,0]);seabed.rotation.x=-Math.PI/2;
  for(let i=0;i<24;i++) {
    const x=-14+i*1.22+Math.sin(i*4)*.4, z=-4.5-(i%3)*.7, h=.5+(Math.sin(i*7.1)+1)*.8;
    const o=mesh(stone,i%3?rock:chalk,[x,-9+h*.25,z],[.9+(i%4)*.22,h,1.2]);o.rotation.set(i*.2,i*.8,i*.11);
    if(i%3===0) mesh(stone,shadow,[x,-9.1,2.6],[1.1,.45,.8]);
  }
  // Plate colonies with irregular layered shelves, broad lit lips and readable negative space.
  for(const [x,z,s] of [[-10,-2,1.1],[8,-3,1.25],[-6,-4,.8],[3,-4,1], [11,1,.8]]) {
    for(let k=0;k<4;k++) {
      const p=mesh(sphere,coral[(k+2)%4],[x+Math.sin(k*2)*.42,-8.7+k*.44,z],[s*(1.1-k*.13),.12,s*(.65-k*.07)]);
      p.rotation.z=Math.sin(k*3)*.12;
      mesh(sphere,tips,[p.position.x,-8.63+k*.44,z],[s*(1.05-k*.13),.035,s*(.62-k*.07)]);
    }
  }
  // Hand-shaped branching fans. None cross the central player plane.
  for(let n=0;n<12;n++) {
    const x=-12+n*2.2+Math.sin(n*4.3)*.5,z=n%2?-4.7:-2.7,base=-8.8, h=.9+(n%4)*.45,mat=coral[n%4];
    tube([[x,base,z],[x-.12,base+h*.5,z],[x+.18,base+h,z]],.11,mat);
    for(let j=0;j<5;j++) {
      const side=j%2?1:-1, y=base+.35+j*.18, end=x+side*(.55+(j%3)*.23);
      tube([[x,y,z],[end,y+.35,z+.03],[end+side*.14,y+.9,z-.1]],.065,mat);
      tube([[end,y+.4,z],[end-side*.23,y+.65,z+.04],[end-side*.3,y+.92,z]],.042,mat);
    }
  }
  for(let n=0;n<36;n++) {
    const x=-13+(n*3.731%26),z=n%2?-5.1:2.9,y=-9+(n%3)*.06;
    for(let k=0;k<3;k++) tube([[x,y,z],[x+(k-1)*.15,y+.45,z],[x+(k-1)*.3+.12,y+.8+(n%4)*.12,z+.13]],.045,k===1?tips:grass);
  }
  // Sponge gardens and rounded coral heads anchor the framing in asymmetric masses.
  for(const [x,z,s] of [[-9,-1,1.1],[9,-2,1.25],[-4,-4,.65],[6,-4,.8]]) {
    for(let k=0;k<5;k++) {
      const px=x+Math.sin(k*2.4)*s*.6,py=-8.8+(k%3)*.14,pz=z+Math.cos(k*2.4)*.35;
      mesh(new THREE.CylinderGeometry(.13,.21,.65+k*.1,10),coral[2],[px,py+.28,pz]);
      const lip=mesh(new THREE.TorusGeometry(.135,.048,6,12),coral[2],[px,py+.605+k*.05,pz]);lip.rotation.x=Math.PI/2;
      mesh(new THREE.CylinderGeometry(.10,.10,.012,10),shadow,[px,py+.60+k*.05,pz]);
    }
    for(let k=0;k<7;k++) mesh(sphere,coral[1],[x+Math.sin(k*2.4)*s,-8.65+Math.sin(k)*.2,z-.6+Math.cos(k*2.4)*.4],[.34,.38,.29]);
  }
  // Sand ripples are actual shallow ivory ridges, not screen-space noise.
  for(let i=0;i<26;i++) {
    const x=-12+(i*2.713%24),z=-1.5+(i%5)*.63;
    const o=mesh(sphere,chalk,[x,-8.91,z],[.35+(i%3)*.2,.025,.055]);o.rotation.y=.2;
  }
  // Landscape spans the enlarged domain. Preserve coral proportions while
  // distributing authored clusters across the shelf at eighteen metres.
  for(const child of root.children){child.position.x*=2.15;child.position.y-=9;}
  // Batch all static sculpted geometry by material for economical rendering.
  root.updateMatrixWorld(true);
  const batches=new Map(),oldGeometries=new Set();
  root.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);const a=batches.get(o.material)||[];a.push(g);batches.set(o.material,a);oldGeometries.add(o.geometry);});
  root.clear();
  for(const [mat,geos] of batches){const g=mergeGeometries(geos);root.add(new THREE.Mesh(g,mat));geos.forEach(g=>g.dispose());}
  oldGeometries.forEach(g=>g.dispose());sphere.dispose();stone.dispose();
  // A vertex-painted backdrop keeps turquoise luminous without fog over the diver.
  const bg=new THREE.PlaneGeometry(150,64,1,16),colors=[];
  const top=new THREE.Color(0x79ded7),bottom=new THREE.Color(0x103e61),c=new THREE.Color();
  for(let i=0;i<bg.attributes.position.count;i++){const y=bg.attributes.position.getY(i);c.copy(bottom).lerp(top,Math.max(0,Math.min(1,(y+14)/25)));colors.push(c.r,c.g,c.b);}
  bg.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  mesh(bg,new THREE.MeshBasicMaterial({vertexColors:true}),[0,-9,-18]);
  const distant=new THREE.MeshBasicMaterial({color:0x398f99});
  for(let i=0;i<19;i++){
    const h=2+(i*1.731%5),x=-45+i*5.1;
    mesh(new THREE.IcosahedronGeometry(1,1),distant,[x,-19+h*.35,-12],[2.8,h,1]);
  }
  // Hazy contour bands stay behind the interaction plane. Different depth and
  // summit heights make long horizontal swims reveal shelves, coves and valleys.
  const detailGeometries=[[],[]];
  for(let layer=0;layer<3;layer++){
    const ridge=new THREE.Shape();ridge.moveTo(-65,-27);
    const contour=x=>-7.5-layer*3.3+Math.sin(x*.22+layer*1.7)*2.4+Math.sin(x*.53+layer)*.8;
    for(let k=0;k<=160;k++){const x=-65+k*.82;ridge.lineTo(x,contour(x));}
    ridge.lineTo(67,-27);ridge.closePath();
    const geometry=new THREE.ShapeGeometry(ridge),rgb=[];
    const upper=new THREE.Color([0x4da3aa,0x358c99,0x28798b][layer]),lower=new THREE.Color(0x174d6b),shade=new THREE.Color();
    for(let i=0;i<geometry.attributes.position.count;i++){const y=geometry.attributes.position.getY(i);shade.copy(lower).lerp(upper,Math.max(0,Math.min(1,(y+25)/18)));rgb.push(shade.r,shade.g,shade.b);}
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));
    mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true}),[0,0,-16+layer*2]);
    // Sparse rooted kelp silhouettes follow each contour, never float in open water.
    for(let i=0;i<24;i++){
      const x=-48+i*4.2+Math.sin(i*3),y=contour(x)-.15,h=.8+(i%4)*.35;
      for(let k=0;k<3;k++){
        const blade=new THREE.Shape();blade.moveTo(x,y);blade.bezierCurveTo(x-.3,y+h*.4,x+.35+k*.15,y+h*.8,x+(k-1)*.24,y+h);blade.quadraticCurveTo(x+.65,y+h*.45,x+.12,y);blade.closePath();
        const g=new THREE.ShapeGeometry(blade,6);g.translate(0,0,-15.9+layer*2);detailGeometries[layer%2].push(g);
      }
      if(i%3===0)for(let k=0;k<3;k++){
        const g=new THREE.SphereGeometry(1,8,5);g.scale(.5-k*.08,.06,.18);g.translate(x+.5,y+.12+k*.17,-15.8+layer*2);detailGeometries[layer%2].push(g.toNonIndexed());g.dispose();
      }
    }
  }
  for(let i=0;i<2;i++){
    const source=detailGeometries[i],geos=source.map(g=>g.index?g.toNonIndexed():g);
    mesh(mergeGeometries(geos),new THREE.MeshBasicMaterial({color:i?0x438e91:0x599e9d}),[0,0,0]);
    new Set([...source,...geos]).forEach(g=>g.dispose());
  }
  // Thin luminous caustic contours on the back ledge suggest moving surface light.
  const caustics=new THREE.Group();root.add(caustics);
  const causticMat=new THREE.MeshBasicMaterial({color:0xc3ead0,transparent:true,opacity:.15,depthWrite:false});
  for(let i=0;i<12;i++){
    const loop=mesh(new THREE.TorusGeometry(.5+(i%3)*.13,.013,3,24),causticMat,[-26+i*4.7,-17.82,-1-(i%3)*.4],[1,.24,1],caustics);loop.rotation.x=-1.1;
  }
  // Air begins exactly at world Y=0. This opaque gradient masks the painted
  // reef above the waterline while remaining behind swimmer/foreground objects.
  const airGeometry=new THREE.PlaneGeometry(160,60,1,6),airColors=[];
  const horizon=new THREE.Color(0xd6eee6),sky=new THREE.Color(0x8ecbdc),airColor=new THREE.Color();
  for(let i=0;i<airGeometry.attributes.position.count;i++){
    const elevation=airGeometry.attributes.position.getY(i)+30;
    airColor.copy(horizon).lerp(sky,Math.min(1,elevation/10));airColors.push(airColor.r,airColor.g,airColor.b);
  }
  airGeometry.setAttribute('color',new THREE.Float32BufferAttribute(airColors,3));
  const air=mesh(airGeometry,new THREE.MeshBasicMaterial({vertexColors:true}),[0,30,-1.2]);air.name='Surface_Air';
  const surface=mesh(new THREE.PlaneGeometry(130,.07),new THREE.MeshBasicMaterial({color:0xc6fff0}),[0,0,-1]);surface.name='Waterline';
  const rays=new THREE.Group();root.add(rays);
  const raymat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;void main(){float edge=sin(vUv.x*3.14159);float fade=smoothstep(0.,.85,vUv.y);gl_FragColor=vec4(.75,1.,.91,edge*edge*fade*.075);}'});
  for(let i=0;i<13;i++) {const o=mesh(new THREE.PlaneGeometry(.8+i%3*.5,24),raymat,[-32+i*5.5,-8,-9],[1,1,1],rays);o.rotation.z=-.28;o.name='Sunshaft';}
  // Unbatched rooted ribbons animate at their base; all other sculpture stays batched.
  const plants=[];
  for(let i=0;i<18;i++){
    const plant=new THREE.Group();plant.position.set(-28+i*3.3,-17.8,i%2?-3.3:2.3);root.add(plant);
    const h=.7+(i%4)*.32;
    for(let k=0;k<3;k++){
      const blade=new THREE.Shape();blade.moveTo(0,0);blade.quadraticCurveTo(-.18,h*.6,.16,h);blade.quadraticCurveTo(.32,h*.6,.1,0);
      const leaf=new THREE.Mesh(new THREE.ShapeGeometry(blade,8),k===1?tips:grass);leaf.material.side=THREE.DoubleSide;leaf.rotation.z=(k-1)*.25;leaf.position.x=(k-1)*.12;plant.add(leaf);
    }plants.push(plant);
  }
  const bubbles=new THREE.InstancedMesh(new THREE.SphereGeometry(.045,6,4),new THREE.MeshBasicMaterial({color:0xc4f5e5,transparent:true,opacity:.42,depthWrite:false}),36);root.add(bubbles);
  const dummy=new THREE.Object3D();
  const shafts=rays.children.filter(o=>o.name==='Sunshaft');
  function update(time,reduced){
    caustics.position.x=reduced?0:Math.sin(time*.32)*.2;
    plants.forEach((p,i)=>p.rotation.z=reduced?0:Math.sin(time*.8+i*.41)*.085);
    shafts.forEach((p,i)=>{p.rotation.z=-.28+(reduced?0:Math.sin(time*.18+i)*.035);});
    for(let i=0;i<36;i++){dummy.position.set(-28+(i*3.731%56)+(reduced?0:Math.sin(time*.6+i)*.12),-17.8+((i*.71+(reduced?0:time*.28))%17.7),-2-(i%4));dummy.scale.setScalar(.5+(i%4)*.25);dummy.updateMatrix();bubbles.setMatrixAt(i,dummy.matrix);}bubbles.instanceMatrix.needsUpdate=true;
  }
  const fish=[];
  const fishMat=new THREE.MeshStandardMaterial({color:0xe2bf75,roughness:.65});
  for(let i=0;i<20;i++){
    const school=new THREE.Group();root.add(school);
    mesh(new THREE.SphereGeometry(1,10,6),fishMat,[0,0,0],[.19,.085,.045],school);
    const tail=mesh(new THREE.ConeGeometry(.095,.14,3),fishMat,[-.2,0,0],[1,1,.5],school);tail.rotation.z=Math.PI/2;
    fish.push(school);
  }
  // Original generated panorama: one world-space draw behind all interaction
  // geometry. The procedural reef remains the loading/error fallback.
  const panoramaGeometry=new THREE.PlaneGeometry(1,1);
  const panoramaMaterial=new THREE.MeshBasicMaterial({color:0xc3e4e0,transparent:true,opacity:.84,depthWrite:false,toneMapped:false});
  const panorama=mesh(panoramaGeometry,panoramaMaterial,[0,-11,-10],[100,40,1]);
  panorama.name='Painted_Reef_Panorama';panorama.visible=false;
  let panoramaDisposed=false;
  panoramaGeometry.addEventListener('dispose',()=>{panoramaDisposed=true;});
  // Node-side contract checks do not have an image loader environment.
  if(typeof document!=='undefined'){
    const texture=new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/ui-fourth/reef-panorama.png`,loaded=>{
      if(panoramaDisposed){loaded.dispose();return;}
      loaded.colorSpace=THREE.SRGBColorSpace;
      const ratio=loaded.image.width/loaded.image.height;
      panorama.scale.set(Math.max(100,40*ratio),Math.max(40,100/ratio),1);
      panorama.visible=true;
    },undefined,()=>{panorama.visible=false;});
    texture.colorSpace=THREE.SRGBColorSpace;panoramaMaterial.map=texture;
  }
  const updateWater=update;
  const animate=(time,reduced,focus={x:0,y:-4})=>{updateWater(time,reduced);panorama.position.x=focus.x*.08;panorama.position.y=-11+(focus.y+4)*.025;fish.forEach((f,i)=>{f.position.set(-30+(i*4.731+(reduced?0:time*.24))%60,-4-(i*1.73%12)+(reduced?0:Math.sin(time+i)*.1),-3-(i%3));f.rotation.y=reduced?0:Math.sin(time*3+i)*.18;});};
  update(0,true);
  return {root,update:animate};
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

/** Anchored limestone habitat with a small pull-responsive snag. */
export function createCleanupPatch(THREE,item,index) {
  const root=new THREE.Group();root.name=`Habitat_${item.id}`;root.position.set(item.x,item.y,0);
  const stone=new THREE.MeshStandardMaterial({color:0xabbba7,roughness:.92});
  const shade=new THREE.MeshStandardMaterial({color:0x567f82,roughness:1});
  const sand=new THREE.MeshStandardMaterial({color:0xd8cca3,roughness:1});
  const height=Math.max(.7,item.y+18.4),side=index%2?-1:1;
  function mesh(geo,mat,pos,scale){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);if(scale)m.scale.set(...scale);root.add(m);return m;}
  // Broad stepped buttress meets the continuous seabed; its top supports the
  // authoritative item rather than moving that item to match decorative art.
  const shape=new THREE.Shape();
  [[-2.8,-height],[5.5,-height],[4.3,-height*.7],[3.2,-height*.65],[2.5,-height*.35],[1.1,-.7],[.55,-.42],[-.6,-.42],[-1.2,-height*.4],[-2.8,-height]].forEach(([x,y],i)=>i?shape.lineTo(x*side,y):shape.moveTo(x*side,y));shape.closePath();
  // Eroded windows reveal painted reef through the support instead of
  // presenting a solid screen-height wall.
  if(height>5)for(const fraction of [.38,.68]){
    const opening=new THREE.Path();
    opening.absellipse(side*(fraction>.5?1.0:.45),-height*fraction,.43,height*.07,.0,Math.PI*2,true);
    shape.holes.push(opening);
  }
  const wallGeometry=new THREE.ExtrudeGeometry(shape,{depth:2.2,bevelEnabled:true,bevelThickness:.16,bevelSize:.18,bevelSegments:2});
  const wallColors=[],tint=new THREE.Color();
  for(let i=0;i<wallGeometry.attributes.position.count;i++){
    const y=wallGeometry.attributes.position.getY(i),x=wallGeometry.attributes.position.getX(i);
    const band=.76+.14*Math.sin(y*4.2+Math.sin(x*.7)*.6)+.08*Math.sin(y*11+x*.4);
    tint.setRGB(band,band,band);wallColors.push(tint.r,tint.g,tint.b);
  }
  wallGeometry.setAttribute('color',new THREE.Float32BufferAttribute(wallColors,3));
  wallGeometry.scale(.6,1,1);
  const wallMaterial=stone.clone();wallMaterial.vertexColors=true;
  mesh(wallGeometry,wallMaterial,[0,0,-2.6]);
  for(let k=0;k<6;k++){
    const y=-height+(k+.4)*height/6;
    const rock=mesh(new THREE.IcosahedronGeometry(1,1),k%2?stone:shade,[side*(2.6-k*.32)*.6,y,-1.2],[(2.3-k*.22)*.6,height/13,.8]);rock.rotation.z=side*.09;
  }
  mesh(new THREE.SphereGeometry(1,16,10),sand,[0,-.55,-.35],[.95,.16,.7]);
  // Small reef shelves soften the escarpment without obscuring the target.
  const coral=new THREE.MeshStandardMaterial({color:index%2?0xc98690:0xdfa568,roughness:.8});
  for(let k=0;k<5;k++)mesh(new THREE.SphereGeometry(1,12,8),coral,[side*(1.1+k*.18),-1.15-k*.22,-.4],[.45+k*.09,.075,.34]);
  // One static batch of encrusted seams and branching growth per support.
  const growth=[];
  for(let k=0;k<8;k++){
    const y=-.9-k*(height-1.3)/8,x=side*(.45+Math.sin(k*2.1)*.35),z=-.32;
    const crust=new THREE.SphereGeometry(1,10,6);crust.scale(.4+(k%3)*.09,.065,.12);crust.translate(x,y,z);growth.push(crust.toNonIndexed());crust.dispose();
    if(k%2===0)for(const direction of [-1,1]){
      const curve=new THREE.CatmullRomCurve3([[x,y,z],[x+direction*.22,y+.22,z+.04],[x+direction*.30,y+.48,z]].map(p=>new THREE.Vector3(...p)));
      const branch=new THREE.TubeGeometry(curve,6,.025,4,false);growth.push(branch.toNonIndexed());branch.dispose();
    }
  }
  const growthGeometry=mergeGeometries(growth);growth.forEach(g=>g.dispose());
  mesh(growthGeometry,new THREE.MeshStandardMaterial({color:0x6e9b7d,roughness:1}),[0,0,0]);
  const snag=new THREE.Group();root.add(snag);
  const weed=new THREE.MeshStandardMaterial({color:0x4b846e,roughness:1});
  for(let i=0;i<3;i++){const curve=new THREE.CatmullRomCurve3([[-.4+i*.3,-.48,-.1],[-.3+i*.3,-.15,.24],[-.36+i*.3,.23,.05]].map(p=>new THREE.Vector3(...p)));snag.add(new THREE.Mesh(new THREE.TubeGeometry(curve,10,.025,5,false),weed));}
  return {root,update(progress,time,reduced){snag.visible=progress<1;snag.scale.y=1-progress*.5;snag.rotation.z=reduced?0:Math.sin(time*.8+index)*.025;}};
}
