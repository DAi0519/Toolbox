# ColorPicker/
> L2 | 父级: ../CLAUDE.md

色彩拾取工具 (复刻自 Iris)

## 成员清单
- `ColorPicker.tsx` (入口): 工具的主页面，负责全局状态(图片、颜色)、拖拽上传与全屏布局管理
- `ColorWheel.tsx`: SVG交互式色轮，中心裁剪显示图片，外围绘制抽取的色值扇形，处理交互高亮
- `utils/color.ts`: 基于 Canvas 像素读取和 K-Means 聚类量化的颜色提取工具逻辑

## 核心设计
- 使用 `fullscreen: true` 脱离通用容器，实现全屏沉浸式的体验
- 使用 `@google/genai` 等不涉及（纯前端 Canvas 计算颜色）
- 界面风格模仿古典主义网页，使用奶白背景与衬线字体
- 色轮由 `framer-motion` 驱动出现和Hover动画