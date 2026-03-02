import React from 'react';
import { AspectRatio, ImageSize } from '../types';
import type { GenerationSettings } from '../types';
import { Button } from './Button';

interface ControlsProps {
  settings: GenerationSettings;
  onSettingsChange: (settings: GenerationSettings) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onOpenHistory: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  settings,
  onSettingsChange,
  onGenerate,
  isGenerating,
  onOpenHistory,
}) => {

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onSettingsChange({ ...settings, prompt: e.target.value });
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
    <div className="flex flex-col h-full bg-neutral-50 border-r border-neutral-200 p-8 space-y-10 overflow-y-auto w-full md:w-80 lg:w-96 flex-shrink-0 transition-colors duration-300">

      {/* Brand Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-neutral-900 tracking-tight">图像创作实验室</h2>
        </div>
        <button
          onClick={onOpenHistory}
          title="历史记录"
          className="p-2 rounded text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Prompt Input */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-neutral-500 tracking-wider">提示词 PROMPT</label>
        <div className="relative group">
          <textarea
            value={settings.prompt}
            onChange={handlePromptChange}
            placeholder="描述你的画面想法，例如：一只穿着宇航服的猫在火星上弹吉他..."
            className="w-full h-48 px-4 py-4 bg-white border-2 border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-300 focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] resize-none transition-all outline-none text-[15px] leading-relaxed shadow-sm"
            style={{ userSelect: 'text' }}
          />
          <div className="absolute bottom-3 right-3 pointer-events-none">
            <span className={`text-[10px] font-mono ${settings.prompt.length > 500 ? 'text-[var(--accent)]' : 'text-neutral-300'}`}>
              {settings.prompt.length}
            </span>
          </div>
        </div>
      </div>

      {/* Batch Size */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-neutral-500 tracking-wider">生成数量</label>
        <div className="flex bg-white border-2 border-neutral-200 rounded-lg overflow-hidden">
          {countOptions.map((num) => (
            <button
              key={num}
              onClick={() => handleCountChange(num)}
              className={`flex-1 py-2 text-sm font-medium transition-colors duration-200 border-r border-neutral-100 last:border-0
                ${settings.numberOfImages === num
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
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
        <div className="grid grid-cols-3 gap-2">
          {aspectRatioOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleAspectRatioChange(opt.value)}
              className={`p-3 rounded-xl text-center transition-all duration-200 border-2
                ${settings.aspectRatio === opt.value
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-md'
                  : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-[var(--ink)]'
                }`}
            >
              <div className="text-sm font-medium">{opt.label}</div>
              <div className={`text-[10px] mt-1 ${settings.aspectRatio === opt.value ? 'text-white/80' : 'text-neutral-400'}`}>
                {opt.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Resolution */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-neutral-500 tracking-wider">图像质量</label>
        <div className="flex bg-neutral-200/50 p-1 rounded-lg">
          {resolutionOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleResolutionChange(opt.value)}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all duration-200
                ${settings.imageSize === opt.value
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <div className="pt-6 mt-auto">
        <Button
          onClick={onGenerate}
          isLoading={isGenerating}
          className="w-full h-12 text-sm uppercase tracking-wide rounded-xl shadow-sm"
          disabled={!settings.prompt.trim()}
        >
          {isGenerating ? `生成中${settings.numberOfImages > 1 ? ` (${settings.numberOfImages})` : ''}` : '生成图像'}
        </Button>
      </div>
    </div>
  );
};
