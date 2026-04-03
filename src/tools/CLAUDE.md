# tools/
> L2 | 父级: /CLAUDE.md

成员清单
BatchRenamer/: 批量重命名工具（完整实现，见子文档）
ColorPicker/: 色彩拾取工具（全屏，图片色板提取 + 交互色轮 + 复制导出，见子文档）
GradientStudio/: 渐变工坊（全屏，Canvas 2D 噪声渐变生成器，见子文档）
ImageStudio/: AI 图像生成工具（全屏，Gemini API，见子文档）
MusicPad/: 音乐打击垫工具

关键约束（新增 2026-03-05）
- 非 fullscreen 工具默认由 `ToolLayout` 包裹，header 右侧操作通过 `useToolHeaderActions` 注入。
- fullscreen 工具必须自行渲染 ToolHeader 并处理移动端 safe-area、滚动容器与输入法遮挡。
- 工具页在移动端基线宽度（320/375/390）不得横向溢出。
- 新增复杂工具目录时，必须创建 `src/tools/<Tool>/CLAUDE.md` 并维护成员清单与关键行为。

对外暴露
- 各工具通过 `src/config/tools.ts` 懒加载注册，无统一导出入口
