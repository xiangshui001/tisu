import {mountLibrary} from '../../components/astral-library/library.js';
const $ = selector => document.querySelector(selector);
const floorNames = ['一层 · 阅读大厅', '二层 · 典藏回廊', '三层 · 星图书廊'];
let lib;
function sync(state) {
  const inside = state.mode === 'inside';
  document.body.classList.toggle('inside', inside);
  $('.indoor-head').hidden = !inside;
  $('.path-panel').hidden = !inside;
  $('#floorLabel').textContent = floorNames[state.floor];
  $('#viewLabel').textContent = inside ? state.pathLabel : '建筑全景';
  $('#instructions').textContent = inside ? '沿预设路线参观 · 拖动暂停并看四周' : '拖动环绕 · 滚轮或双指缩放';
  document.querySelectorAll('[data-view]').forEach(button => {
    const active = button.dataset.view === (inside ? state.path : 'outside');
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#pathToggle').textContent = state.pathPlaying ? '暂停镜头' : state.pathProgress >= 1 ? '重新播放' : '继续镜头';
  $('#pathProgress').value = String(state.pathProgress);
  $('#pathPercent').textContent = Math.round(state.pathProgress * 100) + '%';
  $('#pathLabel').textContent = state.pathLabel;
}
try {
  lib = mountLibrary($('#scene'), {onStateChange: sync, frameOffset: .07, keyboard: 'focus'});
} catch (error) {
  $('#loading').textContent = '无法启动 3D 场景，请使用支持 WebGL 的浏览器并开启硬件加速。';
  throw error;
}
function view(name) { name === 'outside' ? lib.exterior() : lib.playPath(name); return lib.getState(); }
$('#enter').onclick = () => view('tour');
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => view(button.dataset.view));
$('#pathToggle').onclick = () => lib.getState().pathPlaying ? lib.pausePath() : lib.resumePath();
$('#pathProgress').oninput = event => lib.seekPath(Number(event.target.value));
function cutaway(value) {
  lib.setCutaway(value);
  $('#cut').classList.toggle('active', value);
  $('#cut').setAttribute('aria-pressed', String(value));
  $('#cut').textContent = value ? '恢复外观' : '建筑剖视';
}
function lighting(value) {
  lib.setNight(value);
  document.body.classList.toggle('night', value);
  $('#light').classList.toggle('active', value);
  $('#light').setAttribute('aria-pressed', String(value));
}
$('#cut').onclick = () => cutaway(!lib.getState().cutaway);
$('#light').onclick = () => lighting(!lib.getState().night);

// Preserve the existing agent-facing view tool; the route choices now include the complete tour.
const lifecycle = new AbortController();
if (document.modelContext?.registerTool) {
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'set_library_view', title: '切换图书馆视角',
      description: '沿镜头路线参观图书馆，返回建筑全景，并调整剖视与灯光。',
      inputSchema: {type: 'object', properties: {
        view: {type: 'string', enum: ['outside', 'entrance', 'reading', 'gallery', 'upper', 'tour']},
        cutaway: {type: 'boolean'}, night: {type: 'boolean'}
      }, additionalProperties: false},
      annotations: {readOnlyHint: false, untrustedContentHint: false},
      execute(input) {
        if (!input || typeof input !== 'object' || Object.keys(input).some(key => !['view', 'cutaway', 'night'].includes(key))) throw new Error('Invalid input');
        if (input.view !== undefined && !['outside', 'entrance', 'reading', 'gallery', 'upper', 'tour'].includes(input.view)) throw new Error('Invalid viewpoint');
        for (const key of ['cutaway', 'night']) if (input[key] !== undefined && typeof input[key] !== 'boolean') throw new Error('Expected boolean');
        if (input.view) view(input.view);
        if (input.cutaway !== undefined) cutaway(input.cutaway);
        if (input.night !== undefined) lighting(input.night);
        return lib.getState();
      }
    }, {signal: lifecycle.signal})).catch(() => {});
  } catch {}
}
window.addEventListener('pagehide', event => {
  if (event.persisted) { lib.pause(); return; }
  lifecycle.abort(); lib.dispose();
});
window.addEventListener('pageshow', event => { if (event.persisted) lib.resume(); });
$('#loading').style.opacity = 0;
setTimeout(() => $('#loading').remove(), 700);
