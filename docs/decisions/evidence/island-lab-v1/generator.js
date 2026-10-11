// Disposable spatial grammar. Pure data: same version + biome + seed + rules => same layout.
export const VERSION='island-lab-v1';
export const BIOMES={
 A:{name:'Arch lagoon',summary:'A navigable stone gateway opens into a sheltered lagoon.',rules:['One arch frames the water entrance.','A broken crescent encloses an open lagoon.','Low outer skerries lead up to the gateway.','A sheltered inner beach offers a landing.'],finding:'Storm timber on the inner beach',defaults:{height:54,skerries:14,width:26}},
 B:{name:'Waterfall inlet',summary:'Low skerries and curved shores lead between tall cliffs to a waterfall.',rules:['Low outer rocks → small islands → tall inland cliffs.','An asymmetric, bending channel stays open.','Sandy coves sit at the foot of the cliffs.','A waterfall feeds a stream beside the inner landing.'],finding:'Tangled debris at the freshwater outlet',defaults:{height:64,skerries:16,width:26}},
 C:{name:'Mangrove crescent',summary:'A low rooted shoreline wraps around shallow channels beneath a distant rock spine.',rules:['Low mangrove islands dominate the near water.','Root fringes follow shallow sandy edges.','A crescent rock spine rises behind the wetland.','A firm sand shelf offers a landing outside the roots.'],finding:'Stranded fishing net beside the roots',defaults:{height:38,skerries:20,width:24}}
};
function randomFrom(seed){let h=2166136261;for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619);return()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function fingerprint(value){let h=2166136261;for(const c of JSON.stringify(value))h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0).toString(16).padStart(8,'0');}
export function generate(biome,seed,rules){let rand=randomFrom(`${VERSION}:${biome}:${seed}`);const range=(a,b)=>a+(b-a)*rand();const objects=[];const bend=range(5,12)*(rand()>.5?1:-1);const channel=z=>Math.sin(Math.max(0,Math.min(1,(160-z)/200))*Math.PI*1.6)*bend;
const route=Array.from({length:29},(_,i)=>{const z=220-i*9.5;return{x:channel(z),z}});
function add(role,x,z,rx,rz,height,extra={}){objects.push({id:`${role}-${objects.length}`,role,x,z,rx,rz,height,shape:range(0,100),rotation:range(0,Math.PI*2),...extra});}
// Every foreground island stays outside the route's boat clearance envelope.
for(let i=0;i<rules.skerries;i++){const z=i%3===0?range(25,110):range(90,205),side=i%2?1:-1;const foreground=(z-25)/180;const rx=range(2.1,5.7)*(1.4-foreground*.5),rz=rx*range(.7,1.55);const x=channel(z)+side*(rules.width/2+rx+range(3,23));const mangrove=biome==='C'&&i%3!==0;add(mangrove?'mangrove':i%4===0?'islet':'skerry',x,z,rx,rz,range(1.2,5.7)*(1.7-foreground),{trees:mangrove?3:i%4===0?1:0});}
rand=randomFrom(`${VERSION}:${biome}:${seed}:structure`);
if(biome==='B'){
 for(const side of [-1,1])for(let i=0;i<6;i++){const z=95-i*25+range(-10,10)+(side===1?8:-4),rx=range(10,16),height=rules.height*(.36+i*.12)*range(.85,1.1);add('cliff',channel(z)+side*(rules.width/2+rx+range(7,15)),z,rx,range(12,19),height,{trees:3});
 // A smaller shelf below each peak makes the waterline read at human scale.
 add('shelf',channel(z)+side*(rules.width/2+range(7,11)),z+range(3,12),range(6,9),range(8,13),range(2,6),{trees:1});}
 add('headwall',0,-80,43,17,rules.height*.9,{trees:7});
 add('beach',-13,-46,19,25,1.2,{trees:4});add('beach',26,7,13,19,.9,{trees:2});
} else if(biome==='A'){
 for(let i=0;i<11;i++){const a=-.10+i*(Math.PI+.20)/10;const x=Math.cos(a)*59,z=-13-Math.sin(a)*51;add('cliff',x,z,range(11,17),range(10,17),rules.height*range(.4,1),{trees:3});}
 const span=rules.width/2+11;for(const side of [-1,1])add('gate',side*span,55,11,12,rules.height*.6,{trees:2});
 add('arch',0,55,span,5,rules.height*.6,{span});add('beach',-29,-25,22,18,1.1,{trees:4});
} else {
 for(let i=0;i<12;i++){const a=-.1+i*(Math.PI+.2)/11;add('mangrove',Math.cos(a)*55,-8-Math.sin(a)*40,range(8,13),range(7,13),range(.8,2),{trees:4});}
 for(let i=0;i<6;i++)add('cliff',-47+i*18,-66+range(-9,9),range(10,15),range(10,15),rules.height*range(.6,1),{trees:3});
 add('beach',-19,-22,16,15,.9,{trees:2});
}
const landing=biome==='B'?{x:-14,z:-30}:biome==='A'?{x:-25,z:-12}:{x:-16,z:-13};
const result={version:VERSION,biome,seed,rules:{...rules},objects,route,landing,waterfall:biome==='B'?{x:7,z:-61,height:rules.height*.75}:null,finding:BIOMES[biome].finding};return{...result,fingerprint:fingerprint(result)};
}
