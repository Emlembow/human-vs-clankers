import { WEAPONS, RELICS, RARITIES, MAX_WEAPON_LEVEL, getWeapon, emptyStats, weaponProfile, relicValue, rollRarity, type WeaponId, type WeaponState, type WeaponProfile, type RunStats, type Reward, type OwnedRelic, type RelicDef, type Stat } from './roguelike.ts';
export type Status = 'ready' | 'playing' | 'paused' | 'reward' | 'over';
export type EnemyKind = 'drifter' | 'chaser' | 'spinner';
export type Vec = { x: number; y: number };
export type Enemy = Vec & { id: number; kind: EnemyKind; vx: number; vy: number; angle: number; age: number; radius: number; hp: number; maxHp: number; elite: boolean; burn: number; burnTime: number; slow: number; slowTime: number; flash: number };
export type Bullet = Vec & { id: number; vx: number; vy: number; age: number; damage?: number; radius?: number; lifetime?: number; color?: string; pierce?: number; bounces?: number; homing?: number; blast?: number; chain?: number; burn?: number; slow?: number; knockback?: number; rebound?: number; execute?: number; hits?: Set<number>; bounceCount?: number; critical?: boolean; style?: string };
export type GameEvent = { type: 'shot' | 'kill' | 'hit' | 'bomb' | 'wave' | 'start' | 'reward' | 'upgrade' | 'impact' | 'arc' | 'blast' | 'shield'; x: number; y: number; tx?: number; ty?: number; radius?: number; color?: string; kind?: EnemyKind; weaponId?: WeaponId };
export type GameSnapshot = { status: Status; score: number; best: number; lives: number; bombs: number; wave: number; multiplier: number; kills: number; time: number; waveBanner: boolean; shields: number; rerolls: number; weapons: WeaponProfile[]; rewards: Reward[]; relics: OwnedRelic[]; waveProgress: number };
export type Input = { move: Vec; aim: Vec; shooting: boolean };
export const COLORS = { drifter: '#30d9ff', chaser: '#ff4f96', spinner: '#ffb456', player: '#a4ffcc' };
export const POINTS = { drifter: 100, chaser: 200, spinner: 300 };
export const MAX_ACTIVE_ENEMIES = 160;
export const MAX_BULLETS = 900;
const clamp = (x: number, low: number, high: number) => Math.max(low, Math.min(high, x));
const normal = (x: number, y: number) => { const n = Math.hypot(x, y); return n > .0001 ? { x: x / n, y: y / n } : { x: 0, y: 0 }; };
const CAPS: Partial<Record<Stat, number>> = { fireRate: 3, speed: .75, projectileSpeed: 1.2, size: 2, crit: .75, critDamage: 4, pierce: 12, bounces: 6, homing: 12, blast: 10, chain: 7, slow: .65, knockback: 6, grace: 3, shieldRegen: 6, orbitals: 6, execute: .35, dodge: .4 };

// Wave 2 gives the first weapon pick a little room to breathe. From wave 3,
// the original swarm curve and elite introduction remain in place.
export function getWaveTuning(wave: number) {
  const level = Math.max(0, wave - 1);
  const enemyCount = Math.min(1800, 36 + 39 * level + 5 * level * level - (wave === 2 ? 6 : 0));
  const burstSize = Math.min(12, 1 + 2 * level);
  const spawnDuration = Math.min(55, 24 + 1.1 * level);
  return { enemyCount, burstSize, spawnDuration, spawnInterval: spawnDuration / (Math.ceil(enemyCount / burstSize) - 1), drifterChance: Math.max(.05, .4 - .09 * level), spinnerChance: wave === 1 ? 0 : Math.min(.48, .2 + .045 * (wave - 2)), speedBonus: Math.min(27, 2.6 * level + .055 * level * level), pursuitResponse: Math.min(10, 4 + .65 * level), interceptTime: Math.min(.55, Math.max(0, wave - 2) * .09), health: 1 + .2 * level + .025 * level * level, eliteChance: wave < 3 ? 0 : Math.min(.3, .08 + .018 * (wave - 3)) };
}

export class GameModel {
  status: Status = 'ready';
  score = 0; best = 0; lives = 3; bombs = 3; wave = 1; multiplier = 1; kills = 0; time = 0;
  width = 110; height = 60; invulnerable = 0; waveBanner = 0; shake = 0;
  shields = 0; rerolls = 2;
  weapons: WeaponState[] = [{ id: 'needle', level: 1, rarity: 'common' }];
  stats: RunStats = emptyStats();
  rewards: Reward[] = []; relics: OwnedRelic[] = []; owned: Record<string, number> = {};
  player = { x: 0, y: 0, angle: Math.PI / 2, vx: 0, vy: 0 };
  enemies: Enemy[] = []; bullets: Bullet[] = []; events: GameEvent[] = [];
  private id = 0; private shotClocks = new Map<WeaponId, number>(); private spawnClock = 0; private remaining = 0; private nextWave = 0; private streak = 0; private spawnSide = 0; private offerSerial = 0; private rewardSeen = new Set<string>(); private orbitalClock = 0; private bombCredit = 0;
  random: () => number;
  constructor(random = Math.random) { this.random = random; }
  get profiles() { return this.weapons.map(weapon => weaponProfile(weapon, this.stats, { moving: Math.hypot(this.player.vx, this.player.vy) > 3, shields: this.shields, lives: this.lives })); }
  setBounds(width: number, height: number) {
    this.width = width; this.height = height;
    this.player.x = clamp(this.player.x, -width / 2 + 2, width / 2 - 2); this.player.y = clamp(this.player.y, -height / 2 + 2, height / 2 - 2);
    for (const e of this.enemies) { e.x = clamp(e.x, -width / 2 + 1, width / 2 - 1); e.y = clamp(e.y, -height / 2 + 1, height / 2 - 1); }
  }
  snapshot(): GameSnapshot { return { status: this.status, score: this.score, best: this.best, lives: this.lives, bombs: this.bombs, wave: this.wave, multiplier: this.multiplier, kills: this.kills, time: this.time, waveBanner: this.waveBanner > 0, shields: this.shields, rerolls: this.rerolls, weapons: this.profiles, rewards: this.rewards.map(r => ({ ...r })), relics: this.relics.map(r => ({ ...r })), waveProgress: this.status === 'ready' ? 0 : clamp(1 - (this.remaining + this.enemies.length) / getWaveTuning(this.wave).enemyCount, 0, 1) }; }
  start() {
    this.status = 'playing'; this.score = 0; this.lives = 3; this.bombs = 3; this.wave = 1; this.multiplier = 1; this.kills = 0; this.time = 0; this.streak = 0;
    this.shields = 0; this.rerolls = 2; this.weapons = [{ id: 'needle', level: 1, rarity: 'common' }]; this.stats = emptyStats(); this.rewards = []; this.relics = []; this.owned = {}; this.rewardSeen.clear(); this.bombCredit = 0; this.orbitalClock = 0;
    this.enemies = []; this.bullets = []; this.events = [{ type: 'start', x: 0, y: 0 }];
    this.player = { x: 0, y: 0, angle: Math.PI / 2, vx: 0, vy: 0 };
    this.shotClocks.clear(); this.invulnerable = 2.5; this.shake = 0; this.beginWave();
  }
  pause() { if (this.status === 'playing') this.status = 'paused'; }
  resume() { if (this.status === 'paused') this.status = 'playing'; }
  private beginWave() {
    this.remaining = getWaveTuning(this.wave).enemyCount; this.spawnClock = 1.5; this.nextWave = 1;
    this.spawnSide = Math.floor(this.random() * 4); this.waveBanner = 1.8;
    this.shields = Math.min(6, this.shields + this.stats.shieldRegen);
    this.events.push({ type: 'wave', x: 0, y: 0 });
  }
  private finishWave() {
    this.status = 'reward'; this.waveBanner = 0; this.bullets = []; this.player.vx = 0; this.player.vy = 0;
    this.bombCredit += this.stats.bombRegen;
    if (this.bombCredit >= 1) { const bombs = Math.floor(this.bombCredit); this.bombs = Math.min(9, this.bombs + bombs); this.bombCredit -= bombs; }
    this.rewardSeen.clear(); this.generateRewards(); this.events.push({ type: 'reward', x: this.player.x, y: this.player.y });
  }
  private canOffer(def: RelicDef) {
    if ((this.owned[def.id] ?? 0) >= def.maxStacks) return false;
    if (def.stat && this.stats[def.stat] >= (CAPS[def.stat] ?? Infinity)) return false;
    if (def.effect === 'lives' && this.lives >= 9 || def.effect === 'shields' && this.shields >= 6 || def.effect === 'bombs' && this.bombs >= 9 || def.effect === 'glass' && this.lives <= 1) return false;
    if (def.id === 'rebound' && !this.profiles.some(p => p.bounces) || def.id === 'rupture' && !this.stats.crit || def.id === 'fortress' && !this.shields && !this.stats.shieldRegen) return false;
    return true;
  }
  private generateRewards() {
    const first = this.wave === 1, weaponDraft = first || this.wave === 5;
    const keys = weaponDraft ? WEAPONS.filter(w => !this.weapons.some(owned => owned.id === w.id)).map(w => `weapon:${w.id}`) : [
      ...this.weapons.filter(w => w.level < MAX_WEAPON_LEVEL || w.rarity !== 'legendary').map(w => `upgrade:${w.id}`),
      ...RELICS.filter(d => this.canOffer(d)).map(d => `relic:${d.id}`),
    ];
    let pool = keys.filter(k => !this.rewardSeen.has(k));
    if (pool.length < 3) { this.rewardSeen = new Set(this.rewards.map(r => r.key)); pool = keys.filter(k => !this.rewardSeen.has(k)); }
    const selected: string[] = [];
    // Offer investment in either equipped weapon without favoring the first slot.
    const upgrades = pool.filter(k => k.startsWith('upgrade:'));
    if (upgrades.length) { const key = upgrades[Math.floor(this.random() * upgrades.length)]; selected.push(key); pool = pool.filter(k => k !== key); }
    while (selected.length < 3 && pool.length) {
      const weights = pool.map(k => k === 'relic:reroll' ? 1.5 : 1);
      let roll = this.random() * weights.reduce((a, b) => a + b, 0), index = pool.length - 1;
      for (let i = 0; i < pool.length; i++) { roll -= weights[i]; if (roll <= 0) { index = i; break; } }
      selected.push(pool[index]); pool.splice(index, 1);
    }
    this.rewards = selected.map(key => {
      this.rewardSeen.add(key); let rarity = rollRarity(this.random, this.wave, this.stats.luck);
      const id = `${this.wave}:${++this.offerSerial}:${key}`;
      if (key.startsWith('weapon:')) {
        const weapon = WEAPONS.find(w => key === `weapon:${w.id}`)!;
        const level = first ? 1 : 2;
        return { id, key, type: 'weapon', name: weapon.name, rarity, category: weapon.tagline, description: `${weapon.description} ${first ? 'Replaces the Needle at level 1.' : `Adds a level ${level} weapon alongside ${getWeapon(this.weapons[0].id).name}. Both fire together.`}`, weaponId: weapon.id, amount: level };
      }
      if (key.startsWith('upgrade:')) {
        const weapon = this.weapons.find(w => key === `upgrade:${w.id}`)!;
        if (weapon.level === MAX_WEAPON_LEVEL) rarity = RARITIES[Math.max(RARITIES.indexOf(rarity), RARITIES.indexOf(weapon.rarity) + 1)];
        const amount = Math.min(MAX_WEAPON_LEVEL - weapon.level, rarity === 'legendary' ? 3 : rarity === 'epic' ? 2 : 1);
        const nextRarity = RARITIES[Math.max(RARITIES.indexOf(weapon.rarity), RARITIES.indexOf(rarity))];
        return { id, key, type: 'upgrade', name: `${getWeapon(weapon.id).name} ${amount ? `+${amount}` : 'Ascension'}`, rarity, category: 'WEAPON UPGRADE', description: `${getWeapon(weapon.id).name}: ${amount ? `level ${weapon.level} → ${weapon.level + amount}. More damage and faster fire. ` : ''}${nextRarity !== weapon.rarity ? `Raise weapon quality to ${nextRarity}. ` : ''}Applies to this weapon. Keep your full loadout and relics.`, weaponId: weapon.id, amount };
      }
      const def = RELICS.find(d => key === `relic:${d.id}`)!;
      const amount = def.stat ? Math.min(relicValue(def, rarity), (CAPS[def.stat] ?? Infinity) - this.stats[def.stat]) : relicValue(def, rarity);
      return { id, key, type: 'relic', name: def.name, rarity, category: def.category, description: def.describe(amount), relicId: def.id, amount };
    });
  }
  rerollRewards() {
    if (this.status !== 'reward' || this.rerolls <= 0) return false;
    this.rerolls--; this.generateRewards(); return true;
  }
  chooseReward(id: string) {
    if (this.status !== 'reward') return false;
    const reward = this.rewards.find(r => r.id === id); if (!reward) return false;
    if (reward.type === 'weapon') {
      if (this.wave !== 1 && this.wave !== 5 || this.weapons.some(w => w.id === reward.weaponId) || !WEAPONS.some(w => w.id === reward.weaponId)) return false;
      const weapon = { id: reward.weaponId!, level: reward.amount, rarity: reward.rarity };
      if (this.wave === 1) this.weapons = [weapon];
      else { if (this.weapons.length !== 1) return false; this.weapons.push(weapon); }
    }
    else if (reward.type === 'upgrade') {
      const weapon = this.weapons.find(w => w.id === reward.weaponId); if (!weapon) return false;
      weapon.level = Math.min(MAX_WEAPON_LEVEL, weapon.level + reward.amount);
      weapon.rarity = RARITIES[Math.max(RARITIES.indexOf(weapon.rarity), RARITIES.indexOf(reward.rarity))];
    } else {
      const def = RELICS.find(d => d.id === reward.relicId)!;
      if (def.stat) this.stats[def.stat] += reward.amount;
      if (def.id === 'fusillade') this.stats.fireRate = Math.min(3, this.stats.fireRate + reward.amount / 2);
      if (def.effect === 'lives') this.lives = Math.min(9, this.lives + reward.amount);
      if (def.effect === 'shields') this.shields = Math.min(6, this.shields + reward.amount);
      if (def.effect === 'bombs') this.bombs = Math.min(9, this.bombs + reward.amount);
      if (def.effect === 'rerolls') this.rerolls += reward.amount;
      if (def.effect === 'glass') { this.lives--; this.stats.damage += reward.amount; }
      this.owned[def.id] = (this.owned[def.id] ?? 0) + 1;
      this.relics.push({ id: def.id, name: def.name, rarity: reward.rarity, description: reward.description });
    }
    this.rewards = []; this.status = 'playing'; this.wave++; this.player.vx = 0; this.player.vy = 0;
    this.invulnerable = Math.max(this.invulnerable, 1.8); this.shotClocks = new Map(this.weapons.map(w => [w.id, .15])); this.events.push({ type: 'upgrade', x: this.player.x, y: this.player.y, color: this.profiles.find(p => p.id === reward.weaponId)?.color ?? COLORS.player }); this.beginWave(); return true;
  }
  spawnEnemy(kind?: EnemyKind, entrySide?: number) {
    const side = entrySide ?? Math.floor(this.random() * 4), w = this.width / 2 - 2, h = this.height / 2 - 2;
    let x = side < 2 ? (side === 0 ? -w : w) : (this.random() * 2 - 1) * w, y = side >= 2 ? (side === 2 ? -h : h) : (this.random() * 2 - 1) * h;
    if (Math.hypot(x - this.player.x, y - this.player.y) < 18) { x = -x; y = -y; }
    const direction = normal(this.player.x - x, this.player.y - y), roll = this.random(), tuning = getWaveTuning(this.wave);
    const selected = kind ?? (roll < tuning.drifterChance ? 'drifter' : roll < 1 - tuning.spinnerChance ? 'chaser' : 'spinner');
    const elite = this.random() < tuning.eliteChance, hp = tuning.health * (elite ? 3 : 1) * (selected === 'spinner' ? 1.15 : 1);
    const e: Enemy = { id: ++this.id, kind: selected, x, y, vx: direction.x, vy: direction.y, angle: this.random() * Math.PI * 2, age: 0, radius: (selected === 'spinner' ? 1.35 : 1.05) * (elite ? 1.4 : 1), hp, maxHp: hp, elite, burn: 0, burnTime: 0, slow: 0, slowTime: 0, flash: 0 };
    this.enemies.push(e); return e;
  }
  private destroyEnemy(enemy: Enemy, award: boolean) {
    const i = this.enemies.indexOf(enemy); if (i < 0) return;
    enemy.hp = 0; this.events.push({ type: 'kill', x: enemy.x, y: enemy.y, kind: enemy.kind });
    if (award) {
      this.score += Math.round(POINTS[enemy.kind] * (enemy.elite ? 3 : 1) * this.multiplier * (1 + this.stats.score)); this.kills++; this.streak++;
      this.multiplier = Math.min(8, 1 + Math.floor(this.streak / 5)); this.best = Math.max(this.best, this.score);
      if (this.stats.vampiric && this.kills % 50 === 0) this.shields = Math.min(6, this.shields + this.stats.vampiric);
    }
    this.enemies.splice(i, 1);
  }
  private damageEnemy(enemy: Enemy, damage: number, execute = 0) {
    if (enemy.hp <= 0) return;
    enemy.hp -= damage; enemy.flash = .1;
    if (enemy.hp <= 0 || enemy.hp / enemy.maxHp <= execute) this.destroyEnemy(enemy, true);
  }
  // Combat effects can remove targets; iterate a snapshot of the active list.
  private explosion(x: number, y: number, radius: number, damage: number, exclude?: number) {
    this.events.push({ type: 'blast', x, y, radius, color: '#ffc16e' });
    for (const e of this.enemies.slice()) if (e.id !== exclude && Math.hypot(e.x - x, e.y - y) <= radius + e.radius) this.damageEnemy(e, damage);
  }
  private chainLightning(from: Vec, damage: number, count: number, hitIds: Set<number>, range = 13) {
    let origin = from;
    for (let hop = 0; hop < count; hop++) {
      let target: Enemy | undefined, distance = range;
      for (const e of this.enemies) { const d = Math.hypot(e.x - origin.x, e.y - origin.y); if (!hitIds.has(e.id) && d < distance) { target = e; distance = d; } }
      if (!target) break;
      hitIds.add(target.id); damage *= .65; this.events.push({ type: 'arc', x: origin.x, y: origin.y, tx: target.x, ty: target.y, color: '#99eaff' });
      this.damageEnemy(target, damage); origin = { x: target.x, y: target.y };
    }
  }
  bomb() {
    if (this.status !== 'playing' || this.bombs <= 0) return false;
    this.bombs--; this.shake = .65; this.invulnerable = Math.max(this.invulnerable, 1.2);
    this.events.push({ type: 'bomb', x: this.player.x, y: this.player.y });
    for (const e of this.enemies.slice()) this.destroyEnemy(e, true); return true;
  }
  private shoot(profile: WeaponProfile) {
    const count = profile.pellets;
    for (let i = 0; i < count && this.bullets.length < MAX_BULLETS; i++) {
      const offset = profile.id === 'nova' ? i / count * Math.PI * 2 : count === 1 ? 0 : (i / (count - 1) - .5) * profile.spread;
      const a = this.player.angle + offset, critical = this.random() < profile.crit;
      this.bullets.push({ id: ++this.id, x: this.player.x + Math.cos(a) * 1.5, y: this.player.y + Math.sin(a) * 1.5, vx: Math.cos(a) * profile.speed, vy: Math.sin(a) * profile.speed, age: 0, damage: profile.damage * (critical ? profile.critDamage : 1), radius: profile.radius, lifetime: profile.lifetime, color: critical ? '#ffffff' : profile.color, pierce: (profile.pierce ?? 0) + (critical && profile.synergies.includes('Deadeye') ? 2 : 0), bounces: profile.bounces, homing: profile.homing, blast: profile.blast, chain: profile.chain, burn: profile.burn, slow: profile.slow, knockback: profile.knockback, rebound: profile.rebound, execute: profile.execute, hits: new Set(), bounceCount: 0, critical, style: profile.id });
    }
    this.events.push({ type: 'shot', x: this.player.x, y: this.player.y, weaponId: profile.id });
  }
  orbitPositions(): Vec[] { return Array.from({ length: Math.min(6, this.stats.orbitals) }, (_, i) => ({ x: this.player.x + Math.cos(this.time * 2.2 + i / this.stats.orbitals * Math.PI * 2) * 4.8, y: this.player.y + Math.sin(this.time * 2.2 + i / this.stats.orbitals * Math.PI * 2) * 4.8 })); }
  step(dt: number, input: Input) {
    if (this.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    const tuning = getWaveTuning(this.wave); dt = Math.min(dt, .05); this.time += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt); this.waveBanner = Math.max(0, this.waveBanner - dt); this.shake = Math.max(0, this.shake - dt * 2);
    const movement = normal(input.move.x, input.move.y), easing = 1 - Math.exp(-14 * dt), speed = 22 * (1 + Math.min(.75, this.stats.speed));
    this.player.vx += (movement.x * speed - this.player.vx) * easing; this.player.vy += (movement.y * speed - this.player.vy) * easing;
    this.player.x = clamp(this.player.x + this.player.vx * dt, -this.width / 2 + 1.8, this.width / 2 - 1.8); this.player.y = clamp(this.player.y + this.player.vy * dt, -this.height / 2 + 1.8, this.height / 2 - 1.8);
    const aim = normal(input.aim.x, input.aim.y); if (Math.hypot(aim.x, aim.y) > .1) this.player.angle = Math.atan2(aim.y, aim.x);
    for (const profile of this.profiles) {
      let clock = (this.shotClocks.get(profile.id) ?? 0) - dt;
      if (input.shooting && clock <= 0) { clock = Math.max(clock, -dt) + profile.interval; this.shoot(profile); }
      this.shotClocks.set(profile.id, clock);
    }
    if (this.enemies.length < MAX_ACTIVE_ENEMIES) this.spawnClock -= dt;
    if (this.remaining > 0 && this.spawnClock <= 0 && this.enemies.length < MAX_ACTIVE_ENEMIES) {
      const count = Math.min(tuning.burstSize, this.remaining, MAX_ACTIVE_ENEMIES - this.enemies.length);
      for (let i = 0; i < count; i++) this.spawnEnemy(undefined, (this.spawnSide + i) % 4);
      this.spawnSide = (this.spawnSide + 1) % 4; this.remaining -= count; this.spawnClock += tuning.spawnInterval;
    }
    for (const e of this.enemies.slice()) {
      e.age += dt; e.flash = Math.max(0, e.flash - dt); e.angle += dt * (e.kind === 'spinner' ? 3.8 : .7);
      if (e.burnTime > 0) { e.burnTime -= dt; this.damageEnemy(e, e.burn * dt); if (e.hp <= 0) continue; }
      if (e.slowTime > 0) e.slowTime -= dt;
      if (e.age < .8) continue;
      const toward = normal(this.player.x - e.x, this.player.y - e.y);
      const enemySpeed = ((e.kind === 'drifter' ? 6 : e.kind === 'chaser' ? 9 : 8) + tuning.speedBonus) * (e.elite ? 1.08 : 1) * (e.slowTime > 0 ? 1 - e.slow : 1);
      if (e.kind === 'chaser') {
        const intercept = normal(this.player.x + this.player.vx * tuning.interceptTime - e.x, this.player.y + this.player.vy * tuning.interceptTime - e.y), response = 1 - Math.exp(-tuning.pursuitResponse * dt);
        e.vx += (intercept.x - e.vx) * response; e.vy += (intercept.y - e.vy) * response;
      }
      if (e.kind === 'spinner') { const a = Math.atan2(toward.y, toward.x) + Math.sin(e.age * 2) * .9; e.vx = Math.cos(a); e.vy = Math.sin(a); }
      e.x += e.vx * enemySpeed * dt; e.y += e.vy * enemySpeed * dt;
      if (Math.abs(e.x) > this.width / 2 - 1.6) { e.x = Math.sign(e.x) * (this.width / 2 - 1.6); e.vx *= -1; }
      if (Math.abs(e.y) > this.height / 2 - 1.6) { e.y = Math.sign(e.y) * (this.height / 2 - 1.6); e.vy *= -1; }
    }
    this.orbitalClock -= dt;
    if (this.orbitalClock <= 0 && this.stats.orbitals > 0) {
      this.orbitalClock = .2;
      for (const p of this.orbitPositions()) for (const e of this.enemies.slice()) if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + .8) this.damageEnemy(e, 1.2 * (1 + this.stats.damage));
    }
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i], ox = b.x, oy = b.y;
      b.hits ??= new Set();
      if (b.homing && this.enemies.length) {
        let target: Enemy | undefined, nearest = 34;
        for (const e of this.enemies) { const d = Math.hypot(e.x - b.x, e.y - b.y); if (d < nearest && !b.hits.has(e.id)) { nearest = d; target = e; } }
        if (target) { const direction = normal(target.x - b.x, target.y - b.y), s = Math.hypot(b.vx, b.vy), t = Math.min(1, b.homing * dt); const n = normal(b.vx / s * (1 - t) + direction.x * t, b.vy / s * (1 - t) + direction.y * t); b.vx = n.x * s; b.vy = n.y * s; }
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.age += dt;
      let removed = false;
      for (const e of this.enemies.slice()) {
        if (e.hp <= 0 || b.hits.has(e.id)) continue;
        const sx = b.x - ox, sy = b.y - oy, t = clamp(((e.x - ox) * sx + (e.y - oy) * sy) / (sx * sx + sy * sy || 1), 0, 1);
        if (Math.hypot(ox + sx * t - e.x, oy + sy * t - e.y) >= e.radius + (b.radius ?? .28)) continue;
        const damage = (b.damage ?? 1) * (e.burnTime > 0 && e.slowTime > 0 && b.burn && b.slow ? 1.5 : 1);
        b.hits.add(e.id); const impact = { x: e.x, y: e.y };
        if (b.burn) { e.burn = Math.max(e.burn, b.burn); e.burnTime = 3; }
        if (b.slow) { e.slow = Math.max(e.slow, b.slow); e.slowTime = 2; }
        this.damageEnemy(e, damage, b.execute);
        this.events.push({ type: 'impact', x: impact.x, y: impact.y, color: b.color ?? COLORS.player });
        if (b.blast) this.explosion(impact.x, impact.y, b.blast, damage * .65, e.id);
        if (b.chain) this.chainLightning(impact, damage, b.chain, new Set([e.id]), b.blast ? 16 : 13);
        if (b.knockback && e.hp > 0) { const push = normal(b.vx, b.vy); e.x = clamp(e.x + push.x * b.knockback, -this.width / 2 + 1.6, this.width / 2 - 1.6); e.y = clamp(e.y + push.y * b.knockback, -this.height / 2 + 1.6, this.height / 2 - 1.6); }
        if ((b.pierce ?? 0) > 0) b.pierce!--; else { removed = true; break; }
      }
      if (!removed && (Math.abs(b.x) >= this.width / 2 || Math.abs(b.y) >= this.height / 2)) {
        if ((b.bounces ?? 0) > 0) {
          if (Math.abs(b.x) >= this.width / 2) { b.vx *= -1; b.x = clamp(b.x, -this.width / 2 + .1, this.width / 2 - .1); }
          if (Math.abs(b.y) >= this.height / 2) { b.vy *= -1; b.y = clamp(b.y, -this.height / 2 + .1, this.height / 2 - .1); }
          b.bounces!--; b.bounceCount = (b.bounceCount ?? 0) + 1;
          if (b.bounceCount <= 3) b.damage = (b.damage ?? 1) * (1 + (b.rebound ?? 0));
        } else removed = true;
      }
      if (b.age >= (b.lifetime ?? 2)) { if (!removed && b.blast) this.explosion(b.x, b.y, b.blast, (b.damage ?? 1) * .65); removed = true; }
      if (removed) this.bullets.splice(i, 1);
    }
    if (this.invulnerable === 0 && this.enemies.some(e => e.age > .8 && Math.hypot(e.x - this.player.x, e.y - this.player.y) < e.radius + .72)) {
      if (this.random() < this.stats.dodge) { this.invulnerable = .7; this.events.push({ type: 'shield', x: this.player.x, y: this.player.y }); }
      else {
        const x = this.player.x, y = this.player.y;
        if (this.shields > 0) { this.shields--; this.invulnerable = 1.3; this.events.push({ type: 'shield', x, y }); }
        else {
          this.events.push({ type: 'hit', x, y }); this.shake = .65; this.lives--; this.streak = 0; this.multiplier = 1; this.invulnerable = 3 + this.stats.grace;
          this.player.x = 0; this.player.y = 0; this.player.vx = 0; this.player.vy = 0;
          for (const e of this.enemies.slice()) if (Math.hypot(e.x, e.y) < 15) this.destroyEnemy(e, false);
          if (this.lives <= 0) this.status = 'over';
        }
        if (this.stats.thorns) this.explosion(x, y, 8, this.stats.thorns);
      }
    }
    if (this.status === 'playing' && this.remaining === 0 && this.enemies.length === 0) { this.nextWave -= dt; if (this.nextWave <= 0) this.finishWave(); }
  }
}
