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
  primary: 'bg-theme-accent text-theme-accent-text hover:bg-theme-accent-hover',
  secondary:
    'border border-theme-border bg-theme-surface text-theme-text-primary hover:bg-theme-surface-elevated',
  ghost:
    'bg-transparent text-theme-text-primary hover:bg-theme-surface-elevated',
  danger:
    'border border-theme-danger-border bg-theme-danger-bg text-theme-danger-text hover:bg-theme-danger-hover',
  'danger-ghost':
    'bg-transparent text-theme-text-secondary hover:bg-theme-danger-bg hover:text-theme-danger',
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
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-theme-ring focus-visible:ring-offset-2 focus-visible:ring-offset-theme-surface disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
