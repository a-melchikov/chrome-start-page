import { LinkIcon } from '../../components/icons';
import { SiteFavicon } from '../../components/ui';

const FAVICON_SIZE = 32;

interface LinkFaviconProps {
  href: string;
}

export function LinkFavicon({ href }: LinkFaviconProps) {
  return (
    <SiteFavicon
      className="size-4"
      fallback={
        <LinkIcon
          className="size-4 shrink-0"
          data-testid="link-favicon-fallback"
        />
      }
      pageUrl={href}
      size={16}
      sourceSize={FAVICON_SIZE}
    />
  );
}
