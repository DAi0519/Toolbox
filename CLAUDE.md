# Playbox - 开发者玩具箱

React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion

<directory>
src/ - 源代码 (3子目录: components, config, tools)
  components/ - 共享组件 (GearWheel导航轮, ToolLayout工具布局)
  config/ - 配置文件 (tools.ts工具注册表)
  tools/ - 各工具模块 (13个工具: ColorPicker, BatchRenamer等)
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

## 已实现工具

- **BatchRenamer** (最完整): 拖拽上传、多规则重命名、冲突解决、ZIP导出
- 其他12个工具: ColorPicker, ImageTools, Typography, CodeFormat, Converter, Generator, Calculator, Encoder, Compressor, Validator, Minifier, Beautifier

## 技术细节

- 字体: 自定义 DouyinSansBold (抖音黑体)
- 主色: Klein Blue #002FA7
- 物理动画: 弹簧刚度80, 阻尼30, 质量1.5