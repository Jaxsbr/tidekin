#!/usr/bin/env node
/** Actual-input, operator/agent-driven comparison recorder. Never grants gameplay state.
 * --help is offline. Running requires explicit --integration-ready=<build identifier>.
 * Each trial uses a fresh disposable context; outputs live under captures/second-cameras/.
 */
import { chromium } from '@playwright/test';
import { createInterface } from 'node:readline/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const option = (name, fallback) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const trials = [];
for (const [layout, width, height] of [['wide',1440,900], ['square',900,900]]) {
  for (const order of ['AB', 'BA']) {
    for (const family of ['sailing', 'cleanup']) {
      for (const letter of order) {
        trials.push({ id: `${layout}-${order}-${family}-${letter}`, layout, width, height, order, family,
          camera: family === 'sailing' ? (letter === 'A' ? 'helm' : 'follow') : (letter === 'A' ? 'side' : 'oblique') });
      }
    }
  }
}
const help = `Tidekin paired camera recorder (no gameplay setters)
node scripts/compare-second-cameras.mjs --integration-ready=BUILD --trial=ID [--url=http://127.0.0.1:5181] [--operator=agent-1]
Omit --trial to run eight AB trials. --all-orders adds BA repeats. --auto --brief uses a bounded actual-input route; --exclude=ID skips an existing trial. --channel=chrome is default; --channel=chromium uses bundled Chromium.
Do not run until PM confirms integrated build readiness. No server is started/rebuilt by this script.

Commands (one per line):
 click Exact accessible button name   actual visible UI click
 world helm|cabin|workshop|cleanup    click projected visible physical hotspot
 key Escape                          press a browser key
 hold KeyW 1000                      hold W for milliseconds (20..10000)
 hold KeyW+KeyD 500                   simultaneous browser keys
 camera                              select this trial's camera through approved hook
 shot checkpoint-name                PNG + visible text + read-only state/metrics
 note observation                    record an evidence observation, not a source inference
 done                                finish trial (requires camera selection and screenshot)
 abort reason                        preserve partial evidence and stop

Use shot ready immediately before each matched route. Navigate by actual input;
pause via Escape while considering notes, and record pauses. Camera selection is the
only mutating QA hook called. No action/travel/build/collect/restore setters are used.
Trials:\n${trials.map(t => t.id).join('\n')}`;
if (args.includes('--help')) { console.log(help); process.exit(0); }
const build = option('integration-ready');
if (!build) throw new Error('Integration readiness not supplied. Use --help; wait for PM notification.');
const target = new URL(option('url', 'http://127.0.0.1:5181'));
if (target.protocol !== 'http:' || !['127.0.0.1','localhost'].includes(target.hostname)) throw new Error('Local HTTP preview required.');
target.searchParams.set('qa','1');
const selected = option('trial') ? trials.filter(t => t.id === option('trial')) : trials.filter(t => (args.includes('--all-orders') || t.order==='AB') && (!option('family') || t.family===option('family')) && t.id!==option('exclude'));
const automated = args.includes('--auto') || args.includes('--motion');
if(args.includes('--motion') && (selected.length!==1 || selected[0].family!=='cleanup' || args.includes('--trace'))) throw new Error('Motion requires one cleanup trial and no trace');
if (!selected.length) throw new Error('Unknown trial. Use --help.');
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(repo, 'captures', 'second-cameras', new Date().toISOString().replace(/[:.]/g,'-'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const rl = createInterface({ input: process.stdin, output: process.stdout });
let browser;
const report = { status:'running', build, operator:option('operator','unspecified-agent'), url:target.href,
  startedAt:new Date().toISOString(), expectedTuning:{breath:24,swimSpeed:2.2}, trials:[],
  evidenceLimit:'Agent/operator actual-input recording, not human enjoyment evidence or a performance benchmark.' };
await mkdir(output,{recursive:true});
const flush = () => writeFile(join(output,'evidence.json'), JSON.stringify(report,null,2)+'\n');
try {
  const channel = option('channel','chrome');
  browser = await chromium.launch({headless:false, args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'], ...(channel === 'chromium' ? {} : {channel})});
  report.browser = browser.version();
  console.log(help);
  for (const trial of selected) {
    const dir = join(output,trial.id);
    await mkdir(dir,{recursive:true});
    const context = await browser.newContext({viewport:{width:trial.width,height:trial.height}, deviceScaleFactor:1,
      recordVideo:{dir, size:args.includes('--motion')?{width:960,height:600}:{width:trial.width,height:trial.height}}});
    if(args.includes('--trace')) await context.tracing.start({screenshots:false,snapshots:false,sources:false});
    const page = await context.newPage();
    const record = {...trial, startedAt:new Date().toISOString(), commands:[], checkpoints:[], errors:[], responses:[], status:'running'};
    report.trials.push(record);
    const pending = [];
    page.on('pageerror',e=>record.errors.push({at:Date.now(),message:e.message}));
    page.on('response',response=>{
      const url = new URL(response.url());
      if(url.origin!==target.origin) return;
      if(response.status()>=400) record.errors.push({url:url.href,status:response.status()});
      if(!/\.(?:js|css|glb)(?:$|\?)/.test(url.pathname+url.search) && url.pathname!=='/') return;
      pending.push((async()=>{
        try { record.responses.push({url:url.href,status:response.status(),sha256:sha(await response.body())}); }
        catch(e){record.errors.push({url:url.href,message:`Fingerprint unavailable: ${e.message}`});}
      })());
    });
    let selectedCamera = false;
    let sequence = 0;
    const read = () => page.evaluate(()=>({state:window.__tidekin?.getState?.() ?? null,metrics:window.__tidekin?.getMetrics?.() ?? null}));
    async function shot(label) {
      const filename = `${String(++sequence).padStart(2,'0')}-${label.replace(/[^a-z0-9-]/gi,'-').slice(0,70)}.png`;
      if(/^(cabin|workshop|chooser|restored-map|title|initial-raft)/.test(label)) await page.waitForTimeout(350);
      const snapshot = await read();
      await page.screenshot({path:join(dir,filename)});
      record.checkpoints.push({label,at:new Date().toISOString(),screenshot:filename,...snapshot,
        visibleText:await page.locator('body').innerText()});
      await flush();
    }
    try {
      await page.goto(target.href,{waitUntil:'networkidle'});
      const hooks = await page.evaluate(()=>Object.fromEntries(['getState','getMetrics','setCamera','setCleanupCamera'].map(k=>[k,typeof window.__tidekin?.[k]==='function'])));
      if(Object.values(hooks).some(v=>!v)) throw new Error(`Required integrated hooks missing: ${JSON.stringify(hooks)}. Do not test a half-integrated build.`);
      await shot('title');
      console.log(`\nTRIAL ${trial.id}. Fresh isolated voyage. Start via UI, then camera, then shot ready.\n`);
      async function* swimTo(x,y) {
        for(let i=0;i<30;i++) {
          const a=(await read()).state?.cleanup?.attempt;
          if(!a || a.status==='failed') throw new Error('Swim route interrupted before target');
          const dx=x-a.x, dy=y-a.y;
          if(Math.abs(dx)<.15 && Math.abs(dy)<.15) return;
          const horizontal=Math.abs(dx)>Math.abs(dy);
          const delta=horizontal?dx:dy;
          const key=horizontal?(delta>0?'KeyD':'KeyA'):(delta>0?'KeyW':'KeyS');
          yield `hold ${key} ${Math.round(Math.max(25,Math.min(900,Math.abs(delta)/2.2*1000)))}`;
        }
        throw new Error('Swim target not reached within bounded actual inputs');
      }
      async function* automaticRoute() {
        if(args.includes('--art') && trial.family==='sailing' && trial.camera==='helm') {
          yield 'wait 2000'; yield 'shot title-normal-later';
          yield 'click Settings'; yield 'check Reduced motion'; yield 'shot reduced-motion-setting';
          yield 'click All comfortable'; yield 'wait 500'; yield 'shot title-reduced-1';
          yield 'wait 1500'; yield 'shot title-reduced-2';
          yield 'click Settings'; yield 'uncheck Reduced motion'; yield 'click All comfortable';
        }
        yield 'click Start new voyage';
        yield 'wait 900';
        yield 'shot initial-raft';
        if(args.includes('--motion')) {
          yield 'key Space'; yield 'camera'; yield 'shot ready';
          yield* swimTo(-3,-2); yield 'shot normal-before';
          yield 'key e'; yield 'wait 1000'; yield 'shot normal-transfer-settled';
          yield 'hold KeyD 700'; yield 'hold KeyA 700'; yield 'wait 300';
          yield* swimTo(-3,0); yield 'wait 1000'; yield 'shot normal-breath';
          yield 'key Escape'; yield 'click Settings'; yield 'check Reduced motion';
          yield 'click All comfortable'; yield 'click Resume voyage';
          yield 'key Space'; yield 'key Space';
          yield 'shot reduced-empty';
          yield* swimTo(-3,-2); yield 'shot reduced-before';
          yield 'key e'; yield 'wait 600'; yield 'shot reduced-transfer-settled';
          yield* swimTo(-3,0); yield 'wait 900'; yield 'shot reduced-breath-1';
          yield 'wait 900'; yield 'shot reduced-breath-2';
          yield 'done'; return;
        }
        if(trial.family==='sailing') {
          yield 'world helm'; yield 'camera'; yield 'shot ready';
          yield 'hold KeyW 600'; yield 'shot forward';
          yield 'hold KeyD 980'; yield 'shot turn-right';
          yield 'hold KeyW 650'; yield 'hold KeyS 650'; yield 'shot reverse';
          yield 'hold KeyA 980'; yield 'hold KeyS 600'; yield 'shot return-heading';
          yield 'key e'; yield 'shot gather-attempt';
          yield 'key h'; yield 'hold KeyW 350'; yield 'shot off-helm';
          yield 'world cabin'; yield 'shot cabin'; yield 'key Escape';
          yield 'world workshop'; yield 'shot workshop'; yield 'key Escape';
          yield 'key i'; yield 'shot chooser'; yield 'click Wheel camera';
          yield 'key h'; yield 'hold KeyW 350'; yield 'shot actual-wheel-choice-after-helm';
          yield 'key h'; yield 'shot return-inspection';
        } else {
          yield 'key Space'; yield 'camera'; yield 'shot ready';
          yield* swimTo(-3,-2); yield 'shot first-trash'; yield 'key e';
          yield 'shot transfer-start'; yield 'wait 350'; yield 'shot first-bag';
          yield* swimTo(-3,0); yield 'wait 2500'; yield 'shot breathing-retains-progress';
          if(args.includes('--brief')) {
            yield* swimTo(3,-2.5); yield 'key e'; yield 'wait 400'; yield 'shot second-bag';
            yield* swimTo(3,-7); yield 'shot deepest-target'; yield 'key e'; yield 'wait 400'; yield 'shot deep-transfer';
            yield* swimTo(3,0); yield 'wait 2500'; yield 'shot surface-after-deep';
            yield 'done'; return;
          }
          yield* swimTo(-3,-2); yield 'wait 10000'; yield 'wait 10000'; yield 'wait 5000';
          yield 'shot failure'; yield 'click Retry cleanup'; yield 'camera'; yield 'shot retry-empty';
          const targets=[[-3,-2],[3,-2.5],[-6,-4.5],[0,-5],[6,-5],[3,-7]];
          for(let i=0;i<targets.length;i++) {
            const [x,y]=targets[i];
            yield* swimTo(x,0); yield 'wait 2500'; yield* swimTo(x,y);
            yield `shot trash-${i+1}-before`; yield 'key e'; yield `shot trash-${i+1}-transfer`;
            yield 'wait 400'; yield `shot trash-${i+1}-bag`;
            yield* swimTo(x,0);
          }
          yield 'shot restored-surface'; yield 'key Space'; yield 'key m'; yield 'shot restored-map';
          yield 'key Escape'; yield 'reload'; yield 'click Continue voyage'; yield 'wait 700';
          yield 'key Space'; yield 'camera'; yield 'shot revisit-restored';
        }
        yield 'done';
      }
      const route=automaticRoute();
      while(true) {
        const line = automated ? (await route.next()).value : (await rl.question(`${trial.id}> `)).trim();
        if(line===undefined) throw new Error('Automatic route ended without done');
        if(automated) console.log(`${trial.id}> ${line}`);
        if(!line) continue;
        const [command,...rest] = line.split(' ');
        const value = rest.join(' ');
        const event = {line,at:new Date().toISOString()};
        record.commands.push(event);
        try {
          if(command==='wait') { const ms=Number(value); if(!Number.isFinite(ms)||ms<0||ms>10000) throw new Error('wait 0..10000ms'); await page.waitForTimeout(ms); }
          else if(command==='reload') await page.reload({waitUntil:'networkidle'});
          else if(command==='check' || command==='uncheck') await page.getByRole('switch',{name:value,exact:true}).setChecked(command==='check');
          else if(command==='click') await page.getByRole('button',{name:value,exact:true}).click({timeout:5000});
          else if(command==='world') {
            if(!['helm','cabin','workshop','cleanup'].includes(value)) throw new Error('Unknown hotspot');
            const {metrics} = await read();
            const point = metrics?.interactions?.[value];
            if(!point?.visible || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error(`No visible projected ${value} hotspot in getMetrics().interactions`);
            const bounds = await page.locator('canvas').first().boundingBox();
            if(!bounds) throw new Error('No visible game canvas');
            // Renderer projects to viewport CSS pixels (includes canvas rect offsets).
            event.hotspot = point; event.canvasBounds = bounds;
            await page.mouse.click(point.x,point.y);
          } else if(command==='key') await page.keyboard.press(value);
          else if(command==='hold') {
            const [keyText, durationText] = rest;
            const ms = Number(durationText);
            if(!Number.isFinite(ms)||ms<20||ms>10000) throw new Error('Hold must be 20..10000ms');
            const keys = keyText.split('+').map(k=>/^Key[A-Z]$/.test(k)?k.slice(3).toLowerCase():k);
            event.before = await read();
            const start = performance.now();
            try { for(const key of keys) await page.keyboard.down(key); await page.waitForTimeout(ms); }
            finally { for(const key of keys) await page.keyboard.up(key); }
            event.actualHoldMs = performance.now()-start;
            event.after = await read();
          } else if(command==='camera') {
            await page.evaluate(({family,camera})=>{
              if(!window.__tidekin.getState()) throw new Error('Start voyage before camera selection');
              // Fix the other camera to avoid a second independent variable.
              window.__tidekin.setCamera(family==='sailing'?camera:'follow');
              window.__tidekin.setCleanupCamera(family==='cleanup'?camera:'side');
            },trial);
            selectedCamera = true;
            await shot('camera-selected');
          } else if(command==='shot') await shot(value||'checkpoint');
          else if(command==='note') event.observation = value;
          else if(command==='abort') throw new Error(`ABORT: ${value}`);
          else if(command==='done') {
            if(!selectedCamera || !record.checkpoints.some(c=>c.label==='ready')) throw new Error('Select camera and capture shot ready before completing trial');
            await shot('end'); record.status='recorded-not-reviewed'; break;
          } else throw new Error('Unknown command; see --help');
          event.ok=true;
        } catch(e) {
          event.ok=false; event.error=e.message; console.error(e.message);
          if(command==='abort' || automated) throw e;
        }
        await flush();
      }
    } catch(e) { record.status='blocked-or-aborted'; record.errors.push({message:e.message}); throw e; }
    finally {
      await Promise.allSettled(pending);
      record.finishedAt=new Date().toISOString();
      if(args.includes('--trace')) await context.tracing.stop({path:join(dir,'trace.zip')}).catch(e=>record.errors.push({message:e.message}));
      const video = page.video();
      await context.close();
      record.video = video ? await video.path() : null;
      await flush();
    }
  }
  report.status='recorded-awaiting-visual-review';
} catch(e) { report.status='blocked-or-aborted'; report.error=e.message; console.error(e.message); process.exitCode=1; }
finally { rl.close(); await browser?.close(); report.finishedAt=new Date().toISOString(); await flush(); console.log(`Evidence: ${output}`); }
