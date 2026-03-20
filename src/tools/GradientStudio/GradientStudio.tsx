import { useState, useRef, useEffect, useCallback } from 'react';
import { Download, RefreshCw, Plus, ImageIcon, X } from 'lucide-react';
import ToolHeader from '../../components/ToolHeader';
import { useViewport } from '../../hooks/useViewport';
import {
  renderGradient,
  generateControlPoints,
  generateGridControlPoints,
  randomPalette,
  type ControlPoint,
  type GradientType,
  type WarpShape,
} from './utils/gradient';
import { extractColors } from '../ColorPicker/utils/color';

/* ─────────────────────────────────────────────────────────
 * GradientStudio
 *
 * Fullscreen gradient generator. Layout:
 *   Desktop: preview (flex-1) | control panel (320px)
 *   Mobile:  preview (45vh)   | control panel (scroll)
 *
 * Rendering: Canvas 2D via renderGradient(). Preview renders
 * at container-fit resolution; Download exports at W×H.
 * ───────────────────────────────────────────────────────── */

const MAX_PREVIEW = 900;
const MAX_COLORS = 10;
const DEFAULT_COLOR_COUNT = 5;

const GRADIENT_OPTIONS: Array<{ value: GradientType; label: string }> = [
  { value: 'sharp-bezier', label: 'Sharp Bézier' },
  { value: 'soft-bezier', label: 'Soft Bézier' },
  { value: 'mesh-static', label: 'Mesh Static' },
  { value: 'mesh-grid', label: 'Mesh Grid' },
  { value: 'simple', label: 'Simple' },
];

const WARP_OPTIONS: Array<{ value: WarpShape; label: string }> = [
  { value: 'simplex-noise', label: 'Simplex Noise' },
  { value: 'circular', label: 'Circular' },
  { value: 'value-noise', label: 'Value Noise' },
  { value: 'worley-noise', label: 'Worley Noise' },
  { value: 'fbm-noise', label: 'FBM Noise' },
  { value: 'voronoi-noise', label: 'Voronoi Noise' },
  { value: 'domain-warping', label: 'Domain Warping' },
  { value: 'waves', label: 'Waves' },
  { value: 'smooth-noise', label: 'Smooth Noise' },
  { value: 'oval', label: 'Oval' },
  { value: 'rows', label: 'Rows' },
  { value: 'columns', label: 'Columns' },
  { value: 'flat', label: 'Flat' },
  { value: 'gravity', label: 'Gravity' },
];

export default function GradientStudio() {
  const { viewportWidth, viewportHeight } = useViewport();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draggingIndexRef = useRef<number | null>(null);

  const [gradientType, setGradientType] = useState<GradientType>('sharp-bezier');
  const [warpShape, setWarpShape] = useState<WarpShape>('smooth-noise');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 99999));
  const [colors, setColors] = useState<string[]>(() => randomPalette(DEFAULT_COLOR_COUNT));
  const [exportW, setExportW] = useState(900);
  const [exportH, setExportH] = useState(1200);
  const [warp, setWarp] = useState(27);
  const [warpSize, setWarpSize] = useState(33);
  const [noise, setNoise] = useState(53);
  const [controlPoints, setControlPoints] = useState<ControlPoint[]>(() => generateGridControlPoints(DEFAULT_COLOR_COUNT));
  const [previewSize, setPreviewSize] = useState({ w: 0, h: 0 });
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timeRef = useRef(0);
  const previewSizeRef = useRef({ w: 0, h: 0 });
  // Orientation-first behavior:
  // landscape (w > h) => side-by-side
  // portrait/square (h >= w) => stacked
  const useMobileLayout = viewportHeight >= viewportWidth;

  const pointsEditable = gradientType === 'simple' || gradientType === 'soft-bezier' || gradientType === 'sharp-bezier';

  const updateControlPoint = useCallback((index: number, clientX: number, clientY: number) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    setControlPoints(prev => prev.map((p, i) => (i === index ? { x, y } : p)));
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (draggingIndexRef.current == null) return;
      updateControlPoint(draggingIndexRef.current, e.clientX, e.clientY);
    };
    const onUp = () => { draggingIndexRef.current = null; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [updateControlPoint]);

  useEffect(() => {
    setControlPoints(prev => {
      if (prev.length === colors.length) return prev;
      if (prev.length > colors.length) return prev.slice(0, colors.length);
      const extra = generateControlPoints(colors.length - prev.length, seed + prev.length * 97);
      return [...prev, ...extra];
    });
  }, [colors.length, seed]);

  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (!cw || !ch) return;

    const ratio = exportH / exportW;
    let pw = Math.min(cw, MAX_PREVIEW, exportW);
    let ph = Math.round(pw * ratio);
    if (ph > ch) { ph = ch; pw = Math.round(ph / ratio); }
    if (previewSizeRef.current.w !== pw || previewSizeRef.current.h !== ph) {
      previewSizeRef.current = { w: pw, h: ph };
      setPreviewSize({ w: pw, h: ph });
    }

    renderGradient(
      canvas,
      {
        gradientType,
        warpShape,
        warp,
        warpSize,
        noise,
        colors,
        controlPoints,
        seed,
        time: motionEnabled ? timeRef.current : 0,
      },
      pw, ph,
    );
  }, [gradientType, warpShape, warp, warpSize, noise, colors, controlPoints, seed, exportW, exportH, motionEnabled]);

  // Static render for option changes
  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // Re-render on window resize
  useEffect(() => {
    const handler = () => renderPreview();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [renderPreview]);

  // Animation loop (preview only)
  useEffect(() => {
    if (!motionEnabled) {
      timeRef.current = 0;
      renderPreview();
      return;
    }
    const timer = window.setInterval(() => {
      timeRef.current += 1 / 30;
      renderPreview();
    }, 33);
    return () => window.clearInterval(timer);
  }, [motionEnabled, renderPreview]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleDownload = () => {
    const offscreen = document.createElement('canvas');
    renderGradient(
      offscreen,
      {
        gradientType,
        warpShape,
        warp,
        warpSize,
        noise,
        colors,
        controlPoints,
        seed,
        time: motionEnabled ? timeRef.current : 0,
      },
      exportW,
      exportH,
      true,
    );
    const ts = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const a = document.createElement('a');
    a.href = offscreen.toDataURL('image/png');
    a.download = `gradient-studio-${ts}.png`;
    a.click();
  };

  const handleAddColor = () => {
    if (colors.length >= MAX_COLORS) {
      showToast('最多 10 个颜色');
      return;
    }
    const hex = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    setColors(c => [...c, hex]);
    setControlPoints(prev => [...prev, ...generateControlPoints(1, seed + prev.length * 131)]);
  };

  const handleRemoveColor = (i: number) => {
    if (colors.length <= 2) { showToast('至少需要 2 个颜色'); return; }
    setColors(c => c.filter((_, idx) => idx !== i));
    setControlPoints(c => c.filter((_, idx) => idx !== i));
  };

  const handleRandomize = () => {
    // Match photogradient behavior: refresh randomizes point field (seed),
    // while keeping the current palette.
    const nextSeed = Math.floor(Math.random() * 99999);
    setSeed(nextSeed);
    setControlPoints(generateControlPoints(colors.length, nextSeed));
  };

  const handleImportImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const src = URL.createObjectURL(file);
      const extracted = await extractColors(src, 8);
      URL.revokeObjectURL(src);
      if (extracted.length > 0) {
        const nextColors = extracted.slice(0, MAX_COLORS);
        const nextSeed = Date.now() % 99999;
        setColors(nextColors);
        setSeed(nextSeed);
        setControlPoints(generateControlPoints(nextColors.length, nextSeed));
      }
      else showToast('提取失败，请换一张图片');
    } catch {
      showToast('提取失败，请换一张图片');
    }
  };

  const clampDim = (v: number) => Math.max(100, Math.min(4000, v));

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="h-screen flex flex-col overflow-hidden bg-[#ECEDEF]"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(20, 28, 39, 0.16) 1px, transparent 0)',
        backgroundSize: '38px 38px',
      }}
    >
      <ToolHeader title="渐变工坊" />

      <div className={`flex flex-1 min-h-0 ${useMobileLayout ? 'overflow-y-auto' : 'overflow-hidden'} ${useMobileLayout ? 'px-3 pb-4' : 'px-8 py-8'}`}>
        <div className={`mx-auto flex w-full ${useMobileLayout ? 'flex-col gap-4' : 'max-w-[1320px] items-start justify-center gap-7'}`}>

          {/* ── Preview ── */}
          <div
            ref={containerRef}
            className={`flex items-center justify-center ${
              useMobileLayout ? 'h-[46vh]' : 'flex-1 h-[min(78vh,860px)] min-w-0'
            }`}
          >
            <div
              className="relative overflow-hidden rounded-[30px] shadow-[0_14px_30px_rgba(15,23,42,0.14),0_2px_8px_rgba(15,23,42,0.08)]"
              style={{ width: previewSize.w || undefined, height: previewSize.h || undefined }}
            >
              <canvas
                ref={canvasRef}
                className="block"
                style={{ width: previewSize.w || undefined, height: previewSize.h || undefined }}
              />
              {pointsEditable && controlPoints.length > 0 && (
                <div ref={overlayRef} className="absolute inset-0 touch-none">
                  {controlPoints.slice(0, colors.length).map((p, i) => (
                    <button
                      key={`cp-${i}`}
                      onPointerDown={(e) => {
                        draggingIndexRef.current = i;
                        updateControlPoint(i, e.clientX, e.clientY);
                      }}
                      title={`控制点 ${i + 1}`}
                      className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md cursor-grab active:cursor-grabbing -translate-x-1/2 -translate-y-1/2 touch-none"
                      style={{
                        left: `${p.x * 100}%`,
                        top: `${p.y * 100}%`,
                        backgroundColor: colors[i] ?? '#ffffff',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Control Panel ── */}
          <div
            className={`relative isolate overflow-hidden border border-white/75 ${
              useMobileLayout
                ? 'w-full rounded-[24px] bg-white/95 shadow-[0_10px_22px_rgba(15,23,42,0.09),0_2px_6px_rgba(15,23,42,0.06)] max-h-[56vh] overflow-y-auto overscroll-contain'
                : 'w-[320px] shrink-0 rounded-[24px] bg-white/90 backdrop-blur-md shadow-[0_12px_26px_rgba(15,23,42,0.12),0_2px_6px_rgba(15,23,42,0.07)]'
            }`}
          >
            <div className={`p-5 space-y-5 ${useMobileLayout ? '' : 'max-h-[min(78vh,860px)] overflow-y-auto overscroll-contain'}`}>

            {/* Gradient type */}
            <Row label="Gradient">
              <Select value={gradientType} onChange={v => setGradientType(v as GradientType)}>
                {GRADIENT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </Row>

            {/* Warp shape */}
            <Row label="Warp Shape">
              <Select value={warpShape} onChange={v => setWarpShape(v as WarpShape)}>
                {WARP_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </Row>

            {/* Dimensions */}
            <div className="flex items-center gap-4">
              <DimInput label="W" value={exportW} onChange={setExportW} onBlur={v => setExportW(clampDim(v))} />
              <DimInput label="H" value={exportH} onChange={setExportH} onBlur={v => setExportH(clampDim(v))} />
            </div>

            <Divider />

            {/* Sliders */}
            <div className="space-y-3">
              <Slider label="Warp"      value={warp}     onChange={setWarp} />
              <Slider label="Warp Size" value={warpSize} onChange={setWarpSize} />
              <Slider label="Noise"     value={noise}    onChange={setNoise} />
            </div>

            <Divider />

            <Row label="Motion">
              <button
                onClick={() => setMotionEnabled(v => !v)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                  motionEnabled
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {motionEnabled ? 'On' : 'Off'}
              </button>
            </Row>

            <Divider />

            {/* Colors */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-neutral-700">Colors</span>
                <div className="flex items-center gap-1.5">
                  <IconBtn title="从图片导入" onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon size={14} />
                  </IconBtn>
                  <IconBtn title="重置形态" onClick={handleRandomize}>
                    <RefreshCw size={14} />
                  </IconBtn>
                  <IconBtn title="添加颜色" onClick={handleAddColor}>
                    <Plus size={14} />
                  </IconBtn>
                </div>
              </div>

              <div className="space-y-2">
                {colors.map((color, i) => (
                  <div key={i} className="flex items-center gap-2.5 group">
                    <div
                      className="w-5 h-5 rounded-full shrink-0 border border-neutral-200"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm text-neutral-600 font-mono flex-1 tracking-wide">
                      {color.replace('#', '').toUpperCase()}
                    </span>
                    <button
                      onClick={() => handleRemoveColor(i)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-400 hover:text-neutral-700 transition-all"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Divider />

              {/* Download */}
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
              >
                <Download size={14} />
                Download
              </button>

            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImportImage}
        className="hidden"
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-xs px-4 py-2 rounded-full shadow-lg z-50 pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </div>
  );
}

function Select({
  value, onChange, children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-sm border border-neutral-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none text-neutral-700 cursor-pointer"
    >
      {children}
    </select>
  );
}

function DimInput({
  label, value, onChange, onBlur,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onBlur: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-neutral-500">{label}</span>
      <input
        type="number"
        value={value}
        min={100}
        max={4000}
        onChange={e => onChange(Number(e.target.value))}
        onBlur={e => onBlur(Number(e.target.value))}
        className="w-20 text-sm border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-none text-neutral-700"
      />
    </div>
  );
}

function Slider({
  label, value, onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-neutral-500 w-20 shrink-0">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-1 cursor-pointer accent-neutral-900"
      />
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-neutral-100" />;
}

function IconBtn({
  onClick, title, children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-md hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-700"
    >
      {children}
    </button>
  );
}
