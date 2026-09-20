import type { ComponentPropsWithRef } from 'react';

import { classNames } from './class-names';

export type InputProps = ComponentPropsWithRef<'input'>;

export function Input({ className, type = 'text', ...props }: InputProps) {
  return (
    <input
      className={classNames(
        'h-10 w-full rounded-md border border-theme-border bg-theme-surface-elevated px-3 text-sm text-theme-text-primary outline-none transition-colors placeholder:text-theme-text-muted focus-visible:border-theme-accent focus-visible:ring-2 focus-visible:ring-theme-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-theme-danger aria-invalid:ring-theme-danger/30',
        className,
      )}
      type={type}
      {...props}
    />
  );
}
