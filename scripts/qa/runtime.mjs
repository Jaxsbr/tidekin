import assert from "node:assert/strict";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  inventory,
  sourceFingerprint,
  sha256,
  digest,
} from "../performance/evidence.mjs";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export const viewports = [
  { width: 1440, height: 900 },
  { width: 900, height: 900 },
];
export const characterCases = viewports.flatMap(({ width, height }) =>
  ["ordinary-motion", "reduced-motion"].map(
    (motion) => `${width}x${height}-${motion}`,
  ),
);
export const hash = sha256;
export const state = (page) => page.evaluate(() => window.__tidekin.getState());
export const metrics = (page) =>
  page.evaluate(() => window.__tidekin.getMetrics());

export function options(kind, args = process.argv.slice(2)) {
  const flags = new Set([
    "--run",
    "--prepare",
    "--help",
    "--browser-released",
    "--build-ready",
    "--outside-benchmark",
    "--headed",
    "--anchor-only",
    "--inert-only",
  ]);
  const keys = new Set([
    "url",
    "build",
    "out",
    "expected-entry",
    "expected-scene",
    "expected-css",
    "deadline-ms",
    "suite",
    "label",
    "source-root",
    "source-ref",
    "case",
  ]);
  const values = {};
  const selected = new Set();
  for (const arg of args) {
    if (flags.has(arg)) {
      assert(!selected.has(arg), `Duplicate ${arg}`);
      selected.add(arg);
      continue;
    }
    const match = arg.match(/^--([^=]+)=(.+)$/);
    assert(match && keys.has(match[1]), `Unknown or empty argument: ${arg}`);
    assert(!(match[1] in values), `Duplicate --${match[1]}`);
    values[match[1]] = match[2];
  }
  assert(
    !(selected.has("--run") && selected.has("--prepare")),
    "Choose prepare or run",
  );
  const run = selected.has("--run") && !selected.has("--help");
  assert(
    !selected.has("--anchor-only") || kind === "character",
    "--anchor-only is character-only",
  );
  assert(!selected.has("--inert-only") || kind === "character", "--inert-only is character-only");
  assert(!(selected.has("--inert-only") && selected.has("--anchor-only")), "Choose inert-only or anchor-only");
  const deadlineMs = Number(values["deadline-ms"] ?? 600000);
  assert(
    Number.isInteger(deadlineMs) && deadlineMs >= 1000 && deadlineMs <= 900000,
    "Deadline must be 1000..900000 ms",
  );
  const suite = values.suite ?? "all";
  assert(
    ["all", "earned-only", "fixtures-only"].includes(suite),
    "Invalid gameplay suite",
  );
  if (values.case)
    assert(
      kind === "character" && characterCases.includes(values.case),
      `Character --case must be one of: ${characterCases.join(", ")}`,
    );
  assert(
    Boolean(values["source-root"]) === Boolean(values["source-ref"]),
    "Baseline --source-root and --source-ref must be supplied together",
  );
  if (values["source-ref"])
    assert(
      /^[a-f0-9]{40}$/i.test(values["source-ref"]),
      "--source-ref requires an immutable full commit SHA",
    );
  if (run) {
    if (selected.has("--anchor-only"))
      assert(
        values.case,
        "Focused anchor validation requires explicit --case=",
      );
    for (const flag of ["--browser-released", "--build-ready"])
      assert(selected.has(flag), `${flag} required before browser activation`);
    if (kind === "character")
      assert(
        selected.has("--outside-benchmark"),
        "Character filming requires --outside-benchmark",
      );
    for (const key of ["url", "build", "out", "expected-entry"])
      assert(values[key], `Explicit --${key}= required`);
  }
  let url;
  if (values.url) {
    const parsed = new URL(values.url);
    assert(
      parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(parsed.hostname),
      "Local HTTP production URL required",
    );
    assert(
      !parsed.username &&
        !parsed.password &&
        parsed.pathname === "/" &&
        !parsed.search &&
        !parsed.hash,
      "URL must be a local origin",
    );
    url = parsed.origin;
  }
  const out = values.out ? resolve(root, values.out) : null;
  if (out)
    assert(
      out.startsWith(resolve(root, "captures") + sep),
      "Evidence must live inside this project captures/ directory",
    );
  for (const [key, suffix] of [
    ["expected-entry", ".js"],
    ["expected-scene", ".js"],
    ["expected-css", ".css"],
  ]) {
    if (values[key])
      assert(
        !/[\\/]/.test(values[key]) && values[key].endsWith(suffix),
        `--${key} needs an exact asset basename`,
      );
  }
  return {
    kind,
    run,
    url,
    out,
    build: values.build ? resolve(root, values.build) : null,
    sourceRoot: values["source-root"]
      ? resolve(root, values["source-root"])
      : root,
    sourceRef: values["source-ref"] ?? null,
    expectedEntry: values["expected-entry"],
    expectedScene: values["expected-scene"],
    expectedCss: values["expected-css"],
    label:
      values.label ??
      (values["source-ref"]
        ? `baseline-${values["source-ref"].slice(0, 7)}`
        : "current-candidate"),
    suite,
    selectedCase: values.case ?? null,
    anchorOnly: selected.has("--anchor-only"),
    inertOnly: selected.has("--inert-only"),
    deadlineMs,
    headed: selected.has("--headed"),
  };
}

export const loadGame = (config) =>
  import(pathToFileURL(resolve(config.sourceRoot, "src/game.js")).href);

export function prepareMessage(config) {
  console.log(
    `${config.kind}: prepared only; no browser, GPU, server, network, or evidence writes.\n` +
      "Run only after explicit user/coordinator release: --run --browser-released --build-ready --url=http://127.0.0.1:PORT --build=PATH --out=captures/current-improvement/qa/NEW --expected-entry=index-HASH.js [--expected-scene=scene-HASH.js --expected-css=index-HASH.css] [--headed] [--deadline-ms=600000]\n" +
      (config.kind === "character"
        ? `Filming additionally requires --outside-benchmark; ffmpeg and ffprobe must be installed. Default runs all four cases at native size/default camera. Optional --case=${characterCases.join("|")} selects exactly one case; selected=${config.selectedCase ?? "all"}. --anchor-only captures just genuine reach/rest after inert calibration; --inert-only runs only that synthetic recorder calibration, never a game case. Neither replaces the full sequence.`
        : "Default suite=all includes labelled synthetic fixtures AND fresh earned keyboard/pointer cases at both viewports. Optional --suite=earned-only|fixtures-only.") +
      "\nBaseline: --source-root=EXISTING_IMMUTABLE_SNAPSHOT --source-ref=FULL_SHA; exact source tree is checked against this repository. Existing evidence is never replaced; no build or server is started.",
  );
}

export async function fingerprint(config) {
  const build = await inventory(config.build);
  const html = await readFile(resolve(config.build, "index.html"), "utf8");
  assert(
    !/\/@vite\/client|\/src\/|\/node_modules\//.test(html),
    "Production HTML required",
  );
  assert(
    html.includes(`/assets/${config.expectedEntry}`),
    "Expected entry differs from production HTML",
  );
  const entry = await readFile(
    resolve(config.build, "assets", config.expectedEntry),
    "utf8",
  );
  if (config.expectedScene)
    assert(
      entry.includes(config.expectedScene),
      "Expected scene is not referenced by the entry",
    );
  if (config.expectedCss)
    assert(
      html.includes(`/assets/${config.expectedCss}`),
      "Expected CSS differs from HTML",
    );
  const served = [];
  for (const path of ["/", ...build.files.map((file) => "/" + file.path)]) {
    const response = await fetch(config.url + path, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    assert(response.ok, `HTTP ${response.status}: ${path}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const expected = build.files.find(
      (file) => file.path === (path === "/" ? "index.html" : path.slice(1)),
    );
    assert.equal(
      hash(bytes),
      expected.sha256,
      `Served bytes differ from selected build: ${path}`,
    );
    served.push({ path, bytes: bytes.length, sha256: hash(bytes) });
  }
  const sources = await sourceFingerprint(
    config.sourceRoot,
    config.sourceRef
      ? { revision: config.sourceRef, gitRoot: root }
      : { gitRoot: root },
  );
  const tools = [];
  for (const path of [
    ...(await readdir(resolve(root, "scripts/qa")))
      .filter((name) => name.endsWith(".mjs"))
      .sort()
      .map((name) => `scripts/qa/${name}`),
    "scripts/performance/evidence.mjs",
    "scripts/performance/fixtures.mjs",
  ]) {
    tools.push({ path, sha256: hash(await readFile(resolve(root, path))) });
  }
  return {
    build,
    sources,
    served: { files: served, hash: digest(served) },
    harness: { files: tools, hash: digest(tools) },
  };
}

export async function interactive(page) {
  await page.waitForFunction(
    () => {
      const qa = window.__tidekin,
        m = qa?.getMetrics();
      return (
        qa?.getState() &&
        m?.activeRenderedFrames > 0 &&
        !m.paused &&
        m.visibility === "visible" &&
        !document.getElementById("game-view").hidden &&
        !document.getElementById("modal-dialog").open
      );
    },
    null,
    { timeout: 30000 },
  );
  await page.locator("#game-canvas").focus();
}

export async function execute(
  config,
  Game,
  plan,
  { preflight, finalize } = {},
) {
  if (!config.run) {
    prepareMessage(config);
    return;
  }
  await mkdir(dirname(config.out), { recursive: true });
  await mkdir(config.out); // Exclusive output directory: do not overwrite a previous run.
  const report = {
    schema: 1,
    kind: config.kind,
    config,
    startedAt: new Date().toISOString(),
    cases: [],
    errors: [],
    method:
      "Isolated installed Chrome contexts; production served/build/source fingerprints before and after. Real keyboard/pointer movement; no clock injection, camera override, live-state teleport, build or server mutation. QA captures are not performance evidence.",
    manualGates: [
      "Native-size visual/ordinary-speed motion review",
      "Accessible DOM checks do not certify spoken screen-reader behavior",
    ],
  };
  let browser, timer, signalHandler, work;
  let stopped = false;
  const abort = new AbortController();
  const contexts = new Set();
  const pendingWrites = () =>
    writeFile(
      resolve(config.out, "results.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
  try {
    report.before = await fingerprint(config);
    await writeFile(
      resolve(config.out, "fingerprint-before.json"),
      JSON.stringify(report.before, null, 2) + "\n",
    );
    if (preflight) report.preflight = await preflight();
    const { chromium } = await import("@playwright/test"); // Only reachable after every explicit run gate.
    browser = await chromium.launch({
      channel: "chrome",
      headless: !config.headed,
      timeout: 30000,
    });
    report.browser = {
      version: browser.version(),
      channel: "chrome",
      headed: config.headed,
    };
    async function runCase(
      name,
      viewport,
      fixture,
      fn,
      { settings, video = false } = {},
    ) {
      assert(!stopped, "QA run stopped; no further contexts may start");
      const dir = resolve(config.out, name);
      await mkdir(dir);
      const r = {
        name,
        viewport,
        fixture: fixture ? { label: fixture.label } : null,
        checks: [],
        inputs: [],
        observations: [],
        errors: [],
        status: "running",
      };
      report.cases.push(r);
      let context, page;
      try {
        context = await browser.newContext({
          viewport,
          deviceScaleFactor: 1,
          locale: "en-NZ",
          timezoneId: "Pacific/Auckland",
          reducedMotion: settings?.reducedMotion ? "reduce" : "no-preference",
          serviceWorkers: "block",
          ...(video
            ? {
                recordVideo: { dir: resolve(dir, "raw-video"), size: viewport },
              }
            : {}),
        });
        contexts.add(context);
        const save = fixture ? Game.serializeGame(fixture.state) : null;
        if (save) {
          Game.deserializeGame(save);
          r.fixture.saveSha256 = hash(save);
        }
        if (save || settings)
          await context.addInitScript(
            ({ save, settings }) => {
              if (save && localStorage.getItem("tidekin.save.v2") === null)
                localStorage.setItem("tidekin.save.v2", save);
              if (
                settings &&
                localStorage.getItem("tidekin.settings.v1") === null
              )
                localStorage.setItem(
                  "tidekin.settings.v1",
                  JSON.stringify(settings),
                );
            },
            { save, settings },
          );
        r.videoStartedAt = video ? Date.now() : null;
        page = await context.newPage();
        page.setDefaultTimeout(10000);
        page.on("pageerror", (error) => r.errors.push(String(error)));
        page.on("console", (message) => {
          if (message.type() === "error")
            r.errors.push(`console: ${message.text()}`);
        });
        page.on("requestfailed", (request) =>
          r.errors.push({ url: request.url(), failure: request.failure() }),
        );
        page.on("response", (response) => {
          if (response.status() >= 400)
            r.errors.push(`HTTP ${response.status()} ${response.url()}`);
        });
        const h = {
          p: page,
          r,
          dir,
          state: () => state(page),
          check: (label, ok, detail) => {
            r.checks.push({ label, ok: Boolean(ok), detail });
            assert.ok(ok, label);
          },
          key: async (key, ms = 0) => {
            r.inputs.push({ key, ms, at: Date.now() });
            if (!ms) return page.keyboard.press(key);
            await page.keyboard.down(key);
            try {
              await page.waitForTimeout(ms);
            } finally {
              await page.keyboard.up(key);
            }
          },
          click: async (selector) => {
            r.inputs.push({ click: selector, at: Date.now() });
            await page.locator(selector).click();
          },
          shot: async (label, { settleMs } = {}) => {
            assert(
              /^[a-zA-Z0-9_-]+$/.test(label),
              "Safe screenshot label required",
            );
            if (settleMs === undefined)
              settleMs = (await page
                .locator("#panel-dialog")
                .evaluate((e) => e.open))
                ? 650
                : 200;
            if (settleMs) await page.waitForTimeout(settleMs);
            const observation = {
              label,
              at: Date.now(),
              state: await state(page),
              metrics: await metrics(page),
              ui: await page.evaluate(() => ({
                text: document.body.innerText,
                focus: document.activeElement?.id,
                scroll: [
                  document.documentElement.scrollWidth,
                  document.documentElement.scrollHeight,
                ],
                visibleTitles: [...document.querySelectorAll("[title]")]
                  .filter(
                    (e) =>
                      e.getBoundingClientRect().width &&
                      getComputedStyle(e).visibility !== "hidden",
                  )
                  .map((e) => ({ id: e.id, title: e.title })),
                images: [...document.images]
                  .filter((e) => e.getBoundingClientRect().width)
                  .map((e) => ({
                    src: e.getAttribute("src"),
                    alt: e.alt,
                    complete: e.complete,
                    naturalWidth: e.naturalWidth,
                  })),
              })),
            };
            await page.screenshot({
              path: resolve(dir, label + ".png"),
              scale: "css",
              animations: "allow",
            });
            r.observations.push(observation);
            return observation;
          },
        };
        await page.goto(config.url + "/?qa=1", {
          waitUntil: "networkidle",
          timeout: 30000,
        });
        r.initialStorage = await page.evaluate(() =>
          Object.keys(localStorage).sort(),
        );
        const expected = [
          save ? "tidekin.save.v2" : null,
          settings ? "tidekin.settings.v1" : null,
        ]
          .filter(Boolean)
          .sort();
        h.check(
          "Storage isolated and explicitly labelled",
          JSON.stringify(r.initialStorage) === JSON.stringify(expected),
          r.initialStorage,
        );
        await fn(h);
        h.check("No browser errors", r.errors.length === 0, r.errors);
        r.status = "pass";
      } catch (error) {
        r.status = "fail";
        r.failure = String(error.stack ?? error);
        if (page && !page.isClosed())
          await page
            .screenshot({ path: resolve(dir, "failure.png"), timeout: 3000 })
            .catch(() => {});
      } finally {
        if (context) {
          if (video) r.videoClosedAt = Date.now();
          try {
            await context.close();
            contexts.delete(context);
            r.contextClosed = true;
            if (video && page?.video()) r.rawVideo = await page.video().path();
          } catch (error) {
            r.status = "fail";
            r.errors.push(`release: ${error}`);
          }
        }
        await pendingWrites();
        console.log(`${name}: ${r.status}`);
      }
      return r;
    }
    const stop = new Promise((_, reject) => {
      const interrupt = (reason) => {
        stopped = true;
        abort.abort();
        browser.close({ reason }).catch(() => {});
        reject(new Error(reason));
      };
      timer = setTimeout(
        () => interrupt(`QA deadline ${config.deadlineMs} ms exceeded`),
        config.deadlineMs,
      );
      signalHandler = () =>
        interrupt("QA interrupted; releasing owned browser");
      process.once("SIGINT", signalHandler);
      process.once("SIGTERM", signalHandler);
    });
    work = plan({ browser, runCase, report, config, signal: abort.signal });
    await Promise.race([work, stop]);
  } catch (error) {
    report.errors.push(String(error.stack ?? error));
  } finally {
    stopped = true;
    abort.abort();
    clearTimeout(timer);
    if (signalHandler) {
      process.removeListener("SIGINT", signalHandler);
      process.removeListener("SIGTERM", signalHandler);
    }
    for (const context of contexts)
      await context
        .close()
        .catch((error) => report.errors.push(`context release: ${error}`));
    if (browser) {
      try {
        await browser.close();
        report.browserClosedAt = new Date().toISOString();
      } catch (error) {
        report.errors.push(`browser release: ${error}`);
      }
    }
    await work?.catch(() => {});
    if (finalize) {
      try {
        await finalize(report);
      } catch (error) {
        report.errors.push(`retention cleanup: ${error.stack ?? error}`);
      }
    }
    try {
      report.after = await fingerprint(config);
      report.unchanged =
        Boolean(report.before) &&
        ["build", "sources", "served", "harness"].every(
          (key) => report.before[key].hash === report.after[key].hash,
        );
    } catch (error) {
      report.errors.push(`final fingerprint: ${error.stack ?? error}`);
      report.unchanged = false;
    }
    report.finishedAt = new Date().toISOString();
    report.status =
      report.unchanged &&
      report.browserClosedAt &&
      !report.errors.length &&
      report.cases.length &&
      report.cases.every((r) => r.status === "pass" && r.contextClosed)
        ? "complete"
        : "failed";
    await pendingWrites();
  }
  console.log(
    JSON.stringify(
      {
        out: config.out,
        status: report.status,
        unchanged: report.unchanged,
        cases: report.cases.map((r) => ({ name: r.name, status: r.status })),
      },
      null,
      2,
    ),
  );
  if (report.status !== "complete") process.exitCode = 1;
  return report;
}
