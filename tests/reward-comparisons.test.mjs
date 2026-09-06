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
