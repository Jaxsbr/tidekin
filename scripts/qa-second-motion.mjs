import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root='captures/second-improvement/motion/'+new Date().toISOString().replaceAll(':','-');
await mkdir(root,{recursive:true});
const report={method:'Actual keyboard inputs, read-only state/rAF telemetry, CDP rendered JPEG frames; no game-state or action hooks. Recording is not a performance benchmark.',runs:[]};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
try {
for(const reduced of [false,true]){
 const name=reduced?'reduced':'normal',dir=root+'/'+name;await mkdir(dir);
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});const p=await context.newPage();
 const run={name,inputs:[],frames:[],assets:[],errors:[]};report.runs.push(run);
 p.on('pageerror',e=>run.errors.push(String(e)));
 p.on('response',async r=>{if(/\.(js|css)$/.test(new URL(r.url()).pathname)){const b=await r.body();run.assets.push({url:r.url(),sha256:createHash('sha256').update(b).digest('hex')})}});
 await p.goto('http://127.0.0.1:5181/?qa=1');await p.locator('#new-voyage').click();await p.waitForFunction(()=>window.__tidekin?.getState());
 if(reduced){await p.keyboard.press('Escape');await p.locator('[data-modal-action="settings"]').click();await p.locator('#motion-setting').check();await p.locator('[data-modal-action="settings-done"]').click();await p.locator('[data-modal-action="play"]').click();}
 await p.keyboard.press('Space');await p.waitForFunction(()=>window.__tidekin.getState().cleanup.attempt);
 await p.locator('#game-canvas').focus();await p.waitForTimeout(300);
 const cdp=await context.newCDPSession(p);let n=0;const pending=[];
 cdp.on('Page.screencastFrame',f=>{const id=n++;run.frames.push({file:`${String(id).padStart(4,'0')}.jpg`,timestamp:f.metadata.timestamp});pending.push(writeFile(`${dir}/${String(id).padStart(4,'0')}.jpg`,Buffer.from(f.data,'base64')));void cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId})});
 await p.evaluate(()=>{window.__motionSamples=[];window.__motionRecord=true;function tick(t){if(!window.__motionRecord)return;const a=window.__tidekin.getState().cleanup.attempt;window.__motionSamples.push({t,epoch:performance.timeOrigin+t,x:a.x,y:a.y,air:a.air,status:a.status,count:a.collected.length});requestAnimationFrame(tick)}requestAnimationFrame(tick)});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:45,maxWidth:1440,maxHeight:900,everyNthFrame:2});
 async function key(k,ms){run.inputs.push({key:k,ms,epoch:Date.now()});await p.keyboard.down(k);await p.waitForTimeout(ms);await p.keyboard.up(k)}
 await p.waitForTimeout(200);await key('s',900);await key('a',1300);await p.waitForTimeout(180);
 run.before=await p.evaluate(()=>window.__tidekin.getState().cleanup.attempt);await key('e',40);await p.waitForTimeout(900);
 run.after=await p.evaluate(()=>window.__tidekin.getState().cleanup.attempt);assert.equal(run.after.collected.length,1);
 await key('d',550);await key('a',450);await key('w',1150);await p.waitForTimeout(1600);
 run.end=await p.evaluate(()=>window.__tidekin.getState().cleanup.attempt);assert.equal(run.end.collected.length,1);assert.ok(run.end.air>=23.9);
 await cdp.send('Page.stopScreencast');await Promise.all(pending);run.samples=await p.evaluate(()=>{window.__motionRecord=false;return window.__motionSamples});
 await p.screenshot({path:dir+'/surface.png'});await context.close();
 run.frameCount=n;assert.ok(n>50);assert.deepEqual(run.errors,[]);await writeFile(root+'/results.json',JSON.stringify(report,null,2));
}
}finally{await browser.close();await writeFile(root+'/results.json',JSON.stringify(report,null,2));console.log(root)}
