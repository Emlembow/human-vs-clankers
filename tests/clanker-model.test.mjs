import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import ts from 'typescript';
import vm from 'node:vm';
import { IndustrialDrones } from '../lib/industrial-drones.ts';
import { IndustrialEnemies } from '../lib/industrial-enemies.ts';
import * as clanker from '../lib/clanker-model.ts';
import { frameIndustrialCamera, PROJECTILE_HEIGHT } from '../lib/industrial-camera.ts';

const kinds = ['drifter', 'chaser', 'spinner'];
async function sourceModel() {
  // The shipped GLB has embedded buffers and no images or external dependencies.
  const bytes = fs.readFileSync(new URL('../public/assets/robots/ob3m9.glb', import.meta.url));
  return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
}
function resources(root) {
  const geometry = new Set(), materials = new Set();
  root.traverse(o => { if (o.isMesh) { geometry.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m); } });
  return [...geometry, ...materials];
}
function watch(items) { const counts = new Map(items.map(o => [o, 0])); for (const item of items) item.addEventListener('dispose', () => counts.set(item, counts.get(item) + 1)); return counts; }
function matrix(mesh, index = 0) { const m = new THREE.Matrix4(); mesh.getMatrixAt(index, m); return m; }
function enemy(kind, elite = false, extras = {}) { return { id: 1, kind, elite, x: 3, y: -4, vx: 2, vy: 0, age: 2, hp: 10, maxHp: 10, flash: 0, ...extras }; }

// These are geometry/resource tests; they do not create a WebGL renderer or
// certify final material appearance, frame rate, or perceived gameplay clarity.
test('shipped Poly model becomes six shared humanoid parts without losing triangles', async () => {
  const source = await sourceModel(), sourceResources = resources(source), sourceDisposal = watch(sourceResources);
  const prepared = clanker.prepareClankerModel(source), fleet = new IndustrialDrones();
  assert.equal(prepared.sourceMeshCount, 74); assert.equal(prepared.triangles, 8036);
  assert.deepEqual(prepared.parts.map(p => p.name), [...clanker.ROBOT_PARTS]);
  const preparedDisposal = watch(prepared.parts.map(p => p.geometry));
  clanker.disposeClankerSource(source);
  assert.ok([...sourceDisposal.values()].every(n => n === 1));
  assert.ok([...preparedDisposal.values()].every(n => n === 0), 'Prepared geometry must not alias disposed GLTF buffers');
  assert.equal(fleet.installClanker(prepared), true);
  for (const kind of kinds) for (const elite of [false, true]) {
    const model = fleet.create(kind, elite);
    assert.match(model.userData.source, /OB3M9.*Giuseppe Zemba.*CC BY 3\.0/);
    assert.deepEqual(model.children.map(p => p.name), [...clanker.ROBOT_PARTS, 'status-light']);
    for (const part of prepared.parts) {
      const mesh = model.getObjectByName(part.name);
      assert.equal(mesh.geometry, part.geometry); assert.equal(mesh.material.vertexColors, true);
      assert.ok(mesh.castShadow && mesh.receiveShadow && mesh.material.isMeshStandardMaterial);
      for (const attr of ['position', 'normal', 'uv', 'color']) assert.ok(mesh.geometry.getAttribute(attr));
      for (const attr of Object.values(mesh.geometry.attributes)) assert.ok([...attr.array].every(Number.isFinite));
    }
    const head = new THREE.Box3().setFromObject(model.getObjectByName('head'));
    const torso = new THREE.Box3().setFromObject(model.getObjectByName('torso'));
    const left = new THREE.Box3().setFromObject(model.getObjectByName('left-leg'));
    const right = new THREE.Box3().setFromObject(model.getObjectByName('right-leg'));
    assert.ok(head.min.z > torso.min.z && left.max.z < head.min.z);
    assert.ok(left.max.y < right.min.y, 'Legs must remain distinct, not fused into a chassis');
    assert.ok(torso.min.z < PROJECTILE_HEIGHT && torso.max.z > PROJECTILE_HEIGHT, 'Tracer plane must intersect torso height');
    assert.ok(left.min.z > -.28 && left.min.z < .01, 'Feet must sit just above the arena floor');
    const first = resources(model);
    for (let i = 0; i < 160; i++) assert.deepEqual(resources(fleet.create(kind, elite)), first, 'Clones must reuse shared geometry/materials');
  }
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 180);
  // Check the tallest elite at every spawn corner, facing four directions.
  for (const [w, h] of [[1280, 720], [900, 600], [390, 640]]) {
    const bounds = frameIndustrialCamera(camera, w, h), model = fleet.create('spinner', true);
    model.scale.multiplyScalar(1.4);
    for (const x of [-bounds.width / 2 + 2, bounds.width / 2 - 2]) for (const y of [-28, 28]) for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      model.position.set(x, y, 0); model.rotation.z = angle; model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      for (const px of [box.min.x, box.max.x]) for (const py of [box.min.y, box.max.y]) for (const pz of [box.min.z, box.max.z]) {
        const projected = new THREE.Vector3(px, py, pz).project(camera);
        assert.ok(Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1, 'A spawned humanoid must fit the unchanged camera frame');
      }
    }
  }
  fleet.dispose(); assert.ok([...preparedDisposal.values()].every(n => n === 1));
});

test('live fallback replacement keeps distinct roles, frozen gait and a fixed 160-enemy instancing budget', async () => {
  const fleet = new IndustrialDrones(), pool = new IndustrialEnemies(fleet, 160);
  const fallback = [...pool.group.children], fallbackDisposal = watch(fallback);
  for (const kind of kinds) assert.deepEqual(fleet.create(kind).children.map(p => p.name), [...clanker.ROBOT_PARTS, 'status-light']);
  const source = await sourceModel(), prepared = clanker.prepareClankerModel(source); clanker.disposeClankerSource(source);
  fleet.installClanker(prepared); pool.update(kinds.map(kind => enemy(kind)));
  assert.ok([...fallbackDisposal.values()].every(n => n === 1), 'Replacing loaded artwork must release fallback instance buffers');
  assert.equal(pool.group.children.length, 42); assert.equal(pool.group.children.filter(m => m.castShadow).length, 36);
  const colors = kinds.map(kind => pool.group.children.find(m => m.name === `${kind}-standard-torso`).instanceColor.array.slice(0, 3).join(','));
  assert.equal(new Set(colors).size, 3, 'All combat roles need distinct color coding');
  const scales = kinds.map(kind => fleet.create(kind).scale.toArray().join(',')); assert.equal(new Set(scales).size, 3);
  const before = new Map(pool.group.children.map(m => [m.name, matrix(m).elements.slice()]));
  pool.update(kinds.map(kind => enemy(kind)));
  for (const mesh of pool.group.children) assert.deepEqual(matrix(mesh).elements, before.get(mesh.name), 'Frozen simulation age must freeze gait');
  for (const kind of kinds) for (const [vx, vy, angle] of [[1, 0, 0], [0, 1, Math.PI / 2], [-1, 0, Math.PI], [0, -1, -Math.PI / 2]]) {
    pool.update([enemy(kind, false, { vx, vy })]);
    const head = pool.group.children.find(m => m.name === `${kind}-standard-head`), m = matrix(head);
    assert.ok(Math.abs(Math.atan2(m.elements[1], m.elements[0]) - angle) < 1e-6, 'Every role faces travel direction');
  }
  pool.update([enemy('chaser', false, { age: 3 })]);
  assert.notDeepEqual(matrix(pool.group.children.find(m => m.name === 'chaser-standard-left-leg')).elements, before.get('chaser-standard-left-leg'));
  const shared = new Set(pool.group.children.flatMap(m => [m.geometry, m.material])), sharedDisposal = watch([...shared]), instanceDisposal = watch([...pool.group.children]);
  const identities = [...pool.group.children];
  for (let frame = 0; frame < 120; frame++) pool.update(Array.from({ length: 160 }, (_, i) => enemy(kinds[i % 3], i % 2 === 0, { id: i, x: i % 10, y: i / 10, age: 4 + frame / 60 })));
  assert.deepEqual(pool.group.children, identities);
  assert.equal(pool.group.children.reduce((sum, mesh) => sum + mesh.count, 0), 160 * 7);
  const triangles = pool.group.children.reduce((sum, mesh) => sum + mesh.count * (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3, 0);
  assert.equal(triangles, 160 * (8036 + 12));
  assert.ok(pool.group.children.every(mesh => mesh.instanceMatrix.count === 160));
  pool.dispose(); assert.ok([...instanceDisposal.values()].every(n => n === 1)); assert.ok([...sharedDisposal.values()].every(n => n === 0));
  fleet.dispose(); assert.ok([...sharedDisposal.values()].every(n => n === 1));
});

test('the actual engine loader replaces demos, tolerates failed loads and releases a late GLTF', async () => {
  const requests = [];
  const source = fs.readFileSync(new URL('../lib/game-engine.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext('(function(require, module, exports) {' + compiled + '\n})')(id => {
    if (id === 'three') return THREE;
    if (id.endsWith('/GLTFLoader.js')) return { GLTFLoader: class { load(...args) { requests.push(args); } } };
    if (id === './clanker-model') return clanker;
    return {};
  }, compiledModule, compiledModule.exports);
  const engine = Object.create(compiledModule.exports.GameEngine.prototype);
  engine.fleet = new IndustrialDrones(); engine.scene = new THREE.Scene(); engine.demo = []; engine.disposed = false;
  engine.refreshDemoModels(); const old = engine.demo.slice(); engine.loadClankerArtwork();
  assert.equal(requests[0][0], clanker.CLANKER_MODEL_URL);
  requests[0][3](new Error('Simulated load failure')); assert.deepEqual(engine.demo, old);
  const sourceScene = await sourceModel(), release = watch(resources(sourceScene));
  requests[0][1]({ scene: sourceScene });
  assert.ok(old.every(model => model.parent === null)); assert.equal(engine.demo.length, 12);
  assert.ok(engine.demo.every(model => model.userData.source.includes('OB3M9')));
  assert.ok([...release.values()].every(n => n === 1));
  engine.disposed = true; engine.fleet.dispose();
  const late = await sourceModel(), lateRelease = watch(resources(late)), current = engine.demo.slice();
  requests[0][1]({ scene: late });
  assert.deepEqual(engine.demo, current); assert.ok([...lateRelease.values()].every(n => n === 1));
  const afterUnmountSource = await sourceModel(), afterUnmount = clanker.prepareClankerModel(afterUnmountSource); clanker.disposeClankerSource(afterUnmountSource);
  const afterUnmountRelease = watch(afterUnmount.parts.map(p => p.geometry));
  assert.equal(engine.fleet.installClanker(afterUnmount), false); assert.ok([...afterUnmountRelease.values()].every(n => n === 1));
});
