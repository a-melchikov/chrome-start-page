import type { ComponentPropsWithRef } from 'react';

import { classNames } from './class-names';

export type SelectProps = ComponentPropsWithRef<'select'>;

export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      className={classNames(
        'h-10 w-full cursor-pointer rounded-md border border-theme-border bg-theme-surface-elevated px-3 text-sm text-theme-text-primary outline-none transition-colors focus-visible:border-theme-accent focus-visible:ring-2 focus-visible:ring-theme-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-theme-danger aria-invalid:ring-theme-danger/30',
        className,
      )}
      {...props}
    />
  );
}
