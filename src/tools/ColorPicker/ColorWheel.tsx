import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';

interface ColorWheelProps {
  colors: string[];
  imageSrc: string | null;
  onUploadClick: () => void;
  onColorSelect: (color: string) => void;
  onReset: () => void;
  isExtracting: boolean;
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const startOuter = polarToCartesian(x, y, outerRadius, endAngle);
  const endOuter = polarToCartesian(x, y, outerRadius, startAngle);
  const startInner = polarToCartesian(x, y, innerRadius, endAngle);
  const endInner = polarToCartesian(x, y, innerRadius, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M',
    startOuter.x,
    startOuter.y,
    'A',
    outerRadius,
    outerRadius,
    0,
    largeArcFlag,
    0,
    endOuter.x,
    endOuter.y,
    'L',
    endInner.x,
    endInner.y,
    'A',
    innerRadius,
    innerRadius,
    0,
    largeArcFlag,
    1,
    startInner.x,
    startInner.y,
    'Z',
  ].join(' ');
}

export default function ColorWheel({
  colors,
  imageSrc,
  onUploadClick,
  onColorSelect,
  onReset,
  isExtracting,
}: ColorWheelProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const size = 720;
  const center = size / 2;
  const innerRadius = 192;
  const outerRadiusBase = 344;
  const imageRadius = 190;

  const totalSegments = colors.length || 1;
  const anglePerSegment = 360 / totalSegments;

  return (
    <div className="relative flex items-center justify-center w-[720px] h-[720px]">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 z-10 drop-shadow-lg"
      >
        {/* Background Guide Rings */}
        <circle
          cx={center}
          cy={center}
          r={345}
          fill="none"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="1.5"
        />
        <circle
          cx={center}
          cy={center}
          r={352}
          fill="none"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
        <circle
          cx={center}
          cy={center}
          r={358}
          fill="none"
          stroke="rgba(0,0,0,0.22)"
          strokeWidth="0.5"
          strokeDasharray="2 8"
        />

        {/* Color Segments */}
        {colors.length > 0 &&
          colors.map((color, i) => {
            const startAngle = i * anglePerSegment;
            // Add a tiny gap between segments
            const endAngle = startAngle + anglePerSegment - 0.5;
            const isHovered = hoveredIndex === i;
            const currentOuterRadius = isHovered ? outerRadiusBase + 8 : outerRadiusBase;

            const pathData = describeArc(
              center,
              center,
              innerRadius,
              currentOuterRadius,
              startAngle,
              endAngle
            );

            return (
              <motion.path
                key={i}
                d={pathData}
                fill={color}
                stroke="rgba(0,0,0,0.45)"
                strokeWidth={isHovered ? 2 : 1}
                className="cursor-pointer transition-all duration-200 ease-out"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onColorSelect(color)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: i * 0.03 }}
              />
            );
          })}

        {/* Center Image Mask */}
        <clipPath id="centerClip">
          <circle cx={center} cy={center} r={imageRadius} />
        </clipPath>

        <circle
          cx={center}
          cy={center}
          r={imageRadius}
          fill="rgba(0,0,0,0.025)"
          className="transition-colors hover:fill-black/5 cursor-pointer"
          onClick={imageSrc ? undefined : onUploadClick}
        />

        {/* Upload Placeholder inside the circle */}
        {!imageSrc && !isExtracting && (
          <g className="pointer-events-none text-center">
            <text
              x={center}
              y={center - 10}
              textAnchor="middle"
              fill="#888888"
              fontSize="14"
              letterSpacing="0.1em"
              className="font-serif uppercase"
            >
              Upload Image
            </text>
            <text
              x={center}
              y={center + 15}
              textAnchor="middle"
              fill="#BBBBBB"
              fontSize="12"
              className="font-serif"
            >
              or paste from clipboard
            </text>
          </g>
        )}

        {isExtracting && (
          <text
            x={center}
            y={center}
            textAnchor="middle"
            fill="#888888"
            fontSize="14"
            className="font-serif uppercase animate-pulse"
          >
            Extracting Palette...
          </text>
        )}

        {/* The actual Image */}
        {imageSrc && (
          <image
            href={imageSrc}
            x={center - imageRadius}
            y={center - imageRadius}
            width={imageRadius * 2}
            height={imageRadius * 2}
            clipPath="url(#centerClip)"
            preserveAspectRatio="xMidYMid slice"
            className="pointer-events-none"
          />
        )}
      </svg>

      {/* Action Buttons overlay */}
      {imageSrc && (
        <button
          onClick={onReset}
          className="absolute z-20 w-10 h-10 bg-black/50 hover:bg-black/70 transition-colors rounded-full flex items-center justify-center text-white"
          style={{ bottom: 200, right: 200 }}
          title="Clear Image"
        >
          <Upload size={18} />
        </button>
      )}
    </div>
  );
}
