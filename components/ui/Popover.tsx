import { AnimatePresence, useIsPresent } from 'motion/react';
import * as m from 'motion/react-m';
import { useState, type ComponentPropsWithRef } from 'react';

import { useAnimationPreferences } from './animation-preferences';
import { MotionProvider } from './MotionProvider';

type PopoverProps = Omit<
  ComponentPropsWithRef<'div'>,
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onAnimationIteration'
> & { open: boolean };

function PopoverSurface({ children, ...props }: Omit<PopoverProps, 'open'>) {
  const isPresent = useIsPresent();
  const { reduced: reducedMotion, disabled } = useAnimationPreferences();
  return (
    <m.div
      {...props}
      data-motion-popover
      inert={!isPresent}
      aria-hidden={!isPresent || undefined}
      initial={disabled ? false : { opacity: 0, y: reducedMotion ? 0 : -4 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: disabled ? 0 : reducedMotion ? 0.08 : 0.18 },
      }}
      exit={{
        opacity: 0,
        y: reducedMotion ? 0 : -4,
        transition: { duration: disabled ? 0 : reducedMotion ? 0.08 : 0.14 },
      }}
    >
      {children}
    </m.div>
  );
}

export function Popover({ open, ...props }: PopoverProps) {
  const [hasOpened, setHasOpened] = useState(open);
  if (open && !hasOpened) setHasOpened(true);
  if (!hasOpened) return null;

  return (
    <MotionProvider>
      <AnimatePresence>
        {open && <PopoverSurface key="surface" {...props} />}
      </AnimatePresence>
    </MotionProvider>
  );
}
