import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, RotateCcw, Upload } from 'lucide-react';
import ToolHeader from '../../components/ToolHeader';
import ColorWheel from './ColorWheel';
import ColorPalette from './ColorPalette';
import { extractColors } from './utils/color';
import { useViewport } from '../../hooks/useViewport';

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — ColorPicker (page level)
 *
 *    0ms   page mounts, wheel fades in (spring)
 *    0ms   header appears
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

const MOBILE_LAYOUT = {
  sideGutterMin: 16,
  sideGutterMax: 28,
  wheelPaddingMin: 6,
  wheelPaddingMax: 14,
  wheelMin: 140,
  topReserve: 84,
  sheetGap: 18,
  sheetRatio: 0.38,
  shortSheetMin: 180,
  defaultSheetMin: 220,
  sheetMax: 360,
};

export default function ColorPicker() {
  const { isMobile, viewportWidth, viewportHeight } = useViewport();
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
  const hasImageState = imageSrc !== null || colors.length > 0;
  const mobileSideGutterPx = Math.max(
    MOBILE_LAYOUT.sideGutterMin,
    Math.min(viewportWidth * 0.06, MOBILE_LAYOUT.sideGutterMax),
  );
  const mobileWheelPaddingPx = Math.max(
    MOBILE_LAYOUT.wheelPaddingMin,
    Math.min(
      viewportWidth * (hasPalette ? 0.03 : 0.022),
      MOBILE_LAYOUT.wheelPaddingMax,
    ),
  );
  const mobileSheetMinPx = viewportHeight < 720
    ? MOBILE_LAYOUT.shortSheetMin
    : MOBILE_LAYOUT.defaultSheetMin;
  const mobilePaletteMaxHeightPx = hasPalette
    ? Math.min(
        Math.max(viewportHeight * MOBILE_LAYOUT.sheetRatio, mobileSheetMinPx),
        MOBILE_LAYOUT.sheetMax,
      )
    : 0;
  const mobileWheelVerticalBudgetPx = hasPalette
    ? viewportHeight - MOBILE_LAYOUT.topReserve - mobilePaletteMaxHeightPx - MOBILE_LAYOUT.sheetGap
    : viewportHeight - MOBILE_LAYOUT.topReserve - mobileSideGutterPx * 2;
  const mobileWheelSize = `${Math.round(Math.max(
    MOBILE_LAYOUT.wheelMin,
    Math.min(
      viewportWidth - mobileSideGutterPx * 2,
      mobileWheelVerticalBudgetPx,
    ),
  ))}px`;
  const mobilePaletteMaxHeight = `${Math.round(mobilePaletteMaxHeightPx)}px`;
  const wheelSize = isMobile
    ? mobileWheelSize
    : 'clamp(320px, min(70vh, 70vw), 720px)';

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] w-full flex-col bg-[var(--bg)] text-[var(--ink)]">
      <ToolHeader
        title="色彩拾取"
        rightSlot={(
          <div className="flex items-center gap-1">
            <button
              onClick={handleUploadClick}
              className="tool-header-action"
              title="上传图片"
            >
              <Upload size={14} className="tool-header-action-icon" />
              <span className="tool-header-action-label">上传</span>
            </button>
            {hasImageState && (
              <button
                onClick={handleReset}
                className="tool-header-action"
                title="重置"
              >
                <RotateCcw size={14} className="tool-header-action-icon" />
                <span className="tool-header-action-label">重置</span>
              </button>
            )}
          </div>
        )}
      />

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
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

        {/* Drag overlay (Playbox style) */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={SPRINGS.overlay}
            >
              <motion.div
                className="rounded-2xl border-2 border-black/20 bg-white px-6 py-7 text-center shadow-2xl shadow-black/10 sm:px-12 sm:py-10"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                transition={SPRINGS.overlay}
              >
                <p className="text-lg font-extrabold uppercase tracking-widest text-black sm:text-xl">
                  松开提取色板
                </p>
                <p className="mt-3 text-sm font-bold uppercase tracking-wider text-black/30">JPG / PNG / WebP</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main layout ── */}
        <div
          className={`
            flex h-full w-full flex-col items-center justify-center gap-6 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-center md:gap-12 md:py-10 lg:gap-24
            ${hasPalette ? 'md:px-12' : ''}
            transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
          `}
          style={{
            paddingTop: isMobile && hasPalette ? Math.round(mobileSideGutterPx * 0.5) : undefined,
            paddingBottom: hasPalette && isMobile
              ? `calc(${mobilePaletteMaxHeight} + ${MOBILE_LAYOUT.sheetGap}px)`
              : undefined,
          }}
        >
          {/* Wheel container */}
          <motion.div
            className="flex shrink-0 items-center justify-center"
            style={{
              width: wheelSize,
              height: wheelSize,
              padding: isMobile ? `${Math.round(mobileWheelPaddingPx)}px` : undefined,
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
                className="hidden h-[min(560px,70vh)] flex-shrink-0 md:flex"
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
              className="absolute bottom-0 left-0 right-0 z-20 overflow-y-auto border-t border-black/5 bg-white/95 px-4 pb-[calc(var(--safe-bottom)+1.25rem)] pt-5 backdrop-blur-xl md:hidden"
              style={{
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                maxHeight: mobilePaletteMaxHeight,
              }}
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
              className="fixed left-1/2 z-50 flex items-center gap-3 rounded-xl bg-[var(--ink)] px-4 py-3 text-[var(--bg)] shadow-2xl sm:px-6"
              style={{ bottom: 'calc(var(--safe-bottom) + 1rem)' }}
              initial={{ opacity: 0, y: 16, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 16, x: '-50%' }}
              transition={SPRINGS.toast}
            >
              <Check size={14} strokeWidth={3} />
              <span className="mt-0.5 text-[13px] font-bold uppercase tracking-wider">{toast}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
