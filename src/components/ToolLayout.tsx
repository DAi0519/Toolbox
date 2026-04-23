import { useCallback, useState, type ReactNode } from 'react';
import ToolHeader from './ToolHeader';
import { ToolHeaderActionsContext } from './ToolHeaderActionsContext';

interface ToolLayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function ToolLayout({ title, children }: ToolLayoutProps) {
  const [rightSlot, setRightSlot] = useState<ReactNode>(null);
  const handleSetRightSlot = useCallback((slot: ReactNode) => {
    setRightSlot(slot);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minHeight: '100dvh',
        height: '100dvh',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      <ToolHeader title={title} rightSlot={rightSlot} />
      
      <ToolHeaderActionsContext.Provider value={handleSetRightSlot}>
        <main style={{
          flex: 1,
          position: 'relative',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {children}
        </main>
      </ToolHeaderActionsContext.Provider>
    </div>
  );
}
