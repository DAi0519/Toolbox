# components/
> L2 | 父级: /CLAUDE.md

成员清单
BackHomeButton.tsx: 返回主页按钮，支持 compact 模式与自定义 onClick（未阻止默认时导航到 `/`）
GearWheel.md: GearWheel 的交互、物理参数与响应式设计说明
GearWheel.css: 首页轮盘专属布局，复用现有 DouyinSansBold、黑白层级与 Klein Blue 焦点小圆点
GearWheel.tsx: 首页导航适配层，将 TOOLS、路由、持久化与设备参数映射到 OptionWheel
OptionWheel.css: OptionWheel 专属样式，定义曲线选项、左右朝向与拖拽状态
OptionWheel.tsx: React Bits 曲线轮盘内核，支持滚轮、拖拽、键盘、循环选择、吸附后激活与可选提示音
PageTransition.tsx: 基于统一 motion 令牌的页面进出场动画容器
ToolHeader.tsx: 通用工具页头，左侧返回按钮 + 标题，右侧可注入 actions
ToolHeaderActionsContext.tsx: 提供 `useToolHeaderActions(slot)`，给 ToolLayout 子树注入右侧 header actions
ToolLayout.md: ToolLayout 的布局职责、页头注入与安全区说明
ToolLayout.tsx: 标准工具页面容器，内置 ToolHeader、100dvh 布局与内容滚动区

关键约束（新增 2026-03-05）
- GearWheel 继续兼容 `gearWheelRotation.v2`，按旧的 10 度槽位值读取/写入当前工具索引；默认焦点工具为 `gradient-studio`。
- OptionWheel 是唯一交互内核：滚轮 burst 与拖拽过程允许连续移动，结束后统一吸附到完整选项；点击非焦点项时先对齐，再触发导航。
- OptionWheel 使用单一 `requestAnimationFrame` 循环和帧率无关指数平滑；选项只在每帧更新 transform、opacity、filter 与颜色进度变量。
- GearWheel 桌面与移动端分别配置字号、间距、曲率、模糊与 smoothing；移动端弱化 blur，并保留 1ms 振动槽位反馈。
- reduced-motion 下 smoothing 降至 1ms 且禁用 blur，但仍保留焦点颜色与吸附结果。
- 首页字体固定继承 DouyinSansBold，普通选项使用 `--ink`，焦点选项使用 `--accent`，不得被 shadcn preset 主题覆盖。
- `useViewport` 通过尺寸相等短路、ResizeObserver 与 visualViewport 事件避免无意义状态更新。
- ToolLayout 子组件如需操作按钮，应通过 `useToolHeaderActions` 注入，不要在内容区再做一层重复 header。
- ToolHeader / ToolLayout 必须保留 safe-area 变量（`--safe-top` / `--safe-bottom`）兼容刘海屏。

对外暴露
- 组件均通过显式路径导入（无统一 `index.ts` 聚合导出）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
