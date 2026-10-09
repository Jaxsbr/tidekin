import * as THREE from 'three';

const ease = t => 1 - (1 - t) ** 3;
const clamp = t => THREE.MathUtils.clamp(t, 0, 1);

// Presentation only: inventory and upgrade ownership stay in the domain.
export function createBuildCinematic(boat, upgradeParts) {
  const parts = [];
  for (const upgrade of upgradeParts) {
    upgrade.object.traverse(object => {
      if (!object.isMesh) return;
      object.geometry.computeBoundingBox();
      parts.push({ id: upgrade.id, object, position: object.position.clone(), scale: object.scale.clone(),
        center: object.geometry.boundingBox.getCenter(new THREE.Vector3()).multiply(object.scale) });
    });
  }
  const glow = new THREE.PointLight('#ffcf80', 0, 12, 2);
  glow.position.set(-4, 2, .25); boat.add(glow);
  const positions = new Float32Array(32 * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: '#ffe2a0', size: .12, transparent: true, opacity: 0, depthWrite: false });
  const sparks = new THREE.Points(geometry, material); sparks.frustumCulled = false; boat.add(sparks);
  const focus = new THREE.Vector3(-4, 1, .25);
  let active = false, progress = 0, id = null, duration = 3;
  function restore() {
    for (const part of parts) { part.object.position.copy(part.position); part.object.scale.copy(part.scale); }
    glow.intensity = 0; sparks.visible = false;
  }
  function begin(reducedMotion, upgrade = 'waterwheel') {
    restore(); active = true; progress = 0; id = upgrade; duration = reducedMotion ? .35 : 3;
    boat.updateMatrixWorld(true);
    const target=upgradeParts.find(part=>part.id===id)?.object;
    if(target){new THREE.Box3().setFromObject(target).getCenter(focus);boat.worldToLocal(focus);}
    glow.position.copy(focus).add(new THREE.Vector3(0,1,0));
  }
  function update(dt, reducedMotion) {
    if (!active) return;
    if (reducedMotion) duration = .35;
    progress = clamp(progress + dt / duration);
    const assembling=parts.filter(part=>part.id===id);
    for (const [i, part] of assembling.entries()) {
      const t = reducedMotion ? ease(progress) : ease(clamp((progress - i / Math.max(1, assembling.length - 1) * .37) / .43));
      const scale = reducedMotion ? .96 + t * .04 : .15 + t * .85;
      part.object.scale.copy(part.scale).multiplyScalar(scale);
      part.object.position.copy(part.position).addScaledVector(part.center, 1 - scale);
      if (!reducedMotion) { part.object.position.x -= (1 - t) * (3.8 + i * .35); part.object.position.y += (1 - t) * (2.5 + i * .5); }
    }
    const burst = reducedMotion ? 0 : Math.sin(clamp((progress - .35) / .65) * Math.PI);
    glow.intensity = burst * 16; sparks.visible = burst > 0; material.opacity = burst;
    for (let i = 0; i < 32; i++) {
      const age = (progress * 2.5 + i / 32) % 1, angle = i * 2.399;
      positions[i * 3] = focus.x + Math.cos(angle) * age * 1.8;
      positions[i * 3 + 1] = focus.y + Math.sin(angle) * age * 1.4 + age * 2 - age * age * 3;
      positions[i * 3 + 2] = focus.z + Math.sin(i * 1.7) * age * 1.8;
    }
    geometry.attributes.position.needsUpdate = true;
    if (progress === 1) { active = false; restore(); }
  }
  return { begin, update, getStatus: () => ({ active, progress, id }),
    wheelSpeed: () => active && id === 'waterwheel' ? ease(clamp((progress - .65) / .35)) : 1 };
}
