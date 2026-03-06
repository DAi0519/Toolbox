import React from 'react';
import { AspectRatio, ImageSize } from '../types';
import type { GenerationSettings, GenerationSession } from '../types';
import { Button } from './Button';

interface ControlsProps {
  settings: GenerationSettings;
  onSettingsChange: (settings: GenerationSettings) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  showGenerateButton?: boolean;
  onNotify?: (message: string) => void;
  session: GenerationSession | null;
  selectedIndex: number;
  onDownload: () => void;
  onDownloadAll: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  settings,
  onSettingsChange,
  onGenerate,
  isGenerating,
  showGenerateButton = true,
  onNotify,
  session,
  selectedIndex,
  onDownload,
  onDownloadAll,
}) => {
  const canGenerate = settings.prompt.trim().length > 0;

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onSettingsChange({ ...settings, prompt: e.target.value });
  };

  const handlePromptFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 768) return;

    // Keep textarea in viewport when soft keyboard shrinks visible area.
    window.setTimeout(() => {
      e.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 120);
  };

  const handleAspectRatioChange = (ratio: AspectRatio) => {
    onSettingsChange({ ...settings, aspectRatio: ratio });
  };

  const handleResolutionChange = (size: ImageSize) => {
    onSettingsChange({ ...settings, imageSize: size });
  };

  const handleCountChange = (count: number) => {
    onSettingsChange({ ...settings, numberOfImages: count });
  };

  const aspectRatioOptions = [
    { label: "1:1", value: AspectRatio.SQUARE, desc: "正方形" },
    { label: "16:9", value: AspectRatio.WIDE_LANDSCAPE, desc: "宽屏" },
    { label: "9:16", value: AspectRatio.TALL_PORTRAIT, desc: "竖屏" },
    { label: "4:3", value: AspectRatio.LANDSCAPE, desc: "经典" },
    { label: "3:4", value: AspectRatio.PORTRAIT, desc: "肖像" },
  ];

  const resolutionOptions = [
    { label: "1K", value: ImageSize.R1K },
    { label: "2K", value: ImageSize.R2K },
    { label: "4K", value: ImageSize.R4K },
  ];

  const countOptions = [1, 2, 3, 4];

  return (
    <div className="flex h-auto w-full flex-col overflow-y-visible border-b border-neutral-200 bg-neutral-50 transition-colors duration-300 md:h-full md:w-80 md:flex-shrink-0 md:border-b-0 md:border-r lg:w-96 relative">
      <div className="flex-1 overflow-y-auto w-full p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 md:space-y-10 pb-32">
      {/* Prompt Input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-neutral-500 tracking-wider">提示词 PROMPT</label>
          {settings.prompt.trim() && (
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(settings.prompt);
                  onNotify?.('提示词已复制');
                } catch {
                  onNotify?.('复制失败，请手动复制');
                }
                const btn = document.activeElement as HTMLElement;
                if (btn) btn.blur();
              }}
              className="text-[10px] font-medium text-neutral-400 hover:text-[var(--accent)] active:scale-95 transition-all flex items-center gap-1 bg-white border border-neutral-200 px-2 py-1 rounded shadow-sm"
              title="复制提示词"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              复制
            </button>
          )}
        </div>
        <div className="relative group">
          <textarea
            value={settings.prompt}
            onChange={handlePromptChange}
            onFocus={handlePromptFocus}
            placeholder="描述你的画面想法，例如：一只穿着宇航服的猫在火星上弹吉他..."
            className="h-36 w-full resize-none rounded-2xl bg-white px-4 py-4 text-[15px] leading-relaxed text-neutral-900 shadow-sm ring-1 ring-neutral-200 outline-none transition-all placeholder-neutral-400 focus:ring-2 focus:ring-[var(--accent)] md:h-48"
            style={{ userSelect: 'text' }}
          />
          <div className="absolute bottom-3 right-3 pointer-events-none">
            <span className={`text-[10px] font-sans ${settings.prompt.length > 500 ? 'text-[var(--accent)]' : 'text-neutral-300'}`}>
              {settings.prompt.length}
            </span>
          </div>
        </div>
      </div>

      {/* Batch Size */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-neutral-500 tracking-wider">生成数量</label>
        <div className="flex bg-black/5 p-1 rounded-[14px]">
          {countOptions.map((num) => (
            <button
              key={num}
              onClick={() => handleCountChange(num)}
              className={`flex-1 py-2 text-sm font-medium rounded-[10px] transition-all duration-200
                ${settings.numberOfImages === num
                  ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-black/5'
                  : 'text-neutral-500 hover:text-neutral-900'
                }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Aspect Ratio */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-neutral-500 tracking-wider">画面比例</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {aspectRatioOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleAspectRatioChange(opt.value)}
              className={`p-3 rounded-[14px] text-center transition-all duration-200 border border-transparent
                ${settings.aspectRatio === opt.value
                  ? 'bg-white text-neutral-900 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.1)] ring-1 ring-black/5'
                  : 'bg-black/[0.03] text-neutral-500 hover:bg-black/[0.06] hover:text-[var(--ink)]'
                }`}
            >
              <div className="text-sm font-semibold">{opt.label}</div>
              <div className={`text-[10px] mt-1 font-medium ${settings.aspectRatio === opt.value ? 'text-neutral-500' : 'text-neutral-400'}`}>
                {opt.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Resolution */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-neutral-500 tracking-wider">图像质量</label>
        <div className="flex bg-black/5 p-1 rounded-[14px]">
          {resolutionOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleResolutionChange(opt.value)}
              className={`flex-1 py-2 text-xs font-semibold rounded-[10px] transition-all duration-200
                ${settings.imageSize === opt.value
                  ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-black/5'
                  : 'text-neutral-500 hover:text-neutral-700'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {showGenerateButton && (
        <div className="mt-2 pt-4 md:mt-auto md:pt-6">
          <Button
            onClick={onGenerate}
            isLoading={isGenerating}
            className="h-12 w-full rounded-xl text-sm uppercase tracking-wide shadow-sm"
            disabled={!canGenerate}
          >
            {isGenerating ? `生成中${settings.numberOfImages > 1 ? ` (${settings.numberOfImages})` : ''}` : '生成图像'}
          </Button>
          {!canGenerate && (
            <p className="mt-2 text-center text-xs text-neutral-400">
              请输入提示词后再生成
            </p>
          )}
        </div>
      )}
      </div>

      {/* Output Meta Card (Sticky at bottom) */}
      {session && !isGenerating && (
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-black/5 p-4 shrink-0 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-10">
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-neutral-500 tracking-wider">当前结果</span>
              <div className="flex items-center gap-1.5">
                 <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/5 text-neutral-500 uppercase tracking-wider">
                  {session.settings.imageSize}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/5 text-neutral-500 uppercase tracking-wider">
                  {session.settings.aspectRatio}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-black/5 rounded-[14px] p-1">
               <div className="px-3">
                 <span className="text-[11px] font-semibold text-neutral-500 tracking-wider">
                  {session.images.length > 1 ? `第 ${selectedIndex + 1} / ${session.images.length} 张` : '单张图像'}
                </span>
               </div>
               <div className="flex items-center gap-1">
                 <button 
                  onClick={onDownload} 
                  className="px-3 py-1.5 bg-white text-neutral-900 hover:text-[var(--accent)] text-xs font-semibold rounded-[10px] shadow-sm ring-1 ring-black/5 transition-all"
                  title="保存当前"
                 >
                   保存
                 </button>
                 {session.images.length > 1 && (
                    <button 
                      onClick={onDownloadAll} 
                      className="px-3 py-1.5 bg-[var(--accent)] text-white hover:opacity-90 text-xs font-semibold rounded-[10px] shadow-sm ring-1 ring-black/5 transition-all"
                      title="保存全部"
                    >
                      全存
                    </button>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
