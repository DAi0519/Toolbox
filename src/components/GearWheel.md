/**
 * [INPUT]: 依赖 framer-motion 的 useMotionValue/useSpring/useTransform/animate
 * [OUTPUT]: 导出 GearWheel 默认组件
 * [POS]: 应用入口页面，主导航交互界面
 * [PROTOCOL]: 新增工具时无需修改，自动从 TOOLS 读取
 */

# 几何参数
RADIUS = 600        // 轮盘半径
ANGLE_STEP = 10°    // 工具间隔角度

# 物理参数 (PHYSICS)
stiffness: 80       // 弹簧刚度
damping: 30         // 阻尼系数
mass: 1.5           // 质量
wheelMultiplier: 0.08  // 滚轮灵敏度

# 状态持久化
sessionStorage['gearWheelRotation.v2']  // 轮盘角度