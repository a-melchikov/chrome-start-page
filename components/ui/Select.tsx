import type { ComponentPropsWithRef } from 'react';

import { classNames } from './class-names';

export type SelectProps = ComponentPropsWithRef<'select'>;

export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      className={classNames(
        'h-10 w-full cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition-colors focus-visible:border-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-500/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-red-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50',
        className,
      )}
      {...props}
    />
  );
}
