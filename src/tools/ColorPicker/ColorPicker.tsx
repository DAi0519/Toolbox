import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import ColorWheel from './ColorWheel';
import ColorPalette from './ColorPalette';
import { extractColors } from './utils/color';

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — ColorPicker (page level)
 *
 *    0ms   page mounts, wheel fades in (spring)
 *    0ms   back button slides in from top-left
 *  image   user uploads → extraction begins
 *  ~80ms   extraction complete → colors set
 *  100ms   palette panel slides in from right (spring)
 *  drag    overlay fades in with scale pulse
 *  toast   slides up from bottom (spring, auto-dismiss 2s)
 * ───────────────────────────────────────────────────────── */

const SPRINGS = {
  page:    { type: 'spring' as const, stiffness: 200, damping: 24, mass: 1 },
  panel:   { type: 'spring' as const, stiffness: 260, damping: 26 },
  overlay: { type: 'spring' as const, stiffness: 400, damping: 30 },
  toast:   { type: 'spring' as const, stiffness: 350, damping: 22 },
};

export default function ColorPicker() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleImage = useCallback(async (src: string) => {
    setImageSrc(src);
    setIsExtracting(true);
    setSelectedColor(null);
    setColors([]);

    try {
      const extracted = await extractColors(src, 12);
      setColors(extracted);
      if (extracted.length > 0) setSelectedColor(extracted[0]);
    } catch (err) {
      console.error('Color extraction failed:', err);
      showToast('色彩提取失败，请换一张图片');
    } finally {
      setIsExtracting(false);
    }
  }, [showToast]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) handleImage(result);
    };
    reader.readAsDataURL(file);
  }, [handleImage]);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleReset = () => {
    setImageSrc(null);
    setColors([]);
    setSelectedColor(null);
  };

  // Drag & drop with counter to handle child element events
  const dragCounter = useRef(0);
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  // Clipboard paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) handleFileSelect(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFileSelect]);

  const hasPalette = colors.length > 0;

  return (
    <div
      className="relative flex items-center justify-center h-screen w-full overflow-hidden bg-[var(--bg)] text-[var(--ink)]"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          e.target.value = '';
        }}
      />

      {/* Back button (Playbox vibe: bold, clean) */}
      <motion.div
        className="absolute top-8 left-8 z-30"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...SPRINGS.page, delay: 0.2 }}
      >
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-extrabold tracking-wider text-black/40 hover:text-black hover:bg-black/5 transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={2.5} className="-ml-0.5" />
          <span className="mt-[1px] -mr-[0.05em]">返回主页</span>
        </button>
      </motion.div>

      {/* Drag overlay (Playbox style) */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            className="absolute inset-0 z-50 bg-white/90 backdrop-blur-md flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SPRINGS.overlay}
          >
            <motion.div
              className="px-12 py-10 rounded-2xl bg-white shadow-2xl shadow-black/10 border-2 border-black/20 text-center"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              transition={SPRINGS.overlay}
            >
              <p className="text-xl font-extrabold uppercase tracking-widest text-black">
                松开提取色板
              </p>
              <p className="text-sm font-bold text-black/30 mt-3 uppercase tracking-wider">JPG / PNG / WebP</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main layout ── */}
      <div className={`
        flex items-center justify-center gap-12 lg:gap-24
        w-full h-full px-6 py-16
        ${hasPalette ? 'lg:px-12' : ''}
        transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
      `}>
        {/* Wheel container */}
        <motion.div
          className="flex-shrink-0 flex items-center justify-center"
          style={{
            width:  'clamp(320px, min(70vh, 70vw), 720px)',
            height: 'clamp(320px, min(70vh, 70vw), 720px)',
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRINGS.page}
        >
          <ColorWheel
            colors={colors}
            imageSrc={imageSrc}
            selectedColor={selectedColor}
            onUploadClick={handleUploadClick}
            onColorSelect={setSelectedColor}
            onReset={handleReset}
            isExtracting={isExtracting}
          />
        </motion.div>

        {/* Palette panel */}
        <AnimatePresence>
          {hasPalette && (
            <motion.div
              className="hidden md:flex h-[min(560px,70vh)] flex-shrink-0"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ ...SPRINGS.panel, delay: 0.1 }}
            >
              <ColorPalette
                colors={colors}
                selectedColor={selectedColor}
                onColorSelect={setSelectedColor}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile palette — bottom sheet style */}
      <AnimatePresence>
        {hasPalette && (
          <motion.div
            className="md:hidden absolute bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-xl border-t border-black/5 px-4 py-6 max-h-[45vh] overflow-y-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRINGS.panel}
          >
            <ColorPalette
              colors={colors}
              selectedColor={selectedColor}
              onColorSelect={setSelectedColor}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast (Playbox style) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed bottom-10 left-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-xl bg-[var(--ink)] text-[var(--bg)] shadow-2xl"
            initial={{ opacity: 0, y: 16, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 16, x: '-50%' }}
            transition={SPRINGS.toast}
          >
            <Check size={14} strokeWidth={3} />
            <span className="text-[13px] font-bold uppercase tracking-wider mt-0.5">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
