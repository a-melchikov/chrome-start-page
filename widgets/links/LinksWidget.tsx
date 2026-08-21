import type { LinksWidgetConfig } from './types';
import { LinkFavicon } from './LinkFavicon';
import { parseLinksContent } from './parser';
import type { LinksRenderSegment } from './parser-types';

interface LinksWidgetProps {
  config: LinksWidgetConfig;
}

function renderSegment(segment: LinksRenderSegment, index: number) {
  if (segment.type === 'link') {
    return (
      <a
        key={index}
        className="inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 align-middle font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
        href={segment.href}
        title={segment.label}
      >
        <LinkFavicon key={segment.href} href={segment.href} />
        <span className="truncate">{segment.label}</span>
      </a>
    );
  }

  if (segment.type === 'invalid-link') {
    return (
      <span key={index} title="Некорректная ссылка">
        {segment.source}
      </span>
    );
  }

  return <span key={index}>{segment.text}</span>;
}

export function LinksWidget({ config }: LinksWidgetProps) {
  const { model } = parseLinksContent(config.content);

  if (model.lines.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Список ссылок пока пуст.
      </p>
    );
  }

  return (
    <div className="min-w-0 text-sm text-zinc-600 dark:text-zinc-300">
      {model.lines.map((line) => (
        <div
          key={line.lineNumber}
          className="min-h-6 min-w-0 whitespace-pre-wrap break-words leading-6"
          data-links-line={line.lineNumber}
        >
          {line.segments.map(renderSegment)}
        </div>
      ))}
    </div>
  );
}
