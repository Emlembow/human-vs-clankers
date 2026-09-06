import * as THREE from 'three';
import { IndustrialDrones } from './industrial-drones.ts';
import type { Enemy, EnemyKind } from './game-model';

type Part = { mesh: THREE.InstancedMesh; transform: THREE.Matrix4; status: boolean };
type Batch = { parts: Part[]; count: number };

/** Instance each shared machine part across the whole wave, including its shadow pass. */
export class IndustrialEnemies {
  readonly group = new THREE.Group();
  private batches = new Map<string, Batch>();
  private transform = new THREE.Object3D();
  private matrix = new THREE.Matrix4();
  private healthScale = new THREE.Matrix4();
  readonly capacity: number;

  constructor(fleet: IndustrialDrones, capacity: number) {
    this.capacity = capacity;
    for (const kind of ['drifter', 'chaser', 'spinner'] as EnemyKind[]) for (const elite of [false, true]) {
      const template = fleet.create(kind, elite); template.updateMatrixWorld(true);
      const parts: Part[] = [];
      template.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        const mesh = new THREE.InstancedMesh(object.geometry, object.material, capacity);
        mesh.name = `${kind}-${elite ? 'elite' : 'standard'}-${object.name || parts.length}`;
        mesh.count = 0; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
        mesh.castShadow = object.castShadow; mesh.receiveShadow = object.receiveShadow;
        this.group.add(mesh); parts.push({ mesh, transform: object.matrixWorld.clone(), status: object.name === 'status-light' });
      });
      this.batches.set(`${kind}:${elite}`, { parts, count: 0 });
    }
  }

  update(enemies: readonly Enemy[]) {
    for (const batch of this.batches.values()) batch.count = 0;
    for (const enemy of enemies) {
      if (enemy.age <= .8 && Math.floor(enemy.age * 15) % 2 !== 0) continue;
      const batch = this.batches.get(`${enemy.kind}:${enemy.elite}`)!;
      if (batch.count >= this.capacity) continue;
      this.transform.position.set(enemy.x, enemy.y, 0);
      this.transform.rotation.set(0, 0, enemy.kind === 'spinner' ? enemy.angle : Math.atan2(enemy.vy, enemy.vx));
      this.transform.scale.setScalar((enemy.age < .8 ? .3 + enemy.age / .8 * .7 : 1) * (enemy.elite ? 1.4 : 1) * (enemy.flash > 0 ? 1.1 : 1));
      this.transform.updateMatrix();
      for (const part of batch.parts) {
        this.matrix.multiplyMatrices(this.transform.matrix, part.transform);
        if (part.status) this.matrix.multiply(this.healthScale.makeScale(Math.max(.15, enemy.hp / enemy.maxHp), 1, 1));
        part.mesh.setMatrixAt(batch.count, this.matrix);
      }
      batch.count++;
    }
    for (const batch of this.batches.values()) for (const part of batch.parts) { part.mesh.count = batch.count; part.mesh.visible = batch.count > 0; part.mesh.instanceMatrix.needsUpdate = true; }
  }

  dispose() { for (const batch of this.batches.values()) for (const part of batch.parts) part.mesh.dispose(); this.batches.clear(); this.group.removeFromParent(); this.group.clear(); }
}
