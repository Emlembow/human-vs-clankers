import test from 'node:test';
import assert from 'node:assert/strict';
import { GameModel } from '../lib/game-model.ts';
import { AutoplayController, KonamiSequence, predictiveAim, predictEnemyStep, interceptTime, chooseAutoplayReward, rewardScore } from '../lib/autoplay.ts';

const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
const idle = { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, shooting: false };
const seeded = initial => { let seed = initial; return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; };
const enemyAt = (model, x, y, kind = 'drifter') => Object.assign(model.spawnEnemy(kind), { x, y, age: 2, vx: 0, vy: 1, hp: 1000, maxHp: 1000, elite: false });

test('Konami requires ordered physical presses and supports overlapping prefixes and a second toggle', () => {
  const detector = new KonamiSequence(); let now = 0;
  assert.equal(detector.push({ code: 'ArrowUp' }, now += 100), false);
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < code.length; i++) assert.equal(detector.push({ code: code[i] }, now += 100), i === code.length - 1);
  detector.reset();
  detector.push({ code: 'ArrowUp' }, now += 100);
  detector.push({ code: 'ArrowUp', repeat: true }, now += 100);
  for (const key of code.slice(2)) assert.equal(detector.push({ code: key }, now += 100), false, 'holding Up must not supply the second press');
});

test('typing, modifiers, composition, wrong keys, timeout and focus reset cannot complete the code', () => {
  for (const interruption of [{ code: 'KeyX' }, { code: 'ArrowDown', ctrlKey: true }, { code: 'ArrowDown', altKey: true }, { code: 'ArrowDown', metaKey: true }, { code: 'ArrowDown', shiftKey: true }, { code: 'ArrowDown', isComposing: true }]) {
    const detector = new KonamiSequence(); let now = 0;
    for (const key of code.slice(0, 3)) detector.push({ code: key }, now += 100);
    assert.equal(detector.push(interruption, now += 100), false);
    for (const key of code.slice(4)) assert.equal(detector.push({ code: key }, now += 100), false);
  }
  for (const kind of ['typing', 'timeout', 'reset']) {
    const detector = new KonamiSequence(); let now = 0;
    for (const key of code.slice(0, 5)) detector.push({ code: key }, now += 100);
    if (kind === 'reset') detector.reset();
    if (kind === 'timeout') now += 2000;
    for (const key of code.slice(5)) assert.equal(detector.push({ code: key }, now += 100, kind === 'typing'), false);
  }
});

test('enemy trajectory forecast matches the real model across classes, warning, slow, elite and reflections', () => {
  for (const kind of ['drifter', 'chaser', 'spinner']) for (const wave of [1, 10]) for (const age of [.72, 2]) {
    const model = new GameModel(seeded(8)); model.start(); model.wave = wave; model.invulnerable = 3;
    const e = enemyAt(model, model.width / 2 - 1.7, 12, kind);
    Object.assign(e, { age, elite: true, vx: .9, vy: .3, slowTime: .08, slow: .45 });
    const prediction = { ...e };
    for (let i = 0; i < 8; i++) {
      model.step(.04, idle); predictEnemyStep(prediction, model.player, model, .04);
      for (const key of ['x', 'y', 'vx', 'vy', 'age']) assert.ok(Math.abs(e[key] - prediction[key]) < 1e-9, `${kind} wave ${wave} ${key}`);
    }
  }
});

test('intercept accounts for actual transverse velocity, muzzle offset and unreachable targets', () => {
  const t = interceptTime({ x: 25, y: 0 }, { x: 0, y: 9 }, 85);
  assert.ok(t > 0);
  assert.ok(Math.abs(Math.hypot(25, 9 * t) - (85 * t + 1.5)) < 1e-8);
  assert.equal(interceptTime({ x: 25, y: 0 }, { x: 100, y: 0 }, 85), Infinity);
});

test('each weapon leads the closest living enemy using its own speed and this frame\'s accelerated origin', () => {
  const model = new GameModel(seeded(3)); model.start();
  model.weapons = [{ id: 'rail', level: 1, rarity: 'common' }, { id: 'mortar', level: 1, rarity: 'common' }];
  const closest = enemyAt(model, 20, 0); enemyAt(model, -30, 0, 'chaser');
  const dt = .04, move = { x: 0, y: 1 }, result = predictiveAim(model, dt, move);
  assert.equal(result.targetId, closest.id); assert.equal(result.shooting, true);
  assert.ok(result.weaponAim.mortar.y > result.weaponAim.rail.y, 'slower shells need more transverse lead');
  const speed = 22 * (1 - Math.exp(-14 * dt)), originY = speed * dt;
  for (const profile of model.profiles) {
    const vector = result.weaponAim[profile.id];
    const t = (20 / vector.x - 1.5) / profile.speed;
    assert.ok(Math.abs(originY + vector.y * (1.5 + profile.speed * t) - 6 * t) < .01);
  }
  closest.age = 0; assert.equal(predictiveAim(model).targetId, closest.id, 'spawn warnings remain valid shooting targets');
  closest.hp = 0; assert.notEqual(predictiveAim(model).targetId, closest.id, 'dead targets are ignored');
  model.enemies = []; assert.equal(predictiveAim(model).shooting, false);
});

test('out-of-range nearest targets are still targeted and do not redirect fire to a farther enemy', () => {
  const model = new GameModel(seeded(3)); model.start();
  model.weapons = [{ id: 'flame', level: 1, rarity: 'common' }];
  const closest = enemyAt(model, 30, 0); enemyAt(model, -40, 0);
  const result = predictiveAim(model);
  assert.equal(result.targetId, closest.id); assert.equal(result.shooting, true); assert.ok(result.aim.x > .9);
});

test('per-weapon inputs change projectile directions only; ordinary shared aim keeps existing behavior', () => {
  const make = () => { const m = new GameModel(seeded(4)); m.start(); m.weapons = [{ id: 'needle', level: 1, rarity: 'common' }, { id: 'rail', level: 1, rarity: 'common' }]; return m; };
  const manual = make(); manual.step(.04, { ...idle, shooting: true });
  assert.equal(manual.bullets.length, 2); assert.ok(manual.bullets.every(b => b.vx > 0 && b.vy === 0));
  const bot = make(); bot.step(.04, { ...idle, shooting: true, weaponAim: { rail: { x: 0, y: 1 } } });
  assert.equal(bot.player.angle, 0); assert.ok(bot.bullets.find(b => b.style === 'needle').vx > 0); assert.ok(bot.bullets.find(b => b.style === 'rail').vy > 0);
  assert.deepEqual(bot.bullets.map(b => [b.damage, Math.hypot(b.vx, b.vy)]), manual.bullets.map(b => [b.damage, Math.hypot(b.vx, b.vy)]));
});

test('controller delays rewards/restarts and cannot act while off, manually paused, or backgrounded', () => {
  const model = new GameModel(seeded(5)), bot = new AutoplayController();
  assert.equal(bot.update(model, .04).restart, undefined); bot.setEnabled(true); assert.equal(bot.update(model, .04).restart, true);
  model.start(); model.status = 'reward';
  model.rewards = [{ id: 'hull', key: 'relic:hull', type: 'relic', name: 'Hull', rarity: 'common', category: 'SUPPLY', description: '', relicId: 'hull', amount: 1 }];
  for (let i = 0; i < 20; i++) assert.equal(bot.update(model, .04).rewardId, undefined);
  for (let i = 0; i < 100; i++) assert.equal(bot.update(model, .04, false).rewardId, undefined);
  for (let i = 0; i < 27; i++) assert.equal(bot.update(model, .04).rewardId, undefined);
  assert.equal(bot.update(model, .04).rewardId, 'hull');
  model.status = 'paused'; for (let i = 0; i < 100; i++) assert.deepEqual(bot.update(model, .04).input, idleForBot());
  assert.equal(model.status, 'paused');
  model.status = 'over'; for (let i = 0; i < 62; i++) assert.equal(bot.update(model, .04).restart, false);
  assert.equal(bot.update(model, .04).restart, true);
  bot.setEnabled(false); assert.deepEqual(bot.update(model, .04), { input: idleForBot() });
});
const idleForBot = () => ({ move: { x: 0, y: 0 }, aim: { x: 0, y: 1 }, shooting: false });

test('movement forecasts contact and respects acceleration and narrow arena boundaries without mutating the model', () => {
  const model = new GameModel(seeded(19)); model.start(); model.setBounds(36, 60); model.invulnerable = 0;
  model.player.x = 15.5; model.player.vx = 18;
  enemyAt(model, 13, 6, 'chaser'); enemyAt(model, 9, -3, 'spinner');
  const bot = new AutoplayController(); bot.setEnabled(true);
  const before = JSON.stringify(model), first = bot.update(model, .04);
  assert.equal(JSON.stringify(model), before, 'decisions must not alter health, enemy state, random, weapons or position');
  assert.ok(first.input.move.x < 0, 'must turn away from the nearby wall despite inertia');
  for (let i = 0; i < 30; i++) {
    const action = bot.update(model, .04); model.step(.04, { ...action.input, shooting: false });
    assert.ok(Math.abs(model.player.x) <= 16.2 && Math.abs(model.player.y) <= 28.2);
  }
  assert.equal(model.lives, 3, 'movement alone evades the approaching hazards');
});

test('reward policy values survival at one life, actual upgrade benefit and recurring defenses', () => {
  const model = new GameModel(seeded(7)); model.start(); model.lives = 1;
  const relic = (id, amount = 1) => ({ id, key: `relic:${id}`, type: 'relic', name: id, rarity: 'common', category: '', description: '', relicId: id, amount });
  model.rewards = [relic('salvage', .3), relic('glass', .65), relic('hull')];
  assert.equal(chooseAutoplayReward(model).relicId, 'hull');
  model.lives = 3; model.rewards = [relic('salvage', .3), relic('battery'), relic('vampire')];
  assert.equal(chooseAutoplayReward(model).relicId, 'vampire');
  const upgrade = { id: 'up', key: 'upgrade:needle', type: 'upgrade', name: '', rarity: 'legendary', category: '', description: '', weaponId: 'needle', amount: 3 };
  assert.ok(rewardScore(model, upgrade) > rewardScore(model, relic('salvage', .3)));
});

test('untouched seeded runs autonomously clear five waves and draft both weapons through normal inputs', () => {
  for (const seed of [1, 7, 42]) {
    const model = new GameModel(seeded(seed)), bot = new AutoplayController(); bot.setEnabled(true); model.start();
    for (let frame = 0; frame < 7500 && model.wave < 6 && model.status !== 'over'; frame++) {
      const action = bot.update(model, .04);
      if (action.bomb) assert.equal(model.bomb(), true);
      if (action.rewardId) assert.equal(model.chooseReward(action.rewardId), true);
      model.step(.04, action.input); model.events = [];
    }
    assert.equal(model.wave, 6, `seed ${seed}`); assert.equal(model.weapons.length, 2); assert.ok(model.lives >= 2, `seed ${seed} preserves lives`);
  }
});
