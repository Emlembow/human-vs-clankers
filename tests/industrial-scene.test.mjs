import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { ArenaAtmosphere } from '../lib/arena-atmosphere.ts';
import { IndustrialDrones } from '../lib/industrial-drones.ts';
import { IndustrialEnemies } from '../lib/industrial-enemies.ts';
import { frameIndustrialCamera, pointerToArena, AIM_HEIGHT } from '../lib/industrial-camera.ts';

function stubAssets() {
  const pending = [], originalDocument = globalThis.document;
  const originalTexture = THREE.TextureLoader.prototype.load, originalGltf = GLTFLoader.prototype.load, originalHdr = HDRLoader.prototype.load;
  THREE.TextureLoader.prototype.load = function (url, onLoad) { const texture = new THREE.Texture(); pending.push({ type: 'texture', url, texture, onLoad }); return texture; };
  HDRLoader.prototype.load = function (url, onLoad) { const texture = new THREE.DataTexture(); pending.push({ type: 'hdr', url, texture, onLoad }); return texture; };
  GLTFLoader.prototype.load = function (url, onLoad) { pending.push({ type: 'gltf', url, onLoad }); };
  // No DOM renderer is used. A missing 2D context exercises the decal fallback.
  globalThis.document = { createElement() { return { getContext() { return null; } }; } };
  return { pending, restore() { THREE.TextureLoader.prototype.load = originalTexture; GLTFLoader.prototype.load = originalGltf; HDRLoader.prototype.load = originalHdr; if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument; } };
}
function fakeBarrel() {
  const scene = new THREE.Group(), geometry = new THREE.BoxGeometry(.634, .93, .638);
  const texture = new THREE.Texture(), material = new THREE.MeshStandardMaterial({ map: texture });
  const mesh = new THREE.Mesh(geometry, material); mesh.name = 'asset-barrel'; mesh.position.y = .465; scene.add(mesh);
  return { scene, geometry, material, texture };
}
function flushAssets(stub) {
  const barrel = fakeBarrel();
  for (const request of stub.pending) request.onLoad(request.type === 'gltf' ? { scene: barrel.scene } : request.texture);
  return barrel;
}
function collect(root) { const result = { meshes: [], materials: new Set(), geometries: new Set() }; root.traverse(o => { if (o.isMesh || o.isSprite) { result.meshes.push(o); for (const m of Array.isArray(o.material) ? o.material : [o.material]) result.materials.add(m); if (o.geometry) result.geometries.add(o.geometry); } }); return result; }

test('tilted camera preserves ground bounds and pointer aiming at desktop and narrow aspect ratios', () => {
  for (const [width, height] of [[1280, 720], [900, 600], [390, 640]]) {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 180);
    const bounds = frameIndustrialCamera(camera, width, height);
    assert.ok(Math.abs(bounds.width - 60 * width / height) < 1e-10, 'A visual camera change must preserve the original combat width');
    assert.equal(bounds.height, 60, 'A visual camera change must preserve the original combat height');
    for (const x of [-bounds.width / 2 + 2, 0, bounds.width / 2 - 2]) for (const y of [-bounds.height / 2 + 2, 0, bounds.height / 2 - 2]) {
      const projected = new THREE.Vector3(x, y, AIM_HEIGHT).project(camera);
      assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1, `Playable position clipped at ${width}×${height}`);
      const aim = pointerToArena(camera, projected.x, projected.y);
      assert.ok(Math.hypot(aim.x - x, aim.y - y) < 1e-8, 'Screen-to-world ray must round-trip to the intended gameplay position');
    }
  }
});

test('physical unit clones share bounded geometry and dispose their shared resources', () => {
  const fleet = new IndustrialDrones();
  const kinds = ['player', 'drifter', 'chaser', 'spinner', 'orbital'];
  const first = kinds.map(kind => fleet.create(kind));
  const resources = first.map(collect);
  try {
    for (let i = 0; i < kinds.length; i++) {
      assert.ok(resources[i].meshes.length >= 3 && resources[i].meshes.length <= 16, `${kinds[i]} must be a material-batched solid model`);
      for (const material of resources[i].materials) assert.ok(material.isMeshStandardMaterial, `${kinds[i]} must use physically lit surface materials`);
      const size = new THREE.Box3().setFromObject(first[i]).getSize(new THREE.Vector3());
      assert.ok(size.x > .3 && size.y > .3 && size.z > .3, `${kinds[i]} must occupy three dimensions`);
      for (let n = 0; n < 160; n++) {
        const clone = fleet.create(kinds[i]), next = collect(clone);
        assert.deepEqual([...next.geometries], [...resources[i].geometries], 'Respawns must share cached geometry');
        assert.deepEqual([...next.materials], [...resources[i].materials], 'Respawns must share cached materials');
      }
    }
    const allGeometry = new Set(resources.flatMap(r => [...r.geometries])), allMaterials = new Set(resources.flatMap(r => [...r.materials]));
    const disposed = new Set(); for (const resource of [...allGeometry, ...allMaterials]) resource.addEventListener('dispose', () => disposed.add(resource));
    fleet.dispose();
    for (const resource of [...allGeometry, ...allMaterials]) assert.ok(disposed.has(resource), 'A shared model resource was leaked');
  } finally { fleet.dispose(); }
});

test('photographic environment props stay within the frame and pooled effects stay bounded', () => {
  const stub = stubAssets(), scene = new THREE.Scene(); let atmosphere;
  try {
    atmosphere = new ArenaAtmosphere(scene, () => {}, () => {}); scene.add(atmosphere.group); flushAssets(stub);
    const initial = collect(atmosphere.group), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 180);
    for (const [width, height] of [[1280, 720], [900, 600], [390, 640]]) {
      const bounds = frameIndustrialCamera(camera, width, height); atmosphere.resize(bounds.width, bounds.height); scene.updateMatrixWorld(true);
      const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      const barrels = []; atmosphere.group.traverse(o => { if (o.name === 'asset-barrel') barrels.push(o); });
      assert.equal(barrels.length, 12);
      for (const barrel of barrels) assert.ok(frustum.intersectsObject(barrel), `Downloaded barrel prop outside ${width}×${height} view`);
      for (const barrel of barrels) {
        const size = new THREE.Box3().setFromObject(barrel).getSize(new THREE.Vector3());
        assert.ok(size.z > size.x && size.z > size.y, 'Y-up glTF barrel must stand vertically in the Z-up arena');
      }
    }
    for (let i = 0; i < 2000; i++) { atmosphere.burst(0, 0, '#ffffff', 2); atmosphere.update(.01, i / 100, { x: 0, y: 0 }, true, false); }
    const after = collect(atmosphere.group);
    assert.equal(after.meshes.length, initial.meshes.length, 'Effects must reuse their fixed pool');
    assert.deepEqual(after.materials, initial.materials); assert.deepEqual(after.geometries, initial.geometries);
    const floor = initial.meshes.find(o => o.geometry?.type === 'PlaneGeometry' && o.receiveShadow && o.material.map && o.material.normalMap);
    assert.ok(floor, 'Photographic PBR floor must receive real scene shadows');
    assert.equal(floor.material.map.colorSpace, THREE.SRGBColorSpace);
    assert.equal(floor.material.normalMap.colorSpace, THREE.NoColorSpace);
    assert.equal(floor.material.roughnessMap.colorSpace, THREE.NoColorSpace);
    assert.equal(scene.environment.mapping, THREE.EquirectangularReflectionMapping);
  } finally { atmosphere?.dispose(); stub.restore(); }
});

test('unmount releases shadow targets and late assets cannot revive a disposed scene', () => {
  const stub = stubAssets(), scene = new THREE.Scene(); let atmosphere;
  try {
    let callbacks = 0;
    atmosphere = new ArenaAtmosphere(scene, () => callbacks++, () => callbacks++); scene.add(atmosphere.group);
    const key = atmosphere.group.children.find(o => o.isDirectionalLight);
    key.shadow.map = new THREE.WebGLRenderTarget(8, 8); let shadowDisposed = false;
    key.shadow.map.addEventListener('dispose', () => { shadowDisposed = true; });
    const resources = collect(atmosphere.group), disposed = new Set();
    for (const resource of [...resources.geometries, ...resources.materials]) resource.addEventListener('dispose', () => disposed.add(resource));
    atmosphere.dispose(); assert.equal(shadowDisposed, true, 'Directional shadow render target must be disposed');
    const barrel = fakeBarrel(), late = [...stub.pending.filter(p => p.texture).map(p => p.texture), barrel.geometry, barrel.material, barrel.texture], lateDisposed = new Set();
    for (const resource of late) resource.addEventListener('dispose', () => lateDisposed.add(resource));
    for (const request of stub.pending) request.onLoad(request.type === 'gltf' ? { scene: barrel.scene } : request.texture);
    assert.equal(callbacks, 0, 'Late assets must not invoke renderer callbacks');
    assert.equal(scene.environment, null); assert.equal(atmosphere.group.children.length, 0); assert.equal(atmosphere.group.parent, null);
    for (const resource of late) assert.ok(lateDisposed.has(resource), 'Late asset resource was leaked');
    // THREE.Sprite owns a global shared unit quad; it is not allocated by this scene.
    const ownGeometry = [...resources.geometries].filter(g => !resources.meshes.some(o => o.isSprite && o.geometry === g));
    for (const resource of [...ownGeometry, ...resources.materials]) assert.ok(disposed.has(resource), 'Owned scene resource was leaked');
  } finally { stub.restore(); }
});


test('instanced enemy updates preserve health-only scaling, continuous spawn visibility, capacity and pooled ownership', () => {
  const fleet = new IndustrialDrones(), enemies = new IndustrialEnemies(fleet, 160);
  const instanceResources = collect(enemies.group), shared = new Set([...instanceResources.geometries, ...instanceResources.materials]);
  const sharedDisposals = new Set(), instanceDisposals = new Set();
  for (const resource of shared) resource.addEventListener('dispose', () => sharedDisposals.add(resource));
  for (const mesh of instanceResources.meshes) mesh.addEventListener('dispose', () => instanceDisposals.add(mesh));
  const enemy = { id: 1, kind: 'drifter', elite: false, x: 4, y: -3, vx: 2, vy: 0, angle: 0, age: 2, hp: 100, maxHp: 100, flash: 0 };
  enemies.update([enemy]);
  const body = enemies.group.children.find(o => o.visible && !o.name.endsWith('status-light'));
  const status = enemies.group.children.find(o => o.visible && o.name.endsWith('status-light'));
  const bodyBefore = new THREE.Matrix4(), statusBefore = new THREE.Matrix4(); body.getMatrixAt(0, bodyBefore); status.getMatrixAt(0, statusBefore);
  enemies.update([{ ...enemy, hp: 20 }]);
  const bodyAfter = new THREE.Matrix4(), statusAfter = new THREE.Matrix4(); body.getMatrixAt(0, bodyAfter); status.getMatrixAt(0, statusAfter);
  assert.deepEqual(bodyAfter.elements, bodyBefore.elements, 'Taking damage must not deform the chassis');
  const scaleBefore = new THREE.Vector3().setFromMatrixScale(statusBefore), scaleAfter = new THREE.Vector3().setFromMatrixScale(statusAfter);
  assert.ok(Math.abs(scaleAfter.x / scaleBefore.x - .2) < 1e-6); assert.equal(scaleBefore.y, scaleAfter.y); assert.equal(scaleBefore.z, scaleAfter.z);
  for (const age of [0, .1, .4, .79]) {
    enemies.update([{ ...enemy, age }]);
    assert.equal(body.count, 1); assert.equal(body.visible, true, 'Spawn grace must never hide the humanoid silhouette');
    body.getMatrixAt(0, bodyAfter);
    assert.deepEqual(bodyAfter.elements, bodyBefore.elements, 'Spawn grace must not shrink the head into a tiny marker');
  }
  enemies.update(Array.from({ length: 161 }, (_, i) => ({ ...enemy, id: i + 1, x: i / 10 })));
  assert.ok(enemies.group.children.filter(o => o.visible).every(o => o.count === 160 && o.instanceMatrix.count === 160));
  assert.equal(collect(enemies.group).meshes.length, instanceResources.meshes.length, 'Enemy count must not allocate draw objects');
  enemies.update([]); assert.ok(enemies.group.children.every(o => o.count === 0 && !o.visible));
  enemies.dispose();
  assert.equal(instanceDisposals.size, instanceResources.meshes.length); assert.equal(sharedDisposals.size, 0, 'Instancer must not prematurely dispose the fleet resources');
  fleet.dispose(); assert.equal(sharedDisposals.size, shared.size);
});
