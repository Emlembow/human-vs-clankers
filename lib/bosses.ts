export type RegularBossId =
  | 'brood-apa'
  | 'accel-rex'
  | 'camp-breaker'
  | 'sky-leviathan'
  | 'open-raider'
  | 'pierce-skitter'
  | 'lock-wraith'
  | 'ember-hide'
  | 'trample-stego';

export type BossId = RegularBossId | 'jelly-prince';

export type Boss = {
  id: number;
  kind: BossId;
  x: number; y: number; vx: number; vy: number; angle: number;
  age: number;
  radius: number;
  hp: number; maxHp: number;
  burn: number; burnTime: number; slow: number; slowTime: number; flash: number;
  speedFactor: number;
  phaseClock: number;
  chargeTimer: number;
  stillClock: number;
  easterEgg: boolean;
  revealed: boolean;
  chargeX: number;
  chargeY: number;
  burnImmune: number;
  orbitSign: number;
  headingX: number;
  headingY: number;
  secondContact: number;
  hopOffset: number;
  noiseClock: number;
  blinkClock: number;
  blinkPop: number;
};

export type ChestPickup = { x: number; y: number; radius: number; age: number };

export type BossSpec = {
  radius: number;
  visualMult: number;
  speedMult: number;
  color: string;
  fallback: 'capsule' | 'box';
};

export type BossStepWorld = {
  dt: number;
  player: { x: number; y: number; vx: number; vy: number };
  width: number;
  height: number;
  wave: number;
  speedBonus: number;
  pursuitResponse: number;
  interceptTime: number;
  enemyCount: number;
  maxEnemies: number;
  random: () => number;
  spawnMinion: (kind: 'drifter' | 'chaser' | 'spinner') => void;
};

export type BossStepResult = { shed?: boolean; blink?: boolean };

export const BOSS_VISUAL_BASE = 2.75;
export const EASTER_EGG_CHANCE = 0.01;
export const BOSS_INTRO = 1.2;
export const BOSS_HP_MULT = 400;
export const EGG_HP_MULT = 280;
export const CHEST_MESH_URL = '/assets/drops/survival-chest.glb';
export const REGULAR_BOSS_IDS: readonly RegularBossId[] = [
  'brood-apa', 'accel-rex', 'camp-breaker', 'sky-leviathan',
  'open-raider', 'pierce-skitter', 'lock-wraith', 'ember-hide', 'trample-stego',
];

const clamp = (x: number, low: number, high: number) => Math.max(low, Math.min(high, x));
const normal = (x: number, y: number) => {
  const n = Math.hypot(x, y);
  return n > .0001 ? { x: x / n, y: y / n } : { x: 0, y: 0 };
};

export function pickBossKind(random: () => number, seenRegulars: Set<RegularBossId>): BossId {
  if (random() < EASTER_EGG_CHANCE) return 'jelly-prince';
  const unseen = REGULAR_BOSS_IDS.filter(id => !seenRegulars.has(id));
  const bag = unseen.length > 0 ? unseen : REGULAR_BOSS_IDS;
  return bag[Math.floor(random() * bag.length)];
}

export function isRegularBossId(kind: BossId): kind is RegularBossId {
  return kind !== 'jelly-prince';
}

export function isBossId(value: string): value is BossId {
  return value === 'jelly-prince' || (REGULAR_BOSS_IDS as readonly string[]).includes(value);
}

export function bossDisplayName(kind: BossId): string {
  switch (kind) {
    case 'brood-apa': return 'Foundry Walker';
    case 'accel-rex': return 'Rampage Chassis';
    case 'camp-breaker': return 'Yardbreaker';
    case 'sky-leviathan': return 'Sky Leviathan';
    case 'open-raider': return 'Open-Field Raider';
    case 'pierce-skitter': return 'Phase Crawler';
    case 'lock-wraith': return 'Lock Drone';
    case 'ember-hide': return 'Ember Furnace';
    case 'trample-stego': return 'Plate Hauler';
    case 'jelly-prince': return 'Jelly Prince';
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

export function bossSpec(kind: BossId): BossSpec {
  switch (kind) {
    case 'brood-apa': return { radius: 5.4, visualMult: 4.6, speedMult: .32, color: '#6a7a88', fallback: 'capsule' };
    case 'accel-rex': return { radius: 4.6, visualMult: 4.4, speedMult: .48, color: '#c45a3a', fallback: 'capsule' };
    case 'camp-breaker': return { radius: 4.2, visualMult: 3.6, speedMult: .4, color: '#6a7a88', fallback: 'box' };
    case 'sky-leviathan': return { radius: 3.2, visualMult: 5.2, speedMult: .7, color: '#c4a46a', fallback: 'box' };
    case 'open-raider': return { radius: 3.8, visualMult: 3.8, speedMult: .55, color: '#4a6a8a', fallback: 'box' };
    case 'pierce-skitter': return { radius: 4, visualMult: 3.9, speedMult: 0, color: '#7a5a8a', fallback: 'capsule' };
    case 'lock-wraith': return { radius: 3.6, visualMult: 4, speedMult: .72, color: '#3d5a6a', fallback: 'capsule' };
    case 'ember-hide': return { radius: 4.4, visualMult: 4.2, speedMult: .44, color: '#b85a2a', fallback: 'capsule' };
    case 'trample-stego': return { radius: 5.2, visualMult: 4.3, speedMult: .42, color: '#8a7a4a', fallback: 'capsule' };
    case 'jelly-prince': return { radius: 3.4, visualMult: 3.7, speedMult: .38, color: '#f48fb1', fallback: 'capsule' };
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

export function bossVisualHeight(kind: BossId): number {
  return BOSS_VISUAL_BASE * bossSpec(kind).visualMult;
}

export function bossMeshUrl(kind: BossId): string {
  return `/assets/bosses/${kind}.glb`;
}

export function bossKnockbackResist(radius: number): number {
  return clamp(1.05 / radius, .12, .28);
}

export function createBoss(kind: BossId, id: number, x: number, y: number, health: number, headingX: number, headingY: number): Boss {
  const spec = bossSpec(kind);
  const easterEgg = kind === 'jelly-prince';
  const maxHp = Math.round(health * (easterEgg ? EGG_HP_MULT : BOSS_HP_MULT));
  const dir = normal(headingX, headingY);
  return {
    id, kind, x, y, vx: dir.x, vy: dir.y, angle: Math.atan2(dir.y, dir.x), age: 0, radius: spec.radius,
    hp: maxHp, maxHp, burn: 0, burnTime: 0, slow: 0, slowTime: 0, flash: 0, speedFactor: 0, phaseClock: 0,
    chargeTimer: 0, stillClock: 0, easterEgg, revealed: false, chargeX: x, chargeY: y, burnImmune: 0,
    orbitSign: 1, headingX: dir.x, headingY: dir.y, secondContact: 0, hopOffset: 0, noiseClock: 0,
    blinkClock: 0, blinkPop: 0,
  };
}

function slowMul(boss: Boss): number {
  return boss.slowTime > 0 ? 1 - boss.slow : 1;
}

function bounceWalls(boss: Boss, width: number, height: number) {
  const limX = width / 2 - 1.6, limY = height / 2 - 1.6;
  if (Math.abs(boss.x) > limX) { boss.x = Math.sign(boss.x) * limX; boss.vx *= -1; }
  if (Math.abs(boss.y) > limY) { boss.y = Math.sign(boss.y) * limY; boss.vy *= -1; }
}

function integrate(boss: Boss, speed: number, dt: number, width: number, height: number) {
  boss.x += boss.vx * speed * dt;
  boss.y += boss.vy * speed * dt;
  bounceWalls(boss, width, height);
  const n = Math.hypot(boss.vx, boss.vy);
  if (n > .0001) boss.angle = Math.atan2(boss.vy, boss.vx);
}

function steerToward(boss: Boss, tx: number, ty: number, dt: number, pursuitResponse: number) {
  const aim = normal(tx - boss.x, ty - boss.y);
  const response = 1 - Math.exp(-pursuitResponse * dt);
  boss.vx += (aim.x - boss.vx) * response;
  boss.vy += (aim.y - boss.vy) * response;
}

function chaserTarget(boss: Boss, world: BossStepWorld, interceptScale = 1) {
  return {
    x: world.player.x + world.player.vx * world.interceptTime * interceptScale,
    y: world.player.y + world.player.vy * world.interceptTime * interceptScale,
  };
}

function clampInBounds(boss: Boss, width: number, height: number) {
  const limX = width / 2 - Math.max(1.6, boss.radius);
  const limY = height / 2 - Math.max(1.6, boss.radius);
  boss.x = clamp(boss.x, -limX, limX);
  boss.y = clamp(boss.y, -limY, limY);
}

function rememberHeading(boss: Boss, world: BossStepWorld) {
  const speed = Math.hypot(world.player.vx, world.player.vy);
  if (speed > 3) {
    boss.headingX = world.player.vx / speed;
    boss.headingY = world.player.vy / speed;
  }
}

function stepBroodApa(boss: Boss, world: BossStepWorld) {
  const target = chaserTarget(boss, world);
  steerToward(boss, target.x, target.y, world.dt, world.pursuitResponse);
  integrate(boss, (6 + world.speedBonus) * .32 * slowMul(boss), world.dt, world.width, world.height);
  boss.phaseClock += world.dt;
  if (boss.phaseClock < 4.5) return;
  boss.phaseClock = 0;
  let live = world.enemyCount;
  if (live >= 20 || live >= world.maxEnemies) return;
  const pulseCount = Math.min(8, 4 + Math.floor((world.wave - 5) / 5));
  for (let i = 0; i < pulseCount && live < 20 && live < world.maxEnemies; i++) {
    const roll = world.random();
    world.spawnMinion(roll < .5 ? 'drifter' : roll < .85 ? 'chaser' : 'spinner');
    live++;
  }
}

function stepAccelRex(boss: Boss, world: BossStepWorld) {
  boss.speedFactor = clamp((boss.age - BOSS_INTRO) / 50, 0, 1);
  const start = (6 + world.speedBonus) * .48;
  const cap = 22 * .82;
  const speed = (start + (cap - start) * boss.speedFactor) * slowMul(boss);
  const target = chaserTarget(boss, world);
  steerToward(boss, target.x, target.y, world.dt, world.pursuitResponse);
  integrate(boss, speed, world.dt, world.width, world.height);
}

function stepCampBreaker(boss: Boss, world: BossStepWorld) {
  const playerSpeed = Math.hypot(world.player.vx, world.player.vy);
  if (boss.chargeTimer > 0) {
    boss.chargeTimer = Math.max(0, boss.chargeTimer - world.dt);
    const aim = normal(boss.chargeX - boss.x, boss.chargeY - boss.y);
    boss.vx = aim.x; boss.vy = aim.y;
    integrate(boss, 2.4 * (6 + world.speedBonus) * .4 * slowMul(boss), world.dt, world.width, world.height);
    if (boss.chargeTimer <= 0) boss.phaseClock = 2;
    return;
  }
  if (boss.phaseClock > 0) boss.phaseClock = Math.max(0, boss.phaseClock - world.dt);
  if (playerSpeed <= 3) boss.stillClock += world.dt;
  else boss.stillClock = 0;
  if (boss.stillClock >= 1.1 && boss.phaseClock <= 0) {
    boss.stillClock = 0;
    boss.chargeTimer = .9;
    boss.chargeX = world.player.x;
    boss.chargeY = world.player.y;
    return;
  }
  const target = chaserTarget(boss, world);
  steerToward(boss, target.x, target.y, world.dt, world.pursuitResponse);
  integrate(boss, (6 + world.speedBonus) * .4 * slowMul(boss), world.dt, world.width, world.height);
}

function stepSkyLeviathan(boss: Boss, world: BossStepWorld) {
  const away = normal(boss.x - world.player.x, boss.y - world.player.y);
  const distance = Math.hypot(boss.x - world.player.x, boss.y - world.player.y);
  const speed = (6 + world.speedBonus) * .7 * slowMul(boss);
  if (distance < 14) {
    boss.vx = away.x; boss.vy = away.y;
  } else if (distance > 18) {
    boss.vx = -away.x; boss.vy = -away.y;
  } else {
    boss.angle += .55 * world.dt;
    boss.vx = -away.y; boss.vy = away.x;
  }
  integrate(boss, speed, world.dt, world.width, world.height);
}

function stepOpenRaider(boss: Boss, world: BossStepWorld) {
  const target = chaserTarget(boss, world);
  steerToward(boss, target.x, target.y, world.dt, world.pursuitResponse);
  const innerX = .55 * (world.width / 2), innerY = .55 * (world.height / 2);
  if (Math.abs(boss.x) > innerX || Math.abs(boss.y) > innerY) {
    const center = normal(-boss.x, -boss.y);
    boss.vx += center.x * 2.4;
    boss.vy += center.y * 2.4;
  }
  if (Math.abs(boss.x) > innerX && Math.sign(boss.vx) === Math.sign(boss.x)) boss.vx = 0;
  if (Math.abs(boss.y) > innerY && Math.sign(boss.vy) === Math.sign(boss.y)) boss.vy = 0;
  integrate(boss, (6 + world.speedBonus) * .55 * slowMul(boss), world.dt, world.width, world.height);
}

function stepPierceSkitter(boss: Boss, world: BossStepWorld) {
  boss.phaseClock += world.dt;
  if (boss.phaseClock >= 6) { boss.phaseClock = 0; boss.orbitSign *= -1; }
  const radius = 7.5 + Math.sin(boss.age * 1.7) * 1.2;
  boss.angle += 1.4 * boss.orbitSign * world.dt;
  const x = world.player.x + Math.cos(boss.angle) * radius;
  const y = world.player.y + Math.sin(boss.angle) * radius;
  const limX = world.width / 2 - 1.6, limY = world.height / 2 - 1.6;
  boss.vx = x - boss.x; boss.vy = y - boss.y;
  boss.x = clamp(x, -limX, limX);
  boss.y = clamp(y, -limY, limY);
  boss.angle = Math.atan2(boss.vy, boss.vx) || boss.angle;
}

function stepLockWraith(boss: Boss, world: BossStepWorld, result: BossStepResult) {
  const speed = .72 * (9 + world.speedBonus) * slowMul(boss);
  boss.noiseClock += world.dt;
  if (boss.noiseClock >= .55) {
    boss.noiseClock = 0;
    boss.angle += (world.random() * 2 - 1) * .9;
  }
  boss.angle += (speed / 5.5) * world.dt;
  const x = world.player.x + Math.cos(boss.angle) * 5.5;
  const y = world.player.y + Math.sin(boss.angle) * 5.5;
  boss.vx = x - boss.x; boss.vy = y - boss.y;
  boss.x = x; boss.y = y;
  bounceWalls(boss, world.width, world.height);
  boss.blinkClock += world.dt;
  if (boss.blinkClock >= 3) {
    boss.blinkClock = 0;
    const heading = normal(boss.vx, boss.vy);
    const side = world.random() < .5 ? 1 : -1;
    boss.x += -heading.y * 6 * side;
    boss.y += heading.x * 6 * side;
    clampInBounds(boss, world.width, world.height);
    boss.blinkPop = .18;
    result.blink = true;
  }
}

function stepEmberHide(boss: Boss, world: BossStepWorld, result: BossStepResult) {
  const target = chaserTarget(boss, world);
  steerToward(boss, target.x, target.y, world.dt, world.pursuitResponse);
  integrate(boss, (6 + world.speedBonus) * .44 * slowMul(boss), world.dt, world.width, world.height);
  boss.phaseClock += world.dt;
  if (boss.phaseClock >= 3.2) {
    boss.phaseClock = 0;
    boss.burn = 0;
    boss.burnTime = 0;
    boss.burnImmune = .7;
    result.shed = true;
  }
}

function stepTrampleStego(boss: Boss, world: BossStepWorld) {
  rememberHeading(boss, world);
  if (boss.chargeTimer > 0) {
    boss.chargeTimer = Math.max(0, boss.chargeTimer - world.dt);
    const playerSpeed = Math.hypot(world.player.vx, world.player.vy);
    let hx = boss.headingX, hy = boss.headingY;
    if (playerSpeed > 3) { hx = world.player.vx / playerSpeed; hy = world.player.vy / playerSpeed; }
    else if (Math.hypot(hx, hy) < .1) {
      const toward = normal(world.player.x - boss.x, world.player.y - boss.y);
      hx = toward.x; hy = toward.y;
    }
    boss.vx = hx; boss.vy = hy;
    integrate(boss, 2.1 * (6 + world.speedBonus) * .42 * slowMul(boss), world.dt, world.width, world.height);
    return;
  }
  boss.phaseClock += world.dt;
  if (boss.phaseClock >= 6) {
    boss.phaseClock = 0;
    boss.chargeTimer = 1.1;
    return;
  }
  const target = chaserTarget(boss, world, 1.8);
  steerToward(boss, target.x, target.y, world.dt, world.pursuitResponse);
  integrate(boss, (6 + world.speedBonus) * .42 * slowMul(boss), world.dt, world.width, world.height);
}

function stepJellyPrince(boss: Boss, world: BossStepWorld) {
  const target = chaserTarget(boss, world);
  steerToward(boss, target.x, target.y, world.dt, world.pursuitResponse);
  integrate(boss, (6 + world.speedBonus) * .38 * slowMul(boss), world.dt, world.width, world.height);
  boss.phaseClock += world.dt;
  if (boss.phaseClock >= 5) {
    boss.phaseClock = 0;
    boss.chargeTimer = .35;
  }
  if (boss.chargeTimer > 0) {
    boss.chargeTimer = Math.max(0, boss.chargeTimer - world.dt);
    const t = 1 - boss.chargeTimer / .35;
    boss.hopOffset = Math.sin(clamp(t, 0, 1) * Math.PI) * 2;
    const hop = normal(boss.vx, boss.vy);
    boss.x += hop.x * boss.hopOffset * world.dt * 6;
    boss.y += hop.y * boss.hopOffset * world.dt * 6;
    bounceWalls(boss, world.width, world.height);
  } else boss.hopOffset = 0;
}

export function stepBoss(boss: Boss, world: BossStepWorld): BossStepResult {
  const result: BossStepResult = {};
  if (boss.blinkPop > 0) boss.blinkPop = Math.max(0, boss.blinkPop - world.dt);
  if (boss.age < BOSS_INTRO) return result;
  switch (boss.kind) {
    case 'brood-apa': stepBroodApa(boss, world); break;
    case 'accel-rex': stepAccelRex(boss, world); break;
    case 'camp-breaker': stepCampBreaker(boss, world); break;
    case 'sky-leviathan': stepSkyLeviathan(boss, world); break;
    case 'open-raider': stepOpenRaider(boss, world); break;
    case 'pierce-skitter': stepPierceSkitter(boss, world); break;
    case 'lock-wraith': stepLockWraith(boss, world, result); break;
    case 'ember-hide': stepEmberHide(boss, world, result); break;
    case 'trample-stego': stepTrampleStego(boss, world); break;
    case 'jelly-prince': stepJellyPrince(boss, world); break;
    default: {
      const _never: never = boss.kind;
      void _never;
    }
  }
  return result;
}
