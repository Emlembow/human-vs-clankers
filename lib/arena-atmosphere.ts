import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import type { Vec } from './game-model';

/** Physical set dressing only. Missing or late assets never block the simulation. */
export class ArenaAtmosphere {
  readonly group = new THREE.Group();
  private textures = new Set<THREE.Texture>();
  private materials = new Set<THREE.Material>();
  private geometries = new Set<THREE.BufferGeometry>();
  private instanced = new Set<THREE.InstancedMesh>();
  private floor: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private floorMaps: THREE.Texture[] = [];
  private walls: THREE.Mesh[] = [];
  private shoulders: THREE.Mesh[] = [];
  private posts: THREE.InstancedMesh;
  private stripes: THREE.InstancedMesh;
  private fixtures: THREE.Group[] = [];
  private barrelGroups: THREE.Group[] = [];
  private keyLight = new THREE.DirectionalLight('#ffe2b6', 3.2);
  private shipLight = new THREE.PointLight('#ffe3a6', 18, 13, 2);
  private flashes: { sprite: THREE.Sprite; life: number; duration: number; size: number }[] = [];
  private smoke: { sprite: THREE.Sprite; life: number; duration: number; size: number; rotation: number }[] = [];
  private dust: THREE.Sprite[] = [];
  private scene: THREE.Scene;
  private environment: THREE.Texture | null = null;
  private width = 110; private height = 60; private disposed = false;

  constructor(scene: THREE.Scene, onSparkTexture: (texture: THREE.Texture) => void, onWear: (normal: THREE.Texture, arm: THREE.Texture) => void) {
    this.scene = scene;
    const concrete = this.material(new THREE.MeshStandardMaterial({ color: '#b9b6a6', roughness: .95, metalness: 0, normalScale: new THREE.Vector2(.8, .8) }));
    this.floor = new THREE.Mesh(this.geometry(new THREE.PlaneGeometry(1, 1)), concrete);
    this.floor.position.z = -.28; this.floor.receiveShadow = true; this.group.add(this.floor);
    const floorMap = (suffix: string, apply: (t: THREE.Texture) => void, color = false) => this.load(`/assets/industrial/concrete_floor_worn_02_${suffix}_1k.jpg`, t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set((this.width + 18) / 19, (this.height + 18) / 19); t.anisotropy = 4;
      t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      this.floorMaps.push(t); apply(t); concrete.needsUpdate = true;
    });
    floorMap('diff', t => { concrete.map = t; }, true);
    floorMap('nor_gl', t => { concrete.normalMap = t; });
    floorMap('arm', t => { concrete.aoMap = t; concrete.roughnessMap = t; });
    const steel = this.material(new THREE.MeshStandardMaterial({ color: '#766a53', roughness: .75, metalness: .7 }));
    let wearNormal: THREE.Texture | undefined, wearArm: THREE.Texture | undefined;
    const applyWear = () => { if (wearNormal && wearArm) onWear(wearNormal, wearArm); };
    this.load('/assets/industrial/rusty_metal_02_diff_1k.jpg', t => { t.colorSpace = THREE.SRGBColorSpace; steel.map = t; steel.needsUpdate = true; });
    this.load('/assets/industrial/rusty_metal_02_nor_gl_1k.jpg', t => { steel.normalMap = t; steel.normalScale.set(.5, .5); steel.needsUpdate = true; wearNormal = t; applyWear(); });
    this.load('/assets/industrial/rusty_metal_02_arm_1k.jpg', t => { steel.roughnessMap = t; steel.metalnessMap = t; steel.aoMap = t; steel.needsUpdate = true; wearArm = t; applyWear(); });
    const shoulderMaterial = this.material(new THREE.MeshStandardMaterial({ color: '#57564c', roughness: .92 }));
    const rubber = this.material(new THREE.MeshStandardMaterial({ color: '#252922', roughness: .94 }));
    const yellow = this.material(new THREE.MeshStandardMaterial({ color: '#c49a4d', roughness: .86, polygonOffset: true, polygonOffsetFactor: -1 }));
    for (let i = 0; i < 4; i++) {
      const wall = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(1, 1, 1)), steel); wall.castShadow = true; wall.receiveShadow = true; this.walls.push(wall); this.group.add(wall);
      const shoulder = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(1, 1, 1)), shoulderMaterial); shoulder.receiveShadow = true; this.shoulders.push(shoulder); this.group.add(shoulder);
    }
    this.posts = this.instance(new THREE.BoxGeometry(.24, .35, 1.25), steel, 48); this.posts.castShadow = true;
    this.stripes = this.instance(new THREE.PlaneGeometry(.9, .26), yellow, 120); this.stripes.receiveShadow = true;
    const fixtureMaterial = this.material(new THREE.MeshStandardMaterial({ color: '#ecce97', emissive: '#ffd58b', emissiveIntensity: 2.5, roughness: .3 }));
    const mastGeometry = this.geometry(new THREE.CylinderGeometry(.1, .14, 3.4, 8)); mastGeometry.rotateX(Math.PI / 2);
    const headGeometry = this.geometry(new THREE.BoxGeometry(.9, .5, .25));
    for (let i = 0; i < 8; i++) {
      const fixture = new THREE.Group();
      const base = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(.65, .65, .3)), rubber); base.position.z = .1; base.castShadow = true;
      const mast = new THREE.Mesh(mastGeometry, steel); mast.position.z = 1.8; mast.castShadow = true;
      const lamp = new THREE.Mesh(headGeometry, fixtureMaterial); lamp.position.z = 3.5;
      fixture.add(base, mast, lamp); this.fixtures.push(fixture); this.group.add(fixture);
    }
    // Wide overhead sunlight and soft ambient environment preserve readable surfaces.
    this.keyLight.position.set(-28, 24, 40); this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048); this.keyLight.shadow.camera.near = .5; this.keyLight.shadow.camera.far = 130;
    this.keyLight.shadow.bias = -.0003; this.keyLight.shadow.normalBias = .04; this.keyLight.shadow.radius = 2;
    this.group.add(new THREE.HemisphereLight('#c1d0db', '#5b5646', 1.1), this.keyLight, this.keyLight.target, this.shipLight);
    new HDRLoader().load('/assets/industrial/factory_yard_1k.hdr', texture => {
      if (this.disposed) { texture.dispose(); return; }
      texture.mapping = THREE.EquirectangularReflectionMapping; this.textures.add(texture); this.environment = texture;
      scene.environment = texture; scene.environmentIntensity = .55;
    }, undefined, () => { /* Warm key and hemisphere lights are a complete fallback. */ });
    this.loadBarrels();
    for (let i = 0; i < 24; i++) { const sprite = this.sprite(0, true); sprite.visible = false; this.flashes.push({ sprite, life: 0, duration: 1, size: 1 }); this.group.add(sprite); }
    for (let i = 0; i < 18; i++) { const sprite = this.sprite(0, false); sprite.visible = false; this.smoke.push({ sprite, life: 0, duration: 1, size: 1, rotation: 0 }); this.group.add(sprite); }
    for (let i = 0; i < 4; i++) { const sprite = this.sprite(.055, false); sprite.material.color.set('#a79d86'); sprite.scale.set(23, 14, 1); sprite.visible = false; this.dust.push(sprite); this.group.add(sprite); }
    this.load('/assets/kenney/circle_05.png', t => { t.colorSpace = THREE.SRGBColorSpace; onSparkTexture(t); });
    this.load('/assets/kenney/flare_01.png', t => { t.colorSpace = THREE.SRGBColorSpace; for (const f of this.flashes) { f.sprite.material.map = t; f.sprite.material.needsUpdate = true; } });
    this.load('/assets/kenney/smoke_01.png', t => { t.colorSpace = THREE.SRGBColorSpace; for (const sprite of [...this.dust, ...this.smoke.map(s => s.sprite)]) { sprite.material.map = t; sprite.material.needsUpdate = true; } });
    this.resize(this.width, this.height);
  }

  private geometry<T extends THREE.BufferGeometry>(geometry: T): T { this.geometries.add(geometry); return geometry; }
  private material<T extends THREE.Material>(material: T): T { this.materials.add(material); return material; }
  private instance(geometry: THREE.BufferGeometry, material: THREE.Material, count: number) {
    const mesh = new THREE.InstancedMesh(this.geometry(geometry), material, count); mesh.frustumCulled = false; this.instanced.add(mesh); this.group.add(mesh); return mesh;
  }
  private sprite(opacity: number, additive: boolean) { return new THREE.Sprite(this.material(new THREE.SpriteMaterial({ transparent: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, opacity })) ); }
  private load(url: string, apply: (texture: THREE.Texture) => void) {
    const texture = new THREE.TextureLoader().load(url, loaded => { if (this.disposed) { loaded.dispose(); return; } apply(loaded); }, undefined, () => { /* Geometry and untextured materials remain usable. */ });
    this.textures.add(texture);
  }

  private loadBarrels() {
    new GLTFLoader().load('/assets/industrial/barrel/barrel_03_1k.gltf', gltf => {
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
      gltf.scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry); const list = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of list) { materials.add(material); for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value); }
        object.castShadow = true; object.receiveShadow = true;
      });
      if (this.disposed) { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); return; }
      geometries.forEach(g => this.geometries.add(g)); materials.forEach(m => this.materials.add(m)); textures.forEach(t => this.textures.add(t));
      const box = new THREE.Box3().setFromObject(gltf.scene), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
      gltf.scene.position.set(-center.x, -box.min.y, -center.z);
      const container = new THREE.Group(); container.add(gltf.scene); container.rotation.x = Math.PI / 2; container.scale.setScalar(1.8 / Math.max(.01, size.y));
      for (let i = 0; i < 12; i++) { const anchor = new THREE.Group(); anchor.add(container.clone(true)); this.barrelGroups.push(anchor); this.group.add(anchor); }
      this.layoutBarrels();
    }, undefined, () => { /* Decorative prop failure cannot interrupt a run. */ });
  }

  private layoutBarrels() {
    this.barrelGroups.forEach((group, i) => {
      const side = i < 6 ? -1 : 1, local = i % 6;
      group.position.set(side * (this.width / 2 + 1.7 + local % 2 * 1.3), (local < 3 ? -1 : 1) * (this.height / 2 - 5) + local % 3 * 1.5, -.23);
      group.rotation.z = i * 1.43;
    });
  }

  resize(width: number, height: number) {
    this.width = width; this.height = height; this.floor.scale.set(width + 18, height + 18, 1);
    for (const texture of this.floorMaps) texture.repeat.set((width + 18) / 19, (height + 18) / 19);
    const w = width / 2, h = height / 2;
    this.walls.forEach((wall, i) => { const side = i % 2 ? 1 : -1, horizontal = i >= 2; wall.scale.set(horizontal ? width + 6 : .45, horizontal ? .45 : height + 4, 1.3); wall.position.set(horizontal ? 0 : side * (w + 1), horizontal ? side * (h + 1) : 0, .2); });
    this.shoulders.forEach((shoulder, i) => { const side = i % 2 ? 1 : -1, horizontal = i >= 2; shoulder.scale.set(horizontal ? width + 6 : 2.8, horizontal ? 2.8 : height + 4, .12); shoulder.position.set(horizontal ? 0 : side * (w + 1.5), horizontal ? side * (h + 1.5) : 0, -.22); });
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 48; i++) { const side = i % 2 ? 1 : -1, horizontal = i >= 24, t = Math.floor((i % 24) / 2) / 11; dummy.position.set(horizontal ? (t - .5) * width : side * (w + .55), horizontal ? side * (h + .55) : (t - .5) * height, .65); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); this.posts.setMatrixAt(i, dummy.matrix); }
    this.posts.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 120; i++) { const side = i % 2 ? 1 : -1, horizontal = i >= 60, t = Math.floor((i % 60) / 2) / 29; dummy.position.set(horizontal ? (t - .5) * (width - 2) : side * (w - .4), horizontal ? side * (h - .4) : (t - .5) * (height - 2), -.19); dummy.rotation.set(0, 0, horizontal ? -.55 : .55); dummy.updateMatrix(); this.stripes.setMatrixAt(i, dummy.matrix); }
    this.stripes.instanceMatrix.needsUpdate = true;
    this.fixtures.forEach((fixture, i) => fixture.position.set((i % 2 ? 1 : -1) * (w + .75), (-.38 + Math.floor(i / 2) * .25) * height, 0));
    this.dust.forEach((sprite, i) => sprite.position.set((i < 2 ? -1 : 1) * w, (i % 2 ? -1 : 1) * h * .6, .3));
    const extent = Math.max(width, height) * .67; this.keyLight.shadow.camera.left = -extent; this.keyLight.shadow.camera.right = extent; this.keyLight.shadow.camera.top = extent; this.keyLight.shadow.camera.bottom = -extent; this.keyLight.shadow.camera.updateProjectionMatrix();
    this.layoutBarrels();
  }

  burst(x: number, y: number, _color: string, strength = 1) {
    const flash = this.flashes.find(f => f.life <= 0) ?? this.flashes.reduce((a, b) => a.life < b.life ? a : b);
    flash.life = flash.duration = .2; flash.size = 3.8 * strength; flash.sprite.position.set(x, y, 1.4); flash.sprite.material.color.set('#ffe3a1').multiplyScalar(1.8); flash.sprite.scale.set(flash.size, flash.size, 1);
    if (strength >= .8) {
      const smoke = this.smoke.find(s => s.life <= 0) ?? this.smoke.reduce((a, b) => a.life < b.life ? a : b);
      smoke.life = smoke.duration = 1.05; smoke.size = 4 * strength; smoke.rotation = Math.random() * Math.PI * 2; smoke.sprite.position.set(x, y, .7); smoke.sprite.material.color.set('#494942');
    }
  }

  update(dt: number, time: number, player: Vec, shipVisible: boolean, reducedMotion: boolean) {
    this.shipLight.position.set(player.x, player.y, 3); this.shipLight.intensity = shipVisible ? 18 : 0;
    this.dust.forEach((sprite, i) => { sprite.visible = !!sprite.material.map; sprite.material.rotation = reducedMotion ? i : i + time * .006 * (i % 2 ? -1 : 1); });
    for (const flash of this.flashes) {
      flash.life = Math.max(0, flash.life - dt); flash.sprite.visible = flash.life > 0 && !!flash.sprite.material.map;
      const alpha = flash.life / flash.duration; flash.sprite.material.opacity = alpha * (reducedMotion ? .2 : .5);
      const scale = flash.size * (reducedMotion ? 1 : 1 + (1 - alpha) * .6); flash.sprite.scale.set(scale, scale, 1);
    }
    for (const smoke of this.smoke) {
      smoke.life = Math.max(0, smoke.life - dt); smoke.sprite.visible = smoke.life > 0 && !!smoke.sprite.material.map;
      const alpha = smoke.life / smoke.duration; smoke.sprite.material.opacity = Math.sin(alpha * Math.PI) * .27;
      const scale = smoke.size * (reducedMotion ? 1 : 1.6 - alpha * .65); smoke.sprite.scale.set(scale, scale, 1); smoke.sprite.material.rotation = smoke.rotation + (reducedMotion ? 0 : (1 - alpha) * .12);
    }
  }

  dispose() {
    this.disposed = true; this.group.removeFromParent(); if (this.scene.environment === this.environment) this.scene.environment = null;
    for (const texture of this.textures) texture.dispose(); for (const material of this.materials) material.dispose(); for (const geometry of this.geometries) geometry.dispose();
    for (const mesh of this.instanced) mesh.dispose(); this.keyLight.shadow.dispose(); this.group.clear();
  }
}
