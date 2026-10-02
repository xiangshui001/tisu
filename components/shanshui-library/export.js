import * as T from '../astral-library/vendor/three.module.js';

/** Standard glTF 2.0, baked per material. No custom extensions or external textures. */
export function exportGardenGLB(model) {
  model.root.updateMatrixWorld(true);
  const unit = new T.BoxGeometry(1, 1, 1), pos = unit.attributes.position, normal = unit.attributes.normal, idx = unit.index.array;
  const groups = new Map();
  for (const p of model.records) {
    const key = p.color + p.kind;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const gltf = { asset: { version: '2.0', generator: 'TISU · 栖山书院' }, scene: 0,
    scenes: [{ name: model.root.name, nodes: [] }], nodes: [], meshes: [], materials: [], accessors: [], bufferViews: [], buffers: [{ byteLength: 0 }] };
  const chunks = []; let offset = 0;
  const vec = new T.Vector3(), norm = new T.Vector3(), transform = new T.Matrix4(), local = new T.Object3D(), nm = new T.Matrix3();
  function accessor(data, type, componentType, target, bounds) {
    const view = gltf.bufferViews.length;
    gltf.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: data.byteLength, target });
    chunks.push(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)); offset += data.byteLength;
    const id = gltf.accessors.length;
    gltf.accessors.push({ bufferView: view, componentType, count: data.length / (type === 'VEC3' ? 3 : 1), type, ...bounds });
    return id;
  }
  for (const [key, items] of groups) {
    const n = items.length, positions = new Float32Array(n * pos.count * 3), normals = new Float32Array(positions.length), indices = new Uint32Array(n * idx.length);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) {
      const p = items[i]; local.position.set(p.x, p.y, p.z); local.rotation.set(0, p.angle, 0); local.scale.set(p.w, p.h, p.d); local.updateMatrix();
      transform.multiplyMatrices(p.group.matrixWorld, local.matrix); nm.getNormalMatrix(transform);
      for (let j = 0; j < pos.count; j++) {
        vec.fromBufferAttribute(pos, j).applyMatrix4(transform); norm.fromBufferAttribute(normal, j).applyMatrix3(nm).normalize();
        const at = (i * pos.count + j) * 3;
        positions.set(vec.toArray(), at); normals.set(norm.toArray(), at);
        for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], positions[at + k]); max[k] = Math.max(max[k], positions[at + k]); }
      }
      for (let j = 0; j < idx.length; j++) indices[i * idx.length + j] = idx[j] + i * pos.count;
    }
    const material = model.materials.get(key), materialId = gltf.materials.length;
    gltf.materials.push({ name: key, pbrMetallicRoughness: { baseColorFactor: [...material.color.toArray(), 1], metallicFactor: material.metalness, roughnessFactor: material.roughness },
      ...(items[0].kind === 'glow' ? { emissiveFactor: material.color.toArray().map(c => Math.min(1, c * .6)) } : {}) });
    const p = accessor(positions, 'VEC3', 5126, 34962, { min, max });
    const nn = accessor(normals, 'VEC3', 5126, 34962);
    const ii = accessor(indices, 'SCALAR', 5125, 34963);
    gltf.scenes[0].nodes.push(gltf.nodes.length); gltf.nodes.push({ name: key, mesh: gltf.meshes.length });
    gltf.meshes.push({ primitives: [{ attributes: { POSITION: p, NORMAL: nn }, indices: ii, material: materialId }] });
  }
  unit.dispose(); gltf.buffers[0].byteLength = offset;
  const json = new TextEncoder().encode(JSON.stringify(gltf)), jsonLength = Math.ceil(json.length / 4) * 4;
  const binary = new ArrayBuffer(12 + 8 + jsonLength + 8 + offset), bytes = new Uint8Array(binary), view = new DataView(binary);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, binary.byteLength, true);
  view.setUint32(12, jsonLength, true); view.setUint32(16, 0x4e4f534a, true); bytes.fill(32, 20, 20 + jsonLength); bytes.set(json, 20);
  const binStart = 20 + jsonLength; view.setUint32(binStart, offset, true); view.setUint32(binStart + 4, 0x004e4942, true);
  let cursor = binStart + 8; for (const chunk of chunks) { bytes.set(chunk, cursor); cursor += chunk.length; }
  return binary;
}
