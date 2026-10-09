#!/usr/bin/env node
/**
 * Guided, visible-UI novice observation recorder for Tidekin. Uses a disposable
 * Chrome profile and records only screenshots plus visible page text; it does
 * not inspect game internals or QA hooks.
 *
 * Run from the repository root: node scripts/playtest-novice.mjs
 * Optional local candidate: TIDEKIN_URL=http://127.0.0.1:5180 node scripts/playtest-novice.mjs
 */
import { chromium } from 'playwright';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targetUrl = process.env.TIDEKIN_URL ?? 'http://127.0.0.1:5179';
if (!/^http:\/\/127\.0\.0\.1:(5179|5180)$/.test(targetUrl)) {
  throw new Error('TIDEKIN_URL must be http://127.0.0.1:5179 or http://127.0.0.1:5180.');
}
const stamp = new Date().toISOString().replaceAll(':', '-');
const outputDir = join(repoRoot, 'captures', `novice-${stamp}`);
const profileDir = await mkdtemp(join(tmpdir(), 'tidekin-novice-chrome-'));
const terminal = createInterface({ input: stdin, output: stdout });
const evidence = { url: targetUrl, startedAt: new Date().toISOString(), checkpoints: [] };
let context;

async function checkpoint(page, name, note, startedAt) {
  const capturedAt = new Date();
  const screenshot = `${name}.png`;
  await page.screenshot({ path: join(outputDir, screenshot) });
  const visibleText = await page.locator('body').innerText().catch(() => '');
  evidence.checkpoints.push({
    name,
    note,
    capturedAt: capturedAt.toISOString(),
    elapsedMs: startedAt ? capturedAt.getTime() - startedAt : null,
    screenshot,
    visibleText,
  });
  console.log(`\nCaptured ${screenshot} (${capturedAt.toISOString()}).`);
  if (visibleText.trim()) console.log(`Visible text excerpt:\n${visibleText.trim().slice(0, 1800)}\n`);
}

async function prompt(message) {
  await terminal.question(`\n${message}\nPress Enter when ready. `);
}

try {
  await mkdir(outputDir, { recursive: true });
  context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: false,
    args: ['--no-first-run', '--no-default-browser-check'],
  });
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await checkpoint(page, '01-title', 'Fresh isolated profile at title screen.', null);

  await prompt('In the visible Chrome window, choose Start new voyage and wait for the onboarding panel.');
  await checkpoint(page, '02-onboarding', 'First exposure to onboarding copy.', null);

  await prompt('Read the onboarding as presented, click Begin voyage, and press Enter here immediately after the voyage begins. The five-minute timer starts on that Enter.');
  const trialStartedAt = Date.now();
  evidence.trialStartedAt = new Date(trialStartedAt).toISOString();
  await prompt('Use only visible game UI. Try to gather a first resource, build the first upgrade, dive and surface, then save and return. Stop at five minutes or when the loop is complete, whichever comes first.');
  await checkpoint(page, '03-first-five-minutes', 'End of the novice timebox or completed first loop.', trialStartedAt);

  await prompt('If you are not already at the title screen, pause and choose Save & return to title. Stop at the title screen showing the saved voyage.');
  await checkpoint(page, '04-saved-title', 'Saved voyage visible from the title screen.', trialStartedAt);

  await prompt('Choose Continue voyage in the visible UI and wait for the voyage HUD to return.');
  await checkpoint(page, '05-continued-voyage', 'State visible after returning to the saved voyage.', trialStartedAt);

  evidence.finishedAt = new Date().toISOString();
  await writeFile(join(outputDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`\nEvidence saved under ${outputDir}`);
} catch (error) {
  console.error(`Novice recorder stopped: ${error?.message ?? error}`);
  if (!context) console.error('Chrome did not launch. No game page was opened; the temporary isolated profile will be removed.');
  process.exitCode = 1;
} finally {
  terminal.close();
  await context?.close().catch(() => {});
  await rm(profileDir, { recursive: true, force: true }).catch(() => {});
}
