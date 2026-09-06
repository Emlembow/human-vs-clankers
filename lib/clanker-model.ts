import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const ROBOT_PARTS = ['head', 'torso', 'left-arm', 'right-arm', 'left-leg', 'right-leg'] as const;
export type RobotPart = typeof ROBOT_PARTS[number];
export type ClankerPart = { name: RobotPart; geometry: THREE.BufferGeometry; pivot: THREE.Vector3 };
export type ClankerModel = { parts: ClankerPart[]; sourceMeshCount: number; triangles: number; height: number; dispose: () => void };
export const CLANKER_MODEL_URL = '/assets/robots/ob3m9.glb';
export const CLANKER_HEIGHT = 2.75;

const colors: Record<string, string> = {
  // Broad pale armor stays readable against the worn floor; dark joints retain
  // the imported model's anatomy without an outline or a glowing body material.
  mat5: '#d3bb80', mat23: '#27332e', mat16: '#e0e4d7', mat17: '#a6b4ac',
  mat24: '#b6c8bc', mat4: '#fff0bd', mat3: '#c7b58e',
};

/** Prepare the actual OB3M9 rigid model, preserving geometry rather than rebuilding it. */
export function prepareClankerModel(source: THREE.Object3D): ClankerModel {
  source.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(source);
  const height = sourceBounds.max.y - sourceBounds.min.y;
  if (!Number.isFinite(height) || height < .01) throw new Error('The clanker model has no usable dimensions.');
  const factor = CLANKER_HEIGHT / height;
  // Source faces +Z and stands on Y. The arena faces +X and stands on Z.
  const normalization = new THREE.Matrix4().set(0, 0, factor, .02 * factor, factor, 0, 0, 0, 0, factor, 0, -sourceBounds.min.y * factor - .22, 0, 0, 0, 1);
  const buckets = new Map<RobotPart, THREE.BufferGeometry[]>(ROBOT_PARTS.map(name => [name, []]));
  const sourcePivots: Record<RobotPart, THREE.Vector3> = {
    head: new THREE.Vector3(0, .22, -.02), torso: new THREE.Vector3(0, -.3, -.02),
    'left-arm': new THREE.Vector3(-.165, .11, -.02), 'right-arm': new THREE.Vector3(.165, .11, -.02),
    'left-leg': new THREE.Vector3(-.105, -.46, -.02), 'right-leg': new THREE.Vector3(.12, -.46, -.02),
  };
  const pivots = Object.fromEntries(ROBOT_PARTS.map(name => [name, sourcePivots[name].clone().applyMatrix4(normalization)])) as Record<RobotPart, THREE.Vector3>;
  let sourceMeshCount = 0;
  const pieces: THREE.BufferGeometry[] = [];
  try {
    source.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      if (object instanceof THREE.SkinnedMesh) throw new Error('Expected the rigid OB3M9 model, not unresolved skinning.');
      sourceMeshCount++;
      const bounds = new THREE.Box3().setFromObject(object), center = bounds.getCenter(new THREE.Vector3());
      const name: RobotPart = center.y > .2 ? 'head' : center.y < -.42 ? (center.x < 0 ? 'left-leg' : 'right-leg') : Math.abs(center.x) > .145 && center.y > -.02 ? (center.x < 0 ? 'left-arm' : 'right-arm') : 'torso';
      const original = object.geometry.clone(); original.applyMatrix4(object.matrixWorld);
      if (name.endsWith('arm')) {
        const pivot = sourcePivots[name], angle = (name === 'left-arm' ? 1 : -1) * .99;
        original.translate(-pivot.x, -pivot.y, -pivot.z); original.rotateZ(angle); original.translate(pivot.x, pivot.y, pivot.z);
      }
      original.applyMatrix4(normalization);
      const geometry = original.index ? original.toNonIndexed() : original;
      if (geometry !== original) original.dispose();
      pieces.push(geometry);
      const position = geometry.getAttribute('position'), color = new THREE.Color(colors[(Array.isArray(object.material) ? object.material[0] : object.material).name] ?? '#929c94');
      const vertexColors = new Float32Array(position.count * 3), uv = new Float32Array(position.count * 2);
      for (let i = 0; i < position.count; i++) {
        color.toArray(vertexColors, i * 3); uv[i * 2] = (position.getY(i) + 1.5) / 3; uv[i * 2 + 1] = (position.getZ(i) + .25) / 3;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3)); geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal', 'color', 'uv'].includes(name)) geometry.deleteAttribute(name);
      if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
      const pivot = pivots[name]; geometry.translate(-pivot.x, -pivot.y, -pivot.z); buckets.get(name)!.push(geometry);
    });
    if (ROBOT_PARTS.some(name => buckets.get(name)!.length === 0)) throw new Error('The clanker model is missing a head, torso, arm or leg.');
    const parts = ROBOT_PARTS.map(name => {
      const geometry = mergeGeometries(buckets.get(name)!, false); if (!geometry) throw new Error('The clanker geometry could not be combined.');
      geometry.computeBoundingBox(); geometry.computeBoundingSphere(); return { name, geometry, pivot: pivots[name] };
    });
    const triangles = parts.reduce((n, part) => n + (part.geometry.index?.count ?? part.geometry.attributes.position.count) / 3, 0);
    return { parts, sourceMeshCount, triangles, height: CLANKER_HEIGHT, dispose: () => parts.forEach(part => part.geometry.dispose()) };
  } finally { pieces.forEach(geometry => geometry.dispose()); }
}

/** Source GLTF resources are separate from the newly prepared shared geometry. */
export function disposeClankerSource(source: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  source.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return; geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material); for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose());
}

/** Phase is based on frozen simulation age, so rewards/pause also stop the gait. */
export function clankerPartPitch(part: string, age: number, kind: string) {
  const phase = age * (kind === 'chaser' ? 10 : kind === 'spinner' ? 8.6 : 6.8), swing = Math.sin(phase);
  if (part === 'left-leg') return swing * .44;
  if (part === 'right-leg') return -swing * .44;
  if (part === 'left-arm') return -swing * .22;
  if (part === 'right-arm') return swing * .22;
  return 0;
}
