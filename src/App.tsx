import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense } from 'react';
import GearWheel from './components/GearWheel';
import ToolLayout from './components/ToolLayout';
import { TOOLS } from './config/tools';

function App() {
  return (
    <BrowserRouter>
      {/* Global strict layout container */}
      <div style={{
        width: '100vw',
        height: '100vh',
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
          <Routes>
            {/* The Home page is the core Wheel Interface */}
            <Route path="/" element={<GearWheel />} />

            {/* Dynamically build all tool routes from the single config */}
            {TOOLS.map((tool) => (
              <Route
                key={tool.id}
                path={`/tool/${tool.id}`}
                element={
                  tool.fullscreen ? (
                    <tool.component />
                  ) : (
                    <ToolLayout title={tool.name}>
                      <tool.component />
                    </ToolLayout>
                  )
                }
              />
            ))}
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}

export default App;
