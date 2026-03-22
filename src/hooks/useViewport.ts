import { useLayoutEffect, useRef, useState } from 'react';

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
  const intervalRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const commitViewport = () => {
      const next = readViewport();
      setState((prev) => (
        prev.viewportWidth === next.viewportWidth &&
        prev.viewportHeight === next.viewportHeight
      ) ? prev : next);
    };

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const resizeObserver = new ResizeObserver(commitViewport);

    commitViewport();
    intervalRef.current = window.setInterval(commitViewport, 80);
    resizeObserver.observe(document.documentElement);

    window.addEventListener('resize', commitViewport);
    window.addEventListener('orientationchange', commitViewport);
    window.visualViewport?.addEventListener('resize', commitViewport);
    window.visualViewport?.addEventListener('scroll', commitViewport);
    mediaQuery.addEventListener('change', commitViewport);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', commitViewport);
      window.removeEventListener('orientationchange', commitViewport);
      window.visualViewport?.removeEventListener('resize', commitViewport);
      window.visualViewport?.removeEventListener('scroll', commitViewport);
      mediaQuery.removeEventListener('change', commitViewport);
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
