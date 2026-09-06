import * as THREE from 'three';

export function createProjectileMesh(capacity: number) {
  // Additive blending alone does not put a material in Three's transparent
  // pass. Opaque scenery can paint over earlier shots that do not write depth.
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffffff').multiplyScalar(1.8),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, capacity);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;
  return mesh;
}

/** A narrow charcoal casing keeps luminous ammunition readable over pale concrete. */
export function createProjectileUnderlay(capacity: number) {
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#18201a', transparent: true, opacity: .76, depthWrite: false, toneMapped: false }), capacity);
  mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 9;
  return mesh;
}
