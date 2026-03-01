/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 导出 RenameRule 类型, FileItem 接口, applyRules/resolveConflicts/renumberSequentially 函数
 * [POS]: 重命名核心逻辑，纯函数无副作用
 * [PROTOCOL]: 新增规则类型需修改 RenameRule 联合类型
 */

# RenameRule 联合类型
- replace: { find, replace, useRegex, caseSensitive }
- prefix: { value }
- suffix: { value }
- case: { value: 'upper' | 'lower' | 'title' }
- numbering: { start, step, format }
- rename: { value }

# FileItem 接口
id: string
originalFile: File
originalName: string
originalDir: string
newName: string

# 核心函数
applyRules(name, rules, index): string
  // 依次应用规则，保留扩展名

resolveConflicts(items): FileItem[]
  // 检测重名，自动追加序号

renumberSequentially(items): FileItem[]
  // 将不连续编号重排为 1, 2, 3...