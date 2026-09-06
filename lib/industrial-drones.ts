import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { EnemyKind } from './game-model';

export const INDUSTRIAL_COLORS = { player: '#e8dec2', drifter: '#9caaa5', chaser: '#bf6753', spinner: '#c4a05c' };
type UnitKind = EnemyKind | 'player' | 'orbital';

/** Shared, material-batched hard-surface models. No network or game-state dependency. */
export class IndustrialDrones {
  readonly steel = new THREE.MeshStandardMaterial({ color: '#646b68', metalness: .72, roughness: .63 });
  private rubber = new THREE.MeshStandardMaterial({ color: '#202421', metalness: .12, roughness: .94 });
  private alloy = new THREE.MeshStandardMaterial({ color: '#adb0a1', metalness: .82, roughness: .37 });
  private lamp = new THREE.MeshStandardMaterial({ color: '#fff1c7', emissive: '#ffd992', emissiveIntensity: 2.1, roughness: .2 });
  private warning = new THREE.MeshStandardMaterial({ color: '#bc8140', metalness: .4, roughness: .67 });
  private darkGlass = new THREE.MeshStandardMaterial({ color: '#162c2d', metalness: .72, roughness: .18 });
  private armor = new Map<UnitKind, THREE.MeshStandardMaterial>();
  private templates = new Map<string, THREE.Group>();
  private geometries = new Set<THREE.BufferGeometry>();
  private allMaterials = new Set<THREE.Material>();

  constructor() {
    for (const m of [this.steel, this.rubber, this.alloy, this.lamp, this.warning, this.darkGlass]) this.allMaterials.add(m);
    for (const [kind, color] of Object.entries({ ...INDUSTRIAL_COLORS, orbital: '#d7c694' })) {
      const material = new THREE.MeshStandardMaterial({ color, metalness: .48, roughness: .57 });
      this.armor.set(kind as UnitKind, material); this.allMaterials.add(material);
    }
  }

  applyWear(normal: THREE.Texture, arm: THREE.Texture) {
    for (const material of [this.steel, ...this.armor.values()]) {
      material.normalMap = normal; material.normalScale.set(.18, .18);
      material.roughnessMap = arm; material.aoMap = arm; material.aoMapIntensity = .48; material.needsUpdate = true;
    }
  }

  create(kind: UnitKind, elite = false) {
    const key = `${kind}:${elite}`;
    let template = this.templates.get(key);
    if (!template) { template = this.build(kind, elite); this.templates.set(key, template); }
    return template.clone(true);
  }

  private build(kind: UnitKind, elite: boolean) {
    const group = new THREE.Group(); group.name = `industrial-${kind}`;
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const add = (geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0, rotation?: THREE.Euler) => {
      if (rotation) geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(rotation));
      geo.translate(x, y, z);
      const converted = geo.index ? geo.toNonIndexed() : geo;
      if (converted !== geo) geo.dispose();
      const list = batches.get(material) ?? []; list.push(converted); batches.set(material, list);
    };
    const box = (w: number, d: number, h: number, material: THREE.Material, x = 0, y = 0, z = 0, bevel = .06) => add(new RoundedBoxGeometry(w, d, h, 1, bevel), material, x, y, z);
    const cylinder = (r: number, h: number, material: THREE.Material, x = 0, y = 0, z = 0, alongX = false) => add(new THREE.CylinderGeometry(r, r, h, 12), material, x, y, z, new THREE.Euler(alongX ? 0 : Math.PI / 2, 0, alongX ? Math.PI / 2 : 0));
    const armor = this.armor.get(kind)!;
    if (kind === 'player') {
      // Crouched human anatomy, not a vehicle silhouette: helmet over shoulders,
      // forearms around a receiver, a backpack and two independently moving legs.
      const capsule = (radius: number, a: number[], b: number[], material: THREE.Material) => {
        const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), direction = to.clone().sub(from), center = from.clone().add(to).multiplyScalar(.5);
        const geometry = new THREE.CapsuleGeometry(radius, Math.max(.01, direction.length() - radius * 2), 3, 8);
        geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
        add(geometry, material, center.x, center.y, center.z);
      };
      capsule(.32, [-.17, 0, .61], [0, 0, 1.35], this.steel);
      box(.59, .76, .53, armor, -.02, 0, 1.06, .13);
      box(.32, .58, .54, this.rubber, -.42, 0, 1.06, .1);
      box(.08, .42, .33, this.warning, -.59, 0, 1.07, .03);
      for (const side of [-1, 1]) {
        capsule(.16, [0, side * .4, 1.24], [.31, side * .48, .97], this.steel);
        capsule(.135, [.31, side * .48, .97], [.73, side * .15, 1.14], this.steel);
        box(.36, .31, .28, armor, .02, side * .46, 1.27, .12);
        box(.21, .23, .17, this.rubber, .72, side * .15, 1.13, .07);
        box(.15, .22, .25, this.warning, .25, side * .25, .86, .04);
      }
      const helmet = new THREE.SphereGeometry(.34, 16, 10); helmet.scale(1.02, 1.05, 1.08); add(helmet, armor, .05, 0, 1.66);
      box(.17, .48, .19, this.darkGlass, .345, 0, 1.68, .065);
      box(.13, .39, .17, this.rubber, .31, 0, 1.48, .045);
      box(.07, .1, .07, this.lamp, .38, -.21, 1.8, .025);
      box(.74, .2, .22, this.rubber, .73, -.08, 1.25, .035);
      box(.54, .15, .09, this.alloy, .77, -.08, 1.41, .025);
      cylinder(.065, .86, this.alloy, 1.21, -.08, 1.28, true);
      cylinder(.1, .18, this.rubber, 1.6, -.08, 1.28, true);
      box(.21, .13, .27, this.rubber, .67, -.08, 1.04, .025);
      box(.12, .12, .11, this.darkGlass, .66, -.08, 1.5, .02);
    } else if (kind === 'spinner' || kind === 'orbital') {
      cylinder(.87, .48, armor, 0, 0, .55);
      cylinder(.63, .56, this.steel, 0, 0, .62);
      cylinder(.27, .68, this.alloy, 0, 0, .66);
      add(new THREE.TorusGeometry(1.1, .15, 6, 24), this.steel, 0, 0, .52);
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        add(new THREE.BoxGeometry(.63, .19, .09), this.rubber, Math.cos(angle) * .59, Math.sin(angle) * .59, .98, new THREE.Euler(0, 0, angle + .34));
      }
      for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        box(.42, .38, .22, this.warning, Math.cos(angle) * 1.08, Math.sin(angle) * 1.08, .64);
        cylinder(.08, .2, this.alloy, Math.cos(angle) * .92, Math.sin(angle) * .92, .15);
      }
      box(.3, .15, .09, this.lamp, .5, 0, 1.03);
    } else {
      const crawler = kind === 'drifter';
      box(1.72, 1.16, .45, this.steel, -.06, 0, .38);
      box(1.48, 1.12, .42, armor, -.15, 0, .71, .14);
      box(.82, .72, .33, armor, -.22, 0, 1.01, .11);
      box(.59, .34, .16, this.darkGlass, .04, 0, 1.19);
      for (const side of [-1, 1]) {
        box(crawler ? 2.15 : 1.8, .39, .5, this.rubber, -.08, side * .78, .3, .15);
        box(1.73, .4, .14, armor, -.08, side * .78, .61);
        for (let i = 0; i < 6; i++) box(.17, .42, .06, this.steel, -.83 + i * .29, side * .78, .73, .02);
        box(.18, .2, .16, this.lamp, .82, side * .52, .7);
        box(.2, .15, .14, this.warning, -.94, side * .51, .57);
      }
      for (let i = 0; i < 4; i++) box(.08, .63, .08, this.rubber, -.75 + i * .14, 0, .965, .01);
      cylinder(.17, .76, this.alloy, .55, 0, 1.0, true);
      cylinder(.22, .28, this.rubber, .95, 0, 1.0, true);
      box(.32, .42, .14, this.warning, -.22, 0, 1.24);
      for (const x of [-.6, .42]) for (const y of [-.41, .41]) cylinder(.045, .035, this.alloy, x, y, .95);
    }
    if (elite) {
      for (const y of [-.5, .5]) box(.8, .12, .1, this.warning, -.16, y, 1.25);
      box(.3, .32, .18, this.lamp, -.61, 0, 1.31);
    }
    for (const [material, parts] of batches) {
      const geometry = mergeGeometries(parts, false)!; parts.forEach(p => p.dispose()); this.geometries.add(geometry);
      const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    }
    if (kind === 'player') {
      for (const side of [-1, 1]) {
        const leg = new THREE.Group(); leg.name = side < 0 ? 'left-leg' : 'right-leg'; leg.position.set(-.18, side * .24, .69);
        const thighGeometry = new THREE.CapsuleGeometry(.15, .25, 3, 8); thighGeometry.rotateX(Math.PI / 2); this.geometries.add(thighGeometry);
        const thigh = new THREE.Mesh(thighGeometry, this.steel); thigh.position.set(-.03, 0, -.17); thigh.castShadow = true;
        const bootGeometry = new RoundedBoxGeometry(.46, .29, .2, 1, .07); this.geometries.add(bootGeometry);
        const boot = new THREE.Mesh(bootGeometry, this.rubber); boot.position.set(.02, 0, -.53); boot.castShadow = true;
        const shinGeometry = new RoundedBoxGeometry(.2, .27, .25, 1, .055); this.geometries.add(shinGeometry);
        const shin = new THREE.Mesh(shinGeometry, this.armor.get('player')); shin.position.set(.01, 0, -.35); shin.castShadow = true;
        leg.add(thigh, boot, shin); group.add(leg);
      }
    }
    if (kind === 'orbital') group.scale.setScalar(.48);
    // A physical status strip; damage never rescales an arbitrary chassis part.
    const statusGeometry = new THREE.BoxGeometry(.65, .07, .04); this.geometries.add(statusGeometry);
    const status = new THREE.Mesh(statusGeometry, this.lamp); status.name = 'status-light'; status.position.set(-.25, 0, kind === 'spinner' ? 1.08 : 1.36); group.add(status);
    if (kind === 'player') status.visible = false;
    return group;
  }

  animateSurvivor(group: THREE.Group, time: number, speed: number) {
    const amount = Math.min(1, speed / 16);
    const left = group.getObjectByName('left-leg'), right = group.getObjectByName('right-leg');
    if (left) left.rotation.y = Math.sin(time * 18) * .48 * amount;
    if (right) right.rotation.y = -Math.sin(time * 18) * .48 * amount;
  }

  dispose() { for (const geometry of this.geometries) geometry.dispose(); for (const material of this.allMaterials) material.dispose(); this.templates.clear(); }
}
