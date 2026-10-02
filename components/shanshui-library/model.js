import { createVoxels } from './voxel.js';
import { createArchitecture } from './architecture.js';
import { createLandscape } from './landscape.js';
import { createLife } from './life.js';

export function buildGarden() {
  const v = createVoxels();
  const landscape = createLandscape(v), a = createArchitecture(v), life = createLife(v);
  const main = a.hall({ name: '栖山藏书楼', x: 0, z: -23, width: 28, depth: 11, floors: 2 });
  const west = a.hall({ name: '松风书斋', x: -30, z: -2, width: 15, depth: 8, angle: Math.PI / 2 });
  const east = a.hall({ name: '知鱼书屋', x: 29, z: -17, width: 15, depth: 9, angle: -Math.PI / 2 });
  const pavilion = a.pavilion('湖心读书亭', 4, 14, 5.6, .65);
  a.pavilion('听雨水榭', 28, 7, 8, 1.0);
  a.gallery('东侧连廊', 30, -3.5, 10.5, Math.PI / 2);
  a.gallery('北侧书廊', 20.2, -15.2, 10.6);
  a.moonGate(-11, 29);
  // Readers are placed at the actual furniture heights, including upper-floor desks.
  life.reader('一层展卷', -4, 1.58, 1.22, Math.PI, '#7b8878', true, main);
  life.reader('二层阅书', 4, 6.48, 1.22, Math.PI, '#a27c5e', true, main);
  life.reader('倚栏读书人', 7.8, 6.48, 4.4, 0, '#587270', false, main);
  life.reader('书斋读者', -5.625, 1.58, 1.22, Math.PI, '#826f61', true, west);
  life.reader('东斋读者', 1.875, 1.58, 1.22, Math.PI, '#7e8b85', true, east);
  life.reader('亭中读者', 0, .91, .72, Math.PI, '#8b6558', true, pavilion);
  const outdoorDesk = v.group('松下书案', v.root, -24, 0, 19.5, Math.PI);
  a.desk(outdoorDesk, 0, .35, 0, 3.4);
  life.reader('松下读书人', -24, .43, 18.38, 0, '#687d83');
  life.reader('携书游园', -8, .32, 26.5, -.6, '#b79c6d', false);
  life.reader('桥上赏鱼', 2, 2.4, 3.3, -Math.PI / 2, '#65766c', false);
  // Path lanterns give human scale to the garden at twilight.
  for (const [x, z] of [[-18, -10], [17, -10], [-30, 17], [31, 19], [-7, 27], [11, 27]]) {
    v.box(v.root, x, .42, z, .8, .8, .8, '#929d8a');
    v.box(v.root, x, 1.0, z, .35, .45, .35, '#afb69e');
    a.lantern(v.root, x, 1.75, z, .72);
    v.box(v.root, x, 2.3, z, .95, .19, .95, '#3b5552');
  }
  landscape.update(0); life.update(0); v.finish();
  return {
    root: v.root, records: v.records, materials: v.materials, glowMaterials: v.glowMaterials,
    buildings: a.buildings, roofs: a.roofs,
    stats: { ...v.stats, books: a.books, readers: life.people.length, koi: life.fish.length, birds: life.birds.length,
      trees: landscape.trees.length, halls: a.buildings.length, pavilions: 2 },
    update(time) { landscape.update(time); life.update(time); },
    setCutaway(value) { a.roofs.visible = !value; },
    dispose: v.dispose,
  };
}
