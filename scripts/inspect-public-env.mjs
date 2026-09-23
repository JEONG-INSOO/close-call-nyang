import { lstat, readdir, readFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_NAME = 'EXPO_PUBLIC_SUPABASE_URL';
const KEY_NAME = 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY';
const PUBLIC_NAME = /^EXPO_PUBLIC_/i;
const FORBIDDEN_PUBLIC_NAME = /^EXPO_PUBLIC_.*(?:SECRET|PRIVATE|PASSWORD|TOKEN|SERVICE_?ROLE|DATABASE|DB_|SALT|SIGNING|CREDENTIAL|RANKING_ENVIRONMENT|RANKING_ALLOWED_ORIGINS)/i;
const SERVER_NAME = /\b(?:SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS?|SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|SUPABASE_JWT_SECRET|DATABASE_URL|DB_PASSWORD|JWT_SECRET|RANKING_RATE_LIMIT_SALT|RANKING_ENVIRONMENT|RANKING_ALLOWED_ORIGINS)\b/i;
const TEXT_EXTENSIONS = new Set(['.html', '.js', '.mjs', '.cjs', '.json', '.map', '.css', '.txt', '.svg', '.webmanifest', '.yaml', '.yml', '.toml', '.pem', '.key']);
const LIMIT_BYTES = 64 * 1024 * 1024;
const MAX_FILES = 10_000;
const LIMITATIONS = [
  'Static text checks only: encoded, split, arbitrary secrets and binary assets are not proven safe.',
  'Matching public literals do not prove runtime use, deployment identity, server permissions or a live connection.',
  'Disabled input flags and absent known diagnostic markers do not prove mock ads are unreachable; run production feature-flag and browser tests.',
  'No environment values, matched text, credentials or file contents are included in this report.',
];

/** This intentionally reads only public entries; private process environment values are never inspected. */
export function selectPublicEnvironment(environment) {
  return Object.fromEntries(Object.keys(environment).filter(name => PUBLIC_NAME.test(name))
    .map(name => [name, String(environment[name] ?? '')]));
}

/** Explicit env-file support, not shell execution/interpolation or implicit .env discovery. */
export function parsePublicEnvFile(contents) {
  const result = {};
  for (const rawLine of contents.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) {
      if (/^(?:export\s+)?EXPO_PUBLIC_/i.test(line)) throw new Error('Invalid public env-file syntax.');
      continue;
    }
    if (!PUBLIC_NAME.test(match[1])) continue;
    let value = match[2].trim();
    if (value.startsWith('"') || value.startsWith("'")) {
      const quoted = /^("(?:[^"\\]|\\.)*"|'[^']*')\s*(?:#.*)?$/.exec(value);
      if (!quoted) throw new Error('Invalid public env-file syntax.');
      try { value = quoted[1].startsWith('"') ? JSON.parse(quoted[1]) : quoted[1].slice(1, -1); }
      catch { throw new Error('Invalid public env-file syntax.'); }
    } else value = value.replace(/\s+#.*$/, '').trim();
    if (/[\r\n\0$]/.test(value)) throw new Error('Public env-file interpolation and multiline values are unsupported.');
    if (Object.hasOwn(result, match[1])) throw new Error('Duplicate public env-file assignment.');
    result[match[1]] = value;
  }
  return result;
}

function normalizeEscapes(text) {
  return text.replace(/\\u([\da-f]{4})/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\\x([\da-f]{2})/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\\\//g, '/');
}

/** Conservative recognizable-pattern scan, not a general-purpose credential detector. */
export function detectUnsafeText(contents) {
  const text = normalizeEscapes(contents);
  const found = new Set();
  if (/\bsb_secret_[A-Za-z0-9_-]{8,}\b/.test(text) || /\bsbp_[A-Za-z0-9_-]{16,}\b/.test(text)) found.add('known-secret-token');
  if (/\bpostgres(?:ql)?:\/\/[^\s'"<>:@/]+:[^\s'"<>@/]+@/i.test(text)) found.add('database-credentials');
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) found.add('private-key');
  if (SERVER_NAME.test(text) || [...text.matchAll(/\bEXPO_PUBLIC_[A-Z0-9_]+\b/gi)].some(match => FORBIDDEN_PUBLIC_NAME.test(match[0]))) found.add('forbidden-server-name');
  for (const match of text.matchAll(/(service[_-]?role(?:[_-]?key)?|supabase[_-]?secret[_-]?key|db[_-]?password|database[_-]?url|access[_-]?token)["']?\s*[:=]\s*["']([^"'\s]{8,})["']/gi)) {
    // Supabase SDK's access_token:"access_token" enum is a field name, not a credential.
    if (!(match[1] === 'access_token' && match[2] === 'access_token')) found.add('credential-assignment');
  }
  for (const candidate of text.matchAll(/\beyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+\b/g)) {
    try {
      const payload = JSON.parse(Buffer.from(candidate[1], 'base64url').toString('utf8'));
      if (payload && typeof payload === 'object' && ['service_role', 'authenticated', 'anon'].includes(payload.role)) found.add('embedded-auth-jwt');
    } catch { /* Ordinary text resembling a JWT is not a decoded credential. */ }
  }
  if (/nyang-ranking-fixture\.invalid|sb_publishable_simulated_api_fixture_only|SIMULATED API/.test(text)) found.add('simulated-api-marker');
  if (/RankedReplayDiagnostics|runReplayDiagnostics|office-hundred-fall|개발용 합성 재현 검사|diagnostics-open/.test(text)) found.add('development-diagnostic-marker');
  return [...found].sort();
}

function isPublicKey(value) { return /^sb_publishable_[A-Za-z0-9_-]{8,}$/.test(value); }
function publicUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
        !['', '/'].includes(url.pathname) || url.hostname === 'localhost' || url.hostname.endsWith('.invalid') ||
        url.hostname === '127.0.0.1' || url.hostname === '[::1]') return null;
    return url.origin;
  } catch { return null; }
}
function containsLiteral(text, value) {
  return text.includes(JSON.stringify(value)) || text.includes(`'${value}'`);
}

/** No external requests or writes. Messages use fixed identifiers, never values or paths. */
export async function inspectPublicEnvironment({ environment = {}, directory = 'dist', allowUnconfigured = false } = {}) {
  const checks = [];
  const add = (id, status, message) => checks.push({ id, status, message });
  const publicEnv = selectPublicEnvironment(environment);
  const rawUrl = (publicEnv[URL_NAME] ?? '').trim();
  const key = (publicEnv[KEY_NAME] ?? '').trim();
  const bothMissing = !rawUrl && !key;
  const configured = Boolean(rawUrl && key);
  const origin = publicUrl(rawUrl);
  const missingAllowed = bothMissing && allowUnconfigured;
  add('public-config', configured || missingAllowed ? 'passed' : 'failed', configured ?
    'Both public configuration fields are present.' : missingAllowed ?
      'Explicit local-only mode: both ranking fields are absent. This is not a hosted-ready build.' :
      'Provide both public ranking fields through process env or --env-file; use --allow-unconfigured only for local-only validation.');
  if (!bothMissing) {
    add('public-url', origin ? 'passed' : 'failed', 'Ranking URL must be an HTTPS origin without credentials, query or path.');
    add('public-key', isPublicKey(key) ? 'passed' : 'failed', 'Only a sb_publishable_ public key is accepted; legacy JWT/server keys are rejected.');
  }
  const unsafeName = Object.keys(publicEnv).some(name => FORBIDDEN_PUBLIC_NAME.test(name));
  const unsafeValues = Object.values(publicEnv).some(value => detectUnsafeText(value).length > 0);
  add('public-secret-boundary', unsafeName || unsafeValues ? 'failed' : 'passed', 'Public environment names and values checked against forbidden server/credential patterns.');
  for (const [name, id] of [['EXPO_PUBLIC_ENABLE_MOCK_AD', 'mock-ad-input'], ['EXPO_PUBLIC_REPLAY_DIAGNOSTICS', 'diagnostic-input']]) {
    const value = (publicEnv[name] ?? '').trim();
    add(id, !value || value === 'false' ? 'passed' : 'failed', 'Production inspection accepts this development flag only when absent or exactly false; runtime tests are still required.');
  }

  const findings = new Set();
  let scannedFiles = 0;
  let skippedBinaryFiles = 0;
  let scriptFiles = 0;
  let indexFound = false;
  let bundleMatches = false;
  let unexpectedPublicKey = false;
  let traversedFiles = 0;
  let totalBytes = 0;
  let scanFailed = false;
  const walk = async (path, isRoot = false) => {
    const info = await lstat(path);
    if (info.isSymbolicLink()) throw new Error('Symlink unsupported.');
    if (info.isDirectory()) {
      const names = await readdir(path);
      for (const name of names.sort()) {
        if (++traversedFiles > MAX_FILES) throw new Error('Too many entries.');
        const nestedPath = join(path, name);
        if (isRoot && name === 'index.html' && (await lstat(nestedPath)).isFile()) indexFound = true;
        await walk(nestedPath);
      }
      return;
    }
    if (!info.isFile()) throw new Error('Unsupported entry.');
    const envFile = /^\.env(?:\.|$)/i.test(basename(path));
    if (envFile) findings.add('environment-file-in-export');
    if (!envFile && !TEXT_EXTENSIONS.has(extname(path).toLowerCase())) { skippedBinaryFiles += 1; return; }
    totalBytes += info.size;
    if (totalBytes > LIMIT_BYTES) throw new Error('Text limit exceeded.');
    const text = normalizeEscapes(await readFile(path, 'utf8'));
    scannedFiles += 1;
    for (const finding of detectUnsafeText(text)) findings.add(finding);
    if (bothMissing && /\bsb_publishable_[A-Za-z0-9_-]{8,}\b/.test(text)) unexpectedPublicKey = true;
    if (['.js', '.mjs', '.cjs'].includes(extname(path).toLowerCase())) {
      scriptFiles += 1;
      if (origin && isPublicKey(key) && (containsLiteral(text, rawUrl) || containsLiteral(text, origin)) && containsLiteral(text, key)) bundleMatches = true;
    }
  };
  try {
    const root = resolve(directory);
    if (!(await lstat(root)).isDirectory()) throw new Error('Not a directory.');
    await walk(root, true);
  } catch { scanFailed = true; }
  add('dist-readable', scanFailed ? 'failed' : 'passed', 'Explicit export directory scanned without symlinks; bounded readable text files only.');
  add('dist-export-shape', !scanFailed && indexFound && scriptFiles > 0 ? 'passed' : 'failed', 'Export requires a root index.html and at least one JavaScript file.');
  add('dist-secret-markers', findings.size ? 'failed' : scanFailed ? 'not_run' : 'passed', findings.size ?
    `Forbidden marker categories: ${[...findings].sort().join(', ')}.` : 'No known forbidden text markers found in scanned export text.');
  add('dist-config-match', bothMissing ? missingAllowed && !unexpectedPublicKey && !scanFailed ? 'passed' : 'failed' :
    bundleMatches && !scanFailed ? 'passed' : 'failed', bothMissing ?
      missingAllowed ? 'Local-only export must not retain a recognizable configured public key.' :
        'Expected hosted public configuration is missing; local-only validation requires --allow-unconfigured.' :
      'Expected URL and public key must both occur as string literals in the same JavaScript export file.');
  return { status: checks.some(check => check.status === 'failed') ? 'failed' : 'passed',
    mode: missingAllowed ? 'local-only' : 'hosted-config', scannedFiles, skippedBinaryFiles, checks, limitations: LIMITATIONS };
}

export function parseInspectionArgs(args) {
  const options = { directory: 'dist', allowUnconfigured: false, envFile: null, help: false };
  const used = new Set();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (used.has(arg)) throw new Error('Duplicate option.');
    used.add(arg);
    if (arg === '--allow-unconfigured') options.allowUnconfigured = true;
    else if (arg === '--help') options.help = true;
    else if (arg === '--dist' || arg === '--env-file') {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing option value.');
      options[arg === '--dist' ? 'directory' : 'envFile'] = args[++i];
    } else throw new Error('Unknown option.');
  }
  return options;
}

export async function runInspectionCli(args, environment, output = console.log) {
  try {
    const options = parseInspectionArgs(args);
    if (options.help) {
      output('Usage: node scripts/inspect-public-env.mjs [--dist dist] [--env-file ignored-public.env] [--allow-unconfigured]');
      output('Reads explicit public env only; process variables override an explicit env file. No implicit .env loading or network access.');
      return 0;
    }
    const fileEnv = options.envFile ? parsePublicEnvFile(await readFile(options.envFile, 'utf8')) : {};
    const report = await inspectPublicEnvironment({ ...options, environment: { ...fileEnv, ...selectPublicEnvironment(environment) } });
    output(JSON.stringify(report, null, 2));
    return report.status === 'passed' ? 0 : 1;
  } catch {
    output('Public environment inspection failed: check option syntax and access to the explicitly selected files. Values and paths are suppressed.');
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runInspectionCli(process.argv.slice(2), process.env);
}
