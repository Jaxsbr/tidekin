import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import readline from 'node:readline';
const sourceSave='captures/second-improvement/expert/2026-10-08T23-42-00.334Z/earned-browser-save.json';
const out='captures/second-improvement/expert-arc/'+new Date().toISOString().replaceAll(':','-');
await fs.mkdir(out,{recursive:true});
const expected=['index-9TpJEO4p.js','scene-C3Fly4-r.js'];
const record={expected,sourceSave,assistance:'Read-only getState for actual-input navigation and verification; browser save restored without edits.',events:[],fingerprints:[]};
const flush=()=>fs.writeFile(`${out}/session.json`,JSON.stringify(record,null,2));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
try {
const context=await browser.newContext({viewport:{width:1440,height:900},storageState:sourceSave});
const page=await context.newPage();page.setDefaultTimeout(5000);
page.on('response',async r=>{if(/\.js$|\/$/.test(new URL(r.url()).pathname)){try{record.fingerprints.push({url:r.url(),sha256:crypto.createHash('sha256').update(await r.body()).digest('hex')});await flush()}catch{}}});
page.on('pageerror',e=>record.events.push({error:String(e)}));
const state=()=>page.evaluate(()=>window.__tidekin?.getState());
const key=async(k,ms=100)=>{await page.keyboard.down(k);try{await page.waitForTimeout(ms)}finally{await page.keyboard.up(k)}};
const text=()=>page.locator('body').innerText();
const note=async(label)=>{const entry={at:new Date().toISOString(),label,state:await state(),text:await text()};record.events.push(entry);await flush();console.log(JSON.stringify(entry))};
await page.goto('http://localhost:5181/?qa=1');await page.waitForTimeout(500);
await page.getByRole('button',{name:'Continue voyage',exact:true}).click();
await page.waitForFunction(()=>window.__tidekin?.getState());
await page.waitForTimeout(300);
for(const asset of expected)if(!record.fingerprints.some(f=>f.url.endsWith(asset)))throw Error(`Candidate mismatch: missing ${asset}`);
await note('continued-earned-save');console.log('READY '+out);
for await(const line of readline.createInterface({input:process.stdin})){
try{
const c=JSON.parse(line);record.events.push({at:new Date().toISOString(),input:c});
if(c.click)await page.getByRole('button',{name:c.click,exact:true}).nth(c.nth??0).click();
if(c.key)await key(c.key,c.ms??100);
if(c.keys){for(const k of c.keys)await page.keyboard.down(k);try{await page.waitForTimeout(c.ms??100)}finally{for(const k of c.keys)await page.keyboard.up(k)}}
if(c.wait)await page.waitForTimeout(Math.min(c.wait,30000));
if(c.xy)await page.mouse.click(...c.xy);
if(c.go){
// Coordinates must come from observed chart/position evidence, never source or hidden node lists.
let s=await state();if(!s.helm)await key('h');await page.waitForTimeout(100);
for(let i=0;i<6;i++){
s=await state();const dx=c.go[0]-s.position.x,dz=c.go[1]-s.position.z,dist=Math.hypot(dx,dz);if(dist<1.4)break;
const target=Math.atan2(dx,dz);const delta=Math.atan2(Math.sin(target-s.heading),Math.cos(target-s.heading));
if(Math.abs(delta)>0.025)await key(delta>0?'a':'d',Math.min(2000,Math.abs(delta)/1.6*1000));
await key('w',Math.min(1800,Math.max(100,(dist-0.7)/s.speed*1000)));
}
await key('h');await note('assisted-navigation');
}
if(c.inspect)console.log(JSON.stringify(await page.getByRole('button').evaluateAll(bs=>bs.map(b=>({text:b.innerText,label:b.getAttribute('aria-label'),disabled:b.disabled})))));
if(c.chart)console.log(await page.locator('svg').evaluateAll(xs=>xs.map(x=>x.outerHTML)));
if(c.reload){await context.storageState({path:`${out}/earned-before-reload.json`});await note('before-reload');await page.reload();await page.getByRole('button',{name:'Continue voyage',exact:true}).click();await page.waitForFunction(()=>window.__tidekin?.getState());await note('after-reload')}
if(c.snap)await page.screenshot({path:`${out}/${c.snap}.png`});
if(c.read||c.snap)await note(c.snap||'observation');
if(c.save)await context.storageState({path:`${out}/earned-browser-save.json`});
await flush();console.log('READY');
if(c.close)break;
}catch(e){record.events.push({at:new Date().toISOString(),harnessError:String(e)});await flush();console.log(String(e))}
}
await context.storageState({path:`${out}/earned-browser-save.json`});
} finally {await browser.close();await flush();console.log('BROWSER CLOSED')}
