import React from 'react';
import type { GenerationSession } from '../types';

interface ImageViewerProps {
  session: GenerationSession | null;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  isGenerating: boolean;
  onDownload: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ session, selectedIndex, onSelectIndex, isGenerating, onDownload }) => {


  if (isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="text-center space-y-8 animate-pulse">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-neutral-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[var(--accent)] rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-neutral-400 text-sm font-medium tracking-wide">生成中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-8 text-neutral-400">
        <div className="w-24 h-24 rounded-full border border-neutral-100 flex items-center justify-center mb-6 bg-neutral-50 shadow-sm">
          <svg className="w-8 h-8 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="max-w-xs text-center text-sm leading-relaxed">
          在左侧输入提示词并调整参数，<br />开始创作你的图像。
        </p>
      </div>
    );
  }

  const currentImage = session.images[selectedIndex];

  return (
    <div className="flex-1 bg-white flex flex-col h-full relative overflow-hidden">

      {/* Main Image Stage */}
      <div className="flex flex-1 flex-col overflow-hidden bg-neutral-50/30 p-4 sm:p-6 md:p-8">
        <div className="flex-1 flex items-center justify-center min-h-0 relative group">
          <img
            src={currentImage}
            alt={`${session.settings.prompt} - View ${selectedIndex + 1}`}
            onDoubleClick={onDownload}
            className="max-w-full max-h-full object-contain shadow-sm rounded-lg transition-all duration-300 md:cursor-pointer"
            title="双击保存图片"
          />

          {session.images.length > 1 && (
            <>
              <button
                onClick={() => onSelectIndex(selectedIndex > 0 ? selectedIndex - 1 : session.images.length - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-neutral-600 opacity-90 shadow-sm backdrop-blur transition-opacity hover:bg-white md:left-4 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button
                onClick={() => onSelectIndex(selectedIndex < session.images.length - 1 ? selectedIndex + 1 : 0)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-neutral-600 opacity-90 shadow-sm backdrop-blur transition-opacity hover:bg-white md:right-4 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          )}
        </div>

        {session.images.length > 1 && (
          <div className="mt-4 flex shrink-0 justify-center gap-2 sm:mt-6 sm:gap-3">
            {session.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => onSelectIndex(idx)}
                className={`relative h-14 w-14 overflow-hidden rounded border-2 transition-all duration-200 sm:h-16 sm:w-16 ${
                  selectedIndex === idx
                    ? 'border-neutral-900 ring-1 ring-neutral-900 shadow-md'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
