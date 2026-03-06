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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-5 shadow-2xl sm:p-8">
        {required && (
          <div className="mb-2 flex items-center">
            <BackHomeButton
              compact
              className="-ml-2 text-neutral-500 hover:text-neutral-900"
            />
            <span className="ml-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
              Return Home
            </span>
          </div>
        )}

        <div className="mb-5 sm:mb-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-1">Gemini API Key</h2>
          <p className="text-sm text-neutral-500">
            输入你的 Gemini API Key 以使用图像生成功能。
            Key 仅存储在本地浏览器中。
          </p>
        </div>

        <div className="space-y-4">
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
              className="w-full px-4 py-2.5 border border-neutral-200 rounded text-sm text-neutral-900 placeholder-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
              style={{ userSelect: 'text' }}
            />
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
          </div>

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
          >
            获取 API Key
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 sm:mt-8">
          {!required && onClose && (
            <Button variant="ghost" onClick={onClose}>取消</Button>
          )}
          <Button onClick={handleSave} disabled={!value.trim()}>
            保存
          </Button>
        </div>
      </div>
    </div>
  );
};
