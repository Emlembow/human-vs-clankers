import test from 'node:test';
import assert from 'node:assert/strict';
import { GameModel, MAX_ACTIVE_ENEMIES, MAX_BULLETS } from '../lib/game-model.ts';
import { WEAPONS } from '../lib/roguelike.ts';

test('every weapon handles a crowded arena with combined projectile and elemental effects', () => {
  for (const weapon of WEAPONS) {
    const g = new GameModel(() => .5); g.start(); g.weapon = { id: weapon.id, level: 8, rarity: 'legendary' }; g.invulnerable = 10000;
    Object.assign(g.stats, { fireRate: 3, pierce: 3, bounces: 3, homing: 3, blast: 3, chain: 3, burn: 2, slow: .5, crit: .6, rebound: .5, orbitals: 6 });
    for (let i = 0; i < MAX_ACTIVE_ENEMIES; i++) { const e = g.spawnEnemy(); e.x = Math.cos(i * 2.4) * (5 + i % 28); e.y = Math.sin(i * 2.4) * (5 + i % 20); e.hp = e.maxHp = 1000; e.age = 1; }
    for (let i = 0; i < 120; i++) {
      g.step(1 / 60, { move: { x: 0, y: 0 }, aim: { x: Math.cos(i / 10), y: Math.sin(i / 10) }, shooting: true });
      assert.ok(g.bullets.length <= MAX_BULLETS); assert.ok(g.enemies.length <= MAX_ACTIVE_ENEMIES);
      assert.ok(g.bullets.every(b => Number.isFinite(b.x + b.y + b.damage)));
      assert.ok(g.enemies.every(e => Number.isFinite(e.hp + e.x + e.y)));
      g.events = [];
    }
  }
});
