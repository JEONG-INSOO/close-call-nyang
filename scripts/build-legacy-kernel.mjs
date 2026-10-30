import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const revision = '9aa47db'; // Last published kernel before the 2026-10-30 tuning.
const destination = 'supabase/functions/_shared/legacy/bc732af6f2a7ea66';
const check = process.argv.includes('--check');
for (const name of ['types', 'balance', 'deterministicMath', 'difficulty', 'random', 'engine', 'rulesVersion']) {
  const source = execFileSync('git', ['show', `${revision}:supabase/functions/_shared/game/${name}.ts`], { encoding: 'utf8' }).replace(/\r\n/g, '\n');
  if (name === 'rulesVersion' && !source.includes('nyang-v1-bc732af6f2a7ea66')) throw new Error('Unexpected legacy version');
  const path = `${destination}/${name}.ts`;
  if (check) {
    if ((await readFile(path, 'utf8')).replace(/\r\n/g, '\n') !== source) throw new Error(`Legacy source drift: ${name}`);
  } else { await mkdir(destination, { recursive: true }); await writeFile(path, source); }
}
console.log(`${check ? 'Checked' : 'Generated'} immutable published legacy kernel (${revision})`);
