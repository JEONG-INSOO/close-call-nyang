import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Isolated production-shaped build, NEVER the deployable dist. Every API request
// is intercepted by e2e/online.spec.ts. These are not credentials or a real host.
const require = createRequire(import.meta.url);
const child = spawn(process.execPath, [require.resolve('expo/bin/cli'), 'export', '--platform', 'web', '--clear',
  '--output-dir', 'output/online-web'], {
  cwd: fileURLToPath(new URL('../', import.meta.url)), shell: false, stdio: 'inherit',
  env: { ...process.env, GITHUB_PAGES: 'true', EXPO_PUBLIC_SUPABASE_URL: 'https://nyang-ranking-fixture.invalid',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_simulated_api_fixture_only',
    EXPO_PUBLIC_ENABLE_MOCK_AD: 'true', EXPO_PUBLIC_REPLAY_DIAGNOSTICS: 'true' },
});
child.once('error', error => { console.error(error.message); process.exitCode = 1; });
child.once('exit', code => { process.exitCode = code ?? 1; });
