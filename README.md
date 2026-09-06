# Geometry Conflict

A Geometry Wars inspired roguelike arena shooter built with Three.js, React, and Vinext. Neon wireframes, an animated grid, bloom, particle effects, and synthesized weapon audio.

## Play

- **WASD / arrows:** move. **Mouse + hold click:** aim and fire. **IJKL:** keyboard aiming and firing.
- **Space:** use a bomb. **P / Escape:** pause or resume. **Enter:** start or replay.
- **After a wave:** click a reward or press **1 / 2 / 3**. Press **R** to reroll all three choices.
- **Touch:** left thumb moves; right thumb aims and shoots. Tap the lightning button to use a bomb. Reward cards and rerolls work by touch.

You start with the Needle's single stream, three lives, three bombs, and **two rerolls for the entire run**. Score multipliers never upgrade the weapon.

Wave one always ends with three different weapon choices from a pool of **ten weapons**. The two initial rerolls expose nine different weapons. Wave five is the only other weapon draft: three choices from the nine weapons you do not own. This adds a second weapon that fires alongside your first. Waves 2–4 and every wave after 5 offer only upgrades for equipped weapons or items from a pool of **36 relics**. Rerolls always stay within the current draft type. Extra rerolls are obtainable as selected rewards and carry between waves.

Rewards come in common, uncommon, rare, epic, and legendary qualities. Weapons level up only through chosen upgrades, to level 8. Upgrades can also raise weapon rarity. At maximum level, non-legendary weapons can still receive quality upgrades. The wave-one choice replaces the Needle at level 1. The wave-five choice adds a level-2 weapon while preserving the first weapon’s level and rarity. Each weapon has its own firing cadence and targeted level upgrades. Shared damage, fire-rate, and projectile-effect relics apply to both. No further weapon additions or swaps are offered. Every new run resets the build and rerolls. Only personal best and sound preference persist on your device.

## Arsenal and combinations

Pulse Repeater, Trident, Scatter Cannon, Rail Lance, Seeker Array, Prism Driver, Nova Ring, Cinder Jet, Arc Emitter, and Sunburst Mortar have distinct shot patterns and behaviors.

Relics modify damage, fire rate, crits, movement, projectile size and speed, piercing, ricochets, homing, explosions, chains, fire, frost, knockback, shields, lives, bombs, rerolls, luck, orbitals, and conditional bonuses. Examples include a homing shotgun, burning ricochets, or a shield-powered railgun. Five named combinations are displayed when active: Thermal Shock, Thunderstorm, Deadeye, Predator, and Fortress.

The research and specific inspiration from **Hades, Enter the Gungeon, and Ravenswatch** are documented with citations in [docs/roguelike-design.md](docs/roguelike-design.md).

## Difficulty curve

| Wave | Enemies | Spawn period | Burst size | Base chaser speed |
| --- | ---: | ---: | ---: | ---: |
| 1 | 36 | 24 seconds | 1 | 9.0 |
| 2 | 74 | 25.1 seconds | 3 | 10.4 |
| 3 | 134 | 26.2 seconds | 5 | 11.7 |
| 4 | 198 | 27.3 seconds | 7 | 13.1 |
| 5 | 272 | 28.4 seconds | 9 | 14.4 |
| 10 | 792 | 33.9 seconds | 12 | 20.0 |

The first balance adjustment raises all ten selectable weapons’ base damage by 20% (including Cinder Jet’s burn) and trims wave 2 from 80 enemies to 74. Weapon upgrade scaling stays the same. Future balance passes should remain incremental, guided by play feedback.

The unmodified ship moves at 22 units per second. Elites appear from wave 3 with a gold outline, larger size, triple health, and a speed bonus. Chaser speed now rises by 1.35 units per wave, capped at 20 (21.6 for elites), below the unmodified ship’s speed of 22. Predictive pursuit begins at wave 5 and grows to a maximum 0.3-second lead. Enemy health, density, and elite frequency continue to escalate. A crowded arena pauses the spawn queue instead of dropping enemies. Spawn warning time and safe spawn distance remain consistent.

## Development and validation

Requires Node.js 22.13+ and npm.

```sh
npm install
npm run dev
npm test
npx tsc --noEmit
npm run build
```

- `lib/roguelike.ts`: weapon definitions, relic catalog, rarity, and derived weapon profiles.
- `lib/game-model.ts`: deterministic combat, rewards, shared rerolls, effects, and progression.
- `lib/game-engine.ts`: Three.js rendering, input, transient effects, and audio.
- `components/reward-screen.tsx`: the three-card selection interface.
- `tests/`: simulation tests covering both weapon drafts, every weapon pair, rerolls, selection validation, upgrades, every weapon, relic effects, combat combinations, crowd caps, and 20-wave progression.

Browser focus loss pauses combat. Reward selection freezes gameplay and survival time. The interface supports keyboard, touch, fullscreen, graphics-error recovery, and reduced-motion preferences. No browser interaction testing was requested; simulation tests and compilation do not establish subjective gameplay balance or visual QA.

Optional WebMCP tools expose `get_game_status`, `control_game`, `choose_wave_reward`, and `reroll_wave_rewards` when `document.modelContext` is supported. No live WebMCP validation context was available, so that optional integration has not been verified in a browser.
