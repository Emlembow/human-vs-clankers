import test from 'node:test';
import assert from 'node:assert/strict';
import { GameModel } from '../lib/game-model.ts';
import { STARTER, WEAPONS, RELICS, RARITIES, MAX_WEAPON_LEVEL, emptyStats, weaponProfile, weaponUpgradePreview, relicValue } from '../lib/roguelike.ts';

const weapons = [STARTER, ...WEAPONS];
const referenceStats = stats => ({ ...stats, movingDamage: 0, shieldDamage: 0, berserk: 0, stationaryRate: 0 });
const readable = n => String(Number(n.toFixed(2)));
const columns = profile => ({
  'Damage / hit': profile.damage,
  [profile.pellets > 1 ? 'Volleys / sec' : 'Shots / sec']: 1 / profile.interval,
  'Projectiles / volley': profile.pellets,
  'Burn / sec': profile.burn ?? 0,
});

function checkDisplayedChanges(reward, before, after) {
  const previous = columns(before), next = columns(after);
  const expectedLabels = Object.keys(previous).filter(key => Math.abs(next[key] - previous[key]) > 1e-9 && readable(previous[key]) !== readable(next[key]));
  assert.deepEqual(reward.changes.map(change => change.label), expectedLabels);
  for (const change of reward.changes) {
    assert.equal(change.before, readable(previous[change.label]), `${before.id} ${change.label}: before`);
    assert.equal(change.after, readable(next[change.label]), `${before.id} ${change.label}: after`);
    assert.ok(Number(change.after) > Number(change.before), `${before.id}: display must show a real gain`);
  }
}

test('upgrade cards match applied weapon profiles across weapons, rarities, levels and permanent bonuses', () => {
  let checked = 0;
  const variants = [emptyStats(), { ...emptyStats(), damage: .61, fireRate: .67, burn: 1.04, crit: .2 }, { ...emptyStats(), damage: 2.4, fireRate: 3, burn: 2.6 }];
  for (const definition of weapons) for (const level of [1, 3, 6, 7, 8]) for (const rarity of RARITIES) for (const rewardRarity of RARITIES) for (const stats of variants) {
    const game = new GameModel(() => .5);
    game.start(); game.wave = 6; game.status = 'reward'; game.stats = { ...stats };
    const owned = { id: definition.id, level, rarity };
    const other = { id: definition.id === 'rail' ? 'trident' : 'rail', level: 5, rarity: 'epic' };
    game.weapons = [{ ...owned }, { ...other }];
    const amount = rewardRarity === 'legendary' ? 3 : rewardRarity === 'epic' ? 2 : 1;
    const reward = { id: 'upgrade', key: `upgrade:${definition.id}`, type: 'upgrade', rarity: rewardRarity, category: 'WEAPON UPGRADE', weaponId: definition.id, amount, ...weaponUpgradePreview(owned, stats, amount, rewardRarity) };
    const before = game.profiles[0], otherBefore = game.profiles[1];
    game.rewards = [reward];
    assert.equal(game.chooseReward(reward.id), true);
    assert.equal(game.weapons[0].level, Math.min(MAX_WEAPON_LEVEL, level + amount));
    assert.equal(game.weapons[0].rarity, RARITIES[Math.max(RARITIES.indexOf(rarity), RARITIES.indexOf(rewardRarity))]);
    checkDisplayedChanges(reward, before, game.profiles[0]);
    assert.deepEqual(game.weapons[1], other);
    assert.deepEqual(game.profiles[1], otherBefore);
    assert.deepEqual(game.stats, stats);
    assert.equal(reward.comparisonNote, undefined);
    checked++;
  }
  assert.equal(checked, 4125);
});

test('preview excludes conditional bonuses consistently and discloses that reference mode', () => {
  const permanent = { ...emptyStats(), damage: .44, fireRate: .36, burn: .65 };
  const allConditional = { ...permanent, movingDamage: .25, stationaryRate: .35, shieldDamage: .3, berserk: .6, shieldRegen: 1 };
  for (const definition of weapons) for (const moving of [false, true]) for (const shields of [0, 3]) for (const lives of [1, 3]) {
    const game = new GameModel(); game.start(); game.wave = 6; game.status = 'reward';
    game.stats = { ...allConditional }; game.shields = shields; game.lives = lives; game.player.vx = moving ? 22 : 0;
    const owned = { id: definition.id, level: 3, rarity: 'uncommon' };
    game.weapons = [{ ...owned }];
    const preview = weaponUpgradePreview(owned, game.stats, 2, 'epic');
    const neutral = weaponUpgradePreview(owned, permanent, 2, 'epic');
    assert.deepEqual(preview.changes, neutral.changes);
    assert.equal(preview.comparisonNote, 'Before conditional bonuses');
    const before = weaponProfile(owned, referenceStats(game.stats));
    game.rewards = [{ id: 'upgrade', key: `upgrade:${definition.id}`, type: 'upgrade', rarity: 'epic', category: 'WEAPON UPGRADE', weaponId: definition.id, amount: 2, ...preview }];
    assert.equal(game.chooseReward('upgrade'), true);
    checkDisplayedChanges(preview, before, weaponProfile(game.weapons[0], referenceStats(game.stats)));
  }
  for (const stat of ['movingDamage', 'stationaryRate', 'shieldDamage', 'berserk']) {
    const preview = weaponUpgradePreview({ id: 'repeater', level: 1, rarity: 'common' }, { ...emptyStats(), [stat]: .5 }, 1, 'common');
    assert.equal(preview.comparisonNote, 'Before conditional bonuses', stat);
  }
});

test('generated upgrade offers expose applied level and quality transitions without promising capped stats', () => {
  for (const definition of weapons) for (const level of [1, 3, 6, 7, 8]) for (const rarity of RARITIES) for (const roll of [0, .4, .72, .9, .99]) {
    const game = new GameModel(() => roll); game.start(); game.wave = 6; game.status = 'reward';
    game.weapons = [{ id: definition.id, level, rarity }];
    game.stats.fireRate = 3; game.stats.burn = .65;
    // Generate a real between-wave offer; this also checks the production rarity
    // promotion at max level rather than constructing a preview-only fixture.
    game.generateRewards();
    const reward = game.rewards.find(value => value.type === 'upgrade');
    if (level === MAX_WEAPON_LEVEL && rarity === 'legendary') { assert.equal(reward, undefined); continue; }
    assert.ok(reward);
    const before = game.profiles[0];
    assert.equal(game.chooseReward(reward.id), true);
    const after = game.profiles[0];
    checkDisplayedChanges(reward, before, after);
    assert.equal(reward.name, `${definition.name} · Lv. ${level}${after.level !== level ? ` → ${after.level}` : ''}`);
    const quality = value => value[0].toUpperCase() + value.slice(1);
    assert.equal(reward.description, after.rarity === rarity ? '' : `${quality(rarity)} → ${quality(after.rarity)}`);
    if (level === MAX_WEAPON_LEVEL) {
      assert.equal(after.level, MAX_WEAPON_LEVEL);
      assert.ok(RARITIES.indexOf(after.rarity) > RARITIES.indexOf(rarity));
      assert.ok(reward.changes.every(change => !change.label.includes('/ sec') || change.label === 'Burn / sec'));
      assert.ok(!reward.name.includes('Ascension'));
    }
  }
});

test('multishot thresholds show projectiles per volley and burn stays separate from hit damage', () => {
  for (const definition of weapons) for (const level of [3, 6]) {
    const preview = weaponUpgradePreview({ id: definition.id, level, rarity: 'common' }, emptyStats(), 1, 'common');
    const pellets = preview.changes.find(change => change.label === 'Projectiles / volley');
    assert.equal(Boolean(pellets), definition.pellets > 1, definition.id);
    if (pellets) assert.equal(Number(pellets.after) - Number(pellets.before), definition.id === 'nova' ? 2 : 1);
    assert.equal(preview.changes.some(change => change.label === 'Burn / sec'), definition.id === 'flame');
    assert.ok(preview.changes.every(change => !change.label.includes('DPS')));
  }
  const capped = weaponUpgradePreview({ id: 'repeater', level: 7, rarity: 'common' }, { ...emptyStats(), fireRate: 3 }, 1, 'common');
  assert.deepEqual(capped.changes.map(change => change.label), ['Damage / hit']);
});

test('supply and Combat Package descriptions report the amount actually received at caps', () => {
  function onlyRelic(relicId) {
    const game = new GameModel(() => .99); game.start(); game.wave = 6; game.status = 'reward';
    game.weapons = [{ id: 'repeater', level: 8, rarity: 'legendary' }];
    game.owned = Object.fromEntries(RELICS.map(relic => [relic.id, relic.id === relicId ? 0 : relic.maxStacks]));
    return game;
  }
  for (const [relicId, field, cap] of [['hull', 'lives', 9], ['battery', 'shields', 6], ['munitions', 'bombs', 9]]) {
    const game = onlyRelic(relicId); game[field] = cap - 1; game.generateRewards();
    const reward = game.rewards[0];
    assert.equal(reward.relicId, relicId); assert.equal(reward.amount, 2);
    const before = game[field]; assert.equal(game.chooseReward(reward.id), true);
    assert.equal(game[field] - before, 1);
    assert.ok(reward.description.startsWith(`+${game[field] - before} `));
  }
  for (const fireRate of [2.99, 3]) {
    const game = onlyRelic('fusillade'); game.stats.fireRate = fireRate; game.generateRewards();
    const reward = game.rewards[0]; const before = { ...game.stats };
    assert.equal(game.chooseReward(reward.id), true);
    assert.ok(reward.description.includes(`+${readable((game.stats.damage - before.damage) * 100)}% damage`));
    const increase = game.stats.fireRate - before.fireRate;
    assert.equal(reward.description.includes('fire-rate bonus'), increase > 0);
    if (increase > 0) assert.ok(reward.description.includes(`+${readable(increase * 100)}% fire-rate`));
  }
  assert.equal(RELICS.find(relic => relic.id === 'capacitor').describe(.352), 'All weapons: +35.2% damage bonus.');
});

test('reachable bonuses near the fire-rate cap do not show identical before and after values', () => {
  const game = new GameModel(() => 0); game.start();
  function choose(reward) {
    game.status = 'reward'; game.rewards = [reward];
    assert.equal(game.chooseReward(reward.id), true);
  }
  function draft(weaponId, level) {
    const def = WEAPONS.find(weapon => weapon.id === weaponId);
    choose({ id: `weapon:${weaponId}`, key: `weapon:${weaponId}`, type: 'weapon', name: def.name, rarity: 'common', category: def.tagline, description: def.description, weaponId, amount: level });
  }
  function grant(relicId, rarity) {
    const def = RELICS.find(relic => relic.id === relicId), amount = relicValue(def, rarity);
    choose({ id: `relic:${relicId}`, key: `relic:${relicId}`, type: 'relic', name: def.name, rarity, category: def.category, description: def.describe(amount), relicId, amount });
  }
  draft('repeater', 1);
  assert.equal(game.wave, 2); grant('accelerator', 'uncommon');
  assert.equal(game.wave, 3); grant('fusillade', 'legendary');
  assert.equal(game.wave, 4); grant('fusillade', 'rare');
  assert.equal(game.wave, 5); draft('rail', 2);
  assert.equal(game.wave, 6); grant('fusillade', 'common');
  assert.equal(game.wave, 7);
  assert.ok(Math.abs(game.stats.fireRate - .657) < 1e-12);
  assert.equal(game.owned.accelerator, 1); assert.equal(game.owned.fusillade, 3);
  const before = game.profiles[0];
  game.status = 'reward'; game.generateRewards();
  const reward = game.rewards.find(value => value.type === 'upgrade' && value.weaponId === 'repeater');
  assert.ok(reward); assert.equal(reward.amount, 1); assert.equal(reward.rarity, 'common');
  assert.equal(game.chooseReward(reward.id), true);
  const after = game.profiles[0];
  assert.ok(1 / after.interval > 1 / before.interval, 'the real small cadence gain is preserved');
  assert.equal(readable(1 / before.interval), '28.57');
  assert.equal(readable(1 / after.interval), '28.57');
  assert.ok(reward.changes.every(change => change.before !== change.after));
  assert.deepEqual(reward.changes.map(change => change.label), ['Damage / hit']);
});

function generatedOffer(game, seed, key, rarity) {
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  // Complete the current wave as a fixture, but retain real eligibility, stored
  // stats, stack counts, reward amounts and selection/application behavior.
  game.status = 'reward'; game.rewards = []; game.rewardSeen.clear(); game.random = random;
  game.generateRewards();
  return game.rewards.find(reward => reward.key === key && (!rarity || reward.rarity === rarity));
}

function findGeneratedOffer(game, key, rarity) {
  for (let seed = game.wave * 100000; seed < game.wave * 100000 + 10000; seed++) {
    const reward = generatedOffer(game, seed, key, rarity);
    if (reward) return reward;
  }
  assert.fail(`No ${rarity ?? ''} ${key} offer found at wave ${game.wave}`);
}

test('blast copy distinguishes stored bonus from capped Mortar radius and later weapon benefits', () => {
  const game = new GameModel(); game.start();
  const first = generatedOffer(game, 100001, 'weapon:mortar', 'common');
  assert.ok(first); assert.equal(game.chooseReward(first.id), true);
  const radii = [game.profiles[0].blast], amounts = [];
  for (const [wave, seed, rarity] of [[2, 201117, 'legendary'], [3, 301443, 'legendary'], [4, 400082, 'common']]) {
    assert.equal(game.wave, wave);
    const reward = generatedOffer(game, seed, 'relic:volatile', rarity);
    assert.ok(reward); amounts.push(readable(reward.amount));
    assert.ok(reward.description.includes(`+${readable(reward.amount)} blast-radius bonus`));
    assert.ok(reward.description.includes('Radius cap: 12 (15 with chain)'));
    assert.ok(reward.description.includes('65% damage'));
    assert.equal(game.chooseReward(reward.id), true); radii.push(game.profiles[0].blast);
  }
  assert.deepEqual(amounts, ['4.76', '4.76', '0.48']);
  assert.deepEqual(radii.map(readable), ['5.5', '10.26', '12', '12']);
  assert.equal(game.stats.blast, 10); assert.equal(game.owned.volatile, 3);
  assert.equal(game.wave, 5);
  const second = findGeneratedOffer(game, 'weapon:rail');
  assert.equal(game.chooseReward(second.id), true);
  assert.equal(game.profiles[0].blast, 12); assert.equal(game.profiles[1].blast, 10);
  const chain = findGeneratedOffer(game, 'relic:conductor', 'common');
  assert.equal(game.chooseReward(chain.id), true);
  assert.equal(game.profiles[0].blast, 15); assert.equal(game.profiles[1].blast, 12.5);
});

test('chain and bounce cards describe stored bonuses when intrinsic effects reach their effective caps', () => {
  for (const spec of [
    { weapon: 'tesla', relic: 'conductor', stat: 'chain', rarities: ['legendary', 'legendary', 'common'], effective: [3, 5, 7, 7], stored: 5, bonusLabel: 'Chain-hop bonus:', cap: 'Cap: 7 hops' },
    { weapon: 'ricochet', relic: 'refractor', stat: 'bounces', rarities: ['legendary', 'legendary', 'legendary'], effective: [3, 5, 7, 8], stored: 6, bonusLabel: 'Wall-bounce bonus:', cap: 'caps at 8 bounces' },
  ]) {
    const game = new GameModel(); game.start();
    const weapon = findGeneratedOffer(game, `weapon:${spec.weapon}`, 'common');
    assert.equal(game.chooseReward(weapon.id), true);
    const effective = [game.profiles[0][spec.stat]];
    for (const rarity of spec.rarities) {
      const reward = findGeneratedOffer(game, `relic:${spec.relic}`, rarity);
      assert.ok(reward.description.includes(`${spec.bonusLabel} +${reward.amount}`));
      assert.ok(reward.description.includes(spec.cap));
      assert.equal(game.chooseReward(reward.id), true); effective.push(game.profiles[0][spec.stat]);
    }
    assert.deepEqual(effective, spec.effective);
    assert.equal(game.stats[spec.stat], spec.stored); assert.equal(game.owned[spec.relic], 3);
    const second = findGeneratedOffer(game, 'weapon:rail', 'common');
    assert.equal(game.chooseReward(second.id), true);
    assert.equal(game.profiles[1][spec.stat], spec.stored);
  }
});

test('conditional and capped resource rewards keep bonuses distinct from immediate received effects', () => {
  const game = new GameModel(); game.start();
  function grant(relicId, rarity) {
    const def = RELICS.find(relic => relic.id === relicId), amount = relicValue(def, rarity);
    game.status = 'reward'; game.rewards = [{ id: relicId, key: `relic:${relicId}`, type: 'relic', name: def.name, rarity, category: def.category, description: def.describe(amount), relicId, amount }];
    const copy = game.rewards[0].description;
    assert.equal(game.chooseReward(relicId), true); return copy;
  }
  game.shields = 6;
  const shieldCopy = grant('aegis', 'legendary');
  assert.equal(game.stats.shieldRegen, 2); assert.equal(game.shields, 6);
  assert.ok(shieldCopy.includes('Shield-regen bonus: +2/wave')); assert.ok(shieldCopy.includes('6-shield cap'));
  game.bombs = 9;
  const reactorCopy = grant('reactor', 'legendary');
  assert.equal(game.stats.bombRegen, .7);
  game.finishWave();
  grant('reactor', 'common');
  game.finishWave();
  assert.equal(game.bombs, 9); assert.ok(reactorCopy.includes('9-bomb cap'));
  assert.ok(game.bombCredit > 0 && game.bombCredit < 1, 'stored fractional production remains unchanged');
  const dormant = { ...emptyStats(), movingDamage: .25, shieldDamage: .3, berserk: .6, stationaryRate: .35 };
  const weapon = { id: 'rail', level: 1, rarity: 'common' };
  const unbuffed = weaponProfile(weapon, emptyStats());
  const moving = weaponProfile(weapon, dormant, { moving: true, shields: 0, lives: 3 });
  const shielded = weaponProfile(weapon, dormant, { moving: true, shields: 1, lives: 3 });
  const lastLife = weaponProfile(weapon, dormant, { moving: true, shields: 0, lives: 1 });
  assert.equal(moving.interval, unbuffed.interval);
  assert.ok(shielded.damage > moving.damage); assert.ok(lastLife.damage > moving.damage);
  for (const [relicId, condition] of [['kinetic', 'while moving'], ['fortress', 'while shielded'], ['berserk', 'last life'], ['anchor', 'while still']]) {
    const def = RELICS.find(relic => relic.id === relicId);
    assert.ok(def.describe(def.base).includes(condition));
  }
  assert.ok(RELICS.find(relic => relic.id === 'incendiary').describe(.65).includes('Burn bonus:'));
  assert.ok(RELICS.find(relic => relic.id === 'fusillade').describe(.16).includes('up to the cap'));
});
