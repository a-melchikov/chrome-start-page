import { useState } from 'react';
import { browser } from 'wxt/browser';

import { LinkIcon } from '../../components/icons';

const FAVICON_SIZE = 32;

interface LinkFaviconProps {
  href: string;
}

function getFaviconUrl(pageUrl: string): string {
  const query = new URLSearchParams({
    pageUrl,
    size: String(FAVICON_SIZE),
  });

  return `chrome-extension://${browser.runtime.id}/_favicon/?${query.toString()}`;
}

export function LinkFavicon({ href }: LinkFaviconProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <LinkIcon
        className="size-4 shrink-0"
        data-testid="link-favicon-fallback"
      />
    );
  }

  return (
    <img
      alt=""
      aria-hidden="true"
      className="size-4 shrink-0"
      draggable={false}
      height="16"
      src={getFaviconUrl(href)}
      width="16"
      onError={() => setHasError(true)}
    />
  );
}
