import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  generate,
  restoreRecipe,
  canonicalLayout,
  VERSION,
} from "../tools/island-lab/generator.js";
import { checkEvidence } from "../scripts/island-lab/check-evidence.mjs";

test("maintained generator reproduces every retained v3 recipe exactly", async () => {
  for (const pass of ["p3", "p4"]) {
    const recipes = JSON.parse(
      await readFile(
        new URL(
          `../docs/decisions/evidence/biome-fidelity-v1/recipes/${pass}.json`,
          import.meta.url,
        ),
      ),
    );
    for (const original of recipes) {
      const { stats, fingerprint, version, ...expected } = original;
      const restored = restoreRecipe(original);
      const {
        fingerprint: identity,
        version: newVersion,
        ...actual
      } = restored;
      assert.equal(newVersion, VERSION);
      assert.deepEqual(actual, canonicalLayout(expected));
    }
  }
});
test("seeded layouts are deterministic, finite, distinct and keep biome signatures", () => {
  const signatures = new Set();
  for (const biome of ["A", "B", "C"])
    for (let n = 0; n < 20; n++) {
      const result = generate(biome, `validation-${n}`);
      assert.deepEqual(generate(biome, `validation-${n}`), result);
      signatures.add(result.fingerprint);
      assert.equal(result.routes.length, 3);
      assert.equal(Boolean(result.waterfall), biome === "B");
      assert.ok(result.objects.every((o) => o.role !== "arch"));
      for (const o of result.objects)
        for (const key of ["x", "z", "rx", "rz", "height"])
          assert.ok(Number.isFinite(o[key]));
    }
  assert.equal(signatures.size, 60);
});
test("malformed or incompatible recipes cannot become expensive or misleading scenes", () => {
  for (const args of [
    ["unknown", "seed"],
    ["__proto__", "seed"],
    ["A", ""],
    ["B", "a".repeat(81)],
    ["A", "seed", { height: Infinity }],
    ["A", "seed", { skerries: 999999 }],
    ["A", "seed", { shore: 5.5 }],
    ["A", "seed", { typo: 30 }],
    ["A", "seed", null],
  ])
    assert.throws(() => generate(...args));
  const recipe = generate("B", "recipe");
  assert.throws(() => restoreRecipe({ ...recipe, version: "future" }));
  assert.throws(() =>
    restoreRecipe({ ...recipe, rules: { ...recipe.rules, height: 50 } }),
  );
  assert.deepEqual(
    restoreRecipe({ ...recipe, objects: [{ untrusted: "ignored" }] }),
    recipe,
  );
});
test(
  "retained study assets and evidence still match their recorded bytes",
  checkEvidence,
);
