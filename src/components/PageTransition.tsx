import type { PropsWithChildren } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MOTION } from '../lib/motion';

export default function PageTransition({ children }: PropsWithChildren) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6, scale: 1.005 }}
      transition={shouldReduceMotion ? { duration: 0.01 } : MOTION.page}
      style={{
        width: '100%',
        minHeight: '100%',
        height: '100%',
      }}
    >
      {children}
    </motion.div>
  );
}
