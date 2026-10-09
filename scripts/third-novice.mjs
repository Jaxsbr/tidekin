import {chromium} from '@playwright/test';
import readline from 'node:readline';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
const page=await context.newPage();
await page.goto('http://127.0.0.1:5181/?qa=1');
const rl=readline.createInterface({input:process.stdin});
console.log('READY');
for await(const line of rl){try{console.log(JSON.stringify(await eval(`(async()=>{${line}})()`)));}catch(e){console.log(String(e));}}
await browser.close();
