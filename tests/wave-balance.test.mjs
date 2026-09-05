import test from 'node:test';
import assert from 'node:assert/strict';
import { GameModel, MAX_ACTIVE_ENEMIES, getWaveTuning } from '../lib/game-model.ts';
const idle = { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, shooting: false };
function seeded(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function perfectShot(game) {
  for (const e of game.enemies) game.bullets.push({ id: -e.id, x: e.x - 1, y: e.y, vx: 120, vy: 0, age: 0, damage: 100000 });
}
function pick(game) { if (game.status === 'reward') game.chooseReward((game.rewards.find(r => r.type === 'weapon' || r.type === 'upgrade') ?? game.rewards.find(r => r.relicId !== 'glass')).id); }
function advanceTo(game, target) {
  for (let i = 0; i < 40000 && game.wave < target; i++) { perfectShot(game); game.step(.05, idle); game.events = []; pick(game); }
  assert.equal(game.wave, target);
}

test('the first 20 waves last longer even with perfect shooting, with growing multi-edge bursts', () => {
  const game = new GameModel(seeded(7)); game.start(); game.invulnerable = 10000;
  const records = new Map(), seen = new Set();
  let spawnedThisStep = []; const spawn = game.spawnEnemy.bind(game);
  game.spawnEnemy = (...args) => { const e = spawn(...args); spawnedThisStep.push({ ...e }); return e; };
  for (let frame = 0; frame < 40000 && game.wave <= 20; frame++) {
    const wave = game.wave;
    let record = records.get(wave);
    if (!record) { record = { start: game.time, end: 0, firstSpawn: null, lastSpawn: 0, count: 0, largestBurst: 0, sides: new Set() }; records.set(wave, record); }
    spawnedThisStep = []; perfectShot(game); game.step(.05, idle); game.events = [];
    let burst = 0;
    for (const e of spawnedThisStep) if (!seen.has(e.id)) {
      seen.add(e.id); record.count++; burst++;
      record.firstSpawn ??= game.time; record.lastSpawn = game.time;
      if (Math.abs(e.x) >= game.width / 2 - 2.01) record.sides.add(e.x < 0 ? 'left' : 'right');
      else record.sides.add(e.y < 0 ? 'bottom' : 'top');
    }
    record.largestBurst = Math.max(record.largestBurst, burst);
    if (game.status === 'reward') { record.end = game.time; pick(game); }
  }
  assert.equal(game.wave, 21, 'All 20 waves should remain finite and clearable.');
  let previousDuration = 0;
  for (const [wave, record] of records) {
    const duration = record.end - record.start;
    assert.ok(duration > previousDuration, `Wave ${wave} must outlast the previous wave, even with immediate kills.`);
    assert.ok(record.lastSpawn - record.firstSpawn >= getWaveTuning(wave).spawnDuration - .1, `Wave ${wave} must keep spawning for its full assault period.`);
    assert.equal(record.count, getWaveTuning(wave).enemyCount, 'No enemies can be skipped.');
    assert.equal(record.sides.size, 4, 'Assaults must use every edge.');
    previousDuration = duration;
  }
  assert.ok(records.get(1).end - records.get(1).start >= 25);
  assert.ok(records.get(10).end - records.get(10).start >= 36);
  assert.ok(records.get(20).end - records.get(20).start >= 47);
  assert.ok(records.get(5).count >= 2.5 * records.get(1).count);
  assert.ok(records.get(10).count >= 7 * records.get(1).count);
  assert.ok(records.get(20).count >= 2 * records.get(10).count);
  assert.ok(records.get(5).largestBurst >= 3);
  assert.ok(records.get(10).largestBurst >= 5);
  assert.ok(records.get(20).largestBurst >= 8);
});

test('later waves have increasingly faster hunters and a harder enemy mix', () => {
  const levels = [1, 5, 10, 20].map(getWaveTuning);
  assert.ok(8 + levels[2].speedBonus > 15, 'Wave 10 hunters need to close distance much faster.');
  assert.ok(8 + levels[3].speedBonus > 22, 'Wave 20 hunters should outrun the ship on a straight line.');
  assert.ok(9 + levels[1].speedBonus >= 20, 'Wave 5 hunters must nearly match base ship speed.');
  assert.ok(getWaveTuning(3).eliteChance > 0);
  assert.ok(getWaveTuning(3).enemyCount >= 130);
  assert.ok(levels[3].health > levels[2].health * 2);
  assert.ok(levels[3].drifterChance <= .1);
  assert.ok(levels[3].spinnerChance >= .4);
  assert.ok(levels[2].interceptTime > 0);
  for (let i = 1; i < levels.length; i++) {
    assert.ok(levels[i].speedBonus >= levels[i - 1].speedBonus);
    assert.ok(levels[i].pursuitResponse >= levels[i - 1].pursuitResponse);
    assert.ok(levels[i].spinnerChance >= levels[i - 1].spinnerChance);
    assert.ok(levels[i].drifterChance <= levels[i - 1].drifterChance);
  }
  // Verify that the actual spawn selection follows the changing mix.
  const game = new GameModel(seeded(12)); game.start();
  const sample = wave => { game.wave = wave; const counts = { drifter: 0, chaser: 0, spinner: 0 }; for (let i = 0; i < 4000; i++) { counts[game.spawnEnemy().kind]++; game.enemies = []; } return counts; };
  const early = sample(1), late = sample(20);
  assert.equal(early.spinner, 0);
  assert.ok(late.spinner > 1500 && late.drifter < 500 && late.chaser > 1500);
});

test('a crowded late wave stays bounded without dropping its queued enemies', () => {
  const game = new GameModel(seeded(14)); game.start(); game.invulnerable = 10000;
  advanceTo(game, 20); const killsBefore = game.kills;
  for (let i = 0; i < 2000; i++) { game.step(.05, idle); game.events = []; assert.ok(game.enemies.length <= MAX_ACTIVE_ENEMIES); }
  assert.equal(game.enemies.length, MAX_ACTIVE_ENEMIES);
  assert.equal(game.wave, 20, 'A wave cannot finish while enemies are queued.');
  game.bomb();
  assert.equal(game.enemies.length, 0);
  game.step(.05, idle);
  assert.ok(game.enemies.length <= getWaveTuning(20).burstSize, 'Clearing the cap must not release a catch-up flood.');
  advanceTo(game, 21);
  assert.equal(game.kills - killsBefore, getWaveTuning(20).enemyCount, 'Every queued enemy still has to be defeated.');
});

test('multi-edge burst spawns keep the same warning time and safety distance', () => {
  const game = new GameModel(seeded(42)); game.start(); game.wave = 20; game.setBounds(36, 60);
  game.player.x = 15; game.player.y = 24; game.invulnerable = 0;
  for (let side = 0; side < 4; side++) for (let i = 0; i < 100; i++) {
    const e = game.spawnEnemy(undefined, side);
    assert.ok(Math.hypot(e.x - game.player.x, e.y - game.player.y) >= 18);
    assert.equal(e.age, 0);
  }
  game.enemies = [];
  const e = game.spawnEnemy('chaser'); e.x = game.player.x; e.y = game.player.y;
  for (let i = 0; i < 15; i++) game.step(.05, idle);
  assert.equal(game.lives, 3, 'Even fast hunters cannot collide before their spawn warning ends.');
});
