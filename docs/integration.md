# 接入辞书工作台

## 原生 HTML / 任意框架

将 `components/astral-library/` 整个目录复制到静态资源目录，例如 Vite 项目的 `public/voxel/astral-library/`。

```js
const { defineLibraryElement } = await import('/voxel/astral-library/index.js');
defineLibraryElement();
```

```html
<tisu-library
  id="dictionary-library"
  view="outside"
  max-pixel-ratio="1.25"
  style="height:480px; --tisu-library-radius:12px"
></tisu-library>
```

模块导入本身不创建场景或注册全局标签，可以在服务端渲染阶段导入；实际挂载需要浏览器。`defineLibraryElement()` 在没有 Custom Elements 的服务端环境返回 `false`。请在浏览器端调用它。

### 属性

| 属性 | 说明 |
| --- | --- |
| `view` | `outside`、`entrance`、`reading`、`gallery`、`upper`、`tour`；默认 `outside` |
| `night` | 布尔属性，存在即开启月夜；关闭请移除属性或调用 `setNight(false)` |
| `cutaway` | 布尔属性，存在即隐藏外壳与屋顶 |
| `controls="false"` | 隐藏内置工具栏、提示与路线进度 |
| `max-pixel-ratio` | 挂载时读取，默认 1.6；小面板可用 1 或 1.25 降低渲染负担 |
| `shadows="false"` | 挂载时读取，关闭阴影以降低渲染负担 |

`max-pixel-ratio` 和 `shadows` 改变后需重新挂载。高度必须由父容器或组件样式提供；组件默认高度 560px，最小高度 300px。

### 方法与事件

```js
const panel = document.querySelector('tisu-library');
panel.enter('reading');
panel.setView('gallery');
panel.exterior();
panel.setNight(true);
panel.setCutaway(false);
panel.pause();
panel.resume();
const state = panel.getState();
```

`getState()` 在挂载前或移除后返回 `null`。挂载后可通过 `panel.api` 访问底层场景 API，包括相机、场景、建筑数据和镜头路线。

- `library-state-change`：`event.detail` 包含视角、楼层、相机位置、灯光、剖视、路线名称、节点标签、播放状态、进度与渲染暂停状态。状态变化时触发；镜头播放期间约每 100ms 更新一次进度，实时位置也可读取 `getState()`。
- `library-error`：`event.detail.message` 包含初始化或非法视角错误。

事件会冒泡并跨过 Shadow DOM，可以由工作台容器统一监听。

### React

最稳定的方式是使用容器、底层 API 与清理函数，不依赖 JSX 对自定义元素的版本差异。若直接安装本仓库作为本地包，则 import 名称为 `@tisu/astral-library`；也可以改为实际模块路径。

```jsx
import { useEffect, useRef } from 'react';
import { mountLibrary } from '@tisu/astral-library';

export function DictionaryLibrary() {
  const container = useRef(null);
  const api = useRef(null);
  useEffect(() => {
    const library = mountLibrary(container.current, {
      keyboard: 'focus', maxPixelRatio: 1.25,
    });
    api.current = library;
    return () => { api.current = null; library.dispose(); };
  }, []);
  return <section>
    <div ref={container} style={{ height: 480, position: 'relative' }} />
    <button onClick={() => api.current?.playPath('tour')}>进入图书馆</button>
  </section>;
}
```

本地包可通过 `npm install /path/to/tisu` 引入。原始场景 API 不附带 UI，按钮、导航、路线进度可由工作台自行制作。

### Vue 3

```vue
<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountLibrary } from '@tisu/astral-library';
const container = ref(null);
let library;
onMounted(() => { library = mountLibrary(container.value, { keyboard: 'focus' }); });
onBeforeUnmount(() => { library?.dispose(); });
</script>

<template>
  <div ref="container" style="height:480px; position:relative" />
  <button @click="library?.playPath('tour')">进入图书馆</button>
</template>
```

## 只使用场景 API

```js
import { mountLibrary } from './components/astral-library/index.js';
const library = mountLibrary(document.querySelector('#scene'), {
  keyboard: 'focus',       // focus / global / off，工作台建议保持 focus
  maxPixelRatio: 1.25,
  shadows: true,
  frameOffset: 0,          // 水平构图偏移比例，组件默认居中
  onStateChange(state) { console.log(state); }
});
library.enter('upper');
library.playPath('tour');
library.pausePath();
library.resumePath();
library.seekPath(.5);
library.turn(-0.2, 0.1);
library.pause();
library.resume();
// 工作台切换路由、关闭面板或销毁组件时执行：
library.dispose();
```

底层 `dispose()` 可以重复调用。请不要只删除 canvas 而保留动画循环。每次打开面板重新调用 `mountLibrary()`；同一实例可用 `pause()` / `resume()` 暂停和恢复。底层 API 不自动观察视口，可由宿主决定暂停策略；Web Component 则内置了离开视口自动暂停。

## 我们指定镜头轨迹

每个节点有 position（相机位置）、target（注视位置）、duration（从前一节点移到该节点的秒数）、floor 和 label。首节点的 duration 不参与时间计算；坐标沿用建筑世界单位，Y 向上。

```js
panel.setCameraPath('desk-closeup', [
  {position:[0,3.15,6.8], target:[-4.2,2.6,5], floor:0, label:'阅览桌'},
  {position:[-1.65,3.15,3.2], target:[-4.2,2.6,5], duration:4, floor:0, label:'书页与铜灯'},
  {position:[-1.65,3.15,-2.8], target:[-4.2,2.6,-1], duration:5, floor:0, label:'星图与手稿'}
]);
panel.playPath('desk-closeup');
panel.pausePath();      // 停在当前位置；仍可拖动看四周
panel.resumePath();     // 回到路线注视方向并继续；已结束则重播
panel.seekPath(.35);    // 跳到 35%，并暂停镜头
```

也可在 mountLibrary(host, {cameraPaths: {name: waypoints}}) 中传入路线，或直接编辑 [camera-paths.js](../components/astral-library/camera-paths.js)。

| 名称 | 作用 |
| --- | --- |
| entrance | 从门前进入中央书厅 |
| reading | 看阅览桌、星图与后方彩窗 |
| gallery | 浏览二层回廊与阅览角 |
| upper | 看三层星图展柜与书厅俯瞰 |
| tour | 门厅、书厅、楼梯、二层回廊，再从中央书厅抬升至三层 |

从建筑全景开始 entrance / tour 时，会先从当前外景镜头移动到门前。其它路线从它们各自的首节点开始，切换路线会重置进度。播放一次后停在最后一个节点。

路径采用分段直线与平滑缓入缓出；只有相机移动，用户拖动只改变朝向。默认控件提供暂停、继续、重播和进度滑块。空格暂停/继续，Esc 返回全景；WASD 和方向键不控制位置，也不截获工作台输入。

渲染暂停 pause() / resume() 与路线暂停分别管理：离开视口时冻结渲染和路线时间，返回后按原播放状态继续。切换宿主页面时仍需调用 dispose()。

自定义轨迹不会自动绕开障碍物。按建筑坐标指定节点，先避开书桌、墙体、栏杆和屋顶；默认路线的实体相交检查见 tests/camera-paths.test.mjs。数据导出仍只包含建筑，路线可另保存为 JSON。

2.0 已移除自由行走 setMove()。现有 enter(view) 与 setView(view) 现在播放对应短路线，turn() 暂停路线并转动镜头。

## 导出体素建筑数据

```js
const data = {
  schemaVersion: 1,
  model: 'astral-library',
  voxels: library.building.voxelData,
  floorHeights: library.building.floorHeights
};
const json = JSON.stringify(data);
```

数据中的每个构件记录中心位置 `x/y/z`、尺寸 `w/h/d`、颜色 `c`、材质类型 `type`、层 `layer` 和绕 Y 轴旋转 `rot`（弧度）。这是本项目的长方体场景数据格式，构件尺寸和位置不强制整数，不能直接当作 MagicaVoxel 的 `.vox` 文件读取。architecture.js 中保留楼层支撑采样作为建筑编辑辅助，摄像头浏览不调用行走碰撞逻辑。灯光、尘埃和光晕由代码补充。

## 样式与兼容

- 组件内 CSS 不影响工作台；可以用 `--tisu-library-height`、`--tisu-library-radius` 调整尺寸与圆角。
- 可以通过 `tisu-library::part(toolbar)`、`::part(hint)`、`::part(path-controls)` 调整控件外观。
- 浏览器需要 WebGL2、ES Modules、ResizeObserver；Web Component 还需要 Custom Elements 与 Shadow DOM。
- 一次挂载一个活动场景最省资源；多场景列表建议暂停非当前面板，或只展示静态封面。
- Full-page 示例中的 WebMCP 注册只属于该示例，不会随着组件导入自动注册到工作台。
