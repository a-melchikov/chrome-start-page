import { useState, type ReactNode } from 'react';
import { browser } from 'wxt/browser';

import { classNames } from './class-names';

interface SiteFaviconProps {
  pageUrl: string;
  fallback: ReactNode;
  size: number;
  className?: string;
  sourceSize?: number;
  testId?: string;
}

function getSiteFaviconUrl(pageUrl: string, size: number): string {
  const query = new URLSearchParams({
    pageUrl,
    size: String(size),
  });

  return `chrome-extension://${browser.runtime.id}/_favicon/?${query.toString()}`;
}

export function SiteFavicon({
  pageUrl,
  fallback,
  size,
  className,
  sourceSize = size,
  testId,
}: SiteFaviconProps) {
  const source = getSiteFaviconUrl(pageUrl, sourceSize);

  return (
    <SiteFaviconImage
      key={source}
      className={className}
      fallback={fallback}
      size={size}
      source={source}
      testId={testId}
    />
  );
}

interface SiteFaviconImageProps {
  fallback: ReactNode;
  size: number;
  source: string;
  className?: string;
  testId?: string;
}

function SiteFaviconImage({
  fallback,
  size,
  source,
  className,
  testId,
}: SiteFaviconImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return fallback;
  }

  return (
    <img
      alt=""
      aria-hidden="true"
      className={classNames('shrink-0', className)}
      data-testid={testId}
      draggable={false}
      height={size}
      src={source}
      width={size}
      onError={() => setHasError(true)}
    />
  );
}
