# Man vs. Clankers — resource credits

Selected from the Poly asset library source catalog. Downloaded 2026-09-06. Runtime assets are served locally with the game; no third-party asset URL is fetched by players. The robot model is CC BY 3.0; Poly Haven and Kenney artwork is CC0. The survivor remains original procedural geometry. Downloaded robot geometry and survivor armor use Poly Haven surface wear.

## Robot model attribution — OB3M9

**“OB3M9” by Giuseppe Zemba**, obtained through [Poly Pizza](https://poly.pizza/m/5vuAnGYains), is licensed under [Creative Commons Attribution 3.0 Unported (CC BY 3.0)](https://creativecommons.org/licenses/by/3.0/).

- Original model: `assets/robots/ob3m9-source.glb` (1,413,700 bytes, 18,756 triangles).
- Runtime derivative: `assets/robots/ob3m9.glb` (636,204 bytes, 8,036 triangles).
- Source GLB download: https://static.poly.pizza/b3aa5335-404e-4405-b3b5-321584d968cc.glb.br — HTTP content decoding yields the original GLB.
- Changes made for **Man vs. Clankers**: offline mesh simplification while preserving the original rigid parts; conversion from Y-up / +Z-facing to Z-up / +X-facing; uniform height normalization; arms relaxed downward from the source T-pose; mesh parts grouped into a head, torso, two arms and two legs for rigid-joint walking animation; a pale silver/ivory vertex-color palette with dark joints, weathered PBR surfaces and status lights; wider silhouettes for readability (1.8× on the ground-plane axes and 1.15× vertically, in addition to role proportions), with larger elite variants (a further 1.4× horizontally and 1.05× vertically). No original author endorsement is implied.
- All three enemy types use this actual model geometry with the same pale silver/ivory material palette, distinct proportions and walking cadence. The player and the temporary humanoid loading fallback are original procedural models.
- The source is unrigged: the simple mechanical walk in the game is original rigid-part animation, not an imported animation clip.

The closed-by-default **Credits** disclosure at the bottom of the game shell contains creator, source, license and modification details. It is also available in fullscreen. Opening it pauses an active run; closing it does not resume the run. The scrollable credits panel links to this source document and the file manifests. The original source and derivative have independent SHA-256 entries in `manifest.json`.

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

Exact download URLs, archive entries, sizes and SHA-256 checksums for all runtime source files are in `manifest.json`. Safety paint, the armored player, loading fallback and architectural geometry are authored in the Three.js renderer. The raster textures and sprites come from the credited libraries; weapon diagrams and the favicon are project-authored SVG.


## Typefaces — Geist and Geist Mono

**The Geist Project Authors**, from the [Vercel Geist project](https://github.com/vercel/geist-font), license both fonts under the **SIL Open Font License 1.1**. Google Fonts credits the designers as **Andrés Briganti, Mateo Zaragoza, Guillermo Rauch, Evil Rabbit, José Rago and Facundo Santana**. Google Fonts distributes the fonts; it is not credited as their original designer.

- Primary project: https://vercel.com/font
- Family metadata: https://github.com/google/fonts/tree/main/ofl/geist and https://github.com/google/fonts/tree/main/ofl/geistmono
- Exact locally retained OFL notices: [Geist](notices/geist-OFL.txt), [Geist Mono](notices/geistmono-OFL.txt).
- The game imports `Geist` and `Geist_Mono` through `next/font/google`. In this project that API is implemented by **Vinext**. Its font plugin downloads Google Fonts CSS and WOFF2 variants at build time, rewrites URLs and copies the files into the client output. The actual fonts are served from the game's own origin.
- Geist supplies interface text; Geist Mono supplies numeric labels and keyboard shortcuts. Their outlines are not modified by the game. Google Fonts provides the WOFF2 subsets.
- The exact CSS source requests are `https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap` and `https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&display=swap`. Their MD5 prefixes reproduce the installed Vinext cache directory identifiers. The five Geist and six Geist Mono WOFF2 variants, their script ranges and hashes are listed in [font-manifest.json](font-manifest.json).
- CSS fallback names `Arial`, `sans-serif` and `monospace` refer to fonts supplied by the player's browser/operating system. Those system font files are not redistributed.

## Icons

**Lucide 1.31.0** — Eric Fennis, Lucide Icons and contributors — supplies the control and reward icons. The installed package's **ISC** notice also retains the **MIT** notice for **Cole Bemis / Feather**, whose derived icons include Crosshair, Move and Minimize used in this game. Both notices are preserved, verbatim, in [lucide-ISC-and-feather-MIT.txt](notices/lucide-ISC-and-feather-MIT.txt). Icons are sized and recolored by the interface.

Projects: https://lucide.dev and https://feathericons.com.

## Principal runtime and styling projects

These entries come from the actual game imports and the installed packages' license files, not the unused scaffold dependency list.

| Project | Credited creator/project | Use | Local notice |
|---|---|---|---|
| Three.js 0.185.1 | Three.js authors and contributors | Rendering, materials, glTF/HDR loaders, postprocessing, geometry utilities; SimplifyModifier for the robot derivative | [MIT](notices/three-MIT.txt) |
| React / React DOM / React Server Components 19.2.6; Scheduler 0.27.0 | Meta Platforms, Inc. and affiliates; React contributors | Interface and server rendering | [MIT](notices/react-MIT.txt) |
| Vinext 1.0.0-beta.5 | Cloudflare, Inc. and contributors | Routing, server runtime and Next-compatible font/API handling; Next.js is not separately installed | [MIT](notices/vinext-MIT.txt) |
| Tailwind CSS 4.2.1 | Tailwind Labs, Inc. | CSS foundation and utilities | [MIT](notices/tailwindcss-MIT.txt) |
| tw-animate-css 1.4.0 | Luca Bosin / Wombosvideo | CSS utilities imported by the stylesheet | [MIT](notices/tw-animate-css-MIT.txt) |
| shadcn/ui CSS 4.18.0 | shadcn and contributors | Imported `shadcn/tailwind.css` utility and variant definitions | [MIT](notices/shadcn-MIT.txt) |

## Build and delivery

- **Vite 8.0.13** — VoidZero Inc. and Vite contributors — and **@vitejs/plugin-react 6.0.2 / @vitejs/plugin-rsc 0.5.26** — Yuxi (Evan) You and Vite contributors — support the build pipeline. [Vite's installed MIT license and bundled notices](notices/vite-and-bundled-notices.txt); [React/RSC plugin repository MIT notice](notices/vite-react-plugins-MIT.txt). These are build tools, not imported artwork.
- **Cloudflare Workers tooling**, by Cloudflare, Inc. and contributors: `@cloudflare/vite-plugin` 1.37.1 (MIT) and Wrangler 4.92.0 (MIT OR Apache-2.0), as declared by their installed package metadata. [Workers SDK MIT notice](notices/workers-sdk-MIT.txt); [Apache-2.0 alternative](notices/workers-sdk-Apache-2.0.txt).
- **OpenAI Sites integration**, by OpenAI: `@openai/sites-vite-plugin` 0.2.0 supplies the site's packaging/hosting integration. [Installed MIT notice](notices/sites-plugin-MIT.txt).

Repository-level font and tooling notices were retrieved from their official upstream projects on 2026-09-06. Package notices were copied unchanged from the installed versions. Principal project and source links are recorded in [credits.json](credits.json).

## Original project resources

The gameplay code, interface layout, weapon-card SVG hardware diagrams, favicon, procedural armored survivor, temporary robot loading fallback, orbiting drones, architectural geometry, safety paint, projectile shapes and rigid-part animation were created for the **Man vs. Clankers project with Codex assistance**. They are not attributed to Poly Haven, Poly Pizza or an invented human author.

Sound effects are synthesized by this game's code using the browser's **Web Audio API**: oscillators, gain envelopes and pitch ramps. There are no imported music tracks or sound samples. The browser also provides WebGL, Canvas, pointer/keyboard events and fullscreen APIs; these APIs are not downloaded art assets.

The artwork manifest retains all 18 distributed art files, including `ob3m9-source.glb` as a provenance reference rather than the runtime robot loader input. Each file now maps to a creator and a credit ID. The separate font manifest records all 11 emitted font variants. [credits.json](credits.json) is the same grouped resource inventory rendered by the in-game Credits disclosure.
