import * as T from '../astral-library/vendor/three.module.js';
import { buildGarden } from './model.js';
import { exportGardenGLB } from './export.js';

export const GARDEN_VIEWS = Object.freeze({
  garden: { target: [0, 3, 0], theta: .57, phi: .86, zoom: 1, title: '山水全景', text: '一池碧水，连接藏书楼、书斋与湖心亭。' },
  library: { target: [0, 6, -21], theta: .18, phi: 1.05, zoom: 2.45, title: '栖山藏书楼', text: '重檐之下，万卷相伴。揭开屋瓦，可细看书架与阅览长案。' },
  water: { target: [5, 1.5, 12], theta: .72, phi: .82, zoom: 2.45, title: '湖心读书亭', text: '过石桥，入水亭；看锦鲤游弋，听叠瀑落水。' },
  reading: { target: [-24, 1.6, 19], theta: -.15, phi: 1.02, zoom: 5, title: '松下阅卷', text: '树影落在书页上，茶盏与笔墨留住一个安静的下午。' },
  mountain: { target: [-31, 9, -19], theta: .77, phi: .9, zoom: 2.35, title: '叠山听泉', text: '苍松生于石隙，三叠清泉沿山流入水院。' },
});

export function mountGarden(host, options = {}) {
  if (!host?.appendChild) throw new TypeError('A garden container is required');
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, options.maxPixelRatio || 1.6));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.13;
  host.appendChild(renderer.domElement);
  const canvas = renderer.domElement; canvas.tabIndex = 0; canvas.style.touchAction = 'none';
  canvas.setAttribute('aria-label', '栖山书院三维体素模型。拖动旋转，滚轮缩放，方向键旋转，加减键缩放，Home 返回全景。');
  const scene = new T.Scene(), camera = new T.OrthographicCamera(-65, 65, 45, -45, .1, 450);
  const model = buildGarden(); scene.add(model.root);
  const hemi = new T.HemisphereLight('#dce8e0', '#a2a17d', 2.15);
  const sun = new T.DirectionalLight('#fff0d1', 3.5); sun.position.set(-35, 65, 32);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.normalBias = .06; sun.shadow.bias = -.0002;
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 60, bottom: -60, near: 1, far: 180 });
  const fill = new T.DirectionalLight('#b6d4d1', 1.1); fill.position.set(40, 25, -35); scene.add(hemi, sun, fill);
  const lanternLights = [[-9, 4, -17], [9, 4, -17], [4, 3.2, 14], [28, 3.6, 7]].map(position => {
    const light = new T.PointLight('#ffc786', 0, 17, 2); light.position.fromArray(position); scene.add(light); return light;
  });
  const ground = new T.Mesh(new T.PlaneGeometry(2000, 2000), new T.ShadowMaterial({ opacity: .13 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -3.1; ground.receiveShadow = true; scene.add(ground);
  const plaqueResources = [];
  if (typeof document !== 'undefined') for (const building of model.buildings) {
    const label = document.createElement('canvas'); label.width = 512; label.height = 128;
    const ctx = label.getContext('2d'); ctx.fillStyle = '#343d31'; ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#dac083'; ctx.font = '64px "Noto Serif SC", "SimSun", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(building.name, 256, 69);
    const texture = new T.CanvasTexture(label); texture.colorSpace = T.SRGBColorSpace;
    const geo = new T.PlaneGeometry(3.17, .79), mat = new T.MeshBasicMaterial({ map: texture });
    const mesh = new T.Mesh(geo, mat); mesh.position.fromArray(building.plaque); mesh.position.z += .03; building.group.add(mesh); plaqueResources.push({ texture, geo, mat });
  }
  let theta = GARDEN_VIEWS.garden.theta, phi = GARDEN_VIEWS.garden.phi, zoom = 1, view = 'garden', cutaway = false, dusk = false, paused = false;
  const target = new T.Vector3(...GARDEN_VIEWS.garden.target);
  let transition = null, time = 0, last = 0, raf = 0, disposed = false, visible = true, width = 0, height = 0;
  const handlers = [], pointers = new Map(); let pinch = 0;
  function emit() { options.onChange?.(getState()); }
  function getState() { return { view, cutaway, dusk, paused, zoom, time, stats: model.stats }; }
  function resize() {
    width = Math.max(1, host.clientWidth); height = Math.max(1, host.clientHeight); renderer.setSize(width, height);
    const aspect = width / height, halfHeight = Math.max(42, 58 / aspect);
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect; camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host); resize();
  function positionCamera() {
    camera.position.set(target.x + Math.sin(theta) * Math.sin(phi) * 140, target.y + Math.cos(phi) * 140, target.z + Math.cos(theta) * Math.sin(phi) * 140);
    camera.zoom = zoom; camera.updateProjectionMatrix(); camera.lookAt(target);
  }
  function setView(name, immediate = false) {
    const selected = GARDEN_VIEWS[name]; if (!selected) throw new RangeError('Unknown garden view: ' + name);
    view = name;
    if (immediate || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      target.fromArray(selected.target); theta = selected.theta; phi = selected.phi; zoom = selected.zoom; transition = null;
    } else transition = { elapsed: 0, from: { target: target.clone(), theta, phi, zoom }, to: selected };
    emit();
  }
  function setCutaway(value) { cutaway = !!value; model.setCutaway(cutaway); emit(); }
  function setDusk(value) {
    dusk = !!value; hemi.intensity = dusk ? 1.1 : 2.15; sun.intensity = dusk ? 1.4 : 3.5;
    sun.color.set(dusk ? '#f0bb79' : '#fff0d1'); fill.intensity = dusk ? .9 : 1.1;
    fill.color.set(dusk ? '#889dcc' : '#b6d4d1'); renderer.toneMappingExposure = dusk ? 1.01 : 1.13;
    lanternLights.forEach(light => light.intensity = dusk ? 60 : 0);
    model.glowMaterials.forEach(m => m.emissiveIntensity = dusk ? 2.5 : .45); emit();
  }
  function setPaused(value) { paused = !!value; emit(); }
  function changeZoom(delta) { transition = null; zoom = T.MathUtils.clamp(zoom * Math.exp(delta), .68, 6); emit(); }
  function on(node, name, handler, opts) { node.addEventListener(name, handler, opts); handlers.push(() => node.removeEventListener(name, handler, opts)); }
  on(canvas, 'pointerdown', e => {
    transition = null; canvas.focus({ preventScroll: true }); canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  on(canvas, 'pointermove', e => {
    const prior = pointers.get(e.pointerId); if (!prior) return;
    const dx = e.clientX - prior.x, dy = e.clientY - prior.y; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], span = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0) zoom = T.MathUtils.clamp(zoom * span / pinch, .68, 6); pinch = span;
    } else if (e.shiftKey || e.buttons === 2) {
      const scale = (camera.top - camera.bottom) / height / zoom;
      target.x -= dx * scale * Math.cos(theta); target.z += dx * scale * Math.sin(theta);
      target.x -= dy * scale * Math.sin(theta); target.z -= dy * scale * Math.cos(theta);
    } else { theta -= dx * .005; phi = T.MathUtils.clamp(phi + dy * .004, .22, 1.4); }
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) on(canvas, name, e => { pointers.delete(e.pointerId); pinch = 0; });
  on(canvas, 'contextmenu', e => e.preventDefault());
  on(canvas, 'wheel', e => { e.preventDefault(); changeZoom(-e.deltaY * (e.deltaMode === 1 ? .022 : .0013)); }, { passive: false });
  on(canvas, 'keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home', ' '].includes(e.key)) return;
    e.preventDefault(); transition = null;
    if (e.key === 'ArrowLeft') theta -= .12; if (e.key === 'ArrowRight') theta += .12;
    if (e.key === 'ArrowUp') phi = Math.max(.22, phi - .08); if (e.key === 'ArrowDown') phi = Math.min(1.4, phi + .08);
    if (e.key === '+' || e.key === '=') changeZoom(.12); if (e.key === '-') changeZoom(-.12);
    if (e.key === 'Home') setView('garden'); if (e.key === ' ') setPaused(!paused);
  });
  const intersection = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }) : null;
  intersection?.observe(host);
  function frame(now) {
    if (disposed) return; raf = requestAnimationFrame(frame);
    const dt = last ? Math.min((now - last) / 1000, .06) : 0; last = now;
    if (!visible || document.hidden) return;
    if (transition) {
      transition.elapsed += dt; const t = Math.min(1, transition.elapsed / 1.2), ease = t * t * (3 - 2 * t), { from, to } = transition;
      target.copy(from.target).lerp(new T.Vector3(...to.target), ease);
      theta = T.MathUtils.lerp(from.theta, to.theta, ease); phi = T.MathUtils.lerp(from.phi, to.phi, ease); zoom = T.MathUtils.lerp(from.zoom, to.zoom, ease);
      if (t === 1) transition = null;
    }
    if (!paused) time += dt;
    model.update(time); positionCamera(); renderer.render(scene, camera);
  }
  positionCamera(); renderer.render(scene, camera); raf = requestAnimationFrame(frame);
  function download(data, type, name) {
    const url = URL.createObjectURL(new Blob([data], { type })), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function capture() { renderer.render(scene, camera); canvas.toBlob(blob => { if (blob) download(blob, 'image/png', '栖山书院.png'); }); }
  function exportModel() { download(exportGardenGLB(model), 'model/gltf-binary', '栖山书院.glb'); }
  function dispose() {
    if (disposed) return; disposed = true; cancelAnimationFrame(raf); handlers.forEach(f => f()); resizeObserver.disconnect(); intersection?.disconnect();
    plaqueResources.forEach(({ texture, geo, mat }) => { texture.dispose(); geo.dispose(); mat.dispose(); });
    ground.geometry.dispose(); ground.material.dispose(); sun.shadow.dispose(); model.dispose(); renderer.dispose(); canvas.remove();
  }
  emit();
  return { setView, setCutaway, setDusk, setPaused, changeZoom, getState, capture, exportModel, dispose,
    // Useful to hosts and to real browser verification; no global event handlers are installed.
    model, renderer, scene, camera };
}
