/**
 * [INPUT]: 依赖 clsx, tailwind-merge
 * [OUTPUT]: 导出 Button 组件
 * [POS]: 通用按钮组件
 * [PROTOCOL]: 无需修改
 */

# Props
variant: 'primary' | 'secondary' | 'ghost' | 'danger'
size: 'sm' | 'md' | 'lg'

# 样式映射
primary:   bg-neutral-900 text-white
secondary: bg-white border border-neutral-200
ghost:     bg-transparent text-neutral-600
danger:    bg-red-50 text-red-600

# 尺寸映射
sm: h-8  px-3 text-xs
md: h-10 px-4 text-sm
lg: h-12 px-6 text-base