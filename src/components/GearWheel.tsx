import { memo, useCallback, useEffect, useRef, useState, type WheelEvent } from 'react';
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
  useReducedMotion,
  type PanInfo,
} from 'framer-motion';
import { TOOLS } from '../config/tools';
import { useViewport } from '../hooks/useViewport';

const DEFAULT_FOCUS_TOOL_ID = 'gradient-studio';
const WHEEL_SNAP_DELAY_MS = 90;
const NAVIGATE_DELAY_MS = 96;
const ROTATION_LOCK_EPSILON = 0.5;
const INSTANT_SNAP_VELOCITY_THRESHOLD = 0.02;
const MOBILE_VISIBLE_DISTANCE_CUTOFF = 42;
const DESKTOP_VISIBLE_DISTANCE_CUTOFF = 47;
const MOBILE_POINTER_RANGE = 52;
const DESKTOP_POINTER_RANGE = 50;
const ANGLE_STEP = 10;
const MIN_SLOT_COUNT = 45;
const STATIC_ARC_TOOL_LIMIT = 7;
const EDGE_RESISTANCE = 0.24;

function getRepeatSetCount(toolCount: number): number {
  if (toolCount <= 0) return 1;

  const minRepeatCount = Math.max(3, Math.ceil(MIN_SLOT_COUNT / toolCount));
  return minRepeatCount % 2 === 0 ? minRepeatCount + 1 : minRepeatCount;
}

const USE_STATIC_ARC = TOOLS.length <= STATIC_ARC_TOOL_LIMIT;
const REPEAT_SET_COUNT = getRepeatSetCount(TOOLS.length);
const ACTIVE_REPEAT_SET_COUNT = USE_STATIC_ARC ? 1 : REPEAT_SET_COUNT;
const CENTER_REPEAT_INDEX = Math.floor(ACTIVE_REPEAT_SET_COUNT / 2);
const REPEATED_TOOLS = Array.from({ length: ACTIVE_REPEAT_SET_COUNT }, (_, repeatIndex) =>
  TOOLS.map((tool, toolIndex) => ({
    ...tool,
    uniqueId: `${tool.id}-${repeatIndex}-${toolIndex}`,
    slotIndex: repeatIndex * TOOLS.length + toolIndex,
  })),
).flat();
const WHEEL_MIN_ROTATION = USE_STATIC_ARC
  ? -Math.max(0, (REPEATED_TOOLS.length - 1) * ANGLE_STEP)
  : null;
const WHEEL_MAX_ROTATION = USE_STATIC_ARC ? 0 : null;

function clampRotation(value: number): number {
  if (WHEEL_MIN_ROTATION === null || WHEEL_MAX_ROTATION === null) {
    return value;
  }

  return Math.min(WHEEL_MAX_ROTATION, Math.max(WHEEL_MIN_ROTATION, value));
}

function applyEdgeResistance(value: number): number {
  if (WHEEL_MIN_ROTATION === null || WHEEL_MAX_ROTATION === null) {
    return value;
  }

  if (value < WHEEL_MIN_ROTATION) {
    return WHEEL_MIN_ROTATION + (value - WHEEL_MIN_ROTATION) * EDGE_RESISTANCE;
  }

  if (value > WHEEL_MAX_ROTATION) {
    return WHEEL_MAX_ROTATION + (value - WHEEL_MAX_ROTATION) * EDGE_RESISTANCE;
  }

  return value;
}

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
  if (TOOLS.length === 0) return 0;

  const defaultIndex = TOOLS.findIndex((tool) => tool.id === DEFAULT_FOCUS_TOOL_ID);
  const focusIndex = defaultIndex >= 0 ? defaultIndex : 0;
  const centeredSlotIndex = CENTER_REPEAT_INDEX * TOOLS.length + focusIndex;
  return -(centeredSlotIndex * ANGLE_STEP);
}

// ──── Physics ────
// Tunable by default (Interface Craft Principle)
const DESKTOP_PHYSICS: GearPhysics = {
  // Wheel spring feel (heavier, stiffer, more damped)
  // Reduced damping and mass to make the wheel feel lighter overall
  stiffness: 132,
  damping: 24,
  mass: 0.92,
  
  // Drag handling
  panMultiplier: 0.12,
  
  // Drag inertia (Friction after releasing drag)
  inertiaMultiplier: 0.16,
  inertiaVelocity: 0.14,
  inertiaTimeConstant: 220,
  
  // Trackpad / Mouse Wheel Scroll
  // Increased multiplier to reduce the "physical effort" needed to scroll
  wheelMultiplier: 0.125,
  snapStiffness: 180,
  snapDamping: 28,
  magneticThreshold: 0,
  magneticStrength: 0,
};

const MOBILE_PHYSICS: GearPhysics = {
  stiffness: 108,
  damping: 28,
  mass: 0.92,
  panMultiplier: 0.078,
  inertiaMultiplier: 0.042,
  inertiaVelocity: 0.052,
  inertiaTimeConstant: 210,
  wheelMultiplier: 0.04,
  snapStiffness: 172,
  snapDamping: 30,
  magneticThreshold: ANGLE_STEP * 0.18,
  magneticStrength: 0.12,
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
const MOBILE_X_STOPS = [0, -3, -8, -16, -24];
const DESKTOP_X_STOPS = [0, -8, -18, -30, -42];
const MOBILE_BLUR_STOPS = [0, 0.2, 0.6, 1.1, 1.8];
const DESKTOP_BLUR_STOPS = [0, 0.25, 0.8, 1.5, 2.4];
const MOBILE_LABEL_BASE_SIZE = MOBILE_FONT_SIZES[0];
const MOBILE_SCALE_STOPS = MOBILE_FONT_SIZES.map((size) => size / MOBILE_LABEL_BASE_SIZE);
function getNearestSnapRotation(value: number): number {
  return clampRotation(Math.round(value / ANGLE_STEP) * ANGLE_STEP);
}

function getFocusDistance(rotationValue: number, slotAngle: number): number {
  return Math.abs(rotationValue + slotAngle);
}

function getSnapDelta(value: number): number {
  return getNearestSnapRotation(value) - value;
}

function getSelectionTargetRotation(slotAngle: number): number {
  return -slotAngle;
}

function applyMagneticDelta(
  rotation: MotionValue<number>,
  delta: number,
  threshold: number,
  strength: number,
) {
  const rawNext = applyEdgeResistance(rotation.get() + delta);
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
    const effectiveVolume = Math.min(isMobile ? 0.14 : 0.096, volume * (isMobile ? 0.9 : 0.76));

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
      } else if (ctx?.state === 'running') {
        const gain = ctx.createGain();
        gain.gain.value = 0.0001;
        gain.connect(ctx.destination);
        const osc = ctx.createOscillator();
        osc.frequency.value = isMobile ? 880 : 960;
        osc.connect(gain);
        osc.start();
        osc.stop(ctx.currentTime + 0.003);
      }
    } catch { /* ignore */ }
  }, [enabled, isMobile, renderAudioTick]);

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
    playAudioTick(0.16);
  }, [enabled, playAudioTick, vibrate]);

  // Heavier pulse — fires once when the spring settles after release.
  // On Android: double-pulse pattern gives a distinct "lock-in" feel.
  // On iOS: slightly louder tick to distinguish from scroll ticks.
  const snapPulse = useCallback(() => {
    if (!enabled) return;
    vibrate([5, 30, 2]);
    playAudioTick(0.24);
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
  const shouldReduceMotion = useReducedMotion() ?? false;
  const wheelSnapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotationAnimationRef = useRef<ReturnType<typeof animate> | null>(null);
  const mobilePanFrameRef = useRef<number | null>(null);
  const mobilePanDeltaRef = useRef(0);
  const interactionEpochRef = useRef(0);
  const panEpochRef = useRef<number | null>(null);
  const wheelEpochRef = useRef<number | null>(null);
  const physics = isMobile ? MOBILE_PHYSICS : DESKTOP_PHYSICS;
  const radius = isMobile ? 430 : USE_STATIC_ARC ? 670 : 710;
  const focusX = isMobile
    ? Math.max(38, Math.min(72, viewportWidth * 0.13))
    : viewportWidth * 0.15;
  const indicatorSize = isMobile ? 14 : 20;
  const labelOffset = isMobile ? 36 : 52;
  const labelFontSizes = isMobile ? MOBILE_FONT_SIZES : DESKTOP_FONT_SIZES;
  const labelLetterSpacing = isMobile ? '-0.8px' : '-1.5px';
  const labelMaxWidth = isMobile ? '68vw' : 'none';
  const buttonPadding = isMobile ? '8px 12px' : '6px 4px';
  const [initialRotation] = useState(getDefaultRotation);
  const rotation = useMotionValue(initialRotation);

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

    rotation.set(applyEdgeResistance(rotation.get() + delta));
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

  useEffect(() => () => {
    resetInteraction();
  }, [resetInteraction]);
  
  const smoothRotation = useSpring(rotation, {
    stiffness: physics.stiffness,
    damping: physics.damping,
    mass: physics.mass,
  });
  const snapDistance = useTransform(smoothRotation, (value) => Math.abs(getSnapDelta(value)));
  const snapProgress = useSpring(
    useTransform(snapDistance, (distance) => Math.max(0, 1 - distance / (ANGLE_STEP * 0.5))),
    shouldReduceMotion
      ? { stiffness: 1000, damping: 1000 }
      : { stiffness: 260, damping: 28, mass: 0.7 },
  );
  const indicatorScale = useTransform(snapProgress, [0, 1], [0.92, 1.06]);
  const indicatorHaloBlur = useTransform(snapProgress, [0, 1], isMobile ? [10, 18] : [12, 24]);
  const indicatorHaloAlpha = useTransform(snapProgress, [0, 1], [0.16, 0.34]);
  const indicatorHalo = useMotionTemplate`0 0 ${indicatorHaloBlur}px rgba(0, 47, 167, ${indicatorHaloAlpha})`;

  const { unlockAudio, trackRotation, snapPulse } = useGearHaptics(true, isMobile);
  useMotionValueEvent(rotation, 'change', trackRotation);

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
    rotation,
    stopWheelSnapTimeout,
    unlockAudio,
  ]);

  // ─── Routing Action ───
  const handleSelectTool = useCallback((routeId: string, index: number) => {
    const epoch = resetInteraction();

    const slotAngle = index * ANGLE_STEP;
    const currentRot = rotation.get();
    const targetRotation = getSelectionTargetRotation(slotAngle);
    const diff = targetRotation - currentRot;

    if (Math.abs(diff) < ROTATION_LOCK_EPSILON) {
      // If it's essentially already at the exact focus point, jump immediately
      rotation.set(targetRotation);
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
          <ArcItem
            key={tool.uniqueId}
            tool={tool}
            index={index}
            isMobile={isMobile}
            smoothRotation={smoothRotation}
            radius={radius}
            labelOffset={labelOffset}
            labelFontSizes={labelFontSizes}
            labelLetterSpacing={labelLetterSpacing}
            labelMaxWidth={labelMaxWidth}
            buttonPadding={buttonPadding}
            shouldReduceMotion={shouldReduceMotion}
            onSelect={handleSelectTool}
          />
        ))}
      </motion.div>

      {/* ─── Focal Indicator (Blue Dot) ─── */}
      <motion.div
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
          scale: indicatorScale,
          boxShadow: indicatorHalo,
        }}
      />
    </motion.div>
  );
}

// ──────────────────────────────────────
// ArcItem — a single label on the wheel
// ──────────────────────────────────────
const ArcItem = memo(function ArcItem({
  tool,
  index,
  isMobile,
  smoothRotation,
  radius,
  labelOffset,
  labelFontSizes,
  labelLetterSpacing,
  labelMaxWidth,
  buttonPadding,
  shouldReduceMotion,
  onSelect,
}: {
  tool: { id: string; name: string };
  index: number;
  isMobile: boolean;
  smoothRotation: MotionValue<number>;
  radius: number;
  labelOffset: number;
  labelFontSizes: number[];
  labelLetterSpacing: string;
  labelMaxWidth: string;
  buttonPadding: string;
  shouldReduceMotion: boolean;
  onSelect: (id: string, index: number) => void;
}) {
  const slotAngle = index * ANGLE_STEP;
  const dist = useTransform(smoothRotation, (r) => getFocusDistance(r, slotAngle));
  const opacity = useTransform(
    dist,
    DIST_STOPS,
    isMobile ? MOBILE_OPACITY_STOPS : DESKTOP_OPACITY_STOPS,
  );
  const fontSize = useTransform(dist, DIST_STOPS, labelFontSizes);
  const mobileScale = useTransform(dist, DIST_STOPS, MOBILE_SCALE_STOPS);
  const color = useTransform(dist, ACTIVE_COLOR_DISTANCE, ACTIVE_COLOR_STOPS);
  const x = useTransform(dist, DIST_STOPS, isMobile ? MOBILE_X_STOPS : DESKTOP_X_STOPS);
  const blur = useTransform(dist, DIST_STOPS, shouldReduceMotion ? [0, 0, 0, 0, 0] : (isMobile ? MOBILE_BLUR_STOPS : DESKTOP_BLUR_STOPS));
  const filter = useMotionTemplate`blur(${blur}px)`;
  const pointerEvents = useTransform(
    dist,
    (d) => (d < (isMobile ? MOBILE_POINTER_RANGE : DESKTOP_POINTER_RANGE) ? 'auto' : 'none'),
  );
  const visibility = useTransform(
    dist,
    (d) => (d <= (isMobile ? MOBILE_VISIBLE_DISTANCE_CUTOFF : DESKTOP_VISIBLE_DISTANCE_CUTOFF)
      ? 'visible'
      : 'hidden'),
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
          whileTap={isMobile ? undefined : { scale: 0.985 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.55 }}
          className="pressable focus-visible:ring-2 focus-visible:ring-[color:rgba(0,47,167,0.18)]"
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
            fontSize: isMobile ? MOBILE_LABEL_BASE_SIZE : fontSize,
            opacity,
            pointerEvents,
            x,
            filter,
            scale: isMobile ? mobileScale : 1,
            willChange: 'transform, opacity, color',
            transformOrigin: 'left center',
            backfaceVisibility: 'hidden',
            WebkitFontSmoothing: 'antialiased',
            textRendering: isMobile ? 'optimizeSpeed' : 'optimizeLegibility',
          }}
        >
          {tool.name}
        </motion.button>
      </div>
    </motion.div>
  );
});
