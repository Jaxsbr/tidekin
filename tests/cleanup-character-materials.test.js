import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCleanupScene } from '../src/cleanup-scene.js';

test('underwater tint reaches every character material and shutdown releases each once', () => {
  const world = createCleanupScene({ THREE });
  const character = world.root.getObjectByName('Tidekin_Character');
  assert(character);
  const materials = new Set();
  let grouped = false;
  character.traverse(object => {
    if (!object.isMesh) return;
    assert.equal(object.castShadow, true);
    assert.equal(object.receiveShadow, true);
    if (Array.isArray(object.material) && object.material.length > 1) grouped = true;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  assert(grouped, 'Exercise tint on an actual mesh with multiple material groups');
  assert.equal(materials.size, 8);
  const disposals = new Map();
  for (const material of materials) {
    const shader = { vertexShader: '#include <worldpos_vertex>', fragmentShader: '#include <color_fragment>' };
    material.onBeforeCompile(shader);
    assert.match(shader.vertexShader, /submergedY=\(modelMatrix/);
    assert.match(shader.fragmentShader, /vec3\(\.70,\.94,1\.0\)/);
    assert.equal(material.customProgramCacheKey(), 'cleanup-submerged-character-v2');
    disposals.set(material, 0);
    material.addEventListener('dispose', () => disposals.set(material, disposals.get(material) + 1));
  }
  world.dispose();
  world.dispose();
  assert.deepEqual([...disposals.values()], Array(8).fill(1));
});
