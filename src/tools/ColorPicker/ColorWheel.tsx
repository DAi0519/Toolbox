import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — ColorWheel (Playbox Style)
 *
 *    0ms   mount: empty-state dual rings start slow rotation + breathing
 *    0ms   center upload glyph fades in with gentle float
 *   idle   ghost segments around ring breathe subtly (previews future wheel)
 *  hover   nearest ghost segment cluster lights up with cursor angle
 *  image   when colors arrive → center border disappears
 *   50ms   first color segment blooms from innerRadius → outerRadius (spring)
 *  +35ms   each subsequent segment staggers in
 *  hover   segment radius expands +24px (spring), white edge + stronger shadow
 *  click   selected segment pulls +30px outward, white stroke, deepest shadow
 *  reset   button below wheel, no overlap with ring
 * ───────────────────────────────────────────────────────── */

const TIMING = {
  segmentStagger: 0.035,    // seconds between each segment bloom
  bloomDelay:     0.04,     // initial delay before first segment
};

const WHEEL = {
  viewBox:         720,     // SVG coordinate space
  innerRadius:     190,     // inner edge of color ring
  outerRadius:     316,     // resting outer edge
  hoverExpand:     24,      // px expansion on hover
  selectExpand:    30,      // px expansion on select
  imageRadius:     186,     // center image clip radius
  segmentGap:      0.4,     // degrees gap between segments
  orbitRadius:     330,     // empty state dashed ring radius
};

const SPRINGS = {
  bloom:   { type: 'spring' as const, stiffness: 180, damping: 24, mass: 0.9 },
  hover:   { type: 'spring' as const, stiffness: 360, damping: 24, mass: 0.8 }, // snappy + bouncy
  settle:  { type: 'spring' as const, stiffness: 320, damping: 26 },
};

const SEGMENT = {
  dimmedOpacity:      0.22,
  hoverStroke:        'rgba(255,255,255,0.82)',
  hoverStrokeWidth:   2,
  selectedStroke:     '#ffffff',
  selectedStrokeWidth: 3,
  hoverShadow:        'drop-shadow(0 14px 30px rgba(0,0,0,0.20))',
  selectedShadow:     'drop-shadow(0 16px 34px rgba(0,0,0,0.24))',
};

const EMPTY_PREVIEW = {
  segmentCount: 14,
  segmentGap: 1.4,
  innerOffset: 10,
  outerOffset: 8,
  focusExpand: 8,
};

const TREND_COLORS = [
  '#4B5D67', '#C65D7B', '#5F9EA0', '#D96C06', '#8E6E53', '#4E8098',
  '#2F3C7E', '#E76F51', '#7A9E7E', '#6D597A', '#D4A373', '#6B9080',
  '#9C6644', '#577590', '#B56576', '#A4C3B2', '#3D405B', '#81B29A',
];

interface ColorWheelProps {
  colors: string[];
  imageSrc: string | null;
  selectedColor: string | null;
  onUploadClick: () => void;
  onColorSelect: (color: string) => void;
  onReset: () => void;
  isExtracting: boolean;
}

// Playbox upload glyph positioned in SVG coordinates
const BoldUploadIcon = ({ x, y }: { x: number; y: number }) => (
  <g
    transform={`translate(${x - 12} ${y - 12})`}
    fill="none"
    stroke="currentColor"
    strokeWidth="2.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </g>
);

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number, cy: number,
  rInner: number, rOuter: number,
  startDeg: number, endDeg: number,
) {
  const so = polarToCartesian(cx, cy, rOuter, endDeg);
  const eo = polarToCartesian(cx, cy, rOuter, startDeg);
  const si = polarToCartesian(cx, cy, rInner, endDeg);
  const ei = polarToCartesian(cx, cy, rInner, startDeg);
  const large = endDeg - startDeg <= 180 ? '0' : '1';
  return `M ${so.x} ${so.y} A ${rOuter} ${rOuter} 0 ${large} 0 ${eo.x} ${eo.y} L ${ei.x} ${ei.y} A ${rInner} ${rInner} 0 ${large} 1 ${si.x} ${si.y} Z`;
}

function Segment({
  color, index, startAngle, endAngle, isSelected, isDimmed, onSelect,
}: {
  color: string; index: number;
  startAngle: number; endAngle: number;
  isSelected: boolean;
  isDimmed: boolean;
  onSelect: () => void;
}) {
  const cx = WHEEL.viewBox / 2;
  const [isHovered, setIsHovered] = useState(false);

  const targetOuter = isSelected
    ? WHEEL.outerRadius + WHEEL.selectExpand
    : isHovered
      ? WHEEL.outerRadius + WHEEL.hoverExpand
      : WHEEL.outerRadius;

  const outerMv = useMotionValue(WHEEL.innerRadius);
  const outerSpring = useSpring(outerMv, SPRINGS.hover);
  useEffect(() => {
    outerMv.set(targetOuter);
  }, [targetOuter, outerMv]);

  const d = useTransform(outerSpring, (r) =>
    arcPath(cx, cx, WHEEL.innerRadius, r, startAngle, endAngle)
  );

  return (
    <motion.g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
      style={{ cursor: 'pointer' }}
    >
      <motion.path
        d={d}
        fill={color}
        stroke={
          isSelected
            ? SEGMENT.selectedStroke
            : isHovered
              ? SEGMENT.hoverStroke
              : 'transparent'
        }
        strokeWidth={
          isSelected
            ? SEGMENT.selectedStrokeWidth
            : isHovered
              ? SEGMENT.hoverStrokeWidth
              : 0
        }
        style={{
          filter: isSelected
            ? SEGMENT.selectedShadow
            : isHovered
              ? SEGMENT.hoverShadow
              : 'none',
          transformOrigin: `${cx}px ${cx}px`,
        }}
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: isDimmed && !isHovered ? SEGMENT.dimmedOpacity : 1,
        }}
        transition={{
          opacity: {
            ...SPRINGS.bloom,
            delay: isDimmed ? 0 : TIMING.bloomDelay + index * TIMING.segmentStagger,
          },
        }}
      />
    </motion.g>
  );
}

export default function ColorWheel({
  colors, imageSrc, selectedColor,
  onUploadClick, onColorSelect, onReset, isExtracting,
}: ColorWheelProps) {
  const size = WHEEL.viewBox;
  const cx = size / 2;

  const totalSegments = colors.length || 1;
  const anglePerSegment = 360 / totalSegments;

  const hasContent = imageSrc || isExtracting || colors.length > 0;
  const [previewFocus, setPreviewFocus] = useState<number | null>(null);
  const previewAngle = 360 / EMPTY_PREVIEW.segmentCount;
  const previewColors = useMemo(
    () => Array.from(
      { length: EMPTY_PREVIEW.segmentCount },
      (_, i) => TREND_COLORS[(i * 7 + 3) % TREND_COLORS.length],
    ),
    [],
  );

  const handlePreviewMove = (e: ReactMouseEvent<SVGSVGElement>) => {
    if (hasContent) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * size;
    const y = ((e.clientY - rect.top) / rect.height) * size;
    const angle = (Math.atan2(y - cx, x - cx) * 180 / Math.PI + 450) % 360;
    setPreviewFocus(Math.floor(angle / previewAngle));
  };

  return (
    <div className="relative aspect-square w-full h-full flex items-center justify-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full overflow-visible"
        onMouseMove={handlePreviewMove}
        onMouseLeave={() => setPreviewFocus(null)}
      >
        <defs>
          <clipPath id="centerClip">
            <circle cx={cx} cy={cx} r={WHEEL.imageRadius} />
          </clipPath>
        </defs>

        {/* Empty state: Playbox orbit */}
        {!hasContent && (
          <g className="pointer-events-none">
            <motion.circle
              cx={cx} cy={cx} r={WHEEL.orbitRadius}
              fill="none"
              stroke="var(--ink)"
              strokeOpacity="0.2"
              strokeWidth="2"
              strokeDasharray="5 10"
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
              style={{ transformOrigin: `${cx}px ${cx}px` }}
            />
            {/* Lightweight creative variant: preview ghost segments */}
            {Array.from({ length: EMPTY_PREVIEW.segmentCount }).map((_, i) => {
              const start = i * previewAngle;
              const end = start + previewAngle - EMPTY_PREVIEW.segmentGap;
              const focusDistance = previewFocus === null
                ? 99
                : Math.min(
                    Math.abs(i - previewFocus),
                    EMPTY_PREVIEW.segmentCount - Math.abs(i - previewFocus),
                  );
              const colorVisible = previewFocus !== null && focusDistance <= 1; // exactly 3 segments
              const focusBoost = focusDistance === 0 ? EMPTY_PREVIEW.focusExpand : focusDistance === 1 ? 4 : 0;
              const d = arcPath(
                cx,
                cx,
                WHEEL.innerRadius + EMPTY_PREVIEW.innerOffset,
                WHEEL.outerRadius - EMPTY_PREVIEW.outerOffset + focusBoost,
                start,
                end,
              );

              return (
                <motion.path
                  key={`empty-ghost-${i}`}
                  d={d}
                  initial={false}
                  animate={{
                    fill: colorVisible ? previewColors[i] : '#ffffff',
                    stroke: colorVisible ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.16)',
                    opacity: previewFocus === null
                      ? 0.96
                      : focusDistance === 0
                        ? 1
                        : focusDistance === 1
                          ? 0.92
                          : 0.75,
                  }}
                  strokeWidth={1}
                  transition={{
                    d: { type: 'spring', stiffness: 240, damping: 28, mass: 0.85 },
                    fill: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                    stroke: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                    opacity: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.008 },
                  }}
                />
              );
            })}
            <motion.circle
              cx={cx}
              cy={cx}
              r={WHEEL.imageRadius + 18}
              fill="none"
              stroke="var(--ink)"
              strokeOpacity="0.14"
              strokeWidth="1.2"
              strokeDasharray="3 9"
              animate={{ rotate: -360, opacity: [0.16, 0.3, 0.16] }}
              transition={{ rotate: { duration: 80, repeat: Infinity, ease: 'linear' }, opacity: { duration: 4, repeat: Infinity, ease: 'easeInOut' } }}
              style={{ transformOrigin: `${cx}px ${cx}px` }}
            />
            <motion.g
              style={{ color: 'rgba(0,0,0,0.9)' }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: [0.7, 1, 0.7],
                scale: [0.98, 1.02, 0.98],
                y: [2, -1, 2],
              }}
              transition={{
                opacity: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
                scale: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
                y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
              }}
            >
              <BoldUploadIcon x={cx} y={cx} />
            </motion.g>
          </g>
        )}

        {/* Guide rings — only visible when palette is shown */}
        {colors.length > 0 && (
          <motion.circle
            cx={cx} cy={cx} r={WHEEL.outerRadius + WHEEL.selectExpand + 6}
            fill="none" stroke="var(--ink)" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...SPRINGS.settle, delay: 0.4 }}
          />
        )}

        {/* Color segments — bloom entrance */}
        {colors.length > 0 &&
          colors.map((color, i) => {
            const start = i * anglePerSegment;
            const end = start + anglePerSegment - WHEEL.segmentGap;
            const isSelected = selectedColor === color;
            const isDimmed = selectedColor !== null && !isSelected;
            return (
              <Segment
                key={`${color}-${i}`}
                color={color}
                index={i}
                startAngle={start}
                endAngle={end}
                isSelected={isSelected}
                isDimmed={isDimmed}
                onSelect={() => onColorSelect(color)}
              />
            );
          })}

        {/* Center circle */}
        {!hasContent ? (
          <motion.circle
            cx={cx}
            cy={cx}
            r={WHEEL.imageRadius}
            fill="transparent"
            stroke="rgba(0,0,0,0.26)"
            strokeWidth="2"
            className="cursor-pointer"
            onClick={onUploadClick}
            animate={{ strokeOpacity: [0.45, 0.78, 0.45] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          <circle
            cx={cx}
            cy={cx}
            r={WHEEL.imageRadius}
            fill="transparent"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="1.5"
            className="cursor-pointer transition-colors hover:stroke-[rgba(0,0,0,0.3)]"
            onClick={imageSrc ? undefined : onUploadClick}
          />
        )}

        {/* Extracting state */}
        {isExtracting && (
          <g className="pointer-events-none">
            <motion.circle
              cx={cx} cy={cx} r={WHEEL.imageRadius + 6}
              fill="none"
              stroke="rgba(0,0,0,0.9)"
              strokeWidth="2.5"
              strokeDasharray="16 32"
              strokeLinecap="round"
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              style={{ transformOrigin: `${cx}px ${cx}px` }}
            />
            <foreignObject x={cx - 50} y={cx - 12} width={100} height={24}>
              <p className="text-[12px] font-extrabold text-black tracking-widest text-center">
                提取中...
              </p>
            </foreignObject>
          </g>
        )}

        {/* Center Image with Hover Reset */}
        {imageSrc && (
          <CenterImage 
            src={imageSrc} 
            cx={cx} 
            cy={cx} 
            radius={WHEEL.imageRadius} 
            onReset={onReset} 
          />
        )}
      </svg>
    </div>
  );
}

function CenterImage({ src, cx, cy, radius, onReset }: { src: string, cx: number, cy: number, radius: number, onReset: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onReset}
      style={{ cursor: 'pointer' }}
    >
      <motion.image
        href={src}
        x={cx - radius}
        y={cy - radius}
        width={radius * 2}
        height={radius * 2}
        clipPath="url(#centerClip)"
        preserveAspectRatio="xMidYMid slice"
        animate={{ opacity: isHovered ? 0.2 : 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.circle
        cx={cx} cy={cy} r={radius}
        fill="var(--bg)"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 0.7 : 0 }}
        transition={{ duration: 0.3 }}
      />
      <motion.g
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: isHovered ? 1 : 0,
          scale: isHovered ? 1 : 0.8,
          rotate: isHovered ? 0 : -90
        }}
        transition={SPRINGS.settle}
        style={{ transformOrigin: `${cx}px ${cy}px`, color: 'var(--ink)' }}
      >
        <svg x={cx - 20} y={cy - 20} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </motion.g>
    </motion.g>
  );
}
