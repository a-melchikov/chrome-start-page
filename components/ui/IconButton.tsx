import type { ReactNode } from 'react';

import { Button, type ButtonProps } from './Button';
import { classNames } from './class-names';

type IconButtonSize = 'xs' | 'small' | 'medium';

export type IconButtonProps = Omit<
  ButtonProps,
  'aria-label' | 'children' | 'size'
> & {
  'aria-label': string;
  children: ReactNode;
  size?: IconButtonSize;
};

const sizeClasses: Record<IconButtonSize, string> = {
  xs: 'size-8',
  small: 'size-10',
  medium: 'size-11',
};

export function IconButton({
  className,
  size = 'medium',
  ...props
}: IconButtonProps) {
  return (
    <Button
      className={classNames('shrink-0 p-0', sizeClasses[size], className)}
      size={size}
      {...props}
    />
  );
}
