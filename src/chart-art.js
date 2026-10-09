// Hand-drawn navigation chart. Every marker uses authoritative world coordinates.
export function drawOceanChart(ctx, state, { destinations, sites, nodes, shoals, target, expedition }) {
  const w=660,h=360;ctx.canvas.width=w;ctx.canvas.height=h;
  const places=destinations.filter(d=>!d.requires||state.upgrades[d.requires]);
  const points=[state.position,...places.map(d=>d.position),...sites.map(s=>s.position)];
  const xs=points.map(p=>p.x),zs=points.map(p=>p.z);
  const minX=Math.min(-18,...xs)-12,maxX=Math.max(18,...xs)+12,minZ=Math.min(-18,...zs)-12,maxZ=Math.max(18,...zs)+12;
  const scale=Math.min((w-100)/(maxX-minX),(h-85)/(maxZ-minZ));
  const cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
  const p=v=>({x:w/2+(v.x-cx)*scale,y:h/2+(v.z-cz)*scale});
  const wash=ctx.createLinearGradient(0,0,w,h);wash.addColorStop(0,'#c4dfd0');wash.addColorStop(.5,'#92c7bf');wash.addColorStop(1,'#d9dfbd');ctx.fillStyle=wash;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#f8ebc7';ctx.lineWidth=8;ctx.strokeRect(6,6,w-12,h-12);ctx.strokeStyle='#827c5450';ctx.lineWidth=1;ctx.strokeRect(14,14,w-28,h-28);
  // Engraved waves, softly layered rather than a radar grid.
  for(let i=0;i<75;i++){const x=25+(i*79)%610,y=25+(i*47)%305;ctx.strokeStyle=i%3?'#f3f2ce65':'#538f8430';ctx.beginPath();ctx.moveTo(x-6,y);ctx.quadraticCurveTo(x,y+3,x+6,y);ctx.stroke();}
  for(const shoal of shoals){const q=p(shoal);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(-shoal.angle);ctx.fillStyle='#e1ce9255';ctx.beginPath();ctx.ellipse(0,0,shoal.radiusX*scale,shoal.radiusZ*scale,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#c1b773aa';ctx.setLineDash([2,5]);ctx.stroke();ctx.restore();}
  function island(q,r,seed){
    function contour(radius,color,dy=0){ctx.fillStyle=color;ctx.beginPath();for(let j=0;j<=36;j++){const a=j/36*Math.PI*2,rr=radius*(1+.14*Math.sin(a*3+seed)+.08*Math.cos(a*7));const x=q.x+Math.cos(a)*rr,y=q.y+Math.sin(a)*rr*.55+dy;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();}
    contour(r+9,'#d0efd3aa');contour(r+3,'#f2de9f');contour(r,'#90a870');contour(r*.77,'#6c916a',-3);
    // Painted limestone and palms, with no implication of extra destinations.
    ctx.fillStyle='#d4d9b0';ctx.beginPath();ctx.moveTo(q.x-r*.5,q.y+4);ctx.lineTo(q.x-r*.16,q.y-r*.65);ctx.lineTo(q.x+r*.14,q.y-r*.9);ctx.lineTo(q.x+r*.46,q.y+2);ctx.closePath();ctx.fill();ctx.fillStyle='#97ad89';ctx.beginPath();ctx.moveTo(q.x+r*.14,q.y-r*.9);ctx.lineTo(q.x+r*.09,q.y+4);ctx.lineTo(q.x+r*.46,q.y+2);ctx.fill();
    for(let k=0;k<3;k++){const x=q.x+(k-1)*r*.56,y=q.y+6+(k%2)*7;ctx.strokeStyle='#7d7850';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x-3,y-10,x,y-18);ctx.stroke();ctx.strokeStyle='#416f56';for(let a=0;a<5;a++){ctx.beginPath();ctx.moveTo(x,y-18);ctx.quadraticCurveTo(x+Math.cos(a*1.4)*8,y-23,x+Math.cos(a*1.4)*11,y-14+Math.sin(a*1.4)*5);ctx.stroke();}}
  }
  places.forEach((d,i)=>{const q=p(d.position);if(d.id!=='home')island(q,25+i*3,i);else{ctx.fillStyle='#b58251';ctx.fillRect(q.x-12,q.y-7,24,15);ctx.strokeStyle='#edd6a0';ctx.lineWidth=2;for(let j=-9;j<12;j+=6){ctx.beginPath();ctx.moveTo(q.x+j,q.y-6);ctx.lineTo(q.x+j,q.y+7);ctx.stroke();}ctx.fillStyle='#fff0c3';ctx.beginPath();ctx.moveTo(q.x,q.y-21);ctx.lineTo(q.x+10,q.y-8);ctx.lineTo(q.x,q.y-8);ctx.fill();}ctx.font='bold 13px Georgia';ctx.textAlign='center';ctx.fillStyle='#315e56';ctx.fillText(d.id==='home'?'Home':d.name,q.x,q.y+34);});
  for(const site of sites){const q=p(site.position),done=state.cleanup.completed.includes(site.id);ctx.strokeStyle=done?'#508a62':'#bb693e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(q.x,q.y,6,0,Math.PI*2);ctx.stroke();ctx.fillStyle=done?'#f1e4b7':'#df9661';ctx.beginPath();ctx.arc(q.x,q.y,3,0,Math.PI*2);ctx.fill();}
  if(expedition){ctx.strokeStyle='#a66e3c';ctx.lineWidth=2;ctx.setLineDash([3,5]);ctx.beginPath();expedition.waypoints.forEach((v,i)=>{const q=p(v);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.stroke();ctx.setLineDash([]);}
  const raft=p(state.position);
  if(target){const q=p(target);ctx.strokeStyle='#a86637';ctx.lineWidth=2;ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(raft.x,raft.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(q.x,q.y,11,0,Math.PI*2);ctx.stroke();}
  ctx.save();ctx.translate(raft.x,raft.y);ctx.rotate(-state.heading);ctx.fillStyle='#fff7cf';ctx.strokeStyle='#346f70';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,10);ctx.lineTo(-6,-7);ctx.lineTo(0,-3);ctx.lineTo(6,-7);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  // Small windrose is navigation art, separate from collectible notifications.
  ctx.save();ctx.translate(w-49,49);ctx.strokeStyle='#657e65';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,19,0,Math.PI*2);ctx.stroke();for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.fillStyle=i%2?'#f9e7ae':'#54766b';ctx.beginPath();ctx.moveTo(0,-24);ctx.lineTo(5,0);ctx.lineTo(0,7);ctx.lineTo(-5,0);ctx.fill();}ctx.font='bold 10px Georgia';ctx.textAlign='center';ctx.fillStyle='#44695f';ctx.fillText('N',0,-27);ctx.restore();
  ctx.font='10px sans-serif';ctx.fillStyle='#466a5e';ctx.textAlign='left';ctx.fillText('○ Reef',25,h-25);ctx.textAlign='right';ctx.fillText('Your waters',w-25,h-25);
}
