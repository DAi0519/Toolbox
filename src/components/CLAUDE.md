# components/
> L2 | 父级: /CLAUDE.md

成员清单
BackHomeButton.tsx: 返回主页按钮，支持 compact 模式与自定义 onClick（未阻止默认时导航到 `/`）
GearWheel.tsx: 齿轮轮盘导航，桌面/移动端分离物理参数，拖拽+滚轮+点击聚焦
ToolHeader.tsx: 通用工具页头，左侧返回按钮 + 标题，右侧可注入 actions
ToolHeaderActionsContext.tsx: 提供 `useToolHeaderActions(slot)`，给 ToolLayout 子树注入右侧 header actions
ToolLayout.tsx: 标准工具页面容器，内置 ToolHeader、100dvh 布局与内容滚动区
ToolPlaceholder.tsx: 占位工具页面样式
ui/Toast.tsx: 预留文件（当前为空）
ui/ToastContext.tsx: 预留文件（当前为空）

关键约束（新增 2026-03-05）
- GearWheel 角度持久化 key 固定为 `gearWheelRotation.v2`，默认焦点工具 id 为 `batch-renamer`。
- GearWheel 的 `ANGLE_STEP` 来自 `360 / ITEM_COUNT`，且 ITEM_COUNT 基于 `TOOLS` 三倍重复列表，避免视觉断层。
- GearWheel 桌面与移动端 physics 常量分离（stiffness/damping/mass/pan/wheel/snap），修改需同步调参与文档。
- ToolLayout 子组件如需操作按钮，应通过 `useToolHeaderActions` 注入，不要在内容区再做一层重复 header。
- ToolHeader / ToolLayout 必须保留 safe-area 变量（`--safe-top` / `--safe-bottom`）兼容刘海屏。

对外暴露
- 组件均通过显式路径导入（无统一 `index.ts` 聚合导出）
