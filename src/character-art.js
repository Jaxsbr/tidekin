/** Original articulated explorer. Local +Y is crown, +Z is face; pivot at waist.
 * animate accepts presentation values only, never changes gameplay coordinates. */
export function createCharacterArt(THREE) {
  const root=new THREE.Group();root.name='Tidekin_Character';
  const body=new THREE.Group();root.add(body);
  const material=(color,roughness=.7)=>new THREE.MeshStandardMaterial({color,roughness});
  const skin=material(0xdca276),cheek=material(0xc98564),hair=material(0x493027),highlight=material(0x755039),shirt=material(0xf3e3bb),trim=material(0xd4bf91),shorts=material(0x326d68),cuff=material(0x50867b),leather=material(0x765037),gold=material(0xd7ae58,.35),ink=material(0x203b40),white=material(0xfff7dd),scarf=material(0xd36c3e);
  const sphere=new THREE.SphereGeometry(1,20,14);
  function oval(parent,mat,p,s){const m=new THREE.Mesh(sphere,mat);m.position.set(...p);m.scale.set(...s);parent.add(m);return m;}
  function group(parent,p){const g=new THREE.Group();g.position.set(...p);parent.add(g);return g;}
  function tube(parent,points,r,mat){const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),16,r,7,false),mat);parent.add(m);return m;}
  // Tapered cloth silhouette, overlapping collar and tailored shorts.
  oval(body,shirt,[0,.27,0],[.29,.4,.19]);oval(body,trim,[0,-.015,0],[.275,.095,.19]);
  oval(body,shorts,[0,-.12,0],[.28,.19,.18]);
  oval(body,leather,[0,-.015,.01],[.28,.043,.19]);oval(body,gold,[0,-.012,.202],[.065,.05,.021]);
  for(const side of [-1,1]){const collar=oval(body,white,[side*.095,.58,.14],[.11,.065,.065]);collar.rotation.z=side*.4;}
  tube(body,[[0,.51,.19],[.025,.25,.196],[0,.04,.18]],.012,trim);
  for(const y of [.39,.25,.11])oval(body,gold,[.02,y,.2],[.018,.018,.012]);
  oval(body,skin,[0,.64,0],[.105,.13,.105]);
  const head=group(body,[0,.85,0]);
  oval(head,skin,[0,.03,0],[.275,.32,.255]);oval(head,skin,[0,-.105,.12],[.20,.17,.17]);
  for(const side of [-1,1]){oval(head,skin,[side*.263,.015,-.005],[.072,.105,.065]);oval(head,cheek,[side*.286,.018,.028],[.022,.055,.027]);oval(head,cheek,[side*.16,-.075,.218],[.055,.035,.016]);}
  oval(head,skin,[0,-.016,.255],[.064,.079,.075]);
  tube(head,[[-.083,-.14,.277],[0,-.166,.284],[.075,-.14,.277]],.013,leather);
  // Eyes remain visible through open bronze rims; side profile has real nose/jaw.
  for(const side of [-1,1]){
    oval(head,white,[side*.113,.068,.225],[.091,.079,.035]);oval(head,ink,[side*.113,.065,.258],[.033,.044,.014]);oval(head,white,[side*.103,.083,.272],[.011,.014,.008]);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.105,.022,8,24),gold);rim.position.set(side*.12,.07,.252);rim.scale.y=.83;head.add(rim);
    tube(head,[[side*.22,.07,.24],[side*.27,.065,.09],[side*.26,.06,-.12]],.027,leather);
    tube(head,[[side*.04,.177,.225],[side*.12,.193,.23],[side*.19,.17,.21]],.023,hair);
  }
  oval(head,gold,[0,.073,.265],[.03,.018,.019]);
  // Swept locks follow crown and temple rather than a row of identical balls.
  oval(head,hair,[0,.19,-.07],[.289,.218,.24]);
  for(let i=0;i<9;i++){const a=i*2.399;const lock=oval(head,i%3?hair:highlight,[Math.cos(a)*.2,.24+Math.sin(a)*.06,Math.sin(a)*.15],[.105,.19,.075]);lock.rotation.set(.25,0,-.65+Math.sin(a)*.45);}
  for(const side of [-1,1]){const lock=oval(head,hair,[side*.237,.035,-.06],[.07,.18,.13]);lock.rotation.z=side*.18;}
  oval(body,scarf,[0,.57,0],[.17,.065,.15]);
  const tail=group(body,[0,.53,-.12]);oval(tail,scarf,[.02,-.18,-.04],[.08,.22,.03]);
  const arms=[],legs=[];
  for(const side of [-1,1]){
    const shoulder=group(body,[side*.27,.44,0]);oval(shoulder,shirt,[side*.015,-.07,0],[.125,.17,.13]);oval(shoulder,trim,[0,-.18,0],[.113,.048,.115]);
    oval(shoulder,skin,[0,-.245,0],[.079,.14,.08]);const elbow=group(shoulder,[0,-.36,0]);oval(elbow,skin,[0,-.13,0],[.067,.18,.07]);
    const hand=group(elbow,[0,-.30,.01]);oval(hand,skin,[0,-.05,0],[.079,.105,.039]);
    for(let f=0;f<4;f++)oval(hand,skin,[(f-1.5)*.033,-.13+Math.abs(f-1.5)*.012,.005],[.017,.063,.018]);
    const thumb=oval(hand,skin,[side*.077,-.058,.017],[.032,.06,.027]);thumb.rotation.z=side*.5;
    arms.push({shoulder,elbow,hand,side});
    const hip=group(body,[side*.145,-.19,0]);oval(hip,shorts,[0,-.10,0],[.135,.20,.145]);oval(hip,cuff,[0,-.25,0],[.14,.055,.148]);oval(hip,skin,[0,-.32,0],[.085,.11,.083]);
    const knee=group(hip,[0,-.40,0]);oval(knee,skin,[0,-.13,0],[.073,.19,.075]);oval(knee,leather,[0,-.32,.04],[.098,.10,.16]);oval(knee,trim,[0,-.365,.045],[.10,.027,.17]);legs.push({hip,knee,side});
  }
  let lean=0,yaw=0,phase=0;
  function animate({dt=0,time=0,moving=false,surface=false,facing=1,vertical=0,working=false,progress=0,reducedMotion=false,reset=false}={}){
    const blend=reset||reducedMotion?1:1-Math.exp(-dt*(moving?7:2.6));
    const wanted=moving||working?-facing*(Math.PI/2-Math.max(-.65,Math.min(.65,vertical))):0;
    lean+=(wanted-lean)*blend;
    const wantedYaw=facing*(moving||working?1.18:.48);yaw+=(wantedYaw-yaw)*blend;
    root.rotation.z=lean;body.rotation.y=yaw;
    if(!reducedMotion)phase+=dt*(moving?surface?6.3:5.2:2.1);
    head.rotation.x=moving?-.20:Math.sin(phase*.5)*.025;head.rotation.y=moving?-.16*facing:0;
    tail.rotation.x=reducedMotion?0:Math.sin(phase*.6)*.18;
    arms.forEach(({shoulder,elbow,hand,side},i)=>{
      const p=phase+i*Math.PI;
      shoulder.rotation.set(moving?(surface?Math.sin(p)*1.8:Math.sin(p)*.8-.9):-.18,0,moving?side*.15:side*(.38+Math.sin(p)*.12));
      elbow.rotation.x=moving?-.55-Math.max(0,Math.cos(p))*.85:-.5-Math.sin(p)*.16;
      hand.rotation.x=.12+Math.sin(p)*.15;
      if(working){shoulder.rotation.x=-2.1+progress*.45;elbow.rotation.x=-.35-progress*.7;}
    });
    legs.forEach(({hip,knee},i)=>{const kick=Math.sin(phase*1.4+i*Math.PI);hip.rotation.x=moving?kick*.36:.16+kick*.14;knee.rotation.x=moving?.18+Math.max(0,-kick)*.5:.4+kick*.22;});
  }
  animate({reset:true});
  return {root,body,head,arms,legs,animate};
}
