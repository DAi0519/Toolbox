# tools/
> L2 | 父级: /CLAUDE.md

成员清单
ColorPicker/ColorPicker.tsx: 色彩拾取工具
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
BatchRenamer/: 批量重命名工具(完整实现，见子文档)
ImageStudio/: AI图像生成工具(全屏，Gemini API，见子文档)

对外暴露
各工具通过 config/tools.ts 懒加载注册，无统一导出入口