/**
 * [INPUT]: 依赖 renamingUtils 的 RenameRule/FileItem 类型
 * [OUTPUT]: 导出 BatchRenamer 默认组件
 * [POS]: 批量重命名工具主组件
 * [PROTOCOL]: 新增规则类型需同步修改 renamingUtils.ts
 */

# 状态管理
sourceFiles: {id, file}[]   // 源文件列表
rules: RenameRule[]         // 转换规则
autoResolve: boolean        // 自动解决重名
strictSequence: boolean     // 强制连续编号

# 核心流程
1. DropZone 接收文件 → setSourceFiles
2. useMemo 计算 processedFiles: applyRules → renumberSequentially → resolveConflicts
3. handleDownload: JSZip 打包 → saveZipBlob 导出

# 依赖
JSZip: ZIP 打包
file-saver: 文件保存 (showSaveFilePicker 不可用时回退)
framer-motion: 动画