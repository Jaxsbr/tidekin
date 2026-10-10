import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createReefSculptor } from '../assets/cleanup/underwater-models.js';
import { releaseObjectTree } from '../src/render-resources.js';

test('reef painting writes vertex colours directly without boxing or recopying the final float buffer', () => {
  const geometry = new THREE.PlaneGeometry(2, 2, 260, 260);
  let copiedValues = 0;
  class ObservedFloatAttribute extends THREE.Float32BufferAttribute {
    constructor(values, ...args) {
      copiedValues += values.length;
      super(values, ...args);
    }
  }
  try {
    const sculptor = createReefSculptor({ ...THREE, Float32BufferAttribute: ObservedFloatAttribute }, new THREE.Group(), () => .5);
    sculptor.paint(geometry);
    assert.equal(copiedValues, 0, 'Painting allocated an intermediate colour array before copying it');
    assert.equal(geometry.attributes.color.count, geometry.attributes.position.count);
    assert.ok(geometry.attributes.color.array instanceof Float32Array);
  } finally { geometry.dispose(); }
});

test('direct reef painting retains every original colour bit across sphere, tube and plane topology', () => {
  const geometries = [new THREE.SphereGeometry(1, 20, 14),
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(1, 2, -.5), new THREE.Vector3(2, 3, 1)]), 10, .2, 7),
    new THREE.PlaneGeometry(2, 3, 3, 12)];
  const sculptor = createReefSculptor(THREE, new THREE.Group(), () => .5);
  try {
    for (const geometry of geometries) {
      geometry.computeBoundingBox();
      const p = geometry.attributes.position, values = [], color = new THREE.Color();
      const low = geometry.boundingBox.min.y, range = Math.max(.01, geometry.boundingBox.max.y - low);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const v = .80 + Math.sin(x * 3.1 + y * 5.3 + Math.sin(z * 4.2)) * .055 + (y - low) / range * .15;
        color.setRGB(Math.max(.55, v), Math.max(.55, v), Math.max(.55, v));
        values.push(color.r, color.g, color.b);
      }
      const expected = new Float32Array(values);
      sculptor.paint(geometry);
      assert.deepEqual(geometry.attributes.color.array, expected);
    }
  } finally { geometries.forEach(geometry => geometry.dispose()); }
});

function fixture(t) {
  const root = new THREE.Group();
  let released = false;
  const dispose = () => { if (!released) { released = true; releaseObjectTree(root); } };
  t.after(dispose);
  const sculptor = createReefSculptor(THREE, root, () => .5);
  const first = sculptor.material(0x879eae), second = sculptor.material(0xd4b68f);
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  const plane = new THREE.PlaneGeometry(2, 3, 3, 4);
  const boxSource = new THREE.BoxGeometry(1, 2, 1), box = boxSource.toNonIndexed();
  boxSource.dispose();
  sculptor.add(sphere, first, [1, 2, -3], [.8, 1.2, .6]).rotation.set(.2, -.4, .1);
  sculptor.add(plane, second, [-2, .5, 1], [1.1, .7, 1]).rotation.set(-.3, .2, .4);
  sculptor.add(box, first, [.5, -1, 2], [.9, .6, 1.3]);
  sculptor.add(sphere, first, [-1, 3, -2], [.6, .8, 1.1]);
  return { root, sculptor, dispose, sources: [sphere, plane, box], materials: [first, second] };
}

function triangles(mesh) {
  mesh.updateMatrix();
  const g = mesh.geometry, count = g.index?.count ?? g.attributes.position.count;
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrix);
  const rows = [];
  for (let i = 0; i < count; i++) {
    const vertex = g.index ? g.index.getX(i) : i;
    const position = new THREE.Vector3().fromBufferAttribute(g.attributes.position, vertex).applyMatrix4(mesh.matrix);
    const normal = new THREE.Vector3().fromBufferAttribute(g.attributes.normal, vertex).applyNormalMatrix(normalMatrix);
    const color = new THREE.Vector3().fromBufferAttribute(g.attributes.color, vertex);
    rows.push(...position.toArray(), ...normal.toArray(), ...color.toArray());
  }
  return rows;
}

test('a coral colony reuses its three undeformed sphere topologies and releases each source once', (t) => {
  let constructions = 0;
  const sources = [];
  class CountedSphere extends THREE.SphereGeometry {
    constructor(...args) {
      super(...args); constructions++;
      const record = { geometry: this, disposed: 0 }; sources.push(record);
      this.addEventListener('dispose', () => record.disposed++);
    }
  }
  const root = new THREE.Group(), sculptor = createReefSculptor({ ...THREE, SphereGeometry: CountedSphere }, root, () => .5);
  t.after(() => releaseObjectTree(root));
  sculptor.coral([1, 2, 3], 1.4, 0xd4b68f, 0);
  assert.equal(root.children.length, 105);
  assert.equal(constructions, 3, 'Identical undeformed polyp spheres were reconstructed');
  const expected = root.children.flatMap(triangles);
  sculptor.batch();
  const actual = triangles(root.children[0]);
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < actual.length; i++) assert.ok(Math.abs(actual[i] - expected[i]) < 1e-6, `Colony attribute ${i} changed`);
  assert.ok(sources.every(source => source.disposed === 1));
  // A subsequent colony must not reuse already-disposed cached geometry.
  sculptor.coral([4, 2, 3], 1.4, 0xd4b68f, 0);
  assert.equal(constructions, 6);
});

test('a failed shared sphere instance preserves existing scene ownership', () => {
  const sources = [];
  class ObservedSphere extends THREE.SphereGeometry {
    constructor(...args) {
      super(...args);
      const record = { disposed: 0 }; sources.push(record);
      this.addEventListener('dispose', () => record.disposed++);
    }
  }
  let meshes = 0;
  class FailingMesh extends THREE.Mesh {
    constructor(...args) { super(...args); if (++meshes === 4) throw new Error('Injected polyp mesh failure'); }
  }
  const root = new THREE.Group(), sculptor = createReefSculptor({ ...THREE, SphereGeometry: ObservedSphere, Mesh: FailingMesh }, root, () => .5);
  try {
    assert.throws(() => sculptor.coral([0, 0, 0], 1, 0xd4b68f, 0), /polyp mesh failure/);
    assert.equal(root.children.length, 3);
    assert.equal(sources.length, 3);
    assert.ok(sources.every(source => source.disposed === 0), 'Failed borrower disposed a shared sphere');
  } finally { releaseObjectTree(root); }
  assert.ok(sources.every(source => source.disposed === 1));
});

test('a failed first sphere instance releases its unattached source and preserves earlier scene resources', () => {
  const sources = [];
  class ObservedSphere extends THREE.SphereGeometry {
    constructor(...args) {
      super(...args);
      const record = { disposed: 0 }; sources.push(record);
      this.addEventListener('dispose', () => record.disposed++);
    }
  }
  let meshes = 0;
  class FailingMesh extends THREE.Mesh {
    constructor(...args) { super(...args); if (++meshes === 2) throw new Error('Injected first polyp mesh failure'); }
  }
  const root = new THREE.Group(), sculptor = createReefSculptor({ ...THREE, SphereGeometry: ObservedSphere, Mesh: FailingMesh }, root, () => .5);
  try {
    assert.throws(() => sculptor.coral([0, 0, 0], 1, 0xd4b68f, 0), /first polyp mesh failure/);
    assert.equal(root.children.length, 1);
    assert.deepEqual(sources.map(source => source.disposed), [0, 1]);
  } finally { releaseObjectTree(root); }
  assert.deepEqual(sources.map(source => source.disposed), [1, 1]);
});

test('reef batching preserves every ordered triangle attribute and material through transforms and shared sources', (t) => {
  const { root, sculptor } = fixture(t), expected = new Map();
  for (const mesh of root.children) {
    if (!expected.has(mesh.material)) expected.set(mesh.material, []);
    expected.get(mesh.material).push(...triangles(mesh));
  }
  sculptor.batch();
  assert.equal(root.children.length, expected.size);
  for (const mesh of root.children) {
    const actual = triangles(mesh), reference = expected.get(mesh.material);
    assert.equal(actual.length, reference.length);
    for (let i = 0; i < actual.length; i++) assert.ok(Math.abs(actual[i] - reference[i]) < 1e-6, `Triangle attribute ${i} changed`);
    assert.equal(mesh.geometry.attributes.uv, undefined, 'Unused UV stripping contract changed');
  }
});

test('reef batching retains shared vertex storage across indexed and nonindexed inputs', (t) => {
  const { root, sculptor } = fixture(t);
  const maximumVertices = root.children.reduce((n, m) => n + m.geometry.attributes.position.count, 0);
  const expandedBytes = root.children.reduce((n, m) => n + (m.geometry.index?.count ?? m.geometry.attributes.position.count) * 36, 0);
  sculptor.batch();
  let bytes = 0, vertices = 0;
  for (const mesh of root.children) {
    assert.ok(mesh.geometry.index, 'Batch expanded shared vertices into triangle copies');
    vertices += mesh.geometry.attributes.position.count;
    bytes += mesh.geometry.index.array.byteLength;
    for (const attribute of Object.values(mesh.geometry.attributes)) bytes += attribute.array.byteLength;
  }
  assert.equal(vertices, maximumVertices);
  assert.ok(bytes < expandedBytes * .55, 'Representative batching lost its substantial storage reduction');
});

test('batching disposes shared input geometry once and leaves final material ownership with the scene', (t) => {
  const { sculptor, dispose, sources, materials } = fixture(t);
  const counts = new Map([...sources, ...materials].map(resource => [resource, 0]));
  for (const resource of counts.keys()) resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
  sculptor.batch();
  for (const geometry of sources) assert.equal(counts.get(geometry), 1);
  for (const material of materials) assert.equal(counts.get(material), 0);
  dispose();
  for (const resource of counts.keys()) assert.equal(counts.get(resource), 1);
});

test('large material batches promote indices without wrapping later triangle references', (t) => {
  const root = new THREE.Group(), sculptor = createReefSculptor(THREE, root, () => .5);
  t.after(() => releaseObjectTree(root));
  const material = sculptor.material(0x879eae);
  const large = new THREE.PlaneGeometry(2, 2, 260, 260), small = new THREE.BoxGeometry(1, 1, 1);
  const offset = large.attributes.position.count, boundary = large.index.count;
  const expected = offset + small.index.getX(0);
  assert.ok(offset > 65535);
  sculptor.add(large, material);
  sculptor.add(small, material, [4, 5, 6]);
  sculptor.batch();
  const merged = root.children[0].geometry;
  assert.ok(merged.index.array instanceof Uint32Array);
  assert.equal(merged.index.getX(boundary), expected);
  assert.equal(merged.index.count, boundary + small.index.count);
  assert.equal(merged.attributes.position.getX(expected), small.attributes.position.getX(small.index.getX(0)) + 4);
});

test('large reef batching does not box typed triangle indices into a temporary number array', (t) => {
  const root = new THREE.Group(), sculptor = createReefSculptor(THREE, root, () => .5);
  t.after(() => releaseObjectTree(root));
  const material = sculptor.material(0x879eae);
  sculptor.add(new THREE.PlaneGeometry(2, 2, 260, 260), material);
  sculptor.add(new THREE.BoxGeometry(1, 1, 1), material, [4, 5, 6]);
  const original = THREE.BufferGeometry.prototype.setIndex;
  // Install after primitive construction: the regression is boxing already
  // typed source indices while merging a large habitat material batch.
  THREE.BufferGeometry.prototype.setIndex = function(index) {
    assert.ok(!Array.isArray(index) || index.length <= 65536,
      `Temporary boxed triangle indices: ${index.length}`);
    return original.call(this, index);
  };
  try {
    sculptor.batch();
    assert.equal(root.children[0].geometry.index.count, 405636);
  } finally {
    THREE.BufferGeometry.prototype.setIndex = original;
  }
});

test('batching copies populated buffers without reconstructing default primitive geometry', (t) => {
  const root = new THREE.Group(), sculptor = createReefSculptor(THREE, root, () => .5);
  t.after(() => releaseObjectTree(root));
  let constructions = 0;
  class CountedSphere extends THREE.SphereGeometry {
    constructor(...args) { super(...args); constructions++; }
  }
  const source = new CountedSphere(1, 9, 6);
  const mesh = sculptor.add(source, sculptor.material(0x879eae));
  const expected = triangles(mesh);
  sculptor.batch();
  assert.equal(constructions, 1, 'Copying a buffer rebuilt an unused default sphere');
  assert.deepEqual(triangles(root.children[0]), expected);
});

test('a later material merge failure releases staged geometry and clones while preserving original scene ownership', (t) => {
  const root = new THREE.Group(), observed = [], originalChildren = [];
  let merges = 0;
  const copies = [];
  class FailingGeometry extends THREE.BufferGeometry {
    constructor() {
      super();
      const record = { geometry: this, disposed: 0 };
      observed.push(record);
      this.addEventListener('dispose', () => record.disposed++);
    }
    copy(source) {
      this.copying = true; copies.push(this);
      try { return super.copy(source); }
      finally { this.copying = false; }
    }
    setIndex(index) {
      if (!this.copying && ++merges === 2) throw new Error('Injected second material merge failure');
      return super.setIndex(index);
    }
  }
  const sculptor = createReefSculptor({ ...THREE, BufferGeometry: FailingGeometry }, root, () => .5);
  const sources = [new THREE.SphereGeometry(1, 8, 6), new THREE.BoxGeometry(1, 1, 1)];
  const sourceDisposals = [0, 0];
  sources.forEach((source, i) => {
    source.addEventListener('dispose', () => sourceDisposals[i]++);
    originalChildren.push(sculptor.add(source, sculptor.material(i ? 0xd4b68f : 0x879eae)));
  });
  t.after(() => releaseObjectTree(root));
  assert.throws(() => sculptor.batch(), /second material merge failure/);
  assert.deepEqual(root.children, originalChildren);
  assert.deepEqual(sourceDisposals, [0, 0]);
  assert.equal(observed.length, 4);
  assert.equal(copies.length, 2);
  for (const record of observed) assert.equal(record.disposed, 1);
  releaseObjectTree(root);
  assert.deepEqual(sourceDisposals, [1, 1]);
});
