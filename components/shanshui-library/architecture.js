import { C } from './voxel.js';

/** Jiangnan-inspired timber halls. Roofs, latticework and furniture are actual geometry. */
export function createArchitecture(v) {
  const { box: b, group, pick, rnd } = v;
  const roofs = group('可揭开的瓦顶'), buildings = [], lanterns = [];
  roofs.userData.batchRoot = true;
  let books = 0;
  function railing(g, x, y, z, width) {
    b(g, x, y + .84, z, width, .13, .16, C.woodLight);
    b(g, x, y + .18, z, width, .12, .13, C.wood);
    for (let i = -width / 2; i <= width / 2 + .01; i += .65) {
      b(g, x + i, y + .51, z, .1, .64, .12, C.wood);
      b(g, x + i + .16, y + .51, z, .27, .09, .12, C.woodLight);
    }
  }
  function lantern(g, x, y, z, scale = 1) {
    b(g, x, y + .73 * scale, z, .07, .64 * scale, .07, C.woodDark);
    b(g, x, y, z, .52 * scale, .65 * scale, .52 * scale, '#e9b56d', 'glow');
    for (const s of [-1, 1]) {
      b(g, x, y + s * .38 * scale, z, .62 * scale, .11 * scale, .62 * scale, C.red);
      b(g, x + s * .27 * scale, y, z, .045, .68 * scale, .56 * scale, C.wood);
      b(g, x, y, z + s * .27 * scale, .56 * scale, .68 * scale, .045, C.wood);
    }
    b(g, x, y - .7 * scale, z, .08, .55 * scale, .08, C.red);
    lanterns.push({ group: g, x, y, z });
  }
  function roof(parent, width, depth, y, rise, name = '青瓦歇山顶', opening = null) {
    const g = group(name, parent);
    // Layered concave eaves, hipped corners and a long horizontal ridge.
    const step = .42, ridge = Math.max(0, (width - depth) / 2);
    const rows = Math.ceil(depth / 2 / step);
    for (let j = 0; j <= rows; j++) {
      const dist = j * step, t = Math.min(1, dist / (depth / 2));
      const height = y + rise * (1 - t) ** 1.65 + .68 * t ** 9;
      const halfWidth = ridge + dist;
      for (let x = -halfWidth; x <= halfWidth + .02; x += step) {
        for (const side of j === 0 ? [1] : [-1, 1]) {
          if (opening && Math.abs(x) < opening[0] / 2 && dist < opening[1] / 2) continue;
          const tip = Math.max(0, (Math.abs(x) - halfWidth + 1.9) / 1.9);
          const yy = height + .5 * tip ** 2 * t ** 4;
          b(g, x, yy, side * dist, step + .025, .26, step + .025, pick(['#3c5550', '#405b55', '#3b5552', '#3b5552', '#455e57']));
          if (j < rows && Math.round((x + halfWidth) / step) % 2 === 0) b(g, x, yy + .145, side * dist, .075, .045, .44, '#526f65');
          if (j === rows) {
            b(g, x, yy - .19, side * dist, .4, .16, .4, C.woodLight);
            b(g, x, yy + .13, side * (dist + .035), .28, .07, .1, C.roofEdge);
          }
        }
      }
      // Hipped end planes, tiled on a square grid.
      for (const side of [-1, 1]) for (let z = -dist + step; z < dist - .1; z += step) {
        if (opening && halfWidth < opening[0] / 2 && Math.abs(z) < opening[1] / 2) continue;
        b(g, side * halfWidth, height, z, step + .025, .26, step + .025, pick(['#3c5550', '#405b55', '#3b5552', '#455e57']));
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        if (opening && halfWidth < opening[0] / 2 && dist < opening[1] / 2) continue;
        b(g, sx * halfWidth, height + .26 + .5 * t ** 4, sz * dist, .28, .24, .28, C.roofEdge);
      }
    }
    if (opening) return g;
    b(g, 0, y + rise + .27, 0, ridge * 2 + .55, .32, .4, C.roofEdge);
    b(g, 0, y + rise + .49, 0, ridge * 2 + .7, .16, .24, C.roofDark);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 5; i++) b(g, s * (ridge + i * .14), y + rise + .52 + i * .15, 0, .25, .24, .3, C.roofEdge);
      b(g, s * (ridge + .37), y + rise + 1.15, 0, .25, .24, .3, C.roofDark);
    }
    return g;
  }
  function bracket(g, x, y, z) {
    b(g, x, y, z, .55, .18, .6, C.woodLight);
    b(g, x, y + .22, z, 1, .22, .75, C.wood);
    b(g, x, y + .43, z, 1.35, .15, .9, C.woodLight);
    for (const s of [-1, 1]) b(g, x + s * .46, y + .2, z, .18, .4, .35, C.woodLight);
  }
  function lattice(g, x, y, z, width = 2.2, height = 2.65) {
    b(g, x, y, z, width, height, .1, C.paper);
    for (const s of [-1, 1]) {
      b(g, x + s * width / 2, y, z + .12, .13, height + .2, .13, C.wood);
      b(g, x, y + s * height / 2, z + .12, width + .1, .14, .13, C.woodLight);
    }
    for (let xx = -width / 2 + .3; xx < width / 2; xx += .4) b(g, x + xx, y, z + .15, .065, height - .14, .08, C.wood);
    for (let yy = -height / 2 + .26; yy < height / 2; yy += .43) b(g, x, y + yy, z + .18, width - .1, .06, .08, C.wood);
    b(g, x, y - height * .31, z + .23, width * .8, .055, .08, C.gold);
  }
  function book(g, x, y, z, w = .58, d = .74, color = '#627b73') {
    b(g, x, y, z, w, .12, d, C.paper);
    for (const s of [-1, 1]) b(g, x, y + s * .073, z, w + .03, .024, d + .035, color);
    b(g, x - w * .38, y + .09, z, .035, .02, d * .86, C.paper);
    b(g, x + w * .23, y + .09, z + d * .13, .12, .02, d * .4, '#d6c69c');
    books++;
  }
  function shelf(g, x, y, z, width = 3.4) {
    const palette = ['#5c7973', '#bb965a', '#8c5a48', '#b5b39b', '#536674', '#7b8260'];
    b(g, x, y + 1.8, z, width, 3.6, .18, C.woodDark);
    for (const s of [-1, 1]) b(g, x + s * width / 2, y + 1.82, z + .32, .15, 3.7, .9, C.wood);
    for (let row = 0; row < 5; row++) {
      const yy = y + .2 + row * .72;
      b(g, x, yy, z + .28, width + .1, .14, .92, C.woodLight);
      for (let col = 0; col < 5; col++) {
        const xx = x - width / 2 + .4 + col * (width - .65) / 5;
        if ((row + col) % 3 === 0) {
          for (let n = 0; n < 3; n++) book(g, xx, yy + .18 + n * .155, z + .35, .47, .58, pick(palette));
        } else {
          for (let n = 0; n < 3; n++) {
            const bh = .39 + rnd() * .13;
            b(g, xx + n * .15 - .12, yy + .1 + bh / 2, z + .34, .12, bh, .49, pick(palette));
            b(g, xx + n * .15 - .12, yy + bh * .7, z + .592, .065, .13, .012, C.paper); books++;
          }
        }
      }
    }
    b(g, x, y + 3.85, z + .3, width + .28, .15, 1, C.woodLight);
  }
  function desk(g, x, y, z, width = 3) {
    b(g, x, y + 1.17, z, width, .18, 1.35, C.woodLight);
    b(g, x, y + .99, z, width - .18, .16, 1.14, C.wood);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b(g, x + sx * (width / 2 - .2), y + .55, z + sz * .47, .16, 1.1, .16, C.wood);
    b(g, x - .35, y + 1.285, z, 1.05, .025, .76, C.paper);
    for (const s of [-1, 1]) {
      b(g, x - .35 + s * .54, y + 1.3, z, .08, .09, .88, C.woodDark);
      for (let j = 0; j < 5; j++) b(g, x - .35 + s * .21, y + 1.307, z - .27 + j * .12, .3, .008, .025, C.ink);
    }
    book(g, x + .82, y + 1.35, z - .08, .48, .61);
    b(g, x + .67, y + 1.34, z + .44, .22, .07, .13, C.ink);
    b(g, x + .91, y + 1.48, z + .43, .12, .32, .12, C.paper);
    b(g, x + .91, y + 1.65, z + .43, .09, .025, .09, '#826149');
    // A bench leaves the open volume easy to read from outside.
    b(g, x, y + .6, z + 1.12, width * .76, .14, .45, C.wood);
    for (const s of [-1, 1]) b(g, x + s * width * .27, y + .29, z + 1.12, .14, .58, .32, C.woodDark);
  }
  function hall({ name, x, z, width, depth, angle = 0, floors = 1 }) {
    const g = group(name, v.root, x, 0, z, angle);
    const rg = group(name + '瓦顶', roofs, x, 0, z, angle);
    const base = 1.5, story = 4.9, top = base + floors * story;
    b(g, 0, .55, 0, width + 2, 1.1, depth + 2, C.stoneDark);
    b(g, 0, 1.13, 0, width + 2.3, .28, depth + 2.3, C.stoneLight);
    b(g, 0, 1.4, 0, width + .65, .28, depth + .65, C.wood);
    for (let xx = -width / 2; xx < width / 2; xx += .8) b(g, xx + .4, 1.55, 0, .76, .04, depth, C.woodLight);
    for (let j = 0; j < 5; j++) b(g, 0, .18 + j * .27, depth / 2 + 2.5 - j * .45, 4.6, .3, .5, C.stoneLight);
    for (let level = 0; level < floors; level++) {
      const yy = base + level * story;
      if (level) {
        // Leave a real opening above the staircase at the right end of the hall.
        b(g, -1.95, yy - .18, 0, width - 3.4, .34, depth + .5, C.wood);
        b(g, width / 2 - .55, yy - .18, 0, 1.55, .34, depth + .5, C.wood);
        for (const s of [-1, 1]) b(g, width / 2 - 2.65, yy - .18, s * (depth / 2 - .3), 2.7, .34, 1.1, C.wood);
        for (let xx = -width / 2; xx < width / 2; xx += .8) {
          if (xx > width / 2 - 4 && xx < width / 2 - 1.1) continue;
          b(g, xx + .4, yy + .015, 0, .77, .04, depth, C.woodLight);
        }
        railing(g, 0, yy, depth / 2 + .3, width);
      }
      // Pale rear / end walls, an open colonnade toward the water.
      b(g, 0, yy + 2.3, -depth / 2 + .3, width, 4.6, .35, C.plaster);
      for (const s of [-1, 1]) {
        b(g, s * (width / 2 - .12), yy + 2.3, -.4, .35, 4.6, depth - .8, C.plaster);
        b(g, s * (width / 2 - .12), yy + .4, -.4, .43, .8, depth - .8, C.stoneDark);
      }
      const bays = Math.round(width / 4);
      for (let n = 0; n <= bays; n++) {
        const xx = -width / 2 + n * width / bays;
        for (const zz of [-depth / 2, depth / 2 - .2]) {
          b(g, xx, yy + .22, zz, .65, .44, .65, C.stone);
          b(g, xx, yy + 2.34, zz, .35, 4.35, .35, C.wood);
          bracket(g, xx, yy + 4.25, zz);
        }
        if (n < bays) {
          const center = xx + width / bays / 2;
          if (floors === 1 || n !== bays - 1) shelf(g, center, yy + .06, -depth / 2 + .68, Math.min(3.25, width / bays - .4));
          if (n % 2 === 0 && (floors === 1 || n !== bays - 1)) desk(g, center, yy + .08, .1, 2.65);
          // Two end bays have fine screens; middle bays stay open to show books.
          if (n === 0 || n === bays - 1) lattice(g, center, yy + 2.6, depth / 2 - .52, width / bays - .7, 2.8);
        }
      }
      b(g, 0, yy + 4.4, depth / 2 - .2, width + .7, .3, .46, C.woodDark);
      b(g, 0, yy + 4.65, depth / 2 - .2, width + .9, .15, .6, C.woodLight);
      for (const xx of [-width * .33, width * .33]) lantern(g, xx, yy + 3.55, depth / 2 + .35, .85);
      if (level < floors - 1) roof(rg, width + 3.8, depth + 3.5, yy + 4.78, 2.0, '腰檐', [width + .35, depth + .35]);
    }
    if (floors > 1) {
      const stairX = width / 2 - 2.65;
      for (let i = 0; i < 25; i++) {
        const zz = depth / 2 - 1 - i * (depth - 2) / 24, yy = base + (i + 1) * story / 25;
        b(g, stairX, yy - .1, zz, 2.25, .2, .4, C.woodLight);
        for (const s of [-1, 1]) {
          b(g, stairX + s * 1.06, yy + .82, zz, .13, .13, .42, C.wood);
          if (i % 3 === 0) b(g, stairX + s * 1.06, yy + .38, zz, .12, .8, .12, C.wood);
        }
      }
    }
    roof(rg, width + 4.4, depth + 4.2, top, floors === 2 ? 4.4 : 3.2);
    // Plaque is geometric; its readable title is added as a small texture by the viewer.
    const plaqueY = base + 3.65;
    b(g, 0, plaqueY, depth / 2 + .2, 3.35, .92, .2, C.woodDark);
    for (const s of [-1, 1]) b(g, 0, plaqueY + s * .48, depth / 2 + .32, 3.5, .08, .09, C.gold);
    for (const s of [-1, 1]) b(g, s * 1.7, plaqueY, depth / 2 + .32, .08, 1, .09, C.gold);
    buildings.push({ name, group: g, roof: rg, x, z, width, depth, floors, plaque: [0, plaqueY, depth / 2 + .325] });
    return g;
  }
  function pavilion(name, x, z, width = 7, base = 1.1, angle = 0) {
    const g = group(name, v.root, x, 0, z, angle), rg = group(name + '攒尖顶', roofs, x, 0, z, angle);
    b(g, 0, base - .5, 0, width + 1.6, 1, width + 1.6, C.stoneDark);
    b(g, 0, base + .06, 0, width + 1.9, .17, width + 1.9, C.stoneLight);
    b(g, 0, base + .21, 0, width + .5, .15, width + .5, C.woodLight);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b(g, sx * width * .4, base + .45, sz * width * .4, .64, .5, .64, C.stone);
      b(g, sx * width * .4, base + 2.35, sz * width * .4, .32, 4, .32, C.red);
      bracket(g, sx * width * .4, base + 4.08, sz * width * .4);
      lantern(g, sx * width * .4, base + 3.3, sz * width * .4, .65);
    }
    for (const s of [-1, 1]) {
      b(g, 0, base + 4.27, s * width * .4, width + .5, .3, .38, C.wood);
      b(g, s * width * .4, base + 4.27, 0, .38, .3, width + .5, C.wood);
    }
    railing(g, 0, base + .23, -width * .43, width * .87);
    roof(rg, width + 2.8, width + 2.8, base + 4.3, 3.45, '攒尖亭顶');
    b(rg, 0, base + 8.35, 0, .4, .5, .4, C.gold);
    desk(g, 0, base + .26, -.4, 2.6);
    return g;
  }
  function gallery(name, x, z, length, angle = 0) {
    const g = group(name, v.root, x, 0, z, angle), rg = group(name + '顶', roofs, x, 0, z, angle);
    b(g, 0, .7, 0, length + .5, 1.4, 3.45, C.stoneDark);
    b(g, 0, 1.43, 0, length + .7, .13, 3.65, C.stoneLight);
    for (let xx = -length / 2; xx <= length / 2 + .1; xx += 3.25) {
      for (const s of [-1, 1]) {
        b(g, xx, 3.22, s * 1.35, .24, 3.6, .24, C.wood);
        bracket(g, xx, 4.79, s * 1.35);
      }
    }
    railing(g, 0, 1.5, -1.42, length);
    for (const s of [-1, 1]) b(g, 0, 5.04, s * 1.35, length + .5, .25, .32, C.woodLight);
    roof(rg, length + 2.4, 5.3, 5.1, 1.65, '曲廊瓦顶');
    for (let xx = -length / 2 + 1.6; xx < length / 2; xx += 6.5) lantern(g, xx, 4.0, 1.4, .55);
    return g;
  }
  function moonGate(x, z) {
    const g = group('月洞门与漏窗粉墙', v.root, x, 0, z);
    const radius = 2, centerY = 2.45;
    for (let xx = -7; xx <= 7; xx += .3) {
      const inside = Math.abs(xx) < radius, dy = inside ? Math.sqrt(radius * radius - xx * xx) : 0;
      if (inside) {
        const top = centerY + dy;
        b(g, xx, (5.25 + top) / 2, 0, .305, 5.25 - top, .65, C.plaster);
        if (centerY - dy > .1) b(g, xx, (centerY - dy) / 2, 0, .305, centerY - dy, .65, C.plaster);
      } else {
        const opening = Math.abs(Math.abs(xx) - 4.7) < 1;
        if (opening) {
          b(g, xx, .7, 0, .305, 1.4, .65, C.plaster);
          b(g, xx, 4.46, 0, .305, 1.58, .65, C.plaster);
        } else b(g, xx, 2.625, 0, .305, 5.25, .65, C.plaster);
      }
      b(g, xx, 5.35, 0, .33, .18, 1.05, pick([C.roof, C.roofLight]));
    }
    for (let a = 0; a < Math.PI * 2; a += .09) b(g, Math.cos(a) * radius, centerY + Math.sin(a) * radius, .38, .24, .24, .17, C.stoneDark);
    for (const s of [-1, 1]) {
      lattice(g, s * 4.7, 2.54, -.1, 1.7, 2.05);
      b(g, s * 7.1, 2.7, 0, .45, 5.4, .8, C.plasterShade);
    }
  }
  return { roofs, buildings, lanterns, hall, pavilion, gallery, moonGate, desk, shelf, lantern, railing, book,
    get books() { return books; } };
}
