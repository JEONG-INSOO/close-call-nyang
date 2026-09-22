import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const outputDirectory = join(projectRoot, 'output', 'qa-fixtures');
const fixtureEntry = join(projectRoot, 'e2e', 'fixtures', 'index.tsx');
const bundleFile = join(outputDirectory, 'scene-fixtures.bundle.js');
const cli = createRequire(import.meta.url).resolve('expo/bin/cli');

// This script writes only its isolated QA directory. It never exports to dist,
// switches the real entry point, or installs a production route/debug hook.
mkdirSync(outputDirectory, { recursive: true });
const result = spawnSync(process.execPath, [cli, 'export:embed',
  '--entry-file', fixtureEntry, '--platform', 'web', '--dev', 'false',
  '--bundle-output', bundleFile, '--assets-dest', join(outputDirectory, 'assets'),
], {
  cwd: projectRoot, stdio: 'inherit', shell: false,
  // Keep fixture assets independent of the release site's GitHub Pages base path.
  env: { ...process.env, GITHUB_PAGES: 'false' },
});
if (result.error) {
  console.error('Fixture bundle failed:', result.error.message);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);
if (!statSync(bundleFile).isFile() || statSync(bundleFile).size === 0) {
  throw new Error('Fixture export did not create a non-empty JavaScript bundle.');
}
// export:embed registers images at root-absolute "/assets/..." but writes them under
// --assets-dest; point them at that folder relative to the fixture page (served under /fixtures/).
const bundle = readFileSync(bundleFile, 'utf8');
const relocated = bundle.split('uri:"/assets/').join('uri:"./assets/assets/');
writeFileSync(bundleFile, relocated, 'utf8');

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TEST FIXTURE — Nyang scene QA, not iOS screenshots</title>
<style>
html,body,#root{width:100%;height:100%;margin:0;background:#eae9e5}
body{font-family:system-ui,sans-serif}#root{display:flex;flex-direction:column}
</style></head><body><div id="root"></div>
<noscript>TEST FIXTURE — 합성 상태 / iOS 스크린샷 아님. JavaScript is required.</noscript>
<script defer src="./scene-fixtures.bundle.js"></script></body></html>
`;
writeFileSync(join(outputDirectory, 'index.html'), html, 'utf8');
console.log('TEST FIXTURE — 합성 상태 / iOS 스크린샷 아님');
console.log(`Isolated visual QA bundle: ${outputDirectory}`);
