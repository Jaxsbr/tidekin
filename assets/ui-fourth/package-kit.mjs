// Editable viewport packaging only. No raster processing: embeds original ImageGen PNG bytes.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const source = dirname(fileURLToPath(import.meta.url));
const out = resolve(source, '../../public/assets/ui-fourth');
const atlas = readFileSync(resolve(out, 'ocean-kit-atlas.png'));
const data = `data:image/png;base64,${atlas.toString('base64')}`;
const entries = [
  ['module-waterwheel', 'Waterwheel', 0, 0, 384, 337],
  ['module-crane', 'Salvage crane', 384, 0, 384, 345],
  ['module-greenhouse', 'Greenhouse', 768, 0, 384, 342],
  ['module-sail', 'Sail', 1152, 0, 384, 347],
  ['module-beacon', 'Beacon', 0, 337, 384, 327],
  ['resource-wood', 'Driftwood', 384, 345, 384, 313],
  ['resource-scrap', 'Salvaged metal', 768, 342, 384, 316],
  ['resource-pearl', 'Pearl', 1152, 347, 384, 314],
  ['stamp-voyage', 'Voyage', 0, 664, 384, 360],
  ['stamp-map', 'Ocean chart', 384, 658, 384, 366],
  ['stamp-journal', 'Tide journal', 768, 658, 384, 366],
  ['stamp-settings', 'Settings', 1152, 661, 384, 363],
];
const assets = {};
let css = '/* Asset helper: import this file from application CSS. */\n.ui-fourth-art, .game-art { display:inline-block; width:var(--art-size, 64px); flex-shrink:0; background-image:url("./ocean-kit-atlas.png"); background-repeat:no-repeat; }\n';
for (const [id, label, x, y, width, height] of entries) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}" role="img" aria-label="${label}"><title>${label}</title><image width="1536" height="1024" href="${data}"/></svg>\n`;
  writeFileSync(resolve(out, `${id}.svg`), svg);
  assets[id] = { label, url:`/assets/ui-fourth/${id}.svg`, rect:[x,y,width,height], width, height };
  const short = id.replace(/^(module|resource|stamp)-/, '');
  const aliases = [`.ui-fourth-${id}`, `.game-art.art-${id}`, `.game-art.art-${short}`];
  if (short === 'pearl') aliases.push('.game-art.art-pearls');
  if (short === 'map') aliases.push('.game-art.art-chart');
  css += `${aliases.join(', ')} { aspect-ratio:${width}/${height}; background-size:${1536/width*100}% ${1024/height*100}%; background-position:${x/(1536-width)*100}% ${y/(1024-height)*100}%; }\n`;
}
writeFileSync(resolve(out, 'atlas.css'), css);
writeFileSync(resolve(out, 'manifest.json'), JSON.stringify({atlas:{url:'/assets/ui-fourth/ocean-kit-atlas.png',width:1536,height:1024},assets},null,2)+'\n');
// This source document is fully editable and keeps the atlas unmodified.
writeFileSync(resolve(source, 'atlas-layout.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024"><image href="../../public/assets/ui-fourth/ocean-kit-atlas.png" width="1536" height="1024"/><g fill="none" stroke="#ef6d47" stroke-width="1">${entries.map(([id,,x,y,w,h])=>`<rect id="${id}" x="${x}" y="${y}" width="${w}" height="${h}"/>`).join('')}</g></svg>\n`);
writeFileSync(resolve(source, 'preview.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Tidekin ocean UI art contact sheet</title><style>body{margin:0;padding:32px;background:#efe5c8;color:#204b4d;font:16px system-ui}h1{font:36px Georgia}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:24px}figure{margin:0;padding:16px;background:#fcf5e2;border-radius:16px}img{display:block;width:100%;height:220px;object-fit:contain}figcaption{text-align:center;margin-top:12px}small{display:block;color:#536a64}body.dark{background:#183e44}body.dark figure{background:#28545b;color:#fff}button{margin-bottom:24px;padding:12px}</style><h1>Tidekin · painted ocean kit</h1><button onclick="document.body.classList.toggle('dark')">Toggle light / dark backing</button><main>${entries.map(([id,label,,,w,h])=>`<figure><img src="../../public/assets/ui-fourth/${id}.svg" alt="${label}"><figcaption>${label}<small>${id} · ${w} × ${h}</small></figcaption></figure>`).join('')}</main></html>`);
console.log(`Packaged ${entries.length} viewports; original atlas ${atlas.length} bytes.`);
