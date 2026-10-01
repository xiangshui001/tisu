import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));

test('public package import is safe without a browser and registration is explicit', async () => {
  assert.equal(globalThis.document, undefined);
  assert.equal(globalThis.HTMLElement, undefined);
  const api = await import('../components/astral-library/index.js');
  assert.equal(typeof api.mountLibrary, 'function');
  assert.equal(typeof api.buildArchitecture, 'function');
  assert.equal(typeof api.TisuLibraryElement, 'function');
  assert.equal(api.defineLibraryElement(), false);
});

test('all relative module imports and example assets resolve locally', () => {
  function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
  }
  for (const file of walk(root).filter(file => /\.(js|html)$/.test(file) && !file.includes(`${path.sep}tests${path.sep}`))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)) assert(fs.existsSync(path.resolve(path.dirname(file), match[1])), `${file}: ${match[1]}`);
    if (file.endsWith('.html')) for (const match of text.matchAll(/(?:src|href)="(\.[^"]+)"/g)) assert(fs.existsSync(path.resolve(path.dirname(file), match[1])), `${file}: ${match[1]}`);
  }
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert(fs.existsSync(path.join(root, packageJson.exports['.'].types)));
  assert(fs.existsSync(path.join(root, packageJson.exports['.'].import)));
});
