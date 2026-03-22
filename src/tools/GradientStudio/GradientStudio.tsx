import { useState, useRef, useEffect, useCallback } from 'react';
import { Download, RefreshCw, Plus, ImageIcon, X } from 'lucide-react';
import ToolHeader from '../../components/ToolHeader';
import { useViewport } from '../../hooks/useViewport';
import {
  renderGradient,
  generateControlPoints,
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

const ASPECT_PRESETS = [
  { label: '1:1', width: 1, height: 1 },
  { label: '3:4', width: 3, height: 4 },
  { label: '4:3', width: 4, height: 3 },
  { label: '16:9', width: 16, height: 9 },
] as const;

export default function GradientStudio() {
  const { viewportWidth, viewportHeight } = useViewport();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draggingIndexRef = useRef<number | null>(null);

  const [gradientType, setGradientType] = useState<GradientType>('soft-bezier');
  const [warpShape, setWarpShape] = useState<WarpShape>('smooth-noise');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 99999));
  const [colors, setColors] = useState<string[]>(() => randomPalette(DEFAULT_COLOR_COUNT));
  const [exportW, setExportW] = useState(900);
  const [exportH, setExportH] = useState(1200);
  const [selectedAspect, setSelectedAspect] = useState<(typeof ASPECT_PRESETS)[number]['label']>('3:4');
  const [warp, setWarp] = useState(27);
  const [warpSize, setWarpSize] = useState(33);
  const [noise, setNoise] = useState(53);
  const [controlPoints, setControlPoints] = useState<ControlPoint[]>(() => generateControlPoints(DEFAULT_COLOR_COUNT, seed));
  const [previewSize, setPreviewSize] = useState({ w: 0, h: 0 });
  const [toast, setToast] = useState<string | null>(null);
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
        time: 0,
      },
      pw, ph,
    );
  }, [gradientType, warpShape, warp, warpSize, noise, colors, controlPoints, seed, exportW, exportH]);

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
        time: 0,
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
  const applyAspectPreset = (presetLabel: (typeof ASPECT_PRESETS)[number]['label']) => {
    const preset = ASPECT_PRESETS.find((item) => item.label === presetLabel);
    if (!preset) return;

    const { width: presetWidth, height: presetHeight } = preset;
    const longEdge = Math.max(exportW, exportH);
    const nextWidth = presetWidth >= presetHeight
      ? longEdge
      : Math.round((longEdge * presetWidth) / presetHeight);
    const nextHeight = presetWidth >= presetHeight
      ? Math.round((longEdge * presetHeight) / presetWidth)
      : longEdge;

    setSelectedAspect(presetLabel);
    setExportW(clampDim(nextWidth));
    setExportH(clampDim(nextHeight));
  };

  useEffect(() => {
    const matched = ASPECT_PRESETS.find((preset) => exportW * preset.height === exportH * preset.width);
    if (matched && matched.label !== selectedAspect) {
      setSelectedAspect(matched.label);
    }
  }, [exportH, exportW, selectedAspect]);

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

      <div className={`flex flex-1 min-h-0 ${useMobileLayout ? 'overflow-y-auto' : 'overflow-hidden'} ${useMobileLayout ? 'px-3 py-4' : 'px-8 py-8'}`}>
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
                ? 'w-full rounded-[24px] bg-white/92 shadow-[0_12px_28px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.05)] max-h-[56vh] overflow-y-auto overscroll-contain'
                : 'w-[320px] shrink-0 rounded-[24px] bg-white/88 backdrop-blur-md shadow-[0_14px_30px_rgba(15,23,42,0.10),0_2px_6px_rgba(15,23,42,0.06)]'
            }`}
          >
            <div className={`p-4 space-y-4 ${useMobileLayout ? '' : 'max-h-[min(78vh,860px)] overflow-y-auto overscroll-contain'}`}>
              <div className="space-y-3 rounded-[20px] bg-neutral-50/80 p-3.5">
                <Row label="Gradient">
                  <Select value={gradientType} onChange={v => setGradientType(v as GradientType)}>
                    {GRADIENT_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Select>
                </Row>

                <Row label="Warp Shape">
                  <Select value={warpShape} onChange={v => setWarpShape(v as WarpShape)}>
                    {WARP_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Select>
                </Row>

              </div>

              <div className="space-y-3 rounded-[20px] bg-neutral-50/80 p-3.5">
                <Row label="Canvas">
                  <Select value={selectedAspect} onChange={(value) => applyAspectPreset(value as (typeof ASPECT_PRESETS)[number]['label'])}>
                    {ASPECT_PRESETS.map((preset) => (
                      <option key={preset.label} value={preset.label}>
                        {preset.label}
                      </option>
                    ))}
                  </Select>
                </Row>

                <div className="ml-auto grid w-[156px] grid-cols-1 gap-2.5 sm:w-full sm:grid-cols-2">
                  <DimInput label="W" value={exportW} onChange={setExportW} onBlur={v => setExportW(clampDim(v))} />
                  <DimInput label="H" value={exportH} onChange={setExportH} onBlur={v => setExportH(clampDim(v))} />
                </div>
              </div>

              <div className="space-y-3">
                <Slider label="Warp" value={warp} onChange={setWarp} />
                <Slider label="Warp Size" value={warpSize} onChange={setWarpSize} />
                <Slider label="Noise" value={noise} onChange={setNoise} />
              </div>

              <div className="space-y-3 rounded-[20px] bg-neutral-50/80 p-3.5">
                <div className="flex items-center justify-between">
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
                    <div key={i} className="flex items-center gap-2.5 rounded-[14px] bg-white/92 px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                      <div
                        className="h-5 w-5 shrink-0 rounded-full border border-neutral-200"
                        style={{ backgroundColor: color }}
                      />
                      <span className="flex-1 font-mono text-sm tracking-wide text-neutral-600">
                        {color.replace('#', '').toUpperCase()}
                      </span>
                      <button
                        onClick={() => handleRemoveColor(i)}
                        className="rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-neutral-900 py-3 text-sm font-medium text-white shadow-[0_10px_22px_rgba(15,23,42,0.16)] transition-colors hover:bg-neutral-800"
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
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-neutral-600">{label}</span>
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
      className="w-[156px] min-w-[156px] cursor-pointer rounded-[14px] bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none ring-1 ring-neutral-200/80"
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
    <div className="flex items-center gap-2 rounded-[16px] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-neutral-200/80">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{label}</span>
      <input
        type="number"
        value={value}
        min={100}
        max={4000}
        onChange={e => onChange(Number(e.target.value))}
        onBlur={e => onBlur(Number(e.target.value))}
        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-neutral-700 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
    <div className="rounded-[16px] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-neutral-200/80">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-neutral-600">{label}</span>
        <span className="text-xs font-semibold text-neutral-400">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer accent-neutral-900"
      />
    </div>
  );
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
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-neutral-200/80 transition-colors hover:bg-neutral-900 hover:text-white"
    >
      {children}
    </button>
  );
}
