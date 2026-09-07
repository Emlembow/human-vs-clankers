import * as THREE from 'three';
import { AutoplayController, KonamiSequence } from './autoplay';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CLANKER_MODEL_URL, prepareClankerModel, disposeClankerSource } from './clanker-model';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ArenaAtmosphere } from './arena-atmosphere';
import { createProjectileMesh, createProjectileUnderlay } from './projectile-rendering';
import { IndustrialDrones, INDUSTRIAL_COLORS } from './industrial-drones';
import { IndustrialEnemies } from './industrial-enemies';
import { frameIndustrialCamera, pointerToArena, CAMERA_DISTANCE, CAMERA_PITCH, PROJECTILE_HEIGHT } from './industrial-camera';
import { GameModel, type EnemyKind, type GameSnapshot, type Vec, MAX_BULLETS, MAX_ACTIVE_ENEMIES } from './game-model';

type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: THREE.Color };
type TouchStick = { id: number; x: number; y: number; dx: number; dy: number };

export class GameEngine {
  model = new GameModel();
  private autopilot = new AutoplayController();
  private konami = new KonamiSequence();
  private foreground = true;
  private onAutoplay: (enabled: boolean) => void;
  get autoplay() { return this.autopilot.enabled; }
  private host: HTMLElement; private renderer: THREE.WebGLRenderer; private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-55, 55, 30, -30, .1, 180);
  private composer: EffectComposer; private bloom: UnrealBloomPass; private observer: ResizeObserver;
  private raf = 0; private last = 0; private clock = 0; private notifyClock = 0; private keys = new Set<string>();
  private pointer = { x: 0, y: 10 }; private mouseDown = false; private pointerKnown = false;
  private leftStick: TouchStick | null = null; private rightStick: TouchStick | null = null;
  private sticks: HTMLElement[] = []; private fleet = new IndustrialDrones(); private ship = new THREE.Group(); private shield: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial>;
  private enemyRenderer: IndustrialEnemies;
  private bulletMesh: THREE.InstancedMesh; private bulletUnderlay: THREE.InstancedMesh; private minimumTracerWidth = .3; private dummy = new THREE.Object3D();
  private bulletColors = new Map<string, THREE.Color>();
  private orbitals: THREE.Group[] = [];
  private atmosphere: ArenaAtmosphere;
  private arcs: { line: THREE.Line; life: number }[] = [];
  private blasts: { ring: THREE.LineLoop; life: number; radius: number }[] = [];
  private particles: Particle[] = []; private particleMesh: THREE.Points; private particlePositions = new Float32Array(2400 * 3); private particleColors = new Float32Array(2400 * 3);
  private ring: THREE.LineLoop; private ringAge = 5; private ringOrigin: Vec = { x: 0, y: 0 };
  private demo: THREE.Group[] = []; private geometries = new Set<THREE.BufferGeometry>(); private materials = new Set<THREE.Material>();
  private audio: AudioContext | null = null; muted = false; private reduceMotion = false; private lastSound = 0;
  private onSnapshot: (s: GameSnapshot) => void; private onFps: (n: number) => void;
  private fpsTime = 0; private fpsFrames = 0; private disposed = false; private savedBest = -1;

  constructor(host: HTMLElement, onSnapshot: (s: GameSnapshot) => void, onFps: (n: number) => void, onError: (message: string) => void, onAutoplay: (enabled: boolean) => void = () => {}) {
    this.host = host; this.onSnapshot = onSnapshot; this.onFps = onFps; this.onAutoplay = onAutoplay;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x242924); this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.className = 'game-canvas'; this.renderer.domElement.setAttribute('aria-label', 'Game arena. Move with WASD or arrows. Aim with the mouse and hold click to fire. Space launches a bomb.');
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.model.pause(); onError('The graphics connection was interrupted. Reload to reconnect.'); }, { signal: this.listeners.signal });
    host.appendChild(this.renderer.domElement); frameIndustrialCamera(this.camera, 800, 500);
    this.composer = new EffectComposer(this.renderer); this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(800, 500), .27, .35, 1.1); this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());
    this.ship = this.fleet.create('player');
    this.enemyRenderer = new IndustrialEnemies(this.fleet, MAX_ACTIVE_ENEMIES); this.scene.add(this.enemyRenderer.group);
    this.shield = new THREE.Mesh(this.geometry(new THREE.SphereGeometry(1.7, 24, 12)), this.material(new THREE.MeshPhysicalMaterial({ color: '#b5d0c6', metalness: .12, roughness: .22, transparent: true, opacity: .13, depthWrite: false })));
    this.shield.position.z = .85; this.shield.scale.z = .78; this.ship.add(this.shield); this.scene.add(this.ship);
    this.ring = this.circle(1, '#dfc99b', .45); this.ring.visible = false; this.scene.add(this.ring);
    const bullets = createProjectileMesh(MAX_BULLETS);
    this.geometry(bullets.geometry); this.material(bullets.material); this.bulletMesh = bullets;
    const underlay = createProjectileUnderlay(MAX_BULLETS); this.geometry(underlay.geometry); this.material(underlay.material); this.bulletUnderlay = underlay; this.scene.add(this.bulletUnderlay);
    for (let i = 0; i < 6; i++) { const drone = this.fleet.create('orbital'); drone.visible = false; this.orbitals.push(drone); this.scene.add(drone); }
    for (let i = 0; i < 48; i++) {
      const geo = this.geometry(new THREE.BufferGeometry()); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
      const line = new THREE.Line(geo, this.material(new THREE.LineBasicMaterial({ color: new THREE.Color('#d4e3e1').multiplyScalar(2), transparent: true, blending: THREE.AdditiveBlending })));
      line.visible = false; line.frustumCulled = false; this.arcs.push({ line, life: 0 }); this.scene.add(line);
    }
    for (let i = 0; i < 24; i++) { const ring = this.circle(1, '#ffd18a', .7); ring.visible = false; this.blasts.push({ ring, life: 0, radius: 1 }); this.scene.add(ring); }
    this.scene.add(this.bulletMesh);
    const pg = this.geometry(new THREE.BufferGeometry()); pg.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3)); pg.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3)); pg.setDrawRange(0, 0);
    this.particleMesh = new THREE.Points(pg, this.material(new THREE.PointsMaterial({ size: 2.3 * this.renderer.getPixelRatio(), vertexColors: true, sizeAttenuation: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))); this.particleMesh.frustumCulled = false; this.scene.add(this.particleMesh);
    this.atmosphere = new ArenaAtmosphere(this.scene, texture => {
      const material = this.particleMesh.material as THREE.PointsMaterial;
      material.map = texture; material.size = 4 * this.renderer.getPixelRatio(); material.needsUpdate = true;
    }, (normal, arm) => this.fleet.applyWear(normal, arm));
    this.scene.add(this.atmosphere.group);
    this.refreshDemoModels(); this.loadClankerArtwork();
    for (const side of ['left', 'right']) { const stick = document.createElement('div'); stick.className = `touch-stick ${side}`; stick.innerHTML = `<span></span><b>${side === 'left' ? 'MOVE' : 'AIM / FIRE'}</b>`; stick.setAttribute('aria-hidden', 'true'); this.sticks.push(stick); host.appendChild(stick); }
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize(); this.bindEvents();
    try { const best = Number(localStorage.getItem('geometry-conflict-best')); this.model.best = Number.isFinite(best) && best > 0 ? best : 0; this.muted = localStorage.getItem('geometry-conflict-muted') === 'true'; } catch { /* Device storage is optional. */ }
    this.onSnapshot(this.model.snapshot()); this.raf = requestAnimationFrame(this.frame);
  }
  private geometry<T extends THREE.BufferGeometry>(v: T): T { this.geometries.add(v); return v; }
  private material<T extends THREE.Material>(v: T): T { this.materials.add(v); return v; }
  private line(points: number[][], color: string, opacity = 1) {
    const geo = this.geometry(new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p[0], p[1], 0))));
    return new THREE.LineLoop(geo, this.material(new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.8), transparent: true, opacity, blending: THREE.AdditiveBlending })));
  }
  private circle(radius: number, color: string, opacity: number) { return this.line(Array.from({ length: 64 }, (_, i) => [Math.cos(i / 64 * Math.PI * 2) * radius, Math.sin(i / 64 * Math.PI * 2) * radius]), color, opacity); }
  private enemyShape(kind: EnemyKind, elite = false) { return this.fleet.create(kind, elite); }
  private refreshDemoModels() {
    for (const model of this.demo) model.removeFromParent(); this.demo = [];
    for (let i = 0; i < 12; i++) { const model = this.enemyShape((['drifter', 'chaser', 'spinner'] as EnemyKind[])[i % 3]); this.demo.push(model); this.scene.add(model); }
  }
  private loadClankerArtwork() {
    new GLTFLoader().load(CLANKER_MODEL_URL, gltf => {
      try {
        if (this.disposed) return;
        const model = prepareClankerModel(gltf.scene);
        if (this.fleet.installClanker(model)) this.refreshDemoModels();
      } catch { /* The already visible humanoid fallback keeps combat available. */ }
      finally { disposeClankerSource(gltf.scene); }
    }, undefined, () => { /* Missing artwork keeps the same bipedal fallback, never a tank. */ });
  }
  private resize() {
    const { width, height } = this.host.getBoundingClientRect(); if (!width || !height) return;
    const bounds = frameIndustrialCamera(this.camera, width, height), worldWidth = bounds.width, worldHeight = bounds.height;
    this.model.setBounds(worldWidth, worldHeight); this.minimumTracerWidth = 2.2 * (this.camera.top - this.camera.bottom) / (height * Math.cos(CAMERA_PITCH)); this.renderer.setSize(width, height); this.composer.setSize(width, height);
    this.atmosphere.resize(worldWidth, worldHeight);
  }
  private listeners = new AbortController();
  private resetInputs = () => { this.keys.clear(); this.mouseDown = false; this.leftStick = null; this.rightStick = null; this.sticks.forEach(el => { el.classList.remove('active'); el.style.cssText = ''; }); };
  private bindEvents() {
    const opts = { signal: this.listeners.signal }, canvas = this.renderer.domElement;
    window.addEventListener('keydown', e => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      const editing = !!target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
      if (this.konami.push(e, performance.now(), editing)) { e.preventDefault(); this.setAutoplay(!this.autoplay); return; }
      if (editing) return;
      if ((e.target as HTMLElement)?.closest('button,a,input,select,textarea') && (e.code === 'Enter' || e.code === 'Space')) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && this.model.status === 'playing') e.preventDefault();
      this.keys.add(e.code);
      if (e.repeat) return;
      if (this.model.status === 'reward') {
        if (['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'].includes(e.code)) { e.preventDefault(); const choice = this.model.rewards[Number(e.code.slice(-1)) - 1]; if (choice) this.chooseReward(choice.id); }
        else if (e.code === 'KeyR') { e.preventDefault(); this.rerollRewards(); }
        return;
      }
      if (e.code === 'Enter' && (this.model.status === 'ready' || this.model.status === 'over')) this.start();
      else if (e.code === 'Escape' || e.code === 'KeyP') this.togglePause();
      else if (e.code === 'Space') this.bomb();
    }, opts);
    window.addEventListener('keyup', e => this.keys.delete(e.code), opts);
    window.addEventListener('focus', () => { this.foreground = true; }, opts);
    window.addEventListener('blur', () => { this.foreground = false; this.konami.reset(); this.autopilot.reset(); this.resetInputs(); if (this.model.status === 'playing') { this.model.pause(); this.notify(); } }, opts);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.konami.reset(); this.autopilot.reset(); this.resetInputs(); this.model.pause(); this.notify(); } }, opts);
    canvas.addEventListener('contextmenu', e => e.preventDefault(), opts);
    canvas.addEventListener('pointerdown', e => {
      if (this.model.status !== 'playing') return;
      this.unlockAudio(); canvas.setPointerCapture(e.pointerId);
      if (e.pointerType === 'touch') {
        e.preventDefault(); const r = canvas.getBoundingClientRect();
        const side = e.clientX - r.left < r.width / 2 ? 'left' : 'right';
        const stick = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
        if (side === 'left' && !this.leftStick) this.leftStick = stick; else if (side === 'right' && !this.rightStick) this.rightStick = stick;
        const el = this.sticks[side === 'left' ? 0 : 1]; el.style.left = `${e.clientX - r.left - 43}px`; el.style.top = `${e.clientY - r.top - 43}px`; el.classList.add('active');
      } else { this.mouseDown = e.button === 0; this.updatePointer(e); }
    }, opts);
    canvas.addEventListener('pointermove', e => {
      const touch = this.leftStick?.id === e.pointerId ? this.leftStick : this.rightStick?.id === e.pointerId ? this.rightStick : null;
      if (touch) { const dx = e.clientX - touch.x, dy = e.clientY - touch.y, n = Math.max(40, Math.hypot(dx, dy)); touch.dx = dx / n; touch.dy = -dy / n;
        const el = this.sticks[this.leftStick === touch ? 0 : 1].firstElementChild as HTMLElement; el.style.transform = `translate(${touch.dx * 26}px,${-touch.dy * 26}px)`;
      } else if (e.pointerType !== 'touch') this.updatePointer(e);
    }, opts);
    const up = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') this.mouseDown = false;
      if (this.leftStick?.id === e.pointerId) { this.leftStick = null; this.sticks[0].classList.remove('active'); this.sticks[0].style.cssText = ''; }
      if (this.rightStick?.id === e.pointerId) { this.rightStick = null; this.sticks[1].classList.remove('active'); this.sticks[1].style.cssText = ''; }
    };
    window.addEventListener('pointerup', up, opts); window.addEventListener('pointercancel', up, opts); canvas.addEventListener('lostpointercapture', up, opts);
  }
  private updatePointer(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect(); this.pointerKnown = true;
    this.pointer = pointerToArena(this.camera, (e.clientX - r.left) / r.width * 2 - 1, 1 - (e.clientY - r.top) / r.height * 2);
  }
  setAutoplay(enabled: boolean) { this.resetInputs(); this.konami.reset(); this.autopilot.setEnabled(enabled); this.onAutoplay(enabled); if (enabled && (this.model.status === 'ready' || this.model.status === 'over')) this.start(); else this.notify(); }
  start() { this.autopilot.reset(); this.resetInputs(); this.model.start(); this.particles = []; this.unlockAudio(); this.notify(); }
  togglePause() { this.autopilot.reset(); this.resetInputs(); if (this.model.status === 'playing') this.model.pause(); else if (this.model.status === 'paused') { this.model.resume(); this.unlockAudio(); } this.notify(); }
  bomb() { this.model.bomb(); this.notify(); }
  chooseReward(id: string) { const chosen = this.model.chooseReward(id); if (chosen) { this.resetInputs(); this.unlockAudio(); this.notify(); } return chosen; }
  rerollRewards() { const rolled = this.model.rerollRewards(); if (rolled) this.notify(); return rolled; }
  setMuted(value: boolean) { this.muted = value; try { localStorage.setItem('geometry-conflict-muted', String(value)); } catch {} if (!value) this.unlockAudio(); }
  private unlockAudio() {
    try { if (!this.audio) this.audio = new AudioContext(); if (this.audio.state === 'suspended') void this.audio.resume().catch(() => {}); } catch { /* Sound is optional. */ }
  }
  private sound(type: string, weaponId?: string) {
    if (!this.audio || this.muted || this.audio.state !== 'running') return;
    const now = this.audio.currentTime;
    if (type === 'kill' && now - this.lastSound < .035) return;
    this.lastSound = now;
    const osc = this.audio.createOscillator(), gain = this.audio.createGain(); osc.connect(gain); gain.connect(this.audio.destination);
    const shot = type === 'shot', hit = type === 'hit' || type === 'bomb', duration = shot ? .055 : hit ? .5 : .15;
    osc.type = shot ? 'triangle' : hit ? 'sawtooth' : 'sine';
    const voice = weaponId === 'flame' ? 190 : weaponId === 'rail' ? 1200 : weaponId === 'mortar' ? 180 : weaponId === 'tesla' ? 950 : 740;
    osc.frequency.setValueAtTime(shot ? voice : hit ? 130 : type === 'wave' ? 330 : 420, now);
    osc.frequency.exponentialRampToValueAtTime(shot ? 300 : hit ? 25 : 850, now + duration);
    gain.gain.setValueAtTime(shot ? .022 : hit ? .06 : .04, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    osc.start(now); osc.stop(now + duration); osc.onended = () => { gain.disconnect(); osc.disconnect(); };
  }
  private burst(x: number, y: number, color: string, count: number, speed = 13) {
    const c = new THREE.Color(color).lerp(new THREE.Color('#ffdc9c'), .7).multiplyScalar(1.6);
    for (let i = 0; i < count; i++) { const a = Math.random() * Math.PI * 2, s = (Math.random() * .8 + .2) * speed, life = .3 + Math.random() * .7; this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, maxLife: life, color: c }); }
    if (this.particles.length > 2300) this.particles.splice(0, this.particles.length - 2300);
  }
  private notify() {
    this.onSnapshot(this.model.snapshot());
    if (this.model.status === 'over' && this.savedBest !== this.model.best) {
      this.savedBest = this.model.best;
      try { localStorage.setItem('geometry-conflict-best', String(this.model.best)); } catch {}
    }
  }
  private frame = (now: number) => {
    if (this.disposed) return;
    const elapsed = (now - (this.last || now)) / 1000;
    const dt = Math.min(elapsed, .04); this.last = now;
    const frozen = this.model.status === 'paused' || this.model.status === 'reward'; if (!frozen) this.clock += dt;
    const down = (k: string) => this.keys.has(k) ? 1 : 0;
    const mx = down('KeyD') + down('ArrowRight') - down('KeyA') - down('ArrowLeft'), my = down('KeyW') + down('ArrowUp') - down('KeyS') - down('ArrowDown');
    const kx = down('KeyL') - down('KeyJ'), ky = down('KeyI') - down('KeyK');
    const aim = this.rightStick ? { x: this.rightStick.dx, y: this.rightStick.dy } : kx || ky ? { x: kx, y: ky } : this.pointerKnown ? { x: this.pointer.x - this.model.player.x, y: this.pointer.y - this.model.player.y } : { x: 0, y: 1 };
    const previousStatus = this.model.status;
    const automated = this.autopilot.update(this.model, dt, this.foreground && !document.hidden);
    if (automated.restart) this.start();
    if (automated.rewardId) this.chooseReward(automated.rewardId);
    if (automated.bomb) this.bomb();
    this.model.step(dt, this.autoplay ? automated.input : { move: this.leftStick ? { x: this.leftStick.dx, y: this.leftStick.dy } : { x: mx, y: my }, aim, shooting: this.mouseDown || !!(kx || ky) || !!(this.rightStick && Math.hypot(this.rightStick.dx, this.rightStick.dy) > .15) });
    if (previousStatus !== this.model.status) { this.resetInputs(); this.notify(); }
    for (const ev of this.model.events) {
      this.sound(ev.type, ev.weaponId);
      if (ev.type === 'impact') this.burst(ev.x, ev.y, ev.color ?? '#a4ffcc', 3, 5);
      if (ev.type === 'shield') this.burst(ev.x, ev.y, '#77d4ff', 45, 16);
      if (ev.type === 'upgrade') { this.burst(ev.x, ev.y, ev.color ?? '#a4ffcc', 70, 20); }
      if (ev.type === 'arc') {
        const effect = this.arcs.find(a => a.life <= 0) ?? this.arcs[0]; effect.life = .14; effect.line.visible = true;
        const arr = effect.line.geometry.attributes.position.array as Float32Array, tx = ev.tx ?? ev.x, ty = ev.ty ?? ev.y;
        arr.set([ev.x, ev.y, 1.1, (ev.x + tx) / 2 + (Math.random() - .5) * 2, (ev.y + ty) / 2 + (Math.random() - .5) * 2, 1.1, tx, ty, 1.1]); effect.line.geometry.attributes.position.needsUpdate = true;
      }
      if (ev.type === 'blast') { const effect = this.blasts.find(b => b.life <= 0) ?? this.blasts[0]; effect.life = .28; effect.radius = ev.radius ?? 3; effect.ring.position.set(ev.x, ev.y, 1); effect.ring.visible = true; }
      if (ev.type === 'kill') { this.burst(ev.x, ev.y, INDUSTRIAL_COLORS[ev.kind!], 30); this.atmosphere.burst(ev.x, ev.y, INDUSTRIAL_COLORS[ev.kind!], .85); }
      if (ev.type === 'hit') { this.burst(ev.x, ev.y, '#ff628f', 110, 28); this.atmosphere.burst(ev.x, ev.y, '#ff628f', 1.6); }
      if (ev.type === 'blast') this.atmosphere.burst(ev.x, ev.y, '#ffc16e', Math.min(1.8, (ev.radius ?? 3) / 4));
      if (ev.type === 'bomb' || ev.type === 'start') { this.ringOrigin = { x: ev.x, y: ev.y }; this.ringAge = 0; this.burst(ev.x, ev.y, INDUSTRIAL_COLORS.player, ev.type === 'bomb' ? 160 : 50, 30); this.atmosphere.burst(ev.x, ev.y, INDUSTRIAL_COLORS.player, ev.type === 'bomb' ? 3 : 1.5); }
    }
    this.model.events = [];
    const ready = this.model.status === 'ready'; this.host.classList.toggle('is-playing', this.model.status === 'playing');
    this.ship.visible = !ready && this.model.status !== 'over'; this.ship.position.set(this.model.player.x, this.model.player.y, 0); this.ship.rotation.z = this.model.player.angle;
    this.ship.scale.setScalar(this.model.invulnerable > 0 && Math.sin(this.clock * 30) < 0 ? .85 : 1);
    this.shield.visible = this.model.invulnerable > 0 || this.model.shields > 0; this.shield.material.opacity = this.model.shields > 0 ? .13 : .2;
    this.fleet.animateSurvivor(this.ship, this.clock, Math.hypot(this.model.player.vx, this.model.player.vy));
    if (this.model.status === 'playing' && Math.hypot(this.model.player.vx, this.model.player.vy) > 2) {
      const a = this.model.player.angle; this.burst(this.model.player.x - Math.cos(a), this.model.player.y - Math.sin(a), '#b7ad91', 1, 1);
    }
    this.demo.forEach((o, i) => {
      o.visible = ready; const side = i % 2 === 0 ? -1 : 1;
      o.position.set(side * this.model.width * (.24 + (i % 3) * .09) + Math.sin(this.clock * .2 + i) * 2, Math.sin(i * 4.7) * 23 + Math.cos(this.clock * .18 + i) * 2, 0);
      o.rotation.z = i + (this.reduceMotion ? 0 : this.clock * .08); this.fleet.animateClanker(o, this.reduceMotion ? 0 : this.clock, (['drifter', 'chaser', 'spinner'] as EnemyKind[])[i % 3]);
    });
    this.enemyRenderer.update(this.model.enemies);
    for (const e of this.model.enemies) {
      if (!frozen && (e.burnTime > 0 || e.slowTime > 0) && Math.random() < .12) this.burst(e.x, e.y, e.burnTime > 0 ? '#ff9b52' : '#b5cfcd', 1, 2);
    }
    this.bulletMesh.count = Math.min(MAX_BULLETS, this.model.bullets.length); this.bulletUnderlay.count = this.bulletMesh.count;
    for (let i = 0; i < this.bulletMesh.count; i++) {
      const b = this.model.bullets[i], radius = b.radius ?? .22, color = b.color ?? '#a4ffcc';
      if (!this.bulletColors.has(color)) this.bulletColors.set(color, new THREE.Color(color).lerp(new THREE.Color('#fff5dd'), .67).multiplyScalar(1.5));
      this.dummy.position.set(b.x, b.y, PROJECTILE_HEIGHT); this.dummy.rotation.z = Math.atan2(b.vy, b.vx);
      this.dummy.scale.set(b.style === 'rail' ? 4 : b.style === 'mortar' ? radius * 2 : b.style === 'flame' ? 1 + b.age * 3 : 1.5, b.style === 'flame' ? radius * 2 : b.style === 'mortar' ? radius * 2 : Math.max(this.minimumTracerWidth, radius), 1);
      this.dummy.updateMatrix(); this.bulletMesh.setMatrixAt(i, this.dummy.matrix); this.bulletMesh.setColorAt(i, this.bulletColors.get(color)!);
      this.dummy.scale.y += this.minimumTracerWidth * .72; this.dummy.scale.x += this.minimumTracerWidth * .4; this.dummy.position.z -= .015; this.dummy.updateMatrix(); this.bulletUnderlay.setMatrixAt(i, this.dummy.matrix);
    }
    if (this.bulletMesh.instanceColor) this.bulletMesh.instanceColor.needsUpdate = true;
    const orbitalPositions = this.model.orbitPositions();
    this.orbitals.forEach((o, i) => { o.visible = i < orbitalPositions.length && !ready && this.model.status !== 'over'; if (o.visible) { o.position.set(orbitalPositions[i].x, orbitalPositions[i].y, .4); o.rotation.z = this.clock * 3; } });
    this.bulletMesh.instanceMatrix.needsUpdate = true; this.bulletUnderlay.instanceMatrix.needsUpdate = true;
    const effectDt = frozen ? 0 : dt;
    this.atmosphere.update(effectDt, this.clock, this.model.player, this.ship.visible, this.reduceMotion);
    for (const effect of this.arcs) { effect.life = Math.max(0, effect.life - effectDt); effect.line.visible = effect.life > 0; (effect.line.material as THREE.LineBasicMaterial).opacity = effect.life / .14; }
    for (const effect of this.blasts) { effect.life = Math.max(0, effect.life - effectDt); effect.ring.visible = effect.life > 0; effect.ring.scale.setScalar(effect.radius * (1 - effect.life / .4)); (effect.ring.material as THREE.LineBasicMaterial).opacity = effect.life / .28; }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.life -= effectDt; if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * effectDt; p.y += p.vy * effectDt; p.vx *= 1 - effectDt * 2; p.vy *= 1 - effectDt * 2;
    }
    this.particles.forEach((p, i) => { this.particlePositions[i * 3] = p.x; this.particlePositions[i * 3 + 1] = p.y; this.particlePositions[i * 3 + 2] = 1.5; const alpha = p.life / p.maxLife; this.particleColors[i * 3] = p.color.r * alpha; this.particleColors[i * 3 + 1] = p.color.g * alpha; this.particleColors[i * 3 + 2] = p.color.b * alpha; });
    this.particleMesh.geometry.setDrawRange(0, this.particles.length); this.particleMesh.geometry.attributes.position.needsUpdate = true; this.particleMesh.geometry.attributes.color.needsUpdate = true;
    this.ringAge += effectDt; this.ring.visible = this.ringAge < 1.3; this.ring.position.set(this.ringOrigin.x, this.ringOrigin.y, .4); this.ring.scale.setScalar(Math.max(.01, this.ringAge * 75)); (this.ring.material as THREE.LineBasicMaterial).opacity = Math.max(0, 1 - this.ringAge);
    const shake = this.reduceMotion ? 0 : this.model.shake;
    this.camera.position.x = (Math.random() - .5) * shake; this.camera.position.y = -Math.sin(CAMERA_PITCH) * CAMERA_DISTANCE + (Math.random() - .5) * shake; this.camera.updateMatrixWorld();
    this.composer.render();
    this.notifyClock += dt; if (this.notifyClock > .1) { this.notify(); this.notifyClock = 0; }
    this.fpsTime += elapsed; this.fpsFrames++; if (this.fpsTime > 1) { this.onFps(Math.min(240, Math.round(this.fpsFrames / this.fpsTime))); this.fpsFrames = 0; this.fpsTime = 0; }
    this.raf = requestAnimationFrame(this.frame);
  };
  dispose() {
    this.autopilot.setEnabled(false); this.konami.reset(); this.resetInputs();
    this.disposed = true; cancelAnimationFrame(this.raf); this.listeners.abort(); this.observer.disconnect();
    this.atmosphere.dispose(); this.enemyRenderer.dispose(); this.fleet.dispose();
    for (const g of this.geometries) g.dispose(); for (const m of this.materials) m.dispose();
    this.bulletMesh.dispose(); this.bulletUnderlay.dispose(); this.composer.passes.forEach(p => p.dispose()); this.composer.dispose(); this.renderer.dispose();
    this.renderer.domElement.remove(); this.sticks.forEach(el => el.remove()); if (this.audio) void this.audio.close().catch(() => {});
  }
}
