import type { ReactNode } from 'react';

import { Button, type ButtonProps } from './Button';
import { classNames } from './class-names';

type IconButtonSize = 'small' | 'medium';

export type IconButtonProps = Omit<
  ButtonProps,
  'aria-label' | 'children' | 'size'
> & {
  'aria-label': string;
  children: ReactNode;
  size?: IconButtonSize;
};

const sizeClasses: Record<IconButtonSize, string> = {
  small: 'size-8',
  medium: 'size-10',
};

export function IconButton({
  className,
  size = 'medium',
  ...props
}: IconButtonProps) {
  return (
    <Button
      className={classNames('shrink-0 p-0', sizeClasses[size], className)}
      size="medium"
      {...props}
    />
  );
}
