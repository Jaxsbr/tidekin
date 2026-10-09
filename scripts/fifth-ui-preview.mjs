import {chromium} from '@playwright/test';
import {createGame,serializeGame,DIVE_TROPHIES} from '../src/game.js';
import {mkdir} from 'node:fs/promises';
const out='captures/fifth-improvement/ui';await mkdir(out,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const c=await b.newContext({viewport:{width:Number(process.env.WIDTH??1440),height:900}}),p=await c.newPage();
if(process.env.TROPHIES){const s=createGame();s.trophies=DIVE_TROPHIES.map(t=>t.id);s.inventory={wood:7,scrap:4,pearls:2};await c.addInitScript(save=>localStorage.setItem('tidekin.save.v2',save),serializeGame(s));}
p.on('pageerror',e=>console.log('ERROR',String(e)));
await p.goto('http://127.0.0.1:5182/?qa=1');await p.locator(process.env.TROPHIES?'#continue-voyage':'#new-voyage').click();await p.waitForFunction(()=>window.__tidekin?.getState());
await p.keyboard.press('c');await p.waitForTimeout(650);await p.screenshot({path:out+`/cabin-${process.env.TROPHIES?'populated':'empty'}-${process.env.WIDTH??1440}.png`});
if(process.env.TROPHIES){await p.locator('[data-keepsake=brass-compass]').click();await p.screenshot({path:out+`/cabin-detail-${process.env.WIDTH??1440}.png`});await b.close();process.exit(0);}
await p.locator('#panel-next').click();console.log('carousel',await p.locator('#panel-dialog').getAttribute('data-panel'));
await p.locator('#close-panel').click();await p.keyboard.press('Space');await p.waitForTimeout(1000);await p.screenshot({path:out+'/surface.png'});
await p.keyboard.down('s');await p.waitForTimeout(4000);await p.keyboard.up('s');await p.screenshot({path:out+'/depth.png'});
console.log(await p.locator('#dive-overlay').innerText());await b.close();
