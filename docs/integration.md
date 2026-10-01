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
| `view` | `outside`、`entrance`、`reading`、`gallery`、`upper`；默认 `outside` |
| `night` | 布尔属性，存在即开启月夜；关闭请移除属性或调用 `setNight(false)` |
| `cutaway` | 布尔属性，存在即隐藏外壳与屋顶 |
| `controls="false"` | 隐藏内置工具栏、提示与移动按钮 |
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

`getState()` 在挂载前或移除后返回 `null`。挂载后可通过 `panel.api` 访问底层场景 API，包括相机、场景、建筑数据和移动控制。

- `library-state-change`：`event.detail` 包含视角、楼层、相机位置、灯光、剖视、过渡与暂停状态。该事件在状态切换时触发，不逐帧广播；实时位置可按宿主需要读取 `getState()`。
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
    <button onClick={() => api.current?.enter()}>进入图书馆</button>
  </section>;
}
```

本地包可通过 `npm install /path/to/tisu` 引入。原始场景 API 不附带 UI，按钮、导航、小地图可由工作台自行制作。

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
  <button @click="library?.enter()">进入图书馆</button>
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
library.setMove('forward', true);
library.setMove('forward', false);
library.turn(-0.2, 0.1);
library.pause();
library.resume();
// 工作台切换路由、关闭面板或销毁组件时执行：
library.dispose();
```

底层 `dispose()` 可以重复调用。请不要只删除 canvas 而保留动画循环。每次打开面板重新调用 `mountLibrary()`；同一实例可用 `pause()` / `resume()` 暂停和恢复。底层 API 不自动观察视口，可由宿主决定暂停策略；Web Component 则内置了离开视口自动暂停。

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

数据中的每个构件记录中心位置 `x/y/z`、尺寸 `w/h/d`、颜色 `c`、材质类型 `type`、层 `layer` 和绕 Y 轴旋转 `rot`（弧度）。这是本项目的长方体场景数据格式，构件尺寸和位置不强制整数，不能直接当作 MagicaVoxel 的 `.vox` 文件读取。楼梯支撑与家具碰撞逻辑在 `architecture.js` 中，渲染灯光、尘埃和灯火光晕由代码补充。

## 样式与兼容

- 组件内 CSS 不影响工作台；可以用 `--tisu-library-height`、`--tisu-library-radius` 调整尺寸与圆角。
- 可以通过 `tisu-library::part(toolbar)`、`::part(hint)`、`::part(walk)` 调整控件外观。
- 浏览器需要 WebGL2、ES Modules、ResizeObserver；Web Component 还需要 Custom Elements 与 Shadow DOM。
- 一次挂载一个活动场景最省资源；多场景列表建议暂停非当前面板，或只展示静态封面。
- Full-page 示例中的 WebMCP 注册只属于该示例，不会随着组件导入自动注册到工作台。
