import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

try {
  const cli = require.resolve('expo/bin/cli');
  // Public environment is compiled into JS; never reuse a different fixture env's transform cache.
  const child = spawn(process.execPath, [cli, 'export', '--platform', 'web', '--clear'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { ...process.env, GITHUB_PAGES: 'true' },
    stdio: 'inherit',
    shell: false,
  });
  child.once('error', error => {
    console.error(`Web export failed: ${error.message}`);
    process.exitCode = 1;
  });
  child.once('exit', (code, signal) => {
    if (signal) console.error(`Web export stopped by ${signal}.`);
    process.exitCode = code ?? 1;
  });
} catch (error) {
  console.error(`Web export failed: ${error.message}`);
  process.exitCode = 1;
}
