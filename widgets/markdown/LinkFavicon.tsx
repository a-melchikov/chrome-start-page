import { LinkIcon } from '../../components/icons';
import { SiteFavicon } from '../../components/ui';
import { classNames } from '../../components/ui/class-names';

const FAVICON_SIZE = 32;

interface LinkFaviconProps {
  href: string;
  compact?: boolean;
}

export function LinkFavicon({ href, compact }: LinkFaviconProps) {
  return (
    <SiteFavicon
      className={compact ? 'size-3' : 'size-4'}
      fallback={
        <LinkIcon
          className={classNames(compact ? 'size-3' : 'size-4', 'shrink-0')}
          data-testid="link-favicon-fallback"
        />
      }
      pageUrl={href}
      size={compact ? 12 : 16}
      sourceSize={FAVICON_SIZE}
    />
  );
}
