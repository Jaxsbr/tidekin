import { chromium } from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5181/?qa=1');await page.click('#new-voyage');
 await page.waitForFunction(()=>window.__tidekin?.getState());await page.waitForTimeout(1000);
 await page.screenshot({path:'captures/second-improvement/integration-raft.png'});
 await page.click('#dive-button');await page.waitForTimeout(1000);
 await page.screenshot({path:'captures/second-improvement/integration-cleanup.png'});
 const result={errors,state:await page.evaluate(()=>window.__tidekin.getState()),metrics:await page.evaluate(()=>window.__tidekin.getMetrics())};
 fs.writeFileSync('captures/second-improvement/integration-smoke.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({errors,cleanup:result.state.cleanup,metrics:result.metrics},null,2));
} catch(e) {await page.screenshot({path:'captures/second-improvement/integration-smoke-failure.png'});fs.writeFileSync('captures/second-improvement/integration-smoke-failure.json',JSON.stringify({error:e.message,errors,body:await page.locator('body').innerText()},null,2));console.log(JSON.stringify({error:e.message,errors,body:await page.locator('body').innerText()}));} finally {await browser.close();}
