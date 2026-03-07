# ColorPicker/
> L3 | 父级: src/tools/CLAUDE.md

成员清单
ColorPicker.tsx: 主入口组件，Storyboard 编排，状态管理（imageSrc/colors/selectedColor/isExtracting/isDragging），上传（文件选择/拖拽/粘贴），toast，移动端底部面板
ColorWheel.tsx: SVG 色轮交互组件，Segment 使用 `useSpring` 驱动 hover/选中半径变化，含空状态与提取中动画
ColorPalette.tsx: 色板面板，HEX/RGB/HSL 切换，颜色列表，CSS 变量/JSON 导出
utils/color.ts: 颜色工具函数集（K-Means `extractColors`、格式转换、导出函数）

动画架构
- 全部使用 spring 物理动画
- 组件顶部保留 STORYBOARD 注释描述动画序列
- `SPRINGS` 常量集中管理弹簧参数

关键约束（新增 2026-03-05）
- 响应式色轮尺寸分端处理：移动端 `clamp(220px, calc(min(60vh, 88vw) - 40px), 520px)`，桌面端 `clamp(320px, min(70vh, 70vw), 720px)`。
- 移动端主圆环在可视内容区内保持垂直居中，不应贴近顶部；若存在底部色板抽屉，则在扣除抽屉预留空间后居中。
- 有色板时移动端展示底部抽屉（max-height 48vh），并为主区域预留底部空间避免遮挡。
- 上传入口三种方式必须同时可用：按钮选择、页面拖拽、剪贴板粘贴。
- 拖拽状态使用计数器防抖（`dragCounter`），避免子元素触发 enter/leave 导致闪烁。
- 默认提取 12 色，提取成功后默认选中第一色作为主色。

特殊行为
- fullscreen: true -> App.tsx 不包裹 ToolLayout，工具自己渲染 ToolHeader
- 页面与容器需保持 `overflow-x-hidden` 级别的横向防溢出能力（移动端优先）

对外暴露
export { default } from './ColorPicker'
