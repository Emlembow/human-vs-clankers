import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WebGLRenderLists } from 'three/src/renderers/webgl/WebGLRenderLists.js';
import { createProjectileMesh, createProjectileUnderlay } from '../lib/projectile-rendering.ts';

function drawOrder(objects) {
  const lists = new WebGLRenderLists(), list = lists.get(new THREE.Scene(), 0);
  list.init();
  for (const object of objects) list.push(object, object.geometry, object.material, 0, 0, null);
  list.sort();
  // WebGLRenderer renders opaque scenery before the transparent effects pass.
  return [...list.opaque, ...list.transmissive, ...list.transparent].map(item => item.object);
}
function clean(objects) {
  for (const object of objects) { object.geometry?.dispose(); object.material.dispose(); if (object.isInstancedMesh) object.dispose(); }
}

test('new opaque floor cannot overwrite additive projectiles', () => {
  const shots = createProjectileMesh(900);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(110, 60), new THREE.MeshStandardMaterial());
  try {
    // Reproduce the regression: blending without transparency leaves shots in
    // the opaque pass, where the later-created floor is painted over them.
    const foregroundOrder = shots.renderOrder;
    shots.material.transparent = false; shots.renderOrder = 0;
    const brokenOrder = drawOrder([shots, floor]);
    assert.ok(brokenOrder.indexOf(shots) < brokenOrder.indexOf(floor));
    shots.material.transparent = true; shots.renderOrder = foregroundOrder;
    const fixedShots = createProjectileMesh(900);
    try {
      for (const objects of [[floor, shots], [shots, floor], [floor, fixedShots], [fixedShots, floor]]) {
        const order = drawOrder(objects);
        assert.equal(order[0], floor);
      }
    } finally { clean([fixedShots]); }
  } finally { clean([shots, floor]); }
});

test('shots render after haze and flashes while retaining depth checks and capacity', () => {
  const shots = createProjectileMesh(900);
  const haze = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  try {
    assert.equal(drawOrder([shots, haze, flash]).at(-1), shots);
    assert.equal(shots.material.depthTest, true);
    assert.equal(shots.instanceMatrix.count, 900);
  } finally { clean([shots, haze, flash]); }
});


test('contrasting tracer casing renders above scenery and below the luminous core', () => {
  const shots = createProjectileMesh(900), casing = createProjectileUnderlay(900);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(110, 60), new THREE.MeshStandardMaterial());
  try {
    for (const objects of [[shots, casing, floor], [floor, casing, shots], [casing, floor, shots]]) {
      assert.deepEqual(drawOrder(objects), [floor, casing, shots]);
    }
    assert.equal(casing.material.blending, THREE.NormalBlending);
    assert.equal(casing.material.depthTest, true); assert.equal(casing.material.depthWrite, false);
    assert.equal(casing.instanceMatrix.count, shots.instanceMatrix.count);
    assert.ok(casing.material.color.r < .05 && casing.material.color.g < .05 && casing.material.color.b < .05, 'Casing must retain contrast against bright flooring');
  } finally { clean([shots, casing, floor]); }
});
