import test from 'node:test';
import assert from 'node:assert/strict';
import { GameModel, MAX_BULLETS } from '../lib/game-model.ts';
import { WEAPONS, RELICS, RARITIES, MAX_WEAPON_LEVEL, emptyStats, weaponProfile, relicValue } from '../lib/roguelike.ts';
const idle = { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, shooting: false };
const firing = { ...idle, shooting: true };
function seeded(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
function fresh(seed = 12) { const g = new GameModel(seeded(seed)); g.start(); return g; }
function clearWave(g) {
  g.invulnerable = 100000;
  for (let i = 0; i < 10000 && g.status === 'playing'; i++) {
    for (const e of g.enemies) g.bullets.push({ id: -e.id, x: e.x - 1, y: e.y, vx: 150, vy: 0, age: 0, damage: 100000 });
    g.step(.05, idle); g.events = [];
  }
  assert.equal(g.status, 'reward');
}
function equip(g, id, level = 1, rarity = 'common') { g.weapon = { id, level, rarity }; }
function enemy(g, x, y, hp = 100, kind = 'drifter') { const e = g.spawnEnemy(kind); Object.assign(e, { x, y, vx: 0, vy: 0, hp, maxHp: hp, age: 2, elite: false }); return e; }
function grant(g, relicId, rarity = 'common') {
  const def = RELICS.find(r => r.id === relicId), amount = relicValue(def, rarity);
  g.status = 'reward'; g.rewards = [{ id: 'fixture', key: `relic:${relicId}`, type: 'relic', name: def.name, rarity, category: def.category, description: def.describe(amount), relicId, amount }];
  assert.equal(g.chooseReward('fixture'), true);
}

test('catalog has exactly ten distinct draft weapons and at least 36 real relics', () => {
  assert.equal(WEAPONS.length, 10); assert.equal(new Set(WEAPONS.map(w => w.id)).size, 10); assert.ok(!WEAPONS.some(w => w.id === 'needle'));
  assert.ok(RELICS.length >= 36); assert.equal(new Set(RELICS.map(r => r.id)).size, RELICS.length);
});
test('a high score multiplier never changes the starter stream or weapon level', () => {
  for (const multiplier of [1, 5, 8]) { const g = fresh(); g.multiplier = multiplier; g.step(.01, firing); assert.equal(g.bullets.length, 1); assert.equal(g.weapon.id, 'needle'); assert.equal(g.weapon.level, 1); assert.equal(g.bullets[0].vy, 0); }
});
test('every first draft offers three weapons; two rerolls expose nine unique choices', () => {
  const weaponsSeen = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const g = fresh(seed); clearWave(g); assert.equal(g.rerolls, 2); const seen = new Set();
    for (let roll = 0; roll < 3; roll++) {
      assert.equal(g.rewards.length, 3);
      for (const r of g.rewards) { assert.equal(r.type, 'weapon'); assert.ok(WEAPONS.some(w => w.id === r.weaponId)); assert.ok(!seen.has(r.weaponId)); seen.add(r.weaponId); weaponsSeen.add(r.weaponId); }
      if (roll < 2) assert.equal(g.rerollRewards(), true);
    }
    const before = g.snapshot(); assert.equal(g.rerollRewards(), false); assert.deepEqual(g.snapshot(), before); assert.equal(seen.size, 9);
  }
  assert.equal(weaponsSeen.size, 10);
});
test('rerolls carry between waves and only a new run resets them to two', () => {
  const g = fresh(); clearWave(g); g.rerollRewards(); g.chooseReward(g.rewards[0].id); assert.equal(g.rerolls, 1); clearWave(g); assert.equal(g.rerolls, 1);
  g.rerollRewards(); g.chooseReward(g.rewards[0].id); assert.equal(g.rerolls, 0); clearWave(g); assert.equal(g.rerolls, 0);
  grant(g, 'reroll', 'legendary'); assert.equal(g.rerolls, 2); g.start(); assert.equal(g.rerolls, 2); assert.equal(g.relics.length, 0); assert.equal(g.weapon.id, 'needle'); assert.equal(g.shields, 0);
});
test('reward state freezes combat, timers, bombs and pause/resume until a valid choice', () => {
  const g = fresh(); clearWave(g); const before = g.snapshot(); g.step(1, firing); g.pause(); g.resume(); assert.equal(g.bomb(), false); assert.equal(g.chooseReward('missing'), false); assert.deepEqual(g.snapshot(), before);
  const id = g.rewards[0].id; assert.equal(g.chooseReward(id), true); const after = g.snapshot(); assert.equal(g.chooseReward(id), false); assert.deepEqual(g.snapshot(), after); assert.equal(g.wave, 2);
});
test('a reroll invalidates all prior offer ids without allowing a stale reward', () => {
  const g = fresh(); clearWave(g); const old = g.rewards.map(r => r.id); g.rerollRewards(); for (const id of old) assert.equal(g.chooseReward(id), false); assert.equal(g.status, 'reward');
});
test('later drafts guarantee an explicit upgrade and weapon level persists after hits', () => {
  const g = fresh(); clearWave(g); g.chooseReward(g.rewards[0].id); clearWave(g);
  const upgrade = g.rewards.find(r => r.type === 'upgrade'); assert.ok(upgrade); const before = g.profile;
  g.chooseReward(upgrade.id); assert.equal(g.weapon.id, before.id); assert.ok(g.weapon.level > before.level); assert.ok(g.profile.damage > before.damage); assert.ok(g.profile.interval < before.interval);
  const level = g.weapon.level; g.invulnerable = 0; enemy(g, 0, 0); g.step(.01, idle); assert.equal(g.weapon.level, level);
});
test('maxed legendary weapons are excluded from upgrade offers', () => {
  const g = fresh(); clearWave(g); g.chooseReward(g.rewards[0].id); equip(g, 'rail', MAX_WEAPON_LEVEL, 'legendary'); clearWave(g); assert.ok(!g.rewards.some(r => r.type === 'upgrade'));
});
test('upgrading a max-level weapon raises its quality instead of wasting the reward', () => {
  const g = fresh(); clearWave(g); g.chooseReward(g.rewards[0].id); equip(g, 'rail', MAX_WEAPON_LEVEL, 'common'); clearWave(g);
  const upgrade = g.rewards.find(r => r.type === 'upgrade'); assert.ok(upgrade); g.chooseReward(upgrade.id); assert.equal(g.weapon.level, MAX_WEAPON_LEVEL); assert.notEqual(g.weapon.rarity, 'common');
});
test('rarity increases weapon power and reward strength', () => {
  let previousDamage = 0;
  for (const rarity of RARITIES) { const p = weaponProfile({ id: 'rail', level: 1, rarity }, emptyStats()); assert.ok(p.damage > previousDamage); previousDamage = p.damage; }
  const def = RELICS.find(r => r.id === 'capacitor'); assert.ok(relicValue(def, 'legendary') > relicValue(def, 'common') * 2);
});
test('all catalog relics apply an actual change through the selection flow', () => {
  for (const def of RELICS) {
    const g = fresh(); g.lives = 3; const before = JSON.stringify({ stats: g.stats, lives: g.lives, bombs: g.bombs, shields: g.shields, rerolls: g.rerolls });
    grant(g, def.id); const after = JSON.stringify({ stats: g.stats, lives: g.lives, bombs: g.bombs, shields: g.shields, rerolls: g.rerolls });
    assert.notEqual(after, before, `${def.id} must do something`); assert.equal(g.owned[def.id], 1);
  }
});
test('shields absorb hits before lives, and selected shield regeneration refills next wave', () => {
  const g = fresh(); grant(g, 'battery'); assert.equal(g.shields, 1); g.invulnerable = 0; enemy(g, 0, 0); g.step(.01, idle); assert.equal(g.shields, 0); assert.equal(g.lives, 3);
  grant(g, 'aegis'); assert.equal(g.shields, 1); clearWave(g); const id = g.rewards.find(r => r.type === 'upgrade')?.id ?? g.rewards[0].id; g.chooseReward(id); assert.ok(g.shields >= 2);
});
test('extra lives and ammunition are resources, not cosmetic upgrades', () => {
  const g = fresh(); grant(g, 'hull', 'epic'); assert.equal(g.lives, 5); grant(g, 'munitions', 'epic'); assert.equal(g.bombs, 5); grant(g, 'glass'); assert.equal(g.lives, 4); assert.ok(g.profile.damage > 1.5);
});
test('fully capped and dangerous-to-use relics cannot appear in later drafts', () => {
  const g = fresh(); clearWave(g); g.chooseReward(g.rewards[0].id); g.lives = 1; g.shields = 6; g.bombs = 9; g.stats.speed = .75; clearWave(g);
  g.rerolls = 30;
  for (let i = 0; i < 30; i++) { assert.ok(!g.rewards.some(r => ['glass','battery','munitions','thrusters'].includes(r.relicId))); g.rerollRewards(); }
});
test('ten weapons produce the advertised shot counts and preserve distinct behaviors', () => {
  const signatures = new Set();
  for (const def of WEAPONS) { const g = fresh(); equip(g, def.id); g.step(.01, firing); assert.equal(g.bullets.length, def.pellets, def.id); const b = g.bullets[0]; signatures.add(JSON.stringify([def.pellets, b.damage, b.vx, b.lifetime, b.pierce, b.blast, b.chain, b.burn, b.homing, b.bounces])); }
  assert.equal(signatures.size, 10);
});
test('rail shots pierce multiple enemies but never hit the same enemy twice', () => {
  const g = fresh(); equip(g, 'rail'); const a = enemy(g, 5, 0, 50), b = enemy(g, 9, 0, 50); g.step(.05, firing); assert.ok(a.hp < 50); assert.ok(b.hp < 50); const hp = a.hp;
  for (let i = 0; i < 5; i++) g.step(.02, idle); assert.equal(a.hp, hp);
});
test('homing missiles change course toward a target and ricochets reverse at walls', () => {
  const g = fresh(); equip(g, 'seeker'); enemy(g, 15, 10); g.step(.01, firing); const vy = g.bullets[0].vy; for (let i = 0; i < 8; i++) g.step(.02, idle); assert.ok(g.bullets[0].vy > vy);
  const r = fresh(); equip(r, 'ricochet'); r.step(.01, firing); const b = r.bullets[0]; b.x = r.width / 2 - .1; b.vx = 60; const before = b.bounces; r.step(.01, idle); assert.ok(b.vx < 0); assert.equal(b.bounces, before - 1);
});
test('explosive shells and lightning actually damage adjacent targets', () => {
  for (const id of ['mortar', 'tesla']) { const g = fresh(); equip(g, id); enemy(g, 5, 0); const other = enemy(g, 7, 3); g.step(.05, firing); for (let i = 0; i < 6; i++) g.step(.02, idle); assert.ok(other.hp < 100, id); assert.ok(g.events.some(e => e.type === (id === 'mortar' ? 'blast' : 'arc'))); }
});
test('flames inflict ongoing burn and cryo reduces enemy travel', () => {
  const g = fresh(); equip(g, 'flame'); const e = enemy(g, 3, 0); g.step(.05, firing); assert.ok(e.burnTime > 0); const hp = e.hp; g.bullets = []; g.step(.05, idle); assert.ok(e.hp < hp);
  const a = fresh(), b = fresh(); const ea = enemy(a, 10, 0), eb = enemy(b, 10, 0); ea.vx = -1; eb.vx = -1; eb.slow = .5; eb.slowTime = 2; a.step(.05, idle); b.step(.05, idle); assert.ok(10 - eb.x < (10 - ea.x) * .6);
});
test('elemental and critical synergies have a real effect', () => {
  const s = emptyStats(); s.burn = 1; s.slow = .3; s.chain = 1; s.blast = 2; s.crit = .2; s.pierce = 1;
  const p = weaponProfile({ id: 'repeater', level: 1, rarity: 'common' }, s); assert.ok(p.synergies.includes('Thermal Shock')); assert.ok(p.synergies.includes('Thunderstorm')); assert.ok(p.synergies.includes('Deadeye')); assert.equal(p.blast, 2.5);
  const g = new GameModel(() => 0); g.start(); g.stats.crit = .2; g.stats.pierce = 1; g.step(.01, firing); assert.equal(g.bullets[0].critical, true); assert.equal(g.bullets[0].pierce, 3); assert.equal(g.bullets[0].damage, 2);
  const h = fresh(); h.stats.burn = 1; h.stats.slow = .3; const target = enemy(h, 3, 0); target.burnTime = 2; target.burn = 0; target.slowTime = 2; h.step(.03, firing); assert.ok(target.hp <= 98.5);
});
test('orbitals cause damage and life-related passives trigger in combat', () => {
  const g = fresh(); g.stats.orbitals = 1; const e = enemy(g, 4.8, 0); g.step(.01, idle); assert.ok(e.hp < 100);
  g.stats.vampiric = 1; g.kills = 49; g.bomb(); assert.equal(g.shields, 1);
  const h = new GameModel(() => 0); h.start(); h.stats.dodge = .4; h.invulnerable = 0; enemy(h, 0, 0); h.step(.01, idle); assert.equal(h.lives, 3); assert.ok(h.invulnerable > 0);
});
test('high-level firing remains within the projectile pool and expires cleanly', () => {
  const g = fresh(); equip(g, 'nova', 8, 'legendary'); g.stats.fireRate = 3; g.invulnerable = 1000;
  for (let i = 0; i < 300; i++) { g.step(.02, firing); assert.ok(g.bullets.length <= MAX_BULLETS); }
  for (let i = 0; i < 300; i++) g.step(.02, idle); assert.equal(g.bullets.length, 0);
});
