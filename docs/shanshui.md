# 栖山书院 · 山水藏书园

以江南书院、苏式园林为灵感的原创体素场景，并非对某一历史建筑的测绘复原。所有建筑、山石、树木、书本、人物、鱼鸟均用程序构建的长方体几何生成。主色为青瓦、粉墙、木色、碧水与秋叶；借叠山形成背景，通过水院留出开阔的中心空间。

## 园内景物

- **栖山藏书楼**：两层木构书厅、青瓦歇山顶、腰檐、斗拱、花格窗、栏杆、实际留洞的楼梯、书架和阅览长案。
- **松风书斋 / 知鱼书屋**：朝向池水的两侧书斋，以东侧连廊与北侧书廊衔接主楼。
- **湖心读书亭 / 听雨水榭**：湖心岛上的小亭与东岸水榭，由石拱桥和折线木栈道连接。
- **山水草木**：三叠瀑布、溪流、叠石、荷花、月洞门、苍松、银杏、枫树、竹丛与树下花灌木。
- **生活细节**：9 位读书人，线装书、展卷、墨砚、茶盏；8 条摆尾锦鲤，3 只飞行白鹭与 3 只停栖小鸟。

## 使用与嵌入

源码预览不需要安装依赖；从仓库根目录运行 `python -m http.server 8000`，打开 `http://localhost:8000/examples/shanshui/index.html`。

```html
<div id="garden" style="height:650px;background:#eeeee5"></div>
<script type="module">
  import { mountGarden } from './components/shanshui-library/index.js';
  const garden = mountGarden(document.querySelector('#garden'));
  garden.setView('water');
  // garden.setCutaway(true); garden.setDusk(true); garden.setPaused(true);
  // 容器移除时：garden.dispose();
</script>
```

需要同时保留 `components/shanshui-library/` 和 `components/astral-library/vendor/`。运行时不访问 CDN、图片服务或远程模型。

API：`setView('garden' | 'library' | 'water' | 'reading' | 'mountain')`、`setCutaway(boolean)`、`setDusk(boolean)`、`setPaused(boolean)`、`changeZoom(delta)`、`getState()`、`capture()`、`exportModel()`、`dispose()`。`onChange` 回调可同步宿主的控件；键盘仅在画布获焦时处理。离开可见区域或浏览器后台时停止渲染；销毁会解除事件、观察器和 GPU 资源。

## 可携带文件

```bash
npm ci
npm run build:garden
npm run export:garden
```

`dist/shanshui-library.html` 是内嵌 Three.js、样式与场景代码的单个 HTML 文件，可离线双击打开。`dist/shanshui-library.glb` 是标准 glTF 2.0 二进制网格，按材质合并并烘焙所有变换，不需要实例化扩展或外部资源。

GLB 保存导出时刻的静态姿态，不含浏览器中的飞行动画、相机控件和灯光。建筑牌匾的中文文字由浏览器绘制，不嵌入 GLB；牌匾几何保留。体素构件允许不同比例，并非 MagicaVoxel `.vox` 单位网格文件。网页中的“留影”保存透明背景的三维画布 PNG。

构建工具 esbuild 仅为生成离线文件使用，版本锁定在 package-lock.json。Three.js 许可见 [第三方说明](third-party.md)。

## 验证

`npm test` 覆盖原有组件与新增园林。新增检查包括确定性生成、构件坐标、场景要素、实例化变换与原模型包围盒一致、揭瓦层、鱼鸟动画，以及 GLB 文件头、缓冲区对齐、顶点边界和三角形索引。

2026-10-03 在真实浏览器 WebGL 中检查全景、五个景点、揭瓦、日光 / 暮色和动态暂停。离线文件已成功打包并确认没有外部脚本、样式或模型请求；应用内浏览器禁止 file: 协议，因此没有在该浏览器中执行双击文件的验证。GLB 通过 Khronos glTF Validator 2.0.0-dev.3.10 校验，零错误、零警告。视觉记录见 `docs/images/`。未在所有显卡与移动设备上测量帧率。
