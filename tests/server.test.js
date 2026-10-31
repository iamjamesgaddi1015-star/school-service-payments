import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('local server serves app files with security headers and refuses non-app files and writes', async t => {
  const child = spawn(process.execPath, ['server.mjs'], { cwd: new URL('..', import.meta.url), stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => { if (child.exitCode === null) { child.kill(); await once(child, 'exit'); } });
  await Promise.race([
    once(child.stdout, 'data'),
    once(child, 'exit').then(([code]) => { throw new Error(`Server exited early: ${code}`); }),
    new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Server did not start')), 5000); timer.unref(); }),
  ]);
  const root = await fetch('http://127.0.0.1:5173/');
  assert.equal(root.status, 200);
  assert.match(await root.text(), /Service ledger/);
  assert.match(root.headers.get('content-security-policy'), /connect-src https:\/\/jjpaxysocfvumjvbbrlb.supabase.co/);
  assert.equal(root.headers.get('x-content-type-options'), 'nosniff');
  for (const path of ['/src/app.js', '/src/styles.css']) assert.equal((await fetch(`http://127.0.0.1:5173${path}`)).status, 200);
  for (const [path, type] of [['/assets/school-route.png', 'image/png'], ['/assets/instrument-sans-latin-400-normal.woff2', 'font/woff2'], ['/assets/instrument-sans-latin-600-normal.woff2', 'font/woff2']]) {
    const asset = await fetch(`http://127.0.0.1:5173${path}`);
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get('content-type'), new RegExp(type));
    assert.ok((await asset.arrayBuffer()).byteLength > 0);
  }
  for (const path of ['/src/model.js', '/README.md', '/package.json', '/server.mjs', '/AGENTS.md', '/.git/config', '/unknown']) assert.equal((await fetch(`http://127.0.0.1:5173${path}`)).status, 404);
  assert.equal((await fetch('http://127.0.0.1:5173/', { method: 'POST', body: 'no writes' })).status, 404);
});
