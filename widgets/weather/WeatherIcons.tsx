import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { getWeatherConditionInfo } from './weather-utils';

type IconProps = ComponentPropsWithoutRef<'svg'>;

interface BaseIconProps extends IconProps {
  children: ReactNode;
}

function BaseIcon({ children, className = 'size-5', ...props }: BaseIconProps) {
  return (
    <svg
      height="24"
      width="24"
      {...props}
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      shapeRendering="geometricPrecision"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </BaseIcon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </BaseIcon>
  );
}

export function CloudIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
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

export function CloudMoonIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M10.18 2.5a6 6 0 0 0 7.82 7.82" />
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </BaseIcon>
  );
}

export function CloudFogIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M16 17H7M17 21H9" />
    </BaseIcon>
  );
}

export function CloudRainIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M16 14v6M8 14v6M12 16v6" />
    </BaseIcon>
  );
}

export function CloudSnowIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M8 15h.01M8 19h.01M12 17h.01M12 21h.01M16 15h.01M16 19h.01" />
    </BaseIcon>
  );
}

export function CloudLightningIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973" />
      <path d="m13 12-3 5h4l-3 5" />
    </BaseIcon>
  );
}

export function ThermometerIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
    </BaseIcon>
  );
}

export function DropletIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7Z" />
    </BaseIcon>
  );
}

export function WindIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </BaseIcon>
  );
}

export function GaugeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </BaseIcon>
  );
}

export function SunMediumIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1M12 20v1M3 12h1M20 12h1M18.364 5.636l-.707.707M6.343 17.657l-.707.707M5.636 5.636l.707.707M17.657 17.657l.707.707" />
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

export function RefreshCwIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </BaseIcon>
  );
}

export function WeatherConditionIcon({
  code,
  isDay,
  className,
}: {
  code: number | null | undefined;
  isDay: boolean;
  className?: string;
}) {
  const { category } = getWeatherConditionInfo(code);

  switch (category) {
    case 'clear':
      return isDay ? (
        <SunIcon className={className} />
      ) : (
        <MoonIcon className={className} />
      );
    case 'cloudy':
      if (code === 1 || code === 2) {
        return isDay ? (
          <CloudSunIcon className={className} />
        ) : (
          <CloudMoonIcon className={className} />
        );
      }
      return <CloudIcon className={className} />;
    case 'fog':
      return <CloudFogIcon className={className} />;
    case 'rain':
      return <CloudRainIcon className={className} />;
    case 'snow':
      return <CloudSnowIcon className={className} />;
    case 'thunder':
      return <CloudLightningIcon className={className} />;
    default:
      return <CloudIcon className={className} />;
  }
}
