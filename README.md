# TISU · 体素场景组件

可嵌入辞书工作台的 **星穹图书馆**：蓝金尖顶、哥特彩窗、三层书厅与开放回廊。当前版本用指定的摄像头轨迹参观建筑，支持暂停、拖动看四周、拖动进度、建筑剖视和昼夜切换。

## 运行示例

```bash
git clone https://github.com/xiangshui001/tisu.git
cd tisu
python3 -m http.server 8000
```

- 嵌入示例：http://localhost:8000/examples/library.html
- 全屏示例：http://localhost:8000/examples/full-page/index.html
- 在线图书馆：[星穹图书馆](https://komorebi-voxel-library.xiangshuershu.chatgpt.site)（沿用原访问权限）。

无需 npm 安装或构建；Three.js 随组件保存，运行时无需 CDN、外部模型或图片。请通过 HTTP 服务打开，避免 file:// 的模块加载限制。

## 最短接入

保留 components/astral-library/ 完整目录，放进项目静态资源目录：

```html
<tisu-library id="library" style="height:560px" view="outside"></tisu-library>
<button id="visit">参观图书馆</button>
<script type="module">
  import {defineLibraryElement} from '/assets/astral-library/index.js';
  defineLibraryElement();
  document.querySelector('#visit').onclick = () => document.querySelector('#library').playPath('tour');
</script>
```

组件样式和控件位于 Shadow DOM 中；键盘仅处理获焦画布上的空格和 Esc。移除组件会停止动画、解除监听并释放资源；离开视口自动暂停。

## 指定镜头轨迹

镜头路线集中在 [camera-paths.js](components/astral-library/camera-paths.js)，每个节点只需指定位置、注视点、秒数与楼层。没有玩家控制或逐帧碰撞寻路。

```js
const panel = document.querySelector('tisu-library');
panel.setCameraPath('my-reading-tour', [
  {position:[0,3.15,6.8], target:[-4.2,2.6,5], floor:0, label:'阅览桌'},
  {position:[-1.65,3.15,3.2], target:[-4.2,2.6,5], duration:4, floor:0, label:'书页与铜灯'}
]);
panel.playPath('my-reading-tour');
panel.pausePath();
panel.resumePath();
panel.seekPath(.5);
```

内置路线：entrance、reading、gallery、upper、tour。整馆巡游沿右侧楼梯登上二层，再从中央书厅抬升镜头至三层；短路线用于看阅览桌、回廊或顶层展柜。每段在指定端点之间平滑移动，不会产生曲线过冲。自定义路线需要作者自行检查建筑遮挡。

内饰增加了星图纸张、铜质放大镜、尺子、蜡封、座钟、书架铭牌、目录卡标签、古卷展柜、流苏地毯和后窗彩色玻璃；与原模型一起按材质实例化绘制。

## 目录

```text
components/astral-library/   建筑、内饰、镜头路线、场景 API、Web Component、本地 Three.js
examples/library.html       工作台面板嵌入示例
examples/full-page/         全屏示例
models/catalog.json         场景目录
docs/integration.md         HTML / React / Vue 接入与路线 API
docs/verification.md        验证范围
tests/                      镜头轨迹、几何、输入范围、生命周期检查
```

## 版本与验证

2.0 将自由行走改为镜头路线；setMove() 已移除，原调用应改为 playPath() / pausePath() / resumePath()。enter()、setView()、剖视、昼夜与资源释放接口保留。

```bash
node --test tests/*.test.mjs
```

自动检查使用真实 Three.js 几何和模拟渲染器，包含整条镜头轨迹与实体建筑的相交检查。尚未完成浏览器 / GPU 实机渲染验收。详细范围见 [验证说明](docs/verification.md)，许可见 [第三方说明](docs/third-party.md)。
