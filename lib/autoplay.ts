import { getWaveTuning, type Enemy, type GameModel, type Input, type Vec } from './game-model.ts';
import { RELICS, upgradedWeapon, weaponProfile, type Reward, type WeaponProfile } from './roguelike.ts';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const unit = (x: number, y: number): Vec => { const length = Math.hypot(x, y); return length > .0001 ? { x: x / length, y: y / length } : { x: 0, y: 0 }; };
const idle = (): Input => ({ move: { x: 0, y: 0 }, aim: { x: 0, y: 1 }, shooting: false });
const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
export type CodeKey = { code: string; repeat?: boolean; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; isComposing?: boolean };

/** A suffix matcher preserves overlapping starts, but never combines separate typing sessions. */
export class KonamiSequence {
  private keys: string[] = [];
  private last = 0;
  reset() { this.keys = []; this.last = 0; }
  push(event: CodeKey, now: number, editing = false) {
    if (editing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) { this.reset(); return false; }
    if (event.repeat) return false;
    if (now - this.last > 1800) this.reset();
    this.last = now;
    this.keys.push(event.code);
    while (this.keys.length && !this.keys.every((key, i) => key === CODE[i])) this.keys.shift();
    if (this.keys.length !== CODE.length) return false;
    this.reset(); return true;
  }
}

// Mirrors GameModel's motion, including warning time, slowdown, pursuit response,
// spinner phase and wall reflection. Enemy vx/vy are directions, NOT world speed.
export function predictEnemyStep(enemy: Enemy, player: Vec & { vx: number; vy: number }, model: Pick<GameModel, 'wave' | 'width' | 'height'>, dt: number) {
  const tuning = getWaveTuning(model.wave);
  enemy.age += dt;
  enemy.slowTime = Math.max(0, enemy.slowTime - dt);
  if (enemy.age < .8) return;
  const speed = ((enemy.kind === 'drifter' ? 6 : enemy.kind === 'chaser' ? 9 : 8) + tuning.speedBonus) * (enemy.elite ? 1.08 : 1) * (enemy.slowTime > 0 ? 1 - enemy.slow : 1);
  if (enemy.kind === 'chaser') {
    const direction = unit(player.x + player.vx * tuning.interceptTime - enemy.x, player.y + player.vy * tuning.interceptTime - enemy.y);
    const response = 1 - Math.exp(-tuning.pursuitResponse * dt);
    enemy.vx += (direction.x - enemy.vx) * response; enemy.vy += (direction.y - enemy.vy) * response;
  } else if (enemy.kind === 'spinner') {
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x) + Math.sin(enemy.age * 2) * .9;
    enemy.vx = Math.cos(angle); enemy.vy = Math.sin(angle);
  }
  enemy.x += enemy.vx * speed * dt; enemy.y += enemy.vy * speed * dt;
  if (Math.abs(enemy.x) > model.width / 2 - 1.6) { enemy.x = Math.sign(enemy.x) * (model.width / 2 - 1.6); enemy.vx *= -1; }
  if (Math.abs(enemy.y) > model.height / 2 - 1.6) { enemy.y = Math.sign(enemy.y) * (model.height / 2 - 1.6); enemy.vy *= -1; }
}

/** Positive time to intercept a constant-velocity target (the muzzle is 1.5 units ahead). */
export function interceptTime(relative: Vec, velocity: Vec, speed: number) {
  const a = velocity.x ** 2 + velocity.y ** 2 - speed ** 2;
  const b = 2 * (relative.x * velocity.x + relative.y * velocity.y - 1.5 * speed);
  const c = relative.x ** 2 + relative.y ** 2 - 1.5 ** 2;
  if (c <= 0) return 0;
  if (Math.abs(a) < 1e-8) return b < 0 ? -c / b : Infinity;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return Infinity;
  const root = Math.sqrt(discriminant);
  const times = [(-b - root) / (2 * a), (-b + root) / (2 * a)].filter(t => t >= 0);
  return times.length ? Math.min(...times) : Infinity;
}

function profilePower(p: WeaponProfile) {
  // Estimate useful sustained crowd damage; wide volleys rarely all hit one target.
  const pellets = p.id === 'nova' ? 2.2 : 1 + (p.pellets - 1) * (p.spread > .5 ? .3 : .7);
  const range = Math.min(1, p.speed * p.lifetime / 38);
  return (p.damage * (1 + p.crit * (p.critDamage - 1)) * pellets / p.interval + (p.burn ?? 0) * 1.2)
    * (1 + Math.min(4, p.pierce ?? 0) * .2 + (p.chain ?? 0) * .27 + (p.blast ?? 0) * .12)
    * range * (1 + Math.min(5, p.homing ?? 0) * .035 + p.slow * .6);
}

export function predictiveAim(model: GameModel, dt = 1 / 60, move: Vec = { x: 0, y: 0 }): { aim: Vec; shooting: boolean; targetId?: number; weaponAim: Input['weaponAim'] } {
  dt = clamp(dt, 0, .05);
  const direction = unit(move.x, move.y), speed = 22 * (1 + Math.min(.75, model.stats.speed));
  const easing = 1 - Math.exp(-14 * dt);
  const vx = model.player.vx + (direction.x * speed - model.player.vx) * easing, vy = model.player.vy + (direction.y * speed - model.player.vy) * easing;
  // GameModel accelerates/moves before firing, and bullets do not inherit ship velocity.
  const origin = { x: clamp(model.player.x + vx * dt, -model.width / 2 + 1.8, model.width / 2 - 1.8), y: clamp(model.player.y + vy * dt, -model.height / 2 + 1.8, model.height / 2 - 1.8), vx, vy };
  let enemy: Enemy | undefined, distance = Infinity;
  for (const e of model.enemies) {
    const d = Math.hypot(e.x - origin.x, e.y - origin.y);
    if (e.hp > 0 && d < distance) { distance = d; enemy = e; }
  }
  const weaponAim: Input['weaponAim'] = {};
  if (!enemy) return { aim: { x: 0, y: 1 }, shooting: false, weaponAim };
  for (const profile of model.profiles) {
    const motion = { ...enemy };
    predictEnemyStep(motion, origin, model, .04);
    const estimate = interceptTime({ x: enemy.x - origin.x, y: enemy.y - origin.y }, { x: (motion.x - enemy.x) / .04, y: (motion.y - enemy.y) / .04 }, profile.speed);
    let time = Number.isFinite(estimate) ? estimate : Math.max(0, (distance - 1.5) / profile.speed), target = { ...enemy };
    for (let iteration = 0; iteration < 4; iteration++) {
      target = { ...enemy };
      const steps = Math.max(1, Math.ceil(Math.min(time, profile.lifetime) / .04)), step = Math.min(time, profile.lifetime) / steps;
      for (let i = 0; i < steps; i++) predictEnemyStep(target, { ...origin, x: clamp(origin.x + origin.vx * step * (i + 1), -model.width / 2 + 1.8, model.width / 2 - 1.8), y: clamp(origin.y + origin.vy * step * (i + 1), -model.height / 2 + 1.8, model.height / 2 - 1.8) }, model, step);
      time = Math.max(0, (Math.hypot(target.x - origin.x, target.y - origin.y) - 1.5) / profile.speed);
    }
    // An unreachable target still receives fire while movement closes range.
    // Lead no farther than projectile lifetime; never switch to a farther enemy.
    weaponAim[profile.id] = unit(target.x - origin.x, target.y - origin.y);
  }
  return { aim: weaponAim[model.weapons[0].id] ?? unit(enemy.x - origin.x, enemy.y - origin.y), shooting: true, targetId: enemy.id, weaponAim };
}

export function rewardScore(model: GameModel, reward: Reward) {
  const context = { moving: true, lives: model.lives, shields: model.shields };
  const current = model.weapons.map(w => weaponProfile(w, model.stats, context));
  const total = current.reduce((sum, p) => sum + profilePower(p), 0);
  if (reward.type === 'weapon') {
    const p = weaponProfile({ id: reward.weaponId!, level: reward.amount, rarity: reward.rarity }, model.stats, context);
    // On wave one the draft REPLACES Needle; later drafts add a second weapon.
    return profilePower(p) / Math.max(1, total) * 100;
  }
  if (reward.type === 'upgrade') {
    const w = model.weapons.find(w => w.id === reward.weaponId);
    if (!w) return -Infinity;
    return (profilePower(weaponProfile(upgradedWeapon(w, reward.amount, reward.rarity), model.stats, context)) - profilePower(weaponProfile(w, model.stats, context))) / Math.max(1, total) * 100;
  }
  const def = RELICS.find(r => r.id === reward.relicId);
  if (!def) return -Infinity;
  const amount = reward.amount;
  if (def.effect === 'lives') return amount * (model.lives <= 1 ? 145 : model.lives === 2 ? 60 : 17);
  if (def.effect === 'shields') return amount * (model.lives <= 1 ? 55 : 12) / (1 + model.shields * .4);
  if (def.effect === 'bombs') return amount * (model.bombs === 0 ? 35 : 16);
  if (def.effect === 'rerolls') return amount * 7;
  if (def.effect === 'glass') return amount / (1 + model.stats.damage) * 100 - (model.lives <= 2 ? 120 : 35);
  const stats = { ...model.stats };
  if (def.stat) stats[def.stat] += amount;
  if (def.id === 'fusillade') stats.fireRate = Math.min(3, stats.fireRate + amount / 2);
  const improvement = (model.weapons.reduce((sum, w) => sum + profilePower(weaponProfile(w, stats, context)), 0) - total) / Math.max(1, total) * 100;
  const utility: Partial<Record<NonNullable<typeof def.stat>, number>> = { speed: 240 / (1 + model.stats.speed * 3), shieldRegen: 38 / (1 + model.stats.shieldRegen), vampiric: 80 / (1 + model.stats.vampiric * 2), bombRegen: 75, dodge: 90, grace: 6, orbitals: 12, luck: 75, execute: 90, knockback: 6, size: 12, projectileSpeed: 16, bounces: 4, thorns: .5, score: 0 };
  return improvement + amount * (def.stat ? utility[def.stat] ?? 0 : 0);
}
export function chooseAutoplayReward(model: GameModel) {
  return model.rewards.reduce<Reward | undefined>((best, reward) => !best || rewardScore(model, reward) > rewardScore(model, best) ? reward : best, undefined);
}

type Decision = { input: Input; bomb?: boolean; rewardId?: string; restart?: boolean };
export class AutoplayController {
  enabled = false;
  private delay = 0;
  private phase = '';
  private previous: Vec = { x: 0, y: 0 };
  setEnabled(enabled: boolean) { this.enabled = enabled; this.reset(); }
  reset() { this.delay = 0; this.phase = ''; this.previous = { x: 0, y: 0 }; }
  update(model: GameModel, dt: number, foreground = true): Decision {
    if (!this.enabled || !foreground || model.status === 'paused') { this.reset(); return { input: idle() }; }
    if (this.phase !== model.status) { this.phase = model.status; this.delay = 0; }
    this.delay += clamp(dt, 0, .05);
    if (model.status === 'reward') return { input: idle(), rewardId: this.delay >= 1.1 ? chooseAutoplayReward(model)?.id : undefined };
    if (model.status === 'ready' || model.status === 'over') return { input: idle(), restart: model.status === 'ready' || this.delay >= 2.5 };
    const movement = this.movement(model);
    const aim = predictiveAim(model, dt, movement.move);
    this.previous = movement.move;
    return { input: { move: movement.move, aim: aim.aim, weaponAim: aim.weaponAim, shooting: aim.shooting }, bomb: model.bombs > 0 && model.invulnerable < .2 && movement.danger > 0 };
  }
  private movement(model: GameModel) {
    const speed = 22 * (1 + Math.min(.75, model.stats.speed));
    const nearby = model.enemies.filter(e => e.hp > 0).map(e => ({ e, d: Math.hypot(e.x - model.player.x, e.y - model.player.y) })).sort((a, b) => a.d - b.d);
    // At most 40 detailed trajectories; all enemies still contribute destination
    // crowd pressure. Far threats cannot close the horizon before the next plan.
    const threats = nearby.filter(({ d }) => d < speed * .85 + 24).slice(0, 40).map(({ e }) => e);
    const directions: Vec[] = [{ x: 0, y: 0 }, ...Array.from({ length: 24 }, (_, i) => ({ x: Math.cos(i * Math.PI / 12), y: Math.sin(i * Math.PI / 12) }))];
    let best = { move: directions[0], score: Infinity, danger: Infinity };
    for (const move of directions) {
      const p = { ...model.player }, enemies = threats.map(e => ({ ...e }));
      let cost = 0, danger = 0;
      for (let step = 1; step <= 16; step++) {
        const dt = .05, oldX = p.x, oldY = p.y;
        p.vx += (move.x * speed - p.vx) * (1 - Math.exp(-14 * dt)); p.vy += (move.y * speed - p.vy) * (1 - Math.exp(-14 * dt));
        p.x = clamp(p.x + p.vx * dt, -model.width / 2 + 1.8, model.width / 2 - 1.8); p.y = clamp(p.y + p.vy * dt, -model.height / 2 + 1.8, model.height / 2 - 1.8);
        let clearance = 100;
        for (const e of enemies) {
          const rx = e.x - oldX, ry = e.y - oldY;
          predictEnemyStep(e, p, model, dt);
          if (e.age < .8) continue;
          const dx = e.x - p.x - rx, dy = e.y - p.y - ry;
          const t = clamp(-(rx * dx + ry * dy) / (dx * dx + dy * dy || 1), 0, 1);
          const gap = Math.hypot(rx + dx * t, ry + dy * t) - e.radius - .72;
          clearance = Math.min(clearance, gap);
          if (gap < .3 && step * dt > model.invulnerable) { cost += (10000 + Math.max(0, -gap) * 10000) / step; if (step <= 5) danger++; }
          cost += Math.max(0, 6 - gap) ** 2 * .055 / step;
        }
        cost += Math.max(0, 4 - clearance) ** 2 * 1.5 / step;
        const wall = Math.min(model.width / 2 - Math.abs(p.x), model.height / 2 - Math.abs(p.y));
        cost += Math.max(0, 7 - wall) ** 2 * .045;
      }
      for (const { e } of nearby) cost += 7 / Math.max(2, Math.hypot(e.x - p.x, e.y - p.y) - e.radius);
      const nearest = nearby[0];
      if (nearest) {
        const reach = Math.min(...model.profiles.map(p => p.speed * p.lifetime));
        const distance = Math.hypot(nearest.e.x - p.x, nearest.e.y - p.y);
        cost += Math.max(0, distance - Math.min(23, reach * .65)) * .12;
      }
      cost += (p.x ** 2 / model.width ** 2 + p.y ** 2 / model.height ** 2) * 1.5;
      cost -= (move.x * this.previous.x + move.y * this.previous.y) * .2;
      if (cost < best.score) best = { move, score: cost, danger };
    }
    return best;
  }
}
