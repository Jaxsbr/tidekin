/** Stable world recipe shared by simulation and art. No random global state.
 * terrain is a decorative, collision-free seabed polyline in side-view x/y.
 */
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const DIVE_TROPHIES=freeze([
 {id:'nautilus-shell',name:'Nautilus Shell',description:'Home Reef’s quiet gift. A tiny spiral holds the sound of the whole sea.',hint:'Restore all three finds in Home Reef.',siteId:'home-reef',art:'nautilus-shell'},
 {id:'glass-float',name:'Glass Fishing Float',description:'Freed from the cove’s old nets. Knots worn smooth tell of years in a fisher’s hands.',hint:'Restore Sheltered Cove to uncover this old float.',siteId:'sheltered-cove',art:'glass-float'},
 {id:'brass-compass',name:'Brass Compass',description:'Found beside the home pearl bed. Salt has dimmed the brass; the needle still points north.',hint:'Explore the deep pearl bed in Home Waters.',siteId:'salvage:home-pearls',art:'brass-compass'},
 {id:'coral-fossil',name:'Coral Fossil',description:'A stone flower from Prism Reef. Its delicate branches remember an older ocean.',hint:'Search the pearl shelf at Prism Reef.',siteId:'salvage:reef-pearls',art:'coral-fossil'},
 {id:'captains-bell',name:'Captain’s Bell',description:'Recovered from the distant wreck. One soft note brings its forgotten deck to life.',hint:'Search the deep wreck at Beacon Shoal.',siteId:'salvage:horizon-wreck',art:'captains-bell'},
 {id:'pearl-crown',name:'Pearl Crown',description:'A small crown from the Pearl Trail. Turn it toward the light and a new colour wakes.',hint:'Complete the Pearl Trail survey in one breath.',siteId:'survey:pearl-trail',art:'pearl-crown'},
]);
/** Contextual entry may revisit a paid site only while its relic is missing. */
export function hasMissingDiveTrophy(state,siteId){
 const trophy=DIVE_TROPHIES.find(t=>t.siteId===siteId);
 return Boolean(trophy&&!state.trophies.includes(trophy.id));
}
export function diveSeed(id){let h=2166136261;for(const c of id){h=Math.imul(h^c.charCodeAt(0),16777619);}return h>>>0;}
function random(seed){return()=>{seed=(seed+0x6D2B79F5)>>>0;let n=Math.imul(seed^(seed>>>15),1|seed);n^=n+Math.imul(n^(n>>>7),61|n);return((n^(n>>>14))>>>0)/4294967296;};}
const BIOMES=['coral-garden','kelp-forest','sand-gullies','basalt-arches','shell-shelves','wreck-garden'];
/** Single pickups require a 10–15m descent and lateral swim. Every individual
 * round trip from (0,0), including .8s work, takes <19 seconds at speed 2.2.
 * Multi-object restorations allow breathing between objectives; survey geometry
 * keeps its complete one-breath circuit below 20 seconds including four actions.
 */
export function generateDiveWorld(site){
 const seed=diveSeed(site.id),rng=random(seed);
 const biome=site.id==='home-reef'?'coral-garden':site.id==='sheltered-cove'?'kelp-forest':site.id.includes('horizon')?'wreck-garden':site.id.includes('mangrove')?'kelp-forest':BIOMES[(seed>>>16)%BIOMES.length];
 const terrain=Array.from({length:15},(_,i)=>({x:-28+i*4,y:-16-rng()*2}));
 const trash=site.trash.map((t,i)=>{
  if(site.kind==='survey')return {...t,x:(i-1.5)*2+(rng()-.5)*.5,y:-[6,9,12,14][i]};
  const side=rng()<.5?-1:1;
  return {...t,x:side*(3+rng()*7),y:-(10+rng()*5)};
 });
 return freeze({...site,seed,biome,terrain,trash,trophy:DIVE_TROPHIES.find(t=>t.siteId===site.id)??null});
}
