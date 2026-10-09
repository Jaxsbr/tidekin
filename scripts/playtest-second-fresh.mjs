import { chromium } from 'playwright';
import { createInterface } from 'node:readline';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const dir=process.argv.includes('--recheck')?'captures/second-improvement/fresh/recheck':'captures/second-improvement/fresh';
await mkdir(dir,{recursive:true});
const log=[], fingerprints=[];
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage();
page.on('response',async r=>{if(r.request().resourceType()==='script'){try{const b=await r.body();fingerprints.push({url:r.url(),status:r.status(),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}catch{}}});
const start=Date.now();
try { await page.goto('http://127.0.0.1:5181'); } catch(e) { await browser.close(); console.error(String(e)); process.exit(1); }
console.log('READY');
const rl=createInterface({input:process.stdin});
for await(const line of rl){try{const c=JSON.parse(line);log.push({elapsedMs:Date.now()-start,...c});if(c.action==='shot'){await page.screenshot({path:`${dir}/${c.name}.png`});console.log(await page.locator('body').innerText());}if(c.action==='click')await page.mouse.click(c.x,c.y);if(c.action==='key')await page.keyboard.press(c.key);if(c.action==='hold'){await page.keyboard.down(c.key);await page.waitForTimeout(c.ms);await page.keyboard.up(c.key);}if(c.action==='wait')await page.waitForTimeout(c.ms);if(c.action==='close'){await writeFile(`${dir}/input-log.json`,JSON.stringify({startedAt:new Date(start).toISOString(),durationMs:Date.now()-start,inputs:log},null,2));await writeFile(`${dir}/served-js-fingerprints.json`,JSON.stringify(fingerprints,null,2));await browser.close();break;}console.log('DONE');}catch(e){console.log(String(e));}}
