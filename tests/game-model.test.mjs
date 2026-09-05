import test from 'node:test';
import assert from 'node:assert/strict';
import { GameModel } from '../lib/game-model.ts';
const idle = { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, shooting: false };
const newGame = () => { const g = new GameModel(() => .5); g.start(); return g; };
const enemyAt = (g, x, y, kind = 'drifter') => { const e = g.spawnEnemy(kind); e.x = x; e.y = y; e.age = 2; e.vx = 0; e.vy = 0; return e; };
test('new runs reset gameplay while retaining the personal best', () => {
  const g = newGame(); g.score = 5000; g.best = 5000; g.lives = 1; g.bombs = 0; g.wave = 8; g.start();
  assert.deepEqual(g.snapshot(), { status: 'playing', score: 0, best: 5000, lives: 3, bombs: 3, wave: 1, multiplier: 1, kills: 0, time: 0, waveBanner: true });
});
test('paused and finished runs do not advance or consume bombs', () => {
  const g = newGame(); g.pause(); const before = g.snapshot(); g.step(1, idle); assert.equal(g.bomb(), false); assert.deepEqual(g.snapshot(), before);
  g.resume(); g.step(.01, idle); assert.equal(g.status, 'playing'); assert.ok(g.time > 0);
  g.status = 'over'; const after = g.snapshot(); g.step(.05, idle); assert.equal(g.bomb(), false); assert.deepEqual(g.snapshot(), after);
});
test('diagonal movement is normalized and remains inside arena bounds', () => {
  const a = newGame(), b = newGame(); a.setBounds(1000, 1000); b.setBounds(1000, 1000);
  for (let i = 0; i < 30; i++) { a.step(1 / 60, { ...idle, move: { x: 1, y: 0 } }); b.step(1 / 60, { ...idle, move: { x: 1, y: 1 } }); }
  assert.ok(Math.abs(a.player.x - Math.hypot(b.player.x, b.player.y)) < .001);
  a.setBounds(40, 60); for (let i = 0; i < 300; i++) a.step(1 / 60, { ...idle, move: { x: 1, y: 1 } });
  assert.ok(a.player.x <= 18.2 && a.player.y <= 28.2);
});
test('swept bullets hit enemies crossed between frames', () => {
  const g = newGame(); enemyAt(g, 2, 0); g.bullets.push({ id: 999, x: 0, y: 0, vx: 100, vy: 0, age: 0 }); g.step(.05, idle);
  assert.equal(g.enemies.length, 0); assert.equal(g.score, 100); assert.equal(g.kills, 1); assert.equal(g.bullets.length, 0);
});
test('bombs remove enemies, award points, and stop after three uses', () => {
  const g = newGame(); enemyAt(g, 15, 10, 'drifter'); enemyAt(g, -15, -10, 'chaser'); enemyAt(g, 10, -15, 'spinner');
  assert.equal(g.bomb(), true); assert.equal(g.enemies.length, 0); assert.equal(g.score, 600); assert.equal(g.bombs, 2);
  g.bomb(); g.bomb(); assert.equal(g.bombs, 0); assert.equal(g.bomb(), false); assert.equal(g.bombs, 0);
});
test('five kills increase the multiplier and collision resets it', () => {
  const g = newGame(); for (let i = 0; i < 5; i++) enemyAt(g, 15 + i, 10); g.bomb(); assert.equal(g.multiplier, 2);
  enemyAt(g, 10, 10); g.bomb(); assert.equal(g.score, 700);
  g.invulnerable = 0; enemyAt(g, 0, 0); g.step(.01, idle); assert.equal(g.multiplier, 1); assert.equal(g.lives, 2);
});
test('respawn grace prevents repeated life loss and the third hit ends the run', () => {
  const g = newGame();
  for (let i = 0; i < 3; i++) { g.invulnerable = 0; enemyAt(g, g.player.x, g.player.y); g.step(.01, idle); assert.equal(g.lives, 2 - i);
    if (i < 2) { enemyAt(g, 0, 0); g.step(.01, idle); assert.equal(g.lives, 2 - i); }
  }
  assert.equal(g.status, 'over');
});
test('spawning enemies cannot damage the player during their warning animation', () => {
  const g = newGame(); g.invulnerable = 0; const e = enemyAt(g, 0, 0); e.age = 0; g.step(.01, idle); assert.equal(g.lives, 3);
});
test('enemy spawns keep a safe distance from the player', () => {
  for (let i = 0; i < 100; i++) { const g = new GameModel(); g.setBounds(36, 60); g.start(); g.player.x = 15; g.player.y = 24; const e = g.spawnEnemy(); assert.ok(Math.hypot(e.x - 15, e.y - 24) >= 18); }
});
test('clearing the finite first wave advances to wave two', () => {
  const g = newGame(); g.invulnerable = 100;
  for (let i = 0; i < 2000 && g.wave === 1; i++) { g.step(.02, idle); for (const e of g.enemies) { g.bullets.push({ id: 10000 + i, x: e.x - 1, y: e.y, vx: 100, vy: 0, age: 0 }); } }
  assert.equal(g.wave, 2); assert.equal(g.kills, 24); assert.ok(g.waveBanner > 0);
});
test('invalid time steps cannot corrupt game state and long frames are bounded', () => {
  const g = newGame(); g.step(NaN, idle); g.step(Infinity, idle); g.step(-1, idle); assert.equal(g.time, 0); g.step(10, idle); assert.equal(g.time, .05);
});
