import * as T from "three";
import {
  BIOMES,
  CONTROLS,
  VERSION,
  generate,
  restoreRecipe,
} from "./generator.js";
import { makeScene } from "./scene.js";
import { PASSES } from "./presets.js";
const $ = (s) => document.querySelector(s),
  canvas = $("canvas"),
  view = makeScene(canvas),
  params = new URLSearchParams(location.search);
let recipe,
  keys = new Set(),
  drag = false,
  last = { x: 0, y: 0 },
  yaw = 0,
  pitch = 0,
  speed = 24;
if (params.has("capture")) document.body.classList.add("capture");
for (const [key, c] of Object.entries(CONTROLS)) {
  const label = document.createElement("label");
  label.htmlFor = key;
  label.textContent = c.label + " ";
  const value = document.createElement("span");
  value.id = key + "Value";
  label.append(value);
  const input = document.createElement("input");
  Object.assign(input, {
    id: key,
    type: "range",
    min: c.min,
    max: c.max,
    step: 1,
  });
  input.oninput = () => (value.textContent = input.value);
  $("#sliders").append(label, input);
}
$("#biome").value = Object.hasOwn(BIOMES, params.get("biome"))
  ? params.get("biome")
  : "B";
$("#seed").value = (params.get("seed") || "waterfall-01").slice(0, 80);
$("#preset").value = Object.hasOwn(PASSES, params.get("pass"))
  ? params.get("pass")
  : "p4";
function applyPreset() {
  const values = PASSES[$("#preset").value][$("#biome").value];
  for (const [k, v] of Object.entries(values)) $("#" + k).value = v;
}
applyPreset();
for (const key of Object.keys(CONTROLS))
  if (params.has(key) && Number.isFinite(Number(params.get(key))))
    $("#" + key).value = params.get(key);
function syncAngles() {
  yaw = view.camera.rotation.y;
  pitch = view.camera.rotation.x;
}
function cameraView(i) {
  if (i === 4) view.overview();
  else view.reviewAngle(i);
  syncAngles();
}
function updateURL() {
  const u = new URL(location.href);
  u.search = "";
  u.searchParams.set("biome", recipe.biome);
  u.searchParams.set("seed", recipe.seed);
  u.searchParams.set("pass", $("#preset").value);
  for (const [k, v] of Object.entries(recipe.rules)) u.searchParams.set(k, v);
  if (params.has("capture")) u.searchParams.set("capture", "1");
  history.replaceState({}, "", u);
}
function rebuild() {
  const rules = Object.fromEntries(
    Object.keys(CONTROLS).map((k) => [k, Number($("#" + k).value)]),
  );
  recipe = generate(
    $("#biome").value,
    $("#seed").value.trim() || "island-01",
    rules,
  );
  view.rebuild(recipe);
  view.guides.visible = $("#guides").checked;
  const b = BIOMES[recipe.biome];
  $("#description").textContent = b.summary;
  $("#rules").replaceChildren(
    ...b.rules.map((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      return li;
    }),
  );
  $("#finding").textContent = "Finding candidate: " + b.finding;
  for (const [k, v] of Object.entries(rules))
    $("#" + k + "Value").textContent = v;
  $("#badge").textContent =
    `${VERSION} · ${recipe.biome} / ${recipe.seed} · ${recipe.fingerprint}`;
  $("#toast").textContent =
    "Generated · " + recipe.objects.length + " landforms";
  updateURL();
}
$("#import").onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1000000)
      throw new Error("Recipe file is too large (maximum 1 MB).");
    const restored = restoreRecipe(JSON.parse(await file.text()));
    $("#biome").value = restored.biome;
    $("#seed").value = restored.seed;
    for (const [k, v] of Object.entries(restored.rules)) $("#" + k).value = v;
    rebuild();
    cameraView(0);
    $("#toast").textContent = "Recipe restored as v4 · camera reset to North";
  } catch (error) {
    $("#toast").textContent = error.message;
  } finally {
    e.target.value = "";
  }
};
$("#generate").onclick = rebuild;
$("#next").onclick = () => {
  $("#seed").value =
    "island-" + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  rebuild();
};
$("#biome").onchange = () => {
  applyPreset();
  rebuild();
};
$("#preset").onchange = () => {
  applyPreset();
  rebuild();
};
$("#seed").onkeydown = (e) => {
  if (e.key === "Enter") rebuild();
};
$("#guides").onchange = () => (view.guides.visible = $("#guides").checked);
$("#collapse").onclick = () => {
  $("#panel").classList.toggle("collapsed");
  $("#collapse").textContent = $("#panel").classList.contains("collapsed")
    ? "+"
    : "−";
};
for (const b of document.querySelectorAll("[data-view]"))
  b.onclick = () => cameraView(Number(b.dataset.view));
$("#copy").onclick = async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    $("#toast").textContent = "Recipe link copied";
  } catch {
    $("#toast").textContent = "Copy this page address to preserve the recipe";
  }
};
$("#export").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob(
      [
        JSON.stringify(
          {
            ...recipe,
            camera: { position: view.camera.position.toArray(), yaw, pitch },
            humanApproval: null,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
  );
  a.download = `${VERSION}-${recipe.biome}-${recipe.fingerprint}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
function editing(e) {
  return ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName);
}
addEventListener("keydown", (e) => {
  if (editing(e)) return;
  if (/^(Key[WASDQE]|Digit[1-5])$/.test(e.code)) e.preventDefault();
  keys.add(e.code);
  if (/^Digit[1-5]$/.test(e.code)) cameraView(Number(e.code.slice(5)) - 1);
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => {
  keys.clear();
  drag = false;
});
document.addEventListener("visibilitychange", () => keys.clear());
document.addEventListener("focusin", (e) => {
  if (editing(e)) keys.clear();
});
canvas.addEventListener("pointerdown", (e) => {
  canvas.focus();
  drag = true;
  last = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  yaw -= (e.clientX - last.x) * 0.003;
  pitch = T.MathUtils.clamp(pitch - (e.clientY - last.y) * 0.003, -1.5, 1.5);
  view.camera.rotation.set(pitch, yaw, 0, "YXZ");
  last = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener("pointerup", () => (drag = false));
canvas.addEventListener("pointercancel", () => (drag = false));
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    speed = T.MathUtils.clamp(speed * Math.exp(-e.deltaY * 0.001), 3, 140);
  },
  { passive: false },
);
addEventListener("resize", () => {
  view.renderer.setSize(innerWidth, innerHeight);
  view.camera.aspect = innerWidth / innerHeight;
  view.camera.updateProjectionMatrix();
});
window.islandLab = {
  getRecipe: () => structuredClone(recipe),
  getCamera: () => view.camera.position.toArray(),
  getStats: () => view.stats(),
  reviewAngle: cameraView,
};
rebuild();
cameraView(0);
let frameId,
  prev = performance.now();
function frame(now) {
  const dt = Math.min((now - prev) / 1000, 0.05);
  prev = now;
  const motion = new T.Vector3(
    (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
    0,
    (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0),
  );
  if (motion.lengthSq())
    motion.normalize().applyQuaternion(view.camera.quaternion);
  motion.y += (keys.has("KeyE") ? 1 : 0) - (keys.has("KeyQ") ? 1 : 0);
  if (motion.lengthSq())
    motion
      .normalize()
      .multiplyScalar(dt * speed * (keys.has("ShiftLeft") ? 3 : 1));
  view.camera.position.add(motion);
  view.camera.position.y = Math.max(0.6, view.camera.position.y);
  view.render(params.has("capture") ? 12 : now / 1000);
  frameId = requestAnimationFrame(frame);
}
frameId = requestAnimationFrame(frame);

if (import.meta.hot) import.meta.hot.accept(() => location.reload());

addEventListener(
  "beforeunload",
  () => {
    cancelAnimationFrame(frameId);
    view.dispose();
  },
  { once: true },
);
