# BatchRenamer/
> L3 | 父级: src/tools/CLAUDE.md

成员清单
BatchRenamer.tsx: 主组件，管理 files/rules/autoResolve/strictSequence，JSZip 导出，header actions 注入
components/DropZone.tsx: 拖拽上传区域，支持文件夹和文件
components/FileList.tsx: 文件列表预览，显示原名 -> 新名映射
components/RulePanel.tsx: 规则配置面板，支持 6 种规则类型
components/ui/Button.tsx: 按钮组件，variant: default/ghost
components/ui/Input.tsx: 输入框组件
utils/renamingUtils.ts: 重命名核心逻辑，`applyRules` / `resolveConflicts` / `renumberSequentially`

关键约束（新增 2026-03-05）
- 头部操作（清空/导出）通过 `useToolHeaderActions` 注入 ToolLayout，不在页面体重复渲染 header。
- 导出优先使用 `showSaveFilePicker`，失败或不支持时回退 `file-saver`。
- ZIP 导出需保留目录结构：优先使用 `webkitRelativePath`，否则退回文件名。
- `strictSequence` 在规则处理后执行连续编号；`autoResolve` 作为最后一步处理重名冲突。
- toast 自动消失时间为约 2200ms，状态切换需保持可追踪。

对外暴露
export { default } from './BatchRenamer'

规则类型 (RenameRule)
- replace: 查找替换，支持正则
- prefix/suffix: 前缀/后缀
- case: 大小写转换 upper/lower/title
- numbering: 序号编号 start/step/format
- rename: 完全重命名
