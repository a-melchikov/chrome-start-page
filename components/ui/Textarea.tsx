import type { ComponentPropsWithRef } from 'react';

import { classNames } from './class-names';

export type TextareaProps = ComponentPropsWithRef<'textarea'>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={classNames(
        'min-h-28 w-full resize-y rounded-md border border-theme-border bg-theme-surface-elevated px-3 py-2 text-sm text-theme-text-primary outline-none transition-colors placeholder:text-theme-text-muted focus-visible:border-theme-accent focus-visible:ring-2 focus-visible:ring-theme-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-theme-danger aria-invalid:ring-theme-danger/30',
        className,
      )}
      {...props}
    />
  );
}
