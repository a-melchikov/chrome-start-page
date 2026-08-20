import type { ComponentPropsWithRef } from 'react';

import { classNames } from './class-names';

export type InputProps = ComponentPropsWithRef<'input'>;

export function Input({ className, type = 'text', ...props }: InputProps) {
  return (
    <input
      className={classNames(
        'h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus-visible:border-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-500/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-red-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500',
        className,
      )}
      type={type}
      {...props}
    />
  );
}
