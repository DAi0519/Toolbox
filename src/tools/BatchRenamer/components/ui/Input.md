/**
 * [INPUT]: 依赖 clsx, tailwind-merge
 * [OUTPUT]: 导出 Input 组件
 * [POS]: 通用输入框组件
 * [PROTOCOL]: 无需修改
 */

# Props
label?: string  // 可选标签
...React.InputHTMLAttributes<HTMLInputElement>

# 样式
h-9, rounded-md, border-neutral-200
focus: border-[var(--ink)], ring-1