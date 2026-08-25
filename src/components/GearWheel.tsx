/**
 * [INPUT]: 依赖 OptionWheel 的曲线选择与吸附交互、TOOLS 工具注册表、useViewport 响应式能力和 react-router-dom 导航
 * [OUTPUT]: 默认导出 GearWheel 首页工具轮盘，提供焦点小蓝点、滚轮、拖拽、点击、键盘导航与选择持久化
 * [POS]: components 的首页主导航适配层，将通用 OptionWheel 映射为 Playbox 工具入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useCallback, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TOOLS } from '../config/tools';
import { useViewport } from '../hooks/useViewport';
import OptionWheel from './OptionWheel';
import './GearWheel.css';

const DEFAULT_FOCUS_TOOL_ID = 'gradient-studio';
const ROTATION_STORAGE_KEY = 'gearWheelRotation.v2';
const LEGACY_ANGLE_STEP = 10;
const TOOL_NAMES = TOOLS.map((tool) => tool.name);

function getDefaultToolIndex(): number {
  const configuredIndex = TOOLS.findIndex((tool) => tool.id === DEFAULT_FOCUS_TOOL_ID);
  return configuredIndex >= 0 ? configuredIndex : 0;
}

function normalizeToolIndex(value: number): number {
  if (TOOLS.length === 0) return 0;
  return ((Math.round(value) % TOOLS.length) + TOOLS.length) % TOOLS.length;
}

function readInitialToolIndex(): number {
  if (typeof window === 'undefined' || TOOLS.length === 0) return getDefaultToolIndex();

  try {
    const storedRotation = Number.parseFloat(sessionStorage.getItem(ROTATION_STORAGE_KEY) ?? '');
    if (Number.isFinite(storedRotation)) {
      return normalizeToolIndex(-storedRotation / LEGACY_ANGLE_STEP);
    }
  } catch {
    // sessionStorage 不可用时回退到配置的默认工具。
  }

  return getDefaultToolIndex();
}

function persistToolIndex(index: number) {
  try {
    sessionStorage.setItem(ROTATION_STORAGE_KEY, String(-index * LEGACY_ANGLE_STEP));
  } catch {
    // 隐私模式或存储配额异常不应阻断导航。
  }
}

export default function GearWheel() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const { isMobile, viewportWidth } = useViewport();
  const [initialIndex] = useState(readInitialToolIndex);

  const fontSize = isMobile
    ? Math.max(2, Math.min(2.4, viewportWidth / 160))
    : Math.max(3.15, Math.min(4, viewportWidth / 360));
  const inset = isMobile
    ? Math.max(68, Math.min(92, viewportWidth * 0.22))
    : Math.max(188, Math.min(300, viewportWidth * 0.19));
  const indicatorLeft = inset - (isMobile ? 26 : 42);

  const handleChange = useCallback((index: number) => {
    persistToolIndex(index);
    if (isMobile && typeof navigator.vibrate === 'function') {
      navigator.vibrate(1);
    }
  }, [isMobile]);

  const handleActivate = useCallback((index: number) => {
    const tool = TOOLS[index];
    if (!tool) return;

    persistToolIndex(index);
    navigate(`/tool/${tool.id}`);
  }, [navigate]);

  return (
    <main className="gear-wheel" aria-label="Playbox 工具导航">
      <div className="gear-wheel__stage">
        <span
          className="gear-wheel__indicator"
          style={{ left: indicatorLeft }}
          aria-hidden="true"
        />
        <OptionWheel
          items={TOOL_NAMES}
          defaultSelected={initialIndex}
          onChange={handleChange}
          onActivate={handleActivate}
          textColor="var(--ink)"
          activeColor="var(--accent)"
          side="left"
          fontSize={fontSize}
          spacing={isMobile ? 1.72 : 1.78}
          curve={isMobile ? 1.08 : 1.2}
          tilt={isMobile ? 8 : 7}
          blur={shouldReduceMotion ? 0 : isMobile ? 0.58 : 0.9}
          fade={isMobile ? 0.34 : 0.32}
          minOpacity={isMobile ? 0.1 : 0.07}
          smoothing={shouldReduceMotion ? 1 : isMobile ? 118 : 138}
          inset={inset}
          loop
          draggable
          className="gear-wheel__options"
          ariaLabel="选择并打开工具"
        />
      </div>
    </main>
  );
}
