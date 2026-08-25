# Playbox - 开发者玩具箱

React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion + shadcn registry

<directory>
src/ - 源代码
  components/ - 共享组件与首页齿轮导航 (GearWheel, ToolLayout, ToolHeader 等)
  config/ - 配置文件 (tools.ts 工具注册表)
  hooks/ - 设备与视口能力 (useViewport)
  lib/ - 通用样式工具与动效设计令牌 (cn, MOTION)
  tools/ - 各工具模块 (5个工具: ColorPicker, BatchRenamer, ImageStudio, GradientStudio, MusicPad)
public/ - 静态资源 (DouyinSansBold.otf 字体)
output/ - 自动化检查输出 (含 Playwright 移动端截图与 report.json)
</directory>

<config>
components.json - shadcn CLI 配置与 @react-bits 第三方注册表映射
tsconfig.json - TypeScript 工程引用与 `@/*` 源码路径别名
vite.config.ts - Vite React 插件与 `@` 运行时路径别名
tools.ts - 工具注册表，定义所有工具的 id/name/component/fullscreen，懒加载入口
GearWheel.tsx - 首页导航适配层，将 TOOLS、路由与持久化映射到 OptionWheel
OptionWheel.tsx - React Bits 曲线轮盘内核，统一滚轮、拖拽、键盘、吸附与激活时序
ToolLayout.tsx - 标准工具页容器，内置 ToolHeader 与 ToolHeaderActionsContext
useViewport.ts - 读取 visualViewport，提供 isMobile / viewportWidth / viewportHeight
</config>

## 架构要点

1. **工具注册表模式**: `src/config/tools.ts` 是唯一真相来源，路由与首页轮盘顺序都由该数组决定。
2. **懒加载路由**: `React.lazy()` + `Suspense`，每个工具独立分包。
3. **GearWheel 导航**: `GearWheel` 只负责工具语义与路由，曲线排布、循环选择和交互手感统一由 `OptionWheel` 提供。
4. **状态持久化**: 首页轮盘角度写入 `sessionStorage`，key=`gearWheelRotation.v2`。
5. **标准页头注入**: 非 fullscreen 工具通过 `useToolHeaderActions` 注入右侧操作区，避免重复渲染 header。
6. **全屏工具自管布局**: `ToolConfig.fullscreen: true` 时跳过 `ToolLayout`，工具自行处理 `ToolHeader`、安全区和滚动容器。

## 新增要求（2026-03-05）

- **移动端基线**: 首页与核心工具在 `320x568 / 375x812 / 390x844 / 768x1024` 下不得出现横向溢出。
- **GearWheel 一致性**: 保持桌面与移动端独立字号、间距、曲率、模糊与 smoothing 参数；滚轮/拖拽结束后必须吸附到完整选项。
- **默认焦点工具**: `DEFAULT_FOCUS_TOOL_ID` 必须指向 `TOOLS` 中存在的 id（当前为 `gradient-studio`）。
- **fullscreen 准入**: 仅当工具具备完整自管能力（返回主页、safe-area、滚动与移动端可用性）才允许设为 `fullscreen: true`。
- **文档同步**: 组件成员、接口、数量、关键常量或行为改变后，必须同步更新对应层级 CLAUDE.md。

## 已实现工具

- **BatchRenamer**: 拖拽上传、多规则重命名、冲突处理、ZIP 导出
- **ImageStudio**: 全屏 AI 图像生成，API Key 管理，History Drawer
- **ColorPicker**: 全屏色板提取，交互色轮，移动端底部面板
- **GradientStudio**: 全屏 Canvas 2D 噪声渐变生成器
- **MusicPad**: 音乐打击垫工具

## 文档维护规则

每次修改项目后，必须检查并按需更新受影响的 CLAUDE.md：

- 根目录 `CLAUDE.md` - 架构变动、新依赖、全局规则
- `src/config/CLAUDE.md` - `tools.ts` 接口或条目变化
- `src/tools/CLAUDE.md` - 新增/删除工具目录
- `src/tools/<Tool>/CLAUDE.md` - 该工具内部结构变化（新增文件、接口、行为）
- `src/components/CLAUDE.md` - 共享组件变化

判断标准：文档中描述的内容（成员清单、接口、行为、数量）与实际代码不符时，必须更新。

## 技术细节

- 字体: 全项目使用 DouyinSansBold，Tailwind 中统一走 `font-sans`
- 主色: Klein Blue `#002FA7`
- 首页轮盘指数平滑参数: 移动端 `118ms`，桌面端 `138ms`，reduced-motion 下为 `1ms`
- 关键依赖: `@google/genai`、`framer-motion`、`jszip`、`file-saver`
