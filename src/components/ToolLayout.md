/**
 * [INPUT]: 接收 title: string, children: ReactNode
 * [OUTPUT]: 导出 ToolLayout 默认组件
 * [POS]: 工具页面的通用布局容器
 * [PROTOCOL]: 新增工具时无需修改
 */

# 入场动画
initial: opacity=0, scale=0.98
animate: opacity=1, scale=1
duration: 0.4s, ease: [0.22, 1, 0.36, 1]

# 布局结构
header: 24px padding, 返回按钮 → navigate('/')
main: flex-1, overflow: auto