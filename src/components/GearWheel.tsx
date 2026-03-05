import { useEffect, useRef, type WheelEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  useMotionValue,
  useSpring,
  animate,
  useTransform,
  MotionValue,
  type PanInfo,
} from 'framer-motion';
import { TOOLS } from '../config/tools';
import { useViewport } from '../hooks/useViewport';

const WHEEL_ROTATION_KEY = 'gearWheelRotation.v2';
const DEFAULT_FOCUS_TOOL_ID = 'batch-renamer';

// Triple-repeat for seamless infinite rotation feel visually
const REPEATED_TOOLS = [...TOOLS, ...TOOLS, ...TOOLS].map((tool, i) => ({
  ...tool,
  uniqueId: `${tool.id}-${i}`
}));

const ITEM_COUNT = REPEATED_TOOLS.length; 
const ANGLE_STEP = 360 / ITEM_COUNT; // 10°

function getDefaultRotation(): number {
  const defaultIndex = TOOLS.findIndex((tool) => tool.id === DEFAULT_FOCUS_TOOL_ID);
  if (defaultIndex < 0) return 0;
  return -(defaultIndex * ANGLE_STEP);
}

function getInitialRotation(): number {
  const storedRotation = sessionStorage.getItem(WHEEL_ROTATION_KEY);
  if (!storedRotation) return getDefaultRotation();

  const parsed = Number(storedRotation);
  return Number.isFinite(parsed) ? parsed : getDefaultRotation();
}

// ──── Physics ────
// Tunable by default (Interface Craft Principle)
const DESKTOP_PHYSICS = {
  // Wheel spring feel (heavier, stiffer, more damped)
  // Reduced damping and mass to make the wheel feel lighter overall
  stiffness: 80,
  damping: 30, // Previously 45
  mass: 1.5, // Previously 3
  
  // Drag handling
  panMultiplier: 0.1,
  
  // Drag inertia (Friction after releasing drag)
  inertiaMultiplier: 0.1,
  inertiaVelocity: 0.1,
  inertiaTimeConstant: 300,
  
  // Trackpad / Mouse Wheel Scroll
  // Increased multiplier to reduce the "physical effort" needed to scroll
  wheelMultiplier: 0.08, // Previously 0.035
  snapStiffness: 120,
  snapDamping: 35,
};

const MOBILE_PHYSICS = {
  stiffness: 75,
  damping: 28,
  mass: 1.2,
  panMultiplier: 0.075,
  inertiaMultiplier: 0.07,
  inertiaVelocity: 0.07,
  inertiaTimeConstant: 260,
  wheelMultiplier: 0.05,
  snapStiffness: 105,
  snapDamping: 32,
};

const DIST_STOPS = [0, 10, 20, 30, 45];

export default function GearWheel() {
  const { isMobile, viewportWidth } = useViewport();
  const navigate = useNavigate();
  const wheelSnapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const physics = isMobile ? MOBILE_PHYSICS : DESKTOP_PHYSICS;
  const radius = isMobile ? 430 : 600;
  const focusX = isMobile
    ? Math.max(38, Math.min(72, viewportWidth * 0.13))
    : viewportWidth * 0.15;
  const indicatorSize = isMobile ? 14 : 20;
  const indicatorGlow = isMobile ? '0 0 12px rgba(37,99,255,0.38)' : '0 0 16px rgba(37,99,255,0.4)';
  const labelOffset = isMobile ? 36 : 52;
  const labelFontSizes = isMobile ? [38, 30, 23, 17, 13] : [64, 48, 32, 22, 16];
  const labelLetterSpacing = isMobile ? '-0.8px' : '-1.5px';
  const pointerRange = isMobile ? 58 : 50;
  const labelMaxWidth = isMobile ? '68vw' : 'none';
  const buttonPadding = isMobile ? '8px 12px' : '6px 4px';
  
  // Restore prior focus in this version; otherwise default to Batch Renamer.
  const initialRotation = getInitialRotation();
  const rotation = useMotionValue(initialRotation);

  useEffect(() => {
    return () => {
      if (wheelSnapTimeoutRef.current) {
        clearTimeout(wheelSnapTimeoutRef.current);
      }
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
      }
    };
  }, []);
  
  const smoothRotation = useSpring(rotation, {
    stiffness: physics.stiffness,
    damping: physics.damping,
    mass: physics.mass,
  });

  // ─── Drag Interaction ───
  const handlePan = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    rotation.set(rotation.get() + info.delta.y * physics.panMultiplier);
  };

  const handlePanEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const v = info.velocity.y;
    animate(rotation, rotation.get() + v * physics.inertiaMultiplier, {
      type: 'inertia',
      velocity: v * physics.inertiaVelocity,
      timeConstant: physics.inertiaTimeConstant,
      modifyTarget: (t) => Math.round(t / ANGLE_STEP) * ANGLE_STEP,
    });
  };

  // ─── Scroll Interaction ───
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    rotation.set(rotation.get() - e.deltaY * physics.wheelMultiplier);

    if (wheelSnapTimeoutRef.current) {
      clearTimeout(wheelSnapTimeoutRef.current);
    }
    wheelSnapTimeoutRef.current = setTimeout(() => {
      const cur = rotation.get();
      animate(rotation, Math.round(cur / ANGLE_STEP) * ANGLE_STEP, {
        type: 'spring',
        stiffness: physics.snapStiffness,
        damping: physics.snapDamping,
      });
    }, 120);
  };

  // ─── Routing Action ───
  const handleSelectTool = (routeId: string, index: number) => {
    const slotAngle = index * ANGLE_STEP;
    const currentRot = rotation.get();
    
    // Calculate the shortest rotation difference to bring the item to focus (0 degrees dist)
    let diff = (-slotAngle - currentRot) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    const targetRotation = currentRot + diff;
    sessionStorage.setItem(WHEEL_ROTATION_KEY, targetRotation.toString());
    
    if (Math.abs(diff) < 0.5) {
      // If it's essentially already at the exact focus point, jump immediately
      rotation.set(targetRotation);
      navigate(`/tool/${routeId}`);
    } else {
      // Animate strictly to the absolute focus position, but faster
      animate(rotation, targetRotation, {
        type: 'spring',
        stiffness: physics.snapStiffness * 1.5, // Accelerate the snap
        damping: physics.snapDamping * 1.2, // Keep it from oscillating too wildly
        restDelta: 0.01, // Insist on a visually strict full stop
        onComplete: () => {
          rotation.set(targetRotation); // Lock to absolute mathematical center
          
          // Introduce a deliberate pause after it rigidly locks into place
          if (navigateTimeoutRef.current) {
            clearTimeout(navigateTimeoutRef.current);
          }
          navigateTimeoutRef.current = setTimeout(() => {
            navigate(`/tool/${routeId}`);
          }, 150); // 150ms of perfect stillness before transition
        }
      });
    }
  };

  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        touchAction: 'none',
        userSelect: 'none',
        cursor: isMobile ? 'default' : 'grab',
      }}
      onPan={handlePan}
      onPanEnd={handlePanEnd}
      onWheel={handleWheel}
      whileTap={isMobile ? undefined : { cursor: 'grabbing' }}
    >

      {/* ─── The Wheel ─── */}
      <motion.div
        style={{
          position: 'absolute',
          left: focusX - radius,
          top: '50%',
          width: 0,
          height: 0,
          rotate: smoothRotation,
        }}
      >
        {REPEATED_TOOLS.map((tool, index) => (
          <ArcItem
            key={tool.uniqueId}
            tool={tool}
            index={index}
            smoothRotation={smoothRotation}
            radius={radius}
            labelOffset={labelOffset}
            labelFontSizes={labelFontSizes}
            labelLetterSpacing={labelLetterSpacing}
            pointerRange={pointerRange}
            labelMaxWidth={labelMaxWidth}
            buttonPadding={buttonPadding}
            onSelect={handleSelectTool}
          />
        ))}
      </motion.div>

      {/* ─── Focal Indicator (Blue Dot) ─── */}
      <div
        style={{
          position: 'absolute',
          left: focusX,
          top: '50%',
          width: indicatorSize,
          height: indicatorSize,
          marginTop: -indicatorSize / 2,
          borderRadius: '50%',
          background: 'var(--accent)',
          zIndex: 50,
          pointerEvents: 'none',
          boxShadow: indicatorGlow,
        }}
      />
    </motion.div>
  );
}

// ──────────────────────────────────────
// ArcItem — a single label on the wheel
// ──────────────────────────────────────
function ArcItem({
  tool,
  index,
  smoothRotation,
  radius,
  labelOffset,
  labelFontSizes,
  labelLetterSpacing,
  pointerRange,
  labelMaxWidth,
  buttonPadding,
  onSelect,
}: {
  tool: { id: string; name: string };
  index: number;
  smoothRotation: MotionValue<number>;
  radius: number;
  labelOffset: number;
  labelFontSizes: number[];
  labelLetterSpacing: string;
  pointerRange: number;
  labelMaxWidth: string;
  buttonPadding: string;
  onSelect: (id: string, index: number) => void;
}) {
  const slotAngle = index * ANGLE_STEP; // static angle for this slot

  // How far is this item from the focal center (the left-most point = 0°)?
  const dist = useTransform(smoothRotation, (r) => {
    let a = (r + slotAngle) % 360;
    if (a > 180) a -= 360;
    if (a < -180) a += 360;
    return Math.abs(a);
  });

  // ─── Depth-of-field mapping ───
  const fontSize = useTransform(dist, DIST_STOPS, labelFontSizes);
  const opacity  = useTransform(dist, DIST_STOPS, [1, 0.7, 0.4, 0.1, 0.0]);
  const blur     = useTransform(dist, DIST_STOPS, [0, 0, 1.5, 4, 8]);
  const filter   = useTransform(blur, (b) => `blur(${b}px)`);
  
  // Highlight the active item (distance close to 0) with Klein Blue
  const color    = useTransform(dist, [0, 5], ['#002FA7', '#000000']);

  // Relax pointerEvents to allow clicking unfocused items (up to 50 deg away, covers all visible items)
  const pointerEvents = useTransform(dist, (d) => (d < pointerRange ? 'auto' : 'none'));

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `rotate(${slotAngle}deg) translateX(${radius}px)`,
        transformOrigin: '0 0',
      }}
    >
      <motion.button
        onClick={() => onSelect(tool.id, index)}
        style={{
          position: 'absolute',
          left: labelOffset,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color, // Dynamic color replaces static 'var(--ink)'
          fontWeight: 800,
          letterSpacing: labelLetterSpacing,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: labelMaxWidth,
          textTransform: 'uppercase',
          cursor: 'pointer',
          textAlign: 'left',
          padding: buttonPadding,
          borderRadius: 10,
          fontSize,
          opacity,
          filter,
          pointerEvents,
          transformOrigin: 'left center', // Grow outward from the left edge
        }}
        transition={{ duration: 0.12 }}
      >
        {tool.name}
      </motion.button>
    </div>
  );
}
