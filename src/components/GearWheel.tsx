import { useNavigate } from 'react-router-dom';
import {
  motion,
  useMotionValue,
  useSpring,
  animate,
  useTransform,
  MotionValue,
} from 'framer-motion';
import { TOOLS } from '../config/tools';

// Triple-repeat for seamless infinite rotation feel visually
const REPEATED_TOOLS = [...TOOLS, ...TOOLS, ...TOOLS].map((tool, i) => ({
  ...tool,
  uniqueId: `${tool.id}-${i}`
}));

// ──── Geometry ────
// The center of the circle is placed far to the LEFT.
// We only see the right hemisphere edge, bulging into the screen from the left.
const RADIUS = 600;
const ITEM_COUNT = REPEATED_TOOLS.length; 
const ANGLE_STEP = 360 / ITEM_COUNT; // 10°

// ──── Physics ────
// Tunable by default (Interface Craft Principle)
const PHYSICS = {
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

export default function GearWheel() {
  const navigate = useNavigate();
  
  // Restore the wheel's focus rotation if returning from a tool page
  const initialRotation = Number(sessionStorage.getItem('gearWheelRotation') || '0');
  const rotation = useMotionValue(initialRotation);
  
  const smoothRotation = useSpring(rotation, {
    stiffness: PHYSICS.stiffness,
    damping: PHYSICS.damping,
    mass: PHYSICS.mass,
  });

  // ─── Drag Interaction ───
  const handlePan = (_e: any, info: any) => {
    rotation.set(rotation.get() + info.delta.y * PHYSICS.panMultiplier);
  };

  const handlePanEnd = (_e: any, info: any) => {
    const v = info.velocity.y;
    animate(rotation, rotation.get() + v * PHYSICS.inertiaMultiplier, {
      type: 'inertia',
      velocity: v * PHYSICS.inertiaVelocity,
      timeConstant: PHYSICS.inertiaTimeConstant,
      modifyTarget: (t) => Math.round(t / ANGLE_STEP) * ANGLE_STEP,
    });
  };

  // ─── Scroll Interaction ───
  const handleWheel = (e: React.WheelEvent) => {
    rotation.set(rotation.get() - e.deltaY * PHYSICS.wheelMultiplier);

    clearTimeout((window as any).__wheelSnap);
    (window as any).__wheelSnap = setTimeout(() => {
      const cur = rotation.get();
      animate(rotation, Math.round(cur / ANGLE_STEP) * ANGLE_STEP, {
        type: 'spring',
        stiffness: PHYSICS.snapStiffness,
        damping: PHYSICS.snapDamping,
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
    sessionStorage.setItem('gearWheelRotation', targetRotation.toString());
    
    if (Math.abs(diff) < 0.5) {
      // If it's essentially already at the exact focus point, jump immediately
      rotation.set(targetRotation);
      navigate(`/tool/${routeId}`);
    } else {
      // Animate strictly to the absolute focus position, but faster
      animate(rotation, targetRotation, {
        type: 'spring',
        stiffness: PHYSICS.snapStiffness * 1.5, // Accelerate the snap
        damping: PHYSICS.snapDamping * 1.2, // Keep it from oscillating too wildly
        restDelta: 0.01, // Insist on a visually strict full stop
        onComplete: () => {
          rotation.set(targetRotation); // Lock to absolute mathematical center
          
          // Introduce a deliberate pause after it rigidly locks into place
          setTimeout(() => {
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
        cursor: 'grab',
      }}
      onPan={handlePan}
      onPanEnd={handlePanEnd}
      onWheel={handleWheel}
      whileTap={{ cursor: 'grabbing' }}
    >

      {/* ─── The Wheel ─── */}
      <motion.div
        style={{
          position: 'absolute',
          left: `calc(15vw - ${RADIUS}px)`,
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
            onSelect={handleSelectTool}
          />
        ))}
      </motion.div>

      {/* ─── Focal Indicator (Blue Dot) ─── */}
      <div
        style={{
          position: 'absolute',
          left: '15vw', // Right on the circumference edge
          top: '50%',
          width: 20,
          height: 20,
          marginTop: -10,
          borderRadius: '50%',
          background: 'var(--accent)',
          zIndex: 50,
          pointerEvents: 'none',
          boxShadow: '0 0 16px rgba(37,99,255,0.4)',
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
  onSelect,
}: {
  tool: { id: string; name: string };
  index: number;
  smoothRotation: MotionValue<number>;
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
  const fontSize = useTransform(dist, [0, 10, 20, 30, 45], [64, 48, 32, 22, 16]);
  const opacity  = useTransform(dist, [0, 10, 20, 30, 45], [1, 0.7, 0.4, 0.1, 0.0]);
  const blur     = useTransform(dist, [0, 10, 20, 30, 45], [0, 0, 1.5, 4, 8]);
  const filter   = useTransform(blur, (b) => `blur(${b}px)`);
  
  // Highlight the active item (distance close to 0) with Klein Blue
  const color    = useTransform(dist, [0, 5], ['#002FA7', '#000000']);

  // Relax pointerEvents to allow clicking unfocused items (up to 50 deg away, covers all visible items)
  const pointerEvents = useTransform(dist, (d) => (d < 50 ? 'auto' : 'none'));

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `rotate(${slotAngle}deg) translateX(${RADIUS}px)`,
        transformOrigin: '0 0',
      }}
    >
      <motion.button
        onClick={() => onSelect(tool.id, index)}
        style={{
          position: 'absolute',
          left: 52, // Increased from 40 to slightly widen the gap with the blue dot
          top: '50%',
          translateY: '-50%',
          background: 'none',
          border: 'none',
          color, // Dynamic color replaces static 'var(--ink)'
          fontWeight: 800,
          letterSpacing: '-1.5px',
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          cursor: 'pointer',
          textAlign: 'left',
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
