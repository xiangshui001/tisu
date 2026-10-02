import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.resolve(process.argv[2] || path.join(root, 'dist/shanshui-library.html'));
const result = await build({ absWorkingDir: root, entryPoints: ['examples/shanshui/ui.js'], bundle: true, write: false, minify: true,
  format: 'iife', platform: 'browser', target: 'es2022', legalComments: 'inline' });
const [template, css] = await Promise.all(['index.html', 'style.css'].map(name => fs.readFile(path.join(root, 'examples/shanshui', name), 'utf8')));
const license = await fs.readFile(path.join(root, 'components/astral-library/vendor/THREE-LICENSE.txt'), 'utf8');
const html = template.replace('<link rel="stylesheet" href="./style.css">', '<style>' + css + '</style>')
  .replace('</head>', '<!-- Bundled Three.js license\n' + license.replace(/--/g, '—') + '\n-->\n</head>')
  .replace('href="./index.html"', 'href="#"')
  .replace('<script type="module" src="./ui.js"></script>', '<script>' + result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script') + '</script>');
await fs.mkdir(path.dirname(destination), { recursive: true }); await fs.writeFile(destination, html);
console.log(JSON.stringify({ destination, bytes: Buffer.byteLength(html), offline: true }));
