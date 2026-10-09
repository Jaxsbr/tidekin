/** Biome-scale landmarks with actual volume, open silhouettes and attached growth. */
export function sculptWreck(THREE,s,x,y,z) {
  const wood=s.material(0x82785f),dark=s.material(0x545d55);
  const length=5.6;
  const hull=(u,v,side)=>[x+u,y+.15+v*1.8+Math.pow(Math.abs(u)/length,4)*1.7,z+side*Math.sqrt(Math.max(.01,1-u*u/(length*length)))*Math.sin(v*Math.PI*.48)*1.55];
  // Curved ribs trace both sides of a ship's U section and remain visible through damage.
  for(let i=0;i<13;i++){
    const u=-5.1+i*.85,points=[];
    for(let k=0;k<=12;k++){const q=-1+k/6;points.push(hull(u,Math.abs(q),Math.sign(q)));}
    s.branch(points,.075,0x695f4c);
  }
  for(const side of [-1,1])for(let row=0;row<6;row++){
    const v=.10+row*.155;
    for(let section=0;section<12;section++){
      // Torn starboard flank exposes the keel and internal ribwork.
      if(side===1&&section>4&&section<8&&row>2)continue;
      const a=-length+section*(length*2/12),b=a+length*2/12-.035;
      const points=[hull(a,v,side),hull(b,v,side),hull(b,v+.12,side),hull(a,v+.12,side)];
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([...points[0],...points[1],...points[2],...points[0],...points[2],...points[3]],3));geo.computeVertexNormals();
      wood.side=THREE.DoubleSide;s.add(geo,wood);
    }
  }
  s.branch([hull(-length,0,1),[x,y+.1,z],hull(length,0,1)],.13,0x545d55);
  // Snapped leaning mast, deck remnants, encrusted bow and trailing rigging.
  s.branch([[x-1,y+.3,z],[x-1.45,y+2.5,z],[x-2.4,y+4.3,z-.2]],.15,0x82785f);
  for(let k=0;k<5;k++){
    const plank=s.add(new THREE.BoxGeometry(1.5,.10,.28),wood,[x-3+k*.7,y+.7,z]);plank.rotation.z=(k-2)*.1;plank.rotation.y=.3;
  }
  s.branch([[x-2.4,y+4.3,z-.2],[x-.8,y+1.9,z+.5],[x+2.9,y+2.0,z+.8]],.017,0xb2ab87);
  for(let i=0;i<6;i++){
    const u=-4.8+i*1.9,p=hull(u,.9,i%2?1:-1);
    s.coral(p,.4+i%2*.2,[0xbe8e9e,0x87b5a1,0xc5aa7c][i%3],i%3===0?3:0);
  }
  const ring=s.add(new THREE.TorusGeometry(.29,.045,7,20),dark,[x+3.8,y+1.9,z+1.2]);ring.rotation.y=.35;
}

export function sculptArch(THREE,s,x,y,z,color) {
  // Swept eroded stone vault, with smooth continuous normals and thick sides.
  const path=new THREE.CatmullRomCurve3(Array.from({length:19},(_,i)=>{
    const a=i/18*Math.PI;return new THREE.Vector3(x+Math.cos(a)*2.65,y+Math.sin(a)*3.5,z);
  }));
  const geo=new THREE.TubeGeometry(path,64,.7,14,false),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
    const px=p.getX(i),py=p.getY(i),pz=p.getZ(i);
    p.setXYZ(i,px+Math.sin(py*3.7+pz)*.07,py+Math.sin(px*4.5+pz*2)*.045,z+(pz-z)*1.55);
  }
  geo.computeVertexNormals();s.add(geo,s.material(color));
  for(const side of [-1,1])s.stone([x+side*2.6,y-.3,z],[1.15,.6,1.3],color);
  for(let i=0;i<7;i++){
    const a=.12+i/6*(Math.PI-.24),px=x+Math.cos(a)*2.65,py=y+Math.sin(a)*3.5;
    s.coral([px,py+.5,z+.3],.45,[0xc093ae,0x78b8b7,0xaaa2c6][i%3],i%2?3:0);
  }
}
