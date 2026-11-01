import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { useAnimationPreferences } from './animation-preferences';

const loadFeatures = () =>
  import('./motion-features').then((module) => module.default);

// Mounted by interactive surfaces, rather than by the initial dashboard.
export function MotionProvider({ children }: { children: ReactNode }) {
  const { reduced, disabled } = useAnimationPreferences();
  return (
    <MotionConfig
      reducedMotion={reduced ? 'always' : 'never'}
      transition={disabled ? { duration: 0 } : undefined}
    >
      <LazyMotion features={loadFeatures} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
