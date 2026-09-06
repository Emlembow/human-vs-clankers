# Man vs. Clankers — artwork sources

Selected from the user's `/Users/mike/Documents/ChatGPT/Poly/POLY-ASSET-LIBRARY.md` source catalog. Downloaded 2026-09-06. Runtime assets are served locally with the game; no third-party asset URL is fetched by players. All downloaded artwork is CC0. The survivor and robot geometry are original procedural hard-surface models, with Poly Haven surface wear applied to their armor.

## Poly Haven — photographed PBR surfaces, HDR lighting and model

Poly Haven's license covers its HDRIs, textures and models under CC0: https://polyhaven.com/license
CC0 deed: https://creativecommons.org/publicdomain/zero/1.0/

| Asset | Artist | Product URL | Runtime use |
|---|---|---|---|
| Concrete Floor Worn 02 | Dimitrios Savva | https://polyhaven.com/a/concrete_floor_worn_02 | Photographed worn concrete diffuse, OpenGL normals, and packed ambient-occlusion/roughness maps across the yard floor. 1K JPG maps. |
| Rusty Metal 02 | Rob Tuytel | https://polyhaven.com/a/rusty_metal_02 | Diffuse, OpenGL normals and packed ARM maps on physical perimeter steel; shared normal/roughness/AO wear on survivor armor and machine hulls. 1K JPG maps. |
| Factory Yard | Sergej Majboroda | https://polyhaven.com/a/factory_yard | 1K RGBE HDR environment for realistic metal reflections and indirect light. Loaded by Three.js HDRLoader. |
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

Exact download URLs, archive entries, sizes and SHA-256 checksums for all runtime source files are in `manifest.json`. The floor's faded numerals and safety paint are procedural decals; humanoid, robot and architectural geometry are authored in the Three.js renderer. No generated AI images are used.
