import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSolidSilhouette } from '../geometry/solid-silhouette.js';

/** Small editable modeling tools. Every mesh owns its input geometry until batching. */
export function characterGeometry(THREE) {
  const silhouette = (outline, depth) => createSolidSilhouette(THREE, outline, depth, 8);
  function finish(positions, indices) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  // Sections: [height, halfWidth, halfDepth, depthOffset?, widthOffset?].
  // Shaped sections give cloth and anatomy an authored contour, rather than
  // scaling the same sphere for every body part.
  function loft(sections, segments = 20, roundness = 1) {
    const positions = [], indices = [];
    for (const [y, rx, rz, z = 0, x = 0] of sections) {
      for (let j = 0; j < segments; j++) {
        const a = j / segments * Math.PI * 2;
        const c = Math.cos(a), s = Math.sin(a);
        positions.push(x + Math.sign(c) * Math.abs(c) ** roundness * rx,
          y, z + Math.sign(s) * Math.abs(s) ** roundness * rz);
      }
    }
    for (let i = 0; i < sections.length - 1; i++) {
      for (let j = 0; j < segments; j++) {
        const a = i * segments + j, b = i * segments + (j + 1) % segments;
        indices.push(a, a + segments, b, b, a + segments, b + segments);
      }
    }
    for (const [ring, top] of [[0, false], [sections.length - 1, true]]) {
      const [y, , , z = 0, x = 0] = sections[ring];
      const center = positions.length / 3;
      positions.push(x, y, z);
      for (let j = 0; j < segments; j++) {
        const a = ring * segments + j, b = ring * segments + (j + 1) % segments;
        indices.push(center, top ? b : a, top ? a : b);
      }
    }
    return finish(positions, indices);
  }

  // An actual swept lock/cloth volume: tapered ends, broad crest, designed curve.
  // A stable frame avoids Frenet flips on nearly planar strokes.
  function sweep(points, width, depth, sections = 12, sides = 8, taper = true, roundness = 1) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const positions = [], indices = [];
    const reference = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i <= sections; i++) {
      const t = i / sections, p = curve.getPoint(t), tangent = curve.getTangent(t);
      const across = new THREE.Vector3().crossVectors(reference, tangent);
      if (across.lengthSq() < .001) across.crossVectors(new THREE.Vector3(0, 1, 0), tangent);
      across.normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, across).normalize();
      const envelope = taper ? .045 + .955 * Math.sin(Math.PI * t) ** .65 : 1;
      for (let j = 0; j < sides; j++) {
        const a = j / sides * Math.PI * 2;
        const c = Math.cos(a), s = Math.sin(a);
        const v = p.clone().addScaledVector(across, Math.sign(c) * Math.abs(c) ** roundness * width * envelope)
          .addScaledVector(normal, Math.sign(s) * Math.abs(s) ** (2 - roundness) * depth * envelope);
        positions.push(v.x, v.y, v.z);
      }
    }
    for (let i = 0; i < sections; i++) {
      for (let j = 0; j < sides; j++) {
        const a = i * sides + j, b = i * sides + (j + 1) % sides;
        indices.push(a, b, a + sides, b, b + sides, a + sides);
      }
    }
    for (const [ring, end] of [[0, false], [sections, true]]) {
      const p = curve.getPoint(end ? 1 : 0), center = positions.length / 3;
      positions.push(p.x, p.y, p.z);
      for (let j = 0; j < sides; j++) {
        const a = ring * sides + j, b = ring * sides + (j + 1) % sides;
        indices.push(center, end ? a : b, end ? b : a);
      }
    }
    return finish(positions, indices);
  }

  function paint(geometry, color, shadow = color, light = color, profile = '') {
    // A few broad brush forms follow the local volume, rather than baking one
    // smooth lighting gradient. No speckle, texture, shader or frame-time work.
    if (!geometry.index) {
      const indices = Array.from({ length: geometry.attributes.position.count }, (_, i) => i);
      geometry.setIndex(indices);
    }
    geometry.deleteAttribute('uv');
    const base = new THREE.Color(color), shade = new THREE.Color(shadow), sun = new THREE.Color(light);
    const colors = [], normals = geometry.attributes.normal, positions = geometry.attributes.position;
    const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.count; i++) {
      const p = [positions.getX(i), positions.getY(i), positions.getZ(i)];
      for (let k = 0; k < 3; k++) { low[k] = Math.min(low[k], p[k]); high[k] = Math.max(high[k], p[k]); }
    }
    const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const authored = ['Skin', 'Canvas', 'Chestnut', 'Olive', 'Leather', 'CoralCloth'].includes(profile) && shadow !== color;
    const tint = base.clone();
    for (let i = 0; i < normals.count; i++) {
      const nx = normals.getX(i), ny = normals.getY(i), nz = normals.getZ(i);
      tint.copy(base);
      if (authored) {
        const x = (positions.getX(i) - low[0]) / Math.max(.001, high[0] - low[0]);
        const y = (positions.getY(i) - low[1]) / Math.max(.001, high[1] - low[1]);
        const z = (positions.getZ(i) - low[2]) / Math.max(.001, high[2] - low[2]);
        const plane = -.42 * nx + .44 * ny + .48 * nz;
        const broad = .6 * plane + .4 * Math.round(plane * 3) / 3;
        const stroke = smooth(.18, .42, x + y * .24) * (1 - smooth(.68, .91, x + y * .24));
        const wash = smooth(.35, .70, x - y * .22 + .18) * (1 - smooth(.66, .94, y));
        let shadowWeight = Math.min(.72, smooth(.03, .65, -broad) * .62 + wash * .27);
        let lightWeight = Math.min(.72, smooth(.05, .72, broad) * .57 + stroke * z * .19);
        const front = smooth(.35, .70, z);
        if (profile === 'Canvas') {
          // Quiet cloth underpainting. Garment-specific color masses follow
          // the modeled folds instead of repeating masks at every section.
          shadowWeight = .18 * smooth(.12, .60, -plane);
          lightWeight = .28 * smooth(.05, .75, plane);
        } else if (profile === 'Skin') {
          // The same broad warm centre/cool turned flank on cheeks and limbs.
          const turn = smooth(.45, .78, x + y * .12);
          shadowWeight = .14 * smooth(.08, .64, -plane) + .48 * turn * front;
          lightWeight = .44 * (1 - turn) * front;
        } else if (profile === 'Chestnut') {
          // A swept light crest above one quiet under-lock mass. No repeated
          // normal quantization or brush bands on the individual locks.
          shadowWeight = .46 * (1 - smooth(.15, .53, y)) + .18 * smooth(.10, .60, -plane);
          lightWeight = .62 * smooth(.48, .86, y) * smooth(.20, .58, z);
        }
        tint.lerp(shade, shadowWeight).lerp(sun, lightWeight);
      } else {
        const plane = ny * .65 + nz * .35;
        tint.lerp(plane < 0 ? shade : sun, Math.abs(plane) * .6);
      }
      colors.push(tint.r, tint.g, tint.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geometry;
  }

  function batch(root) {
    const source = new Set(), retained = new Set();
    const identity = root.matrix.clone().identity();
    const linear = identity.clone();
    const compatible = (a, b) => a.castShadow === b.castShadow && a.receiveShadow === b.receiveShadow &&
      a.visible === b.visible && a.renderOrder === b.renderOrder &&
      a.frustumCulled === b.frustumCulled && a.layers.mask === b.layers.mask;
    function merge(parent, meshes, grouped) {
      const buffers = [];
      let geometry;
      try {
        for (const mesh of meshes) {
          source.add(mesh.geometry); mesh.updateMatrix();
          // Copy into an empty buffer; primitive.clone() reconstructs a default
          // sphere/tube/torus before overwriting it with the authored attributes.
          const buffer = new THREE.BufferGeometry(); buffers.push(buffer);
          buffer.copy(mesh.geometry);
          // Preserve first-stage normal transforms, but never renormalize its
          // identity blocks a second time or recompute merged vertex normals.
          if (grouped && mesh.matrix.equals(identity)) continue;
          linear.copy(mesh.matrix).setPosition(0, 0, 0);
          if (grouped && linear.equals(identity)) {
            // A translated singleton (boot laces) changes positions only;
            // its already-authored normals must retain their exact bits.
            buffer.attributes.position.applyMatrix4(mesh.matrix);
            buffer.boundingBox?.applyMatrix4(mesh.matrix);
            buffer.boundingSphere?.applyMatrix4(mesh.matrix);
          } else buffer.applyMatrix4(mesh.matrix);
        }
        geometry = mergeGeometries(buffers, grouped);
        if (!geometry) throw new Error('Character geometry attributes must match within a rigid batch.');
        const first = meshes[0];
        const material = grouped ? meshes.map(mesh => mesh.material) : first.material;
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `${parent.name}_${grouped ? 'Materials' : material.name}`;
        mesh.castShadow = first.castShadow; mesh.receiveShadow = first.receiveShadow;
        mesh.visible = first.visible; mesh.renderOrder = first.renderOrder;
        mesh.frustumCulled = first.frustumCulled; mesh.layers.mask = first.layers.mask;
        for (const child of meshes) parent.remove(child);
        parent.add(mesh);
      } catch (error) { geometry?.dispose(); throw error; }
      finally { for (const buffer of buffers) buffer.dispose(); }
    }
    try {
      root.traverse(parent => {
        const byMaterial = new Map();
        for (const child of parent.children) {
          if (!child.isMesh) continue;
          source.add(child.geometry);
          // Grouped material arrays are final blocks. A second host/helper
          // pass must leave their existing index ranges and order untouched.
          if (Array.isArray(child.material)) continue;
          const siblings = byMaterial.get(child.material) ?? [];
          siblings.push(child); byMaterial.set(child.material, siblings);
        }
        for (const meshes of byMaterial.values()) {
          if (meshes.length > 1 && meshes.every(mesh => compatible(mesh, meshes[0]))) merge(parent, meshes, false);
        }
        const meshes = parent.children.filter(child => child.isMesh);
        if (meshes.length > 1 && meshes.every(mesh => !Array.isArray(mesh.material) && compatible(mesh, meshes[0]))) {
          merge(parent, meshes, true);
        }
      });
    } finally {
      root.traverse(object => { if (object.isMesh) retained.add(object.geometry); });
      for (const geometry of source) if (!retained.has(geometry)) geometry.dispose();
    }
  }

  return { loft, sweep, paint, batch, silhouette };
}
