import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import {
  CHEST_MESH_URL,
  bossDisplayName,
  bossMeshUrl,
  bossSpec,
  bossVisualHeight,
  type Boss,
  type BossId,
  type ChestPickup,
} from './bosses.ts';

const CHEST_HEIGHT = 1.4;
const FLOOR_EPS = .05;
export const DRACO_DECODER_PATH = '/assets/draco/';

export type ArenaPoseReport = {
  minZ: number;
  maxZ: number;
  height: number;
  meshes: number;
  triangles: number;
  trianglesAboveFloor: number;
  castShadow: boolean;
  materialsForced: number;
};

let sharedDraco: DRACOLoader | null = null;
const _vertex = new THREE.Vector3();
const _center = new THREE.Vector3();

export function getDracoLoader(): DRACOLoader {
  if (!sharedDraco) {
    sharedDraco = new DRACOLoader();
    sharedDraco.setDecoderPath(DRACO_DECODER_PATH);
  }
  return sharedDraco;
}

export function createBossGltfLoader(): GLTFLoader {
  const loader = new GLTFLoader();
  loader.setDRACOLoader(getDracoLoader());
  return loader;
}

function meshCount(root: THREE.Object3D): number {
  let count = 0;
  root.traverse(object => { if (object instanceof THREE.Mesh) count++; });
  return count;
}

function hasSkinnedMesh(root: THREE.Object3D): boolean {
  let skinned = false;
  root.traverse(object => { if (object instanceof THREE.SkinnedMesh) skinned = true; });
  return skinned;
}

function cloneBossScene(root: THREE.Object3D): THREE.Object3D {
  return hasSkinnedMesh(root) ? cloneSkinned(root) : root.clone(true);
}

function eachMaterial(object: THREE.Mesh, visit: (material: THREE.Material) => void) {
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  for (const material of materials) visit(material);
}

export function forceMaterialsVisible(root: THREE.Object3D): number {
  let forced = 0;
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.visible = true;
    eachMaterial(object, material => {
      material.visible = true;
      if ('opacity' in material && typeof material.opacity === 'number' && material.opacity < .2) {
        material.opacity = 1;
        material.transparent = false;
        forced++;
      }
      if ('color' in material && material.color instanceof THREE.Color) {
        if (material.color.r + material.color.g + material.color.b < .05) {
          material.color.set('#8a9096');
          forced++;
        }
      }
    });
  });
  return forced;
}

export function posedWorldBox(root: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || !object.geometry) return;
    const position = object.geometry.getAttribute('position');
    if (!position) return;
    if (object instanceof THREE.SkinnedMesh) {
      object.skeleton.update();
      for (let i = 0; i < position.count; i++) {
        _vertex.fromBufferAttribute(position, i);
        object.applyBoneTransform(i, _vertex);
        _vertex.applyMatrix4(object.matrixWorld);
        box.expandByPoint(_vertex);
      }
      return;
    }
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    if (!object.geometry.boundingBox) return;
    box.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
  });
  return box;
}

function triangleStats(root: THREE.Object3D): { triangles: number; trianglesAboveFloor: number } {
  let triangles = 0;
  let trianglesAboveFloor = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || !object.geometry) return;
    const position = object.geometry.getAttribute('position');
    if (!position) return;
    const index = object.geometry.getIndex();
    const skinned = object instanceof THREE.SkinnedMesh;
    if (skinned) object.skeleton.update();
    const apply = (vertex: THREE.Vector3, i: number) => {
      vertex.fromBufferAttribute(position, i);
      if (skinned) object.applyBoneTransform(i, vertex);
      vertex.applyMatrix4(object.matrixWorld);
    };
    const count = index ? index.count : position.count;
    for (let i = 0; i + 2 < count; i += 3) {
      const ia = index ? index.getX(i) : i;
      const ib = index ? index.getX(i + 1) : i + 1;
      const ic = index ? index.getX(i + 2) : i + 2;
      apply(a, ia); apply(b, ib); apply(c, ic);
      triangles++;
      if ((a.z + b.z + c.z) / 3 > FLOOR_EPS) trianglesAboveFloor++;
    }
  });
  return { triangles, trianglesAboveFloor };
}

function poseTimes(clip: THREE.AnimationClip | null): number[] {
  if (!clip || clip.duration <= 0) return [0];
  return [0, .25, .5, .75, 1].map(part => part * clip.duration);
}

function unionPosedBox(root: THREE.Object3D, mixer: THREE.AnimationMixer | null, clip: THREE.AnimationClip | null): THREE.Box3 {
  const union = new THREE.Box3();
  for (const time of poseTimes(clip)) {
    mixer?.setTime(time);
    root.updateMatrixWorld(true);
    const box = posedWorldBox(root);
    if (!box.isEmpty()) union.union(box);
  }
  mixer?.setTime(0);
  return union;
}

export function fitPosedToArena(
  root: THREE.Object3D,
  visualHeight: number,
  mixer: THREE.AnimationMixer | null = null,
  clip: THREE.AnimationClip | null = null,
): ArenaPoseReport {
  const inner = root.children[0] ?? root;
  let union = unionPosedBox(root, mixer, clip);
  if (union.isEmpty()) union.set(new THREE.Vector3(-.5, -.5, 0), new THREE.Vector3(.5, .5, visualHeight));
  const posedHeight = Math.max(.01, union.max.z - union.min.z);
  inner.scale.multiplyScalar(visualHeight / posedHeight);
  union = unionPosedBox(root, mixer, clip);
  if (union.isEmpty()) union.set(new THREE.Vector3(-.5, -.5, 0), new THREE.Vector3(.5, .5, visualHeight));
  union.getCenter(_center);
  inner.position.x -= _center.x;
  inner.position.y -= _center.y;
  inner.position.z -= union.min.z;
  mixer?.setTime(0);
  root.updateMatrixWorld(true);
  return inspectArenaPose(root);
}

export function applyShadowPolicy(root: THREE.Object3D, report?: ArenaPoseReport) {
  const pose = report ?? inspectArenaPose(root);
  const onScreen = pose.maxZ > FLOOR_EPS && pose.minZ > -.35 && pose.trianglesAboveFloor > 0;
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = onScreen;
    object.receiveShadow = true;
  });
}

export function inspectArenaPose(root: THREE.Object3D): ArenaPoseReport {
  const box = posedWorldBox(root);
  const stats = triangleStats(root);
  const minZ = box.isEmpty() ? 0 : box.min.z;
  const maxZ = box.isEmpty() ? 0 : box.max.z;
  let castShadow = false;
  root.traverse(object => { if (object instanceof THREE.Mesh && object.castShadow) castShadow = true; });
  return {
    minZ, maxZ, height: Math.max(0, maxZ - minZ),
    meshes: meshCount(root),
    triangles: stats.triangles,
    trianglesAboveFloor: stats.trianglesAboveFloor,
    castShadow,
    materialsForced: 0,
  };
}

export function prepareArenaMesh(
  source: THREE.Object3D,
  visualHeight: number,
  clips: THREE.AnimationClip[] = [],
): { group: THREE.Group; mixer: THREE.AnimationMixer | null; report: ArenaPoseReport; clip: THREE.AnimationClip | null } {
  const scene = cloneBossScene(source);
  const materialsForced = forceMaterialsVisible(scene);
  const container = new THREE.Group();
  container.add(scene);
  container.rotation.x = Math.PI / 2;
  const group = new THREE.Group();
  group.add(container);
  let mixer: THREE.AnimationMixer | null = null;
  const clip = clips.find(item => /walk/i.test(item.name))
    ?? clips.find(item => /run/i.test(item.name))
    ?? clips.find(item => /idle|bob|fly/i.test(item.name))
    ?? clips[0]
    ?? null;
  if (clip) {
    mixer = new THREE.AnimationMixer(group);
    mixer.clipAction(clip).play();
    mixer.update(0);
  }
  const report = fitPosedToArena(group, visualHeight, mixer, clip);
  report.materialsForced = materialsForced;
  applyShadowPolicy(group, report);
  report.castShadow = report.maxZ > FLOOR_EPS && report.minZ > -.35 && report.trianglesAboveFloor > 0;
  return { group, mixer, report, clip };
}

function orientToArena(root: THREE.Object3D, visualHeight: number, clips: THREE.AnimationClip[] = []): THREE.Group {
  return prepareArenaMesh(root, visualHeight, clips).group;
}

function makeLabel(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 128);
  ctx.font = '700 42px "IBM Plex Sans", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1a1c14cc';
  ctx.fillRect(36, 28, 440, 72);
  ctx.strokeStyle = '#ede4cc';
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 28, 440, 72);
  ctx.fillStyle = '#f4efe0';
  ctx.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(7.2, 1.8, 1);
  sprite.userData.texture = texture;
  return sprite;
}

function makeFallback(kind: BossId): THREE.Group {
  const spec = bossSpec(kind);
  const height = bossVisualHeight(kind);
  const material = new THREE.MeshPhysicalMaterial({
    color: spec.color, metalness: kind === 'jelly-prince' ? .08 : .42, roughness: kind === 'jelly-prince' ? .28 : .55,
    emissive: kind === 'jelly-prince' ? spec.color : '#000000', emissiveIntensity: kind === 'jelly-prince' ? .22 : 0,
  });
  const mesh = spec.fallback === 'box'
    ? new THREE.Mesh(new THREE.BoxGeometry(spec.radius * 1.7, spec.radius * 1.15, height), material)
    : new THREE.Mesh(new THREE.CapsuleGeometry(Math.min(spec.radius * .38, height * .22), Math.max(.2, height - Math.min(spec.radius * .38, height * .22) * 2), 6, 14), material);
  if (spec.fallback === 'capsule') {
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = height / 2;
  } else mesh.position.z = height / 2;
  mesh.castShadow = true;
  const group = new THREE.Group();
  group.add(mesh);
  const label = makeLabel(bossDisplayName(kind));
  label.position.z = height + 1.2;
  group.add(label);
  group.userData.fallback = true;
  return group;
}

function makeChestFallback(): THREE.Group {
  const material = new THREE.MeshPhysicalMaterial({ color: '#8a6234', metalness: .2, roughness: .64 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.05, CHEST_HEIGHT), material);
  box.position.z = CHEST_HEIGHT / 2; box.castShadow = true;
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.58, .18, .18), new THREE.MeshPhysicalMaterial({ color: '#d2b25a', metalness: .7, roughness: .35 }));
  band.position.z = CHEST_HEIGHT * .62;
  const group = new THREE.Group();
  group.add(box); group.add(band);
  const label = makeLabel('CHEST');
  label.position.z = CHEST_HEIGHT + 1;
  label.scale.set(4.4, 1.1, 1);
  group.add(label);
  return group;
}

export class BossPresentation {
  readonly group = new THREE.Group();
  private templates = new Map<BossId, THREE.Object3D>();
  private mixers = new Map<BossId, { clips: THREE.AnimationClip[] }>();
  private loading = new Set<string>();
  private active: THREE.Object3D | null = null;
  private activeKind: BossId | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private chestTemplate: THREE.Object3D | null = null;
  private chest: THREE.Object3D | null = null;
  private chestFallback: THREE.Group;
  private disposed = false;
  private lastReport: ArenaPoseReport | null = null;

  constructor() {
    this.chestFallback = makeChestFallback();
    this.chestFallback.visible = false;
    this.group.add(this.chestFallback);
    this.loadChest();
  }

  hasTemplate(kind: string) {
    return this.templates.has(kind as BossId);
  }

  chestLoaded() {
    return !!this.chestTemplate;
  }

  activeIsFallback() {
    return !!this.active?.userData.fallback;
  }

  activeMeshCount() {
    return this.active && !this.active.userData.fallback ? meshCount(this.active) : 0;
  }

  activePoseReport() {
    return this.lastReport;
  }

  private loadChest() {
    this.loading.add(CHEST_MESH_URL);
    createBossGltfLoader().load(CHEST_MESH_URL, gltf => {
      this.loading.delete(CHEST_MESH_URL);
      if (this.disposed) return;
      this.chestTemplate = orientToArena(gltf.scene, CHEST_HEIGHT, gltf.animations);
    }, undefined, () => { this.loading.delete(CHEST_MESH_URL); });
  }

  private loadBoss(kind: BossId) {
    const url = bossMeshUrl(kind);
    if (this.templates.has(kind) || this.loading.has(url)) return;
    this.loading.add(url);
    createBossGltfLoader().load(url, gltf => {
      this.loading.delete(url);
      if (this.disposed) return;
      try {
        if (meshCount(gltf.scene) < 1) return;
        this.templates.set(kind, gltf.scene);
        if (gltf.animations.length) this.mixers.set(kind, { clips: gltf.animations });
      } catch { /* Keep the colored fallback so a bad mesh never blocks combat. */ }
    }, undefined, () => { this.loading.delete(url); });
  }

  private attachBoss(kind: BossId) {
    this.clearBoss();
    this.activeKind = kind;
    this.loadBoss(kind);
    const template = this.templates.get(kind);
    if (!template) {
      this.active = makeFallback(kind);
      this.lastReport = null;
      this.group.add(this.active);
      return;
    }
    const prepared = prepareArenaMesh(template, bossVisualHeight(kind), this.mixers.get(kind)?.clips ?? []);
    this.active = prepared.group;
    this.mixer = prepared.mixer;
    this.lastReport = prepared.report;
    this.group.add(prepared.group);
  }

  private clearBoss() {
    if (this.active) {
      this.active.removeFromParent();
      if (this.active.userData.fallback) this.disposeObject(this.active);
      this.active = null;
    }
    this.mixer?.stopAllAction();
    this.mixer = null;
    this.activeKind = null;
    this.lastReport = null;
  }

  private attachChest() {
    if (this.chest) return;
    const body = this.chestTemplate ? this.chestTemplate.clone(true) : this.chestFallback;
    if (body === this.chestFallback) { this.chestFallback.visible = true; this.chest = this.chestFallback; return; }
    this.chest = body;
    this.group.add(body);
  }

  private clearChest() {
    if (!this.chest) return;
    if (this.chest === this.chestFallback) this.chestFallback.visible = false;
    else this.chest.removeFromParent();
    this.chest = null;
  }

  update(boss: Boss | null, chest: ChestPickup | null, dt: number, frozen: boolean) {
    if (boss) {
      if (this.activeKind !== boss.kind) this.attachBoss(boss.kind);
      else if (this.active?.userData.fallback && this.templates.has(boss.kind)) this.attachBoss(boss.kind);
      if (this.active) {
        this.active.visible = true;
        this.active.position.set(boss.x, boss.y, boss.hopOffset);
        this.active.rotation.z = boss.angle;
        const pop = boss.flash > 0 ? 1.1 : 1 + boss.blinkPop * 1.4;
        this.active.scale.setScalar(pop);
      }
      if (!frozen) this.mixer?.update(dt);
    } else this.clearBoss();

    if (chest) {
      if (this.chest === this.chestFallback && this.chestTemplate) {
        this.chestFallback.visible = false;
        this.chest = null;
      }
      if (!this.chest) this.attachChest();
      if (this.chest) {
        this.chest.visible = true;
        this.chest.position.set(chest.x, chest.y, 0);
        this.chest.rotation.z = chest.age * .4;
      }
    } else this.clearChest();
  }

  private disposeObject(root: THREE.Object3D) {
    root.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
        if (object.geometry) object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          const map = 'map' in material ? material.map : null;
          if (map instanceof THREE.Texture) map.dispose();
          material.dispose();
        }
      }
    });
  }

  dispose() {
    this.disposed = true;
    this.clearBoss();
    this.clearChest();
    this.chestFallback.removeFromParent();
    this.disposeObject(this.chestFallback);
    for (const template of this.templates.values()) this.disposeObject(template);
    if (this.chestTemplate) this.disposeObject(this.chestTemplate);
    this.templates.clear();
  }
}
