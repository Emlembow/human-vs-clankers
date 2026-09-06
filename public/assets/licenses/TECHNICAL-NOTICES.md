# Man vs. Clankers — retained technical notices

This separate record preserves font, icon, software and project-work provenance from the pre-standalone baseline. It is not part of the in-game Creative Commons artwork credits. Local license notices remain distributed; historical hosting integration may be superseded by the standalone deployment.

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

Repository-level font and tooling notices were retrieved from their official upstream projects on 2026-09-06. Package notices were copied unchanged from the installed versions. Principal project and source links are recorded in [technical-credits.json](technical-credits.json).

## Original project resources

The gameplay code, interface layout, weapon-card SVG hardware diagrams, favicon, procedural armored survivor, temporary robot loading fallback, orbiting drones, architectural geometry, safety paint, projectile shapes and rigid-part animation were created for the **Man vs. Clankers project with Codex assistance**. They are not attributed to Poly Haven, Poly Pizza or an invented human author.

Sound effects are synthesized by this game's code using the browser's **Web Audio API**: oscillators, gain envelopes and pitch ramps. There are no imported music tracks or sound samples. The browser also provides WebGL, Canvas, pointer/keyboard events and fullscreen APIs; these APIs are not downloaded art assets.

The artwork manifest retains all 18 distributed art files, including `ob3m9-source.glb` as a provenance reference rather than the runtime robot loader input. Each file now maps to a creator and a credit ID. The separate font manifest records all 11 emitted font variants. [technical-credits.json](technical-credits.json) retains the non-Creative-Commons provenance from this baseline. It is not linked from the in-game Credits disclosure.
