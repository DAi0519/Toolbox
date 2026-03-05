import { createContext, useContext, useEffect, type ReactNode } from 'react';

type SetHeaderActions = (slot: ReactNode) => void;

export const ToolHeaderActionsContext = createContext<SetHeaderActions | null>(null);

export function useToolHeaderActions(slot: ReactNode) {
  const setHeaderActions = useContext(ToolHeaderActionsContext);

  useEffect(() => {
    if (!setHeaderActions) return;
    setHeaderActions(slot);
    return () => setHeaderActions(null);
  }, [setHeaderActions, slot]);
}
