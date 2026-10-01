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
const architectureUrl = new URL('../components/astral-library/architecture.js', import.meta.url).href;
const rendererStub = `import * as Real from ${JSON.stringify(threeUrl)};
const T={...Real,WebGLRenderer:class {
  constructor(){this.shadowMap={};this.domElement=globalThis.__createTestCanvas();this.renders=0;globalThis.__testRenderer=this}
  setPixelRatio(value){this.pixelRatio=value}setSize(){}render(){this.renders++}
  dispose(){this.disposed=true}forceContextLoss(){this.contextLost=true}
}};`;
const source = fs.readFileSync(sourcePath, 'utf8').replace("import * as T from './vendor/three.module.js';", rendererStub).replace("'./architecture.js'", JSON.stringify(architectureUrl));
const { mountLibrary } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('focus keyboard does not consume workbench input; entry and walking work', () => {
  const host = surface(), library = mountLibrary(host), canvas = host.child;
  try {
    assert.equal(canvas.tabIndex, 0);
    assert.equal(browserWindow.events.get('keydown')?.size || 0, 0);
    assert.equal(canvas.events.get('keydown').size, 1);
    library.enter('reading'); advance(180);
    assert(!library.getState().transitioning); assert(canvas.focused);
    const start = library.getState().position[2];
    browserWindow.dispatch('keydown', { code: 'KeyW', target: { tagName: 'INPUT' }, preventDefault() { throw Error('Workbench input was captured'); } });
    advance(60); assert.equal(library.getState().position[2], start);
    key(canvas, 'KeyW'); advance(180); key(canvas, 'KeyW', 'keyup');
    assert(library.getState().position[2] < start - 5);
    library.enter('upper'); assert.equal(library.getState().floor, 2);
    library.setNight(true); assert(library.getState().night);
    library.setCutaway(true); assert(!library.building.shell.visible);
    key(canvas, 'Escape'); assert.equal(library.getState().mode, 'outside');
    assert.throws(() => library.enter('missing'));
    assert.throws(() => library.setMove('up', true));
  } finally { library.dispose(); }
});

test('pause cancels animation and clears held input; repeated dispose releases resources', () => {
  const host = surface(), library = mountLibrary(host), canvas = host.child, renderer = globalThis.__testRenderer;
  let geometryDisposals = 0, materialDisposals = 0;
  const firstMesh = library.building.inside.children.find(child => child.isInstancedMesh);
  firstMesh.geometry.addEventListener('dispose', () => geometryDisposals++);
  firstMesh.material.addEventListener('dispose', () => materialDisposals++);
  library.enter('gallery'); const before = library.getState().position;
  key(canvas, 'KeyW'); library.pause();
  assert(library.getState().paused); assert.equal(pending.size, 0);
  const count = renderer.renders; advance(20); assert.equal(renderer.renders, count);
  library.resume(); advance(10); assert(!library.getState().paused);
  assert.deepEqual(library.getState().position, before);
  library.pause(); library.dispose(); library.dispose(); library.resume();
  assert.equal(pending.size, 0); assert(canvas.removed);
  assert(renderer.disposed && renderer.contextLost);
  assert.equal(geometryDisposals, 1); assert.equal(materialDisposals, 1);
  assert.equal(library.scene.children.length, 3, 'Only ambient and directional lights remain');
  assert.equal(canvas.events.get('keydown').size, 0);
  assert.equal(browserWindow.events.get('blur').size, 0);
});

test('performance and opt-in keyboard options stay local to the mounted instance', () => {
  const host = surface(), library = mountLibrary(host, { keyboard: 'off', shadows: false, maxPixelRatio: 1.25, frameOffset: .07 });
  try {
    assert.equal(host.child.events.get('keydown')?.size || 0, 0);
    assert.equal(globalThis.__testRenderer.shadowMap.enabled, false);
    assert.equal(globalThis.__testRenderer.pixelRatio, 1.25);
    assert(library.camera.view.enabled);
  } finally { library.dispose(); }
  assert.throws(() => mountLibrary(surface(), { keyboard: 'invalid' }));
});
