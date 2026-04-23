import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { GenerationSession } from '../types';
import { Button } from './Button';
import { MOTION } from '../../../lib/motion';

interface HistoryDrawerProps {
  history: GenerationSession[];
  onSelect: (session: GenerationSession) => void;
  onClose: () => void;
  isOpen: boolean;
  onClear: () => void;
  isMobile: boolean;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  history,
  onSelect,
  onClose,
  isOpen,
  onClear,
  isMobile,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const panelInitial = shouldReduceMotion
    ? { opacity: 1 }
    : isMobile
      ? { opacity: 0, y: 18, scale: 0.985 }
      : { opacity: 0, x: 24 };
  const panelExit = shouldReduceMotion
    ? { opacity: 0 }
    : isMobile
      ? { opacity: 0, y: 12, scale: 0.99 }
      : { opacity: 0, x: 20 };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-30 md:pointer-events-none">
          <motion.button
            onClick={onClose}
            aria-label="关闭历史记录面板"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION.overlay}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px] md:hidden"
          />

          <motion.div
            initial={panelInitial}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={panelExit}
            transition={shouldReduceMotion ? { duration: 0.01 } : MOTION.drawer}
            style={{ transformOrigin: isMobile ? 'bottom center' : 'right center' }}
            className="absolute inset-x-0 bottom-0 top-auto z-10 flex h-[min(82dvh,720px)] flex-col rounded-t-2xl border-t border-neutral-200 bg-white shadow-2xl md:pointer-events-auto md:inset-y-0 md:right-0 md:left-auto md:h-auto md:w-80 md:rounded-none md:border-t-0 md:border-l"
          >
            <div className="pt-2 md:hidden">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-neutral-300" />
            </div>

            <div className="flex items-center justify-between border-b border-neutral-100 bg-white p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-neutral-900">创作历史</h3>
              <button
                onClick={onClose}
                className="pressable rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
              {history.length === 0 ? (
                <div className="py-12 text-center text-neutral-400">
                  <p className="text-sm">暂无历史记录</p>
                </div>
              ) : (
                history.slice().reverse().map((session, index) => (
                  <motion.div
                    key={session.id}
                    onClick={() => { onSelect(session); onClose(); }}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={shouldReduceMotion ? { duration: 0.01 } : { ...MOTION.card, delay: index * 0.03 }}
                    className="surface-lift group cursor-pointer overflow-hidden rounded-lg border border-neutral-100 bg-neutral-50 hover:border-[var(--accent)] hover:shadow-sm"
                  >
                    <div className="relative aspect-video overflow-hidden bg-neutral-200">
                      {session.images[0] && (
                        <img
                          src={session.images[0]}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover opacity-90 transition-[transform,opacity] duration-300 [transition-timing-function:var(--ease-out)] group-hover:scale-[1.03] group-hover:opacity-100"
                        />
                      )}
                      <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 text-[10px] text-white backdrop-blur-sm">
                        共 {session.images.length} 张
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-xs font-medium text-neutral-600">
                        {session.settings.prompt}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400">
                          {new Date(session.timestamp).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] font-semibold uppercase text-[var(--accent)]">
                          {session.settings.aspectRatio}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {history.length > 0 && (
              <div className="border-t border-neutral-100 bg-neutral-50 p-4 pb-[calc(var(--safe-bottom)+1rem)] md:pb-4">
                <Button variant="ghost" onClick={onClear} className="w-full text-red-500 hover:bg-red-50 hover:text-red-600">
                  清空历史记录
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
