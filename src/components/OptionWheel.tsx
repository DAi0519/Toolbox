/**
 * [INPUT]: 依赖 react 的状态、引用、回调与布局副作用能力，依赖同目录 OptionWheel.css 的轮盘布局样式
 * [OUTPUT]: 默认导出 OptionWheel 选项轮盘组件及 OptionWheelProps，支持滚轮、拖拽、键盘、循环选择与吸附后激活
 * [POS]: components 的通用曲线选择内核，被首页 GearWheel 组合为工具导航
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import './OptionWheel.css';

const DEFAULT_ITEMS = [
  'Ambient',
  'House',
  'Techno',
  'Jazz',
  'Lo-Fi',
  'Synthwave',
  'Trance',
  'Funk',
  'Disco',
  'Hip-Hop',
  'Chillwave',
  'Drum & Bass',
] as const;

const VISUAL_SETTLE_EPSILON = 0.001;
const ACTIVATION_EPSILON = 0.035;
const WHEEL_SETTLE_DELAY_MS = 140;
const DRAG_THRESHOLD_PX = 4;

export interface OptionWheelProps {
  items?: readonly string[];
  defaultSelected?: number;
  onChange?: (index: number, item: string) => void;
  onActivate?: (index: number, item: string) => void;
  textColor?: string;
  activeColor?: string;
  side?: 'left' | 'right';
  fontSize?: number;
  spacing?: number;
  curve?: number;
  tilt?: number;
  blur?: number;
  fade?: number;
  minOpacity?: number;
  smoothing?: number;
  inset?: number;
  loop?: boolean;
  draggable?: boolean;
  soundUrl?: string;
  soundVolume?: number;
  className?: string;
  ariaLabel?: string;
}

interface WheelConfig {
  count: number;
  items: readonly string[];
  rowHeight: number;
  curve: number;
  tilt: number;
  blur: number;
  fade: number;
  minOpacity: number;
  side: 'left' | 'right';
  loop: boolean;
  smoothing: number;
  draggable: boolean;
  soundUrl: string;
  soundVolume: number;
}

interface DragState {
  pointerId: number;
  startY: number;
  startPosition: number;
}

function normalizeIndex(value: number, count: number): number {
  if (count <= 0) return 0;
  return ((Math.round(value) % count) + count) % count;
}

function clampInitialIndex(value: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(Math.round(value), 0), count - 1);
}

export default function OptionWheel({
  items = DEFAULT_ITEMS,
  defaultSelected = 3,
  onChange,
  onActivate,
  textColor = '#a6a6a6',
  activeColor = '#ffffff',
  side = 'left',
  fontSize = 3,
  spacing = 1.4,
  curve = 1,
  tilt = 6,
  blur = 2,
  fade = 0.25,
  minOpacity = 0.05,
  smoothing = 200,
  inset = 80,
  loop = false,
  draggable = true,
  soundUrl = '',
  soundVolume = 0.5,
  className = '',
  ariaLabel = '选项轮盘',
}: OptionWheelProps) {
  const initialSelected = clampInitialIndex(defaultSelected, items.length);
  const optionIdPrefix = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const positionRef = useRef(initialSelected);
  const targetRef = useRef(initialSelected);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const configRef = useRef<WheelConfig>({
    count: items.length,
    items,
    rowHeight: 1,
    curve,
    tilt,
    blur,
    fade,
    minOpacity,
    side,
    loop,
    smoothing,
    draggable,
    soundUrl,
    soundVolume,
  });
  const onChangeRef = useRef(onChange);
  const onActivateRef = useRef(onActivate);
  const selectedRef = useRef(initialSelected);
  const pendingActivationRef = useRef<number | null>(null);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const dragMovedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef('');
  const lastTickRef = useRef(0);
  const [selectedIndex, setSelectedIndex] = useState(initialSelected);
  const [isDragging, setIsDragging] = useState(false);

  const rootFontSize = typeof window === 'undefined'
    ? 16
    : parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

  onChangeRef.current = onChange;
  onActivateRef.current = onActivate;
  configRef.current = {
    count: items.length,
    items,
    rowHeight: Math.max(fontSize * spacing * rootFontSize, 1),
    curve,
    tilt,
    blur,
    fade,
    minOpacity,
    side,
    loop,
    smoothing,
    draggable,
    soundUrl,
    soundVolume,
  };

  const playTick = useCallback(() => {
    const config = configRef.current;
    if (!config.soundUrl) return;

    const now = performance.now();
    if (now - lastTickRef.current < 70) return;
    lastTickRef.current = now;

    if (!audioRef.current || audioUrlRef.current !== config.soundUrl) {
      audioRef.current = new Audio(config.soundUrl);
      audioRef.current.preload = 'auto';
      audioUrlRef.current = config.soundUrl;
    }

    const audio = audioRef.current;
    audio.volume = Math.min(Math.max(config.soundVolume, 0), 1);
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }, []);

  const runFrame = useCallback(function runWheelFrame(now: number) {
    const config = configRef.current;
    if (config.count <= 0) {
      animationFrameRef.current = null;
      return;
    }

    const deltaTime = Math.min(Math.max((now - lastFrameRef.current) / 1000, 0), 0.05);
    lastFrameRef.current = now;
    const timeConstant = Math.max(config.smoothing, 1) / 1000;
    const easing = 1 - Math.exp(-deltaTime / timeConstant);
    const target = targetRef.current;
    const current = positionRef.current;
    let next = current + (target - current) * easing;
    const remaining = Math.abs(target - next);
    const settled = remaining < VISUAL_SETTLE_EPSILON;

    if (settled) next = target;
    positionRef.current = next;

    const mirror = config.side === 'right' ? -1 : 1;
    const tiltRadians = (config.tilt * Math.PI) / 180;
    const radius = tiltRadians > 0.0005 ? config.rowHeight / tiltRadians : 0;

    for (let index = 0; index < config.count; index += 1) {
      const element = itemRefs.current[index];
      if (!element) continue;

      let distanceFromFocus = index - next;
      if (config.loop && config.count > 1) {
        distanceFromFocus = ((distanceFromFocus % config.count) + config.count) % config.count;
        if (distanceFromFocus > config.count / 2) distanceFromFocus -= config.count;
      }

      const absoluteDistance = Math.abs(distanceFromFocus);
      let x = 0;
      let y = distanceFromFocus * config.rowHeight;
      let rotation = 0;

      if (radius > 0) {
        const angle = Math.max(
          -Math.PI / 2,
          Math.min(Math.PI / 2, distanceFromFocus * tiltRadians),
        );
        y = radius * Math.sin(angle);
        x = -mirror * radius * (1 - Math.cos(angle)) * config.curve;
        rotation = (mirror * angle * 180) / Math.PI;
      }

      element.style.transform = `translate(${x.toFixed(2)}px, calc(${y.toFixed(2)}px - 50%)) rotate(${rotation.toFixed(3)}deg)`;
      element.style.opacity = String(Math.max(config.minOpacity, 1 - absoluteDistance * config.fade));
      element.style.filter = config.blur > 0
        ? `blur(${(absoluteDistance * config.blur).toFixed(2)}px)`
        : 'none';
      element.style.setProperty('--ow-progress', Math.max(0, 1 - Math.min(absoluteDistance, 1)).toFixed(4));
    }

    const pendingActivation = pendingActivationRef.current;
    if (pendingActivation !== null && remaining < ACTIVATION_EPSILON) {
      pendingActivationRef.current = null;
      onActivateRef.current?.(pendingActivation, config.items[pendingActivation]);
    }

    animationFrameRef.current = settled ? null : requestAnimationFrame(runWheelFrame);
  }, []);

  const startLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    lastFrameRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(runFrame);
  }, [runFrame]);

  const applyTarget = useCallback((value: number, snap: boolean) => {
    const config = configRef.current;
    if (config.count <= 0) return;

    let nextTarget = value;
    if (!config.loop) {
      nextTarget = Math.min(Math.max(nextTarget, 0), config.count - 1);
    }
    if (snap) nextTarget = Math.round(nextTarget);
    targetRef.current = nextTarget;

    const nextIndex = normalizeIndex(nextTarget, config.count);
    if (nextIndex !== selectedRef.current) {
      selectedRef.current = nextIndex;
      setSelectedIndex(nextIndex);
      onChangeRef.current?.(nextIndex, config.items[nextIndex]);
      playTick();
    }

    startLoop();
  }, [playTick, startLoop]);

  useLayoutEffect(() => {
    lastFrameRef.current = performance.now() - 16;
    runFrame(performance.now());
  }, [
    items,
    fontSize,
    spacing,
    curve,
    tilt,
    blur,
    fade,
    minOpacity,
    side,
    loop,
    smoothing,
    runFrame,
  ]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const handleWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      pendingActivationRef.current = null;
      const config = configRef.current;
      const delta = event.deltaMode === 1 ? event.deltaY * 24 : event.deltaY;
      const step = Math.max(-1, Math.min(1, delta / config.rowHeight));
      applyTarget(targetRef.current + step, false);

      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        applyTarget(targetRef.current, true);
        wheelTimerRef.current = null;
      }, WHEEL_SETTLE_DELAY_MS);
    };

    root.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      root.removeEventListener('wheel', handleWheel);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    };
  }, [applyTarget]);

  useEffect(() => () => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    audioRef.current?.pause();
  }, []);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!configRef.current.draggable) return;
    pendingActivationRef.current = null;
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startPosition: targetRef.current,
    };
    dragMovedRef.current = false;
    setIsDragging(true);
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const deltaY = event.clientY - drag.startY;
    if (!dragMovedRef.current && Math.abs(deltaY) > DRAG_THRESHOLD_PX) {
      dragMovedRef.current = true;
      rootRef.current?.setPointerCapture(drag.pointerId);
    }

    if (dragMovedRef.current) {
      applyTarget(drag.startPosition - deltaY / configRef.current.rowHeight, false);
    }
  }, [applyTarget]);

  const handlePointerEnd = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsDragging(false);
    if (dragMovedRef.current) applyTarget(targetRef.current, true);
  }, [applyTarget]);

  const handleItemClick = useCallback((index: number) => {
    if (dragMovedRef.current) return;

    const config = configRef.current;
    if (config.count <= 0) return;

    const current = targetRef.current;
    let delta = index - normalizeIndex(current, config.count);
    if (config.loop && config.count > 1) {
      if (delta > config.count / 2) delta -= config.count;
      else if (delta < -config.count / 2) delta += config.count;
    }

    pendingActivationRef.current = index;
    applyTarget(current + delta, true);
  }, [applyTarget]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    let delta: number | null = null;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') delta = -1;
    else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') delta = 1;

    if (delta !== null) {
      event.preventDefault();
      pendingActivationRef.current = null;
      applyTarget(Math.round(targetRef.current) + delta, true);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      pendingActivationRef.current = selectedRef.current;
      startLoop();
    }
  }, [applyTarget, startLoop]);

  const rootClassName = [
    'option-wheel',
    side === 'right' ? 'option-wheel--right' : '',
    isDragging ? 'option-wheel--dragging' : '',
    className,
  ].filter(Boolean).join(' ');
  const customProperties = {
    '--ow-text-color': textColor,
    '--ow-active-color': activeColor,
    '--ow-font-size': `${fontSize}rem`,
    '--ow-inset': `${inset}px`,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      role="listbox"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-activedescendant={`${optionIdPrefix}-${selectedIndex}`}
      className={rootClassName}
      style={customProperties}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
    >
      {items.map((label, index) => (
        <div
          id={`${optionIdPrefix}-${index}`}
          key={`${label}-${index}`}
          ref={(element) => {
            itemRefs.current[index] = element;
          }}
          role="option"
          aria-selected={selectedIndex === index}
          className={selectedIndex === index
            ? 'option-wheel__item option-wheel__item--selected'
            : 'option-wheel__item'}
          onClick={() => handleItemClick(index)}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
