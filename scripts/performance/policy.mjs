// Finite declared policy. CI uses actual-base controls after explicit bootstrap.
export const POLICY = Object.freeze({
  schema: 1, id: 'tidekin-performance-v1',
  repeats: 5, warmupMs: 5000, sampleMs: 20000, transitionCycles: 24,
  habitats: ['home-reef', 'sheltered-cove', 'salvage:home-pearls', 'salvage:horizon-wreck'],
  scenarios: ['follow-stationary', 'sailing-circuit', 'moving-dive-home-reef', 'moving-dive-sheltered-cove',
    'moving-dive-salvage:home-pearls', 'moving-dive-salvage:horizon-wreck', 'developed-raft'],
  menus: ['workshop', 'chart', 'journal', 'cabin'],
  loadingPhases: ['scene-module', 'scene-create', 'asset-manifest', 'atlas-decode', 'model-load', 'first-render'],
  viewport: { width: 1440, height: 900 }, dpr: 1, quality: 'high',
  // Finite deterministic allowances; both relative and absolute delta required.
  sizeMetrics: ['totalBytes', 'jsBytes', 'jsGzipBytes', 'cssBytes', 'cssGzipBytes', 'assetBytes'],
  sizes: {
    totalBytes: { relative: .01, absolute: 64 * 1024 },
    jsBytes: { relative: .02, absolute: 8 * 1024 }, jsGzipBytes: { relative: .02, absolute: 2 * 1024 },
    cssBytes: { relative: .02, absolute: 2 * 1024 }, cssGzipBytes: { relative: .02, absolute: 1024 },
    assetBytes: { relative: .01, absolute: 64 * 1024 },
  },
  resources: {
    geometries:{relative:.05,absolute:32},materials:{relative:.05,absolute:4},
    live:{relative:.05,absolute:32},textures:{relative:.05,absolute:2},
    storageEstimateBytes:{relative:.10,absolute:1024**2},
  },
  // Both relative and absolute delta must be exceeded to flag a timing regression.
  timing: {
    menuReadyMs: { relative: .15, absolute: 75, noise: .15 },
    playReadyMs: { relative: .15, absolute: 150, noise: .15 },
    menuOpenMs: { relative: .15, absolute: 25, noise: .15 },
    frameMedianMs: { relative: .15, absolute: 2, noise: .10 },
    frameP95Ms: { relative: .20, absolute: 4, noise: .15 },
    frameOver50Ratio: { relative: .25, absolute: .02, noise: .25 },
    rendererThreadCpuMsPerSecond: { relative: .20, absolute: 20, noise: .15 },
  },
  // Noise is measured across run summaries, using median absolute deviation.
  // Noisy evidence fails inconclusive. It never becomes an enlarged tolerance.
  memory: { heapBytes: { relative: .15, absolute: 8 * 1024 ** 2, noise: .15 },
    backingStorageBytes: { relative: .15, absolute: 8 * 1024 ** 2, noise: .15 },
    processRssBytes: { relative: .15, absolute: 32 * 1024 ** 2, noise: .15 } },
  hardware: { frameMedianMs: 20, frameP95Ms: 33.4 },
});

// A hosted SwiftShader runner is a separate compatibility/performance profile.
// High/shadows at 1440x900 remains the unchanged physical hardware acceptance.
export function policyForProfile(profile) {
  return profile==='ci-software' ? {...POLICY,repeats:3,viewport:{width:960,height:600},quality:'low'} : POLICY;
}
