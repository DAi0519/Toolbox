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
    <div className="absolute inset-y-0 right-0 w-full md:w-80 bg-white border-l border-neutral-200 shadow-2xl transform transition-transform duration-300 z-30 flex flex-col">
      <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-white">
        <h3 className="text-lg font-semibold text-neutral-900">创作历史</h3>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 ? (
          <div className="text-center text-neutral-400 py-12">
            <p className="text-sm">暂无历史记录</p>
          </div>
        ) : (
          history.slice().reverse().map((session) => (
            <div
              key={session.id}
              onClick={() => { onSelect(session); onClose(); }}
              className="group cursor-pointer rounded-lg border border-neutral-100 hover:border-[var(--accent)] hover:shadow-sm overflow-hidden bg-neutral-50 transition-all"
            >
              <div className="aspect-video relative bg-neutral-200 overflow-hidden">
                {session.images[0] && (
                  <img
                    src={session.images[0]}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                )}
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 rounded backdrop-blur-sm">
                  共 {session.images.length} 张
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs text-neutral-600 line-clamp-2 font-medium">
                  {session.settings.prompt}
                </p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] text-neutral-400">
                    {new Date(session.timestamp).toLocaleDateString()}
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--accent)] uppercase">
                    {session.settings.aspectRatio}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {history.length > 0 && (
        <div className="p-4 border-t border-neutral-100 bg-neutral-50">
          <Button variant="ghost" onClick={onClear} className="w-full text-red-500 hover:text-red-600 hover:bg-red-50">
            清空历史记录
          </Button>
        </div>
      )}
    </div>
  );
};
