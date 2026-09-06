# Cloudflare hosting

Man vs. Clankers runs as one Cloudflare Worker named `man-vs-clankers`. It serves the existing Vinext/React page and local static assets; the Three.js game runs in the browser. The public address is `https://man-vs-clankers.<account-subdomain>.workers.dev`, as printed by a successful deployment.

## Configuration

`wrangler.jsonc` is the deployment source of truth. It selects the existing account, enables `workers_dev`, disables version preview URLs, and sets an empty `routes` list. There are no custom domains or DNS changes. No D1, KV, R2, service bindings, scheduled jobs, or application secrets are needed. `ASSETS` is Cloudflare's static asset binding, not an R2 bucket.

`vite.config.ts` combines Vinext with the Cloudflare Vite plugin. The Worker entry is Vinext's `vinext/server/fetch-handler`; RSC and SSR are bundled into that one Worker. `npm run build` writes the deployable configuration to `dist/server/wrangler.json` and the browser assets to `dist/client`. The plugin sets the generated `assets.directory` to the client output. Always deploy the generated configuration after a successful build, rather than passing the framework entry directly to Wrangler's bundler.

The compatibility date is `2026-05-22`, the latest date supported by the project's pinned local workerd runtime. This lets local validation exercise the same compatibility settings as production. Update the date together with Wrangler/workerd and repeat the local Worker checks; setting a newer date by itself prevents the current local runtime from starting.

The Worker includes the local models, textures, HDR environment, particles, fonts, provenance, and license notice files. It has no Sites plugin, Sites authentication, Sites-injected browser script, or Sites runtime dependency. `.openai/hosting.json` remains only as the record of the previous private Sites publication; this build does not read it.

## Local development and validation

Requires Node.js 22.13+ and the versions pinned in `package-lock.json`.

```sh
npm ci
npm run dev
```

Build and validate the production target:

```sh
npm test
npx tsc --noEmit
npm run build
npm run deploy:check
npm start
```

`npm start` runs the built Worker locally with Wrangler. Check the URL Wrangler prints. This serves `/` and the game's static assets without a Cloudflare or Sites login. `deploy:check` performs a local dry run only; it does not publish anything.

After a binding change, regenerate `worker-configuration.d.ts` with `npm run types:worker`. It includes only generated binding types because this project already uses `@cloudflare/workers-types` for runtime definitions.

## Deployment

Authenticate Wrangler to the account configured in `wrangler.jsonc`, then run:

```sh
npm run deploy
```

That script builds before deploying. For a release whose build has already been checked, publish that exact build with:

```sh
npx wrangler deploy --config dist/server/wrangler.json
```

Keep the returned version ID and `workers.dev` URL in the release record. Do not add a route or custom domain for this deployment. `.env*` and `.dev.vars*` are ignored; credentials belong in Wrangler's authentication state or CI secret storage, not this repository.

## References

Configuration was checked against the installed Wrangler schema and these current Cloudflare references on 2026-09-06:

- [Cloudflare Vite plugin API](https://developers.cloudflare.com/workers/vite-plugin/reference/api/)
- [Static assets with the Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/reference/static-assets/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)

Vinext's installed README and fetch-handler module document the framework entry and the `rsc`/`ssr` Vite environments used here.
