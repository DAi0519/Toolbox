# ColorPicker/
> L3 | 父级: src/tools/CLAUDE.md

成员清单
ColorPicker.tsx: 主入口组件，Storyboard编排，响应式全屏布局(clamp sizing)，状态管理(imageSrc/colors/selectedColor/isExtracting)，图片上传(文件选择/拖拽/剪贴板粘贴)，Toast通知，移动端底部面板适配
ColorWheel.tsx: SVG色轮交互组件(viewBox自适应)，Segment子组件(useSpring驱动hover/选中半径变化)，bloom绽开入场(扇形从innerRadius向外扩展)，脉冲空状态动画，提取中旋转弧线
ColorPalette.tsx: 色板面板，大色卡预览(亮度自适应文字色)，HEX/RGB/HSL格式切换(layoutId动画标签)，色板列表(spring stagger入场)，导出(CSS变量/JSON文件)
utils/color.ts: 颜色工具函数集(K-Means extractColors, rgbToHex, rgbToHsl, hexToRgbArray, hexToRgbString, hexToHslString, formatColor, exportAsCSS, exportAsJSON)

对外暴露
export { default } from './ColorPicker'

动画架构
- 全部使用spring物理动画，无duration-based transition
- 每个组件顶部有ASCII STORYBOARD注释描述动画序列
- SPRINGS常量对象集中管理弹簧参数
- ColorWheel.Segment使用useMotionValue+useSpring+useTransform实现平滑hover半径变化

特殊行为
- fullscreen: true → App.tsx 不包裹 ToolLayout，工具自己渲染返回按钮
- 响应式: 色轮用clamp(320px, min(65vh,65vw), 720px)自适应，md以上侧面板，md以下底部面板
- 图片上传三种方式: 点击中心圆/拖拽到页面/Ctrl+V粘贴
- 拖拽计数器(dragCounter ref)防止子元素事件导致overlay闪烁
- 提取12色，默认选中图片主色；色环顺序按HSL色相连续排列（以主色为起点），K-Means聚类10次迭代
