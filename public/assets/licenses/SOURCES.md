# Man vs. Clankers — Creative Commons artwork credits

Selected from the Poly asset library source catalog. Robot and yard artwork downloaded 2026-09-06; boss and chest meshes ingested 2026-09-07. Runtime assets are served locally with the game; no third-party asset URL is fetched by players. The robot model is CC BY 3.0; Poly Haven and Kenney artwork is CC0. Quaternius boss packs are labeled CC0 on their pack pages and are also covered by QAL v1.0 (commercial OK, no attribution required, no standalone redistribution). Downloaded robot geometry and survivor armor use Poly Haven surface wear.

## Robot model attribution — OB3M9

**“OB3M9” by Giuseppe Zemba**, obtained through [Poly Pizza](https://poly.pizza/m/5vuAnGYains), is licensed under [Creative Commons Attribution 3.0 Unported (CC BY 3.0)](https://creativecommons.org/licenses/by/3.0/).

- Original model: `assets/robots/ob3m9-source.glb` (1,413,700 bytes, 18,756 triangles).
- Runtime derivative: `assets/robots/ob3m9.glb` (636,204 bytes, 8,036 triangles).
- Source GLB download: https://static.poly.pizza/b3aa5335-404e-4405-b3b5-321584d968cc.glb.br — HTTP content decoding yields the original GLB.
- Changes made for **Man vs. Clankers**: offline mesh simplification while preserving the original rigid parts; conversion from Y-up / +Z-facing to Z-up / +X-facing; uniform height normalization; arms relaxed downward from the source T-pose; mesh parts grouped into a head, torso, two arms and two legs for rigid-joint walking animation; a pale silver/ivory vertex-color palette with dark joints, weathered PBR surfaces and status lights; wider silhouettes for readability (1.8× on the ground-plane axes and 1.15× vertically, in addition to role proportions), with larger elite variants (a further 1.4× horizontally and 1.05× vertically). No original author endorsement is implied.
- All three enemy types use this actual model geometry with the same pale silver/ivory material palette, distinct proportions and walking cadence.
- The source is unrigged: the simple mechanical walk in the game is original rigid-part animation, not an imported animation clip.

The closed-by-default **Credits** disclosure at the bottom of the game shell contains creator, source, license and modification details. It is also available in fullscreen. Opening it pauses an active run; closing it does not resume the run. The scrollable credits panel links to this source document and the file manifests. The original source and derivative have independent SHA-256 entries in `manifest.json`.

## Poly Haven — photographed PBR surfaces, HDR lighting and model

Poly Haven's license covers its HDRIs, textures and models under CC0: https://polyhaven.com/license
CC0 deed: https://creativecommons.org/publicdomain/zero/1.0/

| Asset | Artist | Product URL | Runtime use |
|---|---|---|---|
| Concrete Floor Worn 02 | Dimitrios Savva | https://polyhaven.com/a/concrete_floor_worn_02 | Photographed worn concrete diffuse, OpenGL normals, and packed ambient-occlusion/roughness maps across the yard floor. 1K JPG maps. |
| Rusty Metal 02 | Rob Tuytel | https://polyhaven.com/a/rusty_metal_02 | Diffuse, OpenGL normals and packed ARM maps on physical perimeter steel; shared normal/roughness/AO wear on survivor armor and machine hulls. 1K JPG maps. |
| Factory Yard | Sergej Majboroda | https://polyhaven.com/a/factory_yard | 1K RGBE HDR environment for realistic metal reflections and indirect light. |
| Barrel 03 | Serhii Khromov | https://polyhaven.com/a/barrel_03 | Actual glTF barrel model with diffuse, OpenGL normal and packed metal/rough maps, reused at the yard edges. 1,473 source triangles, 1K JPG maps. |

Asset file metadata and URLs were retrieved from `https://api.polyhaven.com/assets` and `https://api.polyhaven.com/files/{asset_id}`. Every downloaded file's MD5 matched the official API record before intake. Source files are unmodified; the barrel is rotated from glTF Y-up into the game's Z-up world, centered, and scaled at runtime to 1.8 world units high. HDR lighting has no background image, so aiming contrast remains stable. Texture repeat, tint, light intensity and normal strength are renderer settings, not edits to the source images.

The previous Metal Plate floor normal/ARM maps are no longer deployed. Its diffuse photograph remains as a subtle UI panel texture: Metal Plate by Rob Tuytel, https://polyhaven.com/a/metal_plate, CC0 under the same Poly Haven license. The three-dimensional arena itself now uses concrete.

## Kenney — Particle Pack 1.1

- Author: Kenney Vleugels (Kenney.nl)
- Product: https://kenney.nl/assets/particle-pack
- License: CC0 — https://creativecommons.org/publicdomain/zero/1.0/
- Original license and additional credits: `kenney-particles.txt`
- Files from `PNG (Transparent)/`: `circle_05.png`, `flare_01.png`, `smoke_01.png`
- Use: warm impact sparks, restrained flash cores, grey explosion smoke and drifting yard dust. Unmodified 512-pixel transparent PNGs.

Exact download URLs, archive entries, sizes and SHA-256 checksums for all runtime source files are in `manifest.json`.

[credits.json](credits.json) is the Creative Commons / QAL artwork index shown in the game. All 18 original yard artwork files remain mapped in [manifest.json](manifest.json), including the original OB3M9 reference and its runtime derivative. Boss GLBs and Kenney chest files are listed in credits.json and the intake notes below.

## Boss and chest intake — 2026-09-07 (T004/A01)

Archives were kept outside `public/` at `/tmp/gc-t004-intake/`. Only optimized runtime GLBs were copied into `assets/bosses/` and `assets/drops/`. No Unity Kaiju, BuzPin, or OB3M9 derivatives were used.

**Shared conversion:** prefer delivered GLB; otherwise Blender 5.2 FBX → GLB. Rigid props (Toon tank, Insurgent, Kenney chest) stay baked Z-up. Skinned and newly ingested machines keep author bind poses. Runtime (`lib/boss-render.ts`) applies Y-up → Z-up (`rotation.x = π/2`), plays the walk/idle/run clip, samples the **posed** world AABB, scales on the post-rotation height axis (Z), and re-grounds so the mesh stands on Z=0. `npx @gltf-transform/cli optimize --compress draco --texture-compress webp` was run on every hosted file. Hosted GLBs use `KHR_draco_mesh_compression`; the game loads them with Three.js `DRACOLoader` and the glTF decoder files in `assets/draco/`.

## Regular bosses retargeted to machines — 2026-09-07 (T009/A01)

Dinosaur and organic-creature regulars were removed. All nine regulars are industrial hardware. Jelly Prince stays the 1% egg.

| BossId | Display name | Inner filename chosen | Hosted path | Source URL | Notes |
|---|---|---|---|---|---|
| `brood-apa` | Foundry Walker | `FBX/Stan.fbx` + `Textures/Stan_Texture.png` | `assets/bosses/brood-apa.glb` | https://quaternius.com/packs/animatedmech.html | Official OGA zip `animated_mech_pack_-_march_2021.zip`. Tall command walker. Clips include Walk / Run / Idle. |
| `accel-rex` | Rampage Chassis | `FBX/Mike.fbx` + `Textures/Mike_Texture.png` | `assets/bosses/accel-rex.glb` | same mech pack | Wide aggressive mech with Run. Replaces T-rex. |
| `ember-hide` | Ember Furnace | `FBX/George.fbx` + `Textures/George_Texture.png` | `assets/bosses/ember-hide.glb` | same mech pack | Armored mech. Replaces Goleling. |
| `trample-stego` | Plate Hauler | `Round Rover.glb` | `assets/bosses/trample-stego.glb` | https://quaternius.com/packs/ultimatespacekit.html | Official-kit GLB zip. Wide wheeled vehicle. Replaces Stegosaurus. |
| `pierce-skitter` | Phase Crawler | `FBX/Laser_Quad.fbx` | `assets/bosses/pierce-skitter.glb` | https://quaternius.com/packs/turretpack.html | Official OGA zip `turret_pack_by_quaternius.zip`. Multi-barrel turret. Replaces Armabee. |
| `lock-wraith` | Lock Drone | `Omen/FBX/Omen.fbx` + `Omen_Orange.png` | `assets/bosses/lock-wraith.glb` | https://quaternius.com/packs/ultimatespaceships.html | Official OGA zip `ultimate_spaceships_-_may_2021.zip`. Sleek stealth hull. Replaces cute Alien. |
| `sky-leviathan` | Sky Leviathan | `Executioner/FBX/Executioner.fbx` + `Executioner_Blue.png` | `assets/bosses/sky-leviathan.glb` | same spaceship pack | Flying machine airframe. Replaces planet fallback. |
| `camp-breaker` | Yardbreaker | Toon Shooter **Tank** GLB | `assets/bosses/camp-breaker.glb` | https://quaternius.com/packs/toonshootergamekit.html | Unchanged industrial tank. |
| `open-raider` | Open-Field Raider | `Insurgent/FBX/Insurgent.fbx` + `Insurgent_Blue.png` | `assets/bosses/open-raider.glb` | https://quaternius.com/packs/ultimatespaceships.html | Unchanged industrial hull. |
| `jelly-prince` | Jelly Prince | `FBX/Mushroom.fbx` + `Textures/Mushroom_Texture.png` | `assets/bosses/jelly-prince.glb` | https://quaternius.com/packs/cutemonsters.html | **1% egg kept.** Not a regular. |
| chest | chest | `Models/GLB format/chest.glb` | `assets/drops/survival-chest.glb` | https://kenney.nl/assets/survival-kit | Unchanged. |
| chest open | box-open | `Models/GLB format/box-open.glb` | `assets/drops/survival-chest-open.glb` | same | Unchanged. |

Removed from the game (credit rows deleted): T-rex, Apatosaurus, Stegosaurus, Armabee Evolved, Goleling Evolved, Alien, Planet-rYguWNNPvA.

**License copies:** `kenney-survival-kit.txt`, `quaternius-mechs-cc0.txt`, `quaternius-turrets-cc0.txt`, `quaternius-qal-v1.0.txt`. Dinosaur and alien notice files were removed with those meshes.

**Draco decoder (T007):** `assets/draco/draco_decoder.wasm`, `draco_wasm_wrapper.js`, and `draco_decoder.js` are the glTF-targeted builds shipped with Three.js 0.185.1 (`examples/jsm/libs/draco/gltf/`). Apache 2.0, Google. Used only to decode the hosted boss/chest GLBs.
