import { useEffect, type ReactNode } from 'react';
import {
  AnimationContext,
  useSystemReducedMotion,
  type AnimationMode,
} from './animation-preferences';

export function AnimationPreferences({
  mode = 'system',
  children,
}: {
  mode?: AnimationMode;
  children: ReactNode;
}) {
  const systemReduced = useSystemReducedMotion();
  const effectiveMode =
    mode === 'system' ? (systemReduced ? 'reduced' : 'full') : mode;
  useEffect(() => {
    document.documentElement.dataset.motion = effectiveMode;
    return () => {
      delete document.documentElement.dataset.motion;
    };
  }, [effectiveMode]);
  return (
    <AnimationContext.Provider value={mode}>
      {children}
    </AnimationContext.Provider>
  );
}
