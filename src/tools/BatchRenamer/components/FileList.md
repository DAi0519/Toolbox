/**
 * [INPUT]: 接收 files: FileItem[], onRemove: (id) => void
 * [OUTPUT]: 导出 FileList 组件
 * [POS]: 文件列表预览，显示原名→新名映射
 * [PROTOCOL]: 无需修改
 */

# 渲染逻辑
- 未改名: 显示 originalName (加粗)
- 已改名: originalName (删除线) + newName (高亮)

# 依赖
framer-motion: AnimatePresence 列表动画
lucide-react: FileText, X, ArrowDown 图标