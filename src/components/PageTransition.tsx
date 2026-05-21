import { useLayoutEffect, useRef, type PropsWithChildren } from 'react';
import gsap from 'gsap';
import { motion, useReducedMotion } from 'framer-motion';
import { MOTION } from '../lib/motion';

const PAGE_ENTER_SELECTOR = '.tool-header, main > *, [data-page-enter]';

export default function PageTransition({ children }: PropsWithChildren) {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      const pageTargets = gsap.utils.toArray<HTMLElement>(PAGE_ENTER_SELECTOR);
      const fallbackTarget = container.firstElementChild instanceof HTMLElement
        ? [container.firstElementChild]
        : [];
      const targets = Array.from(new Set(pageTargets.length > 0 ? pageTargets : fallbackTarget));

      if (shouldReduceMotion) {
        gsap.set([container, ...targets], {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          clearProps: 'transform,opacity,visibility,willChange',
        });
        return;
      }

      gsap.timeline({
        defaults: {
          force3D: true,
        },
        onComplete: () => {
          gsap.set(targets, { clearProps: 'transform,opacity,visibility,willChange' });
        },
      })
        .set(container, {
          autoAlpha: 0,
        })
        .set(targets, {
          willChange: 'transform, opacity',
          transformOrigin: '50% 45%',
        })
        .to(container, {
          autoAlpha: 1,
          duration: 0.12,
          ease: 'power2.out',
        })
        .fromTo(
          targets,
          {
            autoAlpha: 0,
            y: 14,
            scale: 0.996,
          },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.44,
            stagger: 0.045,
            ease: 'expo.out',
          },
          '<',
        );
    }, container);

    return () => ctx.revert();
  }, [shouldReduceMotion]);

  return (
    <motion.div
      ref={containerRef}
      initial={false}
      animate={{ opacity: 1 }}
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
