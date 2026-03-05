import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, ChevronDown } from 'lucide-react';
import { formatColor, exportAsCSS, exportAsJSON } from './utils/color';

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — ColorPalette (Elegant)
 *
 *    0ms   panel slides in from right
 *  100ms   color preview card appears (spring, scale 0.98 → 1)
 *  200ms   format tabs fade in
 *  250ms   color rows stagger in from right (spring, 30ms apart)
 *  copy    copied indicator: check icon pops with spring
 * ───────────────────────────────────────────────────────── */

const SPRINGS = {
  card:   { type: 'spring' as const, stiffness: 300, damping: 30 },
  row:    { type: 'spring' as const, stiffness: 350, damping: 32 },
  pop:    { type: 'spring' as const, stiffness: 500, damping: 20 },
};

const LIST = {
  stagger:  0.04,   // seconds between each color row
  offsetX:  12,     // px each row slides in from
};

type ColorFormat = 'hex' | 'rgb' | 'hsl';

interface ColorPaletteProps {
  colors: string[];
  selectedColor: string | null;
  onColorSelect: (color: string) => void;
}

export default function ColorPalette({
  colors, selectedColor, onColorSelect,
}: ColorPaletteProps) {
  const [format, setFormat] = useState<ColorFormat>('hex');
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);

  const formats: ColorFormat[] = ['hex', 'rgb', 'hsl'];

  const copyToClipboard = async (text: string, color: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedColor(color);
      setTimeout(() => setCopiedColor(null), 1500);
    } catch { /* ignored */ }
  };

  const downloadTextFile = (content: string, mime: string, filename: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExport = (type: 'css' | 'json') => {
    if (type === 'css') {
      downloadTextFile(exportAsCSS(colors), 'text/css;charset=utf-8', 'palette.css');
    } else {
      downloadTextFile(exportAsJSON(colors), 'application/json;charset=utf-8', 'palette.json');
    }
    setShowExport(false);
  };

  const active = selectedColor || colors[0] || null;
  const lum = active ? luminance(active) : 0.5;
  const onColor = lum > 0.5 ? 'text-black/70' : 'text-white/90';

  return (
    <div className="flex flex-col h-full w-full max-w-[280px] min-w-0 gap-5 font-bold">
      {/* ── Color preview card ── */}
      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={active}
            className="rounded-xl overflow-hidden cursor-pointer group flex-shrink-0 shadow-sm border-2 border-black/5"
            style={{ backgroundColor: active }}
            onClick={() => copyToClipboard(formatColor(active, format), active)}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={SPRINGS.card}
          >
            <div className={`px-5 py-6 flex flex-col gap-1.5 ${onColor}`}>
              <div className="flex items-center justify-between">
                <span className="text-xl tracking-widest uppercase">
                  {formatColor(active, format)}
                </span>
                <motion.span
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  key={copiedColor === active ? 'check' : 'copy'}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={SPRINGS.pop}
                >
                  {copiedColor === active ? <Check size={18} strokeWidth={2.5} /> : <Copy size={18} strokeWidth={2.5} />}
                </motion.span>
              </div>
              <span className="text-[12px] uppercase tracking-widest opacity-60">点击复制</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Format tabs ── */}
      <div className="flex gap-1 border-b-2 border-black/[0.04] pb-2 flex-shrink-0">
        {formats.map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className="relative px-3 py-1 text-[12px] uppercase tracking-wider transition-colors"
            style={{ color: format === f ? 'rgba(0,0,0,0.95)' : 'rgba(0,0,0,0.3)' }}
          >
            {format === f && (
              <motion.div
                className="absolute -bottom-[10px] left-0 right-0 h-[2px] bg-black"
                layoutId="formatTabIndicator"
                transition={SPRINGS.row}
              />
            )}
            <span className="relative z-10">{f}</span>
          </button>
        ))}
      </div>

      {/* ── Color list ── */}
      <div className="flex-1 overflow-y-auto min-h-0 -mx-2 px-2 space-y-1 scrollbar-hide">
        {colors.map((color, i) => {
          const isActive = color === active;
          const isCopied = copiedColor === color;
          return (
            <motion.div
              key={`${color}-${i}`}
              className={`flex items-center gap-4 px-3 py-2.5 rounded-lg cursor-pointer group transition-colors ${
                isActive ? 'bg-black/[0.06]' : 'hover:bg-black/[0.02]'
              }`}
              onClick={() => onColorSelect(color)}
              initial={{ opacity: 0, x: LIST.offsetX }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                ...SPRINGS.row,
                delay: i * LIST.stagger,
              }}
            >
              <motion.div
                className="w-6 h-6 rounded-full flex-shrink-0 shadow-inner"
                style={{ backgroundColor: color }}
                whileHover={{ scale: 1.15 }}
                transition={SPRINGS.pop}
              />
              <span className={`flex-1 text-[14px] tracking-wider truncate pt-0.5 uppercase ${isActive ? 'text-black font-extrabold' : 'text-black/70'}`}>
                {formatColor(color, format)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(formatColor(color, format), color);
                }}
                className={`flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 transition-opacity ${isActive ? 'text-black' : 'text-black/40 hover:text-black/60'}`}
                title="Copy"
              >
                <motion.span
                  key={isCopied ? 'check' : 'copy'}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={SPRINGS.pop}
                >
                  {isCopied ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} strokeWidth={2.5} />}
                </motion.span>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* ── Export ── */}
      {colors.length > 0 && (
        <div className="relative flex-shrink-0 pt-4 border-t-2 border-black/[0.04]">
          <button
            onClick={() => setShowExport(!showExport)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 border-black/10 hover:border-black/40 text-black/70 hover:text-black transition-all bg-white"
          >
            <span className="text-[12px] uppercase tracking-widest pt-0.5">导出色板</span>
            <ChevronDown
              size={14}
              strokeWidth={2.5}
              className="transition-transform duration-300"
              style={{ transform: showExport ? 'rotate(180deg)' : undefined }}
            />
          </button>

          <AnimatePresence>
            {showExport && (
              <motion.div
                className="absolute bottom-[calc(100%+8px)] left-0 right-0 bg-white rounded-lg shadow-2xl shadow-black/10 border-2 border-black/5 overflow-hidden z-30"
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={SPRINGS.row}
              >
                <button
                  onClick={() => handleExport('css')}
                  className="w-full px-5 py-3.5 text-left hover:bg-black/5 transition-colors flex items-center gap-4 group"
                >
                  <span className="text-black text-[11px] font-extrabold uppercase tracking-widest w-8 pt-0.5">CSS</span>
                  <span className="text-[13px] text-black/70 group-hover:text-black group-hover:font-bold tracking-wider pt-0.5">变量文件</span>
                </button>
                <div className="h-[2px] bg-black/5 mx-2" />
                <button
                  onClick={() => handleExport('json')}
                  className="w-full px-5 py-3.5 text-left hover:bg-black/5 transition-colors flex items-center gap-4 group"
                >
                  <span className="text-black text-[11px] font-extrabold uppercase tracking-widest w-8 pt-0.5">JSON</span>
                  <span className="text-[13px] text-black/70 group-hover:text-black group-hover:font-bold tracking-wider pt-0.5">原始数据</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
