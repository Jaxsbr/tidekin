/** QA-only visible fiducial. Source gameplay, camera and simulation are untouched. */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { frameToleranceMs, clipMs } from "./character-timing.mjs";

const exec = promisify(execFile);
export const marker = Object.freeze({
  x: 0,
  y: 0,
  cell: 8,
  width: 80,
  height: 16,
  bits: 8,
  phases: { rest: 1, work: 2, released: 3, end: 4 },
  provenance:
    "Visible QA-only 80x16 top-left fiducial, pointer-events:none and aria-hidden. Cyan/magenta guards tick by 24 color levels each animation frame to keep an inert recorder sampling; parity-protected black/white clip/phase bits stay stable. One-second phase-0 warmup precedes filming. Rest/work/released phases observe ordinary domain state; no input, pose, state, camera or clock injection. Retained full frames include the overlay.",
});

export function markerCode(index, phase) {
  assert(Number.isInteger(index) && index >= 0 && index < 16);
  assert(Number.isInteger(phase) && phase >= 0 && phase <= 4);
  const payload = index * 8 + phase;
  let parity = 0;
  for (let bit = 0; bit < marker.bits - 1; bit++) parity ^= (payload >> bit) & 1;
  return payload | (parity << (marker.bits - 1));
}

export function markerColors(code) {
  return [
    [0, 255, 255],
    ...Array.from({ length: marker.bits }, (_, bit) =>
      (code >> bit) & 1 ? [255, 255, 255] : [0, 0, 0],
    ),
    [255, 0, 255],
  ];
}

export function decodeMarker(bytes) {
  assert.equal(bytes.length, marker.width * marker.height * 3);
  const cells = [];
  for (let cell = 0; cell < marker.bits + 2; cell++) {
    const rgb = [0, 0, 0];
    let count = 0;
    // Interior pixels avoid 4:2:0 color bleed at block boundaries.
    for (let y = 4; y < 12; y++)
      for (let x = cell * 8 + 2; x < cell * 8 + 6; x++) {
        const offset = (y * marker.width + x) * 3;
        for (let c = 0; c < 3; c++) rgb[c] += bytes[offset + c];
        count++;
      }
    cells.push(rgb.map((v) => v / count));
  }
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 48);
  if (!near(cells[0], [0, 255, 255]) || !near(cells[marker.bits + 1], [255, 0, 255]))
    return null;
  let code = 0;
  for (let bit = 0; bit < marker.bits; bit++) {
    const rgb = cells[bit + 1];
    if (rgb.every((v) => v >= 192)) code |= 1 << bit;
    else if (!rgb.every((v) => v <= 64)) return null;
  }
  const payload = code & ((1 << (marker.bits - 1)) - 1),
    index = payload >> 3,
    phase = payload & 7;
  if (phase > 4 || markerCode(index, phase) !== code) return null;
  return { index, phase };
}

export async function decodeVideoMarkers(path, signal) {
  const { stdout } = await exec(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_frames",
      "-show_entries",
      "frame=best_effort_timestamp_time",
      "-of",
      "json",
      path,
    ],
    { timeout: 30000, maxBuffer: 8 * 1024 ** 2, signal },
  );
  const pts = JSON.parse(stdout).frames.map(
    (frame) => Number(frame.best_effort_timestamp_time) * 1000,
  );
  assert(
    pts.length && pts.length <= 22500 && pts.every(Number.isFinite),
    "Finite bounded decoded frame timestamps required",
  );
  assert(
    pts.every((value, i) => !i || value > pts[i - 1]),
    "Decoded timestamps must increase",
  );
  const decoded = await exec(
    "ffmpeg",
    [
      "-nostdin",
      "-v",
      "error",
      "-hwaccel",
      "none",
      "-threads",
      "1",
      "-i",
      path,
      "-vf",
      `crop=${marker.width}:${marker.height}:${marker.x}:${marker.y}`,
      "-fps_mode",
      "passthrough",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "pipe:1",
    ],
    { timeout: 60000, maxBuffer: 80 * 1024 ** 2, encoding: "buffer", signal },
  );
  const stride = marker.width * marker.height * 3;
  assert.equal(
    decoded.stdout.length,
    pts.length * stride,
    "Frame pixels and original PTS must match one for one",
  );
  return pts.map((ptsMs, i) => ({
    ptsMs,
    ...decodeMarker(decoded.stdout.subarray(i * stride, (i + 1) * stride)),
  }));
}

export function anchorDiagnostics(frames, index) {
  const runs = [];
  for (const frame of frames) {
    if (frame.index !== index || frame.phase === undefined) continue;
    const last = runs.at(-1);
    if (
      last &&
      last.phase === frame.phase &&
      frame.ptsMs - last.lastPtsMs <= frameToleranceMs + 0.01
    ) {
      last.lastPtsMs = frame.ptsMs;
      last.frames++;
    } else
      runs.push({
        phase: frame.phase,
        ptsMs: frame.ptsMs,
        lastPtsMs: frame.ptsMs,
        frames: 1,
      });
  }
  const start = runs.find((run) => run.phase === 1)?.ptsMs ?? null;
  const end = runs.find((run) => run.phase === 4)?.ptsMs ?? null;
  return {
    runs,
    startPtsMs: start,
    endPtsMs: end,
    spanMs: start === null || end === null ? null : end - start,
    undecodableFrames: frames.filter((frame) => frame.phase === undefined).length,
  };
}

export function anchoredWindow(frames, index, reach = false) {
  const diagnostic = anchorDiagnostics(frames, index);
  const runs = diagnostic.runs.filter((run) => run.phase !== 0);
  const required = reach ? [1, 2, 3, 4] : [1, 4];
  assert.deepEqual(
    runs.map((r) => r.phase),
    required,
    "Clip requires one ordered decoded rest/work/released/end sequence; missing or ambiguous anchors fail",
  );
  assert(
    runs.every((r) => r.frames >= 3),
    "Each marker phase requires at least three consecutive encoded frames",
  );
  const start = runs[0].ptsMs,
    end = runs.at(-1).ptsMs;
  assert(
    Math.abs(end - start - clipMs) <= frameToleranceMs + 0.01,
    `Decoded start/end span ${end - start} ms (start=${start}, end=${end}) must be three seconds within one 25 fps frame`,
  );
  if (reach) {
    assert(
      runs[0].lastPtsMs - start >= 200,
      "Encoded pre-work rest guard required",
    );
    assert(
      runs[1].lastPtsMs - runs[1].ptsMs >= 120,
      "Genuine encoded working phase required",
    );
    assert(end - runs[2].ptsMs >= 800, "Encoded post-work rest guard required");
  }
  return {
    offsetMs: start,
    durationMs: clipMs,
    endMarkerPtsMs: end,
    phases: runs,
    method:
      "Decoded visible fiducial frames and original source presentation timestamps; wall times are diagnostics only.",
  };
}

export function verifyRetainedMarkers(frames, index, reach) {
  const required = reach ? [1, 2, 3] : [1];
  const phases = frames.filter(
    (f) => f.index === index && required.includes(f.phase),
  );
  for (const phase of required)
    assert(
      phases.filter((f) => f.phase === phase).length >= 3,
      "Retained video lost a required genuine phase",
    );
  assert(
    phases[0]?.phase === 1 && phases[0].ptsMs <= frameToleranceMs + 0.01,
    "Retained video must begin in the start/rest marker",
  );
  let previous = 1;
  for (const frame of phases) {
    assert(frame.phase >= previous, "Retained phase ordering regressed");
    previous = frame.phase;
  }
  return {
    verified: true,
    phases: required.map((phase) => ({
      phase,
      frames: phases.filter((f) => f.phase === phase).length,
      firstPtsMs: phases.find((f) => f.phase === phase).ptsMs,
    })),
  };
}

export async function installAnchor(page) {
  await page.evaluate(
    ({ marker }) => {
      const id = "tidekin-qa-video-anchor";
      if (document.getElementById(id)) throw Error("QA marker already exists");
      const root = document.createElement("div");
      root.id = id;
      root.setAttribute("aria-hidden", "true");
      root.style.cssText = `position:fixed!important;left:0!important;top:0!important;width:${marker.width}px!important;height:${marker.height}px!important;display:flex!important;z-index:2147483647!important;pointer-events:none!important;contain:strict!important;opacity:1!important;filter:none!important;transform:none!important;`;
      const cells = Array.from({ length: marker.bits + 2 }, () => {
        const cell = document.createElement("div");
        cell.style.cssText =
          "flex:none!important;width:8px!important;height:16px!important;border:0!important;padding:0!important;";
        root.append(cell);
        return cell;
      });
      document.body.append(root);
      let raf,
        disposed = false,
        ticks = 0,
        active = false,
        index = 0,
        phase = 0,
        reach = false,
        released = false,
        history = [];
      function paint(next, attempt) {
        if (phase === next && history.length) return;
        phase = next;
        let parity = 0;
        const payload = index * 8 + phase;
        for (let bit = 0; bit < marker.bits - 1; bit++) parity ^= (payload >> bit) & 1;
        const code = payload | (parity << (marker.bits - 1));
        const colors = [
          "rgb(0,255,255)",
          ...Array.from({ length: marker.bits }, (_, bit) =>
            (code >> bit) & 1 ? "white" : "black",
          ),
          "rgb(255,0,255)",
        ];
        cells.forEach((cell, i) =>
          cell.style.setProperty("background", colors[i], "important"),
        );
        history.push({
          phase,
          pageMonotonicMs: performance.now(),
          wallAt: Date.now(),
          actionProgress: attempt?.actionProgress ?? null,
          selectedId: attempt?.selectedId ?? null,
          status: attempt?.status ?? null,
          keyReleaseConfirmed: released,
        });
      }
      function observe() {
        if (disposed) return;
        // Force compositor sampling on the inert fixture too. Only guard colors
        // change; phase bits, game state and simulation time remain untouched.
        const shade = ++ticks % 2 ? 24 : 0;
        cells[0].style.setProperty("background", `rgb(${shade},255,255)`, "important");
        cells[marker.bits + 1].style.setProperty("background", `rgb(255,${shade},255)`, "important");
        const a = active && reach ? window.__tidekin.getState().cleanup.attempt : null;
        if (
          active &&
          reach &&
          phase === 1 &&
          a?.status === "active" &&
          a.selectedId &&
          a.actionProgress > 0
        )
          paint(2, a);
        else if (
          active &&
          released &&
          phase === 2 &&
          a?.status === "active" &&
          a.actionProgress === 0
        )
          paint(3, a);
        raf = requestAnimationFrame(observe);
      }
      window.__tidekinVideoAnchor = {
        begin(nextIndex, isReach) {
          index = nextIndex;
          phase = 0;
          history = [];
          reach = isReach;
          released = false;
          active = true;
          paint(1, window.__tidekin.getState().cleanup.attempt);
          return history[0];
        },
        released() {
          released = true;
        },
        end() {
          active = false;
          paint(4, window.__tidekin.getState().cleanup.attempt);
          return history;
        },
        history() {
          return history;
        },
        warmup() {
          return { phase, ticks, pageMonotonicMs: performance.now() };
        },
        dispose() {
          disposed = true;
          active = false;
          cancelAnimationFrame(raf);
          root.remove();
          delete window.__tidekinVideoAnchor;
        },
      };
      paint(0);
      raf = requestAnimationFrame(observe);
    },
    { marker },
  );
}

export async function warmupAnchor(page) {
  // Ordinary wall time and RAF continue; no clock or game pause. Decoded phase-0
  // frames are checked later rather than pretending this proves encoder readiness.
  await page.waitForTimeout(1000);
  const observed = await page.evaluate(() => window.__tidekinVideoAnchor.warmup());
  assert.equal(observed.phase, 0, "Warmup must precede the first clip");
  assert(observed.ticks >= 12, "Warmup requires actual animation frames");
  return { ...observed, minimumWallMs: 1000 };
}

export const beginAnchor = (page, index, reach) =>
  page.evaluate(
    ({ index, reach }) => window.__tidekinVideoAnchor.begin(index, reach),
    { index, reach },
  );
export const endAnchor = (page) =>
  page.evaluate(() => window.__tidekinVideoAnchor.end());
export const releaseAnchor = (page) =>
  page.evaluate(() => window.__tidekinVideoAnchor.released());
