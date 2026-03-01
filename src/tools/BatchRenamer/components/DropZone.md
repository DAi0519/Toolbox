/**
 * [INPUT]: 接收 onFilesDropped: (files: File[]) => void
 * [OUTPUT]: 导出 DropZone 组件
 * [POS]: 文件拖拽上传入口
 * [PROTOCOL]: 无需修改
 */

# 交互方式
1. 拖拽文件/文件夹
2. 点击"选择文件"按钮
3. 点击"选择文件夹"按钮

# 核心函数
readAllEntries(entry: FileSystemEntry): Promise<File[]>
  // 递归读取目录，保留 webkitRelativePath

# 依赖
framer-motion: 拖拽状态动画
lucide-react: 图标