# Playbox - 开发者玩具箱

React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion

<directory>
src/ - 源代码 (3子目录: components, config, tools)
  components/ - 共享组件 (GearWheel导航轮, ToolLayout工具布局)
  config/ - 配置文件 (tools.ts工具注册表)
  tools/ - 各工具模块 (14个工具: ColorPicker, BatchRenamer, ImageStudio等)
public/ - 静态资源 (DouyinSansBold.otf字体)
</directory>

<config>
tools.ts - 工具注册表，定义所有工具的id/name/component，懒加载入口
GearWheel.tsx - 主导航界面，圆形齿轮轮盘交互
ToolLayout.tsx - 工具页面通用布局，含返回按钮和标题
index.css - 全局样式，CSS变量定义(--ink, --bg, --accent)
</config>

## 架构要点

1. **工具注册表模式**: `src/config/tools.ts` 是唯一真相来源，新增工具只需在此添加条目
2. **懒加载路由**: 使用 `React.lazy()` 实现代码分割，每个工具独立打包
3. **GearWheel 导航**: Framer Motion 物理动画轮盘，支持拖拽/滚轮/点击交互
4. **状态持久化**: 轮盘旋转角度存储于 `sessionStorage`
5. **全屏工具**: `ToolConfig.fullscreen: true` 跳过 ToolLayout 包裹，工具自管返回按钮（`useNavigate('/')`）

## 已实现工具

- **BatchRenamer** (最完整): 拖拽上传、多规则重命名、冲突解决、ZIP导出
- **ImageStudio** (全屏/AI): Gemini API 图像生成，API Key 管理(localStorage)，History Drawer，全屏布局
- **ColorPicker** (全屏): 图片色板提取(K-Means 12色)、交互SVG色轮、HEX/RGB/HSL切换、CSS变量/JSON导出
- 其他11个工具: ImageTools, Typography, CodeFormat, Converter, Generator, Calculator, Encoder, Compressor, Validator, Minifier, Beautifier

## 文档维护规则

每次修改项目后，必须检查并按需更新受影响的 CLAUDE.md：

- 根目录 `CLAUDE.md` — 架构变动、新依赖、全局规则
- `src/config/CLAUDE.md` — `tools.ts` 接口或条目变化
- `src/tools/CLAUDE.md` — 新增/删除工具目录
- `src/tools/<Tool>/CLAUDE.md` — 该工具内部结构变化（新增文件、接口、行为）
- `src/components/CLAUDE.md` — 共享组件变化

判断标准：文档中描述的内容（成员清单、接口、行为、数量）与实际代码不符时，必须更新。

## 技术细节

- 字体: 自定义 DouyinSansBold (抖音黑体)，全项目统一使用。Tailwind 中用 `font-sans`（已映射），**禁止使用 `font-serif` / `font-mono`**
- 主色: Klein Blue #002FA7
- 物理动画: 弹簧刚度80, 阻尼30, 质量1.5
- 依赖: `@google/genai` (ImageStudio 使用 Gemini API 图像生成)