import React, { useState } from 'react';
import BackHomeButton from '../../../components/BackHomeButton';
import { Button } from './Button';
import { normalizeApiKey, validateApiKey } from '../utils/apiKey';

interface ApiKeyModalProps {
  isOpen: boolean;
  required?: boolean;
  onSave: (apiKey: string) => void;
  onClose?: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, required = false, onSave, onClose }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    const validationError = validateApiKey(value);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    onSave(normalizeApiKey(value));
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape' && !required && onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-[28px] border border-black/5 bg-white px-8 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        {required && (
          <div className="mb-5 flex items-center">
            <BackHomeButton
              compact
              className="-ml-2 text-neutral-500 hover:text-neutral-900"
            />
            <span className="ml-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
              Return Home
            </span>
          </div>
        )}

        <div className="mb-6">
          <h2 className="mb-2 text-[2rem] font-semibold leading-none tracking-[-0.03em] text-neutral-900">
            Gemini API Key
          </h2>
          <p className="max-w-[22rem] text-base leading-8 text-neutral-500">
            输入你的 Gemini API Key 以使用图像生成功能。
            Key 仅存储在本地浏览器中。
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="AIza..."
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              className="h-20 w-full rounded-2xl border-2 border-neutral-900 px-6 text-xl text-neutral-900 placeholder-neutral-300 outline-none transition-[border-color,box-shadow] duration-200 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5"
              style={{ userSelect: 'text' }}
            />
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          </div>

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)] hover:underline"
          >
            获取 API Key
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          {!required && onClose && (
            <Button variant="ghost" onClick={onClose}>取消</Button>
          )}
          <Button className="min-w-28" onClick={handleSave} disabled={!value.trim()}>
            保存
          </Button>
        </div>
      </div>
    </div>
  );
};
