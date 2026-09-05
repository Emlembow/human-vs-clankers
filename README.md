# Geometry Conflict

A Geometry Wars inspired arcade survival game built with Three.js, React, and Vinext. Original neon wireframe visuals, an animated arena grid, bloom, particle explosions, and synthesized sound.

## Play

- **WASD / arrow keys:** move.
- **Mouse:** aim; hold the primary button to shoot.
- **IJKL:** aim and shoot using the keyboard.
- **Space:** use one of three bombs to clear enemies.
- **P / Escape:** pause or resume.
- **Enter:** start or replay.
- **Touch:** drag the left half to move and the right half to aim and shoot. Tap the lightning button for a bomb.

Defeat each wave to advance. Five consecutive kills raise your multiplier, up to 8×. At 5× your weapon fires a wider spread. Collisions consume one of three lives, reset the multiplier, and grant temporary protection. The personal best and sound preference are saved only on your device.

## Development

Requires Node.js 22.13+ and npm.

```sh
npm install
npm run dev
npm run build
npm test
npx tsc --noEmit
```

`lib/game-model.ts` is the deterministic, rendering-independent simulation. `lib/game-engine.ts` connects Three.js rendering, input, particles, and audio. `app/page.tsx` contains the game interface. The test suite covers movement, swept collisions, lives, bombs, safe spawning, wave progression, pauses, and run reset.

The UI handles graphics failures with a reload action. Audio starts after a user gesture. Browser focus loss pauses gameplay. Touch controls and reduced-motion preferences are supported. Three.js loads separately from the initial interface.

## Validation

The production build, TypeScript check, and 11 simulation tests pass. Browser interaction testing was not requested and has not been performed.

The optional WebMCP interface feature-detects `document.modelContext`, exposing `get_game_status` and `control_game`. No supported live WebMCP validation context was available; that optional integration has not been verified in a browser.
