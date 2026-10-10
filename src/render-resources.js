/** Release one owned scene subtree. Shared attached resources are disposed once.
 * Detached textures must be supplied explicitly by their owner. Clear the tree
 * after release so a repeated teardown cannot dispose the same resources again. */
export function releaseObjectTree(root, { textures: detachedTextures = [] } = {}) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set(detachedTextures);
  const instances = new Set();
  const shadows = new Set();
  root.traverse(object => {
    if (object.isInstancedMesh) instances.add(object);
    if (object.geometry) geometries.add(object.geometry);
    if (object.shadow) shadows.add(object.shadow);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material) materials.add(material);
    }
  });
  const findTextures = value => {
    if (value?.isTexture) textures.add(value);
    else if (Array.isArray(value)) value.forEach(findTextures);
  };
  for (const material of materials) {
    Object.values(material).forEach(findTextures);
    for (const uniform of Object.values(material.uniforms ?? {})) findTextures(uniform?.value);
  }
  shadows.forEach(shadow => shadow.dispose());
  instances.forEach(instance => instance.dispose());
  geometries.forEach(geometry => geometry.dispose());
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
  root.clear();
  return { geometries: geometries.size, materials: materials.size, textures: textures.size,
    instances: instances.size, shadows: shadows.size };
}

/** Whole-world shutdown includes the owning renderer; site replacement does not. */
export function releaseScene(scene, renderer, ownership) {
  releaseObjectTree(scene, ownership);
  renderer.dispose();
}
