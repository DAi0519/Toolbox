import React, { useState, useCallback } from 'react';
import ToolHeader from '../../components/ToolHeader';
import { Controls } from './components/Controls';
import { ImageViewer } from './components/ImageViewer';
import { ApiKeyModal } from './components/ApiKeyModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { generateImages } from './services/geminiService';
import { AspectRatio, ImageSize } from './types';
import type { GenerationSession, GenerationSettings } from './types';
import { useViewport } from '../../hooks/useViewport';
import { normalizeApiKey, validateApiKey } from './utils/apiKey';

const STORAGE_KEY_API = 'playbox.imageStudio.apiKey';
const STORAGE_KEY_HISTORY = 'playbox.imageStudio.history';
const MAX_HISTORY = 10;
const MAX_HISTORY_STORAGE_BYTES = 4_500_000;
const MAX_SESSION_STORAGE_BYTES = 1_500_000;

function isGenerationSession(value: unknown): value is GenerationSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GenerationSession>;
  const settings = candidate.settings as Partial<GenerationSettings> | undefined;

  return (
    typeof candidate.id === 'string' &&
    Array.isArray(candidate.images) &&
    candidate.images.every((image) => typeof image === 'string') &&
    typeof candidate.timestamp === 'number' &&
    !!settings &&
    typeof settings.prompt === 'string' &&
    typeof settings.numberOfImages === 'number' &&
    Object.values(AspectRatio).includes(settings.aspectRatio as AspectRatio) &&
    Object.values(ImageSize).includes(settings.imageSize as ImageSize)
  );
}

function estimateBytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

function isQuotaExceededError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

function prepareSessionForStorage(session: GenerationSession): GenerationSession | null {
  if (session.images.length === 0) return null;

  const fullBytes = estimateBytes(JSON.stringify(session));
  if (fullBytes <= MAX_SESSION_STORAGE_BYTES) return session;

  // Keep at least one preview in history when possible.
  const compactSession: GenerationSession = {
    ...session,
    images: [session.images[0]],
  };

  const compactBytes = estimateBytes(JSON.stringify(compactSession));
  return compactBytes <= MAX_SESSION_STORAGE_BYTES ? compactSession : null;
}

function normalizeHistory(history: GenerationSession[]): GenerationSession[] {
  const prepared = history
    .slice(-MAX_HISTORY)
    .map(prepareSessionForStorage)
    .filter((session): session is GenerationSession => session !== null);

  let trimmed = prepared;
  while (trimmed.length > 0 && estimateBytes(JSON.stringify(trimmed)) > MAX_HISTORY_STORAGE_BYTES) {
    trimmed = trimmed.slice(1);
  }

  return trimmed;
}

function persistHistory(history: GenerationSession[]): GenerationSession[] {
  const normalized = normalizeHistory(history);

  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(normalized));
    return normalized;
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      console.warn('Failed to save history to localStorage:', error);
      return normalized;
    }

    // Emergency fallback: progressively drop oldest entries until storage succeeds.
    const fallback = [...normalized];
    while (fallback.length > 0) {
      fallback.shift();
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(fallback));
        return fallback;
      } catch {
        // Continue trimming until we can persist.
      }
    }

    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch {
      // Ignore remove failure; the in-memory state still falls back to empty.
    }
    return [];
  }
}

function loadHistory(): GenerationSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const sanitized = parsed.filter(isGenerationSession);
    const normalized = normalizeHistory(sanitized);

    if (JSON.stringify(normalized) !== raw) {
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(normalized));
      } catch {
        // Keep runtime state valid even if we cannot rewrite storage immediately.
      }
    }

    return normalized;
  } catch {
    return [];
  }
}

function saveHistory(history: GenerationSession[]) {
  return persistHistory(history);
}

function loadApiKey(): string {
  if (typeof window === 'undefined') return '';

  const raw = localStorage.getItem(STORAGE_KEY_API) || '';
  const normalized = normalizeApiKey(raw);

  if (!normalized) return '';

  if (validateApiKey(normalized)) {
    localStorage.removeItem(STORAGE_KEY_API);
    return '';
  }

  if (normalized !== raw) {
    localStorage.setItem(STORAGE_KEY_API, normalized);
  }

  return normalized;
}

const ImageStudio: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(loadApiKey);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState<boolean>(() => !loadApiKey());
  const [apiKeyRequired, setApiKeyRequired] = useState<boolean>(() => !loadApiKey());

  const [settings, setSettings] = useState<GenerationSettings>({
    prompt: '',
    aspectRatio: AspectRatio.SQUARE,
    imageSize: ImageSize.R1K,
    numberOfImages: 1,
  });

  const [currentSession, setCurrentSession] = useState<GenerationSession | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GenerationSession[]>(loadHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { isMobile, viewportHeight } = useViewport();

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((current) => (current === message ? null : current));
    }, 2200);
  }, []);

  const apiKeyError = validateApiKey(apiKey);
  const canGenerate = settings.prompt.trim().length > 0 && !apiKeyError;
  const keyboardInset = typeof window === 'undefined' ? 0 : Math.max(0, window.innerHeight - viewportHeight);
  const isKeyboardOpen = isMobile && keyboardInset > 140;

  const handleSaveApiKey = (key: string) => {
    const normalized = normalizeApiKey(key);
    localStorage.setItem(STORAGE_KEY_API, normalized);
    setApiKey(normalized);
    setApiKeyModalOpen(false);
    setApiKeyRequired(false);
  };

  const handleGenerate = useCallback(async () => {
    if (!settings.prompt.trim() || apiKeyError) return;

    setIsGenerating(true);
    setError(null);

    try {
      const images = await generateImages(apiKey, settings);

      const newSession: GenerationSession = {
        id: crypto.randomUUID(),
        images,
        settings: { ...settings },
        timestamp: Date.now(),
      };

      setCurrentSession(newSession);
      setSelectedIndex(0);
      showToast(`已生成 ${images.length} 张图像`);
      setHistory((prev) => {
        const sessionForHistory = prepareSessionForStorage(newSession);
        const nextHistory = sessionForHistory ? [...prev, sessionForHistory] : [...prev];
        const persisted = saveHistory(nextHistory);

        if (!sessionForHistory) {
          console.warn('Generated session was too large for history storage and was skipped.');
        }

        return persisted;
      });
    } catch (err: unknown) {
      console.error('Generation error:', err);
      const message = err instanceof Error ? err.message : '';
      if (message.includes('API Key 无效')) {
        localStorage.removeItem(STORAGE_KEY_API);
        setApiKey('');
        setApiKeyRequired(true);
        setApiKeyModalOpen(true);
      }
      setError(message || 'Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [settings, apiKey, apiKeyError]);

  const handleClearHistory = () => {
    setHistory([]);
    saveHistory([]);
    showToast('历史记录已清空');
  };

  const handleDownload = useCallback(() => {
    if (!currentSession) return;
    const url = currentSession.images[selectedIndex];
    const sanitizedPrompt = currentSession.settings.prompt
      .replace(/[^a-z0-9]/gi, '_')
      .substring(0, 30);

    const filename = `image_studio_${sanitizedPrompt}_${selectedIndex + 1}_${Date.now()}.png`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('已开始保存当前图片');
  }, [currentSession, selectedIndex, showToast]);

  const handleDownloadAll = useCallback(() => {
    if (!currentSession) return;
    currentSession.images.forEach((url, idx) => {
      const sanitizedPrompt = currentSession.settings.prompt
        .replace(/[^a-z0-9]/gi, '_')
        .substring(0, 30);

      const filename = `image_studio_${sanitizedPrompt}_${idx + 1}_${Date.now()}.png`;
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
    showToast(`已开始保存 ${currentSession.images.length} 张图片`);
  }, [currentSession, showToast]);

  return (
    <div className="flex h-full min-h-full w-full flex-col overflow-x-hidden bg-white pb-[var(--safe-bottom)] text-neutral-900 selection:bg-blue-100 selection:text-blue-900 md:h-[100dvh] md:min-h-[100dvh] md:overflow-hidden">
      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        required={apiKeyRequired}
        onSave={handleSaveApiKey}
        onClose={() => !apiKeyRequired && setApiKeyModalOpen(false)}
      />

      <ToolHeader
        title="图像创作实验室"
        rightSlot={(
          <>
            <button
              onClick={() => setHistoryOpen(true)}
              className="tool-header-action"
            >
              <svg className="tool-header-action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="tool-header-action-label">历史</span>
            </button>
            <button
              onClick={() => setApiKeyModalOpen(true)}
              className="tool-header-action group gap-2"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${apiKey ? 'bg-green-500' : 'bg-red-400'} opacity-70 group-hover:opacity-100 transition-opacity`} />
              <span className="tool-header-action-label">API Key</span>
            </button>
          </>
        )}
      />

      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden"
        style={isMobile
          ? { paddingBottom: isKeyboardOpen ? '0px' : 'calc(86px + var(--safe-bottom))' }
          : undefined}
      >
        {/* Sidebar Controls */}
        <Controls
          settings={settings}
          onSettingsChange={setSettings}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          showGenerateButton={!isMobile}
          onNotify={showToast}
          session={currentSession}
          selectedIndex={selectedIndex}
          onDownload={handleDownload}
          onDownloadAll={handleDownloadAll}
        />

        {/* Main Preview Area */}
        <div className="relative flex min-h-[420px] flex-1 flex-col transition-all md:min-h-0">
          {/* Error Notification */}
          {error && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-50 w-full max-w-[min(92vw,28rem)] -translate-x-1/2 px-3 md:bottom-auto md:top-6 md:px-4">
              <div className="flex items-start gap-3 rounded border-l-4 border-red-500 bg-white px-4 py-3 text-red-600 shadow-lg ring-1 ring-black/5">
                <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium">{error}</p>
                </div>
                <button onClick={() => setError(null)} className="pointer-events-auto text-neutral-400 hover:text-neutral-800">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <ImageViewer
            key={currentSession?.id ?? 'empty-session'}
            session={currentSession}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            isGenerating={isGenerating}
            onDownload={handleDownload}
          />

          {/* History Drawer (overlaid on image area) */}
          <HistoryDrawer
            history={history}
            onSelect={(session) => {
              setCurrentSession(session);
              setSelectedIndex(0);
            }}
            onClose={() => setHistoryOpen(false)}
            isOpen={historyOpen}
            onClear={handleClearHistory}
          />
        </div>
      </div>

      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/80 bg-white/95 backdrop-blur transition-all duration-200 md:hidden ${
          isKeyboardOpen ? 'pointer-events-none translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="mx-auto flex max-w-screen-sm flex-col gap-2 px-4 pb-[calc(0.75rem+var(--safe-bottom))] pt-3">
          {!canGenerate && (
            <p className="text-center text-xs text-neutral-500">
              {apiKeyError || '请输入提示词后再生成'}
            </p>
          )}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold tracking-wide text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? `生成中${settings.numberOfImages > 1 ? ` (${settings.numberOfImages})` : ''}` : '生成图像'}
          </button>
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+var(--safe-bottom))] z-50 flex justify-center px-4 md:bottom-6">
          <div className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageStudio;
