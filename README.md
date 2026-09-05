# Geometry Conflict

A Geometry Wars inspired roguelike arena shooter built with Three.js, React, and Vinext. Neon wireframes, an animated grid, bloom, particle effects, and synthesized weapon audio.

## Play

- **WASD / arrows:** move. **Mouse + hold click:** aim and fire. **IJKL:** keyboard aiming and firing.
- **Space:** use a bomb. **P / Escape:** pause or resume. **Enter:** start or replay.
- **After a wave:** click a reward or press **1 / 2 / 3**. Press **R** to reroll all three choices.
- **Touch:** left thumb moves; right thumb aims and shoots. Tap the lightning button to use a bomb. Reward cards and rerolls work by touch.

You start with the Needle's single stream, three lives, three bombs, and **two rerolls for the entire run**. Score multipliers never upgrade the weapon.

Wave one always ends with three different weapon choices from a pool of **ten weapons**. The two initial rerolls expose nine different weapons. Each subsequent wave ends with three choices: weapon upgrades, alternate weapons, or items from a pool of **36 relics**. Extra rerolls are obtainable as selected rewards and carry between waves.

Rewards come in common, uncommon, rare, epic, and legendary qualities. Weapons level up only through chosen upgrades, to level 8. Upgrades can also raise weapon rarity. At maximum level, non-legendary weapons can still receive quality upgrades. Replacement weapons start at the level shown on their card; all collected relics remain active. Every new run resets the build and rerolls. Only personal best and sound preference persist on your device.

## Arsenal and combinations

Pulse Repeater, Trident, Scatter Cannon, Rail Lance, Seeker Array, Prism Driver, Nova Ring, Cinder Jet, Arc Emitter, and Sunburst Mortar have distinct shot patterns and behaviors.

Relics modify damage, fire rate, crits, movement, projectile size and speed, piercing, ricochets, homing, explosions, chains, fire, frost, knockback, shields, lives, bombs, rerolls, luck, orbitals, and conditional bonuses. Examples include a homing shotgun, burning ricochets, or a shield-powered railgun. Five named combinations are displayed when active: Thermal Shock, Thunderstorm, Deadeye, Predator, and Fortress.

The research and specific inspiration from **Hades, Enter the Gungeon, and Ravenswatch** are documented with citations in [docs/roguelike-design.md](docs/roguelike-design.md).

## Faster difficulty curve

| Wave | Enemies | Spawn period | Burst size | Base chaser speed |
| --- | ---: | ---: | ---: | ---: |
| 1 | 36 | 24 seconds | 1 | 9.0 |
| 2 | 80 | 25.1 seconds | 3 | 11.7 |
| 3 | 134 | 26.2 seconds | 5 | 14.4 |
| 5 | 272 | 28.4 seconds | 9 | 20.3 |
| 10 | 792 | 33.9 seconds | 12 | 36.0 |

The unmodified ship moves at 22 units per second. Elites appear from wave 3 with a gold outline, larger size, triple health, and a speed bonus. Enemy health, density, pursuit, and elite frequency rise quickly. A crowded arena pauses the spawn queue instead of dropping enemies. Spawn warning time and safe spawn distance remain consistent.

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
- `tests/`: simulation tests covering the initial draft, rerolls, selection validation, upgrades, every weapon, relic effects, combat combinations, crowd caps, and 20-wave progression.

Browser focus loss pauses combat. Reward selection freezes gameplay and survival time. The interface supports keyboard, touch, fullscreen, graphics-error recovery, and reduced-motion preferences. No browser interaction testing was requested; simulation tests and compilation do not establish subjective gameplay balance or visual QA.

Optional WebMCP tools expose `get_game_status`, `control_game`, `choose_wave_reward`, and `reroll_wave_rewards` when `document.modelContext` is supported. No live WebMCP validation context was available, so that optional integration has not been verified in a browser.
