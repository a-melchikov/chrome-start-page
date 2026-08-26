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

const markdownSanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  tagNames: Array.from(
    new Set([...(defaultSchema.tagNames ?? []), ...extendedTags]),
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
      <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-100 p-3 pr-24 text-xs leading-5 dark:border-zinc-700 dark:bg-zinc-950">
        {children}
      </pre>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-unused-vars -- react-markdown adds AST-only props that must not be forwarded to native elements. */
function createComponents(
  content: string,
  onContentChange?: (content: string) => void,
): Components {
  return {
    h1: ({ node: _node, ...props }) => (
      <h1 className="mt-4 mb-2 text-lg font-bold first:mt-0" {...props} />
    ),
    h2: ({ node: _node, ...props }) => (
      <h2 className="mt-4 mb-2 text-base font-bold first:mt-0" {...props} />
    ),
    h3: ({ node: _node, ...props }) => (
      <h3 className="mt-3 mb-1.5 text-sm font-bold first:mt-0" {...props} />
    ),
    h4: ({ node: _node, ...props }) => (
      <h4 className="mt-3 mb-1 text-sm font-semibold first:mt-0" {...props} />
    ),
    h5: ({ node: _node, ...props }) => (
      <h5 className="mt-2 mb-1 text-xs font-semibold first:mt-0" {...props} />
    ),
    h6: ({ node: _node, ...props }) => (
      <h6
        className="mt-2 mb-1 text-xs font-semibold text-zinc-500 first:mt-0 dark:text-zinc-400"
        {...props}
      />
    ),
    p: ({ node: _node, ...props }) => (
      <p
        className="my-2 break-words leading-6 first:mt-0 last:mb-0"
        {...props}
      />
    ),
    strong: ({ node: _node, ...props }) => (
      <strong
        className="font-semibold text-zinc-900 dark:text-zinc-100"
        {...props}
      />
    ),
    em: ({ node: _node, ...props }) => <em className="italic" {...props} />,
    del: ({ node: _node, ...props }) => (
      <del className="text-zinc-500 dark:text-zinc-400" {...props} />
    ),
    blockquote: ({ node: _node, ...props }) => (
      <blockquote
        className="my-3 border-l-4 border-zinc-300 pl-3 text-zinc-600 italic dark:border-zinc-600 dark:text-zinc-300"
        {...props}
      />
    ),
    ul: ({ node: _node, className, ...props }) => (
      <ul
        className={classNames(
          'my-2 list-disc space-y-1 pl-5',
          className?.includes('contains-task-list') && 'list-none pl-1',
        )}
        {...props}
      />
    ),
    ol: ({ node: _node, ...props }) => (
      <ol className="my-2 list-decimal space-y-1 pl-5" {...props} />
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
            'break-words pl-0.5',
            className?.includes('task-list-item') &&
              'flex items-start gap-2 pl-0',
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
          className="mt-1 size-4 shrink-0 cursor-pointer accent-zinc-900 dark:accent-zinc-100"
          disabled={!onContentChange}
          type="checkbox"
          onChange={() => undefined}
        />
      ) : null,
    a: ({ node: _node, href = '', children, title: _title, ...props }) => {
      if (href.startsWith('#')) {
        return (
          <a
            className="font-medium text-blue-700 underline decoration-blue-400/60 underline-offset-2 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
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
          className="inline-flex max-w-full items-center gap-1.5 rounded-md px-1 py-0.5 align-middle font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500 focus-visible:outline-none dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
          href={normalizedUrl.href}
          title={getTextContent(children)}
          {...props}
        >
          <LinkFavicon href={normalizedUrl.href} />
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
          className="my-3 max-h-80 max-w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-700"
          decoding="async"
          loading="lazy"
          referrerPolicy="no-referrer"
          src={normalizedUrl}
          title={title}
        />
      ) : (
        <span className="text-zinc-500 dark:text-zinc-400">{alt}</span>
      );
    },
    code: ({ node: _node, className, ...props }) => (
      <code
        className={classNames(
          'rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.85em] dark:bg-zinc-800',
          className,
        )}
        {...props}
      />
    ),
    pre: ({ node: _node, children }) => <CodeBlock>{children}</CodeBlock>,
    table: ({ node: _node, ...props }) => (
      <div className="my-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
        <table
          className="w-full border-collapse text-left text-xs"
          {...props}
        />
      </div>
    ),
    th: ({ node: _node, ...props }) => (
      <th
        className="border-b border-zinc-300 bg-zinc-100 px-3 py-2 font-semibold dark:border-zinc-700 dark:bg-zinc-800"
        {...props}
      />
    ),
    td: ({ node: _node, ...props }) => (
      <td
        className="border-b border-zinc-200 px-3 py-2 last:border-b-0 dark:border-zinc-800"
        {...props}
      />
    ),
    hr: ({ node: _node, ...props }) => (
      <hr className="my-4 border-zinc-300 dark:border-zinc-700" {...props} />
    ),
    details: ({ node: _node, ...props }) => (
      <details
        className="my-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
        {...props}
      />
    ),
    summary: ({ node: _node, ...props }) => (
      <summary className="cursor-pointer font-semibold" {...props} />
    ),
    mark: ({ node: _node, ...props }) => (
      <mark
        className="rounded bg-yellow-200 px-0.5 text-zinc-950 dark:bg-yellow-300"
        {...props}
      />
    ),
    kbd: ({ node: _node, ...props }) => (
      <kbd
        className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-xs shadow-sm dark:border-zinc-600 dark:bg-zinc-800"
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
}: MarkdownRendererProps) {
  const components = useMemo(
    () => createComponents(content, onContentChange),
    [content, onContentChange],
  );

  if (!content.trim()) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
    );
  }

  return (
    <div className="min-w-0 text-sm text-zinc-700 dark:text-zinc-300">
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
