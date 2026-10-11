import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { restoreRecipe } from "../../tools/island-lab/generator.js";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const base =
  process.env.ISLAND_LAB_URL ||
  "http://127.0.0.1:5188/tidekin/tools/island-lab/";
const pass = process.argv[2] || "p4";
if (!["p3", "p4", "recipe"].includes(pass))
  throw new Error(
    "Use p3, p4, or recipe <run-name> <export.json>; historical passes need their frozen engine.",
  );
let inputs;
if (pass === "recipe") {
  if (!process.argv[4])
    throw new Error("Provide an exported recipe JSON path.");
  const imported = JSON.parse(await readFile(resolve(process.argv[4]), "utf8"));
  inputs = (Array.isArray(imported) ? imported : [imported]).map(restoreRecipe);
  if (!inputs.length || inputs.length > 100)
    throw new Error("Supply 1–100 recipes.");
} else
  inputs = ["A", "B", "C"].flatMap((biome) =>
    ["waterfall-01", "island-mqbxgd", "study-03"].map((seed) => ({
      biome,
      seed,
    })),
  );
// An existing directory is deliberately an error: never overwrite reviewed evidence.
const out = resolve(
  root,
  "output/island-lab",
  process.argv[3] || new Date().toISOString().replaceAll(":", "-"),
);
if (!out.startsWith(resolve(root, "output/island-lab") + "/"))
  throw new Error("Choose a run name within output/island-lab.");
await mkdir(dirname(out), { recursive: true });
await mkdir(out);
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHANNEL
    ? { channel: process.env.PLAYWRIGHT_CHANNEL }
    : {},
);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }),
  errors = [],
  records = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (e) => {
  if (e.type() === "error") errors.push(e.text());
});
const hashes = {};
for (const file of [
  "generator.js",
  "scene.js",
  "lab.js",
  "presets.js",
  "index.html",
])
  hashes[file] = createHash("sha256")
    .update(await readFile(resolve(root, "tools/island-lab", file)))
    .digest("hex");
try {
  for (const [n, input] of inputs.entries()) {
    const { biome, seed } = input;
    const url = new URL(base);
    url.search = new URLSearchParams({
      biome,
      seed,
      pass: pass === "recipe" ? "p4" : pass,
      ...input.rules,
      capture: "1",
    });
    await page.goto(url.href);
    await page.waitForFunction(() => window.islandLab);
    const recipe = await page.evaluate(() => window.islandLab.getRecipe());
    const regenerated = restoreRecipe(recipe);
    assert.deepEqual(
      recipe,
      regenerated,
      "Served tool must match the local generator",
    );
    if (pass === "recipe") assert.equal(recipe.fingerprint, input.fingerprint);
    for (let angle = 0; angle < 5; angle++) {
      await page.evaluate(async (i) => {
        window.islandLab.reviewAngle(i);
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
      }, angle);
      await page.screenshot({
        path: resolve(out, `${biome}-${n}-${angle}.png`),
      });
    }
    records.push({
      ...recipe,
      stats: await page.evaluate(() => window.islandLab.getStats()),
    });
  }
} finally {
  await writeFile(
    resolve(out, "recipes.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  await writeFile(
    resolve(out, "run.json"),
    JSON.stringify(
      {
        pass,
        url: base,
        browser: browser.version(),
        viewport: { width: 1280, height: 800 },
        clock: 12,
        sourceHashes: hashes,
        commit: execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: root,
          encoding: "utf8",
        }).trim(),
        dirty: execFileSync("git", ["status", "--porcelain"], {
          cwd: root,
          encoding: "utf8",
        }),
        errors,
        humanApproval: null,
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
}
if (errors.length) throw new Error(errors.join("\n"));
console.log(
  `${records.length} recipes and ${records.length * 5} matched views saved to ${out}`,
);
