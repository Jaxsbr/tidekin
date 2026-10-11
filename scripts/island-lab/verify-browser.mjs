import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { restoreRecipe, generate } from "../../tools/island-lab/generator.js";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const base =
  process.env.ISLAND_LAB_URL ||
  "http://127.0.0.1:5188/tidekin/tools/island-lab/";
const out = resolve(root, "output/island-lab/verification");
await mkdir(out, { recursive: true });
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHANNEL
    ? { channel: process.env.PLAYWRIGHT_CHANNEL }
    : {},
);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (e) => {
  if (e.type() === "error") errors.push(e.text());
});
try {
  await page.goto(base + "?biome=B&seed=island-mqbxgd&pass=p4");
  await page.waitForFunction(() => window.islandLab);
  for (const biome of ["A", "B", "C"]) {
    await page.selectOption("#biome", biome);
    const recipe = await page.evaluate(() => window.islandLab.getRecipe());
    assert.deepEqual(
      recipe,
      generate(recipe.biome, recipe.seed, recipe.rules),
      "Node and browser layout identity",
    );
    await page.click("#generate");
    assert.deepEqual(
      await page.evaluate(() => window.islandLab.getRecipe()),
      recipe,
    );
  }
  await page.locator("#canopy").fill("170");
  await page.click("#generate");
  await page.reload();
  await page.waitForFunction(() => window.islandLab);
  assert.equal(
    (await page.evaluate(() => window.islandLab.getRecipe())).rules.canopy,
    170,
  );
  await page.click("canvas", { position: { x: 950, y: 500 } });
  const before = await page.evaluate(() => window.islandLab.getCamera());
  await page.keyboard.down("w");
  await page.waitForTimeout(160);
  await page.keyboard.up("w");
  assert.notDeepEqual(
    await page.evaluate(() => window.islandLab.getCamera()),
    before,
  );
  const typing = await page.evaluate(() => window.islandLab.getCamera());
  await page.fill("#seed", "wasdqe");
  await page.waitForTimeout(80);
  assert.deepEqual(
    await page.evaluate(() => window.islandLab.getCamera()),
    typing,
  );
  await page.check("#guides");
  await page.uncheck("#guides");
  const originals = JSON.parse(
    await readFile(
      resolve(
        root,
        "docs/decisions/evidence/biome-fidelity-v1/recipes/p4.json",
      ),
    ),
  );
  const original = originals.find(
    (r) => r.biome === "B" && r.seed === "island-mqbxgd",
  );
  await page.setInputFiles("#import", {
    name: "legacy.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(original)),
  });
  await page.waitForFunction(() =>
    document.querySelector("#toast").textContent.includes("restored as v4"),
  );
  assert.deepEqual(
    await page.evaluate(() => window.islandLab.getRecipe()),
    restoreRecipe(original),
  );
  const expected = await page.evaluate(() => window.islandLab.getRecipe());
  await page.setInputFiles("#import", {
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...expected, version: "future" })),
  });
  await page.waitForFunction(() =>
    document.querySelector("#toast").textContent.includes("Unsupported recipe"),
  );
  assert.deepEqual(
    await page.evaluate(() => window.islandLab.getRecipe()),
    expected,
    "Bad import preserves the current scene",
  );
  const download = page.waitForEvent("download");
  await page.click("#export");
  const file = await download;
  const exported = JSON.parse(await readFile(await file.path(), "utf8"));
  assert.deepEqual(restoreRecipe(exported), expected);
  assert.equal(exported.humanApproval, null);
  await page.setInputFiles("#import", {
    name: "roundtrip.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await page.waitForFunction(() =>
    document.querySelector("#toast").textContent.includes("restored as v4"),
  );
  const stats = await page.evaluate(() => window.islandLab.getStats());
  for (let i = 0; i < 8; i++) await page.click("#generate");
  await page.waitForTimeout(100);
  const finalStats = await page.evaluate(() => window.islandLab.getStats());
  assert.equal(stats.geometries, finalStats.geometries);
  assert.equal(stats.textures, finalStats.textures);
  assert.deepEqual(
    await page.evaluate(() => [
      Object.keys(localStorage),
      Object.keys(sessionStorage),
    ]),
    [[], []],
  );
  await page.screenshot({ path: resolve(out, "lab.png") });
  const gallery = new URL("../../docs/studies/biome-review.html", base);
  await page.goto(gallery.href);
  await page.waitForFunction(
    () => document.querySelector("#score").textContent,
  );
  for (const biome of ["A", "B", "C"])
    for (const pass of ["legacy-v1", "p0", "p1", "p2", "p3", "p4"]) {
      await page.selectOption("#biome", biome);
      await page.selectOption("#pass", pass);
      await page.waitForFunction(() =>
        [...document.querySelectorAll("img")].every(
          (i) => i.complete && i.naturalWidth > 0,
        ),
      );
      const link = await page.locator("#play").getAttribute("href");
      const response = await page.request.get(new URL(link, page.url()).href);
      assert.ok(response.ok(), link);
    }
  for (const angle of ["0", "1", "2", "3", "4"]) {
    await page.selectOption("#angle", angle);
    await page.waitForFunction(
      () =>
        document.querySelector("#render").complete &&
        document.querySelector("#render").naturalWidth > 0,
    );
  }
  await page.selectOption("#biome", "B");
  await page.selectOption("#angle", "0");
  await page.screenshot({ path: resolve(out, "review.png"), fullPage: true });
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(out, "result.json"),
    JSON.stringify(
      {
        browser: browser.version(),
        checks:
          "Three biomes cross-engine deterministic; regen; URL; flight; typing; guides; v3 upgrade; invalid import; export/import; eight regenerations; storage isolation; 18 gallery combinations and five final angles",
        stats,
        finalStats,
        errors,
        limitations: "No gameplay, collision or performance certification.",
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Island lab browser verification passed. Evidence: " + out);
} finally {
  await browser.close();
}
