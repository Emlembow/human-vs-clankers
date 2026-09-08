# Cloudflare hosting

Man vs. Clankers runs natively on Cloudflare Pages. The project name is `human-vs-clankers`, giving the production address `https://human-vs-clankers.pages.dev` when that name is available. The existing Vinext/React page runs as a Pages advanced-mode Function; the Three.js game runs in the browser. Pages serves its own bundled game, artwork, fonts, and credits. No requests are proxied or redirected to the previous Worker or Sites deployment.

The address moved from `man-vs-clankers.pages.dev` to `human-vs-clankers.pages.dev` on 2026-09-06 by deploying the same verified game build into the new Pages project. The original project remains available; future normal deployments target `human-vs-clankers`. Wrangler `pages project list` confirms these are two distinct projects.

## Configuration and build

`wrangler.jsonc` is the Pages configuration. It selects the project, `dist/pages` as the output directory, and the tested `2026-05-22` compatibility date with `nodejs_compat`. Pages provides the `ASSETS` binding automatically. Pages does not support `account_id` in its Wrangler configuration; the deployment account is selected through `CLOUDFLARE_ACCOUNT_ID` below. No custom domains, DNS changes, databases, external storage, service bindings, or application secrets are needed.

`vite.config.ts` combines Vinext with the Cloudflare Vite plugin, using `wrangler.worker.jsonc` to compile the original `vinext/server/fetch-handler` and its RSC/SSR modules. This original Worker configuration is retained as the build input and optional fallback deployment target. The compatibility date matches the pinned local workerd runtime; update it together with Wrangler/workerd and repeat local runtime checks.

`npm run build` first produces `dist/server` and `dist/client`, then runs `scripts/package-pages.mjs`:

- Copies the client files byte-for-byte into `dist/pages`, including all local artwork, fonts, provenance, and required license notices.
- Uses pinned esbuild to bundle the already-compiled server module graph, including lazy SSR/RSC imports, into one `dist/pages/_worker.js`. Node and Cloudflare builtins remain runtime imports. Browser code and application source are unchanged.
- Writes `_routes.json` so static files use Pages' asset serving and page requests use Vinext's existing handler.
- Replaces the Vite-generated `.wrangler/deploy/config.json` pointer with the Pages configuration. This prevents Pages commands from accidentally selecting the intermediate Worker target. Explicit Worker commands still use `dist/server/wrangler.json`.
- Verifies every copied file and the generated bundle against the current build.

The single-file advanced-mode entry avoids module-directory resolution problems in pinned Wrangler 4.92.0. `wrangler pages dev` uses its normal local bundling; `--no-bundle` triggers a local `wrangler:modules-watch` error in this pinned version. Production upload uses `--no-bundle` because `_worker.js` is already self-contained, preserving the checked server file.

There is no Sites plugin, login gate, injected script, or runtime dependency. `.openai/hosting.json` remains only as the historical record of the earlier Sites publication; this build does not read it. The previous standalone Worker can remain available independently and is not changed by a Pages deployment.

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

`deploy:check` is a local package-integrity check, not a remote deployment or a Wrangler upload dry run. It recomputes the bundled server, checks client byte equality, ensures the output contains only the expected files, and verifies the Pages configuration pointer. Use `npm start -- --port 8873` for a chosen local Pages port, then check `/`, game startup, static assets, and the credits disclosure.

After a binding change, run `npm run types:worker` to regenerate `worker-configuration.d.ts`. The shared `ASSETS: Fetcher` interface also matches the binding Pages supplies automatically.

## Deployment

Authenticate Wrangler, then select the existing deployment account in the shell or CI environment. The account ID is a non-secret identifier; credentials remain in Wrangler's authentication state or CI secret storage:

```sh
export CLOUDFLARE_ACCOUNT_ID=15c3d4532d4120bfb4283f59967f7123
```

Create the Pages project once, if it does not already exist:

```sh
npx wrangler pages project create human-vs-clankers --production-branch main
```

Build and publish:

```sh
npm run deploy
```

To publish the exact build already checked, without rebuilding:

```sh
npm run deploy:check
npm run deploy:pages
```

The latter runs `wrangler pages deploy --no-bundle --project-name human-vs-clankers --branch main`. Explicit `--branch main` publishes to the project's production branch even when the local checkout uses a task branch. Keep the deployment ID and returned URLs with the release record. Use the stable project `pages.dev` address for sharing. Do not add a custom domain or change the account's Workers subdomain.

The original Worker remains an optional fallback. After building, `npm run start:worker` runs it locally, `npm run deploy:worker:check` performs its local dry run, and `npm run deploy:worker` explicitly publishes it. None of these commands is part of a normal Pages release.

`.env*`, `.dev.vars*`, and `.wrangler/` are ignored. Credentials belong in Wrangler's authentication state or CI secret storage, never in source or the public build.

## References

Checked against installed Wrangler 4.92.0 code/schema and official Cloudflare documentation on 2026-09-06:

- [Pages advanced mode](https://developers.cloudflare.com/pages/functions/advanced-mode/)
- [Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Pages Functions routing](https://developers.cloudflare.com/pages/functions/routing/)
- [Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [Cloudflare Vite plugin API](https://developers.cloudflare.com/workers/vite-plugin/reference/api/)
