// One-off: keep only the compiled files legacy index.html actually needs.
import { readFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ref = /(?:\/assets\/|\.\/|assets\/)([\w.-]+\.(?:js|css))/g;
const seen = new Set();
const todo = ['assets/' + 'INDEX'];
const html = readFileSync('index.html', 'utf8');
todo.length = 0;
for (const m of html.matchAll(ref)) todo.push('assets/' + m[1]);
while (todo.length) {
  const f = todo.pop();
  if (seen.has(f) || !existsSync(f)) continue;
  seen.add(f);
  for (const m of readFileSync(f, 'utf8').matchAll(ref)) todo.push('assets/' + m[1]);
}
mkdirSync('legacy/assets', { recursive: true });
const sh = (c) => execSync(c, { stdio: 'inherit' });
for (const f of seen) sh(`git mv "${f}" "legacy/${f}"`);
sh('git mv index.html legacy/app.html');
for (const f of readdirSync('assets')) sh(`git rm -q "assets/${f}"`);
for (const f of readdirSync('.')) if (/\.(js|css)$/.test(f)) sh(`git rm -q "${f}"`);
console.log(`kept ${seen.size} legacy files`);
