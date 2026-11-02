import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useAnimationPreferences } from './animation-preferences';
import * as m from 'motion/react-m';

import { ChevronDownIcon } from '../icons';
import { classNames } from './class-names';
import { MotionProvider } from './MotionProvider';

interface DisclosureProps {
  title: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  variant?: 'surface' | 'plain';
  resetKey?: boolean | number;
  'data-appearance-section'?: string;
  'data-dialog-initial-focus'?: boolean;
}

export function Disclosure({
  title,
  children,
  open: controlledOpen,
  onOpenChange,
  className,
  variant = 'surface',
  resetKey,
  'data-appearance-section': section,
  'data-dialog-initial-focus': initialFocus,
}: DisclosureProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [settledClosed, setSettledClosed] = useState(true);
  const [previousResetKey, setPreviousResetKey] = useState(resetKey);
  const open = controlledOpen ?? internalOpen;
  const contentId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { reduced: reducedMotion, disabled } = useAnimationPreferences();

  if (previousResetKey !== resetKey) {
    setPreviousResetKey(resetKey);
    setInternalOpen(false);
    setSettledClosed(true);
  }

  useEffect(() => {
    if (!open && contentRef.current?.contains(document.activeElement)) {
      buttonRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  const toggle = () => {
    setSettledClosed(false);
    if (controlledOpen === undefined) setInternalOpen(!open);
    onOpenChange?.(!open);
  };

  const trigger = (
    <button
      ref={buttonRef}
      type="button"
      aria-expanded={open}
      aria-controls={contentId}
      data-dialog-initial-focus={initialFocus ? '' : undefined}
      className={classNames(
        'flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg text-left text-sm text-theme-text-primary outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-ring',
        variant === 'plain' ? 'py-2 font-semibold' : 'px-4 py-3 font-medium',
      )}
      onClick={toggle}
    >
      {title}
      <ChevronDownIcon
        className={classNames(
          'size-4 shrink-0 text-theme-text-secondary transition-transform duration-150',
          open && 'rotate-180',
        )}
      />
    </button>
  );

  return (
    <section
      data-appearance-section={section}
      className={classNames(
        variant === 'surface' &&
          'rounded-lg border border-theme-border bg-theme-surface',
        className,
      )}
    >
      {variant === 'plain' ? <h3>{trigger}</h3> : trigger}
      <MotionProvider>
        <m.div
          ref={contentRef}
          id={contentId}
          inert={!open}
          aria-hidden={!open}
          initial={false}
          animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
          transition={{
            height: {
              duration: reducedMotion ? 0 : 0.22,
              ease: [0.2, 0.8, 0.2, 1],
            },
            opacity: { duration: disabled ? 0 : reducedMotion ? 0.08 : 0.18 },
          }}
          style={{ visibility: !open && settledClosed ? 'hidden' : undefined }}
          className="overflow-clip"
          onAnimationComplete={() => setSettledClosed(!open)}
        >
          {children}
        </m.div>
      </MotionProvider>
    </section>
  );
}
