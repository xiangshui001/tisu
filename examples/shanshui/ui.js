import { mountGarden, GARDEN_VIEWS } from '../../components/shanshui-library/index.js';

const $ = id => document.getElementById(id);
const names = Object.keys(GARDEN_VIEWS);
let garden;
function sync(state) {
  document.body.classList.toggle('exploring', state.view !== 'garden');
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-current', String(button.dataset.view === state.view)));
  $('cut').setAttribute('aria-pressed', String(state.cutaway)); $('light').setAttribute('aria-pressed', String(state.dusk));
  $('lightLabel').textContent = state.dusk ? '暮色' : '日光'; document.body.classList.toggle('dusk', state.dusk);
  $('pause').setAttribute('aria-pressed', String(state.paused)); $('pause').textContent = state.paused ? '▷' : 'Ⅱ';
  $('pause').setAttribute('aria-label', state.paused ? '继续游鱼、飞鸟与流水' : '暂停游鱼、飞鸟与流水');
  $('captionIndex').textContent = '0' + (names.indexOf(state.view) + 1) + ' / 05';
  $('viewTitle').textContent = GARDEN_VIEWS[state.view].title; $('viewText').textContent = GARDEN_VIEWS[state.view].text;
}
async function boot() {
try {
  // Allow the first loading frame to paint before assembling the detailed geometry.
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  garden = mountGarden($('scene'), { onChange: sync });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) garden.setPaused(true);
  $('loading').hidden = true;
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => garden.setView(button.dataset.view)));
  $('cut').onclick = () => garden.setCutaway(!garden.getState().cutaway);
  $('light').onclick = () => garden.setDusk(!garden.getState().dusk);
  $('pause').onclick = () => garden.setPaused(!garden.getState().paused);
  $('zoomIn').onclick = () => garden.changeZoom(.19); $('zoomOut').onclick = () => garden.changeZoom(-.19);
  $('reset').onclick = () => garden.setView('garden');
  $('tour').onclick = () => garden.setView(names[(names.indexOf(garden.getState().view) + 1) % names.length]);
  $('capture').onclick = () => garden.capture();
  $('export').onclick = async () => {
    $('export').disabled = true; $('export').textContent = '正在整理模型…';
    try { await new Promise(resolve => setTimeout(resolve, 40)); garden.exportModel(); }
    finally { $('export').disabled = false; $('export').textContent = '下载模型 ↓'; }
  };
  window.addEventListener('pagehide', () => garden.dispose(), { once: true });
  // Read-only diagnostics plus the public scene API are useful to embedding hosts.
  window.garden = garden;
} catch (error) {
  $('loading').hidden = true; $('error').hidden = false;
  $('errorText').textContent = '请使用支持 WebGL 的浏览器，并通过本地 HTTP 服务打开。' + (error.message || '');
  console.error(error);
}
}
boot();
