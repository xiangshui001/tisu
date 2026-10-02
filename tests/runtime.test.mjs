import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function surface() {
  const events = new Map();
  return {
    clientWidth: 1440, clientHeight: 900, style: {}, tagName: 'CANVAS', attributes: new Map(), events,
    addEventListener(name, handler) { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(handler); },
    removeEventListener(name, handler) { events.get(name)?.delete(handler); },
    dispatch(name, event = {}) { for (const handler of events.get(name) || []) handler(event); },
    setAttribute(name, value) { this.attributes.set(name, value); },
    appendChild(child) { this.child = child; }, setPointerCapture() {},
    focus() { this.focused = true; }, remove() { this.removed = true; }
  };
}
const pending = new Map(); let frameId = 0, clock = performance.now();
const browserWindow = surface();
globalThis.window = browserWindow;
globalThis.devicePixelRatio = 2;
globalThis.requestAnimationFrame = callback => { const id = ++frameId; pending.set(id, callback); return id; };
globalThis.cancelAnimationFrame = id => pending.delete(id);
globalThis.ResizeObserver = class { observe() {} disconnect() { this.disconnected = true; } };
globalThis.__createTestCanvas = surface;
function advance(count) {
  for (let i = 0; i < count; i++) {
    const next = pending.entries().next().value; if (!next) return;
    pending.delete(next[0]); clock += 16; next[1](clock);
  }
}
function key(canvas, code, event = 'keydown') { canvas.dispatch(event, { code, target: canvas, preventDefault() {} }); }

const sourcePath = new URL('../components/astral-library/library.js', import.meta.url);
const threeUrl = new URL('../components/astral-library/vendor/three.module.js', import.meta.url).href;
const cameraPathsUrl = new URL('../components/astral-library/camera-paths.js', import.meta.url).href;
const architectureUrl = new URL('../components/astral-library/architecture.js', import.meta.url).href;
const rendererStub = `import * as Real from ${JSON.stringify(threeUrl)};
const T={...Real,WebGLRenderer:class {
  constructor(){this.shadowMap={};this.domElement=globalThis.__createTestCanvas();this.renders=0;globalThis.__testRenderer=this}
  setPixelRatio(value){this.pixelRatio=value}setSize(){}render(){this.renders++}
  dispose(){this.disposed=true}forceContextLoss(){this.contextLost=true}
}};`;
const source = fs.readFileSync(sourcePath, 'utf8').replace("import * as T from './vendor/three.module.js';", rendererStub).replace("'./architecture.js'", JSON.stringify(architectureUrl)).replace("'./camera-paths.js'", JSON.stringify(cameraPathsUrl));
const { mountLibrary } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('guided paths replace walking; workbench keys stay untouched and dragging only turns', () => {
  const host = surface(), library = mountLibrary(host), canvas = host.child;
  try {
    assert.equal(canvas.tabIndex, 0);
    assert.equal(browserWindow.events.get('keydown')?.size || 0, 0);
    library.enter('reading'); advance(60);
    assert(library.getState().pathPlaying);
    library.pausePath(); const start = library.getState().position;
    browserWindow.dispatch('keydown', {code: 'KeyW', target: {tagName: 'INPUT'}, preventDefault() {throw Error('Workbench input was captured');}});
    key(canvas, 'KeyW'); advance(60);
    assert.deepEqual(library.getState().position, start, 'WASD must never translate the camera');
    library.resumePath(); advance(160);
    assert.notDeepEqual(library.getState().position, start);
    canvas.dispatch('pointerdown', {pointerId: 1, clientX: 100, clientY: 100});
    assert(!library.getState().pathPlaying);
    const pausedAt = library.getState().position, oldYaw = library.getState().yaw;
    canvas.dispatch('pointermove', {pointerId: 1, clientX: 145, clientY: 105});
    advance(60);
    assert.deepEqual(library.getState().position, pausedAt);
    assert.notEqual(library.getState().yaw, oldYaw);
    canvas.dispatch('pointerup', {pointerId: 1});
    key(canvas, 'Space'); assert(library.getState().pathPlaying);
    library.seekPath(1); assert.equal(library.getState().pathProgress, 1);
    assert(!library.getState().pathPlaying);
    library.enter('upper'); assert.equal(library.getState().floor, 2);
    library.setNight(true); assert(library.getState().night);
    library.setCutaway(true); assert(!library.building.shell.visible);
    key(canvas, 'Escape'); assert.equal(library.getState().mode, 'outside');
    assert.equal(library.getState().path, null);
    assert.throws(() => library.playPath('missing'));
  } finally { library.dispose(); }
});

test('render pause freezes the path timeline; dispose removes listeners and releases resources once', () => {
  const host = surface(), library = mountLibrary(host), canvas = host.child, renderer = globalThis.__testRenderer;
  let geometryDisposals = 0, materialDisposals = 0;
  const firstMesh = library.building.inside.children.find(child => child.isInstancedMesh);
  firstMesh.geometry.addEventListener('dispose', () => geometryDisposals++);
  firstMesh.material.addEventListener('dispose', () => materialDisposals++);
  library.enter('gallery'); advance(20);
  library.pause(); const before = library.getState().pathProgress;
  assert(library.getState().paused); assert.equal(pending.size, 0);
  const count = renderer.renders; advance(30);
  assert.equal(renderer.renders, count); assert.equal(library.getState().pathProgress, before);
  library.resume(); advance(20);
  assert(!library.getState().paused && library.getState().pathProgress > before);
  library.pause(); library.dispose(); library.dispose(); library.resume();
  assert.equal(pending.size, 0); assert(canvas.removed);
  assert(renderer.disposed && renderer.contextLost);
  assert.equal(geometryDisposals, 1); assert.equal(materialDisposals, 1);
  assert.equal(library.scene.children.length, 3);
  assert.equal(canvas.events.get('keydown').size, 0);
  assert.equal(browserWindow.events.get('blur').size, 0);
});


test('entry from a rear exterior camera rises above the roof before approaching the portal', () => {
  const library = mountLibrary(surface());
  try {
    library.camera.position.set(0, 52, -80);
    library.playPath('entrance');
    const duration = library.getState().pathDuration;
    const boxes = library.building.voxelData.filter(v => v.type !== 'glass').map(v => ({...v, cs: Math.cos(v.rot), sn: Math.sin(v.rot)}));
    for (let seconds = 0; seconds <= duration; seconds += .05) {
      library.seekPath(seconds / duration);
      const [x, y, z] = library.getState().position;
      const hit = boxes.find(v => {
        if (Math.abs(y - v.y) > v.h / 2 + .08) return false;
        const dx = x - v.x, dz = z - v.z;
        return Math.abs(v.cs * dx - v.sn * dz) < v.w / 2 + .08 && Math.abs(v.sn * dx + v.cs * dz) < v.d / 2 + .08;
      });
      assert(!hit, 'Entry clips a roof or wall from the back at ' + seconds);
    }
  } finally { library.dispose(); }
});

test('host-authored routes, seeking and low-cost rendering options work together', () => {
  const points = [
    {position: [0, 3, 10], target: [0, 4, 0], floor: 0, label: 'A'},
    {position: [0, 3, 8], target: [-4, 3, 5], duration: 2, floor: 0, label: 'B'}
  ];
  const host = surface(), library = mountLibrary(host, {keyboard: 'off', shadows: false, maxPixelRatio: 1.25, frameOffset: .07, cameraPaths: {custom: points}});
  try {
    assert.equal(host.child.events.get('keydown')?.size || 0, 0);
    assert.equal(globalThis.__testRenderer.shadowMap.enabled, false);
    assert.equal(globalThis.__testRenderer.pixelRatio, 1.25);
    assert(library.camera.view.enabled);
    library.playPath('custom'); library.seekPath(.5);
    assert.deepEqual(library.getState().position, [0, 3, 9]);
    assert(!library.camera.view.enabled);
    points[1].position[2] = 999;
    library.seekPath(1); assert.deepEqual(library.getState().position, [0, 3, 8]);
    library.resumePath(); assert.equal(library.getState().pathProgress, 0);
    assert(library.getState().pathPlaying);
    library.setCameraPath('close-up', [{position: [0, 3, 10], target: [0, 4, 0]}, {position: [0, 3, 7], target: [0, 4, 0], duration: 1}]);
    library.playPath('close-up'); advance(100);
    assert.equal(library.getState().pathProgress, 1);
    assert(!library.getState().pathPlaying);
    assert.throws(() => library.setCameraPath('bad', []));
  } finally { library.dispose(); }
  assert.throws(() => mountLibrary(surface(), {keyboard: 'invalid'}));
});
