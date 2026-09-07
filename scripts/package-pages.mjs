import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const client = path.join(root, 'dist/client');
const server = path.join(root, 'dist/server');
const output = path.join(root, 'dist/pages');
const pagesRedirect = path.join(root, '.wrangler/deploy/config.json');
const pagesRedirectText = `${JSON.stringify({ configPath: '../../wrangler.jsonc' })}\n`;
const checkOnly = process.argv.includes('--check');
assert(process.argv.slice(2).every((arg) => arg === '--check'), 'Unknown argument');
const comparePaths = (a, b) => a < b ? -1 : a > b ? 1 : 0;

async function filesIn(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), `Unexpected symlink: ${prefix}${entry.name}`);
    const name = `${prefix}${entry.name}`;
    if (entry.isDirectory()) files.push(...await filesIn(path.join(directory, entry.name), `${name}/`));
    else if (entry.isFile()) files.push(name);
  }
  return files.sort(comparePaths);
}

const workerConfig = JSON.parse(await readFile(path.join(server, 'wrangler.json'), 'utf8'));
const pagesConfig = JSON.parse(await readFile(path.join(root, 'wrangler.jsonc'), 'utf8'));
assert.equal(workerConfig.main, 'index.js', 'Build the existing Vinext Worker first');
assert.equal(pagesConfig.compatibility_date, workerConfig.compatibility_date);
assert.deepEqual(pagesConfig.compatibility_flags, workerConfig.compatibility_flags);
assert.equal(path.resolve(root, pagesConfig.pages_build_output_dir), output);

const clientFiles = await filesIn(client);
const serverModules = (await filesIn(server)).filter((name) => /\.(?:m?js)$/.test(name));
assert(serverModules.includes('index.js'), 'Missing server entry');
assert(serverModules.includes('ssr/index.js'), 'Missing SSR entry');
assert(!clientFiles.some((name) => /^_worker\.js(?:\/|$)|^_routes\.json$/.test(name)), 'Reserved Pages output already exists');

// Pages serves static files directly; all other requests stay with Vinext's
// existing SSR/RSC handler. No request is forwarded to another deployment.
const routes = {
  version: 1,
  include: ['/*'],
  exclude: [...new Set(clientFiles
    .filter((name) => !['_headers', '_redirects'].includes(name))
    .map((name) => name.includes('/') ? `/${name.split('/')[0]}/*` : `/${name}`))].sort(comparePaths),
};
assert(routes.exclude.length + routes.include.length <= 100, 'Too many Pages routing rules');
const routesText = `${JSON.stringify(routes, null, 2)}\n`;

// Bundle the already-compiled module graph, including lazy SSR/RSC imports,
// into Pages' single advanced-mode entry. Node/Cloudflare builtins remain
// runtime imports. The browser files and application source are untouched.
const bundled = await build({
  absWorkingDir: root,
  entryPoints: [path.join(server, 'index.js')],
  outfile: '_worker.js',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  external: ['node:*', 'cloudflare:*'],
  minify: true,
  legalComments: 'inline',
  write: false,
});
assert.equal(bundled.outputFiles.length, 1, 'Expected one self-contained Pages entry');
const workerBytes = bundled.outputFiles[0].contents;
const mappings = clientFiles.map((name) => [path.join(client, name), name]);

if (!checkOnly) {
  // Rebuild only this generated target; keep the accepted Worker output intact.
  await rm(output, { recursive: true, force: true });
  for (const [source, destination] of mappings) {
    await mkdir(path.dirname(path.join(output, destination)), { recursive: true });
    await cp(source, path.join(output, destination));
  }
  await writeFile(path.join(output, '_worker.js'), workerBytes);
  await writeFile(path.join(output, '_routes.json'), routesText);
  // The Vite plugin generates a Worker deployment pointer. Select the Pages
  // configuration for the default target after packaging; explicit Worker
  // commands continue to use dist/server/wrangler.json.
  await mkdir(path.dirname(pagesRedirect), { recursive: true });
  await writeFile(pagesRedirect, pagesRedirectText);
}

assert.deepEqual(await filesIn(output), [...clientFiles, '_worker.js', '_routes.json'].sort(comparePaths), 'Pages output has missing or unexpected files');
for (const [source, destination] of mappings) {
  const digest = (data) => createHash('sha256').update(data).digest('hex');
  assert.equal(digest(await readFile(path.join(output, destination))), digest(await readFile(source)), `Changed build file: ${destination}`);
}
assert.deepEqual(await readFile(path.join(output, '_worker.js')), Buffer.from(workerBytes), 'Changed Pages server bundle');
assert.equal(await readFile(path.join(output, '_routes.json'), 'utf8'), routesText);
assert.equal(await readFile(pagesRedirect, 'utf8'), pagesRedirectText);
console.log(`Pages package ${checkOnly ? 'verified' : 'created and verified'}: ${clientFiles.length} static files, ${serverModules.length} server modules bundled into one Worker (${workerBytes.length} bytes); dist/pages`);
