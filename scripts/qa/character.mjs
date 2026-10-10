/** Matched native-size gameplay evidence; prepare by default, never a benchmark. */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { performance } from "node:perf_hooks";
import {
  readFile,
  readdir,
  unlink,
  rmdir,
  writeFile,
  mkdir,
} from "node:fs/promises";
import { resolve, dirname, sep, basename } from "node:path";
import { freshFixture } from "../performance/fixtures.mjs";
import {
  options,
  execute,
  viewports,
  hash,
  metrics,
  loadGame,
} from "./runtime.mjs";
import { start, swim, enter } from "./input.mjs";
import { heldReversal } from "./character-input.mjs";
import {
  clipMs,
  frameToleranceMs,
  timingReason,
  waitForClipEnd,
  focusedWindow,
  verifyEncodedDuration,
} from "./character-timing.mjs";
import {
  marker,
  installAnchor,
  warmupAnchor,
  beginAnchor,
  endAnchor,
  releaseAnchor,
  decodeVideoMarkers,
  anchorDiagnostics,
  anchoredWindow,
  verifyRetainedMarkers,
} from "./video-anchor.mjs";

const exec = promisify(execFile);
const config = options("character");
const Game = config.run ? await loadGame(config) : null;

async function preflight() {
  const tools = {};
  for (const tool of ["ffmpeg", "ffprobe"]) {
    const { stdout } = await exec(tool, ["-version"], {
      timeout: 5000,
      maxBuffer: 65536,
    });
    tools[tool] = stdout.split("\n")[0];
  }
  const sceneSource = await readFile(
    resolve(config.sourceRoot, "src/scene.js"),
    "utf8",
  );
  const sourceNumber = (pattern) => {
    const match = sceneSource.match(pattern);
    return match ? Number(match[1]) : null;
  };
  return {
    tools,
    ordinarySpeed: true,
    nativeSize: true,
    maxClipMs: clipMs,
    timing: { targetMs: clipMs, frameToleranceMs, reason: timingReason },
    videoAnchor: marker,
    camera: {
      mode: "default follow; no orbit/zoom/camera hook",
      sourceSha256: hash(sceneSource),
      followRadiusMultiplier: sourceNumber(
        /(?:const\s+)?radius\s*=\s*([\d.]+)\s*\*\s*framing\s*\*\s*zoomScale/,
      ),
      followHeight: sourceNumber(
        /camera\.position\.set\(follow\.x\+Math\.sin\(angle\)\*radius,water\.position\.y\+\(?([\d.]+)/,
      ),
      provenance:
        "Source-derived defaults, not measured world camera coordinates; null means the formula was not recognized.",
      comparison:
        "Original follow defaults 25/18 and integrated candidate 23/13.5 differ intentionally. Matched procedure and native viewports do not imply pixel-perfect framing.",
    },
  };
}

async function probe(path, signal) {
  const { stdout } = await exec(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,codec_name,avg_frame_rate:format=duration",
      "-of",
      "json",
      path,
    ],
    { timeout: 10000, maxBuffer: 65536, signal },
  );
  const data = JSON.parse(stdout),
    stream = data.streams?.[0];
  const durationMs = Number(data.format?.duration) * 1000;
  assert(
    stream && Number.isFinite(durationMs) && durationMs > 0,
    "Video duration and stream must be valid",
  );
  return { ...stream, durationMs };
}

async function focusedClips(result, signal) {
  if (!result.rawVideo) return;
  const raw = result.rawVideo,
    rawDirectory = dirname(raw);
  const caseDirectory = resolve(config.out, result.name);
  assert(
    rawDirectory === resolve(caseDirectory, "raw-video") &&
      raw.startsWith(rawDirectory + sep),
    "Owned raw recording only",
  );
  try {
    assert.equal(
      result.status,
      "pass",
      "Failed scenario cannot certify character clips",
    );
    const source = await probe(raw, signal);
    assert.equal(source.width, result.viewport.width);
    assert.equal(source.height, result.viewport.height);
    assert.equal(
      source.avg_frame_rate,
      "25/1",
      "One-frame tolerance assumes the 25 fps recorder",
    );
    result.rawRecording = {
      sha256: hash(await readFile(raw)),
      metadata: source,
      retention:
        "temporary context recording; retain only verified focused clips",
    };
    const frames = await decodeVideoMarkers(raw, signal);
    result.videoAlignment = {
      method:
        "Decoded QA fiducial and original source frame presentation timestamps; no recorder-origin estimate",
      marker,
    };
    // Persist compact source PTS diagnostics before any gate can fail and before
    // raw retention cleanup. Failed records must explain their exact boundary.
    for (const clip of result.clips)
      clip.decodedAnchor = anchorDiagnostics(frames, clip.anchorIndex);
    const leading = result.clips[0]?.decodedAnchor.runs;
    const warmup = leading?.find((run) => run.phase === 0);
    const firstRest = leading?.find((run) => run.phase === 1);
    assert(
      warmup && firstRest && warmup.lastPtsMs < firstRest.ptsMs &&
        warmup.frames >= 10 && warmup.lastPtsMs - warmup.ptsMs >= 360,
      "Recorder must encode at least ten consecutive leading phase-0 warmup frames",
    );
    for (const clip of result.clips) {
      const anchor = anchoredWindow(frames, clip.anchorIndex, clip.reach);
      const window = focusedWindow(clip, anchor.offsetMs, source.durationMs);
      const { offsetMs, durationMs } = window;
      const path = resolve(caseDirectory, clip.label + ".webm");
      await exec(
        "ffmpeg",
        [
          "-nostdin",
          "-v",
          "error",
          "-ss",
          (offsetMs / 1000).toFixed(3),
          "-i",
          raw,
          "-t",
          (durationMs / 1000).toFixed(3),
          "-an",
          "-c:v",
          "libvpx-vp9",
          "-deadline",
          "realtime",
          "-cpu-used",
          "8",
          "-crf",
          "35",
          "-b:v",
          "0",
          path,
        ],
        { timeout: 30000, maxBuffer: 65536, signal },
      );
      const metadata = await probe(path, signal);
      assert.equal(metadata.width, result.viewport.width);
      assert.equal(metadata.height, result.viewport.height);
      verifyEncodedDuration(metadata.durationMs);
      const retainedAnchor = verifyRetainedMarkers(
        await decodeVideoMarkers(path, signal),
        clip.anchorIndex,
        clip.reach,
      );
      clip.video = {
        file: basename(path),
        sha256: hash(await readFile(path)),
        metadata,
        offsetMs,
        window,
        anchor,
        retainedAnchor,
        timing: { frameToleranceMs, reason: timingReason },
        playback:
          "ordinary source speed; no clock injection, rescaling, setpts or speed changes",
        verified: true,
      };
    }
    await writeFile(
      resolve(caseDirectory, "clips.json"),
      JSON.stringify(
        {
          viewport: result.viewport,
          fixture: result.fixture,
          settings: result.settings,
          alignment: result.videoAlignment,
          clips: result.clips,
        },
        null,
        2,
      ) + "\n",
      { flag: "wx" },
    );
    result.clipsVerified = true;
  } catch (error) {
    result.status = "fail";
    result.errors.push(`video: ${error.stack ?? error}`);
  } finally {
    // No full-context archive, even for a failed capture. Screenshots, retained
    // short clips and error metadata are the diagnostic record.
    await unlink(raw);
    await rmdir(rawDirectory);
    result.rawVideoDiscarded = true;
    delete result.rawVideo;
    if (result.rawRecording) result.rawRecording.discarded = true;
  }
}

async function surface(h) {
  const attempt = (await h.state()).cleanup.attempt;
  await swim(h, { x: attempt.x, y: 0 });
  await h.p.waitForFunction(
    () => window.__tidekin.getState().cleanup.attempt.air >= 23.8,
  );
}

async function inertAnchorFixture(browser, report, signal) {
  // This is an isolated marker/recorder test, not a game, pose or domain pass.
  const viewport = { width: 320, height: 180 };
  const result = (report.anchorFixture = {
    name: "anchor-fixture",
    viewport,
    status: "running",
    errors: [],
    clips: [],
    fixture: {
      label:
        "Synthetic inert page with real key events; no Game/renderer or earned motion evidence",
    },
  });
  const dir = resolve(config.out, result.name);
  await mkdir(dir);
  let context, page;
  try {
    context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      recordVideo: { dir: resolve(dir, "raw-video"), size: viewport },
    });
    page = await context.newPage();
    page.setDefaultTimeout(5000);
    await page.setContent(
      '<body style="margin:0;background:#17394e;color:white;font:14px sans-serif" tabindex="0">Synthetic recorder-marker calibration; no game.</body>',
    );
    await page.evaluate(() => {
      let held = false;
      addEventListener("keydown", (e) => {
        if (e.key === "e") held = true;
      });
      addEventListener("keyup", (e) => {
        if (e.key === "e") held = false;
      });
      window.__tidekin = {
        getState: () => ({
          cleanup: {
            attempt: {
              status: "active",
              selectedId: held ? "inert-key-indicator" : null,
              actionProgress: held ? 0.5 : 0,
            },
          },
        }),
      };
    });
    await page.locator("body").focus();
    await installAnchor(page);
    result.anchorWarmup = await warmupAnchor(page);
    const clip = {
      label: "marker-calibration",
      anchorIndex: 0,
      reach: true,
      startedAt: Date.now(),
      scope: "synthetic marker transition only; not genuine gameplay work",
    };
    result.clips.push(clip);
    const start = performance.now();
    clip.anchorStarted = await beginAnchor(page, 0, true);
    await page.waitForTimeout(400);
    await page.keyboard.down("e");
    await page.waitForTimeout(500);
    await page.keyboard.up("e");
    await releaseAnchor(page);
    await page.waitForFunction(() =>
      window.__tidekinVideoAnchor.history().some((e) => e.phase === 3),
    );
    await waitForClipEnd(start, (ms) => page.waitForTimeout(ms));
    clip.monotonicDurationMs = performance.now() - start;
    clip.finishedAt = Date.now();
    clip.anchorEvents = await endAnchor(page);
    await page.waitForTimeout(240);
    result.status = "pass";
  } finally {
    if (context) {
      await context.close();
      result.contextClosed = true;
      if (page?.video()) result.rawVideo = await page.video().path();
    }
  }
  await focusedClips(result, signal);
  assert(
    result.status === "pass" && result.clipsVerified,
    "Inert recorder calibration failed; real-game capture must not proceed",
  );
}

async function cleanupRawRecordings(report) {
  // Final sweep after browser release covers interrupted cases whose video.path()
  // failed or whose clip processing was never reached. Only this run's owned,
  // dedicated raw-video directories are considered; never touch other evidence.
  for (const result of [
    ...report.cases,
    ...(report.anchorFixture ? [report.anchorFixture] : []),
  ]) {
    const directory = resolve(config.out, result.name, "raw-video");
    let files;
    try {
      files = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    for (const file of files) {
      assert(
        file.isFile() && file.name.endsWith(".webm"),
        "Unexpected raw recording entry",
      );
      await unlink(resolve(directory, file.name));
    }
    await rmdir(directory);
    result.rawVideoDiscarded = true;
    delete result.rawVideo;
    if (result.rawRecording) result.rawRecording.discarded = true;
    if (result.status === "pass" && !result.clipsVerified) {
      result.status = "fail";
      result.errors.push(
        "Interrupted recording had no verified clips; raw discarded.",
      );
    }
  }
}

async function film(
  h,
  label,
  keys = [],
  { shotAtMs = 1200, extraShot, reach = false, reversal = false } = {},
) {
  // State inspection belongs before the timed input window; final inspection and
  // key-release tool overhead belong after it. Screenshots remain within it.
  const stateBefore = await h.state();
  const monotonicStartedAt = performance.now();
  const clip = {
    label,
    startedAt: Date.now(),
    keys: reversal ? ["a", "d"] : keys,
    stateBefore,
    reach,
    anchorIndex: h.r.clips.length,
    method: reversal
      ? "ordinary held A→D reversal; no intentional rest gap"
      : keys.length
        ? "real held keyboard input"
        : "ordinary gameplay rest; no frozen clock",
  };
  h.r.clips.push(clip);
  h.r.inputs.push({ film: label, keys: clip.keys, ms: clipMs, at: clip.startedAt });
  const held = [];
  async function finishCapture() {
    await waitForClipEnd(monotonicStartedAt, (ms) => h.p.waitForTimeout(ms));
    clip.monotonicDurationMs = performance.now() - monotonicStartedAt;
    clip.finishedAt = Date.now();
    clip.anchorEvents = await endAnchor(h.p);
    if (reach)
      h.check(
        "Genuine rest/work/released domain phases recorded",
        JSON.stringify(clip.anchorEvents.map((e) => e.phase)) === "[1,2,3,4]",
        clip.anchorEvents,
      );
  }
  try {
    clip.anchorStarted = await beginAnchor(h.p, clip.anchorIndex, reach);
    // Visible pre-input guard ensures the decoded start exists before any brief
    // action. Genuine reach has a longer rest guard than travelling clips.
    await h.p.waitForTimeout(reach ? 400 : 200);
    if (reversal) {
      clip.reversal = {};
      await heldReversal({
        keyboard: h.p.keyboard,
        wait: (ms) => h.p.waitForTimeout(ms),
        observe: async (direction) => {
          const observation = await h.shot(`${label}-${direction}`, {
            settleMs: 0,
          });
          const attempt = observation.state.cleanup.attempt;
          return {
            screenshot: `${label}-${direction}.png`,
            wallAt: observation.at,
            observedElapsedMs: performance.now() - monotonicStartedAt,
            stateFacing: attempt?.facing,
            x: attempt?.x,
            y: attempt?.y,
            air: attempt?.air,
            status: attempt?.status,
          };
        },
        complete: finishCapture,
      }, clip.reversal);
      const { left, right } = clip.reversal.observations;
      h.check(
        "Held reversal records opposite domain facing and actual directional travel",
        left.stateFacing?.x < 0 && right.stateFacing?.x > 0 && right.x > left.x,
        clip.reversal,
      );
      h.check(
        "Held reversal remains a viable underwater dive",
        left.y < 0 && right.y < 0 && left.air > 0 && right.air > 0 &&
          left.status !== "failed" && right.status !== "failed",
        clip.reversal.observations,
      );
    } else {
      const keyDownStarted = performance.now();
      for (const key of keys) {
        await h.p.keyboard.down(key);
        held.push(key);
      }
      clip.keyDownAt = Date.now();
      await h.p.waitForTimeout(shotAtMs);
      const observation = await h.shot(label, { settleMs: 0 });
      clip.screenshotAt = observation.at;
      const measured = observation.metrics;
      clip.camera = {
        viewMode: measured.viewMode ?? null,
        position: measured.cameraPosition ?? measured.camera?.position ?? null,
        target: measured.cameraTarget ?? measured.camera?.target ?? null,
        fov: measured.cameraFov ?? measured.camera?.fov ?? null,
        zoom: measured.zoomScale ?? measured.camera?.zoom ?? null,
        provenance:
          "Actual QA metrics where exposed; null fields are unavailable, not inferred poses.",
      };
      if (reach)
        h.check(
          "Reach observed through normal held E",
          observation.state.cleanup.attempt.selectedId &&
            observation.state.cleanup.attempt.actionProgress > 0 &&
            observation.state.cleanup.attempt.status === "active",
          observation.state.cleanup.attempt,
        );
      if (extraShot) await h.shot(extraShot, { settleMs: 0 });
      // Half a second of ordinary E is below the domain's 0.8-second action.
      // The observer records actual positive progress and its reset after release.
      if (reach) {
        const remainingHold = 500 - (performance.now() - keyDownStarted);
        if (remainingHold > 0) await h.p.waitForTimeout(Math.ceil(remainingHold));
        await h.p.keyboard.up("e");
        held.splice(held.indexOf("e"), 1);
        clip.keyReleasedAt = Date.now();
        await releaseAnchor(h.p);
        await h.p.waitForFunction(
          () =>
            window.__tidekinVideoAnchor
              .history()
              .some((event) => event.phase === 3),
          null,
          { timeout: 1000 },
        );
      }
      await finishCapture();
      while (held.length) {
        await h.p.keyboard.up(held.at(-1));
        held.pop();
      }
    }
    // Keep the end fiducial visible for several encoded frames before any next
    // movement. The retained clip is still exactly three seconds at source speed.
    await h.p.waitForTimeout(240);
  } finally {
    for (const key of held) await h.p.keyboard.up(key).catch(() => {});
  }
  clip.stateAfter = await h.state();
  h.check(
    "Live dive remains viable",
    !clip.stateAfter.cleanup.attempt ||
      clip.stateAfter.cleanup.attempt.status !== "failed",
  );
}

async function capture(h) {
  h.r.clips = [];
  await start(h, true);
  await installAnchor(h.p);
  h.r.anchorWarmup = await warmupAnchor(h.p);
  h.r.videoAnchor = marker;
  h.r.captureScope = config.anchorOnly
    ? "reach-anchor-validation-only; not full character comparison"
    : "full-character-sequence";
  try {
    if (!config.anchorOnly) await film(h, "deck");
    await enter(h, "home-reef", Game, { semantic: true });
    h.r.site = Game.getCleanupSite(await h.state());
    if (!config.anchorOnly) await film(h, "surface");

    // Deep rest is its own full-breath excursion. Surface before filming movement
    // so ordinary-speed recording never needs injected air or accelerated time.
    if (!config.anchorOnly) {
      await swim(h, { x: 0, y: -13 });
      await film(h, "deep");
      await surface(h);
      await film(h, "descent", ["s"]);
      await film(h, "swim-right", ["d"], { extraShot: "horizontal" });
      await film(h, "swim-left", ["a"]);
      await film(h, "swim-reversal", [], { reversal: true });
      await film(h, "ascent", ["w"]);
      await surface(h);
    }

    const target = [...h.r.site.trash].sort(
      (a, b) => Math.abs(a.y) - Math.abs(b.y),
    )[0];
    await swim(h, { x: target.x, y: 0 });
    await h.p.waitForFunction(
      () => window.__tidekin.getState().cleanup.attempt.air >= 23.8,
    );
    await swim(h, target);
    await film(h, "reach", ["e"], { shotAtMs: 150, reach: true });
    await surface(h);
    await h.shot("surface-after-reach");
    const measured = await metrics(h.p);
    h.check(
      "Native viewport and quality retained",
      measured.viewport.width === h.r.viewport.width &&
        measured.viewport.height === h.r.viewport.height &&
        measured.viewport.devicePixelRatio === 1 &&
        measured.quality === "high",
      measured.viewport,
    );
  } finally {
    await h.p
      .evaluate(() => window.__tidekinVideoAnchor?.dispose())
      .catch(() => {});
  }
}

await execute(
  config,
  Game,
  async ({ browser, runCase, signal, report }) => {
    if (config.anchorOnly || config.inertOnly)
      await inertAnchorFixture(browser, report, signal);
    if (config.inertOnly) return;
    for (const viewport of viewports) {
      for (const reducedMotion of [false, true]) {
        const name = `${viewport.width}x${viewport.height}-${reducedMotion ? "reduced-motion" : "ordinary-motion"}`;
        if (config.selectedCase && name !== config.selectedCase) continue;
        const fixture = freshFixture(Game);
        fixture.label +=
          "; character capture only, not earned progression; real sailing/swimming and labelled normal-domain QA entry";
        const settings = {
          quality: "high",
          sound: false,
          reducedMotion,
          largeText: false,
        };
        const result = await runCase(name, viewport, fixture, capture, {
          settings,
          video: true,
        });
        result.settings = settings;
      }
    }
  },
  {
    preflight,
    finalize: async (report) => {
      if (report.browserClosedAt)
        console.log(`Character browser closed at ${report.browserClosedAt}; decoding on CPU only.`);
      // Preserve the original overall deadline after browser release. Each tool
      // also retains its bounded timeout; raw cleanup runs even after abortion.
      const remainingMs = Math.max(1,
        config.deadlineMs - (Date.now() - Date.parse(report.startedAt)));
      const signal = AbortSignal.timeout(remainingMs);
      try {
        for (const result of report.cases) await focusedClips(result, signal);
      } finally {
        await cleanupRawRecordings(report);
      }
    },
  },
);
