import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PUBLIC_BASE = '/close-call-nyang/';
export const PUBLIC_PAGE_NAMES = ['support', 'privacy'];
const workspace = fileURLToPath(new URL('../', import.meta.url));
const sourceRoot = fileURLToPath(new URL('../web-static/', import.meta.url));

/** Disclosure and safety contract, not a legal-compliance certification. */
export function validatePublicPage(html, name) {
  if (!PUBLIC_PAGE_NAMES.includes(name)) throw new Error('Unknown public page');
  if (!/<!doctype html>/i.test(html) || !/<html\s+lang="ko">/i.test(html) ||
      !/<meta\s+charset="utf-8"/i.test(html) || !/name="viewport"/i.test(html) ||
      !/<section\s+id="ko"\s+lang="ko"/i.test(html) || !/<section\s+id="en"\s+lang="en"/i.test(html)) {
    throw new Error(`${name}: missing bilingual HTML structure`);
  }
  if (!html.includes('Insoo Jeong') || !html.includes('mailto:mocca3232@naver.com') ||
      !html.includes('온라인 프로필과 기록 삭제') || !html.includes('Delete online profile and records') ||
      !html.includes(`href="${PUBLIC_BASE}${name === 'support' ? 'privacy' : 'support'}/"`)) {
    throw new Error(`${name}: missing contact, deletion guidance or cross-link`);
  }
  if (/<(?:script|iframe|object|embed|form|img|link|audio|video|source)\b|\son[a-z]+\s*=|url\s*\(|@import/i.test(html)) {
    throw new Error(`${name}: active or external embedded content is forbidden`);
  }
  if (/sb_(?:secret|publishable)_[a-z0-9_-]+|eyJ[a-z0-9_-]{8,}\.[a-z0-9_-]+\.[a-z0-9_-]+|-----BEGIN [^-]*PRIVATE KEY-----|\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/i.test(html)) {
    throw new Error(`${name}: credential or private identifier detected`);
  }
  if (/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DB_URL|["'](?:access_token|refresh_token)["']\s*:/i.test(html)) {
    throw new Error(`${name}: confidential configuration detected`);
  }
  const anchors = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const hrefAttributes = [...html.matchAll(/\bhref\s*=\s*([^\s>]+)/gi)];
  const hrefValues = [...html.matchAll(/\bhref\s*=\s*(["'])(.*?)\1/gi)];
  if (hrefAttributes.length !== hrefValues.length) throw new Error(`${name}: href must be quoted`);
  for (const match of hrefValues) {
    const href = match[2];
    if (href.startsWith('#')) {
      if (!anchors.has(href.slice(1))) throw new Error(`${name}: missing language anchor`);
    } else if (href.startsWith('/')) {
      const [path, anchor] = href.split('#');
      if (![PUBLIC_BASE, ...PUBLIC_PAGE_NAMES.map(page => `${PUBLIC_BASE}${page}/`)].includes(path) ||
          (anchor && !['ko', 'en'].includes(anchor))) throw new Error(`${name}: invalid Pages link`);
    } else if (href !== 'mailto:mocca3232@naver.com' && ![
      'https://supabase.com/privacy',
      'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
    ].includes(href)) throw new Error(`${name}: unexpected external link`);
  }
}

async function rejectSymlinks(root, path) {
  const parts = relative(root, path).split(sep).filter(Boolean);
  let current = root;
  for (const part of ['', ...parts]) {
    current = resolve(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error('Public page path must not be a symlink');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

export async function validatePublicOutputRoot(outputRoot, basePath = PUBLIC_BASE) {
  const root = resolve(outputRoot);
  const rel = relative(resolve(workspace), root);
  if (basePath !== PUBLIC_BASE || (rel !== 'dist' && !rel.startsWith(`output${sep}`))) {
    throw new Error('Public pages output must be dist or a directory under workspace output/ with the Pages base');
  }
  await rejectSymlinks(resolve(workspace), root);
  return root;
}

/** Only known HTML sources may be copied into a completed project export. No deletions. */
export async function copyPublicPages({ outputRoot = resolve(workspace, 'dist'), basePath = PUBLIC_BASE } = {}) {
  const root = await validatePublicOutputRoot(outputRoot, basePath);
  await rejectSymlinks(root, resolve(root, 'index.html'));
  if (!(await lstat(resolve(root, 'index.html'))).isFile()) throw new Error('Export index.html is required first');
  const canonicalRoot = await realpath(root);
  const pages = [];
  // Validate every source and destination before any write (avoid partial copies on a bad second page).
  for (const name of PUBLIC_PAGE_NAMES) {
    const source = resolve(sourceRoot, name, 'index.html');
    const destination = resolve(root, name, 'index.html');
    await rejectSymlinks(resolve(workspace), source);
    await rejectSymlinks(canonicalRoot, destination);
    const html = await readFile(source, 'utf8');
    validatePublicPage(html, name);
    pages.push({ name, destination, html });
  }
  for (const { destination, html } of pages) {
    await mkdir(resolve(destination, '..'), { recursive: true });
    await writeFile(destination, html, 'utf8');
  }
  return pages.map(({ name }) => `${basePath}${name}/`);
}
