/**
 * [INPUT]: 接收 rules: RenameRule[], setRules: Dispatch
 * [OUTPUT]: 导出 RulePanel 组件
 * [POS]: 规则配置面板，支持6种规则类型
 * [PROTOCOL]: 新增规则类型需修改 addRule switch 分支
 */

# 规则类型按钮
统一命名(rename) | 查找替换(replace) | 添加前缀(prefix)
添加后缀(suffix) | 大小写(case)     | 序号编号(numbering)

# 正则预设 (REGEX_PRESETS)
1. Name (1) → Name_1
2. A_B → B_A
3. Code G_B-A (N) → Code_G_A_B_N

# 依赖
framer-motion: 规则列表动画
lucide-react: 图标