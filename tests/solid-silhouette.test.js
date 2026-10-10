import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createReefFish } from '../assets/cleanup/underwater-fish.js';
import { createSolidSilhouette } from '../src/geometry/solid-silhouette.js';
import { releaseObjectTree } from '../src/render-resources.js';

test('actual resident fish fins preserve the legacy extrusion positions, normals and draw groups', () => {
  const fish = createReefFish(THREE, [{ x: 0, y: -3, z: -2 }], () => .5);
  const outline = new THREE.Shape();
  outline.moveTo(0, 0); outline.lineTo(-.17, .14);
  outline.quadraticCurveTo(-.1, 0, -.17, -.14); outline.closePath();
  const legacy = new THREE.ExtrudeGeometry(outline, { depth: .016, bevelEnabled: false });
  try {
    const fin = fish.root.children[0].children.find(mesh => mesh.position.x === -.2);
    assert.ok(fin, 'Production tail fin is missing');
    assert.deepEqual(fin.geometry.attributes.position.array, legacy.attributes.position.array);
    assert.deepEqual(fin.geometry.attributes.normal.array, legacy.attributes.normal.array);
    assert.deepEqual(fin.geometry.groups, legacy.groups);
    assert.equal(fin.geometry.index, null);
    assert.equal(fin.geometry.attributes.uv, undefined, 'Untextured fin should not retain unused UVs');
    assert.equal(fin.material.map, null);
    assert.equal(fin.material.color.getHex(), 0xf2b756);
    legacy.computeBoundingBox(); fin.geometry.computeBoundingBox();
    assert.deepEqual(fin.geometry.boundingBox, legacy.boundingBox);
    assert.ok(fish.root.children.every(group => group.children.filter(mesh => mesh.geometry === fin.geometry).length === 2));
    let releases = 0;
    fin.geometry.addEventListener('dispose', () => { releases++; });
    releaseObjectTree(fish.root);
    releaseObjectTree(fish.root);
    assert.equal(releases, 1, 'Shared fin geometry must be released once');
  } finally {
    legacy.dispose(); releaseObjectTree(fish.root);
  }
});

test('solid silhouettes match legacy flat curve sampling at both production resolutions', () => {
  for (const segments of [8, 12]) {
    const outline = new THREE.Shape();
    outline.moveTo(-.12, .02); outline.quadraticCurveTo(0, -.03, .13, .04);
    outline.quadraticCurveTo(.08, -.11, -.06, -.06); outline.closePath();
    const expected = new THREE.ExtrudeGeometry(outline, { depth: .008, curveSegments: segments, bevelEnabled: false });
    const actual = createSolidSilhouette(THREE, outline, .008, segments);
    try {
      assert.deepEqual(actual.attributes.position.array, expected.attributes.position.array);
      assert.deepEqual(actual.attributes.normal.array, expected.attributes.normal.array);
      assert.deepEqual(actual.groups, expected.groups);
    } finally { expected.dispose(); actual.dispose(); }
  }
});
