/** Seeded sculpting primitives shared by the reef and its small target habitats. */
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export function reefRandom(seed='reef') {
  let n=2166136261;
  for(const c of String(seed)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}
  return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
}
export function createReefSculptor(THREE,root,random) {
  const materials=new Map(),time={value:0};
  function material(color,kind='stone') {
    const key=`${color}:${kind}`;
    if(materials.has(key))return materials.get(key);
    const m=new THREE.MeshStandardMaterial({color,roughness:kind==='coral'?.72:.94,vertexColors:true});
    m.onBeforeCompile=shader=>{
      shader.uniforms.reefTime=time;
      shader.vertexShader='varying vec3 reefWorld; uniform float reefTime;\n'+shader.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nreefWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
      if(kind==='kelp')shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(reefTime*.7+position.y*.5)*max(0.,position.y+17.)*.018;');
      shader.fragmentShader=`varying vec3 reefWorld; uniform float reefTime;
        vec2 reefHash(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
        float reefCells(vec2 p){vec2 cell=floor(p),f=fract(p);float first=10.,second=10.;
          for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(float(x),float(y));vec2 r=o+reefHash(cell+o)-f;float d=dot(r,r);if(d<first){second=first;first=d;}else second=min(second,d);}
          return 1.-smoothstep(.008,.10,second-first);
        }
      `+shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        float grain=sin(reefWorld.x*3.3+sin(reefWorld.y*5.1+reefWorld.z*2.))*sin(reefWorld.z*4.7+reefWorld.y*3.7);
        diffuseColor.rgb*=.96+grain*.025;
        vec2 q=reefWorld.xz*1.5+vec2(reefWorld.y*.18,0.);
        q+=vec2(sin(q.y*1.32+reefTime*.21),cos(q.x*.91-reefTime*.17))*.32;
        float caustic=reefCells(q);
        diffuseColor.rgb+=vec3(.007,.012,.010)*caustic*clamp(normal.y*.8+.15,0.,1.);
      `);
    };
    m.customProgramCacheKey=()=> `reef-mineral-caustics-${kind}-v2`;m.userData.reefKind=kind;materials.set(key,m);return m;
  }
  function paint(g,variation=.15) {
    g.computeBoundingBox();
    const p=g.attributes.position,colors=[],c=new THREE.Color(),low=g.boundingBox.min.y,range=Math.max(.01,g.boundingBox.max.y-low);
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),v=.80+Math.sin(x*3.1+y*5.3+Math.sin(z*4.2))*.055+(y-low)/range*variation;
      c.setRGB(Math.max(.55,v),Math.max(.55,v),Math.max(.55,v));colors.push(c.r,c.g,c.b);
    }
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g;
  }
  function add(g,mat,pos=[0,0,0],scale=[1,1,1],parent=root) {
    if(!g.attributes.color)paint(g);
    const mesh=new THREE.Mesh(g,mat);mesh.position.set(...pos);mesh.scale.set(...scale);parent.add(mesh);return mesh;
  }
  function stone(pos,scale,color,phase=random()*20) {
    const g=new THREE.SphereGeometry(1,20,14),p=g.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),ridge=1+.10*Math.sin(x*7+y*5+phase)*Math.sin(z*6-y*4)+.055*Math.sin(x*13+z*9+phase);
      p.setXYZ(i,x*ridge,y*ridge,z*ridge);
    }
    g.computeVertexNormals();return add(g,material(color),pos,scale);
  }
  function branch(points,r,color) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments=points.length>10?48:10,g=new THREE.TubeGeometry(curve,segments,r,7,false),p=g.attributes.position;
    for(let i=0;i<=segments;i++){
      const center=curve.getPointAt(i/segments),taper=1-i/segments*.72;
      for(let j=0;j<=7;j++){const k=i*8+j;p.setXYZ(k,center.x+(p.getX(k)-center.x)*taper,center.y+(p.getY(k)-center.y)*taper,center.z+(p.getZ(k)-center.z)*taper);}
    }
    g.computeVertexNormals();return add(g,material(color,'coral'));
  }
  function coral(pos,size,color,type=0) {
    const [x,y,z]=pos,mat=material(color,'coral');
    if(type===0){
      // Rounded cauliflower heads, with polyp-scale detail rather than fingers.
      add(new THREE.SphereGeometry(1,16,10),mat,[x,y+size*.21,z],[size*.65,size*.30,size*.48]);
      for(let i=0;i<26;i++){
        const a=i*2.39996,r=Math.sqrt(i/26)*size*.64,h=size*(.18+.27*Math.sqrt(1-i/28));
        const px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r*.7;
        add(new THREE.SphereGeometry(1,9,6),mat,[px,y+h,pz],[size*.17,size*.15,size*.16]);
        for(let j=0;j<3;j++)add(new THREE.SphereGeometry(1,6,4),mat,[px+Math.cos(j*2.1)*size*.07,y+h+size*.13,pz+Math.sin(j*2.1)*size*.07],[size*.045,size*.035,size*.04]);
      }
    }else if(type===1){
      for(let k=0;k<3;k++){
        const g=new THREE.SphereGeometry(1,48,16),p=g.attributes.position;
        for(let i=0;i<p.count;i++){
          const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),a=Math.atan2(pz,px),r=Math.hypot(px,pz),scallop=1+.12*Math.sin(a*9+k)+.05*Math.sin(a*17);
          p.setXYZ(i,px*scallop,py*.055+r*r*.28+Math.sin(a*9)*r*.065,pz*scallop);
        }
        g.computeVertexNormals();add(g,mat,[x+(k-1)*size*.18,y+k*size*.23,z],[size*(1-k*.14),size,size*.7]);
      }
    }else if(type===3){
      // A lace sea fan: radiating veins joined by irregular arcing cross-veins.
      const point=(a,r)=>[x+Math.sin(a)*r*size*.85,y+size*.18+Math.cos(a)*r*size*1.05,z+Math.sin(a*3+r*5)*size*.045];
      branch([[x,y,z],[x,y+size*.26,z]],size*.032,color);
      for(let k=0;k<19;k++){
        const angle=-1.12+k/18*2.24+(random()-.5)*.025;
        branch([[x,y+size*.15,z],point(angle,.38),point(angle,.72),point(angle,1)],size*.013,color);
      }
      for(let row=0;row<7;row++){
        const radius=.27+row*.115,points=[];
        for(let k=0;k<24;k++){const a=-1.1+k/23*2.2;points.push(point(a,radius+Math.sin(k*2.7+row)*.015));}
        branch(points,size*.009,color);
      }
    }else if(type===2){
      // Forked living coral: branches fan into dense asymmetrical tapered tips.
      const fan=type===3,depth=fan?4:3;
      function grow(px,py,pz,angle,length,radius,level){
        const ex=px+Math.sin(angle)*length,ey=py+Math.cos(angle)*length,ez=pz+(fan?0:(random()-.5)*length*.6);
        branch([[px,py,pz],[px+(ex-px)*.36+(random()-.5)*length*.13,py+(ey-py)*.57,pz],[ex,ey,ez]],radius,color);
        if(level){
          grow(ex,ey,ez,angle-.40-random()*.25,length*(.62+random()*.13),radius*.64,level-1);
          grow(ex,ey,ez,angle+.36+random()*.3,length*(.62+random()*.13),radius*.64,level-1);
          if(!fan&&level===2)grow(ex,ey,ez-.08,angle+(random()-.5)*.4,length*.82,radius*.57,level-1);
        }
      }
      grow(x,y,z,-.08,size*.48,size*(fan?.032:.047),depth);
      if(fan){grow(x,y,z,-.52,size*.47,size*.028,3);grow(x,y,z,.48,size*.5,size*.028,3);}
    }else if(type===4){
      // Brain coral: a solid dome with meandering raised limestone ridges.
      add(new THREE.SphereGeometry(1,20,12),mat,[x,y+size*.18,z],[size*.65,size*.48,size*.53]);
      const ridgeColor=new THREE.Color(color).lerp(new THREE.Color(0xffddad),.30).getHex();
      for(let row=0;row<7;row++){
        const points=[];
        for(let j=0;j<26;j++){
          const a=j/25*Math.PI*2,phi=.16+row*.19+Math.sin(a*7+row*1.7)*.045;
          points.push([x+Math.cos(a)*Math.sin(phi)*size*.66,y+size*.18+Math.cos(phi)*size*.49,z+Math.sin(a)*Math.sin(phi)*size*.54]);
        }
        branch(points,size*.019,ridgeColor);
      }
    }else{
      // Anemone crowns have bent, soft tentacles and a low attached foot.
      add(new THREE.SphereGeometry(1,12,8),mat,[x,y+.07*size,z],[size*.44,size*.14,size*.34]);
      for(let k=0;k<27;k++){
        const a=k*2.39996,r=Math.sqrt(k/27)*size*.42,h=size*(.30+random()*.28),px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r*.75;
        branch([[px,y,pz],[px+Math.cos(a)*size*.07,y+h*.6,pz],[px+Math.cos(a)*size*.14,y+h,pz+Math.sin(a)*size*.09]],size*.032,color);
        add(new THREE.SphereGeometry(1,7,5),mat,[px+Math.cos(a)*size*.14,y+h,pz+Math.sin(a)*size*.09],[size*.042,size*.044,size*.04]);
      }
    }
  }

  function kelp(pos,size,color) {
    const [x,y,z]=pos;
    if(size>2){
      const mat=material(color,'kelp');mat.side=THREE.DoubleSide;
      for(let stem=0;stem<3;stem++){
        const h=size*(.72+stem*.13),offset=(stem-1)*.24,lean=(stem-1)*.07;
        const stemX=t=>x+offset+Math.sin(t*3+stem)*h*.06+lean*h*t;
        branch([[stemX(0),y,z],[stemX(.4),y+h*.4,z+.1],[stemX(.75),y+h*.75,z],[stemX(1),y+h,z+.1]],.025+h*.003,color);
        for(let node=1;node<=9;node++){
          const at=node/10,px=stemX(at),py=y+h*at;
          for(const side of [-1,1]){
            const len=(.55+Math.sin(at*Math.PI)*.6)*(1+random()*.3),g=new THREE.PlaneGeometry(1,1,3,12),p=g.attributes.position;
            for(let i=0;i<p.count;i++){
              const across=p.getX(i),t=p.getY(i)+.5;
              p.setXYZ(i,px+side*t*len,py+Math.sin(t*Math.PI)*len*.28-t*.18+across*.28*Math.sin(t*Math.PI),z+across*.18*Math.sin(t*Math.PI)+Math.sin(t*4+node)*.09);
            }
            g.computeVertexNormals();add(g,mat);
          }
          add(new THREE.SphereGeometry(1,7,5),mat,[px,py,z],[.045,.065,.04]);
        }
      }
      return;
    }
    for(let k=0;k<5;k++){
      const h=size*(.65+k*.13),g=new THREE.PlaneGeometry(size*.18,h,3,12),p=g.attributes.position;
      for(let i=0;i<p.count;i++){
        const t=(p.getY(i)+h/2)/h;
        p.setXYZ(i,p.getX(i)*Math.sin(t*Math.PI)+Math.sin(t*4+k)*size*.14+(k-2)*size*t*.17,t*h,Math.sin(t*5+k)*size*.10);
      }
      g.computeVertexNormals();const mat=material(color,'kelp');mat.side=THREE.DoubleSide;add(g,mat,[x,y,z]);
    }
  }
  function batch() {
    const batches=new Map(),sources=new Set();
    for(const child of [...root.children])if(child.isMesh){
      const g=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();child.updateMatrix();g.applyMatrix4(child.matrix);
      for(const name of Object.keys(g.attributes))if(!['position','normal','color'].includes(name))g.deleteAttribute(name);
      if(!batches.has(child.material))batches.set(child.material,[]);batches.get(child.material).push(g);sources.add(child.geometry);root.remove(child);
    }
    for(const [mat,geos] of batches){root.add(new THREE.Mesh(mergeGeometries(geos),mat));geos.forEach(g=>g.dispose());}
    sources.forEach(g=>g.dispose());
  }
  return {stone,coral,kelp,branch,add,material,paint,batch,time};
}
