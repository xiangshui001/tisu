import fs from 'node:fs/promises';
import path from 'node:path';
import { buildGarden, exportGardenGLB } from '../components/shanshui-library/index.js';

const destination = path.resolve(process.argv[2] || 'dist/shanshui-library.glb');
const model = buildGarden(); model.update(0);
await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.writeFile(destination, Buffer.from(exportGardenGLB(model)));
console.log(JSON.stringify({ destination, bytes: (await fs.stat(destination)).size, ...model.stats }));
model.dispose();
