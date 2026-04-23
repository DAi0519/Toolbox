import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import GearWheel from './components/GearWheel';
import ToolLayout from './components/ToolLayout';
import PageTransition from './components/PageTransition';
import { TOOLS } from './config/tools';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={(
            <PageTransition>
              <GearWheel />
            </PageTransition>
          )}
        />

        {TOOLS.map((tool) => (
          <Route
            key={tool.id}
            path={`/tool/${tool.id}`}
            element={
              <PageTransition>
                {tool.fullscreen ? (
                  <tool.component />
                ) : (
                  <ToolLayout title={tool.name}>
                    <tool.component />
                  </ToolLayout>
                )}
              </PageTransition>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      {/* Global strict layout container */}
      <div style={{
        width: '100%',
        minHeight: '100dvh',
        height: '100dvh',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}>
        {/*
          Suspense handles the loading state dynamically when 
          lazy-loaded chunk scripts are being requested over the network.
        */}
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-black/55">
                <span className="h-7 w-7 rounded-full border-2 border-black/15 border-t-[var(--accent)] animate-spin" />
                <p className="text-sm font-semibold tracking-wide">正在加载工具...</p>
              </div>
            </div>
          }
        >
          <AnimatedRoutes />
        </Suspense>
      </div>
    </BrowserRouter>
  );
}

export default App;
