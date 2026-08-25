/**
 * [INPUT]: 无外部依赖，封装项目统一的缓动曲线与动画参数
 * [OUTPUT]: 对外提供 EASING 与 MOTION 动画常量
 * [POS]: lib 的动效设计令牌，被页面切换、卡片、抽屉与按压反馈消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export const EASING = {
  out: [0.23, 1, 0.32, 1],
  inOut: [0.77, 0, 0.175, 1],
  drawer: [0.32, 0.72, 0, 1],
  soft: [0.22, 1, 0.36, 1],
} as const;

export const MOTION = {
  page: {
    duration: 0.24,
    ease: EASING.out,
  },
  overlay: {
    duration: 0.18,
    ease: EASING.out,
  },
  card: {
    duration: 0.22,
    ease: EASING.out,
  },
  settle: {
    type: 'spring',
    duration: 0.36,
    bounce: 0.12,
  },
  drawer: {
    type: 'spring',
    duration: 0.44,
    bounce: 0.05,
  },
  press: {
    type: 'spring',
    stiffness: 420,
    damping: 30,
    mass: 0.55,
  },
} as const;
