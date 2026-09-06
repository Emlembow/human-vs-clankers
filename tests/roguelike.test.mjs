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
function equip(g, id, level = 1, rarity = 'common') { g.weapons = [{ id, level, rarity }]; }
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
  for (const multiplier of [1, 5, 8]) { const g = fresh(); g.multiplier = multiplier; g.step(.01, firing); assert.equal(g.bullets.length, 1); assert.equal(g.weapons[0].id, 'needle'); assert.equal(g.weapons[0].level, 1); assert.equal(g.bullets[0].vy, 0); }
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
  grant(g, 'reroll', 'legendary'); assert.equal(g.rerolls, 2); g.start(); assert.equal(g.rerolls, 2); assert.equal(g.relics.length, 0); assert.equal(g.weapons[0].id, 'needle'); assert.equal(g.shields, 0);
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
  const upgrade = g.rewards.find(r => r.type === 'upgrade'); assert.ok(upgrade); const before = g.profiles[0];
  g.chooseReward(upgrade.id); assert.equal(g.weapons[0].id, before.id); assert.ok(g.weapons[0].level > before.level); assert.ok(g.profiles[0].damage > before.damage); assert.ok(g.profiles[0].interval < before.interval);
  const level = g.weapons[0].level; g.invulnerable = 0; enemy(g, 0, 0); g.step(.01, idle); assert.equal(g.weapons[0].level, level);
});
test('maxed legendary weapons are excluded from upgrade offers', () => {
  const g = fresh(); clearWave(g); g.chooseReward(g.rewards[0].id); equip(g, 'rail', MAX_WEAPON_LEVEL, 'legendary'); clearWave(g); assert.ok(!g.rewards.some(r => r.type === 'upgrade'));
});
test('upgrading a max-level weapon raises its quality instead of wasting the reward', () => {
  const g = fresh(); clearWave(g); g.chooseReward(g.rewards[0].id); equip(g, 'rail', MAX_WEAPON_LEVEL, 'common'); clearWave(g);
  const upgrade = g.rewards.find(r => r.type === 'upgrade'); assert.ok(upgrade); g.chooseReward(upgrade.id); assert.equal(g.weapons[0].level, MAX_WEAPON_LEVEL); assert.notEqual(g.weapons[0].rarity, 'common');
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
  const g = fresh(); grant(g, 'hull', 'epic'); assert.equal(g.lives, 5); grant(g, 'munitions', 'epic'); assert.equal(g.bombs, 5); grant(g, 'glass'); assert.equal(g.lives, 4); assert.ok(g.profiles[0].damage > 1.5);
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

test('only wave 1 and wave 5 offer weapons, including every reroll, through wave 20', () => {
  const g = fresh(71);
  let firstWeapon;
  for (let wave = 1; wave <= 20; wave++) {
    clearWave(g); assert.equal(g.wave, wave); g.rerolls = 3;
    for (let roll = 0; roll < 4; roll++) {
      assert.equal(g.rewards.length, 3);
      for (const reward of g.rewards) {
        assert.equal(reward.type === 'weapon', wave === 1 || wave === 5, `wave ${wave}, reroll ${roll}`);
        if (wave === 5) assert.notEqual(reward.weaponId, firstWeapon);
        if (reward.type === 'upgrade') assert.ok(g.weapons.some(w => w.id === reward.weaponId));
      }
      if (roll < 3) assert.equal(g.rerollRewards(), true);
    }
    const pick = g.rewards.find(r => r.type === 'weapon' || r.type === 'upgrade') ?? g.rewards.find(r => r.relicId !== 'glass');
    assert.equal(g.chooseReward(pick.id), true);
    if (wave === 1) { firstWeapon = g.weapons[0].id; assert.equal(g.weapons.length, 1); }
    if (wave >= 5) { assert.equal(g.weapons.length, 2); assert.equal(g.weapons[0].id, firstWeapon); }
  }
});

test('the second weapon draft preserves the first weapon and offers all nine other weapons before repeating', () => {
  const g = fresh(12); clearWave(g); g.chooseReward(g.rewards[0].id);
  while (g.wave < 5) { clearWave(g); g.chooseReward(g.rewards.find(r => r.type === 'upgrade').id); }
  const first = { ...g.weapons[0] }; clearWave(g);
  assert.equal(g.rerolls, 2); const seen = new Set();
  for (let roll = 0; roll < 3; roll++) {
    for (const r of g.rewards) { assert.equal(r.type, 'weapon'); assert.notEqual(r.weaponId, first.id); assert.ok(!seen.has(r.weaponId)); seen.add(r.weaponId); }
    if (roll < 2) assert.equal(g.rerollRewards(), true);
  }
  assert.equal(seen.size, 9);
  const choice = g.rewards[0]; assert.equal(g.chooseReward(choice.id), true);
  assert.deepEqual(g.weapons[0], first); assert.deepEqual(g.weapons[1], { id: choice.weaponId, level: choice.amount, rarity: choice.rarity });
  assert.equal(g.rerolls, 0); assert.equal(g.wave, 6);
  const before = g.snapshot(); assert.equal(g.chooseReward(choice.id), false); assert.deepEqual(g.snapshot(), before);
  for (let i = 0; i < 60; i++) g.step(.01, firing);
  assert.ok(g.events.some(e => e.type === 'shot' && e.weaponId === first.id));
  assert.ok(g.events.some(e => e.type === 'shot' && e.weaponId === choice.weaponId));
});

test('every pair fires both patterns with independent cadence and keeps their projectiles', () => {
  function fire(ids) {
    const g = fresh(); g.setBounds(1000, 1000); g.weapons = ids.map(id => ({ id, level: 1, rarity: 'common' }));
    g.step(.001, firing);
    for (const id of ids) assert.equal(g.bullets.filter(b => b.style === id).length, WEAPONS.find(w => w.id === id).pellets);
    for (let i = 0; i < 120; i++) g.step(.01, firing);
    return new Map(ids.map(id => [id, g.events.filter(e => e.type === 'shot' && e.weaponId === id).length]));
  }
  const solo = new Map(WEAPONS.map(w => [w.id, fire([w.id]).get(w.id)]));
  for (let a = 0; a < WEAPONS.length; a++) for (let b = a + 1; b < WEAPONS.length; b++) {
    const ids = [WEAPONS[a].id, WEAPONS[b].id], counts = fire(ids);
    for (const id of ids) assert.equal(counts.get(id), solo.get(id), `${ids.join(' + ')}: ${id} must keep its own cadence`);
  }
});

test('upgrades target either named weapon and exclude maxed weapons individually', () => {
  for (const targetId of ['repeater', 'rail']) {
    const g = fresh(); g.wave = 6;
    g.weapons = [{ id: 'repeater', level: 2, rarity: 'common' }, { id: 'rail', level: 2, rarity: 'common' }];
    clearWave(g); g.rerolls = 30;
    while (!g.rewards.some(r => r.type === 'upgrade' && r.weaponId === targetId) && g.rerolls > 0) g.rerollRewards();
    const pick = g.rewards.find(r => r.type === 'upgrade' && r.weaponId === targetId); assert.ok(pick);
    const other = { ...g.weapons.find(w => w.id !== targetId) };
    g.chooseReward(pick.id); assert.ok(g.weapons.find(w => w.id === targetId).level > 2);
    assert.deepEqual(g.weapons.find(w => w.id !== targetId), other);
    const upgraded = g.weapons.find(w => w.id === targetId); upgraded.level = 8; upgraded.rarity = 'legendary';
    clearWave(g); assert.ok(!g.rewards.some(r => r.type === 'upgrade' && r.weaponId === targetId));
    assert.ok(g.rewards.some(r => r.type === 'upgrade' && r.weaponId === other.id));
    g.weapons.forEach(w => { w.level = 8; w.rarity = 'legendary'; });
    g.rerollRewards(); assert.ok(g.rewards.every(r => r.type === 'relic'));
  }
});

test('shared power-ups affect both weapons and a restart removes the second weapon and its firing clock', () => {
  const g = fresh(); g.wave = 6; g.weapons = [{ id: 'rail', level: 1, rarity: 'common' }, { id: 'ricochet', level: 1, rarity: 'common' }];
  const before = g.profiles; grant(g, 'capacitor'); grant(g, 'accelerator'); grant(g, 'incendiary');
  for (const [i, profile] of g.profiles.entries()) { assert.ok(profile.damage > before[i].damage); assert.ok(profile.interval < before[i].interval); assert.ok(profile.burn > 0); }
  clearWave(g); g.rerolls = 30;
  while (!g.rewards.some(r => r.relicId === 'rebound') && g.rerolls > 0) g.rerollRewards();
  assert.ok(g.rewards.some(r => r.relicId === 'rebound'), 'Relic eligibility must see intrinsic effects on the second weapon.');
  g.start(); assert.deepEqual(g.weapons, [{ id: 'needle', level: 1, rarity: 'common' }]); assert.equal(g.rerolls, 2);
  g.step(.01, firing); assert.equal(g.bullets.length, 1); assert.equal(g.bullets[0].style, 'needle');
});
