import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { freshFixture } from './fixtures.mjs';

function sailFixture(Game, state, target) {
  // Fixed domain steps, without a renderer, clock replacement or invented unlocks.
  for (let step=0;step<20000;step++) {
    const dx=target.x-state.position.x,dz=target.z-state.position.z;
    if(Math.hypot(dx,dz)<=1.5)return;
    const angle=Math.atan2(Math.sin(Math.atan2(dx,dz)-state.heading),Math.cos(Math.atan2(dx,dz)-state.heading));
    Game.steerGame(state,.05,{x:Math.abs(angle)>.07?(angle>0?-1:1):0,z:Math.abs(angle)>.07?0:-1});
    Game.updateGame(state,.05);
  }
  throw Error('CPU fixture sailing deadline exceeded');
}

export function createResourceFixture(Game) {
  const {state}=freshFixture(Game,{supplied:true});
  for(const upgrade of Object.keys(state.upgrades)) {
    if(!Game.act(state,'build',{upgrade}).ok)throw Error(`CPU fixture build failed: ${upgrade}`);
  }
  sailFixture(Game,state,Game.ISLANDS.find(island=>island.id==='horizon').position);
  if(!state.departed||!state.discoveries.includes('horizon'))throw Error('CPU fixture did not earn horizon access');
  if(!Game.act(state,'travel',{region:'home'}).ok)throw Error('CPU fixture home travel failed');
  Game.deserializeGame(Game.serializeGame(state));
  return state;
}

export function findTextures(value, output = new Set(), seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return output;
  seen.add(value);
  if (value.isTexture) { output.add(value); return output; }
  if (Array.isArray(value)) for (const item of value) findTextures(item, output, seen);
  else for (const item of Object.values(value)) findTextures(item, output, seen);
  return output;
}

// CPU ownership fixture: does not construct a renderer or certify GPU release.
// Track allocations through Three prototypes, including unattached resources.
export async function measureResources(root, policy, injected = {}) {
  const THREE = injected.THREE ?? await import(pathToFileURL(join(root, 'node_modules/three/build/three.module.js')));
  const createCleanupScene = injected.createCleanupScene ?? (await import(pathToFileURL(join(root, 'src/cleanup-scene.js')))).createCleanupScene;
  const Game = injected.Game ?? await import(pathToFileURL(join(root, 'src/game.js')));
  const known = new Set(), live = new Set(), counts = new Map(), restored = [];
  const track = resource => {
    if (known.has(resource)) return;
    known.add(resource); live.add(resource);
    resource.addEventListener('dispose', () => { live.delete(resource); counts.set(resource, (counts.get(resource) ?? 0) + 1); });
  };
  // Installed Three copy() uses setAttribute for populated geometries, but
  // empty/morph-only copies bypass it. Track copy receivers before mutation;
  // clone() calls copy(), and the identity set avoids counting either twice.
  // Material setValues covers concrete materials; textures are found below.
  for (const [prototype, method] of [[THREE.BufferGeometry.prototype, 'setAttribute'],
    [THREE.BufferGeometry.prototype, 'copy'], [THREE.Material.prototype, 'setValues']]) {
    const original = prototype[method];
    prototype[method] = function (...args) { track(this); return original.apply(this, args); };
    restored.push(() => { prototype[method] = original; });
  }
  let view;
  const rows = [];
  function inspect() {
    const attached = new Set();
    view.scene.traverse(o => {
      if (o.geometry) attached.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m) {
        attached.add(m);
        for (const v of Object.values(m)) if (v?.isTexture) attached.add(v);
        for (const t of findTextures(m.uniforms)) attached.add(t);
      }
    });
    for (const r of attached) track(r);
    const buffers=new Set(),textures=new Set();
    for(const r of live) {
      if(r.isBufferGeometry) {
        for(const attribute of [...Object.values(r.attributes),r.index].filter(Boolean)) {
          const buffer=(attribute.array??attribute.data?.array)?.buffer;if(buffer)buffers.add(buffer);
        }
      }
      if(r.isTexture)textures.add(r);
    }
    let textureRgbaBytesEstimate=0,unknownTextureImages=0;
    for(const texture of textures)for(const img of Array.isArray(texture.image)?texture.image:[texture.image]) {
      if(Number.isFinite(img?.width)&&Number.isFinite(img?.height))textureRgbaBytesEstimate+=img.width*img.height*4;
      else unknownTextureImages++;
    }
    return { attached: attached.size, live: live.size, detached: [...live].filter(r => !attached.has(r)).length,
      disposed: counts.size, geometries: [...live].filter(r => r.isBufferGeometry).length,
      materials: [...live].filter(r => r.isMaterial).length, textures: [...live].filter(r => r.isTexture).length,
      geometryBackingBytes: [...buffers].reduce((n,b)=>n+b.byteLength,0),textureRgbaBytesEstimate,unknownTextureImages };
  }
  try {
    view = createCleanupScene({ THREE }); inspect();
    const state = createResourceFixture(Game);
    for (let i = 0; i < policy.transitionCycles; i++) {
      const site = policy.habitats[i % policy.habitats.length];
      const region=site==='salvage:horizon-wreck'?'horizon':'home';
      if(state.region!==region&&!Game.act(state,'travel',{region}).ok)throw Error(`CPU fixture travel failed: ${region}`);
      sailFixture(Game,state,Game.getCleanupSite(state, site).position);
      if (!Game.act(state, 'enter-cleanup', { siteId: site }).ok) throw Error(`CPU entry failed: ${site}`);
      view.update(state, 1/60); const inside = inspect();
      if (!Game.act(state, 'leave-cleanup').ok) throw Error(`CPU exit failed: ${site}`);
      view.update(state, 1/60); rows.push({ cycle: i + 1, site, inside, outside: inspect() });
    }
    view.dispose(); const remaining = live.size, disposalCounts = [...counts.values()];
    view.dispose();
    return { measured: true, method: 'CPU Three ownership events and attached-resource sets; no GPU', rows,
      estimates:{geometry:'Deduplicated live geometry attribute/index ArrayBuffer byteLength; CPU storage, excludes morph attributes and GPU copies',
        textures:'Per-texture image width*height*4; uncompressed RGBA estimate only, no mipmaps, compression, render targets or driver allocations'},
      observed: known.size, remaining, doubleDisposed: [...counts.values()].filter(n => n !== 1).length,
      idempotent: JSON.stringify(disposalCounts) === JSON.stringify([...counts.values()]) };
  } finally { view?.dispose(); for (const restore of restored) restore(); }
}
