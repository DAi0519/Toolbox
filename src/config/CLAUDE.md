# config/
> L2 | 父级: /CLAUDE.md

成员清单
tools.ts: 工具注册表，`ToolConfig` 接口（id/name/description/component/fullscreen）与 `TOOLS` 数组（当前14项）

关键约束（新增 2026-03-05）
- `TOOLS` 是路由与首页轮盘顺序的单一来源；增删改工具只能在此处完成。
- `id` 必须唯一且使用 kebab-case；一旦上线不应随意修改（会影响路由与历史链接）。
- `component` 必须使用 `lazy(() => import(...))`，禁止静态全量引入。
- `fullscreen: true` 仅用于自管完整页面结构的工具（header、返回、safe-area、滚动与移动端布局）。
- 与 GearWheel 的默认焦点联动：`DEFAULT_FOCUS_TOOL_ID` 必须在 `TOOLS` 中存在。

对外暴露
export { TOOLS } from './tools'
export type { ToolConfig } from './tools'
