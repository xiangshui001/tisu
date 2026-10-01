import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../components/astral-library/vendor/three.module.js';
import { buildArchitecture } from '../components/astral-library/architecture.js';

test('stairs connect all three floors in both directions; furniture and gallery edges remain solid', () => {
  const scene = new T.Scene(), building = buildArchitecture(scene);
  try {
    assert(building.stats.voxels > 65000);
    assert(building.stats.books > 3500);
    assert.equal(building.voxelData.length, building.stats.voxels);
    assert.deepEqual(building.floorHeights, [.9, 7.9, 14.9]);
    for (const stair of building.stairs) {
      let y = stair.y0;
      for (let z = stair.zStart; z >= stair.zEnd - .001; z -= .1) {
        const floor = building.sampleFloor(stair.x, z, y);
        assert(floor, `No support while ascending z=${z}`); y = floor.y;
      }
      assert(Math.abs(y - stair.y1) < .06);
      y = stair.y1;
      for (let z = stair.zEnd; z <= stair.zStart + .001; z += .1) {
        const floor = building.sampleFloor(stair.x, z, y);
        assert(floor, `No support while descending z=${z}`); y = floor.y;
      }
      assert(Math.abs(y - stair.y0) < .06);
    }
    assert(building.sampleFloor(0, 8, .9));
    assert(!building.sampleFloor(-4.2, 5, .9), 'Desk must block movement');
    assert(!building.sampleFloor(-12.4, 10.5, .9), 'Catalog cabinet must block movement');
    assert(!building.sampleFloor(-15, -9, 7.9), 'Gallery sofa must block movement');
    assert(!building.sampleFloor(-15.5, .6, .9), 'Library ladder must block movement');
    assert(!building.sampleFloor(0, 0, 7.9), 'Atrium has no second-floor support');
    assert(!building.sampleFloor(0, 0, 14.9), 'Atrium has no third-floor support');
    assert(building.sampleFloor(-9.3, 8.3, 7.9));
    assert(building.sampleFloor(-5.5, -12.8, 14.9));
    building.setCutaway(true); assert(!building.roof.visible && !building.shell.visible);
    building.setCutaway(false); assert(building.roof.visible && building.shell.visible);
  } finally { building.dispose(); }
  assert.equal(scene.children.length, 0);
});

test('upstairs starting cameras have supported floors and unobstructed center views', () => {
  const scene = new T.Scene(), building = buildArchitecture(scene);
  try {
    scene.updateMatrixWorld(true);
    for (const [x, y, z, yaw, pitch] of [[-9.3, 9.57, 8.3, -.78, -.1], [-5.5, 16.57, -12.8, -2.56, -.2]]) {
      assert(building.sampleFloor(x, z, y - 1.67));
      const direction = new T.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
      const ray = new T.Raycaster(new T.Vector3(x, y, z), direction);
      const hit = ray.intersectObjects([building.inside, building.shell], true).find(hit => hit.object.isInstancedMesh && !hit.object.material.transparent);
      assert(hit && hit.distance > 6, 'A nearby column, wall or plant blocks the center view');
    }
  } finally { building.dispose(); }
});
