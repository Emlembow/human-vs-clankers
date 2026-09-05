export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type Rarity = typeof RARITIES[number];
export const RARITY_COLOR: Record<Rarity, string> = { common: '#bac6cd', uncommon: '#9ef3b2', rare: '#60c9ff', epic: '#bf91ff', legendary: '#ffcf72' };
export const RARITY_POWER: Record<Rarity, number> = { common: 1, uncommon: 1.25, rare: 1.6, epic: 2.1, legendary: 2.8 };
export const WEAPON_QUALITY: Record<Rarity, number> = { common: 1, uncommon: 1.12, rare: 1.3, epic: 1.55, legendary: 1.9 };
export type WeaponId = 'needle' | 'repeater' | 'trident' | 'scatter' | 'rail' | 'seeker' | 'ricochet' | 'nova' | 'flame' | 'tesla' | 'mortar';
export type WeaponDef = { id: WeaponId; name: string; tagline: string; description: string; color: string; interval: number; damage: number; speed: number; pellets: number; spread: number; lifetime: number; radius: number; pierce?: number; bounces?: number; homing?: number; blast?: number; chain?: number; burn?: number };
export const STARTER: WeaponDef = { id: 'needle', name: 'Needle', tagline: 'SINGLE STREAM', description: 'A precise, single stream of shots. No automatic evolutions.', color: '#a4ffcc', interval: .105, damage: 1, speed: 85, pellets: 1, spread: 0, lifetime: 1.7, radius: .22 };
export const WEAPONS: WeaponDef[] = [
  { id: 'repeater', name: 'Pulse Repeater', tagline: 'RAPID FIRE', description: 'A relentless single stream. High fire rate, precise aim, excellent with on-hit effects.', color: '#a4ffcc', interval: .058, damage: 1.05, speed: 95, pellets: 1, spread: 0, lifetime: 1.6, radius: .22 },
  { id: 'trident', name: 'Trident', tagline: 'TRIPLE SHOT', description: 'Three parallel lanes of fire. Cover a wider front without sacrificing range.', color: '#5fe7ff', interval: .16, damage: 1.15, speed: 82, pellets: 3, spread: .22, lifetime: 1.65, radius: .24 },
  { id: 'scatter', name: 'Scatter Cannon', tagline: 'SHOTGUN', description: 'Seven heavy pellets in a wide cone. Devastating up close; limited reach.', color: '#ffc67d', interval: .43, damage: 1.25, speed: 72, pellets: 7, spread: .85, lifetime: .43, radius: .34 },
  { id: 'rail', name: 'Rail Lance', tagline: 'PIERCING', description: 'Fast, heavy slugs punch through six enemies. Line up a crowd and erase it.', color: '#e1c4ff', interval: .4, damage: 4.8, speed: 175, pellets: 1, spread: 0, lifetime: 1, radius: .36, pierce: 5 },
  { id: 'seeker', name: 'Seeker Array', tagline: 'HOMING', description: 'Two guided missiles curve toward nearby targets. Keep moving while they hunt.', color: '#f895da', interval: .27, damage: 1.85, speed: 47, pellets: 2, spread: .3, lifetime: 2.4, radius: .36, homing: 5 },
  { id: 'ricochet', name: 'Prism Driver', tagline: 'RICOCHET', description: 'Twin bolts rebound off the arena walls three times and pierce one enemy.', color: '#90acff', interval: .23, damage: 1.7, speed: 67, pellets: 2, spread: .22, lifetime: 2.8, radius: .28, bounces: 3, pierce: 1 },
  { id: 'nova', name: 'Nova Ring', tagline: '360° BURST', description: 'Twelve projectiles radiate in every direction. Surrounding you is a mistake.', color: '#ff9eaa', interval: .65, damage: 1.65, speed: 48, pellets: 12, spread: Math.PI * 2, lifetime: 1, radius: .3 },
  { id: 'flame', name: 'Cinder Jet', tagline: 'BURN', description: 'A short cone of piercing fire. Scorches enemies for damage over time.', color: '#ff9c59', interval: .075, damage: .42, speed: 45, pellets: 3, spread: .42, lifetime: .34, radius: .55, pierce: 2, burn: .9 },
  { id: 'tesla', name: 'Arc Emitter', tagline: 'CHAIN LIGHTNING', description: 'Electric bolts leap to three nearby enemies. Built to break up a swarm.', color: '#96edff', interval: .29, damage: 1.9, speed: 120, pellets: 1, spread: 0, lifetime: .8, radius: .27, chain: 3 },
  { id: 'mortar', name: 'Sunburst Mortar', tagline: 'EXPLOSIVE', description: 'Slow shells explode on impact or at maximum range, damaging a wide area.', color: '#ffe18a', interval: .48, damage: 3.6, speed: 42, pellets: 1, spread: 0, lifetime: 1.1, radius: .65, blast: 5.5 },
];
export const getWeapon = (id: WeaponId) => id === 'needle' ? STARTER : WEAPONS.find(w => w.id === id)!;
export const MAX_WEAPON_LEVEL = 8;
export type WeaponState = { id: WeaponId; level: number; rarity: Rarity };
export type Stat = 'damage' | 'fireRate' | 'speed' | 'projectileSpeed' | 'size' | 'crit' | 'critDamage' | 'pierce' | 'bounces' | 'homing' | 'blast' | 'chain' | 'burn' | 'slow' | 'knockback' | 'grace' | 'shieldRegen' | 'luck' | 'score' | 'orbitals' | 'vampiric' | 'shieldDamage' | 'berserk' | 'movingDamage' | 'stationaryRate' | 'rebound' | 'execute' | 'thorns' | 'dodge' | 'bombRegen';
export type RunStats = Record<Stat, number>;
export const emptyStats = (): RunStats => ({ damage: 0, fireRate: 0, speed: 0, projectileSpeed: 0, size: 0, crit: 0, critDamage: 0, pierce: 0, bounces: 0, homing: 0, blast: 0, chain: 0, burn: 0, slow: 0, knockback: 0, grace: 0, shieldRegen: 0, luck: 0, score: 0, orbitals: 0, vampiric: 0, shieldDamage: 0, berserk: 0, movingDamage: 0, stationaryRate: 0, rebound: 0, execute: 0, thorns: 0, dodge: 0, bombRegen: 0 });
export type RelicDef = { id: string; name: string; category: string; stat?: Stat; base: number; integer?: boolean; maxStacks: number; effect?: 'lives' | 'shields' | 'bombs' | 'rerolls' | 'glass'; describe: (v: number) => string };
const pct = (v: number) => `${Math.round(v * 100)}%`;
const num = (v: number) => Number(v.toFixed(2));
export const RELICS: RelicDef[] = [
  { id: 'capacitor', name: 'Overcharged Core', category: 'OFFENSE', stat: 'damage', base: .22, maxStacks: 5, describe: v => `+${pct(v)} weapon damage. Applies to every projectile and elemental effect.` },
  { id: 'accelerator', name: 'Hair Trigger', category: 'OFFENSE', stat: 'fireRate', base: .18, maxStacks: 5, describe: v => `+${pct(v)} fire rate. More shots, more chances to trigger your effects.` },
  { id: 'thrusters', name: 'Afterburners', category: 'MOBILITY', stat: 'speed', base: .1, maxStacks: 4, describe: v => `+${pct(v)} movement speed. Maximum total movement bonus: 75%.` },
  { id: 'ballistics', name: 'Hypervelocity', category: 'PROJECTILE', stat: 'projectileSpeed', base: .2, maxStacks: 3, describe: v => `+${pct(v)} projectile speed and range.` },
  { id: 'mass', name: 'Heavy Caliber', category: 'PROJECTILE', stat: 'size', base: .3, maxStacks: 3, describe: v => `+${pct(v)} projectile size. Hit a wider target area.` },
  { id: 'precision', name: 'Dead Reckoning', category: 'CRITICAL', stat: 'crit', base: .08, maxStacks: 4, describe: v => `+${pct(v)} critical chance. Critical hits deal double damage; chance caps at 75%.` },
  { id: 'rupture', name: 'Rupture Lens', category: 'CRITICAL', stat: 'critDamage', base: .5, maxStacks: 3, describe: v => `+${pct(v)} critical damage, added to the base 200%.` },
  { id: 'piercing', name: 'Phase Rounds', category: 'PROJECTILE', stat: 'pierce', base: 1, integer: true, maxStacks: 3, describe: v => `Shots pierce ${v} additional ${v === 1 ? 'enemy' : 'enemies'}.` },
  { id: 'refractor', name: 'Mirror Coating', category: 'PROJECTILE', stat: 'bounces', base: 1, integer: true, maxStacks: 3, describe: v => `Shots bounce off walls ${v} additional ${v === 1 ? 'time' : 'times'}.` },
  { id: 'guidance', name: 'Targeting Matrix', category: 'PROJECTILE', stat: 'homing', base: 1.6, maxStacks: 3, describe: v => `Shots curve toward enemies. +${num(v)} tracking strength.` },
  { id: 'volatile', name: 'Volatile Payload', category: 'EXPLOSIVE', stat: 'blast', base: 1.7, maxStacks: 3, describe: v => `Shots explode on impact. +${num(v)} blast radius; nearby targets take 65% damage.` },
  { id: 'conductor', name: 'Storm Conductor', category: 'ELECTRIC', stat: 'chain', base: 1, integer: true, maxStacks: 3, describe: v => `Hits arc to ${v} additional nearby ${v === 1 ? 'enemy' : 'enemies'}, at 65% damage per hop.` },
  { id: 'incendiary', name: 'Ember Rounds', category: 'FIRE', stat: 'burn', base: .65, maxStacks: 3, describe: v => `Hits burn for ${num(v)} damage per second for 3 seconds. Scales with damage bonuses.` },
  { id: 'cryo', name: 'Cryo Chamber', category: 'FROST', stat: 'slow', base: .18, maxStacks: 3, describe: v => `Hits slow enemies by ${pct(v)} for 2 seconds. Total slow caps at 65%.` },
  { id: 'repulsor', name: 'Repulsor Rounds', category: 'CONTROL', stat: 'knockback', base: 1.2, maxStacks: 3, describe: v => `Hits push enemies back ${num(v)} arena units.` },
  { id: 'phase', name: 'Phase Memory', category: 'DEFENSE', stat: 'grace', base: .5, maxStacks: 3, describe: v => `+${num(v)} seconds of protection after losing a life.` },
  { id: 'battery', name: 'Shield Battery', category: 'SUPPLY', effect: 'shields', base: 1, integer: true, maxStacks: 999, describe: v => `Gain ${v} shield ${v === 1 ? 'charge' : 'charges'} now. Each blocks one hit. Maximum 6 charges.` },
  { id: 'aegis', name: 'Aegis Generator', category: 'DEFENSE', stat: 'shieldRegen', base: 1, integer: true, maxStacks: 2, describe: v => `Gain ${v} shield ${v === 1 ? 'charge' : 'charges'} at the start of every wave, including the next one.` },
  { id: 'hull', name: 'Spare Hull', category: 'SUPPLY', effect: 'lives', base: 1, integer: true, maxStacks: 999, describe: v => `Gain ${v} extra ${v === 1 ? 'life' : 'lives'} now. Maximum 9 lives.` },
  { id: 'munitions', name: 'Emergency Ordnance', category: 'SUPPLY', effect: 'bombs', base: 1, integer: true, maxStacks: 999, describe: v => `Gain ${v} arena-clearing ${v === 1 ? 'bomb' : 'bombs'} now. Maximum 9 bombs.` },
  { id: 'reroll', name: 'Second Opinion', category: 'SUPPLY', effect: 'rerolls', base: 1, integer: true, maxStacks: 999, describe: v => `Gain ${v} ${v === 1 ? 'reroll' : 'rerolls'} for this run. Rerolls carry between waves.` },
  { id: 'fortune', name: 'Lucky Circuit', category: 'FORTUNE', stat: 'luck', base: .06, maxStacks: 3, describe: v => `Future reward rolls shift ${pct(v)} toward higher rarities.` },
  { id: 'salvage', name: 'Bounty Protocol', category: 'SCORE', stat: 'score', base: .3, maxStacks: 3, describe: v => `+${pct(v)} score from kills. Does not alter your weapon.` },
  { id: 'reactor', name: 'Ordnance Reactor', category: 'SUPPLY', stat: 'bombRegen', base: .25, maxStacks: 2, describe: v => `Produce ${num(v)} bombs per completed wave; stored fractions accumulate into a full bomb.` },
  { id: 'satellite', name: 'Guardian Satellites', category: 'ORBITAL', stat: 'orbitals', base: 1, integer: true, maxStacks: 3, describe: v => `Add ${v} orbiting ${v === 1 ? 'drone' : 'drones'} that damage nearby enemies. Maximum 6 drones.` },
  { id: 'vampire', name: 'Soul Circuit', category: 'DEFENSE', stat: 'vampiric', base: 1, integer: true, maxStacks: 2, describe: v => `Every 50 kills, restore ${v} shield ${v === 1 ? 'charge' : 'charges'}.` },
  { id: 'fortress', name: 'Fortress Protocol', category: 'SYNERGY', stat: 'shieldDamage', base: .3, maxStacks: 3, describe: v => `+${pct(v)} weapon damage while you have a shield charge.` },
  { id: 'berserk', name: 'Last Stand', category: 'SYNERGY', stat: 'berserk', base: .6, maxStacks: 2, describe: v => `+${pct(v)} weapon damage while you are down to your final life.` },
  { id: 'kinetic', name: 'Kinetic Dynamo', category: 'SYNERGY', stat: 'movingDamage', base: .25, maxStacks: 3, describe: v => `+${pct(v)} weapon damage while moving.` },
  { id: 'anchor', name: 'Siege Stance', category: 'SYNERGY', stat: 'stationaryRate', base: .35, maxStacks: 3, describe: v => `+${pct(v)} fire rate while standing still. A powerful, dangerous commitment.` },
  { id: 'rebound', name: 'Rebound Amplifier', category: 'SYNERGY', stat: 'rebound', base: .35, maxStacks: 3, describe: v => `After each wall bounce, shots gain ${pct(v)} damage, up to 3 amplifications. Requires ricochets.` },
  { id: 'execution', name: 'Execution Order', category: 'OFFENSE', stat: 'execute', base: .08, maxStacks: 3, describe: v => `Hits finish enemies below ${pct(v)} health. Total execution threshold caps at 35%.` },
  { id: 'thorns', name: 'Revenge Pulse', category: 'DEFENSE', stat: 'thorns', base: 4, maxStacks: 3, describe: v => `When hit, unleash a pulse dealing ${num(v)} damage within 8 units.` },
  { id: 'glass', name: 'Glass Reactor', category: 'PACT', effect: 'glass', base: .65, maxStacks: 2, describe: v => `+${pct(v)} weapon damage. Lose 1 life immediately. Cannot be offered on your final life.` },
  { id: 'guardian', name: 'Quantum Evasion', category: 'DEFENSE', stat: 'dodge', base: .08, maxStacks: 3, describe: v => `${pct(v)} additional chance to evade a hit without spending shields or lives. Caps at 40%.` },
  { id: 'fusillade', name: 'Combat Package', category: 'OFFENSE', stat: 'damage', base: .16, maxStacks: 3, describe: v => `+${pct(v)} damage and +${pct(v / 2)} fire rate.` },
];
export const relicValue = (def: RelicDef, rarity: Rarity) => def.integer ? Math.max(1, Math.floor(def.base * RARITY_POWER[rarity])) : Number((def.base * RARITY_POWER[rarity]).toFixed(3));
export type Reward = { id: string; key: string; type: 'weapon' | 'upgrade' | 'relic'; name: string; rarity: Rarity; category: string; description: string; weaponId?: WeaponId; relicId?: string; amount: number };
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
export function rollRarity(random: () => number, wave: number, luck: number): Rarity {
  const roll = Math.min(.999, random() + Math.min(.25, (wave - 1) * .006 + luck));
  return roll < .35 ? 'common' : roll < .67 ? 'uncommon' : roll < .88 ? 'rare' : roll < .98 ? 'epic' : 'legendary';
}
