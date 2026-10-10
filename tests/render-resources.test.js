import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { releaseObjectTree } from '../src/render-resources.js';

test('scene teardown releases shared buffers, shader textures and detached owner textures exactly once', () => {
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry();
  const texture = new THREE.Texture();
  const detached = new THREE.Texture();
  const material = new THREE.ShaderMaterial({ uniforms: { art: { value: texture }, atlas: { value: [texture] } } });
  root.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, [material, material]));
  const events = {geometry:0,material:0,texture:0,detached:0};
  for (const [key, resource] of Object.entries({geometry,material,texture,detached})) {
    resource.addEventListener('dispose', () => events[key]++);
  }
  assert.deepEqual(releaseObjectTree(root, { textures: [detached, texture] }),
    { geometries:1,materials:1,textures:2,instances:0,shadows:0 });
  assert.deepEqual(events, {geometry:1,material:1,texture:1,detached:1});
  releaseObjectTree(root);
  assert.deepEqual(events, {geometry:1,material:1,texture:1,detached:1});
  assert.equal(root.children.length, 0);
});

test('instancing and shadow ownership is released alongside its geometry and material', () => {
  const root = new THREE.Group();
  const instance = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial(), 2);
  const light = new THREE.DirectionalLight();
  let instances=0, shadows=0;
  instance.addEventListener('dispose', () => instances++);
  light.shadow.dispose = () => shadows++;
  root.add(instance,light);
  const released = releaseObjectTree(root);
  assert.equal(released.instances,1);assert.equal(released.shadows,1);
  assert.equal(instances,1);assert.equal(shadows,1);
});
