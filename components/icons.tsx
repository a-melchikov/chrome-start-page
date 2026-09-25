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

export function ClockIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </BaseIcon>
  );
}

export function TimerIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <line x1="10" x2="14" y1="2" y2="2" />
      <line x1="12" x2="12" y1="14" y2="10" />
      <circle cx="12" cy="14" r="8" />
    </BaseIcon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <polygon points="6 4 20 12 6 20 6 4" />
    </BaseIcon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <line x1="10" x2="10" y1="5" y2="19" />
      <line x1="14" x2="14" y1="5" y2="19" />
    </BaseIcon>
  );
}

export function RotateCcwIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </BaseIcon>
  );
}

export function ForwardIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" x2="19" y1="5" y2="19" />
    </BaseIcon>
  );
}

export function HelpCircleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </BaseIcon>
  );
}

export function DocumentTextIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </BaseIcon>
  );
}

export function PhotoIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect height="18" rx="3" width="18" x="3" y="3" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </BaseIcon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </BaseIcon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <polyline points="20 6 9 17 4 12" />
    </BaseIcon>
  );
}

export function CloudSunIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M19.07 4.93l-1.41 1.41" />
      <path d="M15.5 12a3.5 3.5 0 0 0-4.9-3.2A4.5 4.5 0 0 0 4 13a4.5 4.5 0 0 0 4.5 4.5h9a3.5 3.5 0 0 0 0-7c-.68 0-1.32.2-1.85.55" />
    </BaseIcon>
  );
}
