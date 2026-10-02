import { C } from './voxel.js';

export function isPond(x, z) {
  const edge = ((x - 1) / 25) ** 2 + ((z - 11) / 16.5) ** 2;
  const irregular = .09 * Math.sin(x * .32 + z * .22) + .055 * Math.cos(z * .7);
  const lake = edge < 1 + irregular;
  const stream = ((x + 24) / 6.5) ** 2 + ((z + 3) / 14) ** 2 < 1;
  const island = ((x - 4) / 5.3) ** 2 + ((z - 14) / 4.9) ** 2 < 1;
  return (lake || stream) && !island;
}

export function createLandscape(v) {
  const { box: b, group, rnd, pick, line } = v;
  const terrain = group('山水台地'), foliage = group('园林草木'), water = group('一池碧水');
  const falls = group('叠瀑水帘'), fallingWater = [], trees = [];
  const grassColors = [C.grass, C.grass, '#82946e', '#889972', '#8e9d75', '#7c9168'];
  const stones = [C.stoneLight, '#c1c2ad', '#c6c6b0', '#b7bda9'];
  // A chamfered scholar's-table-sized diorama, with exposed sediment and stone courses.
  for (let z = -35; z < 35; z++) {
    const bevel = Math.max(0, Math.abs(z + .5) - 29), width = 90 - bevel * 2;
    b(terrain, 0, -2.7, z + .5, width - 1.2, .7, 1, '#666b57');
    b(terrain, 0, -1.85, z + .5, width, 1, 1, C.earth);
    b(terrain, 0, -1.18, z + .5, width + .4, .34, 1, C.soil);
    b(terrain, 0, -.61, z + .5, width + .5, .8, 1, C.stoneDark);
  }
  const step = .86;
  for (let x = -44.72; x < 45; x += step) for (let z = -34.4; z < 34.8; z += step) {
    if (Math.abs(x) + Math.max(0, Math.abs(z) - 29) > 44.7) continue;
    const pond = isPond(x, z);
    if (pond) {
      b(water, x, -.21, z, step + .008, .16, step + .008, pick(['#60968a', '#659a8f', '#60968a', '#659a8f', '#63988d']), 'water');
      if (rnd() < .024) b(water, x, -.119, z, .4 + rnd() * .7, .018, .055, '#a2c0a9', 'water');
    } else {
      const shore = [[step, 0], [-step, 0], [0, step], [0, -step]].some(([dx, dz]) => isPond(x + dx, z + dz));
      const plaza = z < -6 && z > -15 && Math.abs(x) < 21;
      const path = (z > 27 && Math.abs(x) < 30) || (Math.abs(x - 32) < 2 && z > -8 && z < 28)
        || (Math.abs(x + 32 + Math.sin(z * .13) * 4) < 1.7 && z > -13 && z < 26)
        || (Math.abs(x - 2) < 2 && z > -9 && z < -2)
        || (((x + 19) / 10) ** 2 + ((z - 21) / 6) ** 2 < 1);
      const c = shore ? pick([C.stone, C.stoneLight, C.stoneDark]) : (plaza || path) ? pick(stones) : pick(grassColors);
      b(terrain, x, shore ? .13 + rnd() * .17 : .11, z, step - .025, shore ? .4 + rnd() * .15 : .25, step - .025, c);
      if (shore && rnd() < .13) b(terrain, x, .44, z, .55, .21, .5, C.moss);
      if (!(shore || plaza || path) && rnd() < .06) b(foliage, x, .37, z, .18, .28, .18, C.grassLight);
    }
  }
  // Front edge masonry, green patina and horizontal bands.
  for (let x = -37; x < 38; x += 1.25) {
    b(terrain, x, -1.75, 35.03, 1.17, .47, .1, pick(['#85866b', '#939077', '#7a8167']));
    if (rnd() < .3) b(terrain, x, -.93, 35.09, .75, .12, .07, C.moss);
  }
  function rock(x, z, height, width = height * .58, depth = width * .85, parent = terrain) {
    const g = group('太湖叠石', parent, x, 0, z);
    const s = .64;
    for (let y = .4; y < height; y += s) {
      const t = y / height, taper = (1 - t * .73), lean = Math.sin(t * 4) * width * .13;
      for (let xx = -width * taper / 2; xx <= width * taper / 2; xx += s) for (let zz = -depth * taper / 2; zz <= depth * taper / 2; zz += s) {
        const boundary = (xx / (width * taper * .53)) ** 2 + (zz / (depth * taper * .53)) ** 2;
        if (boundary > 1.25 || (boundary < .38 && y < height - s * 2 && y > s)) continue;
        const hole = height < 6 && y > height * .24 && y < height * .59 && Math.abs(xx) < .6 && zz > -.3;
        if (hole || rnd() < .06) continue;
        b(g, xx + lean, y, zz + Math.sin(y * .55) * .3, s + .08, s + .02, s + .08,
          pick(['#8c998c', '#9ba697', '#aab2a1', '#7d9182', '#b8bcaa']));
        if (boundary > .75 && rnd() < .07) b(g, xx + lean, y + .34, zz, .65, .09, .6, C.moss);
      }
    }
    return g;
  }
  // Tall crag silhouettes sit behind the lower western reading room.
  rock(-33, -25, 16.4, 12, 11); rock(-38, -20, 10.3, 8.7, 8); rock(-27, -26, 12.3, 8.8, 8);
  rock(-29, -17, 8.2, 7.6, 7); rock(-35, -12, 6.4, 8, 6);
  // Three connected shelves make the source of the stream legible.
  for (const [x, z, y, w] of [[-30.2, -14, 7.5, 1.8], [-28.5, -11.9, 4.4, 2.1], [-26.9, -9.8, 1.6, 2.2]]) {
    for (let shelf = .3; shelf < y - .25; shelf += .5) {
      b(terrain, x - .25, shelf, z - .1, w + .65 + (y - shelf) * .12, .51, 2.5, pick(['#9ba697', '#aab2a1', '#8c998c']));
    }
    b(water, x, y, z, w, .2, 2.3, '#8ebcb0', 'water');
    for (let j = 0; j < 15; j++) {
      const g = group('落水珠', falls);
      g.userData.batchRoot = true;
      b(g, x + (rnd() - .5) * w * .82, 0, z + 1.2, .13 + rnd() * .16, .55 + rnd() * .75, .16, pick(['#c1d7c7', '#a4cabb', '#86b5ad']), 'water');
      fallingWater.push({ g, top: y, bottom: Math.max(.2, y - 3.8), phase: rnd() });
    }
    for (let i = 0; i < 6; i++) b(water, x + (rnd() - .5) * w, Math.max(.05, y - 3.65), z + 1.5 + rnd() * .9, .4, .08, .26, '#c5d7bd', 'water');
  }
  rock(24, 23, 3.8, 4.2, 3.5); rock(28, 24.5, 2.5, 3.1, 2.6);
  rock(-21, 25, 3.2, 3.2, 2.8); rock(-16, 25.6, 1.7, 2.6, 2.1);
  function canopy(g, x, y, z, rx, ry, rz, colors, unit = .65) {
    for (let xx = -rx; xx <= rx; xx += unit) for (let yy = -ry; yy <= ry; yy += unit) for (let zz = -rz; zz <= rz; zz += unit) {
      const f = (xx / rx) ** 2 + (yy / ry) ** 2 + (zz / rz) ** 2;
      if (f > 1 + rnd() * .18 || f < .43 || rnd() < .13) continue;
      b(g, x + xx, y + yy, z + zz, unit * .94, unit * .86, unit * .94, pick(colors));
    }
  }
  function tree(type, x, z, scale = 1, base = 0) {
    const g = group(type === 'pine' ? '苍松' : type === 'ginkgo' ? '银杏' : '枫树', foliage, x, base, z);
    g.scale.setScalar(scale); trees.push({ type, x, z });
    const colors = type === 'pine' ? ['#345d4d', '#426d54', '#567e5f', '#6d9069']
      : type === 'ginkgo' ? ['#b99644', '#ccab4f', '#e0be62', '#e4c879', '#c9a14d']
      : ['#ac573e', '#c6744b', '#da9560', '#bd7549', '#e3a76c'];
    if (type === 'pine') {
      line(g, [0, 0, 0], [-.3, 3.6, 0], .54, C.woodDark);
      line(g, [-.3, 3.6, 0], [1, 7.7, .4], .43, C.wood);
      for (const [xx, yy, zz, size] of [[-2.5, 4.2, -.5, 2.7], [2.1, 5.6, 1.1, 3], [-1.1, 6.6, -1.6, 2.7], [1.3, 8.1, .4, 2.5]]) {
        line(g, [.2, yy - 1.1, 0], [xx, yy, zz], .31, C.woodDark);
        canopy(g, xx, yy + .25, zz, size, .95, size * .74, colors, .59);
      }
    } else {
      line(g, [0, 0, 0], [.1, 6.3, -.3], .46, C.wood);
      for (let i = 0; i < 6; i++) {
        const a = i * 2.399, xx = Math.cos(a) * (1.6 + rnd()), zz = Math.sin(a) * (1.5 + rnd()), yy = 4.6 + i * .48;
        line(g, [0, 2.9 + i * .33, 0], [xx, yy, zz], .23, C.woodDark);
        canopy(g, xx, yy + 1, zz, 2.2, 1.7, 2, colors, .62);
      }
      canopy(g, .1, 8.1, -.3, 2, 1.8, 1.8, colors, .64);
      for (let i = 0; i < 26; i++) b(foliage, x + (rnd() - .5) * 7 * scale, .275, z + (rnd() - .5) * 6 * scale, .13, .025, .2, pick(colors), 'solid', rnd() * 3);
    }
    for (let i = 0; i < 5; i++) line(g, [0, .48, 0], [Math.cos(i * 1.26) * 1.1, .1, Math.sin(i * 1.26) * 1.1], .18, C.woodDark);
    return g;
  }
  tree('pine', -37, 8, 1.24); tree('pine', -20, -28, .74, 4.5); tree('pine', -37, -26, .68, 12);
  tree('pine', -17, 23, .89); tree('ginkgo', 34, 23, 1.12); tree('ginkgo', -20, -5, .88);
  tree('ginkgo', 20, -28, .75); tree('maple', -32, 25, .92); tree('maple', 37, -18, .9);
  tree('pine', 39, -6, .87); tree('maple', 16, 26, .6);
  function bamboo(x, z, amount = 10) {
    for (let n = 0; n < amount; n++) {
      const xx = x + (rnd() - .5) * 3.7, zz = z + (rnd() - .5) * 3.7, h = 4 + rnd() * 2.8;
      b(foliage, xx, h / 2, zz, .13, h, .13, '#658466');
      for (let y = .7; y < h; y += .62) {
        b(foliage, xx, y, zz, .18, .09, .18, '#a2ad79');
        if (y > h * .5) for (const s of [-1, 1]) {
          line(foliage, [xx, y, zz], [xx + s * .8, y + .35, zz + s * .3], .075, C.pine);
          for (let j = 0; j < 3; j++) b(foliage, xx + s * (.45 + j * .22), y + .4 + j * .1, zz + s * .35, .48, .08, .19, pick([C.pine, C.leaf, C.leafLight]), 'solid', s * .6);
        }
      }
    }
  }
  bamboo(39, -27, 13); bamboo(-40, -4, 11); bamboo(24, -6, 8);
  // Understory keeps large trees anchored in planted beds rather than a bare grid.
  for (const [x, z] of [[-39, 10], [-35, 11], [-33, 24], [-30, 27], [36, 25], [33, 26], [39, -19], [36, -20], [38, -8], [-22, -6], [21, -29]]) {
    canopy(foliage, x, .7, z, 1.3, .65, 1.05, ['#64825d', '#799465', '#8da170'], .38);
    for (let j = 0; j < 5; j++) {
      const xx = x + (rnd() - .5) * 2, zz = z + (rnd() - .5) * 2;
      b(foliage, xx, 1.03, zz, .14, .12, .14, pick(['#ddc4a2', '#c89d81', '#d9b689']));
    }
  }
  // A modest stone mosaic marks the central library court.
  for (let r = 1.0; r < 2.75; r += .7) for (let angle = 0; angle < Math.PI * 2; angle += .105) {
    b(terrain, Math.cos(angle) * r, .25, -10 + Math.sin(angle) * r, .2, .04, .2, r < 2 ? '#788d7c' : '#9b9f83');
  }
  for (const s of [-1, 1]) for (let i = 0; i < 10; i++) {
    b(terrain, s * (4.5 + i * .28), .26, -10, .17, .045, .45, '#8a9680');
  }
  // Water plants: floating lotus leaves have stepped silhouettes and geometric blossoms.
  for (const [x, z] of [[-13, 15], [-12, 18], [-9, 20], [14, 20], [16, 17], [18, 14], [-20, 6]]) {
    for (let i = 0; i < 6; i++) {
      const xx = x + (rnd() - .5) * 3.3, zz = z + (rnd() - .5) * 3.3;
      if (!isPond(xx, zz)) continue;
      const w = .48 + rnd() * .37;
      b(foliage, xx, .015, zz, w, .06, w * .75, pick(['#638c67', '#7b9c6b', '#8fa777']));
      b(foliage, xx, .015, zz, w * .65, .06, w, '#73966a');
      if (i === 0 || i === 4) {
        b(foliage, xx, .26, zz, .065, .45, .065, C.leaf);
        for (let k = 0; k < 5; k++) b(foliage, xx + Math.cos(k * 1.256) * .21, .48, zz + Math.sin(k * 1.256) * .21, .25, .17, .26, C.flower);
        b(foliage, xx, .61, zz, .23, .15, .23, C.gold);
      }
    }
  }
  for (const [x, z] of [[-23, 12], [22, 9], [7, 28], [-27, -9], [21, 24]]) for (let n = 0; n < 10; n++) {
    const xx = x + (rnd() - .5) * 2.1, zz = z + (rnd() - .5) * 1.4, h = .5 + rnd() * .85;
    b(foliage, xx, h / 2 + .25, zz, .08, h, .08, C.leaf);
    if (n % 3 === 0) b(foliage, xx, h + .2, zz, .15, .33, .15, '#a58e5d');
  }
  // Broad, arched stone bridge: clear opening, shallow steps and stepped balustrades.
  const bridge = group('听泉石拱桥', v.root, 3, 0, 3);
  const span = 13.8;
  for (let i = 0; i <= 34; i++) {
    const z = -span / 2 + i * span / 34, t = i / 34, yy = .47 + Math.sin(Math.PI * t) * 1.85;
    b(bridge, 0, yy, z, 3.25, .37, .43, pick(stones));
    for (const s of [-1, 1]) {
      b(bridge, s * 1.53, yy - .37, z, .45, .6, .44, C.stoneDark);
      b(bridge, s * 1.57, yy + 1.02, z, .28, .21, .46, C.stoneLight);
      if (i % 3 === 0) {
        b(bridge, s * 1.57, yy + .56, z, .29, .93, .29, C.stone);
        b(bridge, s * 1.57, yy + 1.26, z, .43, .2, .43, C.stoneLight);
      }
    }
  }
  // A narrow zigzag footbridge beside the pavilion is raised on piles.
  const boardwalk = group('临水折廊');
  for (const [x, z, len, angle] of [[12.7, 13.6, 8, 0], [16.65, 10.8, 5.6, Math.PI / 2], [20.4, 8, 7.5, 0]]) {
    const g = group('木栈桥', boardwalk, x, 0, z, angle);
    for (let j = -len / 2; j < len / 2; j += .35) b(g, j, .68, 0, .31, .16, 1.85, pick([C.wood, C.woodLight]));
    for (const side of [-1, 1]) b(g, 0, .5, side * .73, len, .25, .13, C.woodDark);
    for (let j = -len / 2; j <= len / 2; j += 2.4) for (const side of [-1, 1]) b(g, j, .01, side * .73, .23, 1.15, .23, C.woodDark);
  }
  // Low rounded planting beds, carved stone seats and a garden entrance path.
  for (const [x, z] of [[-25, 19], [-23, 23], [31, 16], [37, 18]]) {
    b(terrain, x, .45, z, 1.5, .75, 1.25, C.stoneDark);
    b(terrain, x, .85, z, 1.75, .19, 1.45, C.stoneLight);
  }
  function update(time) {
    for (const drop of fallingWater) drop.g.position.y = drop.top - ((time * .66 + drop.phase) % 1) * (drop.top - drop.bottom);
  }
  update(0);
  return { terrain, water, foliage, falls, trees, update, rock };
}
