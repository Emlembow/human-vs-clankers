import * as THREE from 'three';
import { IndustrialDrones } from './industrial-drones.ts';
import { clankerPartPitch } from './clanker-model.ts';
import type { Enemy, EnemyKind } from './game-model';

type Part = { mesh: THREE.InstancedMesh; transform: THREE.Matrix4; name: string };
type Batch = { parts: Part[]; count: number };
const roleColors = { drifter: '#b1b9b1', chaser: '#d3a198', spinner: '#cfb985' };

/** Six humanoid parts share a bounded set of instance batches across the whole wave. */
export class IndustrialEnemies {
  readonly group = new THREE.Group();
  private batches = new Map<string, Batch>();
  private transform = new THREE.Object3D();
  private matrix = new THREE.Matrix4();
  private local = new THREE.Matrix4();
  private fleet: IndustrialDrones;
  private revision = -1;
  readonly capacity: number;

  constructor(fleet: IndustrialDrones, capacity: number) { this.fleet = fleet; this.capacity = capacity; this.rebuild(); }

  private rebuild() {
    for (const batch of this.batches.values()) for (const part of batch.parts) part.mesh.dispose();
    this.batches.clear(); this.group.clear();
    for (const kind of ['drifter', 'chaser', 'spinner'] as EnemyKind[]) for (const elite of [false, true]) {
      const template = this.fleet.create(kind, elite); template.updateMatrixWorld(true);
      const parts: Part[] = [];
      template.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        const mesh = new THREE.InstancedMesh(object.geometry, object.material, this.capacity);
        mesh.name = `${kind}-${elite ? 'elite' : 'standard'}-${object.name}`;
        mesh.count = 0; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
        mesh.castShadow = object.castShadow; mesh.receiveShadow = object.receiveShadow;
        const color = new THREE.Color(roleColors[kind]); if (elite) color.lerp(new THREE.Color('#d9c18c'), .3);
        if (object.name !== 'status-light') { for (let i = 0; i < this.capacity; i++) mesh.setColorAt(i, color); mesh.instanceColor!.needsUpdate = true; }
        this.group.add(mesh); parts.push({ mesh, transform: object.matrixWorld.clone(), name: object.name });
      });
      this.batches.set(`${kind}:${elite}`, { parts, count: 0 });
    }
    this.revision = this.fleet.revision;
  }

  update(enemies: readonly Enemy[]) {
    if (this.revision !== this.fleet.revision) this.rebuild();
    for (const batch of this.batches.values()) batch.count = 0;
    for (const enemy of enemies) {
      if (enemy.age <= .8 && Math.floor(enemy.age * 15) % 2 !== 0) continue;
      const batch = this.batches.get(`${enemy.kind}:${enemy.elite}`)!;
      if (batch.count >= this.capacity) continue;
      this.transform.position.set(enemy.x, enemy.y, 0);
      this.transform.rotation.set(0, 0, Math.atan2(enemy.vy, enemy.vx));
      this.transform.scale.setScalar((enemy.age < .8 ? .3 + enemy.age / .8 * .7 : 1) * (enemy.elite ? 1.4 : 1) * (enemy.flash > 0 ? 1.1 : 1));
      this.transform.updateMatrix();
      for (const part of batch.parts) {
        this.matrix.multiplyMatrices(this.transform.matrix, part.transform);
        if (part.name === 'status-light') this.matrix.multiply(this.local.makeScale(Math.max(.15, enemy.hp / enemy.maxHp), 1, 1));
        else this.matrix.multiply(this.local.makeRotationY(clankerPartPitch(part.name, enemy.age, enemy.kind)));
        part.mesh.setMatrixAt(batch.count, this.matrix);
      }
      batch.count++;
    }
    for (const batch of this.batches.values()) for (const part of batch.parts) { part.mesh.count = batch.count; part.mesh.visible = batch.count > 0; part.mesh.instanceMatrix.needsUpdate = true; }
  }

  dispose() { for (const batch of this.batches.values()) for (const part of batch.parts) part.mesh.dispose(); this.batches.clear(); this.group.removeFromParent(); this.group.clear(); }
}
