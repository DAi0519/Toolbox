import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Controls } from './components/Controls';
import { ImageViewer } from './components/ImageViewer';
import { ApiKeyModal } from './components/ApiKeyModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { generateImages } from './services/geminiService';
import { AspectRatio, ImageSize } from './types';
import type { GenerationSession, GenerationSettings } from './types';

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

const ImageStudio: React.FC = () => {
  const navigate = useNavigate();

  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(STORAGE_KEY_API) || '');
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState<boolean>(() => !localStorage.getItem(STORAGE_KEY_API));
  const [apiKeyRequired, setApiKeyRequired] = useState<boolean>(() => !localStorage.getItem(STORAGE_KEY_API));

  const [settings, setSettings] = useState<GenerationSettings>({
    prompt: '',
    aspectRatio: AspectRatio.SQUARE,
    imageSize: ImageSize.R1K,
    numberOfImages: 1,
  });

  const [currentSession, setCurrentSession] = useState<GenerationSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GenerationSession[]>(loadHistory);
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem(STORAGE_KEY_API, key);
    setApiKey(key);
    setApiKeyModalOpen(false);
    setApiKeyRequired(false);
  };

  const handleGenerate = useCallback(async () => {
    if (!settings.prompt.trim() || !apiKey) return;

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
      setError(message || 'Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [settings, apiKey]);

  const handleClearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-white text-neutral-900 selection:bg-blue-100 selection:text-blue-900">

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        required={apiKeyRequired}
        onSave={handleSaveApiKey}
        onClose={() => !apiKeyRequired && setApiKeyModalOpen(false)}
      />

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-neutral-100 z-20">
        <button onClick={() => navigate('/')} className="text-neutral-500 hover:text-neutral-900 flex items-center gap-1.5 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <span className="font-semibold text-base">图像创作实验室</span>
        <button
          onClick={() => setApiKeyModalOpen(true)}
          className="flex items-center gap-1.5 text-xs text-neutral-500"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${apiKey ? 'bg-green-500' : 'bg-red-400'}`}></span>
          Key
        </button>
      </div>

      {/* Sidebar Controls */}
      <Controls
        settings={settings}
        onSettingsChange={setSettings}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col relative h-full transition-all">

        {/* Top Bar (Desktop) */}
        <div className="hidden md:flex items-center justify-between p-6 absolute top-0 left-0 right-0 z-20 pointer-events-none">
          {/* Back button */}
          <div className="pointer-events-auto">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur border border-neutral-200 shadow-sm hover:shadow-md transition-all text-xs font-medium text-neutral-500 hover:text-neutral-900"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              返回
            </button>
          </div>

          {/* API Key status */}
          <div className="pointer-events-auto">
            <button
              onClick={() => setApiKeyModalOpen(true)}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur border border-neutral-200 shadow-sm hover:shadow-md transition-all text-xs font-medium text-neutral-500 hover:text-neutral-900"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${apiKey ? 'bg-green-500' : 'bg-red-400'} opacity-60 group-hover:opacity-100 transition-opacity`}></span>
              API Key
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4">
            <div className="bg-white text-red-600 px-4 py-3 rounded shadow-lg border-l-4 border-red-500 flex items-start gap-3 ring-1 ring-black/5">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-neutral-400 hover:text-neutral-800">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <ImageViewer
          key={currentSession?.id ?? 'empty-session'}
          session={currentSession}
          isGenerating={isGenerating}
        />

        {/* History Drawer (overlaid on image area) */}
        <HistoryDrawer
          history={history}
          onSelect={(session) => setCurrentSession(session)}
          onClose={() => setHistoryOpen(false)}
          isOpen={historyOpen}
          onClear={handleClearHistory}
        />
      </div>
    </div>
  );
};

export default ImageStudio;
