import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../components/astral-library/vendor/three.module.js';
import {buildArchitecture} from '../components/astral-library/architecture.js';
import {LIBRARY_CAMERA_PATHS, createCameraPath} from '../components/astral-library/camera-paths.js';

test('authored camera paths reject invalid vectors/timing and clamp at both ends', () => {
  const path = createCameraPath(LIBRARY_CAMERA_PATHS.reading);
  assert.deepEqual(path.sample(-10).position, path.points[0].position);
  assert.deepEqual(path.sample(path.duration + 1).position, path.points.at(-1).position);
  assert.throws(() => createCameraPath([]));
  assert.throws(() => createCameraPath([{position: [0, 0, 0], target: [0, 0, 0]}, {position: [0, 0, 1], target: [0, 0, 0]}]));
  assert.throws(() => createCameraPath([{position: [0, 1, 0], target: [0, 0, 0]}, {position: [0, 0, 1], target: [0, 0, 0], duration: 0}]));
});

test('all five camera tracks clear actual opaque voxels with a small lens margin', () => {
  const building = buildArchitecture(new T.Scene());
  try {
    const boxes = building.voxelData.filter(v => v.type !== 'glass').map(v => ({...v, cs: Math.cos(v.rot), sn: Math.sin(v.rot)}));
    for (const [name, points] of Object.entries(LIBRARY_CAMERA_PATHS)) {
      const path = createCameraPath(points);
      // This catches thin pillars, roof tiles and window bars between authored endpoints.
      for (let time = 0; time <= path.duration; time += .05) {
        const [x, y, z] = path.sample(time).position;
        const hit = boxes.find(v => {
          if (Math.abs(y - v.y) > v.h / 2 + .08) return false;
          const dx = x - v.x, dz = z - v.z;
          return Math.abs(v.cs * dx - v.sn * dz) < v.w / 2 + .08 && Math.abs(v.sn * dx + v.cs * dz) < v.d / 2 + .08;
        });
        assert(!hit, name + ' clips ' + JSON.stringify(hit) + ' at ' + time.toFixed(2) + 's');
      }
    }
  } finally { building.dispose(); }
});
