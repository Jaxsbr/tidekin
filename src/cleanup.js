/** Deterministic side-view restoration and legacy salvage adapters. */
import { generateDiveWorld, hasMissingDiveTrophy } from './dive-world.js';
import { SALVAGE_NODES, ISLANDS, EXPEDITIONS } from './game.js';
export const CLEANUP_AIR = 24;
export const CLEANUP_SWIM_SPEED = 2.2;
export const CLEANUP_ACTION_SECONDS = .8;
export const CLEANUP_SURFACE = -.35;
export const CLEANUP_REFILL = 10;
export const CLEANUP_COLLECT_RANGE = 1.25;
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const bounds = { minX: -28, maxX: 28, minY: -18, maxY: 0 };
export const CLEANUP_SITES = freeze([
  { id: 'home-reef', name: 'Home Reef', position: {x:0,z:8}, x:0,z:8, entryRange:12, bounds,
    reward:{wood:1,scrap:1,pearls:0}, trash:[
      {id:'reef-bottle',name:'Snagged bottle',x:-5,y:-3},
      {id:'reef-can',name:'Lodged can',x:-11,y:-7},
      {id:'reef-bag',name:'Snared bag',x:9,y:-10}] },
  { id:'sheltered-cove',name:'Sheltered Cove',position:{x:-12,z:8},x:-12,z:8,entryRange:10,bounds,
    reward:{wood:1,scrap:1,pearls:0},trash:[
      {id:'reef-rope',name:'Discarded rope',x:6,y:-4},
      {id:'reef-tin',name:'Lodged tin',x:13,y:-8},
      {id:'reef-net',name:'Snared net',x:-10,y:-11}] }
].map(generateDiveWorld));
export function freshCleanup() { return {revision:3,completed:[],attempt:null}; }
function freshAttempt(site, complete=false) {
  return {siteId:site.id,status:complete?'complete':'active',x:0,y:0,air:CLEANUP_AIR,
    collected:complete?site.trash.map(t=>t.id):[],selectedId:null,actionProgress:0,
    facing:{x:1,y:0}};
}
export function getCleanupSite(state, id=state.cleanup.attempt?.siteId) {
  const fixed=CLEANUP_SITES.find(s=>s.id===id); if(fixed)return fixed;
  if(id==='survey:pearl-trail') {
    const route=EXPEDITIONS.find(r=>r.id==='pearl-trail'), p=route.waypoints[0];
    return generateDiveWorld({id,name:'Pearl trail survey',kind:'survey',x:p.x,z:p.z,position:{...p},entryRange:3,bounds,
      trash:route.waypoints.map((p,i)=>({id:`survey-${i}`,name:`Survey marker ${i+1}`,x:[-3,0,3,5][i],y:[-2,-4,-6,-7][i]}))});
  }
  const node=SALVAGE_NODES.find(n=>`salvage:${n.id}`===id);
  if(!node)return null;
  return generateDiveWorld({id,name:node.name,kind:'salvage',nodeId:node.id,x:node.x,z:node.z,position:{...node.position},
    entryRange:4.5,bounds,trash:[{id:node.id,name:node.name,x:0,y:-4}],reward:{[node.type]:node.amount}});
}
const unlocked=(state,node)=>node.region==='home'||state.upgrades[ISLANDS.find(i=>i.id===node.region)?.requires];
export function getDiveSite(state) {
  if(state.cleanup.attempt||state.diving||state.recovery>0)return null;
  const active=state.expeditions.active;
  const survey=getCleanupSite(state,'survey:pearl-trail');
  if(active?.id==='pearl-trail'&&!active.ready&&Math.hypot(state.position.x-survey.x,state.position.z-survey.z)<=survey.entryRange)return survey;
  const node=SALVAGE_NODES.filter(n=>(!state.collected.includes(n.id)||hasMissingDiveTrophy(state,`salvage:${n.id}`))&&unlocked(state,n)&&n.access!=='shore')
    .map(n=>({n,d:Math.hypot(state.position.x-n.x,state.position.z-n.z)})).filter(o=>o.d<=4.5).sort((a,b)=>a.d-b.d)[0]?.n;
  return node?getCleanupSite(state,`salvage:${node.id}`):null;
}
function attemptAlreadyComplete(state,site) {
  // A legacy restored site may be revisited to earn its new relic, but its
  // permanent completion record still prevents a second resource payout.
  return isComplete(state,site)&&(!site.trophy||state.trophies.includes(site.trophy.id));
}
function isComplete(state,site) {
  return site.kind==='salvage'?state.collected.includes(site.nodeId):site.kind==='survey'?state.expeditions.active?.ready===true:state.cleanup.completed.includes(site.id);
}
export function getCleanupContext(state) {
  const a=state.cleanup.attempt;
  const site=a?getCleanupSite(state):[...CLEANUP_SITES].sort((a,b)=>Math.hypot(state.position.x-a.x,state.position.z-a.z)-Math.hypot(state.position.x-b.x,state.position.z-b.z))[0];
  const remaining=a?.status==='active'?site.trash.filter(t=>!a.collected.includes(t.id)).map(t=>({...t,distance:Math.hypot(t.x-a.x,t.y-a.y)})):[];
  const nearestTarget=remaining.sort((a,b)=>a.distance-b.distance)[0]??null;
  const target=remaining.find(t=>t.id===a?.selectedId)??nearestTarget;
  const completed=isComplete(state,site);
  const canEnter=!a&&!state.diving&&state.recovery<=0&&Math.hypot(state.position.x-site.x,state.position.z-site.z)<=site.entryRange;
  return {status:a?.status??null,ready:canEnter,canEnter,site,target,nearestTarget,
    canCollect:Boolean(target&&target.distance<=CLEANUP_COLLECT_RANGE),count:a?a.collected.length:completed?site.trash.length:0,
    total:site.trash.length,atSurface:Boolean(a&&a.y>=CLEANUP_SURFACE),canLeave:Boolean(a&&(a.y>=CLEANUP_SURFACE||a.status==='failed')),objectiveComplete:Boolean(a&&a.collected.length===site.trash.length),completed,actionProgress:a?.actionProgress??0};
}
const response=(ok,code,message,details={})=>({ok,code,message,...details});
function resetAction(a) {a.selectedId=null;a.actionProgress=0;}
export function cleanupAction(state,action,payload={}) {
  if(!['enter-cleanup','leave-cleanup','retry-cleanup','collect-trash'].includes(action))return response(false,'unknown_action','Choose a known cleanup action.');
  if(!payload||typeof payload!=='object'||Array.isArray(payload))return response(false,'invalid_payload','Provide an action payload object.');
  const a=state.cleanup.attempt;
  if(action==='enter-cleanup') {
    const site=getCleanupSite(state,payload.siteId);
    if(!site)return response(false,'unknown_cleanup_site','Choose a known cleanup site.');
    if(a)return response(false,'cleanup_active','Return to the raft first.');
    if(state.diving)return response(false,'surface_required','Return to the raft first.');
    if(state.recovery>0)return response(false,'recovery_required','Recover before diving again.');
    if(site.kind==='salvage'&&!unlocked(state,SALVAGE_NODES.find(n=>n.id===site.nodeId)))return response(false,'locked_region','Build the required upgrade first.');
    if(site.kind==='survey'&&(state.expeditions.active?.id!=='pearl-trail'||state.expeditions.active.ready))return response(false,'no_expedition','Start the Pearl trail first.');
    if(Math.hypot(state.position.x-site.x,state.position.z-site.z)>site.entryRange)return response(false,'too_far','Sail closer to this dive site.');
    state.cleanup.attempt=freshAttempt(site,attemptAlreadyComplete(state,site));
    if(site.kind)state.stats.dives++;
    return response(true,'cleanup_entered',site.kind==='survey'?'Survey all markers in one breath.':'Surface to breathe. Hold an action within reach.');
  }
  if(!a)return response(false,'no_cleanup','Enter a cleanup site first.');
  const site=getCleanupSite(state);
  if(action==='leave-cleanup'){if(a.y<CLEANUP_SURFACE&&a.status!=='failed')return response(false,'surface_required','Swim to the surface before returning to the raft.');state.cleanup.attempt=null;return response(true,'cleanup_left','Back aboard the raft.');}
  if(action==='retry-cleanup') {
    if(a.status!=='failed')return response(false,'cleanup_not_failed','Only failed attempts need a restart.');
    state.cleanup.attempt=freshAttempt(site,attemptAlreadyComplete(state,site));return response(true,'cleanup_restarted','Fresh breath, fresh attempt.');
  }
  if(a.status!=='active')return response(false,'cleanup_inactive','This attempt has ended.');
  const target=payload.trashId===undefined?getCleanupContext(state).target:site.trash.find(t=>t.id===payload.trashId);
  if(!target)return response(false,'unknown_trash','Choose a known target.');
  if(a.collected.includes(target.id))return response(false,'already_collected','Already collected.');
  if(Math.hypot(target.x-a.x,target.y-a.y)>CLEANUP_COLLECT_RANGE)return response(false,'too_far','Swim closer.');
  a.selectedId=target.id;a.actionProgress=0;
  return response(true,'action_required','Hold the action to finish.',{trashId:target.id});
}
function finishTarget(state,site,target) {
  const a=state.cleanup.attempt;a.collected.push(target.id);a.actionProgress=1;
  let code='trash_collected', message=`${target.name} recovered.`;
  if(a.collected.length===site.trash.length) {
    a.status='complete';code='cleanup_complete';message='Objective complete. Swim to the surface.';
    if(site.trophy&&!state.trophies.includes(site.trophy.id))state.trophies.push(site.trophy.id);
    if(!isComplete(state,site)) {
      if(site.kind==='survey') {
        const active=state.expeditions.active;active.index=EXPEDITIONS[1].waypoints.length;active.ready=true;
        message='Pearl trail surveyed. Return home to claim.';
      } else {
        if(site.kind==='salvage') {
          const n=SALVAGE_NODES.find(n=>n.id===site.nodeId);state.collected.push(n.id);state.stats.gathered[n.type]+=n.amount;
          if(!state.discoveries.includes(n.region))state.discoveries.push(n.region);
        } else state.cleanup.completed.push(site.id);
        for(const [key,amount] of Object.entries(site.reward))state.inventory[key]+=amount;
        message+=` Recovered ${Object.entries(site.reward).filter(([,n])=>n).map(([k,n])=>`${n} ${k}`).join(', ')}.`;
      }
    }
  }
  state.lastEvent={code,message,at:state.time,trashId:target.id,siteId:site.id};
}
export function steerCleanup(state,dt,input={}) {
  if(!Number.isFinite(dt)||dt<0||dt>.05)throw new RangeError('Steering dt must be 0..0.05 seconds');
  if(dt===0)return;
  if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Steering input must be an object');
  const a=state.cleanup.attempt;if(!a||a.status==='failed')return;
  const x=Number.isFinite(input.x)?input.x:0,z=Number.isFinite(input.z)?input.z:0;
  const norm=Math.hypot(x,z),site=getCleanupSite(state);
  if(norm>0){
    const speed=CLEANUP_SWIM_SPEED;
    const step=speed*dt/Math.max(1,norm);
    a.x=Math.max(site.bounds.minX,Math.min(site.bounds.maxX,a.x+x*step));
    a.y=Math.max(site.bounds.minY,Math.min(site.bounds.maxY,a.y-z*step));a.facing={x:x/norm,y:-z/norm};
  }
  if(a.status!=='active')return;
  if(a.y<CLEANUP_SURFACE && a.air<=dt){resetAction(a);return;}
  const target=input.targetId===undefined?getCleanupContext(state).target:site.trash.find(t=>t.id===input.targetId);
  if(!input.interact||!target||a.collected.includes(target.id)||Math.hypot(target.x-a.x,target.y-a.y)>CLEANUP_COLLECT_RANGE){resetAction(a);return;}
  if(a.selectedId!==target.id){a.selectedId=target.id;a.actionProgress=0;}
  a.actionProgress=Math.min(1,a.actionProgress+dt/CLEANUP_ACTION_SECONDS);
  if(a.actionProgress>=1-1e-9)finishTarget(state,site,target);
}
export function updateCleanup(state,dt) {
  if(!Number.isFinite(dt)||dt<0||dt>604800)throw new RangeError('Update dt must be 0..604800 seconds');
  if(dt===0)return;
  const a=state.cleanup.attempt;if(!a||a.status==='failed')return;
  const survey=getCleanupSite(state).kind==='survey';
  if(survey&&a.status==='active'&&a.y>=CLEANUP_SURFACE&&(a.collected.length||a.selectedId)){a.collected=[];resetAction(a);}
  a.air=a.y>=CLEANUP_SURFACE?Math.min(CLEANUP_AIR,a.air+dt*CLEANUP_REFILL):Math.max(0,a.air-dt);
  if(a.air===0){a.x=0;a.y=0;a.status='failed';a.collected=[];resetAction(a);state.lastEvent={code:'cleanup_failed',message:'Out of air. Returned safely by rescue; earned rewards are kept. Retry or board the raft.',at:state.time};}
}
