import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface AssistantContextBlurb {
  /** Short label shown in the panel header (e.g. "Case LA-2026-00847"). */
  label: string;
  /** Free-form context sent to the agent as an initial system-style hint. */
  body: string;
  /** Maestro case instance GUID — needed by Get Case State path param. */
  instanceId?: string;
  /** Orchestrator folder GUID — needed as the x-uipath-folderkey header. */
  folderKey?: string;
  /** Human-readable case ID (e.g. "LA-2026-00847") for display. */
  caseId?: string;
}

interface AssistantContextValue {
  isOpen: boolean;
  context: AssistantContextBlurb | null;
  open: (context?: AssistantContextBlurb) => void;
  close: () => void;
  toggle: () => void;
}

const AssistantContext = createContext<AssistantContextValue | undefined>(undefined);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<AssistantContextBlurb | null>(null);

  const open = useCallback((ctx?: AssistantContextBlurb) => {
    if (ctx) setContext(ctx);
    else setContext(null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo(
    () => ({ isOpen, context, open, close, toggle }),
    [isOpen, context, open, close, toggle],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant must be used inside AssistantProvider');
  return ctx;
}
