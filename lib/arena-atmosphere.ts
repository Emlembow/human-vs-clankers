import * as THREE from 'three';
import type { Vec } from './game-model';

/** Decorative scene layer. Gameplay never depends on an asset loading. */
export class ArenaAtmosphere {
  readonly group = new THREE.Group();
  private textures = new Set<THREE.Texture>();
  private materials = new Set<THREE.Material>();
  private geometries = new Set<THREE.BufferGeometry>();
  private floor: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private floorMaps: THREE.Texture[] = [];
  private perimeter: THREE.LineSegments;
  private posts: THREE.InstancedMesh;
  private shipGlow: THREE.Sprite;
  private shipLight = new THREE.PointLight('#8fffd7', 26, 25, 2);
  private flashes: { sprite: THREE.Sprite; life: number; duration: number; size: number }[] = [];
  private smoke: { sprite: THREE.Sprite; life: number; duration: number; size: number; rotation: number }[] = [];
  private haze: THREE.Sprite[] = [];
  private width = 110; private height = 60; private disposed = false;

  constructor(onSparkTexture: (texture: THREE.Texture) => void) {
    const floorMaterial = this.material(new THREE.MeshStandardMaterial({ color: '#527084', roughness: .88, metalness: .35, normalScale: new THREE.Vector2(.4, .4), emissive: '#071421', emissiveIntensity: .15 }));
    this.floor = new THREE.Mesh(this.geometry(new THREE.PlaneGeometry(1, 1)), floorMaterial);
    this.floor.position.z = -2; this.group.add(this.floor);
    const ambient = new THREE.AmbientLight('#8aa8c6', .3);
    const key = new THREE.DirectionalLight('#74cfff', .85); key.position.set(-24, 15, 25);
    const rim = new THREE.DirectionalLight('#ae86d6', .25); rim.position.set(30, -20, 14);
    this.group.add(ambient, key, rim, this.shipLight);
    const floorMap = (path: string, apply: (t: THREE.Texture) => void, color = false) => this.load(path, t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set((this.width + 4) / 24, (this.height + 4) / 24);
      t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      this.floorMaps.push(t); apply(t); floorMaterial.needsUpdate = true;
    });
    floorMap('/assets/polyhaven/metal_plate_diff_1k.jpg', t => { floorMaterial.map = t; }, true);
    floorMap('/assets/polyhaven/metal_plate_nor_gl_1k.jpg', t => { floorMaterial.normalMap = t; });
    floorMap('/assets/polyhaven/metal_plate_arm_1k.jpg', t => { floorMaterial.aoMap = t; floorMaterial.roughnessMap = t; floorMaterial.metalnessMap = t; });

    const frameGeometry = this.geometry(new THREE.BufferGeometry()); frameGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(48), 3));
    this.perimeter = new THREE.LineSegments(frameGeometry, this.material(new THREE.LineBasicMaterial({ color: '#489fba', transparent: true, opacity: .4, depthWrite: false })));
    this.perimeter.frustumCulled = false; this.group.add(this.perimeter);
    this.posts = new THREE.InstancedMesh(this.geometry(new THREE.BoxGeometry(.65, .65, .7)), this.material(new THREE.MeshStandardMaterial({ color: '#243e50', metalness: .65, roughness: .5, emissive: '#235a6d', emissiveIntensity: .25 })), 12);
    this.posts.frustumCulled = false; this.group.add(this.posts);

    this.shipGlow = this.sprite(.18); this.shipGlow.scale.set(5, 5, 1); this.shipGlow.material.color.set('#8fffd7'); this.group.add(this.shipGlow);
    for (let i = 0; i < 24; i++) { const sprite = this.sprite(0); sprite.visible = false; this.flashes.push({ sprite, life: 0, duration: 1, size: 1 }); this.group.add(sprite); }
    for (let i = 0; i < 12; i++) { const sprite = this.sprite(0); sprite.visible = false; this.smoke.push({ sprite, life: 0, duration: 1, size: 1, rotation: 0 }); this.group.add(sprite); }
    for (let i = 0; i < 4; i++) { const sprite = this.sprite(.035); sprite.material.color.set(i % 2 ? '#8762bc' : '#2b9bba'); sprite.scale.set(35, 35, 1); sprite.visible = false; this.haze.push(sprite); this.group.add(sprite); }
    this.shipGlow.visible = false;
    this.load('/assets/kenney/circle_05.png', t => { t.colorSpace = THREE.SRGBColorSpace; this.shipGlow.material.map = t; this.shipGlow.material.needsUpdate = true; onSparkTexture(t); });
    this.load('/assets/kenney/flare_01.png', t => { t.colorSpace = THREE.SRGBColorSpace; for (const f of this.flashes) { f.sprite.material.map = t; f.sprite.material.needsUpdate = true; } });
    this.load('/assets/kenney/smoke_01.png', t => { t.colorSpace = THREE.SRGBColorSpace; for (const sprite of [...this.haze, ...this.smoke.map(s => s.sprite)]) { sprite.material.map = t; sprite.material.needsUpdate = true; } });
    this.resize(this.width, this.height);
  }
  private geometry<T extends THREE.BufferGeometry>(geometry: T): T { this.geometries.add(geometry); return geometry; }
  private material<T extends THREE.Material>(material: T): T { this.materials.add(material); return material; }
  private sprite(opacity: number) { return new THREE.Sprite(this.material(new THREE.SpriteMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity }))); }
  private load(url: string, apply: (texture: THREE.Texture) => void) {
    const texture = new THREE.TextureLoader().load(url, loaded => {
      if (this.disposed) { loaded.dispose(); return; }
      apply(loaded);
    }, undefined, () => { /* The untextured arena and original sparks remain usable. */ });
    this.textures.add(texture);
  }
  resize(width: number, height: number) {
    this.width = width; this.height = height;
    this.floor.scale.set(width + 4, height + 4, 1);
    for (const t of this.floorMaps) t.repeat.set((width + 4) / 24, (height + 4) / 24);
    const w = width / 2 - .6, h = height / 2 - .6, c = 4, z = -.7;
    const vertices: number[] = [];
    for (const [x, y] of [[-w, -h], [w, -h], [-w, h], [w, h]]) {
      vertices.push(x, y - Math.sign(y) * c, z, x, y, z, x, y, z, x - Math.sign(x) * c, y, z);
    }
    (this.perimeter.geometry.attributes.position.array as Float32Array).set(vertices); this.perimeter.geometry.attributes.position.needsUpdate = true;
    const positions = [[-w, -h], [w, -h], [-w, h], [w, h], [-w, 0], [w, 0], [0, -h], [0, h], [-w / 2, -h], [w / 2, -h], [-w / 2, h], [w / 2, h]];
    const matrix = new THREE.Matrix4(); positions.forEach(([x, y], i) => { matrix.makeTranslation(x, y, -.9); this.posts.setMatrixAt(i, matrix); }); this.posts.instanceMatrix.needsUpdate = true;
    this.haze.forEach((sprite, i) => sprite.position.set((i < 2 ? -1 : 1) * w, (i % 2 ? -1 : 1) * h, -1.4));
  }
  burst(x: number, y: number, color: string, strength = 1) {
    const f = this.flashes.find(f => f.life <= 0) ?? this.flashes.reduce((a, b) => a.life < b.life ? a : b);
    f.life = f.duration = .26; f.size = 5 * strength; f.sprite.position.set(x, y, .2); f.sprite.material.color.set(color).multiplyScalar(1.3); f.sprite.scale.set(f.size, f.size, 1);
    if (strength >= 1) {
      const s = this.smoke.find(s => s.life <= 0) ?? this.smoke.reduce((a, b) => a.life < b.life ? a : b);
      s.life = s.duration = .7; s.size = 4 * strength; s.rotation = Math.random() * Math.PI * 2; s.sprite.position.set(x, y, -.6); s.sprite.material.color.set(color);
    }
  }
  update(dt: number, time: number, player: Vec, shipVisible: boolean, reducedMotion: boolean) {
    this.shipGlow.visible = shipVisible && !!this.shipGlow.material.map;
    this.shipGlow.position.set(player.x, player.y, -.4); this.shipLight.position.set(player.x, player.y, 5);
    this.shipLight.intensity = shipVisible ? 26 : 0;
    this.haze.forEach((sprite, i) => { sprite.visible = !!sprite.material.map; sprite.material.rotation = reducedMotion ? i : i + time * .012 * (i % 2 ? -1 : 1); });
    for (const f of this.flashes) {
      f.life = Math.max(0, f.life - dt); f.sprite.visible = f.life > 0 && !!f.sprite.material.map;
      const alpha = f.life / f.duration; f.sprite.material.opacity = alpha * (reducedMotion ? .3 : .65);
      const scale = f.size * (reducedMotion ? 1 : 1 + (1 - alpha) * .6); f.sprite.scale.set(scale, scale, 1);
    }
    for (const s of this.smoke) {
      s.life = Math.max(0, s.life - dt); s.sprite.visible = s.life > 0 && !!s.sprite.material.map;
      const alpha = s.life / s.duration; s.sprite.material.opacity = alpha * .11;
      const scale = s.size * (reducedMotion ? 1 : 1.2 - alpha * .4); s.sprite.scale.set(scale, scale, 1); s.sprite.material.rotation = s.rotation + (reducedMotion ? 0 : (1 - alpha) * .18);
    }
  }
  dispose() {
    this.disposed = true; this.group.removeFromParent();
    for (const texture of this.textures) texture.dispose();
    for (const material of this.materials) material.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    this.posts.dispose(); this.group.clear();
  }
}
