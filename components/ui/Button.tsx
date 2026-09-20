import type { ComponentPropsWithRef } from 'react';

import { classNames } from './class-names';

type ButtonVariant =
  'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost' | 'brand';
type ButtonSize = 'xs' | 'small' | 'medium';

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white',
  secondary:
    'border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700',
  ghost:
    'bg-transparent text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800',
  danger: 'bg-red-600 text-white hover:bg-red-500',
  'danger-ghost':
    'bg-transparent text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/50 dark:hover:text-red-400',
  brand:
    'border border-zinc-200 bg-white text-zinc-950 shadow-sm hover:bg-zinc-100 dark:border-zinc-200 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-8 px-2 text-xs',
  small: 'h-10 px-3 text-sm',
  medium: 'h-11 px-4 text-sm',
};

export function Button({
  className,
  type = 'button',
  variant = 'primary',
  size = 'medium',
  ...props
}: ButtonProps) {
  return (
    <button
      className={classNames(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-zinc-400 dark:focus-visible:ring-offset-zinc-950',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
