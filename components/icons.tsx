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

export function CalendarIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18m-13 5h2m4 0h2" />
    </BaseIcon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14M5 12h14" />
    </BaseIcon>
  );
}

export function ExpandIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5" />
    </BaseIcon>
  );
}

export function PaletteIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.4-3.4 1.5 1.5 0 0 1 1.1-2.6H18a3 3 0 0 0 3-3 9 9 0 0 0-9-9Z" />
      <circle cx="7.5" cy="10.5" r="0.6" />
      <circle cx="10" cy="6.8" r="0.6" />
      <circle cx="14.5" cy="6.8" r="0.6" />
      <circle cx="17.5" cy="10.5" r="0.6" />
    </BaseIcon>
  );
}

export function TransferIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
      <path d="M7 12V3M4 6l3-3 3 3M17 3v9M14 9l3 3 3-3" />
    </BaseIcon>
  );
}

export function TextSizeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 7V4h12v3M9 4v16M6 20h6M16 13v-2h6v2M19 11v9M17 20h4" />
    </BaseIcon>
  );
}

export function SlidersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 6h4m4 0h10M3 12h10m4 0h4M3 18h4m4 0h10" />
      <circle cx="9" cy="6" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="9" cy="18" r="2" />
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

export function AnalogClockIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l2.5 1.5" />
      <path d="M12 3v1M12 20v1M3 12h1M20 12h1" strokeWidth="1.75" />
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

export function MusicIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 18V5l12-2v13M9 9l12-2" />
      <ellipse cx="6" cy="18" rx="3" ry="3" />
      <ellipse cx="18" cy="16" rx="3" ry="3" />
    </BaseIcon>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
    </BaseIcon>
  );
}

export function HeartOffIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m3 3 18 18M8.5 3.5a5.5 5.5 0 0 1 2.4 1.1L12 5.7l1.1-1.1a5.5 5.5 0 0 1 7.7 7.8l-2.3 2.2M15.7 17.4 12 21l-8.8-8.6A5.5 5.5 0 0 1 3 5" />
    </BaseIcon>
  );
}

export function VolumeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" />
    </BaseIcon>
  );
}

export function VolumeOffIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6" />
    </BaseIcon>
  );
}

export function PreviousTrackIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 5v14M19 5 8 12l11 7V5Z" />
    </BaseIcon>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M14 3h7v7M21 3 10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
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

export function RotateCwIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </BaseIcon>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m7 5-4 4 4 4M3 9h10a7 7 0 0 1 7 7v3" />
    </BaseIcon>
  );
}

export function RedoIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m17 5 4 4-4 4M21 9H11a7 7 0 0 0-7 7v3" />
    </BaseIcon>
  );
}

export function KeyboardIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9h.01M12 9h.01M17 9h.01M7 12.5h.01M12 12.5h.01M17 12.5h.01M8 16h8" />
    </BaseIcon>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </BaseIcon>
  );
}

export function DuplicateIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2M14 11v6m-3-3h6" />
    </BaseIcon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v6m4-6v6" />
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

export function ChevronLeftIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m15 6-6 6 6 6" />
    </BaseIcon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m9 6 6 6-6 6" />
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

export function EyeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </BaseIcon>
  );
}

export function CheckSquareIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </BaseIcon>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </BaseIcon>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </BaseIcon>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </BaseIcon>
  );
}
