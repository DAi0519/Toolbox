import { useEffect, useState } from 'react';

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

  useEffect(() => {
    const handleResize = () => setState(readViewport());
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
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
