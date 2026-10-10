import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { inspectAssetFile, collectRuntimeReferences, validateCatalogue } from './catalogue.mjs';

// Refresh known byte identities and observed consumers, never invent provenance,
// source relationships, new IDs, or human approval. Run after art integration.
const root = resolve(process.argv[2] ?? '.');
const path = resolve(root, 'assets/catalogue.json');
const catalogue = JSON.parse(await readFile(path, 'utf8'));
const references = await collectRuntimeReferences(root);
for (const asset of catalogue.assets) {
  const actual = await inspectAssetFile(resolve(root, asset.path));
  if (actual.sha256 !== asset.sha256 && asset.status === 'approved') {
    asset.previousApprovals ??= [];
    asset.previousApprovals.push(asset.approval);
    asset.approval = null;
    asset.status = 'baseline';
  }
  Object.assign(asset, actual);
  asset.consumers = references.filter(ref => ref.path === asset.path).map(ref => ({ path: ref.consumer, locator: ref.locator }));
}
const result = await validateCatalogue(catalogue, { root });
if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  catalogue.refreshedAt = new Date().toISOString();
  await writeFile(path, JSON.stringify(catalogue, null, 2) + '\n');
  console.log(`Refreshed ${catalogue.assets.length} existing asset records. Approval state was never promoted.`);
}
