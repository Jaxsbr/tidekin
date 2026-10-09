import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createReefFish} from '../assets/cleanup/underwater-fish.js';
function habitat(){const fish=createReefFish(THREE,[{x:0,y:-9,z:-2},{x:10,y:-9,z:-2}],()=>.5);let time=0;return{...fish,tick(seconds,player){for(let i=0;i<seconds*60;i++)fish.update(time+=1/60,1/60,player);}};}
const distance=(fish,player)=>Math.hypot(fish.position.x-player.x,fish.position.y-player.y);
test('resident skittish fish create distance from an approaching diver then become curious nearby',()=>{
 const h=habitat(),fish=h.root.children[3],player={x:fish.position.x-.2,y:fish.position.y};const initial=distance(fish,player);
 h.tick(.7,player);assert.ok(distance(fish,player)>initial+1,'approach produces visible retreat');
 h.tick(1.8,player);assert.ok(distance(fish,player)>3,'fish keep a safe watching distance');assert.equal(fish.userData.behavior,'curious');
 const away={x:-30,y:-2};h.tick(12,away);assert.ok(Math.hypot(fish.position.x-9.65,fish.position.y+8.4)<1.5,'fish return to their habitat after the diver leaves');
});
test('calm small fish briefly accompany a diver and return to their anchor',()=>{
 const h=habitat(),fish=h.root.children[0],home=fish.position.clone(),player={x:home.x+1.5,y:home.y};h.tick(.7,player);assert.equal(fish.userData.behavior,'follow');
 player.x+=1;h.tick(1,player);assert.ok(fish.position.x>home.x+.5,'calm fish follow the moving diver');
 player.x=home.x+3;h.tick(3,player);assert.notEqual(fish.userData.behavior,'follow','following ends even while the diver remains nearby');
 player.x=30;h.tick(8,player);assert.ok(fish.position.distanceTo(home)<1.5,'brief followers settle back near their anchor');
});
