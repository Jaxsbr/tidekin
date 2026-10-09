import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import readline from 'node:readline';
import crypto from 'node:crypto';
const out='captures/second-improvement/novice';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage();
const started=Date.now();let count=0;
page.on('response',async r=>{if(/127.0.0.1:5181/.test(r.url())&&/javascript|html/.test(r.headers()['content-type']||'')){try{const body=await r.body();await fs.appendFile(`${out}/fingerprint.jsonl`,JSON.stringify({url:r.url(),sha256:crypto.createHash('sha256').update(body).digest('hex'),bytes:body.length,time:new Date().toISOString()})+'\n');}catch{}}});
await page.goto('http://127.0.0.1:5181/?qa=1');await page.waitForTimeout(2500);
async function snap(){await page.screenshot({path:`${out}/${String(count++).padStart(3,'0')}.png`});console.log(await page.locator('body').innerText());}
await snap();
for await (const line of readline.createInterface({input:process.stdin})){try{const a=JSON.parse(line);await fs.appendFile(`${out}/inputs.jsonl`,JSON.stringify({elapsedMs:Date.now()-started,...a})+'\n');if(a.click)await page.getByRole('button',{name:a.click,exact:true}).click();if(a.xy)await page.mouse.click(...a.xy);if(a.key)await page.keyboard.press(a.key);if(a.hold){await page.keyboard.down(a.hold);await page.waitForTimeout(a.ms||1000);await page.keyboard.up(a.hold);}if(a.wait)await page.waitForTimeout(a.wait);if(a.square)await page.setViewportSize({width:900,height:900});if(a.wide)await page.setViewportSize({width:1440,height:900});if(a.reload)await page.reload();await page.waitForTimeout(300);await snap();}catch(e){console.log(String(e));}}
await browser.close();
