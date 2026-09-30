import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { copyPublicPages, validatePublicOutputRoot } from './public-pages.mjs';

const require = createRequire(import.meta.url);

try {
  const cli = require.resolve('expo/bin/cli');
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--output-dir' || !args[1])) {
    throw new Error('Usage: export-web.mjs [--output-dir dist-or-workspace-output-directory]');
  }
  const cwd = fileURLToPath(new URL('../', import.meta.url));
  const outputRoot = resolve(cwd, args[1] ?? 'dist');
  // Reject a bad destination before Expo writes any output.
  await validatePublicOutputRoot(outputRoot);
  // Public environment is compiled into JS; never reuse a different fixture env's transform cache.
  const child = spawn(process.execPath, [cli, 'export', '--platform', 'web', '--clear', '--output-dir', outputRoot], {
    cwd,
    env: { ...process.env, GITHUB_PAGES: 'true' },
    stdio: 'inherit',
    shell: false,
  });
  await new Promise((fulfill, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0 && !signal) fulfill();
      else reject(new Error(signal ? `stopped by ${signal}` : `Expo exit code ${code}`));
    });
  });
  console.log(`Public pages included: ${(await copyPublicPages({ outputRoot })).join(', ')}`);
} catch (error) {
  console.error(`Web export failed: ${error.message}`);
  process.exitCode = 1;
}
