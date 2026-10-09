/** Small resident fish: bounded home ranges, threat response and timed curiosity. */
export function createReefFish(THREE,anchors,random) {
  const root=new THREE.Group();root.name='Resident_Fish';
  const bodyGeo=new THREE.SphereGeometry(1,12,8),eyeGeo=new THREE.SphereGeometry(1,8,6);
  const eyeMat=new THREE.MeshStandardMaterial({color:0x142c38,roughness:.3});
  const silver=new THREE.MeshStandardMaterial({color:0xf4efce,roughness:.5});
  const colors=[0xf2b756,0x69c9c3,0xb5c8ed],mats=colors.map(color=>new THREE.MeshStandardMaterial({color,roughness:.5,metalness:.06}));
  const finShape=new THREE.Shape();finShape.moveTo(0,0);finShape.lineTo(-.17,.14);finShape.quadraticCurveTo(-.1,0,-.17,-.14);finShape.closePath();
  const finGeo=new THREE.ExtrudeGeometry(finShape,{depth:.016,bevelEnabled:false});
  const fish=[];
  function mesh(parent,geo,mat,pos,scale){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.scale.set(...scale);parent.add(m);return m;}
  anchors.forEach((anchor,index)=>{
    const calm=index%3===0;
    for(let j=0;j<(calm?3:4);j++){
      const group=new THREE.Group();root.add(group);
      const size=calm?.65:.85;
      mesh(group,bodyGeo,mats[index%3],[0,0,0],[.24,.11,.075]);
      mesh(group,bodyGeo,silver,[0,-.037,.018],[.18,.054,.062]);
      const tail=mesh(group,finGeo,mats[index%3],[-.2,0,0],[1,1,1]);
      const fin=mesh(group,finGeo,mats[index%3],[.02,.075,-.01],[.7,.55,1]);fin.rotation.z=-.7;
      for(const side of [-1,1]){
        mesh(group,eyeGeo,silver,[.15,.037,side*.059],[.034,.036,.018]);
        mesh(group,eyeGeo,eyeMat,[.157,.039,side*.074],[.016,.02,.009]);
      }
      const stripe=mesh(group,bodyGeo,mats[(index+1)%3],[-.065,.015,.067],[.027,.088,.011]);stripe.rotation.z=-.2;
      group.scale.setScalar(size);
      const phase=random()*Math.PI*2,home={x:anchor.x+(j-1)*.35,y:Math.min(-.9,anchor.y+.6+j*.16),z:anchor.z??-2};
      group.position.set(home.x,home.y,home.z);group.userData.behavior='home';group.userData.species=calm?'calm':'skittish';
      fish.push({group,tail,home,phase,calm,state:'home',timer:0,cooldown:0,vx:.1,vy:0});
    }
  });
  function update(time,dt,player,reduced=false,reset=false){
    dt=Math.min(.1,Math.max(0,dt));
    for(const f of fish){
      const p=f.group.position;
      if(reset){p.set(f.home.x,f.home.y,f.home.z);f.state='home';f.timer=0;f.cooldown=0;f.vx=.1;f.vy=0;}
      if(reduced){f.tail.rotation.y=0;continue;}
      const dx=player?p.x-player.x:100,dy=player?p.y-player.y:100,d=Math.hypot(dx,dy);
      f.cooldown=Math.max(0,f.cooldown-dt);f.timer+=dt;
      let tx=f.home.x+Math.cos(time*.36+f.phase)*1.0,ty=f.home.y+Math.sin(time*.53+f.phase)*.32,speed=.65;
      if(!f.calm&&d<2.3){f.state='flee';f.timer=0;}
      if(f.calm&&f.state==='home'&&d<2.7&&f.cooldown===0){f.state='follow';f.timer=0;}
      if(f.state==='flee'){
        speed=2.8;tx=p.x+(dx||Math.cos(f.phase))/Math.max(.15,d)*3;ty=p.y+dy/Math.max(.15,d)*2;
        if(d>3.3){f.state='curious';f.timer=0;}
      }else if(f.state==='curious'){
        if(player){const a=Math.atan2(dy,dx)+Math.sin(time*.7+f.phase)*.12;tx=player.x+Math.cos(a)*3.5;ty=player.y+Math.sin(a)*3.5;}
        if(f.timer>4||Math.hypot(p.x-f.home.x,p.y-f.home.y)>5){f.state='return';f.timer=0;}
      }else if(f.state==='follow'){
        if(player){tx=player.x-1.0+Math.cos(f.phase)*.4;ty=player.y-.3+Math.sin(time+f.phase)*.25;speed=1.6;}
        if(f.timer>3.2||Math.hypot(p.x-f.home.x,p.y-f.home.y)>4.5){f.state='return';f.cooldown=9;f.timer=0;}
      }else if(f.state==='return'){
        tx=f.home.x;ty=f.home.y;speed=1.2;
        if(Math.hypot(tx-p.x,ty-p.y)<.4){f.state='home';f.timer=0;}
      }
      // All species retain a local habitat, including during repeated scares.
      tx=Math.max(f.home.x-5,Math.min(f.home.x+5,tx));ty=Math.min(-.7,Math.max(f.home.y-3,Math.min(f.home.y+3,ty)));
      const length=Math.hypot(tx-p.x,ty-p.y),gain=1-Math.exp(-dt*4);
      f.vx+=((tx-p.x)/Math.max(1,length)*speed-f.vx)*gain;f.vy+=((ty-p.y)/Math.max(1,length)*speed-f.vy)*gain;
      p.x+=f.vx*dt;p.y+=f.vy*dt;p.z=f.home.z+Math.sin(time*.5+f.phase)*.16;
      const facing=f.vx<0?-1:1;f.group.rotation.y=facing<0?Math.PI:0;f.group.rotation.z=Math.atan2(f.vy,Math.abs(f.vx)+.1)*facing*.4;
      f.tail.rotation.y=Math.sin(time*(f.state==='flee'?18:9)+f.phase)*.5;
      f.group.userData.behavior=f.state;
    }
  }
  function getStats(){const states={home:0,flee:0,curious:0,follow:0,return:0};for(const f of fish)states[f.state]++;return states;}
  return {root,update,getStats};
}
