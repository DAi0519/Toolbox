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
        <Suspense fallback={
          <div style={{
            display: 'flex', 
            height: '100%', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'var(--ink)'
          }}>
            Loading tool...
          </div>
        }>
          <Routes>
            {/* The Home page is the core Wheel Interface */}
            <Route path="/" element={<GearWheel />} />

            {/* Dynamically build all tool routes from the single config */}
            {TOOLS.map((tool) => (
              <Route
                key={tool.id}
                path={`/tool/${tool.id}`}
                element={
                  <ToolLayout title={tool.name}>
                    <tool.component />
                  </ToolLayout>
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
