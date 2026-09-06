import * as THREE from 'three';

// A shallow survey-camera angle reveals machine hulls without changing world physics.
export const CAMERA_PITCH = Math.PI / 8;
export const CAMERA_DISTANCE = 70;
export const PROJECTILE_HEIGHT = 1.35;
export const AIM_HEIGHT = PROJECTILE_HEIGHT;

export function frameIndustrialCamera(camera: THREE.OrthographicCamera, viewportWidth: number, viewportHeight: number) {
  const worldHeight = 60;
  const aspect = viewportWidth / viewportHeight;
  const worldWidth = worldHeight * aspect;
  const visibleWidth = Math.max(worldWidth + 8, (worldHeight * Math.cos(CAMERA_PITCH) + 8) * aspect);
  const projectedHeight = visibleWidth / aspect;
  camera.left = -visibleWidth / 2; camera.right = visibleWidth / 2;
  camera.top = projectedHeight / 2; camera.bottom = -projectedHeight / 2;
  camera.position.set(0, -Math.sin(CAMERA_PITCH) * CAMERA_DISTANCE, Math.cos(CAMERA_PITCH) * CAMERA_DISTANCE);
  camera.up.set(0, 0, 1); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  return { width: worldWidth, height: worldHeight };
}

const aimingPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -AIM_HEIGHT);
const raycaster = new THREE.Raycaster();
const intersection = new THREE.Vector3();
export function pointerToArena(camera: THREE.OrthographicCamera, x: number, y: number) {
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
  const point = raycaster.ray.intersectPlane(aimingPlane, intersection);
  return point ? { x: point.x, y: point.y } : { x: 0, y: 0 };
}
