import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type IconProps = ComponentPropsWithoutRef<'svg'>;

interface BaseIconProps extends IconProps {
  children: ReactNode;
}

function BaseIcon({ children, ...props }: BaseIconProps) {
  return (
    <svg
      height="24"
      width="24"
      {...props}
      aria-hidden="true"
      fill="none"
      focusable="false"
      shapeRendering="geometricPrecision"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.25"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14M5 12h14" />
    </BaseIcon>
  );
}

export function PaletteIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
    </BaseIcon>
  );
}

export function TransferIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 3v15M3.5 6.5 7 3l3.5 3.5M17 21V6M13.5 17.5 17 21l3.5-3.5" />
    </BaseIcon>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M10.5 13.5a4.5 4.5 0 0 0 6.36.1l2.25-2.25a4.5 4.5 0 0 0-6.36-6.36L11.46 6.3m2.04 4.2a4.5 4.5 0 0 0-6.36-.1l-2.25 2.25a4.5 4.5 0 0 0 6.36 6.36l1.29-1.31" />
    </BaseIcon>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 20h4L19.5 8.5a2.83 2.83 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </BaseIcon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M19 5 5 19M5 5l14 14" />
    </BaseIcon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </BaseIcon>
  );
}
