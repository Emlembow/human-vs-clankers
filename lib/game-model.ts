export type Status = 'ready' | 'playing' | 'paused' | 'over';
export type EnemyKind = 'drifter' | 'chaser' | 'spinner';
export type Vec = { x: number; y: number };
export type Enemy = Vec & { id: number; kind: EnemyKind; vx: number; vy: number; angle: number; age: number; radius: number };
export type Bullet = Vec & { id: number; vx: number; vy: number; age: number };
export type GameEvent = { type: 'shot' | 'kill' | 'hit' | 'bomb' | 'wave' | 'start'; x: number; y: number; kind?: EnemyKind };
export type GameSnapshot = { status: Status; score: number; best: number; lives: number; bombs: number; wave: number; multiplier: number; kills: number; time: number; waveBanner: boolean };
export type Input = { move: Vec; aim: Vec; shooting: boolean };
export const COLORS = { drifter: '#30d9ff', chaser: '#ff4f96', spinner: '#ffb456', player: '#a4ffcc' };
export const POINTS = { drifter: 100, chaser: 200, spinner: 300 };
export const MAX_ACTIVE_ENEMIES = 160;

// Duration and population grow independently: a faster spawn rate must not
// make a later wave shorter. Bursts grow as the arena fills with faster hunters.
export function getWaveTuning(wave: number) {
  const level = Math.max(0, wave - 1);
  const enemyCount = Math.min(1200, Math.round(24 + 6 * level + 1.25 * level * level));
  const burstSize = Math.min(8, 1 + Math.floor(level / 2));
  const spawnDuration = Math.min(65, 22 + 1.4 * level);
  return {
    enemyCount,
    burstSize,
    spawnDuration,
    spawnInterval: spawnDuration / (Math.ceil(enemyCount / burstSize) - 1),
    drifterChance: Math.max(.08, .5 - .045 * level),
    spinnerChance: wave === 1 ? 0 : Math.min(.45, .12 + .03 * (wave - 2)),
    speedBonus: Math.min(24, .65 * level + .022 * level * level),
    pursuitResponse: Math.min(8, 3 + .24 * level),
    interceptTime: Math.min(.45, Math.max(0, wave - 4) * .035),
  };
}
const clamp = (x: number, low: number, high: number) => Math.max(low, Math.min(high, x));
const normal = (x: number, y: number) => { const n = Math.hypot(x, y); return n > .0001 ? { x: x / n, y: y / n } : { x: 0, y: 0 }; };

export class GameModel {
  status: Status = 'ready';
  score = 0; best = 0; lives = 3; bombs = 3; wave = 1; multiplier = 1; kills = 0; time = 0;
  width = 110; height = 60; invulnerable = 0; waveBanner = 0; shake = 0;
  player = { x: 0, y: 0, angle: Math.PI / 2, vx: 0, vy: 0 };
  enemies: Enemy[] = []; bullets: Bullet[] = []; events: GameEvent[] = [];
  private id = 0; private shotClock = 0; private spawnClock = 0; private remaining = 0; private nextWave = 0; private streak = 0; private spawnSide = 0;
  random: () => number;
  constructor(random = Math.random) { this.random = random; }
  setBounds(width: number, height: number) {
    this.width = width; this.height = height;
    this.player.x = clamp(this.player.x, -width / 2 + 2, width / 2 - 2);
    this.player.y = clamp(this.player.y, -height / 2 + 2, height / 2 - 2);
    for (const e of this.enemies) { e.x = clamp(e.x, -width / 2 + 1, width / 2 - 1); e.y = clamp(e.y, -height / 2 + 1, height / 2 - 1); }
  }
  snapshot(): GameSnapshot { return { status: this.status, score: this.score, best: this.best, lives: this.lives, bombs: this.bombs, wave: this.wave, multiplier: this.multiplier, kills: this.kills, time: this.time, waveBanner: this.waveBanner > 0 }; }
  start() {
    this.status = 'playing'; this.score = 0; this.lives = 3; this.bombs = 3; this.wave = 1; this.multiplier = 1; this.kills = 0; this.time = 0; this.streak = 0;
    this.enemies = []; this.bullets = []; this.events = [{ type: 'start', x: 0, y: 0 }];
    this.player = { x: 0, y: 0, angle: Math.PI / 2, vx: 0, vy: 0 };
    this.shotClock = 0; this.invulnerable = 2.5; this.shake = 0; this.beginWave();
  }
  pause() { if (this.status === 'playing') this.status = 'paused'; }
  resume() { if (this.status === 'paused') this.status = 'playing'; }
  private beginWave() {
    this.remaining = getWaveTuning(this.wave).enemyCount; this.spawnClock = 1.8; this.nextWave = 2;
    this.spawnSide = Math.floor(this.random() * 4);
    this.waveBanner = 2; this.events.push({ type: 'wave', x: 0, y: 0 });
  }
  spawnEnemy(kind?: EnemyKind, entrySide?: number) {
    const side = entrySide ?? Math.floor(this.random() * 4);
    const w = this.width / 2 - 2, h = this.height / 2 - 2;
    let x = side < 2 ? (side === 0 ? -w : w) : (this.random() * 2 - 1) * w;
    let y = side >= 2 ? (side === 2 ? -h : h) : (this.random() * 2 - 1) * h;
    if (Math.hypot(x - this.player.x, y - this.player.y) < 18) { x = -x; y = -y; }
    const direction = normal(this.player.x - x, this.player.y - y);
    const roll = this.random();
    const tuning = getWaveTuning(this.wave);
    const selected = kind ?? (roll < tuning.drifterChance ? 'drifter' : roll < 1 - tuning.spinnerChance ? 'chaser' : 'spinner');
    const e: Enemy = { id: ++this.id, kind: selected, x, y, vx: direction.x, vy: direction.y, angle: this.random() * Math.PI * 2, age: 0, radius: selected === 'spinner' ? 1.35 : 1.05 };
    this.enemies.push(e); return e;
  }
  private destroyEnemy(index: number, award: boolean) {
    const e = this.enemies[index];
    this.events.push({ type: 'kill', x: e.x, y: e.y, kind: e.kind });
    if (award) {
      this.score += POINTS[e.kind] * this.multiplier; this.kills++; this.streak++;
      this.multiplier = Math.min(8, 1 + Math.floor(this.streak / 5)); this.best = Math.max(this.best, this.score);
    }
    this.enemies.splice(index, 1);
  }
  bomb() {
    if (this.status !== 'playing' || this.bombs <= 0) return false;
    this.bombs--; this.shake = .65; this.invulnerable = Math.max(this.invulnerable, 1.2);
    this.events.push({ type: 'bomb', x: this.player.x, y: this.player.y });
    for (let i = this.enemies.length - 1; i >= 0; i--) this.destroyEnemy(i, true);
    return true;
  }
  step(dt: number, input: Input) {
    if (this.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    const tuning = getWaveTuning(this.wave);
    dt = Math.min(dt, .05); this.time += dt; this.invulnerable = Math.max(0, this.invulnerable - dt); this.waveBanner = Math.max(0, this.waveBanner - dt); this.shake = Math.max(0, this.shake - dt * 2);
    const movement = normal(input.move.x, input.move.y), easing = 1 - Math.exp(-14 * dt);
    this.player.vx += (movement.x * 22 - this.player.vx) * easing; this.player.vy += (movement.y * 22 - this.player.vy) * easing;
    this.player.x = clamp(this.player.x + this.player.vx * dt, -this.width / 2 + 1.8, this.width / 2 - 1.8);
    this.player.y = clamp(this.player.y + this.player.vy * dt, -this.height / 2 + 1.8, this.height / 2 - 1.8);
    const aim = normal(input.aim.x, input.aim.y);
    if (Math.hypot(aim.x, aim.y) > .1) this.player.angle = Math.atan2(aim.y, aim.x);
    this.shotClock -= dt;
    if (input.shooting && this.shotClock <= 0) {
      this.shotClock = .105;
      const spread = this.multiplier >= 5 ? [-.11, 0, .11] : [-.025, .025];
      for (const offset of spread) { const a = this.player.angle + offset; this.bullets.push({ id: ++this.id, x: this.player.x + Math.cos(a) * 1.5, y: this.player.y + Math.sin(a) * 1.5, vx: Math.cos(a) * 82, vy: Math.sin(a) * 82, age: 0 }); }
      this.events.push({ type: 'shot', x: this.player.x, y: this.player.y });
    }
    // Hold a crowded arena at the cap without spending its remaining enemies
    // or accumulating a catch-up burst. Clearing space lets the assault resume.
    if (this.enemies.length < MAX_ACTIVE_ENEMIES) this.spawnClock -= dt;
    if (this.remaining > 0 && this.spawnClock <= 0 && this.enemies.length < MAX_ACTIVE_ENEMIES) {
      const count = Math.min(tuning.burstSize, this.remaining, MAX_ACTIVE_ENEMIES - this.enemies.length);
      for (let i = 0; i < count; i++) this.spawnEnemy(undefined, (this.spawnSide + i) % 4);
      this.spawnSide = (this.spawnSide + 1) % 4;
      this.remaining -= count;
      this.spawnClock += tuning.spawnInterval;
    }
    if (this.remaining === 0 && this.enemies.length === 0) {
      this.nextWave -= dt;
      if (this.nextWave <= 0) { this.wave++; this.beginWave(); }
    }
    for (const e of this.enemies) {
      e.age += dt; e.angle += dt * (e.kind === 'spinner' ? 3.8 : .7);
      if (e.age < .8) continue;
      const toward = normal(this.player.x - e.x, this.player.y - e.y);
      const speed = (e.kind === 'drifter' ? 5.4 : e.kind === 'chaser' ? 8 : 7.2) + tuning.speedBonus;
      if (e.kind === 'chaser') {
        const intercept = normal(this.player.x + this.player.vx * tuning.interceptTime - e.x, this.player.y + this.player.vy * tuning.interceptTime - e.y);
        const response = 1 - Math.exp(-tuning.pursuitResponse * dt);
        e.vx += (intercept.x - e.vx) * response; e.vy += (intercept.y - e.vy) * response;
      }
      if (e.kind === 'spinner') { const a = Math.atan2(toward.y, toward.x) + Math.sin(e.age * 2) * .9; e.vx = Math.cos(a); e.vy = Math.sin(a); }
      e.x += e.vx * speed * dt; e.y += e.vy * speed * dt;
      if (Math.abs(e.x) > this.width / 2 - 1.6) { e.x = Math.sign(e.x) * (this.width / 2 - 1.6); e.vx *= -1; }
      if (Math.abs(e.y) > this.height / 2 - 1.6) { e.y = Math.sign(e.y) * (this.height / 2 - 1.6); e.vy *= -1; }
    }
    for (let b = this.bullets.length - 1; b >= 0; b--) {
      const bullet = this.bullets[b], ox = bullet.x, oy = bullet.y;
      bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.age += dt;
      let hit = false;
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i], sx = bullet.x - ox, sy = bullet.y - oy;
        const t = clamp(((e.x - ox) * sx + (e.y - oy) * sy) / (sx * sx + sy * sy || 1), 0, 1);
        if (Math.hypot(ox + sx * t - e.x, oy + sy * t - e.y) < e.radius + .28) { this.destroyEnemy(i, true); hit = true; break; }
      }
      if (hit || Math.abs(bullet.x) > this.width / 2 || Math.abs(bullet.y) > this.height / 2 || bullet.age > 2) this.bullets.splice(b, 1);
    }
    if (this.invulnerable === 0) {
      const contact = this.enemies.some(e => e.age > .8 && Math.hypot(e.x - this.player.x, e.y - this.player.y) < e.radius + .72);
      if (contact) {
        this.events.push({ type: 'hit', x: this.player.x, y: this.player.y }); this.shake = .65;
        this.lives--; this.streak = 0; this.multiplier = 1; this.invulnerable = 3;
        this.player.x = 0; this.player.y = 0; this.player.vx = 0; this.player.vy = 0;
        for (let i = this.enemies.length - 1; i >= 0; i--) if (Math.hypot(this.enemies[i].x, this.enemies[i].y) < 15) this.destroyEnemy(i, false);
        if (this.lives <= 0) this.status = 'over';
      }
    }
  }
}
