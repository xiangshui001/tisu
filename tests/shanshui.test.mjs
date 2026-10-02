import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../components/astral-library/vendor/three.module.js';
import { buildGarden, exportGardenGLB, GARDEN_VIEWS } from '../components/shanshui-library/index.js';

test('garden contains the authored architecture and life; geometry is finite and deterministic', () => {
  const a = buildGarden(), b = buildGarden();
  assert.deepEqual(a.stats, b.stats);
  assert.equal(a.stats.halls, 3); assert.equal(a.stats.pavilions, 2);
  assert.equal(a.stats.readers, 9); assert.equal(a.stats.koi, 8); assert.equal(a.stats.birds, 6);
  assert(a.stats.books > 1400); assert(a.stats.batches < 300);
  for (let i = 0; i < a.records.length; i++) {
    const p = a.records[i], q = b.records[i];
    for (const k of ['x', 'y', 'z', 'w', 'h', 'd', 'angle']) { assert(Number.isFinite(p[k])); assert.equal(p[k], q[k]); }
    assert(Math.min(p.w, p.h, p.d) > 0); assert.equal(p.color, q.color);
  }
  const whole = new T.Box3().setFromObject(a.root);
  assert(whole.min.y > -4 && whole.max.y < 27);
  a.setCutaway(true); assert.equal(a.roofs.visible, false);
  a.setCutaway(false); assert.equal(a.roofs.visible, true);
  assert.deepEqual(Object.keys(GARDEN_VIEWS), ['garden', 'library', 'water', 'reading', 'mountain']);
  a.dispose(); a.dispose(); b.dispose();
});

test('material batching preserves hierarchy transforms, removable roofs and animated wings', () => {
  const model = buildGarden();
  let instanceCount = 0; const instancedBounds = new T.Box3().makeEmpty();
  model.root.traverse(o => {
    if (!o.isInstancedMesh) return;
    instanceCount += o.count;
    o.computeBoundingBox(); instancedBounds.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld));
  });
  assert.equal(instanceCount, model.records.length);
  const recordBounds = new T.Box3().makeEmpty(), unit = new T.Box3(new T.Vector3(-.5, -.5, -.5), new T.Vector3(.5, .5, .5)), obj = new T.Object3D(), matrix = new T.Matrix4();
  for (const p of model.records) {
    obj.position.set(p.x, p.y, p.z); obj.scale.set(p.w, p.h, p.d); obj.rotation.set(0, p.angle, 0); obj.updateMatrix();
    matrix.multiplyMatrices(p.group.matrixWorld, obj.matrix); recordBounds.union(unit.clone().applyMatrix4(matrix));
  }
  assert(instancedBounds.min.distanceTo(recordBounds.min) < .0001);
  assert(instancedBounds.max.distanceTo(recordBounds.max) < .0001);
  const koi = model.root.getObjectByName('游动锦鲤'), wing = model.root.getObjectByName('左翼');
  const position = koi.position.clone(), rotation = wing.rotation.z;
  model.update(5); assert(position.distanceTo(koi.position) > 1); assert.notEqual(wing.rotation.z, rotation);
  model.update(0); assert(position.distanceTo(koi.position) < .0001);
  assert(model.roofs.children.some(o => o.isInstancedMesh)); model.dispose();
});

test('GLB export is a complete, aligned glTF 2 binary with valid triangle indices and bounds', () => {
  const model = buildGarden(), data = exportGardenGLB(model), view = new DataView(data);
  assert.equal(view.getUint32(0, true), 0x46546c67); assert.equal(view.getUint32(4, true), 2); assert.equal(view.getUint32(8, true), data.byteLength);
  const jsonLength = view.getUint32(12, true), json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, jsonLength)));
  assert.equal(json.asset.version, '2.0'); assert.equal(jsonLength % 4, 0); assert.equal(json.buffers[0].byteLength, data.byteLength - 28 - jsonLength);
  assert(!json.buffers[0].uri); assert(!json.extensionsRequired);
  let vertices = 0, triangles = 0;
  const binStart = 28 + jsonLength;
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) {
    const p = json.accessors[primitive.attributes.POSITION], n = json.accessors[primitive.attributes.NORMAL], i = json.accessors[primitive.indices];
    assert.equal(p.count, n.count); assert.equal(p.count % 24, 0); assert.equal(i.count % 36, 0);
    const pv = json.bufferViews[p.bufferView], iv = json.bufferViews[i.bufferView];
    const positions = new Float32Array(data, binStart + pv.byteOffset, p.count * 3), indices = new Uint32Array(data, binStart + iv.byteOffset, i.count);
    for (const index of indices) assert(index < p.count);
    for (let j = 0; j < positions.length; j++) assert(positions[j] >= p.min[j % 3] && positions[j] <= p.max[j % 3]);
    vertices += p.count; triangles += i.count / 3;
  }
  assert.equal(vertices, model.records.length * 24); assert.equal(triangles, model.records.length * 12);
  for (const b of json.bufferViews) { assert.equal(b.byteOffset % 4, 0); assert(b.byteOffset + b.byteLength <= json.buffers[0].byteLength); }
  model.dispose();
});
