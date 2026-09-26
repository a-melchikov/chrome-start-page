import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, {
  defaultSchema,
  type Options as SanitizeSchema,
} from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

import { Button } from '../../components/ui';
import { classNames } from '../../components/ui/class-names';
import { LinkFavicon } from './LinkFavicon';
import { toggleMarkdownTask } from './task-list';
import { normalizeImageUrl, normalizeLinkUrl } from './validation';

interface MarkdownRendererProps {
  content: string;
  emptyMessage?: string;
  onContentChange?: (content: string) => void;
  compact?: boolean;
}

const extendedTags = [
  'abbr',
  'details',
  'div',
  'ins',
  'kbd',
  'mark',
  'span',
  'sub',
  'summary',
] as const;

const disallowedTags = new Set(['picture', 'source']);

const markdownSanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  tagNames: Array.from(
    new Set([
      ...(defaultSchema.tagNames ?? []).filter(
        (tag) => !disallowedTags.has(tag),
      ),
      ...extendedTags,
    ]),
  ),
  attributes: {
    ...defaultSchema.attributes,
    abbr: [...(defaultSchema.attributes?.abbr ?? []), 'title'],
    details: [...(defaultSchema.attributes?.details ?? []), 'open'],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https'],
    src: ['https'],
  },
};

function getTextContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getTextContent(node.props.children);
  }

  return Children.toArray(node).map(getTextContent).join('');
}

function CodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const code = getTextContent(children).replace(/\n$/, '');

  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current);
      }
    },
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);

      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current);
      }

      resetTimerRef.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="group/code relative my-3 min-w-0">
      <Button
        aria-label={copied ? 'Код скопирован' : 'Копировать код'}
        className="absolute top-2 right-2 z-10 h-8 px-2 text-xs opacity-0 group-hover/code:opacity-100 focus-visible:opacity-100"
        size="small"
        variant="secondary"
        onClick={() => void copy()}
      >
        {copied ? 'Скопировано' : 'Копировать'}
      </Button>
      <pre className="overflow-x-auto rounded-lg border border-theme-border bg-theme-surface-muted p-3 pr-24 text-xs leading-5 text-theme-text-primary">
        {children}
      </pre>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-unused-vars -- react-markdown adds AST-only props that must not be forwarded to native elements. */
function createComponents(
  content: string,
  onContentChange?: (content: string) => void,
  compact = false,
): Components {
  return {
    h1: ({ node: _node, ...props }) => (
      <h1
        className={classNames(
          compact
            ? 'mt-2 mb-1 text-xs font-bold'
            : 'mt-4 mb-2 text-lg font-bold',
          'text-theme-text-primary first:mt-0',
        )}
        {...props}
      />
    ),
    h2: ({ node: _node, ...props }) => (
      <h2
        className={classNames(
          compact
            ? 'mt-1.5 mb-1 text-[11px] font-bold'
            : 'mt-4 mb-2 text-base font-bold',
          'text-theme-text-primary first:mt-0',
        )}
        {...props}
      />
    ),
    h3: ({ node: _node, ...props }) => (
      <h3
        className={classNames(
          compact
            ? 'mt-1 mb-0.5 text-[10px] font-bold'
            : 'mt-3 mb-1.5 text-sm font-bold',
          'text-theme-text-primary first:mt-0',
        )}
        {...props}
      />
    ),
    h4: ({ node: _node, ...props }) => (
      <h4
        className={classNames(
          compact
            ? 'mt-1 mb-0.5 text-[10px] font-semibold'
            : 'mt-3 mb-1 text-sm font-semibold',
          'text-theme-text-primary first:mt-0',
        )}
        {...props}
      />
    ),
    h5: ({ node: _node, ...props }) => (
      <h5
        className={classNames(
          compact
            ? 'mt-1 mb-0.5 text-[10px] font-semibold'
            : 'mt-2 mb-1 text-xs font-semibold',
          'text-theme-text-primary first:mt-0',
        )}
        {...props}
      />
    ),
    h6: ({ node: _node, ...props }) => (
      <h6
        className={classNames(
          compact
            ? 'mt-1 mb-0.5 text-[10px] font-semibold'
            : 'mt-2 mb-1 text-xs font-semibold',
          'text-theme-text-muted first:mt-0',
        )}
        {...props}
      />
    ),
    p: ({ node: _node, ...props }) => (
      <p
        className={classNames(
          compact
            ? 'my-1 break-words text-[10px] leading-snug'
            : 'my-2 break-words leading-6',
          'text-theme-text-primary first:mt-0 last:mb-0',
        )}
        {...props}
      />
    ),
    strong: ({ node: _node, ...props }) => (
      <strong className="font-semibold text-theme-text-primary" {...props} />
    ),
    em: ({ node: _node, ...props }) => (
      <em className="italic text-theme-text-primary" {...props} />
    ),
    del: ({ node: _node, ...props }) => (
      <del className="text-theme-text-muted" {...props} />
    ),
    blockquote: ({ node: _node, ...props }) => (
      <blockquote
        className={classNames(
          compact
            ? 'my-1 rounded-r border-l-2 py-0.5 pl-2 text-[10px]'
            : 'my-3 rounded-r-md border-l-4 py-1 pl-3',
          'border-theme-accent bg-theme-surface-muted/40 text-theme-text-primary italic',
        )}
        {...props}
      />
    ),
    ul: ({ node: _node, className, ...props }) => (
      <ul
        className={classNames(
          compact
            ? 'my-1 list-disc space-y-0.5 pl-3.5 text-[10px]'
            : 'my-2 list-disc space-y-1 pl-5',
          'text-theme-text-primary',
          className?.includes('contains-task-list') && 'list-none pl-1',
        )}
        {...props}
      />
    ),
    ol: ({ node: _node, ...props }) => (
      <ol
        className={classNames(
          compact
            ? 'my-1 list-decimal space-y-0.5 pl-3.5 text-[10px]'
            : 'my-2 list-decimal space-y-1 pl-5',
          'text-theme-text-primary',
        )}
        {...props}
      />
    ),
    li: ({ node, className, children, ...props }) => {
      const sourceOffset = node?.position?.start.offset;
      const handleClick = (event: MouseEvent<HTMLLIElement>) => {
        const checkbox = event.target;

        if (
          !onContentChange ||
          sourceOffset === undefined ||
          !(checkbox instanceof HTMLInputElement) ||
          checkbox.type !== 'checkbox' ||
          checkbox.closest('li') !== event.currentTarget
        ) {
          return;
        }

        event.preventDefault();
        const nextContent = toggleMarkdownTask(content, sourceOffset);

        if (nextContent !== content) {
          onContentChange(nextContent);
        }
      };

      return (
        <li
          className={classNames(
            'break-words pl-0.5 text-theme-text-primary',
            compact && 'text-[10px] leading-snug',
            className?.includes('task-list-item') &&
              (compact
                ? 'flex items-start gap-1 pl-0'
                : 'flex items-start gap-2 pl-0'),
          )}
          {...props}
          onClick={handleClick}
        >
          {children}
        </li>
      );
    },
    input: ({ node: _node, type, ...props }) =>
      type === 'checkbox' ? (
        <input
          {...props}
          aria-label={props.checked ? 'Выполнено' : 'Не выполнено'}
          className={classNames(
            compact ? 'mt-0.5 size-3' : 'mt-1 size-4',
            'shrink-0 cursor-pointer accent-theme-accent',
          )}
          disabled={!onContentChange}
          type="checkbox"
          onChange={() => undefined}
        />
      ) : null,
    a: ({ node: _node, href = '', children, title: _title, ...props }) => {
      if (href.startsWith('#')) {
        return (
          <a
            className={classNames(
              compact ? 'text-[10px]' : '',
              'font-medium text-theme-accent underline underline-offset-2 hover:opacity-80',
            )}
            href={href}
            {...props}
          >
            {children}
          </a>
        );
      }

      const normalizedUrl = normalizeLinkUrl(href);

      if (!normalizedUrl.valid) {
        return <span title="Некорректная ссылка">{children}</span>;
      }

      return (
        <a
          className={classNames(
            compact ? 'gap-1 px-0.5 py-0 text-[10px]' : 'gap-1.5 px-1 py-0.5',
            'inline-flex max-w-full items-center rounded-md align-middle font-medium text-theme-text-primary transition-colors hover:bg-theme-surface-elevated focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-ring focus-visible:outline-none',
          )}
          href={normalizedUrl.href}
          title={getTextContent(children)}
          {...props}
        >
          <LinkFavicon href={normalizedUrl.href} compact={compact} />
          <span className="min-w-0">{children}</span>
        </a>
      );
    },
    img: ({ node: _node, src = '', alt = '', title, ...props }) => {
      const normalizedUrl = normalizeImageUrl(src);

      return normalizedUrl ? (
        <img
          {...props}
          alt={alt}
          className="my-3 max-h-80 max-w-full rounded-lg border border-theme-border object-contain"
          decoding="async"
          loading="lazy"
          referrerPolicy="no-referrer"
          src={normalizedUrl}
          title={title}
        />
      ) : (
        <span className="text-theme-text-muted">{alt}</span>
      );
    },
    code: ({ node: _node, className, ...props }) => (
      <code
        className={classNames(
          'rounded border border-theme-border-subtle bg-theme-surface-muted px-1 py-0.5 font-mono text-[0.85em] text-theme-text-primary',
          className,
        )}
        {...props}
      />
    ),
    pre: ({ node: _node, children }) => <CodeBlock>{children}</CodeBlock>,
    table: ({ node: _node, ...props }) => (
      <div className="my-3 overflow-x-auto rounded-lg border border-theme-border">
        <table
          className="w-full border-collapse text-left text-xs"
          {...props}
        />
      </div>
    ),
    th: ({ node: _node, ...props }) => (
      <th
        className="border-b border-theme-border bg-theme-surface-muted px-3 py-2 font-semibold text-theme-text-primary"
        {...props}
      />
    ),
    td: ({ node: _node, ...props }) => (
      <td
        className="border-b border-theme-border-subtle px-3 py-2 text-theme-text-secondary last:border-b-0"
        {...props}
      />
    ),
    hr: ({ node: _node, ...props }) => (
      <hr className="my-4 border-theme-border" {...props} />
    ),
    details: ({ node: _node, ...props }) => (
      <details
        className="my-3 rounded-lg border border-theme-border p-3 text-theme-text-primary"
        {...props}
      />
    ),
    summary: ({ node: _node, ...props }) => (
      <summary
        className="cursor-pointer font-semibold text-theme-text-primary"
        {...props}
      />
    ),
    mark: ({ node: _node, ...props }) => (
      <mark
        className="rounded bg-theme-accent/20 px-0.5 text-theme-text-primary"
        {...props}
      />
    ),
    kbd: ({ node: _node, ...props }) => (
      <kbd
        className="rounded border border-theme-border bg-theme-surface-muted px-1.5 py-0.5 font-mono text-xs text-theme-text-primary shadow-xs"
        {...props}
      />
    ),
  };
}
/* eslint-enable @typescript-eslint/no-unused-vars */

export function MarkdownRenderer({
  content,
  emptyMessage = 'Markdown пока пуст.',
  onContentChange,
  compact = false,
}: MarkdownRendererProps) {
  const components = useMemo(
    () => createComponents(content, onContentChange, compact),
    [content, onContentChange, compact],
  );

  if (!content.trim()) {
    return (
      <p
        className={classNames(
          compact ? 'text-[10px]' : 'text-sm',
          'text-theme-text-muted',
        )}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      className={classNames(
        'min-w-0 text-theme-text-secondary',
        compact ? 'text-[10px] leading-snug' : 'text-sm',
      )}
    >
      <ReactMarkdown
        components={components}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]]}
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => url}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
