import { build } from 'esbuild';
import { mkdir, rm, copyFile, readFile, writeFile, cp } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist/src', { recursive: true });
await build({ entryPoints: ['src/app.js'], bundle: true, outfile: 'dist/src/app.js', minify: true, format: 'esm', target: ['chrome110', 'edge110', 'safari16'], legalComments: 'none' });
await copyFile('src/styles.css', 'dist/src/styles.css');
await cp('assets', 'dist/assets', { recursive: true });
await writeFile('dist/index.html', await readFile('index.html'));
console.log('Built static app in dist/');
