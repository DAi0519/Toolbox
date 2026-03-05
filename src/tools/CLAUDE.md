# tools/
> L2 | 父级: /CLAUDE.md

成员清单
ColorPicker/: 色彩拾取工具（全屏，图片色板提取 + 交互色轮 + 复制导出，见子文档）
ImageTools/ImageTools.tsx: 图像处理工具
Typography/Typography.tsx: 字体排版工具
CodeFormat/CodeFormat.tsx: 代码格式化工具
Converter/Converter.tsx: 格式转换工具
Generator/Generator.tsx: 数据生成工具
Calculator/Calculator.tsx: 综合计算工具
Encoder/Encoder.tsx: 编码转换工具
Compressor/Compressor.tsx: 文件压缩工具
Validator/Validator.tsx: 数据校验工具
Minifier/Minifier.tsx: 代码压缩工具
Beautifier/Beautifier.tsx: 代码美化工具
BatchRenamer/: 批量重命名工具（完整实现，见子文档）
ImageStudio/: AI 图像生成工具（全屏，Gemini API，见子文档）

关键约束（新增 2026-03-05）
- 非 fullscreen 工具默认由 `ToolLayout` 包裹，header 右侧操作通过 `useToolHeaderActions` 注入。
- fullscreen 工具必须自行渲染 ToolHeader 并处理移动端 safe-area、滚动容器与输入法遮挡。
- 工具页在移动端基线宽度（320/375/390）不得横向溢出。
- 新增复杂工具目录时，必须创建 `src/tools/<Tool>/CLAUDE.md` 并维护成员清单与关键行为。

对外暴露
- 各工具通过 `src/config/tools.ts` 懒加载注册，无统一导出入口
