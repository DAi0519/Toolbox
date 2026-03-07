import { memo, useCallback, useEffect, useRef, type WheelEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  useMotionValue,
  useSpring,
  animate,
  useTransform,
  useMotionTemplate,
  useMotionValueEvent,
  MotionValue,
  type PanInfo,
} from 'framer-motion';
import { TOOLS } from '../config/tools';
import { useViewport } from '../hooks/useViewport';

const WHEEL_ROTATION_KEY = 'gearWheelRotation.v2';
const DEFAULT_FOCUS_TOOL_ID = 'batch-renamer';
const WHEEL_SNAP_DELAY_MS = 120;
const NAVIGATE_DELAY_MS = 150;
const ROTATION_LOCK_EPSILON = 0.5;
const INSTANT_SNAP_VELOCITY_THRESHOLD = 0.02;
const MOBILE_VISIBLE_DISTANCE_CUTOFF = 42;
const DESKTOP_VISIBLE_DISTANCE_CUTOFF = 47;
const MOBILE_POINTER_RANGE = 52;
const DESKTOP_POINTER_RANGE = 50;

// Triple-repeat for seamless infinite rotation feel visually
const REPEATED_TOOLS = [...TOOLS, ...TOOLS, ...TOOLS].map((tool, i) => ({
  ...tool,
  uniqueId: `${tool.id}-${i}`
}));

const ITEM_COUNT = REPEATED_TOOLS.length; 
const ANGLE_STEP = 360 / ITEM_COUNT; // 10°

interface GearPhysics {
  stiffness: number;
  damping: number;
  mass: number;
  panMultiplier: number;
  inertiaMultiplier: number;
  inertiaVelocity: number;
  inertiaTimeConstant: number;
  wheelMultiplier: number;
  snapStiffness: number;
  snapDamping: number;
  magneticThreshold: number;
  magneticStrength: number;
}

function getDefaultRotation(): number {
  const defaultIndex = TOOLS.findIndex((tool) => tool.id === DEFAULT_FOCUS_TOOL_ID);
  if (defaultIndex < 0) return 0;
  return -(defaultIndex * ANGLE_STEP);
}

function readStoredRotation(): number | null {
  if (typeof window === 'undefined') return null;

  let storedRotation: string | null = null;
  try {
    storedRotation = sessionStorage.getItem(WHEEL_ROTATION_KEY);
  } catch {
    return null;
  }

  if (!storedRotation) return getDefaultRotation();

  const parsed = Number(storedRotation);
  return Number.isFinite(parsed) ? parsed : null;
}

function getInitialRotation(): number {
  return readStoredRotation() ?? getDefaultRotation();
}

function persistRotation(value: number) {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(WHEEL_ROTATION_KEY, value.toString());
  } catch {
    // Ignore persistence failures and keep runtime interaction responsive.
  }
}

// ──── Physics ────
// Tunable by default (Interface Craft Principle)
const DESKTOP_PHYSICS: GearPhysics = {
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
  magneticThreshold: 0,
  magneticStrength: 0,
};

const MOBILE_PHYSICS: GearPhysics = {
  stiffness: 88,
  damping: 34,
  mass: 1.05,
  panMultiplier: 0.068,
  inertiaMultiplier: 0.038,
  inertiaVelocity: 0.048,
  inertiaTimeConstant: 210,
  wheelMultiplier: 0.04,
  snapStiffness: 150,
  snapDamping: 38,
  magneticThreshold: ANGLE_STEP * 0.34,
  magneticStrength: 0.44,
};

// Module-level constants so ArcItem memo comparisons always see stable references.
// Previously these were recreated as inline arrays on every GearWheel render,
// which made React.memo treat them as changed and re-render all 42 items — even
// when isMobile hadn't changed (e.g. visualViewport scroll from soft keyboard).
const MOBILE_FONT_SIZES = [38, 30, 23, 17, 13];
const DESKTOP_FONT_SIZES = [64, 48, 32, 22, 16];
const DIST_STOPS = [0, 10, 20, 30, 45];
const MOBILE_OPACITY_STOPS = [1, 0.7, 0.4, 0.1, 0];
const DESKTOP_OPACITY_STOPS = [1, 0.82, 0.34, 0.05, 0];
const ACTIVE_COLOR_DISTANCE = [0, 5];
const ACTIVE_COLOR_STOPS = ['#002FA7', '#000000'];
const MOBILE_LABEL_BASE_SIZE = MOBILE_FONT_SIZES[0];
const MOBILE_SCALE_STOPS = MOBILE_FONT_SIZES.map((size) => size / MOBILE_LABEL_BASE_SIZE);
const DESKTOP_BLUR_STOPS = [0, 0, 0.7, 2.6, 6.25];

function normalizeAngle(value: number): number {
  let normalized = value % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized <= -180) normalized += 360;
  return normalized;
}

function getNearestSnapRotation(value: number): number {
  return Math.round(value / ANGLE_STEP) * ANGLE_STEP;
}

function getFocusDistance(rotationValue: number, slotAngle: number): number {
  return Math.abs(normalizeAngle(rotationValue + slotAngle));
}

function getSnapDelta(value: number): number {
  return getNearestSnapRotation(value) - value;
}

function getSelectionTargetRotation(currentRotation: number, slotAngle: number): number {
  return currentRotation + normalizeAngle(-slotAngle - currentRotation);
}

function applyMagneticDelta(
  rotation: MotionValue<number>,
  delta: number,
  threshold: number,
  strength: number,
) {
  const rawNext = rotation.get() + delta;
  const snapDelta = getSnapDelta(rawNext);
  const distance = Math.abs(snapDelta);

  if (distance >= threshold) {
    rotation.set(rawNext);
    return;
  }

  const pullProgress = 1 - distance / threshold;
  const magneticPull = snapDelta * pullProgress * pullProgress * strength;
  rotation.set(rawNext + magneticPull);
}

// ──── Haptics ────
// Provides per-item tick feedback and snap-landing pulse tuned for mobile.
//
// Strategy:
//   Try vibration whenever the browser exposes it.
//   Keep Web Audio unlocked as well so desktop browsers, unsupported
//   vibration environments, and mixed sound+haptic feedback all work.
//
// Tick rate is capped at 25/sec so a fast fling never becomes a buzz.
function useGearHaptics(enabled: boolean, isMobile: boolean) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastTickMsRef = useRef(0);
  const lastFocusedIndexRef = useRef<number | null>(null);
  const pendingTickVolumeRef = useRef<number | null>(null);
  const hasVibrationApiRef = useRef(
    typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function',
  );

  const renderAudioTick = useCallback((ctx: AudioContext, volume: number) => {
    const now = ctx.currentTime;
    const bodyDur = isMobile ? 0.009 : 0.0065;
    const effectiveVolume = Math.min(isMobile ? 0.1 : 0.078, volume * (isMobile ? 0.68 : 0.6));

    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(isMobile ? 2200 : 2400, now);
    bodyFilter.Q.value = 0.28;

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(effectiveVolume, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + bodyDur);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(ctx.destination);

    const bodyOsc = ctx.createOscillator();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(isMobile ? 1180 : 1280, now);
    bodyOsc.connect(bodyFilter);
    bodyOsc.start(now);
    bodyOsc.stop(now + bodyDur);
  }, [isMobile]);

  // Create (and implicitly resume) AudioContext inside a user gesture.
  const unlockAudio = useCallback(() => {
    if (!enabled) return;
    try {
      type VendorWindow = Window & { webkitAudioContext?: typeof AudioContext };
      const Ctx =
        window.AudioContext ??
        (window as unknown as VendorWindow).webkitAudioContext;
      if (!audioCtxRef.current && Ctx) {
        audioCtxRef.current = new Ctx();
      }

      const ctx = audioCtxRef.current;
      if (ctx?.state === 'suspended') {
        void ctx.resume().then(() => {
          const pendingVolume = pendingTickVolumeRef.current;
          if (ctx.state !== 'running' || pendingVolume === null) return;
          pendingTickVolumeRef.current = null;
          renderAudioTick(ctx, pendingVolume);
        });
      }
    } catch { /* ignore */ }
  }, [enabled, renderAudioTick]);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (!hasVibrationApiRef.current) return false;
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }, []);

  // Render a short decaying noise burst through a bandpass filter.
  // Result: crisp mechanical "tick" character at very low volume.
  const playAudioTick = useCallback((volume: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      if (ctx.state !== 'running') {
        pendingTickVolumeRef.current = Math.max(pendingTickVolumeRef.current ?? 0, volume);
        void ctx.resume().then(() => {
          const pendingVolume = pendingTickVolumeRef.current;
          if (ctx.state !== 'running' || pendingVolume === null) return;
          pendingTickVolumeRef.current = null;
          renderAudioTick(ctx, pendingVolume);
        });
        return;
      }

      renderAudioTick(ctx, volume);
    } catch { /* ignore */ }
  }, [renderAudioTick]);

  // Light tick — fires on every item boundary crossing during scroll.
  const tick = useCallback(() => {
    if (!enabled) return;
    const now = Date.now();
    if (now - lastTickMsRef.current < 40) return; // cap ≤ 25 ticks/sec
    lastTickMsRef.current = now;
    vibrate(1);
    playAudioTick(0.11);
  }, [enabled, playAudioTick, vibrate]);

  // Heavier pulse — fires once when the spring settles after release.
  // On Android: double-pulse pattern gives a distinct "lock-in" feel.
  // On iOS: slightly louder tick to distinguish from scroll ticks.
  const snapPulse = useCallback(() => {
    if (!enabled) return;
    vibrate([5, 30, 2]);
    playAudioTick(0.19);
  }, [enabled, playAudioTick, vibrate]);

  // Subscribe to smoothRotation; fire tick whenever the focused slot changes.
  const trackRotation = useCallback((value: number) => {
    const idx = Math.round(-value / ANGLE_STEP);
    if (lastFocusedIndexRef.current !== idx) {
      lastFocusedIndexRef.current = idx;
      tick();
    }
  }, [tick]);

  return { unlockAudio, trackRotation, snapPulse };
}

export default function GearWheel() {
  const { isMobile, viewportWidth } = useViewport();
  const navigate = useNavigate();
  const wheelSnapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotationAnimationRef = useRef<ReturnType<typeof animate> | null>(null);
  const mobilePanFrameRef = useRef<number | null>(null);
  const mobilePanDeltaRef = useRef(0);
  const initialRotationRef = useRef<number | null>(null);
  const interactionEpochRef = useRef(0);
  const panEpochRef = useRef<number | null>(null);
  const wheelEpochRef = useRef<number | null>(null);
  const physics = isMobile ? MOBILE_PHYSICS : DESKTOP_PHYSICS;
  const radius = isMobile ? 430 : 600;
  const focusX = isMobile
    ? Math.max(38, Math.min(72, viewportWidth * 0.13))
    : viewportWidth * 0.15;
  const indicatorSize = isMobile ? 14 : 20;
  const indicatorGlow = isMobile ? '0 0 12px rgba(37,99,255,0.38)' : '0 0 16px rgba(37,99,255,0.4)';
  const labelOffset = isMobile ? 36 : 52;
  const labelFontSizes = isMobile ? MOBILE_FONT_SIZES : DESKTOP_FONT_SIZES;
  const labelLetterSpacing = isMobile ? '-0.8px' : '-1.5px';
  const labelMaxWidth = isMobile ? '68vw' : 'none';
  const buttonPadding = isMobile ? '8px 12px' : '6px 4px';
  
  // Restore prior focus in this version; otherwise default to Batch Renamer.
  if (initialRotationRef.current === null) {
    initialRotationRef.current = getInitialRotation();
  }
  const rotation = useMotionValue(initialRotationRef.current);

  const stopWheelSnapTimeout = useCallback(() => {
    if (wheelSnapTimeoutRef.current) {
      clearTimeout(wheelSnapTimeoutRef.current);
      wheelSnapTimeoutRef.current = null;
    }
  }, []);

  const stopNavigateTimeout = useCallback(() => {
    if (navigateTimeoutRef.current) {
      clearTimeout(navigateTimeoutRef.current);
      navigateTimeoutRef.current = null;
    }
  }, []);

  const stopRotationAnimation = useCallback(() => {
    rotationAnimationRef.current?.stop();
    rotationAnimationRef.current = null;
  }, []);

  const stopPendingMobilePanFrame = useCallback(() => {
    if (mobilePanFrameRef.current !== null) {
      window.cancelAnimationFrame(mobilePanFrameRef.current);
      mobilePanFrameRef.current = null;
    }
    mobilePanDeltaRef.current = 0;
  }, []);

  const applyRotationDelta = useCallback((delta: number) => {
    if (isMobile) {
      applyMagneticDelta(rotation, delta, physics.magneticThreshold, physics.magneticStrength);
      return;
    }

    rotation.set(rotation.get() + delta);
  }, [
    rotation,
    physics.magneticThreshold,
    physics.magneticStrength,
    isMobile,
  ]);

  const flushPendingMobilePanDelta = useCallback(() => {
    if (mobilePanFrameRef.current === null && mobilePanDeltaRef.current === 0) return;

    if (mobilePanFrameRef.current !== null) {
      window.cancelAnimationFrame(mobilePanFrameRef.current);
      mobilePanFrameRef.current = null;
    }

    const delta = mobilePanDeltaRef.current;
    mobilePanDeltaRef.current = 0;

    if (delta !== 0) {
      applyRotationDelta(delta);
    }
  }, [applyRotationDelta]);

  const scheduleMobilePanDelta = useCallback((delta: number) => {
    mobilePanDeltaRef.current += delta;
    if (mobilePanFrameRef.current !== null) return;

    mobilePanFrameRef.current = window.requestAnimationFrame(() => {
      mobilePanFrameRef.current = null;
      const nextDelta = mobilePanDeltaRef.current;
      mobilePanDeltaRef.current = 0;

      if (nextDelta !== 0) {
        applyRotationDelta(nextDelta);
      }
    });
  }, [applyRotationDelta]);

  const resetInteraction = useCallback(() => {
    interactionEpochRef.current += 1;
    panEpochRef.current = null;
    wheelEpochRef.current = null;
    stopPendingMobilePanFrame();
    stopWheelSnapTimeout();
    stopNavigateTimeout();
    stopRotationAnimation();
    return interactionEpochRef.current;
  }, [stopNavigateTimeout, stopPendingMobilePanFrame, stopRotationAnimation, stopWheelSnapTimeout]);

  useEffect(() => {
    const handlePageHide = () => {
      persistRotation(rotation.get());
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      persistRotation(rotation.get());
      resetInteraction();
    };
  }, [resetInteraction, rotation]);
  
  const smoothRotation = useSpring(rotation, {
    stiffness: physics.stiffness,
    damping: physics.damping,
    mass: physics.mass,
  });

  const { unlockAudio, trackRotation, snapPulse } = useGearHaptics(true, isMobile);
  useMotionValueEvent(smoothRotation, 'change', trackRotation);

  const animateToSnap = useCallback((
    targetRotation: number,
    stiffness: number,
    damping: number,
    epoch: number,
  ) => {
    stopRotationAnimation();
    rotationAnimationRef.current = animate(rotation, targetRotation, {
      type: 'spring',
      stiffness,
      damping,
      onComplete: () => {
        if (interactionEpochRef.current !== epoch) return;
        rotation.set(targetRotation);
        persistRotation(targetRotation);
        rotationAnimationRef.current = null;
        snapPulse();
      },
    });
  }, [rotation, stopRotationAnimation, snapPulse]);

  // ─── Drag Interaction ───
  const handlePanStart = useCallback(() => {
    unlockAudio(); // Unblock AudioContext on iOS (must happen inside a user gesture)
    panEpochRef.current = resetInteraction();
  }, [resetInteraction, unlockAudio]);

  const handlePan = useCallback((_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const delta = info.delta.y * physics.panMultiplier;
    if (isMobile) {
      scheduleMobilePanDelta(delta);
      return;
    }

    applyRotationDelta(delta);
  }, [
    physics.panMultiplier,
    isMobile,
    applyRotationDelta,
    scheduleMobilePanDelta,
  ]);

  const handlePanEnd = useCallback((_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const epoch = panEpochRef.current ?? resetInteraction();
    panEpochRef.current = null;
    flushPendingMobilePanDelta();
    const v = info.velocity.y;
    const velocity = v * physics.inertiaVelocity;

    if (Math.abs(velocity) < INSTANT_SNAP_VELOCITY_THRESHOLD) {
      animateToSnap(
        getNearestSnapRotation(rotation.get()),
        physics.snapStiffness,
        physics.snapDamping,
        epoch,
      );
      return;
    }

    rotationAnimationRef.current = animate(rotation, rotation.get() + v * physics.inertiaMultiplier, {
      type: 'inertia',
      velocity,
      timeConstant: physics.inertiaTimeConstant,
      modifyTarget: getNearestSnapRotation,
      onComplete: () => {
        if (interactionEpochRef.current !== epoch) return;
        const snapped = getNearestSnapRotation(rotation.get());
        rotation.set(snapped);
        persistRotation(snapped);
        rotationAnimationRef.current = null;
        snapPulse();
      },
    });
  }, [
    animateToSnap,
    physics.inertiaMultiplier,
    physics.inertiaTimeConstant,
    physics.inertiaVelocity,
    physics.snapDamping,
    physics.snapStiffness,
    flushPendingMobilePanDelta,
    resetInteraction,
    rotation,
    snapPulse,
  ]);

  // ─── Scroll Interaction ───
  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    unlockAudio(); // Desktop users reach this before handlePanStart
    stopWheelSnapTimeout();

    const epoch = wheelEpochRef.current ?? resetInteraction();
    wheelEpochRef.current = epoch;

    const delta = -e.deltaY * physics.wheelMultiplier;
    applyRotationDelta(delta);

    wheelSnapTimeoutRef.current = setTimeout(() => {
      wheelEpochRef.current = null;
      if (interactionEpochRef.current !== epoch) return;
      const snapped = getNearestSnapRotation(rotation.get());
      animateToSnap(snapped, physics.snapStiffness, physics.snapDamping, epoch);
      wheelSnapTimeoutRef.current = null;
    }, WHEEL_SNAP_DELAY_MS);
  }, [
    physics.wheelMultiplier,
    physics.snapStiffness,
    physics.snapDamping,
    applyRotationDelta,
    animateToSnap,
    resetInteraction,
    stopWheelSnapTimeout,
    unlockAudio,
  ]);

  // ─── Routing Action ───
  const handleSelectTool = useCallback((routeId: string, index: number) => {
    const epoch = resetInteraction();

    const slotAngle = index * ANGLE_STEP;
    const currentRot = rotation.get();
    const targetRotation = getSelectionTargetRotation(currentRot, slotAngle);
    const diff = targetRotation - currentRot;

    if (Math.abs(diff) < ROTATION_LOCK_EPSILON) {
      // If it's essentially already at the exact focus point, jump immediately
      rotation.set(targetRotation);
      persistRotation(targetRotation);
      navigate(`/tool/${routeId}`);
    } else {
      // Animate strictly to the absolute focus position, but much faster
      stopRotationAnimation();
      rotationAnimationRef.current = animate(rotation, targetRotation, {
        type: 'spring',
        stiffness: physics.snapStiffness * 3.5, // Significantly accelerate the snap
        damping: physics.snapDamping * 1.5, // Stop quickly without much oscillation
        restDelta: 0.01, // Insist on a visually strict full stop
        onComplete: () => {
          if (interactionEpochRef.current !== epoch) return;
          rotation.set(targetRotation); // Lock to absolute mathematical center
          rotationAnimationRef.current = null;
          persistRotation(targetRotation);

          // Introduce a minimal pause after it rigidly locks into place
          navigateTimeoutRef.current = setTimeout(() => {
            if (interactionEpochRef.current !== epoch) return;
            navigate(`/tool/${routeId}`);
            navigateTimeoutRef.current = null;
          }, NAVIGATE_DELAY_MS);
        }
      });
    }
  }, [resetInteraction, rotation, navigate, physics.snapStiffness, physics.snapDamping, stopRotationAnimation]);

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
      onPointerDown={unlockAudio}
      onPan={handlePan}
      onPanStart={handlePanStart}
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
          willChange: 'transform',
          transformStyle: 'preserve-3d',
        }}
      >
        {REPEATED_TOOLS.map((tool, index) => (
          isMobile ? (
            <MobileArcItem
              key={tool.uniqueId}
              tool={tool}
              index={index}
              smoothRotation={smoothRotation}
              radius={radius}
              labelOffset={labelOffset}
              labelLetterSpacing={labelLetterSpacing}
              labelMaxWidth={labelMaxWidth}
              buttonPadding={buttonPadding}
              onSelect={handleSelectTool}
            />
          ) : (
            <DesktopArcItem
              key={tool.uniqueId}
              tool={tool}
              index={index}
              smoothRotation={smoothRotation}
              radius={radius}
              labelOffset={labelOffset}
              labelFontSizes={labelFontSizes}
              labelLetterSpacing={labelLetterSpacing}
              labelMaxWidth={labelMaxWidth}
              buttonPadding={buttonPadding}
              onSelect={handleSelectTool}
            />
          )
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
const MobileArcItem = memo(function MobileArcItem({
  tool,
  index,
  smoothRotation,
  radius,
  labelOffset,
  labelLetterSpacing,
  labelMaxWidth,
  buttonPadding,
  onSelect,
}: {
  tool: { id: string; name: string };
  index: number;
  smoothRotation: MotionValue<number>;
  radius: number;
  labelOffset: number;
  labelLetterSpacing: string;
  labelMaxWidth: string;
  buttonPadding: string;
  onSelect: (id: string, index: number) => void;
}) {
  const slotAngle = index * ANGLE_STEP; // static angle for this slot

  // How far is this item from the focal center (the left-most point = 0°)?
  const dist = useTransform(smoothRotation, (r) => getFocusDistance(r, slotAngle));
  const opacity = useTransform(dist, DIST_STOPS, MOBILE_OPACITY_STOPS);
  const mobileScale = useTransform(dist, DIST_STOPS, MOBILE_SCALE_STOPS);
  const color = useTransform(dist, ACTIVE_COLOR_DISTANCE, ACTIVE_COLOR_STOPS);
  const pointerEvents = useTransform(dist, (d) => (d < MOBILE_POINTER_RANGE ? 'auto' : 'none'));
  const visibility = useTransform(
    dist,
    (d) => (d <= MOBILE_VISIBLE_DISTANCE_CUTOFF ? 'visible' : 'hidden'),
  );

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `rotate(${slotAngle}deg) translateX(${radius}px) translateZ(0)`,
        transformOrigin: '0 0',
        visibility,
        willChange: 'transform',
        backfaceVisibility: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: labelOffset,
          top: '50%',
          transform: 'translateY(-50%) translateZ(0)',
          transformOrigin: 'left center',
        }}
      >
        <motion.button
          onClick={() => onSelect(tool.id, index)}
          style={{
            background: 'none',
            border: 'none',
            color,
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
            fontSize: MOBILE_LABEL_BASE_SIZE,
            opacity,
            pointerEvents,
            scale: mobileScale,
            willChange: 'transform, opacity, color',
            transformOrigin: 'left center',
            backfaceVisibility: 'hidden',
            WebkitFontSmoothing: 'antialiased',
            textRendering: 'optimizeSpeed',
          }}
        >
          {tool.name}
        </motion.button>
      </div>
    </motion.div>
  );
});

const DesktopArcItem = memo(function DesktopArcItem({
  tool,
  index,
  smoothRotation,
  radius,
  labelOffset,
  labelFontSizes,
  labelLetterSpacing,
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
  labelMaxWidth: string;
  buttonPadding: string;
  onSelect: (id: string, index: number) => void;
}) {
  const slotAngle = index * ANGLE_STEP;
  const dist = useTransform(smoothRotation, (r) => getFocusDistance(r, slotAngle));
  const fontSize = useTransform(dist, DIST_STOPS, labelFontSizes);
  const opacity = useTransform(dist, DIST_STOPS, DESKTOP_OPACITY_STOPS);
  const blurAmount = useTransform(dist, DIST_STOPS, DESKTOP_BLUR_STOPS);
  const blurFilter = useMotionTemplate`blur(${blurAmount}px)`;
  const color = useTransform(dist, ACTIVE_COLOR_DISTANCE, ACTIVE_COLOR_STOPS);
  const pointerEvents = useTransform(dist, (d) => (d < DESKTOP_POINTER_RANGE ? 'auto' : 'none'));
  const visibility = useTransform(
    dist,
    (d) => (d <= DESKTOP_VISIBLE_DISTANCE_CUTOFF ? 'visible' : 'hidden'),
  );

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `rotate(${slotAngle}deg) translateX(${radius}px) translateZ(0)`,
        transformOrigin: '0 0',
        visibility,
        willChange: 'transform',
        backfaceVisibility: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: labelOffset,
          top: '50%',
          transform: 'translateY(-50%) translateZ(0)',
          transformOrigin: 'left center',
        }}
      >
        <motion.button
          onClick={() => onSelect(tool.id, index)}
          style={{
            background: 'none',
            border: 'none',
            color,
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
            filter: blurFilter,
            pointerEvents,
            willChange: 'transform, opacity, filter, color',
            transformOrigin: 'left center',
            backfaceVisibility: 'hidden',
            WebkitFontSmoothing: 'antialiased',
            textRendering: 'geometricPrecision',
          }}
        >
          {tool.name}
        </motion.button>
      </div>
    </motion.div>
  );
});
