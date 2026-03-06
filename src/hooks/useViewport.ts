import { useEffect, useRef, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

interface ViewportState {
  viewportWidth: number;
  viewportHeight: number;
}

function readViewport(): ViewportState {
  if (typeof window === 'undefined') {
    return { viewportWidth: MOBILE_BREAKPOINT, viewportHeight: 800 };
  }

  const visualViewport = window.visualViewport;
  return {
    viewportWidth: Math.round(visualViewport?.width ?? window.innerWidth),
    viewportHeight: Math.round(visualViewport?.height ?? window.innerHeight),
  };
}

export function useViewport() {
  const [state, setState] = useState<ViewportState>(() => readViewport());
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const commitViewport = () => {
      frameRef.current = null;
      const next = readViewport();
      setState((prev) => (
        prev.viewportWidth === next.viewportWidth &&
        prev.viewportHeight === next.viewportHeight
      ) ? prev : next);
    };

    const scheduleViewportRead = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(commitViewport);
    };

    scheduleViewportRead();

    window.addEventListener('resize', scheduleViewportRead);
    window.addEventListener('orientationchange', scheduleViewportRead);
    window.visualViewport?.addEventListener('resize', scheduleViewportRead);
    window.visualViewport?.addEventListener('scroll', scheduleViewportRead);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener('resize', scheduleViewportRead);
      window.removeEventListener('orientationchange', scheduleViewportRead);
      window.visualViewport?.removeEventListener('resize', scheduleViewportRead);
      window.visualViewport?.removeEventListener('scroll', scheduleViewportRead);
    };
  }, []);

  const isMobile = state.viewportWidth < MOBILE_BREAKPOINT;

  return {
    isMobile,
    isDesktop: !isMobile,
    viewportWidth: state.viewportWidth,
    viewportHeight: state.viewportHeight,
  };
}
