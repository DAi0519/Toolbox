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
- GearWheel 标题采用分端策略：移动端使用固定基准字号 + `scale` 变换避免抖动，桌面端保留完整 `fontSize` 层次效果。
- GearWheel 移动端交互需强调“齿轮卡位感”：前半程保持顺滑自由，接近槽位时再施加磁吸，释放后快速吸附到最近 `ANGLE_STEP`。
- GearWheel 移动端渲染路径应单独瘦身：不要让移动端标签项继续订阅桌面专用的 `fontSize` / `blur` motion 值；移动端优先减少可见项数量、缩小命中范围并保持文本无滤镜。
- GearWheel 移动端手势更新必须走 `requestAnimationFrame` 合帧：高频 `onPan` 只能累积 delta，真正写入 `rotation` 应与屏幕刷新对齐，并在 `panEnd` 前先 flush。
- GearWheel 桌面端保留完整景深效果，但仅允许使用安全的合成层优化（如 `will-change` / `translateZ(0)` / 独立绝对定位层）；不要在零尺寸轮盘容器或标签壳层上使用会裁剪内容的 `contain: paint/layout`。
- GearWheel 动画控制需统一收口：拖拽 gesture 与滚轮 burst 都只能在开始时 `resetInteraction()` 一次，中途增量更新只修改 `rotation`；旧动画和旧 timeout 必须通过交互 epoch 失效。
- GearWheel 桌面端 blur 允许保留，但应优先使用数值 blur + `useMotionTemplate` 生成滤镜字符串，避免每帧构造多组离散字符串插值。
- GearWheel 桌面端景深曲线应优先“近处保持锐利、远处主要靠 opacity 拉深”，不要通过增加中近距离 blur 来堆层次。
- GearWheel snap 完成后统一持久化角度，避免多条动画链同时争用 `rotation` 或提前写入错误角度。
- `useViewport` 在移动端必须做 rAF 合并和尺寸相等短路，避免 visual viewport 频繁事件把轮盘交互拖成连续重渲染。
- ToolLayout 子组件如需操作按钮，应通过 `useToolHeaderActions` 注入，不要在内容区再做一层重复 header。
- ToolHeader / ToolLayout 必须保留 safe-area 变量（`--safe-top` / `--safe-bottom`）兼容刘海屏。

对外暴露
- 组件均通过显式路径导入（无统一 `index.ts` 聚合导出）
