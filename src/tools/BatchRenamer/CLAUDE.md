# BatchRenamer/
> L2 | 父级: src/tools/CLAUDE.md

成员清单
BatchRenamer.tsx: 主组件，useState管理files/rules/autoResolve/strictSequence，JSZip导出
components/DropZone.tsx: 拖拽上传区域，支持文件夹和文件
components/FileList.tsx: 文件列表预览，显示原名→新名映射
components/RulePanel.tsx: 规则配置面板，支持6种规则类型
components/ui/Button.tsx: 按钮组件，variant: default/ghost
components/ui/Input.tsx: 输入框组件
utils/renamingUtils.ts: 重命名核心逻辑，applyRules/resolveConflicts/renumberSequentially

对外暴露
export { default } from './BatchRenamer'

规则类型 (RenameRule)
- replace: 查找替换，支持正则
- prefix/suffix: 前缀/后缀
- case: 大小写转换 upper/lower/title
- numbering: 序号编号 start/step/format
- rename: 完全重命名