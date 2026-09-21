import { createServer } from 'node:http';
import { open, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = '127.0.0.1';
const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.map', 'application/json; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'], ['.wasm', 'application/wasm'],
  ['.wav', 'audio/wav'], ['.mp3', 'audio/mpeg'], ['.ogg', 'audio/ogg'], ['.m4a', 'audio/mp4'],
  ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'], ['.avif', 'image/avif'], ['.gif', 'image/gif'], ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'], ['.woff2', 'font/woff2'], ['.ttf', 'font/ttf'], ['.otf', 'font/otf'],
  ['.eot', 'application/vnd.ms-fontobject'],
]);

class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function normalizeBase(value) {
  if (typeof value !== 'string' || !/^\/(?:[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/?)?$/.test(value)) {
    throw new Error('--base must be an absolute URL path containing only letters, numbers, - and _.');
  }
  return value === '/' ? '/' : value.replace(/\/$/, '');
}

export function parseServeArgs(args, cwd = process.cwd()) {
  const options = { port: 4173, base: '/close-call-nyang', directory: resolve(cwd, 'dist') };
  const seen = new Set();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!['--port', '--base', '--dir'].includes(key) || seen.has(key) ||
        typeof value !== 'string' || value.length === 0 || value.startsWith('--') || value.includes('\0')) {
      throw new Error('Usage: node scripts/serve-web.mjs --port 4173 --base /close-call-nyang [--dir dist]');
    }
    seen.add(key);
    if (key === '--port') {
      const port = Number(value);
      if (!/^\d+$/.test(value) || !Number.isSafeInteger(port) || port < 1 || port > 65535) {
        throw new Error('--port must be an integer from 1 to 65535.');
      }
      options.port = port;
    } else if (key === '--base') {
      options.base = normalizeBase(value);
    } else {
      options.directory = resolve(cwd, value);
    }
  }
  return options;
}

function isContained(root, candidate) {
  const path = relative(root, candidate);
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`));
}

async function containedRealPath(root, candidate) {
  if (!isContained(root, candidate)) throw new RequestError(403, 'Forbidden');
  const actual = await realpath(candidate);
  if (!isContained(root, actual)) throw new RequestError(403, 'Forbidden');
  return actual;
}

function requestPath(requestUrl) {
  if (typeof requestUrl !== 'string' || !requestUrl.startsWith('/')) throw new RequestError(400, 'Bad Request');
  const rawPath = requestUrl.split('?', 1)[0];
  if (rawPath.includes('#')) throw new RequestError(400, 'Bad Request');
  let decoded;
  try { decoded = decodeURIComponent(rawPath); } catch { throw new RequestError(400, 'Bad Request'); }
  if (/[\u0000-\u001f\u007f\\]/.test(decoded)) throw new RequestError(403, 'Forbidden');
  // Reject traversal before resolve() or a URL parser has a chance to normalize it.
  for (const segment of decoded.split('/')) {
    if (segment === '.' || segment === '..' || segment.includes(':') || /[. ]$/.test(segment) ||
        /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment)) {
      throw new RequestError(403, 'Forbidden');
    }
  }
  return { decoded, rawPath };
}

function textResponse(request, response, status, text, extra = {}) {
  const body = `${text}\n`;
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra });
  response.end(request.method === 'HEAD' ? undefined : body);
}

/** Root is canonicalized once. Every requested file is checked again after symlink resolution. */
export async function createStaticServer({ directory, base = '/close-call-nyang' }) {
  const normalizedBase = normalizeBase(base);
  const root = await realpath(resolve(directory));
  if (!(await stat(root)).isDirectory()) throw new Error('The web output path is not a directory.');
  const initialIndex = await containedRealPath(root, resolve(root, 'index.html'));
  if (!(await stat(initialIndex)).isFile()) throw new Error('The web output directory has no regular index.html.');

  async function handle(request, response) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      textResponse(request, response, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
      return;
    }
    const { decoded, rawPath } = requestPath(request.url);
    if (normalizedBase !== '/' && decoded === normalizedBase) {
      textResponse(request, response, 308, 'Permanent Redirect', { Location: `${normalizedBase}/` });
      return;
    }
    const prefix = normalizedBase === '/' ? '/' : `${normalizedBase}/`;
    if (!decoded.startsWith(prefix)) throw new RequestError(404, 'Not Found');
    const subpath = decoded.slice(prefix.length);
    // A rooted suffix must not acquire filesystem/UNC meaning on Windows.
    if (subpath.startsWith('/') || subpath.includes('//')) throw new RequestError(403, 'Forbidden');
    let actual = await containedRealPath(root, resolve(root, subpath));
    const entry = await stat(actual);
    if (entry.isDirectory()) {
      actual = await containedRealPath(root, resolve(actual, 'index.html'));
      if (!decoded.endsWith('/')) {
        textResponse(request, response, 308, 'Permanent Redirect', { Location: `${rawPath}/` });
        return;
      }
    } else if (!entry.isFile()) {
      throw new RequestError(404, 'Not Found');
    }

    const file = await open(actual, 'r');
    let fileInfo;
    try {
      fileInfo = await file.stat();
      if (!fileInfo.isFile()) throw new RequestError(404, 'Not Found');
      if (response.destroyed) { await file.close(); return; }
      response.writeHead(200, {
        'Content-Type': MIME_TYPES.get(extname(actual).toLowerCase()) ?? 'application/octet-stream',
        'Content-Length': fileInfo.size,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      if (request.method === 'HEAD') { await file.close(); response.end(); return; }
    } catch (error) {
      await file.close();
      throw error;
    }
    const stream = file.createReadStream();
    response.once('close', () => stream.destroy());
    stream.once('error', error => response.destroy(error));
    stream.pipe(response);
  }

  return createServer((request, response) => {
    void handle(request, response).catch(error => {
      if (response.headersSent || response.destroyed) { response.destroy(); return; }
      const status = error instanceof RequestError ? error.status
        : ['ENOENT', 'ENOTDIR'].includes(error.code) ? 404
          : ['EACCES', 'EPERM', 'ELOOP'].includes(error.code) ? 403 : 500;
      const message = status === 404 ? 'Not Found' : status === 403 ? 'Forbidden'
        : status === 400 ? 'Bad Request' : 'Internal Server Error';
      textResponse(request, response, status, message);
    });
  });
}

async function main() {
  const { port, base, directory } = parseServeArgs(process.argv.slice(2));
  const server = await createStaticServer({ directory, base });
  await new Promise((accept, reject) => {
    server.once('error', reject);
    server.listen(port, HOST, accept);
  });
  console.log(`Serving ${directory} at http://${HOST}:${port}${base === '/' ? '/' : `${base}/`}`);
  const shutdown = () => server.close(error => {
    if (error) { console.error(error.message); process.exitCode = 1; }
  });
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch(error => {
    console.error(`Web preview failed: ${error.message}`);
    process.exitCode = 1;
  });
}
