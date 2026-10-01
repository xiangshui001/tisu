# TISU · 体素场景组件

可嵌入辞书工作台的体素建筑。当前收录 **星穹图书馆**：蓝金尖顶、哥特拱窗、两座附楼塔、三层书厅与开放回廊，支持进入、自由漫步、楼梯上下楼、建筑剖视和昼夜切换。

本次封装来自已发布的细化版源码 `da1b3224e62d95fc10c9b014dd09cbd7414a95a0`。建筑、书架、书桌器物、植物和装饰均由代码生成；运行时不请求 CDN、外部模型、图片、字体或 API。

## 运行示例

```bash
git clone https://github.com/xiangshui001/tisu.git
cd tisu
python3 -m http.server 8000
```

- 嵌入示例：`http://localhost:8000/examples/library.html`
- 原版全屏示例：`http://localhost:8000/examples/full-page/index.html`
- 已发布的原版：[星穹图书馆](https://komorebi-voxel-library.xiangshuershu.chatgpt.site)（沿用原访问权限）。

无需 npm 安装或构建。请通过 HTTP 服务打开页面；直接双击 HTML 的 `file://` 地址通常会阻止 ES 模块加载。

## 最短接入

保留 `components/astral-library/` 的完整目录结构，放入项目的静态资源目录：

```html
<tisu-library style="height:560px" view="outside"></tisu-library>
<script type="module">
  import { defineLibraryElement } from '/assets/astral-library/index.js';
  defineLibraryElement();
</script>
```

组件样式和控件位于 Shadow DOM 中，不修改宿主页面的 `body`、全局 CSS 或快捷键。WASD / 方向键仅在图书馆画布获得焦点时生效，进入和点击画布会自动获得焦点。移除组件会停止动画、解除监听并释放 GPU 资源，离开视口时自动暂停渲染。

```js
const library = document.querySelector('tisu-library');
library.enter();
library.setView('upper');
library.setNight(true);
library.setCutaway(true);
library.addEventListener('library-state-change', event => {
  console.log(event.detail.floor, event.detail.mode);
});
```

详细用法、React / Vue 接入、无内置控件的场景 API、体素数据导出和资源释放见 [接入说明](docs/integration.md)。

## 目录

```text
components/astral-library/   可复用模块、Web Component、类型定义和本地 Three.js
examples/library.html       工作台面板嵌入示例
examples/full-page/         保留原版视觉的全屏示例
models/catalog.json         场景目录，方便后续添加其他建筑
docs/integration.md         接入与 API 说明
docs/verification.md        验证范围及限制
tests/                      几何、通行、按键作用域和生命周期检查
```

## 验证

```bash
node --test tests/*.test.mjs
```

自动检查使用真实 Three.js 几何和模拟渲染器，覆盖三层楼梯、家具碰撞、回廊支撑、进入动画、按键焦点范围、暂停恢复和资源释放。当前环境尚未执行浏览器 / GPU 实机渲染验收；部署或接入工作台后请检查实际画面与帧率。

Three.js 版本及第三方许可见 [第三方说明](docs/third-party.md)。
