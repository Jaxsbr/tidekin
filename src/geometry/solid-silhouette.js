import { ShapeUtils } from 'three';

/** One closed solid contour, one depth step, flat face normals; no bevels or holes. */
export function createSolidSilhouette(THREE, outline, depth, curveSegments = 12) {
  if (outline.holes.length) throw new Error('Character silhouettes must be solid.');
  const contour = outline.getPoints(curveSegments);
  if (!ShapeUtils.isClockWise(contour)) contour.reverse();
  let previous = contour[0];
  for (let i = 1; i <= contour.length; i++) {
    const k = i % contour.length, point = contour[k];
    const scale = Math.max(Math.abs(point.x), Math.abs(point.y), Math.abs(previous.x), Math.abs(previous.y));
    if (point.distanceToSquared(previous) <= 1e-20 * scale * scale) { contour.splice(k, 1); i--; }
    else previous = point;
  }
  const faces = ShapeUtils.triangulateShape(contour, []), positions = [];
  const vertex = (index, z) => positions.push(contour[index].x, contour[index].y, z);
  for (const [a, b, c] of faces) { vertex(c, 0); vertex(b, 0); vertex(a, 0); }
  for (const [a, b, c] of faces) { vertex(a, depth); vertex(b, depth); vertex(c, depth); }
  const lids = positions.length / 3;
  for (let i = contour.length - 1; i >= 0; i--) {
    const k = (i + contour.length - 1) % contour.length;
    vertex(i, 0); vertex(k, 0); vertex(i, depth);
    vertex(k, 0); vertex(k, depth); vertex(i, depth);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.addGroup(0, lids, 0); geometry.addGroup(lids, positions.length / 3 - lids, 1);
  geometry.computeVertexNormals();
  return geometry;
}
