export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type Rarity = typeof RARITIES[number];
export const RARITY_COLOR: Record<Rarity, string> = { common: '#bac6cd', uncommon: '#9ef3b2', rare: '#60c9ff', epic: '#bf91ff', legendary: '#ffcf72' };
export const RARITY_POWER: Record<Rarity, number> = { common: 1, uncommon: 1.25, rare: 1.6, epic: 2.1, legendary: 2.8 };
export const WEAPON_QUALITY: Record<Rarity, number> = { common: 1, uncommon: 1.12, rare: 1.3, epic: 1.55, legendary: 1.9 };
export type WeaponId = 'needle' | 'repeater' | 'trident' | 'scatter' | 'rail' | 'seeker' | 'ricochet' | 'nova' | 'flame' | 'tesla' | 'mortar';
export type WeaponDef = { id: WeaponId; name: string; tagline: string; description: string; color: string; interval: number; damage: number; speed: number; pellets: number; spread: number; lifetime: number; radius: number; pierce?: number; bounces?: number; homing?: number; blast?: number; chain?: number; burn?: number };
export const STARTER: WeaponDef = { id: 'needle', name: 'Needle', tagline: 'SINGLE STREAM', description: 'Single, precise stream.', color: '#a4ffcc', interval: .105, damage: 1, speed: 85, pellets: 1, spread: 0, lifetime: 1.7, radius: .22 };
export const WEAPONS: WeaponDef[] = [
  { id: 'repeater', name: 'Pulse Repeater', tagline: 'RAPID FIRE', description: 'Fast, accurate single stream.', color: '#a4ffcc', interval: .058, damage: 1.26, speed: 95, pellets: 1, spread: 0, lifetime: 1.6, radius: .22 },
  { id: 'trident', name: 'Trident', tagline: 'TRIPLE SHOT', description: 'Three projectiles in a narrow spread.', color: '#5fe7ff', interval: .16, damage: 1.38, speed: 82, pellets: 3, spread: .22, lifetime: 1.65, radius: .24 },
  { id: 'scatter', name: 'Scatter Cannon', tagline: 'SHOTGUN', description: 'Seven pellets in a wide, short-range cone.', color: '#ffc67d', interval: .43, damage: 1.5, speed: 72, pellets: 7, spread: .85, lifetime: .43, radius: .34 },
  { id: 'rail', name: 'Rail Lance', tagline: 'PIERCING', description: 'Heavy slugs hit up to six enemies in a line.', color: '#e1c4ff', interval: .4, damage: 5.76, speed: 175, pellets: 1, spread: 0, lifetime: 1, radius: .36, pierce: 5 },
  { id: 'seeker', name: 'Seeker Array', tagline: 'HOMING', description: 'Two guided missiles track nearby enemies.', color: '#f895da', interval: .27, damage: 2.22, speed: 47, pellets: 2, spread: .3, lifetime: 2.4, radius: .36, homing: 5 },
  { id: 'ricochet', name: 'Prism Driver', tagline: 'RICOCHET', description: 'Twin bolts. Three wall bounces; hit two enemies each.', color: '#90acff', interval: .23, damage: 2.04, speed: 67, pellets: 2, spread: .22, lifetime: 2.8, radius: .28, bounces: 3, pierce: 1 },
  { id: 'nova', name: 'Nova Ring', tagline: '360° BURST', description: 'Twelve projectiles fire in a full circle.', color: '#ff9eaa', interval: .65, damage: 1.98, speed: 48, pellets: 12, spread: Math.PI * 2, lifetime: 1, radius: .3 },
  { id: 'flame', name: 'Cinder Jet', tagline: 'BURN', description: 'Short-range flame. Hits up to three enemies; burns for 3 seconds.', color: '#ff9c59', interval: .075, damage: .504, speed: 45, pellets: 3, spread: .42, lifetime: .34, radius: .55, pierce: 2, burn: 1.08 },
  { id: 'tesla', name: 'Arc Emitter', tagline: 'CHAIN LIGHTNING', description: 'Bolts chain to three more enemies; 65% damage per hop.', color: '#96edff', interval: .29, damage: 2.28, speed: 120, pellets: 1, spread: 0, lifetime: .8, radius: .27, chain: 3 },
  { id: 'mortar', name: 'Sunburst Mortar', tagline: 'EXPLOSIVE', description: 'Slow shells explode on impact or at range; 65% area damage.', color: '#ffe18a', interval: .48, damage: 4.32, speed: 42, pellets: 1, spread: 0, lifetime: 1.1, radius: .65, blast: 5.5 },
];
export const getWeapon = (id: WeaponId) => id === 'needle' ? STARTER : WEAPONS.find(w => w.id === id)!;
export const MAX_WEAPON_LEVEL = 8;
export type WeaponState = { id: WeaponId; level: number; rarity: Rarity };
export type Stat = 'damage' | 'fireRate' | 'speed' | 'projectileSpeed' | 'size' | 'crit' | 'critDamage' | 'pierce' | 'bounces' | 'homing' | 'blast' | 'chain' | 'burn' | 'slow' | 'knockback' | 'grace' | 'shieldRegen' | 'luck' | 'score' | 'orbitals' | 'vampiric' | 'shieldDamage' | 'berserk' | 'movingDamage' | 'stationaryRate' | 'rebound' | 'execute' | 'thorns' | 'dodge' | 'bombRegen';
export type RunStats = Record<Stat, number>;
export const emptyStats = (): RunStats => ({ damage: 0, fireRate: 0, speed: 0, projectileSpeed: 0, size: 0, crit: 0, critDamage: 0, pierce: 0, bounces: 0, homing: 0, blast: 0, chain: 0, burn: 0, slow: 0, knockback: 0, grace: 0, shieldRegen: 0, luck: 0, score: 0, orbitals: 0, vampiric: 0, shieldDamage: 0, berserk: 0, movingDamage: 0, stationaryRate: 0, rebound: 0, execute: 0, thorns: 0, dodge: 0, bombRegen: 0 });
export type RelicDef = { id: string; name: string; category: string; stat?: Stat; base: number; integer?: boolean; maxStacks: number; effect?: 'lives' | 'shields' | 'bombs' | 'rerolls' | 'glass'; describe: (v: number) => string };
const pct = (v: number) => `${Number((v * 100).toFixed(2))}%`;
const num = (v: number) => Number(v.toFixed(2));
export const RELICS: RelicDef[] = [
  { id: 'capacitor', name: 'Overcharged Core', category: 'OFFENSE', stat: 'damage', base: .22, maxStacks: 5, describe: v => `All weapons: +${pct(v)} damage bonus.` },
  { id: 'accelerator', name: 'Hair Trigger', category: 'OFFENSE', stat: 'fireRate', base: .18, maxStacks: 5, describe: v => `All weapons: +${pct(v)} fire-rate bonus, up to the cap.` },
  { id: 'thrusters', name: 'Afterburners', category: 'MOBILITY', stat: 'speed', base: .1, maxStacks: 4, describe: v => `+${pct(v)} movement-speed bonus. +75% maximum.` },
  { id: 'ballistics', name: 'Hypervelocity', category: 'PROJECTILE', stat: 'projectileSpeed', base: .2, maxStacks: 3, describe: v => `+${pct(v)} projectile-speed and range bonus. +120% maximum.` },
  { id: 'mass', name: 'Heavy Caliber', category: 'PROJECTILE', stat: 'size', base: .3, maxStacks: 3, describe: v => `+${pct(v)} projectile-size bonus. +200% maximum.` },
  { id: 'precision', name: 'Dead Reckoning', category: 'CRITICAL', stat: 'crit', base: .08, maxStacks: 4, describe: v => `+${pct(v)} critical chance. Base critical damage: 2×. Chance caps at 75%.` },
  { id: 'rupture', name: 'Rupture Lens', category: 'CRITICAL', stat: 'critDamage', base: .5, maxStacks: 3, describe: v => `+${pct(v)} critical-damage bonus. Base: 200%; cap: 600%.` },
  { id: 'piercing', name: 'Phase Rounds', category: 'PROJECTILE', stat: 'pierce', base: 1, integer: true, maxStacks: 3, describe: v => `Pierce bonus: +${v} ${v === 1 ? 'enemy' : 'enemies'}. Cap: 15 before critical bonuses.` },
  { id: 'refractor', name: 'Mirror Coating', category: 'PROJECTILE', stat: 'bounces', base: 1, integer: true, maxStacks: 3, describe: v => `Wall-bounce bonus: +${v}. Each shot caps at 8 bounces.` },
  { id: 'guidance', name: 'Targeting Matrix', category: 'PROJECTILE', stat: 'homing', base: 1.6, maxStacks: 3, describe: v => `Shots track enemies. +${num(v)} homing-strength bonus.` },
  { id: 'volatile', name: 'Volatile Payload', category: 'EXPLOSIVE', stat: 'blast', base: 1.7, maxStacks: 3, describe: v => `+${num(v)} blast-radius bonus. Radius cap: 12 (15 with chain). Area hits deal 65% damage.` },
  { id: 'conductor', name: 'Storm Conductor', category: 'ELECTRIC', stat: 'chain', base: 1, integer: true, maxStacks: 3, describe: v => `Chain-hop bonus: +${v}. Cap: 7 hops; 65% damage per hop.` },
  { id: 'incendiary', name: 'Ember Rounds', category: 'FIRE', stat: 'burn', base: .65, maxStacks: 3, describe: v => `Burn bonus: +${num(v)} damage/sec for 3 seconds. Scales with weapon damage.` },
  { id: 'cryo', name: 'Cryo Chamber', category: 'FROST', stat: 'slow', base: .18, maxStacks: 3, describe: v => `+${pct(v)} hit slow for 2 seconds. 65% maximum.` },
  { id: 'repulsor', name: 'Repulsor Rounds', category: 'CONTROL', stat: 'knockback', base: 1.2, maxStacks: 3, describe: v => `+${num(v)} knockback distance. 6 maximum.` },
  { id: 'phase', name: 'Phase Memory', category: 'DEFENSE', stat: 'grace', base: .5, maxStacks: 3, describe: v => `+${num(v)} seconds of protection after losing a life.` },
  { id: 'battery', name: 'Shield Battery', category: 'SUPPLY', effect: 'shields', base: 1, integer: true, maxStacks: 999, describe: v => `+${v} ${v === 1 ? 'shield' : 'shields'} now. Each blocks one hit; 6 maximum.` },
  { id: 'aegis', name: 'Aegis Generator', category: 'DEFENSE', stat: 'shieldRegen', base: 1, integer: true, maxStacks: 2, describe: v => `Shield-regen bonus: +${v}/wave. Starts next wave; 6-shield cap.` },
  { id: 'hull', name: 'Spare Hull', category: 'SUPPLY', effect: 'lives', base: 1, integer: true, maxStacks: 999, describe: v => `+${v} ${v === 1 ? 'life' : 'lives'}. 9 maximum.` },
  { id: 'munitions', name: 'Emergency Ordnance', category: 'SUPPLY', effect: 'bombs', base: 1, integer: true, maxStacks: 999, describe: v => `+${v} arena-clearing ${v === 1 ? 'bomb' : 'bombs'}. 9 maximum.` },
  { id: 'reroll', name: 'Second Opinion', category: 'SUPPLY', effect: 'rerolls', base: 1, integer: true, maxStacks: 999, describe: v => `+${v} ${v === 1 ? 'reroll' : 'rerolls'} for this run.` },
  { id: 'fortune', name: 'Lucky Circuit', category: 'FORTUNE', stat: 'luck', base: .06, maxStacks: 3, describe: v => `+${pct(v)} rarity-roll bonus. Shares a 25% cap with wave bonuses.` },
  { id: 'salvage', name: 'Bounty Protocol', category: 'SCORE', stat: 'score', base: .3, maxStacks: 3, describe: v => `+${pct(v)} kill-score bonus.` },
  { id: 'reactor', name: 'Ordnance Reactor', category: 'SUPPLY', stat: 'bombRegen', base: .25, maxStacks: 2, describe: v => `+${num(v)} bombs per cleared wave. Fractions carry over; 9-bomb cap.` },
  { id: 'satellite', name: 'Guardian Satellites', category: 'ORBITAL', stat: 'orbitals', base: 1, integer: true, maxStacks: 3, describe: v => `+${v} orbiting attack ${v === 1 ? 'drone' : 'drones'}. 6 maximum.` },
  { id: 'vampire', name: 'Soul Circuit', category: 'DEFENSE', stat: 'vampiric', base: 1, integer: true, maxStacks: 2, describe: v => `Shield-recovery bonus: +${v} per 50 kills. 6-shield cap.` },
  { id: 'fortress', name: 'Fortress Protocol', category: 'SYNERGY', stat: 'shieldDamage', base: .3, maxStacks: 3, describe: v => `All weapons: +${pct(v)} damage bonus while shielded.` },
  { id: 'berserk', name: 'Last Stand', category: 'SYNERGY', stat: 'berserk', base: .6, maxStacks: 2, describe: v => `All weapons: +${pct(v)} damage bonus on your last life.` },
  { id: 'kinetic', name: 'Kinetic Dynamo', category: 'SYNERGY', stat: 'movingDamage', base: .25, maxStacks: 3, describe: v => `All weapons: +${pct(v)} damage bonus while moving.` },
  { id: 'anchor', name: 'Siege Stance', category: 'SYNERGY', stat: 'stationaryRate', base: .35, maxStacks: 3, describe: v => `All weapons: +${pct(v)} fire-rate bonus while still, up to the cap.` },
  { id: 'rebound', name: 'Rebound Amplifier', category: 'SYNERGY', stat: 'rebound', base: .35, maxStacks: 3, describe: v => `+${pct(v)} bounce-damage bonus on the first 3 bounces. Requires ricochets.` },
  { id: 'execution', name: 'Execution Order', category: 'OFFENSE', stat: 'execute', base: .08, maxStacks: 3, describe: v => `+${pct(v)} execution threshold. Hits finish enemies below it; 35% maximum.` },
  { id: 'thorns', name: 'Revenge Pulse', category: 'DEFENSE', stat: 'thorns', base: 4, maxStacks: 3, describe: v => `+${num(v)} retaliation damage when hit. Radius: 8.` },
  { id: 'glass', name: 'Glass Reactor', category: 'PACT', effect: 'glass', base: .65, maxStacks: 2, describe: v => `All weapons: +${pct(v)} damage bonus. Lose 1 life now.` },
  { id: 'guardian', name: 'Quantum Evasion', category: 'DEFENSE', stat: 'dodge', base: .08, maxStacks: 3, describe: v => `+${pct(v)} chance to dodge a hit. 40% maximum.` },
  { id: 'fusillade', name: 'Combat Package', category: 'OFFENSE', stat: 'damage', base: .16, maxStacks: 3, describe: v => `All weapons: +${pct(v)} damage bonus; +${pct(v / 2)} fire-rate bonus, up to the cap.` },
];
export const relicValue = (def: RelicDef, rarity: Rarity) => def.integer ? Math.max(1, Math.floor(def.base * RARITY_POWER[rarity])) : Number((def.base * RARITY_POWER[rarity]).toFixed(3));
export type RewardChange = { label: string; before: string; after: string };
export type Reward = { id: string; key: string; type: 'weapon' | 'upgrade' | 'relic'; name: string; rarity: Rarity; category: string; description: string; weaponId?: WeaponId; relicId?: string; amount: number; changes?: RewardChange[]; comparisonNote?: string };
export type OwnedRelic = { id: string; name: string; rarity: Rarity; description: string };
export type WeaponProfile = WeaponDef & { level: number; rarity: Rarity; crit: number; critDamage: number; slow: number; knockback: number; rebound: number; execute: number; synergies: string[] };
export function weaponProfile(weapon: WeaponState, stats: RunStats, context: { moving?: boolean; shields?: number; lives?: number } = {}): WeaponProfile {
  const base = getWeapon(weapon.id), level = weapon.level - 1;
  const power = WEAPON_QUALITY[weapon.rarity] * (1 + level * .22) * (1 + stats.damage + (context.moving ? stats.movingDamage : 0) + ((context.shields ?? 0) > 0 ? stats.shieldDamage : 0) + (context.lives === 1 ? stats.berserk : 0));
  const chain = Math.min(7, (base.chain ?? 0) + stats.chain), blast = Math.min(12, (base.blast ?? 0) + stats.blast);
  const burn = (base.burn ?? 0) + stats.burn, slow = Math.min(.65, stats.slow), homing = (base.homing ?? 0) + stats.homing, bounces = Math.min(8, (base.bounces ?? 0) + stats.bounces), pierce = Math.min(15, (base.pierce ?? 0) + stats.pierce), crit = Math.min(.75, stats.crit);
  const synergies: string[] = [];
  if (burn > 0 && slow > 0) synergies.push('Thermal Shock');
  if (chain > 0 && blast > 0) synergies.push('Thunderstorm');
  if (crit >= .15 && pierce > 0) synergies.push('Deadeye');
  if (homing > 0 && bounces > 0) synergies.push('Predator');
  if (stats.shieldRegen > 0 && stats.shieldDamage > 0) synergies.push('Fortress');
  return { ...base, level: weapon.level, rarity: weapon.rarity, damage: base.damage * power, interval: Math.max(.035, base.interval / (1 + level * .065 + stats.fireRate + (!context.moving ? stats.stationaryRate : 0))), speed: base.speed * (1 + Math.min(1.2, stats.projectileSpeed)), radius: base.radius * (1 + Math.min(2, stats.size)), pellets: base.pellets + (base.pellets > 1 ? Math.floor(level / 3) * (base.id === 'nova' ? 2 : 1) : 0), pierce, bounces, homing, blast: blast * (chain > 0 && blast > 0 ? 1.25 : 1), chain, burn: burn * power, slow, crit, critDamage: 2 + stats.critDamage, knockback: Math.min(6, stats.knockback), rebound: stats.rebound, execute: Math.min(.35, stats.execute), synergies };
}
export function upgradedWeapon(weapon: WeaponState, amount: number, rarity: Rarity): WeaponState {
  return { ...weapon, level: Math.min(MAX_WEAPON_LEVEL, weapon.level + amount), rarity: RARITIES[Math.max(RARITIES.indexOf(weapon.rarity), RARITIES.indexOf(rarity))] };
}

// Reward comparisons include permanent relics. Conditional bonuses are excluded
// from both sides so stopping to choose a reward cannot inflate its benefit.
export function weaponUpgradePreview(weapon: WeaponState, stats: RunStats, amount: number, rarity: Rarity): Pick<Reward, 'name' | 'description' | 'changes' | 'comparisonNote'> {
  const next = upgradedWeapon(weapon, amount, rarity);
  const comparisonStats = { ...stats, movingDamage: 0, shieldDamage: 0, berserk: 0, stationaryRate: 0 };
  const before = weaponProfile(weapon, comparisonStats), after = weaponProfile(next, comparisonStats);
  const changes: RewardChange[] = [];
  const add = (label: string, previous: number, value: number) => {
    const before = String(num(previous)), after = String(num(value));
    if (Math.abs(value - previous) > 1e-9 && before !== after) changes.push({ label, before, after });
  };
  add('Damage / hit', before.damage, after.damage);
  add(before.pellets > 1 ? 'Volleys / sec' : 'Shots / sec', 1 / before.interval, 1 / after.interval);
  add('Projectiles / volley', before.pellets, after.pellets);
  add('Burn / sec', before.burn ?? 0, after.burn ?? 0);
  const qualityName = (value: Rarity) => value[0].toUpperCase() + value.slice(1);
  return {
    name: `${before.name} · Lv. ${weapon.level}${next.level !== weapon.level ? ` → ${next.level}` : ''}`,
    description: next.rarity !== weapon.rarity ? `${qualityName(weapon.rarity)} → ${qualityName(next.rarity)}` : '',
    changes,
    ...(stats.movingDamage || stats.shieldDamage || stats.berserk || stats.stationaryRate ? { comparisonNote: 'Before conditional bonuses' } : {}),
  };
}
export function rollRarity(random: () => number, wave: number, luck: number): Rarity {
  const roll = Math.min(.999, random() + Math.min(.25, (wave - 1) * .006 + luck));
  return roll < .35 ? 'common' : roll < .67 ? 'uncommon' : roll < .88 ? 'rare' : roll < .98 ? 'epic' : 'legendary';
}
