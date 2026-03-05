import React from 'react';
import type { GenerationSession } from '../types';
import { Button } from './Button';

interface HistoryDrawerProps {
  history: GenerationSession[];
  onSelect: (session: GenerationSession) => void;
  onClose: () => void;
  isOpen: boolean;
  onClear: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  history,
  onSelect,
  onClose,
  isOpen,
  onClear
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-30 md:pointer-events-none">
      <button
        onClick={onClose}
        aria-label="关闭历史记录面板"
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px] md:hidden"
      />

      <div className="absolute inset-x-0 bottom-0 top-auto z-10 flex h-[min(82dvh,720px)] flex-col rounded-t-2xl border-t border-neutral-200 bg-white shadow-2xl transition-transform duration-300 md:pointer-events-auto md:inset-y-0 md:right-0 md:left-auto md:h-auto md:w-80 md:rounded-none md:border-t-0 md:border-l">
        <div className="pt-2 md:hidden">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-neutral-300" />
        </div>

        <div className="flex items-center justify-between border-b border-neutral-100 bg-white p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-neutral-900">创作历史</h3>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
          {history.length === 0 ? (
            <div className="py-12 text-center text-neutral-400">
              <p className="text-sm">暂无历史记录</p>
            </div>
          ) : (
            history.slice().reverse().map((session) => (
              <div
                key={session.id}
                onClick={() => { onSelect(session); onClose(); }}
                className="group cursor-pointer overflow-hidden rounded-lg border border-neutral-100 bg-neutral-50 transition-all hover:border-[var(--accent)] hover:shadow-sm"
              >
                <div className="relative aspect-video overflow-hidden bg-neutral-200">
                  {session.images[0] && (
                    <img
                      src={session.images[0]}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
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
              </div>
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
      </div>
    </div>
  );
};
