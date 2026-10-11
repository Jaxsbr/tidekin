import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export async function checkEvidence() {
  const evidence = "docs/decisions/evidence/biome-fidelity-v1";
  const manifest = JSON.parse(
    await readFile(resolve(root, evidence, "manifest.json")),
  );
  const catalogue = JSON.parse(
    await readFile(resolve(root, "assets/biome-study-catalogue.json")),
  );
  const records = [
    ...manifest.files.map((f) => ({ ...f, path: `${evidence}/${f.path}` })),
    ...catalogue.assets,
  ];
  for (const record of records) {
    const bytes = await readFile(resolve(root, record.path));
    assert.equal(bytes.length, record.bytes, record.path + " bytes");
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      record.sha256,
      record.path + " SHA-256",
    );
  }
  const ids = new Set(catalogue.assets.map((a) => a.id));
  assert.equal(ids.size, catalogue.assets.length, "Unique study asset IDs");
  for (const asset of catalogue.assets) {
    assert.equal(asset.approval, null);
    assert.deepEqual(asset.consumers, []);
    for (const source of asset.sources) assert.ok(ids.has(source), source);
    for (const evidence of asset.origin.evidence)
      await readFile(resolve(root, evidence.path));
  }
  return {
    manifestFiles: manifest.files.length,
    catalogueAssets: catalogue.assets.length,
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  console.log(await checkEvidence());
