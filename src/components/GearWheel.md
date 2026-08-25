<!--
[INPUT]: 依赖 OptionWheel 的曲线选择内核、TOOLS 工具注册表和 react-router-dom 路由
[OUTPUT]: 描述 GearWheel 首页导航的视觉参数、交互时序与持久化契约
[POS]: components 的 GearWheel 语义文档，与 GearWheel.tsx 和 GearWheel.css 同步
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# GearWheel 首页工具轮盘

## 架构

- `GearWheel.tsx` 负责把 `TOOLS` 映射为名称、路由和持久化索引。
- `OptionWheel.tsx` 负责曲线几何、循环选择、滚轮、拖拽、键盘和吸附后激活。
- `GearWheel.css` 只覆盖首页品牌视觉，不改变通用轮盘的运动模型。

## 视觉参数

- 字体：`DouyinSansBold`
- 普通文字：`--ink` / `#000000`
- 焦点文字：`--accent` / `#002FA7`
- 焦点轴线：保留 Klein Blue 小圆点，移动端 `14px`、桌面端 `18px`
- 移动端：字号 `2–2.4rem`，tilt `8°`，smoothing `118ms`
- 桌面端：字号 `3.15–4rem`，tilt `7°`，smoothing `138ms`
- reduced-motion：禁用 blur，smoothing `1ms`

## 交互契约

- 滚轮和拖拽过程中连续跟手，结束 `140ms` 后吸附到最近完整选项。
- 点击任意选项先沿最短循环路径对齐；接近焦点后才进入对应工具。
- 方向键移动选择，`Enter` / `Space` 打开当前工具。
- 移动端跨过选项时触发 `1ms` 振动；不可用时静默退化。

## 状态持久化

`sessionStorage['gearWheelRotation.v2']` 保持兼容：以每项 `10°` 的旧格式存储当前工具索引。
