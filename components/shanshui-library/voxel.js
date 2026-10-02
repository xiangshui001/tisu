import * as T from '../astral-library/vendor/three.module.js';

export const C = Object.freeze({
  paper: '#eee5cf', plaster: '#e2dcc6', plasterShade: '#cecdb8', stone: '#b8bca7', stoneLight: '#d2d0b9', stoneDark: '#8b9789',
  wood: '#73513b', woodLight: '#a47b52', woodDark: '#403e32', red: '#9b5944', gold: '#cba565',
  roof: '#3b5552', roofDark: '#2a4141', roofLight: '#52716a', roofEdge: '#779188',
  earth: '#77785a', soil: '#596951', grass: '#80936b', grassLight: '#9ba67a', moss: '#637b60',
  water: '#528d87', waterLight: '#7caca1', pine: '#3c6755', leaf: '#69845e', leafLight: '#97a778',
  goldLeaf: '#d3ad54', ochre: '#b68c42', maple: '#b76845', flower: '#e2b5a2', ink: '#374544',
});

/** A small deterministic cuboid authoring layer. Scene and export use the same data. */
export function createVoxels() {
  const root = new T.Group();
  root.name = '栖山书院 · 山水藏书园';
  const geometry = new T.BoxGeometry(1, 1, 1);
  const materials = new Map(), batches = new Map(), records = [], glowMaterials = [];
  let seed = 923817, disposed = false, drawBatches = 0;
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const pick = list => list[Math.floor(rnd() * list.length)];
  function group(name, parent = root, x = 0, y = 0, z = 0, angle = 0) {
    const g = new T.Group(); g.name = name; g.position.set(x, y, z); g.rotation.y = angle; parent.add(g); return g;
  }
  function material(color, kind = 'solid') {
    const key = color + kind;
    if (!materials.has(key)) {
      const m = new T.MeshStandardMaterial({ color, roughness: kind === 'water' ? .3 : .88,
        metalness: kind === 'water' ? .12 : 0,
        emissive: kind === 'glow' ? color : '#000000', emissiveIntensity: kind === 'glow' ? .45 : 0 });
      m.name = key;
      materials.set(key, m);
      if (kind === 'glow') glowMaterials.push(m);
    }
    return materials.get(key);
  }
  function box(g, x, y, z, w, h, d, color = C.stone, kind = 'solid', angle = 0) {
    if (![x, y, z, w, h, d, angle].every(Number.isFinite) || Math.min(w, h, d) <= 0) throw new Error('Invalid garden cuboid');
    const key = g.uuid + color + kind;
    if (!batches.has(key)) batches.set(key, { group: g, material: material(color, kind), items: [] });
    const item = { x, y, z, w, h, d, angle, color, kind, group: g };
    batches.get(key).items.push(item); records.push(item);
  }
  function line(g, a, b, size, color, step = size * .8) {
    const length = Math.hypot(...a.map((v, i) => v - b[i]));
    const count = Math.max(1, Math.ceil(length / step));
    for (let i = 0; i <= count; i++) {
      const t = i / count; box(g, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, size, size, size, color);
    }
  }
  function finish() {
    root.updateMatrixWorld(true);
    const packed = new Map(), obj = new T.Object3D(), matrix = new T.Matrix4(), inverse = new T.Matrix4();
    // Static details share material batches across buildings and trees. Animated parts
    // and removable roofs keep their own transform roots.
    for (const p of records) {
      let destination = p.group;
      while (destination !== root && !destination.userData.batchRoot) destination = destination.parent;
      const key = destination.uuid + p.color + p.kind;
      if (!packed.has(key)) packed.set(key, { group: destination, material: material(p.color, p.kind), items: [] });
      packed.get(key).items.push(p);
    }
    drawBatches = packed.size;
    for (const batch of packed.values()) {
      const mesh = new T.InstancedMesh(geometry, batch.material, batch.items.length);
      mesh.name = batch.group.name + ' / ' + batch.material.name;
      inverse.copy(batch.group.matrixWorld).invert();
      batch.items.forEach((p, i) => {
        obj.position.set(p.x, p.y, p.z); obj.scale.set(p.w, p.h, p.d); obj.rotation.set(0, p.angle, 0);
        obj.updateMatrix(); matrix.multiplyMatrices(p.group.matrixWorld, obj.matrix).premultiply(inverse); mesh.setMatrixAt(i, matrix);
      });
      mesh.castShadow = batch.material.metalness !== .12;
      mesh.receiveShadow = true; mesh.computeBoundingSphere(); batch.group.add(mesh);
    }
    root.updateMatrixWorld(true);
  }
  function dispose() {
    if (disposed) return; disposed = true;
    root.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
    geometry.dispose(); materials.forEach(m => m.dispose()); root.removeFromParent();
  }
  return { root, group, box, line, rnd, pick, finish, dispose, records, materials, glowMaterials,
    get stats() { return { cuboids: records.length, batches: drawBatches || batches.size, materials: materials.size }; } };
}
