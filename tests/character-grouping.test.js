import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { characterGeometry } from '../src/character/geometry.js';
import { createCharacterArt } from '../src/character-art.js';
import { releaseObjectTree } from '../src/render-resources.js';

function fixture() {
  const root = new THREE.Group(), pivot = new THREE.Group();
  root.add(pivot); pivot.rotation.set(.2, -.4, .1);
  const tools = characterGeometry(THREE);
  const materials = [new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial()];
  const geometry = tools.paint(new THREE.BoxGeometry(1, 2, 1), 0xd2a776, 0x55716d, 0xffdfaa);
  const meshes = [0, 1, 0].map((slot, i) => {
    const mesh = new THREE.Mesh(geometry, materials[slot]);
    mesh.position.set(i - 1, .2 * i, -.3 * i);
    mesh.rotation.set(.1 * i, -.2, .15 * i); mesh.scale.set(.7, 1.2, .9);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.renderOrder = 3; mesh.layers.set(2); pivot.add(mesh); return mesh;
  });
  return { root, pivot, tools, materials, geometry, meshes };
}

function indexedAttributes(geometry, start = 0, count = geometry.index.count) {
  const values = [];
  for (let i = start; i < start + count; i++) {
    const vertex = geometry.index.getX(i);
    for (const name of ['position', 'normal', 'color']) {
      const attribute = geometry.attributes[name];
      values.push(attribute.getX(vertex), attribute.getY(vertex), attribute.getZ(vertex));
    }
  }
  return values;
}

test('rigid material groups preserve ordered triangle attributes, material slots, pivots and render flags', () => {
  const { root, pivot, tools, materials, geometry, meshes } = fixture();
  try {
    const expected = new Map(materials.map(material => [material, []]));
    for (const mesh of meshes) {
      mesh.updateMatrix();
      const transformed = geometry.clone().applyMatrix4(mesh.matrix);
      expected.get(mesh.material).push(...indexedAttributes(transformed));
      transformed.dispose();
    }
    const attitude = pivot.quaternion.clone();
    tools.batch(root);
    assert.equal(root.children[0], pivot); assert.ok(pivot.quaternion.equals(attitude));
    assert.equal(pivot.children.length, 1);
    const merged = pivot.children[0];
    // Legacy batching leaves the singleton before the appended repeated-material batch.
    assert.deepEqual(merged.material, [materials[1], materials[0]]);
    assert.equal(merged.castShadow, true); assert.equal(merged.receiveShadow, true);
    assert.equal(merged.renderOrder, 3); assert.equal(merged.layers.mask, 4);
    let boundary = 0;
    for (const group of merged.geometry.groups) {
      assert.equal(group.start, boundary);
      assert.deepEqual(indexedAttributes(merged.geometry, group.start, group.count), expected.get(merged.material[group.materialIndex]));
      boundary += group.count;
    }
    assert.equal(boundary, merged.geometry.index.count);
    assert.equal(merged.geometry.attributes.position.count, geometry.attributes.position.count * 3);
  } finally { releaseObjectTree(root); }
});

test('production grouping keeps37 material draws in22 geometries, is idempotent and releases shared ownership once', () => {
  const character = createCharacterArt(THREE), meshes = [], materials = new Set();
  character.root.traverse(object => {
    if (!object.isMesh) return;
    meshes.push(object);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  assert.equal(meshes.length, 22); assert.equal(materials.size, 8);
  assert.equal(meshes.reduce((sum, mesh) => sum + (Array.isArray(mesh.material) ? mesh.geometry.groups.length : 1), 0), 37);
  assert.equal(meshes.reduce((sum, mesh) => sum + mesh.geometry.index.count / 3, 0), 15340);
  const snapshots = meshes.map(mesh => ({ mesh, geometry: mesh.geometry, material: mesh.material,
    indices: mesh.geometry.index.array.slice(), normals: mesh.geometry.attributes.normal.array.slice(),
    groups: structuredClone(mesh.geometry.groups) }));
  characterGeometry(THREE).batch(character.root);
  for (const saved of snapshots) {
    assert.equal(saved.mesh.geometry, saved.geometry); assert.equal(saved.mesh.material, saved.material);
    assert.deepEqual(saved.geometry.index.array, saved.indices);
    assert.deepEqual(saved.geometry.attributes.normal.array, saved.normals);
    assert.deepEqual(saved.geometry.groups, saved.groups);
  }
  const resources = [...meshes.map(mesh => mesh.geometry), ...materials], releases = new Map(resources.map(r => [r, 0]));
  for (const resource of resources) resource.addEventListener('dispose', () => releases.set(resource, releases.get(resource) + 1));
  assert.deepEqual(releaseObjectTree(character.root), { geometries: 22, materials: 8, textures: 0, instances: 0, shadows: 0 });
  assert.equal(releaseObjectTree(character.root).geometries, 0);
  assert.deepEqual([...releases.values()], resources.map(() => 1));
});

test('waist turn preserves planted ankle positions and toe directions under host headings, then resets in water', () => {
  const character = createCharacterArt(THREE);
  character.root.position.set(2.6, 1.725, -4.02);
  try {
    for (const heading of [0, Math.PI + .25, -.8]) {
      for (let frame = 0; frame < 20; frame++) {
        character.animate({ deck: true, dt: 1 / 60, time: frame / 60 });
        // The host supplies heading after the shared animator, as in scene.js.
        character.body.rotation.y = heading;
        character.root.updateMatrixWorld(true);
        for (const { ankle, side } of character.legs) {
          const target = new THREE.Vector3(side * (side < 0 ? .153 : .135), -.836, side > 0 ? .045 : -.026)
            .applyMatrix4(character.body.matrixWorld);
          assert.ok(ankle.getWorldPosition(new THREE.Vector3()).distanceTo(target) < 1e-12);
          const toe = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, side * .11, 0));
          const expected = new THREE.Quaternion().setFromRotationMatrix(character.body.matrixWorld).multiply(toe);
          assert.ok(ankle.getWorldQuaternion(new THREE.Quaternion()).angleTo(expected) < 1e-7);
        }
      }
    }
    character.animate({ reducedMotion: true, reset: true });
    const pelvis = character.root.getObjectByName('Pose_Pelvis');
    assert.deepEqual(pelvis.position.toArray(), [0, 0, 0]);
    assert.deepEqual(pelvis.quaternion.toArray(), [0, 0, 0, 1]);
    assert.deepEqual(character.root.position.toArray(), [2.6, 1.725, -4.02]);
  } finally { releaseObjectTree(character.root); }
});

test('translated and identity material blocks preserve authored normal bits without a second normalization', () => {
  const root = new THREE.Group(), tools = characterGeometry(THREE);
  const materials = [new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial()];
  const sources = materials.map((material, i) => {
    const geometry = tools.paint(new THREE.PlaneGeometry(1, 1), 0xaabbcc);
    for (let v = 0; v < geometry.attributes.normal.count; v++) geometry.attributes.normal.setXYZ(v, .3, .7, .4);
    const mesh = new THREE.Mesh(geometry, material); mesh.position.y = i * .284;
    root.add(mesh); return mesh;
  });
  const expected = sources.map(mesh => ({ normals: mesh.geometry.attributes.normal.array.slice(),
    positions: mesh.geometry.attributes.position.clone().applyMatrix4(new THREE.Matrix4().makeTranslation(0, mesh.position.y, 0)).array }));
  try {
    tools.batch(root);
    const merged = root.children[0].geometry; let vertexOffset = 0;
    for (const reference of expected) {
      assert.deepEqual(merged.attributes.normal.array.subarray(vertexOffset, vertexOffset + reference.normals.length), reference.normals);
      assert.deepEqual(merged.attributes.position.array.subarray(vertexOffset, vertexOffset + reference.positions.length), reference.positions);
      vertexOffset += reference.normals.length;
    }
  } finally { releaseObjectTree(root); }
});

test('incompatible shadow flags retain separate meshes and do not cross articulation parents', () => {
  const { root, pivot, tools, meshes } = fixture();
  try {
    meshes[2].castShadow = false;
    const other = new THREE.Group(); root.add(other);
    const isolated = meshes[0].clone(); other.add(isolated);
    tools.batch(root);
    assert.deepEqual(pivot.children, meshes);
    assert.equal(other.children[0], isolated);
    assert.equal(meshes[2].castShadow, false);
  } finally { releaseObjectTree(root); }
});

test('populated copy, transform and merged-mesh constructor failures release staged resources and retain each source group', () => {
  for (const failure of ['copy', 'transform', 'constructor']) {
    const { root, pivot, geometry, materials } = fixture();
    // Two different singleton materials reach the grouped merge directly.
    pivot.remove(pivot.children[2]);
    const originals = pivot.children.slice(), originalCopy = THREE.BufferGeometry.prototype.copy;
    const originalTransform = THREE.BufferGeometry.prototype.applyMatrix4;
    const originalSet = THREE.BufferGeometry.prototype.setAttribute;
    const staged = new Map(); let copies = 0, transforms = 0;
    THREE.BufferGeometry.prototype.setAttribute = function(...args) {
      if (this !== geometry && !staged.has(this)) {
        staged.set(this, 0); this.addEventListener('dispose', () => staged.set(this, staged.get(this) + 1));
      }
      return originalSet.apply(this, args);
    };
    THREE.BufferGeometry.prototype.copy = function(source) {
      staged.set(this, 0); this.addEventListener('dispose', () => staged.set(this, staged.get(this) + 1));
      const result = originalCopy.call(this, source);
      // Fail after real attributes/index are populated, while ownership has
      // already been staged; both returned buffers must still release once.
      if (failure === 'copy' && ++copies === 2) throw Error('injected copy');
      return result;
    };
    THREE.BufferGeometry.prototype.applyMatrix4 = function(matrix) {
      if (failure === 'transform' && ++transforms === 2) throw Error('injected transform');
      return originalTransform.call(this, matrix);
    };
    class FailingMesh extends THREE.Mesh { constructor(...args) { super(...args); throw Error('injected constructor'); } }
    const engine = failure === 'constructor' ? { ...THREE, Mesh: FailingMesh } : THREE;
    let originalReleases = 0; geometry.addEventListener('dispose', () => { originalReleases++; });
    try {
      assert.throws(() => characterGeometry(engine).batch(root), new RegExp(`injected ${failure}`));
      assert.deepEqual(pivot.children, originals);
      assert.equal(originalReleases, 0);
      assert.ok(staged.size > 0);
      assert.deepEqual([...staged.values()], [...staged].map(() => 1));
    } finally {
      THREE.BufferGeometry.prototype.copy = originalCopy;
      THREE.BufferGeometry.prototype.applyMatrix4 = originalTransform;
      THREE.BufferGeometry.prototype.setAttribute = originalSet;
      releaseObjectTree(root);
      assert.equal(originalReleases, 1);
      assert.equal(materials.length, 2);
    }
  }
});

test('actual character batching never reconstructs a default sphere before copying authored buffers', () => {
  const calls = [];
  class CountedSphere extends THREE.SphereGeometry {
    constructor(...args) { super(...args); calls.push(args.length); }
  }
  const character = createCharacterArt({ ...THREE, SphereGeometry: CountedSphere });
  try {
    assert.ok(calls.length > 0, 'Exercise the actual sculpted sphere sources');
    assert.ok(calls.every(count => count > 0), 'Primitive clone would call CountedSphere with no arguments');
  } finally { releaseObjectTree(character.root); }
});
