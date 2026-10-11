export const VERSION = "island-lab-v4";
export const BIOMES = {
  A: {
    name: "Lagoon",
    summary:
      "An open lagoon wrapped by unequal sandy limestone islands, with no arch.",
    rules: [
      "Three broad water gaps around the lagoon.",
      "Curving sandy shores and lower offshore rocks on every side.",
      "Unequal limestone heights, palms and coastal broadleaf groves.",
    ],
    finding: "Storm timber on sheltered sand",
    defaults: {
      height: 48,
      skerries: 18,
      width: 28,
      smoothness: 70,
      foliage: 60,
      shore: 16,
      water: 75,
      weathering: 65,
    },
  },
  B: {
    name: "Waterfall island",
    summary:
      "A lush spring island with a tall limestone crown and satellite coves.",
    rules: [
      "A central waterfall landmark, with coves around its reverse side.",
      "Three open water approaches among separate satellite islands.",
      "Low shore rocks rise through planted shelves to high cliffs.",
    ],
    finding: "Tangled stream outlet",
    defaults: {
      height: 67,
      skerries: 20,
      width: 28,
      smoothness: 70,
      foliage: 65,
      shore: 14,
      water: 80,
      weathering: 70,
    },
  },
  C: {
    name: "Mangrove shoals",
    summary:
      "Rooted broadleaf islands, shallow channels and a modest inland rock ridge.",
    rules: [
      "Low mangrove canopy dominates from every direction.",
      "Exposed branching roots meet water; palms stay on dry sand.",
      "Multiple channels link the shoals to open ocean.",
    ],
    finding: "Stranded nets among the roots",
    defaults: {
      height: 30,
      skerries: 22,
      width: 26,
      smoothness: 75,
      foliage: 75,
      shore: 19,
      water: 85,
      weathering: 60,
    },
  },
};
export const CONTROLS = {
  canopy: { label: "Canopy scale", min: 100, max: 320 },
  relief: { label: "Limestone ledges / relief", min: 0, max: 100 },
  ripple: { label: "Irregular water detail", min: 0, max: 100 },
  height: { label: "Peak height", min: 18, max: 90 },
  skerries: { label: "Outer rocks / islets", min: 6, max: 36 },
  width: { label: "Access gap width", min: 20, max: 42 },
  smoothness: { label: "Geometry smoothness", min: 0, max: 100 },
  foliage: { label: "Foliage density / layers", min: 0, max: 100 },
  shore: { label: "Beach / shallow shelf width", min: 5, max: 25 },
  water: { label: "Shallow-water contrast", min: 0, max: 100 },
  weathering: { label: "Rock and coast irregularity", min: 0, max: 100 },
};
export function rng(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function fingerprint(value) {
  let h = 2166136261;
  for (const c of JSON.stringify(value))
    h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0");
}
export function generate(biome, seed, input) {
  const rules = validateInput(biome, seed, input),
    rand = rng("island-lab-v2" + biome + seed);
  const range = (a, b) => a + (b - a) * rand(),
    objects = [];
  const phase = range(-0.15, 0.15);
  const gaps = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a) => a + phase);
  const signed = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  function add(role, x, z, rx, rz, height, extra = {}) {
    objects.push({
      id: objects.length,
      role,
      x,
      z,
      rx,
      rz,
      height,
      shape: range(0, 100),
      rotation: 0,
      ...extra,
    });
    return objects.at(-1);
  }
  const sectorCenters = gaps.map((a) => a + Math.PI / 3);
  for (let i = 0; i < 3; i++) {
    const a = sectorCenters[i] + range(-0.1, 0.1),
      radius = biome === "A" ? 64 : biome === "B" ? 65 : 51;
    const x = Math.sin(a) * radius,
      z = Math.cos(a) * radius;
    const size =
      biome === "A"
        ? range(24, 31)
        : biome === "B"
          ? range(16, 22)
          : range(23, 29);
    const base = add(
      biome === "C" ? "wetland" : "island",
      x,
      z,
      size,
      size * range(0.75, 1.02),
      biome === "C" ? range(1.1, 2.3) : range(2.5, 4),
      { shore: true, vegetation: biome === "C" ? "mangrove" : "coastal" },
    );
    if (biome !== "C") {
      const peak = add(
        "rock",
        x + range(-5, 5),
        z + range(-5, 5),
        size * 0.65,
        size * 0.56,
        rules.height * range(0.43, 0.88),
        { vegetation: "cliff" },
      );
      add(
        "rock",
        x + size * 0.43,
        z - size * 0.22,
        size * 0.39,
        size * 0.35,
        peak.height * 0.53,
        { vegetation: "cliff" },
      );
    } else if (i === 1)
      add("rock", x, z, size * 0.42, size * 0.35, rules.height * 0.74, {
        vegetation: "cliff",
      });
  }
  let waterfall = null;
  if (biome === "B") {
    add("island", 0, -4, 33, 30, 4.5, {
      shore: true,
      vegetation: "rainforest",
    });
    add("rock", -8, -10, 23, 19, rules.height, { vegetation: "cliff" });
    add("rock", 12, -13, 18, 17, rules.height * 0.66, { vegetation: "cliff" });
    waterfall = { x: -5, z: 9, height: rules.height * 0.66, base: 1.2 };
  } else if (biome === "C") {
    add("wetland", -11, -5, 17, 17, 1.6, {
      shore: true,
      vegetation: "mangrove",
    });
    add("wetland", 22, 6, 12, 14, 1.2, { shore: true, vegetation: "mangrove" });
  }
  // Radial access sectors reserve water from offshore to the inner basin/central shore.
  for (let i = 0; i < rules.skerries; i++) {
    const r = range(93, 139),
      group = i % 3,
      a = sectorCenters[group] + range(-0.45, 0.45),
      x = Math.sin(a) * r,
      z = Math.cos(a) * r;
    const rx = range(2.8, 8.7),
      rz = rx * range(0.7, 1.2);
    const low = biome === "C" && i % 3 === 0;
    add(
      low ? "wetland" : i % 4 === 0 ? "islet" : "boulder",
      x,
      z,
      rx,
      rz,
      low ? 1.3 : range(1.5, 6.5),
      {
        shore: low || i % 4 === 0,
        vegetation: low ? "mangrove" : i % 4 === 0 ? "coastal" : null,
      },
    );
  }
  // Attached shore stones remain near their owning island, never copy-pasted into a front row.
  for (const base of [...objects].filter((o) =>
    ["island", "wetland"].includes(o.role),
  ))
    for (let i = 0; i < 5; i++) {
      const a = range(0, Math.PI * 2);
      add(
        "boulder",
        base.x + Math.sin(a) * base.rx * 0.92,
        base.z + Math.cos(a) * base.rz * 0.92,
        range(2.1, 4.4),
        range(2, 4),
        range(1.6, 4),
        {},
      );
    }
  // Width actually shifts the major land clusters away from access rays when necessary.
  for (const o of objects) {
    if (Math.hypot(o.x, o.z) < 40) continue;
    const angle = Math.atan2(o.x, o.z),
      r = Math.hypot(o.x, o.z);
    let nearest = gaps.reduce(
      (best, a) =>
        Math.abs(signed(angle - a)) < Math.abs(signed(angle - best)) ? a : best,
      gaps[0],
    );
    const perpendicular = Math.abs(Math.sin(angle - nearest) * r),
      needed = rules.width / 2 + Math.max(o.rx, o.rz) * (o.shore ? 1.18 : 1);
    if (perpendicular < needed) {
      const shift = needed - perpendicular;
      const sign = signed(angle - nearest) > 0 ? 1 : -1;
      o.x += Math.cos(nearest) * shift * sign;
      o.z -= Math.sin(nearest) * shift * sign;
    }
  }
  const routes = gaps.map((a) =>
    Array.from({ length: 18 }, (_, i) => {
      const r = 210 - i * (biome === "B" ? 8.2 : 10.8);
      return { x: Math.sin(a) * r, z: Math.cos(a) * r };
    }),
  );
  const landings = objects
    .filter((o) => ["island", "wetland"].includes(o.role))
    .slice(0, 3)
    .map((o) => ({ x: o.x * 0.82, z: o.z * 0.82 }));
  const result = {
    version: VERSION,
    biome,
    seed,
    rules,
    objects,
    waterfall,
    routes,
    landings,
  };
  const stable = canonicalLayout(result);
  return { ...stable, fingerprint: fingerprint(stable) };
}

// v3's layout stream is intentionally retained from v2. Changing generated values
// requires a new VERSION and a migration or a preserved old recipe implementation.
function validateInput(biome, seed, input = {}) {
  if (!Object.hasOwn(BIOMES, biome))
    throw new Error("Unknown biome; choose A, B or C.");
  if (typeof seed !== "string" || !seed.trim() || seed.length > 80)
    throw new Error("Seed must contain 1–80 characters.");
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Settings must be an object.");
  for (const key of Object.keys(input))
    if (!Object.hasOwn(CONTROLS, key))
      throw new Error("Unknown setting: " + key);
  const rules = {
    canopy: 220,
    relief: 75,
    ripple: 75,
    ...BIOMES[biome].defaults,
    ...input,
  };
  for (const [key, { min, max }] of Object.entries(CONTROLS)) {
    if (!Number.isInteger(rules[key]) || rules[key] < min || rules[key] > max)
      throw new Error(`${key} must be an integer from ${min} to ${max}.`);
  }
  return rules;
}

// Math.sin/cos differ at the last bit across JS engines. Quantize spatial output
// to 1e-8 world units before computing identity; full-byte hashes remain in evidence.
export function canonicalLayout(value) {
  return JSON.parse(
    JSON.stringify(value, (_key, v) =>
      typeof v === "number" ? Math.round(v * 1e8) / 1e8 : v,
    ),
  );
}

// Import parameters, then regenerate trusted geometry. Never execute scene data.
export function restoreRecipe(value) {
  if (!value || ![VERSION, "island-lab-v3"].includes(value.version))
    throw new Error(
      "Unsupported recipe version; use its retained historical tool.",
    );
  const recipe = generate(value.biome, value.seed, value.rules);
  if (value.version === "island-lab-v3") {
    const {
      version,
      biome,
      seed,
      rules,
      objects,
      waterfall,
      routes,
      landings,
    } = value;
    const legacy = {
      version,
      biome,
      seed,
      rules,
      objects,
      waterfall,
      routes,
      landings,
    };
    if (
      fingerprint(legacy) !== value.fingerprint ||
      JSON.stringify(canonicalLayout({ ...legacy, version: VERSION })) !==
        JSON.stringify(
          Object.fromEntries(
            Object.entries(recipe).filter(([key]) => key !== "fingerprint"),
          ),
        )
    )
      throw new Error(
        "Legacy recipe geometry or identity does not match its settings.",
      );
  } else if (value.fingerprint !== recipe.fingerprint)
    throw new Error("Recipe identity does not match its settings.");
  return recipe;
}
