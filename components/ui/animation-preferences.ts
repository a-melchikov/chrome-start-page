import { createContext, useContext, useSyncExternalStore } from 'react';

export type AnimationMode = 'system' | 'reduced' | 'off';
const query = '(prefers-reduced-motion: reduce)';
const subscribe = (listener: () => void) => {
  if (typeof window.matchMedia !== 'function') return () => undefined;
  const media = window.matchMedia(query);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
};
const getSnapshot = () =>
  typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
const getServerSnapshot = () => false;
export const AnimationContext = createContext<AnimationMode>('system');

export function useSystemReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useAnimationPreferences() {
  const mode = useContext(AnimationContext);
  const systemReduced = useSystemReducedMotion();
  return {
    reduced: mode !== 'system' || systemReduced,
    disabled: mode === 'off',
  };
}
