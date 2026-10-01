import { mountLibrary } from './library.js';

const views = ['outside', 'entrance', 'reading', 'gallery', 'upper'];
const floorNames = ['一层 · 阅读大厅', '二层 · 典藏回廊', '三层 · 星图书廊'];
// Importing this module during server rendering does not require a DOM or create a scene.
const ElementBase = globalThis.HTMLElement ?? class {};

/** A self-contained library viewer. Styles and controls stay within its shadow root. */
export class TisuLibraryElement extends ElementBase {
  static get observedAttributes() { return ['view', 'night', 'cutaway']; }

  constructor() {
    super();
    this._library = null;
    this._events = null;
    this._visibilityObserver = null;
  }

  connectedCallback() {
    if (this._library) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block;position:relative;isolation:isolate;height:var(--tisu-library-height,560px);min-height:300px;overflow:hidden;border-radius:var(--tisu-library-radius,16px);background:#b6cbd7;color:#f5e7c8;font:13px/1.5 system-ui,"Noto Sans SC",sans-serif}
        *{box-sizing:border-box}.scene{position:absolute;inset:0}.scene canvas{display:block;width:100%;height:100%;outline:none}.scene canvas:focus-visible{outline:2px solid #edca79;outline-offset:-3px}
        .toolbar{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:4px;flex-wrap:wrap;justify-content:center;width:max-content;max-width:calc(100% - 24px);padding:7px;border:1px solid #d2a85855;border-radius:12px;background:#14253ae8;box-shadow:0 8px 24px #12233622}
        button{appearance:none;border:1px solid transparent;border-radius:7px;padding:8px 11px;background:transparent;color:inherit;white-space:nowrap;font:inherit;cursor:pointer;touch-action:manipulation}button:hover{background:#d2a85822}button[aria-pressed="true"]{border-color:#d2a85877;background:#d2a85820;color:#ffe5a4}button:focus-visible{outline:2px solid #edca79;outline-offset:2px}
        .hint{position:absolute;left:16px;top:13px;margin:0;padding:8px 11px;background:#14253ad9;border:1px solid #d2a85844;border-radius:9px;font-size:12px;pointer-events:none}.hint strong{display:block;letter-spacing:.08em;color:#f3d69c}.hint span{font-size:11px;color:#c7d2d8}
        .walk{position:absolute;right:15px;bottom:100px;display:grid;grid-template-columns:repeat(3,36px);gap:4px}.walk button{background:#14253ae0;border-color:#d2a85844;padding:8px 0}.walk [data-move="forward"]{grid-column:2}.walk [data-move="left"]{grid-column:1}.walk [data-move="backward"]{grid-column:2}.walk [data-move="right"]{grid-column:3}.walk[hidden]{display:none}
        :host([controls="false"]) .toolbar,:host([controls="false"]) .hint,:host([controls="false"]) .walk{display:none}
        .failure{position:absolute;inset:0;display:grid;place-items:center;padding:24px;text-align:center;color:#233f67;background:#e3e6dc}
        @media(max-width:560px){.toolbar{bottom:10px;gap:2px;padding:5px;max-width:calc(100% - 16px)}button{padding:7px 8px;font-size:12px}.hint{top:10px;left:10px}.hint span{max-width:260px;display:block}.walk{right:10px;bottom:112px}}
      </style>
      <div class="scene" part="scene"></div>
      <p class="hint" part="hint"><strong>星穹图书馆</strong><span></span></p>
      <nav class="toolbar" part="toolbar" aria-label="图书馆视角与灯光">
        <button data-view="outside" aria-pressed="true">建筑全景</button>
        <button data-view="reading" aria-pressed="false">阅读大厅</button>
        <button data-view="gallery" aria-pressed="false">二层回廊</button>
        <button data-view="upper" aria-pressed="false">三层书廊</button>
        <button data-toggle="cutaway" aria-pressed="false">建筑剖视</button>
        <button data-toggle="night" aria-pressed="false">月夜灯火</button>
      </nav>
      <div class="walk" part="walk" hidden aria-label="移动控制">
        <button data-move="forward" aria-label="向前">▲</button>
        <button data-move="left" aria-label="向左">◀</button>
        <button data-move="backward" aria-label="向后">▼</button>
        <button data-move="right" aria-label="向右">▶</button>
      </div>`;
    this._events = new AbortController();
    const signal = this._events.signal;
    this.shadowRoot.querySelectorAll('[data-view]').forEach(button => {
      button.addEventListener('click', () => this.setView(button.dataset.view), { signal });
    });
    this.shadowRoot.querySelectorAll('[data-toggle]').forEach(button => {
      button.addEventListener('click', () => this.toggleAttribute(button.dataset.toggle), { signal });
    });
    this.shadowRoot.querySelectorAll('[data-move]').forEach(button => {
      button.addEventListener('pointerdown', event => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this._library?.setMove(button.dataset.move, true);
      }, { signal });
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        button.addEventListener(event, () => this._library?.setMove(button.dataset.move, false), { signal });
      }
    });
    try {
      this._library = mountLibrary(this.shadowRoot.querySelector('.scene'), {
        keyboard: 'focus', frameOffset: 0,
        maxPixelRatio: Number(this.getAttribute('max-pixel-ratio')) || 1.6,
        shadows: this.getAttribute('shadows') !== 'false',
        onStateChange: state => this._stateChanged(state)
      });
      for (const name of TisuLibraryElement.observedAttributes) this._applyAttribute(name);
      if (typeof IntersectionObserver !== 'undefined') {
        this._visibilityObserver = new IntersectionObserver(entries => {
          if (!this._library) return;
          entries[0]?.isIntersecting ? this._library.resume() : this._library.pause();
        });
        this._visibilityObserver.observe(this);
      }
    } catch (error) {
      this._library?.dispose();
      this._library = null;
      this._events.abort();
      const message = document.createElement('p');
      message.className = 'failure';
      message.setAttribute('role', 'alert');
      message.textContent = '无法启动体素图书馆。请使用支持 WebGL 的浏览器，并开启硬件加速。';
      this.shadowRoot.append(message);
      this.dispatchEvent(new CustomEvent('library-error', { detail: { message: String(error.message) }, bubbles: true, composed: true }));
    }
  }

  disconnectedCallback() {
    this._visibilityObserver?.disconnect();
    this._visibilityObserver = null;
    this._events?.abort();
    this._events = null;
    this._library?.dispose();
    this._library = null;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this._library) this._applyAttribute(name);
  }

  _applyAttribute(name) {
    if (name === 'night') this._library.setNight(this.hasAttribute('night'));
    if (name === 'cutaway') this._library.setCutaway(this.hasAttribute('cutaway'));
    if (name === 'view') {
      const view = this.getAttribute('view') || 'outside';
      if (!views.includes(view)) {
        this.dispatchEvent(new CustomEvent('library-error', { detail: { message: `Unknown viewpoint: ${view}` }, bubbles: true, composed: true }));
        return;
      }
      view === 'outside' ? this._library.exterior() : this._library.enter(view);
    }
  }

  _stateChanged(state) {
    const inside = state.mode === 'inside';
    const activeView = inside ? ['reading', 'gallery', 'upper'][state.floor] : 'outside';
    for (const button of this.shadowRoot.querySelectorAll('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === activeView));
    for (const button of this.shadowRoot.querySelectorAll('[data-toggle]')) button.setAttribute('aria-pressed', String(state[button.dataset.toggle]));
    this.shadowRoot.querySelector('.hint strong').textContent = inside ? floorNames[state.floor] : '星穹图书馆';
    this.shadowRoot.querySelector('.hint span').textContent = inside ? '拖动看四周 · WASD / 方向键移动 · Esc 返回全景' : '拖动环绕 · 滚轮 / 双指缩放';
    this.shadowRoot.querySelector('.walk').hidden = !inside;
    this.dispatchEvent(new CustomEvent('library-state-change', { detail: state, bubbles: true, composed: true }));
  }

  /** The renderer/scene API, or null before mounting and after disconnecting. */
  get api() { return this._library; }
  getState() { return this._library?.getState() ?? null; }
  setView(view) {
    if (!views.includes(view)) throw new Error('Unknown viewpoint');
    // Repeating a view also resets its camera, which is useful after walking elsewhere.
    if (this.getAttribute('view') === view && this._library) this._applyAttribute('view');
    else this.setAttribute('view', view);
  }
  enter(view = 'entrance') {
    if (view === 'outside') throw new Error('Use exterior() to leave the library');
    this.setView(view);
  }
  exterior() { this.setView('outside'); }
  setNight(value) { this.toggleAttribute('night', !!value); }
  setCutaway(value) { this.toggleAttribute('cutaway', !!value); }
  pause() { this._library?.pause(); }
  resume() { this._library?.resume(); }
}

/** Register once, explicitly; importing the package has no global side effects. */
export function defineLibraryElement(tagName = 'tisu-library') {
  if (!globalThis.customElements) return false;
  if (!customElements.get(tagName)) customElements.define(tagName, TisuLibraryElement);
  return true;
}
